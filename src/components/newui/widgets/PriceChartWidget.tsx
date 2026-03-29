// Custom Chart Engine — Canvas-based candlestick chart with real Binance data,
// configurable settings, indicator overlays, and full drawing tools via left toolbar.
// Fully isolated from Classic view.

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { getDisplayPair } from '@/lib/symbolUtils';
import { useProfile } from '@/hooks/useProfile';
import { getPlanLimits, clampReplayTimestamp } from '@/lib/planLimits';
import type { Interval } from '@/types/chart';
import { getBacktestKlines } from '@/lib/backtestCache';
import vizionLogo from '@/assets/vizionx-logo.png';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Clock,
  Copy,
  BarChart3,
  Settings,
  Trash2,
  TrendingUp,
  Loader2,
  Lock,
  Unlock,
  Pencil,
  Rewind,
  List,
} from 'lucide-react';
import { toast } from 'sonner';
import { getIndicator } from '@/lib/indicators/registry';
import type { Point } from '@/types/indicators';
import { analyzeWyckoff, analyzeWyckoffZone, type WyckoffResult } from '@/lib/indicators/wyckoff';
import NewUIChartSettings, { type ChartConfig, DEFAULT_CHART_CONFIG } from './NewUIChartSettings';
import NewUIIndicatorPanel, { type ActiveIndicator } from './NewUIIndicatorPanel';
import NewUILeftToolbar, { type NewUIDrawingTool } from './NewUILeftToolbar';
import NewUIDrawingToolbar from './NewUIDrawingToolbar';
import NewUIReplayControls, { type NewUIReplayState } from './NewUIReplayControls';
import NewUIWatchlist from './NewUIWatchlist';
import DrawingSettingsDialog from '@/components/chart/DrawingSettingsDialog';
import type { Drawing } from '@/types/chart';

// ─── Types ───
interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type DragMode = 'none' | 'pan' | 'price-scale' | 'time-scale';
type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W';
type NewUIChartType = 'candles' | 'bars' | 'hollow' | 'volume_candles'
  | 'line' | 'line_markers' | 'step_line'
  | 'area' | 'hlc_area' | 'baseline'
  | 'columns' | 'high_low'
  | 'heikin_ashi' | 'renko' | 'line_break' | 'kagi' | 'point_figure';

const CHART_TYPE_OPTIONS: { label: string; value: NewUIChartType }[] = [
  { label: 'Candles', value: 'candles' },
  { label: 'Bars', value: 'bars' },
  { label: 'Hollow', value: 'hollow' },
  { label: 'Vol Candles', value: 'volume_candles' },
  { label: 'Line', value: 'line' },
  { label: 'Line+Markers', value: 'line_markers' },
  { label: 'Step Line', value: 'step_line' },
  { label: 'Area', value: 'area' },
  { label: 'HLC Area', value: 'hlc_area' },
  { label: 'Baseline', value: 'baseline' },
  { label: 'Columns', value: 'columns' },
  { label: 'High-Low', value: 'high_low' },
  { label: 'Heikin Ashi', value: 'heikin_ashi' },
  { label: 'Renko', value: 'renko' },
  { label: 'Line Break', value: 'line_break' },
  { label: 'Kagi', value: 'kagi' },
  { label: 'Point & Figure', value: 'point_figure' },
];

interface ChartState {
  offsetX: number;
  candleWidth: number;
  crosshair: { x: number; y: number } | null;
  dragMode: DragMode;
  dragStartX: number;
  dragStartY: number;
  dragStartOffset: number;
  dragStartCandleWidth: number;
  priceScaleZoom: number;
  dragStartPriceZoom: number;
  panOffsetY: number;
  dragStartPanY: number;
}

interface DrawingPoint {
  time: number;
  price: number;
}

interface WidgetDrawing {
  id: string;
  type: string;
  points: DrawingPoint[];
  color: string;
  lineWidth: number;
  selected?: boolean;
  locked?: boolean;
  visible?: boolean;
  props?: Record<string, any>;
}

interface Projection {
  startIdx: number;
  candleWidth: number;
  chartW: number;
  priceH: number;
  minPrice: number;
  maxPrice: number;
  dataLength: number;
}

// How many click-points each tool needs
const TOOL_POINTS: Record<string, number> = {
  none: 0, cursor: 0, dot: 0, arrow_cursor: 0,
  horizontalline: 1, verticalline: 1, crossline: 1,
  arrowmarkup: 1, arrowmarkdown: 1, arrowmarker: 1,
  text: 1, note: 1, anchoredvwap: 1,
  trendline: 2, ray: 2, infoline: 2, extendedline: 2, trendangle: 2,
  horizontalray: 2, fibonacci: 2, rectangle: 2, rotatedrectangle: 2,
  circle: 2, ellipse: 2, pricerange: 2, daterange: 2, datepricerange: 2,
  longposition: 2, shortposition: 2, gannbox: 2, gannfan: 2,
  regressiontrend: 2, fixedrangevolume: 2,
  parallelchannel: 3, triangle: 3, pitchfork: 3,
  schiffpitchfork: 3, modifiedschiff: 3, insidepitchfork: 3,
  fibextension: 3, fibchannel: 3, pitchfan: 3, arc: 3, curve: 3,
  xabcd: 5, cypher: 5, abcd: 4, headshoulders: 7,
  trianglepattern: 4, threedrives: 7,
  brush: -1, highlighter: -1, arrowdraw: -1, path: -1, polyline: -1,
};

function getPointCount(tool: string): number {
  return TOOL_POINTS[tool] ?? 2;
}

// ─── Binance config ───
const TF_BINANCE: Record<Timeframe, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1D': '1d', '1W': '1w',
};

const TIMEFRAME_CONFIG: Record<Timeframe, { label: string; intervalSec: number; interval: Interval }> = {
  '1m': { label: '1m', intervalSec: 60, interval: '1m' },
  '5m': { label: '5m', intervalSec: 300, interval: '5m' },
  '15m': { label: '15m', intervalSec: 900, interval: '15m' },
  '1h': { label: '1H', intervalSec: 3600, interval: '1h' },
  '4h': { label: '4H', intervalSec: 14400, interval: '4h' },
  '1D': { label: '1D', intervalSec: 86400, interval: '1d' },
  '1W': { label: '1W', intervalSec: 604800, interval: '1w' },
};

// ─── OHLC Bar Settings ───
interface OhlcBarSettings {
  showSymbol: boolean;
  showOpen: boolean;
  showHigh: boolean;
  showLow: boolean;
  showClose: boolean;
  showChange: boolean;
  showCountdown: boolean;
  showVolume: boolean;
}

const DEFAULT_OHLC_SETTINGS: OhlcBarSettings = {
  showSymbol: true, showOpen: true, showHigh: true,
  showLow: true, showClose: true, showChange: true,
  showCountdown: true, showVolume: false,
};

function loadOhlcSettings(): OhlcBarSettings {
  try {
    const raw = localStorage.getItem('newui-ohlc-settings');
    if (raw) return { ...DEFAULT_OHLC_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_OHLC_SETTINGS };
}

function saveOhlcSettings(s: OhlcBarSettings) {
  localStorage.setItem('newui-ohlc-settings', JSON.stringify(s));
}

// ─── Constants ───
const PRICE_W = 90;
const TIME_H = 28;
const VOL_RATIO = 0.12;
const MIN_CW = 1;
const MAX_CW = 50;
const DEFAULT_CW = 8;
const DRAWINGS_STORAGE_KEY = 'newui-chart-drawings-v2';
const TIMEFRAME_CACHE_TTL_MS = 60_000;
const FAST_INITIAL_BARS = 1200;

// ─── Data fetch (paginated to support plan limits beyond 1000) ───
async function fetchKlines(symbol: string, interval: string, totalLimit: number, signal?: AbortSignal): Promise<Candle[]> {
  const BINANCE_MAX = 1000;
  let allCandles: Candle[] = [];
  let endTime: number | undefined = undefined;
  let remaining = totalLimit;

  while (remaining > 0) {
    if (signal?.aborted) break;
    const batchSize = Math.min(remaining, BINANCE_MAX);
    let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${batchSize}`;
    if (endTime !== undefined) url += `&endTime=${endTime}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    const data = await res.json();
    if (!data.length) break;
    const batch: Candle[] = data.map((k: any[]) => ({
      time: Math.floor(k[0] / 1000),
      open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
    }));
    if (endTime !== undefined) {
      if (allCandles.length && batch.length && batch[batch.length - 1].time >= allCandles[0].time) {
        batch.pop();
      }
      allCandles = [...batch, ...allCandles];
    } else {
      allCandles = batch;
    }
    remaining -= batchSize;
    if (data.length < batchSize) break;
    endTime = data[0][0] - 1;
  }
  return allCandles;
}

async function fetchOlderKlines(symbol: string, interval: string, totalLimit: number, endTimeMs: number, signal?: AbortSignal): Promise<Candle[]> {
  const BINANCE_MAX = 1000;
  let allCandles: Candle[] = [];
  let endTime: number | undefined = endTimeMs;
  let remaining = totalLimit;

  while (remaining > 0) {
    if (signal?.aborted) break;
    const batchSize = Math.min(remaining, BINANCE_MAX);
    let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${batchSize}`;
    if (endTime !== undefined) url += `&endTime=${endTime}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    const data = await res.json();
    if (!data.length) break;
    const batch: Candle[] = data.map((k: any[]) => ({
      time: Math.floor(k[0] / 1000),
      open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
    }));
    allCandles = [...batch, ...allCandles];
    remaining -= batch.length;
    if (data.length < batchSize) break;
    endTime = data[0][0] - 1;
  }

  return allCandles;
}
// ─── Data transforms ───
function toHeikinAshi(candles: Candle[]): Candle[] {
  const ha: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const prev = ha[i - 1];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = prev ? (prev.open + prev.close) / 2 : (c.open + c.close) / 2;
    ha.push({ time: c.time, open: haOpen, high: Math.max(c.high, haOpen, haClose), low: Math.min(c.low, haOpen, haClose), close: haClose, volume: c.volume });
  }
  return ha;
}

function toRenko(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];
  const prices = candles.map(c => c.close);
  const boxSize = Math.max((Math.max(...prices) - Math.min(...prices)) / 50, 0.01);
  const bricks: Candle[] = [];
  let lastClose = Math.round(candles[0].close / boxSize) * boxSize;
  let tIdx = 0;
  for (const c of candles) {
    const diff = c.close - lastClose;
    const n = Math.floor(Math.abs(diff) / boxSize);
    const dir = diff > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const o = lastClose, cl = lastClose + dir * boxSize;
      bricks.push({ time: candles[0].time + tIdx * 60, open: o, close: cl, high: Math.max(o, cl), low: Math.min(o, cl), volume: c.volume });
      lastClose = cl; tIdx++;
    }
  }
  return bricks;
}

function toLineBreak(candles: Candle[], lineCount = 3): Candle[] {
  if (candles.length === 0) return [];
  const lines: Candle[] = [];
  let tIdx = 0;
  for (const c of candles) {
    if (lines.length === 0) {
      lines.push({ time: candles[0].time + tIdx * 60, open: c.open, close: c.close, high: Math.max(c.open, c.close), low: Math.min(c.open, c.close), volume: c.volume });
      tIdx++; continue;
    }
    const last = lines[lines.length - 1];
    const isUp = last.close >= last.open;
    if (isUp && c.close > last.close) {
      lines.push({ time: candles[0].time + tIdx * 60, open: last.close, close: c.close, high: c.close, low: last.close, volume: c.volume }); tIdx++;
    } else if (!isUp && c.close < last.close) {
      lines.push({ time: candles[0].time + tIdx * 60, open: last.close, close: c.close, high: last.close, low: c.close, volume: c.volume }); tIdx++;
    } else {
      const lb = lines.slice(-lineCount);
      const maxH = Math.max(...lb.map(l => Math.max(l.open, l.close)));
      const minL = Math.min(...lb.map(l => Math.min(l.open, l.close)));
      if (isUp && c.close < minL) {
        lines.push({ time: candles[0].time + tIdx * 60, open: last.close, close: c.close, high: last.close, low: c.close, volume: c.volume }); tIdx++;
      } else if (!isUp && c.close > maxH) {
        lines.push({ time: candles[0].time + tIdx * 60, open: last.close, close: c.close, high: c.close, low: last.close, volume: c.volume }); tIdx++;
      }
    }
  }
  return lines;
}

function toKagi(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];
  const lines: Candle[] = [];
  let dir = 0, lastP = candles[0].close, cH = lastP, cL = lastP, tIdx = 0;
  const base = candles[0].time;
  const rPct = 0.04;
  for (const c of candles) {
    const p = c.close;
    if (dir === 0) { dir = p >= lastP ? 1 : -1; lastP = p; cH = Math.max(cH, p); cL = Math.min(cL, p); continue; }
    if (dir === 1) {
      if (p > cH) cH = p;
      else if (p <= cH * (1 - rPct)) {
        lines.push({ time: base + tIdx * 60, open: cL, close: cH, high: cH, low: cL, volume: c.volume }); tIdx++; dir = -1; cL = p; cH = p;
      }
    } else {
      if (p < cL) cL = p;
      else if (p >= cL * (1 + rPct)) {
        lines.push({ time: base + tIdx * 60, open: cH, close: cL, high: cH, low: cL, volume: c.volume }); tIdx++; dir = 1; cH = p; cL = p;
      }
    }
  }
  lines.push({ time: base + tIdx * 60, open: dir === 1 ? cL : cH, close: dir === 1 ? cH : cL, high: cH, low: cL, volume: 0 });
  return lines;
}

// ─── Point & Figure ───
interface PFBox { time: number; price: number; type: 'X' | 'O'; }
interface PFResult { columns: PFCandle[]; boxes: PFBox[]; boxSize: number; }
interface PFCandle { time: number; open: number; high: number; low: number; close: number; volume: number; dir: number; }

function calculateATR(candles: Candle[], period = 14): number {
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

function computePointAndFigure(candles: Candle[], reversalBoxes = 3, atrLength = 14): PFResult {
  if (candles.length < 2) return { columns: [], boxes: [], boxSize: 100 };
  const atr = calculateATR(candles, atrLength);
  const prices = candles.map(c => c.close);
  const range = Math.max(...prices) - Math.min(...prices);
  const atrBased = Math.max(Math.round(atr), 1);
  const rangeBased = Math.max(Math.round(range / 40), 1);
  const boxSize = Math.min(atrBased, rangeBased) || 1;
  const reversalAmount = reversalBoxes * boxSize;

  interface PFCol { dir: number; top: number; bot: number; sIdx: number; eIdx: number; }
  const cols: PFCol[] = [];
  const firstClose = candles[0].close;
  let colTop = Math.ceil(firstClose / boxSize) * boxSize;
  let colBot = Math.floor(firstClose / boxSize) * boxSize;
  cols.push({ dir: 1, top: colTop, bot: colBot, sIdx: 0, eIdx: 0 });

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const high = Math.ceil(c.high / boxSize) * boxSize;
    const low = Math.floor(c.low / boxSize) * boxSize;
    const lastCol = cols[cols.length - 1];
    if (lastCol.dir === 1) {
      if (high > lastCol.top) { lastCol.top = high; lastCol.eIdx = i; }
      if (lastCol.top - low >= reversalAmount) {
        cols.push({ dir: -1, top: lastCol.top - boxSize, bot: low, sIdx: i, eIdx: i });
      }
    } else {
      if (low < lastCol.bot) { lastCol.bot = low; lastCol.eIdx = i; }
      if (high - lastCol.bot >= reversalAmount) {
        cols.push({ dir: 1, top: high, bot: lastCol.bot + boxSize, sIdx: i, eIdx: i });
      }
    }
  }

  const baseTime = candles[0].time;
  const totalTime = candles[candles.length - 1].time - baseTime;
  const colCount = cols.length;
  const timeStep = colCount > 1 ? Math.max(Math.floor(totalTime / colCount), 60) : 86400;

  const boxes: PFBox[] = [];
  const pfCandles: PFCandle[] = [];
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const t = baseTime + i * timeStep;
    // Aggregate volume for this column from source candles
    let colVol = 0;
    for (let j = col.sIdx; j <= Math.min(col.eIdx, candles.length - 1); j++) {
      colVol += candles[j].volume;
    }
    // For P&F: open=bot, close=top for X columns; open=top, close=bot for O columns
    const isUp = col.dir === 1;
    pfCandles.push({
      time: t,
      open: isUp ? col.bot : col.top,
      high: col.top,
      low: col.bot,
      close: isUp ? col.top : col.bot,
      volume: colVol,
      dir: col.dir,
    });
    for (let p = col.bot; p < col.top; p += boxSize) {
      boxes.push({ time: t, price: p + boxSize / 2, type: col.dir === 1 ? 'X' : 'O' });
    }
  }
  return { columns: pfCandles, boxes, boxSize };
}


function formatPrice(p: number): string {
  if (p >= 10000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(6);
}

function formatTimeLabel(ts: number, intervalSec: number): string {
  const d = new Date(ts * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (intervalSec >= 604800) return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  if (intervalSec >= 86400) return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
  if (intervalSec >= 3600) return `${months[d.getUTCMonth()]} ${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2,'0')}:00`;
  return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
}

function formatDateFull(ts: number, intervalSec: number): string {
  const d = new Date(ts * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (intervalSec >= 86400) return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
}

function calculateNiceStep(range: number, availablePx: number, minGapPx = 70): number {
  const maxTicks = Math.max(2, Math.floor(availablePx / minGapPx));
  const rough = range / maxTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const r = rough / mag;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * mag;
}

function isBrightHexColor(hex: string): boolean {
  const n = hex.replace('#', '');
  if (n.length !== 6) return false;
  const r = parseInt(n.substring(0,2),16), g = parseInt(n.substring(2,4),16), b = parseInt(n.substring(4,6),16);
  return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.35;
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0,2),16)||0, g = parseInt(h.substring(2,4),16)||0, b = parseInt(h.substring(4,6),16)||0;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── localStorage helpers ───
function loadConfig(): ChartConfig {
  try {
    const raw = localStorage.getItem('newui-chart-config');
    const parsed = raw ? JSON.parse(raw) : {};
    const merged: ChartConfig = { ...DEFAULT_CHART_CONFIG, ...parsed };
    if (isBrightHexColor(merged.bg)) merged.bg = DEFAULT_CHART_CONFIG.bg;
    merged.showGlow = false;
    merged.showGrid = true;
    return merged;
  } catch { return DEFAULT_CHART_CONFIG; }
}

function loadIndicators(): ActiveIndicator[] {
  try {
    const s = localStorage.getItem('newui-active-indicators');
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function loadDrawings(): WidgetDrawing[] {
  try {
    const raw = localStorage.getItem(DRAWINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((d: any) => d && Array.isArray(d.points) && typeof d.color === 'string');
  } catch { return []; }
}

function persistDrawings(drawings: WidgetDrawing[]) {
  localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(drawings));
}

// ─── Hit testing for drawings ───
const HIT_RADIUS = 10;
const ANCHOR_RADIUS = 12;

function hitTestAnchor(
  d: WidgetDrawing,
  mx: number, my: number,
  timeToX: (t: number) => number | null,
  priceToY: (p: number) => number,
): number {
  if (d.visible === false) return -1;

  // Check real points first
  for (let i = 0; i < d.points.length; i++) {
    const x = timeToX(d.points[i].time);
    if (x === null) continue;
    const y = priceToY(d.points[i].price);
    if (Math.hypot(mx - x, my - y) <= ANCHOR_RADIUS) return i;
  }

  // For parallel channel: 6 virtual anchors (3 top midpoint + 3 bottom line)
  if (d.type === 'parallelchannel' && d.points.length >= 3) {
    const p0x = timeToX(d.points[0].time);
    const p1x = timeToX(d.points[1].time);
    const p2x = timeToX(d.points[2].time);
    if (p0x !== null && p1x !== null && p2x !== null) {
      const p0y = priceToY(d.points[0].price);
      const p1y = priceToY(d.points[1].price);
      const p2y = priceToY(d.points[2].price);
      const offY = p2y - p0y;
      const midX = (p0x + p1x) / 2;
      const midY = (p0y + p1y) / 2;

      // 10=bottom-left, 11=bottom-mid, 12=bottom-right, 13=top-mid
      const virtualAnchors = [
        { x: p0x, y: p0y + offY, idx: 10 },
        { x: midX, y: midY + offY, idx: 11 },
        { x: p1x, y: p1y + offY, idx: 12 },
        { x: midX, y: midY, idx: 13 },
      ];
      for (const va of virtualAnchors) {
        if (Math.hypot(mx - va.x, my - va.y) <= ANCHOR_RADIUS) return va.idx;
      }
    }
  }

  // For long/short position: virtual anchors for stop loss (20), take profit (21), left-resize (22), right-resize (23)
  if ((d.type === 'longposition' || d.type === 'shortposition') && d.points.length >= 2) {
    const isLong = d.type === 'longposition';
    const entry = d.points[0].price;
    const profit = d.points[1].price;
    const props = d.props || {};
    const tpDist = Math.abs(profit - entry);
    const stopPrice = (props.stopPrice != null && props.stopPrice > 0)
      ? props.stopPrice
      : (isLong ? entry - tpDist * 0.5 : entry + tpDist * 0.5);
    const p0x = timeToX(d.points[0].time);
    if (p0x !== null) {
      const fixedW = (d.props || {}).boxWidthPx || 280;
      const boxRight = p0x + fixedW;
      const handleW = 50, handleH = 24;
      const yStop = priceToY(stopPrice);
      const yTP = priceToY(profit);
      const yEntry = priceToY(entry);
      const topY = Math.min(yEntry, yTP, yStop);
      const bottomY = Math.max(yEntry, yTP, yStop);
      const midY = (topY + bottomY) / 2;
      // TP handle rect
      const tpHX = boxRight - handleW - 6;
      if (mx >= tpHX && mx <= tpHX + handleW && Math.abs(my - yTP) <= handleH / 2) return 21;
      // SL handle rect
      const slHX = boxRight - handleW - 6;
      if (mx >= slHX && mx <= slHX + handleW && Math.abs(my - yStop) <= handleH / 2) return 20;
      // TP/SL line drag
      if (Math.abs(my - yTP) <= 6 && mx >= p0x && mx <= boxRight) return 21;
      if (Math.abs(my - yStop) <= 6 && mx >= p0x && mx <= boxRight) return 20;
      // Left edge resize (vertical strip)
      if (Math.abs(mx - p0x) <= 8 && my >= topY - 5 && my <= bottomY + 5) return 22;
      // Right edge resize (vertical strip)
      if (Math.abs(mx - boxRight) <= 8 && my >= topY - 5 && my <= bottomY + 5) return 23;
    }
  }

  return -1;
}

function distToSegment(mx: number, my: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(mx - x1, my - y1);
  const t = Math.max(0, Math.min(1, ((mx - x1) * dx + (my - y1) * dy) / lenSq));
  return Math.hypot(mx - (x1 + t * dx), my - (y1 + t * dy));
}

function hitTestWidgetDrawing(
  d: WidgetDrawing,
  mx: number, my: number,
  timeToX: (t: number) => number | null,
  priceToY: (p: number) => number,
  chartW: number, priceH: number,
): boolean {
  if (d.visible === false) return false;
  const pts = d.points.map(p => {
    const x = timeToX(p.time);
    const y = priceToY(p.price);
    return x !== null ? { x, y } : null;
  }).filter(Boolean) as { x: number; y: number }[];

  const type = d.type;

  if (type === 'horizontalline' && d.points.length >= 1) {
    const y = priceToY(d.points[0].price);
    return Math.abs(my - y) <= HIT_RADIUS;
  }
  if (type === 'verticalline' && pts.length >= 1) {
    return Math.abs(mx - pts[0].x) <= HIT_RADIUS;
  }
  if (type === 'crossline' && pts.length >= 1) {
    return Math.abs(mx - pts[0].x) <= HIT_RADIUS || Math.abs(my - pts[0].y) <= HIT_RADIUS;
  }
  if (['arrowmarkup', 'arrowmarkdown', 'arrowmarker', 'text', 'note'].includes(type) && pts.length >= 1) {
    return Math.hypot(mx - pts[0].x, my - pts[0].y) <= 15;
  }

  // Two-point line types
  if (['trendline', 'infoline', 'trendangle', 'ray', 'extendedline', 'horizontalray'].includes(type) && pts.length >= 2) {
    return distToSegment(mx, my, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= HIT_RADIUS;
  }

  // Position tools: fixed-width hit area based on entry point
  if (['longposition', 'shortposition'].includes(type) && pts.length >= 2) {
    const props = d.props || {};
    const fixedW = props.boxWidthPx || 280;
    const left = pts[0].x;
    const right = left + fixedW;
    const entry = d.points[0].price;
    const profit = d.points[1].price;
    const isLong = type === 'longposition';
    const tpDist = Math.abs(profit - entry);
    const stopPrice = (props.stopPrice != null && props.stopPrice > 0) ? props.stopPrice : (isLong ? entry - tpDist * 0.5 : entry + tpDist * 0.5);
    const yEntry = priceToY(entry);
    const yTP = priceToY(profit);
    const yStop = priceToY(stopPrice);
    const top = Math.min(yEntry, yTP, yStop);
    const bottom = Math.max(yEntry, yTP, yStop);
    return mx >= left - HIT_RADIUS && mx <= right + HIT_RADIUS && my >= top - HIT_RADIUS && my <= bottom + HIT_RADIUS;
  }

  // Rectangle types
  if (['rectangle', 'rotatedrectangle', 'pricerange', 'daterange', 'datepricerange',
    'gannbox', 'fixedrangevolume'].includes(type) && pts.length >= 2) {
    const left = Math.min(pts[0].x, pts[1].x), right = Math.max(pts[0].x, pts[1].x);
    const top = Math.min(pts[0].y, pts[1].y), bottom = Math.max(pts[0].y, pts[1].y);
    return mx >= left - HIT_RADIUS && mx <= right + HIT_RADIUS && my >= top - HIT_RADIUS && my <= bottom + HIT_RADIUS;
  }

  if (type === 'circle' && pts.length >= 2) {
    const r = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const dist = Math.hypot(mx - pts[0].x, my - pts[0].y);
    return dist <= r + HIT_RADIUS;
  }

  if (type === 'ellipse' && pts.length >= 2) {
    const rx = Math.abs(pts[1].x - pts[0].x) || 1, ry = Math.abs(pts[1].y - pts[0].y) || 1;
    const norm = ((mx - pts[0].x) / rx) ** 2 + ((my - pts[0].y) / ry) ** 2;
    return norm <= 1.3;
  }

  if (type === 'fibonacci' && pts.length >= 2) {
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const p0 = d.points[0].price, p1 = d.points[1].price;
    for (const l of levels) {
      const price = p0 + (p1 - p0) * l;
      const y = priceToY(price);
      if (Math.abs(my - y) <= HIT_RADIUS) return true;
    }
    return false;
  }

  // Parallel channel — hit inside the filled area between top and bottom lines
  if (type === 'parallelchannel' && pts.length >= 3 && d.points.length >= 3) {
    const offPrice = d.points[2].price - d.points[0].price;
    const topLeft = pts[0], topRight = pts[1];
    const botLeftY = priceToY(d.points[0].price + offPrice);
    const botRightY = priceToY(d.points[1].price + offPrice);
    // Check near top line
    if (distToSegment(mx, my, topLeft.x, topLeft.y, topRight.x, topRight.y) <= HIT_RADIUS) return true;
    // Check near bottom line
    if (distToSegment(mx, my, topLeft.x, botLeftY, topRight.x, botRightY) <= HIT_RADIUS) return true;
    // Check inside the channel polygon
    const minX = Math.min(topLeft.x, topRight.x);
    const maxX = Math.max(topLeft.x, topRight.x);
    if (mx >= minX - HIT_RADIUS && mx <= maxX + HIT_RADIUS) {
      // Interpolate top and bottom Y at mx
      const t = maxX !== minX ? (mx - topLeft.x) / (topRight.x - topLeft.x) : 0;
      const topY = topLeft.y + t * (topRight.y - topLeft.y);
      const botY = botLeftY + t * (botRightY - botLeftY);
      const yMin = Math.min(topY, botY) - HIT_RADIUS;
      const yMax = Math.max(topY, botY) + HIT_RADIUS;
      if (my >= yMin && my <= yMax) return true;
    }
    return false;
  }

  // Multi-point
  if (pts.length >= 2) {
    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegment(mx, my, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= HIT_RADIUS) return true;
    }
  }
  if (pts.length === 1) {
    return Math.hypot(mx - pts[0].x, my - pts[0].y) <= 15;
  }
  return false;
}

// ─── Drawing renderer ───
function renderDrawing(
  ctx: CanvasRenderingContext2D,
  d: WidgetDrawing,
  timeToX: (t: number) => number | null,
  priceToY: (p: number) => number,
  chartW: number,
  priceH: number,
) {
  if (d.visible === false) return;
  ctx.strokeStyle = d.color;
  ctx.fillStyle = d.color;
  ctx.lineWidth = d.lineWidth;
  ctx.lineCap = 'round';
  ctx.setLineDash([]);

  const pts = d.points.map(p => {
    const x = timeToX(p.time);
    const y = priceToY(p.price);
    return x !== null ? { x, y } : null;
  }).filter(Boolean) as { x: number; y: number }[];

  const type = d.type;

  // Single-point types
  if (type === 'horizontalline' && d.points.length >= 1) {
    const y = priceToY(d.points[0].price);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    if (d.selected) renderSelectionAnchors(ctx, [{ x: chartW / 2, y }], d.color);
    return;
  }
  if (type === 'verticalline' && pts.length >= 1) {
    ctx.beginPath(); ctx.moveTo(pts[0].x, 0); ctx.lineTo(pts[0].x, priceH); ctx.stroke();
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }
  if (type === 'crossline' && pts.length >= 1) {
    ctx.beginPath(); ctx.moveTo(0, pts[0].y); ctx.lineTo(chartW, pts[0].y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pts[0].x, 0); ctx.lineTo(pts[0].x, priceH); ctx.stroke();
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }
  if ((type === 'arrowmarkup' || type === 'arrowmarkdown') && pts.length >= 1) {
    const sz = 12;
    const dir = type === 'arrowmarkup' ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y + dir * sz);
    ctx.lineTo(pts[0].x - sz * 0.6, pts[0].y - dir * sz * 0.3);
    ctx.lineTo(pts[0].x + sz * 0.6, pts[0].y - dir * sz * 0.3);
    ctx.closePath(); ctx.fill();
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }
  if (type === 'text' && pts.length >= 1) {
    ctx.font = '13px Inter, sans-serif';
    ctx.fillStyle = d.color;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('Text', pts[0].x, pts[0].y);
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }
  if (type === 'note' && pts.length >= 1) {
    ctx.fillStyle = d.color;
    ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Note', pts[0].x + 10, pts[0].y);
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }

  // Two-point types
  if (pts.length < 2 && getPointCount(type) >= 2) return;

  if (type === 'trendline' || type === 'infoline' || type === 'trendangle') {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.stroke();
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    else {
      for (const p of pts) {
        ctx.fillStyle = d.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    return;
  }

  if (type === 'ray') {
    const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
    const len = Math.max(chartW, priceH) * 3;
    const mag = Math.hypot(dx, dy) || 1;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[0].x + dx / mag * len, pts[0].y + dy / mag * len);
    ctx.stroke();
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }

  if (type === 'horizontalray') {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(chartW, pts[0].y); ctx.stroke();
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }

  if (type === 'extendedline') {
    const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
    const len = Math.max(chartW, priceH) * 3;
    const mag = Math.hypot(dx, dy) || 1;
    ctx.beginPath();
    ctx.moveTo(pts[0].x - dx / mag * len, pts[0].y - dy / mag * len);
    ctx.lineTo(pts[0].x + dx / mag * len, pts[0].y + dy / mag * len);
    ctx.stroke();
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }

  // Long/Short position (TradingView-style 3-zone)
  if (type === 'longposition' || type === 'shortposition') {
    const isLong = type === 'longposition';
    const entry = d.points[0].price;
    const profit = d.points[1].price;
    const props = d.props || {};
    const accountSize = props.accountSize || 10000;
    const riskPercent = props.riskPercent ?? 2;
    const riskAbsolute = props.riskAbsolute;
    const leverage = props.leverage || 1;
    const lotSize = props.lotSize || 1;
    const pointValue = props.pointValue || 1;
    const compactStats = props.compactStats || false;
    const tpDist = Math.abs(profit - entry);
    let stopPrice: number;
    if (props.stopPrice != null && props.stopPrice > 0) stopPrice = props.stopPrice;
    else stopPrice = isLong ? entry - tpDist * 0.5 : entry + tpDist * 0.5;

    const yEntry = priceToY(entry);
    const yTP = priceToY(profit);
    const yStop = priceToY(stopPrice);

    // Fixed-width box: use stored pixel width, NOT time-based
    const fixedW = props.boxWidthPx || 280;
    const boxLeft = pts[0].x;
    const boxRight = boxLeft + fixedW;
    const boxW = fixedW;

    // Risk & qty
    const riskSize = riskAbsolute != null ? riskAbsolute : (riskPercent / 100) * accountSize;
    const slDist = Math.abs(entry - stopPrice);
    let qtyRisk = slDist > 0 ? (riskSize / (slDist * pointValue)) / lotSize : 0;
    let qtyLvg = (accountSize * leverage / entry) * pointValue / lotSize;
    let qty = Math.min(qtyRisk, qtyLvg);
    if (qty <= 0) qty = 1;
    if (props.quantity && props.quantity > 0) qty = props.quantity;

    const pnlTP = isLong ? (profit - entry) * qty * pointValue * lotSize : (entry - profit) * qty * pointValue * lotSize;
    const pnlSL = isLong ? (stopPrice - entry) * qty * pointValue * lotSize : (entry - stopPrice) * qty * pointValue * lotSize;
    const balTP = accountSize + pnlTP;
    const balSL = accountSize + pnlSL;
    const tpPriceOffset = isLong ? profit - entry : entry - profit;
    const tpPctOffset = (tpPriceOffset / entry) * 100;
    const slPriceOffset = isLong ? entry - stopPrice : stopPrice - entry;
    const slPctOffset = (slPriceOffset / entry) * 100;
    const rr = slPriceOffset > 0 ? tpPriceOffset / slPriceOffset : 0;

    const greenC = '#26a69a', redC = '#ef5350', blueC = '#2196f3';
    const sign = (n: number) => n >= 0 ? '+' : '';
    const fmt = (n: number) => Math.abs(n) >= 1 ? n.toFixed(2) : n.toPrecision(4);

    // TP zone
    ctx.fillStyle = 'rgba(38,166,154,0.15)';
    ctx.fillRect(boxLeft, Math.min(yEntry, yTP), boxW, Math.abs(yTP - yEntry));
    // SL zone
    ctx.fillStyle = 'rgba(239,83,80,0.15)';
    ctx.fillRect(boxLeft, Math.min(yEntry, yStop), boxW, Math.abs(yStop - yEntry));

    // Entry line
    ctx.strokeStyle = blueC; ctx.lineWidth = 1.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(boxLeft, yEntry); ctx.lineTo(boxRight, yEntry); ctx.stroke();
    // TP line
    ctx.strokeStyle = greenC;
    ctx.beginPath(); ctx.moveTo(boxLeft, yTP); ctx.lineTo(boxRight, yTP); ctx.stroke();
    // SL line (dashed)
    ctx.strokeStyle = redC; ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(boxLeft, yStop); ctx.lineTo(boxRight, yStop); ctx.stroke();
    ctx.setLineDash([]);

    // ═══ Drag handles on TP and SL lines ═══
    const handleW = 50, handleH = 18, handleR = 4;
    const slMidX = (boxLeft + boxRight) / 2;

    // TP drag handle
    const tpHandleX = boxRight - handleW - 6;
    const tpHandleY = yTP - handleH / 2;
    ctx.fillStyle = 'rgba(38,166,154,0.85)';
    ctx.beginPath();
    ctx.roundRect(tpHandleX, tpHandleY, handleW, handleH, handleR);
    ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('▲ TP', tpHandleX + handleW / 2, tpHandleY + 12);
    // Grip dots
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let gy = -3; gy <= 3; gy += 3) {
      ctx.fillRect(tpHandleX + 4, tpHandleY + handleH / 2 + gy - 1, 2, 2);
    }

    // SL drag handle
    const slHandleX = boxRight - handleW - 6;
    const slHandleY = yStop - handleH / 2;
    ctx.fillStyle = 'rgba(239,83,80,0.85)';
    ctx.beginPath();
    ctx.roundRect(slHandleX, slHandleY, handleW, handleH, handleR);
    ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('▼ SL', slHandleX + handleW / 2, slHandleY + 12);
    // Grip dots
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let gy = -3; gy <= 3; gy += 3) {
      ctx.fillRect(slHandleX + 4, slHandleY + handleH / 2 + gy - 1, 2, 2);
    }

    // Labels
    ctx.font = '11px monospace'; ctx.textAlign = 'left';
    if (compactStats) {
      ctx.fillStyle = blueC; ctx.fillText(`${fmt(entry)}`, boxLeft + 6, yEntry - 5);
      ctx.fillStyle = greenC; ctx.fillText(`TP ${fmt(profit)} (${sign(tpPctOffset)}${tpPctOffset.toFixed(2)}%)`, boxLeft + 6, yTP + (yTP < yEntry ? -5 : 14));
      ctx.fillStyle = redC; ctx.fillText(`SL ${fmt(stopPrice)} (${sign(-slPctOffset)}${(-slPctOffset).toFixed(2)}%)`, boxLeft + 6, yStop + (yStop > yEntry ? 14 : -5));
    } else {
      ctx.fillStyle = blueC; ctx.fillText(`Entry: ${fmt(entry)}`, boxLeft + 6, yEntry - 5);
      ctx.textAlign = 'right'; ctx.fillStyle = '#d1d4dc';
      ctx.fillText(`Qty: ${qty.toFixed(4)}  |  Pos: $${(qty * entry * lotSize).toFixed(2)}`, boxRight - 6, yEntry - 5);
      ctx.textAlign = 'left';
      const tpLY = yTP + (yTP < yEntry ? -5 : 14);
      ctx.fillStyle = greenC; ctx.fillText(`Target: ${fmt(profit)}  ${sign(tpPriceOffset)}${fmt(tpPriceOffset)} (${sign(tpPctOffset)}${tpPctOffset.toFixed(2)}%)`, boxLeft + 6, tpLY);
      ctx.fillStyle = '#d1d4dc'; ctx.font = '10px monospace';
      ctx.fillText(`P&L: ${sign(pnlTP)}$${Math.abs(pnlTP).toFixed(2)}  |  Bal: $${balTP.toFixed(2)}`, boxLeft + 6, yTP + (yTP < yEntry ? -18 : 27));
      ctx.font = '11px monospace';
      const slLY = yStop + (yStop > yEntry ? 14 : -5);
      ctx.fillStyle = redC; ctx.fillText(`Stop: ${fmt(stopPrice)}  ${sign(-slPriceOffset)}${fmt(-slPriceOffset)} (${sign(-slPctOffset)}${(-slPctOffset).toFixed(2)}%)`, boxLeft + 6, slLY);
      ctx.fillStyle = '#d1d4dc'; ctx.font = '10px monospace';
      ctx.fillText(`P&L: ${sign(pnlSL)}$${Math.abs(pnlSL).toFixed(2)}  |  Bal: $${balSL.toFixed(2)}`, boxLeft + 6, yStop + (yStop > yEntry ? 27 : -18));
      ctx.font = '11px monospace';
      ctx.fillStyle = '#d1d4dc'; ctx.textAlign = 'right';
      ctx.fillText(`R/R: ${rr.toFixed(2)}`, boxRight - 6, (yEntry + yTP) / 2);
      ctx.textAlign = 'left';
    }
    // Arrow icon
    ctx.fillStyle = isLong ? greenC : redC;
    ctx.beginPath();
    if (isLong) { ctx.moveTo(boxLeft - 8, yEntry + 4); ctx.lineTo(boxLeft - 4, yEntry - 4); ctx.lineTo(boxLeft, yEntry + 4); }
    else { ctx.moveTo(boxLeft - 8, yEntry - 4); ctx.lineTo(boxLeft - 4, yEntry + 4); ctx.lineTo(boxLeft, yEntry - 4); }
    ctx.fill();
    if (d.selected) {
      renderSelectionAnchors(ctx, [...pts, { x: slMidX, y: yStop }, { x: slMidX, y: yTP }], d.color);
      // Resize handles on left and right edges
      const topY = Math.min(yEntry, yTP, yStop);
      const bottomY = Math.max(yEntry, yTP, yStop);
      const edgeMidY = (topY + bottomY) / 2;
      const handleH = 24, handleW2 = 6;
      // Left edge handle
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(boxLeft - handleW2 / 2, edgeMidY - handleH / 2, handleW2, handleH, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.stroke();
      // Right edge handle
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(boxRight - handleW2 / 2, edgeMidY - handleH / 2, handleW2, handleH, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.stroke();
      // Grip lines
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.5;
      for (const ex of [boxLeft, boxRight]) {
        for (let gy = -4; gy <= 4; gy += 4) {
          ctx.beginPath();
          ctx.moveTo(ex - 1.5, edgeMidY + gy);
          ctx.lineTo(ex + 1.5, edgeMidY + gy);
          ctx.stroke();
        }
      }
    }
    return;
  }

  if (['rectangle', 'rotatedrectangle', 'pricerange', 'daterange', 'datepricerange',
    'gannbox', 'fixedrangevolume'].includes(type)) {
    const x1 = Math.min(pts[0].x, pts[1].x), y1 = Math.min(pts[0].y, pts[1].y);
    const w = Math.abs(pts[1].x - pts[0].x), h = Math.abs(pts[1].y - pts[0].y);
    ctx.fillStyle = hexToRgba(d.color, 0.08);
    ctx.fillRect(x1, y1, w, h);
    ctx.strokeRect(x1, y1, w, h);
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }

  if (type === 'circle') {
    const r = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    ctx.fillStyle = hexToRgba(d.color, 0.06);
    ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }

  if (type === 'ellipse') {
    const rx = Math.abs(pts[1].x - pts[0].x), ry = Math.abs(pts[1].y - pts[0].y);
    ctx.fillStyle = hexToRgba(d.color, 0.06);
    ctx.beginPath(); ctx.ellipse(pts[0].x, pts[0].y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }

  if (type === 'fibonacci') {
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const colors = ['#787b86', '#f44336', '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#787b86'];
    const p0 = d.points[0].price, p1 = d.points[1].price;
    const x1 = pts[0].x, x2 = pts[1].x;
    for (let i = 0; i < levels.length; i++) {
      const price = p0 + (p1 - p0) * levels[i];
      const y = priceToY(price);
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(Math.min(x1, x2), y); ctx.lineTo(Math.max(x1, x2), y); ctx.stroke();
      if (i < levels.length - 1) {
        const nextPrice = p0 + (p1 - p0) * levels[i + 1];
        const ny = priceToY(nextPrice);
        ctx.fillStyle = hexToRgba(colors[i], 0.04);
        ctx.fillRect(Math.min(x1, x2), Math.min(y, ny), Math.abs(x2 - x1), Math.abs(ny - y));
      }
      ctx.fillStyle = colors[i];
      ctx.font = '10px Inter, monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`${(levels[i] * 100).toFixed(1)}% — ${formatPrice(price)}`, Math.min(x1, x2) + 4, y - 8);
    }
    ctx.lineWidth = d.lineWidth;
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }

  // Three-point: parallel channel
  if (type === 'parallelchannel' && pts.length >= 3) {
    const offY = pts[2].y - pts[0].y;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y + offY); ctx.lineTo(pts[1].x, pts[1].y + offY); ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = hexToRgba(d.color, 0.4);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y + offY / 2);
    ctx.lineTo(pts[1].x, pts[1].y + offY / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = hexToRgba(d.color, 0.05);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[1].x, pts[1].y + offY);
    ctx.lineTo(pts[0].x, pts[0].y + offY);
    ctx.closePath(); ctx.fill();
    if (d.selected) {
      // Render 6 anchors: 3 on top line + 3 on bottom line
      const offY = pts[2].y - pts[0].y;
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const allAnchors = [
        pts[0], { x: midX, y: midY }, pts[1],                        // top: left, mid, right
        { x: pts[0].x, y: pts[0].y + offY }, { x: midX, y: midY + offY }, { x: pts[1].x, y: pts[1].y + offY }, // bottom
      ];
      renderSelectionAnchors(ctx, allAnchors, d.color);
    }
    return;
  }

  if (type === 'triangle' && pts.length >= 3) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(d.color, 0.06);
    ctx.fill(); ctx.stroke();
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }

  // Pitchfork
  if (['pitchfork', 'schiffpitchfork', 'modifiedschiff', 'insidepitchfork'].includes(type) && pts.length >= 3) {
    const midX = (pts[1].x + pts[2].x) / 2;
    const midY = (pts[1].y + pts[2].y) / 2;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(midX + (midX - pts[0].x) * 5, midY + (midY - pts[0].y) * 5); ctx.stroke();
    const dx = midX - pts[0].x, dy = midY - pts[0].y;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(pts[1].x, pts[1].y); ctx.lineTo(pts[1].x + dx * 6, pts[1].y + dy * 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pts[2].x, pts[2].y); ctx.lineTo(pts[2].x + dx * 6, pts[2].y + dy * 6); ctx.stroke();
    ctx.setLineDash([]);
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }

  // Multi-point patterns (zigzag)
  if (['xabcd', 'cypher', 'abcd', 'headshoulders', 'trianglepattern', 'threedrives'].includes(type) && pts.length >= 2) {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    const labels = type === 'xabcd' ? ['X','A','B','C','D'] :
                   type === 'abcd' ? ['A','B','C','D'] :
                   type === 'headshoulders' ? ['1','2','3','4','5','6','7'] :
                   type === 'cypher' ? ['X','A','B','C','D'] :
                   pts.map((_,i) => String(i + 1));
    ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (let i = 0; i < pts.length && i < labels.length; i++) {
      ctx.fillStyle = d.color;
      ctx.fillText(labels[i], pts[i].x, pts[i].y - 6);
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
    return;
  }

  // Freehand
  if (['brush', 'highlighter', 'arrowdraw', 'path', 'polyline'].includes(type) && pts.length >= 2) {
    if (type === 'highlighter') {
      ctx.strokeStyle = hexToRgba(d.color, 0.3);
      ctx.lineWidth = 16;
    }
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.lineWidth = d.lineWidth;
    if (d.selected) {
      renderSelectionAnchors(ctx, [pts[0], pts[pts.length - 1]], d.color);
    }
    return;
  }

  // Generic fallback
  if (pts.length >= 2) {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    if (d.selected) renderSelectionAnchors(ctx, pts, d.color);
  }
}

function renderSelectionAnchors(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], color: string) {
  for (const p of pts) {
    // Outer glow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
    // White fill
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
}

// ═══════════════════════════════════════════════════
// ═══ MAIN COMPONENT ══════════════════════════════
// ═══════════════════════════════════════════════════

export default function PriceChartWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Plan limits
  const { data: profile } = useProfile();
  const userPlan = profile?.plan ?? 'start';
  const planLimits = useMemo(() => getPlanLimits(userPlan), [userPlan]);

  // Dynamic symbol support
  const [symbol, setSymbol] = useState('BTCUSDT');
  const symbolRef = useRef('BTCUSDT');
  useEffect(() => { symbolRef.current = symbol; }, [symbol]);
  const [watchlistOpen, setWatchlistOpen] = useState(false);

  const [timeframe, setTimeframe] = useState<Timeframe>('4h');
  const [chartType, setChartType] = useState<NewUIChartType>('candles');
  const [chartTypeOpen, setChartTypeOpen] = useState(false);
  const chartTypeRef = useRef<NewUIChartType>('candles');
  useEffect(() => { chartTypeRef.current = chartType; }, [chartType]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawingTool, setDrawingTool] = useState<NewUIDrawingTool>('none');
  const [settingsDrawingId, setSettingsDrawingId] = useState<string | null>(null);

  // Replay state
  const [replayState, setReplayState] = useState<NewUIReplayState>('off');
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayBarIndex, setReplayBarIndex] = useState(0);
  const [replayStartIndex, setReplayStartIndex] = useState(0);
  const replayTimerRef = useRef<number | null>(null);
  const replayStateRef = useRef<NewUIReplayState>('off');
  const replayBarIndexRef = useRef(0);
  // Store timestamps so we can restore position after timeframe change
  const replayBarTimestampRef = useRef<number | null>(null);
  const replayStartTimestampRef = useRef<number | null>(null);
  useEffect(() => { replayStateRef.current = replayState; }, [replayState]);
  useEffect(() => { replayBarIndexRef.current = replayBarIndex; }, [replayBarIndex]);

  const [config, setConfig] = useState<ChartConfig>(loadConfig);
  const [indicators, setIndicators] = useState<ActiveIndicator[]>(loadIndicators);
  const [ohlcSettings, setOhlcSettings] = useState<OhlcBarSettings>(loadOhlcSettings);
  const [ohlcMenuOpen, setOhlcMenuOpen] = useState(false);
  const ohlcSettingsRef = useRef(ohlcSettings);

  // Wyckoff indicator state — manual zone selection
  type WyckoffMode = 'off' | 'selecting' | 'active';
  const [wyckoffMode, setWyckoffMode] = useState<WyckoffMode>('off');
  const wyckoffModeRef = useRef<WyckoffMode>('off');
  const [wyckoffEnabled, setWyckoffEnabled] = useState(false); // kept for rendering compat
  const wyckoffRef = useRef<WyckoffResult | null>(null);
  const wyckoffEnabledRef = useRef(false);
  const wyckoffZoneRef = useRef<{ startIdx: number; endIdx: number } | null>(null);
  const wyckoffDraftStartRef = useRef<number | null>(null); // first click index during selection

  useEffect(() => {
    wyckoffModeRef.current = wyckoffMode;
    wyckoffEnabledRef.current = wyckoffMode === 'active';
    setWyckoffEnabled(wyckoffMode === 'active');
    if (wyckoffMode === 'off') {
      wyckoffRef.current = null;
      wyckoffZoneRef.current = null;
      wyckoffDraftStartRef.current = null;
    }
    scheduleRender();
  }, [wyckoffMode]);
  useEffect(() => { ohlcSettingsRef.current = ohlcSettings; saveOhlcSettings(ohlcSettings); }, [ohlcSettings]);

  const initialDrawingsRef = useRef<WidgetDrawing[]>(loadDrawings());
  const drawingsRef = useRef<WidgetDrawing[]>(initialDrawingsRef.current);
  const draftPointsRef = useRef<DrawingPoint[]>([]);
  const [drawingsCount, setDrawingsCount] = useState(initialDrawingsRef.current.length);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const dragDrawingRef = useRef<{ id: string; startMx: number; startMy: number; origPoints: DrawingPoint[]; origProps?: Record<string, any> } | null>(null);
  const anchorDragRef = useRef<{ id: string; anchorIndex: number; startMx: number; startMy: number; origPoint: DrawingPoint } | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);

  // Undo/Redo stacks
  const undoStackRef = useRef<WidgetDrawing[][]>([]);
  const redoStackRef = useRef<WidgetDrawing[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushUndo = useCallback(() => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(drawingsRef.current)));
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const dataRef = useRef<Candle[]>([]);
  const stateRef = useRef<ChartState>({
    offsetX: 0, candleWidth: DEFAULT_CW, crosshair: null,
    dragMode: 'none', dragStartX: 0, dragStartY: 0,
    dragStartOffset: 0, dragStartCandleWidth: DEFAULT_CW,
    priceScaleZoom: 1, dragStartPriceZoom: 1,
    panOffsetY: 0, dragStartPanY: 0,
  });

  const projectionRef = useRef<Projection | null>(null);
  const hoverIdxRef = useRef<number>(-1);

  const configRef = useRef(config);
  const indicatorsRef = useRef(indicators);
  const indResultsRef = useRef<{ id: string; lines: { key: string; points: Point[]; color: string; width: number; style: string }[] }[]>([]);

  const rafRef = useRef(0);
  const intervalSecRef = useRef(14400);
  const wsRef = useRef<WebSocket | null>(null);
  const fetchSeqRef = useRef(0);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const timeframeCacheRef = useRef<Map<Timeframe, { candles: Candle[]; cachedAt: number }>>(new Map());
  const [cursor, setCursor] = useState('crosshair');
  const drawingToolRef = useRef<NewUIDrawingTool>(drawingTool);

  useEffect(() => { drawingToolRef.current = drawingTool; }, [drawingTool]);

  // Close chart type dropdown on outside click
  useEffect(() => {
    if (!chartTypeOpen) return;
    const onClick = () => setChartTypeOpen(false);
    const timer = setTimeout(() => window.addEventListener('click', onClick), 0);
    return () => { clearTimeout(timer); window.removeEventListener('click', onClick); };
  }, [chartTypeOpen]);

  // Load logo image for watermark
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoHoverRef = useRef(false);
  const logoTextAlphaRef = useRef(0);
  const logoBoundsRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  useEffect(() => {
    const img = new Image();
    img.src = vizionLogo;
    img.onload = () => { logoImgRef.current = img; scheduleRender(); };
  }, []);

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, []);

  const undoDrawings = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    redoStackRef.current.push(JSON.parse(JSON.stringify(drawingsRef.current)));
    drawingsRef.current = undoStackRef.current.pop()!;
    persistDrawings(drawingsRef.current);
    setDrawingsCount(drawingsRef.current.length);
    setSelectedDrawingId(null);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    scheduleRender();
  }, [scheduleRender]);

  const redoDrawings = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    undoStackRef.current.push(JSON.parse(JSON.stringify(drawingsRef.current)));
    drawingsRef.current = redoStackRef.current.pop()!;
    persistDrawings(drawingsRef.current);
    setDrawingsCount(drawingsRef.current.length);
    setSelectedDrawingId(null);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    scheduleRender();
  }, [scheduleRender]);

  useEffect(() => {
    configRef.current = config;
    localStorage.setItem('newui-chart-config', JSON.stringify(config));
    scheduleRender();
  }, [config, scheduleRender]);

  useEffect(() => {
    indicatorsRef.current = indicators;
    localStorage.setItem('newui-active-indicators', JSON.stringify(indicators));
    recalcIndicators();
  }, [indicators]);

  const recalcIndicators = useCallback(() => {
    const data = dataRef.current;
    const inds = indicatorsRef.current;
    if (data.length === 0) { indResultsRef.current = []; return; }

    const ohlcv = data.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }));
    const results: typeof indResultsRef.current = [];

    for (const ind of inds) {
      if (!ind.visible) continue;
      const def = getIndicator(ind.defId);
      if (!def || !def.overlay) continue;
      try {
        const calcResult = def.calculate(ohlcv, ind.params);
        const lines = Object.entries(calcResult).map(([key, points]) => {
          const lineDef = def.lines.find(l => l.key === key);
          return { key, points: points as Point[], color: lineDef?.color ?? ind.color, width: lineDef?.width ?? 1.5, style: lineDef?.style ?? 'solid' };
        });
        results.push({ id: ind.id, lines });
      } catch (e) { console.warn(`Indicator ${ind.defId} error:`, e); }
    }
    indResultsRef.current = results;

    // Recalc Wyckoff if zone is active
    if (wyckoffModeRef.current === 'active' && wyckoffZoneRef.current && data.length > 10) {
      const z = wyckoffZoneRef.current;
      wyckoffRef.current = analyzeWyckoffZone(data, z.startIdx, z.endIdx);
    }

    scheduleRender();
  }, [scheduleRender]);

  const addIndicator = useCallback((defId: string) => {
    const def = getIndicator(defId);
    if (!def) return;
    // Plan-based indicator limit
    const currentCount = indicators.filter(i => i.visible).length;
    if (currentCount >= planLimits.indicatorsPerChart) {
      toast.error(`Your plan allows up to ${planLimits.indicatorsPerChart} indicators. Upgrade for more.`);
      return;
    }
    const id = `${defId}-${Date.now()}`;
    const color = def.lines[0]?.color ?? '#ffffff';
    const params: Record<string, any> = {};
    for (const p of def.params) params[p.key] = p.default;
    setIndicators(prev => [...prev, { id, defId, params, color, visible: true }]);
  }, [indicators, planLimits]);

  const removeIndicator = useCallback((id: string) => setIndicators(prev => prev.filter(i => i.id !== id)), []);
  const toggleIndicator = useCallback((id: string) => setIndicators(prev => prev.map(i => i.id === id ? { ...i, visible: !i.visible } : i)), []);
  const removeAllIndicators = useCallback(() => setIndicators([]), []);

  const commitDrawing = useCallback((drawing: WidgetDrawing) => {
    pushUndo();
    drawingsRef.current = [...drawingsRef.current, drawing];
    persistDrawings(drawingsRef.current);
    setDrawingsCount(drawingsRef.current.length);
    scheduleRender();
  }, [scheduleRender, pushUndo]);

  const removeAllDrawings = useCallback(() => {
    pushUndo();
    drawingsRef.current = [];
    draftPointsRef.current = [];
    persistDrawings(drawingsRef.current);
    setDrawingsCount(0);
    setSelectedDrawingId(null);
    scheduleRender();
  }, [scheduleRender, pushUndo]);

  const removeDrawing = useCallback((id: string) => {
    pushUndo();
    drawingsRef.current = drawingsRef.current.filter(d => d.id !== id);
    persistDrawings(drawingsRef.current);
    setDrawingsCount(drawingsRef.current.length);
    if (selectedDrawingId === id) setSelectedDrawingId(null);
    scheduleRender();
  }, [scheduleRender, selectedDrawingId, pushUndo]);

  const updateDrawing = useCallback((id: string, updates: Partial<WidgetDrawing>) => {
    drawingsRef.current = drawingsRef.current.map(d => d.id === id ? { ...d, ...updates } : d);
    persistDrawings(drawingsRef.current);
    scheduleRender();
  }, [scheduleRender]);

  const cloneDrawing = useCallback((id: string) => {
    const d = drawingsRef.current.find(dd => dd.id === id);
    if (!d) return;
    pushUndo();
    const clone: WidgetDrawing = {
      ...d,
      id: `${d.type}-${Date.now()}`,
      points: d.points.map(p => ({ time: p.time, price: p.price * 1.001 })),
      selected: false,
    };
    drawingsRef.current = [...drawingsRef.current, clone];
    persistDrawings(drawingsRef.current);
    setDrawingsCount(drawingsRef.current.length);
    setSelectedDrawingId(clone.id);
    scheduleRender();
  }, [scheduleRender, pushUndo]);

  const createPointFromScreen = useCallback((x: number, y: number): DrawingPoint | null => {
    const proj = projectionRef.current;
    const data = dataRef.current;
    if (!proj || data.length === 0) return null;

    const idx = Math.round(proj.startIdx + x / proj.candleWidth);
    const price = proj.minPrice + (1 - y / proj.priceH) * (proj.maxPrice - proj.minPrice);

    // Allow drawing beyond data range — extrapolate time
    if (idx >= 0 && idx < data.length) {
      return { time: data[idx].time, price };
    }

    // Beyond latest candle: extrapolate time into the future
    if (idx >= data.length && data.length >= 2) {
      const lastTime = data[data.length - 1].time;
      const intervalSec = intervalSecRef.current;
      const barsAhead = idx - (data.length - 1);
      return { time: lastTime + barsAhead * intervalSec, price };
    }

    // Before first candle
    if (idx < 0 && data.length >= 2) {
      const firstTime = data[0].time;
      const intervalSec = intervalSecRef.current;
      return { time: firstTime + idx * intervalSec, price };
    }

    // Fallback
    const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));
    return { time: data[clampedIdx].time, price };
  }, []);

  // ─── Keyboard ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        draftPointsRef.current = [];
        setDrawingTool('none');
        setSelectedDrawingId(null);
        setToolbarPos(null);
        scheduleRender();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        removeDrawing(selectedDrawingId);
      }
      // Ctrl+Z / Ctrl+Y undo/redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoDrawings();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redoDrawings();
        return;
      }
      // Replay: Shift+ArrowRight = step forward, Shift+ArrowDown = play/pause
      if (e.shiftKey && e.key === 'ArrowRight' && replayStateRef.current !== 'off' && replayStateRef.current !== 'selecting') {
        e.preventDefault();
        const total = dataRef.current.length;
        const next = Math.min(replayBarIndexRef.current + 1, total - 1);
        setReplayBarIndex(next);
        replayBarTimestampRef.current = dataRef.current[next]?.time ?? null;
        setReplayState('paused');
        scheduleRender();
        return;
      }
      if (e.shiftKey && e.key === 'ArrowDown' && replayStateRef.current !== 'off' && replayStateRef.current !== 'selecting') {
        e.preventDefault();
        setReplayState(replayStateRef.current === 'playing' ? 'paused' : 'playing');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scheduleRender, selectedDrawingId, removeDrawing, undoDrawings, redoDrawings]);

  // ─── Data fetch ───
  useEffect(() => {
    const cfg = TIMEFRAME_CONFIG[timeframe];
    intervalSecRef.current = cfg.intervalSec;
    const barLimit = planLimits.historicalBars;

    const applyCandles = (candles: Candle[], options?: { preserveView?: boolean }) => {
      const prevLen = dataRef.current.length;
      dataRef.current = candles;

      if (replayStateRef.current !== 'off' && replayStateRef.current !== 'selecting' && replayBarTimestampRef.current != null) {
        const barTs = replayBarTimestampRef.current;
        const startTs = replayStartTimestampRef.current ?? barTs;
        // Find the candle AT or BEFORE the target timestamp
        // to prevent jumping forward when switching timeframes
        const findAtOrBefore = (ts: number) => {
          let bestIdx = 0;
          for (let i = 0; i < candles.length; i++) {
            if (candles[i].time <= ts) bestIdx = i;
            else break;
          }
          return bestIdx;
        };
        const newBarIdx = findAtOrBefore(barTs);
        const newStartIdx = findAtOrBefore(startTs);
        setReplayBarIndex(newBarIdx);
        replayBarIndexRef.current = newBarIdx;
        setReplayStartIndex(newStartIdx);
        replayBarTimestampRef.current = candles[newBarIdx]?.time ?? null;
        replayStartTimestampRef.current = candles[newStartIdx]?.time ?? null;
      }

      const container = containerRef.current;
      if (container) {
        const chartW = container.clientWidth - PRICE_W - 44;
        const visibleCandles = Math.floor(chartW / stateRef.current.candleWidth);
        if (options?.preserveView) {
          const added = Math.max(0, candles.length - prevLen);
          stateRef.current.offsetX = Math.max(0, stateRef.current.offsetX + added);
        } else if (replayStateRef.current !== 'off' && replayStateRef.current !== 'selecting') {
          const rIdx = replayBarIndexRef.current;
          stateRef.current.offsetX = Math.max(0, rIdx - Math.floor(visibleCandles * 0.7));
        } else {
          stateRef.current.offsetX = Math.max(0, candles.length - visibleCandles);
        }
        stateRef.current.priceScaleZoom = 1;
        stateRef.current.panOffsetY = 0;
      }
      recalcIndicators();
      scheduleRender();
    };

    const cached = timeframeCacheRef.current.get(timeframe);
    const hasCached = !!cached && cached.candles.length > 0;
    const isReplayActive = replayStateRef.current !== 'off' && replayStateRef.current !== 'selecting';
    const replayTs = replayBarTimestampRef.current;
    const cacheCoversReplayTime = Boolean(
      isReplayActive &&
      replayTs != null &&
      hasCached &&
      replayTs >= cached!.candles[0].time &&
      replayTs <= cached!.candles[cached!.candles.length - 1].time,
    );

    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const reqSeq = ++fetchSeqRef.current;

    const finishWithError = (err: unknown) => {
      if (controller.signal.aborted || reqSeq !== fetchSeqRef.current) return;
      console.error('Failed to fetch Binance data:', err);
      toast.error('Failed to load market data.');
      setLoading(false);
    };

    const loadMissingOlder = (baseCandles: Candle[]) => {
      const remaining = Math.max(0, barLimit - baseCandles.length);
      if (remaining === 0 || baseCandles.length === 0) return;
      const endTimeMs = baseCandles[0].time * 1000 - 1;
      fetchOlderKlines(symbol, TF_BINANCE[timeframe], remaining, endTimeMs, controller.signal)
        .then(older => {
          if (controller.signal.aborted || reqSeq !== fetchSeqRef.current || older.length === 0) return;
          const merged = [...older, ...baseCandles];
          timeframeCacheRef.current.set(timeframe, { candles: merged, cachedAt: Date.now() });
          applyCandles(merged, { preserveView: true });
        })
        .catch(err => {
          if (controller.signal.aborted || reqSeq !== fetchSeqRef.current) return;
          console.warn('Background history hydration failed:', err);
        });
    };

    if (hasCached && (!isReplayActive || replayTs == null || cacheCoversReplayTime)) {
      applyCandles(cached!.candles);
      setLoading(false);
      if ((Date.now() - cached!.cachedAt) > TIMEFRAME_CACHE_TTL_MS || cached!.candles.length < barLimit) {
        loadMissingOlder(cached!.candles);
      }
      return () => controller.abort();
    }

    // If replay is active, use backtest cache (Storage-based) instead of direct Binance
    if (isReplayActive && replayTs != null) {
      setLoading(true);
      const tfConfig = TIMEFRAME_CONFIG[timeframe];
      getBacktestKlines(
        symbol,
        tfConfig.interval,
        replayTs,
        12000,
        3500,
      )
        .then(candles => {
          if (controller.signal.aborted || reqSeq !== fetchSeqRef.current) return;
          const mapped: Candle[] = candles.map(c => ({
            time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
          }));
          if (mapped.length > 0) {
            timeframeCacheRef.current.set(timeframe, { candles: mapped, cachedAt: Date.now() });
            applyCandles(mapped);
          }
          setLoading(false);
        })
        .catch(err => {
          console.warn('Backtest cache failed, falling back to Binance:', err);
          // Fallback to direct Binance fetch
          const firstLoadLimit = Math.min(barLimit, FAST_INITIAL_BARS);
          fetchKlines(symbol, TF_BINANCE[timeframe], firstLoadLimit, controller.signal)
            .then(candles => {
              if (controller.signal.aborted || reqSeq !== fetchSeqRef.current) return;
              timeframeCacheRef.current.set(timeframe, { candles, cachedAt: Date.now() });
              applyCandles(candles);
              setLoading(false);
            })
            .catch(finishWithError);
        });
      return () => controller.abort();
    }

    setLoading(true);
    const firstLoadLimit = Math.min(barLimit, FAST_INITIAL_BARS);
    fetchKlines(symbol, TF_BINANCE[timeframe], firstLoadLimit, controller.signal)
      .then(candles => {
        if (controller.signal.aborted || reqSeq !== fetchSeqRef.current) return;
        timeframeCacheRef.current.set(timeframe, { candles, cachedAt: Date.now() });
        applyCandles(candles);
        setLoading(false);
        loadMissingOlder(candles);
      })
      .catch(finishWithError);

    return () => controller.abort();
  }, [timeframe, symbol, planLimits, recalcIndicators, scheduleRender]);

  // ─── WebSocket (disabled during replay to avoid interference) ───
  useEffect(() => {
    // Don't connect WS during replay mode
    if (replayState !== 'off') return;

    const binanceInterval = TF_BINANCE[timeframe];
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${binanceInterval}`);
    wsRef.current = ws;
    ws.onmessage = event => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.e !== 'kline') return;
        // Skip WS updates during replay
        if (replayStateRef.current !== 'off') return;
        const k = msg.k;
        const candle: Candle = { time: Math.floor(k.t/1000), open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v };
        const data = dataRef.current;
        if (data.length > 0 && data[data.length-1].time === candle.time) {
          data[data.length-1] = candle;
        } else if (data.length === 0 || candle.time > data[data.length-1].time) {
          data.push(candle);
        }
        recalcIndicators();
        scheduleRender();
      } catch {}
    };
    ws.onerror = () => console.warn('WS error');
    return () => { ws.close(); wsRef.current = null; };
  }, [timeframe, symbol, replayState, recalcIndicators, scheduleRender]);

  // ═══ RENDER ═══
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const allData = dataRef.current;
    const isReplay = replayStateRef.current !== 'off' && replayStateRef.current !== 'selecting';
    const rawData = isReplay ? allData.slice(0, Math.min(replayBarIndexRef.current + 1, allData.length)) : allData;
    const ct = chartTypeRef.current;

    // Point & Figure uses its own column-based data
    const pfResult = ct === 'point_figure' ? computePointAndFigure(rawData) : null;

    const data = ct === 'point_figure' ? (pfResult?.columns.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume })) ?? [])
      : ct === 'heikin_ashi' ? toHeikinAshi(rawData)
      : ct === 'renko' ? toRenko(rawData)
      : ct === 'line_break' ? toLineBreak(rawData)
      : ct === 'kagi' ? toKagi(rawData)
      : rawData;
    const st = stateRef.current;
    const cfg = configRef.current;
    const chartW = w - PRICE_W;
    const chartH = h - TIME_H;
    const volumeH = cfg.showVolume ? chartH * VOL_RATIO : 0;
    const priceH = chartH - volumeH;
    const intSec = intervalSecRef.current;

    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, w, h);

    const visibleCount = Math.max(1, Math.floor(chartW / st.candleWidth));
    const maxOff = Math.max(0, data.length - Math.floor(visibleCount * 0.1));
    st.offsetX = Math.max(-visibleCount * 0.7, Math.min(st.offsetX, maxOff));

    const startIdx = Math.max(0, Math.floor(st.offsetX));
    const endIdx = Math.min(data.length, startIdx + visibleCount + 2);
    const visible = data.slice(startIdx, endIdx);

    if (visible.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '13px Inter, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No data in view', chartW / 2, priceH / 2);
      drawPriceAxis(ctx, chartW, chartH, cfg);
      drawTimeAxis(ctx, w, chartW, chartH, cfg);
      return;
    }

    let rawMin = Infinity, rawMax = -Infinity, maxVol = 0;
    for (const c of visible) {
      if (c.low < rawMin) rawMin = c.low;
      if (c.high > rawMax) rawMax = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }

    const rawRange = rawMax - rawMin || 1;
    const midPrice = (rawMax + rawMin) / 2;
    const paddedHalfRange = (rawRange / 2) * 1.1;
    const scaledHalfRange = paddedHalfRange * st.priceScaleZoom;
    const pxPerPrice = priceH / (scaledHalfRange * 2);
    const panPriceOffset = st.panOffsetY / pxPerPrice;
    const minPrice = midPrice - scaledHalfRange + panPriceOffset;
    const maxPrice = midPrice + scaledHalfRange + panPriceOffset;
    const totalRange = maxPrice - minPrice;

    projectionRef.current = { startIdx, candleWidth: st.candleWidth, chartW, priceH, minPrice, maxPrice, dataLength: data.length };

    const priceToY = (p: number) => priceH * (1 - (p - minPrice) / totalRange);
    const yToPrice = (y: number) => minPrice + (1 - y / priceH) * totalRange;
    const xToIdx = (x: number) => Math.max(0, Math.min(data.length - 1, startIdx + Math.floor(x / st.candleWidth)));

    // Build time→x map for drawings (supports extrapolated future/past times)
    const timeMap = new Map<number, number>();
    for (let i = 0; i < data.length; i++) {
      const x = (i - st.offsetX) * st.candleWidth + st.candleWidth / 2;
      timeMap.set(data[i].time, x);
    }
    const iSec = intervalSecRef.current;
    const timeToX = (t: number): number | null => {
      const mapped = timeMap.get(t);
      if (mapped !== undefined) return mapped;
      if (data.length < 2) return null;
      const lastTime = data[data.length - 1].time;
      const firstTime = data[0].time;
      if (t > lastTime) {
        const barsAhead = (t - lastTime) / iSec;
        return ((data.length - 1 + barsAhead) - st.offsetX) * st.candleWidth + st.candleWidth / 2;
      }
      if (t < firstTime) {
        const barsBefore = (firstTime - t) / iSec;
        return (-barsBefore - st.offsetX) * st.candleWidth + st.candleWidth / 2;
      }
      // Interpolate: find surrounding candles via binary search
      let lo = 0, hi = data.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (data[mid].time <= t) lo = mid; else hi = mid;
      }
      const tLo = data[lo].time, tHi = data[hi].time;
      const frac = tHi !== tLo ? (t - tLo) / (tHi - tLo) : 0;
      const idx = lo + frac;
      return (idx - st.offsetX) * st.candleWidth + st.candleWidth / 2;
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartW, chartH);
    ctx.clip();

    // Grid
    const priceStep = calculateNiceStep(totalRange, priceH);
    for (let p = Math.ceil(minPrice / priceStep) * priceStep; p <= maxPrice; p += priceStep) {
      const y = priceToY(p);
      if (y < -10 || y > chartH + 10) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    }

    const minTimeGapPx = 100;
    const tStep = Math.max(1, Math.ceil(minTimeGapPx / st.candleWidth));
    for (let i = 0; i < visible.length; i++) {
      if ((startIdx + i) % tStep !== 0) continue;
      const x = (i - (st.offsetX - startIdx)) * st.candleWidth + st.candleWidth / 2;
      if (x < 0 || x > chartW) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, chartH); ctx.stroke();
    }

    // Volume
    if (cfg.showVolume) {
      for (let i = 0; i < visible.length; i++) {
        const c = visible[i];
        const x = (i - (st.offsetX - startIdx)) * st.candleWidth;
        const barW = Math.max(1, st.candleWidth * 0.7);
        const barH = maxVol > 0 ? (c.volume / maxVol) * volumeH * 0.85 : 0;
        // For P&F, use column direction; for others use close >= open
        let bull: boolean;
        if (ct === 'point_figure' && pfResult) {
          const colIdx = startIdx + i;
          bull = colIdx < pfResult.columns.length ? pfResult.columns[colIdx].dir === 1 : true;
        } else {
          bull = c.close >= c.open;
        }
        ctx.fillStyle = bull ? hexToRgba(cfg.candleUp, 0.25) : hexToRgba(cfg.candleDown, 0.25);
        ctx.fillRect(x + (st.candleWidth - barW) / 2, priceH + (volumeH - barH), barW, barH);
      }
    }

    // ─── Chart type rendering ───
    const cw = st.candleWidth;
    const offDelta = st.offsetX - startIdx;

    if (ct === 'point_figure' && pfResult) {
      // ─── Professional Point & Figure rendering (TradingView-style) ───
      const bs = pfResult.boxSize;
      const lastColIdx = pfResult.columns.length - 1;

      // Draw subtle horizontal grid at every box level
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      const gridStart = Math.floor(minPrice / bs) * bs;
      for (let p = gridStart; p <= maxPrice; p += bs) {
        const gy = priceToY(p);
        if (gy < -5 || gy > priceH + 5) continue;
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(chartW, gy); ctx.stroke();
      }

      // Build a time→colIndex lookup for fast access
      const timeToCol = new Map<number, number>();
      for (let i = 0; i < pfResult.columns.length; i++) {
        timeToCol.set(pfResult.columns[i].time, i);
      }

      // Render each X/O box
      const padding = 0.12;
      for (const box of pfResult.boxes) {
        const colIdx = timeToCol.get(box.time);
        if (colIdx === undefined || colIdx < startIdx || colIdx >= endIdx) continue;

        const bx = (colIdx - st.offsetX) * cw + cw / 2;
        const by = priceToY(box.price);
        const boxTop = priceToY(box.price + bs / 2);
        const boxBot = priceToY(box.price - bs / 2);
        const cellH = Math.abs(boxBot - boxTop);
        const cellW = cw;

        if (bx < -cellW || bx > chartW + cellW || by < -cellH || by > priceH + cellH) continue;

        const padX = cellW * padding;
        const padY = cellH * padding;
        const drawW = cellW - padX * 2;
        const drawH = cellH - padY * 2;

        // Last column = projection (semi-transparent)
        const isProjection = colIdx === lastColIdx;
        const alpha = isProjection ? 0.4 : 1.0;

        const lw = Math.max(1.2, Math.min(Math.min(drawW, drawH) * 0.15, 3));

        if (box.type === 'X') {
          ctx.strokeStyle = isProjection ? hexToRgba(cfg.candleUp, alpha) : cfg.candleUp;
          ctx.lineWidth = lw;
          ctx.lineCap = 'round';
          const x1 = bx - drawW / 2;
          const x2 = bx + drawW / 2;
          const y1 = boxTop + padY;
          const y2 = boxBot - padY;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x2, y1); ctx.lineTo(x1, y2); ctx.stroke();
        } else {
          ctx.strokeStyle = isProjection ? hexToRgba(cfg.candleDown, alpha) : cfg.candleDown;
          ctx.lineWidth = lw;
          ctx.lineCap = 'round';
          const rx = drawW / 2;
          const ry = drawH / 2;
          ctx.beginPath();
          ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else if (ct === 'line' || ct === 'line_markers' || ct === 'step_line') {
      ctx.strokeStyle = cfg.candleUp;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const cx = (i - offDelta) * cw + cw / 2;
        const cy = priceToY(visible[i].close);
        if (ct === 'step_line' && i > 0) {
          const prevCx = (i - 1 - offDelta) * cw + cw / 2;
          ctx.lineTo(cx, priceToY(visible[i - 1].close));
          ctx.lineTo(cx, cy);
        } else {
          i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
        }
      }
      ctx.stroke();
      if (ct === 'line_markers') {
        ctx.fillStyle = cfg.candleUp;
        for (let i = 0; i < visible.length; i++) {
          const cx = (i - offDelta) * cw + cw / 2;
          ctx.beginPath(); ctx.arc(cx, priceToY(visible[i].close), 2.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (ct === 'area') {
      ctx.strokeStyle = cfg.candleUp;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const cx = (i - offDelta) * cw + cw / 2;
        const cy = priceToY(visible[i].close);
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      // Fill area
      const lastX = (visible.length - 1 - offDelta) * cw + cw / 2;
      const firstX = (0 - offDelta) * cw + cw / 2;
      ctx.lineTo(lastX, priceH);
      ctx.lineTo(firstX, priceH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, priceH);
      grad.addColorStop(0, hexToRgba(cfg.candleUp, 0.25));
      grad.addColorStop(1, hexToRgba(cfg.candleUp, 0.02));
      ctx.fillStyle = grad;
      ctx.fill();
    } else if (ct === 'hlc_area') {
      // High-Low area fill
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const cx = (i - offDelta) * cw + cw / 2;
        i === 0 ? ctx.moveTo(cx, priceToY(visible[i].high)) : ctx.lineTo(cx, priceToY(visible[i].high));
      }
      for (let i = visible.length - 1; i >= 0; i--) {
        const cx = (i - offDelta) * cw + cw / 2;
        ctx.lineTo(cx, priceToY(visible[i].low));
      }
      ctx.closePath();
      ctx.fillStyle = hexToRgba(cfg.candleUp, 0.12);
      ctx.fill();
      // Close line
      ctx.strokeStyle = cfg.candleUp;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const cx = (i - offDelta) * cw + cw / 2;
        i === 0 ? ctx.moveTo(cx, priceToY(visible[i].close)) : ctx.lineTo(cx, priceToY(visible[i].close));
      }
      ctx.stroke();
    } else if (ct === 'baseline') {
      const basePrice = visible.length > 0 ? visible[0].close : 0;
      const baseY = priceToY(basePrice);
      // Above baseline
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, chartW, baseY); ctx.clip();
      ctx.strokeStyle = cfg.candleUp; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const cx = (i - offDelta) * cw + cw / 2;
        i === 0 ? ctx.moveTo(cx, priceToY(visible[i].close)) : ctx.lineTo(cx, priceToY(visible[i].close));
      }
      ctx.stroke(); ctx.restore();
      // Below baseline
      ctx.save(); ctx.beginPath(); ctx.rect(0, baseY, chartW, priceH - baseY); ctx.clip();
      ctx.strokeStyle = cfg.candleDown; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const cx = (i - offDelta) * cw + cw / 2;
        i === 0 ? ctx.moveTo(cx, priceToY(visible[i].close)) : ctx.lineTo(cx, priceToY(visible[i].close));
      }
      ctx.stroke(); ctx.restore();
      // Baseline dashed
      ctx.setLineDash([4, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(chartW, baseY); ctx.stroke(); ctx.setLineDash([]);
    } else if (ct === 'columns') {
      for (let i = 0; i < visible.length; i++) {
        const c = visible[i];
        const x = (i - offDelta) * cw;
        const bW = Math.max(1, cw * 0.65);
        const bull = c.close >= c.open;
        const top = priceToY(c.close);
        const bot = priceH;
        ctx.fillStyle = bull ? cfg.candleUp : cfg.candleDown;
        ctx.fillRect(x + (cw - bW) / 2, top, bW, bot - top);
      }
    } else if (ct === 'high_low') {
      for (let i = 0; i < visible.length; i++) {
        const c = visible[i];
        const cx = (i - offDelta) * cw + cw / 2;
        const bull = c.close >= c.open;
        ctx.strokeStyle = bull ? cfg.candleUp : cfg.candleDown;
        ctx.lineWidth = Math.max(1, cw * 0.3);
        ctx.beginPath(); ctx.moveTo(cx, priceToY(c.high)); ctx.lineTo(cx, priceToY(c.low)); ctx.stroke();
      }
    } else {
      // Candles / hollow / bars / volume_candles / heikin_ashi / renko / line_break / kagi
      for (let i = 0; i < visible.length; i++) {
        const c = visible[i];
        const x = (i - offDelta) * cw;
        const cx = x + cw / 2;
        const bull = c.close >= c.open;
        const bTop = priceToY(Math.max(c.open, c.close));
        const bBot = priceToY(Math.min(c.open, c.close));
        const bH = Math.max(1, bBot - bTop);
        const bW = Math.max(1, cw * 0.65);

        if (ct === 'bars') {
          // OHLC bars
          ctx.strokeStyle = bull ? cfg.candleUp : cfg.candleDown;
          ctx.lineWidth = Math.max(0.5, cw * 0.12);
          ctx.beginPath(); ctx.moveTo(cx, priceToY(c.high)); ctx.lineTo(cx, priceToY(c.low)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - bW / 2, priceToY(c.open)); ctx.lineTo(cx, priceToY(c.open)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx, priceToY(c.close)); ctx.lineTo(cx + bW / 2, priceToY(c.close)); ctx.stroke();
        } else if (ct === 'hollow') {
          ctx.strokeStyle = bull ? cfg.wickUp : cfg.wickDown;
          ctx.lineWidth = Math.min(1.5, Math.max(0.5, cw * 0.12));
          ctx.beginPath(); ctx.moveTo(cx, priceToY(c.high)); ctx.lineTo(cx, priceToY(c.low)); ctx.stroke();
          if (bull) {
            ctx.strokeStyle = cfg.candleUp; ctx.lineWidth = 1;
            ctx.strokeRect(cx - bW / 2, bTop, bW, bH);
          } else {
            ctx.fillStyle = cfg.candleDown;
            ctx.fillRect(cx - bW / 2, bTop, bW, bH);
          }
        } else if (ct === 'volume_candles') {
          const maxVis = visible.reduce((m, v) => Math.max(m, v.volume), 0);
          const volRatio = maxVis > 0 ? c.volume / maxVis : 0.5;
          const dynW = Math.max(1, bW * (0.3 + volRatio * 0.7));
          ctx.strokeStyle = bull ? cfg.wickUp : cfg.wickDown;
          ctx.lineWidth = Math.min(1.5, Math.max(0.5, cw * 0.12));
          ctx.beginPath(); ctx.moveTo(cx, priceToY(c.high)); ctx.lineTo(cx, priceToY(c.low)); ctx.stroke();
          ctx.fillStyle = bull ? cfg.candleUp : cfg.candleDown;
          ctx.fillRect(cx - dynW / 2, bTop, dynW, bH);
        } else {
          // Standard candles (also used for heikin_ashi, renko, line_break, kagi since data was already transformed)
          ctx.strokeStyle = bull ? cfg.wickUp : cfg.wickDown;
          ctx.lineWidth = Math.min(1.5, Math.max(0.5, cw * 0.12));
          ctx.beginPath(); ctx.moveTo(cx, priceToY(c.high)); ctx.lineTo(cx, priceToY(c.low)); ctx.stroke();
          ctx.fillStyle = bull ? cfg.candleUp : cfg.candleDown;
          ctx.fillRect(cx - bW / 2, bTop, bW, bH);
          if (cfg.showBorders && cw >= 14) {
            ctx.strokeStyle = bull ? hexToRgba(cfg.candleUp, 0.3) : hexToRgba(cfg.candleDown, 0.3);
            ctx.lineWidth = 0.5;
            ctx.strokeRect(cx - bW / 2, bTop, bW, bH);
          }
        }
      }
    }

    // Indicators
    for (const indResult of indResultsRef.current) {
      for (const line of indResult.lines) {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.setLineDash(line.style === 'dashed' ? [5,3] : line.style === 'dotted' ? [1.5,2] : []);
        ctx.beginPath();
        let started = false;
        for (const pt of line.points) {
          const dataIdx = timeMap.get(pt.time) !== undefined ? (data.findIndex(c => c.time === pt.time)) : -1;
          if (dataIdx < 0) continue;
          const px = (dataIdx - st.offsetX) * st.candleWidth + st.candleWidth / 2;
          if (px < -30 || px > chartW + 30) continue;
          const py = priceToY(pt.value);
          if (py < -200 || py > priceH + 200) continue;
          if (!started) { ctx.moveTo(px, py); started = true; } else { ctx.lineTo(px, py); }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ─── Wyckoff Zone Selection Preview ───
    if (wyckoffModeRef.current === 'selecting' && wyckoffDraftStartRef.current !== null) {
      const draftStart = wyckoffDraftStartRef.current;
      const draftX1 = (draftStart - st.offsetX) * st.candleWidth;
      // If crosshair is active, show preview to cursor position
      const draftX2 = st.crosshair ? st.crosshair.x : draftX1 + st.candleWidth;
      const left = Math.max(0, Math.min(draftX1, draftX2));
      const right = Math.min(chartW, Math.max(draftX1, draftX2));
      ctx.fillStyle = 'rgba(76, 175, 80, 0.08)';
      ctx.fillRect(left, 0, right - left, priceH);
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(left, 0); ctx.lineTo(left, priceH);
      ctx.moveTo(right, 0); ctx.lineTo(right, priceH);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = 'rgba(76, 175, 80, 0.7)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('סמן סוף איזור ←', (left + right) / 2, 30);
    }

    // ─── Wyckoff Zone Highlight (active) ───
    if (wyckoffModeRef.current === 'active' && wyckoffZoneRef.current) {
      const z = wyckoffZoneRef.current;
      const zx1 = (z.startIdx - st.offsetX) * st.candleWidth;
      const zx2 = (z.endIdx - st.offsetX + 1) * st.candleWidth;
      const left = Math.max(0, zx1);
      const right = Math.min(chartW, zx2);
      if (right > 0 && left < chartW) {
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(left, 0, right - left, priceH);
        ctx.setLineDash([]);
      }
    }

    // ─── Wyckoff Overlay ───
    if (wyckoffEnabledRef.current && wyckoffRef.current) {
      const wk = wyckoffRef.current;

      // Phase background shading
      const phaseColors: Record<string, string> = {
        'A': 'rgba(239,83,80,0.04)',
        'B': 'rgba(255,193,7,0.04)',
        'C': 'rgba(76,175,80,0.06)',
        'D': 'rgba(33,150,243,0.05)',
      };
      for (const pr of wk.phaseRanges) {
        const x1 = (pr.startIdx - st.offsetX) * st.candleWidth;
        const x2 = (pr.endIdx - st.offsetX + 1) * st.candleWidth;
        if (x2 < 0 || x1 > chartW) continue;
        ctx.fillStyle = phaseColors[pr.phase] ?? 'rgba(255,255,255,0.02)';
        ctx.fillRect(Math.max(0, x1), 0, Math.min(chartW, x2) - Math.max(0, x1), priceH);
        // Phase label at top
        const mx = Math.max(12, (x1 + x2) / 2);
        if (mx > 0 && mx < chartW) {
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillText(`Phase ${pr.phase}`, mx, 6);
          ctx.font = '9px Inter, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          // Wrap description
          const desc = pr.description;
          if (desc.length > 40) {
            ctx.fillText(desc.substring(0, 40) + '…', mx, 20);
          } else {
            ctx.fillText(desc, mx, 20);
          }
        }
      }

      // Support & Resistance zones (dynamic / sloped)
      for (const zone of wk.zones) {
        const y1 = priceToY(zone.price);
        const y2 = priceToY(zone.priceEnd ?? zone.price);
        const x1 = timeToX(zone.startTime);
        const x2 = timeToX(zone.endTime);
        if (x1 === null || x2 === null) continue;
        if (y1 < -50 && y2 < -50) continue;
        if (y1 > priceH + 50 && y2 > priceH + 50) continue;
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = zone.type === 'support' ? 'rgba(76,175,80,0.5)' : 'rgba(239,83,80,0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, x1), y1);
        ctx.lineTo(Math.min(chartW, x2), y2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Zone label
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = zone.type === 'support' ? 'rgba(76,175,80,0.6)' : 'rgba(239,83,80,0.6)';
        const zx = Math.max(4, x1);
        if (zx < chartW - 40) ctx.fillText(zone.label, zx, y1 - 3);
      }

      // Events: labels on chart
      const eventColors: Record<string, string> = {
        SC: '#ef5350', AR: '#26a69a', ST: '#ff9800', UA: '#e040fb',
        Spring: '#4caf50', Test: '#66bb6a', SOS: '#2196f3', BU: '#42a5f5',
        LPS: '#42a5f5', PS: '#ff9800',
      };
      for (const ev of wk.events) {
        const dataIdx = data.findIndex(c => c.time === ev.time);
        if (dataIdx < 0) continue;
        const px = (dataIdx - st.offsetX) * st.candleWidth + st.candleWidth / 2;
        if (px < -20 || px > chartW + 20) continue;
        const py = priceToY(ev.price);
        if (py < -30 || py > priceH + 30) continue;

        const col = eventColors[ev.type] ?? '#ffffff';
        const isBottom = ['SC', 'ST', 'Spring', 'Test', 'LPS', 'PS', 'BU'].includes(ev.type);
        const labelY = isBottom ? py + 14 : py - 14;

        // Draw marker
        ctx.fillStyle = col;
        ctx.beginPath();
        if (isBottom) {
          // Arrow up
          ctx.moveTo(px, py + 3); ctx.lineTo(px - 4, py + 9); ctx.lineTo(px + 4, py + 9);
        } else {
          // Arrow down
          ctx.moveTo(px, py - 3); ctx.lineTo(px - 4, py - 9); ctx.lineTo(px + 4, py - 9);
        }
        ctx.fill();

        // Label badge
        ctx.font = 'bold 9px Inter, sans-serif';
        const tw = ctx.measureText(ev.label).width + 8;
        const badgeH = 14;
        const bx = px - tw / 2;
        const by = isBottom ? labelY : labelY - badgeH;
        ctx.fillStyle = col + '30'; // semi-transparent bg
        ctx.beginPath();
        ctx.roundRect(bx, by, tw, badgeH, 3);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ev.label, px, by + badgeH / 2);
      }

      // POE signals
      for (const poe of wk.poes) {
        const dataIdx = data.findIndex(c => c.time === poe.time);
        if (dataIdx < 0) continue;
        const px = (dataIdx - st.offsetX) * st.candleWidth + st.candleWidth / 2;
        if (px < -20 || px > chartW + 20) continue;
        const py = priceToY(poe.entryPrice);
        const slY = priceToY(poe.stopLoss);

        const poeColor = poe.type === 'aggressive' ? '#4caf50' : '#2196f3';

        // Entry line
        ctx.setLineDash([3, 2]);
        ctx.strokeStyle = poeColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py); ctx.lineTo(Math.min(px + 60, chartW), py);
        ctx.stroke();
        ctx.setLineDash([]);

        // SL line
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = '#ef535080';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, slY); ctx.lineTo(Math.min(px + 60, chartW), slY);
        ctx.stroke();
        ctx.setLineDash([]);

        // POE label
        ctx.font = 'bold 10px Inter, sans-serif';
        const label = poe.label;
        const tw = ctx.measureText(label).width + 10;
        ctx.fillStyle = poeColor + '30';
        ctx.beginPath();
        ctx.roundRect(px + 4, py - 16, tw, 14, 3);
        ctx.fill();
        ctx.fillStyle = poeColor;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(label, px + 8, py - 9);

        // SL label
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = '#ef5350';
        ctx.fillText('SL', px + 4, slY + 10);
      }

      // Invalidations
      for (const inv of wk.invalidations) {
        const dataIdx = data.findIndex(c => c.time === inv.time);
        if (dataIdx < 0) continue;
        const px = (dataIdx - st.offsetX) * st.candleWidth + st.candleWidth / 2;
        if (px < -20 || px > chartW + 20) continue;
        const py = priceToY(inv.price);

        // Red X mark
        ctx.strokeStyle = '#ef5350';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - 6, py - 6); ctx.lineTo(px + 6, py + 6);
        ctx.moveTo(px + 6, py - 6); ctx.lineTo(px - 6, py + 6);
        ctx.stroke();

        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillStyle = '#ef5350';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('INVALID', px, py + 10);
      }
    }
    for (const drawing of drawingsRef.current) {
      const drawingWithSel = { ...drawing, selected: drawing.id === selectedDrawingId };
      renderDrawing(ctx, drawingWithSel, timeToX, priceToY, chartW, priceH);
    }

    // Draft preview: show in-progress drawing
    const drafts = draftPointsRef.current;
    const tool = drawingToolRef.current;
    if (drafts.length > 0 && tool !== 'none' && st.crosshair) {
      const needed = getPointCount(tool);
      // Build temporary drawing with draft points + cursor position
      const cursorPoint = createPointFromScreen(st.crosshair.x, st.crosshair.y);
      if (cursorPoint) {
        const previewPts = [...drafts, cursorPoint];
        const previewDrawing: WidgetDrawing = {
          id: '__preview__',
          type: tool,
          points: previewPts,
          color: 'rgba(119,139,164,0.8)',
          lineWidth: 1.5,
        };
        ctx.setLineDash([5, 4]);
        renderDrawing(ctx, previewDrawing, timeToX, priceToY, chartW, priceH);
        ctx.setLineDash([]);
      }
    }

    // Last price line
    if (data.length > 0) {
      const last = data[data.length - 1];
      const ly = priceToY(last.close);
      const bull = last.close >= last.open;
      if (ly > -20 && ly < priceH + 20) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = bull ? hexToRgba(cfg.candleUp, 0.4) : hexToRgba(cfg.candleDown, 0.4);
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(chartW, ly); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();

    // Price axis
    drawPriceAxis(ctx, chartW, chartH, cfg);
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const priceStep2 = calculateNiceStep(totalRange, priceH);
    for (let p = Math.ceil(minPrice / priceStep2) * priceStep2; p <= maxPrice; p += priceStep2) {
      const y = priceToY(p);
      if (y < 8 || y > priceH - 8) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(chartW, y); ctx.lineTo(chartW + 4, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(formatPrice(p), w - 6, y);
    }

    // Last price label
    if (data.length > 0) {
      const last = data[data.length - 1];
      const ly = Math.max(12, Math.min(priceH - 12, priceToY(last.close)));
      const bull = last.close >= last.open;
      const labelH = 20;
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = bull ? cfg.candleUp : cfg.candleDown;
      ctx.fillRect(chartW, ly - labelH / 2, PRICE_W, labelH);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(last.close), w - 6, ly);
    }

    // Time axis
    drawTimeAxis(ctx, w, chartW, chartH, cfg);
    const tStep2 = Math.max(1, Math.ceil(100 / st.candleWidth));
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < visible.length; i++) {
      if ((startIdx + i) % tStep2 !== 0) continue;
      const x = (i - (st.offsetX - startIdx)) * st.candleWidth + st.candleWidth / 2;
      if (x < 30 || x > chartW - 30) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(formatTimeLabel(visible[i].time, intSec), x, chartH + 8);
    }

    // Crosshair
    if (st.crosshair && st.crosshair.x < chartW && st.crosshair.y < chartH && st.dragMode === 'none') {
      const { x: mx, y: my } = st.crosshair;
      const chColor = hexToRgba(cfg.crosshairColor, 0.25);

      ctx.strokeStyle = chColor; ctx.lineWidth = 0.6; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, chartH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(chartW, my); ctx.stroke();
      ctx.setLineDash([]);

      const lH = 18;
      ctx.fillStyle = '#0d1a30';
      ctx.fillRect(chartW, my - lH / 2, PRICE_W, lH);
      ctx.strokeStyle = hexToRgba(cfg.crosshairColor, 0.3); ctx.lineWidth = 0.5;
      ctx.strokeRect(chartW, my - lH / 2, PRICE_W, lH);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(yToPrice(my)), w - 6, my);

      const hi = xToIdx(mx);
      hoverIdxRef.current = hi;
      if (data[hi]) {
        const tl = formatDateFull(data[hi].time, intSec);
        ctx.font = '10px Inter, sans-serif';
        const tw = ctx.measureText(tl).width + 14;
        ctx.fillStyle = '#0d1a30';
        ctx.fillRect(mx - tw / 2, chartH, tw, TIME_H);
        ctx.strokeStyle = hexToRgba(cfg.crosshairColor, 0.3); ctx.lineWidth = 0.5;
        ctx.strokeRect(mx - tw / 2, chartH, tw, TIME_H);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(tl, mx, chartH + 8);
      }
    } else {
      hoverIdxRef.current = data.length > 0 ? data.length - 1 : -1;
    }

    // OHLCV info bar — positioned at bottom-left of chart area
    const ohlcCfg = ohlcSettingsRef.current;
    const infoIdx = hoverIdxRef.current >= 0 && hoverIdxRef.current < data.length ? hoverIdxRef.current : data.length - 1;
    if (data[infoIdx]) {
      const c = data[infoIdx];
      const col = c.close >= c.open ? cfg.candleUp : cfg.candleDown;
      const changePct = c.open !== 0 ? ((c.close - c.open) / c.open) * 100 : 0;
      const infoY = priceH - 20;
      let lx = 8;

      if (ohlcCfg.showSymbol) {
        const displayName = getDisplayPair(symbolRef.current);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(displayName, lx, infoY);
        lx += ctx.measureText(displayName).width + 16;
      }

      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const items: { label: string; value: string; color: string; show: boolean }[] = [
        { label: 'O', value: formatPrice(c.open), color: col, show: ohlcCfg.showOpen },
        { label: 'H', value: formatPrice(c.high), color: col, show: ohlcCfg.showHigh },
        { label: 'L', value: formatPrice(c.low), color: col, show: ohlcCfg.showLow },
        { label: 'C', value: formatPrice(c.close), color: col, show: ohlcCfg.showClose },
        { label: '', value: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`, color: col, show: ohlcCfg.showChange },
      ];
      if (ohlcCfg.showVolume) {
        items.push({ label: 'V', value: c.volume >= 1e6 ? `${(c.volume / 1e6).toFixed(2)}M` : c.volume >= 1e3 ? `${(c.volume / 1e3).toFixed(1)}K` : c.volume.toFixed(0), color: 'rgba(255,255,255,0.5)', show: true });
      }
      for (const item of items) {
        if (!item.show) continue;
        if (item.label) {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillText(item.label, lx, infoY); lx += ctx.measureText(item.label).width + 4;
        }
        ctx.fillStyle = item.color;
        ctx.fillText(item.value, lx, infoY); lx += ctx.measureText(item.value).width + 12;
      }

      // Candle countdown timer
      if (ohlcCfg.showCountdown && data.length > 0) {
        const lastCandle = data[data.length - 1];
        const intSec2 = intervalSecRef.current;
        const candleEndTime = lastCandle.time + intSec2;
        const nowSec = Math.floor(Date.now() / 1000);
        const remaining = Math.max(0, candleEndTime - nowSec);
        let countdownStr = '';
        if (remaining >= 3600) {
          const hrs = Math.floor(remaining / 3600);
          const mins = Math.floor((remaining % 3600) / 60);
          const secs = remaining % 60;
          countdownStr = `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        } else if (remaining >= 60) {
          const mins = Math.floor(remaining / 60);
          const secs = remaining % 60;
          countdownStr = `${mins}:${String(secs).padStart(2, '0')}`;
        } else {
          countdownStr = `0:${String(remaining).padStart(2, '0')}`;
        }
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillText('⏱', lx, infoY); lx += ctx.measureText('⏱').width + 4;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(countdownStr, lx, infoY); lx += ctx.measureText(countdownStr).width + 12;
        // Schedule re-render every second for countdown
        if (remaining > 0) {
          setTimeout(() => scheduleRender(), 1000);
        }
      }

      // Gear icon for settings (⚙ at the end)
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText('⚙', lx, infoY);
      // Store gear position for click detection
      (window as any).__ohlcGearBounds = { x: lx - 4, y: infoY - 4, w: ctx.measureText('⚙').width + 8, h: 20 };
    }

    // Indicator labels
    if (indResultsRef.current.length > 0) {
      ctx.font = '10px Inter, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      let iy = 4;
      for (const ind of indicatorsRef.current) {
        if (!ind.visible) continue;
        const def = getIndicator(ind.defId);
        if (!def) continue;
        ctx.fillStyle = ind.color;
        ctx.fillText(`● ${def.shortName}${ind.params.period ? ` ${ind.params.period}` : ''}`, 8, iy);
        iy += 14;
      }
    }

    // ─── Logo watermark (bottom-right of chart area) ───
    const logoImg = logoImgRef.current;
    if (logoImg) {
      const logoH = Math.min(320, priceH * 0.55);
      const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
      const padding = 16;
      const logoX = chartW - logoW - padding;
      const logoY = priceH - logoH - padding - 20;
      logoBoundsRef.current = { x: logoX, y: logoY, w: logoW, h: logoH + 30 };
      ctx.globalAlpha = 0.18;
      ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);

      // Animate text alpha toward target — slow fade out
      const targetAlpha = logoHoverRef.current ? 0.45 : 0;
      const speed = logoHoverRef.current ? 0.06 : 0.015; // fade-in moderate, fade-out very slow
      logoTextAlphaRef.current += (targetAlpha - logoTextAlphaRef.current) * speed;
      if (Math.abs(logoTextAlphaRef.current - targetAlpha) > 0.003) {
        scheduleRender();
      } else {
        logoTextAlphaRef.current = targetAlpha;
      }

      if (logoTextAlphaRef.current > 0.005) {
        const t = logoTextAlphaRef.current / 0.45; // normalized 0→1
        const fontSize = Math.min(24, priceH * 0.045);
        const textY = logoY + logoH - 10 + t * 3; // tight under logo, slides down slightly
        const scale = 0.85 + t * 0.15; // subtle scale-up

        ctx.save();
        const cx = logoX + logoW / 2;
        ctx.translate(cx, textY);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -textY);

        // Glow effect
        ctx.globalAlpha = logoTextAlphaRef.current * 0.5;
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 18 * t;
        ctx.fillStyle = '#00d4ff';
        ctx.fillText('VizionX', cx, textY);

        // Crisp text on top
        ctx.globalAlpha = logoTextAlphaRef.current;
        ctx.shadowBlur = 0;
        ctx.fillText('VizionX', cx, textY);

        ctx.restore();
      }

      ctx.globalAlpha = 1;
    }
  }, [createPointFromScreen, selectedDrawingId]);

  function drawPriceAxis(ctx: CanvasRenderingContext2D, chartW: number, chartH: number, cfg: ChartConfig) {
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(chartW, 0, PRICE_W, chartH);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, chartH); ctx.stroke();
  }

  function drawTimeAxis(ctx: CanvasRenderingContext2D, w: number, chartW: number, chartH: number, cfg: ChartConfig) {
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, chartH, w, TIME_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, chartH); ctx.lineTo(chartW, chartH); ctx.stroke();
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(chartW, chartH, PRICE_W, TIME_H);
  }

  // ─── Interaction handlers ───
  const getDragZone = useCallback((x: number, y: number): DragMode => {
    const container = containerRef.current;
    if (!container) return 'pan';
    const w = container.clientWidth;
    const h = container.clientHeight;
    const chartW = w - PRICE_W;
    const chartH = h - TIME_H;
    if (x >= chartW && y < chartH) return 'price-scale';
    if (y >= chartH && x < chartW) return 'time-scale';
    return 'pan';
  }, []);

  // Shared coord helpers for hit testing
  const getCoordHelpers = useCallback(() => {
    const proj = projectionRef.current;
    const data = dataRef.current;
    const st = stateRef.current;
    const container = containerRef.current;
    if (!proj || data.length === 0 || !container) return null;
    const chartW = container.clientWidth - PRICE_W;
    const priceH = container.clientHeight - TIME_H - (configRef.current.showVolume ? (container.clientHeight - TIME_H) * VOL_RATIO : 0);
    const totalRange = proj.maxPrice - proj.minPrice;
    const priceToY = (p: number) => priceH * (1 - (p - proj.minPrice) / totalRange);
    const timeMap = new Map<number, number>();
    for (let i = 0; i < data.length; i++) {
      timeMap.set(data[i].time, (i - st.offsetX) * st.candleWidth + st.candleWidth / 2);
    }
    const iSec = intervalSecRef.current;
    const timeToX = (t: number): number | null => {
      const mapped = timeMap.get(t);
      if (mapped !== undefined) return mapped;
      if (data.length < 2) return null;
      const lastTime = data[data.length - 1].time;
      const firstTime = data[0].time;
      if (t > lastTime) {
        const barsAhead = (t - lastTime) / iSec;
        return ((data.length - 1 + barsAhead) - st.offsetX) * st.candleWidth + st.candleWidth / 2;
      }
      if (t < firstTime) {
        const barsBefore = (firstTime - t) / iSec;
        return (-barsBefore - st.offsetX) * st.candleWidth + st.candleWidth / 2;
      }
      let lo = 0, hi = data.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (data[mid].time <= t) lo = mid; else hi = mid;
      }
      const tLo = data[lo].time, tHi = data[hi].time;
      const frac = tHi !== tLo ? (t - tLo) / (tHi - tLo) : 0;
      const idx = lo + frac;
      return (idx - st.offsetX) * st.candleWidth + st.candleWidth / 2;
    };
    return { chartW, priceH, totalRange, priceToY, timeToX };
  }, []);

  // Helper: find drawing under cursor
  const findDrawingAtPoint = useCallback((x: number, y: number): WidgetDrawing | null => {
    const h = getCoordHelpers();
    if (!h) return null;
    for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
      const d = drawingsRef.current[i];
      if (hitTestWidgetDrawing(d, x, y, h.timeToX, h.priceToY, h.chartW, h.priceH)) return d;
    }
    return null;
  }, [getCoordHelpers]);

  // Helper: find anchor of a specific drawing under cursor
  const findAnchorAtPoint = useCallback((drawingId: string, x: number, y: number): number => {
    const h = getCoordHelpers();
    if (!h) return -1;
    const d = drawingsRef.current.find(dd => dd.id === drawingId);
    if (!d) return -1;
    return hitTestAnchor(d, x, y, h.timeToX, h.priceToY);
  }, [getCoordHelpers]);

  // Update toolbar position for selected drawing
  const updateToolbarPos = useCallback((drawingId: string | null) => {
    if (!drawingId) { setToolbarPos(null); return; }
    const h = getCoordHelpers();
    if (!h) { setToolbarPos(null); return; }
    const d = drawingsRef.current.find(dd => dd.id === drawingId);
    if (!d || d.points.length === 0) { setToolbarPos(null); return; }
    // Position at first anchor
    const px = h.timeToX(d.points[0].time);
    const py = h.priceToY(d.points[0].price);
    if (px !== null) setToolbarPos({ x: px, y: py });
    else setToolbarPos(null);
  }, [getCoordHelpers]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const st = stateRef.current;
    const container = containerRef.current;
    if (!container) return;
    const chartW = container.clientWidth - PRICE_W;
    const chartH = container.clientHeight - TIME_H;

    // Logo hover detection
    const lb = logoBoundsRef.current;
    const wasHover = logoHoverRef.current;
    logoHoverRef.current = x >= lb.x && x <= lb.x + lb.w && y >= lb.y && y <= lb.y + lb.h;
    if (logoHoverRef.current !== wasHover) scheduleRender();

    // Anchor dragging (including virtual anchors for parallel channel)
    const ad = anchorDragRef.current;
    if (ad) {
      const point = createPointFromScreen(x, y);
      if (point) {
        drawingsRef.current = drawingsRef.current.map(d => {
          if (d.id !== ad.id) return d;
          const newPoints = [...d.points];
          const ai = ad.anchorIndex;

          if (ai < 10) {
            // Real anchor — point[0]=top-left, point[1]=top-right, point[2]=offset reference
            if (ai === 0 || ai === 1) {
              // Moving a top corner: update that point directly
              newPoints[ai] = point;
            } else if (ai === 2) {
              // Point 2 defines the channel width offset
              newPoints[2] = point;
            }
          } else if (d.type === 'parallelchannel' && newPoints.length >= 3) {
            const offPrice = newPoints[2].price - newPoints[0].price;

            if (ai === 10) {
              // Bottom-left corner: move bottom-left freely → changes offset + left angle
              const newOffPrice = point.price - newPoints[0].price;
              newPoints[2] = { time: newPoints[2].time, price: newPoints[0].price + newOffPrice };
              newPoints[0] = { ...newPoints[0], time: point.time };
            } else if (ai === 12) {
              // Bottom-right corner: move bottom-right freely → changes offset + right angle
              const newOffPrice = point.price - newPoints[1].price;
              newPoints[2] = { time: newPoints[2].time, price: newPoints[0].price + newOffPrice };
              newPoints[1] = { ...newPoints[1], time: point.time };
            } else if (ai === 11) {
              // Bottom-mid: scale channel height from bottom (move offset up/down)
              const midPrice = (newPoints[0].price + newPoints[1].price) / 2;
              const currentBottomMid = midPrice + offPrice;
              const priceDelta = point.price - currentBottomMid;
              newPoints[2] = { time: newPoints[2].time, price: newPoints[2].price + priceDelta };
            } else if (ai === 13) {
              // Top-mid: scale channel height from top (move both top points up/down)
              const midPrice = (newPoints[0].price + newPoints[1].price) / 2;
              const priceDelta = point.price - midPrice;
              newPoints[0] = { time: newPoints[0].time, price: newPoints[0].price + priceDelta };
              newPoints[1] = { time: newPoints[1].time, price: newPoints[1].price + priceDelta };
            }
          } else if ((d.type === 'longposition' || d.type === 'shortposition') && ai === 20) {
            return { ...d, points: newPoints, props: { ...d.props, stopPrice: point.price } };
          } else if ((d.type === 'longposition' || d.type === 'shortposition') && ai === 21) {
            newPoints[1] = { ...newPoints[1], price: point.price };
            return { ...d, points: newPoints };
          } else if ((d.type === 'longposition' || d.type === 'shortposition') && ai === 22) {
            // Left edge resize: move point[0].time, keep right edge fixed
            const oldLeft = ad.origPoint.time;
            const oldW = (d.props?.boxWidthPx || 280);
            const h = getCoordHelpers();
            if (h) {
              const oldLeftX = h.timeToX(oldLeft);
              if (oldLeftX !== null) {
                const oldRight = oldLeftX + oldW;
                const newLeftX = x;
                const newW = Math.max(100, oldRight - newLeftX);
                newPoints[0] = { ...newPoints[0], time: point.time };
                return { ...d, points: newPoints, props: { ...d.props, boxWidthPx: newW } };
              }
            }
            return d;
          } else if ((d.type === 'longposition' || d.type === 'shortposition') && ai === 23) {
            // Right edge resize: change boxWidthPx
            const h = getCoordHelpers();
            if (h) {
              const leftX = h.timeToX(d.points[0].time);
              if (leftX !== null) {
                const newW = Math.max(100, x - leftX);
                return { ...d, props: { ...d.props, boxWidthPx: newW } };
              }
            }
            return d;
          }

          return { ...d, points: newPoints };
        });
        st.crosshair = { x, y };
        setCursor('grabbing');
      }
      scheduleRender();
      return;
    }

    // Dragging a selected drawing
    const dd = dragDrawingRef.current;
    if (dd) {
      const proj = projectionRef.current;
      if (proj) {
        const totalRange = proj.maxPrice - proj.minPrice;
        const priceH = chartH - (configRef.current.showVolume ? chartH * VOL_RATIO : 0);
        const dxPx = x - dd.startMx;
        const dyPx = y - dd.startMy;
        const dPrice = -(dyPx / priceH) * totalRange;
        const dIdx = dxPx / st.candleWidth;
        const data = dataRef.current;

        // Use interval-based time delta instead of exact candle matching
        const iSec = intervalSecRef.current || 86400;
        const dTimeSec = Math.round(dIdx) * iSec;

        const newPoints = dd.origPoints.map(p => ({
          time: p.time + dTimeSec,
          price: p.price + dPrice,
        }));

        drawingsRef.current = drawingsRef.current.map(d => {
          if (d.id !== dd.id) return d;
          const updated: any = { ...d, points: newPoints };
          // Move stopPrice for position tools
          if ((d.type === 'longposition' || d.type === 'shortposition') && dd.origProps?.stopPrice != null) {
            updated.props = { ...d.props, stopPrice: dd.origProps.stopPrice + dPrice };
          }
          return updated;
        });
        st.crosshair = { x, y };
        setCursor('grabbing');
      }
      scheduleRender();
      return;
    }

    if (st.dragMode === 'pan') {
      const dx = e.clientX - st.dragStartX;
      const dy = e.clientY - st.dragStartY;
      st.offsetX = st.dragStartOffset - (dx * 0.70) / st.candleWidth;
      st.panOffsetY = st.dragStartPanY + dy * 0.70;
      st.crosshair = null;
    } else if (st.dragMode === 'price-scale') {
      const dy = e.clientY - st.dragStartY;
      st.priceScaleZoom = Math.max(0.1, Math.min(10, st.dragStartPriceZoom * (1 + dy * 0.003)));
      st.crosshair = null;
    } else if (st.dragMode === 'time-scale') {
      const dx = e.clientX - st.dragStartX;
      const factor = 1 - dx * 0.003;
      const newCW = Math.max(MIN_CW, Math.min(MAX_CW, st.dragStartCandleWidth * factor));
      const oldVisible = chartW / st.dragStartCandleWidth;
      const newVisible = chartW / newCW;
      st.candleWidth = newCW;
      st.offsetX = st.dragStartOffset + (oldVisible - newVisible);
      st.crosshair = null;
    } else {
      const zone = getDragZone(x, y);
      const tool = drawingToolRef.current;
      const isCursorTool = tool === 'none' || tool === 'cursor' || tool === 'dot' || tool === 'arrow_cursor';

      // Wyckoff selection mode: always show crosshair
      if (wyckoffModeRef.current === 'selecting' && x < chartW && y < chartH) {
        setCursor('crosshair');
      }
      // Hover cursor for drawings
      else if (isCursorTool && x < chartW && y < chartH) {
        // Check anchor hover first for selected drawing
        if (selectedDrawingId) {
          const anchorIdx = findAnchorAtPoint(selectedDrawingId, x, y);
          if (anchorIdx >= 0) {
            setCursor(anchorIdx === 20 || anchorIdx === 21 ? 'ns-resize' : anchorIdx === 22 || anchorIdx === 23 ? 'ew-resize' : 'grab');
          } else {
            const hit = findDrawingAtPoint(x, y);
            setCursor(hit ? 'pointer' : 'crosshair');
          }
        } else {
          const hit = findDrawingAtPoint(x, y);
          setCursor(hit ? 'pointer' : 'crosshair');
        }
      } else if (tool !== 'none' && tool !== 'cursor' && x < chartW && y < chartH) {
        setCursor('crosshair');
      } else {
        setCursor(zone === 'price-scale' ? 'ns-resize' : zone === 'time-scale' ? 'ew-resize' : 'crosshair');
      }
      st.crosshair = x < chartW && y < chartH ? { x, y } : null;

      // For freehand tools, add points while mouse is down
      if (['brush', 'highlighter', 'arrowdraw', 'path', 'polyline'].includes(tool) && draftPointsRef.current.length > 0 && e.buttons === 1) {
        const point = createPointFromScreen(x, y);
        if (point) {
          draftPointsRef.current.push(point);
        }
      }
    }
    scheduleRender();
  }, [getDragZone, scheduleRender, createPointFromScreen, findDrawingAtPoint, findAnchorAtPoint, selectedDrawingId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const container = containerRef.current;
    if (!container) return;
    const chartW = container.clientWidth - PRICE_W;
    const chartH = container.clientHeight - TIME_H;

    // Check if clicking on the OHLC gear icon
    const gear = (window as any).__ohlcGearBounds;
    if (gear && x >= gear.x && x <= gear.x + gear.w && y >= gear.y && y <= gear.y + gear.h) {
      setOhlcMenuOpen(prev => !prev);
      return;
    }

    // Replay: click to select start point
    if (replayStateRef.current === 'selecting' && x < chartW && y < chartH) {
      const st = stateRef.current;
      const data = dataRef.current;
      const idx = Math.round(st.offsetX + x / st.candleWidth);
      const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));

      // Clamp replay start to plan limits
      const cfg = TIMEFRAME_CONFIG[timeframe];
      const candleTime = data[clampedIdx]?.time ?? 0;
      const clampedTime = clampReplayTimestamp(candleTime, userPlan, cfg.interval);
      // Find the index closest to the clamped time
      let finalIdx = clampedIdx;
      if (clampedTime > candleTime) {
        for (let i = clampedIdx; i < data.length; i++) {
          if (data[i].time >= clampedTime) { finalIdx = i; break; }
        }
        if (finalIdx !== clampedIdx) {
          toast.error('Replay start limited by your plan. Upgrade for deeper history.');
        }
      }

      setReplayStartIndex(finalIdx);
      setReplayBarIndex(finalIdx);
      // Save timestamps for timeframe-change persistence
      replayStartTimestampRef.current = data[finalIdx]?.time ?? null;
      replayBarTimestampRef.current = data[finalIdx]?.time ?? null;
      setReplayState('paused');
      scheduleRender();
      return;
    }

    // Wyckoff: click to select zone (2 clicks = start & end of range)
    if (wyckoffModeRef.current === 'selecting' && x < chartW && y < chartH) {
      const st = stateRef.current;
      const data = dataRef.current;
      const idx = Math.round(st.offsetX + x / st.candleWidth);
      const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));

      if (wyckoffDraftStartRef.current === null) {
        // First click — mark start
        wyckoffDraftStartRef.current = clampedIdx;
        toast.info('סמן את סוף האיזור (קליק שני)');
        scheduleRender();
      } else {
        // Second click — mark end, run analysis
        const s = Math.min(wyckoffDraftStartRef.current, clampedIdx);
        const e = Math.max(wyckoffDraftStartRef.current, clampedIdx);
        if (e - s < 5) {
          toast.error('האיזור קטן מדי, סמן טווח רחב יותר');
          wyckoffDraftStartRef.current = null;
        } else {
          wyckoffZoneRef.current = { startIdx: s, endIdx: e };
          wyckoffRef.current = analyzeWyckoffZone(data, s, e);
          wyckoffDraftStartRef.current = null;
          setWyckoffMode('active');
          toast.success(`ניתוח Wyckoff הופעל על ${e - s} נרות`);
        }
        scheduleRender();
      }
      return;
    }

    const tool = drawingToolRef.current;
    const isCursorTool = tool === 'none' || tool === 'cursor' || tool === 'dot' || tool === 'arrow_cursor';

    // In cursor mode, try to select/drag a drawing
    if (isCursorTool && x < chartW && y < chartH) {
      // Check anchor drag first for selected drawing
      if (selectedDrawingId) {
        const selDrawing = drawingsRef.current.find(d => d.id === selectedDrawingId);
        if (selDrawing && !selDrawing.locked) {
          const anchorIdx = findAnchorAtPoint(selectedDrawingId, x, y);
          if (anchorIdx >= 0) {
            pushUndo();
            anchorDragRef.current = {
              id: selectedDrawingId,
              anchorIndex: anchorIdx,
              startMx: x,
              startMy: y,
              origPoint: anchorIdx < selDrawing.points.length
                ? { ...selDrawing.points[anchorIdx] }
                : { ...selDrawing.points[0] }, // virtual anchor fallback
            };
            setCursor('grabbing');
            scheduleRender();
            return;
          }
        }
      }

      const hit = findDrawingAtPoint(x, y);
      if (hit) {
        setSelectedDrawingId(hit.id);
        updateToolbarPos(hit.id);
        if (!hit.locked) {
          pushUndo();
          dragDrawingRef.current = {
            id: hit.id,
            startMx: x,
            startMy: y,
            origPoints: hit.points.map(p => ({ ...p })),
            origProps: hit.props ? { ...hit.props } : undefined,
          };
          setCursor('grabbing');
        }
        scheduleRender();
        return;
      } else {
        setSelectedDrawingId(null);
        setToolbarPos(null);
        // Fall through to pan
      }
    }

    // Drawing mode
    if (!isCursorTool && x < chartW && y < chartH) {
      const point = createPointFromScreen(x, y);
      if (!point) return;

      const needed = getPointCount(tool);

      // Freehand tools: start collecting
      if (needed === -1) {
        draftPointsRef.current = [point];
        return;
      }

      // Single-point tools: place immediately
      if (needed === 1) {
        commitDrawing({
          id: `${tool}-${Date.now()}`,
          type: tool,
          points: [point],
          color: '#778ba4',
          lineWidth: 1.4,
        });
        setDrawingTool('none');
        return;
      }

      // Multi-point tools: collect points
      draftPointsRef.current.push(point);

      if (draftPointsRef.current.length >= needed) {
        const pts = [...draftPointsRef.current];
        let drawingColor = '#778ba4';
        let drawingProps: Record<string, any> | undefined;
        // Auto-set props for position tools
        if (tool === 'longposition' || tool === 'shortposition') {
          const isLong = tool === 'longposition';
          drawingColor = isLong ? '#26a69a' : '#ef5350';
          const entry = pts[0].price;
          const tp = pts[1].price;
          const tpDist = Math.abs(tp - entry);
          const stopPrice = isLong ? entry - tpDist * 0.5 : entry + tpDist * 0.5;
          drawingProps = { stopPrice, accountSize: 10000, riskPercent: 2, leverage: 1, lotSize: 1, pointValue: 1, boxWidthPx: 280 };
        }
        commitDrawing({
          id: `${tool}-${Date.now()}`,
          type: tool,
          points: pts,
          color: drawingColor,
          lineWidth: 1.5,
          props: drawingProps,
        });
        draftPointsRef.current = [];
        setDrawingTool('none');
        return;
      }

      scheduleRender();
      return;
    }

    // Pan / scale drag
    const st = stateRef.current;
    const zone = getDragZone(x, y);
    st.dragMode = zone;
    st.dragStartX = e.clientX;
    st.dragStartY = e.clientY;
    st.dragStartOffset = st.offsetX;
    st.dragStartCandleWidth = st.candleWidth;
    st.dragStartPriceZoom = st.priceScaleZoom;
    st.dragStartPanY = st.panOffsetY;
    st.crosshair = null;
    if (zone === 'pan') setCursor('grabbing');
  }, [createPointFromScreen, getDragZone, scheduleRender, commitDrawing, findDrawingAtPoint, findAnchorAtPoint, selectedDrawingId, pushUndo, updateToolbarPos]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const tool = drawingToolRef.current;

    // Finalize anchor drag
    if (anchorDragRef.current) {
      persistDrawings(drawingsRef.current);
      anchorDragRef.current = null;
      setCursor('pointer');
      updateToolbarPos(selectedDrawingId);
      scheduleRender();
      return;
    }

    // Finalize dragging a drawing
    if (dragDrawingRef.current) {
      persistDrawings(drawingsRef.current);
      dragDrawingRef.current = null;
      setCursor('pointer');
      updateToolbarPos(selectedDrawingId);
      scheduleRender();
      return;
    }

    // Finalize freehand drawing
    if (['brush', 'highlighter', 'arrowdraw', 'path', 'polyline'].includes(tool) && draftPointsRef.current.length >= 2) {
      commitDrawing({
        id: `${tool}-${Date.now()}`,
        type: tool,
        points: [...draftPointsRef.current],
        color: tool === 'highlighter' ? '#ffeb3b' : '#778ba4',
        lineWidth: tool === 'highlighter' ? 16 : 1.5,
      });
      draftPointsRef.current = [];
      setDrawingTool('none');
    }

    stateRef.current.dragMode = 'none';
    setCursor('crosshair');
  }, [commitDrawing, scheduleRender, selectedDrawingId, updateToolbarPos]);

  const handleMouseLeave = useCallback(() => {
    stateRef.current.dragMode = 'none';
    stateRef.current.crosshair = null;
    setCursor('crosshair');
    scheduleRender();
  }, [scheduleRender]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const container = containerRef.current;
    if (!container) return;
    const chartW = container.clientWidth - PRICE_W;
    const chartH = container.clientHeight - TIME_H;

    // Double-click on a drawing opens settings
    const hitDrawing = findDrawingAtPoint(x, y);
    if (hitDrawing) {
      setSelectedDrawingId(hitDrawing.id);
      setSettingsDrawingId(hitDrawing.id);
      scheduleRender();
      return;
    }

    if (x >= chartW && y < chartH) {
      stateRef.current.priceScaleZoom = 1;
      stateRef.current.panOffsetY = 0;
    } else if (y >= chartH && x < chartW) {
      stateRef.current.candleWidth = DEFAULT_CW;
      const visibleCandles = Math.floor(chartW / DEFAULT_CW);
      stateRef.current.offsetX = Math.max(0, dataRef.current.length - visibleCandles);
    }
    scheduleRender();
  }, [scheduleRender]);

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const st = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const chartW = rect.width - PRICE_W;
      const ratio = mx / chartW;
      const oldW = st.candleWidth;
      const zf = e.deltaY > 0 ? 0.93 : 1.07;
      st.candleWidth = Math.max(MIN_CW, Math.min(MAX_CW, st.candleWidth * zf));
      const oldVis = chartW / oldW;
      const newVis = chartW / st.candleWidth;
      st.offsetX += (oldVis - newVis) * ratio;
      scheduleRender();
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [scheduleRender]);

  const resetView = useCallback(() => {
    const st = stateRef.current;
    st.priceScaleZoom = 1; st.panOffsetY = 0; st.candleWidth = DEFAULT_CW;
    const container = containerRef.current;
    if (container) {
      const chartW = container.clientWidth - PRICE_W;
      st.offsetX = Math.max(0, dataRef.current.length - Math.floor(chartW / DEFAULT_CW));
    }
    scheduleRender();
  }, [scheduleRender]);

  const zoomIn = useCallback(() => {
    stateRef.current.candleWidth = Math.min(MAX_CW, stateRef.current.candleWidth * 1.4);
    scheduleRender();
  }, [scheduleRender]);

  const zoomOut = useCallback(() => {
    stateRef.current.candleWidth = Math.max(MIN_CW, stateRef.current.candleWidth * 0.7);
    scheduleRender();
  }, [scheduleRender]);

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const chartW = container.clientWidth - PRICE_W;
    const data = dataRef.current;
    if (data.length === 0) return;
    stateRef.current.candleWidth = Math.max(MIN_CW, Math.min(MAX_CW, chartW / data.length));
    stateRef.current.offsetX = 0;
    stateRef.current.priceScaleZoom = 1;
    stateRef.current.panOffsetY = 0;
    scheduleRender();
  }, [scheduleRender]);

  const copyLastPrice = useCallback(() => {
    const data = dataRef.current;
    if (data.length > 0) {
      navigator.clipboard.writeText(formatPrice(data[data.length - 1].close));
      toast.success('Price copied');
    }
  }, []);

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    scheduleRender();
    const obs = new ResizeObserver(() => scheduleRender());
    obs.observe(container);
    return () => { obs.disconnect(); cancelAnimationFrame(rafRef.current); };
  }, [scheduleRender]);

  const handleSelectTool = useCallback((tool: NewUIDrawingTool) => {
    draftPointsRef.current = [];
    setDrawingTool(tool);
    scheduleRender();
  }, [scheduleRender]);

  // ─── Replay: timer ───
  useEffect(() => {
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    if (replayState !== 'playing') return;
    const delay = replaySpeed >= 1 ? 1000 / replaySpeed : 1000 / replaySpeed;
    replayTimerRef.current = window.setInterval(() => {
      const total = dataRef.current.length;
      const next = replayBarIndexRef.current + 1;
      if (next >= total) {
        setReplayState('paused');
        return;
      }
      replayBarIndexRef.current = next;
      setReplayBarIndex(next);
      // Save timestamp for timeframe persistence
      replayBarTimestampRef.current = dataRef.current[next]?.time ?? null;
      scheduleRender();
    }, delay);
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [replayState, replaySpeed, scheduleRender]);

  // Replay: step forward
  const replayStepForward = useCallback(() => {
    if (replayState === 'playing') setReplayState('paused');
    const total = dataRef.current.length;
    const next = Math.min(replayBarIndex + 1, total - 1);
    setReplayBarIndex(next);
    replayBarTimestampRef.current = dataRef.current[next]?.time ?? null;
    scheduleRender();
  }, [replayState, replayBarIndex, scheduleRender]);

  // Replay: stop / jump to real-time
  const replayStop = useCallback(() => {
    setReplayState('off');
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    scheduleRender();
  }, [scheduleRender]);

  // Replay: start selecting
  const replayStartSelecting = useCallback(() => {
    setReplayState('selecting');
    setDrawingTool('none');
    draftPointsRef.current = [];
    setSelectedDrawingId(null);
    setToolbarPos(null);
  }, []);

  // ═══ RENDER JSX ═══
  return (
    <div className="w-full h-full flex select-none">
      {/* Left toolbar */}
      <NewUILeftToolbar
        activeTool={drawingTool}
        onSelectTool={handleSelectTool}
        drawingsCount={drawingsCount}
        onDeleteAll={removeAllDrawings}
        onUndo={undoDrawings}
        onRedo={redoDrawings}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Chart area */}
      <div ref={containerRef} className="flex-1 h-full relative">
        <ContextMenu>
           <ContextMenuTrigger asChild>
            <div className="absolute inset-0" onContextMenu={(e) => {
              // Auto-select drawing under right-click
              const rect = canvasRef.current?.getBoundingClientRect();
              if (rect) {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const hit = findDrawingAtPoint(x, y);
                setSelectedDrawingId(hit ? hit.id : null);
              }
            }}>
              <canvas
                ref={canvasRef}
                className="absolute inset-0"
                style={{ cursor }}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onDoubleClick={handleDoubleClick}
              />
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-64 bg-[#0a1628]/95 backdrop-blur-md border-white/[0.08]">
            {/* Selected drawing actions */}
            {selectedDrawingId && (() => {
              const selDrawing = drawingsRef.current.find(d => d.id === selectedDrawingId);
              if (!selDrawing) return null;
              const toolLabel = selDrawing.type.charAt(0).toUpperCase() + selDrawing.type.slice(1).replace(/([A-Z])/g, ' $1');
              const CTX_COLORS = ['#2962ff', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#ffeb3b', '#ffffff', '#778ba4'];
              return (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-white/70 flex items-center gap-2">
                    <Pencil size={12} className="text-white/40" />
                    {toolLabel}
                  </div>
                  {/* Color row */}
                  <div className="px-2 py-1.5 flex items-center gap-1">
                    {CTX_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => updateDrawing(selectedDrawingId, { color: c })}
                        className="w-4 h-4 rounded-sm border border-white/20 hover:scale-125 transition-transform"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  {/* Line width */}
                  <div className="px-2 py-1 flex items-center gap-1 text-[10px]">
                    <span className="text-white/30 mr-1">Width:</span>
                    {[1, 1.5, 2, 3, 4].map(w => (
                      <button
                        key={w}
                        onClick={() => updateDrawing(selectedDrawingId, { lineWidth: w })}
                        className={`w-6 h-6 rounded flex items-center justify-center font-mono transition-colors ${
                          selDrawing.lineWidth === w ? 'bg-white/10 text-cyan-400' : 'text-white/40 hover:bg-white/[0.06]'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => cloneDrawing(selectedDrawingId)} className="gap-2 text-xs">
                    <Copy size={14} className="text-white/40" />
                    Clone
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    updateDrawing(selectedDrawingId, { locked: !selDrawing.locked });
                  }} className="gap-2 text-xs">
                    {selDrawing.locked ? <Lock size={14} className="text-cyan-400" /> : <Unlock size={14} className="text-white/40" />}
                    {selDrawing.locked ? 'Unlock' : 'Lock'}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => removeDrawing(selectedDrawingId)} className="gap-2 text-xs text-red-400">
                    <Trash2 size={14} />
                    Delete drawing
                    <span className="ml-auto text-[10px] text-white/30">Del</span>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                </>
              );
            })()}

            <ContextMenuItem className="gap-2 text-xs" onClick={() => setSettingsOpen(true)}>
              <BarChart3 size={14} className="text-white/40" />
              BTC/USDT settings…
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem onClick={resetView} className="gap-2 text-xs">
              <RotateCcw size={14} className="text-white/40" />
              Reset chart view
            </ContextMenuItem>
            <ContextMenuItem onClick={fitToScreen} className="gap-2 text-xs">
              <Maximize2 size={14} className="text-white/40" />
              Fit to screen
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem onClick={zoomIn} className="gap-2 text-xs">
              <ZoomIn size={14} className="text-white/40" />
              Zoom in
            </ContextMenuItem>
            <ContextMenuItem onClick={zoomOut} className="gap-2 text-xs">
              <ZoomOut size={14} className="text-white/40" />
              Zoom out
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem onClick={removeAllDrawings} disabled={drawingsCount === 0} className="gap-2 text-xs">
              <Trash2 size={14} className="text-white/40" />
              {drawingsCount > 0 ? `Clear ${drawingsCount} drawing${drawingsCount > 1 ? 's' : ''}` : 'No drawings'}
            </ContextMenuItem>

            <ContextMenuItem onClick={removeAllIndicators} disabled={indicators.length === 0} className="gap-2 text-xs">
              <Trash2 size={14} className="text-white/40" />
              {indicators.length > 0 ? `Remove ${indicators.length} indicator${indicators.length > 1 ? 's' : ''}` : 'No indicators'}
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuSub>
              <ContextMenuSubTrigger className="gap-2 text-xs">
                <Clock size={14} className="text-white/40" />
                Timeframe
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="bg-[#0a1628]/95 backdrop-blur-md border-white/[0.08]">
                {(Object.keys(TIMEFRAME_CONFIG) as Timeframe[]).map(tf => (
                  <ContextMenuItem key={tf} onClick={() => setTimeframe(tf)} className={`text-xs ${timeframe === tf ? 'text-cyan-400' : ''}`}>
                    {TIMEFRAME_CONFIG[tf].label} {timeframe === tf ? '✓' : ''}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSeparator />

            <ContextMenuItem onClick={copyLastPrice} className="gap-2 text-xs">
              <Copy size={14} className="text-white/40" />
              Copy last price
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem className="gap-2 text-xs" onClick={() => setSettingsOpen(true)}>
              <Settings size={14} className="text-white/40" />
              Settings…
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Top bar: timeframes + indicators + settings */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 pointer-events-auto">
          {(Object.keys(TIMEFRAME_CONFIG) as Timeframe[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
                timeframe === tf ? 'bg-white/10 text-white/80' : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
              }`}
            >
              {TIMEFRAME_CONFIG[tf].label}
            </button>
          ))}

          <div className="w-px h-4 bg-white/[0.06] mx-1" />

          {/* Chart type selector */}
          <div className="relative">
            <button
              onClick={() => setChartTypeOpen(prev => !prev)}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-colors"
            >
              <BarChart3 size={12} />
              {CHART_TYPE_OPTIONS.find(o => o.value === chartType)?.label ?? 'Candles'}
            </button>
            {chartTypeOpen && (
              <div className="absolute top-full left-0 mt-1 bg-[#0a1628]/95 backdrop-blur-md border border-white/[0.08] rounded-md py-1 min-w-[140px] z-50 max-h-[320px] overflow-y-auto">
                {CHART_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setChartType(opt.value); setChartTypeOpen(false); }}
                    className={`w-full text-left px-3 py-1 text-[11px] font-mono transition-colors ${
                      chartType === opt.value ? 'text-cyan-400 bg-white/[0.05]' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                    }`}
                  >
                    {opt.label} {chartType === opt.value ? '✓' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-white/[0.06] mx-1" />

          <NewUIIndicatorPanel indicators={indicators} onAdd={addIndicator} onRemove={removeIndicator} onToggle={toggleIndicator}>
            <button className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-colors">
              <TrendingUp size={12} />
              Indicators
              {indicators.length > 0 && <span className="ml-0.5 text-[9px] text-cyan-400/80">{indicators.length}</span>}
            </button>
          </NewUIIndicatorPanel>

          <button
            onClick={() => {
              if (wyckoffMode === 'off') {
                setWyckoffMode('selecting');
                toast.info('לחץ על הגרף לסמן תחילת איזור לניתוח Wyckoff');
              } else {
                setWyckoffMode('off');
              }
            }}
            className={`flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
              wyckoffMode === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
              wyckoffMode === 'selecting' ? 'bg-amber-500/15 text-amber-400 animate-pulse' :
              'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
            }`}
            title="Wyckoff Accumulation — לחץ לסמן איזור לניתוח"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 12 L5 8 L8 10 L11 4 L14 6" />
              <circle cx="5" cy="8" r="1.2" fill="currentColor" />
              <circle cx="8" cy="10" r="1.2" fill="currentColor" />
              <circle cx="11" cy="4" r="1.2" fill="currentColor" />
            </svg>
            {wyckoffMode === 'selecting' ? 'סמן איזור…' : 'Wyckoff'}
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-colors"
          >
            <Settings size={12} />
          </button>

          <div className="w-px h-4 bg-white/[0.06] mx-1" />

          <button
            disabled
            className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded text-white/20 cursor-not-allowed"
            title="Bar Replay — coming soon"
          >
            <Rewind size={12} />
            Replay
            <span className="ml-0.5 text-[8px] uppercase tracking-wider font-semibold text-cyan-400/60 bg-cyan-500/10 px-1 py-0.5 rounded">Soon</span>
          </button>
        </div>

        {/* Watchlist toggle button — top-left */}
        <button
          onClick={() => setWatchlistOpen(v => !v)}
          className={`absolute top-1.5 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors pointer-events-auto ${
            watchlistOpen ? 'bg-cyan-500/10 text-cyan-400' : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
          }`}
          title="Watchlist"
        >
          <List size={12} />
        </button>

        {/* Status badges */}
        <div className="absolute top-1.5 right-[94px] flex items-center gap-2 pointer-events-none z-10">
          <span className="text-[11px] font-mono text-white/20 tracking-wider uppercase">{symbol.replace('USDT', '')}/USDT • {TIMEFRAME_CONFIG[timeframe].label}</span>
          {loading && <Loader2 size={12} className="animate-spin text-white/20" />}
        </div>

        {!loading && replayState === 'off' && (
          <div className="absolute top-2.5 right-20 z-10 flex items-center gap-1 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-mono text-emerald-400/60">LIVE</span>
          </div>
        )}

        {/* Replay loading overlay */}
        {loading && replayState !== 'off' && replayState !== 'selecting' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/60 backdrop-blur-[2px] animate-fade-in pointer-events-none">
            <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-3 shadow-lg animate-scale-in">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground font-medium">Loading replay data…</span>
            </div>
          </div>
        )}

        {/* Draft hint */}
        {drawingTool !== 'none' && drawingTool !== 'cursor' && draftPointsRef.current.length > 0 && (
          <div className="absolute bottom-8 left-3 text-[10px] font-mono text-white/50 pointer-events-none z-10">
            {drawingTool}: place point {draftPointsRef.current.length + 1}/{getPointCount(drawingTool) === -1 ? '∞' : getPointCount(drawingTool)} (Esc to cancel)
          </div>
        )}

        {/* Floating drawing toolbar */}
        {selectedDrawingId && toolbarPos && (() => {
          const selDrawing = drawingsRef.current.find(d => d.id === selectedDrawingId);
          if (!selDrawing) return null;
          return (
            <NewUIDrawingToolbar
              drawing={selDrawing}
              position={toolbarPos}
              onUpdate={updateDrawing}
              onClone={cloneDrawing}
              onDelete={(id) => { removeDrawing(id); setToolbarPos(null); }}
            />
          );
        })()}

        {/* Replay mode indicator */}
        {replayState !== 'off' && replayState !== 'selecting' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] px-3 py-1 rounded-full pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono">Replay — Bar {replayBarIndex - replayStartIndex + 1}</span>
          </div>
        )}

        {/* Wyckoff selecting banner */}
        {wyckoffMode === 'selecting' && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] px-4 py-1.5 rounded-full pointer-events-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono">
              {wyckoffDraftStartRef.current !== null ? 'לחץ לסמן סוף האיזור' : 'לחץ לסמן תחילת האיזור'}
            </span>
            <button onClick={() => setWyckoffMode('off')} className="ml-2 text-amber-400/60 hover:text-amber-400 text-[10px] underline">ביטול</button>
          </div>
        )}

        {/* Wyckoff info panel */}
        {wyckoffMode === 'active' && wyckoffRef.current && (
          <div className="absolute bottom-12 right-2 z-20 bg-[#0a1628]/90 backdrop-blur-md border border-white/[0.08] rounded-lg p-2.5 max-w-[300px] pointer-events-auto select-none max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Wyckoff Accumulation</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setWyckoffMode('selecting'); wyckoffDraftStartRef.current = null; toast.info('סמן איזור חדש'); }}
                  className="text-[9px] font-mono text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded hover:bg-white/[0.05]"
                  title="בחר איזור חדש"
                >↻</button>
                <button
                  onClick={() => setWyckoffMode('off')}
                  className="text-[9px] font-mono text-red-400/50 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-500/10"
                  title="סגור"
                >✕</button>
              </div>
            </div>

            {/* Phase progress with strength bars */}
            {wyckoffRef.current.phaseRanges.length > 0 && (
              <div className="mb-2 space-y-1">
                {wyckoffRef.current.phaseRanges.map((pr, i) => (
                  <div key={i} className="bg-white/[0.03] rounded px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-mono font-bold ${
                        pr.phase === 'A' ? 'text-red-400' :
                        pr.phase === 'B' ? 'text-amber-400' :
                        pr.phase === 'C' ? 'text-green-400' :
                        'text-blue-400'
                      }`}>Phase {pr.phase}</span>
                      {pr.strength && (
                        <span className={`text-[8px] font-mono px-1 rounded ${
                          pr.strength.dominant === 'buyers' ? 'bg-green-500/15 text-green-400' :
                          pr.strength.dominant === 'sellers' ? 'bg-red-500/15 text-red-400' :
                          'bg-white/5 text-white/40'
                        }`}>
                          {pr.strength.dominant === 'buyers' ? '🟢 קונים' :
                           pr.strength.dominant === 'sellers' ? '🔴 מוכרים' : '⚪ שוויון'}
                        </span>
                      )}
                    </div>
                    <div className="text-[8px] text-white/30 font-mono mt-0.5">{pr.description}</div>
                    {pr.strength && (
                      <div className="mt-1">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500/60 rounded-full" style={{ width: `${pr.strength.buyers}%` }} />
                          </div>
                          <span className="text-[7px] font-mono text-white/20 w-6 text-right">{pr.strength.buyers}%</span>
                        </div>
                        <div className="text-[7px] text-white/20 font-mono mt-0.5">{pr.strength.detail}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {wyckoffRef.current.events.length === 0 && wyckoffRef.current.phaseRanges.length === 0 && (
              <div className="text-[9px] text-white/30 font-mono py-1">לא נמצאו אירועי Wyckoff באיזור שנבחר. נסה לסמן איזור דשדוש ברור יותר.</div>
            )}

            {/* Events list */}
            {wyckoffRef.current.events.length > 0 && (
              <div className="space-y-0.5 mb-1">
                <div className="text-[8px] text-white/20 font-mono uppercase tracking-wider mb-0.5">אירועים</div>
                {wyckoffRef.current.events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[9px] font-mono">
                    <span className={`px-1 py-0.5 rounded text-[8px] font-bold shrink-0 ${
                      ev.type === 'Spring' ? 'bg-green-500/20 text-green-400' :
                      ev.type === 'SC' ? 'bg-red-500/20 text-red-400' :
                      ev.type === 'SOS' ? 'bg-blue-500/20 text-blue-400' :
                      ev.type === 'AR' ? 'bg-teal-500/20 text-teal-400' :
                      ev.type === 'UA' ? 'bg-purple-500/20 text-purple-400' :
                      ev.type === 'LPS' || ev.type === 'BU' ? 'bg-blue-500/15 text-blue-400' :
                      'bg-white/10 text-white/50'
                    }`}>{ev.label}</span>
                    <span className="text-white/35 leading-tight">{ev.description}</span>
                  </div>
                ))}
              </div>
            )}

            {/* POE signals */}
            {wyckoffRef.current.poes.length > 0 && (
              <div className="pt-1.5 border-t border-white/[0.06]">
                <div className="text-[8px] text-emerald-400/50 font-mono uppercase tracking-wider mb-0.5">נקודות כניסה</div>
                {wyckoffRef.current.poes.map((poe, i) => (
                  <div key={i} className="text-[9px] font-mono text-emerald-400/80 mb-0.5">
                    ▸ {poe.label}: {poe.description}
                  </div>
                ))}
              </div>
            )}

            {/* Invalidations */}
            {wyckoffRef.current.invalidations.length > 0 && (
              <div className="mt-1 pt-1 border-t border-red-500/20">
                {wyckoffRef.current.invalidations.map((inv, i) => (
                  <div key={i} className="text-[9px] font-mono text-red-400/80">
                    ⚠ {inv.description}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <NewUIReplayControls
          replayState={replayState}
          onSetState={setReplayState}
          speed={replaySpeed}
          onSetSpeed={setReplaySpeed}
          barIndex={replayBarIndex}
          startIndex={replayStartIndex}
          totalBars={dataRef.current.length}
          onStepForward={replayStepForward}
          onStop={replayStop}
        />

        <NewUIChartSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} config={config} onChange={setConfig} />

        {/* Drawing Settings Dialog */}
        <DrawingSettingsDialog
          open={!!settingsDrawingId}
          drawing={settingsDrawingId ? (() => {
            const wd = drawingsRef.current.find(d => d.id === settingsDrawingId);
            if (!wd) return null;
            return {
              ...wd,
              type: wd.type as Drawing['type'],
              selected: wd.selected ?? false,
              visible: wd.visible ?? true,
              locked: wd.locked ?? false,
            } as Drawing;
          })() : null}
          onClose={() => setSettingsDrawingId(null)}
          onUpdate={(updates) => {
            if (settingsDrawingId) {
              updateDrawing(settingsDrawingId, updates);
            }
          }}
        />

        {/* Watchlist panel */}
        <NewUIWatchlist
          open={watchlistOpen}
          onClose={() => setWatchlistOpen(false)}
          activeSymbol={symbol}
          onSelectSymbol={(sym) => {
            setSymbol(sym);
            timeframeCacheRef.current.clear();
            setWatchlistOpen(false);
          }}
        />

        {/* OHLC Bar Settings Menu */}
        {ohlcMenuOpen && (
          <div
            className="absolute bottom-12 left-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-xl p-3 z-[200] min-w-[180px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2 uppercase tracking-wider">Info Bar Settings</div>
            {([
              { key: 'showSymbol', label: 'Symbol' },
              { key: 'showOpen', label: 'Open (O)' },
              { key: 'showHigh', label: 'High (H)' },
              { key: 'showLow', label: 'Low (L)' },
              { key: 'showClose', label: 'Close (C)' },
              { key: 'showChange', label: 'Change %' },
              { key: 'showVolume', label: 'Volume (V)' },
              { key: 'showCountdown', label: 'Candle Countdown' },
            ] as { key: keyof OhlcBarSettings; label: string }[]).map(item => (
              <label key={item.key} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-[hsl(var(--accent))] px-1 rounded text-sm text-[hsl(var(--foreground))]">
                <input
                  type="checkbox"
                  checked={ohlcSettings[item.key]}
                  onChange={() => setOhlcSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className="accent-[hsl(var(--primary))] w-3.5 h-3.5"
                />
                {item.label}
              </label>
            ))}
            <button
              onClick={() => setOhlcMenuOpen(false)}
              className="mt-2 w-full text-xs text-center py-1 rounded bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:opacity-80"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
