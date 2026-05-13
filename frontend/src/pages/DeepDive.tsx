import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { DefenseBadge, TypeBadge } from '../components/ui/Badge';

export default function DeepDive() {
  const { ticker } = useParams();

  const { data: stockInfo, isLoading } = useQuery({
    queryKey: ['stockInfo', ticker],
    queryFn: () => apiClient.get(`/stock/${ticker}`),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-4 border-b border-border-subtle pb-4">
        <h1 className="text-3xl font-bold text-ink-primary">{stockInfo?.name}</h1>
        <span className="mb-1 font-numeric text-lg text-ink-secondary">{stockInfo?.ticker}</span>
        <span className="mb-1 rounded bg-surface-2 px-2 py-0.5 text-sm text-ink-muted">{stockInfo?.market}</span>
        <div className="flex-grow" />
        <TypeBadge type={stockInfo?.type} />
        <DefenseBadge state={stockInfo?.defense_status} />
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface-2 p-6">
        <h2 className="mb-2 text-lg font-bold text-ink-primary">{stockInfo?.deep_dive_headline}</h2>
        <ul className="list-inside list-disc space-y-1 text-ink-secondary">
          <li>{stockInfo?.deep_dive_line1}</li>
          <li>{stockInfo?.deep_dive_line2}</li>
        </ul>
      </div>

      <div className="flex h-64 items-center justify-center rounded-lg border border-border-subtle bg-surface text-ink-muted">
        Candlestick View
      </div>

      <div className="mt-8 pb-4 text-xs text-ink-muted">
        * 본 서비스의 수급 데이터와 분석 결과는 투자 참고용이며 실제 투자 결과에 대한 책임을 지지 않습니다.
      </div>
    </div>
  );
}
