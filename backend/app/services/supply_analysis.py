import pandas as pd
import numpy as np
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Dict, Any

def calc_dominance(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    denom = df['net_buy_indi'].abs() + df['net_buy_inst'].abs() + df['net_buy_frgn'].abs()
    
    # 0 division handling
    valid = denom > 0
    df['dominance_indi'] = np.where(valid, df['net_buy_indi'] / denom, None)
    df['dominance_inst'] = np.where(valid, df['net_buy_inst'] / denom, None)
    df['dominance_frgn'] = np.where(valid, df['net_buy_frgn'] / denom, None)
    
    return df

def calc_sfi(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    valid = df['trade_value'] > 0
    df['sfi_inst'] = np.where(valid, (df['net_buy_inst'] / df['trade_value']) * 100, None)
    df['sfi_frgn'] = np.where(valid, (df['net_buy_frgn'] / df['trade_value']) * 100, None)
    return df

def calc_quadrant(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    def get_quadrant(sfi_i, sfi_f):
        if pd.isna(sfi_i) or pd.isna(sfi_f):
            return None
        if sfi_f > 0 and sfi_i > 0:
            return 'BOTH_BUY'
        elif sfi_f <= 0 and sfi_i > 0:
            return 'INST_DEFENSE'
        elif sfi_f <= 0 and sfi_i <= 0:
            return 'BOTH_SELL'
        elif sfi_f > 0 and sfi_i <= 0:
            return 'FRGN_LEAD'
        return None

    df['quadrant'] = df.apply(lambda row: get_quadrant(row['sfi_inst'], row['sfi_frgn']), axis=1)
    
    def get_conflict_intensity(sfi_i, sfi_f, quad):
        if quad in ['INST_DEFENSE', 'FRGN_LEAD'] and not pd.isna(sfi_i) and not pd.isna(sfi_f):
            return min(abs(sfi_i), abs(sfi_f))
        return None

    df['conflict_intensity'] = df.apply(lambda row: get_conflict_intensity(row['sfi_inst'], row['sfi_frgn'], row['quadrant']), axis=1)
    return df

def calc_avg_cost(df_ticker: pd.DataFrame, subject: str, n_days: int) -> float:
    recent = df_ticker.tail(n_days)
    total_value = recent[f'net_buy_{subject}'].sum()
    total_qty = recent[f'net_qty_{subject}'].sum()
    if total_qty <= 0:
        return None
    return float(total_value / total_qty)

def calc_defense_status(row: pd.Series) -> pd.Series:
    close = row['close']
    i_cost = row['avg_cost_20d_inst']
    f_cost = row['avg_cost_20d_frgn']
    
    if pd.isna(i_cost) or pd.isna(f_cost) or pd.isna(close):
        return pd.Series({'defense_status': 'INSUFFICIENT_DATA', 'defense_status_inverted': False})
        
    inverted = i_cost > f_cost
    
    if inverted:
        upper, lower = i_cost, f_cost
    else:
        upper, lower = f_cost, i_cost
        
    if close > upper:
        status = 'SAFE'
    elif close > lower:
        status = 'FRGN_LINE_TOUCH' if not inverted else 'INST_LINE_TOUCH'
    elif close >= lower * 0.95:
        status = 'INST_LINE_TOUCH' if not inverted else 'FRGN_LINE_TOUCH'
    else:
        status = 'BREAKDOWN'
        
    return pd.Series({'defense_status': status, 'defense_status_inverted': inverted})

def process_daily_indicators(df_history: pd.DataFrame) -> pd.DataFrame:
    # df_history must be sorted by date ascending, grouped by ticker
    
    # 1. moving averages
    df_history['ma_5'] = df_history.groupby('ticker')['close'].transform(lambda x: x.rolling(5).mean())
    df_history['ma_20'] = df_history.groupby('ticker')['close'].transform(lambda x: x.rolling(20).mean())
    df_history['ma_60'] = df_history.groupby('ticker')['close'].transform(lambda x: x.rolling(60).mean())
    df_history['ma_120'] = df_history.groupby('ticker')['close'].transform(lambda x: x.rolling(120).mean())
    
    # 2. dominance and sfi
    df_history = calc_dominance(df_history)
    df_history = calc_sfi(df_history)
    df_history = calc_quadrant(df_history)
    
    # 3. avg cost
    def rolling_sum(x, w):
        return x.rolling(window=w, min_periods=1).sum()
        
    for w in [5, 20, 60]:
        for sub in ['inst', 'frgn']:
            sum_val = df_history.groupby('ticker')[f'net_buy_{sub}'].transform(lambda x: rolling_sum(x, w))
            sum_qty = df_history.groupby('ticker')[f'net_qty_{sub}'].transform(lambda x: rolling_sum(x, w))
            valid = sum_qty > 0
            df_history[f'avg_cost_{w}d_{sub}'] = np.where(valid, sum_val / sum_qty, None)

    # 4. defense status
    status_df = df_history.apply(calc_defense_status, axis=1)
    df_history = pd.concat([df_history, status_df], axis=1)

    return df_history
