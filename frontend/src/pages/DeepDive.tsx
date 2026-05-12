import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { TypeBadge, DefenseBadge } from '../components/ui/Badge';

export default function DeepDive() {
  const { ticker } = useParams();

  const { data: stockInfo, isLoading } = useQuery({
    queryKey: ['stockInfo', ticker],
    queryFn: () => apiClient.get(`/stock/${ticker}`)
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-4 border-b border-border-subtle pb-4">
        <h1 className="text-3xl font-bold text-ink-primary">{stockInfo?.name}</h1>
        <span className="text-lg text-ink-secondary font-numeric mb-1">{stockInfo?.ticker}</span>
        <span className="text-sm text-ink-muted mb-1 px-2 py-0.5 bg-surface-2 rounded">{stockInfo?.market}</span>
        <div className="flex-grow" />
        <TypeBadge type={stockInfo?.type} />
        <DefenseBadge state={stockInfo?.defense_status} />
      </div>

      <div className="bg-surface-2 rounded-lg p-6 border border-border-subtle">
        <h2 className="text-lg font-bold text-ink-primary mb-2">{stockInfo?.deep_dive_headline}</h2>
        <ul className="list-disc list-inside text-ink-secondary space-y-1">
          <li>{stockInfo?.deep_dive_line1}</li>
          <li>{stockInfo?.deep_dive_line2}</li>
        </ul>
      </div>

      <div className="h-64 bg-surface rounded-lg border border-border-subtle flex items-center justify-center text-ink-muted">
        [ Lightweight Charts - Candlestick View Placeholder ]
      </div>

      <div className="text-xs text-ink-muted mt-8 pb-4">
        * 본 서비스에서 제공하는 수급 데이터 및 분석 결과는 투자 참고용이며, 실제 투자 결과에 대한 법적 책임을 지지 않습니다.
      </div>
    </div>
  );
}
