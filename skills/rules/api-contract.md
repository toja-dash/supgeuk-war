---
name: api-contract
description: 수급전쟁 백엔드 API 엔드포인트 명세. FE 페이지별로 호출하는 13개 엔드포인트의 path, query, response JSON 스키마를 정의한다. FE/BE 간 단일 출처.
type: analysis-rule
depends-on: ./data-schema.md (응답 데이터 출처), ./screening-rules.md (Type 정의)
---

# API Contract

본 문서는 FastAPI 백엔드와 React 프론트엔드 간의 **단일 계약**이다.
모든 응답은 JSON, 모든 요청은 GET (조회 전용 서비스).

---

## 0. 공통 규약

### 0.1 Base URL

| 환경 | URL |
|---|---|
| 개발 | `http://localhost:8000` |
| 배포 | `https://api.supgeuk-war.example` (Railway) |

FE는 환경변수 `VITE_API_BASE`로 받는다.

### 0.2 공통 헤더

| 요청 | 응답 |
|---|---|
| `Accept: application/json` | `Content-Type: application/json; charset=utf-8` |
| (인증 없음 — 공개 읽기 전용) | `Cache-Control: public, max-age=300` (대부분 5분 캐시) |

### 0.3 공통 응답 envelope

성공:
```json
{ "ok": true, "data": <엔드포인트별 페이로드> }
```

실패:
```json
{ "ok": false, "error": { "code": "STRING", "message": "사용자용 메시지" } }
```

### 0.4 공통 타입 약속

| 필드 | 형식 | 예 |
|---|---|---|
| 날짜 | `YYYY-MM-DD` | `"2026-05-06"` |
| 시각 | ISO 8601 (KST) | `"2026-05-06T18:00:00+09:00"` |
| 종목코드 | 6자리 문자열 | `"005930"` |
| 백분율 | `number` (소수 2자리) | `5.21` |
| 가격 | `integer` (원) | `82000` |
| 큰 금액 | `integer` (원) | `3200000000000` |
| Type | `"A" \| "B" \| "C" \| "D" \| null` | |
| `defense_state` | `"safe" \| "caution_yellow" \| "caution_orange" \| "danger" \| null` | |
| `dominant_subject` | `"개인" \| "기관" \| "외국인"` | |
| 데이터 상태 | `"live" \| "pending" \| "confirmed"` | |

### 0.5 에러 코드

| code | 의미 | HTTP |
|---|---|---|
| `NOT_FOUND` | 종목·날짜 없음 | 404 |
| `INVALID_PARAM` | 쿼리 파라미터 오류 | 400 |
| `NO_DATA` | 데이터 미산출 (휴장일 등) | 422 |
| `UPSTREAM_ERROR` | KRX/FDR 실패 | 502 |
| `INTERNAL` | 기타 | 500 |

### 0.6 페이지 ↔ 엔드포인트 매핑

| 페이지 | 호출 엔드포인트 |
|---|---|
| (공통) | §1 health |
| War Room | §2 brief, §3 sectors, §4 dominance, §5 signals |
| Screener | §5 signals (notable만), §6 screener |
| Deep Dive | §7 stock, §8 candles, §9 flows, §10 ma-events, §11 similar-patterns |
| Archive | §12 summary, §13 cases |

총 **13개 엔드포인트**. 모두 GET.

---

## 1. `GET /api/v1/health`

서비스 상태 확인 + 데이터 갱신 시각.

**쿼리**: 없음.

**응답 data**:
```json
{
  "status": "ok",
  "data_status": "confirmed",
  "as_of": "2026-05-06T18:00:00+09:00",
  "dummy_mode": false
}
```

| 필드 | 설명 |
|---|---|
| `status` | "ok" / "degraded" / "down" |
| `data_status` | 최신 데이터 상태 |
| `as_of` | 최신 데이터 갱신 시각 |
| `dummy_mode` | true면 헤더에 "DEMO DATA" 배지 노출 |

---

## 2. `GET /api/v1/market/brief`

War Room 상단 Market Brief 배너.

**쿼리**:
| 파라미터 | 타입 | 기본 | 설명 |
|---|---|---|---|
| `date` | `YYYY-MM-DD` | 최신 confirmed 날짜 | 조회 일자 |

**응답 data**:
```json
{
  "trade_date": "2026-05-06",
  "combined_brief": "오늘 코스피는 **외국인**의 **반도체** **집중 매수**로 상승 마감했으나, 코스닥은 **2차전지** **쌍끌이 매도**로 하락했습니다.",
  "kospi_summary": "외국인의 반도체 집중 매수로 상승 마감",
  "kosdaq_summary": "2차전지 쌍끌이 매도로 하락",
  "dominant_sector": "반도체",
  "signal_counts": { "A": 12, "B": 28, "C": 45, "D": 31 },
  "kospi_change_pct": 1.2,
  "kosdaq_change_pct": -0.5,
  "usdkrw": 1350.20
}
```

출처: `aggregated.market_brief` + `raw.daily_market_meta`.
`combined_brief`의 `**...**` 강조는 FE에서 `<strong>`으로 렌더.

---

## 3. `GET /api/v1/market/sectors`

War Room 전술 레이더 맵 (버블 차트).

**쿼리**:
| 파라미터 | 타입 | 기본 |
|---|---|---|
| `date` | `YYYY-MM-DD` | 최신 confirmed |
| `min_value` | integer | `100000000000` (1천억) |

**응답 data**:
```json
{
  "trade_date": "2026-05-06",
  "sectors": [
    {
      "sector": "반도체",
      "total_value": 3200000000000,
      "inst_sfi_avg": 5.2,
      "foreign_sfi_avg": 8.1,
      "dominant_subject": "외국인",
      "dominant_type": "C",
      "stock_count": 45
    }
  ]
}
```

`sectors`는 `total_value` 내림차순. `min_value` 미만 섹터는 제외.
출처: `aggregated.sector_flows`.

---

## 4. `GET /api/v1/market/dominance`

War Room 시장 3파전 주도력 (Diverging Bar).

**쿼리**:
| 파라미터 | 타입 | 기본 |
|---|---|---|
| `date` | `YYYY-MM-DD` | 최신 confirmed |

**응답 data**:
```json
{
  "trade_date": "2026-05-06",
  "markets": [
    { "market": "KOSPI",  "indiv": -32.4, "inst":  45.1, "foreign":  22.5 },
    { "market": "KOSDAQ", "indiv": -18.0, "inst": -22.3, "foreign":  40.3 }
  ]
}
```

각 시장 내 3주체 dominance의 거래대금 가중평균. 합산 절대값 ≈ 100.

---

## 5. `GET /api/v1/market/signals`

War Room "오늘의 시그널 요약" + "오늘의 주목 종목".

**쿼리**:
| 파라미터 | 타입 | 기본 |
|---|---|---|
| `date` | `YYYY-MM-DD` | 최신 confirmed |
| `top_k` | integer | `3` (Type별 상위 N개) |

**응답 data**:
```json
{
  "trade_date": "2026-05-06",
  "counts": { "A": 12, "B": 28, "C": 45, "D": 31 },
  "notable": {
    "A": [
      {
        "ticker": "247540",
        "name": "에코프로",
        "market": "KOSDAQ",
        "sector": "2차전지",
        "close": 105000,
        "change_pct": -4.5,
        "signal_type": "A",
        "priority_score": 18.4
      }
    ],
    "B": [...],
    "C": [...],
    "D": [...]
  }
}
```

각 Type 배열은 정확히 `top_k`개 (부족하면 그만큼).
정렬: `priority_score` 내림차순.

---

## 6. `GET /api/v1/screener`

Screener 페이지 종목 테이블.

**쿼리**:
| 파라미터 | 타입 | 기본 | 설명 |
|---|---|---|---|
| `date` | `YYYY-MM-DD` | 최신 confirmed | |
| `type` | `A\|B\|C\|D\|all` | `all` | Type 필터 |
| `defense_state` | `safe\|caution_yellow\|caution_orange\|danger\|all` | `all` | |
| `inst_sfi_min` | number | `-10` | 기관 SFI 하한 |
| `foreign_sfi_min` | number | `-10` | 외인 SFI 하한 |
| `sector` | string | `null` | 섹터 필터 (선택) |
| `sort` | `priority_score\|change_pct\|inst_sfi\|foreign_sfi` | `priority_score` | |
| `order` | `asc\|desc` | `desc` | |
| `page` | integer | `1` | |
| `page_size` | integer | `20` | (최대 100) |

**응답 data**:
```json
{
  "trade_date": "2026-05-06",
  "filters": { "type": "all", "defense_state": "all", "inst_sfi_min": -10, "foreign_sfi_min": -10 },
  "total": 127,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "ticker": "005930",
      "name": "삼성전자",
      "market": "KOSPI",
      "sector": "반도체",
      "close": 82000,
      "change_pct": 1.2,
      "signal_type": "B",
      "defense_state": "safe",
      "inst_sfi": 5.5,
      "foreign_sfi": 9.1,
      "indiv_dominance": -80.0,
      "inst_dominance": 30.0,
      "foreign_dominance": 50.0,
      "priority_score": 15.2
    }
  ]
}
```

---

## 7. `GET /api/v1/stocks/{ticker}`

Deep Dive 종목 헤더 + AI 진단.

**Path**: `ticker` = 6자리.

**쿼리**:
| 파라미터 | 타입 | 기본 |
|---|---|---|
| `date` | `YYYY-MM-DD` | 최신 confirmed |

**응답 data**:
```json
{
  "ticker": "005930",
  "name": "삼성전자",
  "market": "KOSPI",
  "sector": "반도체",
  "trade_date": "2026-05-06",
  "price": {
    "close": 82000,
    "change_pct": 1.2,
    "open": 80360,
    "high_1d": 82000,
    "low_1d": 78720,
    "high_1y": 106000,
    "low_1y": 49200,
    "volume": 37782672,
    "value": 3070000000000
  },
  "metrics": {
    "inst_sfi": 5.5,
    "foreign_sfi": 9.1,
    "indiv_dominance": -80.0,
    "inst_dominance": 30.0,
    "foreign_dominance": 50.0,
    "inst_avg_price": 78500.50,
    "foreign_avg_price": 80200.30,
    "quadrant": 1
  },
  "signal_type": "B",
  "defense_state": "safe",
  "insight_text": "삼성전자는 외국인·기관 동반 매수(외인 SFI +9.1, 기관 SFI +5.5) 속에 개인은 매도 중인 누적 매집 패턴입니다. 안전 구간으로 평단선 대비 +2.2%."
}
```

---

## 8. `GET /api/v1/stocks/{ticker}/candles`

Deep Dive 일별 시세 캔들차트 + 평단선 오버레이.

**쿼리**:
| 파라미터 | 타입 | 기본 |
|---|---|---|
| `period` | `1M\|3M\|6M\|1Y` | `3M` |

**응답 data**:
```json
{
  "ticker": "005930",
  "period": "3M",
  "candles": [
    {
      "date": "2026-02-06",
      "open": 75000,
      "high": 76200,
      "low": 74500,
      "close": 75800,
      "volume": 12500000,
      "change_pct": 0.5
    }
  ],
  "avg_lines": {
    "inst": 78500.50,
    "foreign": 80200.30
  }
}
```

평단선이 NULL이면 `avg_lines.{inst|foreign}` = `null`.
캔들 정렬: 날짜 오름차순.

---

## 9. `GET /api/v1/stocks/{ticker}/flows`

Deep Dive 최근 N일 수급 순매수 (Grouped Bar).

**쿼리**:
| 파라미터 | 타입 | 기본 |
|---|---|---|
| `days` | integer | `7` (최대 30) |

**응답 data**:
```json
{
  "ticker": "005930",
  "days": [
    {
      "date": "2026-04-30",
      "indiv_net_value": -25000000000,
      "inst_net_value": 15000000000,
      "foreign_net_value": 10000000000
    }
  ]
}
```

날짜 오름차순.

---

## 10. `GET /api/v1/stocks/{ticker}/ma-events`

Deep Dive 주요 이동평균선 맥점.

**쿼리**:
| 파라미터 | 타입 | 기본 |
|---|---|---|
| `days` | integer | `30` (최근 N거래일 검색 윈도우) |
| `limit` | integer | `5` |

**응답 data**:
```json
{
  "ticker": "005930",
  "events": [
    {
      "date": "2026-04-22",
      "type": "golden_5_20",
      "label": "5일·20일선 골든크로스",
      "interpretation": "단기 추세선 상향 돌파, 단기 매수 우위 신호"
    }
  ]
}
```

`type` enum: `golden_5_20 | dead_5_20 | golden_20_60 | dead_20_60 | golden_60_120 | dead_60_120`.
정렬: 날짜 내림차순.

---

## 11. `GET /api/v1/stocks/{ticker}/similar-patterns`

Deep Dive 과거 패턴 유사도 Top 3.

**쿼리**:
| 파라미터 | 타입 | 기본 |
|---|---|---|
| `top_k` | integer | `3` (최대 10) |

**응답 data**:
```json
{
  "ticker": "005930",
  "as_of": "2026-05-06",
  "patterns": [
    {
      "window_start": "2025-11-08",
      "window_end": "2025-11-12",
      "similarity_pct": 90.2,
      "return_5d": 4.5,
      "return_20d": 12.0
    }
  ]
}
```

`similarity_pct` 내림차순.

---

## 12. `GET /api/v1/archive/summary`

Archive Type별 통계 카드.

**쿼리**: 없음 (4개 Type 모두 한 번에 반환).

**응답 data**:
```json
{
  "as_of": "2026-05-06",
  "summaries": [
    {
      "signal_type": "A",
      "label": "쌍끌이 설거지",
      "total_count_3y": 1428,
      "avg_return_5d": -2.1,
      "win_rate_5d": 38.0,
      "avg_return_20d": -4.5,
      "win_rate_20d": 31.0
    },
    {
      "signal_type": "B",
      "label": "개미 털기",
      "total_count_3y": 1428,
      "avg_return_5d": 3.4,
      "win_rate_5d": 62.0,
      "avg_return_20d": 8.1,
      "win_rate_20d": 71.0
    }
  ]
}
```

Type A·B·C·D 각 1행, 4행 고정. 출처: `archive.pattern_summary`.

---

## 13. `GET /api/v1/archive/cases`

Archive 과거 주요 발생 사례 테이블.

**쿼리**:
| 파라미터 | 타입 | 기본 |
|---|---|---|
| `type` | `A\|B\|C\|D` | (필수) |
| `sort` | `occurrence_date\|return_5d\|return_20d` | `occurrence_date` |
| `order` | `asc\|desc` | `desc` |
| `page` | integer | `1` |
| `page_size` | integer | `50` |

**응답 data**:
```json
{
  "type": "B",
  "total": 1428,
  "page": 1,
  "page_size": 50,
  "items": [
    {
      "occurrence_date": "2025-10-12",
      "ticker": "005930",
      "name": "삼성전자",
      "sector": "반도체",
      "inst_sfi": 4.2,
      "foreign_sfi": 8.1,
      "return_5d": 2.1,
      "return_20d": 8.5
    }
  ]
}
```

---

## 14. CORS·CSP

- CORS: `Access-Control-Allow-Origin: *` (공개 API)
- 메서드: `GET, OPTIONS` 만 허용
- FE 도메인: `https://supgeuk-war.vercel.app` 우선, 그 외도 허용

---

## 15. Rate Limit (확장 시)

1차 구현 범위 외. 필요 시 IP당 60 req/min.

---

## 16. OpenAPI 자동 생성

FastAPI는 `/docs` 에 Swagger UI를 자동 노출한다.
모든 응답 모델은 Pydantic으로 정의해 본 문서와 1:1 일치시킨다.

```python
# backend/app/schemas/market.py
class MarketBriefResponse(BaseModel):
    trade_date: date
    combined_brief: str
    kospi_summary: str
    kosdaq_summary: str
    dominant_sector: str
    signal_counts: dict[str, int]
    kospi_change_pct: float
    kosdaq_change_pct: float
    usdkrw: float
```

---

## 17. FE 호출 패턴 (TanStack Query 키 규약)

| 엔드포인트 | Query Key |
|---|---|
| `/health` | `['health']` |
| `/market/brief` | `['market', 'brief', date]` |
| `/market/sectors` | `['market', 'sectors', date]` |
| `/market/dominance` | `['market', 'dominance', date]` |
| `/market/signals` | `['market', 'signals', date]` |
| `/screener` | `['screener', filters]` |
| `/stocks/:t` | `['stock', ticker, date]` |
| `/stocks/:t/candles` | `['stock', ticker, 'candles', period]` |
| `/stocks/:t/flows` | `['stock', ticker, 'flows', days]` |
| `/stocks/:t/ma-events` | `['stock', ticker, 'ma']` |
| `/stocks/:t/similar-patterns` | `['stock', ticker, 'patterns']` |
| `/archive/summary` | `['archive', 'summary']` |
| `/archive/cases` | `['archive', 'cases', type, page]` |

`staleTime`: brief/signals/sectors/dominance = 5분, screener = 1분, candles/flows = 10분, archive = 1시간.

---

## 18. 구현 체크리스트

- [ ] 13개 엔드포인트 모두 200 응답
- [ ] 응답이 `{ ok, data }` 또는 `{ ok, error }` envelope
- [ ] `/docs` Swagger UI에서 본 명세와 일치
- [ ] CORS 동작 (FE 로컬 개발 환경에서 호출 가능)
- [ ] 휴장일 요청 시 `NO_DATA` 422
- [ ] 더미 모드일 때 `/health` 응답에 `dummy_mode: true`
