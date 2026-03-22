import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart, ColorType, CrosshairMode, LineStyle, PriceScaleMode,
  CandlestickSeries, LineSeries, AreaSeries, HistogramSeries, BarSeries, BaselineSeries,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, LineData, Time } from 'lightweight-charts';
import { Settings } from 'lucide-react';
import IndicatorOverlay from './IndicatorOverlay';
import { useChart } from '@/context/ChartContext';
import type { Drawing } from '@/types/chart';
import { sanitizeHexColor } from '@/types/chartSettings';
import { getKlines, getOlderKlinesFromCache } from '@/lib/klineCache';
import { getBinanceSourceInterval, getIntervalDurationMs, shouldAggregateInterval, toIntervalBucketStart } from '@/lib/chartIntervals';
import { hitTestDrawing } from '@/lib/drawing/hit-testing';
import DrawingCanvas from './DrawingCanvas';
import ChartCanvasContextMenu, { type CanvasMenuOpenMode } from './ChartCanvasContextMenu';
import PriceScaleContextMenu from './PriceScaleContextMenu';
import TimezoneSelector, { getTimezoneOffsetHours } from './TimezoneSelector';
import ChartSettingsDialog from './ChartSettingsDialog';
import SymbolSearch from './SymbolSearch';
import type { CandleData, ChartDrawing, CoordHelper } from '@/lib/drawing/types';

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

interface CachedSeriesState {
  candles: RawCandle[];
  hasMoreOlder: boolean;
}

const LIVE_CACHE_SYNC_COOLDOWN_MS = 90_000;

function mergeCandlesByTime(base: RawCandle[], incoming: RawCandle[]): RawCandle[] {
  const byTime = new Map<number, RawCandle>();
  for (const candle of base) byTime.set(Number(candle.time), candle);
  for (const candle of incoming) byTime.set(Number(candle.time), candle);
  return Array.from(byTime.values()).sort((a, b) => Number(a.time) - Number(b.time));
}

function normalizeVisibleRange(
  range: { from: number; to: number } | null | undefined,
  candleCount: number,
): { from: number; to: number } | null {
  if (!range || candleCount <= 0) return null;

  const span = range.to - range.from;
  if (!Number.isFinite(span) || span <= 0) return null;

  const minBound = -200;
  const maxBound = candleCount + 200;

  if (range.to < minBound || range.from > maxBound) return null;

  const clampedFrom = Math.max(range.from, minBound);
  const clampedTo = Math.min(range.to, maxBound);
  if (clampedTo - clampedFrom < 1) return null;

  return { from: clampedFrom, to: clampedTo };
}

function toUnixSeconds(time: Time | null | undefined): number | null {
  if (typeof time === 'number') {
    return Number.isFinite(time) ? time : null;
  }

  if (time && typeof time === 'object' && 'year' in time && 'month' in time && 'day' in time) {
    const t = time as { year: number; month: number; day: number };
    return Math.floor(Date.UTC(t.year, t.month - 1, t.day) / 1000);
  }

  return null;
}

function normalizeVisibleTimeRange(
  range: { from: Time; to: Time } | null | undefined,
  candles: RawCandle[],
): { from: Time; to: Time } | null {
  if (!range || candles.length === 0) return null;

  const from = toUnixSeconds(range.from);
  const to = toUnixSeconds(range.to);
  if (from === null || to === null || to <= from) return null;

  const first = Number(candles[0].time);
  const last = Number(candles[candles.length - 1].time);
  const step = candles.length > 1 ? Math.max(1, Number(candles[1].time) - Number(candles[0].time)) : 60;
  const minBound = first - step * 2;
  const maxBound = last + step * 2;

  if (to < minBound || from > maxBound) return null;

  const clampedFrom = Math.max(from, minBound);
  const clampedTo = Math.min(to, maxBound);
  if (clampedTo - clampedFrom < 1) return null;

  return {
    from: clampedFrom as Time,
    to: clampedTo as Time,
  };
}

function findNearestCandleIndexByTime(candles: RawCandle[], targetTimeSec: number | null): number {
  if (candles.length === 0) return 0;
  if (targetTimeSec === null || !Number.isFinite(targetTimeSec)) return candles.length - 1;

  let low = 0;
  let high = candles.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const midTime = Number(candles[mid].time);
    if (midTime === targetTimeSec) return mid;
    if (midTime < targetTimeSec) low = mid + 1;
    else high = mid - 1;
  }

  const left = Math.max(0, Math.min(candles.length - 1, high));
  const right = Math.max(0, Math.min(candles.length - 1, low));
  const leftDiff = Math.abs(Number(candles[left].time) - targetTimeSec);
  const rightDiff = Math.abs(Number(candles[right].time) - targetTimeSec);
  return rightDiff < leftDiff ? right : left;
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
  volumes: { time: Time; value: number; color: string }[];
}

function computePointAndFigure(candles: RawCandle[], boxSize?: number, reversalBoxes = 3, atrLength = 14, method: string = 'atr'): PFResult {
  if (candles.length < 2) return { lineData: [], boxes: [], boxSize: boxSize || 100, volumes: [] };

  if (method === 'atr' || !boxSize) {
    const atr = calculateATR(candles, atrLength);
    const prices = candles.map(c => c.close);
    const range = Math.max(...prices) - Math.min(...prices);
    const atrBased = Math.max(Math.round(atr), 1);
    const rangeBased = Math.max(Math.round(range / 40), 1);
    boxSize = Math.min(atrBased, rangeBased);
    if (boxSize <= 0) boxSize = 1;
  }

  const reversalAmount = reversalBoxes * boxSize;

  interface PFCol { dir: number; top: number; bot: number; startIdx: number; endIdx: number; }
  const columns: PFCol[] = [];

  const firstClose = candles[0].close;
  let colTop = Math.ceil(firstClose / boxSize) * boxSize;
  let colBot = Math.floor(firstClose / boxSize) * boxSize;
  columns.push({ dir: 1, top: colTop, bot: colBot, startIdx: 0, endIdx: 0 });

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const high = Math.ceil(c.high / boxSize) * boxSize;
    const low = Math.floor(c.low / boxSize) * boxSize;
    const lastCol = columns[columns.length - 1];

    if (lastCol.dir === 1) {
      if (high > lastCol.top) {
        lastCol.top = high;
        lastCol.endIdx = i;
      }
      if (lastCol.top - low >= reversalAmount) {
        columns.push({ dir: -1, top: lastCol.top - boxSize, bot: low, startIdx: i, endIdx: i });
      }
    } else {
      if (low < lastCol.bot) {
        lastCol.bot = low;
        lastCol.endIdx = i;
      }
      if (high - lastCol.bot >= reversalAmount) {
        columns.push({ dir: 1, top: high, bot: lastCol.bot + boxSize, startIdx: i, endIdx: i });
      }
    }
  }

  const baseTime = candles[0].time as number;
  const totalTime = (candles[candles.length - 1].time as number) - baseTime;
  const colCount = columns.length;
  const timeStep = colCount > 1 ? Math.max(Math.floor(totalTime / colCount), 60) : 86400;

  const boxes: PFBox[] = [];
  const lineData: { time: Time; value: number }[] = [];
  const volumes: { time: Time; value: number; color: string }[] = [];

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const time = (baseTime + i * timeStep) as Time;
    const mid = (col.top + col.bot) / 2;
    lineData.push({ time, value: mid });

    // Aggregate volume for this column
    let colVol = 0;
    for (let j = col.startIdx; j <= Math.min(col.endIdx, candles.length - 1); j++) {
      colVol += candles[j].volume;
    }
    volumes.push({
      time,
      value: colVol,
      color: col.dir === 1 ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
    });

    for (let p = col.bot; p < col.top; p += boxSize) {
      boxes.push({
        time,
        price: p + boxSize / 2,
        type: col.dir === 1 ? 'X' : 'O',
      });
    }
  }

  return { lineData, boxes, boxSize, volumes };
}

const EMA_COLORS: Record<string, string> = {
  'EMA 9': '#f7931a',
  'EMA 21': '#e91e63',
  'EMA 50': '#2196f3',
  'EMA 200': '#9c27b0',
  'SMA 20': '#ff9800',
  'SMA 50': '#4caf50',
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function mapCrosshairStyle(style: 'dashed' | 'dotted' | 'solid') {
  if (style === 'dashed') return LineStyle.Dashed;
  if (style === 'dotted') return LineStyle.Dotted;
  return LineStyle.Solid;
}

function mapPriceScaleMode(mode: 'regular' | 'percent' | 'indexed_to_100' | 'logarithmic') {
  if (mode === 'percent') return PriceScaleMode.Percentage;
  if (mode === 'indexed_to_100') return PriceScaleMode.IndexedTo100;
  if (mode === 'logarithmic') return PriceScaleMode.Logarithmic;
  return PriceScaleMode.Normal;
}

function toEngineDrawing(d: Drawing): ChartDrawing {
  return { ...d, type: d.type as string };
}

function createCoordHelper(
  chart: IChartApi,
  series: ISeriesApi<any>,
  candles: RawCandle[]
): CoordHelper | null {
  if (!chart || !series) return null;

  const getSpacing = () => {
    if (candles.length < 2) return null;
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const lastX = chart.timeScale().timeToCoordinate(last.time as Time);
    const prevX = chart.timeScale().timeToCoordinate(prev.time as Time);
    const pixelsPerBar = lastX !== null && prevX !== null ? lastX - prevX : 0;
    const timeDelta = (last.time as number) - (prev.time as number);
    if (!Number.isFinite(pixelsPerBar) || pixelsPerBar <= 0 || timeDelta <= 0) return null;
    return { lastX: lastX as number, lastTime: last.time as number, pixelsPerBar, timeDelta };
  };

  return {
    timeToX: (t: number) => {
      const x = chart.timeScale().timeToCoordinate(t as Time);
      if (x !== null) return x;
      const spacing = getSpacing();
      if (!spacing) return null;
      const barsAhead = (t - spacing.lastTime) / spacing.timeDelta;
      return spacing.lastX + barsAhead * spacing.pixelsPerBar;
    },
    priceToY: (p: number) => series.priceToCoordinate(p),
    xToTime: (x: number) => {
      const t = chart.timeScale().coordinateToTime(x);
      if (t !== null) return t as number;
      const spacing = getSpacing();
      if (!spacing) return null;
      const barsAhead = (x - spacing.lastX) / spacing.pixelsPerBar;
      return spacing.lastTime + Math.round(barsAhead) * spacing.timeDelta;
    },
    yToPrice: (y: number) => series.coordinateToPrice(y),
  };
}

interface TradingChartProps {
  panelIndex?: number;
  overrideSymbol?: string;
  compact?: boolean;
}

export default function TradingChart({ panelIndex, overrideSymbol, compact }: TradingChartProps = {}) {
  const ctx = useChart();
  const symbol = overrideSymbol || ctx.symbol;
  const {
    interval, chartType, drawingTool, indicators, hiddenIndicators, drawings,
    replayState, setReplayState, replayBarIndex, setReplayBarIndex,
    replayStartIndex, setReplayStartIndex, replaySpeed, chartSettings, toggleIndicator,
  } = ctx;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const indicatorSeriesRef = useRef<Map<string, any>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const rawDataRef = useRef<{ close: number; time: Time }[]>([]);
  const rawCandlesRef = useRef<RawCandle[]>([]);
  const allCandlesRef = useRef<RawCandle[]>([]); // Full dataset for replay
  const intervalDataCacheRef = useRef<Map<string, CachedSeriesState>>(new Map());
  const intervalRangeCacheRef = useRef<Map<string, { from: number; to: number }>>(new Map());
  const intervalLastSyncRef = useRef<Map<string, number>>(new Map());
  const activeDataKeyRef = useRef('');
  const loadingOlderRef = useRef(false);
  const hasMoreOlderRef = useRef(true);
  const [ohlc, setOhlc] = useState({ o: 0, h: 0, l: 0, c: 0, v: 0, change: 0 });
  const [countdown, setCountdown] = useState('');
  const [magnetMode, setMagnetMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<string | undefined>(undefined);
  const [panelSearchOpen, setPanelSearchOpen] = useState(false);
  const [priceScaleWidth, setPriceScaleWidth] = useState(55);
  const pfDataRef = useRef<PFResult | null>(null);
  const pfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridExtendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const replaySelectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const replayTimerRef = useRef<number | null>(null);
  const replayBarRef = useRef(replayBarIndex);
  const replayAnchorTimeRef = useRef<number | null>(null);
  const replayStartTimeRef = useRef<number | null>(null);
  const replayWasActiveRef = useRef(false);
  replayBarRef.current = replayBarIndex;

  useEffect(() => {
    if (replayState === 'off' || replayState === 'selecting') return;
    const candles = allCandlesRef.current;
    if (candles.length === 0) return;

    const clampedReplayIndex = Math.max(0, Math.min(replayBarIndex, candles.length - 1));
    const clampedStartIndex = Math.max(0, Math.min(replayStartIndex, candles.length - 1));
    replayAnchorTimeRef.current = Number(candles[clampedReplayIndex].time);
    replayStartTimeRef.current = Number(candles[clampedStartIndex].time);
  }, [replayState, replayBarIndex, replayStartIndex, symbol, interval]);

  const resetChartView = useCallback(() => {
    const chart = chartRef.current;
    if (chart) chart.timeScale().fitContent();
  }, []);

  const removeAllIndicators = useCallback(() => {
    if (indicators.length === 0) return;
    indicators.forEach((name) => toggleIndicator(name));
  }, [indicators, toggleIndicator]);

  const getCanvasContextMenuOpenMode = useCallback((event: React.MouseEvent<HTMLElement>): CanvasMenuOpenMode => {
    const container = containerRef.current;
    const chart = chartRef.current;
    const series = mainSeriesRef.current;
    if (!container || !chart || !series) return 'block';

    const rect = container.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const chartAreaWidth = containerWidth - (priceScaleWidth || 55);

    if (mx < 0 || my < 0 || mx > containerWidth || my > containerHeight) return 'block';
    if (mx >= chartAreaWidth) return 'pass';

    const candles = rawCandlesRef.current;
    const coord = createCoordHelper(chart, series, candles);
    if (coord) {
      for (let i = drawings.length - 1; i >= 0; i--) {
        if (hitTestDrawing(toEngineDrawing(drawings[i]), mx, my, coord, containerWidth, containerHeight)) {
          return 'block';
        }
      }
    }

    // Any area that's not a drawing or the price scale is "empty" — show chart context menu
    return 'open';
  }, [drawings, priceScaleWidth]);

  // Create chart (only once per mount)
  const disposedRef = useRef(false);
  useEffect(() => {
    if (!containerRef.current) return;
    disposedRef.current = false;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#787b86',
        fontSize: 12,
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
      rightPriceScale: { borderColor: '#2a2e39', scaleMargins: { top: 0.1, bottom: 0.08 } },
      timeScale: { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false, rightOffset: 10 },
      handleScroll: true,
      handleScale: true,
    });
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const observer = new ResizeObserver(() => {
      if (containerRef.current && !disposedRef.current) {
        try {
          chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
          setPriceScaleWidth(chart.priceScale('right').width?.() ?? 55);
        } catch {}
      }
    });
    observer.observe(containerRef.current);
    return () => {
      disposedRef.current = true;
      observer.disconnect();
      try { chart.remove(); } catch {}
      chartRef.current = null;
    };
  }, []);

  // Apply canvas settings dynamically (no chart recreation)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const cs = chartSettings.canvas;
    const backgroundColor = sanitizeHexColor(cs.backgroundColor, '#131722');
    const gradientTop = sanitizeHexColor(cs.backgroundGradientTop, '#131722');
    const gradientBottom = sanitizeHexColor(cs.backgroundGradientBottom, '#1e222d');
    const textColor = sanitizeHexColor(cs.scaleTextColor, '#787b86');
    const gridVert = sanitizeHexColor(cs.gridVertColor, '#1e222d');
    const gridHorz = sanitizeHexColor(cs.gridHorzColor, '#1e222d');
    const crosshairColor = sanitizeHexColor(cs.crosshairColor, '#758696');
    const linesColor = sanitizeHexColor(cs.scaleLinesColor, '#2a2e39');

    const topMargin = clamp(cs.marginTop / 100, 0, 0.8);
    const bottomMargin = clamp(cs.marginBottom / 100, 0, 0.8);
    const replayRightPadding = replayState !== 'off' && replayState !== 'selecting' ? 30 : 0;
    const rightOffset = clamp(cs.marginRight + replayRightPadding, 0, 100);

    chart.applyOptions({
      layout: {
        background:
          cs.backgroundType === 'gradient'
            ? { type: ColorType.VerticalGradient, topColor: gradientTop, bottomColor: gradientBottom }
            : { type: ColorType.Solid, color: backgroundColor },
        textColor,
        fontSize: cs.scaleTextSize,
      },
      grid: {
        vertLines: {
          color: (cs.gridType === 'both' || cs.gridType === 'vert')
            ? hexToRgba(gridVert, cs.gridVertOpacity / 100)
            : 'transparent',
        },
        horzLines: {
          color: (cs.gridType === 'both' || cs.gridType === 'horz')
            ? hexToRgba(gridHorz, cs.gridHorzOpacity / 100)
            : 'transparent',
        },
      },
      crosshair: {
        vertLine: { color: crosshairColor, width: 1, style: mapCrosshairStyle(cs.crosshairStyle) },
        horzLine: { color: crosshairColor, width: 1, style: mapCrosshairStyle(cs.crosshairStyle) },
      },
      rightPriceScale: { borderColor: linesColor, scaleMargins: { top: topMargin, bottom: bottomMargin } },
      leftPriceScale: { borderColor: linesColor, scaleMargins: { top: topMargin, bottom: bottomMargin } },
      timeScale: { borderColor: linesColor, rightOffset },
    });
  }, [chartSettings.canvas, replayState]);

  const drawExtendedGrid = useCallback(() => {
    const canvas = gridExtendCanvasRef.current;
    const container = containerRef.current;
    const chart = chartRef.current;
    const cs = chartSettings.canvas;
    if (!canvas || !container || !chart) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (!(cs.gridType === 'both' || cs.gridType === 'vert')) return;

    const candles = rawCandlesRef.current;
    if (candles.length < 2) return;

    // Find the price scale width to avoid drawing over it
    const priceScaleWidth = chart.priceScale('right').width?.() ?? 55;
    const chartAreaWidth = w - priceScaleWidth;

    // Sample existing grid lines from library by scanning known candle positions
    // to detect the grid step the library actually uses
    const candleXPositions: number[] = [];
    for (let i = Math.max(0, candles.length - 60); i < candles.length; i++) {
      const x = chart.timeScale().timeToCoordinate(candles[i].time as Time);
      if (x !== null && x >= 0 && x < chartAreaWidth) {
        candleXPositions.push(x);
      }
    }

    if (candleXPositions.length < 2) return;

    // The library's grid lines align to the time scale labels.
    // We approximate the spacing by using the bar-to-bar pixel distance
    // and then matching the library's strategy: it places lines roughly
    // every N bars where N depends on zoom level.
    const barWidth = candleXPositions[candleXPositions.length - 1] - candleXPositions[candleXPositions.length - 2];
    if (!Number.isFinite(barWidth) || barWidth < 1) return;

    // Find the actual grid interval by looking at which time scale marks the library shows
    // We detect the library's grid spacing by checking the visible logical range
    const visRange = chart.timeScale().getVisibleLogicalRange();
    if (!visRange) return;
    const visibleBars = Math.round(visRange.to - visRange.from);
    
    // Library typically spaces grid lines every ~8-15% of visible range
    // Match by using roughly 6-10 grid lines across the visible area
    let gridStep: number;
    if (visibleBars <= 30) gridStep = 5;
    else if (visibleBars <= 80) gridStep = 10;
    else if (visibleBars <= 200) gridStep = 20;
    else if (visibleBars <= 500) gridStep = 50;
    else gridStep = 100;

    const stepPx = gridStep * barWidth;
    if (stepPx < 20) return;

    // Find the last library grid line position (align to grid)
    const lastCandle = candles[candles.length - 1];
    const lastX = chart.timeScale().timeToCoordinate(lastCandle.time as Time);
    if (lastX === null) return;

    // Align to grid: find nearest grid-aligned bar index
    const lastBarLogical = Math.round(visRange.to);
    const alignedStart = Math.ceil(lastBarLogical / gridStep) * gridStep;
    const startX = lastX + (alignedStart - lastBarLogical) * barWidth;

    ctx.strokeStyle = hexToRgba(sanitizeHexColor(cs.gridVertColor, '#1e222d'), cs.gridVertOpacity / 100);
    ctx.lineWidth = 1;

    for (let x = startX; x < chartAreaWidth; x += stepPx) {
      if (x <= lastX) continue; // Don't overdraw where library already draws
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
      ctx.stroke();
    }
  }, [chartSettings.canvas]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const redraw = () => requestAnimationFrame(drawExtendedGrid);
    redraw();

    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    chart.subscribeCrosshairMove(redraw);

    const observer = new ResizeObserver(redraw);
    if (containerRef.current) observer.observe(containerRef.current);

    const timer = window.setInterval(redraw, 1000);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(redraw);
      chart.unsubscribeCrosshairMove(redraw);
      observer.disconnect();
      clearInterval(timer);
    };
  }, [drawExtendedGrid, symbol, interval, chartType, replayState]);

  // Determine which series type to use
  const isLineType = ['line', 'line_markers', 'step_line'].includes(chartType);
  const isAreaType = ['area', 'hlc_area'].includes(chartType);
  const isBaselineType = chartType === 'baseline';
  const isColumnsType = chartType === 'columns';
  const isBarType = chartType === 'bars' || chartType === 'high_low';
  const isPnFType = chartType === 'point_figure';
  const isCandleType = ['candles', 'hollow', 'volume_candles', 'heikin_ashi', 'renko', 'line_break', 'kagi'].includes(chartType);
  const isTransformType = ['heikin_ashi', 'renko', 'line_break', 'kagi', 'point_figure'].includes(chartType);

  // Apply candle settings dynamically (no series recreation)
  useEffect(() => {
    const series = mainSeriesRef.current;
    if (!series || !isCandleType) return;
    const cc = chartSettings.candle;
    const precision = clamp(chartSettings.symbol.precision, 0, 8);
    const minMove = precision === 0 ? 1 : Number((1 / 10 ** precision).toFixed(8));
    const isHollow = chartType === 'hollow';
    try {
      series.applyOptions({
        upColor: isHollow ? 'transparent' : (cc.showBody ? cc.bodyUp : 'transparent'),
        downColor: isHollow ? 'transparent' : (cc.showBody ? cc.bodyDown : 'transparent'),
        borderUpColor: cc.showBorders ? cc.borderUp : 'transparent',
        borderDownColor: cc.showBorders ? cc.borderDown : 'transparent',
        wickUpColor: cc.showWick ? cc.wickUp : 'transparent',
        wickDownColor: cc.showWick ? cc.wickDown : 'transparent',
        priceFormat: {
          type: 'price',
          precision,
          minMove,
        },
      });
    } catch {}
  }, [chartSettings.candle, chartSettings.symbol.precision, chartType, isCandleType]);

  // Apply scale and label settings
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const scales = chartSettings.scalesAndLines;
    const priceScale = chartSettings.priceScale;
    const showLeft = scales.scalesPlacement === 'left';
    const showRight = scales.scalesPlacement !== 'left';
    const mode = mapPriceScaleMode(priceScale.mode);

    chart.applyOptions({
      rightPriceScale: {
        visible: showRight,
        mode,
        autoScale: priceScale.autoScale,
        invertScale: priceScale.invertScale,
        alignLabels: scales.noOverlappingLabels,
      },
      leftPriceScale: {
        visible: showLeft,
        mode,
        autoScale: priceScale.autoScale,
        invertScale: priceScale.invertScale,
        alignLabels: scales.noOverlappingLabels,
      },
      timeScale: {
        secondsVisible: interval.includes('s'),
      },
    });

    const mainSeries = mainSeriesRef.current;
    if (mainSeries) {
      try {
        mainSeries.applyOptions({
          priceLineVisible: scales.symbolDisplay !== 'hidden',
          lastValueVisible: scales.symbolDisplay !== 'hidden',
        });
      } catch {}
    }
  }, [chartSettings.scalesAndLines, chartSettings.priceScale, interval]);

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
      const cc = chartSettings.candle;
      const series = chart.addSeries(CandlestickSeries, {
        upColor: isHollow ? 'transparent' : (cc.showBody ? cc.bodyUp : 'transparent'),
        downColor: isHollow ? 'transparent' : (cc.showBody ? cc.bodyDown : 'transparent'),
        borderUpColor: cc.showBorders ? cc.borderUp : 'transparent',
        borderDownColor: cc.showBorders ? cc.borderDown : 'transparent',
        wickUpColor: cc.showWick ? cc.wickUp : 'transparent',
        wickDownColor: cc.showWick ? cc.wickDown : 'transparent',
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
  // Compute timezone offset in seconds for shifting candle timestamps
  const selectedTz = chartSettings.symbol.timezone;
  const tzOffsetHours = getTimezoneOffsetHours(selectedTz);
  // Binance returns UTC timestamps; lightweight-charts displays them as-is (UTC)
  // To show a specific timezone, simply shift by the desired offset
  const tzShiftSeconds = tzOffsetHours * 3600;

  const getDataCacheKey = useCallback(
    () => `${symbol}:${interval}:${tzShiftSeconds}`,
    [symbol, interval, tzShiftSeconds],
  );

  const persistSeriesCache = useCallback((cacheKey: string, candles: RawCandle[], hasMoreOlder: boolean) => {
    intervalDataCacheRef.current.set(cacheKey, {
      candles: [...candles],
      hasMoreOlder,
    });
  }, []);

  useEffect(() => {
    const isReplayActive = replayState !== 'off' && replayState !== 'selecting';

    if (!isReplayActive && replayWasActiveRef.current) {
      intervalDataCacheRef.current.clear();
      intervalRangeCacheRef.current.clear();
      intervalLastSyncRef.current.clear();
    }

    replayWasActiveRef.current = isReplayActive;
  }, [replayState]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const cacheKey = getDataCacheKey();
    const onRangeChange = (range: { from: number; to: number } | null) => {
      if (!range) return;
      if (activeDataKeyRef.current !== cacheKey) return;
      intervalRangeCacheRef.current.set(cacheKey, {
        from: range.from,
        to: range.to,
      });
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange);
    };
  }, [getDataCacheKey]);

  useEffect(() => {
    const series = mainSeriesRef.current;
    const volSeries = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!series || !volSeries || !chart) return;

    let cancelled = false;

    // isTransformType is now at component scope

    const fetchData = async () => {
      try {
        const cacheKey = getDataCacheKey();
        const cachedState = intervalDataCacheRef.current.get(cacheKey);
        const cachedRange = intervalRangeCacheRef.current.get(cacheKey);
        let viewportTimeRange = chart.timeScale().getVisibleRange();
        let viewportLogicalRange = chart.timeScale().getVisibleLogicalRange();
        const isReplayActive = replayState !== 'off' && replayState !== 'selecting';
        let renderedFromCache = false;

        if (cachedState?.candles.length) {
          rawCandlesRef.current = [...cachedState.candles];
          allCandlesRef.current = [...cachedState.candles];
          rawDataRef.current = cachedState.candles.map(c => ({ close: c.close, time: c.time }));
          hasMoreOlderRef.current = cachedState.hasMoreOlder;
          activeDataKeyRef.current = cacheKey;

          if (isReplayActive) {
            const replayIndex = findNearestCandleIndexByTime(cachedState.candles, replayAnchorTimeRef.current);
            const replayStartIndexByTime = findNearestCandleIndexByTime(
              cachedState.candles,
              replayStartTimeRef.current ?? replayAnchorTimeRef.current,
            );
            const nextReplayStartIndex = Math.min(replayStartIndexByTime, replayIndex);
            const replayCandles = cachedState.candles.slice(0, replayIndex + 1);
            const replayVolumes = replayCandles.map(c => ({
              time: c.time,
              value: c.volume,
              color: c.close >= c.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
            }));

            replayBarRef.current = replayIndex;
            setReplayStartIndex(nextReplayStartIndex);
            setReplayBarIndex(replayIndex);
            const replayCandle = cachedState.candles[replayIndex];
            const replayStartCandle = cachedState.candles[nextReplayStartIndex];
            if (replayCandle) replayAnchorTimeRef.current = Number(replayCandle.time);
            if (replayStartCandle) replayStartTimeRef.current = Number(replayStartCandle.time);

            setChartData(series, replayCandles, replayVolumes, volSeries);

            const safeReplayTimeRange = normalizeVisibleTimeRange(viewportTimeRange, replayCandles);
            if (safeReplayTimeRange) {
              chart.timeScale().setVisibleRange(safeReplayTimeRange);
            } else {
              chart.timeScale().setVisibleLogicalRange({
                from: Math.max(0, replayIndex - 120),
                to: replayIndex + 20,
              });
            }

            const replayLast = replayCandles[replayCandles.length - 1];
            const replayPrev = replayCandles[replayCandles.length - 2];
            if (replayLast) {
              setOhlc({
                o: replayLast.open,
                h: replayLast.high,
                l: replayLast.low,
                c: replayLast.close,
                v: replayLast.volume,
                change: replayPrev ? ((replayLast.close - replayPrev.close) / replayPrev.close) * 100 : 0,
              });
            }
          } else {
            const cachedVolumes = cachedState.candles.map(c => ({
              time: c.time,
              value: c.volume,
              color: c.close >= c.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
            }));

            setChartData(series, cachedState.candles, cachedVolumes, volSeries);

            const safeCachedRange = normalizeVisibleRange(cachedRange, cachedState.candles.length);
            if (safeCachedRange) {
              chart.timeScale().setVisibleLogicalRange(safeCachedRange);
            }

            const lastCached = cachedState.candles[cachedState.candles.length - 1];
            if (lastCached) {
              const prevCached = cachedState.candles[cachedState.candles.length - 2];
              setOhlc({
                o: lastCached.open,
                h: lastCached.high,
                l: lastCached.low,
                c: lastCached.close,
                v: lastCached.volume,
                change: prevCached ? ((lastCached.close - prevCached.close) / prevCached.close) * 100 : 0,
              });
            }
          }

          renderedFromCache = true;
          viewportTimeRange = chart.timeScale().getVisibleRange();
          viewportLogicalRange = chart.timeScale().getVisibleLogicalRange();

          const lastSync = intervalLastSyncRef.current.get(cacheKey) ?? 0;
          if (!isReplayActive && Date.now() - lastSync < LIVE_CACHE_SYNC_COOLDOWN_MS) {
            return;
          }
        }

        const isSameDataset = activeDataKeyRef.current === cacheKey;
        const replayEndTimeSec = isReplayActive && replayAnchorTimeRef.current !== null
          ? Math.floor(replayAnchorTimeRef.current - tzShiftSeconds)
          : null;

        // Use cache-first strategy: Supabase cache → Binance fallback
        const klineData = await getKlines(symbol, interval, {
          replayEndTimeSec,
        });

        if (cancelled) return; // chart may have been disposed

        const candles: RawCandle[] = [];
        const volumes: any[] = [];
        const rawForIndicators: { close: number; time: Time }[] = [];

        for (const k of klineData) {
          const time = (k.time + tzShiftSeconds) as Time;
          candles.push({ time, open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume });
          volumes.push({ time, value: k.volume, color: k.close >= k.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)' });
          rawForIndicators.push({ close: k.close, time });
        }

        if (cancelled) return;

        const baseCandles = isSameDataset
          ? rawCandlesRef.current
          : (cachedState?.candles ?? []);
        const nextCandles = mergeCandlesByTime(baseCandles, candles);
        const finalCandles = nextCandles.length > 0 ? nextCandles : candles;
        const finalVolumes = finalCandles.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
        }));
        const finalRawForIndicators = finalCandles.map(c => ({ close: c.close, time: c.time }));

        rawDataRef.current = finalRawForIndicators.length > 0 ? finalRawForIndicators : rawForIndicators;
        rawCandlesRef.current = finalCandles;
        allCandlesRef.current = finalCandles;
        hasMoreOlderRef.current = cachedState?.hasMoreOlder ?? true;
        activeDataKeyRef.current = cacheKey;

        let renderCandles = finalCandles;
        let renderVolumes = finalVolumes;

        if (isReplayActive) {
          const replayIndex = findNearestCandleIndexByTime(finalCandles, replayAnchorTimeRef.current);
          const replayStartIndexByTime = findNearestCandleIndexByTime(
            finalCandles,
            replayStartTimeRef.current ?? replayAnchorTimeRef.current,
          );
          const nextReplayStartIndex = Math.min(replayStartIndexByTime, replayIndex);

          renderCandles = finalCandles.slice(0, replayIndex + 1);
          renderVolumes = renderCandles.map(c => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
          }));

          replayBarRef.current = replayIndex;
          setReplayStartIndex(nextReplayStartIndex);
          setReplayBarIndex(replayIndex);
          const replayCandle = finalCandles[replayIndex];
          const replayStartCandle = finalCandles[nextReplayStartIndex];
          if (replayCandle) replayAnchorTimeRef.current = Number(replayCandle.time);
          if (replayStartCandle) replayStartTimeRef.current = Number(replayStartCandle.time);
        }

        setChartData(series, renderCandles, renderVolumes, volSeries);
        if (!isReplayActive) {
          persistSeriesCache(cacheKey, finalCandles, hasMoreOlderRef.current);
        }
        intervalLastSyncRef.current.set(cacheKey, Date.now());

        if (chartType === 'point_figure') {
          requestAnimationFrame(() => { if (!cancelled) drawPFOverlay(); });
        }

        const last = renderCandles[renderCandles.length - 1];
        if (last) {
          const prev = renderCandles[renderCandles.length - 2];
          setOhlc({
            o: last.open, h: last.high, l: last.low, c: last.close,
            v: last.volume,
            change: prev ? ((last.close - prev.close) / prev.close) * 100 : 0,
          });
        }

        if (cancelled) return;

        if (isReplayActive) {
          const replayRangeByTime = normalizeVisibleTimeRange(viewportTimeRange, renderCandles);
          if (replayRangeByTime) {
            chart.timeScale().setVisibleRange(replayRangeByTime);
          } else {
            const replayIndex = Math.max(0, renderCandles.length - 1);
            chart.timeScale().setVisibleLogicalRange({
              from: Math.max(0, replayIndex - 120),
              to: replayIndex + 20,
            });
          }
          return;
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
          const safePreviousTimeRange = normalizeVisibleTimeRange(viewportTimeRange, finalCandles);
          if (safePreviousTimeRange) {
            chart.timeScale().setVisibleRange(safePreviousTimeRange);
          } else {
            const safeViewportRange = normalizeVisibleRange(viewportLogicalRange, finalCandles.length);
            if (safeViewportRange) {
              chart.timeScale().setVisibleLogicalRange(safeViewportRange);
            } else {
              const safeCachedRange = normalizeVisibleRange(cachedRange, finalCandles.length);
              if (safeCachedRange) {
                chart.timeScale().setVisibleLogicalRange(safeCachedRange);
              } else if (!renderedFromCache) {
                chart.timeScale().fitContent();
              }
            }
          }
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch klines:', err);
      }
    };

    fetchData();

    return () => { cancelled = true; };
  }, [symbol, interval, chartType, replayState, tzShiftSeconds, getDataCacheKey, persistSeriesCache, setReplayBarIndex, setReplayStartIndex]);

  // ─── Lazy-load older cached bars when user scrolls left ───
  useEffect(() => {
    const chart = chartRef.current;
    const series = mainSeriesRef.current;
    const volSeries = volumeSeriesRef.current;
    if (!chart || !series || !volSeries) return;
    if (replayState !== 'off' && replayState !== 'selecting') return;

    const cacheKey = getDataCacheKey();

    let cancelled = false;

    const loadOlderBars = async (range: { from: number; to: number } | null) => {
      if (!range || cancelled) return;
      if (range.from > 50) return;
      if (loadingOlderRef.current || !hasMoreOlderRef.current) return;
      if (activeDataKeyRef.current !== cacheKey) return;

      const oldestLoaded = rawCandlesRef.current[0];
      if (!oldestLoaded) return;

      loadingOlderRef.current = true;
      try {
        const older = await getOlderKlinesFromCache(symbol, interval, Number(oldestLoaded.time) - tzShiftSeconds, 2500);
        if (cancelled) return;
        if (activeDataKeyRef.current !== cacheKey) return;

        if (older.length === 0) {
          hasMoreOlderRef.current = false;
          persistSeriesCache(cacheKey, rawCandlesRef.current, false);
          return;
        }

        const olderCandles: RawCandle[] = older.map(k => ({
          time: (k.time + tzShiftSeconds) as Time,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
        }));

        const existing = rawCandlesRef.current;
        const merged = mergeCandlesByTime(olderCandles, existing);

        const volumes = merged.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
        }));

        const addedBars = Math.max(0, merged.length - existing.length);

        rawCandlesRef.current = merged;
        allCandlesRef.current = merged;
        rawDataRef.current = merged.map(c => ({ time: c.time, close: c.close }));
        persistSeriesCache(cacheKey, merged, true);

        const currentRange = chart.timeScale().getVisibleLogicalRange();
        setChartData(series, merged, volumes, volSeries);
        if (currentRange && addedBars > 0) {
          chart.timeScale().setVisibleLogicalRange({
            from: currentRange.from + addedBars,
            to: currentRange.to + addedBars,
          });
        }
      } catch {
        // Keep current data on any paging error.
      } finally {
        loadingOlderRef.current = false;
      }
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(loadOlderBars);
    return () => {
      cancelled = true;
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(loadOlderBars);
    };
  }, [symbol, interval, chartType, replayState, tzShiftSeconds, getDataCacheKey, persistSeriesCache]);

  // ─── WebSocket (separate from data fetch, respects replay) ───
  useEffect(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }

    // Don't connect WS during active replay
    if (replayState !== 'off' && replayState !== 'selecting') return;

    const series = mainSeriesRef.current;
    const volSeries = volumeSeriesRef.current;
    if (!series || !volSeries) return;

    const sourceInterval = getBinanceSourceInterval(interval);
    const aggregateLive = shouldAggregateInterval(interval);
    const cacheKey = getDataCacheKey();

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${sourceInterval}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const k = msg.k;
      if (!k) return;

      const time = (k.t / 1000 + tzShiftSeconds) as Time;
      const o = parseFloat(k.o);
      const h = parseFloat(k.h);
      const l = parseFloat(k.l);
      const c = parseFloat(k.c);
      const v = parseFloat(k.v);

      if (aggregateLive) {
        if (!k.x) return;

        const bucketTime = toIntervalBucketStart(k.t / 1000 + tzShiftSeconds, interval) as Time;
        const existingCandles = rawCandlesRef.current;
        const last = existingCandles[existingCandles.length - 1];

        let nextCandles: RawCandle[];
        if (last && Number(last.time) === Number(bucketTime)) {
          nextCandles = [
            ...existingCandles.slice(0, -1),
            {
              ...last,
              high: Math.max(last.high, h),
              low: Math.min(last.low, l),
              close: c,
              volume: last.volume + v,
            },
          ];
        } else {
          nextCandles = [
            ...existingCandles,
            { time: bucketTime, open: o, high: h, low: l, close: c, volume: v },
          ];
        }

        rawCandlesRef.current = nextCandles;
        allCandlesRef.current = nextCandles;
        rawDataRef.current = nextCandles.map(candle => ({ time: candle.time, close: candle.close }));
        activeDataKeyRef.current = cacheKey;
        persistSeriesCache(cacheKey, nextCandles, hasMoreOlderRef.current);

        const nextVolumes = nextCandles.map(candle => ({
          time: candle.time,
          value: candle.volume,
          color: candle.close >= candle.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
        }));

        setChartData(series, nextCandles, nextVolumes, volSeries);

        const lastCandle = nextCandles[nextCandles.length - 1];
        if (lastCandle) {
          setOhlc(prev => ({
            ...prev,
            o: lastCandle.open,
            h: lastCandle.high,
            l: lastCandle.low,
            c: lastCandle.close,
            v: lastCandle.volume,
          }));
        }
        return;
      }

      if (!isTransformType) {
        const existing = rawCandlesRef.current;
        const lastExisting = existing[existing.length - 1];
        let nextCandles = existing;

        if (!lastExisting || Number(time) > Number(lastExisting.time)) {
          nextCandles = [...existing, { time, open: o, high: h, low: l, close: c, volume: v }];
        } else if (Number(time) === Number(lastExisting.time)) {
          nextCandles = [
            ...existing.slice(0, -1),
            { time, open: o, high: h, low: l, close: c, volume: v },
          ];
        }

        rawCandlesRef.current = nextCandles;
        allCandlesRef.current = nextCandles;
        rawDataRef.current = nextCandles.map(candle => ({ time: candle.time, close: candle.close }));
        activeDataKeyRef.current = cacheKey;
        persistSeriesCache(cacheKey, nextCandles, hasMoreOlderRef.current);

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

    return () => { ws.close(); wsRef.current = null; };
  }, [symbol, interval, chartType, replayState, tzShiftSeconds, chartSettings.symbol.pointFigure, getDataCacheKey, persistSeriesCache]);

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
      const pf = chartSettings.symbol.pointFigure;
      const pfBoxSize = pf.boxMethod === 'traditional' ? pf.boxSize : undefined;
      const pfResult = computePointAndFigure(candles, pfBoxSize, pf.reversalAmount, pf.atrLength, pf.boxMethod);
      pfDataRef.current = pfResult;
      series.setData(pfResult.lineData);
      volSeries.setData(pfResult.volumes);
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
        cellWidth = Math.max(Math.abs(x1 - x0) * 0.85, 6);
      }
    }

    // Calculate cell height from box size
    let cellHeight = 16;
    if (boxes.length > 0) {
      const y0 = series.priceToCoordinate(boxes[0].price - boxSize / 2);
      const y1 = series.priceToCoordinate(boxes[0].price + boxSize / 2);
      if (y0 !== null && y1 !== null) {
        cellHeight = Math.max(Math.abs(y1 - y0) * 0.85, 6);
      }
    }

    const symbolSize = Math.min(cellWidth, cellHeight, 40) / 2;
    const lineWidth = Math.max(1.5, Math.min(symbolSize / 3, 2.5));
    const pf = chartSettings.symbol.pointFigure;
    const upColor = pf.upColor;
    const downColor = pf.downColor;

    for (const box of boxes) {
      const x = chart.timeScale().timeToCoordinate(box.time);
      if (x === null || x < -50 || x > w + 50) continue;
      const y = series.priceToCoordinate(box.price);
      if (y === null || y < -50 || y > h + 50) continue;

      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';

      if (box.type === 'X') {
        ctx.strokeStyle = upColor;
        ctx.beginPath();
        ctx.moveTo(x - symbolSize, y - symbolSize);
        ctx.lineTo(x + symbolSize, y + symbolSize);
        ctx.moveTo(x + symbolSize, y - symbolSize);
        ctx.lineTo(x - symbolSize, y + symbolSize);
        ctx.stroke();
      } else {
        ctx.strokeStyle = downColor;
        ctx.beginPath();
        ctx.arc(x, y, symbolSize, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [chartType, chartSettings.symbol.pointFigure]);

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
      if (hiddenIndicators.has(ind)) continue;

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
        if (hiddenIndicators.has('Bollinger Bands')) continue;
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
  }, [indicators, hiddenIndicators, rawDataRef.current.length]);

  // ─── Replay: blue vertical line following mouse during selection ───
  useEffect(() => {
    const container = containerRef.current;
    const canvas = replaySelectCanvasRef.current;
    if (!container || !canvas || replayState !== 'selecting') {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const dpr = window.devicePixelRatio || 1;

    const draw = (mouseX: number) => {
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

      // Blue vertical line
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(mouseX, 0);
      ctx.lineTo(mouseX, h);
      ctx.stroke();

      // Scissors icon (✂) near mouse
      ctx.fillStyle = '#2962ff';
      ctx.font = '16px sans-serif';
      ctx.fillText('✂', mouseX - 8, h / 2);

      // Date label at bottom
      const chart = chartRef.current;
      if (chart) {
        const timeCoord = chart.timeScale().coordinateToTime(mouseX);
        if (timeCoord) {
          const date = new Date((timeCoord as number) * 1000);
          const label = `Re: ${date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}`;
          ctx.fillStyle = '#2962ff';
          const textW = ctx.measureText(label).width;
          ctx.fillRect(mouseX - textW / 2 - 6, h - 22, textW + 12, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = '11px sans-serif';
          ctx.fillText(label, mouseX - textW / 2, h - 8);
        }
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      draw(e.clientX - rect.left);
    };

    const onLeave = () => {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    };

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
      onLeave();
    };
  }, [replayState]);

  // ─── Replay: click to select start bar ───
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || replayState !== 'selecting') return;

    const handler = (param: any) => {
      if (!param.time) return;
      const allCandles = allCandlesRef.current;
      const clickedTime = toUnixSeconds(param.time as Time);
      if (clickedTime === null) return;

      const idx = findNearestCandleIndexByTime(allCandles, clickedTime);
      if (idx < 0 || idx >= allCandles.length) return;

      replayAnchorTimeRef.current = Number(allCandles[idx].time);
      replayStartTimeRef.current = Number(allCandles[idx].time);
      replayBarRef.current = idx;

      setReplayStartIndex(idx);
      setReplayBarIndex(idx);
      setReplayState('paused');

      // Close WS
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }

      // Slice data to start point
      const sliced = allCandles.slice(0, idx + 1);
      const series = mainSeriesRef.current;
      const volSeries = volumeSeriesRef.current;
      if (series && volSeries) {
        const volumes = sliced.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
        }));
        setChartData(series, sliced, volumes, volSeries);
        chart.timeScale().setVisibleLogicalRange({
          from: Math.max(0, idx - 140),
          to: idx + 40,
        });
      }
    };

    chart.subscribeClick(handler);
    return () => { chart.unsubscribeClick(handler); };
  }, [replayState]);

  // ─── Replay: apply data slice when barIndex changes ───
  useEffect(() => {
    if (replayState !== 'playing' && replayState !== 'paused' && replayState !== 'ready') return;
    const chart = chartRef.current;
    const series = mainSeriesRef.current;
    const volSeries = volumeSeriesRef.current;
    if (!chart || !series || !volSeries) return;

    const allCandles = allCandlesRef.current;
    if (allCandles.length === 0) return;

    const lastAvailableIndex = allCandles.length - 1;
    if (replayBarIndex > lastAvailableIndex) {
      replayBarRef.current = lastAvailableIndex;
      if (replayBarIndex !== lastAvailableIndex) {
        setReplayBarIndex(lastAvailableIndex);
      }
      if (replayState === 'playing') {
        setReplayState('paused');
      }
      return;
    }

    if (replayBarIndex < 0) {
      replayBarRef.current = 0;
      if (replayBarIndex !== 0) {
        setReplayBarIndex(0);
      }
      if (replayState === 'playing') {
        setReplayState('paused');
      }
      return;
    }

    const clampedReplayIndex = Math.max(0, Math.min(replayBarIndex, allCandles.length - 1));
    const clampedStartIndex = Math.max(0, Math.min(replayStartIndex, allCandles.length - 1));

    if (allCandles[clampedReplayIndex]) {
      replayAnchorTimeRef.current = Number(allCandles[clampedReplayIndex].time);
    }
    if (allCandles[clampedStartIndex]) {
      replayStartTimeRef.current = Number(allCandles[clampedStartIndex].time);
    }

    const sliced = allCandles.slice(0, clampedReplayIndex + 1);
    const volumes = sliced.map(c => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
    }));
    setChartData(series, sliced, volumes, volSeries);

    const currentVisibleRange = chart.timeScale().getVisibleLogicalRange();
    if (
      !currentVisibleRange ||
      clampedReplayIndex > currentVisibleRange.to - 10 ||
      clampedReplayIndex < currentVisibleRange.from + 5
    ) {
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, clampedReplayIndex - 120),
        to: clampedReplayIndex + 40,
      });
    }

    const last = sliced[sliced.length - 1];
    if (last) {
      const prev = sliced.length > 1 ? sliced[sliced.length - 2] : undefined;
      setOhlc({
        o: last.open, h: last.high, l: last.low, c: last.close,
        v: last.volume,
        change: prev ? ((last.close - prev.close) / prev.close) * 100 : 0,
      });
    }
  }, [replayBarIndex, replayStartIndex, replayState]);

  // ─── Replay: playback timer ───
  useEffect(() => {
    if (replayState !== 'playing') {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
      return;
    }

    const delay = Math.max(50, 500 / replaySpeed);
    replayTimerRef.current = window.setInterval(() => {
      const next = replayBarRef.current + 1;
      if (next >= allCandlesRef.current.length) {
        setReplayState('paused');
        return;
      }
      replayBarRef.current = next;
      setReplayBarIndex(next);
    }, delay);

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [replayState, replaySpeed]);

  // ─── Replay: keyboard shortcuts ───
  useEffect(() => {
    if (replayState === 'off' || replayState === 'selecting') return;
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setReplayState(replayState === 'playing' ? 'paused' : 'playing');
      } else if (e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (replayState === 'playing') setReplayState('paused');
        setReplayBarIndex(replayBarIndex + 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [replayState, replayBarIndex]);

  // ─── Replay: restore full data when turning off ───
  useEffect(() => {
    if (replayState === 'off' && allCandlesRef.current.length > 0) {
      replayAnchorTimeRef.current = null;
      replayStartTimeRef.current = null;
      replayBarRef.current = 0;

      const chart = chartRef.current;
      const series = mainSeriesRef.current;
      const volSeries = volumeSeriesRef.current;
      if (chart && series && volSeries) {
        const candles = allCandlesRef.current;
        const volumes = candles.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
        }));
        setChartData(series, candles, volumes, volSeries);
        chart.timeScale().fitContent();
      }
    }
  }, [replayState]);

  // ─── Countdown to bar close ───
  useEffect(() => {
    if (!chartSettings.scalesAndLines.countdownToBarClose || replayState !== 'off') {
      setCountdown('');
      return;
    }

    const barMs = getIntervalDurationMs(interval);

    const update = () => {
      const now = Date.now();
      const candles = rawCandlesRef.current;
      if (candles.length === 0) { setCountdown(''); return; }
      const lastTime = (candles[candles.length - 1].time as number) * 1000;
      const barEnd = lastTime + barMs;
      const remaining = Math.max(0, barEnd - now);

      if (remaining <= 0) { setCountdown(''); return; }

      const h = Math.floor(remaining / 3_600_000);
      const m = Math.floor((remaining % 3_600_000) / 60_000);
      const s = Math.floor((remaining % 60_000) / 1000);

      if (h > 0) setCountdown(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      else if (m > 0) setCountdown(`${m}:${String(s).padStart(2, '0')}`);
      else setCountdown(`${s}s`);
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [interval, chartSettings.scalesAndLines.countdownToBarClose, replayState]);

  // Prepare candle data for drawing engine
  const candleDataForDrawing: CandleData[] = rawCandlesRef.current.map(c => ({
    time: c.time as number,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  const isPositive = ohlc.c >= ohlc.o;
  const statusLine = chartSettings.statusLine;
  const showStatusValues = statusLine.showChartValues;
  const symbolTitle = statusLine.titleMode === 'ticker' ? symbol : symbol.replace('USDT', ' / TetherUS');
  const statusLineBackground = statusLine.showBackground
    ? `hsl(var(--card) / ${clamp(statusLine.backgroundOpacity, 0, 100) / 100})`
    : 'transparent';
  const watermarkText = chartSettings.canvas.watermarkMode === 'none'
    ? ''
    : chartSettings.canvas.watermarkMode === 'replay'
      ? (replayState !== 'off' ? 'REPLAY' : '')
      : `${symbol} · ${interval}`;

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
  };
  const hint = toolHints[drawingTool] || (drawingTool !== 'cursor' && drawingTool !== 'arrow_cursor' && drawingTool !== 'dot' ? 'Click to place points' : '');

  return (
    <div
      className={`flex-1 min-w-0 w-full h-full flex flex-col relative overflow-hidden bg-chart-bg ${replayState === 'selecting' ? 'cursor-crosshair' : ''} ${panelIndex !== undefined && ctx.activePanelIndex === panelIndex ? 'ring-1 ring-primary/50' : ''}`}
      onMouseDown={() => { if (panelIndex !== undefined) ctx.setActivePanelIndex(panelIndex); }}
    >
      <div
        className="absolute top-2 left-3 z-10 flex items-center gap-3 rounded px-2 py-1 text-xs font-mono"
        style={{ background: statusLineBackground }}
      >
        {statusLine.showLogo && <span className="text-muted-foreground">◉</span>}
        {statusLine.showTitle && (
          panelIndex !== undefined ? (
            <button
              onClick={() => setPanelSearchOpen(true)}
              className="text-foreground font-semibold hover:text-primary transition-colors cursor-pointer"
            >
              {symbolTitle}
            </button>
          ) : (
            <span className="text-foreground font-semibold">{symbolTitle}</span>
          )
        )}
        {statusLine.showOpenMarketStatus && <span className="text-chart-bull">● Open</span>}

        {showStatusValues && (
          <>
            <span className="text-muted-foreground">O</span>
            <span className={isPositive ? 'text-chart-bull' : 'text-chart-bear'}>{ohlc.o.toLocaleString(undefined, { minimumFractionDigits: chartSettings.symbol.precision })}</span>
            <span className="text-muted-foreground">H</span>
            <span className={isPositive ? 'text-chart-bull' : 'text-chart-bear'}>{ohlc.h.toLocaleString(undefined, { minimumFractionDigits: chartSettings.symbol.precision })}</span>
            <span className="text-muted-foreground">L</span>
            <span className={isPositive ? 'text-chart-bull' : 'text-chart-bear'}>{ohlc.l.toLocaleString(undefined, { minimumFractionDigits: chartSettings.symbol.precision })}</span>
            <span className="text-muted-foreground">C</span>
            <span className={isPositive ? 'text-chart-bull' : 'text-chart-bear'}>{ohlc.c.toLocaleString(undefined, { minimumFractionDigits: chartSettings.symbol.precision })}</span>
          </>
        )}

        {statusLine.showBarChangeValues && (
          <span className={isPositive ? 'text-chart-bull' : 'text-chart-bear'}>
            {isPositive ? '+' : ''}{ohlc.change.toFixed(2)}%
          </span>
        )}
        {statusLine.showVolume && <span className="text-muted-foreground">Vol {ohlc.v.toLocaleString()}</span>}
        {countdown && chartSettings.scalesAndLines.countdownToBarClose && (
          <span className="text-muted-foreground ml-1">⏱ {countdown}</span>
        )}
      </div>

      {/* Active indicators overlay */}
      <div className="absolute top-10 left-3 z-20">
        <IndicatorOverlay />
      </div>

      {watermarkText && (
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
          <span className="text-6xl font-semibold tracking-widest text-muted-foreground/20">{watermarkText}</span>
        </div>
      )}

      {replayState !== 'off' && replayState !== 'selecting' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary text-xs px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Replay Mode — Bar {replayBarIndex - replayStartIndex + 1}</span>
        </div>
      )}

      {hint && (
        <div className="absolute top-2 right-3 z-30 bg-primary/20 text-primary text-xs px-2 py-1 rounded">
          {hint}
        </div>
      )}

      <div className="flex-1 min-w-0 relative overflow-hidden flex">
        <ChartCanvasContextMenu
          getOpenMode={getCanvasContextMenuOpenMode}
          onResetChartView={resetChartView}
          onOpenSettings={() => { setSettingsDefaultTab(undefined); setSettingsOpen(true); }}
          onOpenSymbolSettings={() => { setSettingsDefaultTab('symbol'); setSettingsOpen(true); }}
          onRemoveIndicators={removeAllIndicators}
          indicatorCount={indicators.length}
          chartTypeLabel={chartType === 'point_figure' ? 'Point & Figure' : chartType === 'heikin_ashi' ? 'Heikin Ashi' : chartType === 'renko' ? 'Renko' : chartType === 'kagi' ? 'Kagi' : chartType === 'line_break' ? 'Line Break' : 'Candles'}
        >
          <div ref={containerRef} className="flex-1 min-w-0 relative overflow-hidden">
            <canvas
              ref={gridExtendCanvasRef}
              className="absolute inset-0 z-[6] pointer-events-none"
            />
            <canvas
              ref={pfCanvasRef}
              className="absolute inset-0 z-10 pointer-events-none"
              style={{ display: chartType === 'point_figure' ? 'block' : 'none' }}
            />
            <canvas
              ref={replaySelectCanvasRef}
              className="absolute inset-0 z-20 pointer-events-none"
              style={{ display: replayState === 'selecting' ? 'block' : 'none' }}
            />
            <DrawingCanvas
              chart={chartRef.current}
              series={mainSeriesRef.current}
              candles={candleDataForDrawing}
              containerRef={containerRef as React.RefObject<HTMLDivElement>}
              magnetMode={magnetMode}
            />

            {/* Price scale right-click zone (overlay on top of the lightweight-charts price scale) */}
            <PriceScaleContextMenu onOpenSettings={() => setSettingsOpen(true)} onResetScale={resetChartView}>
              <div
                className="absolute top-0 right-0 bottom-0 z-[15]"
                style={{ width: priceScaleWidth || 55 }}
              />
            </PriceScaleContextMenu>

            {/* Gear icon at bottom of price scale */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="absolute z-[16] right-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              style={{
                bottom: 28,
                width: priceScaleWidth || 55,
                height: 22,
              }}
              title="More settings…"
            >
              <Settings size={14} />
            </button>
          </div>
        </ChartCanvasContextMenu>
      </div>

      {/* Bottom bar with timezone selector */}
      <div className="flex items-center justify-end h-[26px] border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1">
        <TimezoneSelector />
      </div>

      <ChartSettingsDialog open={settingsOpen} onClose={() => { setSettingsOpen(false); setSettingsDefaultTab(undefined); }} defaultTab={settingsDefaultTab as any} />

      {panelSearchOpen && (
        <SymbolSearch
          onClose={() => setPanelSearchOpen(false)}
          onSelectSymbol={panelIndex !== undefined ? (sym) => ctx.setPanelSymbol(panelIndex, sym) : undefined}
        />
      )}
    </div>
  );
}
