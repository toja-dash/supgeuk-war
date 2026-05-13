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
    const chartCandles = candles
      .map((c) => ({
        time: (c.date ?? c.time) as Time | undefined,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }))
      .filter((c): c is typeof c & { time: Time } => Boolean(c.time));

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
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
