---
name: data-schema
description: 수급전쟁 DB 테이블 스키마 정의. raw → derived → aggregated 3계층 구조와 컬럼 매핑 규칙을 정의한다. 다른 데이터 소스(Yahoo Finance 등)도 동일 스키마로 변환 가능.
type: analysis-rule
---

# Data Schema

본 문서는 DB 테이블 스키마를 정의한다.
SQL 표현은 PostgreSQL 기준이며, 개발은 SQLite도 호환되도록 타입을 단순화한다.

---

## 1. 계층 구조

| 계층 | 역할 | 갱신 주체 |
|---|---|---|
| `raw.*` | 외부 소스 원본 | data-pipeline.md |
| `derived.*` | 1차 계산 지표 (종목별) | supply-analysis.md |
| `aggregated.*` | 2차 집계 (섹터·시장·신호) | screening-rules.md, scoring-signals.md |
| `archive.*` | 과거 패턴 통계 (정적) | 일 1회 야간 배치 |

조회는 항상 `derived.*` 또는 `aggregated.*`에서 한다. FE는 `raw.*`를 직접 읽지 않는다.

---

## 2. 공통 컬럼 규약

| 컬럼 | 타입 | 의미 |
|---|---|---|
| `trade_date` | DATE | 거래일 (YYYY-MM-DD) |
| `ticker` | VARCHAR(6) | 종목코드 6자리 |
| `status` | VARCHAR(10) | live / pending / confirmed |
| `created_at` | TIMESTAMPTZ | 적재 시각 |
| `updated_at` | TIMESTAMPTZ | 수정 시각 |

모든 테이블 PK에 `trade_date`가 포함된다.

---

## 3. raw 계층

### 3.1 `raw.stock_master`

종목 마스터. 주 1회 갱신.

| 컬럼 | 타입 | PK | 설명 |
|---|---|---|---|
| `ticker` | VARCHAR(6) | ✓ | 종목코드 |
| `name` | TEXT | | 종목명 (한글) |
| `market` | VARCHAR(8) | | KOSPI / KOSDAQ |
| `sector` | TEXT | | 섹터명 (반도체, 2차전지 등) |
| `listing_date` | DATE | | 상장일 |
| `is_active` | BOOLEAN | | 거래 활성 여부 |

### 3.2 `raw.daily_price`

일별 OHLCV.

| 컬럼 | 타입 | PK | 설명 |
|---|---|---|---|
| `trade_date` | DATE | ✓ | |
| `ticker` | VARCHAR(6) | ✓ | |
| `open` | INTEGER | | 시가 (원) |
| `high` | INTEGER | | 고가 |
| `low` | INTEGER | | 저가 |
| `close` | INTEGER | | 종가 |
| `volume` | BIGINT | | 거래량 (주) |
| `value` | BIGINT | | 거래대금 (원) |
| `change_pct` | NUMERIC(6,2) | | 등락률 (%) |
| `status` | VARCHAR(10) | | live/pending/confirmed |

인덱스: `(ticker, trade_date DESC)`.

### 3.3 `raw.daily_investor_flow`

일별 투자자별 순매수.

| 컬럼 | 타입 | PK | 설명 |
|---|---|---|---|
| `trade_date` | DATE | ✓ | |
| `ticker` | VARCHAR(6) | ✓ | |
| `indiv_net_value` | BIGINT | | 개인 순매수 금액 (원) |
| `inst_net_value` | BIGINT | | 기관 순매수 금액 |
| `foreign_net_value` | BIGINT | | 외국인 순매수 금액 |
| `etc_net_value` | BIGINT | | 기타법인 순매수 금액 |
| `indiv_net_volume` | BIGINT | | 개인 순매수 수량 (주) |
| `inst_net_volume` | BIGINT | | 기관 순매수 수량 |
| `foreign_net_volume` | BIGINT | | 외국인 순매수 수량 |
| `etc_net_volume` | BIGINT | | 기타법인 순매수 수량 |
| `status` | VARCHAR(10) | | |

부호 규약: 매수가 양수, 매도가 음수.

### 3.4 `raw.daily_market_meta`

| 컬럼 | 타입 | PK | 설명 |
|---|---|---|---|
| `trade_date` | DATE | ✓ | |
| `kospi_close` | NUMERIC(10,2) | | KOSPI 종가 |
| `kospi_change_pct` | NUMERIC(6,2) | | |
| `kosdaq_close` | NUMERIC(10,2) | | |
| `kosdaq_change_pct` | NUMERIC(6,2) | | |
| `usdkrw` | NUMERIC(8,2) | | 달러/원 환율 |

### 3.5 `raw.intraday_snapshot`

장중 5회 스냅샷 (히스토리).

| 컬럼 | 타입 | PK |
|---|---|---|
| `snapshot_at` | TIMESTAMPTZ | ✓ |
| `ticker` | VARCHAR(6) | ✓ |
| `price` | INTEGER | |
| `cum_volume` | BIGINT | |
| `cum_value` | BIGINT | |
| `indiv_net_value` | BIGINT | |
| `inst_net_value` | BIGINT | |
| `foreign_net_value` | BIGINT | |

### 3.6 `raw.fetch_log`

수집 이력. 정의는 [data-pipeline.md](./data-pipeline.md) §10.

---

## 4. derived 계층

종목 단위로 1차 계산된 지표.

### 4.1 `derived.daily_metrics`

| 컬럼 | 타입 | PK | 계산 출처 |
|---|---|---|---|
| `trade_date` | DATE | ✓ | |
| `ticker` | VARCHAR(6) | ✓ | |
| `inst_sfi` | NUMERIC(8,2) | | supply-analysis.md §1 |
| `foreign_sfi` | NUMERIC(8,2) | | supply-analysis.md §1 |
| `indiv_dominance` | NUMERIC(6,2) | | supply-analysis.md §2 |
| `inst_dominance` | NUMERIC(6,2) | | supply-analysis.md §2 |
| `foreign_dominance` | NUMERIC(6,2) | | supply-analysis.md §2 |
| `inst_avg_price` | NUMERIC(10,2) | | supply-analysis.md §3 (20일 평단) |
| `foreign_avg_price` | NUMERIC(10,2) | | supply-analysis.md §3 |
| `defense_state` | VARCHAR(20) | | safe / caution_yellow / caution_orange / danger |
| `quadrant` | SMALLINT | | 1 / 2 / 3 / 4 (supply-analysis.md §5) |
| `status` | VARCHAR(10) | | |

인덱스: `(trade_date DESC, ticker)`, `(ticker, trade_date DESC)`.

### 4.2 `derived.cumulative_flow_20d`

평단가 계산용 보조 테이블 (20일 롤링 누적).

| 컬럼 | 타입 | PK |
|---|---|---|
| `trade_date` | DATE | ✓ |
| `ticker` | VARCHAR(6) | ✓ |
| `inst_cum_value_20d` | BIGINT | |
| `inst_cum_volume_20d` | BIGINT | |
| `foreign_cum_value_20d` | BIGINT | |
| `foreign_cum_volume_20d` | BIGINT | |

---

## 5. aggregated 계층

### 5.1 `aggregated.signal_classification`

종목별 Type 분류 결과.

| 컬럼 | 타입 | PK | 출처 |
|---|---|---|---|
| `trade_date` | DATE | ✓ | |
| `ticker` | VARCHAR(6) | ✓ | |
| `signal_type` | CHAR(1) | | A / B / C / D / NULL (screening-rules.md §1) |
| `priority_score` | NUMERIC(8,2) | | screening-rules.md §3 |
| `insight_text` | TEXT | | scoring-signals.md §2 |

인덱스: `(trade_date, signal_type, priority_score DESC)` — Screener 정렬용.

### 5.2 `aggregated.sector_flows`

섹터별 일일 집계 (전술 레이더 맵용).

| 컬럼 | 타입 | PK |
|---|---|---|
| `trade_date` | DATE | ✓ |
| `sector` | TEXT | ✓ |
| `total_value` | BIGINT | 거래대금 합계 |
| `inst_sfi_avg` | NUMERIC(8,2) | 가중평균 |
| `foreign_sfi_avg` | NUMERIC(8,2) | 가중평균 |
| `dominant_subject` | VARCHAR(10) | 개인/기관/외국인 |
| `dominant_type` | CHAR(1) | A/B/C/D |
| `stock_count` | INTEGER | 섹터 내 종목 수 |

가중치는 거래대금 비중. 계산식은 [supply-analysis.md](./supply-analysis.md) §6.

### 5.3 `aggregated.market_brief`

일별 자동 생성 시장 요약.

| 컬럼 | 타입 | PK |
|---|---|---|
| `trade_date` | DATE | ✓ |
| `kospi_summary` | TEXT | 1문장 |
| `kosdaq_summary` | TEXT | 1문장 |
| `combined_brief` | TEXT | 합본 (UI 노출용) |
| `dominant_sector` | TEXT | |
| `signal_counts` | JSONB | `{"A": 12, "B": 28, "C": 45, "D": 31}` |

생성 규칙은 [scoring-signals.md](./scoring-signals.md) §3.

---

## 6. archive 계층

### 6.1 `archive.pattern_outcomes`

과거 Type 발생 시점 + 이후 수익률 (Archive 페이지 통계 카드 + 사례 테이블 출처).

| 컬럼 | 타입 | PK |
|---|---|---|
| `id` | BIGSERIAL | ✓ |
| `occurrence_date` | DATE | |
| `ticker` | VARCHAR(6) | |
| `signal_type` | CHAR(1) | |
| `sector` | TEXT | |
| `inst_sfi` | NUMERIC(8,2) | |
| `foreign_sfi` | NUMERIC(8,2) | |
| `return_5d` | NUMERIC(8,2) | 5일 후 수익률 (%) |
| `return_20d` | NUMERIC(8,2) | 20일 후 수익률 (%) |
| `is_win_5d` | BOOLEAN | 5일 후 수익률 > 0 |
| `is_win_20d` | BOOLEAN | 20일 후 수익률 > 0 |

인덱스: `(signal_type, occurrence_date DESC)`.

### 6.2 `archive.pattern_summary`

Type별 통계 (Stat Card 출처). 야간 배치로 갱신.

| 컬럼 | 타입 | PK |
|---|---|---|
| `signal_type` | CHAR(1) | ✓ |
| `total_count_3y` | INTEGER | 3년 발생 횟수 |
| `avg_return_5d` | NUMERIC(8,2) | |
| `win_rate_5d` | NUMERIC(6,2) | |
| `avg_return_20d` | NUMERIC(8,2) | |
| `win_rate_20d` | NUMERIC(6,2) | |
| `last_updated` | TIMESTAMPTZ | |

### 6.3 `archive.similarity_index`

종목별 과거 유사 패턴 검색 인덱스 (Deep Dive "과거 패턴 유사도 Top 3" 출처).

| 컬럼 | 타입 | PK |
|---|---|---|
| `id` | BIGSERIAL | ✓ |
| `ticker` | VARCHAR(6) | |
| `window_start` | DATE | |
| `window_end` | DATE | |
| `feature_vector` | JSONB | 정규화된 [기관SFI 5일치, 외인SFI 5일치] 등 |
| `return_5d` | NUMERIC(8,2) | |
| `return_20d` | NUMERIC(8,2) | |

코사인 유사도 검색은 [supply-analysis.md](./supply-analysis.md) §7.

---

## 7. 컬럼 매핑 규칙 (소스 독립성)

데이터 소스가 바뀌어도 raw 스키마로 변환 가능하도록 매핑 함수를 정의한다.

### 7.1 KRX → raw

| 소스 컬럼 | 매핑 대상 | 변환 |
|---|---|---|
| `TRD_DD` | `trade_date` | `YYYY/MM/DD` → `YYYY-MM-DD` |
| `ISU_SRT_CD` | `ticker` | 좌측 0 패딩 6자리 |
| `TDD_OPNPRC` | `open` | 콤마 제거 후 INT |
| `INVST_INDIV_NETBYN_TRDVAL` | `indiv_net_value` | 콤마 제거 |
| `FRGN_NETBYN_TRDVAL` | `foreign_net_value` | 콤마 제거 |
| `ORGN_NETBYN_TRDVAL` | `inst_net_value` | 콤마 제거 |

### 7.2 Yahoo Finance → raw (확장 시)

| 소스 컬럼 | 매핑 대상 |
|---|---|
| `Date` | `trade_date` |
| `Open/High/Low/Close` | `open/high/low/close` |
| `Volume` | `volume` |

투자자별 순매수는 야후에서 제공하지 않으므로, 야후 사용 시 `raw.daily_investor_flow`는 NULL로 두고 `signal_type`을 NULL 처리.

### 7.3 더미 CSV → raw

CSV 컬럼명을 raw 컬럼명과 동일하게 맞춰서 그대로 적재. 변환 함수 불필요.

---

## 8. 마이그레이션 순서

```sql
-- 1. raw 계층 (외부 소스 원본)
CREATE TABLE raw.stock_master (...);
CREATE TABLE raw.daily_price (...);
CREATE TABLE raw.daily_investor_flow (...);
CREATE TABLE raw.daily_market_meta (...);
CREATE TABLE raw.intraday_snapshot (...);
CREATE TABLE raw.fetch_log (...);

-- 2. derived 계층
CREATE TABLE derived.daily_metrics (...);
CREATE TABLE derived.cumulative_flow_20d (...);

-- 3. aggregated 계층
CREATE TABLE aggregated.signal_classification (...);
CREATE TABLE aggregated.sector_flows (...);
CREATE TABLE aggregated.market_brief (...);

-- 4. archive 계층
CREATE TABLE archive.pattern_outcomes (...);
CREATE TABLE archive.pattern_summary (...);
CREATE TABLE archive.similarity_index (...);
```

---

## 9. SQLite 호환 메모

개발 환경(SQLite)에서는 다음으로 치환:

| PostgreSQL | SQLite 치환 |
|---|---|
| `BIGINT` | `INTEGER` |
| `NUMERIC(p,s)` | `REAL` |
| `TIMESTAMPTZ` | `TEXT` (ISO 8601) |
| `JSONB` | `TEXT` (JSON 문자열) |
| `BOOLEAN` | `INTEGER` (0/1) |
| 스키마 분리 (`raw.`, `derived.`) | 테이블명 prefix (`raw_`, `derived_`) |

---

## 10. 구현 체크리스트

- [ ] 11개 테이블이 생성된다
- [ ] `raw → derived → aggregated → archive` 4계층이 분리된다
- [ ] PK 제약·인덱스가 정상 동작한다
- [ ] KRX·FDR·더미 3소스에서 동일 raw 스키마로 적재된다
- [ ] FE 쿼리는 `aggregated.*` / `derived.*`만 사용한다
