from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

from app.services import pipeline
from datetime import datetime
from app.utils.trading_day import latest_trading_day

async def job_master_sync():
    logger.info("Executing master_sync")
    await pipeline.run_master_sync()

async def job_intra_snapshot():
    logger.info("Executing intra_snapshot")
    t_date = latest_trading_day(datetime.now())
    await pipeline.fetch_and_upsert_raw_data(t_date)

async def job_eod_provisional():
    logger.info("Executing eod_provisional")
    t_date = latest_trading_day(datetime.now())
    await pipeline.fetch_and_upsert_raw_data(t_date)

async def job_eod_confirmed():
    logger.info("Executing eod_confirmed")
    t_date = latest_trading_day(datetime.now())
    await pipeline.fetch_and_upsert_raw_data(t_date)
    await pipeline.run_eod_analysis(t_date)

def setup_scheduler():
    if scheduler.running:
        return

    # master_sync: 매일 06:00
    scheduler.add_job(job_master_sync, CronTrigger(hour=6, minute=0), id="master_sync")
    
    # intra_snapshot: 장중 09:30, 10:30, 11:30, 13:30, 14:30
    scheduler.add_job(job_intra_snapshot, CronTrigger(hour="9,10,11,13,14", minute=30), id="intra_snapshot")
    
    # eod_provisional: 15:30
    scheduler.add_job(job_eod_provisional, CronTrigger(hour=15, minute=30), id="eod_provisional")
    
    # eod_confirmed: 18:00
    scheduler.add_job(job_eod_confirmed, CronTrigger(hour=18, minute=0), id="eod_confirmed")
    
    scheduler.start()
