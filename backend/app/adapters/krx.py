from datetime import date

import FinanceDataReader as fdr
import pandas as pd

from app.adapters.krx_openapi import request_api, to_int


OFFICIAL_ENDPOINTS = {
    "KOSPI": "sto/stk_bydd_trd",
    "KOSDAQ": "sto/ksq_bydd_trd",
}


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
                # KRX Open API stock daily endpoints do not expose investor flow.
                "net_buy_indi": 0,
                "net_buy_inst": 0,
                "net_buy_frgn": 0,
                "net_qty_inst": 0,
                "net_qty_frgn": 0,
            }
        )
    return pd.DataFrame.from_records(records)


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
    return pd.concat(frames, ignore_index=True)


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
    return df


def fetch_daily(target_date: date) -> pd.DataFrame:
    try:
        return _fetch_daily_from_official_api(target_date)
    except Exception as exc:
        print(f"Failed to fetch KRX Open API daily data for {target_date}: {exc}")
        return _fetch_daily_from_fdr_listing(target_date)
