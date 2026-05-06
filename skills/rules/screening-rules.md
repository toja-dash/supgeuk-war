---
name: screening-rules
description: 수급전쟁 Type A~D 분류 임계값 및 우선순위 규칙. 종목별 수급 패턴을 4가지 Type으로 분류하고 주목 종목 선정 기준을 정의한다.
type: analysis-rule
depends-on: ./supply-analysis.md (입력 지표), ./data-schema.md (출력 테이블)
---

# Screening Rules

본 문서는 `derived.daily_metrics`로부터 `aggregated.signal_classification.signal_type`을 산출하는 분류 규칙을 정의한다.

분류는 **임계값 기반**이며 LLM 판단을 요구하지 않는다.

---

## 1. Type A~D 정의

| Type | 명칭 | 의미 | DESIGN.md 토큰 |
|---|---|---|---|
| A | 쌍끌이 설거지 | 외인·기관 동반 매도, 개인이 받음 → 위험 경고 | `signal.typeA` |
| B | 개미 털기 | 외인·기관 동반 매수, 개인은 매도 → 기회 포착 | `signal.typeB` |
| C | 외인 주도 | 외인이 강하게 매수 주도 | `signal.typeC` |
| D | 기관 방어 | 기관이 매수 / 외인은 매도 | `signal.typeD` |

---

## 2. 분류 임계값

### 2.1 Type A — 쌍끌이 설거지

```
foreign_sfi ≤ -2.0
AND inst_sfi ≤ -2.0
AND indiv_dominance ≥ +50
AND quadrant = 3
AND defense_state IN (caution_orange, danger)
```

**해석**: 외인·기관이 동반 매도하면서 개인이 절반 이상의 매수 비중을 흡수.
평단선 하회 상태 → 큰손이 개인에게 떠넘기는 패턴.

### 2.2 Type B — 개미 털기

```
foreign_sfi ≥ +2.0
AND inst_sfi ≥ +2.0
AND indiv_dominance ≤ -40
AND quadrant = 1
```

**해석**: 외인·기관이 동반 매수, 개인은 매도. 큰손 누적 매집 패턴.

### 2.3 Type C — 외인 주도

```
foreign_sfi ≥ +3.0
AND |foreign_dominance| ≥ 50
AND foreign_dominance > inst_dominance
AND NOT (Type A 조건 충족)
AND NOT (Type B 조건 충족)
```

**해석**: 외인이 절반 이상의 영향력으로 매수 주도.

### 2.4 Type D — 기관 방어

```
inst_sfi ≥ +2.0
AND foreign_sfi ≤ -1.0
AND quadrant = 2
AND NOT (Type A 조건 충족)
AND NOT (Type B 조건 충족)
```

**해석**: 외인 매도를 기관이 방어 매수.

### 2.5 어느 Type도 아닌 경우

`signal_type = NULL`. Screener에서 "전체 Type" 필터일 때만 노출.

---

## 3. 우선순위

한 종목이 여러 Type 조건을 만족할 수 있으나, 단 하나의 Type으로 라벨링한다.

### 3.1 우선순위 (높음 → 낮음)

```
1순위: Type A   (위험 신호, 즉시 알림 우선)
2순위: Type B   (기회 신호, 매수 후보 우선)
3순위: Type D   (방어적 신호)
4순위: Type C   (단순 외인 우위)
```

조건 검사 순서: A → B → D → C → NULL.
A·B 조건이 NOT-clause로 C·D에 포함되어 있으므로 자연스럽게 우선순위가 보장된다.

### 3.2 priority_score (정렬용)

같은 Type 내 정렬을 위해 `priority_score`를 계산한다.

| Type | score 공식 |
|---|---|
| A | `|foreign_sfi| + |inst_sfi| + |indiv_dominance|/2` |
| B | `foreign_sfi + inst_sfi + |indiv_dominance|/2` |
| C | `foreign_sfi + |foreign_dominance|/2` |
| D | `inst_sfi + |foreign_sfi|` |
| NULL | 0 |

값이 클수록 신호가 강함. 주목 종목 선정 시 사용.

---

## 4. 거래 미미 종목 제외 필터

다음 조건 중 하나라도 해당하면 분류 전 제외 (`signal_type = NULL` 처리):

| 조건 | 사유 |
|---|---|
| `value < 1,000,000,000` (10억원 미만) | 거래미미, 노이즈 신호 |
| `volume < 10,000` | 거래량 미미 |
| `is_active = false` | 거래정지 |
| 상장 후 30일 미만 | 가격 변동성 과도 |
| 이름에 "스팩"·"리츠"·"우" 포함 | 일반 분석 대상 외 |

---

## 5. 주목 종목 선정 (War Room "오늘의 주목 종목")

### 5.1 Type별 상위 3종목

각 Type별로 `priority_score` 내림차순 상위 3종목.

```sql
SELECT * FROM aggregated.signal_classification
WHERE trade_date = :today AND signal_type = :type
ORDER BY priority_score DESC
LIMIT 3
```

### 5.2 동점자 처리

`priority_score` 동점일 때:
1. 거래대금(`value`) 큰 순
2. 그래도 동점이면 종목명 가나다 순

---

## 6. Market Brief 조건 분기

War Room 상단 배너 텍스트 생성 규칙. 실제 텍스트 템플릿은 [scoring-signals.md](./scoring-signals.md) §3.

### 6.1 시장 단위 변수

각 시장(KOSPI, KOSDAQ)에 대해:

```
market_change = kospi_change_pct  (또는 kosdaq)
market_dominant_subject = 시장 내 거래대금 가중 dominant 주체
top_sector = aggregated.sector_flows에서 |sector_inst_sfi_avg + sector_foreign_sfi_avg| 최댓값 섹터
top_sector_direction = top_sector의 SFI 합계 부호 (+ 매수 / - 매도)
top_signal_type = 해당 섹터의 dominant_type
```

### 6.2 분기 조건

| 조건 | 시장 요약 패턴 |
|---|---|
| `market_change > 0` AND `top_sector_direction = +` | "{market}는 {subject}의 {sector} {집중 매수}로 상승 마감" |
| `market_change > 0` AND `top_sector_direction = -` | "{market}는 일부 매도세에도 {subject} 주도로 상승" |
| `market_change < 0` AND `top_signal_type = A` | "{market}는 {sector} 쌍끌이 매도로 하락" |
| `market_change < 0` AND `top_sector_direction = -` | "{market}는 {subject}의 {sector} 매도로 하락" |
| `\|market_change\| < 0.3` | "{market}는 {sector} 중심의 혼조세로 보합 마감" |

### 6.3 합본 텍스트

```
"오늘 코스피는 {kospi_summary}. 코스닥은 {kosdaq_summary}."
```

---

## 7. 분류 SQL 의사코드

```sql
-- Step 1: 거래 미미 필터링 후 베이스 뷰 생성
WITH eligible AS (
  SELECT m.*, p.value, p.volume, p.close, s.is_active, s.name
  FROM derived.daily_metrics m
  JOIN raw.daily_price p USING (trade_date, ticker)
  JOIN raw.stock_master s USING (ticker)
  WHERE m.trade_date = :today
    AND p.value >= 1000000000
    AND p.volume >= 10000
    AND s.is_active = true
    AND s.name NOT LIKE '%스팩%'
    AND s.name NOT LIKE '%리츠%'
    AND s.name NOT LIKE '%우'
)
-- Step 2: Type 분류
SELECT
  trade_date, ticker,
  CASE
    WHEN foreign_sfi <= -2 AND inst_sfi <= -2
         AND indiv_dominance >= 50
         AND quadrant = 3
         AND defense_state IN ('caution_orange','danger')
    THEN 'A'
    WHEN foreign_sfi >= 2 AND inst_sfi >= 2
         AND indiv_dominance <= -40
         AND quadrant = 1
    THEN 'B'
    WHEN inst_sfi >= 2 AND foreign_sfi <= -1
         AND quadrant = 2
    THEN 'D'
    WHEN foreign_sfi >= 3
         AND ABS(foreign_dominance) >= 50
         AND foreign_dominance > inst_dominance
    THEN 'C'
    ELSE NULL
  END AS signal_type
FROM eligible;
```

---

## 8. 분류 검증 테스트

| 검증 | 기대 |
|---|---|
| Type A 종목은 모두 `quadrant = 3` | ✓ |
| Type B 종목은 모두 `quadrant = 1` | ✓ |
| Type D 종목은 모두 `quadrant = 2` | ✓ |
| Type C 종목은 절반 이상 `quadrant = 4` 또는 `quadrant = 1` | ✓ |
| 한 종목당 Type은 정확히 1개 (NULL 포함) | ✓ |
| Type A `priority_score` 평균 > Type C 평균 | ✓ |

---

## 9. 임계값 튜닝 가이드

위 임계값(SFI ±2.0, dominance ±50/-40 등)은 **정상 변동성 시장 기준** 초기값이다.

### 9.1 백테스트 후 조정 권장 항목

- Type B의 `indiv_dominance ≤ -40` → 시장에 따라 -30 ~ -50 사이 조정
- Type C의 `foreign_sfi ≥ +3.0` → 외인 거래 비중이 낮은 코스닥에서는 +2.0으로 완화 가능
- 거래대금 하한 10억원 → 코스닥에서는 5억원으로 완화 가능

### 9.2 튜닝 시 동결 조건

다음 항목은 백테스트 결과와 무관하게 **동결**한다:

- 4분면 매핑 (quadrant 1~4 정의)
- 우선순위 (A > B > D > C)
- defense_state 4단계 정의
- 데이터 소스 단위 (원, 주)

---

## 10. 구현 체크리스트

- [ ] Type A~D 4개 분류가 모두 출현 (특정 거래일 기준)
- [ ] 한 종목당 Type 1개 또는 NULL
- [ ] 우선순위 A > B > D > C가 NOT-clause로 자연 보장됨
- [ ] 거래 미미 종목은 NULL 처리
- [ ] priority_score로 정렬 가능
- [ ] War Room 주목 종목 = Type별 상위 3종목 ×4 = 12개 노출 가능
