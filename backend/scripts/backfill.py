import asyncio
from datetime import date, timedelta
from pykrx import stock

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
    start = date.today() - timedelta(days=2)
    end = date.today()
    asyncio.run(backfill(start, end))
