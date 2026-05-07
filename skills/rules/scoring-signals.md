---
name: generating-priority-and-insights
description: screening-rules.md가 분류한 Type A~D 신호로부터 종목 간 우선순위 점수와 War Room·Deep Dive·Archive 화면용 인사이트 텍스트를 규칙 기반 템플릿으로 자동 생성한다.
---

# 신호 우선순위 및 인사이트 출력 규칙

> **역할**: screening-rules.md가 분류한 Type A~D 신호를 입력받아 (1) 종목 간 우선순위 점수를 산출하고, (2) War Room·Deep Dive·Archive 화면에 노출할 인사이트 텍스트를 자동 생성한다.
> **참조 시점**: screening-rules.md 분류 완료 직후, 시각화 단계(dashboard-layout.md) 호출 이전.
> **선행 조건**: `type`, `type_intensity`, `sfi_inst`, `sfi_frgn`, `defense_status`, `quadrant`, `trade_value` 컬럼이 모두 산출된 상태.

---

## 0. 공통 규약

### 0.1 출력 단위
- **종목 단위**: 우선순위 점수 + Deep Dive 인사이트 텍스트
- **시장 단위**: War Room 시그널 요약 카드 텍스트
- **패턴 단위**: Archive 통계 자연어 요약

### 0.2 텍스트 생성 원칙
- 모든 텍스트는 **규칙 기반 템플릿**으로 생성한다. LLM 호출 없음.
- 변수 치환만으로 문장이 완성되도록 템플릿을 설계한다.
- 위험·예측을 암시하는 문장에는 §5 면책 규칙을 자동 적용한다.

### 0.3 임계값 표준
모든 임계값은 §6 상수 블록에서 일괄 관리한다. screening-rules.md 상수와 의미적 일관성을 유지한다.

---

## 1. 종목 간 우선순위 점수 (Priority Score)

### 1.1 정의
종목별 신호 강도와 시장 영향력을 결합한 복합 점수. War Room "오늘의 주목 종목" Top N 추출, Screener 정렬 기본값으로 사용.

### 1.2 공식
```
priority_score = type_intensity × log10(trade_value / 1억)
```

- `type_intensity`: screening-rules.md §1.5에서 산출된 값 (max(|sfi_inst|, |sfi_frgn|))
- `trade_value`: 당일 거래대금 (원 단위, supply-analysis.md 입력 컬럼)
- **정규화 기준 1억 원**: 거래대금 1억 미만 종목은 점수가 음수가 되어 자연 도태된다. (screening-rules.md의 10억 하한 필터를 통과한 종목만 입력으로 들어오므로 실무상 문제 없음)

### 1.3 계산 의사코드
```python
import math

def calc_priority_score(row):
    if row['type'] is None:
        return None
    if row['trade_value'] <= 0:
        return None
    
    intensity = row['type_intensity']
    trade_value_billion = row['trade_value'] / 100_000_000  # 원 → 억원
    
    if trade_value_billion <= 1:
        return 0  # 1억 미만은 점수 0 처리 (음수 방지)
    
    return intensity * math.log10(trade_value_billion)
```

### 1.4 Type별 가중치 (선택 적용)
화면 컨텍스트에 따라 Type별 가중치를 곱할 수 있다. 기본값은 1.0.

```python
TYPE_WEIGHT = {
    'A': 1.5,   # 위험 경고는 우선 노출
    'B': 1.2,   # 강한 양방 신호
    'C': 1.0,   # 충돌
    'D': 1.0,   # 충돌
}

def calc_weighted_priority(row):
    base = calc_priority_score(row)
    if base is None:
        return None
    return base * TYPE_WEIGHT.get(row['type'], 1.0)
```

> **사용 위치**: War Room "오늘의 주목 종목" Top N 추출 시 가중치 적용. Screener는 가중치 없이 raw priority_score로 정렬.

### 1.5 출력 컬럼
- `priority_score` (float | null): raw 점수
- `weighted_priority` (float | null): Type 가중치 적용 점수

---

## 2. War Room — 시그널 요약 카드 텍스트

### 2.1 컴포넌트 구조
War Room "오늘의 시그널 요약" 영역의 4개 카드(Type A~D) 각각에 다음 텍스트가 표시된다.

```
[Type 배지]  [라벨]
[종목 수]
[부가 설명 한 줄]
```

### 2.2 카드 텍스트 템플릿

| Type | 라벨 | 부가 설명 템플릿 |
|---|---|---|
| A | 쌍끌이 설거지 | "기관·외인 동시 매도 + 평단가 붕괴" |
| B | 쌍끌이 매수 | "기관·외인 동시 강세 매수" |
| C | 개미털기 | "외인 매수 vs 기관 매도 충돌" |
| D | 기관 방어 | "기관 매수 vs 외인 매도 충돌" |

### 2.3 종목 수 0개일 때
해당 Type 종목이 0개인 경우 카드는 회색 처리하고 부가 설명을 다음으로 교체한다.

```
"오늘은 해당 신호 발생 종목이 없습니다."
```

---

## 3. Deep Dive — AI 수급 전술 진단 텍스트

### 3.1 구조
"헤드라인 + 설명 2행" 2단 구조로 자동 조립된다.

```
[헤드라인]  ← Type 기반 한 문장 결론
[설명 1행]  ← 수급 데이터 해석
[설명 2행]  ← 평단가·거래대금 맥락
```

### 3.2 헤드라인 템플릿 (Type별)

| Type | 헤드라인 템플릿 |
|---|---|
| A | "🔴 큰손 동반 매도 — 평단가 방어선이 무너졌습니다." |
| B | "🟢 기관·외인 쌍끌이 매수 — 가장 신뢰도 높은 매수 신호입니다." |
| C | "🟡 외인은 사고 기관은 팝니다 — 수급 해석이 갈리는 구간입니다." |
| D | "🔵 기관 단독 방어 매수 — 외인 매도 압력에도 기관이 받치고 있습니다." |
| `null` | "⚪ 뚜렷한 수급 신호가 관찰되지 않습니다." |

### 3.3 설명 1행 템플릿 (수급 해석)

`{sfi_inst}`, `{sfi_frgn}`은 소수점 첫째 자리로 표시 (예: `+5.2%`, `-3.8%`).

```
"오늘 기관 SFI {sfi_inst}, 외인 SFI {sfi_frgn}으로 
{quadrant_label} 사분면에 위치합니다."
```

`quadrant_label` 매핑:
- `BOTH_BUY` → "쌍끌이 매수(Q1)"
- `INST_DEFENSE` → "기관 방어(Q2)"
- `BOTH_SELL` → "쌍끌이 매도(Q3)"
- `FRGN_LEAD` → "외인 주도(Q4)"

### 3.4 설명 2행 템플릿 (평단가·거래대금 맥락)

`defense_status`에 따라 분기.

| `defense_status` | 템플릿 |
|---|---|
| `SAFE` | "현재가 {close}원이 큰손 평단가 위에 위치해 안전 구역입니다." |
| `FRGN_LINE_TOUCH` | "현재가 {close}원이 외인 평단가({avg_cost_20d_frgn}원)에 도달, 추가 매수 가능성을 주시할 구간입니다." |
| `INST_LINE_TOUCH` | "현재가 {close}원이 기관 평단가({avg_cost_20d_inst}원) 부근에서 마지막 지지선 테스트 중입니다." |
| `BREAKDOWN` | "현재가 {close}원이 기관 평단가({avg_cost_20d_inst}원) 대비 -5% 이상 이탈, 손절 물량 출회 위험 구간입니다." |
| `INSUFFICIENT_DATA` | "평단가 산출에 필요한 누적 매수 데이터가 부족합니다." |

### 3.5 조립 예시

**예시 1**: 삼성전자, Type B, BOTH_BUY, SAFE
```
🟢 기관·외인 쌍끌이 매수 — 가장 신뢰도 높은 매수 신호입니다.
오늘 기관 SFI +5.5%, 외인 SFI +9.1%로 쌍끌이 매수(Q1) 사분면에 위치합니다.
현재가 82,000원이 큰손 평단가 위에 위치해 안전 구역입니다.
```

**예시 2**: 에코프로, Type A, BOTH_SELL, BREAKDOWN
```
🔴 큰손 동반 매도 — 평단가 방어선이 무너졌습니다.
오늘 기관 SFI -6.2%, 외인 SFI -8.1%로 쌍끌이 매도(Q3) 사분면에 위치합니다.
현재가 105,000원이 기관 평단가(122,000원) 대비 -5% 이상 이탈, 손절 물량 출회 위험 구간입니다.
```

---

## 4. Archive — 패턴 통계 요약 텍스트

### 4.1 구조
Archive 화면 Type 탭 상단에 표시되는 한 줄 요약. 통계 카드 3개(발생 횟수·5일 수익률·20일 수익률) 위에 자연어로 컨텍스트 제공.

### 4.2 템플릿

```
"과거 3년간 Type {type} 신호는 총 {count}회 발생했으며, 
5일 후 평균 수익률은 {ret_5d}({wr_5d}), 
20일 후 평균 수익률은 {ret_20d}({wr_20d})입니다."
```

변수:
- `{type}`: A | B | C | D
- `{count}`: 천 단위 콤마 표시 (예: `1,428회`)
- `{ret_5d}`, `{ret_20d}`: 부호 포함 소수점 첫째 자리 (예: `+3.4%`, `-1.2%`)
- `{wr_5d}`, `{wr_20d}`: 승률 소수점 없음 (예: `82%`, `71%`)

### 4.3 수익률 톤 분기 (시각적 강조용)

| 5일 평균 수익률 조건 | 색상 클래스 |
|---|---|
| `ret_5d > +2.0%` | 강한 양수 (강조 컬러) |
| `0 < ret_5d ≤ +2.0%` | 약한 양수 |
| `-2.0% ≤ ret_5d ≤ 0%` | 약한 음수 |
| `ret_5d < -2.0%` | 강한 음수 |

> 색상 토큰은 DESIGN.md의 sentiment 컬러 팔레트를 참조한다.

### 4.4 면책 고지 자동 부착
Archive 모든 화면 하단에 §5의 면책 고지가 자동으로 따라붙는다. 단독으로 표시되지 않도록 패턴 통계 컴포넌트와 묶어 렌더링.

### 4.5 데이터 부족 시 처리
과거 3년간 발생 횟수가 30회 미만인 경우 통계 신뢰도가 낮으므로 다음 문구로 대체:

```
"과거 3년간 Type {type} 신호는 {count}회로 표본이 적어 
통계 해석에 주의가 필요합니다."
```

---

## 5. 면책 고지 자동 부착 규칙

### 5.1 기본 면책 문구
다음 문구를 표준으로 사용한다.

```
"과거 수급 패턴 및 통계 자료는 투자 참고용 역사적 맥락 데이터일 뿐, 
미래 주가 상승을 보장하지 않습니다. 모든 투자 결정의 책임은 투자자 본인에게 있습니다."
```

### 5.2 자동 부착 대상 컴포넌트
다음 컴포넌트에는 면책 고지가 **반드시** 함께 렌더링되어야 한다.

| 화면 | 컴포넌트 | 부착 위치 |
|---|---|---|
| Deep Dive | AI 수급 전술 진단 | 카드 하단 |
| Deep Dive | 과거 패턴 유사도 Top 3 | 컴포넌트 하단 |
| Deep Dive | 주요 이동평균선 맥점 | 컴포넌트 하단 |
| Archive | 통계 카드 + 사례 테이블 | 페이지 하단 |
| War Room | 오늘의 주목 종목 | 영역 하단 (소형 텍스트) |

### 5.3 부착 누락 검증
시각화 단계에서 다음을 검증한다.
- 위 §5.2 표의 컴포넌트가 면책 고지 없이 렌더링되면 빌드 에러 처리.
- 면책 고지는 본문 글자 크기의 75% 이하, 회색 톤(#888 이하)으로 표시.

---

## 6. 상수 정의 (튜닝 가능 항목)

```python
# scoring-signals.md 기준 상수

# §1 우선순위 점수
TRADE_VALUE_NORMALIZER = 100_000_000   # 1억 원 (log 정규화 기준)
TYPE_WEIGHT = {
    'A': 1.5,
    'B': 1.2,
    'C': 1.0,
    'D': 1.0,
}

# §4 Archive 데이터 부족 임계값
MIN_PATTERN_COUNT = 30                 # 표본 30회 미만 시 신뢰도 경고

# §4.3 수익률 톤 분기
RETURN_STRONG_THRESHOLD = 2.0          # ±2.0% 기준 강/약 분기

# §5.3 면책 고지 시각 규칙
DISCLAIMER_FONT_SCALE = 0.75
DISCLAIMER_COLOR_MAX = '#888888'
```

---

## 7. 출력 필드 종합

이 파일이 산출하는 최종 결과물은 두 종류다.

### 7.1 DB 영속화 컬럼 (`market_indicators`)
[data-schema.md §3.2](data-schema.md)에 영속 저장한다.

| 컬럼 | 타입 | 단위/형식 | 사용 화면 |
|---|---|---|---|
| `priority_score` | float | 점수 | Screener 정렬 |
| `weighted_priority` | float | 점수 | War Room Top N |

### 7.2 API 응답 필드 (DB 영속화 X)
다음 텍스트 필드는 **DB에 컬럼으로 두지 않는다.** 다른 컬럼들로부터 §2~§4 템플릿으로 결정론적 재생성이 가능하므로, [data-pipeline.md §6](data-pipeline.md) Redis 캐시(`cache:indicators:{date}`)에 묶어 저장하고 API 응답 시점에만 클라이언트로 전달한다.

| 필드 | 타입 | 단위/형식 | 사용 화면 |
|---|---|---|---|
| `signal_card_text` | string | 한 줄 | War Room 시그널 카드 |
| `deep_dive_headline` | string | 한 문장 | Deep Dive AI 진단 헤드라인 |
| `deep_dive_line1` | string | 한 문장 | Deep Dive 설명 1행 |
| `deep_dive_line2` | string | 한 문장 | Deep Dive 설명 2행 |
| `archive_summary` | string | 한 문장 | Archive 패턴 요약 |
| `disclaimer_required` | bool | true/false | 면책 고지 부착 트리거 |

> 시각화 단계(dashboard-layout.md)는 §7.1·§7.2 모두를 ticker별 단일 객체로 받아 그대로 화면에 매핑한다.

---

## 8. 검증 체크리스트

LLM이 이 파일에 따라 구현한 후, 다음 자체 검증을 수행한다.

- [ ] `priority_score`가 음수 또는 NaN인 종목이 War Room에 노출되지 않았는가?
- [ ] Type별 가중치 적용 여부가 화면별로 정확히 분기되었는가? (War Room: weighted, Screener: raw)
- [ ] Deep Dive 진단 텍스트의 변수 치환이 모두 완료되어 `{변수}` 잔여가 없는가?
- [ ] Archive 통계 표시 시 발생 횟수 30회 미만 분기가 정확히 적용되었는가?
- [ ] §5.2 표에 명시된 모든 컴포넌트에 면책 고지가 부착되었는가?
- [ ] 모든 텍스트가 LLM 호출 없이 규칙 기반 템플릿만으로 생성되었는가?
