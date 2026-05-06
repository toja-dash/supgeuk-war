---
name: dashboard-layout
description: 수급전쟁 대시보드 페이지 구조 및 차트 선택 규칙. War Room·Screener·Deep Dive·Archive 4개 페이지의 그리드, 컴포넌트 배치, 드릴다운, 차트 매핑을 정의한다.
type: visualization-rule
depends-on: ./DESIGN.md (토큰 참조), ../rules/screening-rules.md (Type 정의), ../rules/supply-analysis.md (지표 정의)
---

# Dashboard Layout Rules

본 문서는 페이지 **구조와 규칙**만 기술한다.
색·폰트·간격은 [DESIGN.md](./DESIGN.md) 토큰명으로 참조하며 hex/px를 본문에 쓰지 않는다.

---

## 0. 공통 셸 (Global Shell)

모든 페이지는 동일한 헤더와 그리드를 공유한다.

### 0.1 Header (높이 64px, position: sticky, top: 0)

좌측에서 우측으로:

| 영역 | 내용 |
|---|---|
| 1. 로고 | "SUPGEUK WAR" — `text.lg` / `weight.bold` / `text.primary` |
| 2. 페이지 탭 | War Room / Screener / Deep Dive / Archive — Tab 컴포넌트 |
| 3. (spacer, flex-grow) | — |
| 4. 마감 상태 배지 | `pending`(15:30 잠정) / `confirmed`(18:00 확정) / `live`(장중) |
| 5. KOSPI | "KOSPI 2,654.21" + 등락률 (`num.up`/`num.down`) |
| 6. KOSDAQ | "KOSDAQ 842.11" + 등락률 |
| 7. 환율 | "환율 1,350.20" |

수치는 모두 `font.numeric`. 1·5·6·7은 항상 표시, 4는 시점 자동 변경.

### 0.2 Page Container

- max-width: `grid.max-width`
- padding-x: `grid.page-padding-x`
- padding-y: `space.6`
- background: `bg.canvas`

### 0.3 Grid

- 12-column, gutter `grid.gutter`
- 1440px 미만 시에도 컬럼 비율 유지 (반응형은 화면 ≥1280px만 1차 지원)

---

## 1. 차트 타입 선택 규칙

지표 유형이 결정되면 아래 표만 보고 차트를 고른다. **모호한 판단 금지.**

| 지표 유형 | 차트 타입 | 근거 | 사용 페이지 |
|---|---|---|---|
| 섹터 2차원 분포 (X·Y 2축 + 크기 + 색) | Bubble | 4개 채널 동시 인코딩 | War Room |
| 주체별 순매수 강도 비교 (양·음 동시) | Diverging Bar (수평) | 0축 기준 좌우 발산 | War Room |
| 주체별 일별 순매수 (≤30일) | Grouped Bar | 3주체 직접 비교 | Deep Dive |
| OHLCV + 평단가 라인 | Candlestick + horizontal dashed line | 가격대 비교 | Deep Dive |
| 단일 KPI 수치 (승률·수익률·횟수) | Stat Card | 강조 1개 값 | Archive |
| 시간 흐름 + 누적값 | Stacked Area | 누적 추이 | (확장) |
| Type별 종목 수 분포 | Card 4개 (가로 정렬) | 카테고리 4개 = 카드 = 직관 | War Room |
| 종목 리스트 (다중 컬럼 정렬·필터) | Table | 행=종목, 열=지표 | Screener·Archive |

### 1.1 절대 사용하지 않는 차트

- **Pie / Donut**: 비율 비교 부정확. Diverging Bar 또는 Stat Card로 대체.
- **3D 차트**: 시각적 왜곡.
- **Radar (오각형 등)**: 정량 비교 불리.

---

## 2. 페이지 1: War Room

> 시장 전체 수급 흐름을 한 화면에 조망. 진입 시 기본 페이지.

### 2.1 그리드 구조 (12열 × 3행)

```
┌──────────────────────────────────────────────────────────┐
│ Row 1: Market Brief Banner             (col-span: 12)    │  높이 72px
├──────────────────────────────────────────────────────────┤
│ Row 2:                                                   │
│ [3파전 주도력 ][   전술 레이더 맵    ][ 오늘의 주목 종목 ]│  높이 480px
│  col-span: 3        col-span: 6           col-span: 3    │
├──────────────────────────────────────────────────────────┤
│ Row 3: 오늘의 시그널 요약 — Type A·B·C·D 카드 4개         │  높이 120px
│         col-span: 12 (내부 4분할)                         │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Row 1 — Market Brief Banner

- Card 배경 `bg.surface`, 좌측 4px solid border `signal.typeC` (시장 주도 색은 동적)
- 좌측: 라벨 "Market Brief" — `text.xs` / `text.secondary` / uppercase
- 본문: 1문장 자동 요약 — `text.base` / `text.primary`
  - 예: "오늘 코스피는 **외국인의 반도체 집중 매수**로 상승 마감했으나, 코스닥은 **2차전지 쌍끌이 매도**로 하락했습니다."
  - **굵은 표시** 부분은 [scoring-signals.md](../rules/scoring-signals.md)의 핵심 키워드 강조 규칙을 따른다.
- 우측: "AI 시장 브리핑" 버튼 — 클릭 시 모달로 상세 해설.

### 2.3 Row 2-Left — 시장 3파전 주도력 (Diverging Bar)

- Card 타이틀: "📊 시장 3파전 주도력"
- 차트: Diverging Bar 2세트 (코스피 / 코스닥)
  - Y축: 시장 라벨 ("코스피", "코스닥")
  - X축: 순매수 강도 (-100 ~ +100, 정규화)
  - 각 시장 내부에 3개 바: 개인 / 기관 / 외국인
  - 바 색: `subject.개인` / `subject.기관` / `subject.외국인`
- 범례: 카드 하단, 3개 색 dot + 라벨

### 2.4 Row 2-Center — 전술 레이더 맵 (Bubble)

- Card 타이틀: "🎯 전술 레이더 맵"
- 차트: Bubble Scatter
  - X축: 외국인 SFI (-10 ~ +10)
  - Y축: 기관 SFI (-10 ~ +10)
  - 0축 십자선 표시 (4분면 분할)
  - 각 버블 = 1개 섹터 (예: 반도체, 2차전지, 자동차…)
  - 크기 = 당일 거래대금 (`chart.6.3` 규칙)
  - 색 = 수급 주도력 → `signal.typeA~D`
- 4분면 라벨 (각 모서리, `text.muted` / `text.xs`):
  - 1사분면 (우상): "쌍끌이 매수 — 상승 국면"
  - 2사분면 (좌상): "기관 방어 — 팽팽한 방어전"
  - 3사분면 (좌하): "쌍끌이 매도 — 하락 국면"
  - 4사분면 (우하): "외인 주도 — 추세 전환 기대"
- 인터랙션: 버블 hover → 툴팁(섹터명 + SFI 수치 + Type), 클릭 → Screener로 이동(해당 섹터 자동 필터)

### 2.5 Row 2-Right — 오늘의 주목 종목

- Card 타이틀: "👁 오늘의 주목 종목"
- 내부 구조: Type별 그룹 (수직 스택)
  - Type A (위험 경고) — 상위 3종목
  - Type B (기회 포착) — 상위 3종목
  - Type C (외인 주도) — 상위 3종목
  - Type D (기관 방어) — 상위 3종목
- 각 종목 행:
  - 좌측: Type 배지 + 종목명
  - 우측: chevron-right 아이콘
  - 클릭 → Deep Dive (`?ticker={code}`)
- 그룹 헤더: Type 배지 색의 좌측 2px solid border + Type명 라벨

### 2.6 Row 3 — 오늘의 시그널 요약

- 4개 Stat Card 가로 정렬 (col-span: 3 each, gap: `space.6`)

| 카드 | 라벨 | 수치 | 색 |
|---|---|---|---|
| Type A | "쌍끌이 설거지" | "12 종목" | `signal.typeA` |
| Type B | "개미 털기" | "28 종목" | `signal.typeB` |
| Type C | "외인 주도장" | "45 종목" | `signal.typeC` |
| Type D | "기관 방어장" | "31 종목" | `signal.typeD` |

각 카드 좌측 4px border = Type 색. 클릭 시 Screener로 이동(해당 Type 자동 필터).

---

## 3. 페이지 2: Screener

> 4가지 조건을 조합해 종목 발굴.

### 3.1 그리드 구조 (12열 × 2행)

```
┌──────────────────────────────────────────────────────────┐
│ Row 1: 조건 스크리닝 필터 카드        (col-span: 12)      │  높이 144px
├──────────────────────────────────────────────────────────┤
│ Row 2: 종목 테이블                    (col-span: 12)      │  flex-grow
└──────────────────────────────────────────────────────────┘
```

### 3.2 조건 스크리닝 필터 카드

- 타이틀: "🔍 조건 스크리닝 필터"
- 4개 컨트롤 가로 배치 (col-span 각 3) + 우측 끝 "조건 검색" 버튼

| 컨트롤 | 타입 | 옵션 / 범위 |
|---|---|---|
| Type 선택 | Select | 전체 Type / Type A / Type B / Type C / Type D |
| 평단가 상태 | Select | 전체 상태 / 안전 / 주의(노랑) / 주의(주황) / 위험 |
| 기관 SFI 하한선 | Slider | -10 ~ +10, step 0.1, 기본 -10 |
| 외국인 SFI 하한선 | Slider | -10 ~ +10, step 0.1, 기본 -10 |

- 슬라이더 우측에 현재값 표시 (`font.numeric` / `text.sm`)
- "조건 검색" 버튼: `signal.typeC` 배경, `text.inverse` 텍스트, `radius.md`

### 3.3 종목 테이블

| 컬럼 | 정렬 | 표시 |
|---|---|---|
| 종목명 | 좌측 | `text.primary` / `weight.semibold` |
| 현재가 | 우측 | `font.numeric` + 등락률(`num.up`/`num.down`) |
| TYPE | 중앙 | Type 배지 (DESIGN.md 5.1) |
| 기관 SFI | 우측 | `font.numeric`, 양수 `num.up` / 음수 `num.down` |
| 외인 SFI | 우측 | 동일 |
| 개인 주도력 | 우측 | `font.numeric` (% 표기) |
| 기관 주도력 | 우측 | `font.numeric` (% 표기) |
| 외인 주도력 | 우측 | `font.numeric` (% 표기) |
| 상태 | 중앙 | 상태 배지 (DESIGN.md 5.2) |

- 행 클릭 → Deep Dive (`?ticker={code}`)
- 헤더 클릭 → 해당 컬럼 정렬 토글 (asc/desc)
- 페이지네이션: 하단 중앙, 20행 / 페이지

---

## 4. 페이지 3: Deep Dive

> 단일 종목 심층 분석. URL 파라미터 `?ticker={code}` 필수.

### 4.1 그리드 구조

```
┌──────────────────────────────────────────────────────────┐
│ Row 1: 종목 헤더 (현재가·등락률·Type 배지·상태 배지)      │  높이 88px
├──────────────────────────────────────────────────────────┤
│ Row 2: AI 수급 전술 진단 배너                             │  높이 80px
├──────────────────────────────────────────────────────────┤
│ Row 3: 일별 시세 캔들차트 (col-span: 12)                  │  높이 400px
├──────────────────────────────────────────────────────────┤
│ Row 4: [시세 패널 ][   최근 7일 수급 순매수    ]          │  높이 240px
│         col-span: 5      col-span: 7                     │
├──────────────────────────────────────────────────────────┤
│ Row 5: [주요 이동평균선 맥점][ 과거 패턴 유사도 Top 3 ]   │  높이 280px
│         col-span: 6              col-span: 6             │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Row 1 — 종목 헤더

- 좌측: 종목명 (`text.xl` / `weight.bold`) + 현재가 (`text.3xl` / `font.numeric`) + 등락률
- 중앙: Type 배지 + 상태 배지
- 우측: "+ 목록으로" 버튼 → Screener로 복귀

### 4.3 Row 2 — AI 수급 전술 진단

- Banner 카드, 좌측 4px solid border = 현재 종목 Type 색
- 좌측: 라벨 "🤖 AI 수급 전술 진단" — `text.xs` / uppercase
- 본문: 1~2문장 자동 생성 (scoring-signals.md 템플릿 사용)
- 우측: "AI 진단 새로고침" 버튼

### 4.4 Row 3 — 일별 시세 캔들차트

- Card 타이틀: "📈 일별 시세 (캔들차트)"
- 우측 상단 컨트롤: 기간 토글 (1M / 3M / 6M / 1Y), 기본 3M
- 차트: Candlestick (DESIGN.md 6.5)
  - 양봉 `num.up` / 음봉 `num.down`
  - 오버레이 라인 2개:
    - 기관 평단선 — `subject.기관`, dashed
    - 외인 평단선 — `subject.외국인`, dashed
  - 범례: 좌측 상단 (기관 평단 / 외인 평단)
  - 거래량 보조 차트: 하단 1/4 영역, 색은 양봉/음봉 동일 매핑

### 4.5 Row 4-Left — 시세 패널 (col-span: 5)

- Card 타이틀: "💹 시세"
- 우측 상단 토글: 일봉 / 주봉 (기본: 일봉)
- 내부 좌우 2열 (각 col-span: 6):

| 좌측 | 우측 |
|---|---|
| 1일 최저 / 최고가 | 1년 최저 / 최고가 |
| 시작가 / 종가 | 거래량 / 거래대금 |

- 모든 수치 `font.numeric`, 라벨은 `text.secondary`.

### 4.6 Row 4-Right — 최근 7일 수급 순매수 (col-span: 7)

- Card 타이틀: "📊 최근 7일 수급 (순매수)"
- 우측 상단: 3주체 토글 (개인 / 기관 / 외국인 — 다중 선택 ON/OFF)
- 차트: Grouped Bar (DESIGN.md 6.6)
  - X축: 최근 7거래일 (날짜)
  - Y축: 순매수 (단위: 억원)
  - 그룹당 3개 바 (개인 / 기관 / 외국인)
  - 색: `subject.*`

### 4.7 Row 5-Left — 주요 이동평균선 맥점 (col-span: 6)

- Card 타이틀: "🔍 주요 이동평균선 맥점 (5/20/60/120)"
- 내부: 맥점 이벤트 리스트 (최근 5건, 시간 역순)
- 각 행:
  - 좌측: 이벤트 배지 (골든크로스 = `signal.typeB`, 데드크로스 = `signal.typeA`)
  - 중앙: 이벤트명 + 발생일 — "5일·20일선 골든크로스 / 2025.10.12"
  - 우측: 이벤트 해석 1줄 (`text.xs` / `text.secondary`)

### 4.8 Row 5-Right — 과거 패턴 유사도 Top 3 (col-span: 6)

- Card 타이틀: "📚 과거 패턴 유사도 Top 3"
- 3개 행, 각 행:
  - 좌측: 과거 발생 구간 — "2025.11.12 구간"
  - 중앙: 유사도 % (`font.numeric` / `text.lg`)
  - 우측: 5일 후 / 20일 후 수익률 (`num.up`/`num.down`)
- 카드 하단: 면책 고지 1줄 (`text.2xs` / `text.muted`)
  - "※ 과거 통계는 미래 수익을 보장하지 않습니다."

---

## 5. 페이지 4: Archive

> Type별 과거 발생 통계 데이터베이스.

### 5.1 그리드 구조

```
┌──────────────────────────────────────────────────────────┐
│ Row 1: Type 탭 4개   (col-span: 12)                      │  높이 48px
├──────────────────────────────────────────────────────────┤
│ Row 2: 통계 카드 3개  (col-span: 4 each)                 │  높이 144px
├──────────────────────────────────────────────────────────┤
│ Row 3: 과거 주요 발생 사례 테이블 (col-span: 12)         │  flex-grow
├──────────────────────────────────────────────────────────┤
│ Row 4: 면책 고지     (col-span: 12)                      │  높이 64px
└──────────────────────────────────────────────────────────┘
```

### 5.2 Row 1 — Type 탭

- 4개 탭 가로 정렬: Type A (쌍끌이 설거지) / Type B (개미털기) / Type C (외인주도) / Type D (기관방어)
- 활성 탭: 하단 2px border = 해당 Type 색, 텍스트 `text.primary`
- 비활성: `text.secondary`
- 탭 변경 시 Row 2·Row 3 데이터 갱신

### 5.3 Row 2 — 통계 카드 3개

각 Stat Card (DESIGN.md 5.3):

| 카드 | 라벨 | 메인 수치 | 보조 수치 |
|---|---|---|---|
| 1 | "과거 3년 총 발생 횟수" | "1,428 건" | — |
| 2 | "발생 후 5일 평균 수익률 (승률)" | "+3.4%" (`num.up`) | "(62%)" `text.secondary` |
| 3 | "발생 후 20일 평균 수익률 (승률)" | "+8.1%" (`num.up`) | "(71%)" `text.secondary` |

수익률 색은 양수 `num.up` / 음수 `num.down` / 0 `num.flat`.

### 5.4 Row 3 — 과거 주요 발생 사례 테이블

| 컬럼 | 정렬 | 표시 |
|---|---|---|
| 발생일 | 좌측 | `font.numeric` |
| 종목명 | 좌측 | `weight.semibold` |
| 섹터 | 좌측 | `text.secondary` |
| 기관 SFI | 우측 | `font.numeric` |
| 외인 SFI | 우측 | `font.numeric` |
| 5일 후 수익률 | 우측 | `num.up` / `num.down` |
| 20일 후 수익률 | 우측 | `num.up` / `num.down` |

기본 정렬: 발생일 desc. 페이지네이션: 50행 / 페이지.

### 5.5 Row 4 — 면책 고지

- 좌측 ⚠ 아이콘 + 텍스트 (`text.2xs` / `text.muted`)
- 고정 문구:
  > "면책 고지: 과거 수급 패턴 및 통계 자료는 투자 참고용 역사적 맥락 데이터일 뿐, 미래 주가 상승을 보장하지 않습니다. 실제 투자에서는 외부 환경 등 다양한 요인이 작용하므로 참고 자료로만 활용하시기 바랍니다."

---

## 6. 드릴다운 3단계 규칙

사용자 동선은 War Room → Screener → Deep Dive로 자연스럽게 흐른다.

| Level | 페이지 | 트리거 | 다음 페이지 | 전달 파라미터 |
|---|---|---|---|---|
| L1 | War Room | 섹터 버블 클릭 | Screener | `?sector={섹터명}` |
| L1 | War Room | Type 카드 클릭 | Screener | `?type={A\|B\|C\|D}` |
| L1 | War Room | 주목 종목 클릭 | Deep Dive | `?ticker={code}` |
| L2 | Screener | 행 클릭 | Deep Dive | `?ticker={code}` |
| L3 | Deep Dive | 패턴 카드 클릭 | Archive | `?type={현재 Type}` |

뒤로가기 시 직전 필터·스크롤 위치를 보존한다(브라우저 history 활용).

---

## 7. 색상 적용 규칙 (의미 기반)

레이아웃 전반에서 동일 의미에는 동일 토큰만 사용한다.

| 사용 위치 | 토큰 |
|---|---|
| Type 배지 | `signal.type{A\|B\|C\|D}` |
| 평단가 상태 배지 | `defense.{safe\|caution-yellow\|caution-orange\|danger}` |
| 등락률·수익률 양수 | `num.up` |
| 등락률·수익률 음수 | `num.down` |
| 등락률·수익률 0 | `num.flat` |
| 수급 바차트 (3주체) | `subject.{개인\|기관\|외국인}` |
| 시스템 상태 배지 | `status.{live\|confirmed\|pending}` |

> ⚠ Type 색을 등락률에 쓰거나, 등락률 색을 Type에 쓰면 의미 충돌. 절대 금지.

---

## 8. 인터랙션 규칙

### 8.1 Hover

- 카드: `bg.surface-2` 배경 전환, `motion.fast`
- 차트 데이터 포인트: 툴팁 표시 (`chart.6.2`)
- 테이블 행: `bg.surface-2` 배경

### 8.2 Tooltip 내용 규칙

모든 차트 툴팁은 **수치 + 의미 1줄**을 함께 표시.

예시 (전술 레이더 맵 버블):
```
반도체
─────────────
기관 SFI:   +5.2
외인 SFI:   +8.1
거래대금:   3.2조
주도력:     외인 주도 (Type C)
```

### 8.3 빈 상태 (Empty State)

데이터 0건 시 카드 내부에 다음을 표시:

- 좌상단 아이콘 + `text.secondary`로 안내 문구
- 예: "오늘 Type A 조건을 만족하는 종목이 없습니다."

### 8.4 로딩 상태

- 스켈레톤 박스: `bg.surface-2`, `motion.pulse`
- 차트는 회색 외곽선 + 중앙 spinner

---

## 9. 반응형 규칙 (1차 범위)

| 화면 폭 | 동작 |
|---|---|
| ≥ 1280px | 정상 12열 그리드 |
| 1024 ~ 1279px | War Room Row 2를 col-4 / col-8 / 하단 col-12로 재배치 |
| < 1024px | "PC 권장" 안내 페이지로 대체 (모바일 본 대시보드 미지원) |

심사 환경은 1280px 이상 PC 기준이므로 1차 구현은 ≥1280px만 보장.

---

## 10. 차트 라이브러리 매핑

| 본 문서 차트명 | 라이브러리 | 컴포넌트/구현 |
|---|---|---|
| Diverging Bar | Recharts | `<BarChart layout="vertical">` + 음/양 데이터 분리 |
| Bubble | Recharts | `<ScatterChart>` + `<ZAxis>` 크기 매핑 |
| **Candlestick** | **lightweight-charts (TradingView)** | **§10.1 참조** |
| Grouped Bar | Recharts | `<BarChart>` 다중 `<Bar>` |
| Stat Card | (라이브러리 없음) | DESIGN.md 5.3 컴포넌트 |
| Stacked Area | Recharts | `<AreaChart stackId="1">` |

축·그리드·툴팁 스타일은 모두 DESIGN.md 6장 토큰을 적용한다.

### 10.1 Candlestick 구현 (lightweight-charts)

Recharts는 캔들차트를 기본 지원하지 않아 커스텀이 깨지기 쉽다.
**Deep Dive 캔들은 반드시 `lightweight-charts`를 사용**한다.

```tsx
// components/charts/Candlestick.tsx
import { useEffect, useRef } from "react";
import { createChart, CrosshairMode, ISeriesApi } from "lightweight-charts";

type CandleDatum = { date: string; open: number; high: number; low: number; close: number };

export function Candlestick({
  candles,
  instAvg,
  foreignAvg,
}: {
  candles: CandleDatum[];
  instAvg: number | null;
  foreignAvg: number | null;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 400,
      layout: { background: { color: "#111827" }, textColor: "#9CA3AF" },
      grid: { vertLines: { color: "#1F2937" }, horzLines: { color: "#1F2937" } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: "#374151" },
      rightPriceScale: { borderColor: "#374151" },
    });

    const candle = chart.addCandlestickSeries({
      upColor: "#EF4444",        // num.up — 한국 관습 (상승=빨강)
      downColor: "#3B82F6",      // num.down
      borderUpColor: "#EF4444",
      borderDownColor: "#3B82F6",
      wickUpColor: "#EF4444",
      wickDownColor: "#3B82F6",
    });
    candle.setData(candles.map(c => ({
      time: c.date, open: c.open, high: c.high, low: c.low, close: c.close
    })));

    // 평단선 오버레이 (수평 라인)
    if (instAvg) {
      candle.createPriceLine({
        price: instAvg, color: "#06B6D4", lineWidth: 1.5,
        lineStyle: 2 /* Dashed */, axisLabelVisible: true, title: "기관 평단"
      });
    }
    if (foreignAvg) {
      candle.createPriceLine({
        price: foreignAvg, color: "#A855F7", lineWidth: 1.5,
        lineStyle: 2, axisLabelVisible: true, title: "외인 평단"
      });
    }

    const ro = new ResizeObserver(() => {
      if (ref.current) chart.applyOptions({ width: ref.current.clientWidth });
    });
    ro.observe(ref.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, [candles, instAvg, foreignAvg]);

  return <div ref={ref} className="w-full h-[400px]" />;
}
```

**색상 hex는 DESIGN.md §11.1 토큰값과 동일**해야 한다.
lightweight-charts는 className/CSS 변수를 받지 않으므로 hex를 직접 적되, **임의 색 도입 금지**.

### 10.2 거래량 보조 차트 (캔들 하단)

`chart.addHistogramSeries()`로 별도 패널 추가:

```tsx
const volume = chart.addHistogramSeries({
  priceFormat: { type: "volume" },
  priceScaleId: "",        // overlay
  scaleMargins: { top: 0.8, bottom: 0 }
});
volume.setData(candles.map(c => ({
  time: c.date,
  value: c.volume,
  color: c.close >= c.open ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.5)"
})));
```

---

## 11. 접근성·국제화

- 모든 차트에 `aria-label` 부여 (예: "전술 레이더 맵: 외국인 SFI vs 기관 SFI 섹터별 분포").
- 색 단독 의미 전달 금지: 배지는 항상 색 + 텍스트.
- 통화·수량 단위는 ko-KR 로케일 (`Intl.NumberFormat`).
- 날짜 포맷: `YYYY.MM.DD`.

---

## 11.5 페이지 ↔ API 호출 매핑

각 페이지가 호출하는 엔드포인트는 [api-contract.md](../rules/api-contract.md) §0.6 참조.
프론트엔드 데이터 페칭은 모두 TanStack Query로 한다.

### War Room (`/war-room`)

```tsx
const { data: brief }     = useQuery({ queryKey: ["market","brief", date],     queryFn: () => api.getBrief(date) });
const { data: sectors }   = useQuery({ queryKey: ["market","sectors", date],   queryFn: () => api.getSectors(date) });
const { data: dominance } = useQuery({ queryKey: ["market","dominance", date], queryFn: () => api.getDominance(date) });
const { data: signals }   = useQuery({ queryKey: ["market","signals", date],   queryFn: () => api.getSignals(date) });
```

### Screener (`/screener`)

```tsx
const filters = useFilterStore();   // zustand
const { data } = useQuery({
  queryKey: ["screener", filters],
  queryFn: () => api.getScreener(filters),
  placeholderData: keepPreviousData,
});
```

### Deep Dive (`/deep-dive/:ticker`)

```tsx
const { ticker } = useParams();
const stock    = useQuery({ queryKey: ["stock", ticker, date],            queryFn: () => api.getStock(ticker, date) });
const candles  = useQuery({ queryKey: ["stock", ticker, "candles", "3M"], queryFn: () => api.getCandles(ticker, "3M") });
const flows    = useQuery({ queryKey: ["stock", ticker, "flows", 7],      queryFn: () => api.getFlows(ticker, 7) });
const ma       = useQuery({ queryKey: ["stock", ticker, "ma"],            queryFn: () => api.getMaEvents(ticker) });
const patterns = useQuery({ queryKey: ["stock", ticker, "patterns"],      queryFn: () => api.getSimilarPatterns(ticker) });
```

### Archive (`/archive`)

```tsx
const [type, setType] = useState<"A"|"B"|"C"|"D">("B");
const summary = useQuery({ queryKey: ["archive","summary"],                 queryFn: api.getArchiveSummary });
const cases   = useQuery({ queryKey: ["archive","cases", type, page],       queryFn: () => api.getArchiveCases(type, page) });
```

응답 타입은 [api-contract.md](../rules/api-contract.md)의 응답 JSON과 1:1 일치.
`frontend/src/types/api.ts`에 TypeScript 타입을 정의해 모든 페이지에서 공유.

---

## 12. 구현 체크리스트

화면별로 다음을 만족해야 "기획 일치"로 판정한다.

- [ ] War Room: Market Brief 자동 문장 + 5개 컴포넌트 모두 노출
- [ ] War Room: 전술 레이더 맵 4분면 라벨 표시
- [ ] Screener: 4개 필터 + Type/상태 배지 + 행 클릭 → Deep Dive 이동
- [ ] Deep Dive: 캔들차트 + 평단선 2개 오버레이
- [ ] Deep Dive: 최근 7일 수급 3주체 토글
- [ ] Archive: Type 탭 전환 시 통계 카드·테이블 갱신
- [ ] Archive: 면책 고지 항상 노출
- [ ] 모든 페이지: Header 5개 영역 + 탭 활성 표시
- [ ] 모든 색: DESIGN.md 토큰만 사용 (인라인 hex 금지)
