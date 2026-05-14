from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, text, func
from typing import Optional
from datetime import date, timedelta
from app.db import get_db
from app.models.market import MarketIndicators, StockMaster, MarketRawData
from app.utils.trading_day import latest_trading_day
from app.services.scoring import generate_insights
from datetime import datetime
import pandas as pd

router = APIRouter()

async def get_target_date(d: Optional[date], db: AsyncSession) -> date:
    if d:
        return d

    for model in (MarketIndicators, MarketRawData):
        result = await db.execute(select(func.max(model.date)))
        latest_date = result.scalar_one_or_none()
        if latest_date:
            return latest_date

    return latest_trading_day(datetime.now())

@router.get("/{ticker}")
async def get_stock_info(ticker: str, date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    t_date = await get_target_date(date, db)
    
    stmt = (
        select(MarketIndicators, StockMaster, MarketRawData)
        .join(StockMaster, MarketIndicators.ticker == StockMaster.ticker)
        .outerjoin(MarketRawData, (MarketIndicators.ticker == MarketRawData.ticker) & (MarketRawData.date == t_date))
        .where(MarketIndicators.date == t_date)
        .where(MarketIndicators.ticker == ticker)
    )
    res = await db.execute(stmt)
    row = res.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Stock data not found for the given date")
        
    ind, master, raw = row
    
    # Generate insights dynamically if we have raw data
    headline, line1, line2 = "", "", ""
    if raw:
        # Reconstruct dict for insights
        r_dict = ind.__dict__.copy()
        r_dict.update(raw.__dict__)
        r_series = pd.Series(r_dict)
        insights = generate_insights(r_series)
        headline = insights.get('deep_dive_headline', '')
        line1 = insights.get('deep_dive_line1', '')
        line2 = insights.get('deep_dive_line2', '')
        
    return {"data": {
        "ticker": ind.ticker,
        "name": master.name,
        "sector": master.sector,
        "market": master.market,
        "close": raw.close if raw else 0,
        "change_pct": round(float((raw.close - raw.open)/raw.open*100) if raw and raw.open else 0, 2),
        "type": ind.type,
        "type_intensity": round(float(ind.type_intensity or 0), 2),
        "sfi_inst": round(float(ind.sfi_inst or 0), 2),
        "sfi_frgn": round(float(ind.sfi_frgn or 0), 2),
        "defense_status": ind.defense_status,
        "avg_cost_20d_inst": ind.avg_cost_20d_inst or 0,
        "avg_cost_20d_frgn": ind.avg_cost_20d_frgn or 0,
        "deep_dive_headline": headline,
        "deep_dive_line1": line1,
        "deep_dive_line2": line2
    }, "status": "ok", "message": None}

_PERIOD_DAYS = {"1M": 31, "3M": 92, "6M": 183, "1Y": 366}


@router.get("/{ticker}/candles")
async def get_candles(ticker: str, period: str = Query("3M"), db: AsyncSession = Depends(get_db)):
    t_date = latest_trading_day(datetime.now())
    span_days = _PERIOD_DAYS.get(period.upper(), 92)
    start_date = t_date - timedelta(days=span_days)
    
    stmt = (
        select(MarketRawData)
        .where(MarketRawData.ticker == ticker)
        .where(MarketRawData.date >= start_date)
        .order_by(MarketRawData.date.asc())
    )
    res = await db.execute(stmt)
    rows = res.scalars().all()
    
    data = []
    for r in rows:
        data.append({
            "time": r.date.strftime("%Y-%m-%d"),
            "open": r.open,
            "high": r.high,
            "low": r.low,
            "close": r.close,
            "volume": r.volume
        })
        
    return {"data": data, "status": "ok", "message": None}

@router.get("/{ticker}/flows")
async def get_flows(ticker: str, days: int = Query(7), db: AsyncSession = Depends(get_db)):
    t_date = latest_trading_day(datetime.now())
    start_date = t_date - timedelta(days=days*2) # Get some extra days to ensure we have enough trading days
    
    stmt = (
        select(MarketRawData, MarketIndicators)
        .join(MarketIndicators, (MarketRawData.ticker == MarketIndicators.ticker) & (MarketRawData.date == MarketIndicators.date))
        .where(MarketRawData.ticker == ticker)
        .where(MarketRawData.date >= start_date)
        .order_by(MarketRawData.date.desc())
        .limit(days)
    )
    res = await db.execute(stmt)
    rows = res.all()
    
    data = []
    for raw, ind in reversed(rows): # return ascending
        data.append({
            "date": raw.date.strftime("%Y-%m-%d"),
            "net_buy_indi": raw.net_buy_indi,
            "net_buy_inst": raw.net_buy_inst,
            "net_buy_frgn": raw.net_buy_frgn,
            "sfi_inst": round(float(ind.sfi_inst or 0), 2),
            "sfi_frgn": round(float(ind.sfi_frgn or 0), 2)
        })
        
    return {"data": data, "status": "ok", "message": None}

@router.get("/{ticker}/ma-events")
async def get_ma_events(ticker: str, limit: int = Query(5), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text(
            """
            with series as (
                select
                    date,
                    ma_5,
                    ma_20,
                    ma_60,
                    ma_120,
                    lag(ma_5) over (order by date) as prev_ma_5,
                    lag(ma_20) over (order by date) as prev_ma_20,
                    lag(ma_60) over (order by date) as prev_ma_60,
                    lag(ma_120) over (order by date) as prev_ma_120
                from market_indicators
                where ticker = :ticker
            ),
            events as (
                select date, 'GOLDEN_CROSS' as event_type, ma_5 as short_value, ma_20 as long_value, '5일선이 20일선을 상향 돌파했습니다.' as interpretation
                from series
                where prev_ma_5 is not null and prev_ma_20 is not null and ma_5 is not null and ma_20 is not null
                  and prev_ma_5 <= prev_ma_20 and ma_5 > ma_20
                union all
                select date, 'DEAD_CROSS' as event_type, ma_5 as short_value, ma_20 as long_value, '5일선이 20일선을 하향 이탈했습니다.' as interpretation
                from series
                where prev_ma_5 is not null and prev_ma_20 is not null and ma_5 is not null and ma_20 is not null
                  and prev_ma_5 >= prev_ma_20 and ma_5 < ma_20
                union all
                select date, 'GOLDEN_CROSS' as event_type, ma_20 as short_value, ma_60 as long_value, '20일선이 60일선을 상향 돌파했습니다.' as interpretation
                from series
                where prev_ma_20 is not null and prev_ma_60 is not null and ma_20 is not null and ma_60 is not null
                  and prev_ma_20 <= prev_ma_60 and ma_20 > ma_60
                union all
                select date, 'DEAD_CROSS' as event_type, ma_20 as short_value, ma_60 as long_value, '20일선이 60일선을 하향 이탈했습니다.' as interpretation
                from series
                where prev_ma_20 is not null and prev_ma_60 is not null and ma_20 is not null and ma_60 is not null
                  and prev_ma_20 >= prev_ma_60 and ma_20 < ma_60
            )
            select date, event_type, short_value, long_value, interpretation
            from events
            order by date desc
            limit :limit
            """
        ),
        {"ticker": ticker, "limit": limit},
    )
    data = [
        {
            "date": row.date.strftime("%Y-%m-%d"),
            "event_type": row.event_type,
            "short_value": round(float(row.short_value), 2),
            "long_value": round(float(row.long_value), 2),
            "interpretation": row.interpretation,
        }
        for row in result
    ]
    return {"data": data, "status": "ok", "message": None}

@router.get("/{ticker}/similar-patterns")
async def get_similar_patterns(ticker: str, date: Optional[date] = Query(None), n: int = Query(3), db: AsyncSession = Depends(get_db)):
    t_date = await get_target_date(date, db)
    result = await db.execute(
        text(
            """
            select
                i.date,
                i.sfi_inst,
                i.sfi_frgn,
                r.close
            from market_indicators i
            join market_raw_data r
              on r.date = i.date and r.ticker = i.ticker
            where i.ticker = :ticker
              and i.date <= :target_date
              and i.sfi_inst is not null
              and i.sfi_frgn is not null
              and r.close > 0
            order by i.date asc
            """
        ),
        {"ticker": ticker, "target_date": t_date},
    )
    rows = result.all()
    window = 5
    if len(rows) < window * 2:
        return {"data": [], "status": "ok", "message": None}

    current = rows[-window:]
    current_vector = []
    for row in current:
        current_vector.extend([float(row.sfi_inst), float(row.sfi_frgn)])

    candidates = []
    for start in range(0, len(rows) - window):
        segment = rows[start:start + window]
        period_end = segment[-1].date
        if period_end >= current[0].date:
            continue

        vector = []
        for row in segment:
            vector.extend([float(row.sfi_inst), float(row.sfi_frgn)])

        dot = sum(a * b for a, b in zip(current_vector, vector))
        current_norm = sum(a * a for a in current_vector) ** 0.5
        vector_norm = sum(a * a for a in vector) ** 0.5
        if current_norm == 0 or vector_norm == 0:
            continue
        cosine = dot / (current_norm * vector_norm)
        similarity = max(0, min(1, (cosine + 1) / 2))
        entry_close = float(segment[-1].close)

        close_5d = rows[start + window + 4].close if start + window + 4 < len(rows) else None
        close_20d = rows[start + window + 19].close if start + window + 19 < len(rows) else None
        return_5d = ((float(close_5d) - entry_close) / entry_close) * 100 if close_5d else None
        return_20d = ((float(close_20d) - entry_close) / entry_close) * 100 if close_20d else None

        if return_5d is not None and abs(return_5d) > 100:
            return_5d = None
        if return_20d is not None and abs(return_20d) > 100:
            return_20d = None

        candidates.append({
            "similar_ticker": ticker,
            "similar_name": "동일 종목 과거 구간",
            "period_start": segment[0].date.strftime("%Y-%m-%d"),
            "period_end": segment[-1].date.strftime("%Y-%m-%d"),
            "similarity": round(similarity, 4),
            "return_5d": round(return_5d, 2) if return_5d is not None else None,
            "return_20d": round(return_20d, 2) if return_20d is not None else None,
        })

    candidates.sort(key=lambda item: item["similarity"], reverse=True)
    return {"data": candidates[:n], "status": "ok", "message": None}
