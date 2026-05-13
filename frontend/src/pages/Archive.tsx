export default function Archive() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Archive</h1>

      <div className="rounded-lg border border-border-subtle bg-surface p-6">
        <p className="mb-4 text-ink-secondary">과거 수급 패턴 통계 및 사례</p>
      </div>

      <div className="mt-8 pb-4 text-xs text-ink-muted">
        * 본 서비스의 수급 데이터와 분석 결과는 투자 참고용이며 실제 투자 결과에 대한 책임을 지지 않습니다.
      </div>
    </div>
  );
}
