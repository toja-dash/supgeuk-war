---
name: building-supgeuk-war-dashboard
description: "수급전쟁(SUPGEUK WAR) 투자 대시보드 서비스를 구현한다. KRX 투자자별
  순매수·OHLCV 데이터를 수집·표준화하고, 기관SFI·외인SFI·3파전 수급 주도력·누적
  수급 추이·평단가 방어선을 계산하며, Type A~D 엇갈림 신호를 자동 분류하고,
  War Room·Screener·Deep Dive·Archive 4개 화면으로 구성된 웹 대시보드를 생성한다.
  수급전쟁 서비스 구현, KRX 데이터 수집, 지표 계산, 신호 분류, UI 구현, 배포를
  요청할 때 사용한다."
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
- 차트는 **Recharts** 로 구현한다. Chart.js, D3 등 다른 라이브러리는 사용하지 않는다.
- 상태 관리는 **React Query** 로 서버 상태를 관리하고, 전역 클라이언트 상태는 **Zustand** 를 사용한다.
- 라우팅은 **React Router v6** 을 사용한다. 페이지는 War Room(`/`), Screener(`/screener`), Deep Dive(`/deep-dive/:ticker`), Archive(`/archive`) 4개다.

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

### 데이터 수집
- **KRX 정보데이터시스템 + FinanceDataReader** 를 사용한다.
- **APScheduler** 로 아래 주기에 따라 자동 수집한다:
  - 장중: 09:00~15:30 사이 약 5회 스냅샷
  - 15:30: 잠정치 수집
  - 18:00: 최종 확정 데이터 수집 + 당일 지표 전체 재계산

### 배포
- 프론트엔드는 **Vercel** 에 배포한다. `vercel.json` 설정 파일을 포함한다.
- 백엔드는 **Railway** 에 배포한다. `Dockerfile` 을 작성하여 컨테이너로 배포한다.
- 환경변수는 각 플랫폼의 환경변수 설정에서 관리한다. `.env` 파일은 `.gitignore` 에 포함한다.
- 심사자가 외부 API 키 없이 배포 URL에서 바로 확인 가능해야 한다.

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

| 레이어 | 지표명 | 활용 화면 |
|--------|--------|-----------|
| 원본 | 개인/기관/외국인 순매수, OHLCV, 거래대금 | 전체 |
| 1차 | 기관SFI, 외인SFI, 3파전 수급 주도력 | Screener, Deep Dive, War Room |
| 2차 | 누적 수급 추이 (3·5·20일 롤링), 주체별 평단가 | Deep Dive |
| 신호 | 3차원 엇갈림 Type A~D, Market Brief | War Room, Screener |

세부 계산 규칙 → [rules/supply-analysis.md](rules/supply-analysis.md)

---

## 파일별 참조 시점

| 요청 또는 작업 | 참조 파일 |
|----------------|-----------|
| KRX 데이터 수집, 스케줄링, 배포 환경 | [rules/data-pipeline.md](rules/data-pipeline.md) |
| DB 테이블 설계, 컬럼명 매핑, 스키마 정의 | [rules/data-schema.md](rules/data-schema.md) |
| SFI·수급주도력·누적추이·평단가 계산 | [rules/supply-analysis.md](rules/supply-analysis.md) |
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

Archive 페이지 하단, Deep Dive 과거 패턴 섹션 하단에 반드시 고정 표시한다.

```
[면책 고지] 과거 수급 패턴 및 통계 자료는 투자 참고용 역사적 맥락 데이터일 뿐,
미래의 주가 상승을 보장하지 않습니다. 알고리즘이 제시하는 유사도 및 방어선
추정치는 실제와 다를 수 있으며, 투자 판단에 대한 모든 책임은 투자자 본인에게
있습니다.
```

Market Brief 하단에는 아래 문구를 추가한다.

```
※ 규칙 기반 자동 생성 — 수익을 예측하거나 보장하지 않습니다.
```
