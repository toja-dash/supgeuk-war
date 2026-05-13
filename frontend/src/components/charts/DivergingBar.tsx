import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  const data = rows.flatMap((r) => [
    { market: r.label, subject: '개인', value: r.indi, fill: COLORS.indi },
    { market: r.label, subject: '기관', value: r.inst, fill: COLORS.inst },
    { market: r.label, subject: '외국인', value: r.frgn, fill: COLORS.frgn },
  ]);
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  const domainMax = Math.ceil(maxAbs * 1.05);
  const domain: [number, number] = [-domainMax, domainMax];
  const ticks = [-domainMax, 0, domainMax];

  return (
    <div className="flex h-[300px] flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 6, right: 12, bottom: 0, left: 4 }}
            barCategoryGap={6}
          >
            <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={domain}
              ticks={ticks}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
            />
            <YAxis
              type="category"
              dataKey="subject"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
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
            <Bar dataKey="value" radius={[3, 3, 3, 3]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Bar>
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
