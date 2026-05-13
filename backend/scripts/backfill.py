import asyncio
import argparse
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

async def backfill(start_date: date, end_date: date):
    print(f"Starting backfill from {start_date} to {end_date}")
    
    from app.services import pipeline
    from app.utils.trading_day import trading_days_between
    
    await pipeline.run_master_sync()
    
    days = trading_days_between(start_date, end_date)
    for d in days:
        await pipeline.fetch_and_upsert_raw_data(d)
        
    for d in days:
        await pipeline.run_eod_analysis(d)
        
    print("Backfill complete.")


async def analyze_existing(start_date: date, end_date: date):
    print(f"Starting analysis from existing raw data from {start_date} to {end_date}")

    from sqlalchemy import select

    from app.db import AsyncSessionLocal
    from app.models.market import MarketRawData
    from app.services import pipeline

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MarketRawData.date)
            .where(MarketRawData.date >= start_date)
            .where(MarketRawData.date <= end_date)
            .distinct()
            .order_by(MarketRawData.date.asc())
        )
        days = [row[0] for row in result.all()]

    if days:
        await pipeline.run_eod_analysis_range(days[0], days[-1])

    print("Analysis complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=date.fromisoformat)
    parser.add_argument("--end", type=date.fromisoformat, default=date.today())
    parser.add_argument("--analysis-only", action="store_true")
    args = parser.parse_args()

    start = args.start or (args.end - timedelta(days=365 * 3 + 31))
    if args.analysis_only:
        asyncio.run(analyze_existing(start, args.end))
    else:
        asyncio.run(backfill(start, args.end))
