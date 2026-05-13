from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional
from datetime import date
from app.db import get_db
from app.models.market import MarketIndicators, StockMaster, MarketRawData

router = APIRouter()

@router.get("/summary")
async def get_summary(date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    # ArchivePatternStats is not populated yet in the MVP, so return mock data
    return {"data": {
        "A": {"total_count": 120, "avg_return_5d": -3.5, "win_rate_5d": 20, "avg_return_20d": -8.0, "win_rate_20d": 15, "archive_summary": "Type A 통계 (과거 데이터 부족으로 임시 표출 중입니다)"},
        "B": {"total_count": 200, "avg_return_5d": 4.5, "win_rate_5d": 65, "avg_return_20d": 10.0, "win_rate_20d": 60, "archive_summary": "Type B 통계 (과거 데이터 부족으로 임시 표출 중입니다)"},
        "C": {"total_count": 150, "avg_return_5d": 1.5, "win_rate_5d": 50, "avg_return_20d": 2.5, "win_rate_20d": 45, "archive_summary": "Type C 통계 (과거 데이터 부족으로 임시 표출 중입니다)"},
        "D": {"total_count": 180, "avg_return_5d": 2.0, "win_rate_5d": 55, "avg_return_20d": 5.0, "win_rate_20d": 52, "archive_summary": "Type D 통계 (과거 데이터 부족으로 임시 표출 중입니다)"}
    }, "status": "ok", "message": None}

@router.get("/cases")
async def get_cases(
    type: str = Query("B"),
    page: int = Query(1),
    size: int = Query(50),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(MarketIndicators, StockMaster)
        .join(StockMaster, MarketIndicators.ticker == StockMaster.ticker)
        .where(MarketIndicators.type == type)
    )
    
    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one_or_none() or 0
    
    # Paginate
    stmt = stmt.order_by(desc(MarketIndicators.date)).offset((page - 1) * size).limit(size)
    res = await db.execute(stmt)
    rows = res.all()
    
    items = []
    for ind, master in rows:
        items.append({
            "date": ind.date.strftime("%Y-%m-%d"),
            "ticker": ind.ticker,
            "name": master.name,
            "sector": master.sector,
            "type_intensity": round(float(ind.type_intensity or 0), 2),
            "priority_score": round(float(ind.priority_score or 0), 2),
            "sfi_inst": round(float(ind.sfi_inst or 0), 2),
            "sfi_frgn": round(float(ind.sfi_frgn or 0), 2),
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
