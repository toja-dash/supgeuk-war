import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Candle } from '../../types/api';

interface Props {
  candles: Candle[];
  color?: string;
  instAvg?: number | null;
  foreignAvg?: number | null;
  height?: number;
}

export function AreaTrend({
  candles,
  color = '#A855F7',
  instAvg,
  foreignAvg,
  height = 380,
}: Props) {
  const data = candles.map((c) => ({ date: c.date, value: c.close }));
  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);
  const yMin = Math.min(...lows, instAvg ?? Infinity, foreignAvg ?? Infinity) * 0.995;
  const yMax = Math.max(...highs, instAvg ?? -Infinity, foreignAvg ?? -Infinity) * 1.005;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 20, bottom: 8, left: 8 }}>
        <defs>
          <linearGradient id="areaTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={{ stroke: '#1F2937' }}
          tickLine={false}
          minTickGap={32}
          tickFormatter={(v: string) => v.slice(5).replace('-', '/')}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={(v: number) => v.toLocaleString('ko-KR')}
        />
        {instAvg != null && (
          <ReferenceLine
            y={instAvg}
            stroke="#06B6D4"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `기관 평단 ${instAvg.toLocaleString('ko-KR')}`,
              position: 'insideTopRight',
              fill: '#06B6D4',
              fontSize: 10,
            }}
          />
        )}
        {foreignAvg != null && (
          <ReferenceLine
            y={foreignAvg}
            stroke="#A855F7"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `외인 평단 ${foreignAvg.toLocaleString('ko-KR')}`,
              position: 'insideBottomRight',
              fill: '#A855F7',
              fontSize: 10,
            }}
          />
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: '#F9FAFB' }}
          formatter={(v: number) => [`${v.toLocaleString('ko-KR')}원`, '종가']}
          labelFormatter={(l: string) => l.replaceAll('-', '.')}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#areaTrendFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
