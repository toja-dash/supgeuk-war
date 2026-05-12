from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
from datetime import date, timedelta
from app.db import get_db
from app.models.market import MarketIndicators, StockMaster, MarketRawData
from app.utils.trading_day import latest_trading_day
from app.services.scoring import generate_insights
from datetime import datetime
import pandas as pd

router = APIRouter()

def get_target_date(d: Optional[date]) -> date:
    return d if d else latest_trading_day(datetime.now())

@router.get("/{ticker}")
async def get_stock_info(ticker: str, date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    t_date = get_target_date(date)
    
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
        "avg_cost_20d_inst": raw.avg_cost_20d_inst if raw else 0,
        "avg_cost_20d_frgn": raw.avg_cost_20d_frgn if raw else 0,
        "deep_dive_headline": headline,
        "deep_dive_line1": line1,
        "deep_dive_line2": line2
    }, "status": "ok", "message": None}

@router.get("/{ticker}/candles")
async def get_candles(ticker: str, period: str = Query("3M"), db: AsyncSession = Depends(get_db)):
    t_date = latest_trading_day(datetime.now())
    start_date = t_date - timedelta(days=90) # roughly 3 months
    
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
    return {"data": [], "status": "ok", "message": None}

@router.get("/{ticker}/similar-patterns")
async def get_similar_patterns(ticker: str, date: Optional[date] = Query(None), n: int = Query(3), db: AsyncSession = Depends(get_db)):
    return {"data": [], "status": "ok", "message": None}
