# 배포 가이드

## 개요
Supgeuk War는 다음과 같이 배포되고 있습니다:
- **백엔드**: Railway (GitHub 연결)
- **프론트엔드**: Vercel
- **데이터베이스**: Railway PostgreSQL, Railway Redis

---

## 백엔드 배포 (Railway)

### 셋업
1. Railway 프로젝트에 GitHub 저장소 연결
2. Railway가 자동으로 `Dockerfile` 감지하여 배포

### 환경 변수
Railway에서 다음 환경 변수 설정:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `REDIS_URL`: Redis 연결 문자열
- 기타 필요한 환경 변수들

### 배포 프로세스
- GitHub에 push → 자동으로 Railway에 배포
- Railway 대시보드에서 배포 로그 확인 가능

### 로그 확인

#### Railway 대시보드에서 확인
1. https://railway.app 접속 → 로그인
2. 백엔드 서비스 클릭
3. **Logs** 탭에서 실시간 로그 확인
4. 필터링으로 에러 메시지 또는 특정 키워드 검색 가능

#### 데이터 흐름 확인
1. **백엔드 API 엔드포인트 확인**: `GET /health` 또는 기타 엔드포인트 테스트
2. **데이터베이스 연결**: 로그에서 "Connected to database" 메시지 확인
3. **Redis 연결**: 캐시 관련 로그 확인
4. **요청 로그**: 프론트엔드에서 오는 API 요청 로그 확인

#### PostgreSQL 데이터 직접 확인
Railway 대시보드에서 PostgreSQL 서비스를 클릭하고 **Data** 탭에서:
- 테이블 조회
- 데이터 INSERT/UPDATE 확인

#### Redis 상태 확인
Railway 대시보드에서 Redis 서비스를 클릭하고:
- 메모리 사용량
- 커맨드 통계 확인

---

## 데이터베이스

### PostgreSQL
- **위치**: Railway
- **설정**: Railway PostgreSQL 플러그인으로 자동 프로비저닝
- **연결**: `DATABASE_URL` 환경 변수로 백엔드에 연결
- **마이그레이션**: Alembic을 통해 스키마 관리

### Redis
- **위치**: Railway
- **설정**: Railway Redis 플러그인으로 자동 프로비저닝
- **연결**: `REDIS_URL` 환경 변수로 백엔드에 연결
- **용도**: 캐싱, 세션 관리 등

---

## 프론트엔드 배포 (Vercel)

### 셋업
1. Vercel에 GitHub 저장소 연결
2. `frontend` 디렉토리를 루트 디렉토리로 설정
3. 자동 배포 활성화

### 환경 변수
Vercel 프로젝트 설정에서 필요한 환경 변수 설정:
- API 기본 URL 등 필요한 모든 변수

### 배포 프로세스
- GitHub에 push → Vercel에서 자동 감지
- `frontend` 폴더 변경 시만 재배포
- Vercel 대시보드에서 배포 상태 확인 가능

---

## 로컬 개발

### 백엔드
```bash
cd backend
python -m pip install -r requirements.txt
python app/main.py
```

### 프론트엔드
```bash
cd frontend
npm install
npm run dev
```

### Docker Compose (로컬)
```bash
docker-compose up
```

---

## 배포 상태 확인

- **Railway**: https://railway.app (로그인 후 프로젝트 확인)
- **Vercel**: https://supgeuk-war.vercel.app 
