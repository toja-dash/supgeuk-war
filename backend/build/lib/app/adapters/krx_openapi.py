import os
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


BASE_URL = "https://data-dbg.krx.co.kr/svc/apis"


def get_api_key() -> str | None:
    root_env = Path(__file__).resolve().parents[3] / ".env"
    load_dotenv(root_env)
    key = os.getenv("KRX_API_KEY")
    return key.strip() if key else None


def request_api(path: str, bas_dd: str) -> list[dict[str, Any]]:
    key = get_api_key()
    if not key:
        raise RuntimeError("KRX_API_KEY is not configured")

    url = f"{BASE_URL}/{path.lstrip('/')}"
    response = requests.get(
        url,
        headers={"AUTH_KEY": key},
        params={"basDd": bas_dd},
        timeout=30,
    )
    response.raise_for_status()

    payload = response.json()
    if payload.get("respCode") and payload.get("respCode") != "0000":
        raise RuntimeError(f"KRX API error {payload.get('respCode')}: {payload.get('respMsg')}")

    rows = payload.get("OutBlock_1", [])
    if not isinstance(rows, list):
        raise RuntimeError("KRX API response does not contain OutBlock_1 list")
    return rows


def to_int(value: Any) -> int:
    if value in (None, "", "-"):
        return 0
    return int(str(value).replace(",", "").strip())


def to_float(value: Any) -> float:
    if value in (None, "", "-"):
        return 0.0
    return float(str(value).replace(",", "").strip())
