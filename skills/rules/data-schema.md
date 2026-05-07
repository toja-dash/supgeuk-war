---
name: defining-data-schema
description: 원본 OHLCV·수급 데이터, 1차 가공 지표, 2차 분석 지표의 snake_case 표준 컬럼과 PostgreSQL 테이블 구조를 정의한다. supply-analysis.md가 산출하는 컬럼과 1:1 일치한다.
---

# 데이터 스키마 및 DB 테이블 정의

> **역할**: 수급전쟁 파이프라인 전반에서 사용되는 데이터의 규격과 테이블 구조를 정의한다.
> **참조 시점**: data-pipeline.md 매핑 단계, supply-analysis.md 입력/출력 정합성 검증 시.
> **선행 조건**: 없음 (가장 하위 레이어).

모든 컬럼명은 **snake_case**로 통일한다. 다른 파일(supply-analysis.md, screening-rules.md, scoring-signals.md)도 이 표준을 그대로 사용한다.

---

## 1. 범용 컬럼 매핑 규칙 (Input → Standard)

외부 소스(KRX, FinanceDataReader, Yahoo Finance 등)의 원본 컬럼명은 적재 전 반드시 표준 snake_case로 치환한다.

| 원본 키워드 (예시) | 표준 컬럼 |
|---|---|
| `Date`, `날짜`, `timestamp`, `TRD_DD` | `date` |
| `Code`, `Symbol`, `종목코드`, `ISU_SRT_CD` | `ticker` |
| `Open`, `시가` | `open` |
| `High`, `고가` | `high` |
| `Low`, `저가` | `low` |
| `Close`, `종가` | `close` |
| `Volume`, `거래량` | `volume` |
| `Amount`, `거래대금`, `Total_Value` | `trade_value` |
| `개인순매수`, `Retail_Net` | `net_buy_indi` |
| `기관순매수`, `Inst_Net` | `net_buy_inst` |
| `외국인순매수`, `Foreign_Net` | `net_buy_frgn` |
| `기관순매수수량` | `net_qty_inst` |
| `외국인순매수수량` | `net_qty_frgn` |

매핑은 [data-pipeline.md §3](data-pipeline.md)의 전처리 단계에서 한 번만 수행한다.

---

## 2. 지표별 데이터 스키마

### 2.1 [A] 원본 데이터 스키마 (Raw Data)

KRX·FDR에서 수집한 일별 시세·수급의 순수 원본. 종목명·섹터·시장 구분 같은 정적 메타데이터는 §2.2 종목 마스터에 분리 저장한다.

| 컬럼 | 타입 | 단위/형식 | 의미 |
|---|---|---|---|
| `date` | date | `YYYY-MM-DD` | 거래일 |
| `ticker` | string(6) | 좌측 0 패딩 (예: `005930`) | 종목 코드 (FK → `stock_master.ticker`) |
| `open` | int | 원 | 시가 |
| `high` | int | 원 | 고가 |
| `low` | int | 원 | 저가 |
| `close` | int | 원 | 종가 |
| `volume` | int | 주 | 거래량 |
| `trade_value` | int | 원 | 당일 총 거래대금 |
| `net_buy_indi` | int | 원 (매도 시 음수) | 개인 순매수 대금 |
| `net_buy_inst` | int | 원 (매도 시 음수) | 기관 순매수 대금 |
| `net_buy_frgn` | int | 원 (매도 시 음수) | 외국인 순매수 대금 |
| `net_qty_inst` | int | 주 (매도 시 음수) | 기관 순매수 수량 |
| `net_qty_frgn` | int | 주 (매도 시 음수) | 외국인 순매수 수량 |

> **개인 순매수 수량(`net_qty_indi`)은 적재하지 않는다.** 평단가 계산은 기관·외국인 두 주체에 한정 (supply-analysis.md §4.4 참조).

### 2.2 [M] 종목 마스터 스키마 (Stock Master)

ticker별로 1행씩 보유하는 정적 메타데이터. 화면 표시(종목명), 필터링(섹터·시장), 시장 단위 집계(KOSPI/KOSDAQ 분리)에 사용한다.

| 컬럼 | 타입 | 의미 |
|---|---|---|
| `ticker` | string(6) PK | 종목 코드 (좌측 0 패딩) |
| `name` | string | 종목명 (예: "삼성전자") |
| `sector` | string | 섹터명 (예: "반도체", "2차전지") |
| `market` | string | 거래 시장 — `KOSPI` \| `KOSDAQ` |
| `is_active` | bool | 상장 여부 (상장폐지 종목은 false) |
| `updated_at` | timestamp | 마지막 동기화 시각 |

> 섹터 분류는 KRX 산업분류(WICS) 또는 FinanceDataReader 메타를 사용한다. 섹터·종목명·시장이 변경되어도 ticker는 그대로 유지한다.

### 2.3 [B] 1차 지표 스키마 (Primary Indicators)

원본을 종목별 시계열로 윈도우 처리하여 산출되는 단순 통계.

| 컬럼 | 타입 | 의미 |
|---|---|---|
| `ma_5` | float | 종가 5거래일 이동평균 |
| `ma_20` | float | 종가 20거래일 이동평균 |
| `ma_60` | float | 종가 60거래일 이동평균 |
| `ma_120` | float | 종가 120거래일 이동평균 (Deep Dive 맥점용) |

> 누적 순매수 대금/수량은 별도 컬럼으로 저장하지 않는다. supply-analysis.md §4가 윈도우 합산을 매번 직접 수행하므로 1차 지표에는 포함시키지 않는다.

### 2.4 [C] 2차 지표 스키마 (Secondary Indicators)

[supply-analysis.md](supply-analysis.md) §1~§5의 계산 결과. 화면 노출의 직접 소스.

| 컬럼 | 타입 | 단위/허용값 | 의미 |
|---|---|---|---|
| `dominance_indi` | float \| null | `[-1, +1]` | 개인 3파전 주도력 |
| `dominance_inst` | float \| null | `[-1, +1]` | 기관 3파전 주도력 |
| `dominance_frgn` | float \| null | `[-1, +1]` | 외국인 3파전 주도력 |
| `sfi_inst` | float \| null | % | 기관 수급 강도 지수 |
| `sfi_frgn` | float \| null | % | 외국인 수급 강도 지수 |
| `quadrant` | string | `BOTH_BUY` \| `INST_DEFENSE` \| `BOTH_SELL` \| `FRGN_LEAD` | 3차원 엇갈림 사분면 |
| `conflict_intensity` | float \| null | % | 충돌 강도 (Q2·Q4 해석용) |
| `avg_cost_5d_inst` | float \| null | 원 | 기관 5일 평단가 |
| `avg_cost_20d_inst` | float \| null | 원 | 기관 20일 평단가 (기준) |
| `avg_cost_60d_inst` | float \| null | 원 | 기관 60일 평단가 |
| `avg_cost_5d_frgn` | float \| null | 원 | 외국인 5일 평단가 |
| `avg_cost_20d_frgn` | float \| null | 원 | 외국인 20일 평단가 (기준) |
| `avg_cost_60d_frgn` | float \| null | 원 | 외국인 60일 평단가 |
| `defense_status` | string | `SAFE` \| `FRGN_LINE_TOUCH` \| `INST_LINE_TOUCH` \| `BREAKDOWN` \| `INSUFFICIENT_DATA` | 평단가 방어선 4단계 |
| `defense_status_inverted` | bool | `true`/`false` | 평단가 역전 여부 |

### 2.5 [D] 신호·점수 스키마 (Signal & Score)

[screening-rules.md](screening-rules.md) §1, [scoring-signals.md](scoring-signals.md) §1의 결과. 종목 노출 결정에 직접 사용.

| 컬럼 | 타입 | 단위/허용값 | 의미 |
|---|---|---|---|
| `type` | string \| null | `A` \| `B` \| `C` \| `D` \| `null` | Type 분류 (미분류 = null) |
| `type_intensity` | float \| null | % | Type 신호 강도 (`max(|sfi_inst|, |sfi_frgn|)`) |
| `priority_score` | float \| null | 점수 | Screener 정렬용 raw 점수 |
| `weighted_priority` | float \| null | 점수 | War Room Top N용 가중 점수 |

### 2.6 [E] 표시 라벨 매핑

DB에는 위 영문 enum 값만 저장한다. UI 표시 라벨은 다음 매핑을 통해 변환한다.

| 컬럼 | 코드 값 | 한글 라벨 |
|---|---|---|
| `quadrant` | `BOTH_BUY` | 쌍끌이 매수 |
| `quadrant` | `INST_DEFENSE` | 기관 방어 |
| `quadrant` | `BOTH_SELL` | 쌍끌이 매도 |
| `quadrant` | `FRGN_LEAD` | 외인 주도 |
| `defense_status` | `SAFE` | 안전 구역 |
| `defense_status` | `FRGN_LINE_TOUCH` | 외인 방어선 도달 |
| `defense_status` | `INST_LINE_TOUCH` | 기관 방어선 도달 |
| `defense_status` | `BREAKDOWN` | 방어선 붕괴 |
| `defense_status` | `INSUFFICIENT_DATA` | 데이터 부족 |
| `type` | `A` | 쌍끌이 설거지 |
| `type` | `B` | 쌍끌이 매수 |
| `type` | `C` | 개미털기 |
| `type` | `D` | 기관 방어 |

> **Type 라벨은 사분면 라벨(`quadrant`)과 다른 의미 레이어다.** Type B(쌍끌이 매수, 사분면 Q1)와 사분면 라벨 "쌍끌이 매수"는 동일한 표현이지만, Type C(개미털기)는 사분면 Q4(외인 주도)에 매핑되며 라벨은 다르다.

---

## 3. DB 테이블 정의 (PostgreSQL)

### 3.1 Table 1: `market_raw_data`

원본 통합 테이블. [data-pipeline.md](data-pipeline.md) 적재의 직접 대상.

| 컬럼 | 제약 |
|---|---|
| `date` | `DATE NOT NULL` |
| `ticker` | `VARCHAR(6) NOT NULL` |
| `open`, `high`, `low`, `close` | `INTEGER` |
| `volume` | `BIGINT` |
| `trade_value` | `BIGINT` |
| `net_buy_indi`, `net_buy_inst`, `net_buy_frgn` | `BIGINT` |
| `net_qty_inst`, `net_qty_frgn` | `BIGINT` |
| **PK** | `(date, ticker)` |
| **Index** | `(ticker, date DESC)` — 종목별 시계열 조회용 |

### 3.2 Table 2: `market_indicators`

[B] 1차 + [C] 2차 + [D] 신호·점수 결과를 통합 적재한다. 화면(특히 War Room·Screener)이 직접 SELECT하는 메인 테이블.

| 컬럼 | 비고 |
|---|---|
| `date`, `ticker` | PK, FK → `market_raw_data` |
| `ma_5`, `ma_20`, `ma_60`, `ma_120` | §2.3 |
| `dominance_indi`, `dominance_inst`, `dominance_frgn` | §2.4 |
| `sfi_inst`, `sfi_frgn` | §2.4 |
| `quadrant`, `conflict_intensity` | §2.4 |
| `avg_cost_5d_inst`, `avg_cost_20d_inst`, `avg_cost_60d_inst` | §2.4 |
| `avg_cost_5d_frgn`, `avg_cost_20d_frgn`, `avg_cost_60d_frgn` | §2.4 |
| `defense_status`, `defense_status_inverted` | §2.4 |
| `type`, `type_intensity` | §2.5 |
| `priority_score`, `weighted_priority` | §2.5 |
| **Index** | `(date, type)` — Type 필터용 |
| **Index** | `(date, defense_status)` — 상태 필터용 |
| **Index** | `(date, weighted_priority DESC)` — Top N 추출용 |

### 3.3 Table 3: `market_summary`

시장 단위 일별 집계. Market Brief 생성 및 War Room 헤더 카운트에 사용.

| 컬럼 | 타입 | 의미 |
|---|---|---|
| `date` | DATE PK | 거래일 |
| `market_sfi_inst_kospi`, `market_sfi_inst_kosdaq`, `market_sfi_inst_total` | float | 시장 평균 기관 SFI (가중평균) |
| `market_sfi_frgn_kospi`, `market_sfi_frgn_kosdaq`, `market_sfi_frgn_total` | float | 시장 평균 외인 SFI |
| `top_sector_inst` | string | 기관 SFI 1위 섹터 |
| `top_sector_frgn` | string | 외인 SFI 1위 섹터 |
| `count_type_a`, `count_type_b`, `count_type_c`, `count_type_d` | int | Type별 종목 수 |
| `market_brief_text` | text | screening-rules.md §3 조립 결과 |

### 3.4 Table 4: `archive_pattern_stats`

[Archive 화면](../visualization/dashboard-layout.md) Type별 과거 통계 캐시.

| 컬럼 | 타입 | 의미 |
|---|---|---|
| `type` | string PK | A \| B \| C \| D |
| `as_of_date` | DATE PK | 통계 계산 기준일 |
| `total_count` | int | 과거 3년 발생 횟수 |
| `avg_return_5d` | float | 5일 후 평균 수익률 (%) |
| `win_rate_5d` | float | 5일 후 승률 (%) |
| `avg_return_20d` | float | 20일 후 평균 수익률 (%) |
| `win_rate_20d` | float | 20일 후 승률 (%) |

### 3.5 Table 5: `stock_master`

§2.2 [M] 종목 마스터의 물리 테이블. 일배치(또는 부팅 시)로 KRX·FDR에서 동기화한다. 화면(종목명·섹터 표시), 시장 분리 집계(`market_summary`)의 직접 소스.

| 컬럼 | 제약 |
|---|---|
| `ticker` | `VARCHAR(6) PRIMARY KEY` |
| `name` | `VARCHAR(64) NOT NULL` |
| `sector` | `VARCHAR(64)` |
| `market` | `VARCHAR(8) NOT NULL` — `KOSPI` \| `KOSDAQ` |
| `is_active` | `BOOLEAN NOT NULL DEFAULT TRUE` |
| `updated_at` | `TIMESTAMP NOT NULL` |
| **Index** | `(market)` — 시장 분리 집계용 |
| **Index** | `(sector)` — 섹터 필터·드릴다운용 |

> `market_raw_data.ticker`는 본 테이블 `ticker`를 외래 참조한다. 분석 단계에서 `market_indicators`와 본 테이블을 LEFT JOIN하여 `name`, `sector`, `market`을 화면에 노출한다.

### 3.6 Table 6: `ma_events`

[supply-analysis.md §6](supply-analysis.md) 이동평균선 맥점(골든·데드크로스) 이벤트 누적 테이블. Deep Dive 화면 §4.7 "주요 이동평균선 맥점" 리스트의 직접 소스.

| 컬럼 | 제약 |
|---|---|
| `ticker` | `VARCHAR(6) NOT NULL` |
| `date` | `DATE NOT NULL` |
| `event_type` | `VARCHAR(16) NOT NULL` — `GOLDEN_5_20` \| `DEAD_5_20` \| `GOLDEN_5_60` \| `DEAD_5_60` \| `GOLDEN_20_60` \| `DEAD_20_60` |
| `short_value` | `FLOAT NOT NULL` |
| `long_value` | `FLOAT NOT NULL` |
| **PK** | `(ticker, date, event_type)` |
| **Index** | `(ticker, date DESC)` — Deep Dive 최근 N건 조회용 |

### 3.7 Table 7: `market_index`

[dashboard-layout.md §0.1 Header](../visualization/dashboard-layout.md)의 KOSPI/KOSDAQ 지수 + 환율 표시용. [data-pipeline.md §2.1 `index_adapter`](data-pipeline.md)가 적재.

| 컬럼 | 제약 |
|---|---|
| `date` | `DATE PRIMARY KEY` |
| `kospi_close` | `FLOAT` |
| `kospi_change_pct` | `FLOAT` — 전일 대비 등락률 (%) |
| `kosdaq_close` | `FLOAT` |
| `kosdaq_change_pct` | `FLOAT` |
| `usdkrw_close` | `FLOAT` — 종가 환율 |
| `updated_at` | `TIMESTAMP NOT NULL` |

> 장중 `intra_snapshot` 시점에는 잠정치를 Upsert하고, 18:00 `eod_confirmed`에 최종 확정치로 덮어쓴다.

---

## 4. 검증 체크리스트

LLM이 이 파일에 따라 구현한 후, 다음 자체 검증을 수행한다.

- [ ] 모든 컬럼명이 snake_case로 통일되어 있는가?
- [ ] `ticker`가 `VARCHAR(6)` + 좌측 0 패딩으로 저장되는가?
- [ ] `(date, ticker)` 복합 PK가 `market_raw_data`, `market_indicators`에 모두 정의되었는가?
- [ ] `stock_master`가 모든 활성 종목에 대해 행을 보유하고 있는가? (`market_raw_data`의 ticker가 모두 외래 참조 가능)
- [ ] `stock_master.market` 값이 `KOSPI` 또는 `KOSDAQ`만 사용되는가?
- [ ] `ma_events.event_type`이 6종 enum 중 하나만 사용되는가?
- [ ] `market_index`에 모든 거래일 1행씩 적재되는가? (휴장일 제외)
- [ ] `quadrant`, `defense_status`, `type` 값이 영문 enum 코드로 저장되는가? (한글 직접 저장 금지)
- [ ] `market_indicators`의 컬럼이 [supply-analysis.md §9 계산 순서](supply-analysis.md) 결과와 1:1 일치하는가?
- [ ] §3.2 인덱스 3종이 모두 생성되어 War Room/Screener 쿼리가 인덱스 스캔으로 처리되는가?
