import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart, ColorType, CrosshairMode,
  CandlestickSeries, LineSeries, AreaSeries, HistogramSeries, BarSeries, BaselineSeries,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, LineData, Time } from 'lightweight-charts';
import { useChart } from '@/context/ChartContext';
import type { Drawing } from '@/types/chart';
import DrawingCanvas from './DrawingCanvas';
import type { CandleData } from '@/lib/drawing/types';

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
  let direction = 0;
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

// ─── Point & Figure ───

function calculateATR(candles: RawCandle[], period = 14): number {
  if (candles.length < 2) return 1;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trs.push(tr);
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

interface PFBox {
  time: Time;
  price: number;
  type: 'X' | 'O';
}

interface PFResult {
  lineData: { time: Time; value: number }[];
  boxes: PFBox[];
  boxSize: number;
}

function computePointAndFigure(candles: RawCandle[], boxSize?: number, reversalBoxes = 3): PFResult {
  if (candles.length < 2) return { lineData: [], boxes: [], boxSize: boxSize || 100 };

  if (!boxSize) {
    const atr = calculateATR(candles, 14);
    boxSize = Math.max(Math.round(atr), 1);
  }

  const reversalAmount = reversalBoxes * boxSize;
  const snapUp = (p: number) => Math.ceil(p / boxSize!) * boxSize!;
  const snapDown = (p: number) => Math.floor(p / boxSize!) * boxSize!;

  interface PFCol { dir: number; top: number; bot: number; }
  const columns: PFCol[] = [];

  let colTop = snapUp(candles[0].high);
  let colBot = snapDown(candles[0].low);
  let dir = candles[0].close >= candles[0].open ? 1 : -1;
  columns.push({ dir, top: colTop, bot: colBot });

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const high = snapUp(c.high);
    const low = snapDown(c.low);
    const lastCol = columns[columns.length - 1];

    if (lastCol.dir === 1) {
      if (high > lastCol.top) lastCol.top = high;
      if (lastCol.top - low >= reversalAmount) {
        columns.push({ dir: -1, top: lastCol.top - boxSize, bot: low });
      }
    } else {
      if (low < lastCol.bot) lastCol.bot = low;
      if (high - lastCol.bot >= reversalAmount) {
        columns.push({ dir: 1, top: high, bot: lastCol.bot + boxSize });
      }
    }
  }

  const baseTime = candles[0].time as number;
  const boxes: PFBox[] = [];
  const lineData: { time: Time; value: number }[] = [];

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const time = (baseTime + i * 86400) as Time;
    const mid = (col.top + col.bot) / 2;
    lineData.push({ time, value: mid });

    for (let p = col.bot; p < col.top; p += boxSize) {
      boxes.push({
        time,
        price: p + boxSize / 2,
        type: col.dir === 1 ? 'X' : 'O',
      });
    }
  }

  return { lineData, boxes, boxSize };
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
  const { symbol, interval, chartType, drawingTool, indicators, drawings } = useChart();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const indicatorSeriesRef = useRef<Map<string, any>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const rawDataRef = useRef<{ close: number; time: Time }[]>([]);
  const rawCandlesRef = useRef<RawCandle[]>([]);
  const [ohlc, setOhlc] = useState({ o: 0, h: 0, l: 0, c: 0, v: 0, change: 0 });
  const [magnetMode, setMagnetMode] = useState(false);
  const pfDataRef = useRef<PFResult | null>(null);
  const pfCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Determine which series type to use
  const isLineType = ['line', 'line_markers', 'step_line'].includes(chartType);
  const isAreaType = ['area', 'hlc_area'].includes(chartType);
  const isBaselineType = chartType === 'baseline';
  const isColumnsType = chartType === 'columns';
  const isBarType = chartType === 'bars' || chartType === 'high_low';
  const isPnFType = chartType === 'point_figure';
  const isCandleType = ['candles', 'hollow', 'volume_candles', 'heikin_ashi', 'renko', 'line_break', 'kagi'].includes(chartType);

  // Create series based on chart type
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (mainSeriesRef.current) { try { chart.removeSeries(mainSeriesRef.current); } catch {} }
    if (volumeSeriesRef.current) { try { chart.removeSeries(volumeSeriesRef.current); } catch {} }

    if (isPnFType) {
      const series = chart.addSeries(LineSeries, {
        color: 'rgba(0,0,0,0)',
        lineWidth: 1 as any,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      mainSeriesRef.current = series;
    } else if (isCandleType) {
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

    const isTransformType = ['heikin_ashi', 'renko', 'line_break', 'kagi', 'point_figure'].includes(chartType);

    const fetchData = async () => {
      try {
        const endpoints = [
          'https://data-api.binance.vision',
          'https://api.binance.com',
          'https://api1.binance.com',
          'https://api2.binance.com',
        ];

        let data: any = null;
        let lastError: unknown = null;

        for (const endpoint of endpoints) {
          try {
            const res = await fetch(`${endpoint}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`);
            const json = await res.json();
            if (Array.isArray(json)) {
              data = json;
              break;
            }
            lastError = new Error(typeof json?.msg === 'string' ? json.msg : 'Invalid kline response');
          } catch (err) {
            lastError = err;
          }
        }

        if (!Array.isArray(data)) {
          throw lastError || new Error('Failed to load klines from Binance endpoints');
        }

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

        if (chartType === 'point_figure') {
          requestAnimationFrame(() => drawPFOverlay());
        }

        const last = candles[candles.length - 1];
        if (last) {
          const prev = candles[candles.length - 2];
          setOhlc({
            o: last.open, h: last.high, l: last.low, c: last.close,
            v: last.volume,
            change: prev ? ((last.close - prev.close) / prev.close) * 100 : 0,
          });
        }

        if (chartType === 'point_figure') {
          const pointCount = pfDataRef.current?.lineData.length ?? 0;
          if (pointCount > 0) {
            chartRef.current?.timeScale().setVisibleLogicalRange({
              from: Math.max(0, pointCount - 140),
              to: pointCount + 8,
            });
          }
        } else {
          chartRef.current?.timeScale().fitContent();
        }
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

      // For transformed chart types we avoid direct incremental updates to prevent time-order errors.
      if (!isTransformType) {
        if (isLineType || isAreaType || isBaselineType || isColumnsType) {
          series.update({ time, value: c });
        } else if (isBarType || isCandleType) {
          if (['candles', 'hollow', 'volume_candles', 'bars', 'high_low'].includes(chartType)) {
            series.update({ time, open: o, high: h, low: l, close: c });
          }
        }

        volSeries.update({ time, value: v, color: c >= o ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)' });
      }

      setOhlc(prev => ({ ...prev, o, h, l, c, v }));
    };

    return () => { ws.close(); };
  }, [symbol, interval, chartType]);

  function setChartData(series: any, candles: RawCandle[], volumes: any[], volSeries: any) {
    let displayCandles: RawCandle[] = candles;

    if (chartType === 'heikin_ashi') {
      displayCandles = toHeikinAshi(candles);
    } else if (chartType === 'renko') {
      displayCandles = toRenko(candles);
    } else if (chartType === 'line_break') {
      displayCandles = toLineBreak(candles);
    } else if (chartType === 'kagi') {
      displayCandles = toKagi(candles);
    } else if (chartType === 'point_figure') {
      const pfResult = computePointAndFigure(candles);
      pfDataRef.current = pfResult;
      series.setData(pfResult.lineData);
      volSeries.setData([]);
      return;
    }

    // Clear P&F data when not in P&F mode
    pfDataRef.current = null;

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
      series.setData(candles.map((c: RawCandle) => ({
        time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
      })));
      volSeries.setData(volumes);
    } else {
      const transformed = displayCandles !== candles;
      series.setData(displayCandles.map((c: RawCandle) => ({
        time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
      })));

      if (transformed) {
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

  // ─── P&F Canvas Overlay Drawing ───
  const drawPFOverlay = useCallback(() => {
    const canvas = pfCanvasRef.current;
    const chart = chartRef.current;
    const series = mainSeriesRef.current;
    const pfData = pfDataRef.current;

    if (!canvas || !chart || !series || !pfData || chartType !== 'point_figure') {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const { boxes, boxSize } = pfData;

    // Calculate cell width from adjacent columns
    let cellWidth = 16;
    if (pfData.lineData.length >= 2) {
      const x0 = chart.timeScale().timeToCoordinate(pfData.lineData[0].time);
      const x1 = chart.timeScale().timeToCoordinate(pfData.lineData[1].time);
      if (x0 !== null && x1 !== null) {
        cellWidth = Math.max(Math.abs(x1 - x0) * 0.95, 8);
      }
    }

    // Calculate cell height from box size
    let cellHeight = 16;
    if (boxes.length > 0) {
      const y0 = series.priceToCoordinate(boxes[0].price - boxSize / 2);
      const y1 = series.priceToCoordinate(boxes[0].price + boxSize / 2);
      if (y0 !== null && y1 !== null) {
        cellHeight = Math.max(Math.abs(y1 - y0) * 0.95, 8);
      }
    }

    const symbolSize = Math.min(cellWidth, cellHeight, 42) / 2;

    for (const box of boxes) {
      const x = chart.timeScale().timeToCoordinate(box.time);
      if (x === null || x < -50 || x > w + 50) continue;
      const y = series.priceToCoordinate(box.price);
      if (y === null || y < -50 || y > h + 50) continue;

      ctx.lineWidth = 2;

      if (box.type === 'X') {
        ctx.strokeStyle = '#26a69a';
        ctx.beginPath();
        ctx.moveTo(x - symbolSize, y - symbolSize);
        ctx.lineTo(x + symbolSize, y + symbolSize);
        ctx.moveTo(x + symbolSize, y - symbolSize);
        ctx.lineTo(x - symbolSize, y + symbolSize);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#ef5350';
        ctx.beginPath();
        ctx.arc(x, y, symbolSize, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [chartType]);

  // Subscribe to chart changes to redraw P&F overlay
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chartType !== 'point_figure') {
      const canvas = pfCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const redraw = () => requestAnimationFrame(drawPFOverlay);

    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    chart.subscribeCrosshairMove(redraw);

    // Redraw on resize
    const observer = new ResizeObserver(redraw);
    if (containerRef.current) observer.observe(containerRef.current);

    const timer = setTimeout(redraw, 150);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(redraw);
      chart.unsubscribeCrosshairMove(redraw);
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [chartType, drawPFOverlay, symbol, interval]);

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

  // Prepare candle data for drawing engine
  const candleDataForDrawing: CandleData[] = rawCandlesRef.current.map(c => ({
    time: c.time as number,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  const isPositive = ohlc.c >= ohlc.o;

  const toolHints: Record<string, string> = {
    trendline: 'Click two points for trend line',
    horizontalline: 'Click to place horizontal line',
    verticalline: 'Click to place vertical line',
    ray: 'Click two points for ray',
    fibonacci: 'Click two points for Fibonacci',
    rectangle: 'Click two corners for rectangle',
    circle: 'Click center then edge for circle',
    parallelchannel: 'Click 3 points for parallel channel',
    brush: 'Click and drag to draw',
    eraser: 'Click on a drawing to erase it',
  };
  const hint = toolHints[drawingTool] || (drawingTool !== 'cursor' && drawingTool !== 'arrow_cursor' && drawingTool !== 'dot' ? 'Click to place points' : '');

  return (
    <div className="flex-1 flex flex-col relative bg-chart-bg">
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

      {hint && (
        <div className="absolute top-2 right-3 z-30 bg-primary/20 text-primary text-xs px-2 py-1 rounded">
          {hint}
        </div>
      )}

      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={pfCanvasRef}
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ display: chartType === 'point_figure' ? 'block' : 'none' }}
        />
        <DrawingCanvas
          chart={chartRef.current}
          series={mainSeriesRef.current}
          candles={candleDataForDrawing}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          magnetMode={magnetMode}
        />
      </div>
    </div>
  );
}

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

      <div ref={containerRef} className="flex-1 relative" style={{ cursor: drawingTool !== 'cursor' ? 'crosshair' : 'default' }}>
        <canvas
          ref={pfCanvasRef}
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ display: chartType === 'point_figure' ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
}
