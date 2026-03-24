// Custom Chart Engine — Canvas-based candlestick chart with real Binance data,
// configurable settings, indicator overlays, and lightweight drawing tools.
// Fully isolated from Classic view.

import { useEffect, useRef, useCallback, useState } from 'react';
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
  Pencil,
  TrendingUp,
  Loader2,
  MousePointer2,
  Minus,
  Slash,
} from 'lucide-react';
import { toast } from 'sonner';
import { getIndicator } from '@/lib/indicators/registry';
import type { Point } from '@/types/indicators';
import NewUIChartSettings, { type ChartConfig, DEFAULT_CHART_CONFIG } from './NewUIChartSettings';
import NewUIIndicatorPanel, { type ActiveIndicator } from './NewUIIndicatorPanel';

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
type DrawingTool = 'none' | 'trendline' | 'hline';

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
  type: 'trendline' | 'hline';
  points: DrawingPoint[];
  color: string;
  lineWidth: number;
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

// ─── Binance config ───
const TF_BINANCE: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1D': '1d',
  '1W': '1w',
};

const TIMEFRAME_CONFIG: Record<Timeframe, { label: string; intervalSec: number; count: number }> = {
  '1m': { label: '1m', intervalSec: 60, count: 500 },
  '5m': { label: '5m', intervalSec: 300, count: 500 },
  '15m': { label: '15m', intervalSec: 900, count: 500 },
  '1h': { label: '1H', intervalSec: 3600, count: 500 },
  '4h': { label: '4H', intervalSec: 14400, count: 500 },
  '1D': { label: '1D', intervalSec: 86400, count: 365 },
  '1W': { label: '1W', intervalSec: 604800, count: 200 },
};

// ─── Constants ───
const PRICE_W = 90;
const TIME_H = 28;
const INFO_BAR_H = 22;
const VOL_RATIO = 0.12;
const MIN_CW = 1;
const MAX_CW = 50;
const DEFAULT_CW = 8;
const DRAWINGS_STORAGE_KEY = 'newui-chart-drawings-v1';

// ─── Data fetch ───
async function fetchBTCKlines(interval: string, limit: number): Promise<Candle[]> {
  const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`);
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  const data = await res.json();
  return data.map((k: any[]) => ({
    time: Math.floor(k[0] / 1000),
    open: +k[1],
    high: +k[2],
    low: +k[3],
    close: +k[4],
    volume: +k[5],
  }));
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
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (intervalSec >= 604800) return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  if (intervalSec >= 86400) return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
  if (intervalSec >= 3600) return `${months[d.getUTCMonth()]} ${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:00`;
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function formatDateFull(ts: number, intervalSec: number): string {
  const d = new Date(ts * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (intervalSec >= 86400) return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function calculateNiceStep(range: number, availablePx: number, minGapPx = 70): number {
  const maxTicks = Math.max(2, Math.floor(availablePx / minGapPx));
  const rough = range / maxTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const r = rough / mag;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * mag;
}

function isBrightHexColor(hex: string): boolean {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return false;
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.35;
}

// ─── localStorage helpers ───
function loadConfig(): ChartConfig {
  try {
    const raw = localStorage.getItem('newui-chart-config');
    const parsed = raw ? JSON.parse(raw) : {};
    const merged: ChartConfig = { ...DEFAULT_CHART_CONFIG, ...parsed };

    // Keep New UI usable/professional by default (matching Classic behavior)
    if (isBrightHexColor(merged.bg)) merged.bg = DEFAULT_CHART_CONFIG.bg;
    merged.showGlow = false;
    merged.showGrid = true;

    return merged;
  } catch {
    return DEFAULT_CHART_CONFIG;
  }
}

function loadIndicators(): ActiveIndicator[] {
  try {
    const s = localStorage.getItem('newui-active-indicators');
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function loadDrawings(): WidgetDrawing[] {
  try {
    const raw = localStorage.getItem(DRAWINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((d) =>
      d &&
      (d.type === 'trendline' || d.type === 'hline') &&
      Array.isArray(d.points) &&
      typeof d.color === 'string' &&
      typeof d.lineWidth === 'number'
    );
  } catch {
    return [];
  }
}

function persistDrawings(drawings: WidgetDrawing[]) {
  localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(drawings));
}

export default function PriceChartWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('4h');
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('none');

  const [config, setConfig] = useState<ChartConfig>(loadConfig);
  const [indicators, setIndicators] = useState<ActiveIndicator[]>(loadIndicators);

  const initialDrawingsRef = useRef<WidgetDrawing[]>(loadDrawings());
  const drawingsRef = useRef<WidgetDrawing[]>(initialDrawingsRef.current);
  const draftDrawingRef = useRef<DrawingPoint | null>(null);
  const [drawingsCount, setDrawingsCount] = useState(initialDrawingsRef.current.length);

  const dataRef = useRef<Candle[]>([]);
  const stateRef = useRef<ChartState>({
    offsetX: 0,
    candleWidth: DEFAULT_CW,
    crosshair: null,
    dragMode: 'none',
    dragStartX: 0,
    dragStartY: 0,
    dragStartOffset: 0,
    dragStartCandleWidth: DEFAULT_CW,
    priceScaleZoom: 1,
    dragStartPriceZoom: 1,
    panOffsetY: 0,
    dragStartPanY: 0,
  });

  const projectionRef = useRef<Projection | null>(null);
  const hoverIdxRef = useRef<number>(-1);

  const configRef = useRef(config);
  const indicatorsRef = useRef(indicators);
  const indResultsRef = useRef<{ id: string; lines: { key: string; points: Point[]; color: string; width: number; style: string }[] }[]>([]);

  const rafRef = useRef(0);
  const intervalSecRef = useRef(14400);
  const wsRef = useRef<WebSocket | null>(null);
  const [cursor, setCursor] = useState('crosshair');

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, []);

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
    if (data.length === 0) {
      indResultsRef.current = [];
      return;
    }

    const ohlcv = data.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }));
    const results: typeof indResultsRef.current = [];

    for (const ind of inds) {
      if (!ind.visible) continue;
      const def = getIndicator(ind.defId);
      if (!def || !def.overlay) continue;

      try {
        const calcResult = def.calculate(ohlcv, ind.params);
        const lines = Object.entries(calcResult).map(([key, points]) => {
          const lineDef = def.lines.find((l) => l.key === key);
          return {
            key,
            points: points as Point[],
            color: lineDef?.color ?? ind.color,
            width: lineDef?.width ?? 1.5,
            style: lineDef?.style ?? 'solid',
          };
        });
        results.push({ id: ind.id, lines });
      } catch (e) {
        console.warn(`Indicator ${ind.defId} calculation error:`, e);
      }
    }

    indResultsRef.current = results;
    scheduleRender();
  }, [scheduleRender]);

  const addIndicator = useCallback((defId: string) => {
    const def = getIndicator(defId);
    if (!def) return;
    const id = `${defId}-${Date.now()}`;
    const color = def.lines[0]?.color ?? '#ffffff';
    const params: Record<string, any> = {};
    for (const p of def.params) params[p.key] = p.default;
    setIndicators((prev) => [...prev, { id, defId, params, color, visible: true }]);
  }, []);

  const removeIndicator = useCallback((id: string) => {
    setIndicators((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggleIndicator = useCallback((id: string) => {
    setIndicators((prev) => prev.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i)));
  }, []);

  const removeAllIndicators = useCallback(() => setIndicators([]), []);

  const upsertDrawing = useCallback((drawing: WidgetDrawing) => {
    drawingsRef.current = [...drawingsRef.current, drawing];
    persistDrawings(drawingsRef.current);
    setDrawingsCount(drawingsRef.current.length);
    scheduleRender();
  }, [scheduleRender]);

  const removeAllDrawings = useCallback(() => {
    drawingsRef.current = [];
    draftDrawingRef.current = null;
    persistDrawings(drawingsRef.current);
    setDrawingsCount(0);
    scheduleRender();
  }, [scheduleRender]);

  const createPointFromScreen = useCallback((x: number, y: number): DrawingPoint | null => {
    const projection = projectionRef.current;
    const data = dataRef.current;
    if (!projection || data.length === 0) return null;
    if (x < 0 || y < 0 || x > projection.chartW || y > projection.priceH) return null;

    const idx = Math.round(projection.startIdx + x / projection.candleWidth);
    const clampedIdx = Math.max(0, Math.min(projection.dataLength - 1, idx));
    const candle = data[clampedIdx];
    if (!candle) return null;

    const price = projection.minPrice + (1 - y / projection.priceH) * (projection.maxPrice - projection.minPrice);
    return { time: candle.time, price };
  }, []);

  const applyClassicPreset = useCallback(() => {
    setConfig({ ...DEFAULT_CHART_CONFIG, showGlow: false, showGrid: true });
    toast.success('Classic style applied');
  }, []);

  useEffect(() => {
    const cfg = TIMEFRAME_CONFIG[timeframe];
    intervalSecRef.current = cfg.intervalSec;
    setLoading(true);

    fetchBTCKlines(TF_BINANCE[timeframe], cfg.count)
      .then((candles) => {
        dataRef.current = candles;
        const container = containerRef.current;
        if (container) {
          const chartW = container.clientWidth - PRICE_W;
          const visibleCandles = Math.floor(chartW / stateRef.current.candleWidth);
          stateRef.current.offsetX = Math.max(0, candles.length - visibleCandles);
          stateRef.current.priceScaleZoom = 1;
          stateRef.current.panOffsetY = 0;
        }
        recalcIndicators();
        setLoading(false);
        scheduleRender();
      })
      .catch((err) => {
        console.error('Failed to fetch Binance data:', err);
        toast.error('Failed to load market data.');
        setLoading(false);
      });
  }, [timeframe, recalcIndicators, scheduleRender]);

  useEffect(() => {
    const binanceInterval = TF_BINANCE[timeframe];
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${binanceInterval}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.e !== 'kline') return;
        const k = msg.k;
        const candle: Candle = {
          time: Math.floor(k.t / 1000),
          open: +k.o,
          high: +k.h,
          low: +k.l,
          close: +k.c,
          volume: +k.v,
        };

        const data = dataRef.current;
        if (data.length > 0 && data[data.length - 1].time === candle.time) {
          data[data.length - 1] = candle;
        } else if (data.length === 0 || candle.time > data[data.length - 1].time) {
          data.push(candle);
        }
        recalcIndicators();
        scheduleRender();
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => console.warn('WebSocket error');

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [timeframe, recalcIndicators, scheduleRender]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (draftDrawingRef.current) {
        draftDrawingRef.current = null;
        scheduleRender();
      }
      setDrawingTool('none');
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [scheduleRender]);

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

    const data = dataRef.current;
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

    let rawMin = Infinity;
    let rawMax = -Infinity;
    let maxVol = 0;
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

    projectionRef.current = {
      startIdx,
      candleWidth: st.candleWidth,
      chartW,
      priceH,
      minPrice,
      maxPrice,
      dataLength: data.length,
    };

    const priceToY = (p: number) => priceH * (1 - (p - minPrice) / totalRange);
    const yToPrice = (y: number) => minPrice + (1 - y / priceH) * totalRange;
    const xToIdx = (x: number) => Math.max(0, Math.min(data.length - 1, startIdx + Math.floor(x / st.candleWidth)));

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartW, chartH);
    ctx.clip();

    // Grid (always enabled for trading clarity)
    const priceStep = calculateNiceStep(totalRange, priceH);
    for (let p = Math.ceil(minPrice / priceStep) * priceStep; p <= maxPrice; p += priceStep) {
      const y = priceToY(p);
      if (y < -10 || y > chartH + 10) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();
    }

    const minTimeGapPx = 100;
    const tStep = Math.max(1, Math.ceil(minTimeGapPx / st.candleWidth));
    for (let i = 0; i < visible.length; i++) {
      if ((startIdx + i) % tStep !== 0) continue;
      const x = (i - (st.offsetX - startIdx)) * st.candleWidth + st.candleWidth / 2;
      if (x < 0 || x > chartW) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartH);
      ctx.stroke();
    }

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
      ctx.beginPath();
      ctx.moveTo(cx, priceToY(c.high));
      ctx.lineTo(cx, priceToY(c.low));
      ctx.stroke();

      if (cfg.showGlow && st.candleWidth >= 8) {
        ctx.shadowColor = bull ? hexToRgba(cfg.candleUp, 0.18) : hexToRgba(cfg.candleDown, 0.18);
        ctx.shadowBlur = 4;
      }
      ctx.fillStyle = bull ? cfg.candleUp : cfg.candleDown;
      ctx.fillRect(cx - bW / 2, bTop, bW, bH);
      ctx.shadowBlur = 0;

      if (cfg.showBorders && st.candleWidth >= 14) {
        ctx.strokeStyle = bull ? hexToRgba(cfg.candleUp, 0.3) : hexToRgba(cfg.candleDown, 0.3);
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - bW / 2, bTop, bW, bH);
      }
    }

    const timeMap = new Map<number, number>();
    for (let i = 0; i < data.length; i++) timeMap.set(data[i].time, i);

    for (const indResult of indResultsRef.current) {
      for (const line of indResult.lines) {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.setLineDash(line.style === 'dashed' ? [5, 3] : line.style === 'dotted' ? [1.5, 2] : []);
        ctx.beginPath();
        let started = false;

        for (const pt of line.points) {
          const dataIdx = timeMap.get(pt.time);
          if (dataIdx === undefined) continue;
          const px = (dataIdx - st.offsetX) * st.candleWidth + st.candleWidth / 2;
          if (px < -30 || px > chartW + 30) continue;
          const py = priceToY(pt.value);
          if (py < -200 || py > priceH + 200) continue;
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Drawings
    ctx.lineCap = 'round';
    for (const drawing of drawingsRef.current) {
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.lineWidth;

      if (drawing.type === 'hline') {
        const y = priceToY(drawing.points[0].price);
        if (y < -20 || y > priceH + 20) continue;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartW, y);
        ctx.stroke();
        continue;
      }

      if (drawing.type === 'trendline' && drawing.points.length >= 2) {
        const i1 = timeMap.get(drawing.points[0].time);
        const i2 = timeMap.get(drawing.points[1].time);
        if (i1 === undefined || i2 === undefined) continue;
        const x1 = (i1 - st.offsetX) * st.candleWidth + st.candleWidth / 2;
        const y1 = priceToY(drawing.points[0].price);
        const x2 = (i2 - st.offsetX) * st.candleWidth + st.candleWidth / 2;
        const y2 = priceToY(drawing.points[1].price);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Trendline draft preview
    if (drawingTool === 'trendline' && draftDrawingRef.current && st.crosshair) {
      const i1 = timeMap.get(draftDrawingRef.current.time);
      if (i1 !== undefined) {
        const x1 = (i1 - st.offsetX) * st.candleWidth + st.candleWidth / 2;
        const y1 = priceToY(draftDrawingRef.current.price);
        const x2 = st.crosshair.x;
        const y2 = st.crosshair.y;

        ctx.strokeStyle = 'rgba(119, 139, 164, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (data.length > 0) {
      const last = data[data.length - 1];
      const ly = priceToY(last.close);
      const bull = last.close >= last.open;
      if (ly > -20 && ly < priceH + 20) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = bull ? hexToRgba(cfg.candleUp, 0.4) : hexToRgba(cfg.candleDown, 0.4);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(chartW, ly);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();

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
      ctx.beginPath();
      ctx.moveTo(chartW, y);
      ctx.lineTo(chartW + 4, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(formatPrice(p), w - 6, y);
    }

    if (data.length > 0) {
      const last = data[data.length - 1];
      const ly = Math.max(12, Math.min(priceH - 12, priceToY(last.close)));
      const bull = last.close >= last.open;
      const labelH = 20;
      const labelText = formatPrice(last.close);
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = bull ? cfg.candleUp : cfg.candleDown;
      ctx.fillRect(chartW, ly - labelH / 2, PRICE_W, labelH);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, w - 6, ly);
    }

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

    if (st.crosshair && st.crosshair.x < chartW && st.crosshair.y < chartH && st.dragMode === 'none') {
      const { x: mx, y: my } = st.crosshair;
      const chColor = hexToRgba(cfg.crosshairColor, 0.25);

      ctx.strokeStyle = chColor;
      ctx.lineWidth = 0.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, chartH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, my);
      ctx.lineTo(chartW, my);
      ctx.stroke();
      ctx.setLineDash([]);

      const lH = 18;
      ctx.fillStyle = '#0d1a30';
      ctx.fillRect(chartW, my - lH / 2, PRICE_W, lH);
      ctx.strokeStyle = hexToRgba(cfg.crosshairColor, 0.3);
      ctx.lineWidth = 0.5;
      ctx.strokeRect(chartW, my - lH / 2, PRICE_W, lH);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(yToPrice(my)), w - 6, my);

      const hi = xToIdx(mx);
      hoverIdxRef.current = hi;
      if (data[hi]) {
        const tl = formatDateFull(data[hi].time, intSec);
        ctx.font = '10px Inter, sans-serif';
        const tw = ctx.measureText(tl).width + 14;
        ctx.fillStyle = '#0d1a30';
        ctx.fillRect(mx - tw / 2, chartH, tw, TIME_H);
        ctx.strokeStyle = hexToRgba(cfg.crosshairColor, 0.3);
        ctx.lineWidth = 0.5;
        ctx.strokeRect(mx - tw / 2, chartH, tw, TIME_H);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(tl, mx, chartH + 8);
      }
    } else {
      hoverIdxRef.current = data.length > 0 ? data.length - 1 : -1;
    }

    const infoIdx = hoverIdxRef.current >= 0 && hoverIdxRef.current < data.length ? hoverIdxRef.current : data.length - 1;
    if (data[infoIdx]) {
      const c = data[infoIdx];
      const col = c.close >= c.open ? cfg.candleUp : cfg.candleDown;
      const changePct = c.open !== 0 ? ((c.close - c.open) / c.open) * 100 : 0;

      const infoY = 4;
      let lx = 8;

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
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
          ctx.fillText(item.label, lx, infoY);
          lx += ctx.measureText(item.label).width + 4;
        }
        ctx.fillStyle = item.color;
        ctx.fillText(item.value, lx, infoY);
        lx += ctx.measureText(item.value).width + 12;
      }
    }

    if (indResultsRef.current.length > 0) {
      ctx.font = '10px Inter, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let iy = INFO_BAR_H + 4;
      for (const ind of indicatorsRef.current) {
        if (!ind.visible) continue;
        const def = getIndicator(ind.defId);
        if (!def) continue;
        const label = def.shortName + (ind.params.period ? ` ${ind.params.period}` : '');
        ctx.fillStyle = ind.color;
        ctx.fillText(`● ${label}`, 8, iy);
        iy += 14;
      }
    }
  }, [drawingTool]);

  function drawPriceAxis(ctx: CanvasRenderingContext2D, chartW: number, chartH: number, cfg: ChartConfig) {
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(chartW, 0, PRICE_W, chartH);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartW, 0);
    ctx.lineTo(chartW, chartH);
    ctx.stroke();
  }

  function drawTimeAxis(ctx: CanvasRenderingContext2D, w: number, chartW: number, chartH: number, cfg: ChartConfig) {
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, chartH, w, TIME_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, chartH);
    ctx.lineTo(chartW, chartH);
    ctx.stroke();
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(chartW, chartH, PRICE_W, TIME_H);
  }

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

    if (st.dragMode === 'pan') {
      const dx = e.clientX - st.dragStartX;
      const dy = e.clientY - st.dragStartY;
      st.offsetX = st.dragStartOffset - dx / st.candleWidth;
      st.panOffsetY = st.dragStartPanY + dy * 0.4;
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
      if (drawingTool !== 'none' && x < chartW && y < chartH) {
        setCursor('crosshair');
      } else {
        setCursor(zone === 'price-scale' ? 'ns-resize' : zone === 'time-scale' ? 'ew-resize' : 'crosshair');
      }
      st.crosshair = x < chartW && y < chartH ? { x, y } : null;
    }

    scheduleRender();
  }, [drawingTool, getDragZone, scheduleRender]);

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

    // Drawing mode (click-to-place)
    if (drawingTool !== 'none' && x < chartW && y < chartH) {
      const point = createPointFromScreen(x, y);
      if (!point) return;

      if (drawingTool === 'hline') {
        upsertDrawing({
          id: `hline-${Date.now()}`,
          type: 'hline',
          points: [point],
          color: '#778ba4',
          lineWidth: 1.4,
        });
        toast.success('Horizontal line added');
        return;
      }

      if (drawingTool === 'trendline') {
        if (!draftDrawingRef.current) {
          draftDrawingRef.current = point;
          toast('Select second point for trendline');
          scheduleRender();
          return;
        }

        upsertDrawing({
          id: `trend-${Date.now()}`,
          type: 'trendline',
          points: [draftDrawingRef.current, point],
          color: '#778ba4',
          lineWidth: 1.5,
        });
        draftDrawingRef.current = null;
        toast.success('Trendline added');
        return;
      }
    }

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
  }, [createPointFromScreen, drawingTool, getDragZone, scheduleRender, upsertDrawing]);

  const handleMouseUp = useCallback(() => {
    stateRef.current.dragMode = 'none';
    setCursor('crosshair');
  }, []);

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
    st.priceScaleZoom = 1;
    st.panOffsetY = 0;
    st.candleWidth = DEFAULT_CW;
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    scheduleRender();
    const obs = new ResizeObserver(() => scheduleRender());
    obs.observe(container);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleRender]);

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="absolute inset-0">
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
          <ContextMenuItem className="gap-2 text-xs" onClick={() => setSettingsOpen(true)}>
            <BarChart3 size={14} className="text-white/40" />
            BTC/USDT settings…
          </ContextMenuItem>

          <ContextMenuItem className="gap-2 text-xs" onClick={applyClassicPreset}>
            <RotateCcw size={14} className="text-white/40" />
            Apply Classic style
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

          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2 text-xs">
              <Pencil size={14} className="text-white/40" />
              Drawing tools
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="bg-[#0a1628]/95 backdrop-blur-md border-white/[0.08]">
              <ContextMenuItem className="text-xs" onClick={() => { setDrawingTool('none'); draftDrawingRef.current = null; scheduleRender(); }}>
                {drawingTool === 'none' ? '✓ ' : ''}Cursor
              </ContextMenuItem>
              <ContextMenuItem className="text-xs" onClick={() => { setDrawingTool('trendline'); draftDrawingRef.current = null; scheduleRender(); }}>
                {drawingTool === 'trendline' ? '✓ ' : ''}Trend line
              </ContextMenuItem>
              <ContextMenuItem className="text-xs" onClick={() => { setDrawingTool('hline'); draftDrawingRef.current = null; scheduleRender(); }}>
                {drawingTool === 'hline' ? '✓ ' : ''}Horizontal line
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem className="text-xs" onClick={removeAllDrawings} disabled={drawingsCount === 0}>
                Clear drawings ({drawingsCount})
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuItem onClick={removeAllIndicators} disabled={indicators.length === 0} className="gap-2 text-xs">
            <Trash2 size={14} className="text-white/40" />
            {indicators.length > 0 ? `Remove ${indicators.length} indicator${indicators.length > 1 ? 's' : ''}` : 'No indicators to remove'}
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2 text-xs">
              <Clock size={14} className="text-white/40" />
              Timeframe
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="bg-[#0a1628]/95 backdrop-blur-md border-white/[0.08]">
              {(Object.keys(TIMEFRAME_CONFIG) as Timeframe[]).map((tf) => (
                <ContextMenuItem
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`text-xs ${timeframe === tf ? 'text-cyan-400' : ''}`}
                >
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

      <div className="absolute top-1.5 left-2 z-10 flex items-center gap-1 pointer-events-auto">
        {(Object.keys(TIMEFRAME_CONFIG) as Timeframe[]).map((tf) => (
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

        <button
          onClick={() => { setDrawingTool('none'); draftDrawingRef.current = null; scheduleRender(); }}
          className={`flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
            drawingTool === 'none' ? 'bg-white/10 text-white/80' : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
          }`}
          title="Cursor"
        >
          <MousePointer2 size={11} />
        </button>

        <button
          onClick={() => { setDrawingTool('trendline'); draftDrawingRef.current = null; scheduleRender(); }}
          className={`flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
            drawingTool === 'trendline' ? 'bg-white/10 text-white/80' : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
          }`}
          title="Trend line"
        >
          <Slash size={11} />
        </button>

        <button
          onClick={() => { setDrawingTool('hline'); draftDrawingRef.current = null; scheduleRender(); }}
          className={`flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
            drawingTool === 'hline' ? 'bg-white/10 text-white/80' : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
          }`}
          title="Horizontal line"
        >
          <Minus size={11} />
        </button>

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
      </div>

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

      {drawingTool === 'trendline' && draftDrawingRef.current && (
        <div className="absolute bottom-8 left-3 text-[10px] font-mono text-white/50 pointer-events-none z-10">
          Trendline: select second point (Esc to cancel)
        </div>
      )}

      <NewUIChartSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} config={config} onChange={setConfig} />
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}
