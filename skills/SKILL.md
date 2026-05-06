---
name: SKILL
description: 수급전쟁(SUPGEUK WAR) 대시보드 구현을 위한 Skills 진입점. 데이터 수집부터 UI 생성까지 전체 실행 순서와 각 파일 참조 시점을 정의한다.
type: entry-point
version: 1.0.0
---

# SUPGEUK WAR — Skills 진입점

본 문서는 LLM이 수급전쟁 서비스를 처음부터 끝까지 구현하기 위한 **단일 진입점**이다.
본 문서를 먼저 읽고, 단계별로 지정된 파일을 1단계 깊이로 참조하여 구현을 진행한다.

---

## 1. 서비스 한 줄 정의

> 장 마감 후 18:00 확정 데이터 기반으로, 오늘 시장에서 기관·외국인이 어디서 어떻게 움직였는지 한 화면에 보여주는 당일 수급 결산 대시보드.

---

## 2. 기술 스택

LLM은 본 표의 라이브러리만 사용한다. 임의로 다른 라이브러리를 도입하지 않는다.

### 2.1 백엔드 (Python 3.11)

| 영역 | 패키지 | 버전 |
|---|---|---|
| 웹 프레임워크 | `fastapi` | `^0.110` |
| ASGI 서버 | `uvicorn[standard]` | `^0.27` |
| ORM | `sqlalchemy` | `^2.0` |
| 마이그레이션 | `alembic` | `^1.13` |
| 데이터 처리 | `pandas`, `numpy` | `^2.2`, `^1.26` |
| 시장 데이터 | `finance-datareader` | `^0.9` |
| KRX 보조 | `pykrx` | `^1.0` |
| HTTP 클라이언트 | `httpx` | `^0.27` |
| 환경변수 | `python-dotenv` | `^1.0` |
| 스케줄러 | `apscheduler` | `^3.10` |
| DB (개발) | SQLite (내장) | — |
| DB (배포) | PostgreSQL | `15+` |

### 2.2 프론트엔드 (Node 20)

| 영역 | 패키지 | 버전 |
|---|---|---|
| 프레임워크 | `react`, `react-dom` | `^18.3` |
| 빌드 | `vite` | `^5.2` |
| 언어 | `typescript` | `^5.4` |
| 라우팅 | `react-router-dom` | `^6.22` |
| 데이터 페칭·캐시 | `@tanstack/react-query` | `^5.28` |
| 가벼운 글로벌 상태 | `zustand` | `^4.5` |
| 스타일 | `tailwindcss` | `^3.4` |
| 일반 차트 | `recharts` | `^2.12` |
| 캔들차트 | `lightweight-charts` (TradingView) | `^4.1` |
| 아이콘 | `lucide-react` | `^0.350` |
| 폰트 | `pretendard`, `JetBrains Mono` (Google Fonts CDN) | — |
| 날짜 | `date-fns` | `^3.3` |
| HTTP | `axios` | `^1.6` |

### 2.3 배포

| 대상 | 플랫폼 |
|---|---|
| 백엔드 | Railway (Dockerfile) |
| 프론트엔드 | Vercel (Vite 정적 빌드) |
| DB | Railway PostgreSQL plugin |

---

## 3. 폴더 구조

### 3.1 Skills 폴더 (규칙 문서)

```
skills/
├── SKILL.md                           ← 본 파일 (진입점)
├── rules/                              ← 분석 규칙
│   ├── data-pipeline.md                ← 수집·배포
│   ├── data-schema.md                  ← DB 스키마
│   ├── supply-analysis.md              ← 지표 계산
│   ├── screening-rules.md              ← Type A~D 분류
│   ├── scoring-signals.md              ← 인사이트 텍스트
│   └── api-contract.md                 ← FE/BE 엔드포인트 명세
└── visualization/                      ← 시각화 규칙
    ├── DESIGN.md                       ← 디자인 토큰
    └── dashboard-layout.md             ← 페이지 구조
```

### 3.2 프로젝트 폴더 (실제 구현 코드)

```
supgeuk-war/
├── README.md
├── skills/                            ← 위 §3.1
├── data/
│   └── dummy/                         ← 데모용 CSV (data-pipeline.md §7 참조)
│
├── backend/                           ← FastAPI
│   ├── pyproject.toml                 ← 의존성 (§2.1)
│   ├── .env.example
│   ├── Dockerfile
│   ├── alembic/                       ← DB 마이그레이션
│   │   └── versions/
│   ├── app/
│   │   ├── main.py                    ← FastAPI 엔트리
│   │   ├── config.py                  ← 환경 변수 로드
│   │   ├── db.py                      ← SQLAlchemy 엔진/세션
│   │   ├── models/                    ← ORM 모델 (data-schema.md 매핑)
│   │   │   ├── raw.py
│   │   │   ├── derived.py
│   │   │   ├── aggregated.py
│   │   │   └── archive.py
│   │   ├── schemas/                   ← Pydantic 응답 모델 (api-contract.md 매핑)
│   │   ├── routes/                    ← 엔드포인트 (api-contract.md §1~13)
│   │   │   ├── health.py
│   │   │   ├── market.py
│   │   │   ├── screener.py
│   │   │   ├── stocks.py
│   │   │   └── archive.py
│   │   ├── services/                  ← 비즈니스 로직
│   │   │   ├── ingestion.py           ← data-pipeline.md
│   │   │   ├── analysis.py            ← supply-analysis.md
│   │   │   ├── classification.py      ← screening-rules.md
│   │   │   └── insights.py            ← scoring-signals.md
│   │   └── jobs/                      ← APScheduler 작업
│   │       └── scheduler.py
│   └── tests/
│
└── frontend/                          ← React + Vite
    ├── package.json                   ← 의존성 (§2.2)
    ├── .env.example
    ├── vite.config.ts
    ├── tailwind.config.js             ← DESIGN.md 토큰 매핑 (§13)
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx                   ← React 엔트리, Router 설정
        ├── App.tsx                    ← Header + <Outlet />
        ├── api/                       ← axios + react-query 훅 (api-contract.md §17)
        │   ├── client.ts
        │   ├── market.ts
        │   ├── screener.ts
        │   ├── stocks.ts
        │   └── archive.ts
        ├── pages/                     ← dashboard-layout.md §2~5
        │   ├── WarRoom.tsx
        │   ├── Screener.tsx
        │   ├── DeepDive.tsx
        │   └── Archive.tsx
        ├── components/                ← 공용 컴포넌트
        │   ├── layout/
        │   │   ├── Header.tsx
        │   │   └── PageContainer.tsx
        │   ├── charts/
        │   │   ├── DivergingBar.tsx
        │   │   ├── SectorBubble.tsx
        │   │   ├── Candlestick.tsx    ← lightweight-charts
        │   │   └── GroupedBar.tsx
        │   ├── ui/
        │   │   ├── Card.tsx
        │   │   ├── Badge.tsx          ← Type 배지 + 상태 배지
        │   │   ├── StatCard.tsx
        │   │   ├── Slider.tsx
        │   │   ├── Tabs.tsx
        │   │   └── Table.tsx
        │   └── insights/
        │       ├── MarketBrief.tsx
        │       └── AIInsight.tsx
        ├── hooks/
        ├── stores/                    ← zustand 스토어 (필터 상태 등)
        ├── lib/
        │   └── format.ts              ← 숫자·날짜 포매터
        ├── types/                     ← api-contract.md 응답 타입
        └── styles/
            └── index.css              ← Tailwind directives
```

---

## 4. 실행 순서 (10단계)

각 단계에서 참조해야 하는 파일을 명시한다. **참조 깊이는 1단계로 제한.**

| Step | 단계 | 참조 파일 | 산출물 |
|---|---|---|---|
| 0 | 프로젝트 부트스트랩 | 본 §4.1 | 폴더 구조 + 의존성 + .env |
| 1 | 데이터 수집 파이프라인 구축 | rules/data-pipeline.md | 수집 스케줄러 + KRX/FDR 클라이언트 + 더미 fallback |
| 2 | DB 스키마 생성 | rules/data-schema.md | 11개 테이블 + Alembic 마이그레이션 |
| 3 | 원본 데이터 전처리 | rules/data-schema.md | raw → derived 변환 잡 |
| 4 | 지표 계산 | rules/supply-analysis.md | SFI · 주도력 · 평단선 · 4분면 |
| 5 | 신호 분류 | rules/screening-rules.md | Type A~D 라벨 |
| 6 | 인사이트 텍스트 생성 | rules/scoring-signals.md | AI 진단·맥점·패턴 텍스트·Market Brief |
| 7 | API 엔드포인트 구현 | rules/api-contract.md | 13개 엔드포인트 + Pydantic 스키마 |
| 8 | 디자인 토큰 적용 | visualization/DESIGN.md | tailwind.config.js + UI 컴포넌트 |
| 9 | 페이지 구현 | visualization/dashboard-layout.md | War Room·Screener·Deep Dive·Archive |
| 10 | 배포 | 본 §4.2 | Vercel(FE) + Railway(BE) URL |

---

### 4.1 Step 0 상세: 프로젝트 부트스트랩

LLM은 다음을 순서대로 실행한다.

#### 4.1.1 폴더 트리 생성

§3.2의 디렉토리 구조 그대로 `mkdir`로 생성. 빈 디렉토리에는 `.gitkeep` 배치.

#### 4.1.2 백엔드 부트스트랩

`backend/pyproject.toml`:
```toml
[project]
name = "supgeuk-war-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.110",
  "uvicorn[standard]>=0.27",
  "sqlalchemy>=2.0",
  "alembic>=1.13",
  "pandas>=2.2",
  "numpy>=1.26",
  "finance-datareader>=0.9",
  "pykrx>=1.0",
  "httpx>=0.27",
  "python-dotenv>=1.0",
  "apscheduler>=3.10",
  "psycopg2-binary>=2.9",
  "pydantic>=2.6",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-asyncio>=0.23", "ruff>=0.3"]
```

`backend/.env.example`:
```
DATABASE_URL=sqlite:///./supgeuk.db
USE_DUMMY_DATA=true
TIMEZONE=Asia/Seoul
KRX_OTP_URL=http://data.krx.co.kr/comm/fileDn/GenerateOTP/generate.cmd
KRX_DOWNLOAD_URL=http://data.krx.co.kr/comm/fileDn/download_csv/download.cmd
ALLOWED_ORIGINS=http://localhost:5173,https://supgeuk-war.vercel.app
```

`backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir .
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`backend/app/main.py` (최소 골격):
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import health, market, screener, stocks, archive

app = FastAPI(title="Supgeuk War API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(health.router, prefix="/api/v1")
app.include_router(market.router, prefix="/api/v1/market")
app.include_router(screener.router, prefix="/api/v1")
app.include_router(stocks.router, prefix="/api/v1/stocks")
app.include_router(archive.router, prefix="/api/v1/archive")
```

#### 4.1.3 프론트엔드 부트스트랩

`frontend/package.json`:
```json
{
  "name": "supgeuk-war-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0",
    "@tanstack/react-query": "^5.28.0",
    "zustand": "^4.5.0",
    "recharts": "^2.12.0",
    "lightweight-charts": "^4.1.0",
    "lucide-react": "^0.350.0",
    "axios": "^1.6.0",
    "date-fns": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

`frontend/.env.example`:
```
VITE_API_BASE=http://localhost:8000
```

`frontend/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
});
```

`frontend/src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import WarRoom from "./pages/WarRoom";
import Screener from "./pages/Screener";
import DeepDive from "./pages/DeepDive";
import Archive from "./pages/Archive";
import "./styles/index.css";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1 } }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<Navigate to="/war-room" replace />} />
            <Route path="war-room" element={<WarRoom />} />
            <Route path="screener" element={<Screener />} />
            <Route path="deep-dive/:ticker?" element={<DeepDive />} />
            <Route path="archive" element={<Archive />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

#### 4.1.4 부트스트랩 명령

```bash
# 백엔드
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .[dev]
cp .env.example .env
alembic init alembic   # 초기 1회만

# 프론트엔드
cd ../frontend
npm install
cp .env.example .env

# 더미 데이터 시드 (데모용)
cd ../backend
python -m app.jobs.seed_dummy   # data-pipeline.md §7 참조
```

---

### 4.2 Step 10 상세: 배포

#### 4.2.1 백엔드 (Railway)

```bash
railway login
railway init
railway add postgresql
railway up                           # Dockerfile 자동 빌드
railway variables set USE_DUMMY_DATA=true   # 1차 데모 모드
railway domain                       # 공개 URL 발급
```

#### 4.2.2 프론트엔드 (Vercel)

```bash
cd frontend
npx vercel --prod
# 환경변수에 VITE_API_BASE = (Railway 백엔드 URL) 설정
```

#### 4.2.3 배포 후 확인

- [ ] `https://<be-url>/api/v1/health` 200 응답
- [ ] `https://<fe-url>/war-room` 정상 렌더
- [ ] 헤더 4개 탭 클릭 시 라우팅 동작
- [ ] 더미 모드 배지 노출 (DEMO DATA)

---

## 5. 데이터 흐름 요약

```
[KRX / FDR API]
      ↓ 수집 (data-pipeline.md)
[raw 테이블] (data-schema.md §3)
      ↓ 전처리
[derived 테이블] (data-schema.md §4)
      ↓ 지표 계산 (supply-analysis.md)
[aggregated 테이블] (data-schema.md §5)
      ↓ 신호 분류 (screening-rules.md)
[signals + insights] (scoring-signals.md)
      ↓
[FastAPI] → [React Dashboard] (dashboard-layout.md, DESIGN.md)
```

---

## 6. 갱신 주기

| 시점 | 동작 | 데이터 상태 |
|---|---|---|
| 09:00 | 장 시작, 전일 마감 데이터 보존 | confirmed (전일) |
| 09:30 ~ 15:20 | 장중 5회 스냅샷 (90분 간격) | live |
| 15:30 | 장 마감 직후 잠정치 1차 반영 | pending |
| 18:00 | KRX 최종 확정 데이터 반영 | confirmed |

상세는 [rules/data-pipeline.md](rules/data-pipeline.md) §2.

---

## 7. 4개 페이지 구조 요약

| Page | 목적 | 핵심 컴포넌트 |
|---|---|---|
| War Room | 시장 전체 조망 | Market Brief · 3파전 주도력 · 전술 레이더 맵 · 시그널 요약 · 주목 종목 |
| Screener | 조건 검색 | 4-필터 · 종목 테이블 |
| Deep Dive | 종목 심층 | AI 진단 · 캔들+평단 · 7일 수급 · 맥점 · 패턴 Top 3 |
| Archive | 패턴 통계 | Type 탭 · 통계 카드 · 사례 테이블 |

상세 그리드는 [visualization/dashboard-layout.md](visualization/dashboard-layout.md).

---

## 8. 핵심 용어 (전 파일 공통)

| 용어 | 정의 |
|---|---|
| SFI (Supply Flow Index) | 주체별 순매수 ÷ 당일 총거래대금 × 100 |
| 3파전 수급 주도력 | 특정 주체 순매수 ÷ (개인 + 기관 + 외국인 절대값 합) |
| 평단가 방어선 | 최근 20일 누적 순매수 대금 ÷ 누적 순매수 수량 |
| Type A~D | 수급 패턴 분류 (A=쌍끌이 설거지, B=개미털기, C=외인주도, D=기관방어) |
| 방어선 4단계 | 안전 / 외인방어선 도달 / 기관방어선 도달 / 방어선 붕괴 |

수식 정의는 [rules/supply-analysis.md](rules/supply-analysis.md), 분류 임계값은 [rules/screening-rules.md](rules/screening-rules.md).

---

## 9. 설계 원칙 (전 파일 공통)

1. **간결성** — 각 파일 500줄 이하.
2. **단일 깊이 참조** — 참조 깊이 1단계 제한. 중첩 참조 금지.
3. **명확한 조건 분기** — 모호한 서술 대신 임계값과 조건식.
4. **DESIGN.md 표준 준수** — Google Stitch 포맷.
5. **범용성** — 데이터 소스를 KRX 외 (Yahoo Finance 등)로 교체해도 동일 파이프라인 동작.
6. **모델 독립성** — 특정 LLM에 종속되지 않는 수치·조건식 기반 규칙.

---

## 10. 우선순위 명세 (충돌 해결)

규칙 간 충돌 시 다음 우선순위를 따른다.

```
SKILL.md > screening-rules.md > supply-analysis.md > data-schema.md > data-pipeline.md
visualization: dashboard-layout.md > DESIGN.md
```

본 SKILL.md가 최상위 결정권을 갖는다. 다른 파일이 본 문서와 충돌하면 본 문서가 우선이다.

---

## 11. 구현 완료 판정

다음 12개 항목이 모두 만족되어야 "구현 완료"로 판정한다.

- [ ] 부트스트랩 완료 (백엔드/프론트 의존성 설치 + .env 생성)
- [ ] 11개 DB 테이블이 마이그레이션된다
- [ ] 더미 데이터로 모든 테이블이 채워진다 (`USE_DUMMY_DATA=true`)
- [ ] SFI · 주도력 · 평단선 · Type 분류가 정상 계산된다
- [ ] 13개 API 엔드포인트가 200 응답 (`/docs` Swagger 확인)
- [ ] 4개 페이지가 라우팅으로 접근 가능하다
- [ ] War Room에 5개 컴포넌트가 모두 렌더된다
- [ ] Screener에서 4-필터가 동작한다
- [ ] Deep Dive에서 lightweight-charts 캔들 + 평단선 2개가 오버레이된다
- [ ] Archive Type 탭 4개가 전환된다
- [ ] Market Brief가 자동 생성된다
- [ ] 면책 고지가 Archive·Deep Dive에 노출된다

체크리스트 충족 후 Vercel·Railway 배포 URL을 README에 기재한다.
