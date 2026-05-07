---
name: managing-data-pipeline
description: KRX 정보데이터시스템 등 외부 소스에서 일별 수급·OHLCV 데이터를 수집·전처리·적재하는 배치 파이프라인을 구현할 때 참조한다. 장중 5회 스냅샷, 15:30 잠정치, 18:00 최종 확정의 3단계 스케줄을 정의한다.
---

# 데이터 파이프라인 실행 규칙

> **역할**: 수급전쟁 서비스의 데이터 수집·전처리·적재 단계를 정의한다.
> **참조 시점**: 서비스 부팅 시 스케줄러 등록, 매일 장중·장마감 시점.
> **선행 조건**: [data-schema.md](data-schema.md)의 컬럼 매핑 규칙이 정의되어 있어야 한다.

이 체크리스트를 복사하고 진행 상황을 추적한다.

```text
- [ ] 1. 종목 마스터(stock_master) 동기화
- [ ] 2. 외부 소스 일배치 데이터 수집
- [ ] 3. data-schema.md 매핑 + 결측치/규격화 전처리
- [ ] 4. PostgreSQL 적재 (Upsert 충돌 제어)
- [ ] 5. 장마감(18:00) 트리거 → supply-analysis.md 호출
- [ ] 6. 일별 지표 + 인사이트 텍스트 결과를 Redis에 캐싱
```

---

## 1. 수집 스케줄 (Batch-only)

서비스 1차 구현 범위는 **배치 수집**만 포함한다. 장중 실시간 틱 스트리밍(WebSocket·Kafka)은 향후 확장 항목이며 본 문서 범위에서 제외한다.

| 트리거 | 시각(KST) | 데이터 종류 | 의미 |
|---|---|---|---|
| `master_sync` | 부팅 시 + 매일 06:00 | 종목 마스터 (`stock_master`) | 신규 상장·상장폐지·섹터 변경 반영 |
| `intra_snapshot` | 09:30, 10:30, 11:30, 13:30, 14:30 | 잠정 수급 + 시세 | 장중 흐름 모니터링용 5회 스냅샷 |
| `eod_provisional` | 15:30 | 잠정 마감 | KRX 잠정치 1차 반영 |
| `eod_confirmed` | 18:00 | 최종 확정 | KRX 최종 확정치 + 일일 지표 전체 재계산 |

스케줄링은 **APScheduler** (`BackgroundScheduler` / `CronTrigger`) 로 구현한다. 휴장일은 KRX 영업일 캘린더를 사전 조회해 자동 스킵한다 (단, `master_sync`는 휴장일에도 실행).

### 1.1 `master_sync` 동기화 절차

[data-schema.md §3.5](data-schema.md) `stock_master` 테이블에 대해 다음을 수행한다.

1. KRX 종목 목록(전체 상장 종목) 조회 → ticker, name, market 추출
2. 섹터 정보는 KRX WICS 또는 FinanceDataReader 메타에서 보강
3. 기존 행과 비교해 추가/수정/상장폐지 판정
   - 신규 ticker: `INSERT` (`is_active = TRUE`)
   - 변경(name·sector·market): `UPDATE`
   - 더 이상 조회되지 않는 ticker: `is_active = FALSE`로 soft-delete (행 보존)
4. `updated_at`을 모든 갱신 행에 현재 시각으로 기록

---

## 2. 외부 소스 어댑터

소스가 바뀌어도 동일한 표준 컬럼으로 적재할 수 있도록 **어댑터 패턴**으로 분리한다.

| 어댑터 | 라이브러리 | 수집 항목 | 적재 대상 |
|---|---|---|---|
| `krx_adapter` (1차 구현) | KRX 정보데이터시스템 (pykrx 또는 공식 API) | 종목별 OHLCV, 거래대금, 개인·기관·외국인 순매수 대금/수량 | `market_raw_data` |
| `fdr_adapter` (보조) | FinanceDataReader | 종목 메타데이터(name·sector), 보조 OHLCV (KRX 누락 보완용) | `stock_master` |
| `index_adapter` | KRX (코스피·코스닥 지수), FinanceDataReader (USD/KRW) | KOSPI·KOSDAQ 종가/등락률, USD/KRW 환율 | `market_index` |

각 어댑터는 호출 결과를 **공통 dataclass**로 반환한다. 컬럼 변환은 [data-schema.md §1](data-schema.md)의 매핑 규칙을 1단계만 호출한다(중첩 참조 금지).

### 2.1 `index_adapter` 상세

[dashboard-layout.md §0.1](../visualization/dashboard-layout.md) Header의 KOSPI/KOSDAQ 지수와 환율 표시용. 일별 1행씩 [data-schema.md §3.7 `market_index`](data-schema.md)에 적재.

| 트리거 | 시점 | 동작 |
|---|---|---|
| `intra_snapshot` | 5회 | 그날의 KOSPI·KOSDAQ 잠정치, 최신 환율 갱신 |
| `eod_confirmed` | 18:00 | 최종 확정 종가·환율 적재 |

---

## 3. 전처리 규칙

수집 직후, DB 적재 전에 다음을 모두 통과해야 한다.

1. **컬럼 매핑**
   - [data-schema.md](data-schema.md) `§1 범용 컬럼 매핑 규칙`에 따라 표준 snake_case로 치환.

2. **결측치 처리**
   - `close`, `open`, `high`, `low` (OHLCV) → `ffill` (직전 거래일 값 치환)
   - `volume`, `trade_value`, `net_buy_*`, `net_qty_*` (수급) → `0` 치환

3. **데이터 규격화**
   - 금액 단위는 모두 `KRW(원)` 정수로 통일 (백만원·억원 단위 입력은 ×1_000_000 또는 ×100_000_000 변환 후 저장)
   - `ticker`는 6자리 문자열, 좌측 0 패딩 (예: `"005930"`)
   - `date`는 `YYYY-MM-DD` ISO 포맷

4. **이상치 가드**
   - `trade_value < 0` 또는 `volume < 0`인 레코드는 적재하지 않고 로깅 후 폐기
   - `close <= 0` 인 레코드는 동일하게 폐기

---

## 4. PostgreSQL 적재 규칙

### 4.1 대상 테이블
- 원본 일별 데이터: [data-schema.md §3 Table 1](data-schema.md) `market_raw_data`
- 분석 지표 결과(2차 산출물): [data-schema.md §3 Table 2](data-schema.md) `market_indicators`

### 4.2 충돌 제어 (Upsert)
`(date, ticker)` 복합 PK 기준으로 다음과 같이 분기한다.

| 트리거 | 정책 |
|---|---|
| `intra_snapshot`, `eod_provisional` | `ON CONFLICT (date, ticker) DO UPDATE` — 잠정치 덮어쓰기 |
| `eod_confirmed` | `ON CONFLICT (date, ticker) DO UPDATE` — 최종 확정치로 덮어쓰기 |

### 4.3 트랜잭션 단위
- 종목 단위 개별 INSERT 금지. **일자 단위 배치 INSERT** (단일 트랜잭션)로 적재한다.

---

## 5. 장마감(18:00) 트리거 → 지표 계산 호출

`eod_confirmed` 트리거 완료 직후 다음을 순차 실행한다.

```
[5.1] market_raw_data 에 18:00 최종 확정 데이터 적재 완료
       ↓
[5.2] supply-analysis.md §9 계산 파이프라인 호출
       ↓
[5.3] market_indicators 에 2차 지표 결과 Upsert
       ↓
[5.4] screening-rules.md §1 Type 분류 + §3 Market Brief 생성
       ↓
[5.5] scoring-signals.md §1 priority_score, §2~4 인사이트 텍스트 생성
       ↓
[5.6] Redis 캐시 갱신 (§6)
```

각 단계는 직전 단계 완료 후에만 실행되며, 한 단계라도 실패하면 다음 단계를 진행하지 않고 알람을 발생시킨다.

---

## 6. Redis 캐시 정책

자주 조회되는 일일 결과를 캐싱하여 API 응답 지연을 최소화한다. **원본 데이터는 캐싱하지 않는다.**

[scoring-signals.md §7](scoring-signals.md)의 텍스트 출력(`signal_card_text`, `deep_dive_headline`, `deep_dive_line1`, `deep_dive_line2`, `archive_summary`, `disclaimer_required`)은 **DB에 영속화하지 않고** 본 캐시에 묶어 저장한다. 다른 컬럼들로부터 결정론적으로 재생성 가능하므로 손실되어도 복구 가능하다.

| 키 패턴 | 값 | TTL | 채움 시점 |
|---|---|---|---|
| `cache:indicators:{YYYY-MM-DD}` | 당일 전체 종목 `market_indicators` + scoring-signals 텍스트 필드를 ticker별 JSON 배열로 결합 | 24시간 | 18:00 배치 |
| `cache:market_brief:{YYYY-MM-DD}` | 당일 Market Brief 텍스트 + Type별 카운트 카드 (`market_summary`에서 조회) | 24시간 | 18:00 배치 |
| `cache:screener:{YYYY-MM-DD}:{filter_hash}` | 조건 검색 결과 (텍스트 포함) | 1시간 | 첫 요청 시 (lazy) |
| `cache:patterns:{ticker}:{YYYY-MM-DD}` | [supply-analysis.md §7](supply-analysis.md) 과거 패턴 유사도 Top 3 결과 | 24시간 | Deep Dive 첫 요청 시 (lazy) |

캐시 키 갱신은 §5.6 단계에서 일괄 수행한다. 키 만료는 PostgreSQL 원본을 진실 원천(source of truth)으로 두고, 텍스트는 백오프 조회 시 [scoring-signals.md §1~§4](scoring-signals.md) 템플릿으로 재생성한다.

---

## 7. 거래일 캘린더 및 "최신 거래일" 결정

API 요청에 `date` 파라미터가 없거나 오늘이 휴장일·주말일 때 화면이 무엇을 표시할지 결정하는 규칙.

### 7.1 거래일 캘린더
- KRX 영업일 정보를 **부팅 시 + 매일 06:00 `master_sync`** 시점에 캐시한다.
- 캐시 형태: 정렬된 `Set[date]` (Redis: `cache:trading_days:{YYYY}` JSON 배열, TTL 1년)
- 라이브러리: `pykrx.stock.get_market_ohlcv` 호출 시 자동 영업일 필터링되므로 KRX 거래일을 역추출하거나, `pandas_market_calendars` 의 `XKRX` 캘린더 사용 가능

### 7.2 `latest_trading_day(now)` 함수
화면이 표시할 기준 거래일을 결정한다.

```python
def latest_trading_day(now: datetime) -> date:
    """
    now 시각 기준으로 화면이 표시할 기준 거래일.
    - 평일 18:00 이후 → 오늘
    - 평일 18:00 이전 (장중·잠정 단계) → 오늘 (단, 잠정 데이터)
    - 주말·공휴일 → 직전 거래일
    """
    today = now.date()
    if is_trading_day(today):
        return today
    # 휴장일이면 직전 거래일 탐색 (최대 7일 룩백)
    for offset in range(1, 8):
        candidate = today - timedelta(days=offset)
        if is_trading_day(candidate):
            return candidate
    raise RuntimeError("최근 7일 내 거래일을 찾을 수 없음")
```

### 7.3 API 동작
- 모든 API 응답의 `date` 필드는 §7.2 결과를 기본값으로 사용한다.
- 클라이언트가 `?date=YYYY-MM-DD` 쿼리로 명시 지정 가능. 단, 휴장일 지정 시 422 에러 반환.
- [dashboard-layout.md §0.1 Header](../visualization/dashboard-layout.md)의 마감 상태 배지(`live`/`pending`/`confirmed`)는 다음 규칙으로 결정:

| 시각 (KST) | 거래일 여부 | 배지 |
|---|---|---|
| 09:00–15:30 | 거래일 | `live` (펄스) |
| 15:30–18:00 | 거래일 | `pending` (잠정) |
| 18:00 이후 또는 휴장일 | — | `confirmed` |

---

## 8. 초기 3년치 백필 (First-time Backfill)

신규 배포 시 또는 DB 초기화 후, Archive 통계와 패턴 유사도가 정상 동작하려면 **과거 3년치(약 750거래일) 데이터**가 필요하다.

### 8.1 백필 스크립트 (`scripts/backfill.py`)
별도 일회성 명령으로 실행한다 (APScheduler 트리거 X). 운영 중 재실행 시 멱등(idempotent)해야 한다.

```python
def backfill(start_date: date, end_date: date):
    # 1. stock_master 동기화 (현재 상장 + 상장폐지 종목 모두)
    sync_stock_master(include_delisted=True)
    
    # 2. 일자 단위 순차 처리 (메모리 보호)
    for d in trading_days_between(start_date, end_date):
        # 2-1. KRX에서 일별 OHLCV+수급 일괄 조회
        df = krx_adapter.fetch_daily(d)
        # 2-2. 전처리 + market_raw_data 적재 (Upsert)
        df = preprocess(df)
        upsert_raw(df)
    
    # 3. 종목별 시계열 지표 계산 (전체 ticker 순회)
    for ticker in active_tickers():
        compute_indicators_full_history(ticker, start_date, end_date)
        # → ma_5/20/60/120, sfi_*, dominance_*, quadrant, avg_cost_*, defense_status,
        #    type, type_intensity, priority_score 모두 산출 후 market_indicators Upsert
    
    # 4. ma_events 일괄 감지 (§6 supply-analysis.md)
    detect_all_ma_events(start_date, end_date)
    
    # 5. market_summary 일자별 재계산
    for d in trading_days_between(start_date, end_date):
        compute_market_summary(d)
    
    # 6. archive_pattern_stats 4종 1회 계산 (as_of_date = end_date)
    for type_code in ['A', 'B', 'C', 'D']:
        upsert_archive_stats(type_code, end_date)
```

### 8.2 권장 백필 범위
- **Archive 통계 표본 확보**: 최소 3년 (`ARCHIVE_HISTORY_YEARS = 3`)
- **패턴 유사도 후보 풀**: 동일 3년
- **이동평균선**: 최소 120거래일 (`ma_120` 산출 위해)
- → **end_date - 3년 1개월** 정도를 안전 시작일로 권장

### 8.3 실행 가이드
```bash
# 환경변수 설정 후
python -m scripts.backfill --start 2022-05-01 --end 2025-05-01
```
실행 시간 예상: ~2,500종목 × 750거래일 = 1.8M 행. KRX API rate limit 고려해 약 1~2시간.

---

## 9. 환경 변수 및 비밀 관리

- DB·Redis·KRX API 자격 증명은 모두 환경 변수로만 관리한다. 코드에 하드코딩 금지.
- 표준 변수명:
  - `DATABASE_URL`, `REDIS_URL`
  - `KRX_API_KEY` (필요 시), `FDR_USE_CACHE` (불필요한 외부 호출 방지)
- `.env`는 `.gitignore`에 포함하며 배포 환경에서는 플랫폼(예: Railway) 환경변수에 등록한다.

---

## 10. 검증 체크리스트

LLM이 이 파일에 따라 구현한 후, 다음 자체 검증을 수행한다.

- [ ] APScheduler가 8개 시점(`master_sync` 1회 + 일배치 7개)을 모두 등록했는가?
- [ ] 휴장일에 일배치 트리거는 자동 스킵되지만 `master_sync`는 정상 실행되는가?
- [ ] `master_sync` 가 `stock_master`에 신규/변경/상장폐지를 모두 반영하는가? (상장폐지는 soft-delete)
- [ ] `index_adapter`가 `market_index`에 매일 KOSPI·KOSDAQ·USD/KRW를 적재하는가?
- [ ] §7.2 `latest_trading_day()`가 토·일·공휴일에 정확히 직전 거래일을 반환하는가?
- [ ] §7.3 마감 상태 배지가 시각·휴장일 조건에 따라 정확히 분기되는가?
- [ ] §8 `scripts/backfill.py`가 멱등이며 (재실행 시 중복 적재 없음) 3년치 일괄 처리 가능한가?
- [ ] 모든 적재 데이터가 [data-schema.md §1](data-schema.md) snake_case 표준 컬럼으로 변환되었는가?
- [ ] `ticker`가 6자리 0 패딩 문자열로 저장되는가?
- [ ] `(date, ticker)` 복합 PK가 정의되어 있고 Upsert가 정상 동작하는가?
- [ ] 18:00 트리거가 `supply-analysis → screening-rules → scoring-signals → Redis 갱신` 순으로 실행되는가?
- [ ] `cache:indicators:{date}`에 scoring-signals.md §7의 텍스트 필드가 함께 들어가는가?
- [ ] DB·Redis·API 자격 증명이 코드에 하드코딩되어 있지 않은가?
