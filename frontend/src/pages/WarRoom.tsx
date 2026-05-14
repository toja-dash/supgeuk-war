import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from '../components/icons';
import { Card } from '../components/ui/Card';
import { TypeBadge } from '../components/ui/Badge';
import { Disclaimer } from '../components/ui/Disclaimer';
import { DivergingBar } from '../components/charts/DivergingBar';
import { SectorBubble } from '../components/charts/SectorBubble';
import { Sparkline } from '../components/charts/Sparkline';
import { apiClient } from '../api/client';
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
  A: { label: 'Type A', sub: '동반 분산 매도', color: '#EF4444' },
  B: { label: 'Type B', sub: '동반 매집 구간', color: '#10B981' },
  C: { label: 'Type C', sub: '외인 단독 유입', color: '#06B6D4' },
  D: { label: 'Type D', sub: '기관 방어 우위', color: '#F59E0B' },
};

const PICK_LABEL: Record<SignalType, string> = {
  A: 'Type A — 동반 분산 매도',
  B: 'Type B — 동반 매집 구간',
  C: 'Type C — 외인 단독 유입',
  D: 'Type D — 기관 방어 우위',
};

const EMPTY_DOMINANCE: MarketDominance = {
  kospi: { indi: 0, inst: 0, frgn: 0 },
  kosdaq: { indi: 0, inst: 0, frgn: 0 },
};

const EMPTY_PICKS: Record<SignalType, TopPick[]> = { A: [], B: [], C: [], D: [] };

const TYPE_DESC: Record<SignalType, string> = {
  A: '외국인과 기관의 동반 분산 매도가 집중되며, 주요 방어선 이탈 위험이 높은 주의 구간입니다.',
  B: '외국인과 기관의 자금이 동시에 유입되며 강한 상승 시너지를 내는 매수 주도 구간입니다.',
  C: '기관의 매도세 속에서 외국인 자금이 단독으로 유입되며 수급 우위를 점하고 있는 구간입니다.',
  D: '외국인의 매도세에도 불구하고, 기관이 적극적으로 물량을 받아내며 주가를 방어하는 구간입니다.',
};

// 시그널 카드용 아이코노그라픽 스파크라인 — 시계열 데이터가 아닌 Type 특성을 시각화한 정적 패턴
//   A 위험: 우하향 / B 강세: 우상향 / C 충돌: 진폭 / D 방어: 횡보
const TYPE_PATTERN: Record<SignalType, number[]> = {
  A: [22, 21, 20, 19, 18, 16, 15, 14, 13, 12, 12],
  B: [10, 12, 13, 15, 18, 21, 24, 26, 27, 28, 28],
  C: [38, 41, 39, 43, 40, 44, 41, 45, 42, 46, 45],
  D: [33, 31, 32, 30, 31, 30, 32, 31, 30, 32, 31],
};

export default function WarRoom() {
  const navigate = useNavigate();

  const { data: brief } = useQuery({
    queryKey: ['market', 'brief'],
    queryFn: () => apiClient.get<MarketBrief>('/market/brief'),
  });
  const { data: dominance } = useQuery({
    queryKey: ['market', 'dominance'],
    queryFn: () => apiClient.get<MarketDominance>('/market/dominance'),
  });
  const { data: sectors } = useQuery({
    queryKey: ['market', 'sectors'],
    queryFn: () => apiClient.get<SectorBubbleType[]>('/market/sectors'),
  });
  const { data: signals } = useQuery({
    queryKey: ['market', 'signals'],
    queryFn: () => apiClient.get<MarketSignals>('/market/signals'),
  });

  const dom = dominance ?? EMPTY_DOMINANCE;
  const sectorData = sectors ?? [];
  const picks = signals?.top_picks ?? EMPTY_PICKS;

  const briefText = brief?.market_brief_text ?? '시장 브리핑 데이터를 불러오는 중입니다.';
  const briefAccent =
    brief && brief.kospi_change_pct > 0
      ? TYPE_META.B.color
      : brief && brief.kospi_change_pct < 0
        ? TYPE_META.A.color
        : '#6B7280';

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1 — Market Brief Banner */}
      <Card accentColor={briefAccent}>
        <div className="flex flex-col gap-1">
          <div className="text-2xs uppercase tracking-wide text-ink-secondary">Market Brief</div>
          <p className="text-base leading-relaxed text-ink-primary">
            {renderBrief(briefText)}
          </p>
        </div>
      </Card>

      {/* Row 2 — 3-column grid */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-3">
          <Card title="📊 시장 3파전 주도력" className="h-[390px]">
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
            className="h-[390px]"
          >
            <SectorBubble
              data={sectorData}
              onSelect={(sector, type) =>
                navigate(`/screener?sector=${encodeURIComponent(sector)}&type=${type}`)
              }
            />
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-3">
          <Card
            title="👁 오늘의 주목 종목"
            className="flex h-[390px] flex-col"
            bodyClassName="flex min-h-0 flex-1 flex-col"
          >
            <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2">
              {(['A', 'B', 'C', 'D'] as const).map((type) => {
                const meta = TYPE_META[type];
                const list = picks[type] ?? [];
                if (list.length === 0) return null;
                return (
                  <div key={type} className="flex flex-col gap-1.5">
                    <div
                      className="flex items-center gap-2 border-l-2 pl-2 text-xs font-semibold text-ink-secondary"
                      style={{ borderColor: meta.color }}
                    >
                      {PICK_LABEL[type]}
                    </div>
                    <ul className="flex flex-col">
                      {list.map((p) => (
                        <PickRow
                          key={p.ticker}
                          pick={p}
                          onClick={() => navigate(`/deep-dive/${p.ticker}`)}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
              {Object.values(picks).every((v) => v.length === 0) && (
                <EmptyBox label="주목 종목 데이터를 불러오는 중입니다" height={200} />
              )}
            </div>
            <p className="mt-3 text-2xs text-ink-muted">※ 규칙 기반 자동 분류 결과 — 매수·매도 조언이 아닙니다.</p>
          </Card>
        </div>
      </div>

      {/* Row 3 — Type 카드 4개 (스파크라인 슬롯 유지) */}
      <div>
        <div className="mb-3 text-sm font-semibold text-ink-secondary">⚡ 오늘의 시그널 요약</div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {(['A', 'B', 'C', 'D'] as const).map((t) => (
            <SignalTypeCard
              key={t}
              label={TYPE_META[t].label}
              sub={TYPE_META[t].sub}
              color={TYPE_META[t].color}
              description={TYPE_DESC[t]}
              count={signals ? (t === 'A' ? signals.count_a : t === 'B' ? signals.count_b : t === 'C' ? signals.count_c : signals.count_d) : null}
              spark={TYPE_PATTERN[t]}
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
  const change = pick.change_pct;
  // type_intensity = max(|sfi_inst|, |sfi_frgn|) — 이미 % 단위. SFI 일반 범위 0~30
  const intensity = pick.type_intensity ?? 0;
  const typeColor = TYPE_META[pick.type].color;

  // 좌측 수치: 등락률이 있으면 등락률(색상 적용), 없으면 수급 강도% (SFI 절댓값 max)
  const hasChange = change !== undefined;
  const numericText = hasChange ? fmtPct(change) : `${intensity.toFixed(1)}%`;
  const numericCls = hasChange
    ? change > 0
      ? 'text-num-up'
      : change < 0
        ? 'text-num-down'
        : 'text-num-flat'
    : 'text-ink-secondary';

  // 막대바 채움: 화면에 표시된 수치와 일치시킴
  //   - change_pct 있을 때: |등락률|이 ±5%일 때 만점
  //   - 없을 때(fallback): SFI 30%일 때 만점
  const barRatio = hasChange
    ? Math.max(0, Math.min(1, Math.abs(change!) / 5))
    : Math.max(0, Math.min(1, intensity / 30));

  return (
    <li>
      <button
        onClick={onClick}
        className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-surface-2"
      >
        <TypeBadge type={pick.type} />
        <span className="min-w-0 flex-grow truncate text-sm text-ink-primary">{pick.name}</span>
        <span className={`shrink-0 font-numeric text-2xs tabular-nums ${numericCls}`}>
          {numericText}
        </span>
        <span
          className="block h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-surface-2"
          title={
            hasChange
              ? `등락률 ${fmtPct(change!)} · 수급 강도 ${intensity.toFixed(2)}%`
              : `수급 강도 ${intensity.toFixed(2)}% (SFI 절댓값 최대치)`
          }
        >
          <span
            className="block h-full rounded-full transition-all"
            style={{ width: `${barRatio * 100}%`, background: typeColor }}
          />
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-ink-primary" />
      </button>
    </li>
  );
}

function SignalTypeCard({
  label,
  sub,
  color,
  description,
  count,
  spark,
  onClick,
}: {
  label: string;
  sub: string;
  color: string;
  description: string;
  count: number | null;
  spark: number[];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={description}
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
        <span className="font-numeric text-2xl font-bold text-ink-primary">
          {count === null ? '-' : count}
        </span>
        <span className="text-2xs text-ink-secondary">종목</span>
      </div>
    </button>
  );
}

function EmptyBox({ label, height = 160 }: { label: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-md border border-dashed border-border-subtle text-2xs text-ink-muted"
      style={{ height }}
    >
      {label}
    </div>
  );
}

// `**굵게**` 마크다운 마커 → <strong>, ⚠ 앞에 자동 줄바꿈
function renderBrief(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const result: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      result.push(
        <strong key={`b-${i}`} className="font-semibold text-ink-primary">
          {part.slice(2, -2)}
        </strong>
      );
      return;
    }
    // 평문 안에 ⚠ 가 있으면 그 앞에서 줄바꿈
    const subparts = part.split(/(\s*⚠\s*)/g);
    subparts.forEach((sub, j) => {
      if (!sub) return;
      if (/\s*⚠\s*/.test(sub) && sub.includes('⚠')) {
        result.push(<br key={`br-${i}-${j}`} />);
        result.push(<span key={`w-${i}-${j}`}>⚠ </span>);
      } else {
        result.push(<span key={`t-${i}-${j}`}>{sub}</span>);
      }
    });
  });
  return result;
}
