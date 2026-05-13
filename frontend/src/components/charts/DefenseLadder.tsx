import { fmtPrice } from '../../lib/format';

interface Props {
  currentPrice: number;
  instAvg: number | null;
  foreignAvg: number | null;
}

/**
 * 현재가·외인 평단·기관 평단 세 가격의 상하 위치를 시각화하고
 * 각 구간을 안전(녹)·경계(노)·위험(빨) 그라데이션으로 표현.
 */
export function DefenseLadder({ currentPrice, instAvg, foreignAvg }: Props) {
  if (instAvg == null || foreignAvg == null) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-2/40 p-4 text-2xs text-ink-muted">
        평단 데이터가 부족하여 방어선 시각화를 표시할 수 없습니다.
      </div>
    );
  }

  const stack = [
    { label: '현재가', value: currentPrice, color: '#F9FAFB', kind: 'current' as const },
    { label: '외인 평단', value: foreignAvg, color: '#A855F7', kind: 'frgn' as const },
    { label: '기관 평단', value: instAvg, color: '#06B6D4', kind: 'inst' as const },
  ]
    .slice()
    .sort((a, b) => b.value - a.value);

  const hi = stack[0].value;
  const lo = stack[stack.length - 1].value;
  const span = hi - lo || 1;

  // 현재가 위치에 따른 방어 상태
  const idxCurrent = stack.findIndex((s) => s.kind === 'current');
  let zone: { label: string; color: string; bg: string };
  if (idxCurrent === 0) {
    zone = { label: '안전 구역', color: '#22C55E', bg: 'rgba(34,197,94,0.18)' };
  } else if (idxCurrent === 1) {
    zone = { label: '외인 방어선 도달', color: '#EAB308', bg: 'rgba(234,179,8,0.18)' };
  } else {
    zone = { label: '방어선 붕괴 위험', color: '#DC2626', bg: 'rgba(220,38,38,0.18)' };
  }

  return (
    <div className="flex gap-4">
      {/* 좌측 가격 ladder */}
      <div className="relative flex w-40 flex-col" style={{ minHeight: 180 }}>
        <div className="absolute inset-y-0 left-3 w-px bg-gradient-to-b from-defense-safe via-defense-caution-yellow to-defense-danger opacity-50" />
        {stack.map((s) => {
          const top = ((hi - s.value) / span) * 160;
          return (
            <div
              key={s.kind}
              className="absolute left-0 flex items-center gap-2"
              style={{ top }}
            >
              <span
                className="block h-3 w-3 rounded-full ring-2"
                style={{ background: s.color, boxShadow: `0 0 0 2px #0B0F19`, color: s.color }}
              />
              <div className="flex flex-col">
                <span className="text-2xs uppercase tracking-wide text-ink-muted">{s.label}</span>
                <span className="font-numeric text-sm font-bold" style={{ color: s.color }}>
                  {fmtPrice(s.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 우측 zone 정보 */}
      <div className="flex flex-grow flex-col gap-3">
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2"
          style={{ background: zone.bg, color: zone.color }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: zone.color }} />
          <span className="text-xs font-semibold">{zone.label}</span>
        </div>
        <ul className="flex flex-col gap-1.5 text-2xs text-ink-secondary">
          <li>
            현재가 vs 외인 평단:{' '}
            <span
              className={`font-numeric font-semibold ${
                currentPrice >= foreignAvg ? 'text-num-up' : 'text-num-down'
              }`}
            >
              {currentPrice >= foreignAvg ? '+' : ''}
              {(((currentPrice - foreignAvg) / foreignAvg) * 100).toFixed(2)}%
            </span>
          </li>
          <li>
            현재가 vs 기관 평단:{' '}
            <span
              className={`font-numeric font-semibold ${
                currentPrice >= instAvg ? 'text-num-up' : 'text-num-down'
              }`}
            >
              {currentPrice >= instAvg ? '+' : ''}
              {(((currentPrice - instAvg) / instAvg) * 100).toFixed(2)}%
            </span>
          </li>
          <li>
            평단 갭:{' '}
            <span className="font-numeric text-ink-primary">
              {fmtPrice(Math.abs(foreignAvg - instAvg))}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
