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
  // 백엔드는 net_buy를 raw 원(KRW) 단위로 반환 → 억원으로 변환
  const toEokwon = (won: number) => won / 1e8;
  // 선택된 주체만 data에 포함시켜 Recharts가 그 범위로 Y축 자동 재스케일
  const formatted = data.map((d) => {
    const row: { date: string; 개인?: number; 기관?: number; 외국인?: number } = {
      date: d.date.slice(5).replace('-', '/'),
    };
    if (show.indi) row['개인'] = toEokwon(d.net_buy_indi);
    if (show.inst) row['기관'] = toEokwon(d.net_buy_inst);
    if (show.frgn) row['외국인'] = toEokwon(d.net_buy_frgn);
    return row;
  });
  const fmtAxis = (v: number) =>
    Math.abs(v) >= 10000
      ? `${Math.round(v / 1000)}천억`
      : Math.abs(v) >= 1
        ? `${v.toFixed(0)}`
        : v.toFixed(1);
  const fmtTip = (v: number) => {
    const sign = v > 0 ? '+' : '';
    if (Math.abs(v) >= 10000) return `${sign}${(v / 1000).toFixed(1)}천억원`;
    return `${sign}${v.toFixed(Math.abs(v) >= 100 ? 0 : 1)}억원`;
  };

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
          width={56}
          tickFormatter={fmtAxis}
          label={{ value: '억원', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 10 }}
        />
        <ReferenceLine y={0} stroke="#4B5563" />
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
          formatter={(v) => fmtTip(Number(v))}
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
