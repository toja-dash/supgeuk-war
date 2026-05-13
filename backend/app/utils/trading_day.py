from datetime import datetime, date, timedelta
from pykrx import stock
import pandas as pd

def is_trading_day(d: date) -> bool:
    return d.weekday() < 5

def latest_trading_day(now: datetime) -> date:
    today = now.date()
    
    if is_trading_day(today):
        # Before market open, should we show previous day? Yes, typically.
        # But for 'now' we can just return today if it's past 00:00, or let frontend handle pending/confirmed.
        return today
        
    for offset in range(1, 8):
        candidate = today - timedelta(days=offset)
        if is_trading_day(candidate):
            return candidate
            
    raise RuntimeError("최근 7일 내 거래일을 찾을 수 없음")

def trading_days_between(start_date: date, end_date: date) -> list[date]:
    ds1 = start_date.strftime("%Y%m%d")
    ds2 = end_date.strftime("%Y%m%d")
    # This might return dates across multiple months if we use get_market_ohlcv.
    # Actually pykrx doesn't have a simple date range for business days across months easily without iteration.
    # We can just iterate.
    days = []
    curr = start_date
    while curr <= end_date:
        if is_trading_day(curr):
            days.append(curr)
        curr += timedelta(days=1)
    return days
