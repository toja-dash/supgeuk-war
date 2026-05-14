import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { SectorBubble as Bubble, SignalType } from '../../types/api';
import { fmtCompactKRW, fmtSfi } from '../../lib/format';

const TYPE_COLORS: Record<SignalType, string> = {
  A: '#EF4444',
  B: '#10B981',
  C: '#06B6D4',
  D: '#F59E0B',
};

const TYPE_LABEL: Record<SignalType, string> = {
  A: '동반 분산 매도 (Q3)',
  B: '동반 매집 구간 (Q1)',
  C: '외인 단독 유입 (Q4)',
  D: '기관 방어 우위 (Q2)',
};

interface Props {
  data: Bubble[];
  onSelect?: (sector: string, type: SignalType) => void;
}

export function SectorBubble({ data, onSelect }: Props) {
  const chartData = data.map((d) => ({
    x: d.sfi_frgn,
    y: d.sfi_inst,
    z: d.trade_value,
    sector: d.sector,
    type: d.dominant_type,
    trade: d.trade_value,
  }));

  return (
    <div className="relative h-[300px]">
      <QuadrantLabels />
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 24, bottom: 18, left: 8 }}>
          <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="외국인 SFI"
            domain={[-30, 30]}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={{ stroke: '#374151' }}
            label={{
              value: '외국인 SFI',
              position: 'insideBottom',
              offset: -4,
              fill: '#9CA3AF',
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="기관 SFI"
            domain={[-30, 30]}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={{ stroke: '#374151' }}
            label={{
              value: '기관 SFI',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              fill: '#9CA3AF',
              fontSize: 11,
            }}
          />
          <ZAxis type="number" dataKey="z" range={[200, 1800]} />
          <ReferenceLine
            x={0}
            stroke="#E5E7EB"
            strokeWidth={1.5}
            ifOverflow="extendDomain"
          />
          <ReferenceLine
            y={0}
            stroke="#E5E7EB"
            strokeWidth={1.5}
            ifOverflow="extendDomain"
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid #374151',
              borderRadius: 8,
              fontSize: 12,
            }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof chartData)[number];
              return (
                <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink-primary shadow-elevated">
                  <div className="mb-1 font-semibold">{p.sector}</div>
                  <div className="space-y-0.5 text-ink-secondary">
                    <div>
                      외국인 SFI: <span className="font-numeric text-ink-primary">{fmtSfi(p.x)}</span>
                    </div>
                    <div>
                      기관 SFI: <span className="font-numeric text-ink-primary">{fmtSfi(p.y)}</span>
                    </div>
                    <div>
                      거래대금: <span className="font-numeric text-ink-primary">{fmtCompactKRW(p.trade)}</span>
                    </div>
                    <div>
                      주도력: <span style={{ color: TYPE_COLORS[p.type] }}>{TYPE_LABEL[p.type]} (Type {p.type})</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Scatter
            data={chartData}
            onClick={(d: { payload?: (typeof chartData)[number] }) => {
              const p = d?.payload;
              if (p?.sector) onSelect?.(p.sector, p.type);
            }}
            isAnimationActive={false}
          >
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={TYPE_COLORS[d.type]}
                fillOpacity={0.55}
                stroke={TYPE_COLORS[d.type]}
                strokeWidth={1.5}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function QuadrantLabels() {
  const base =
    'absolute pointer-events-none whitespace-nowrap rounded-sm bg-surface/70 px-1.5 py-0.5 text-[10px] leading-none text-ink-muted/80 backdrop-blur-[1px]';
  return (
    <div className="pointer-events-none absolute inset-x-0 inset-y-0 z-10">
      {/* 2사분면 (좌상) — 상단 중앙 */}
      <div className={base} style={{ top: '10%', left: '30%', transform: 'translateX(-50%)' }}>
        Q2 · 기관 방어 우위
      </div>
      {/* 1사분면 (우상) — 상단 중앙 */}
      <div className={base} style={{ top: '10%', left: '75%', transform: 'translateX(-50%)' }}>
        Q1 · 동반 매집 구간
      </div>
      {/* 3사분면 (좌하) — 하단 중앙 */}
      <div className={base} style={{ bottom: '22%', left: '30%', transform: 'translateX(-50%)' }}>
        Q3 · 동반 분산 매도
      </div>
      {/* 4사분면 (우하) — 하단 중앙 */}
      <div className={base} style={{ bottom: '22%', left: '75%', transform: 'translateX(-50%)' }}>
        Q4 · 외인 단독 유입
      </div>
    </div>
  );
}
