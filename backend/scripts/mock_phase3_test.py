import asyncio
import sys
import os
import pandas as pd
from datetime import date, timedelta
from sqlalchemy.dialects.postgresql import insert

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.db import AsyncSessionLocal
from app.models.market import StockMaster, MarketRawData
from app.services.pipeline import run_eod_analysis

async def setup_mock_data():
    today = date(2026, 5, 8)
    
    # 1. Mock Stock Master
    stocks = [
        {'ticker': '005930', 'name': '삼성전자', 'sector': '전기전자', 'market': 'KOSPI', 'is_active': True, 'updated_at': pd.Timestamp.now()},
        {'ticker': '000660', 'name': 'SK하이닉스', 'sector': '전기전자', 'market': 'KOSPI', 'is_active': True, 'updated_at': pd.Timestamp.now()},
    ]
    
    # 2. Mock 60 days of Raw Data
    raw_data = []
    for i in range(60, -1, -1):
        d = today - timedelta(days=i)
        # Skip weekends
        if d.weekday() > 4: continue
        
        raw_data.append({
            'date': d, 'ticker': '005930', 'open': 80000, 'high': 82000, 'low': 79000, 'close': 81000 + i*100,
            'volume': 1000000, 'trade_value': 80000000000,
            'net_buy_indi': -6000000000, 'net_buy_inst': 3000000000, 'net_buy_frgn': 3000000000,
            'net_qty_inst': 100000, 'net_qty_frgn': 150000
        })
        raw_data.append({
            'date': d, 'ticker': '000660', 'open': 150000, 'high': 155000, 'low': 148000, 'close': 152000 - i*200,
            'volume': 500000, 'trade_value': 75000000000,
            'net_buy_indi': 0, 'net_buy_inst': -3000000000, 'net_buy_frgn': 3000000000,
            'net_qty_inst': -50000, 'net_qty_frgn': 50000
        })
        
    async with AsyncSessionLocal() as session:
        # Upsert Master
        stmt_m = insert(StockMaster).values(stocks)
        stmt_m = stmt_m.on_conflict_do_nothing()
        await session.execute(stmt_m)
        
        # Upsert Raw
        stmt_r = insert(MarketRawData).values(raw_data)
        stmt_r = stmt_r.on_conflict_do_update(
            index_elements=['date', 'ticker'],
            set_={
                'net_buy_inst': stmt_r.excluded.net_buy_inst,
                'net_buy_frgn': stmt_r.excluded.net_buy_frgn,
                'net_buy_indi': stmt_r.excluded.net_buy_indi,
                'net_qty_inst': stmt_r.excluded.net_qty_inst,
                'net_qty_frgn': stmt_r.excluded.net_qty_frgn
            }
        )
        await session.execute(stmt_r)
        
        await session.commit()
        
    print("Mock raw data inserted.")
    
    # Run Phase 3 EOD analysis for today
    await run_eod_analysis(today)
    print("Phase 3 EOD analysis completed.")

if __name__ == "__main__":
    asyncio.run(setup_mock_data())
