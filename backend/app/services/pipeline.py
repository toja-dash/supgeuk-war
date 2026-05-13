import logging
from datetime import date, datetime
import pandas as pd
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models.market import StockMaster, MarketRawData, MarketIndicators, MarketSummary, MarketIndex
from app.adapters import krx, fdr, index
from app.services import supply_analysis, screening, scoring
from app.cache import set_cache

logger = logging.getLogger(__name__)

def chunks(items, size: int):
    for start in range(0, len(items), size):
        yield items[start:start + size]

def clean_nan(records):
    import numpy as np
    cleaned = []
    for r in records:
        new_r = {}
        for k, v in r.items():
            if pd.isna(v):
                new_r[k] = None
            elif isinstance(v, pd.Timestamp):
                new_r[k] = v.to_pydatetime()
            elif isinstance(v, np.integer):
                new_r[k] = int(v)
            elif isinstance(v, np.floating):
                new_r[k] = float(v)
            elif isinstance(v, np.bool_):
                new_r[k] = bool(v)
            else:
                new_r[k] = v
        cleaned.append(new_r)
    return cleaned

async def run_master_sync():
    logger.info("Starting master_sync")
    df = fdr.sync_stock_master(include_delisted=False)
    records = clean_nan(df.to_dict(orient="records"))
    
    async with AsyncSessionLocal() as session:
        for batch in chunks(records, 1000):
            stmt = insert(StockMaster).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=['ticker'],
                set_={
                    'name': stmt.excluded.name,
                    'sector': stmt.excluded.sector,
                    'market': stmt.excluded.market,
                    'is_active': stmt.excluded.is_active,
                    'updated_at': stmt.excluded.updated_at
                }
            )
            await session.execute(stmt)
        await session.commit()
    logger.info("master_sync completed")

async def fetch_and_upsert_raw_data(target_date: date):
    logger.info(f"Fetching raw data for {target_date}")
    df = krx.fetch_daily(target_date)
    
    if df.empty:
        logger.warning(f"No raw data fetched for {target_date}. Skipping.")
        return

    # Preprocessing
    df = df.fillna({
        'volume': 0, 'trade_value': 0,
        'net_buy_indi': 0, 'net_buy_inst': 0, 'net_buy_frgn': 0,
        'net_qty_inst': 0, 'net_qty_frgn': 0
    })
    
    # Filter out invalid
    df = df[(df['trade_value'] >= 0) & (df['volume'] >= 0) & (df['close'] > 0)]
    before_dedup = len(df)
    df = df.drop_duplicates(subset=["date", "ticker"], keep="last")
    if len(df) != before_dedup:
        logger.warning(
            "Dropped %s duplicate raw rows for %s before upsert.",
            before_dedup - len(df),
            target_date,
        )
    
    records = clean_nan(df.to_dict(orient="records"))
    if not records:
        logger.warning(f"No valid raw data remains for {target_date}. Skipping.")
        return
    
    async with AsyncSessionLocal() as session:
        for batch in chunks(records, 1000):
            stmt = insert(MarketRawData).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=['date', 'ticker'],
                set_={
                    'open': stmt.excluded.open,
                    'high': stmt.excluded.high,
                    'low': stmt.excluded.low,
                    'close': stmt.excluded.close,
                    'volume': stmt.excluded.volume,
                    'trade_value': stmt.excluded.trade_value,
                    'net_buy_indi': stmt.excluded.net_buy_indi,
                    'net_buy_inst': stmt.excluded.net_buy_inst,
                    'net_buy_frgn': stmt.excluded.net_buy_frgn,
                    'net_qty_inst': stmt.excluded.net_qty_inst,
                    'net_qty_frgn': stmt.excluded.net_qty_frgn
                }
            )
            await session.execute(stmt)
        
        # Also index data
        try:
            idx_data = index.fetch_index_daily(target_date)
        except Exception as exc:
            logger.warning("Failed to fetch index data for %s: %s", target_date, exc)
            idx_data = None
        if idx_data:
            stmt_idx = insert(MarketIndex).values(idx_data)
            stmt_idx = stmt_idx.on_conflict_do_update(
                index_elements=['date'],
                set_={
                    'kospi_close': stmt_idx.excluded.kospi_close,
                    'kospi_change_pct': stmt_idx.excluded.kospi_change_pct,
                    'kosdaq_close': stmt_idx.excluded.kosdaq_close,
                    'kosdaq_change_pct': stmt_idx.excluded.kosdaq_change_pct,
                    'usdkrw_close': stmt_idx.excluded.usdkrw_close,
                    'updated_at': stmt_idx.excluded.updated_at
                }
            )
            await session.execute(stmt_idx)
            
        await session.commit()
    logger.info(f"Raw data upsert completed for {target_date}")

async def run_eod_analysis(target_date: date):
    logger.info(f"Starting EOD analysis for {target_date}")
    
    async with AsyncSessionLocal() as session:
        # Load recent data (e.g., last 150 days) for indicator calculation
        # For simplicity in MVP, we just load raw data for the day, but supply analysis needs history.
        # Here we should fetch from DB, but Pandas is easier. We will fetch all needed raw data.
        # We need sector info too.
        query = select(MarketRawData, StockMaster.sector, StockMaster.market).outerjoin(StockMaster, MarketRawData.ticker == StockMaster.ticker).order_by(MarketRawData.date.asc())
        # In a real app, we filter by date > target_date - 150 days
        result = await session.execute(query)
        
        rows = []
        for row in result:
            raw = row[0].__dict__
            raw['sector'] = row[1]
            raw['market'] = row[2]
            rows.append(raw)
            
        if not rows:
            logger.warning("No raw data found to run analysis.")
            return
            
    df_history = pd.DataFrame(rows)
    df_history = df_history.drop(columns=['_sa_instance_state'], errors='ignore')
    
    # Calculate indicators
    df_ind = supply_analysis.process_daily_indicators(df_history)
    
    # Filter to target_date only for next steps
    df_today = df_ind[df_ind['date'] == target_date].copy()
    if df_today.empty:
        logger.warning(f"No data for {target_date} after indicator calculation.")
        return
        
    df_today = screening.apply_screening(df_today)
    df_today = scoring.apply_scoring(df_today)
    
    brief_data = screening.generate_market_brief(df_today)
    brief_data['date'] = target_date
    
    # Filter columns to match MarketIndicators schema
    ind_records = clean_nan(df_today.to_dict(orient="records"))
    
    valid_cols = [c.name for c in MarketIndicators.__table__.columns]
    
    async with AsyncSessionLocal() as session:
        # Upsert Indicators
        insert_data = [{k: v for k, v in r.items() if k in valid_cols} for r in ind_records]
        for batch in chunks(insert_data, 750):
            stmt = insert(MarketIndicators).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=['date', 'ticker'],
                set_={k: getattr(stmt.excluded, k) for k in batch[0].keys() if k not in ['date', 'ticker']}
            )
            await session.execute(stmt)
            
        # Upsert Summary
        stmt_sum = insert(MarketSummary).values([brief_data])
        stmt_sum = stmt_sum.on_conflict_do_update(
            index_elements=['date'],
            set_={k: getattr(stmt_sum.excluded, k) for k in brief_data.keys() if k != 'date'}
        )
        await session.execute(stmt_sum)
        
        await session.commit()
        
    # Update Redis cache
    date_str = target_date.strftime("%Y-%m-%d")
    cache_data = []
    for r in ind_records:
        r_series = pd.Series(r)
        insights = scoring.generate_insights(r_series)
        r_cache = r.copy()
        r_cache.update(insights)
        if 'date' in r_cache and isinstance(r_cache['date'], (date, datetime)):
            r_cache['date'] = r_cache['date'].strftime("%Y-%m-%d")
        cache_data.append(r_cache)
        
    await set_cache(f"cache:indicators:{date_str}", cache_data)
    
    brief_cache = dict(brief_data)
    # add date string
    brief_cache['date'] = date_str
    await set_cache(f"cache:market_brief:{date_str}", brief_cache)
    
    logger.info(f"EOD analysis completed for {target_date}")


async def run_eod_analysis_range(start_date: date, end_date: date):
    logger.info("Starting EOD analysis from %s to %s", start_date, end_date)

    async with AsyncSessionLocal() as session:
        query = (
            select(MarketRawData, StockMaster.sector, StockMaster.market)
            .outerjoin(StockMaster, MarketRawData.ticker == StockMaster.ticker)
            .where(MarketRawData.date <= end_date)
            .order_by(MarketRawData.date.asc())
        )
        result = await session.execute(query)

        rows = []
        for row in result:
            raw = row[0].__dict__
            raw["sector"] = row[1]
            raw["market"] = row[2]
            rows.append(raw)

        if not rows:
            logger.warning("No raw data found to run range analysis.")
            return

    df_history = pd.DataFrame(rows)
    df_history = df_history.drop(columns=["_sa_instance_state"], errors="ignore")
    df_ind = supply_analysis.process_daily_indicators(df_history)
    df_range = df_ind[(df_ind["date"] >= start_date) & (df_ind["date"] <= end_date)].copy()

    if df_range.empty:
        logger.warning("No data from %s to %s after indicator calculation.", start_date, end_date)
        return

    df_range = screening.apply_screening(df_range)
    df_range = scoring.apply_scoring(df_range)

    valid_cols = [c.name for c in MarketIndicators.__table__.columns]
    all_records = clean_nan(df_range.to_dict(orient="records"))
    insert_data = [{k: v for k, v in r.items() if k in valid_cols} for r in all_records]

    summary_records = []
    for target_date, df_day in df_range.groupby("date"):
        brief_data = screening.generate_market_brief(df_day)
        brief_data["date"] = target_date
        summary_records.append(brief_data)

    async with AsyncSessionLocal() as session:
        for batch in chunks(insert_data, 750):
            stmt = insert(MarketIndicators).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=["date", "ticker"],
                set_={k: getattr(stmt.excluded, k) for k in batch[0].keys() if k not in ["date", "ticker"]},
            )
            await session.execute(stmt)

        for batch in chunks(summary_records, 250):
            stmt_sum = insert(MarketSummary).values(batch)
            stmt_sum = stmt_sum.on_conflict_do_update(
                index_elements=["date"],
                set_={k: getattr(stmt_sum.excluded, k) for k in batch[0].keys() if k != "date"},
            )
            await session.execute(stmt_sum)

        await session.commit()

    for target_date in sorted(df_range["date"].unique()):
        date_str = target_date.strftime("%Y-%m-%d")
        day_records = [r for r in all_records if r.get("date") == target_date]
        cache_data = []
        for r in day_records:
            r_series = pd.Series(r)
            insights = scoring.generate_insights(r_series)
            r_cache = r.copy()
            r_cache.update(insights)
            if "date" in r_cache and isinstance(r_cache["date"], (date, datetime)):
                r_cache["date"] = r_cache["date"].strftime("%Y-%m-%d")
            cache_data.append(r_cache)

        await set_cache(f"cache:indicators:{date_str}", cache_data)

    for brief_data in summary_records:
        brief_cache = dict(brief_data)
        if isinstance(brief_cache["date"], (date, datetime)):
            date_str = brief_cache["date"].strftime("%Y-%m-%d")
            brief_cache["date"] = date_str
        else:
            date_str = str(brief_cache["date"])
        await set_cache(f"cache:market_brief:{date_str}", brief_cache)

    logger.info("EOD analysis range completed from %s to %s", start_date, end_date)
