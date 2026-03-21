import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, LineSeries, AreaSeries, HistogramSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, LineData, Time } from 'lightweight-charts';
import { useChart } from '@/context/ChartContext';
import type { Drawing } from '@/types/chart';

function calculateEMA(data: { close: number; time: Time }[], period: number): LineData[] {
  const k = 2 / (period + 1);
  const result: LineData[] = [];
  let ema = data[0]?.close ?? 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema = data[i].close;
    } else {
      ema = data[i].close * k + ema * (1 - k);
    }
    if (i >= period - 1) {
      result.push({ time: data[i].time, value: ema });
    }
  }
  return result;
}

function calculateSMA(data: { close: number; time: Time }[], period: number): LineData[] {
  const result: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function calculateBollinger(data: { close: number; time: Time }[], period = 20) {
  const upper: LineData[] = [];
  const middle: LineData[] = [];
  const lower: LineData[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    const avg = sum / period;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (data[j].close - avg) ** 2;
    const std = Math.sqrt(variance / period);
    const t = data[i].time;
    upper.push({ time: t, value: avg + 2 * std });
    middle.push({ time: t, value: avg });
    lower.push({ time: t, value: avg - 2 * std });
  }
  return { upper, middle, lower };
}

const EMA_COLORS: Record<string, string> = {
  'EMA 9': '#f7931a',
  'EMA 21': '#e91e63',
  'EMA 50': '#2196f3',
  'EMA 200': '#9c27b0',
  'SMA 20': '#ff9800',
  'SMA 50': '#4caf50',
};

export default function TradingChart() {
  const { symbol, interval, chartType, drawingTool, indicators, drawings, addDrawing } = useChart();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const drawingSeriesRef = useRef<Map<string, ISeriesApi<'Line'> | any>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const rawDataRef = useRef<{ close: number; time: Time }[]>([]);
  const [ohlc, setOhlc] = useState({ o: 0, h: 0, l: 0, c: 0, v: 0, change: 0 });
  const drawingStartRef = useRef<{ time: number; price: number } | null>(null);
  const previewSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#787b86',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#758696', width: 1, style: 3, labelBackgroundColor: '#2a2e39' },
        horzLine: { color: '#758696', width: 1, style: 3, labelBackgroundColor: '#2a2e39' },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Create series based on chart type
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove old series
    if (mainSeriesRef.current) {
      try { chart.removeSeries(mainSeriesRef.current); } catch {}
    }
    if (volumeSeriesRef.current) {
      try { chart.removeSeries(volumeSeriesRef.current); } catch {}
    }

    if (chartType === 'candles' || chartType === 'hollow') {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: chartType === 'hollow' ? 'transparent' : '#26a69a',
        downColor: chartType === 'hollow' ? 'transparent' : '#ef5350',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      mainSeriesRef.current = series as any;
    } else if (chartType === 'line') {
      const series = chart.addSeries(LineSeries, {
        color: '#2962ff',
        lineWidth: 2,
      });
      mainSeriesRef.current = series as any;
    } else if (chartType === 'area') {
      const series = chart.addSeries(AreaSeries, {
        topColor: 'rgba(41, 98, 255, 0.3)',
        bottomColor: 'rgba(41, 98, 255, 0.02)',
        lineColor: '#2962ff',
        lineWidth: 2,
      });
      mainSeriesRef.current = series as any;
    }

    const volSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeriesRef.current = volSeries;
  }, [chartType]);

  // Fetch data and connect WebSocket
  useEffect(() => {
    const series = mainSeriesRef.current;
    const volSeries = volumeSeriesRef.current;
    if (!series || !volSeries) return;

    const fetchData = async () => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`
        );
        const data = await res.json();

        const candles: CandlestickData[] = [];
        const volumes: any[] = [];
        const rawForIndicators: { close: number; time: Time }[] = [];

        for (const k of data) {
          const time = (k[0] / 1000) as Time;
          const o = parseFloat(k[1]);
          const h = parseFloat(k[2]);
          const l = parseFloat(k[3]);
          const c = parseFloat(k[4]);
          const v = parseFloat(k[5]);

          candles.push({ time, open: o, high: h, low: l, close: c });
          volumes.push({
            time,
            value: v,
            color: c >= o ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
          });
          rawForIndicators.push({ close: c, time });
        }

        rawDataRef.current = rawForIndicators;

        if (chartType === 'line' || chartType === 'area') {
          (series as any).setData(candles.map(c => ({ time: c.time, value: (c as any).close })));
        } else {
          (series as any).setData(candles);
        }
        volSeries.setData(volumes);

        const last = candles[candles.length - 1];
        if (last) {
          const prev = candles[candles.length - 2];
          setOhlc({
            o: (last as any).open,
            h: (last as any).high,
            l: (last as any).low,
            c: (last as any).close,
            v: volumes[volumes.length - 1]?.value ?? 0,
            change: prev ? (((last as any).close - (prev as any).close) / (prev as any).close) * 100 : 0,
          });
        }

        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        console.error('Failed to fetch klines:', err);
      }
    };

    fetchData();

    // WebSocket
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
    );
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const k = msg.k;
      if (!k) return;

      const time = (k.t / 1000) as Time;
      const o = parseFloat(k.o);
      const h = parseFloat(k.h);
      const l = parseFloat(k.l);
      const c = parseFloat(k.c);
      const v = parseFloat(k.v);

      if (chartType === 'line' || chartType === 'area') {
        (series as any).update({ time, value: c });
      } else {
        (series as any).update({ time, open: o, high: h, low: l, close: c });
      }

      volSeries.update({
        time,
        value: v,
        color: c >= o ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
      });

      setOhlc(prev => ({ ...prev, o, h, l, c, v }));
    };

    return () => {
      ws.close();
    };
  }, [symbol, interval, chartType]);

  // Apply indicators
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove old indicator series
    indicatorSeriesRef.current.forEach((s) => {
      try { chart.removeSeries(s); } catch {}
    });
    indicatorSeriesRef.current.clear();

    const data = rawDataRef.current;
    if (data.length === 0) return;

    for (const ind of indicators) {
      if (ind.startsWith('EMA')) {
        const period = parseInt(ind.split(' ')[1]);
        const emaData = calculateEMA(data, period);
        const s = chart.addSeries(LineSeries, {
          color: EMA_COLORS[ind] || '#ffffff',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        s.setData(emaData);
        indicatorSeriesRef.current.set(ind, s);
      } else if (ind.startsWith('SMA')) {
        const period = parseInt(ind.split(' ')[1]);
        const smaData = calculateSMA(data, period);
        const s = chart.addLineSeries({
          color: EMA_COLORS[ind] || '#ffffff',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        s.setData(smaData);
        indicatorSeriesRef.current.set(ind, s);
      } else if (ind === 'Bollinger Bands') {
        const bb = calculateBollinger(data);
        const colors = ['#e91e63', '#2196f3', '#e91e63'];
        const names = ['BB Upper', 'BB Middle', 'BB Lower'];
        [bb.upper, bb.middle, bb.lower].forEach((d, i) => {
          const s = chart.addLineSeries({
            color: colors[i],
            lineWidth: 1,
            lineStyle: i === 1 ? 0 : 2,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          s.setData(d);
          indicatorSeriesRef.current.set(names[i], s);
        });
      }
    }
  }, [indicators, rawDataRef.current.length]);

  // Render existing drawings
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove old drawing series
    drawingSeriesRef.current.forEach((s) => {
      try { chart.removeSeries(s); } catch {}
    });
    drawingSeriesRef.current.clear();

    for (const drawing of drawings) {
      if (drawing.type === 'trendline' || drawing.type === 'ray') {
        if (drawing.points.length >= 2) {
          const s = chart.addLineSeries({
            color: drawing.color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });

          let lineData: LineData[];
          if (drawing.type === 'ray') {
            // Extend the line far into the future
            const p1 = drawing.points[0];
            const p2 = drawing.points[1];
            const dt = p2.time - p1.time;
            const dp = p2.price - p1.price;
            const extendedTime = p2.time + dt * 100;
            const extendedPrice = p2.price + dp * 100;
            lineData = [
              { time: p1.time as Time, value: p1.price },
              { time: p2.time as Time, value: p2.price },
              { time: extendedTime as Time, value: extendedPrice },
            ];
          } else {
            lineData = drawing.points.map(p => ({
              time: p.time as Time,
              value: p.price,
            }));
          }

          s.setData(lineData);
          drawingSeriesRef.current.set(drawing.id, s);
        }
      } else if (drawing.type === 'horizontalline') {
        if (drawing.points.length >= 1 && mainSeriesRef.current) {
          const priceLine = (mainSeriesRef.current as any).createPriceLine({
            price: drawing.points[0].price,
            color: drawing.color,
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
          });
          drawingSeriesRef.current.set(drawing.id, priceLine);
        }
      } else if (drawing.type === 'fibonacci') {
        if (drawing.points.length >= 2) {
          const p1 = drawing.points[0].price;
          const p2 = drawing.points[1].price;
          const diff = p2 - p1;
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const colors = ['#787b86', '#f44336', '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#787b86'];

          levels.forEach((level, i) => {
            const price = p1 + diff * level;
            if (mainSeriesRef.current) {
              const pl = (mainSeriesRef.current as any).createPriceLine({
                price,
                color: colors[i],
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: true,
                title: `${(level * 100).toFixed(1)}%`,
              });
              drawingSeriesRef.current.set(`${drawing.id}_${i}`, pl);
            }
          });
        }
      }
    }
  }, [drawings]);

  // Handle drawing clicks
  useEffect(() => {
    const chart = chartRef.current;
    const series = mainSeriesRef.current;
    if (!chart || !series || drawingTool === 'cursor') return;

    const handleClick = (param: any) => {
      if (!param.time || !param.point) return;

      const price = (series as any).coordinateToPrice(param.point.y);
      if (price === null) return;
      const time = param.time as number;

      if (drawingTool === 'horizontalline') {
        const drawing: Drawing = {
          id: `d_${Date.now()}`,
          type: 'horizontalline',
          points: [{ time, price }],
          color: '#2962ff',
        };
        addDrawing(drawing);
      } else if (drawingTool === 'trendline' || drawingTool === 'ray' || drawingTool === 'fibonacci') {
        if (!drawingStartRef.current) {
          drawingStartRef.current = { time, price };
          // Add preview series
          const ps = chart.addLineSeries({
            color: '#2962ff',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          ps.setData([{ time: time as Time, value: price }]);
          previewSeriesRef.current = ps;
        } else {
          const start = drawingStartRef.current;
          // Ensure correct time order
          const points = start.time <= time
            ? [start, { time, price }]
            : [{ time, price }, start];

          const drawing: Drawing = {
            id: `d_${Date.now()}`,
            type: drawingTool,
            points,
            color: drawingTool === 'fibonacci' ? '#787b86' : '#2962ff',
          };
          addDrawing(drawing);
          drawingStartRef.current = null;

          if (previewSeriesRef.current) {
            try { chart.removeSeries(previewSeriesRef.current); } catch {}
            previewSeriesRef.current = null;
          }
        }
      }
    };

    chart.subscribeClick(handleClick);

    // Preview line on crosshair move
    const handleMove = (param: any) => {
      if (!drawingStartRef.current || !previewSeriesRef.current || !param.time || !param.point) return;
      const price = (series as any).coordinateToPrice(param.point.y);
      if (price === null) return;

      const start = drawingStartRef.current;
      const time = param.time as number;

      const points = start.time <= time
        ? [
            { time: start.time as Time, value: start.price },
            { time: time as Time, value: price },
          ]
        : [
            { time: time as Time, value: price },
            { time: start.time as Time, value: start.price },
          ];

      previewSeriesRef.current.setData(points);
    };

    chart.subscribeCrosshairMove(handleMove);

    return () => {
      chart.unsubscribeClick(handleClick);
      chart.unsubscribeCrosshairMove(handleMove);
      if (previewSeriesRef.current) {
        try { chart.removeSeries(previewSeriesRef.current); } catch {}
        previewSeriesRef.current = null;
      }
      drawingStartRef.current = null;
    };
  }, [drawingTool, addDrawing]);

  const isPositive = ohlc.c >= ohlc.o;

  return (
    <div className="flex-1 flex flex-col relative bg-chart-bg">
      {/* OHLC bar */}
      <div className="absolute top-2 left-3 z-10 flex items-center gap-3 text-xs font-mono">
        <span className="text-muted-foreground">O</span>
        <span className={isPositive ? 'text-chart-bull' : 'text-chart-bear'}>{ohlc.o.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        <span className="text-muted-foreground">H</span>
        <span className={isPositive ? 'text-chart-bull' : 'text-chart-bear'}>{ohlc.h.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        <span className="text-muted-foreground">L</span>
        <span className={isPositive ? 'text-chart-bull' : 'text-chart-bear'}>{ohlc.l.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        <span className="text-muted-foreground">C</span>
        <span className={isPositive ? 'text-chart-bull' : 'text-chart-bear'}>{ohlc.c.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        <span className={`${isPositive ? 'text-chart-bull' : 'text-chart-bear'}`}>
          {isPositive ? '+' : ''}{ohlc.change.toFixed(2)}%
        </span>
      </div>

      {/* Drawing mode indicator */}
      {drawingTool !== 'cursor' && (
        <div className="absolute top-2 right-3 z-10 bg-primary/20 text-primary text-xs px-2 py-1 rounded">
          {drawingTool === 'trendline' && 'Click two points for trend line'}
          {drawingTool === 'horizontalline' && 'Click to place horizontal line'}
          {drawingTool === 'ray' && 'Click two points for ray'}
          {drawingTool === 'fibonacci' && 'Click two points for Fibonacci'}
          {drawingStartRef.current && ' (click second point)'}
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1"
        style={{ cursor: drawingTool !== 'cursor' ? 'crosshair' : 'default' }}
      />
    </div>
  );
}
