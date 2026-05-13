import { useNavigate } from 'react-router-dom';

export default function Screener() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Screener</h1>

      <div className="rounded-lg border border-border-subtle bg-surface p-6">
        <p className="mb-4 text-ink-secondary">조건 검색 결과 테이블</p>
        <button
          onClick={() => navigate('/deep-dive/005930')}
          className="rounded bg-brand-primary px-4 py-2 font-medium text-ink-primary transition duration-fast hover:bg-brand-primary-hover"
        >
          삼성전자 Deep Dive 보기
        </button>
      </div>

      <div className="mt-8 pb-4 text-xs text-ink-muted">
        * 본 서비스의 수급 데이터와 분석 결과는 투자 참고용이며 실제 투자 결과에 대한 책임을 지지 않습니다.
      </div>
    </div>
  );
}
