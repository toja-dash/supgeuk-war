import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function Screener() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Screener</h1>
      
      <div className="bg-surface rounded-lg border border-border-subtle p-6">
        <p className="text-ink-secondary mb-4">검색 조건 및 결과 테이블 (MVP Mock)</p>
        <button 
          onClick={() => navigate('/deep-dive/005930')}
          className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-ink-primary rounded font-medium transition duration-fast"
        >
          삼성전자 Deep Dive 보기
        </button>
      </div>

      <div className="text-xs text-ink-muted mt-8 pb-4">
        * 본 서비스에서 제공하는 수급 데이터 및 분석 결과는 투자 참고용이며, 실제 투자 결과에 대한 법적 책임을 지지 않습니다.
      </div>
    </div>
  );
}
