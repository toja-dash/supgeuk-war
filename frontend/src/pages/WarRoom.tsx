import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from '../components/icons';
import { Card } from '../components/ui/Card';
import { TypeBadge } from '../components/ui/Badge';
import { Disclaimer } from '../components/ui/Disclaimer';
import { DivergingBar } from '../components/charts/DivergingBar';
import { SectorBubble } from '../components/charts/SectorBubble';
import { Sparkline } from '../components/charts/Sparkline';
import { getOrMock } from '../api/withMock';
import {
  mockDominance,
  mockMarketBrief,
  mockSectors,
  mockSignals,
  mockSparklines,
} from '../mocks';
import type {
  MarketBrief,
  MarketDominance,
  MarketSignals,
  SectorBubble as SectorBubbleType,
  SignalType,
  TopPick,
} from '../types/api';
import { fmtPct } from '../lib/format';

const TYPE_META: Record<SignalType, { label: string; sub: string; color: string }> = {
  A: { label: 'Type A', sub: '쌍끌이 설거지 · 방어선 이탈', color: '#EF4444' },
  B: { label: 'Type B', sub: '쌍끌이 매수', color: '#10B981' },
  C: { label: 'Type C', sub: '개미털기', color: '#06B6D4' },
  D: { label: 'Type D', sub: '기관 방어', color: '#F59E0B' },
};

const PICK_LABEL: Record<SignalType, string> = {
  A: 'Type A — 위험 경고',
  B: 'Type B — 기회 포착',
  C: 'Type C — 충돌 주의',
  D: 'Type D — 전환 기대',
};

export default function WarRoom() {
  const navigate = useNavigate();

  const { data: brief } = useQuery({
    queryKey: ['market', 'brief'],
    queryFn: () => getOrMock<MarketBrief>('/market/brief', mockMarketBrief),
  });
  const { data: dominance } = useQuery({
    queryKey: ['market', 'dominance'],
    queryFn: () => getOrMock<MarketDominance>('/market/dominance', mockDominance),
  });
  const { data: sectors } = useQuery({
    queryKey: ['market', 'sectors'],
    queryFn: () => getOrMock<SectorBubbleType[]>('/market/sectors', mockSectors),
  });
  const { data: signals } = useQuery({
    queryKey: ['market', 'signals'],
    queryFn: () => getOrMock<MarketSignals>('/market/signals', mockSignals),
  });

  const briefData = brief ?? mockMarketBrief;
  const dom = dominance ?? mockDominance;
  const sectorData = sectors ?? mockSectors;
  const sig = signals ?? mockSignals;

  const briefAccent =
    briefData.kospi_change_pct > 0
      ? TYPE_META.B.color
      : briefData.kospi_change_pct < 0
        ? TYPE_META.A.color
        : '#6B7280';

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1 — Market Brief Banner */}
      <Card accentColor={briefAccent}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-2xs uppercase tracking-wide text-ink-secondary">Market Brief</div>
            <p className="text-base leading-relaxed text-ink-primary">
              {briefData.market_brief_text}
            </p>
          </div>
          <button
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-brand-primary px-3 py-2 text-xs font-semibold text-ink-primary transition hover:bg-brand-primary-hover"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l1.6 4.8L18 8.4l-4.4 1.6L12 14.8 10.4 10 6 8.4l4.4-1.6L12 2zM18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
            </svg>
            AI 시장 브리핑
          </button>
        </div>
      </Card>

      {/* Row 2 — 3-column grid */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-3">
          <Card title="📊 시장 3파전 주도력" className="h-full">
            <DivergingBar
              rows={[
                { label: '코스피', indi: dom.kospi.indi, inst: dom.kospi.inst, frgn: dom.kospi.frgn },
                { label: '코스닥', indi: dom.kosdaq.indi, inst: dom.kosdaq.inst, frgn: dom.kosdaq.frgn },
              ]}
            />
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-6">
          <Card
            title="🎯 전술 레이더 맵"
            subtitle="버블 크기 = 거래대금 · 색 = 수급 주도력"
            className="h-full"
          >
            <SectorBubble
              data={sectorData}
              onSelect={(sector) => navigate(`/screener?sector=${encodeURIComponent(sector)}`)}
            />
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-3">
          <Card title="👁 오늘의 주목 종목" className="h-full">
            <div className="flex max-h-[460px] flex-col gap-4 overflow-y-auto pr-1">
              {(Object.keys(sig.top_picks) as SignalType[]).map((type) => {
                const meta = TYPE_META[type];
                const picks = sig.top_picks[type] ?? [];
                if (picks.length === 0) return null;
                return (
                  <div key={type} className="flex flex-col gap-1.5">
                    <div
                      className="flex items-center gap-2 border-l-2 pl-2 text-xs font-semibold text-ink-secondary"
                      style={{ borderColor: meta.color }}
                    >
                      {PICK_LABEL[type]}
                    </div>
                    <ul className="flex flex-col">
                      {picks.map((p) => (
                        <PickRow key={p.ticker} pick={p} onClick={() => navigate(`/deep-dive/${p.ticker}`)} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-2xs text-ink-muted">※ 규칙 기반 자동 분류 결과 — 매수·매도 조언이 아닙니다.</p>
          </Card>
        </div>
      </div>

      {/* Row 3 — Type 카드 4개 (스파크라인 내장) */}
      <div>
        <div className="mb-3 text-sm font-semibold text-ink-secondary">⚡ 오늘의 시그널 요약</div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {(['A', 'B', 'C', 'D'] as const).map((t) => (
            <SignalTypeCard
              key={t}
              type={t}
              label={TYPE_META[t].label}
              sub={TYPE_META[t].sub}
              color={TYPE_META[t].color}
              count={t === 'A' ? sig.count_a : t === 'B' ? sig.count_b : t === 'C' ? sig.count_c : sig.count_d}
              spark={mockSparklines[t]}
              onClick={() => navigate(`/screener?type=${t}`)}
            />
          ))}
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}

function PickRow({ pick, onClick }: { pick: TopPick; onClick: () => void }) {
  const change = pick.change_pct ?? 0;
  const intensity = pick.type_intensity ?? 0;
  const changeCls =
    change > 0 ? 'text-num-up' : change < 0 ? 'text-num-down' : 'text-num-flat';
  const typeColor = TYPE_META[pick.type].color;

  return (
    <li>
      <button
        onClick={onClick}
        className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-surface-2"
      >
        <TypeBadge type={pick.type} />
        <span className="flex-grow truncate text-sm text-ink-primary">{pick.name}</span>
        <span className={`font-numeric text-2xs ${changeCls}`}>
          {pick.change_pct !== undefined ? fmtPct(change) : '-'}
        </span>
        <span
          className="hidden h-1 w-10 overflow-hidden rounded-full bg-surface-2 lg:block"
          title={`강도 ${Math.round(intensity * 100)}%`}
        >
          <span
            className="block h-full rounded-full"
            style={{ width: `${intensity * 100}%`, background: typeColor }}
          />
        </span>
        <ChevronRight className="h-4 w-4 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-ink-primary" />
      </button>
    </li>
  );
}

function SignalTypeCard({
  type,
  label,
  sub,
  color,
  count,
  spark,
  onClick,
}: {
  type: SignalType;
  label: string;
  sub: string;
  color: string;
  count: number;
  spark: number[];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg border border-border-subtle bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-border hover:bg-surface-2 hover:shadow-elevated"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(to right, transparent, ${color}, transparent)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 32px ${color}1E` }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span
            className="inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-2xs font-bold"
            style={{ borderColor: `${color}55`, color, background: `${color}14` }}
          >
            {label}
          </span>
          <span className="text-sm font-semibold text-ink-primary">{sub}</span>
        </div>
        <Sparkline data={spark} color={color} width={88} height={36} />
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-numeric text-2xl font-bold text-ink-primary">{count}</span>
        <span className="text-2xs text-ink-secondary">종목</span>
      </div>
      {/* keep `type` used to silence lints; debug attr useful for testing */}
      <span data-type={type} className="hidden" />
    </button>
  );
}
