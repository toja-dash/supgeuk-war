---
name: data-pipeline
description: 수급전쟁 데이터 수집·전처리·배포 파이프라인 규칙. KRX 정보데이터시스템과 FinanceDataReader 연동 및 장중 5회·15:30·18:00 갱신 스케줄을 정의한다.
type: analysis-rule
depends-on: ./data-schema.md (저장 대상 테이블)
---

# Data Pipeline Rules

본 문서는 데이터 수집과 갱신 스케줄을 정의한다.
저장될 테이블 구조는 [data-schema.md](./data-schema.md) 참조.

---

## 1. 데이터 소스

### 1.1 우선순위

| 순위 | 소스 | 용도 | 인증 |
|---|---|---|---|
| 1 | KRX 정보데이터시스템 (data.krx.co.kr) | 투자자별 매매동향 (확정치) | OTP 토큰 |
| 2 | FinanceDataReader (FDR) | OHLCV · 종목 마스터 | 불필요 |
| 3 | 더미 CSV (`/data/dummy/`) | 개발·심사 환경 fallback | 불필요 |

### 1.2 fallback 규칙

- 1순위 실패 시 2순위로 자동 전환
- 1·2순위 모두 실패 시 3순위 더미 데이터 사용 (개발/심사용)
- 어떤 소스를 사용했는지 `raw.fetch_log` 테이블에 기록

---

## 2. 수집 스케줄

| 시각 (KST) | 작업 | 데이터 상태 (`status` 컬럼) | 대상 |
|---|---|---|---|
| 09:00 | 전일 데이터 보존 (no-op) | `confirmed` | — |
| 09:30 | 장중 스냅샷 1 | `live` | 종목별 분봉·일중 누적 |
| 11:00 | 장중 스냅샷 2 | `live` | 동일 |
| 12:30 | 장중 스냅샷 3 | `live` | 동일 |
| 14:00 | 장중 스냅샷 4 | `live` | 동일 |
| 15:20 | 장중 스냅샷 5 | `live` | 동일 |
| 15:30 | 장 마감 직후 잠정치 | `pending` | 일별 OHLCV + 잠정 투자자별 |
| 18:00 | KRX 최종 확정 데이터 | `confirmed` | 일별 OHLCV + 확정 투자자별 |

**18:00 confirmed 데이터가 도달하면**:
1. `derived.daily_metrics` 재계산
2. `aggregated.signal_classification` 재분류
3. 장중 `live` 레코드는 보존 (히스토리)

### 2.1 cron 표현식

```
30 9 * * 1-5    # 09:30 평일
0 11 * * 1-5
30 12 * * 1-5
0 14 * * 1-5
20 15 * * 1-5
30 15 * * 1-5
0 18 * * 1-5
```

휴장일은 KRX 휴장일 캘린더로 자동 스킵 (FDR `fdr.market_calendar` 활용).

---

## 3. 수집 대상 데이터

### 3.1 일별 OHLCV (FDR)

| 항목 | 설명 |
|---|---|
| 대상 | KOSPI + KOSDAQ 전 종목 (~2,500개) |
| 조회 함수 | `fdr.DataReader('005930', start, end)` |
| 컬럼 | Date, Open, High, Low, Close, Volume, Change |
| 빈도 | 일 1회 (18:00) |
| 저장 | `raw.daily_price` |

### 3.2 일별 투자자별 매매동향 (KRX)

| 항목 | 설명 |
|---|---|
| 엔드포인트 | `http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd` |
| bld | `dbms/MDC/STAT/standard/MDCSTAT02301` (개별종목 투자자별) |
| 파라미터 | `mktId`, `trdDd`, `isuCd`, `inqTpCd`, `askBid`, `trdVolVal` |
| 응답 | 개인·외국인합계·기관합계·기타법인 4구분 순매수(원/주) |
| 빈도 | 일 1회 (18:00 confirmed), 15:30 (pending) |
| 저장 | `raw.daily_investor_flow` |

### 3.3 시장 메타 데이터

| 항목 | 설명 |
|---|---|
| KOSPI 지수 | FDR `KS11` |
| KOSDAQ 지수 | FDR `KQ11` |
| 환율 | FDR `USD/KRW` |
| 빈도 | 일 1회 (18:00) |
| 저장 | `raw.daily_market_meta` |

### 3.4 종목 마스터 (정적)

| 항목 | 설명 |
|---|---|
| 종목코드·종목명·시장구분·섹터 | FDR `StockListing('KRX')` |
| 빈도 | 주 1회 (월요일 06:00) |
| 저장 | `raw.stock_master` |

---

## 4. 전처리 규칙

수집된 raw 데이터는 다음 순서로 derived 테이블에 적재된다.

### 4.1 결측치 처리

| 컬럼 | 결측 시 처리 |
|---|---|
| OHLCV | 거래정지 종목은 직전 거래일 종가로 채움(`ffill`), 단 거래량은 0 |
| 투자자별 순매수 | 0으로 채움 |
| 섹터 | "미분류" 라벨 |

### 4.2 단위 통일

| 항목 | 단위 |
|---|---|
| 가격 | 원 (정수) |
| 순매수 금액 | 원 (정수, BIGINT) |
| 거래량·순매수 수량 | 주 (정수) |
| SFI · 주도력 | 백분율 (소수점 2자리) |
| 등락률 | 백분율 (소수점 2자리) |

### 4.3 종목코드 매핑

- 기준 코드: 6자리 ISIN 단축코드 (예: `005930`)
- KRX 응답이 12자리 ISIN(`KR7005930003`)일 경우 4번째~9번째 자리 추출
- FDR과 KRX 코드 불일치 시 `raw.stock_master`의 6자리 코드를 단일 출처로 사용

### 4.4 데이터 검증

다음 조건 위반 시 `raw.fetch_log`에 ERROR 기록 후 적재 중단:

- 일별 종목 수가 직전 거래일 ±5% 초과로 변동
- 개인 + 기관 + 외국인 + 기타 순매수 합계 ≠ 0 (오차 1만원 이내 허용)
- OHLC 무결성 위반 (Low > High, Open/Close가 [Low, High] 범위 밖)

---

## 5. 적재 전략

### 5.1 멱등성 (Idempotency)

- 모든 적재는 `(date, ticker)` 기본키 기준 `UPSERT`
- 동일 날짜 재실행 시 덮어쓰기 (status 업그레이드만 허용: live → pending → confirmed)
- 다운그레이드(`confirmed` → `pending`) 금지

### 5.2 트랜잭션 단위

- 1일치 데이터는 1개 트랜잭션으로 묶어서 적재
- 부분 실패 시 전체 롤백 후 `raw.fetch_log`에 ERROR

### 5.3 히스토리 보존

- 장중 5회 스냅샷은 `raw.intraday_snapshot` 별도 테이블 (날짜+시각 PK)
- 18:00 confirmed 적재 시 장중 데이터는 삭제하지 않음

---

## 6. 후속 잡 트리거

raw 데이터 적재 완료 시 다음 잡을 순차 트리거:

```
[18:00 confirmed 적재 완료]
   → [derived.daily_metrics 재계산]   (supply-analysis.md 적용)
   → [aggregated.signal_classification 재분류]  (screening-rules.md 적용)
   → [aggregated.market_brief 텍스트 생성]      (scoring-signals.md 적용)
   → [캐시 무효화 알림]
   → [FE에 WebSocket 푸시 (확장)]
```

각 후속 잡은 자체적으로 실패 시 재시도 3회, 알람 발송.

---

## 7. 더미 데이터 fallback (개발·심사용)

심사자가 별도 키 없이 확인 가능해야 하므로, KRX 인증 실패 시 `/data/dummy/` 사용.

### 7.1 더미 파일 구조

```
data/dummy/
├── daily_price.csv              ← 최근 60거래일 OHLCV (KOSPI200 + KOSDAQ150)
├── daily_investor_flow.csv      ← 동일 기간 투자자별 순매수
├── daily_market_meta.csv        ← KOSPI · KOSDAQ · 환율
├── stock_master.csv             ← 종목 마스터
└── archive_patterns.csv         ← 과거 3년 Type별 발생 사례 (Archive 페이지용)
```

### 7.2 fallback 동작

1. 환경변수 `USE_DUMMY_DATA=true` 면 무조건 더미 사용
2. KRX/FDR 실패 시 자동 더미 전환 + 경고 배너 노출
3. 더미 사용 시 헤더 우측에 "🟡 DEMO DATA" 배지 표시

### 7.3 더미 CSV 컬럼 스키마

각 CSV는 `data-schema.md`의 raw 테이블 컬럼명과 **정확히 일치**해야 한다.
컬럼 순서·헤더·타입은 다음을 따른다.

#### `daily_price.csv`

```csv
trade_date,ticker,open,high,low,close,volume,value,change_pct,status
2026-05-06,005930,80360,82000,78720,82000,12000000,983040000000,1.20,confirmed
2026-05-06,247540,108000,109000,104500,105000,2400000,254100000000,-4.50,confirmed
2026-05-06,000660,142000,145000,141500,144000,1800000,259200000000,2.10,confirmed
```

- 행 수: KOSPI 200 + KOSDAQ 150 = 350종목 × 60거래일 = 21,000행
- 거래일: 직전 60거래일 (휴장일 제외)
- ticker는 6자리 0패딩 문자열

#### `daily_investor_flow.csv`

```csv
trade_date,ticker,indiv_net_value,inst_net_value,foreign_net_value,etc_net_value,indiv_net_volume,inst_net_volume,foreign_net_volume,etc_net_volume,status
2026-05-06,005930,-50000000000,15000000000,30000000000,5000000000,-610000,183000,366000,61000,confirmed
2026-05-06,247540,80000000000,-25000000000,-50000000000,-5000000000,762000,-238000,-476000,-48000,confirmed
```

- 부호: 매수 양수 / 매도 음수
- 4주체 합 ≈ 0 (오차 1만원 이내)

#### `daily_market_meta.csv`

```csv
trade_date,kospi_close,kospi_change_pct,kosdaq_close,kosdaq_change_pct,usdkrw
2026-05-06,2654.21,1.20,842.11,-0.50,1350.20
```

#### `stock_master.csv`

```csv
ticker,name,market,sector,listing_date,is_active
005930,삼성전자,KOSPI,반도체,1975-06-11,true
000660,SK하이닉스,KOSPI,반도체,1996-12-26,true
247540,에코프로,KOSDAQ,2차전지,2007-07-04,true
```

- sector는 다음 11개 중 하나: `반도체 / 2차전지 / 자동차 / 인터넷 / 바이오 / 화학 / 금융 / 조선 / 철강 / 게임 / 기타`
- KOSPI 200 + KOSDAQ 150 = 350행

#### `archive_patterns.csv`

```csv
occurrence_date,ticker,name,sector,signal_type,inst_sfi,foreign_sfi,return_5d,return_20d,is_win_5d,is_win_20d
2025-10-12,005930,삼성전자,반도체,B,4.2,8.1,2.1,8.5,true,true
2025-08-04,005380,현대차,자동차,B,3.5,5.5,4.5,12.0,true,true
2024-12-18,035420,NAVER,인터넷,A,-5.1,-4.2,-1.2,-5.4,false,false
```

- 행 수: Type별 최소 300건 × 4 = 1,200행 이상 (3년치 시뮬레이션)
- `is_win_5d` = `return_5d > 0`, `is_win_20d` = `return_20d > 0`

### 7.4 더미 데이터 생성 스크립트

LLM은 다음 의사코드로 더미 데이터를 생성한다.

```python
# backend/app/jobs/seed_dummy.py
import pandas as pd, numpy as np
from datetime import date, timedelta

# 1. 종목 마스터 (350개)
stocks = [
    ("005930", "삼성전자", "KOSPI", "반도체"),
    ("000660", "SK하이닉스", "KOSPI", "반도체"),
    ("247540", "에코프로", "KOSDAQ", "2차전지"),
    # ... 350개까지 (시안의 종목명 + 자동 생성)
]

# 2. 거래일 60일치 (영업일만)
end = date.today()
dates = pd.bdate_range(end=end, periods=60).date

# 3. OHLCV 시뮬레이션 (geometric brownian motion)
for ticker, name, market, sector in stocks:
    base_price = np.random.uniform(10000, 200000)
    returns = np.random.normal(0, 0.02, len(dates))
    prices = base_price * np.exp(np.cumsum(returns))
    # OHLC 생성 + value = price × volume

# 4. 투자자별 순매수 (3주체 합 ≈ 0 보장)
for ticker, ...:
    indiv = np.random.normal(0, 5e9, len(dates))
    inst  = np.random.normal(0, 3e9, len(dates))
    foreign = -(indiv + inst) + np.random.normal(0, 1e9, len(dates))

# 5. archive_patterns.csv (Type별 분포)
# 과거 3년 일자에서 Type 조건 만족하는 가상 시점 무작위 생성
# 수익률은 Type별 사전 평균(A: -2~+1%, B: 0~+5% 등) 기준 정규분포

# 6. CSV 저장 → data/dummy/*.csv
```

생성된 더미는 git에 커밋해서 심사자가 별도 작업 없이 사용 가능하게 한다.

---

## 8. 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `KRX_OTP_URL` | `http://data.krx.co.kr/comm/fileDn/GenerateOTP/generate.cmd` | OTP 발급 |
| `KRX_DOWNLOAD_URL` | `http://data.krx.co.kr/comm/fileDn/download_csv/download.cmd` | CSV 다운 |
| `DB_URL` | `sqlite:///./supgeuk.db` | DB 연결 문자열 |
| `USE_DUMMY_DATA` | `false` | 더미 강제 사용 |
| `TIMEZONE` | `Asia/Seoul` | 모든 시각 처리 기준 |

---

## 9. 오류 처리 정책

| 오류 유형 | 정책 |
|---|---|
| 네트워크 타임아웃 | 지수 백오프 재시도 (1s → 2s → 4s, 최대 3회) |
| KRX 응답 형식 변경 | 즉시 `raw.fetch_log`에 ERROR + 더미 fallback |
| DB 연결 실패 | 5초 대기 후 1회 재시도, 실패 시 잡 종료 |
| 부분 데이터 결손 | 결손 종목만 스킵, 나머지 적재, WARN 로깅 |

---

## 10. 로그 스키마 (`raw.fetch_log`)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `fetched_at` | TIMESTAMPTZ | 수집 시각 |
| `source` | TEXT | KRX / FDR / DUMMY |
| `target_table` | TEXT | 적재 대상 |
| `target_date` | DATE | 데이터 일자 |
| `status` | TEXT | OK / WARN / ERROR |
| `row_count` | INTEGER | 적재 행 수 |
| `message` | TEXT | 상세 메시지 |

---

## 11. archive 테이블 초기 백필

`archive.pattern_outcomes`, `archive.pattern_summary`, `archive.similarity_index`는 **과거 3년치**가 누적되어야 의미가 있다. 1회성 백필 잡으로 채운다.

### 11.1 백필 트리거

| 시점 | 동작 |
|---|---|
| 최초 배포 시 1회 | 더미 / KRX 과거 3년치 일괄 백필 |
| 매일 18:00 confirmed 적재 후 | 당일치만 incremental 추가 |

### 11.2 `archive.pattern_outcomes` 백필

```python
# backend/app/jobs/backfill_archive.py
def backfill_pattern_outcomes(start_date, end_date):
    # 1. 해당 기간의 derived.daily_metrics + signal_classification 조인
    df = query_signals(start_date, end_date)

    # 2. 각 발생 행마다 +5일·+20일 후 종가 룩업
    for row in df.itertuples():
        future_5d = lookup_close(row.ticker, row.trade_date + 5_business_days)
        future_20d = lookup_close(row.ticker, row.trade_date + 20_business_days)
        return_5d = (future_5d - row.close) / row.close * 100
        return_20d = (future_20d - row.close) / row.close * 100
        upsert_pattern_outcome(...)
```

미래 데이터가 부족한 최근 20거래일 발생분은 백필 대상에서 제외 (룩어헤드 방지).

### 11.3 `archive.pattern_summary` 갱신

매일 야간 배치 (00:30):

```sql
INSERT INTO archive.pattern_summary (
    signal_type, total_count_3y, avg_return_5d, win_rate_5d,
    avg_return_20d, win_rate_20d, last_updated
)
SELECT
    signal_type,
    COUNT(*) AS total_count_3y,
    AVG(return_5d) AS avg_return_5d,
    AVG(CASE WHEN is_win_5d THEN 1.0 ELSE 0.0 END) * 100 AS win_rate_5d,
    AVG(return_20d) AS avg_return_20d,
    AVG(CASE WHEN is_win_20d THEN 1.0 ELSE 0.0 END) * 100 AS win_rate_20d,
    NOW()
FROM archive.pattern_outcomes
WHERE occurrence_date >= NOW() - INTERVAL '3 years'
  AND signal_type IS NOT NULL
GROUP BY signal_type
ON CONFLICT (signal_type) DO UPDATE SET ...;
```

### 11.4 `archive.similarity_index` 갱신

매일 야간 배치 (01:00):

```python
def update_similarity_index(target_date):
    # 1. target_date의 모든 종목에 대해 5일 윈도우 feature_vector 추출
    for ticker in tickers:
        vector = build_feature_vector(ticker, target_date)
        # 2. JSON 직렬화 후 INSERT
        upsert(ticker, target_date - 4d, target_date, vector)
```

3년치 누적 시 약 50~100만 행. 인덱스 검색은 in-memory로 충분히 빠름.

### 11.5 더미 모드 백필

`USE_DUMMY_DATA=true`이면 §11.2~11.4 대신 `data/dummy/archive_patterns.csv`를 그대로 `archive.pattern_outcomes`에 적재 후, §11.3 SQL만 1회 실행해 summary 생성.

---

## 12. 구현 체크리스트

- [ ] FDR로 OHLCV 60일치 수집 가능
- [ ] KRX 또는 더미로 투자자별 순매수 수집 가능
- [ ] cron 7개 시각이 모두 트리거됨
- [ ] 18:00 confirmed 적재 시 후속 잡 자동 실행
- [ ] `USE_DUMMY_DATA=true` 시 외부 호출 없이 동작
- [ ] 더미 CSV 5개가 `data/dummy/`에 존재
- [ ] 더미 시드 스크립트 1회 실행으로 모든 raw 테이블 채워짐
- [ ] archive 백필 1회 실행으로 통계 카드 데이터 표시 가능
- [ ] `raw.fetch_log`에 모든 수집 이력 남음
