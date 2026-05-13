import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshIcon } from '../components/icons';
import { Card } from '../components/ui/Card';
import { TypeBadge, DefenseBadge, ChangePct } from '../components/ui/Badge';
import { Disclaimer } from '../components/ui/Disclaimer';
import { CandlestickChart } from '../components/charts/Candlestick';
import { FlowsBar } from '../components/charts/FlowsBar';
import { getOrMock } from '../api/withMock';
import {
  mockCandles,
  mockFlows,
  mockMaEvents,
  mockSimilarPatterns,
  mockStock,
} from '../mocks';
import type {
  Candle,
  DailyFlow,
  MaEvent,
  SignalType,
  SimilarPattern,
  StockInfo,
} from '../types/api';
import { fmtDate, fmtInt, fmtPct, fmtPrice, fmtSfi } from '../lib/format';

const TYPE_COLOR: Record<SignalType, string> = {
  A: '#EF4444',
  B: '#10B981',
  C: '#06B6D4',
  D: '#F59E0B',
};

const PERIODS = ['1M', '3M', '6M', '1Y'] as const;

export default function DeepDive() {
  const { ticker } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('3M');
  const [showSubjects, setShowSubjects] = useState({ indi: true, inst: true, frgn: true });
  const [candleSourceToggle, setCandleSourceToggle] = useState<'daily' | 'weekly'>('daily');

  const { data: stock } = useQuery({
    queryKey: ['stock', ticker],
    queryFn: () => getOrMock<StockInfo>(`/stock/${ticker}`, mockStock(ticker ?? '005930')),
  });
  const { data: candles } = useQuery({
    queryKey: ['stock', ticker, 'candles', period],
    queryFn: () =>
      getOrMock<Candle[]>(`/stock/${ticker}/candles?period=${period}`, mockCandles),
  });
  const { data: flows } = useQuery({
    queryKey: ['stock', ticker, 'flows', 7],
    queryFn: () => getOrMock<DailyFlow[]>(`/stock/${ticker}/flows?days=7`, mockFlows),
  });
  const { data: maEvents } = useQuery({
    queryKey: ['stock', ticker, 'ma'],
    queryFn: () => getOrMock<MaEvent[]>(`/stock/${ticker}/ma-events?limit=5`, mockMaEvents),
  });
  const { data: patterns } = useQuery({
    queryKey: ['stock', ticker, 'patterns'],
    queryFn: () =>
      getOrMock<SimilarPattern[]>(`/stock/${ticker}/similar-patterns?n=3`, mockSimilarPatterns),
  });

  const s = stock ?? mockStock(ticker ?? '005930');
  const c = candles ?? mockCandles;
  const f = flows ?? mockFlows;
  const ma = maEvents ?? mockMaEvents;
  const sim = patterns ?? mockSimilarPatterns;

  const today = c[c.length - 1];
  const yest = c[c.length - 2];
  const yearHigh = Math.max(...c.map((x) => x.high));
  const yearLow = Math.min(...c.map((x) => x.low));
  const accentColor = TYPE_COLOR[s.type];

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1 — 종목 헤더 */}
      <div className="flex flex-wrap items-end gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-end gap-3">
          <h1 className="text-2xl font-bold text-ink-primary">{s.name}</h1>
          <span className="mb-1 rounded bg-surface-2 px-2 py-0.5 font-numeric text-sm text-ink-muted">
            {s.ticker}
          </span>
          <span className="mb-1 rounded bg-surface-2 px-2 py-0.5 text-xs text-ink-secondary">
            {s.market} · {s.sector}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-numeric text-3xl font-bold text-ink-primary">{fmtPrice(s.close)}</span>
          <ChangePct value={s.change_pct} />
        </div>
        <div className="flex items-center gap-2">
          <TypeBadge type={s.type} />
          <DefenseBadge state={s.defense_status} />
        </div>
        <div className="flex-grow" />
        <button
          onClick={() => navigate('/screener')}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink-secondary transition hover:text-ink-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          목록으로
        </button>
      </div>

      {/* Row 2 — AI 진단 */}
      <Card accentColor={accentColor}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-2xs uppercase tracking-wide text-ink-secondary">
              🤖 AI 수급 전술 진단
            </div>
            <h2 className="text-base font-semibold text-ink-primary">{s.deep_dive_headline}</h2>
            <ul className="mt-1 space-y-0.5 text-sm text-ink-secondary">
              <li>• {s.deep_dive_line1}</li>
              <li>• {s.deep_dive_line2}</li>
            </ul>
          </div>
          <button className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-ink-secondary transition hover:text-ink-primary">
            <RefreshIcon className="h-3.5 w-3.5" />
            AI 진단 새로고침
          </button>
        </div>
      </Card>

      {/* Row 3 — 캔들차트 */}
      <Card
        title="📈 일별 시세 (캔들차트)"
        subtitle="기관·외인 평단선 오버레이"
        action={
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-2 py-1 text-2xs ${
                  period === p
                    ? 'bg-brand-primary text-ink-primary'
                    : 'bg-surface-2 text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        }
      >
        <CandlestickChart
          candles={c}
          instAvg={s.avg_cost_20d_inst}
          foreignAvg={s.avg_cost_20d_frgn}
        />
        <div className="mt-3 flex items-center justify-center gap-6 text-2xs text-ink-secondary">
          <LegendDash color="#06B6D4" label={`기관 평단 ${fmtPrice(s.avg_cost_20d_inst)}`} />
          <LegendDash color="#A855F7" label={`외인 평단 ${fmtPrice(s.avg_cost_20d_frgn)}`} />
        </div>
      </Card>

      {/* Row 4 — 시세 패널 / 7일 수급 */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-5">
          <Card
            title="💹 시세"
            action={
              <div className="flex gap-1">
                {(['daily', 'weekly'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setCandleSourceToggle(opt)}
                    className={`rounded-md px-2 py-1 text-2xs ${
                      candleSourceToggle === opt
                        ? 'bg-brand-primary text-ink-primary'
                        : 'bg-surface-2 text-ink-secondary hover:text-ink-primary'
                    }`}
                  >
                    {opt === 'daily' ? '일봉' : '주봉'}
                  </button>
                ))}
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <PriceRow label="1일 최저" value={fmtPrice(today.low)} />
              <PriceRow label="1년 최저" value={fmtPrice(yearLow)} />
              <PriceRow label="1일 최고" value={fmtPrice(today.high)} />
              <PriceRow label="1년 최고" value={fmtPrice(yearHigh)} />
              <PriceRow label="시작가" value={fmtPrice(today.open)} />
              <PriceRow label="종가" value={fmtPrice(today.close)} />
              <PriceRow label="거래량" value={`${fmtInt(today.volume)}주`} />
              <PriceRow
                label="거래대금"
                value={`${fmtInt(Math.round((today.close * today.volume) / 1e8))}억`}
              />
              {yest && (
                <>
                  <PriceRow label="전일 종가" value={fmtPrice(yest.close)} />
                  <PriceRow
                    label="전일 대비"
                    value={
                      <ChangePct value={+(((today.close - yest.close) / yest.close) * 100).toFixed(2)} />
                    }
                  />
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-7">
          <Card
            title="📊 최근 7일 수급 (순매수)"
            subtitle="단위: 억원"
            action={
              <div className="flex gap-1">
                <Toggle
                  active={showSubjects.indi}
                  onClick={() => setShowSubjects((p) => ({ ...p, indi: !p.indi }))}
                  color="#94A3B8"
                  label="개인"
                />
                <Toggle
                  active={showSubjects.inst}
                  onClick={() => setShowSubjects((p) => ({ ...p, inst: !p.inst }))}
                  color="#06B6D4"
                  label="기관"
                />
                <Toggle
                  active={showSubjects.frgn}
                  onClick={() => setShowSubjects((p) => ({ ...p, frgn: !p.frgn }))}
                  color="#A855F7"
                  label="외국인"
                />
              </div>
            }
          >
            <FlowsBar data={f} show={showSubjects} />
          </Card>
        </div>
      </div>

      {/* Row 5 — MA 맥점 / 유사 패턴 */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-6">
          <Card title="🔍 주요 이동평균선 맥점" subtitle="5 / 20 / 60 / 120">
            <ul className="flex flex-col divide-y divide-border-subtle">
              {ma.map((ev, i) => (
                <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`mt-0.5 rounded-md px-2 py-0.5 text-2xs font-semibold ${
                      ev.event_type === 'GOLDEN_CROSS'
                        ? 'bg-signal-b-bg text-signal-b'
                        : 'bg-signal-a-bg text-signal-a'
                    }`}
                  >
                    {ev.event_type === 'GOLDEN_CROSS' ? '골든크로스' : '데드크로스'}
                  </span>
                  <div className="flex-grow">
                    <div className="text-sm text-ink-primary">
                      {fmtDate(ev.date)} · {fmtPrice(ev.short_value)} / {fmtPrice(ev.long_value)}
                    </div>
                    <div className="text-2xs text-ink-secondary">{ev.interpretation}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-6">
          <Card title="📚 과거 패턴 유사도 Top 3" subtitle="현재 수급 패턴과 유사한 과거 구간">
            <ul className="flex flex-col divide-y divide-border-subtle">
              {sim.map((p, i) => (
                <li
                  key={i}
                  className="grid grid-cols-12 items-center gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="col-span-5">
                    <div className="text-sm text-ink-primary">{p.similar_name}</div>
                    <div className="text-2xs text-ink-muted">
                      {fmtDate(p.period_start)} ~ {fmtDate(p.period_end)}
                    </div>
                  </div>
                  <div className="col-span-3 text-center">
                    <div className="font-numeric text-lg font-bold text-ink-primary">
                      {(p.similarity * 100).toFixed(0)}%
                    </div>
                    <div className="text-2xs text-ink-muted">유사도</div>
                  </div>
                  <div className="col-span-4 text-right text-2xs">
                    <div className="text-ink-secondary">
                      5일 후 <span className={p.return_5d >= 0 ? 'text-num-up' : 'text-num-down'}>{fmtPct(p.return_5d)}</span>
                    </div>
                    <div className="text-ink-secondary">
                      20일 후 <span className={p.return_20d >= 0 ? 'text-num-up' : 'text-num-down'}>{fmtPct(p.return_20d)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-2xs text-ink-muted">※ 과거 통계는 미래 수익을 보장하지 않습니다.</p>
          </Card>
        </div>
      </div>

      {/* SFI 요약 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SfiSummaryCard label="기관 SFI" value={s.sfi_inst} color="#06B6D4" />
        <SfiSummaryCard label="외국인 SFI" value={s.sfi_frgn} color="#A855F7" />
        <SfiSummaryCard label="20일 기관 평단" value={s.avg_cost_20d_inst} color="#06B6D4" isPrice />
        <SfiSummaryCard label="20일 외인 평단" value={s.avg_cost_20d_frgn} color="#A855F7" isPrice />
      </div>

      <Disclaimer />
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle/40 pb-1.5">
      <span className="text-xs text-ink-secondary">{label}</span>
      <span className="font-numeric text-sm text-ink-primary">{value}</span>
    </div>
  );
}

function LegendDash({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="block h-0.5 w-5" style={{ background: color, borderTop: `1px dashed ${color}` }} />
      <span>{label}</span>
    </span>
  );
}

function Toggle({
  active,
  onClick,
  color,
  label,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-2xs transition ${
        active
          ? 'border-border bg-surface-2 text-ink-primary'
          : 'border-border-subtle text-ink-muted hover:text-ink-secondary'
      }`}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: active ? color : 'transparent', border: `1px solid ${color}` }}
      />
      {label}
    </button>
  );
}

function SfiSummaryCard({
  label,
  value,
  color,
  isPrice = false,
}: {
  label: string;
  value: number | null;
  color: string;
  isPrice?: boolean;
}) {
  return (
    <div
      className="rounded-lg border border-border-subtle bg-surface p-4 shadow-card"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="text-2xs uppercase tracking-wide text-ink-secondary">{label}</div>
      <div className="mt-1 font-numeric text-xl font-bold text-ink-primary">
        {value === null ? '-' : isPrice ? fmtPrice(value) : fmtSfi(value)}
      </div>
    </div>
  );
}
