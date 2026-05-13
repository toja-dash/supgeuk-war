from datetime import date, datetime
from typing import Any

import FinanceDataReader as fdr

from app.adapters.krx_openapi import request_api, to_float


def _find_main_index(rows: list[dict[str, Any]], names: tuple[str, ...]) -> dict[str, Any] | None:
    for row in rows:
        index_name = str(row.get("IDX_NM") or row.get("ISU_NM") or row.get("IDX_NM_KOR") or "")
        if not str(row.get("CLSPRC_IDX") or row.get("TDD_CLSPRC") or row.get("CLSPRC") or row.get("IDX_CLSPRC") or "").strip():
            continue
        normalized = index_name.upper().replace(" ", "")
        if any(name.upper().replace(" ", "") == normalized for name in names):
            return row
    for row in rows:
        index_name = str(row.get("IDX_NM") or row.get("ISU_NM") or row.get("IDX_NM_KOR") or "")
        if not str(row.get("CLSPRC_IDX") or row.get("TDD_CLSPRC") or row.get("CLSPRC") or row.get("IDX_CLSPRC") or "").strip():
            continue
        normalized = index_name.upper().replace(" ", "")
        if any(name.upper().replace(" ", "") in normalized for name in names):
            return row
    return rows[0] if rows else None


def _index_close(row: dict[str, Any] | None) -> float:
    if not row:
        return 0.0
    for key in ["CLSPRC_IDX", "TDD_CLSPRC", "CLSPRC", "IDX_CLSPRC"]:
        if key in row:
            return to_float(row.get(key))
    return 0.0


def _index_change_pct(row: dict[str, Any] | None) -> float:
    if not row:
        return 0.0
    for key in ["FLUC_RT", "PRV_DD_CMPR", "CMPPREVDD_IDX"]:
        if key in row:
            return to_float(row.get(key))
    return 0.0


def _fetch_index_from_official_api(target_date: date) -> dict:
    bas_dd = target_date.strftime("%Y%m%d")
    kospi_rows = request_api("idx/kospi_dd_trd", bas_dd)
    kosdaq_rows = request_api("idx/kosdaq_dd_trd", bas_dd)

    kospi = _find_main_index(kospi_rows, ("KOSPI", "코스피"))
    kosdaq = _find_main_index(kosdaq_rows, ("KOSDAQ", "코스닥"))

    return {
        "date": target_date,
        "kospi_close": _index_close(kospi),
        "kospi_change_pct": _index_change_pct(kospi),
        "kosdaq_close": _index_close(kosdaq),
        "kosdaq_change_pct": _index_change_pct(kosdaq),
        "usdkrw_close": _fetch_usdkrw_from_fdr(target_date),
        "updated_at": datetime.now(),
    }


def _has_valid_index_values(data: dict) -> bool:
    return bool(data.get("kospi_close", 0) > 0 and data.get("kosdaq_close", 0) > 0)


def _fetch_usdkrw_from_fdr(target_date: date) -> float:
    date_str = target_date.strftime("%Y-%m-%d")
    df_usdkrw = fdr.DataReader("USD/KRW", date_str, date_str)
    if df_usdkrw.empty or "Close" not in df_usdkrw.columns:
        return 0.0

    valid = df_usdkrw["Close"].dropna()
    if valid.empty:
        return 0.0

    target_rows = valid[valid.index.strftime("%Y-%m-%d") == date_str]
    if not target_rows.empty:
        return float(target_rows.iloc[-1])

    return float(valid.iloc[-1])


def _fetch_index_from_fdr(target_date: date) -> dict:
    date_str = target_date.strftime("%Y-%m-%d")
    df_kospi = fdr.DataReader("KS11", date_str, date_str)
    df_kosdaq = fdr.DataReader("KQ11", date_str, date_str)

    def get_val(df, col):
        if not df.empty and col in df.columns:
            return float(df.iloc[0][col])
        return 0.0

    return {
        "date": target_date,
        "kospi_close": get_val(df_kospi, "Close"),
        "kospi_change_pct": get_val(df_kospi, "Change") * 100,
        "kosdaq_close": get_val(df_kosdaq, "Close"),
        "kosdaq_change_pct": get_val(df_kosdaq, "Change") * 100,
        "usdkrw_close": _fetch_usdkrw_from_fdr(target_date),
        "updated_at": datetime.now(),
    }


def fetch_index_daily(target_date: date) -> dict:
    try:
        data = _fetch_index_from_official_api(target_date)
        if _has_valid_index_values(data):
            return data
        print(f"Invalid KRX Open API index data for {target_date}: {data}")
    except Exception as exc:
        print(f"Failed to fetch KRX Open API index data for {target_date}: {exc}")
    return _fetch_index_from_fdr(target_date)
