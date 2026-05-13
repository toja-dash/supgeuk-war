from datetime import date
from pathlib import Path

import FinanceDataReader as fdr
import pandas as pd
from dotenv import load_dotenv
from pykrx import stock

from app.adapters.krx_openapi import request_api, to_int


OFFICIAL_ENDPOINTS = {
    "KOSPI": "sto/stk_bydd_trd",
    "KOSDAQ": "sto/ksq_bydd_trd",
}

INVESTOR_COLUMNS = {
    "net_buy_indi": "\uac1c\uc778",
    "net_buy_inst": "\uae30\uad00\ud569\uacc4",
    "net_buy_frgn": "\uc678\uad6d\uc778",
}


def _load_root_env() -> None:
    load_dotenv(Path(__file__).resolve().parents[3] / ".env")


def _rows_to_ohlcv(rows: list[dict], target_date: date) -> pd.DataFrame:
    records = []
    for row in rows:
        ticker = str(row.get("ISU_CD", "")).strip().zfill(6)
        if not ticker:
            continue

        records.append(
            {
                "date": target_date,
                "ticker": ticker,
                "open": to_int(row.get("TDD_OPNPRC")),
                "high": to_int(row.get("TDD_HGPRC")),
                "low": to_int(row.get("TDD_LWPRC")),
                "close": to_int(row.get("TDD_CLSPRC")),
                "volume": to_int(row.get("ACC_TRDVOL")),
                "trade_value": to_int(row.get("ACC_TRDVAL")),
                "net_buy_indi": 0,
                "net_buy_inst": 0,
                "net_buy_frgn": 0,
                "net_qty_inst": 0,
                "net_qty_frgn": 0,
            }
        )
    return pd.DataFrame.from_records(records)


def _fetch_investor_flow(target_date: date) -> pd.DataFrame:
    _load_root_env()
    ymd = target_date.strftime("%Y%m%d")
    merged: pd.DataFrame | None = None

    for target_col, investor in INVESTOR_COLUMNS.items():
        frames = []
        for market in OFFICIAL_ENDPOINTS:
            df = stock.get_market_net_purchases_of_equities_by_ticker(
                ymd,
                ymd,
                market,
                investor=investor,
            )
            if df.empty:
                continue
            df = df.reset_index().rename(
                columns={
                    "\ud2f0\ucee4": "ticker",
                    "\uc21c\ub9e4\uc218\uac70\ub798\ub300\uae08": target_col,
                    "\uc21c\ub9e4\uc218\uac70\ub798\ub7c9": f"{target_col}_qty",
                }
            )
            df["ticker"] = df["ticker"].astype(str).str.zfill(6)
            cols = ["ticker", target_col]
            if target_col == "net_buy_inst":
                cols.append("net_buy_inst_qty")
            elif target_col == "net_buy_frgn":
                cols.append("net_buy_frgn_qty")
            frames.append(df[cols])

        if not frames:
            continue

        investor_df = pd.concat(frames, ignore_index=True)
        value_cols = [col for col in investor_df.columns if col != "ticker"]
        for col in value_cols:
            investor_df[col] = pd.to_numeric(investor_df[col], errors="coerce").fillna(0)
        investor_df = investor_df.groupby("ticker", as_index=False)[value_cols].sum()
        merged = investor_df if merged is None else merged.merge(investor_df, on="ticker", how="outer")

    return merged if merged is not None else pd.DataFrame()


def _attach_investor_flow(df: pd.DataFrame, target_date: date) -> pd.DataFrame:
    if df.empty:
        return df

    try:
        flows = _fetch_investor_flow(target_date)
    except Exception as exc:
        print(f"Failed to fetch pykrx investor flow for {target_date}: {exc}")
        return df

    if flows.empty:
        return df

    df = df.merge(flows, on="ticker", how="left", suffixes=("", "_flow"))
    for col in ["net_buy_indi", "net_buy_inst", "net_buy_frgn"]:
        flow_col = f"{col}_flow"
        if flow_col in df.columns:
            df[col] = df[flow_col].fillna(df[col]).fillna(0)
            df = df.drop(columns=[flow_col])

    if "net_buy_inst_qty" in df.columns:
        df["net_qty_inst"] = df["net_buy_inst_qty"].fillna(df["net_qty_inst"]).fillna(0)
        df = df.drop(columns=["net_buy_inst_qty"])
    if "net_buy_frgn_qty" in df.columns:
        df["net_qty_frgn"] = df["net_buy_frgn_qty"].fillna(df["net_qty_frgn"]).fillna(0)
        df = df.drop(columns=["net_buy_frgn_qty"])

    int_cols = ["net_buy_indi", "net_buy_inst", "net_buy_frgn", "net_qty_inst", "net_qty_frgn"]
    for col in int_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype("int64")

    return df


def _fetch_daily_from_official_api(target_date: date) -> pd.DataFrame:
    bas_dd = target_date.strftime("%Y%m%d")
    frames = []
    for endpoint in OFFICIAL_ENDPOINTS.values():
        rows = request_api(endpoint, bas_dd)
        df = _rows_to_ohlcv(rows, target_date)
        if not df.empty:
            frames.append(df)

    if not frames:
        return pd.DataFrame()
    return _attach_investor_flow(pd.concat(frames, ignore_index=True), target_date)


def _fetch_daily_from_pykrx(target_date: date) -> pd.DataFrame:
    ymd = target_date.strftime("%Y%m%d")
    frames = []

    for market in OFFICIAL_ENDPOINTS:
        df = stock.get_market_ohlcv_by_ticker(ymd, market=market)
        if df.empty:
            continue

        df = df.reset_index()
        ticker_col = df.columns[0]
        df = df.rename(
            columns={
                ticker_col: "ticker",
                "시가": "open",
                "고가": "high",
                "저가": "low",
                "종가": "close",
                "거래량": "volume",
                "거래대금": "trade_value",
            }
        )

        required = ["ticker", "open", "high", "low", "close", "volume", "trade_value"]
        missing = [col for col in required if col not in df.columns]
        if missing:
            raise ValueError(f"pykrx OHLCV response missing columns: {missing}")

        df = df[required]
        df["ticker"] = df["ticker"].astype(str).str.zfill(6)
        df["date"] = target_date
        for col in ["open", "high", "low", "close", "volume", "trade_value"]:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

        df["net_buy_indi"] = 0
        df["net_buy_inst"] = 0
        df["net_buy_frgn"] = 0
        df["net_qty_inst"] = 0
        df["net_qty_frgn"] = 0
        frames.append(df)

    if not frames:
        return pd.DataFrame()

    return _attach_investor_flow(pd.concat(frames, ignore_index=True), target_date)


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
    for col in ["open", "high", "low", "close", "volume", "trade_value"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    df["net_buy_indi"] = 0
    df["net_buy_inst"] = 0
    df["net_buy_frgn"] = 0
    df["net_qty_inst"] = 0
    df["net_qty_frgn"] = 0
    return _attach_investor_flow(df, target_date)


def fetch_daily(target_date: date) -> pd.DataFrame:
    try:
        df = _fetch_daily_from_official_api(target_date)
        if df.empty:
            raise RuntimeError(f"KRX Open API returned no rows for {target_date}")
        return df
    except Exception as exc:
        print(f"Failed to fetch KRX Open API daily data for {target_date}: {exc}")

    try:
        df = _fetch_daily_from_pykrx(target_date)
        if df.empty:
            raise RuntimeError(f"pykrx returned no rows for {target_date}")
        return df
    except Exception as exc:
        print(f"Failed to fetch pykrx daily data for {target_date}: {exc}")
        return _fetch_daily_from_fdr_listing(target_date)
