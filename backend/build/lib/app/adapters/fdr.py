import FinanceDataReader as fdr
import pandas as pd
from datetime import datetime, timedelta
from pykrx import stock


def _fetch_sector_classifications() -> pd.DataFrame:
    frames = []
    for offset in range(0, 10):
        target = (datetime.now() - timedelta(days=offset)).strftime("%Y%m%d")
        frames.clear()
        for market in ["KOSPI", "KOSDAQ"]:
            try:
                df = stock.get_market_sector_classifications(target, market=market)
            except Exception:
                continue
            if df.empty or "업종명" not in df.columns:
                continue
            df = df.reset_index().rename(columns={"종목코드": "ticker", "업종명": "sector"})
            frames.append(df[["ticker", "sector"]])
        if frames:
            break

    if not frames:
        return pd.DataFrame(columns=["ticker", "sector"])

    sector_df = pd.concat(frames, ignore_index=True)
    sector_df["ticker"] = sector_df["ticker"].astype(str).str.zfill(6)
    return sector_df.drop_duplicates("ticker", keep="last")

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
        df_krx['Sector'] = pd.NA
    
    df_krx = df_krx[['Code', 'Name', 'Sector', 'Market']]
    df_krx.rename(columns={
        "Code": "ticker",
        "Name": "name",
        "Sector": "sector",
        "Market": "market"
    }, inplace=True)
    
    df_krx['ticker'] = df_krx['ticker'].astype(str).str.zfill(6)
    sector_df = _fetch_sector_classifications()
    if not sector_df.empty:
        df_krx = df_krx.merge(sector_df, on="ticker", how="left", suffixes=("", "_krx"))
        df_krx["sector"] = df_krx["sector_krx"].combine_first(df_krx["sector"])
        df_krx = df_krx.drop(columns=["sector_krx"])

    df_krx['sector'] = df_krx['sector'].fillna("기타")
    df_krx['is_active'] = True
    df_krx['updated_at'] = datetime.now()
    
    return df_krx
