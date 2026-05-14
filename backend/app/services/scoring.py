import math
import pandas as pd
import json

TYPE_WEIGHT = {
    'A': 1.5,
    'B': 1.2,
    'C': 1.0,
    'D': 1.0,
}

def calc_priority_score(row: pd.Series) -> float:
    if pd.isna(row['type']) or row['type'] is None:
        return None
    if row['trade_value'] <= 0:
        return None
        
    intensity = row['type_intensity']
    tv_b = row['trade_value'] / 100_000_000
    
    if tv_b <= 1:
        return 0.0
        
    return intensity * math.log10(tv_b)

def calc_weighted_priority(row: pd.Series) -> float:
    base = row['priority_score']
    if pd.isna(base) or base is None:
        return None
    return base * TYPE_WEIGHT.get(row['type'], 1.0)

def apply_scoring(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['priority_score'] = df.apply(calc_priority_score, axis=1)
    df['weighted_priority'] = df.apply(calc_weighted_priority, axis=1)
    return df

def generate_insights(row: pd.Series) -> dict:
    t = row.get('type')
    close = row.get('close')
    sfi_i = row.get('sfi_inst')
    sfi_f = row.get('sfi_frgn')
    quad = row.get('quadrant')
    def_stat = row.get('defense_status')
    i_cost = row.get('avg_cost_20d_inst')
    f_cost = row.get('avg_cost_20d_frgn')
    
    signal_card_text = ""
    if t == 'A': signal_card_text = "동반 분산 매도 + 평단가 붕괴"
    elif t == 'B': signal_card_text = "동반 매집 구간"
    elif t == 'C': signal_card_text = "외인 단독 유입"
    elif t == 'D': signal_card_text = "기관 방어 우위"
    
    headline = "⚪ 뚜렷한 수급 신호가 관찰되지 않습니다."
    if t == 'A': headline = "🔴 동반 분산 매도 — 평단가 방어선이 무너졌습니다."
    elif t == 'B': headline = "🟢 동반 매집 구간 — 기관과 외국인이 함께 매수 우위를 보입니다."
    elif t == 'C': headline = "🟡 외인 단독 유입 — 외국인 매수와 기관 매도가 엇갈립니다."
    elif t == 'D': headline = "🔵 기관 방어 우위 — 외인 매도 압력에도 기관이 받치고 있습니다."
    
    q_label = ""
    if quad == 'BOTH_BUY': q_label = "동반 매집 구간"
    elif quad == 'INST_DEFENSE': q_label = "기관 방어 우위"
    elif quad == 'BOTH_SELL': q_label = "동반 분산 매도"
    elif quad == 'FRGN_LEAD': q_label = "외인 단독 유입"
    
    sfi_i_str = f"{sfi_i:+.1f}%" if pd.notna(sfi_i) else "N/A"
    sfi_f_str = f"{sfi_f:+.1f}%" if pd.notna(sfi_f) else "N/A"
    
    line1 = f"오늘 기관 SFI {sfi_i_str}, 외인 SFI {sfi_f_str}으로 {q_label} 사분면에 위치합니다."
    
    line2 = ""
    if def_stat == 'SAFE':
        line2 = f"현재가 {close:,.0f}원이 큰손 평단가 위에 위치해 안전 구역입니다."
    elif def_stat == 'FRGN_LINE_TOUCH' and pd.notna(f_cost):
        line2 = f"현재가 {close:,.0f}원이 외인 평단가({f_cost:,.0f}원)에 도달, 추가 매수 가능성을 주시할 구간입니다."
    elif def_stat == 'INST_LINE_TOUCH' and pd.notna(i_cost):
        line2 = f"현재가 {close:,.0f}원이 기관 평단가({i_cost:,.0f}원) 부근에서 마지막 지지선 테스트 중입니다."
    elif def_stat == 'BREAKDOWN' and pd.notna(i_cost):
        line2 = f"현재가 {close:,.0f}원이 기관 평단가({i_cost:,.0f}원) 대비 -5% 이상 이탈, 손절 물량 출회 위험 구간입니다."
    else:
        line2 = "평단가 산출에 필요한 누적 매수 데이터가 부족합니다."
        
    return {
        "signal_card_text": signal_card_text,
        "deep_dive_headline": headline,
        "deep_dive_line1": line1,
        "deep_dive_line2": line2,
        "disclaimer_required": True
    }
