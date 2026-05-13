import asyncio
import logging
import os
from datetime import date

from sqlalchemy import func, select

from app.db import AsyncSessionLocal
from app.models.market import MarketSummary
from app.services import pipeline

logger = logging.getLogger(__name__)


async def bootstrap_demo_data_if_empty() -> None:
    if os.environ.get("AUTO_BOOTSTRAP_DEMO_DATA", "1") != "1":
        return

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count()).select_from(MarketSummary))
        summary_count = result.scalar_one()

    if summary_count:
        return

    target_date = date.fromisoformat(os.environ.get("BOOTSTRAP_DATE", "2024-05-08"))
    logger.info("MarketSummary is empty. Bootstrapping demo data for %s", target_date)
    await pipeline.run_master_sync()
    await pipeline.fetch_and_upsert_raw_data(target_date)
    await pipeline.run_eod_analysis(target_date)
    logger.info("Demo data bootstrap completed for %s", target_date)


def schedule_bootstrap_demo_data() -> None:
    asyncio.create_task(bootstrap_demo_data_if_empty())
