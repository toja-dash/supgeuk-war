from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional
from datetime import date
from app.db import get_db
from app.models.market import MarketSummary, MarketIndicators, StockMaster, MarketRawData, MarketIndex
from app.utils.trading_day import latest_trading_day
from datetime import datetime

router = APIRouter()

def get_target_date(d: Optional[date]) -> date:
    return d if d else latest_trading_day(datetime.now())

@router.get("/brief")
async def get_brief(date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    t_date = get_target_date(date)
    result = await db.execute(select(MarketSummary).where(MarketSummary.date == t_date))
    summary = result.scalars().first()
    index_result = await db.execute(select(MarketIndex).where(MarketIndex.date == t_date))
    market_index = index_result.scalars().first()
    
    if not summary:
        data = {
            "date": t_date.strftime("%Y-%m-%d"),
            "market_brief_text": "아직 해당 일자의 시황 데이터가 수집되지 않았습니다.",
            "kospi_close": 0, "kospi_change_pct": 0,
            "kosdaq_close": 0, "kosdaq_change_pct": 0,
            "usdkrw_close": 0,
            "status_badge": "live"
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
            "status_badge": "confirmed"
        }
    return {"data": data, "status": "ok", "message": None}

@router.get("/dominance")
async def get_dominance(date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    t_date = get_target_date(date)
    result = await db.execute(select(MarketSummary).where(MarketSummary.date == t_date))
    summary = result.scalars().first()
    
    if not summary:
        return {"data": {"kospi": {"indi": 0, "inst": 0, "frgn": 0}, "kosdaq": {"indi": 0, "inst": 0, "frgn": 0}}, "status": "ok"}
        
    return {"data": {
        "kospi": {"indi": 0.0, "inst": summary.market_sfi_inst_kospi or 0, "frgn": summary.market_sfi_frgn_kospi or 0},
        "kosdaq": {"indi": 0.0, "inst": summary.market_sfi_inst_kosdaq or 0, "frgn": summary.market_sfi_frgn_kosdaq or 0}
    }, "status": "ok", "message": None}

@router.get("/sectors")
async def get_sectors(date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    t_date = get_target_date(date)
    
    stmt = (
        select(
            StockMaster.sector,
            func.avg(MarketIndicators.sfi_inst).label("sfi_inst"),
            func.avg(MarketIndicators.sfi_frgn).label("sfi_frgn")
        )
        .join(StockMaster, MarketIndicators.ticker == StockMaster.ticker)
        .where(MarketIndicators.date == t_date)
        .where(StockMaster.sector.isnot(None))
        .group_by(StockMaster.sector)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    data = []
    for r in rows:
        dom_type = "C" # Default
        if r.sfi_inst and r.sfi_frgn and r.sfi_inst > 0 and r.sfi_frgn > 0:
            dom_type = "B"
        elif r.sfi_inst and r.sfi_inst < 0 and r.sfi_frgn and r.sfi_frgn < 0:
            dom_type = "A"
        elif r.sfi_inst and r.sfi_inst > 0 and r.sfi_frgn and r.sfi_frgn < 0:
            dom_type = "D"
            
        data.append({
            "sector": r.sector,
            "sfi_inst": round(float(r.sfi_inst or 0), 2),
            "sfi_frgn": round(float(r.sfi_frgn or 0), 2),
            "trade_value": 0,
            "dominant_type": dom_type
        })
    
    data.sort(key=lambda x: x["sfi_inst"] + x["sfi_frgn"], reverse=True)
    return {"data": data[:10], "status": "ok", "message": None}

@router.get("/signals")
async def get_signals(date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    t_date = get_target_date(date)
    
    stmt_count = select(MarketIndicators.type, func.count(MarketIndicators.ticker)).where(MarketIndicators.date == t_date).where(MarketIndicators.type.isnot(None)).group_by(MarketIndicators.type)
    count_res = await db.execute(stmt_count)
    counts = {r[0]: r[1] for r in count_res.all()}
    
    top_picks = {"A": [], "B": [], "C": [], "D": []}
    for t in ["A", "B", "C", "D"]:
        stmt = (
            select(MarketIndicators, StockMaster.name)
            .join(StockMaster, MarketIndicators.ticker == StockMaster.ticker)
            .where(MarketIndicators.date == t_date)
            .where(MarketIndicators.type == t)
            .order_by(desc(MarketIndicators.priority_score))
            .limit(5)
        )
        res = await db.execute(stmt)
        rows = res.all()
        for ind, name in rows:
            top_picks[t].append({
                "ticker": ind.ticker,
                "name": name,
                "type": ind.type,
                "type_intensity": round(float(ind.type_intensity or 0), 2),
                "weighted_priority": round(float(ind.priority_score or 0), 2)
            })
            
    return {"data": {
        "count_a": counts.get("A", 0),
        "count_b": counts.get("B", 0),
        "count_c": counts.get("C", 0),
        "count_d": counts.get("D", 0),
        "top_picks": top_picks
    }, "status": "ok", "message": None}
