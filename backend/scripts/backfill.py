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

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=date.fromisoformat)
    parser.add_argument("--end", type=date.fromisoformat, default=date.today())
    args = parser.parse_args()

    start = args.start or (args.end - timedelta(days=365 * 3 + 31))
    asyncio.run(backfill(start, args.end))
