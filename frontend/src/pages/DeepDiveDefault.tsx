import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { apiClient } from '../api/client';
import type { ScreenerResponse } from '../types/api';

export default function DeepDiveDefault() {
  const { data, isLoading } = useQuery({
    queryKey: ['deep-dive', 'default-pick'],
    queryFn: () =>
      apiClient.get<ScreenerResponse>(
        '/screener?type=ALL&defense=ALL&sfi_inst_min=-30&sfi_frgn_min=-30&size=1',
      ),
  });

  const pick = data?.items?.[0];

  if (pick) {
    return <Navigate to={`/deep-dive/${pick.ticker}`} replace />;
  }

  return (
    <Card title="오늘의 최우선 시그널 종목">
      <div className="flex flex-col gap-3 py-8 text-sm text-ink-secondary">
        <p>{isLoading ? '오늘 가장 강한 시그널 종목을 찾는 중입니다.' : '표시할 시그널 종목이 없습니다.'}</p>
        {!isLoading && (
          <Link to="/screener" className="text-brand-primary hover:underline">
            스크리너에서 종목 보기
          </Link>
        )}
      </div>
    </Card>
  );
}
