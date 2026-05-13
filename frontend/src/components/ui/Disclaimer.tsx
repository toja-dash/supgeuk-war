export function Disclaimer({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mt-8 flex items-start gap-2 pb-4 text-xs text-ink-muted">
      <span aria-hidden>⚠</span>
      <p>
        {children ??
          '본 서비스의 수급 데이터 및 분석 결과는 투자 참고용 역사적 맥락 데이터일 뿐, 미래 주가 상승을 보장하지 않습니다. 실제 투자 결과에 대한 책임을 지지 않습니다.'}
      </p>
    </div>
  );
}
