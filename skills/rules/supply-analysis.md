---
name: supply-analysis
description: 수급전쟁 핵심 분석 지표 계산 규칙. SFI · 3파전 수급 주도력 · 평단가 방어선 · 4분면 엇갈림 분류 · 섹터 가중평균 · 패턴 유사도를 정의한다.
type: analysis-rule
depends-on: ./data-schema.md (입출력 테이블)
---

# Supply Analysis Rules

본 문서는 raw 데이터로부터 `derived.daily_metrics` · `aggregated.sector_flows` ·
`archive.similarity_index`를 산출하는 계산 규칙을 정의한다.

모든 수식은 결정론적이며, 같은 입력은 같은 출력을 낸다.

---

## 1. SFI (Supply Flow Index, 수급 강도 지수)

### 1.1 정의

특정 주체의 순매수가 당일 총거래대금 대비 차지하는 비율을 백분율로 환산.

```
foreign_sfi = (foreign_net_value / total_value) × 100
inst_sfi    = (inst_net_value    / total_value) × 100
```

- `total_value` = `raw.daily_price.value` (당일 총거래대금)
- 결과 단위: 백분율 (예: +5.2 = 5.2%)
- 결과 범위: 이론상 [-100, +100], 실측은 대부분 [-15, +15]

### 1.2 엣지 케이스

| 조건 | 처리 |
|---|---|
| `total_value = 0` (거래정지 등) | SFI = NULL, `defense_state` = NULL |
| `total_value < 1,000,000` (거래미미) | SFI는 계산하되, screening-rules에서 제외 |
| 결측치 | NULL 그대로 저장 (FE에서 "—" 표시) |

### 1.3 출력

`derived.daily_metrics.{inst_sfi, foreign_sfi}` 컬럼 (소수점 2자리).

---

## 2. 3파전 수급 주도력 (Dominance)

### 2.1 정의

3주체 중 특정 주체의 영향력 비중. 부호 보존.

```
denom = |indiv_net_value| + |inst_net_value| + |foreign_net_value|

indiv_dominance   = (indiv_net_value   / denom) × 100
inst_dominance    = (inst_net_value    / denom) × 100
foreign_dominance = (foreign_net_value / denom) × 100
```

- 부호: 매수 → 양수, 매도 → 음수
- 3개 합의 절대값 = 100 (수학적 보장)
- 단위: 백분율

### 2.2 엣지 케이스

| 조건 | 처리 |
|---|---|
| `denom = 0` | 모든 dominance = 0 |
| 한 주체만 거래 | 해당 주체 ±100, 나머지 0 |

### 2.3 활용

- War Room 시장 3파전 주도력 차트 (Diverging Bar)
- Screener 테이블 컬럼 3개
- 전술 레이더 맵 버블 색상 결정 (가장 큰 절대값을 가진 주체 → Type 매핑)

---

## 3. 평단가 방어선 (Defense Line)

### 3.1 정의

최근 N일간 누적 순매수 금액을 누적 순매수 수량으로 나눈 가중평균 매수가.

```
N = 20  (거래일 기준)

inst_avg_price = inst_cum_value_20d / inst_cum_volume_20d
foreign_avg_price = foreign_cum_value_20d / foreign_cum_volume_20d
```

### 3.2 누적 산출 (data-schema.md `derived.cumulative_flow_20d`)

```python
df['inst_cum_value_20d'] = df.groupby('ticker')['inst_net_value'] \
    .transform(lambda x: x.rolling(20, min_periods=5).sum())
df['inst_cum_volume_20d'] = df.groupby('ticker')['inst_net_volume'] \
    .transform(lambda x: x.rolling(20, min_periods=5).sum())
```

### 3.3 엣지 케이스

| 조건 | 처리 |
|---|---|
| 누적 순매수 수량 ≤ 0 (순매도 누적) | 평단선 = NULL (방어선 의미 없음) |
| 거래일 5일 미만 | 평단선 = NULL |
| 분모가 매우 작음 (수량 < 100주) | NULL |

평단선이 NULL인 종목은 `defense_state` 도 NULL.

### 3.4 출력

`derived.daily_metrics.{inst_avg_price, foreign_avg_price}` (소수점 2자리, 원 단위).

---

## 4. 평단가 방어선 4단계 상태

### 4.1 분류 규칙

현재가(`close`)와 두 평단선(`inst_avg_price`, `foreign_avg_price`) 위치 관계로 4단계 분류.

| 조건 | `defense_state` | DESIGN.md 토큰 |
|---|---|---|
| `close > foreign_avg_price > inst_avg_price` | `safe` | `defense.safe` |
| `foreign_avg_price ≥ close > inst_avg_price` | `caution_yellow` | `defense.caution-yellow` |
| `foreign_avg_price > inst_avg_price ≥ close` AND `(min_avg − close) / close < 0.05` | `caution_orange` | `defense.caution-orange` |
| `foreign_avg_price > inst_avg_price >> close` AND `(min_avg − close) / close ≥ 0.05` | `danger` | `defense.danger` |

여기서 `min_avg = MIN(inst_avg_price, foreign_avg_price)`.

### 4.2 의미

| 단계 | 의미 |
|---|---|
| `safe` | 큰손들 모두 수익 구간 (평화로움) |
| `caution_yellow` | 외인 평단 도달, 외인 추가 매수로 반등 가능 |
| `caution_orange` | 기관 평단 도달, 연합군 최후 지지선 테스트 |
| `danger` | 평단선 5% 이상 하회, 손절 물량 출회 위험 |

### 4.3 예외

- `inst_avg_price`와 `foreign_avg_price`의 대소 관계가 위 가정과 반대(`inst > foreign`)일 때:
  → 같은 4단계 분류를 `MAX(inst, foreign)`을 외인 자리, `MIN`을 기관 자리로 치환해 적용
- 한쪽 평단이 NULL이면 나머지 평단만 사용해 2단계 분류:
  - `close > avg` → `safe`
  - `close ≤ avg` AND 괴리 < 5% → `caution_orange`
  - `close < avg` AND 괴리 ≥ 5% → `danger`

---

## 5. 4분면 엇갈림 분류 (Quadrant)

### 5.1 분류 규칙

기관 SFI · 외인 SFI 부호로 4분면 분류.

| 조건 | `quadrant` | 의미 |
|---|---|---|
| `foreign_sfi > 0` AND `inst_sfi > 0` | 1 | 쌍끌이 매수 (상승 국면) |
| `foreign_sfi < 0` AND `inst_sfi > 0` | 2 | 기관 방어 (팽팽한 방어전) |
| `foreign_sfi < 0` AND `inst_sfi < 0` | 3 | 쌍끌이 매도 (하락 국면) |
| `foreign_sfi > 0` AND `inst_sfi < 0` | 4 | 외인 주도 (추세 전환 기대) |

### 5.2 0 처리

`foreign_sfi = 0` 또는 `inst_sfi = 0`인 경우:
- 두 SFI 모두 0 → `quadrant = NULL`
- 한쪽만 0 → 양수와 동일 분면으로 간주 (양수 우선)

### 5.3 활용

전술 레이더 맵 X·Y축, Type A~D 분류의 1차 필터 ([screening-rules.md](./screening-rules.md) §1).

---

## 6. 섹터 가중평균 (Sector Flows)

### 6.1 정의

섹터 단위로 SFI를 거래대금 가중평균.

```
sector_value = SUM(value) WHERE sector = X AND trade_date = D

sector_inst_sfi_avg = SUM(inst_sfi × value) / sector_value
sector_foreign_sfi_avg = SUM(foreign_sfi × value) / sector_value
```

### 6.2 dominant_subject 결정

섹터 내 종목들의 dominance 부호 일치도로 결정.

```
inst_sum    = SUM(inst_dominance × value)
foreign_sum = SUM(foreign_dominance × value)
indiv_sum   = SUM(indiv_dominance × value)

dominant_subject = ARGMAX_ABS(inst_sum, foreign_sum, indiv_sum)
```

### 6.3 dominant_type

섹터의 Type은 종목별 Type의 거래대금 가중 다수결.

```python
sector_type = (
    df.groupby(['sector', 'signal_type'])['value'].sum()
    .reset_index()
    .sort_values('value', ascending=False)
    .groupby('sector').head(1)
)
```

NULL Type은 무시 (Type 미부여 종목 제외).

### 6.4 출력

`aggregated.sector_flows` 1행 per (date, sector).

---

## 7. 과거 패턴 유사도 (Similarity)

### 7.1 특징 벡터

각 (ticker, window_end) 쌍마다 5일짜리 특징 벡터를 만든다.

```
feature_vector = [
    inst_sfi[t-4], inst_sfi[t-3], inst_sfi[t-2], inst_sfi[t-1], inst_sfi[t],
    foreign_sfi[t-4], ..., foreign_sfi[t],
    inst_dominance[t-4], ..., inst_dominance[t],
    foreign_dominance[t-4], ..., foreign_dominance[t]
]
```

길이: 20 (4 series × 5 days). NULL은 0으로 대체.

### 7.2 정규화

각 시리즈를 z-score 정규화 후 결합:

```python
for series in [inst_sfi, foreign_sfi, inst_dominance, foreign_dominance]:
    series = (series - series.mean()) / (series.std() + 1e-9)
```

### 7.3 유사도 계산

코사인 유사도:

```
similarity(a, b) = dot(a, b) / (||a|| × ||b||)
```

### 7.4 Top 3 검색

특정 종목·시점 query에 대해:
1. `archive.similarity_index`에서 동일 ticker는 제외
2. 최근 60거래일은 제외 (최근 결과 누출 방지)
3. 코사인 유사도 상위 3건 반환
4. 각 결과에 `return_5d`, `return_20d` 동봉

### 7.5 출력

`archive.similarity_index` 인덱스에서 조회. Deep Dive 페이지에서 사용.

---

## 8. 계산 순서 (배치 작업)

raw 데이터 적재 후 다음 순서로 실행한다.

```
1. derived.cumulative_flow_20d   ← raw.daily_investor_flow 20일 누적
2. derived.daily_metrics
   2.1 SFI                         (§1)
   2.2 Dominance                   (§2)
   2.3 평단가                       (§3)
   2.4 defense_state                (§4)
   2.5 quadrant                     (§5)
3. aggregated.sector_flows        (§6)
4. (signal_type은 screening-rules.md에서 채움)
5. (insight_text는 scoring-signals.md에서 채움)
6. archive.similarity_index 갱신    (§7)
```

각 단계는 멱등성을 가지며, 동일 (date) 재실행 시 덮어쓰기.

---

## 9. 단위 검증 테스트

구현 후 다음을 만족해야 한다.

| 검증 | 기대 |
|---|---|
| `inst_sfi + foreign_sfi + indiv_sfi + etc_sfi`의 절대값 ≤ 100 | ✓ |
| `|indiv_dom| + |inst_dom| + |foreign_dom|` ≈ 100 (오차 < 0.1) | ✓ |
| `defense_state = safe` 인 종목은 `close > foreign_avg AND close > inst_avg` | ✓ |
| `quadrant = 1` 인 종목은 `inst_sfi > 0 AND foreign_sfi > 0` | ✓ |
| 동일 (date, ticker) 재실행 시 결과 동일 | ✓ |

---

## 10. 의사코드 (Python/Pandas)

```python
import pandas as pd
import numpy as np

def compute_daily_metrics(price_df, flow_df) -> pd.DataFrame:
    df = flow_df.merge(price_df[['trade_date','ticker','close','value']],
                       on=['trade_date','ticker'])

    # §1 SFI
    df['inst_sfi']    = np.where(df['value']>0, df['inst_net_value']/df['value']*100, np.nan)
    df['foreign_sfi'] = np.where(df['value']>0, df['foreign_net_value']/df['value']*100, np.nan)

    # §2 Dominance
    denom = (df['indiv_net_value'].abs() + df['inst_net_value'].abs() +
             df['foreign_net_value'].abs())
    df['indiv_dominance']   = np.where(denom>0, df['indiv_net_value']/denom*100, 0)
    df['inst_dominance']    = np.where(denom>0, df['inst_net_value']/denom*100, 0)
    df['foreign_dominance'] = np.where(denom>0, df['foreign_net_value']/denom*100, 0)

    # §3 평단 (별도 함수에서 20일 누적 후 결합)
    df = attach_avg_price(df)

    # §4 defense_state
    df['defense_state'] = df.apply(classify_defense, axis=1)

    # §5 quadrant
    df['quadrant'] = df.apply(classify_quadrant, axis=1)

    return df
```

---

## 11. 구현 체크리스트

- [ ] SFI 두 컬럼이 정상 범위
- [ ] Dominance 합계 절대값이 100±0.1
- [ ] 평단가는 누적 순매수 양수일 때만 산출
- [ ] defense_state 4단계 모두 출현
- [ ] quadrant 1~4 모두 출현
- [ ] 섹터 가중평균이 거래대금 비중 기반
- [ ] 패턴 유사도 Top 3 검색이 200ms 이내
