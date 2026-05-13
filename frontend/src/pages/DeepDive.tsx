import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshIcon } from '../components/icons';
import { Card } from '../components/ui/Card';
import { TypeBadge, DefenseBadge, ChangePct } from '../components/ui/Badge';
import { Disclaimer } from '../components/ui/Disclaimer';
import { CandlestickChart } from '../components/charts/Candlestick';
import { AreaTrend } from '../components/charts/AreaTrend';
import { DefenseLadder } from '../components/charts/DefenseLadder';
import { FlowsBar } from '../components/charts/FlowsBar';
import { apiClient } from '../api/client';
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

function isTradableCandle(candle: Candle) {
  return (
    candle.open > 0 &&
    candle.high > 0 &&
    candle.low > 0 &&
    candle.close > 0 &&
    candle.volume > 0
  );
}

function positiveOrNull(value: number | null) {
  return value != null && value > 0 ? value : null;
}

export default function DeepDive() {
  const { ticker } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('3M');
  const [showSubjects, setShowSubjects] = useState({ indi: true, inst: true, frgn: true });
  const [candleSourceToggle, setCandleSourceToggle] = useState<'daily' | 'weekly'>('daily');
  const [chartMode, setChartMode] = useState<'candle' | 'trend'>('candle');

  const stockQ = useQuery({
    queryKey: ['stock', ticker],
    queryFn: () => apiClient.get<StockInfo>(`/stock/${ticker}`),
  });
  const { data: candles } = useQuery({
    queryKey: ['stock', ticker, 'candles', period],
    queryFn: () => apiClient.get<Candle[]>(`/stock/${ticker}/candles?period=${period}`),
  });
  const { data: flows } = useQuery({
    queryKey: ['stock', ticker, 'flows', 7],
    queryFn: () => apiClient.get<DailyFlow[]>(`/stock/${ticker}/flows?days=7`),
  });
  const { data: maEvents } = useQuery({
    queryKey: ['stock', ticker, 'ma'],
    queryFn: () => apiClient.get<MaEvent[]>(`/stock/${ticker}/ma-events?limit=5`),
  });
  const { data: patterns } = useQuery({
    queryKey: ['stock', ticker, 'patterns'],
    queryFn: () => apiClient.get<SimilarPattern[]>(`/stock/${ticker}/similar-patterns?n=3`),
  });

  const s = stockQ.data;

  if (stockQ.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-24 animate-pulse rounded-lg bg-surface" />
        <div className="h-20 animate-pulse rounded-lg bg-surface" />
        <div className="h-[420px] animate-pulse rounded-lg bg-surface" />
      </div>
    );
  }

  if (!s) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-border-subtle bg-surface p-10 text-center text-sm text-ink-secondary">
          종목 정보를 불러올 수 없습니다.{' '}
          <button onClick={() => navigate('/screener')} className="text-brand-primary hover:underline">
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const allValid = (candles ?? []).filter(isTradableCandle);

  // period에 따라 표시할 캔들 수 제한 (백엔드가 더 긴 기간을 보낼 때도 안전)
  const PERIOD_LIMIT: Record<typeof period, number> = {
    '1M': 23,
    '3M': 65,
    '6M': 130,
    '1Y': 260,
  };
  const validCandles = allValid.slice(-PERIOD_LIMIT[period]);

  const f = flows ?? [];
  const ma = maEvents ?? [];
  const sim = patterns ?? [];

  // 일봉/주봉 토글에 따른 시세 패널 데이터 — 주봉은 최근 5거래일 집계
  const weekCandles = allValid.slice(-5);
  const panelToday: typeof allValid[number] | undefined =
    candleSourceToggle === 'weekly' && weekCandles.length
      ? {
          date: weekCandles[weekCandles.length - 1].date,
          open: weekCandles[0].open,
          high: Math.max(...weekCandles.map((x) => x.high)),
          low: Math.min(...weekCandles.map((x) => x.low)),
          close: weekCandles[weekCandles.length - 1].close,
          volume: weekCandles.reduce((sum, x) => sum + x.volume, 0),
        }
      : allValid[allValid.length - 1];
  const panelPrev: typeof allValid[number] | undefined =
    candleSourceToggle === 'weekly' && allValid.length >= 10
      ? (() => {
          const prevWeek = allValid.slice(-10, -5);
          return {
            date: prevWeek[prevWeek.length - 1].date,
            open: prevWeek[0].open,
            high: Math.max(...prevWeek.map((x) => x.high)),
            low: Math.min(...prevWeek.map((x) => x.low)),
            close: prevWeek[prevWeek.length - 1].close,
            volume: prevWeek.reduce((sum, x) => sum + x.volume, 0),
          };
        })()
      : allValid[allValid.length - 2];

  const today = panelToday;
  const yest = panelPrev;
  // period에 맞춘 최저/최고 (시세 패널이 차트와 같은 기간을 반영하도록)
  const periodHigh = validCandles.length
    ? Math.max(...validCandles.map((x) => x.high))
    : null;
  const periodLow = validCandles.length
    ? Math.min(...validCandles.map((x) => x.low))
    : null;
  // PERIODS의 사람 친화 라벨
  const PERIOD_LABEL: Record<typeof period, string> = {
    '1M': '1M',
    '3M': '3M',
    '6M': '6M',
    '1Y': '1Y',
  };
  const instAvg = positiveOrNull(s.avg_cost_20d_inst);
  const foreignAvg = positiveOrNull(s.avg_cost_20d_frgn);
  const hasSignalData = s.defense_status !== 'INSUFFICIENT_DATA';
  const accentColor = TYPE_COLOR[s.type];

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5">
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
            <h2 className="text-base font-semibold text-ink-primary">
              {s.deep_dive_headline || 'AI 진단 결과가 준비되지 않았습니다'}
            </h2>
            <ul className="mt-1 space-y-0.5 text-sm text-ink-secondary">
              {s.deep_dive_line1 && <li>• {s.deep_dive_line1}</li>}
              {s.deep_dive_line2 && <li>• {s.deep_dive_line2}</li>}
            </ul>
          </div>
          <button className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-ink-secondary transition hover:text-ink-primary">
            <RefreshIcon className="h-3.5 w-3.5" />
            AI 진단 새로고침
          </button>
        </div>
      </Card>

      {/* SFI 요약 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SfiSummaryCard label="기관 SFI" value={hasSignalData ? s.sfi_inst : null} color="#06B6D4" />
        <SfiSummaryCard label="외국인 SFI" value={hasSignalData ? s.sfi_frgn : null} color="#A855F7" />
        <SfiSummaryCard label="20일 기관 평단" value={instAvg} color="#06B6D4" isPrice />
        <SfiSummaryCard label="20일 외인 평단" value={foreignAvg} color="#A855F7" isPrice />
      </div>

      {/* Row 3 — 가격 차트 + 방어선 ladder */}
      <Card
        title={chartMode === 'candle' ? '📈 일별 시세 (캔들차트)' : '📈 가격 추이 (그라데이션)'}
        subtitle="기관·외인 평단선 오버레이"
        action={
          <div className="flex items-center gap-3">
            <div className="flex gap-1 rounded-md bg-surface-2/60 p-0.5">
              {(['candle', 'trend'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`rounded px-2 py-1 text-2xs font-medium transition ${
                    chartMode === m
                      ? 'bg-brand-primary text-ink-primary'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  {m === 'candle' ? '캔들' : '추세'}
                </button>
              ))}
            </div>
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
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            {chartMode === 'candle' ? (
              <CandlestickChart
                candles={validCandles}
                instAvg={instAvg}
                foreignAvg={foreignAvg}
              />
            ) : (
              <AreaTrend
                candles={validCandles}
                color={accentColor}
                instAvg={instAvg}
                foreignAvg={foreignAvg}
                height={400}
              />
            )}
            <div className="mt-3 flex items-center justify-center gap-6 text-2xs text-ink-secondary">
              <LegendDash color="#06B6D4" label={`기관 평단 ${fmtPrice(instAvg)}`} />
              <LegendDash color="#A855F7" label={`외인 평단 ${fmtPrice(foreignAvg)}`} />
            </div>
          </div>
          <div className="min-w-0">
            <div className="h-full rounded-md border border-border-subtle bg-surface-2/30 p-4">
              <div className="mb-3 text-2xs uppercase tracking-wide text-ink-muted">
                평단 방어선 ladder
              </div>
              <DefenseLadder
                currentPrice={s.close}
                instAvg={instAvg}
                foreignAvg={foreignAvg}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Row 4 — 시세 패널 / 7일 수급 */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0">
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
              {(() => {
                const unitLabel = candleSourceToggle === 'weekly' ? '1주' : '1일';
                const prevLabel = candleSourceToggle === 'weekly' ? '전주' : '전일';
                return (
                  <>
                    <PriceRow label={`${unitLabel} 최저`} value={fmtPrice(today?.low ?? null)} />
                    <PriceRow label={`${PERIOD_LABEL[period]} 최저`} value={fmtPrice(periodLow)} />
                    <PriceRow label={`${unitLabel} 최고`} value={fmtPrice(today?.high ?? null)} />
                    <PriceRow label={`${PERIOD_LABEL[period]} 최고`} value={fmtPrice(periodHigh)} />
                    <PriceRow label="시작가" value={fmtPrice(today?.open ?? null)} />
                    <PriceRow label="종가" value={fmtPrice(today?.close ?? null)} />
                    <PriceRow label="거래량" value={today ? `${fmtInt(today.volume)}주` : '-'} />
                    <PriceRow
                      label="거래대금"
                      value={today ? `${fmtInt(Math.round((today.close * today.volume) / 1e8))}억` : '-'}
                    />
                    {yest && today && (
                      <>
                        <PriceRow label={`${prevLabel} 종가`} value={fmtPrice(yest.close)} />
                        <PriceRow
                          label={`${prevLabel} 대비`}
                          value={
                            <ChangePct value={+(((today.close - yest.close) / yest.close) * 100).toFixed(2)} />
                          }
                        />
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </Card>
        </div>

        <div className="min-w-0">
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
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="min-w-0">
          <Card title="🔍 주요 이동평균선 맥점" subtitle="5 / 20 / 60 / 120">
            {ma.length > 0 ? (
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
            ) : (
              <EmptyBox label="이동평균선 이벤트 데이터가 없습니다" height={160} />
            )}
          </Card>
        </div>

        <div className="min-w-0">
          <Card title="📚 과거 패턴 유사도 Top 3" subtitle="현재 수급 패턴과 유사한 과거 구간">
            {sim.length > 0 ? (
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
                        5일 후{' '}
                        <span className={p.return_5d >= 0 ? 'text-num-up' : 'text-num-down'}>
                          {fmtPct(p.return_5d)}
                        </span>
                      </div>
                      <div className="text-ink-secondary">
                        20일 후{' '}
                        <span className={p.return_20d >= 0 ? 'text-num-up' : 'text-num-down'}>
                          {fmtPct(p.return_20d)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyBox label="과거 유사 패턴 데이터가 없습니다" height={160} />
            )}
            <p className="mt-3 text-2xs text-ink-muted">※ 과거 통계는 미래 수익을 보장하지 않습니다.</p>
          </Card>
        </div>
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
