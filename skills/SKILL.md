---
name: building-supgeuk-war-dashboard
description: "수급전쟁(SUPGEUK WAR) 투자 대시보드 서비스를 구현한다. KRX 투자자별
  순매수·OHLCV 데이터를 수집·표준화하고, 기관SFI·외인SFI·3파전 수급 주도력·평단가
  방어선·이동평균선 맥점·과거 패턴 유사도를 계산하며, Type A~D 엇갈림 신호를
  자동 분류하고, War Room·Screener·Deep Dive·Archive 4개 화면으로 구성된 웹
  대시보드를 생성한다. 수급전쟁 서비스 구현, KRX 데이터 수집, 지표 계산, 신호 분류,
  UI 구현, 배포를 요청할 때 사용한다."
---

# 수급전쟁 (SUPGEUK WAR)

국내 주식 시장에서 개인투자자(개미)와 기관·외국인(큰손)의 수급 흐름을
당일 데이터 기반으로 시각화하는 투자 특화 대시보드 서비스를 구현한다.

장 마감 후 18:00 최종 확정된 수급 데이터를 기반으로,
오늘 하루 기관과 외국인이 어디서 어떻게 움직였는지 한눈에 보여주는
당일 수급 결산 현황판(War Room)이 핵심 컨셉이다.

---

## 기술 스택 및 구현 원칙

### 프론트엔드
- **React + TypeScript** 로 구현한다. JavaScript는 사용하지 않는다.
- 스타일은 **TailwindCSS** 만 사용한다. 별도 CSS 파일을 작성하지 않는다.
- 차트는 기본적으로 **Recharts** 로 구현한다. **예외: Deep Dive 캔들차트 1종에 한해 `lightweight-charts`(TradingView)를 사용한다** (Recharts가 캔들을 표준 지원하지 않음). 그 외 Chart.js, D3 등은 사용하지 않는다.
- 상태 관리는 **React Query** 로 서버 상태를 관리하고, 전역 클라이언트 상태는 **Zustand** 를 사용한다.
- 라우팅은 **React Router v6** 을 사용한다. 페이지는 War Room(`/`), Screener(`/screener`), Deep Dive(`/deep-dive/:ticker`), Archive(`/archive`) 4개다. War Room은 진입(`/`) 페이지이며 별도 alias 라우트는 두지 않는다.

### 백엔드
- **FastAPI (Python 3.11+)** 로 REST API를 구현한다.
- 데이터 처리는 **Pandas + Numpy** 를 사용한다.
- 유사 패턴 매칭은 **Cosine Similarity** 로 계산한다.
- API 엔드포인트는 `/api/v1/` 접두사를 사용한다.
- 모든 응답은 `{ data, status, message }` 구조를 따른다.

### 데이터베이스
- **PostgreSQL** 을 메인 DB로 사용한다.
- **Redis** 를 캐시 레이어로 사용한다. 당일 지표 계산 결과는 Redis에 캐싱한다.
- DB 접속 정보는 반드시 환경변수로만 관리한다. 코드에 하드코딩하지 않는다.
- 쿼리는 파라미터 바인딩을 사용한다. SQL Injection 방지.
- 마이그레이션은 **Alembic** 을 사용한다. `alembic/versions/` 에 모든 변경 이력을 보관한다.
- ORM은 **SQLAlchemy 2.x (async)** 를 사용한다. 모델 정의는 [data-schema.md §3](rules/data-schema.md) 테이블과 1:1 일치시킨다.

### 데이터 수집
- **KRX 정보데이터시스템 + FinanceDataReader** 를 사용한다.
- **APScheduler** 로 아래 주기에 따라 자동 수집한다:
  - 06:00: `master_sync` — 종목 마스터(stock_master) 동기화
  - 장중: 09:30·10:30·11:30·13:30·14:30 (5회 스냅샷)
  - 15:30: `eod_provisional` — 잠정치 수집
  - 18:00: `eod_confirmed` — 최종 확정 + 일일 지표 재계산
- 세부 정의 → [rules/data-pipeline.md §1](rules/data-pipeline.md)

### 배포
- 프론트엔드는 **Vercel** 에 배포한다. `vercel.json` 설정 파일을 포함한다.
- 백엔드는 **Railway** 에 배포한다. `Dockerfile` 을 작성하여 컨테이너로 배포한다.
- 환경변수는 각 플랫폼의 환경변수 설정에서 관리한다. `.env` 파일은 `.gitignore` 에 포함한다.
- 심사자가 외부 API 키 없이 배포 URL에서 바로 확인 가능해야 한다.

---

## 프로젝트 디렉토리 구조

모노레포 1개 루트에 `frontend/`·`backend/` 분리.

```
supgeuk-war/
├── README.md
├── skills/                          # 본 규칙 문서 (구현에는 영향 X)
├── frontend/
│   ├── index.html
│   ├── vercel.json
│   ├── package.json
│   ├── tailwind.config.js           # ← visualization/DESIGN.md §11.1 그대로 복사
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                  # React Router 4개 라우트 등록
│       ├── api/
│       │   └── client.ts            # axios + envelope 언래핑
│       ├── pages/
│       │   ├── WarRoom.tsx          # /
│       │   ├── Screener.tsx         # /screener
│       │   ├── DeepDive.tsx         # /deep-dive/:ticker
│       │   └── Archive.tsx          # /archive
│       ├── components/
│       │   ├── ui/                  # Badge, Card, Slider, Tab, Table
│       │   └── charts/              # DivergingBar, Bubble, Candlestick, GroupedBar
│       ├── stores/
│       │   ├── filterStore.ts       # Zustand: Screener 필터 상태
│       │   └── dateStore.ts         # Zustand: 현재 표시 거래일
│       ├── types/
│       │   └── api.ts               # dashboard-layout.md §11.5 응답 타입
│       └── styles/
│           └── index.css            # @tailwind 디렉티브
└── backend/
    ├── Dockerfile
    ├── pyproject.toml
    ├── alembic.ini
    ├── alembic/
    │   └── versions/                # 마이그레이션 이력
    ├── scripts/
    │   └── backfill.py              # data-pipeline.md §8 초기 백필
    └── app/
        ├── main.py                  # FastAPI 진입
        ├── config.py                # 환경변수 로드 (pydantic-settings)
        ├── db.py                    # SQLAlchemy 세션
        ├── cache.py                 # Redis 클라이언트
        ├── scheduler.py             # APScheduler — data-pipeline.md §1 트리거 등록
        ├── adapters/
        │   ├── krx.py
        │   ├── fdr.py
        │   └── index.py             # KOSPI·KOSDAQ·USD/KRW
        ├── models/                  # SQLAlchemy 모델 (data-schema.md §3 1:1)
        ├── services/
        │   ├── supply_analysis.py   # rules/supply-analysis.md
        │   ├── screening.py         # rules/screening-rules.md
        │   └── scoring.py           # rules/scoring-signals.md
        ├── routers/                 # FastAPI 라우터 (dashboard-layout.md §11.5 1:1)
        │   ├── market.py
        │   ├── screener.py
        │   ├── stock.py
        │   └── archive.py
        └── utils/
            └── trading_day.py       # data-pipeline.md §7
```

### Frontend 상태 관리 규약

- **TanStack Query (서버 상태)**: 쿼리 키는 [dashboard-layout.md §11.5](visualization/dashboard-layout.md)의 `["market","brief", date]` 등 표준을 그대로 사용. `staleTime` 기본 5분.
- **Zustand (클라이언트 상태)**:
  - `filterStore`: Screener 필터(type, defense, sfi_inst_min, sfi_frgn_min) — URL 쿼리스트링과 양방향 동기화
  - `dateStore`: 현재 화면이 보여주는 거래일. 초기값은 서버가 응답한 `latest_trading_day`. 사용자 명시 변경 가능.

---

## 전체 실행 순서

아래 체크리스트를 복사하고 완료하면서 체크한다.

```
구현 진행:
- [ ] 1. rules/data-pipeline.md     → KRX 연동 + 스케줄러 구현
- [ ] 2. rules/data-schema.md       → DB 스키마 + 컬럼 매핑 구현
- [ ] 3. rules/supply-analysis.md   → 지표 계산 로직 구현
- [ ] 4. rules/screening-rules.md   → Type A~D 분류 + Market Brief 구현
- [ ] 5. rules/scoring-signals.md   → 신호 우선순위 + 인사이트 출력 구현
- [ ] 6. visualization/dashboard-layout.md → 4개 화면 구조 구현
- [ ] 7. visualization/DESIGN.md    → UI 스타일 적용
- [ ] 8. 배포
```

---

## 핵심 지표 레이어

[rules/data-schema.md §2](rules/data-schema.md)의 `[A]·[M]·[B]·[C]·[D]` 분류와 1:1 일치한다.

| 레이어 | 지표명 | 활용 화면 |
|--------|--------|-----------|
| [A] 원본 | 개인/기관/외국인 순매수, OHLCV, 거래대금 | 전체 |
| [M] 종목 마스터 | 종목명·섹터·시장 (KOSPI/KOSDAQ) | 화면 표시·필터·시장 분리 집계 |
| [B] 1차 | 종가 이동평균 (MA 5/20/60/120) | Deep Dive 맥점 |
| [C] 2차 | 기관·외인 SFI, 3파전 주도력, 사분면, 충돌 강도, 5/20/60일 평단가, 평단가 방어선 상태 | War Room, Screener, Deep Dive |
| [D] 신호·점수 | Type A~D, type_intensity, priority_score, weighted_priority | War Room, Screener |

시장 단위 집계(`market_summary` 테이블)는 Market Brief 텍스트와 Type별 카운트를 별도 보유한다.

세부 계산 규칙 → [rules/supply-analysis.md](rules/supply-analysis.md)
DB 테이블 정의 → [rules/data-schema.md §3](rules/data-schema.md)

---

## 파일별 참조 시점

| 요청 또는 작업 | 참조 파일 |
|----------------|-----------|
| KRX 데이터 수집, 스케줄링, 배포 환경 | [rules/data-pipeline.md](rules/data-pipeline.md) |
| DB 테이블 설계, 컬럼명 매핑, 스키마 정의 | [rules/data-schema.md](rules/data-schema.md) |
| SFI·수급주도력·평단가·맥점·패턴 유사도·Archive 통계 계산 | [rules/supply-analysis.md](rules/supply-analysis.md) |
| Type A~D 분류 조건, Market Brief 문장 생성 | [rules/screening-rules.md](rules/screening-rules.md) |
| 신호 우선순위, 인사이트 텍스트 출력 | [rules/scoring-signals.md](rules/scoring-signals.md) |
| 화면 구조, 드릴다운 3단계, 페이지 라우팅 | [visualization/dashboard-layout.md](visualization/dashboard-layout.md) |
| 색상, 타이포, 컴포넌트 스타일 토큰 | [visualization/DESIGN.md](visualization/DESIGN.md) |

---

## 4개 화면 개요

상세 구성 규칙 → [visualization/dashboard-layout.md](visualization/dashboard-layout.md)

**1. War Room (`/`)** — 시장 전체 수급 흐름 조망
Market Brief 상단 고정 / 시장 3파전 주도력 Diverging Bar /
전술 레이더 맵 (섹터 버블, 드릴다운 3단계) /
오늘의 시그널 요약 / 오늘의 주목 종목

**2. Screener (`/screener`)** — 조건 기반 종목 발굴
Type·평단가 상태·기관SFI·외인SFI 4가지 조건 조합 →
전 종목 중 신호 발생 종목 즉시 추출

**3. Deep Dive (`/deep-dive/:ticker`)** — 종목 심층 분석
AI 수급 전술 진단 / 캔들차트 + 평단가 방어선 오버레이 /
최근 7일 수급 순매수 바차트 / 이동평균선 맥점 /
과거 패턴 유사도 Top 3 (Cosine Similarity 기반)

**4. Archive (`/archive`)** — 수급 패턴 아카이브
Type A~D 탭별 과거 3년 발생 통계 /
5일·20일 평균 수익률·승률 / 과거 주요 발생 사례 테이블 /
면책 고지 하단 고정

---

## 면책 고지 출력 규칙

부착 위치 단일 출처 → [rules/scoring-signals.md §5.2](rules/scoring-signals.md). 5개 컴포넌트(Deep Dive AI 진단/패턴 유사도/맥점, Archive 페이지, War Room 주목 종목)에 모두 부착해야 한다.

표준 면책 문구:

```
[면책 고지] 과거 수급 패턴 및 통계 자료는 투자 참고용 역사적 맥락 데이터일 뿐,
미래의 주가 상승을 보장하지 않습니다. 알고리즘이 제시하는 유사도 및 방어선
추정치는 실제와 다를 수 있으며, 투자 판단에 대한 모든 책임은 투자자 본인에게
있습니다.
```

Market Brief 하단에는 별도로 아래 문구를 추가한다.

```
※ 규칙 기반 자동 생성 — 수익을 예측하거나 보장하지 않습니다.
```
