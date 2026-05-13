import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type Time,
} from 'lightweight-charts';
import type { Candle } from '../../types/api';
import { fmtInt, fmtPrice } from '../../lib/format';

interface Props {
  candles: Candle[];
  instAvg?: number | null;
  foreignAvg?: number | null;
}

export function CandlestickChart({ candles, instAvg, foreignAvg }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;
    const chartCandles = candles
      .map((c) => ({
        time: (c.date ?? c.time) as Time | undefined,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }))
      .filter(
        (c): c is typeof c & { time: Time } =>
          Boolean(c.time) && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0 && c.volume > 0
      );

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: {
        background: { color: '#111827' },
        textColor: '#9CA3AF',
        fontFamily: 'Pretendard, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#1F2937' },
        horzLines: { color: '#1F2937' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: '#374151', timeVisible: false },
      rightPriceScale: { borderColor: '#374151' },
      localization: {
        locale: 'ko-KR',
        dateFormat: 'yyyy/MM/dd',
      },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#EF4444',
      downColor: '#3B82F6',
      borderUpColor: '#EF4444',
      borderDownColor: '#3B82F6',
      wickUpColor: '#EF4444',
      wickDownColor: '#3B82F6',
    });
    candleSeries.setData(
      chartCandles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    if (instAvg) {
      candleSeries.createPriceLine({
        price: instAvg,
        color: '#06B6D4',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '기관 평단',
      });
    }
    if (foreignAvg) {
      candleSeries.createPriceLine({
        price: foreignAvg,
        color: '#A855F7',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '외인 평단',
      });
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(
      chartCandles.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)',
      }))
    );

    const tooltip = document.createElement('div');
    tooltip.className =
      'pointer-events-none absolute z-10 hidden min-w-[170px] rounded-md border border-border bg-surface/95 px-3 py-2 text-2xs text-ink-secondary shadow-elevated';
    container.style.position = 'relative';
    container.appendChild(tooltip);

    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        tooltip.classList.add('hidden');
        return;
      }

      const candle = chartCandles.find((item) => item.time === param.time);
      if (!candle) {
        tooltip.classList.add('hidden');
        return;
      }

      tooltip.innerHTML = `
        <div class="mb-1 font-numeric text-xs font-semibold text-ink-primary">${formatTime(candle.time)}</div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span>시가</span><span class="text-right font-numeric text-ink-primary">${fmtPrice(candle.open)}</span>
          <span>고가</span><span class="text-right font-numeric text-num-up">${fmtPrice(candle.high)}</span>
          <span>저가</span><span class="text-right font-numeric text-num-down">${fmtPrice(candle.low)}</span>
          <span>종가</span><span class="text-right font-numeric text-ink-primary">${fmtPrice(candle.close)}</span>
          <span>거래량</span><span class="text-right font-numeric text-ink-primary">${fmtInt(candle.volume)}</span>
        </div>
      `;

      const tooltipWidth = tooltip.offsetWidth || 170;
      const tooltipHeight = tooltip.offsetHeight || 132;
      const x = param.point.x + 12;
      const y = param.point.y + 12;
      tooltip.style.left = `${Math.min(x, container.clientWidth - tooltipWidth - 8)}px`;
      tooltip.style.top = `${Math.min(y, 400 - tooltipHeight - 8)}px`;
      tooltip.classList.remove('hidden');
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (ref.current) chart.applyOptions({ width: ref.current.clientWidth });
    });
    ro.observe(ref.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, instAvg, foreignAvg]);

  return <div ref={ref} className="h-[400px] w-full" />;
}

function formatTime(time: Time) {
  if (typeof time === 'string') {
    return time.replaceAll('-', '.');
  }
  if (typeof time === 'number') {
    return new Date(time * 1000).toLocaleDateString('ko-KR');
  }
  return `${time.year}.${String(time.month).padStart(2, '0')}.${String(time.day).padStart(2, '0')}`;
}
