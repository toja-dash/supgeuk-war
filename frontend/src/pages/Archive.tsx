import React from 'react';

export default function Archive() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Archive</h1>
      
      <div className="bg-surface rounded-lg border border-border-subtle p-6">
        <p className="text-ink-secondary mb-4">과거 수급 패턴 통계 및 사례 (MVP Mock)</p>
      </div>

      <div className="text-xs text-ink-muted mt-8 pb-4">
        * 본 서비스에서 제공하는 수급 데이터 및 분석 결과는 투자 참고용이며, 실제 투자 결과에 대한 법적 책임을 지지 않습니다.
      </div>
    </div>
  );
}
