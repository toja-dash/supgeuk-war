---
name: classifying-signal-types
description: supply-analysis.md의 2차 지표를 입력받아 종목 단위 Type A~D 신호를 분류하고, 시장 단위 상태를 3단 구조의 Market Brief 문장으로 자동 조립한다.
---

# 종목·시장 신호 분류 규칙

> **역할**: supply-analysis.md가 계산한 2차 지표를 입력받아 종목별 신호를 Type A~D로 분류하고, 시장 전체 상태를 단계형 Market Brief 문장으로 변환한다.
> **참조 시점**: supply-analysis.md 계산 완료 직후, scoring-signals.md 호출 이전.
> **선행 조건**: `sfi_inst`, `sfi_frgn`, `quadrant`, `defense_status`, `dominance_*` 컬럼이 모두 산출된 상태.

---

## 0. 공통 규약

### 0.1 분류 단위
- **종목 단위 분류**: Type A~D (§1)
- **시장 단위 분류**: Market Brief (§3)

### 0.2 임계값 표준
모든 임계값은 §4 상수 블록에서 일괄 관리한다. 본문 내 숫자 변경 시 §4도 동기화한다.

### 0.3 Type 체계 설계 원칙
A·B는 **쌍끌이(두 주체 같은 방향)** 신호, C·D는 **충돌(두 주체 반대 방향)** 신호로 대칭 설계한다.

| 구조 | 같은 방향 (쌍끌이) | 반대 방향 (충돌) |
|---|---|---|
| 매수 우위 | **B (쌍끌이 매수)** 🟢 | C·D (외인/기관 우위) |
| 매도 우위 | **A (쌍끌이 매도 + 붕괴)** 🔴 | — |
| 외인+ / 기관− | — | **C (개미털기)** 🟡 |
| 외인− / 기관+ | — | **D (기관 방어)** 🔵 |

### 0.4 우선순위 원칙
한 종목이 복수 Type 조건을 동시에 만족할 때는 **A > B > C > D** 순으로 단일 Type을 부여한다. (위험 경고 우선, 그 다음 강한 양방 신호, 충돌 신호 순)

---

## 1. 종목 단위 신호 분류 (Type A~D)

### 1.1 Type 정의 요약

| Type | 라벨 | 사분면 | 핵심 의미 | 톤 |
|---|---|---|---|---|
| A | 쌍끌이 설거지 | Q3 (BOTH_SELL) + 붕괴 | 기관·외인 동시 매도 + 평단가 붕괴 | 🔴 위험 경고 |
| B | 쌍끌이 매수 | Q1 (BOTH_BUY) | 기관·외인 동시 강한 매수 | 🟢 기회 포착 |
| C | 개미털기 (외인+ / 기관−) | Q4 (FRGN_LEAD) | 외인 매수 vs 기관 매도 충돌 | 🟡 충돌 주의 |
| D | 기관 방어 (외인− / 기관+) | Q2 (INST_DEFENSE) | 기관 매수 vs 외인 매도 충돌 | 🔵 전환 기대 |

### 1.2 분류 조건 (의사코드)

```python
def classify_type(row):
    sfi_i = row['sfi_inst']
    sfi_f = row['sfi_frgn']
    status = row['defense_status']
    
    # 결측 가드
    if sfi_i is None or sfi_f is None:
        return None
    
    # Type A: 쌍끌이 설거지 (위험 경고)
    # 두 주체 모두 강한 매도 + 평단가 방어선 붕괴
    if sfi_i <= -SFI_STRONG and sfi_f <= -SFI_STRONG and status == 'BREAKDOWN':
        return 'A'
    
    # Type B: 쌍끌이 매수 (기회 포착)
    # 두 주체 모두 강한 매수
    if sfi_i >= SFI_STRONG and sfi_f >= SFI_STRONG:
        return 'B'
    
    # Type C: 개미털기 (외인 매수 / 기관 매도 충돌)
    if sfi_f >= SFI_STRONG and sfi_i <= -SFI_STRONG:
        return 'C'
    
    # Type D: 기관 방어 (기관 매수 / 외인 매도 충돌)
    if sfi_i >= SFI_STRONG and sfi_f <= -SFI_STRONG:
        return 'D'
    
    return None  # 어느 Type에도 속하지 않음 (관망 종목)
```

> **`SFI_STRONG = 3.0`** (표준 임계값). §4 상수 블록 참조.

### 1.3 Type별 상세 조건

#### Type A — 쌍끌이 설거지 🔴
```
sfi_inst ≤ -3.0  AND  sfi_frgn ≤ -3.0  AND  defense_status = 'BREAKDOWN'
```
- **의미**: 기관과 외인이 동시에 강하게 매도하면서, 현재가가 기관 20일 평단가 -5% 이하로 이탈한 상태. 큰손들의 손절 물량이 출회되는 구간.
- **선행 분석**: `quadrant = BOTH_SELL` (Q3) 종목 중 BREAKDOWN 상태만 추출.
- **노출 위치**: War Room "오늘의 주목 종목 - Type A (위험 경고)" 섹션.

#### Type B — 쌍끌이 매수 🟢
```
sfi_inst ≥ +3.0  AND  sfi_frgn ≥ +3.0
```
- **의미**: 기관과 외인이 동시에 강하게 매수하는 상승 국면. 양 주체의 방향이 일치하므로 신호 신뢰도가 가장 높다.
- **선행 분석**: `quadrant = BOTH_BUY` (Q1) 종목 중 양 주체 SFI가 모두 임계값 이상인 경우.
- **참고**: 평단가 조건은 적용하지 않음 (강한 매수세 자체가 핵심 신호).
- **노출 위치**: War Room "오늘의 주목 종목 - Type B (기회 포착)" 섹션.

#### Type C — 개미털기 🟡
```
sfi_frgn ≥ +3.0  AND  sfi_inst ≤ -3.0
```
- **의미**: 외인은 강하게 매수, 기관은 강하게 매도하는 충돌 상태. 합산 수치로는 중립으로 보이나 실제로는 강한 수급 엇갈림. 단기 변동성 확대 가능성.
- **선행 분석**: `quadrant = FRGN_LEAD` (Q4) 중 충돌 강도(`conflict_intensity`) ≥ 3.0인 종목.
- **참고**: 신호 해석이 갈리므로 추가 분석(Deep Dive)을 통한 검증이 필요한 상태.

#### Type D — 기관 방어 🔵
```
sfi_inst ≥ +3.0  AND  sfi_frgn ≤ -3.0
```
- **의미**: 기관은 강하게 매수, 외인은 강하게 매도하는 충돌 상태. 외인 매도 압력 속에서 기관이 단독 방어선을 형성하는 구간. 추세 전환 또는 기관 단독 베팅으로 해석 가능.
- **선행 분석**: `quadrant = INST_DEFENSE` (Q2) 중 충돌 강도(`conflict_intensity`) ≥ 3.0인 종목.

### 1.4 Type 미분류 종목 처리
- `type = None`인 종목은 War Room "오늘의 주목 종목"에서 제외.
- 다음 케이스는 모두 미분류로 처리됨:
  - 한 주체만 임계값을 넘고 다른 주체는 중립인 경우 (예: 외인+ · 기관 중립)
  - 두 주체 모두 매도하지만 평단가가 BREAKDOWN이 아닌 경우 (Type A 미충족)
  - 양 주체 강도가 모두 임계값 미만인 경우 (관망 종목)
- Screener 화면에서는 "Type 선택 - 전체" 옵션 시에만 노출.

### 1.5 출력 컬럼
- `type` (string: `A` | `B` | `C` | `D` | `null`)
- `type_intensity` (float): Type 신호의 강도. 다음과 같이 계산:
  ```python
  type_intensity = max(|sfi_inst|, |sfi_frgn|)
  ```
  Screener의 정렬 기준 및 War Room의 Top N 추출에 사용.

---

## 2. Type별 우선 노출 규칙

### 2.1 War Room "오늘의 주목 종목" 노출 순서
1. **Type A 종목 전체** (위험 경고는 빠짐없이 표시)
2. **Type B 종목** Top 5 (`type_intensity` 내림차순)
3. **Type C 종목** Top 5
4. **Type D 종목** Top 5

### 2.2 충돌 강도 기반 추가 정렬
Type C·D는 `conflict_intensity` (supply-analysis.md §3.3) 내림차순으로 추가 정렬. (충돌이 강할수록 신호 강도 큼)

### 2.3 거래대금 하한 필터
모든 Type 분류 결과에서 **당일 거래대금 < 10억 원**인 종목은 노출 대상에서 제외한다. (저거래 종목의 SFI는 통계적 잡음 가능성이 높음)

---

## 3. Market Brief 단계형 문장 템플릿

### 3.1 구조
Market Brief는 **3단 구조**로 자동 조립된다.
```
[1단: 주력 문장] + [2단: 충돌 문장 (조건부)] + [3단: 충고 문장 (조건부)]
```

각 단의 문장은 §3.2~§3.4의 조건에 따라 선택된다.

### 3.2 1단: 주력 문장 (필수)
시장 전체의 평균 SFI(코스피·코스닥 종합)를 기준으로 하나를 선택한다.

| 조건 | 문장 템플릿 |
|---|---|
| `market_sfi_inst > +1.0` AND `market_sfi_frgn > +1.0` | "오늘 시장은 **기관·외국인 쌍끌이 매수**로 강한 상승 동력이 형성됐습니다." |
| `market_sfi_frgn > +1.0` AND `market_sfi_inst ≤ +1.0` | "오늘 시장은 **외국인의 {top_sector} 집중 매수**로 상승 마감했습니다." |
| `market_sfi_inst > +1.0` AND `market_sfi_frgn ≤ +1.0` | "오늘 시장은 **기관 단독 매수**로 방어전이 펼쳐졌습니다." |
| `market_sfi_inst < -1.0` AND `market_sfi_frgn < -1.0` | "오늘 시장은 **쌍끌이 매도**로 하락 압력을 받았습니다." |
| `market_sfi_frgn < -1.0` AND `market_sfi_inst ≥ -1.0` | "오늘 시장은 **외국인 매도**가 지수를 끌어내렸습니다." |
| 그 외 | "오늘 시장은 뚜렷한 주도 세력 없이 **혼조세**로 마감했습니다." |

> `top_sector`는 외인 SFI가 가장 큰 양수 값을 가진 섹터명. (예: "반도체", "2차전지")

### 3.3 2단: 충돌 문장 (조건부)
**Type C 또는 Type D 종목 수의 합이 전체 종목 수의 1% 이상**일 때만 추가한다.

```
"단, 충돌 종목(Type C·D)이 {N}개 발생하여 일부 종목에서 기관·외인 수급 엇갈림이 관찰됩니다."
```

`N`이 50개 이상인 경우 다음 강조 문구로 대체:
```
"특히 {N}개 종목에서 기관·외인 충돌이 동시 다발적으로 나타나, 종목별 분리 분석이 필요합니다."
```

### 3.4 3단: 충고 문장 (조건부)
**Type A 종목 수가 10개 이상**일 때만 추가한다.

| 조건 | 문장 템플릿 |
|---|---|
| `count_A ≥ 30` | "⚠️ Type A(쌍끌이 설거지) 종목이 **{N}개**로 집중 발생, 보유 종목의 평단가 방어선 점검을 권장합니다." |
| `10 ≤ count_A < 30` | "Type A 종목 {N}개에서 평단가 붕괴가 확인됩니다." |

### 3.5 조립 예시

**예시 1**: 외인 반도체 매수 + 일부 충돌 + 위험 종목 적음
```
"오늘 시장은 외국인의 반도체 집중 매수로 상승 마감했습니다. 
단, 충돌 종목(Type C·D)이 28개 발생하여 일부 종목에서 기관·외인 수급 엇갈림이 관찰됩니다."
```

**예시 2**: 쌍끌이 매도 + 충돌 다수 + 위험 다수
```
"오늘 시장은 쌍끌이 매도로 하락 압력을 받았습니다. 
특히 65개 종목에서 기관·외인 충돌이 동시 다발적으로 나타나, 종목별 분리 분석이 필요합니다. 
⚠️ Type A(쌍끌이 설거지) 종목이 42개로 집중 발생, 보유 종목의 평단가 방어선 점검을 권장합니다."
```

**예시 3**: 혼조 + 충돌 적음 + 위험 적음
```
"오늘 시장은 뚜렷한 주도 세력 없이 혼조세로 마감했습니다."
```
(2단·3단 조건 미달 시 1단만 출력)

---

## 4. 상수 정의 (튜닝 가능 항목)

```python
# screening-rules.md 기준 상수
SFI_STRONG = 3.0                    # §1.2 Type 분류 임계값 (단위: %)
MARKET_SFI_THRESHOLD = 1.0          # §3.2 시장 전체 SFI 임계값 (단위: %)
CONFLICT_RATIO_THRESHOLD = 0.01     # §3.3 충돌 문장 발동 비율 (1%)
CONFLICT_HIGHLIGHT_COUNT = 50       # §3.3 강조 문구 전환 임계값
TYPE_A_WARNING_COUNT = 10           # §3.4 충고 문장 발동 임계값
TYPE_A_EMPHASIS_COUNT = 30          # §3.4 강조 문구 전환 임계값
TRADE_VALUE_FLOOR = 1_000_000_000   # §2.3 거래대금 하한 (10억 원)

# Type별 Top N 노출 (§2.1)
TOP_N_BY_TYPE = {
    'A': None,    # 전체 노출
    'B': 5,
    'C': 5,
    'D': 5,
}
```

> 위 상수는 백테스트 또는 사용자 피드백으로 조정 가능. supply-analysis.md의 임계값과 일관성 유지 필수.

---

## 5. 시장 단위 집계 규칙

Market Brief 1단에서 사용하는 `market_sfi_inst`, `market_sfi_frgn`의 정의.

### 5.1 가중평균 방식
종목별 SFI를 거래대금 가중평균한다. (단순 평균은 거래량 작은 종목에 과도한 가중치 부여)

```python
def calc_market_sfi(df, subject):
    """
    df: 당일 전 종목 데이터프레임 (market_indicators ⨝ stock_master)
        — stock_master.market(KOSPI/KOSDAQ), sector 컬럼 포함
    subject: 'inst' or 'frgn'
    """
    # 거래대금 하한 필터 (§2.3)
    df = df[df['trade_value'] >= TRADE_VALUE_FLOOR]
    
    if df.empty:
        return None
    
    weighted_sum = (df[f'sfi_{subject}'] * df['trade_value']).sum()
    total_value = df['trade_value'].sum()
    return weighted_sum / total_value
```

### 5.2 시장 분리
[data-schema.md §3.5 `stock_master.market`](data-schema.md) 컬럼으로 코스피·코스닥을 분리한다. Market Brief는 **두 시장의 단순 평균**을 사용한다. (개별 시장 브리핑은 별도 컴포넌트에서 표시)

```python
df_kospi  = df[df['market'] == 'KOSPI']
df_kosdaq = df[df['market'] == 'KOSDAQ']
sfi_kospi  = calc_market_sfi(df_kospi,  'inst')
sfi_kosdaq = calc_market_sfi(df_kosdaq, 'inst')
sfi_total  = (sfi_kospi + sfi_kosdaq) / 2
```

### 5.3 섹터 1위 추출
`stock_master.sector` 컬럼으로 그룹핑하여 가중평균 SFI를 계산하고 양수 1위 섹터를 추출한다. 양수 섹터가 없으면 `null`.

### 5.4 출력 컬럼 (`market_summary` 테이블 1행/일)

[data-schema.md §3.3](data-schema.md) `market_summary` 테이블에 다음 컬럼을 일괄 적재한다.

| 컬럼 | 산출 |
|---|---|
| `market_sfi_inst_kospi`, `market_sfi_inst_kosdaq`, `market_sfi_inst_total` | §5.1·§5.2 |
| `market_sfi_frgn_kospi`, `market_sfi_frgn_kosdaq`, `market_sfi_frgn_total` | §5.1·§5.2 |
| `top_sector_frgn` | §5.3 외인 SFI 1위 섹터명 |
| `top_sector_inst` | §5.3 기관 SFI 1위 섹터명 |
| `count_type_a`, `count_type_b`, `count_type_c`, `count_type_d` | §1 분류 결과 Type별 종목 수 |
| `market_brief_text` | §3 단계형 조립 결과 문장 (1단+2단+3단) |

---

## 6. 검증 체크리스트

LLM이 이 파일에 따라 구현한 후, 다음 자체 검증을 수행한다.

- [ ] Type A 종목은 모두 `defense_status = 'BREAKDOWN'`인가? (조건 누락 검증)
- [ ] Type B 종목은 모두 `quadrant = 'BOTH_BUY'`인가?
- [ ] Type C 종목은 모두 `quadrant = 'FRGN_LEAD'`인가?
- [ ] Type D 종목은 모두 `quadrant = 'INST_DEFENSE'`인가?
- [ ] Type 미분류 종목 비율이 95%를 넘지 않는가? (임계값이 너무 엄격하지 않은지)
- [ ] Market Brief 출력 시 1단 문장이 항상 존재하는가?
- [ ] 거래대금 10억 원 미만 종목이 Type 분류 결과에 포함되지 않았는가?
- [ ] Type 우선순위 (A > B > C > D)가 정확히 적용되었는가?
