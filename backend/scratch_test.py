import sys, asyncio
sys.path.insert(0, '.')
from app.adapters.fdr import sync_stock_master
from app.db import AsyncSessionLocal
from app.models.market import StockMaster
from sqlalchemy.dialects.postgresql import insert
from app.services.pipeline import clean_nan

async def test():
    df = sync_stock_master(include_delisted=False)
    records = clean_nan(df.to_dict(orient='records'))
    async with AsyncSessionLocal() as session:
        for r in records:
            stmt = insert(StockMaster).values([r]).on_conflict_do_update(index_elements=['ticker'], set_=r)
            try:
                await session.execute(stmt)
            except Exception as e:
                print('Failed row:', r)
                print('Error:', str(e))
                break

asyncio.run(test())
