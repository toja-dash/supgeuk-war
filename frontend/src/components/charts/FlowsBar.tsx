import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyFlow } from '../../types/api';

const COLORS = {
  indi: '#94A3B8',
  inst: '#06B6D4',
  frgn: '#A855F7',
};

interface Props {
  data: DailyFlow[];
  show: { indi: boolean; inst: boolean; frgn: boolean };
}

export function FlowsBar({ data, show }: Props) {
  const formatted = data.map((d) => ({
    date: d.date.slice(5).replace('-', '/'),
    개인: d.net_buy_indi,
    기관: d.net_buy_inst,
    외국인: d.net_buy_frgn,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
        />
        <YAxis
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
          label={{ value: '억원', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 10 }}
        />
        <ReferenceLine y={0} stroke="#4B5563" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: '#F9FAFB' }}
          formatter={(v: number) => `${v > 0 ? '+' : ''}${v}억원`}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }}
          iconType="circle"
        />
        {show.indi && <Bar dataKey="개인" fill={COLORS.indi} />}
        {show.inst && <Bar dataKey="기관" fill={COLORS.inst} />}
        {show.frgn && <Bar dataKey="외국인" fill={COLORS.frgn} />}
      </BarChart>
    </ResponsiveContainer>
  );
}
