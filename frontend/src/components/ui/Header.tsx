import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import type { MarketBrief } from '../../types/api';
import { fmtPct } from '../../lib/format';

const STATUS_LABEL: Record<MarketBrief['status_badge'], { text: string; cls: string }> = {
  live: { text: 'LIVE 장중', cls: 'bg-status-live/20 text-status-live' },
  pending: { text: '잠정 (15:30)', cls: 'bg-status-pending/20 text-status-pending' },
  confirmed: { text: '확정 (18:00)', cls: 'bg-status-confirmed/20 text-status-confirmed' },
};

const nf = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNumOrDash = (v: number | null | undefined) =>
  v === null || v === undefined ? '-' : nf.format(v);

export function Header() {
  const location = useLocation();
  const tabs = [
    { name: 'War Room', path: '/' },
    { name: 'Screener', path: '/screener' },
    { name: 'Deep Dive', path: '/deep-dive' },
    { name: 'Archive', path: '/archive' },
  ];

  const { data } = useQuery({
    queryKey: ['market', 'brief'],
    queryFn: () => apiClient.get<MarketBrief>('/market/brief'),
  });

  const status = data ? STATUS_LABEL[data.status_badge] : null;

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-6 border-b border-border-subtle bg-surface px-6">
      <Link to="/" className="flex items-center gap-2 whitespace-nowrap">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-primary" />
        <span className="text-lg font-bold text-ink-primary">수급 전쟁</span>
      </Link>

      <nav className="flex h-full gap-1">
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.path ||
            (tab.path.startsWith('/deep-dive') && location.pathname.startsWith('/deep-dive'));
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`flex items-center border-b-2 px-3 text-sm font-medium transition duration-fast ${
                isActive
                  ? 'border-brand-primary text-ink-primary'
                  : 'border-transparent text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex-grow" />

      <div className="flex items-center gap-5 text-sm">
        {status && (
          <span
            className={`rounded-md px-2.5 py-1 text-2xs font-semibold uppercase tracking-wide ${status.cls}`}
          >
            {status.text}
          </span>
        )}
        <Quote
          label="KOSPI"
          value={fmtNumOrDash(data?.kospi_close)}
          change={data?.kospi_change_pct}
        />
        <Quote
          label="KOSDAQ"
          value={fmtNumOrDash(data?.kosdaq_close)}
          change={data?.kosdaq_change_pct}
        />
        <Quote label="환율" value={fmtNumOrDash(data?.usdkrw_close)} />
      </div>
    </header>
  );
}

function Quote({ label, value, change }: { label: string; value: string; change?: number }) {
  const changeCls =
    change === undefined
      ? 'text-ink-secondary'
      : change > 0
        ? 'text-num-up'
        : change < 0
          ? 'text-num-down'
          : 'text-num-flat';
  return (
    <div className="flex items-center gap-1.5 font-numeric">
      <span className="text-2xs text-ink-secondary">{label}</span>
      <span className="font-bold text-ink-primary">{value}</span>
      {change !== undefined && <span className={`text-xs ${changeCls}`}>({fmtPct(change)})</span>}
    </div>
  );
}
