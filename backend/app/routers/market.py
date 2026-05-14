from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.market import MarketIndicators, MarketIndex, MarketRawData, MarketSummary, StockMaster
from app.utils.trading_day import latest_trading_day

router = APIRouter()


async def get_target_date(d: Optional[date], db: AsyncSession) -> date:
    if d:
        return d

    for model in (MarketSummary, MarketIndicators, MarketRawData):
        result = await db.execute(select(func.max(model.date)))
        latest_date = result.scalar_one_or_none()
        if latest_date:
            return latest_date

    return latest_trading_day(datetime.now())


@router.get("/brief")
async def get_brief(date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    t_date = await get_target_date(date, db)
    result = await db.execute(select(MarketSummary).where(MarketSummary.date == t_date))
    summary = result.scalars().first()
    index_result = await db.execute(select(MarketIndex).where(MarketIndex.date == t_date))
    market_index = index_result.scalars().first()

    if not summary:
        data = {
            "date": t_date.strftime("%Y-%m-%d"),
            "market_brief_text": "해당 날짜의 시장 분석 데이터가 아직 없습니다. 백필 또는 장마감 배치를 실행하세요.",
            "kospi_close": 0,
            "kospi_change_pct": 0,
            "kosdaq_close": 0,
            "kosdaq_change_pct": 0,
            "usdkrw_close": 0,
            "status_badge": "empty",
        }
    else:
        data = {
            "date": t_date.strftime("%Y-%m-%d"),
            "market_brief_text": summary.market_brief_text,
            "kospi_close": market_index.kospi_close if market_index else 0,
            "kospi_change_pct": market_index.kospi_change_pct if market_index else 0,
            "kosdaq_close": market_index.kosdaq_close if market_index else 0,
            "kosdaq_change_pct": market_index.kosdaq_change_pct if market_index else 0,
            "usdkrw_close": market_index.usdkrw_close if market_index else 0,
            "status_badge": "confirmed",
        }
    return {"data": data, "status": "ok", "message": None}


@router.get("/dominance")
async def get_dominance(date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    t_date = await get_target_date(date, db)
    result = await db.execute(select(MarketSummary).where(MarketSummary.date == t_date))
    summary = result.scalars().first()

    if not summary:
        data = {
            "kospi": {"indi": 0, "inst": 0, "frgn": 0},
            "kosdaq": {"indi": 0, "inst": 0, "frgn": 0},
        }
        return {"data": data, "status": "ok", "message": None}

    return {
        "data": {
            "kospi": {
                "indi": summary.market_dominance_indi_kospi or 0,
                "inst": summary.market_dominance_inst_kospi or 0,
                "frgn": summary.market_dominance_frgn_kospi or 0,
            },
            "kosdaq": {
                "indi": summary.market_dominance_indi_kosdaq or 0,
                "inst": summary.market_dominance_inst_kosdaq or 0,
                "frgn": summary.market_dominance_frgn_kosdaq or 0,
            },
        },
        "status": "ok",
        "message": None,
    }


@router.get("/sectors")
async def get_sectors(date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    t_date = await get_target_date(date, db)

    result = await db.execute(
        text(
            """
            select
                coalesce(nullif(s.sector, ''), '기타') as sector,
                sum(coalesce(r.trade_value, 0)) as trade_value,
                case
                  when sum(coalesce(r.trade_value, 0)) > 0
                  then sum(coalesce(i.sfi_inst, 0) * coalesce(r.trade_value, 0)) / sum(coalesce(r.trade_value, 0))
                  else avg(i.sfi_inst)
                end as sfi_inst,
                case
                  when sum(coalesce(r.trade_value, 0)) > 0
                  then sum(coalesce(i.sfi_frgn, 0) * coalesce(r.trade_value, 0)) / sum(coalesce(r.trade_value, 0))
                  else avg(i.sfi_frgn)
                end as sfi_frgn
            from market_indicators i
            join stock_master s on i.ticker = s.ticker
            join market_raw_data r on r.ticker = i.ticker and r.date = i.date
            where i.date = :target_date
              and s.sector is not null
              and i.type in ('A', 'B', 'C', 'D')
            group by coalesce(nullif(s.sector, ''), '기타')
            order by trade_value desc
            """
        )
        ,
        {"target_date": t_date},
    )

    data = []
    for row in result.all():
        dom_type = "C"
        if row.sfi_inst and row.sfi_frgn and row.sfi_inst > 0 and row.sfi_frgn > 0:
            dom_type = "B"
        elif row.sfi_inst and row.sfi_inst < 0 and row.sfi_frgn and row.sfi_frgn < 0:
            dom_type = "A"
        elif row.sfi_inst and row.sfi_inst > 0 and row.sfi_frgn and row.sfi_frgn < 0:
            dom_type = "D"

        data.append(
            {
                "sector": row.sector,
                "sfi_inst": round(float(row.sfi_inst or 0), 2),
                "sfi_frgn": round(float(row.sfi_frgn or 0), 2),
                "trade_value": int(row.trade_value or 0),
                "dominant_type": dom_type,
            }
        )

    return {"data": data, "status": "ok", "message": None}


@router.get("/signals")
async def get_signals(date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    from app.services.screening import TRADE_VALUE_FLOOR
    t_date = await get_target_date(date, db)

    # Count sync: apply TRADE_VALUE_FLOOR filter same as Market Brief
    # Also join StockMaster to ensure consistency with Screener list
    stmt_count = (
        select(MarketIndicators.type, func.count(MarketIndicators.ticker))
        .join(MarketRawData, (MarketIndicators.ticker == MarketRawData.ticker) & (MarketIndicators.date == MarketRawData.date))
        .join(StockMaster, MarketIndicators.ticker == StockMaster.ticker)
        .where(MarketIndicators.date == t_date)
        .where(MarketIndicators.type.in_(['A', 'B', 'C', 'D']))
        .where(MarketRawData.trade_value >= TRADE_VALUE_FLOOR)
        .group_by(MarketIndicators.type)
    )
    count_res = await db.execute(stmt_count)
    counts = {row[0]: row[1] for row in count_res.all()}

    top_picks = {"A": [], "B": [], "C": [], "D": []}
    for signal_type in ["A", "B", "C", "D"]:
        stmt = (
            select(MarketIndicators, StockMaster.name)
            .join(StockMaster, MarketIndicators.ticker == StockMaster.ticker)
            .join(MarketRawData, (MarketIndicators.ticker == MarketRawData.ticker) & (MarketIndicators.date == MarketRawData.date))
            .where(MarketIndicators.date == t_date)
            .where(MarketIndicators.type == signal_type)
            .where(MarketRawData.trade_value >= TRADE_VALUE_FLOOR)
            .order_by(desc(MarketIndicators.priority_score))
            .limit(5)
        )
        res = await db.execute(stmt)
        for indicator, name in res.all():
            top_picks[signal_type].append(
                {
                    "ticker": indicator.ticker,
                    "name": name,
                    "type": indicator.type,
                    "type_intensity": round(float(indicator.type_intensity or 0), 2),
                    "weighted_priority": round(float(indicator.priority_score or 0), 2),
                }
            )

    return {
        "data": {
            "count_a": counts.get("A", 0),
            "count_b": counts.get("B", 0),
            "count_c": counts.get("C", 0),
            "count_d": counts.get("D", 0),
            "top_picks": top_picks,
        },
        "status": "ok",
        "message": None,
    }
