// Professional candlestick chart using lightweight-charts
import { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

// Generate realistic-looking mock OHLCV data
function generateMockCandles(count = 200) {
  const candles: { time: string; open: number; high: number; low: number; close: number; }[] = [];
  let price = 42000 + Math.random() * 3000;
  const baseDate = new Date('2024-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const volatility = 200 + Math.random() * 600;
    const open = price;
    const direction = Math.random() > 0.48 ? 1 : -1;
    const move = Math.random() * volatility * direction;
    const close = open + move;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    candles.push({ time: dateStr, open, high, low, close });
    price = close;
  }
  return candles;
}

function generateMockVolume(candles: { close: number; open: number }[]) {
  return candles.map((c, i) => ({
    time: candles[i] ? (candles[i] as any).time : '',
    value: 500 + Math.random() * 3000,
    color: c.close >= c.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
  }));
}

export default function PriceChartWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontFamily: "'Inter', 'Roboto Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(0,240,255,0.15)', width: 1, style: 2, labelBackgroundColor: '#0a1628' },
        horzLine: { color: 'rgba(0,240,255,0.15)', width: 1, style: 2, labelBackgroundColor: '#0a1628' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addSeries({
      type: 'Candlestick',
    });
    candleSeries.applyOptions({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      wickUpColor: '#26a69a',
    });

    const candles = generateMockCandles(200);
    candleSeries.setData(candles as any);

    const volumeSeries = chart.addSeries({
      type: 'Histogram',
    });
    volumeSeries.applyOptions({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    } as any);
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeries.setData(generateMockVolume(candles) as any);

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-1.5 left-2 flex items-center gap-2">
        <span className="text-[10px] font-mono text-white/30 tracking-wider">BTC/USDT</span>
        <span className="text-[10px] font-mono text-white/20">1D</span>
      </div>
    </div>
  );
}
