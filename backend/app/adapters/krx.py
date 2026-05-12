import pandas as pd
from datetime import date
from pykrx import stock

def fetch_daily(target_date: date) -> pd.DataFrame:
    """
    KRX에서 target_date의 전 종목 시세 및 수급 데이터를 조회하여 병합 후 반환
    """
    date_str = target_date.strftime("%Y%m%d")
    
    try:
        df_ohlcv_kospi = stock.get_market_ohlcv(date_str, market="KOSPI")
        df_ohlcv_kosdaq = stock.get_market_ohlcv(date_str, market="KOSDAQ")
        df_ohlcv = pd.concat([df_ohlcv_kospi, df_ohlcv_kosdaq])
        if df_ohlcv.empty:
            return pd.DataFrame()
    except Exception as e:
        print(f"Failed to fetch OHLCV for {date_str}: {e}")
        return pd.DataFrame()
    
    df_ohlcv = df_ohlcv.reset_index()
    df_ohlcv.rename(columns={
        "티커": "ticker",
        "시가": "open",
        "고가": "high",
        "저가": "low",
        "종가": "close",
        "거래량": "volume",
        "거래대금": "trade_value"
    }, inplace=True)
    
    # 2. 투자자별 순매수 조회 (개인, 기관, 외국인)
    df_net_indi_kospi = stock.get_market_net_purchases_of_equities_by_ticker(date_str, date_str, market="KOSPI", investor="개인")
    df_net_inst_kospi = stock.get_market_net_purchases_of_equities_by_ticker(date_str, date_str, market="KOSPI", investor="기관합계")
    df_net_frgn_kospi = stock.get_market_net_purchases_of_equities_by_ticker(date_str, date_str, market="KOSPI", investor="외국인")
    
    df_net_indi_kosdaq = stock.get_market_net_purchases_of_equities_by_ticker(date_str, date_str, market="KOSDAQ", investor="개인")
    df_net_inst_kosdaq = stock.get_market_net_purchases_of_equities_by_ticker(date_str, date_str, market="KOSDAQ", investor="기관합계")
    df_net_frgn_kosdaq = stock.get_market_net_purchases_of_equities_by_ticker(date_str, date_str, market="KOSDAQ", investor="외국인")
    
    df_net_indi = pd.concat([df_net_indi_kospi, df_net_indi_kosdaq]).reset_index()
    df_net_inst = pd.concat([df_net_inst_kospi, df_net_inst_kosdaq]).reset_index()
    df_net_frgn = pd.concat([df_net_frgn_kospi, df_net_frgn_kosdaq]).reset_index()

    # Rename net buy columns
    def rename_net_cols(df, prefix):
        # pykrx returns '순매수거래대금', '순매수거래량' etc.
        df.rename(columns={
            "티커": "ticker",
            "순매수대금": f"net_buy_{prefix}",
            "순매수거래대금": f"net_buy_{prefix}",
            "순매수수량": f"net_qty_{prefix}",
            "순매수거래량": f"net_qty_{prefix}",
        }, inplace=True)
        return df[["ticker", f"net_buy_{prefix}", f"net_qty_{prefix}"]]

    df_indi = rename_net_cols(df_net_indi, "indi")
    df_inst = rename_net_cols(df_net_inst, "inst")
    df_frgn = rename_net_cols(df_net_frgn, "frgn")
    
    # 3. 병합
    df_merged = df_ohlcv.merge(df_indi, on="ticker", how="left")
    df_merged = df_merged.merge(df_inst, on="ticker", how="left")
    df_merged = df_merged.merge(df_frgn, on="ticker", how="left")
    
    df_merged["date"] = target_date
    return df_merged
