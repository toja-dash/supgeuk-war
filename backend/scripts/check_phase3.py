import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from app.db import AsyncSessionLocal
from app.models.market import MarketIndicators, StockMaster
import pandas as pd

async def check():
    async with AsyncSessionLocal() as session:
        # 주요 종목(삼성전자, SK하이닉스 등) 지표 확인
        stmt = select(MarketIndicators, StockMaster.name).join(
            StockMaster, MarketIndicators.ticker == StockMaster.ticker
        ).filter(
            MarketIndicators.ticker.in_(['005930', '000660', '005380'])
        ).order_by(MarketIndicators.date.desc()).limit(10)
        
        result = await session.execute(stmt)
        rows = result.all()
        
        if not rows:
            print("DB에 데이터가 없습니다. python -m scripts.backfill 명령어가 끝까지 완료되었는지 확인해주세요.")
            return
            
        data = []
        for ind, name in rows:
            data.append({
                'Date': ind.date,
                'Ticker': ind.ticker,
                'Name': name,
                'Type': ind.type,
                'Type_Int': ind.type_intensity,
                'Def_Status': ind.defense_status,
                'SFI_Inst': ind.sfi_inst,
                'SFI_Frgn': ind.sfi_frgn,
                'P_Score': ind.priority_score
            })
            
        df = pd.DataFrame(data)
        print("\n=== Phase 3 지표 산출 결과 샘플 (DB) ===")
        print(df.to_string(index=False))

if __name__ == "__main__":
    asyncio.run(check())
