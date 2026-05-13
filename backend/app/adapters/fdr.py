import FinanceDataReader as fdr
import pandas as pd
from datetime import datetime

def sync_stock_master(include_delisted: bool = False) -> pd.DataFrame:
    """
    FinanceDataReader에서 상장 종목 메타데이터(섹터 등)를 조회하여 반환
    """
    df_krx = fdr.StockListing('KRX')
    
    # KOSPI, KOSDAQ 필터링
    df_krx = df_krx[df_krx['Market'].isin(['KOSPI', 'KOSDAQ'])]
    
    if not include_delisted:
        # Fdr_krx 상장 폐지 구분은 보통 없음, 현재 리스팅 기준
        pass
    
    if 'Sector' not in df_krx.columns:
        df_krx['Sector'] = '기타'
    
    df_krx = df_krx[['Code', 'Name', 'Sector', 'Market']]
    df_krx.rename(columns={
        "Code": "ticker",
        "Name": "name",
        "Sector": "sector",
        "Market": "market"
    }, inplace=True)
    
    # 결측치 처리
    df_krx['sector'] = df_krx['sector'].fillna("기타")
    df_krx['is_active'] = True
    df_krx['updated_at'] = datetime.now()
    
    return df_krx
