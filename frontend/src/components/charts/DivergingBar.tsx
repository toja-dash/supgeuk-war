import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Row {
  label: string;
  indi: number;
  inst: number;
  frgn: number;
}

const COLORS = {
  indi: '#94A3B8',
  inst: '#06B6D4',
  frgn: '#A855F7',
};

export function DivergingBar({ rows }: { rows: Row[] }) {
  // 기획서 §2.3: Y축 = 시장 라벨, 시장당 3개 그룹 바 (개인/기관/외국인)
  const data = rows.map((r) => ({
    market: r.label,
    개인: r.indi,
    기관: r.inst,
    외국인: r.frgn,
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
            barCategoryGap={20}
          >
            <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[-100, 100]}
              ticks={[-100, -50, 0, 50, 100]}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
            />
            <YAxis
              type="category"
              dataKey="market"
              tick={{ fill: '#F9FAFB', fontSize: 12, fontWeight: 600 }}
              width={56}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#F9FAFB' }}
              itemStyle={{ color: '#F9FAFB' }}
              formatter={(v) => {
                const n = Number(v);
                return `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
              }}
            />
            <ReferenceLine x={0} stroke="#4B5563" />
            <Bar dataKey="개인" fill={COLORS.indi} radius={[3, 3, 3, 3]} />
            <Bar dataKey="기관" fill={COLORS.inst} radius={[3, 3, 3, 3]} />
            <Bar dataKey="외국인" fill={COLORS.frgn} radius={[3, 3, 3, 3]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-2xs text-ink-secondary">
        <LegendDot color={COLORS.indi} label="개인" />
        <LegendDot color={COLORS.inst} label="기관" />
        <LegendDot color={COLORS.frgn} label="외국인" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </span>
  );
}
