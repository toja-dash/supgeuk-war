from datetime import date

import pandas as pd
import FinanceDataReader as fdr
from pykrx import stock


OHLCV_COLUMNS = {
    "티커": "ticker",
    "시가": "open",
    "고가": "high",
    "저가": "low",
    "종가": "close",
    "거래량": "volume",
    "거래대금": "trade_value",
}

NET_COLUMNS = {
    "티커": "ticker",
    "순매수거래대금": "net_buy",
    "순매수거래량": "net_qty",
    "순매수대금": "net_buy",
    "순매수수량": "net_qty",
}


def _fetch_ohlcv(date_str: str, market: str) -> pd.DataFrame:
    df = stock.get_market_ohlcv(date_str, market=market)
    if df.empty:
        return pd.DataFrame()

    df = df.reset_index()
    df = df.rename(columns=OHLCV_COLUMNS)
    required = ["ticker", "open", "high", "low", "close", "volume", "trade_value"]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"KRX OHLCV response missing columns: {missing}")

    return df[required]


def _fetch_net(date_str: str, market: str, investor: str, prefix: str) -> pd.DataFrame:
    df = stock.get_market_net_purchases_of_equities_by_ticker(
        date_str,
        date_str,
        market=market,
        investor=investor,
    )
    if df.empty:
        return pd.DataFrame(columns=["ticker", f"net_buy_{prefix}", f"net_qty_{prefix}"])

    df = df.reset_index()
    df = df.rename(columns=NET_COLUMNS)

    if "ticker" not in df.columns:
        raise ValueError(f"KRX net purchase response missing ticker column for {investor}")

    if "net_buy" not in df.columns:
        df["net_buy"] = 0
    if "net_qty" not in df.columns:
        df["net_qty"] = 0

    df = df[["ticker", "net_buy", "net_qty"]]
    df = df.rename(
        columns={
            "net_buy": f"net_buy_{prefix}",
            "net_qty": f"net_qty_{prefix}",
        }
    )
    return df


def fetch_daily(target_date: date) -> pd.DataFrame:
    date_str = target_date.strftime("%Y%m%d")
    frames: list[pd.DataFrame] = []

    for market in ["KOSPI", "KOSDAQ"]:
        try:
            df = _fetch_ohlcv(date_str, market)
            if df.empty:
                continue

            for investor, prefix in [
                ("개인", "indi"),
                ("기관합계", "inst"),
                ("외국인", "frgn"),
            ]:
                net_df = _fetch_net(date_str, market, investor, prefix)
                df = df.merge(net_df, on="ticker", how="left")

            frames.append(df)
        except Exception as exc:
            print(f"Failed to fetch KRX {market} data for {date_str}: {exc}")

    if not frames:
        return _fetch_daily_from_fdr_listing(target_date)

    result = pd.concat(frames, ignore_index=True)
    result["ticker"] = result["ticker"].astype(str).str.zfill(6)
    result["date"] = target_date

    numeric_cols = [
        "open",
        "high",
        "low",
        "close",
        "volume",
        "trade_value",
        "net_buy_indi",
        "net_buy_inst",
        "net_buy_frgn",
        "net_qty_indi",
        "net_qty_inst",
        "net_qty_frgn",
    ]
    for col in numeric_cols:
        if col in result.columns:
            result[col] = pd.to_numeric(result[col], errors="coerce").fillna(0)

    return result.drop(columns=["net_qty_indi"], errors="ignore")


def _fetch_daily_from_fdr_listing(target_date: date) -> pd.DataFrame:
    df = fdr.StockListing("KRX")
    if df.empty:
        return pd.DataFrame()

    df = df[df["Market"].isin(["KOSPI", "KOSDAQ"])].copy()
    df = df.rename(
        columns={
            "Code": "ticker",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
            "Amount": "trade_value",
        }
    )

    required = ["ticker", "open", "high", "low", "close", "volume", "trade_value"]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"FDR KRX listing response missing columns: {missing}")

    df = df[required]
    df["ticker"] = df["ticker"].astype(str).str.zfill(6)
    df["date"] = target_date
    for col in [
        "open",
        "high",
        "low",
        "close",
        "volume",
        "trade_value",
    ]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    df["net_buy_indi"] = 0
    df["net_buy_inst"] = 0
    df["net_buy_frgn"] = 0
    df["net_qty_inst"] = 0
    df["net_qty_frgn"] = 0
    return df
