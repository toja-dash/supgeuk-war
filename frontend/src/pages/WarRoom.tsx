import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { StatCard } from '../components/ui/StatCard';
import { TypeBadge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

export default function WarRoom() {
  const navigate = useNavigate();
  
  const { data: brief } = useQuery({
    queryKey: ['marketBrief'],
    queryFn: () => apiClient.get('/market/brief')
  });

  const { data: signals } = useQuery({
    queryKey: ['marketSignals'],
    queryFn: () => apiClient.get('/market/signals')
  });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-xl font-bold mb-4">Market Summary</h1>
        <div className="p-4 bg-surface-2 rounded-lg border border-border-subtle mb-4">
          <p className="text-base text-ink-primary">
            {brief?.market_brief_text || "데이터 로딩 중..."}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Type A (위험)" value={signals?.count_a ?? "-"} borderColor="#EF4444" onClick={() => navigate('/screener')} />
          <StatCard label="Type B (강세)" value={signals?.count_b ?? "-"} borderColor="#10B981" onClick={() => navigate('/screener')} />
          <StatCard label="Type C (충돌)" value={signals?.count_c ?? "-"} borderColor="#06B6D4" onClick={() => navigate('/screener')} />
          <StatCard label="Type D (방어)" value={signals?.count_d ?? "-"} borderColor="#F59E0B" onClick={() => navigate('/screener')} />
        </div>
      </section>

      <div className="text-xs text-ink-muted mt-8 pb-4">
        * 본 서비스에서 제공하는 수급 데이터 및 분석 결과는 투자 참고용이며, 실제 투자 결과에 대한 법적 책임을 지지 않습니다.
      </div>
    </div>
  );
}
