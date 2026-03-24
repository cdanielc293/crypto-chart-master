// Custom Chart Engine — fully custom Canvas-based candlestick chart
// Price axis drag-zoom, time axis drag-zoom, timeframe selector, crosshair, pan, context menu.

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
import { RotateCcw, ZoomIn, ZoomOut, Maximize2, Clock, Copy, BarChart3, Settings, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───
interface Candle {
  time: number; open: number; high: number; low: number; close: number; volume: number;
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
  // Price scale zoom — controls vertical padding multiplier
  priceScaleZoom: number;
  dragStartPriceZoom: number;
  // Vertical pan offset in pixels
  panOffsetY: number;
  dragStartPanY: number;
}

// ─── Mock data generator ───
function generateMockData(count: number, intervalSec: number): Candle[] {
  const candles: Candle[] = [];
  let price = 42000 + Math.random() * 5000;
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - count * intervalSec;

  for (let i = 0; i < count; i++) {
    const volatility = intervalSec < 3600 ? 50 + Math.random() * 200 : 150 + Math.random() * 800;
    const open = price;
    const dir = Math.random() > 0.47 ? 1 : -1;
    const close = open + Math.random() * volatility * dir;
    const high = Math.max(open, close) + Math.random() * volatility * 0.4;
    const low = Math.min(open, close) - Math.random() * volatility * 0.4;
    const volume = 200 + Math.random() * 5000;
    candles.push({ time: startTime + i * intervalSec, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

const TIMEFRAME_CONFIG: Record<Timeframe, { label: string; intervalSec: number; count: number }> = {
  '1m': { label: '1m', intervalSec: 60, count: 500 },
  '5m': { label: '5m', intervalSec: 300, count: 500 },
  '15m': { label: '15m', intervalSec: 900, count: 400 },
  '1h': { label: '1H', intervalSec: 3600, count: 400 },
  '4h': { label: '4H', intervalSec: 14400, count: 300 },
  '1D': { label: '1D', intervalSec: 86400, count: 365 },
  '1W': { label: '1W', intervalSec: 604800, count: 200 },
};

// ─── Formatting ───
function formatPrice(p: number): string {
  if (p >= 10000) return p.toFixed(0);
  if (p >= 100) return p.toFixed(1);
  return p.toFixed(2);
}

function formatTimeLabel(ts: number, intervalSec: number): string {
  const d = new Date(ts * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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

// ─── Colors ───
const C = {
  bg: '#080e1e',
  grid: 'rgba(255,255,255,0.025)',
  axisText: 'rgba(255,255,255,0.45)',
  axisLine: 'rgba(255,255,255,0.08)',
  axisBg: 'rgba(8,14,30,0.97)',
  bull: '#26a69a', bear: '#ef5350',
  bullWick: '#2ec4a6', bearWick: '#f06860',
  bullGlow: 'rgba(38,166,154,0.25)', bearGlow: 'rgba(239,83,80,0.25)',
  volBull: 'rgba(38,166,154,0.18)', volBear: 'rgba(239,83,80,0.18)',
  crossLine: 'rgba(0,200,255,0.25)',
  crossLabel: '#0d1a30',
  crossText: 'rgba(255,255,255,0.85)',
};

const PRICE_W = 80;
const TIME_H = 28;
const VOL_RATIO = 0.13;
const MIN_CW = 1;
const MAX_CW = 50;

export default function PriceChartWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const dataRef = useRef<Candle[]>([]);
  const stateRef = useRef<ChartState>({
    offsetX: 0, candleWidth: 8,
    crosshair: null, dragMode: 'none',
    dragStartX: 0, dragStartY: 0,
    dragStartOffset: 0, dragStartCandleWidth: 8,
    priceScaleZoom: 1, dragStartPriceZoom: 1,
    panOffsetY: 0, dragStartPanY: 0,
  });
  const rafRef = useRef(0);
  const intervalSecRef = useRef(86400);
  const [cursor, setCursor] = useState('crosshair');

  // Generate data on timeframe change
  useEffect(() => {
    const cfg = TIMEFRAME_CONFIG[timeframe];
    intervalSecRef.current = cfg.intervalSec;
    dataRef.current = generateMockData(cfg.count, cfg.intervalSec);
    const container = containerRef.current;
    if (container) {
      const chartW = container.clientWidth - PRICE_W;
      const visibleCandles = Math.floor(chartW / stateRef.current.candleWidth);
      stateRef.current.offsetX = Math.max(0, dataRef.current.length - visibleCandles);
      stateRef.current.priceScaleZoom = 1;
      stateRef.current.panOffsetY = 0;
    }
    scheduleRender();
  }, [timeframe]);

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, []);

  // ─── Render ───
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const data = dataRef.current;
    const st = stateRef.current;
    const chartW = w - PRICE_W;
    const chartH = h - TIME_H;
    const volumeH = chartH * VOL_RATIO;
    const priceH = chartH - volumeH;
    const intSec = intervalSecRef.current;

    // ─── Background ───
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);
    // Subtle radial glow
    const bgG = ctx.createRadialGradient(chartW * 0.5, priceH * 0.3, 0, chartW * 0.5, priceH * 0.3, chartH * 0.8);
    bgG.addColorStop(0, 'rgba(0,40,80,0.06)');
    bgG.addColorStop(1, 'transparent');
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, chartW, chartH);

    // ─── Visible range ───
    const visibleCount = Math.max(1, Math.floor(chartW / st.candleWidth));
    const maxOff = Math.max(0, data.length - Math.floor(visibleCount * 0.3));
    st.offsetX = Math.max(-visibleCount * 0.5, Math.min(st.offsetX, maxOff));

    const startIdx = Math.max(0, Math.floor(st.offsetX));
    const endIdx = Math.min(data.length, startIdx + visibleCount + 2);
    const visible = data.slice(startIdx, endIdx);
    if (visible.length === 0) {
      // Draw empty state
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '13px Inter, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No data in view', chartW / 2, priceH / 2);
      drawAxes(ctx, w, h, chartW, chartH);
      return;
    }

    // ─── Price range with zoom + vertical pan ───
    let rawMin = Infinity, rawMax = -Infinity, maxVol = 0;
    for (const c of visible) {
      if (c.low < rawMin) rawMin = c.low;
      if (c.high > rawMax) rawMax = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }
    const rawRange = rawMax - rawMin || 1;
    const midPrice = (rawMax + rawMin) / 2;
    const scaledHalfRange = (rawRange / 2 + rawRange * 0.08) * st.priceScaleZoom;
    // Apply vertical pan — convert pixel offset to price offset
    const pxPerPrice = priceH / (scaledHalfRange * 2);
    const panPriceOffset = st.panOffsetY / pxPerPrice;
    const minPrice = midPrice - scaledHalfRange + panPriceOffset;
    const maxPrice = midPrice + scaledHalfRange + panPriceOffset;
    const totalRange = maxPrice - minPrice;

    const priceToY = (p: number) => priceH * (1 - (p - minPrice) / totalRange);
    const yToPrice = (y: number) => minPrice + (1 - y / priceH) * totalRange;
    const xToIdx = (x: number) => Math.max(0, Math.min(data.length - 1, startIdx + Math.floor(x / st.candleWidth)));

    // ─── Clip chart area for candles ───
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartW, chartH);
    ctx.clip();

    // ─── Grid: horizontal price lines ───
    ctx.font = '10px Inter, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const priceStep = calculateNiceStep(totalRange, priceH / 50);
    for (let p = Math.ceil(minPrice / priceStep) * priceStep; p <= maxPrice; p += priceStep) {
      const y = priceToY(p);
      if (y < -10 || y > priceH + 10) continue;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    }

    // ─── Grid: vertical time lines ───
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tStep = Math.max(1, Math.floor(80 / st.candleWidth));
    for (let i = 0; i < visible.length; i++) {
      if ((startIdx + i) % tStep !== 0) continue;
      const x = (i - (st.offsetX - startIdx)) * st.candleWidth + st.candleWidth / 2;
      if (x < 0 || x > chartW) continue;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, chartH); ctx.stroke();
    }

    // ─── Volume bars ───
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = (i - (st.offsetX - startIdx)) * st.candleWidth;
      const barW = Math.max(1, st.candleWidth * 0.7);
      const barH = maxVol > 0 ? (c.volume / maxVol) * volumeH * 0.85 : 0;
      ctx.fillStyle = c.close >= c.open ? C.volBull : C.volBear;
      ctx.fillRect(x + (st.candleWidth - barW) / 2, priceH + (volumeH - barH), barW, barH);
    }

    // ─── Candlesticks ───
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = (i - (st.offsetX - startIdx)) * st.candleWidth;
      const cx = x + st.candleWidth / 2;
      const bull = c.close >= c.open;
      const bTop = priceToY(Math.max(c.open, c.close));
      const bBot = priceToY(Math.min(c.open, c.close));
      const bH = Math.max(1, bBot - bTop);
      const bW = Math.max(1, st.candleWidth * 0.65);

      // Glow effect for wider candles
      if (st.candleWidth >= 6) {
        ctx.shadowColor = bull ? C.bullGlow : C.bearGlow;
        ctx.shadowBlur = 8;
      }

      // Wick
      ctx.strokeStyle = bull ? C.bullWick : C.bearWick;
      ctx.lineWidth = Math.min(1.5, Math.max(0.5, st.candleWidth * 0.12));
      ctx.beginPath();
      ctx.moveTo(cx, priceToY(c.high));
      ctx.lineTo(cx, priceToY(c.low));
      ctx.stroke();

      // Body
      ctx.fillStyle = bull ? C.bull : C.bear;
      ctx.fillRect(cx - bW / 2, bTop, bW, bH);
      ctx.shadowBlur = 0;

      // Border for large candles
      if (st.candleWidth >= 14) {
        ctx.strokeStyle = bull ? 'rgba(38,166,154,0.4)' : 'rgba(239,83,80,0.4)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - bW / 2, bTop, bW, bH);
      }
    }

    // ─── Last price line ───
    if (visible.length > 0) {
      const last = visible[visible.length - 1];
      const ly = priceToY(last.close);
      const bull = last.close >= last.open;
      if (ly > -20 && ly < priceH + 20) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = bull ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(chartW, ly); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore(); // end clip

    // ─── Draw axes backgrounds ───
    drawAxes(ctx, w, h, chartW, chartH);

    // ─── Price labels on axis ───
    ctx.font = '10px Inter, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let p = Math.ceil(minPrice / priceStep) * priceStep; p <= maxPrice; p += priceStep) {
      const y = priceToY(p);
      if (y < 5 || y > priceH - 5) continue;
      ctx.fillStyle = C.axisText;
      ctx.fillText(formatPrice(p), w - 8, y);
    }

    // ─── Time labels on axis ───
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < visible.length; i++) {
      if ((startIdx + i) % tStep !== 0) continue;
      const x = (i - (st.offsetX - startIdx)) * st.candleWidth + st.candleWidth / 2;
      if (x < 20 || x > chartW - 20) continue;
      ctx.fillStyle = C.axisText;
      ctx.fillText(formatTimeLabel(visible[i].time, intSec), x, chartH + 7);
    }

    // ─── Last price label on axis ───
    if (visible.length > 0) {
      const last = visible[visible.length - 1];
      const ly = Math.max(0, Math.min(priceH, priceToY(last.close)));
      const bull = last.close >= last.open;
      const labelH = 18;
      ctx.fillStyle = bull ? C.bull : C.bear;
      ctx.fillRect(chartW, ly - labelH / 2, PRICE_W, labelH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Inter, monospace';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(last.close), w - 8, ly);
    }

    // ─── Crosshair ───
    if (st.crosshair && st.crosshair.x < chartW && st.crosshair.y < chartH && st.dragMode === 'none') {
      const { x: mx, y: my } = st.crosshair;

      // Lines
      ctx.strokeStyle = C.crossLine; ctx.lineWidth = 0.8; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, chartH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(chartW, my); ctx.stroke();
      ctx.setLineDash([]);

      // Price label on axis
      const labelH = 18;
      ctx.fillStyle = C.crossLabel;
      ctx.fillRect(chartW, my - labelH / 2, PRICE_W, labelH);
      ctx.strokeStyle = 'rgba(0,200,255,0.3)'; ctx.lineWidth = 0.5;
      ctx.strokeRect(chartW, my - labelH / 2, PRICE_W, labelH);
      ctx.fillStyle = C.crossText;
      ctx.font = '10px Inter, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(yToPrice(my)), w - 8, my);

      // Time label on axis
      const hi = xToIdx(mx);
      if (data[hi]) {
        const tl = formatDateFull(data[hi].time, intSec);
        const tw = ctx.measureText(tl).width + 14;
        ctx.fillStyle = C.crossLabel;
        ctx.fillRect(mx - tw / 2, chartH, tw, TIME_H);
        ctx.strokeStyle = 'rgba(0,200,255,0.3)'; ctx.lineWidth = 0.5;
        ctx.strokeRect(mx - tw / 2, chartH, tw, TIME_H);
        ctx.fillStyle = C.crossText; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(tl, mx, chartH + 7);
      }

      // OHLCV overlay
      if (data[hi]) {
        const c = data[hi];
        const col = c.close >= c.open ? C.bull : C.bear;
        ctx.font = '10px Inter, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        let lx = 8;
        const items = [
          { t: `O ${formatPrice(c.open)}`, c: col },
          { t: `H ${formatPrice(c.high)}`, c: col },
          { t: `L ${formatPrice(c.low)}`, c: col },
          { t: `C ${formatPrice(c.close)}`, c: col },
          { t: `V ${c.volume.toFixed(0)}`, c: 'rgba(255,255,255,0.3)' },
        ];
        // Background bar for readability
        const totalW = items.reduce((s, it) => s + ctx.measureText(it.t).width + 10, 0);
        ctx.fillStyle = 'rgba(8,14,30,0.85)';
        ctx.fillRect(4, 4, totalW + 4, 16);
        for (const item of items) {
          ctx.fillStyle = item.c;
          ctx.fillText(item.t, lx, 7);
          lx += ctx.measureText(item.t).width + 10;
        }
      }
    }

    // ─── Drag indicators ───
    if (st.dragMode === 'price-scale') {
      ctx.fillStyle = 'rgba(0,200,255,0.04)';
      ctx.fillRect(chartW, 0, PRICE_W, chartH);
    }
    if (st.dragMode === 'time-scale') {
      ctx.fillStyle = 'rgba(0,200,255,0.04)';
      ctx.fillRect(0, chartH, chartW, TIME_H);
    }
  }, []);

  function drawAxes(ctx: CanvasRenderingContext2D, w: number, h: number, chartW: number, chartH: number) {
    // Axis lines
    ctx.strokeStyle = C.axisLine; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, chartH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, chartH); ctx.lineTo(chartW, chartH); ctx.stroke();
    // Price axis bg
    ctx.fillStyle = C.axisBg;
    ctx.fillRect(chartW, 0, PRICE_W, chartH);
    // Time axis bg
    ctx.fillStyle = C.axisBg;
    ctx.fillRect(0, chartH, w, TIME_H);
    // Corner
    ctx.fillStyle = C.bg;
    ctx.fillRect(chartW, chartH, PRICE_W, TIME_H);
  }

  // ─── Determine drag zone ───
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

  // ─── Events ───
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
      st.panOffsetY = st.dragStartPanY + dy;
      st.crosshair = null;
    } else if (st.dragMode === 'price-scale') {
      const dy = e.clientY - st.dragStartY;
      const factor = 1 + dy * 0.005;
      st.priceScaleZoom = Math.max(0.05, Math.min(20, st.dragStartPriceZoom * factor));
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
      if (zone === 'price-scale') setCursor('ns-resize');
      else if (zone === 'time-scale') setCursor('ew-resize');
      else setCursor('crosshair');
      st.crosshair = (x < chartW && y < chartH) ? { x, y } : null;
    }

    scheduleRender();
  }, [getDragZone, scheduleRender]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) return; // right-click handled by context menu
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
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
  }, [getDragZone]);

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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const st = stateRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const chartW = rect.width - PRICE_W;
    const ratio = mx / chartW;

    const oldW = st.candleWidth;
    const zf = e.deltaY > 0 ? 0.92 : 1.08;
    st.candleWidth = Math.max(MIN_CW, Math.min(MAX_CW, st.candleWidth * zf));

    const oldVis = chartW / oldW;
    const newVis = chartW / st.candleWidth;
    st.offsetX += (oldVis - newVis) * ratio;

    scheduleRender();
  }, [scheduleRender]);

  // Double-click to reset
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
      // Double-click price axis → reset vertical zoom + pan
      stateRef.current.priceScaleZoom = 1;
      stateRef.current.panOffsetY = 0;
      scheduleRender();
    } else if (y >= chartH && x < chartW) {
      // Double-click time axis → reset horizontal zoom
      stateRef.current.candleWidth = 8;
      const visibleCandles = Math.floor(chartW / 8);
      stateRef.current.offsetX = Math.max(0, dataRef.current.length - visibleCandles);
      scheduleRender();
    }
  }, [scheduleRender]);

  // ─── Context menu actions ───
  const resetView = useCallback(() => {
    const st = stateRef.current;
    const container = containerRef.current;
    st.priceScaleZoom = 1;
    st.panOffsetY = 0;
    st.candleWidth = 8;
    if (container) {
      const chartW = container.clientWidth - PRICE_W;
      const visibleCandles = Math.floor(chartW / 8);
      st.offsetX = Math.max(0, dataRef.current.length - visibleCandles);
    }
    scheduleRender();
  }, [scheduleRender]);

  const zoomIn = useCallback(() => {
    const st = stateRef.current;
    st.candleWidth = Math.min(MAX_CW, st.candleWidth * 1.4);
    scheduleRender();
  }, [scheduleRender]);

  const zoomOut = useCallback(() => {
    const st = stateRef.current;
    st.candleWidth = Math.max(MIN_CW, st.candleWidth * 0.7);
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
    }
  }, []);

  // ─── Init ───
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    scheduleRender();
    const obs = new ResizeObserver(() => scheduleRender());
    obs.observe(container);
    return () => { obs.disconnect(); cancelAnimationFrame(rafRef.current); };
  }, [scheduleRender]);

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{ cursor }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
          />
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52 bg-[#0d1a30]/95 backdrop-blur-md border-white/10 text-white/80">
          <ContextMenuItem onClick={resetView} className="gap-2 text-xs hover:bg-white/5 focus:bg-white/5 focus:text-white">
            <RotateCcw className="w-3.5 h-3.5" /> Reset chart view
          </ContextMenuItem>
          <ContextMenuItem onClick={fitToScreen} className="gap-2 text-xs hover:bg-white/5 focus:bg-white/5 focus:text-white">
            <Maximize2 className="w-3.5 h-3.5" /> Fit to screen
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-white/5" />
          <ContextMenuItem onClick={zoomIn} className="gap-2 text-xs hover:bg-white/5 focus:bg-white/5 focus:text-white">
            <ZoomIn className="w-3.5 h-3.5" /> Zoom in
          </ContextMenuItem>
          <ContextMenuItem onClick={zoomOut} className="gap-2 text-xs hover:bg-white/5 focus:bg-white/5 focus:text-white">
            <ZoomOut className="w-3.5 h-3.5" /> Zoom out
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-white/5" />
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2 text-xs hover:bg-white/5 focus:bg-white/5 focus:text-white">
              <Clock className="w-3.5 h-3.5" /> Timeframe
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="bg-[#0d1a30]/95 backdrop-blur-md border-white/10 text-white/80">
              {(Object.keys(TIMEFRAME_CONFIG) as Timeframe[]).map(tf => (
                <ContextMenuItem
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`text-xs hover:bg-white/5 focus:bg-white/5 focus:text-white ${timeframe === tf ? 'text-cyan-400' : ''}`}
                >
                  {TIMEFRAME_CONFIG[tf].label} {timeframe === tf && '✓'}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator className="bg-white/5" />
          <ContextMenuItem onClick={copyLastPrice} className="gap-2 text-xs hover:bg-white/5 focus:bg-white/5 focus:text-white">
            <Copy className="w-3.5 h-3.5" /> Copy last price
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Timeframe selector */}
      <div className="absolute top-1.5 left-2 z-10 flex items-center gap-0.5 pointer-events-auto">
        {(Object.keys(TIMEFRAME_CONFIG) as Timeframe[]).map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-colors ${
              timeframe === tf
                ? 'bg-white/10 text-white/80'
                : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
            }`}
          >
            {TIMEFRAME_CONFIG[tf].label}
          </button>
        ))}
      </div>

      <div className="absolute top-1.5 right-[84px] flex items-center gap-2 pointer-events-none">
        <span className="text-[9px] font-mono text-white/20 tracking-wider uppercase">
          BTC/USDT • {TIMEFRAME_CONFIG[timeframe].label}
        </span>
      </div>
    </div>
  );
}

function calculateNiceStep(range: number, minPx: number): number {
  const rough = range / (minPx > 0 ? (range / minPx) : 5);
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const r = rough / mag;
  return (r <= 1.5 ? 1 : r <= 3 ? 2 : r <= 7 ? 5 : 10) * mag;
}
