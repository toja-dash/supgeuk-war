---
name: calculating-supply-indicators
description: 수급전쟁 서비스의 2차 분석 지표(3파전 수급 주도력, 주체별 SFI, 3차원 엇갈림 사분면, 충돌 강도, 평단가 방어선, 평단가 상태)를 계산하는 로직을 정의한다.
---

# 수급 분석 지표 계산 규칙

> **역할**: 수급전쟁 서비스의 모든 2차 지표 계산 로직을 정의한다.
> **참조 시점**: data-pipeline.md의 18:00 트리거 직후, screening-rules.md 호출 이전.
> **선행 조건**: [data-schema.md](data-schema.md) §2.1 원본 데이터와 §2.2 1차 지표(이동평균)가 준비된 상태.

---

## 0. 공통 규약

### 0.1 단위
- **모든 금액은 원(KRW) 단위**로 계산한다. 표시 단계에서만 억원/백만원 단위로 포맷팅한다.
- **모든 수량은 주(株) 단위 정수**로 계산한다.
- **퍼센트 지표는 소수점 둘째 자리까지** 보관, 표시 단계에서 첫째 자리로 반올림한다.

### 0.2 입력 컬럼 (data-schema.md 표준)
| 컬럼명 | 타입 | 의미 |
|---|---|---|
| `date` | date | 거래일 (YYYY-MM-DD) |
| `ticker` | string | 종목코드 (6자리) |
| `close` | int | 종가 (원) |
| `volume` | int | 거래량 (주) |
| `trade_value` | int | 거래대금 (원) |
| `net_buy_indi` | int | 개인 순매수 대금 (원, 매도 시 음수) |
| `net_buy_inst` | int | 기관 순매수 대금 (원, 매도 시 음수) |
| `net_buy_frgn` | int | 외국인 순매수 대금 (원, 매도 시 음수) |
| `net_qty_inst` | int | 기관 순매수 수량 (주) |
| `net_qty_frgn` | int | 외국인 순매수 수량 (주) |

### 0.3 0 나누기 방지
- 분모가 0인 경우 모든 지표는 `null`로 반환한다. (0이나 NaN으로 대체하지 않는다)
- 표시 단계에서 `null`은 "—"로 렌더링한다.

---

## 1. 3파전 수급 주도력 (Supply Dominance)

### 1.1 정의
세 주체(개인·기관·외국인)의 순매수 절대값 합 중 특정 주체가 차지하는 비중. **방향(매수/매도)이 아닌 영향력의 크기**를 나타낸다.

### 1.2 공식
```
dominance_{subject} = net_buy_{subject} / (|net_buy_indi| + |net_buy_inst| + |net_buy_frgn|)
```

- 값의 범위: `[-1, +1]`
- 양수: 해당 주체가 순매수 주도, 음수: 순매도 주도
- 절대값이 1에 가까울수록 해당 주체의 영향력이 압도적

### 1.3 계산 의사코드
```python
def calc_dominance(row):
    denom = abs(row['net_buy_indi']) + abs(row['net_buy_inst']) + abs(row['net_buy_frgn'])
    if denom == 0:
        return {'indi': None, 'inst': None, 'frgn': None}
    return {
        'indi': row['net_buy_indi'] / denom,
        'inst': row['net_buy_inst'] / denom,
        'frgn': row['net_buy_frgn'] / denom,
    }
```

### 1.4 출력 컬럼
- `dominance_indi`, `dominance_inst`, `dominance_frgn` (float, [-1, +1])

---

## 2. 주체별 수급 강도 지수 (SFI: Supply Force Index)

### 2.1 정의
당일 총 거래대금 대비 특정 주체의 순매수 비율. **거래대금 대비 영향력**을 절대 비교 가능하게 만드는 지수.

### 2.2 공식
```
SFI_inst = (net_buy_inst / trade_value) × 100
SFI_frgn = (net_buy_frgn / trade_value) × 100
```

- 값의 범위: 이론상 `[-100, +100]`. 실제로는 대부분 `[-30, +30]` 구간.
- 양수: 매수 강도, 음수: 매도 강도

### 2.3 계산 의사코드
```python
def calc_sfi(row):
    if row['trade_value'] == 0:
        return {'sfi_inst': None, 'sfi_frgn': None}
    return {
        'sfi_inst': (row['net_buy_inst'] / row['trade_value']) * 100,
        'sfi_frgn': (row['net_buy_frgn'] / row['trade_value']) * 100,
    }
```

### 2.4 출력 컬럼
- `sfi_inst`, `sfi_frgn` (float, 단위: %)

> **개인 SFI는 계산하지 않는다.** 개인은 잔여항(residual)으로 해석한다: `SFI_indi ≈ -(SFI_inst + SFI_frgn)`. 이 관계는 시각화 시 참고용으로만 사용한다.

---

## 3. 3차원 엇갈림 신호 (Conflict Quadrant)

### 3.1 정의
SFI_frgn(X축) × SFI_inst(Y축) 좌표평면을 4사분면으로 분할하여 기관·외국인의 방향 일치/충돌을 분류한다.

### 3.2 사분면 분류

| 사분면 | 조건 | 라벨 | 해석 |
|---|---|---|---|
| Q1 | `sfi_frgn > 0` AND `sfi_inst > 0` | `BOTH_BUY` | 쌍끌이 매수 (상승 국면) |
| Q2 | `sfi_frgn ≤ 0` AND `sfi_inst > 0` | `INST_DEFENSE` | 기관 방어 (팽팽한 방어전) |
| Q3 | `sfi_frgn ≤ 0` AND `sfi_inst ≤ 0` | `BOTH_SELL` | 쌍끌이 매도 (하락 국면) |
| Q4 | `sfi_frgn > 0` AND `sfi_inst ≤ 0` | `FRGN_LEAD` | 외인 주도 (추세 전환 기대) |

> **경계 처리 원칙**: `0`은 매도 측(Q2, Q3)에 포함시킨다. 정확히 0인 경우는 실무상 거의 발생하지 않으나 일관된 분류를 위함이다.

### 3.3 충돌 강도 (Conflict Intensity)
Q2·Q4(충돌 사분면)에서 충돌의 강도를 추가 측정한다.
```
conflict_intensity = min(|sfi_inst|, |sfi_frgn|)
```
값이 클수록 두 주체가 강하게 반대 방향으로 움직였다는 의미. screening-rules.md에서 "충돌 종목 자동 감지"의 임계값으로 사용한다.

### 3.4 출력 컬럼
- `quadrant` (string: `BOTH_BUY` | `INST_DEFENSE` | `BOTH_SELL` | `FRGN_LEAD`)
- `conflict_intensity` (float, 단위: %)

---

## 4. 주체별 평단가 방어선 (Average Cost Defense Line)

### 4.1 정의
특정 주체가 최근 N일간 누적한 순매수의 **수량 가중평균 매수단가**. 해당 주체의 손익분기점이자 심리적 지지선으로 작용한다.

### 4.2 기간 정의
- **단기**: 5일 (`avg_cost_5d`) — 최근 단기 진입 평균
- **중기**: 20일 (`avg_cost_20d`) — 표준 평단가 (기본값)
- **장기**: 60일 (`avg_cost_60d`) — 중장기 누적 진입 평균

### 4.3 공식
```
avg_cost_{N}d_{subject} = sum(net_buy_{subject}, 최근 N일) / sum(net_qty_{subject}, 최근 N일)
```

### 4.4 산출 규칙
1. **순매수일만 합산하지 않는다.** 매도일도 음수로 합산한다 (누적 포지션 변동 추적).
2. **분모(수량 합)가 0 이하인 경우 `null` 반환.**
   - 누적 수량이 음수면 해당 기간 동안 순매도 우위 → 평단가 개념이 성립하지 않는다.
3. **거래일 기준 N일**이지 달력 기준이 아니다. 휴장일은 제외한다.
4. **기관·외국인 두 주체에 대해서만 계산한다.** 개인은 평단가 추정 의미가 약하므로 제외.

### 4.5 계산 의사코드
```python
def calc_avg_cost(df_ticker, subject, n_days):
    """
    df_ticker: 단일 종목의 시계열 (date 오름차순 정렬)
    subject: 'inst' or 'frgn'
    n_days: 5, 20, 60
    """
    recent = df_ticker.tail(n_days)
    total_value = recent[f'net_buy_{subject}'].sum()
    total_qty = recent[f'net_qty_{subject}'].sum()
    if total_qty <= 0:
        return None
    return total_value / total_qty
```

### 4.6 출력 컬럼
| 컬럼 | 타입 | 단위 |
|---|---|---|
| `avg_cost_5d_inst`, `avg_cost_5d_frgn` | float \| null | 원 |
| `avg_cost_20d_inst`, `avg_cost_20d_frgn` | float \| null | 원 |
| `avg_cost_60d_inst`, `avg_cost_60d_frgn` | float \| null | 원 |

---

## 5. 평단가 방어선 상태 분류 (Defense Line Status)

### 5.1 정의
현재가와 기관·외국인 평단가(20일 기준)의 위치 관계로 4단계 상태를 분류한다.

### 5.2 분류 규칙
**기준 평단가는 `avg_cost_20d_*`를 사용한다.** (단기·장기는 Deep Dive 화면 보조 표시용)

| 위치 관계 | 상태 코드 | 라벨 | 색상 |
|---|---|---|---|
| `close > avg_cost_20d_frgn ≥ avg_cost_20d_inst` | `SAFE` | 안전 구역 | 🟢 |
| `avg_cost_20d_frgn ≥ close > avg_cost_20d_inst` | `FRGN_LINE_TOUCH` | 외인 방어선 도달 | 🟡 |
| `avg_cost_20d_frgn ≥ avg_cost_20d_inst ≥ close` AND `close ≥ avg_cost_20d_inst × 0.95` | `INST_LINE_TOUCH` | 기관 방어선 도달 | 🟠 |
| `close < avg_cost_20d_inst × 0.95` | `BREAKDOWN` | 방어선 붕괴 | 🔴 |

> **"붕괴" 임계값(-5%)의 근거**: 일반적인 손절 라인 통념(-3~-7%)의 중간값. 추후 백테스트로 조정 가능하도록 상수화한다.

### 5.3 평단가 역전 케이스
`avg_cost_20d_inst > avg_cost_20d_frgn`인 경우(기관이 외인보다 비싸게 매수) 위 분류 표의 부등호를 그대로 적용하지 못한다. 이때는 다음으로 처리한다.
- 더 높은 평단가를 `upper_line`, 더 낮은 평단가를 `lower_line`으로 재정의 후 동일 로직 적용.
- 상태 라벨에는 `(역전)` 접미사를 붙여 시각화 단계에서 구분 표시.

### 5.4 결측 처리
- 두 평단가 중 하나라도 `null`인 경우 상태는 `INSUFFICIENT_DATA`로 반환.

### 5.5 출력 컬럼
- `defense_status` (string: `SAFE` | `FRGN_LINE_TOUCH` | `INST_LINE_TOUCH` | `BREAKDOWN` | `INSUFFICIENT_DATA`)
- `defense_status_inverted` (bool: 평단가 역전 여부)

---

## 6. 이동평균선 맥점 감지 (MA Crossover Detection)

### 6.1 정의
종가 이동평균선 간 교차(crossover) 이벤트를 감지하여 [Deep Dive 화면 §4.7](../visualization/dashboard-layout.md) "주요 이동평균선 맥점" 리스트에 노출한다.

### 6.2 감지 대상 (6종)

| event_type 코드 | 단기 MA | 장기 MA | 의미 |
|---|---|---|---|
| `GOLDEN_5_20` | `ma_5` | `ma_20` | 단기 골든크로스 (단기 추세 전환) |
| `DEAD_5_20` | `ma_5` | `ma_20` | 단기 데드크로스 (단기 약세 전환) |
| `GOLDEN_5_60` | `ma_5` | `ma_60` | 중기 골든크로스 |
| `DEAD_5_60` | `ma_5` | `ma_60` | 중기 데드크로스 |
| `GOLDEN_20_60` | `ma_20` | `ma_60` | 중장기 골든크로스 |
| `DEAD_20_60` | `ma_20` | `ma_60` | 중장기 데드크로스 |

> 120일선은 추세 확인용 표시만 수행하며 본 감지에는 사용하지 않는다.

### 6.3 감지 조건

```python
def detect_crossover(df_ticker, short_col, long_col, event_prefix):
    """
    df_ticker: 단일 종목 시계열 (date 오름차순). ma_5/ma_20/ma_60 컬럼 포함.
    Returns: list of {ticker, date, event_type, short_value, long_value}
    """
    events = []
    for i in range(1, len(df_ticker)):
        ps, pl = df_ticker[short_col].iloc[i-1], df_ticker[long_col].iloc[i-1]
        cs, cl = df_ticker[short_col].iloc[i],   df_ticker[long_col].iloc[i]
        if pd.isna(ps) or pd.isna(pl) or pd.isna(cs) or pd.isna(cl):
            continue
        if ps <= pl and cs > cl:
            events.append({'date': df_ticker['date'].iloc[i],
                           'event_type': f'GOLDEN_{event_prefix}',
                           'short_value': cs, 'long_value': cl})
        elif ps >= pl and cs < cl:
            events.append({'date': df_ticker['date'].iloc[i],
                           'event_type': f'DEAD_{event_prefix}',
                           'short_value': cs, 'long_value': cl})
    return events
```

### 6.4 출력 (`ma_events` 테이블)
[data-schema.md §3.6](data-schema.md) `ma_events` 테이블에 적재한다.

| 컬럼 | 타입 | 의미 |
|---|---|---|
| `ticker` | string PK | 종목 코드 |
| `date` | date PK | 발생일 |
| `event_type` | string PK | §6.2 코드 |
| `short_value` | float | 단기 MA 값 |
| `long_value` | float | 장기 MA 값 |

### 6.5 갱신 주기
매일 18:00 `eod_confirmed` 후, 신규 거래일 1행에 대해서만 6종 이벤트를 검사한다 (전체 재계산 X). 누적 적재.

---

## 7. 과거 패턴 유사도 검색 (Cosine Similarity)

### 7.1 정의
대상 종목의 최근 N일 수급 패턴과 유사한 과거 (다른 종목·다른 시점) 구간을 검색하여, [Deep Dive 화면 §4.8](../visualization/dashboard-layout.md) "과거 패턴 유사도 Top 3"에 노출한다.

### 7.2 Feature Vector 정의
- **윈도우 길이**: 최근 20거래일 (`PATTERN_WINDOW = 20`)
- **사용 컬럼**: `sfi_inst`, `sfi_frgn`, `dominance_inst`, `dominance_frgn` (4개)
- **차원**: 4 컬럼 × 20일 = **80차원 벡터**
- **정규화**: 컬럼별 z-score (각 컬럼의 평균 0·표준편차 1로 표준화). 결측치는 0으로 채움.

### 7.3 검색 절차
```python
def find_similar_patterns(target_ticker, target_date, n_top=3):
    cur_vec = extract_feature_vector(target_ticker, target_date)  # (80,)
    
    # 후보 풀: 과거 3년 내 모든 (ticker, end_date) 조합
    start = target_date - relativedelta(years=3)
    candidates = list_candidates(start_date=start, end_date=target_date - timedelta(days=60))
    
    # 코사인 유사도 계산
    sims = []
    for c_ticker, c_end_date in candidates:
        c_vec = extract_feature_vector(c_ticker, c_end_date)
        sim = np.dot(cur_vec, c_vec) / (np.linalg.norm(cur_vec) * np.linalg.norm(c_vec) + 1e-9)
        sims.append((c_ticker, c_end_date, sim))
    
    # 자기 자신 + 인접 60일 제외 (자기 자신 데이터로 매칭되지 않도록)
    sims = [s for s in sims if not (s[0] == target_ticker and abs((s[1] - target_date).days) < 60)]
    
    # 유사도 내림차순 Top N
    return sorted(sims, key=lambda x: -x[2])[:n_top]
```

### 7.4 자기 자신 제외 규칙
- 동일 ticker AND `|target_date - end_date| < 60일`인 후보는 제외 (윈도우 중첩 방지)
- 동일 ticker 후보가 너무 많으면 다양성 확보 위해 최대 1개만 Top 3에 포함

### 7.5 성능 최적화
- 후보 풀이 크다 (~2,500종목 × 750거래일 ≈ 1.8M). 매 요청 시 brute-force 계산은 1~2초 이상 소요.
- **권장 구현**: Annoy 또는 FAISS로 ANN(Approximate Nearest Neighbor) 인덱스 구축. 야간(`eod_confirmed` 직후) 인덱스 갱신.
- MVP에서는 거래대금 상위 500종목으로 후보 풀을 축소해 brute-force 사용 가능 (~200ms 응답).

### 7.6 출력 (응답 시점 동적 생성, 캐시 가능)
```json
[
  {
    "similar_ticker": "005930",
    "similar_name": "삼성전자",
    "period_start": "2024-08-15",
    "period_end": "2024-09-12",
    "similarity": 0.92,
    "return_5d": 4.6,
    "return_20d": 12.1
  },
  ...
]
```
24시간 Redis 캐싱 권장 키: `cache:patterns:{target_ticker}:{target_date}`.

---

## 8. Archive Type별 통계 집계 (Pattern Statistics)

### 8.1 정의
과거 3년간 Type A~D 발생 사례 전체에서 발생일 종가 대비 5/20일 후 수익률 분포를 집계하여 [Archive 화면 §5.3](../visualization/dashboard-layout.md)의 통계 카드 3개와 [data-schema.md §3.4](data-schema.md) `archive_pattern_stats` 테이블에 적재한다.

### 8.2 N일 후 수익률 정의
```python
return_Nd = (close_at(ticker, t + N_trading_days) / close_at(ticker, t) - 1) * 100  # %
```
- **N은 거래일 기준** (휴장일 제외, KRX 영업일 캘린더 사용)
- `close_at(ticker, t + N)` 누락 시 (신규 상장·상장폐지·데이터 결측) **해당 사례를 통계에서 제외**
- `t = 발생일`, `close_at(ticker, t)` = 발생일 종가 (`market_raw_data.close`)

### 8.3 승률 정의
```
win_rate_Nd = count(return_Nd > 0) / valid_count × 100   (단위: %)
```
- 분모는 §8.2 누락 제외 후 남은 사례 수 (`valid_count`)
- `return_Nd == 0`은 승으로 간주하지 않음 (>, 엄격 부등호)

### 8.4 산출 절차

```python
def calc_archive_stats(type_code, as_of_date, history_years=3):
    """
    type_code: 'A' | 'B' | 'C' | 'D'
    as_of_date: 통계 계산 기준일 (보통 오늘)
    """
    start = as_of_date - relativedelta(years=history_years)
    # market_indicators.type = type_code 인 (ticker, date) 모두 추출
    events = query_events(type_code, start, as_of_date)
    
    returns = []
    for ev in events:
        r5  = calc_return(ev.ticker, ev.date, 5)
        r20 = calc_return(ev.ticker, ev.date, 20)
        if r5 is None or r20 is None:
            continue
        returns.append((r5, r20))
    
    if not returns:
        return None
    n = len(returns)
    return {
        'total_count': n,
        'avg_return_5d':  sum(r[0] for r in returns) / n,
        'win_rate_5d':    sum(1 for r in returns if r[0] > 0) / n * 100,
        'avg_return_20d': sum(r[1] for r in returns) / n,
        'win_rate_20d':   sum(1 for r in returns if r[1] > 0) / n * 100,
    }
```

### 8.5 갱신 주기
매일 18:00 `eod_confirmed` 후, 4개 Type 모두 일괄 재계산하여 `archive_pattern_stats` 테이블에 `(type, as_of_date)` 복합 PK로 적재. 과거 행은 보존(시계열 추적 가능).

### 8.6 표본 부족 처리
`total_count < 30`인 Type에 대해서는 [scoring-signals.md §4.5](scoring-signals.md)의 "표본 부족 경고" 문구를 자동 부착한다.

---

## 9. 계산 순서 (실행 파이프라인)

다음 순서로 계산해야 의존성 충돌이 없다.

```
[1] 입력 데이터 로드 (data-schema.md 검증 완료 가정)
       ↓
[2] §1 dominance 계산 (행 단위, 독립 계산)
       ↓
[3] §2 SFI 계산 (행 단위, 독립 계산)
       ↓
[4] §3 quadrant·conflict_intensity 계산 (§2 결과 의존)
       ↓
[5] §4 avg_cost_5d/20d/60d 계산 (종목별 시계열 윈도우)
       ↓
[6] §5 defense_status 계산 (§4 결과 + close 의존)
       ↓
[7] §6 ma_events 신규 행 검사 + 적재
       ↓
[8] (이상 결과를 market_indicators 테이블에 저장)
       ↓
[9] screening-rules.md §1 Type 분류 → market_indicators.type 적재
       ↓
[10] §8 archive_pattern_stats 4종 재계산 (Type 분류 결과 의존)
       ↓
[11] §7 과거 패턴 유사도는 사전 계산하지 않음 — Deep Dive 요청 시 동적 계산
```

---

## 10. 상수 정의 (튜닝 가능 항목)

```python
# supply-analysis.md 기준 상수
AVG_COST_PERIODS = [5, 20, 60]            # §4.2
AVG_COST_PRIMARY = 20                      # §5.2 기준 기간
BREAKDOWN_THRESHOLD = 0.95                 # §5.2 기관 평단가 -5% 이탈 시 붕괴
QUADRANT_BOUNDARY_INCLUSIVE = 'sell'       # §3.2 0을 매도 측에 포함

# §7 패턴 유사도
PATTERN_WINDOW = 20                        # 최근 20거래일
PATTERN_FEATURE_COLS = ['sfi_inst', 'sfi_frgn', 'dominance_inst', 'dominance_frgn']
PATTERN_HISTORY_YEARS = 3                  # 후보 풀 범위
PATTERN_SELF_EXCLUDE_DAYS = 60             # 자기 자신 인접 윈도우 제외

# §8 Archive 통계
ARCHIVE_HISTORY_YEARS = 3
ARCHIVE_RETURN_PERIODS = [5, 20]           # 거래일 단위
ARCHIVE_MIN_SAMPLE = 30                    # 표본 부족 경고 임계값
```

> 위 상수는 백테스트 결과에 따라 조정 가능하다. 변경 시 screening-rules.md, scoring-signals.md의 임계값과 일관성을 유지해야 한다.

---

## 11. 검증 체크리스트

LLM이 이 파일에 따라 구현한 후, 다음 자체 검증을 수행한다.

- [ ] `dominance_indi + dominance_inst + dominance_frgn`의 부호 합이 합리적인가? (절대값 합은 1이 아닐 수 있음. 부호 차이 때문)
- [ ] SFI는 한 종목 내에서 `sfi_inst + sfi_frgn + sfi_indi ≈ 0` (잔여항 관계)인가?
- [ ] 모든 종목·날짜에 대해 `quadrant`가 4개 중 하나로 분류되었는가?
- [ ] `avg_cost_*` 계산 시 거래일 기준 윈도우가 정확히 적용되었는가? (휴장일 제외)
- [ ] `defense_status`가 `INSUFFICIENT_DATA`인 비율이 너무 높지 않은가? (신규 상장 종목 외에는 5% 미만이어야 정상)
- [ ] `ma_events`에 6종 event_type이 모두 적재되며, 신규 거래일에 한해서만 추가 적재되는가?
- [ ] §7 패턴 유사도 검색 시 자기 자신·인접 60일이 제외되는가?
- [ ] §7 feature vector가 컬럼별 z-score 정규화되어 길이가 80차원인가?
- [ ] §8 `archive_pattern_stats`가 4개 Type 모두에 대해 매일 갱신되는가?
- [ ] §8 `total_count < 30`인 Type에 표본 부족 경고가 자동 부착되는가?
