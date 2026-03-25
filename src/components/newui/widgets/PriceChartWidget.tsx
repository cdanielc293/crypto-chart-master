// Custom Chart Engine — Canvas-based candlestick chart with real Binance data,
// configurable settings, indicator overlays, and full drawing tools via left toolbar.
// Fully isolated from Classic view.

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { getPlanLimits, clampReplayTimestamp } from '@/lib/planLimits';
import type { Interval } from '@/types/chart';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { getIndicator } from '@/lib/indicators/registry';
import type { Point } from '@/types/indicators';
import NewUIChartSettings, { type ChartConfig, DEFAULT_CHART_CONFIG } from './NewUIChartSettings';
import NewUIIndicatorPanel, { type ActiveIndicator } from './NewUIIndicatorPanel';
import NewUILeftToolbar, { type NewUIDrawingTool } from './NewUILeftToolbar';
import NewUIDrawingToolbar from './NewUIDrawingToolbar';
import NewUIReplayControls, { type NewUIReplayState } from './NewUIReplayControls';

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
async function fetchBTCKlines(interval: string, totalLimit: number, signal?: AbortSignal): Promise<Candle[]> {
  const BINANCE_MAX = 1000;
  let allCandles: Candle[] = [];
  let endTime: number | undefined = undefined;
  let remaining = totalLimit;

  while (remaining > 0) {
    if (signal?.aborted) break;
    const batchSize = Math.min(remaining, BINANCE_MAX);
    let url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${batchSize}`;
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

async function fetchOlderBTCKlines(interval: string, totalLimit: number, endTimeMs: number, signal?: AbortSignal): Promise<Candle[]> {
  const BINANCE_MAX = 1000;
  let allCandles: Candle[] = [];
  let endTime: number | undefined = endTimeMs;
  let remaining = totalLimit;

  while (remaining > 0) {
    if (signal?.aborted) break;
    const batchSize = Math.min(remaining, BINANCE_MAX);
    let url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${batchSize}`;
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

// ─── Formatting ───
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

  // Rectangle types
  if (['rectangle', 'rotatedrectangle', 'pricerange', 'daterange', 'datepricerange',
    'longposition', 'shortposition', 'gannbox', 'fixedrangevolume'].includes(type) && pts.length >= 2) {
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

  if (['rectangle', 'rotatedrectangle', 'pricerange', 'daterange', 'datepricerange',
    'longposition', 'shortposition', 'gannbox', 'fixedrangevolume'].includes(type)) {
    const x1 = Math.min(pts[0].x, pts[1].x), y1 = Math.min(pts[0].y, pts[1].y);
    const w = Math.abs(pts[1].x - pts[0].x), h = Math.abs(pts[1].y - pts[0].y);
    ctx.fillStyle = hexToRgba(d.color, 0.08);
    ctx.fillRect(x1, y1, w, h);
    ctx.strokeRect(x1, y1, w, h);
    if (type === 'longposition' || type === 'shortposition') {
      const isLong = type === 'longposition';
      ctx.fillStyle = isLong ? hexToRgba('#26a69a', 0.15) : hexToRgba('#ef5350', 0.15);
      ctx.fillRect(x1, y1, w, h);
      ctx.strokeStyle = isLong ? '#26a69a' : '#ef5350';
      ctx.strokeRect(x1, y1, w, h);
    }
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

  const [timeframe, setTimeframe] = useState<Timeframe>('4h');
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawingTool, setDrawingTool] = useState<NewUIDrawingTool>('none');

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

  const initialDrawingsRef = useRef<WidgetDrawing[]>(loadDrawings());
  const drawingsRef = useRef<WidgetDrawing[]>(initialDrawingsRef.current);
  const draftPointsRef = useRef<DrawingPoint[]>([]);
  const [drawingsCount, setDrawingsCount] = useState(initialDrawingsRef.current.length);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const dragDrawingRef = useRef<{ id: string; startMx: number; startMy: number; origPoints: DrawingPoint[] } | null>(null);
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
        const findClosest = (ts: number) => {
          let bestIdx = 0;
          let bestDiff = Infinity;
          for (let i = 0; i < candles.length; i++) {
            const diff = Math.abs(candles[i].time - ts);
            if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
          }
          return bestIdx;
        };
        const newBarIdx = findClosest(barTs);
        const newStartIdx = findClosest(startTs);
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
      fetchOlderBTCKlines(TF_BINANCE[timeframe], remaining, endTimeMs, controller.signal)
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

    if (hasCached) {
      applyCandles(cached!.candles);
      setLoading(false);
      if ((Date.now() - cached!.cachedAt) > TIMEFRAME_CACHE_TTL_MS || cached!.candles.length < barLimit) {
        loadMissingOlder(cached!.candles);
      }
      return () => controller.abort();
    }

    setLoading(true);
    const firstLoadLimit = Math.min(barLimit, FAST_INITIAL_BARS);
    fetchBTCKlines(TF_BINANCE[timeframe], firstLoadLimit, controller.signal)
      .then(candles => {
        if (controller.signal.aborted || reqSeq !== fetchSeqRef.current) return;
        timeframeCacheRef.current.set(timeframe, { candles, cachedAt: Date.now() });
        applyCandles(candles);
        setLoading(false);
        loadMissingOlder(candles);
      })
      .catch(finishWithError);

    return () => controller.abort();
  }, [timeframe, planLimits, recalcIndicators, scheduleRender]);

  // ─── WebSocket ───
  useEffect(() => {
    const binanceInterval = TF_BINANCE[timeframe];
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${binanceInterval}`);
    wsRef.current = ws;
    ws.onmessage = event => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.e !== 'kline') return;
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
  }, [timeframe, recalcIndicators, scheduleRender]);

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
    const data = isReplay ? allData.slice(0, Math.min(replayBarIndexRef.current + 1, allData.length)) : allData;
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
        const bull = c.close >= c.open;
        ctx.fillStyle = bull ? hexToRgba(cfg.candleUp, 0.15) : hexToRgba(cfg.candleDown, 0.15);
        ctx.fillRect(x + (st.candleWidth - barW) / 2, priceH + (volumeH - barH), barW, barH);
      }
    }

    // Candles
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = (i - (st.offsetX - startIdx)) * st.candleWidth;
      const cx = x + st.candleWidth / 2;
      const bull = c.close >= c.open;
      const bTop = priceToY(Math.max(c.open, c.close));
      const bBot = priceToY(Math.min(c.open, c.close));
      const bH = Math.max(1, bBot - bTop);
      const bW = Math.max(1, st.candleWidth * 0.65);

      ctx.strokeStyle = bull ? cfg.wickUp : cfg.wickDown;
      ctx.lineWidth = Math.min(1.5, Math.max(0.5, st.candleWidth * 0.12));
      ctx.beginPath(); ctx.moveTo(cx, priceToY(c.high)); ctx.lineTo(cx, priceToY(c.low)); ctx.stroke();

      ctx.fillStyle = bull ? cfg.candleUp : cfg.candleDown;
      ctx.fillRect(cx - bW / 2, bTop, bW, bH);

      if (cfg.showBorders && st.candleWidth >= 14) {
        ctx.strokeStyle = bull ? hexToRgba(cfg.candleUp, 0.3) : hexToRgba(cfg.candleDown, 0.3);
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - bW / 2, bTop, bW, bH);
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

    // ─── Drawings ───
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

    // OHLCV info bar
    const infoIdx = hoverIdxRef.current >= 0 && hoverIdxRef.current < data.length ? hoverIdxRef.current : data.length - 1;
    if (data[infoIdx]) {
      const c = data[infoIdx];
      const col = c.close >= c.open ? cfg.candleUp : cfg.candleDown;
      const changePct = c.open !== 0 ? ((c.close - c.open) / c.open) * 100 : 0;
      const infoY = 4;
      let lx = 8;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('BTC / TetherUS', lx, infoY);
      lx += ctx.measureText('BTC / TetherUS').width + 16;

      ctx.font = '12px Inter, sans-serif';
      const items = [
        { label: 'O', value: formatPrice(c.open), color: col },
        { label: 'H', value: formatPrice(c.high), color: col },
        { label: 'L', value: formatPrice(c.low), color: col },
        { label: 'C', value: formatPrice(c.close), color: col },
        { label: '', value: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`, color: col },
      ];
      for (const item of items) {
        if (item.label) {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillText(item.label, lx, infoY); lx += ctx.measureText(item.label).width + 4;
        }
        ctx.fillStyle = item.color;
        ctx.fillText(item.value, lx, infoY); lx += ctx.measureText(item.value).width + 12;
      }
    }

    // Indicator labels
    if (indResultsRef.current.length > 0) {
      ctx.font = '10px Inter, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      let iy = 22;
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

        drawingsRef.current = drawingsRef.current.map(d =>
          d.id === dd.id ? { ...d, points: newPoints } : d
        );
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

      // Hover cursor for drawings
      if (isCursorTool && x < chartW && y < chartH) {
        // Check anchor hover first for selected drawing
        if (selectedDrawingId) {
          const anchorIdx = findAnchorAtPoint(selectedDrawingId, x, y);
          if (anchorIdx >= 0) {
            setCursor('grab');
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
        commitDrawing({
          id: `${tool}-${Date.now()}`,
          type: tool,
          points: [...draftPointsRef.current],
          color: '#778ba4',
          lineWidth: 1.5,
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

          <NewUIIndicatorPanel indicators={indicators} onAdd={addIndicator} onRemove={removeIndicator} onToggle={toggleIndicator}>
            <button className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-colors">
              <TrendingUp size={12} />
              Indicators
              {indicators.length > 0 && <span className="ml-0.5 text-[9px] text-cyan-400/80">{indicators.length}</span>}
            </button>
          </NewUIIndicatorPanel>

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-colors"
          >
            <Settings size={12} />
          </button>

          <div className="w-px h-4 bg-white/[0.06] mx-1" />

          <button
            onClick={replayState === 'off' ? replayStartSelecting : replayStop}
            className={`flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
              replayState !== 'off' ? 'bg-cyan-500/10 text-cyan-400' : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
            }`}
          >
            <Rewind size={12} />
            Replay
          </button>
        </div>

        {/* Status badges */}
        <div className="absolute top-1.5 right-[94px] flex items-center gap-2 pointer-events-none z-10">
          <span className="text-[11px] font-mono text-white/20 tracking-wider uppercase">BTC/USDT • {TIMEFRAME_CONFIG[timeframe].label}</span>
          {loading && <Loader2 size={12} className="animate-spin text-white/20" />}
        </div>

        {!loading && (
          <div className="absolute top-2.5 right-20 z-10 flex items-center gap-1 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-mono text-emerald-400/60">LIVE</span>
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

        {/* Replay controls */}
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
      </div>
    </div>
  );
}
