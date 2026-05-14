import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Disclaimer } from '../components/ui/Disclaimer';
import { apiClient } from '../api/client';
import type {
  ArchiveCasesResponse,
  ArchiveHighlight,
  ArchiveSummary,
  ArchiveSummaryItem,
  SignalType,
} from '../types/api';
import { fmtDate, fmtInt, fmtPct, fmtSfi } from '../lib/format';

const TYPES: Array<{ key: SignalType; label: string; sub: string; color: string }> = [
  { key: 'B', label: 'Q1', sub: '동반 매집 구간', color: '#10B981' },
  { key: 'D', label: 'Q2', sub: '기관 방어 우위', color: '#F59E0B' },
  { key: 'A', label: 'Q3', sub: '동반 분산 매도', color: '#EF4444' },
  { key: 'C', label: 'Q4', sub: '외인 단독 유입', color: '#06B6D4' },
];

const EMPTY_SUMMARY: ArchiveSummaryItem = {
  total_count: 0,
  avg_return_5d: 0,
  win_rate_5d: 0,
  avg_return_20d: 0,
  win_rate_20d: 0,
  archive_summary: '데이터를 불러오는 중입니다.',
};

export default function Archive() {
  const [activeType, setActiveType] = useState<SignalType>('B');
  const navigate = useNavigate();

  const { data: summary } = useQuery({
    queryKey: ['archive', 'summary'],
    queryFn: () => apiClient.get<ArchiveSummary>('/archive/summary'),
  });
  const { data: cases } = useQuery({
    queryKey: ['archive', 'cases', activeType],
    queryFn: () =>
      apiClient.get<ArchiveCasesResponse>(
        `/archive/cases?type=${activeType}&page=1&size=50`,
      ),
  });
  const { data: highlights } = useQuery({
    queryKey: ['archive', 'highlights', activeType],
    queryFn: () => apiClient.get<ArchiveHighlight[]>(`/archive/highlights?type=${activeType}&size=3`),
  });

  const sum = summary?.[activeType] ?? EMPTY_SUMMARY;
  const items = cases?.items ?? [];
  const highlightItems = highlights ?? [];
  const activeMeta = TYPES.find((t) => t.key === activeType)!;

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1 — Type 탭 */}
      <div className="flex gap-1 border-b border-border-subtle">
        {TYPES.map((t) => {
          const active = activeType === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              className={`flex flex-col items-start gap-0.5 border-b-2 px-4 py-3 text-left transition ${
                active ? 'text-ink-primary' : 'border-transparent text-ink-secondary hover:text-ink-primary'
              }`}
              style={active ? { borderColor: t.color } : undefined}
            >
              <span className="text-sm font-semibold">{t.label}</span>
              <span className="text-2xs text-ink-muted">{t.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Row 2 — 통계 카드 3개 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="과거 3개월 총 발생 횟수"
          value={fmtInt(sum.total_count)}
          sub="건"
          borderColor={activeMeta.color}
        />
        <StatCard
          label="발생 후 5일 평균 수익률"
          value={<span className={sum.avg_return_5d >= 0 ? 'text-num-up' : 'text-num-down'}>{fmtPct(sum.avg_return_5d)}</span>}
          sub={`승률 ${(sum.win_rate_5d * 100).toFixed(0)}%`}
          borderColor={activeMeta.color}
        />
        <StatCard
          label="발생 후 20일 평균 수익률"
          value={<span className={sum.avg_return_20d >= 0 ? 'text-num-up' : 'text-num-down'}>{fmtPct(sum.avg_return_20d)}</span>}
          sub={`승률 ${(sum.win_rate_20d * 100).toFixed(0)}%`}
          borderColor={activeMeta.color}
        />
      </div>

      {/* 패턴별 백테스트 하이라이트 */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-base font-bold text-ink-primary">📊 패턴별 백테스트 하이라이트</h2>
            <p className="text-2xs text-ink-secondary">
              {activeMeta.label} 시그널 발생 후 20거래일 수익률 기준 대표 사례
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            highlightItems[i] ? (
              <CaseStudyCard
                key={highlightItems[i].ticker + highlightItems[i].date}
                item={highlightItems[i]}
                accent={activeMeta.color}
                onClick={() => navigate(`/deep-dive/${highlightItems[i].ticker}`)}
              />
            ) : (
              <CaseStudyPlaceholder key={i} accent={activeMeta.color} />
            )
          ))}
        </div>
      </div>

      {/* Row 3 — 과거 사례 테이블 */}
      <Card title="📚 과거 주요 발생 사례" subtitle={sum.archive_summary} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-2xs uppercase text-ink-secondary">
                <th className="px-4 py-2.5 text-left font-medium">발생일</th>
                <th className="px-4 py-2.5 text-left font-medium">종목명</th>
                <th className="px-4 py-2.5 text-left font-medium">섹터</th>
                <th className="px-4 py-2.5 text-right font-medium">기관 SFI</th>
                <th className="px-4 py-2.5 text-right font-medium">외인 SFI</th>
                <th className="px-4 py-2.5 text-right font-medium">5일 후</th>
                <th className="px-4 py-2.5 text-right font-medium">20일 후</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => navigate(`/deep-dive/${row.ticker}`)}
                  className="cursor-pointer border-b border-border-subtle/60 transition hover:bg-surface-2"
                >
                  <td className="px-4 py-3 font-numeric text-ink-secondary">{fmtDate(row.date)}</td>
                  <td className="px-4 py-3 font-semibold text-ink-primary">{row.name}</td>
                  <td className="px-4 py-3 text-ink-secondary">{row.sector}</td>
                  <td className="px-4 py-3 text-right font-numeric text-ink-primary">{fmtSfi(row.sfi_inst)}</td>
                  <td className="px-4 py-3 text-right font-numeric text-ink-primary">{fmtSfi(row.sfi_frgn)}</td>
                  <ReturnCell value={row.return_5d} />
                  <ReturnCell value={row.return_20d} />
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-muted">
                    조회된 사례가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Disclaimer>
        면책 고지: 과거 수급 패턴 및 통계 자료는 투자 참고용 역사적 맥락 데이터일 뿐, 미래 주가 상승을 보장하지 않습니다.
        실제 투자에서는 외부 환경 등 다양한 요인이 작용하므로 참고 자료로만 활용하시기 바랍니다.
      </Disclaimer>
    </div>
  );
}

function ReturnCell({ value }: { value: number | null }) {
  const colorClass = value == null ? 'text-ink-muted' : value >= 0 ? 'text-num-up' : 'text-num-down';
  return <td className={`px-4 py-3 text-right font-numeric ${colorClass}`}>{fmtPct(value)}</td>;
}

function CaseStudyCard({
  item,
  accent,
  onClick,
}: {
  item: ArchiveHighlight;
  accent: string;
  onClick: () => void;
}) {
  const qMap: Record<SignalType, string> = { A: 'Q3', B: 'Q1', C: 'Q4', D: 'Q2' };
  const positive = item.return_20d >= 0;
  const metricColor = positive ? '#EF4444' : '#3B82F6';

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[210px] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface p-6 text-left transition hover:border-brand-accent/60 hover:bg-surface-2"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${accent}, transparent)` }}
      />
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center rounded-md border px-2 py-0.5 text-2xs font-bold"
          style={{ borderColor: `${accent}55`, color: accent, background: `${accent}14` }}
        >
          {qMap[item.type]}
        </span>
        <span className="font-numeric text-2xs text-ink-muted">{fmtDate(item.date)}</span>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="truncate text-lg font-bold text-ink-primary">{item.name}</span>
        <span className="shrink-0 font-numeric text-2xs text-ink-muted">{item.ticker}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
        기관 SFI {fmtSfi(item.sfi_inst)}, 외인 SFI {fmtSfi(item.sfi_frgn)}로 {qMap[item.type]} 발생.
        5거래일 후 {fmtPct(item.return_5d)}, 20거래일 후 {fmtPct(item.return_20d)}.
      </p>
      <div className="mt-auto flex items-end justify-between pt-6">
        <span className="font-numeric text-3xl font-extrabold" style={{ color: metricColor }}>
          {fmtPct(item.return_20d)}
        </span>
        <span className="pb-1 text-2xs text-ink-secondary">20거래일 후</span>
      </div>
    </button>
  );
}

function CaseStudyPlaceholder({ accent }: { accent: string }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-lg border border-dashed border-border-subtle bg-surface/40 p-6">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${accent}55, transparent)` }}
      />
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center rounded-md border px-2 py-0.5 text-2xs font-bold opacity-60"
          style={{ borderColor: `${accent}55`, color: accent, background: `${accent}10` }}
        >
          Type —
        </span>
        <span className="inline-flex items-center gap-1.5 text-2xs text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-ink-secondary/40" />
          Case Study
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-lg font-bold text-ink-muted">데이터 준비 중</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        해당 Type의 대표 백테스트 사례가 곧 추가됩니다.
      </p>
      <div className="mt-auto flex items-end justify-between pt-6">
        <span className="font-numeric text-3xl font-extrabold text-ink-muted">--</span>
        <span className="pb-1 text-2xs text-ink-muted">대표 메트릭</span>
      </div>
    </div>
  );
}
