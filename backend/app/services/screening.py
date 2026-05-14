import pandas as pd
import numpy as np

SFI_STRONG = 3.0
TRADE_VALUE_FLOOR = 1_000_000_000

def classify_type(row: pd.Series) -> str:
    sfi_i = row['sfi_inst']
    sfi_f = row['sfi_frgn']
    status = row['defense_status']
    
    if pd.isna(sfi_i) or pd.isna(sfi_f):
        return None
        
    if sfi_i <= -SFI_STRONG and sfi_f <= -SFI_STRONG and status == 'BREAKDOWN':
        return 'A'
    if sfi_i >= SFI_STRONG and sfi_f >= SFI_STRONG:
        return 'B'
    if sfi_f >= SFI_STRONG and sfi_i <= -SFI_STRONG:
        return 'C'
    if sfi_i >= SFI_STRONG and sfi_f <= -SFI_STRONG:
        return 'D'
    return None

def apply_screening(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['sfi_inst'] = pd.to_numeric(df['sfi_inst'], errors='coerce')
    df['sfi_frgn'] = pd.to_numeric(df['sfi_frgn'], errors='coerce')
    
    # calc type
    df['type'] = df.apply(classify_type, axis=1)
    
    # calc type intensity
    df['type_intensity'] = df[['sfi_inst', 'sfi_frgn']].abs().max(axis=1)
    
    return df

def generate_market_brief(df: pd.DataFrame) -> dict:
    df_valid = df[df['trade_value'] >= TRADE_VALUE_FLOOR]
    # Filter out stocks with missing market info (not in StockMaster) for consistency
    df_valid = df_valid[df_valid['market'].notna()].copy()
    
    # 시장단위 SFI 가중평균 계산
    def calc_weighted_sfi(df_sub, subject):
        if df_sub.empty: return None
        return (df_sub[f'sfi_{subject}'] * df_sub['trade_value']).sum() / df_sub['trade_value'].sum()
        
    # 시장단위 주도력(Dominance) 계산: 특정 주체 순매수 합 / (|개인| + |기관| + |외인|)
    def calc_market_dominance(df_sub):
        if df_sub.empty: return 0.0, 0.0, 0.0
        sum_i = df_sub['net_buy_indi'].sum()
        sum_inst = df_sub['net_buy_inst'].sum()
        sum_f = df_sub['net_buy_frgn'].sum()
        denom = abs(sum_i) + abs(sum_inst) + abs(sum_f)
        if denom == 0: return 0.0, 0.0, 0.0
        return sum_i / denom, sum_inst / denom, sum_f / denom

    kospi = df_valid[df_valid['market'] == 'KOSPI']
    kosdaq = df_valid[df_valid['market'] == 'KOSDAQ']
    
    m_i_kospi = calc_weighted_sfi(kospi, 'inst') or 0
    m_i_kosdaq = calc_weighted_sfi(kosdaq, 'inst') or 0
    m_f_kospi = calc_weighted_sfi(kospi, 'frgn') or 0
    m_f_kosdaq = calc_weighted_sfi(kosdaq, 'frgn') or 0
    
    d_indi_kp, d_inst_kp, d_frgn_kp = calc_market_dominance(kospi)
    d_indi_kd, d_inst_kd, d_frgn_kd = calc_market_dominance(kosdaq)

    m_i_total = (m_i_kospi + m_i_kosdaq) / 2
    m_f_total = (m_f_kospi + m_f_kosdaq) / 2
    
    # 섹터 1위
    sector_grouped = df_valid.groupby('sector')[['sfi_inst', 'sfi_frgn', 'trade_value']].apply(
        lambda x: pd.Series({
            'sfi_inst': calc_weighted_sfi(x, 'inst'),
            'sfi_frgn': calc_weighted_sfi(x, 'frgn')
        })
    )
    
    top_sector_inst = sector_grouped['sfi_inst'].idxmax() if not sector_grouped.empty and sector_grouped['sfi_inst'].max() > 0 else None
    top_sector_frgn = sector_grouped['sfi_frgn'].idxmax() if not sector_grouped.empty and sector_grouped['sfi_frgn'].max() > 0 else None
    
    count_type_a = (df_valid['type'] == 'A').sum()
    count_type_b = (df_valid['type'] == 'B').sum()
    count_type_c = (df_valid['type'] == 'C').sum()
    count_type_d = (df_valid['type'] == 'D').sum()
    
    # 1단 문장
    if m_i_total > 1.0 and m_f_total > 1.0:
        brief = "오늘 시장은 **동반 매집 구간**에 진입하며 강한 상승 동력이 형성됐습니다."
    elif m_f_total > 1.0 and m_i_total <= 1.0:
        sec = top_sector_frgn or "특정 섹터"
        brief = f"오늘 시장은 **외인 단독 유입** 기조 속에 {sec} 집중 매수가 돋보였습니다."
    elif m_i_total > 1.0 and m_f_total <= 1.0:
        brief = "오늘 시장은 **기관 방어 우위** 흐름을 보이며 지수 하락을 저지했습니다."
    elif m_i_total < -1.0 and m_f_total < -1.0:
        brief = "오늘 시장은 **동반 분산 매도**로 하락 압력을 받았습니다."
    elif m_f_total < -1.0 and m_i_total >= -1.0:
        brief = "오늘 시장은 외국인 매도세가 지수를 압박하며 혼조세를 보였습니다."
    else:
        brief = "오늘 시장은 뚜렷한 주도 세력 없이 보합권에서 마감했습니다."
        
    # 2단 충돌
    total_count = len(df_valid)
    conflict_count = count_type_c + count_type_d
    if total_count > 0 and (conflict_count / total_count) >= 0.01:
        if conflict_count >= 50:
            brief += f" 특히 {conflict_count}개 종목에서 외인 단독 유입·기관 방어 우위 흐름이 동시에 나타나, 종목별 분리 분석이 필요합니다."
        else:
            brief += f" 단, 외인 단독 유입·기관 방어 우위 종목이 {conflict_count}개 발생하여 수급 엇갈림 현상이 관찰됩니다."
            
    # 3단 위험
    if count_type_a >= 30:
        brief += f" ⚠️ Type A(동반 분산 매도) 종목이 **{count_type_a}개**로 집중 발생, 보유 종목의 평단가 방어선 점검을 권장합니다."
    elif count_type_a >= 10:
        brief += f" Type A 종목 {count_type_a}개에서 평단가 붕괴 신호가 관찰됩니다."
        
    return {
        "market_sfi_inst_kospi": float(m_i_kospi),
        "market_sfi_inst_kosdaq": float(m_i_kosdaq),
        "market_sfi_inst_total": float(m_i_total),
        "market_sfi_frgn_kospi": float(m_f_kospi),
        "market_sfi_frgn_kosdaq": float(m_f_kosdaq),
        "market_sfi_frgn_total": float(m_f_total),
        "market_dominance_indi_kospi": float(d_indi_kp),
        "market_dominance_inst_kospi": float(d_inst_kp),
        "market_dominance_frgn_kospi": float(d_frgn_kp),
        "market_dominance_indi_kosdaq": float(d_indi_kd),
        "market_dominance_inst_kosdaq": float(d_inst_kd),
        "market_dominance_frgn_kosdaq": float(d_frgn_kd),
        "top_sector_inst": top_sector_inst,
        "top_sector_frgn": top_sector_frgn,
        "count_type_a": int(count_type_a),
        "count_type_b": int(count_type_b),
        "count_type_c": int(count_type_c),
        "count_type_d": int(count_type_d),
        "market_brief_text": brief
    }
