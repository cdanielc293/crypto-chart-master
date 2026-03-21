import { useEffect, useRef, useState } from 'react';
import {
  createChart, ColorType, CrosshairMode,
  CandlestickSeries, LineSeries, AreaSeries, HistogramSeries, BarSeries, BaselineSeries,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, LineData, Time } from 'lightweight-charts';
import { useChart } from '@/context/ChartContext';
import type { Drawing } from '@/types/chart';

// ─── Indicator calculations ───

function calculateEMA(data: { close: number; time: Time }[], period: number): LineData[] {
  const k = 2 / (period + 1);
  const result: LineData[] = [];
  let ema = data[0]?.close ?? 0;
  for (let i = 0; i < data.length; i++) {
    ema = i === 0 ? data[i].close : data[i].close * k + ema * (1 - k);
    if (i >= period - 1) result.push({ time: data[i].time, value: ema });
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
  const upper: LineData[] = [], middle: LineData[] = [], lower: LineData[] = [];
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

// ─── Chart type transformations ───

interface RawCandle {
  time: Time; open: number; high: number; low: number; close: number; volume: number;
}

function toHeikinAshi(candles: RawCandle[]): RawCandle[] {
  const ha: RawCandle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const prevHa = ha[i - 1];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = prevHa ? (prevHa.open + prevHa.close) / 2 : (c.open + c.close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    ha.push({ time: c.time, open: haOpen, high: haHigh, low: haLow, close: haClose, volume: c.volume });
  }
  return ha;
}

function toRenko(candles: RawCandle[], boxSize?: number): RawCandle[] {
  if (candles.length === 0) return [];
  if (!boxSize) {
    const prices = candles.map(c => c.close);
    const range = Math.max(...prices) - Math.min(...prices);
    boxSize = Math.max(range / 50, 0.01);
  }
  const bricks: RawCandle[] = [];
  let lastClose = Math.round(candles[0].close / boxSize) * boxSize;
  let timeIdx = 0;

  for (const c of candles) {
    const diff = c.close - lastClose;
    const numBricks = Math.floor(Math.abs(diff) / boxSize);
    const direction = diff > 0 ? 1 : -1;

    for (let i = 0; i < numBricks; i++) {
      const brickOpen = lastClose;
      const brickClose = lastClose + direction * boxSize;
      bricks.push({
        time: (candles[0].time as number + timeIdx * 60) as Time,
        open: brickOpen,
        close: brickClose,
        high: Math.max(brickOpen, brickClose),
        low: Math.min(brickOpen, brickClose),
        volume: c.volume,
      });
      lastClose = brickClose;
      timeIdx++;
    }
  }
  return bricks;
}

function toLineBreak(candles: RawCandle[], lineCount = 3): RawCandle[] {
  if (candles.length === 0) return [];
  const lines: RawCandle[] = [];
  let timeIdx = 0;

  for (const c of candles) {
    const newClose = c.close;
    if (lines.length === 0) {
      lines.push({
        time: (candles[0].time as number + timeIdx * 60) as Time,
        open: c.open, close: c.close,
        high: Math.max(c.open, c.close), low: Math.min(c.open, c.close),
        volume: c.volume,
      });
      timeIdx++;
      continue;
    }

    const lastLine = lines[lines.length - 1];
    const isUp = lastLine.close >= lastLine.open;

    if (isUp && newClose > lastLine.close) {
      lines.push({
        time: (candles[0].time as number + timeIdx * 60) as Time,
        open: lastLine.close, close: newClose,
        high: newClose, low: lastLine.close, volume: c.volume,
      });
      timeIdx++;
    } else if (!isUp && newClose < lastLine.close) {
      lines.push({
        time: (candles[0].time as number + timeIdx * 60) as Time,
        open: lastLine.close, close: newClose,
        high: lastLine.close, low: newClose, volume: c.volume,
      });
      timeIdx++;
    } else {
      // Check reversal
      const lookback = lines.slice(-lineCount);
      const maxHigh = Math.max(...lookback.map(l => Math.max(l.open, l.close)));
      const minLow = Math.min(...lookback.map(l => Math.min(l.open, l.close)));

      if (isUp && newClose < minLow) {
        lines.push({
          time: (candles[0].time as number + timeIdx * 60) as Time,
          open: lastLine.close, close: newClose,
          high: lastLine.close, low: newClose, volume: c.volume,
        });
        timeIdx++;
      } else if (!isUp && newClose > maxHigh) {
        lines.push({
          time: (candles[0].time as number + timeIdx * 60) as Time,
          open: lastLine.close, close: newClose,
          high: newClose, low: lastLine.close, volume: c.volume,
        });
        timeIdx++;
      }
    }
  }
  return lines;
}

function toKagi(candles: RawCandle[], reversalPercent = 0.04): RawCandle[] {
  if (candles.length === 0) return [];
  const lines: RawCandle[] = [];
  let direction = 0; // 1=up, -1=down
  let lastPrice = candles[0].close;
  let currentHigh = lastPrice;
  let currentLow = lastPrice;
  let timeIdx = 0;
  const baseTime = candles[0].time as number;

  for (const c of candles) {
    const price = c.close;
    if (direction === 0) {
      direction = price >= lastPrice ? 1 : -1;
      lastPrice = price;
      currentHigh = Math.max(currentHigh, price);
      currentLow = Math.min(currentLow, price);
      continue;
    }

    if (direction === 1) {
      if (price > currentHigh) {
        currentHigh = price;
      } else if (price <= currentHigh * (1 - reversalPercent)) {
        lines.push({
          time: (baseTime + timeIdx * 60) as Time,
          open: currentLow, close: currentHigh,
          high: currentHigh, low: currentLow, volume: c.volume,
        });
        timeIdx++;
        direction = -1;
        currentLow = price;
        currentHigh = price;
      }
    } else {
      if (price < currentLow) {
        currentLow = price;
      } else if (price >= currentLow * (1 + reversalPercent)) {
        lines.push({
          time: (baseTime + timeIdx * 60) as Time,
          open: currentHigh, close: currentLow,
          high: currentHigh, low: currentLow, volume: c.volume,
        });
        timeIdx++;
        direction = 1;
        currentHigh = price;
        currentLow = price;
      }
    }
  }

  if (timeIdx > 0 || lines.length === 0) {
    lines.push({
      time: (baseTime + timeIdx * 60) as Time,
      open: direction === 1 ? currentLow : currentHigh,
      close: direction === 1 ? currentHigh : currentLow,
      high: currentHigh, low: currentLow, volume: 0,
    });
  }

  return lines;
}

function toPointAndFigure(candles: RawCandle[], boxSize?: number, reversalBoxes = 3): RawCandle[] {
  if (candles.length === 0) return [];

  if (!boxSize) {
    const prices = candles.map(c => c.close);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    // Traditional P&F box size based on price level
    if (avgPrice < 5) boxSize = 0.25;
    else if (avgPrice < 20) boxSize = 0.5;
    else if (avgPrice < 100) boxSize = 1;
    else if (avgPrice < 500) boxSize = 5;
    else if (avgPrice < 1000) boxSize = 10;
    else if (avgPrice < 5000) boxSize = 50;
    else if (avgPrice < 25000) boxSize = 100;
    else boxSize = 500;
  }

  const reversal = reversalBoxes * boxSize;
  const columns: { direction: 1 | -1; high: number; low: number }[] = [];
  let currentDir: 1 | -1 = 0 as any;
  let colHigh = 0;
  let colLow = Infinity;

  for (const c of candles) {
    const high = c.high;
    const low = c.low;

    if (currentDir === 0) {
      // Initialize
      colHigh = Math.ceil(high / boxSize) * boxSize;
      colLow = Math.floor(low / boxSize) * boxSize;
      if (colHigh - colLow >= boxSize) {
        currentDir = c.close >= c.open ? 1 : -1;
        columns.push({ direction: currentDir, high: colHigh, low: colLow });
      }
      continue;
    }

    if (currentDir === 1) {
      // X column (rising)
      const newHigh = Math.ceil(high / boxSize) * boxSize;
      if (newHigh > colHigh) {
        colHigh = newHigh;
        columns[columns.length - 1].high = colHigh;
      }
      const dropFromHigh = colHigh - Math.floor(low / boxSize) * boxSize;
      if (dropFromHigh >= reversal) {
        currentDir = -1;
        colLow = Math.floor(low / boxSize) * boxSize;
        colHigh = colHigh - boxSize; // O column starts one box below X top
        columns.push({ direction: -1, high: columns[columns.length - 1].high - boxSize, low: colLow });
        colHigh = colLow; // reset for tracking
      }
    } else {
      // O column (falling)
      const newLow = Math.floor(low / boxSize) * boxSize;
      if (newLow < colLow) {
        colLow = newLow;
        columns[columns.length - 1].low = colLow;
      }
      const riseFromLow = Math.ceil(high / boxSize) * boxSize - colLow;
      if (riseFromLow >= reversal) {
        currentDir = 1;
        colHigh = Math.ceil(high / boxSize) * boxSize;
        columns.push({ direction: 1, high: colHigh, low: columns[columns.length - 1].low + boxSize });
        colLow = colHigh; // reset for tracking
      }
    }
  }

  // Convert columns to candle-like representation
  const baseTime = candles[0].time as number;
  return columns.map((col, i) => ({
    time: (baseTime + i * 86400) as Time, // space out by "days" for P&F
    open: col.direction === 1 ? col.low : col.high,
    close: col.direction === 1 ? col.high : col.low,
    high: col.high,
    low: col.low,
    volume: 0,
  }));
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
  const mainSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const indicatorSeriesRef = useRef<Map<string, any>>(new Map());
  const drawingSeriesRef = useRef<Map<string, any>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const rawDataRef = useRef<{ close: number; time: Time }[]>([]);
  const rawCandlesRef = useRef<RawCandle[]>([]);
  const [ohlc, setOhlc] = useState({ o: 0, h: 0, l: 0, c: 0, v: 0, change: 0 });
  const drawingStartRef = useRef<{ time: number; price: number } | null>(null);
  const previewSeriesRef = useRef<any>(null);

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
      rightPriceScale: { borderColor: '#2a2e39', scaleMargins: { top: 0.1, bottom: 0.2 } },
      timeScale: { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale: true,
    });
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    });
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  // Determine which series type to use for chart type
  const isLineType = ['line', 'line_markers', 'step_line'].includes(chartType);
  const isAreaType = ['area', 'hlc_area'].includes(chartType);
  const isBaselineType = chartType === 'baseline';
  const isColumnsType = chartType === 'columns';
  const isBarType = chartType === 'bars' || chartType === 'high_low';
  const isCandleType = ['candles', 'hollow', 'volume_candles', 'heikin_ashi', 'renko', 'line_break', 'kagi', 'point_figure'].includes(chartType);

  // Create series based on chart type
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (mainSeriesRef.current) { try { chart.removeSeries(mainSeriesRef.current); } catch {} }
    if (volumeSeriesRef.current) { try { chart.removeSeries(volumeSeriesRef.current); } catch {} }

    if (isCandleType) {
      const isHollow = chartType === 'hollow';
      const series = chart.addSeries(CandlestickSeries, {
        upColor: isHollow ? 'transparent' : '#26a69a',
        downColor: isHollow ? 'transparent' : '#ef5350',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      mainSeriesRef.current = series;
    } else if (isBarType) {
      const series = chart.addSeries(BarSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        thinBars: chartType === 'high_low',
      });
      mainSeriesRef.current = series;
    } else if (isLineType) {
      const series = chart.addSeries(LineSeries, {
        color: '#2962ff',
        lineWidth: 2,
        lineType: chartType === 'step_line' ? 1 : 0,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: chartType === 'line_markers' ? 6 : 4,
      });
      mainSeriesRef.current = series;
    } else if (isAreaType) {
      const series = chart.addSeries(AreaSeries, {
        topColor: 'rgba(41, 98, 255, 0.3)',
        bottomColor: 'rgba(41, 98, 255, 0.02)',
        lineColor: '#2962ff',
        lineWidth: 2,
      });
      mainSeriesRef.current = series;
    } else if (isBaselineType) {
      const series = chart.addSeries(BaselineSeries, {
        topLineColor: '#26a69a',
        topFillColor1: 'rgba(38, 166, 154, 0.28)',
        topFillColor2: 'rgba(38, 166, 154, 0.05)',
        bottomLineColor: '#ef5350',
        bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
        bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
        lineWidth: 2,
      });
      mainSeriesRef.current = series;
    } else if (isColumnsType) {
      const series = chart.addSeries(HistogramSeries, {
        color: '#2962ff',
      });
      mainSeriesRef.current = series;
    }

    const volSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
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

        const candles: RawCandle[] = [];
        const volumes: any[] = [];
        const rawForIndicators: { close: number; time: Time }[] = [];

        for (const k of data) {
          const time = (k[0] / 1000) as Time;
          const o = parseFloat(k[1]);
          const h = parseFloat(k[2]);
          const l = parseFloat(k[3]);
          const c = parseFloat(k[4]);
          const v = parseFloat(k[5]);
          candles.push({ time, open: o, high: h, low: l, close: c, volume: v });
          volumes.push({ time, value: v, color: c >= o ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)' });
          rawForIndicators.push({ close: c, time });
        }

        rawDataRef.current = rawForIndicators;
        rawCandlesRef.current = candles;

        setChartData(series, candles, volumes, volSeries);

        const last = candles[candles.length - 1];
        if (last) {
          const prev = candles[candles.length - 2];
          setOhlc({
            o: last.open, h: last.high, l: last.low, c: last.close,
            v: last.volume,
            change: prev ? ((last.close - prev.close) / prev.close) * 100 : 0,
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
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);
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

      // For special chart types, we'd need to recalculate from all data
      // For standard types, just update
      if (isLineType || isAreaType || isBaselineType || isColumnsType) {
        series.update({ time, value: c });
      } else if (isBarType || isCandleType) {
        // For transformed types (HA, Renko, P&F, etc.), skip live update of individual candle
        if (['candles', 'hollow', 'volume_candles', 'bars', 'high_low'].includes(chartType)) {
          series.update({ time, open: o, high: h, low: l, close: c });
        }
      }

      volSeries.update({ time, value: v, color: c >= o ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)' });
      setOhlc(prev => ({ ...prev, o, h, l, c, v }));
    };

    return () => { ws.close(); };
  }, [symbol, interval, chartType]);

  function setChartData(series: any, candles: RawCandle[], volumes: any[], volSeries: any) {
    let displayCandles: RawCandle[] = candles;

    // Transform data for special chart types
    if (chartType === 'heikin_ashi') {
      displayCandles = toHeikinAshi(candles);
    } else if (chartType === 'renko') {
      displayCandles = toRenko(candles);
    } else if (chartType === 'line_break') {
      displayCandles = toLineBreak(candles);
    } else if (chartType === 'kagi') {
      displayCandles = toKagi(candles);
    } else if (chartType === 'point_figure') {
      displayCandles = toPointAndFigure(candles);
    }

    if (isLineType || isAreaType || isBaselineType) {
      series.setData(candles.map((c: RawCandle) => ({ time: c.time, value: c.close })));
      volSeries.setData(volumes);
    } else if (isColumnsType) {
      series.setData(candles.map((c: RawCandle) => ({
        time: c.time,
        value: c.close,
        color: c.close >= c.open ? '#26a69a' : '#ef5350',
      })));
      volSeries.setData(volumes);
    } else if (chartType === 'volume_candles') {
      // Volume candles: width proportional to volume (approximated by opacity)
      series.setData(candles.map((c: RawCandle) => ({
        time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
      })));
      volSeries.setData(volumes);
    } else {
      // Candle/bar types (including transformed ones)
      const transformed = displayCandles !== candles;
      series.setData(displayCandles.map((c: RawCandle) => ({
        time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
      })));

      if (transformed) {
        // For transformed types, build matching volume data
        const transformedVols = displayCandles.map((c: RawCandle) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
        }));
        volSeries.setData(transformedVols);
      } else {
        volSeries.setData(volumes);
      }
    }
  }

  // Apply indicators
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    indicatorSeriesRef.current.forEach((s) => { try { chart.removeSeries(s); } catch {} });
    indicatorSeriesRef.current.clear();

    const data = rawDataRef.current;
    if (data.length === 0) return;

    for (const ind of indicators) {
      if (ind.startsWith('EMA')) {
        const period = parseInt(ind.split(' ')[1]);
        const s = chart.addSeries(LineSeries, {
          color: EMA_COLORS[ind] || '#ffffff', lineWidth: 1,
          priceLineVisible: false, lastValueVisible: false,
        });
        s.setData(calculateEMA(data, period));
        indicatorSeriesRef.current.set(ind, s);
      } else if (ind.startsWith('SMA')) {
        const period = parseInt(ind.split(' ')[1]);
        const s = chart.addSeries(LineSeries, {
          color: EMA_COLORS[ind] || '#ffffff', lineWidth: 1,
          priceLineVisible: false, lastValueVisible: false,
        });
        s.setData(calculateSMA(data, period));
        indicatorSeriesRef.current.set(ind, s);
      } else if (ind === 'Bollinger Bands') {
        const bb = calculateBollinger(data);
        const colors = ['#e91e63', '#2196f3', '#e91e63'];
        const names = ['BB Upper', 'BB Middle', 'BB Lower'];
        [bb.upper, bb.middle, bb.lower].forEach((d, i) => {
          const s = chart.addSeries(LineSeries, {
            color: colors[i], lineWidth: 1, lineStyle: i === 1 ? 0 : 2,
            priceLineVisible: false, lastValueVisible: false,
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

    drawingSeriesRef.current.forEach((s) => { try { chart.removeSeries(s); } catch {} });
    drawingSeriesRef.current.clear();

    for (const drawing of drawings) {
      if (drawing.type === 'trendline' || drawing.type === 'ray') {
        if (drawing.points.length >= 2) {
          const s = chart.addSeries(LineSeries, {
            color: drawing.color, lineWidth: 2,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          let lineData: LineData[];
          if (drawing.type === 'ray') {
            const p1 = drawing.points[0], p2 = drawing.points[1];
            const dt = p2.time - p1.time, dp = p2.price - p1.price;
            lineData = [
              { time: p1.time as Time, value: p1.price },
              { time: p2.time as Time, value: p2.price },
              { time: (p2.time + dt * 100) as Time, value: p2.price + dp * 100 },
            ];
          } else {
            lineData = drawing.points.map(p => ({ time: p.time as Time, value: p.price }));
          }
          s.setData(lineData);
          drawingSeriesRef.current.set(drawing.id, s);
        }
      } else if (drawing.type === 'horizontalline') {
        if (drawing.points.length >= 1 && mainSeriesRef.current) {
          const priceLine = mainSeriesRef.current.createPriceLine({
            price: drawing.points[0].price, color: drawing.color,
            lineWidth: 2, lineStyle: 0, axisLabelVisible: true,
          });
          drawingSeriesRef.current.set(drawing.id, priceLine);
        }
      } else if (drawing.type === 'fibonacci') {
        if (drawing.points.length >= 2) {
          const p1 = drawing.points[0].price, p2 = drawing.points[1].price;
          const diff = p2 - p1;
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const colors = ['#787b86', '#f44336', '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#787b86'];
          levels.forEach((level, i) => {
            if (mainSeriesRef.current) {
              const pl = mainSeriesRef.current.createPriceLine({
                price: p1 + diff * level, color: colors[i],
                lineWidth: 1, lineStyle: 2, axisLabelVisible: true,
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
      const price = series.coordinateToPrice(param.point.y);
      if (price === null) return;
      const time = param.time as number;

      if (drawingTool === 'horizontalline') {
        addDrawing({ id: `d_${Date.now()}`, type: 'horizontalline', points: [{ time, price }], color: '#2962ff' });
      } else if (drawingTool === 'trendline' || drawingTool === 'ray' || drawingTool === 'fibonacci') {
        if (!drawingStartRef.current) {
          drawingStartRef.current = { time, price };
          const ps = chart.addSeries(LineSeries, {
            color: '#2962ff', lineWidth: 1, lineStyle: 2,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          ps.setData([{ time: time as Time, value: price }]);
          previewSeriesRef.current = ps;
        } else {
          const start = drawingStartRef.current;
          const points = start.time <= time
            ? [start, { time, price }]
            : [{ time, price }, start];
          addDrawing({
            id: `d_${Date.now()}`, type: drawingTool, points,
            color: drawingTool === 'fibonacci' ? '#787b86' : '#2962ff',
          });
          drawingStartRef.current = null;
          if (previewSeriesRef.current) {
            try { chart.removeSeries(previewSeriesRef.current); } catch {}
            previewSeriesRef.current = null;
          }
        }
      }
    };

    const handleMove = (param: any) => {
      if (!drawingStartRef.current || !previewSeriesRef.current || !param.time || !param.point) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price === null) return;
      const start = drawingStartRef.current;
      const time = param.time as number;
      const points = start.time <= time
        ? [{ time: start.time as Time, value: start.price }, { time: time as Time, value: price }]
        : [{ time: time as Time, value: price }, { time: start.time as Time, value: start.price }];
      previewSeriesRef.current.setData(points);
    };

    chart.subscribeClick(handleClick);
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
        <span className={isPositive ? 'text-chart-bull' : 'text-chart-bear'}>
          {isPositive ? '+' : ''}{ohlc.change.toFixed(2)}%
        </span>
      </div>

      {drawingTool !== 'cursor' && (
        <div className="absolute top-2 right-3 z-10 bg-primary/20 text-primary text-xs px-2 py-1 rounded">
          {drawingTool === 'trendline' && 'Click two points for trend line'}
          {drawingTool === 'horizontalline' && 'Click to place horizontal line'}
          {drawingTool === 'ray' && 'Click two points for ray'}
          {drawingTool === 'fibonacci' && 'Click two points for Fibonacci'}
        </div>
      )}

      <div ref={containerRef} className="flex-1" style={{ cursor: drawingTool !== 'cursor' ? 'crosshair' : 'default' }} />
    </div>
  );
}
