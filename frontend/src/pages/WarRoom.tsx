import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from '../components/icons';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { TypeBadge } from '../components/ui/Badge';
import { Disclaimer } from '../components/ui/Disclaimer';
import { DivergingBar } from '../components/charts/DivergingBar';
import { SectorBubble } from '../components/charts/SectorBubble';
import { getOrMock } from '../api/withMock';
import {
  mockDominance,
  mockMarketBrief,
  mockSectors,
  mockSignals,
} from '../mocks';
import type {
  MarketBrief,
  MarketDominance,
  MarketSignals,
  SectorBubble as SectorBubbleType,
  SignalType,
  TopPick,
} from '../types/api';

const TYPE_META: Record<SignalType, { label: string; sub: string; color: string }> = {
  A: { label: 'Type A', sub: '쌍끌이 설거지', color: '#EF4444' },
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
            <SparkleIcon />
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

      {/* Row 3 — Type 카드 4개 */}
      <div>
        <div className="mb-3 text-sm font-semibold text-ink-secondary">⚡ 오늘의 시그널 요약</div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Type A · 쌍끌이 설거지"
            value={sig.count_a}
            sub="종목"
            borderColor={TYPE_META.A.color}
            onClick={() => navigate('/screener?type=A')}
          />
          <StatCard
            label="Type B · 쌍끌이 매수"
            value={sig.count_b}
            sub="종목"
            borderColor={TYPE_META.B.color}
            onClick={() => navigate('/screener?type=B')}
          />
          <StatCard
            label="Type C · 개미털기"
            value={sig.count_c}
            sub="종목"
            borderColor={TYPE_META.C.color}
            onClick={() => navigate('/screener?type=C')}
          />
          <StatCard
            label="Type D · 기관 방어"
            value={sig.count_d}
            sub="종목"
            borderColor={TYPE_META.D.color}
            onClick={() => navigate('/screener?type=D')}
          />
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}

function PickRow({ pick, onClick }: { pick: TopPick; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-surface-2"
      >
        <span className="flex items-center gap-2 text-sm">
          <TypeBadge type={pick.type} />
          <span className="text-ink-primary">{pick.name}</span>
        </span>
        <ChevronRight className="h-4 w-4 text-ink-muted" />
      </button>
    </li>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.6 4.8L18 8.4l-4.4 1.6L12 14.8 10.4 10 6 8.4l4.4-1.6L12 2zM18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
    </svg>
  );
}
