from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, text
from typing import Optional
from datetime import date, timedelta
from app.db import get_db
from app.models.market import MarketIndicators, StockMaster, MarketRawData

router = APIRouter()

SIGNAL_TYPES = ("A", "B", "C", "D")
ARCHIVE_LOOKBACK_DAYS = 90


def _to_float(value):
    return round(float(value), 2) if value is not None else 0


def _summary_text(signal_type: str, total: int, n_5d: int, n_20d: int) -> str:
    if total == 0:
        return f"Type {signal_type} 발생 사례가 아직 없습니다."
    return (
        f"Type {signal_type} 통계: 최근 3개월 범위 내 현재 적재된 데이터 기준 "
        f"{total}건 발생, 5일 후 수익률 표본 {n_5d}건, 20일 후 수익률 표본 {n_20d}건입니다."
    )


@router.get("/summary")
async def get_summary(date: Optional[date] = Query(None), db: AsyncSession = Depends(get_db)):
    latest_date = date or await db.scalar(select(func.max(MarketIndicators.date)))
    if latest_date is None:
        return {
            "data": {
                t: {
                    "total_count": 0,
                    "avg_return_5d": 0,
                    "win_rate_5d": 0,
                    "avg_return_20d": 0,
                    "win_rate_20d": 0,
                    "archive_summary": f"Type {t} 발생 사례가 아직 없습니다.",
                }
                for t in SIGNAL_TYPES
            },
            "status": "ok",
            "message": None,
        }

    start_date = latest_date - timedelta(days=ARCHIVE_LOOKBACK_DAYS)
    result = await db.execute(
        text(
            """
            with future as (
                select
                    i.type,
                    i.date,
                    i.ticker,
                    r.close as entry_close,
                    r5.close as close_5d,
                    r20.close as close_20d
                from market_indicators i
                join market_raw_data r
                  on r.date = i.date and r.ticker = i.ticker
                left join lateral (
                    select r2.close
                    from market_raw_data r2
                    where r2.ticker = i.ticker
                      and r2.date > i.date
                      and r2.close > 0
                    order by r2.date asc
                    offset 4 limit 1
                ) r5 on true
                left join lateral (
                    select r2.close
                    from market_raw_data r2
                    where r2.ticker = i.ticker
                      and r2.date > i.date
                      and r2.close > 0
                    order by r2.date asc
                    offset 19 limit 1
                ) r20 on true
                where i.type in ('A', 'B', 'C', 'D')
                  and i.date >= :start_date
                  and i.date <= :latest_date
                  and r.close > 0
            )
            select
                type,
                count(*) as total_count,
                count(close_5d) as n_5d,
                avg(((close_5d - entry_close)::numeric / entry_close) * 100)
                    filter (where close_5d is not null) as avg_return_5d,
                avg(case when close_5d > entry_close then 1.0 else 0.0 end)
                    filter (where close_5d is not null) as win_rate_5d,
                count(close_20d) as n_20d,
                avg(((close_20d - entry_close)::numeric / entry_close) * 100)
                    filter (where close_20d is not null) as avg_return_20d,
                avg(case when close_20d > entry_close then 1.0 else 0.0 end)
                    filter (where close_20d is not null) as win_rate_20d
            from future
            group by type
            """
        ),
        {"start_date": start_date, "latest_date": latest_date},
    )

    data = {
        t: {
            "total_count": 0,
            "avg_return_5d": 0,
            "win_rate_5d": 0,
            "avg_return_20d": 0,
            "win_rate_20d": 0,
            "archive_summary": f"Type {t} 발생 사례가 아직 없습니다.",
        }
        for t in SIGNAL_TYPES
    }
    for row in result:
        n_5d = int(row.n_5d or 0)
        n_20d = int(row.n_20d or 0)
        data[row.type] = {
            "total_count": int(row.total_count or 0),
            "avg_return_5d": _to_float(row.avg_return_5d),
            "win_rate_5d": round(float(row.win_rate_5d or 0), 4),
            "avg_return_20d": _to_float(row.avg_return_20d),
            "win_rate_20d": round(float(row.win_rate_20d or 0), 4),
            "archive_summary": _summary_text(row.type, int(row.total_count or 0), n_5d, n_20d),
        }

    return {"data": data, "status": "ok", "message": None}

@router.get("/cases")
async def get_cases(
    type: str = Query("B"),
    page: int = Query(1),
    size: int = Query(50),
    db: AsyncSession = Depends(get_db)
):
    latest_date = await db.scalar(select(func.max(MarketIndicators.date)))
    start_date = latest_date - timedelta(days=ARCHIVE_LOOKBACK_DAYS) if latest_date else None
    signal_type = type if type in SIGNAL_TYPES else "B"

    stmt = (
        select(MarketIndicators, StockMaster)
        .join(StockMaster, MarketIndicators.ticker == StockMaster.ticker)
        .where(MarketIndicators.type == signal_type)
    )
    if start_date is not None:
        stmt = stmt.where(MarketIndicators.date >= start_date)
    
    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one_or_none() or 0
    
    # Paginate
    offset = (page - 1) * size
    res = await db.execute(
        text(
            """
            select
                i.date,
                i.ticker,
                s.name,
                s.sector,
                i.type_intensity,
                i.priority_score,
                i.sfi_inst,
                i.sfi_frgn,
                case
                  when r.close > 0 and r5.close is not null
                  then ((r5.close - r.close)::numeric / r.close) * 100
                end as return_5d,
                case
                  when r.close > 0 and r20.close is not null
                  then ((r20.close - r.close)::numeric / r.close) * 100
                end as return_20d
            from market_indicators i
            join stock_master s on i.ticker = s.ticker
            left join market_raw_data r on r.date = i.date and r.ticker = i.ticker
            left join lateral (
                select r2.close
                from market_raw_data r2
                where r2.ticker = i.ticker
                  and r2.date > i.date
                  and r2.close > 0
                order by r2.date asc
                offset 4 limit 1
            ) r5 on true
            left join lateral (
                select r2.close
                from market_raw_data r2
                where r2.ticker = i.ticker
                  and r2.date > i.date
                  and r2.close > 0
                order by r2.date asc
                offset 19 limit 1
            ) r20 on true
            where i.type = :signal_type
              and (:start_date is null or i.date >= :start_date)
            order by i.date desc
            offset :offset
            limit :size
            """
        ),
        {
            "signal_type": signal_type,
            "start_date": start_date,
            "offset": offset,
            "size": size,
        },
    )
    rows = res.all()
    
    items = []
    for row in rows:
        items.append({
            "date": row.date.strftime("%Y-%m-%d"),
            "ticker": row.ticker,
            "name": row.name,
            "sector": row.sector,
            "type_intensity": round(float(row.type_intensity or 0), 2),
            "priority_score": round(float(row.priority_score or 0), 2),
            "sfi_inst": round(float(row.sfi_inst or 0), 2),
            "sfi_frgn": round(float(row.sfi_frgn or 0), 2),
            "return_5d": _to_float(row.return_5d) if row.return_5d is not None else None,
            "return_20d": _to_float(row.return_20d) if row.return_20d is not None else None,
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


@router.get("/highlights")
async def get_highlights(
    type: str = Query("B"),
    size: int = Query(3),
    db: AsyncSession = Depends(get_db),
):
    latest_date = await db.scalar(select(func.max(MarketIndicators.date)))
    if latest_date is None:
        return {"data": [], "status": "ok", "message": None}

    signal_type = type if type in SIGNAL_TYPES else "B"
    start_date = latest_date - timedelta(days=ARCHIVE_LOOKBACK_DAYS)
    result = await db.execute(
        text(
            """
            with realized as (
                select
                    i.type,
                    i.date,
                    i.ticker,
                    s.name,
                    s.sector,
                    i.sfi_inst,
                    i.sfi_frgn,
                    i.type_intensity,
                    i.priority_score,
                    ((r5.close - r.close)::numeric / r.close) * 100 as return_5d,
                    ((r20.close - r.close)::numeric / r.close) * 100 as return_20d
                from market_indicators i
                join stock_master s on i.ticker = s.ticker
                join market_raw_data r on r.date = i.date and r.ticker = i.ticker
                join lateral (
                    select r2.close
                    from market_raw_data r2
                    where r2.ticker = i.ticker
                      and r2.date > i.date
                      and r2.close > 0
                    order by r2.date asc
                    offset 4 limit 1
                ) r5 on true
                join lateral (
                    select r2.close
                    from market_raw_data r2
                    where r2.ticker = i.ticker
                      and r2.date > i.date
                      and r2.close > 0
                    order by r2.date asc
                    offset 19 limit 1
                ) r20 on true
                where i.type = :signal_type
                  and i.date >= :start_date
                  and i.date <= :latest_date
                  and r.close > 0
            )
            select *
            from realized
            order by abs(return_20d) desc, abs(return_5d) desc
            limit :size
            """
        ),
        {
            "signal_type": signal_type,
            "start_date": start_date,
            "latest_date": latest_date,
            "size": size,
        },
    )

    data = []
    for row in result:
        data.append(
            {
                "type": row.type,
                "date": row.date.strftime("%Y-%m-%d"),
                "ticker": row.ticker,
                "name": row.name,
                "sector": row.sector,
                "sfi_inst": round(float(row.sfi_inst or 0), 2),
                "sfi_frgn": round(float(row.sfi_frgn or 0), 2),
                "type_intensity": round(float(row.type_intensity or 0), 2),
                "priority_score": round(float(row.priority_score or 0), 2),
                "return_5d": _to_float(row.return_5d),
                "return_20d": _to_float(row.return_20d),
            }
        )

    return {"data": data, "status": "ok", "message": None}
