from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional
from datetime import date
from app.db import get_db
from app.models.market import MarketIndicators, StockMaster, MarketRawData

router = APIRouter()

SIGNAL_TYPES = ("A", "B", "C", "D")


async def get_target_date(d: Optional[date], db: AsyncSession) -> date:
    if d:
        return d
    from app.models.market import MarketSummary, MarketRawData
    for model in (MarketSummary, MarketIndicators, MarketRawData):
        result = await db.execute(select(func.max(model.date)))
        latest_date = result.scalar_one_or_none()
        if latest_date:
            return latest_date
    from app.utils.trading_day import latest_trading_day
    from datetime import datetime
    return latest_trading_day(datetime.now())

@router.get("")
async def get_screener(
    date: Optional[date] = Query(None),
    type: Optional[str] = Query("ALL"),
    defense: Optional[str] = Query("ALL"),
    sfi_inst_min: float = Query(-100.0),
    sfi_frgn_min: float = Query(-100.0),
    page: int = Query(1),
    size: int = Query(1000),
    db: AsyncSession = Depends(get_db)
):
    t_date = await get_target_date(date, db)
    if t_date is None:
        return {
            "data": {
                "items": [],
                "total": 0,
                "page": page,
                "size": size,
            },
            "status": "ok",
            "message": None,
        }
    
    from app.services.screening import TRADE_VALUE_FLOOR
    stmt = (
        select(MarketIndicators, StockMaster, MarketRawData)
        .join(StockMaster, MarketIndicators.ticker == StockMaster.ticker)
        .outerjoin(MarketRawData, (MarketIndicators.ticker == MarketRawData.ticker) & (MarketRawData.date == t_date))
        .where(MarketIndicators.date == t_date)
        .where(MarketRawData.trade_value >= TRADE_VALUE_FLOOR)
    )
    
    if type and type != "ALL":
        stmt = stmt.where(MarketIndicators.type == type)
    else:
        stmt = stmt.where(MarketIndicators.type.in_(SIGNAL_TYPES))
    if defense and defense != "ALL":
        stmt = stmt.where(MarketIndicators.defense_status == defense)
    stmt = stmt.where(MarketIndicators.sfi_inst >= sfi_inst_min)
    stmt = stmt.where(MarketIndicators.sfi_frgn >= sfi_frgn_min)
        
    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one_or_none() or 0
    
    # Paginate
    stmt = stmt.order_by(desc(MarketIndicators.priority_score)).offset((page - 1) * size).limit(size)
    res = await db.execute(stmt)
    rows = res.all()
    
    items = []
    for ind, master, raw in rows:
        items.append({
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
            "dominance_indi": round(float(ind.dominance_indi or 0) * 100, 2),
            "dominance_inst": round(float(ind.dominance_inst or 0) * 100, 2),
            "dominance_frgn": round(float(ind.dominance_frgn or 0) * 100, 2),
            "defense_status": ind.defense_status,
            "priority_score": round(float(ind.priority_score or 0), 2)
        })

    return {
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "size": size
        },
        "status": "ok",
        "message": None
    }
