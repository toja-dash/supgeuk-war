---
name: defining-data-schema
description: 원본 데이터, 1차 가공 지표, 2차 분석 지표의 스키마와 DB 테이블 구조를 정의할 때 참조합니다.
---

# 데이터 스키마 및 DB 테이블 정의

본 문서는 수급전쟁 파이프라인 전반에서 사용되는 데이터의 규격과 테이블 구조를 명시한다.
모든 테이블 생성 및 데이터 타입(Data Type) 변환 시 아래의 기준을 엄격히 적용한다.

## 1. 범용 컬럼 매핑 규칙 (Input -> Standard)

외부 소스(KRX, Yahoo Finance 등)의 원본 컬럼명은 적재 전 반드시 시스템 표준으로 치환한다.

* `date`, `날짜`, `timestamp` -> `Date`
* `code`, `symbol`, `종목코드` -> `Ticker`
* `close`, `종가` -> `Close`
* `volume`, `거래량` -> `Volume`
* `total_value`, `거래대금` -> `Total_Value`
* `retail_net`, `개인순매수` -> `Retail_Net_Value`
* `inst_net`, `기관순매수` -> `Inst_Net_Value`
* `foreign_net`, `외인순매수` -> `Foreign_Net_Value`

## 2. 지표별 데이터 스키마 정의

### [A] 원본 데이터 스키마 (Raw Data)

시장 수급 및 시세의 순수 원본 데이터 구조.

* `Date`: Date (YYYY-MM-DD)
* `Ticker`: String(6) (좌측 0 패딩, 예: 005930)
* `Close`: Integer (종가, 단위: 원)
* `Volume`: Integer (거래량, 단위: 주)
* `Total_Value`: Integer (당일 총 거래대금, 단위: 원)
* `Retail_Net_Value`: Integer (개인 당일 순매수, 단위: 원)
* `Inst_Net_Value`: Integer (기관 당일 순매수, 단위: 원)
* `Foreign_Net_Value`: Integer (외국인 당일 순매수, 단위: 원)

### [B] 1차 지표 스키마 (Primary Indicators)

원본 데이터를 기반으로 산출되는 단순 누적 및 이동평균 데이터 구조. 방어선 계산의 뼈대가 된다.

* `MA_5`, `MA_20`, `MA_60`: Float (일봉 기준 종가 이동평균)
* `Cum_Net_Value_20_Inst`: Integer (기관 최근 20영업일 누적 순매수 대금)
* `Cum_Net_Vol_20_Inst`: Integer (기관 최근 20영업일 누적 순매수 수량)
* `Cum_Net_Value_20_Foreign`: Integer (외국인 최근 20영업일 누적 순매수 대금)
* `Cum_Net_Vol_20_Foreign`: Integer (외국인 최근 20영업일 누적 순매수 수량)

### [C] 2차 지표 스키마 (Secondary Indicators)

핵심 분석 지표 공식(supply-analysis.md)에 의해 최종 도출되는 인사이트 데이터 구조.

* `Dominance_Score`: Float (3파전 주도력, 특정 주체 비중 %)
* `SFI_Inst`: Float (기관 수급 강도 지수, 소수점 2자리 %)
* `SFI_Foreign`: Float (외국인 수급 강도 지수, 소수점 2자리 %)
* `Defense_Line_Inst`: Integer (기관 20일 평단가 방어선 가격)
* `Defense_Line_Foreign`: Integer (외국인 20일 평단가 방어선 가격)
* `Quadrant_Signal`: String (3차원 엇갈림 신호 - 허용값: `쌍끌이 매수`, `기관 방어`, `쌍끌이 매도`, `외인 주도`)
* `Defense_Status`: String (방어선 상태 - 허용값: `안전구역`, `외인방어선 도달`, `기관방어선 도달`, `방어선 붕괴`)

## 3. DB 테이블 정의 (Table Definition)

실제 데이터베이스(PostgreSQL 등)에 생성할 물리적 테이블의 구조와 제약조건.

**Table 1: `market_raw_data` (원본 통합 테이블)**

* `Date` (Date, PK)
* `Ticker` (String(6), PK)
* (Raw Data 스키마 컬럼 전체 포함)
* **Index**: `Date`, `Ticker` 복합 인덱스 필수

**Table 2: `market_indicators` (분석 지표 통합 테이블)**
조인(Join) 성능 향상 및 대시보드 직접 조회를 위해 1차/2차 지표를 통합하여 적재한다.

* `Date` (Date, PK, FK -> `market_raw_data.Date`)
* `Ticker` (String(6), PK, FK -> `market_raw_data.Ticker`)
* (Primary Indicators 스키마 컬럼 전체 포함)
* (Secondary Indicators 스키마 컬럼 전체 포함)
* **Index**: `Quadrant_Signal`, `Defense_Status` 컬럼 단일 인덱스 필수 (조건 검색용)