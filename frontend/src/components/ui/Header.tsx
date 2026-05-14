import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import type { MarketBrief } from '../../types/api';
import { fmtPct } from '../../lib/format';
import { InfoIcon } from '../icons';

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

      <TermsInfo />

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

function TermsInfo() {
  const terms = [
    {
      title: 'SFI',
      body: 'Supply Force Index. 당일 거래대금 대비 기관/외국인의 순매수 비율입니다. +는 매수 우위, -는 매도 우위이며 Type 분류 임계값은 +/-3.0%입니다.',
    },
    {
      title: 'Type A',
      body: '기관과 외국인이 모두 -3.0% 이하로 강하게 매도하고, 가격이 평단 방어선을 이탈한 BREAKDOWN 상태입니다.',
    },
    {
      title: 'Type B',
      body: '기관과 외국인이 모두 +3.0% 이상으로 강하게 매수하는 쌍끌이 매수 구간입니다.',
    },
    {
      title: 'Type C',
      body: '외국인은 +3.0% 이상 매수하고 기관은 -3.0% 이하 매도하는 수급 충돌 구간입니다.',
    },
    {
      title: 'Type D',
      body: '기관은 +3.0% 이상 매수하고 외국인은 -3.0% 이하 매도하는 기관 방어 구간입니다.',
    },
    {
      title: '신호 강도',
      body: '기관 SFI와 외국인 SFI의 절대값 중 큰 값입니다. 값이 클수록 한쪽 수급 압력이 강합니다.',
    },
    {
      title: '스코어',
      body: '신호 강도 x log10(거래대금/1억)입니다. 수급 강도와 거래대금 규모를 함께 반영한 중요도이며 Screener와 Archive 정렬에 사용합니다.',
    },
    {
      title: '방어 상태',
      body: '현재가가 기관/외국인 20거래일 평균 매수단가 대비 어디에 있는지 보는 상태입니다. SAFE, INST_LINE_TOUCH, FRGN_LINE_TOUCH, BREAKDOWN 등으로 표시됩니다.',
    },
  ];

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label="용어 설명"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-ink-secondary transition hover:border-brand-primary/60 hover:bg-surface-2 hover:text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
      >
        <InfoIcon className="h-4 w-4" />
      </button>

      <div className="invisible absolute left-0 top-10 z-[60] w-[min(92vw,520px)] opacity-0 transition duration-fast group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="rounded-lg border border-border bg-surface shadow-card">
          <div className="border-b border-border-subtle px-4 py-3">
            <div className="text-sm font-bold text-ink-primary">용어 설명</div>
            <div className="mt-0.5 text-2xs text-ink-secondary">수급전쟁에서 사용하는 주요 지표와 정렬 기준</div>
          </div>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto p-4 sm:grid-cols-2">
            {terms.map((term) => (
              <div key={term.title} className="min-w-0">
                <div className="text-xs font-semibold text-ink-primary">{term.title}</div>
                <p className="mt-1 text-2xs leading-relaxed text-ink-secondary">{term.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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
