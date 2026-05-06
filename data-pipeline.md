---
name: managing-data-pipeline
description: 외부 소스에 의존하지 않는 범용 데이터 파이프라인(배치 및 실시간)의 수집, 전처리, 적재 조건식을 실행할 때 사용합니다.
---

# 데이터 파이프라인 실행 규칙

이 체크리스트를 복사하고 진행 상황을 추적하세요:

```text
- [ ] 1단계: Batch 및 Streaming 데이터 수집
- [ ] 2단계: 실시간 스트리밍 데이터 Kafka 발행
- [ ] 3단계: data-schema.md 매핑 및 전처리
- [ ] 4단계: TTL 및 인덱스 조건에 따른 이원화 적재
```

## 1단계: 범용 데이터 수집 (Producer)

외부 데이터 소스(KRX, Yahoo Finance, KIS 등)의 종류와 무관하게, 수집 주기에 따라 아래의 2개 트랙으로 분기하여 실행한다.

**Track A: 수급 스냅샷 (Batch)**

* **수집 주기 조건**: `time IN (09:30, 10:30, 11:30, 13:30, 14:30, 15:30, 18:00)`
* **실행 방식**: 스케줄러(Cron/Actions)에 의한 Polling 수집

**Track B: 장중 차트 데이터 (Streaming)**

* **수집 주기 조건**: `time >= 09:00 AND time <= 15:30`
* **실행 방식**: WebSocket 연결을 통한 실시간 틱(Tick) 구독

## 2단계: 스트리밍 라우팅 (Kafka)

Track B(Streaming)로 유입된 데이터는 아래 조건에 따라 즉시 Kafka로 라우팅한다. (Track A는 본 단계를 생략한다)

* **Topic**: `topic-realtime-chart`
* **Partition Key**: `Ticker` (종목코드)
* **Format**: `JSON(UTF-8)`

## 3단계: 단일 깊이 전처리 (Consumer)

Track A와 Track B의 모든 데이터는 DB 적재 전 반드시 아래의 조건식을 통과해야 한다.

1. **스키마 매핑**: [data-schema.md](data-schema.md)의 `범용 컬럼 매핑 규칙`을 호출하여 컬럼명 변환 (1단계 참조)

2. **결측치(NaN/Null) 처리**:
   * IF 데이터 타입 == `주가(OHLCV)` THEN `ffill` (이전 값 치환)
   * IF 데이터 타입 == `수급(Net_Value, Volume)` THEN `0` 치환

3. **데이터 규격화**:
   * 금액 단위 = `KRW` 통일
   * `Ticker` 길이 = `6`, 빈자리는 좌측 `0` 패딩 (e.g., `005930`)

## 4단계: 스토리지 적재 조건 분기

전처리된 데이터는 속성과 목적에 따라 아래의 분기 조건에 맞춰 적재한다. 본 단계 완료 후 파이프라인은 종료되며 [supply-analysis.md](supply-analysis.md)로 위임한다.

**Branch 1: Redis (In-Memory)**

* **대상 조건**: `Track B`에서 수집된 실시간 차트 데이터
* **TTL**: `24시간` (초과 시 자동 만료)

**Branch 2: PostgreSQL (Persistent)**

* **대상 조건**: `Track A` (전체) 및 `Track B` (1분 단위 압축 데이터)
* **필수 속성**: `Date`, `Ticker` 컬럼 복합 인덱스(Composite Index) 생성
* **충돌 제어(Upsert)**:
  * IF `Track A` (18:00 최종 수집본) THEN `ON CONFLICT DO UPDATE` (기존 값 덮어쓰기)