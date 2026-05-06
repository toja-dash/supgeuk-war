---
name: scoring-signals
description: 수급전쟁 인사이트 텍스트 자동 생성 규칙. Market Brief · AI 수급 전술 진단 · 이동평균선 맥점 해석 · 패턴 유사도 코멘트의 템플릿과 우선순위 체계를 정의한다.
type: analysis-rule
depends-on: ./screening-rules.md (Type 정의), ./supply-analysis.md (지표 정의)
---

# Scoring & Signal Output Rules

본 문서는 4개 화면에 노출되는 모든 자동 생성 텍스트의 규칙을 정의한다.
규칙은 **결정론적 템플릿**이며, LLM 자유 생성을 사용하지 않는다.

---

## 1. 텍스트 출력 우선순위

화면당 동시에 노출 가능한 자동 생성 텍스트는 다음 우선순위를 따른다.

| 화면 | 노출 텍스트 | 출처 §  |
|---|---|---|
| War Room | Market Brief (1문장) | §3 |
| War Room | 시그널 요약 라벨 4종 (Type별) | §6 |
| Deep Dive | AI 수급 전술 진단 (1~2문장) | §2 |
| Deep Dive | 이동평균선 맥점 해석 | §4 |
| Deep Dive | 과거 패턴 유사도 코멘트 | §5 |
| Archive | 면책 고지 (고정) | §7 |
| Screener | 빈 상태 안내 | §8 |

---

## 2. AI 수급 전술 진단 (Deep Dive)

### 2.1 입력

| 변수 | 출처 |
|---|---|
| `signal_type` | screening-rules.md |
| `defense_state` | supply-analysis.md §4 |
| `inst_sfi`, `foreign_sfi`, `indiv_dominance` | supply-analysis.md §1·§2 |
| `inst_avg_price`, `foreign_avg_price`, `close` | supply-analysis.md §3 |
| `name` (종목명) | raw.stock_master |

### 2.2 템플릿 (Type별)

#### Type A (쌍끌이 설거지)

```
"{name}은(는) 외국인·기관 동반 매도(외인 SFI {foreign_sfi:+.1f}, 기관 SFI {inst_sfi:+.1f}) 속에
개인 매수 비중이 {indiv_dominance:+.0f}%로 떠넘기기 패턴입니다.
평단선 {distance_pct:.1f}% 하회 — 추격 매수 자제를 권장합니다."
```

#### Type B (개미 털기)

```
"{name}은(는) 외국인·기관 동반 매수(외인 SFI {foreign_sfi:+.1f}, 기관 SFI {inst_sfi:+.1f}) 속에
개인은 매도 중인 누적 매집 패턴입니다.
{defense_label} 구간으로 평단선 대비 {distance_pct:+.1f}%."
```

#### Type C (외인 주도)

```
"{name}은(는) 외국인이 {foreign_dominance:+.0f}%의 영향력으로 매수 주도(SFI {foreign_sfi:+.1f}) 중입니다.
기관 동조 여부({inst_sfi:+.1f})를 함께 모니터링이 필요합니다."
```

#### Type D (기관 방어)

```
"{name}은(는) 외국인 매도(SFI {foreign_sfi:+.1f})를 기관이 방어 매수(SFI {inst_sfi:+.1f}) 중입니다.
기관 평단선({inst_avg_price:,}원) 지지 여부가 단기 변곡점입니다."
```

#### NULL (Type 미부여)

```
"{name}은(는) 오늘 뚜렷한 수급 패턴이 감지되지 않았습니다.
외인 SFI {foreign_sfi:+.1f} / 기관 SFI {inst_sfi:+.1f}로 중립권."
```

### 2.3 변수 가공 규칙

| 변수 | 가공 |
|---|---|
| `distance_pct` | `(close - min(inst_avg, foreign_avg)) / min × 100`, 양수면 평단 위 |
| `defense_label` | safe→"안전", caution_yellow→"외인 평단 도달", caution_orange→"기관 평단 도달", danger→"방어선 붕괴" |
| 수치 부호 | `+.1f` 형식 (양수 +기호 명시) |
| 큰 가격 | `{:,}` 형식 (천 단위 콤마) |

### 2.4 안전 가드

- 평단선이 NULL이면 "평단선" 언급 부분을 "(평단 미산출)"로 대체
- 모든 변수가 NULL이면 NULL 템플릿 사용
- 템플릿이 2문장을 초과하면 첫 2문장만 노출

---

## 3. Market Brief (War Room 상단 배너)

### 3.1 입력

| 변수 | 출처 |
|---|---|
| `kospi_change_pct`, `kosdaq_change_pct` | raw.daily_market_meta |
| `top_sector` (시장별) | aggregated.sector_flows에서 가중치 최대 |
| `top_sector_subject` | 해당 섹터의 dominant_subject |
| `top_sector_direction` | + (매수) / - (매도) |
| `top_signal_type` | 해당 섹터의 dominant_type |

### 3.2 시장 단위 1문장 템플릿

[screening-rules.md](./screening-rules.md) §6.2의 분기 조건에 따라 1문장 생성.

| 조건 | 패턴 |
|---|---|
| 상승 + 매수 | `"{market}는 {subject}의 {sector} 집중 매수로 상승 마감"` |
| 상승 + 매도 | `"{market}는 일부 매도세에도 {subject} 주도로 상승"` |
| 하락 + Type A | `"{market}는 {sector} 쌍끌이 매도로 하락"` |
| 하락 + 매도 | `"{market}는 {subject}의 {sector} 매도로 하락"` |
| 보합 | `"{market}는 {sector} 중심의 혼조세로 보합 마감"` |

### 3.3 합본 (UI 노출 텍스트)

```
"오늘 코스피는 {kospi_summary}했으나, 코스닥은 {kosdaq_summary}했습니다."
```

두 시장이 같은 방향이면 "했으나" → "했고"로 치환.

### 3.4 강조 표시 규칙

dashboard-layout.md §2.2에 따라 본문 내 다음 부분만 굵은 표시:

- `{subject}` (외국인/기관/개인)
- `{sector}` (반도체/2차전지 등)
- 동작 표현 (집중 매수, 쌍끌이 매도 등)

마크다운 `**...**` 으로 감싸 저장. FE에서 `<strong>` 렌더.

### 3.5 예시 출력

```
"오늘 코스피는 **외국인**의 **반도체** **집중 매수**로 상승 마감했으나,
코스닥은 **2차전지** **쌍끌이 매도**로 하락했습니다."
```

---

## 4. 이동평균선 맥점 해석 (Deep Dive)

### 4.1 감지 이벤트

| 이벤트 | 조건 |
|---|---|
| 5·20일 골든크로스 | `MA5[t-1] ≤ MA20[t-1]` AND `MA5[t] > MA20[t]` |
| 5·20일 데드크로스 | `MA5[t-1] ≥ MA20[t-1]` AND `MA5[t] < MA20[t]` |
| 20·60일 골든크로스 | 동일 패턴, MA20·MA60 |
| 20·60일 데드크로스 | 동일 |
| 60·120일 골든크로스 | 동일 |
| 60·120일 데드크로스 | 동일 |

### 4.2 텍스트 템플릿

| 이벤트 | 텍스트 |
|---|---|
| 단기 골든크로스 (5·20) | "단기 추세선 상향 돌파, 단기 매수 우위 신호" |
| 단기 데드크로스 (5·20) | "단기 추세선 하향 이탈, 단기 매도 압력" |
| 중기 골든크로스 (20·60) | "중기 추세 전환 가능성, 추세 매매 후보 진입" |
| 중기 데드크로스 (20·60) | "중기 추세 약화, 보유 종목 점검 권장" |
| 장기 골든크로스 (60·120) | "장기 상승 추세 진입, 큰 흐름 우호적" |
| 장기 데드크로스 (60·120) | "장기 상승 추세 종료, 추세 추종 매매 자제" |

### 4.3 노출 규칙

- 최근 30거래일 이내 발생 이벤트만 표시
- 최대 5건, 시간 역순 정렬
- 이벤트 좌측 배지: 골든 → `signal.typeB`, 데드 → `signal.typeA`

---

## 5. 과거 패턴 유사도 코멘트 (Deep Dive)

### 5.1 입력

[supply-analysis.md](./supply-analysis.md) §7의 Top 3 결과:

| 변수 | 의미 |
|---|---|
| `window_end` | 과거 패턴 발생 종료일 |
| `similarity_pct` | 코사인 유사도 × 100 |
| `return_5d`, `return_20d` | 이후 5일·20일 수익률 |

### 5.2 카드 텍스트

```
{window_end}     유사도 {similarity_pct:.1f}%
└─ 5일 후 {return_5d:+.1f}%
└─ 20일 후 {return_20d:+.1f}%
```

부호별 색: `num.up` / `num.down`.

### 5.3 카드 하단 면책 고지

각 패턴 카드 하단에 고정 1줄:

```
"※ 과거 통계는 미래 수익을 보장하지 않습니다."
```

---

## 6. 시그널 요약 카드 라벨 (War Room Row 3)

| Type | 라벨 |
|---|---|
| A | "쌍끌이 설거지" |
| B | "개미 털기" |
| C | "외인 주도장" |
| D | "기관 방어장" |

뒤에 종목 수를 붙여 표시: `"쌍끌이 설거지 — 12 종목"`.

---

## 7. 면책 고지 (Archive 하단)

### 7.1 고정 문구 (Archive)

```
"⚠ 면책 고지: 과거 수급 패턴 및 통계 자료는 투자 참고용 역사적 맥락
데이터일 뿐, 미래 주가 상승을 보장하지 않습니다.
실제 투자에서는 외부 환경 등 다양한 요인이 작용하므로 참고 자료로만
활용하시기 바랍니다. 본 서비스는 투자 자문이 아닙니다."
```

### 7.2 노출 규칙

- Archive 페이지 하단 고정
- Deep Dive 패턴 유사도 카드 하단 1줄 축약 버전 (§5.3)
- 모든 페이지 푸터에 짧은 버전: `"본 서비스는 투자 참고용입니다."`

---

## 8. 빈 상태 메시지

데이터 0건 시 컴포넌트 내부 안내.

| 상황 | 메시지 |
|---|---|
| Type A 종목 0개 | "오늘 Type A 조건을 만족하는 종목이 없습니다." |
| Screener 결과 0개 | "조건을 만족하는 종목이 없습니다. 필터를 완화해 보세요." |
| Deep Dive 평단선 NULL | "평단선 산출 가능 데이터(누적 매수 5거래일 이상)가 부족합니다." |
| 패턴 유사도 결과 0개 | "유사 과거 패턴이 충분히 누적되지 않았습니다." |

---

## 9. 텍스트 저장 위치

| 텍스트 | 저장 컬럼 |
|---|---|
| Market Brief | `aggregated.market_brief.combined_brief` |
| AI 수급 전술 진단 | `aggregated.signal_classification.insight_text` |
| 이동평균선 맥점 | 실시간 계산 (저장 안 함) |
| 패턴 유사도 카드 | 쿼리 시 동적 생성 |
| 면책 고지 | FE 상수 |

---

## 10. 생성 순서

```
[18:00 데이터 확정]
   1. screening-rules.md → signal_type 결정
   2. scoring-signals.md §2  → insight_text 생성
   3. scoring-signals.md §3  → market_brief 생성
   4. scoring-signals.md §6  → signal_counts 집계
[FE 요청 시점]
   5. §4·§5 → 동적 생성 (DB 미저장)
```

---

## 11. 텍스트 검증 규칙

| 검증 | 기대 |
|---|---|
| insight_text 길이 ≤ 200자 | ✓ |
| Market Brief 합본 길이 ≤ 150자 | ✓ |
| 모든 수치 부호가 명시됨 (`+`/`-`) | ✓ |
| 강조 마크다운 `**...**`은 짝수 개 | ✓ |
| NULL 변수가 본문에 그대로 노출되지 않음 | ✓ |
| Type별 템플릿이 정확히 1개 적용됨 | ✓ |

---

## 12. 다국어 확장 메모

본 문서는 한국어 기준이다. 영어 확장 시:

- 템플릿 키만 분리 (예: `template.typeA.ko`, `template.typeA.en`)
- 변수 가공 규칙은 동일 (부호·콤마)
- 강조 표시 규칙 동일

다국어는 1차 구현 범위 외.

---

## 13. 구현 체크리스트

- [ ] War Room Market Brief 1문장이 자동 생성된다
- [ ] Deep Dive AI 진단 1~2문장이 Type별로 분기된다
- [ ] 평단선 NULL 종목도 안내 텍스트가 깨지지 않는다
- [ ] 이동평균선 맥점 6종이 모두 감지된다
- [ ] 패턴 유사도 카드 3개가 수익률 통계와 함께 노출된다
- [ ] 면책 고지가 Archive 하단에 항상 표시된다
- [ ] 빈 상태 메시지 4종이 적절히 표시된다
