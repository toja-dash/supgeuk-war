import FinanceDataReader as fdr
import pandas as pd
from datetime import date, datetime

def fetch_index_daily(target_date: date) -> dict:
    """
    지수 및 환율 수집
    """
    date_str = target_date.strftime("%Y-%m-%d")
    
    # 코스피 (KS11)
    df_kospi = fdr.DataReader('KS11', date_str, date_str)
    # 코스닥 (KQ11)
    df_kosdaq = fdr.DataReader('KQ11', date_str, date_str)
    # 환율 (USD/KRW)
    df_usdkrw = fdr.DataReader('USD/KRW', date_str, date_str)
    
    def get_val(df, col):
        if not df.empty and col in df.columns:
            return float(df.iloc[0][col])
        return 0.0

    return {
        "date": target_date,
        "kospi_close": get_val(df_kospi, 'Close'),
        "kospi_change_pct": get_val(df_kospi, 'Change') * 100,
        "kosdaq_close": get_val(df_kosdaq, 'Close'),
        "kosdaq_change_pct": get_val(df_kosdaq, 'Change') * 100,
        "usdkrw_close": get_val(df_usdkrw, 'Close'),
        "updated_at": datetime.now()
    }
