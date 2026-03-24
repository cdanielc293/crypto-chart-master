// Custom Chart Engine — fully custom Canvas-based candlestick chart
// No external charting library. Deep navy, glow effects, crosshair, zoom/pan.

import { useEffect, useRef, useCallback, useState } from 'react';

// ─── Types ───
interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartState {
  offsetX: number;     // pan offset in candle-units (fractional)
  candleWidth: number; // pixels per candle slot
  crosshair: { x: number; y: number } | null;
  dragging: boolean;
  dragStartX: number;
  dragStartOffset: number;
}

// ─── Mock data generator ───
function generateMockData(count = 300): Candle[] {
  const candles: Candle[] = [];
  let price = 42000 + Math.random() * 5000;
  const startTime = Math.floor(new Date('2024-01-01').getTime() / 1000);
  const DAY = 86400;

  for (let i = 0; i < count; i++) {
    const volatility = 150 + Math.random() * 800;
    const open = price;
    const dir = Math.random() > 0.47 ? 1 : -1;
    const close = open + Math.random() * volatility * dir;
    const high = Math.max(open, close) + Math.random() * volatility * 0.4;
    const low = Math.min(open, close) - Math.random() * volatility * 0.4;
    const volume = 200 + Math.random() * 5000;
    candles.push({ time: startTime + i * DAY, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

// ─── Formatting helpers ───
function formatPrice(p: number): string {
  if (p >= 10000) return p.toFixed(0);
  if (p >= 100) return p.toFixed(1);
  return p.toFixed(2);
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function formatDateFull(ts: number): string {
  const d = new Date(ts * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// ─── Colors ───
const COLORS = {
  bg: '#080e1e',
  gridLine: 'rgba(255,255,255,0.025)',
  gridLineMajor: 'rgba(255,255,255,0.04)',
  axisText: 'rgba(255,255,255,0.3)',
  axisLine: 'rgba(255,255,255,0.06)',
  bullBody: '#26a69a',
  bearBody: '#ef5350',
  bullWick: '#2ec4a6',
  bearWick: '#f06860',
  bullGlow: 'rgba(38,166,154,0.25)',
  bearGlow: 'rgba(239,83,80,0.25)',
  volumeBull: 'rgba(38,166,154,0.18)',
  volumeBear: 'rgba(239,83,80,0.18)',
  crosshairLine: 'rgba(0,200,255,0.2)',
  crosshairLabel: '#0d1a30',
  crosshairText: 'rgba(255,255,255,0.8)',
  ohlcPositive: '#26a69a',
  ohlcNegative: '#ef5350',
};

const PRICE_AXIS_WIDTH = 65;
const TIME_AXIS_HEIGHT = 28;
const VOLUME_HEIGHT_RATIO = 0.15;
const MIN_CANDLE_WIDTH = 3;
const MAX_CANDLE_WIDTH = 40;

export default function PriceChartWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<Candle[]>(generateMockData(300));
  const stateRef = useRef<ChartState>({
    offsetX: 0,
    candleWidth: 8,
    crosshair: null,
    dragging: false,
    dragStartX: 0,
    dragStartOffset: 0,
  });
  const rafRef = useRef<number>(0);
  const [, forceRender] = useState(0);

  // ─── Drawing logic ───
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
    const state = stateRef.current;
    const chartW = w - PRICE_AXIS_WIDTH;
    const chartH = h - TIME_AXIS_HEIGHT;
    const volumeH = chartH * VOLUME_HEIGHT_RATIO;
    const priceH = chartH - volumeH;

    // ─── Background ───
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    // Radial glow at top
    const bgGrad = ctx.createRadialGradient(chartW * 0.5, 0, 0, chartW * 0.5, 0, chartH * 0.7);
    bgGrad.addColorStop(0, 'rgba(0,50,100,0.08)');
    bgGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, chartW, chartH);

    // ─── Visible range ───
    const visibleCandles = Math.floor(chartW / state.candleWidth);
    const maxOffset = Math.max(0, data.length - visibleCandles);
    state.offsetX = Math.max(0, Math.min(state.offsetX, maxOffset));

    const startIdx = Math.floor(state.offsetX);
    const endIdx = Math.min(data.length, startIdx + visibleCandles + 2);
    const visible = data.slice(startIdx, endIdx);

    if (visible.length === 0) return;

    // ─── Price range ───
    let minPrice = Infinity, maxPrice = -Infinity, maxVolume = 0;
    for (const c of visible) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    }
    const priceRange = maxPrice - minPrice || 1;
    const pricePadding = priceRange * 0.08;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const totalPriceRange = maxPrice - minPrice;

    const priceToY = (p: number) => priceH * (1 - (p - minPrice) / totalPriceRange);
    const yToPrice = (y: number) => minPrice + (1 - y / priceH) * totalPriceRange;
    const xToCandle = (x: number) => {
      const idx = startIdx + Math.floor(x / state.candleWidth);
      return Math.max(0, Math.min(data.length - 1, idx));
    };

    // ─── Grid lines (horizontal — price) ───
    ctx.font = '10px Inter, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const priceStep = calculateNiceStep(totalPriceRange, priceH / 50);
    const firstPrice = Math.ceil(minPrice / priceStep) * priceStep;
    for (let p = firstPrice; p <= maxPrice; p += priceStep) {
      const y = priceToY(p);
      if (y < 0 || y > priceH) continue;
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();

      // Price label
      ctx.fillStyle = COLORS.axisText;
      ctx.fillText(formatPrice(p), w - 6, y);
    }

    // ─── Grid lines (vertical — time) ───
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const timeStep = Math.max(1, Math.floor(60 / state.candleWidth));
    for (let i = 0; i < visible.length; i++) {
      const globalIdx = startIdx + i;
      if (globalIdx % timeStep !== 0) continue;
      const x = (i - (state.offsetX - startIdx)) * state.candleWidth + state.candleWidth / 2;
      if (x < 0 || x > chartW) continue;

      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartH);
      ctx.stroke();

      // Time label
      ctx.fillStyle = COLORS.axisText;
      ctx.fillText(formatDate(visible[i].time), x, chartH + 8);
    }

    // ─── Axis borders ───
    ctx.strokeStyle = COLORS.axisLine;
    ctx.lineWidth = 1;
    // Right axis line
    ctx.beginPath();
    ctx.moveTo(chartW, 0);
    ctx.lineTo(chartW, chartH);
    ctx.stroke();
    // Bottom axis line
    ctx.beginPath();
    ctx.moveTo(0, chartH);
    ctx.lineTo(chartW, chartH);
    ctx.stroke();
    // Volume separator
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.beginPath();
    ctx.moveTo(0, priceH);
    ctx.lineTo(chartW, priceH);
    ctx.stroke();

    // ─── Volume bars ───
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = (i - (state.offsetX - startIdx)) * state.candleWidth;
      const barW = Math.max(1, state.candleWidth * 0.7);
      const barH = maxVolume > 0 ? (c.volume / maxVolume) * volumeH * 0.85 : 0;
      const barX = x + (state.candleWidth - barW) / 2;
      const barY = priceH + (volumeH - barH);

      ctx.fillStyle = c.close >= c.open ? COLORS.volumeBull : COLORS.volumeBear;
      ctx.fillRect(barX, barY, barW, barH);
    }

    // ─── Candlesticks ───
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = (i - (state.offsetX - startIdx)) * state.candleWidth;
      const centerX = x + state.candleWidth / 2;
      const isBull = c.close >= c.open;
      const bodyTop = priceToY(Math.max(c.open, c.close));
      const bodyBottom = priceToY(Math.min(c.open, c.close));
      const bodyH = Math.max(1, bodyBottom - bodyTop);
      const bodyW = Math.max(1, state.candleWidth * 0.65);

      // Glow behind candle
      if (state.candleWidth >= 6) {
        ctx.shadowColor = isBull ? COLORS.bullGlow : COLORS.bearGlow;
        ctx.shadowBlur = 8;
      }

      // Wick
      ctx.strokeStyle = isBull ? COLORS.bullWick : COLORS.bearWick;
      ctx.lineWidth = Math.min(1.5, state.candleWidth * 0.12);
      ctx.beginPath();
      ctx.moveTo(centerX, priceToY(c.high));
      ctx.lineTo(centerX, priceToY(c.low));
      ctx.stroke();

      // Body
      ctx.fillStyle = isBull ? COLORS.bullBody : COLORS.bearBody;
      const bodyX = centerX - bodyW / 2;
      ctx.fillRect(bodyX, bodyTop, bodyW, bodyH);

      ctx.shadowBlur = 0;

      // Body border for detail at larger sizes
      if (state.candleWidth >= 12) {
        ctx.strokeStyle = isBull ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(bodyX, bodyTop, bodyW, bodyH);
      }
    }

    // ─── Last price line ───
    if (visible.length > 0) {
      const lastCandle = visible[visible.length - 1];
      const lastY = priceToY(lastCandle.close);
      const isBull = lastCandle.close >= lastCandle.open;

      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = isBull ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, lastY);
      ctx.lineTo(chartW, lastY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label on axis
      const labelColor = isBull ? COLORS.bullBody : COLORS.bearBody;
      ctx.fillStyle = labelColor;
      const labelW = PRICE_AXIS_WIDTH - 4;
      const labelH = 18;
      ctx.fillRect(chartW + 2, lastY - labelH / 2, labelW, labelH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Inter, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(lastCandle.close), w - 6, lastY);
    }

    // ─── Crosshair ───
    if (state.crosshair && state.crosshair.x < chartW && state.crosshair.y < chartH) {
      const { x: mx, y: my } = state.crosshair;

      // Vertical line
      ctx.strokeStyle = COLORS.crosshairLine;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, chartH);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, my);
      ctx.lineTo(chartW, my);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label on right axis
      const hoverPrice = yToPrice(my);
      ctx.fillStyle = COLORS.crosshairLabel;
      ctx.fillRect(chartW, my - 10, PRICE_AXIS_WIDTH, 20);
      ctx.fillStyle = COLORS.crosshairText;
      ctx.font = '10px Inter, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(hoverPrice), w - 6, my);

      // Time label on bottom axis
      const hoverIdx = xToCandle(mx);
      if (data[hoverIdx]) {
        const timeLabel = formatDateFull(data[hoverIdx].time);
        const timeLabelW = ctx.measureText(timeLabel).width + 12;
        ctx.fillStyle = COLORS.crosshairLabel;
        ctx.fillRect(mx - timeLabelW / 2, chartH, timeLabelW, TIME_AXIS_HEIGHT);
        ctx.fillStyle = COLORS.crosshairText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(timeLabel, mx, chartH + 8);
      }

      // OHLCV info in top-left
      if (data[hoverIdx]) {
        const c = data[hoverIdx];
        const isBull = c.close >= c.open;
        const color = isBull ? COLORS.ohlcPositive : COLORS.ohlcNegative;
        ctx.font = '10px Inter, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const labels = [
          { t: `O ${formatPrice(c.open)}`, c: color },
          { t: `H ${formatPrice(c.high)}`, c: color },
          { t: `L ${formatPrice(c.low)}`, c: color },
          { t: `C ${formatPrice(c.close)}`, c: color },
          { t: `V ${c.volume.toFixed(0)}`, c: 'rgba(255,255,255,0.3)' },
        ];
        let labelX = 8;
        for (const l of labels) {
          ctx.fillStyle = l.c;
          ctx.fillText(l.t, labelX, 8);
          labelX += ctx.measureText(l.t).width + 10;
        }
      }
    }
  }, []);

  // ─── Event handlers ───
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const state = stateRef.current;

    if (state.dragging) {
      const dx = e.clientX - state.dragStartX;
      state.offsetX = state.dragStartOffset - dx / state.candleWidth;
      state.crosshair = null;
    } else {
      state.crosshair = { x, y };
    }
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, [render]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const state = stateRef.current;
    state.dragging = true;
    state.dragStartX = e.clientX;
    state.dragStartOffset = state.offsetX;
    state.crosshair = null;
  }, []);

  const handleMouseUp = useCallback(() => {
    stateRef.current.dragging = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    stateRef.current.dragging = false;
    stateRef.current.crosshair = null;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, [render]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const state = stateRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const chartW = rect.width - PRICE_AXIS_WIDTH;
    const mouseRatio = mouseX / chartW;

    const oldWidth = state.candleWidth;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    state.candleWidth = Math.max(MIN_CANDLE_WIDTH, Math.min(MAX_CANDLE_WIDTH, state.candleWidth * zoomFactor));

    // Zoom towards mouse position
    const oldVisibleCount = chartW / oldWidth;
    const newVisibleCount = chartW / state.candleWidth;
    const candleDiff = oldVisibleCount - newVisibleCount;
    state.offsetX += candleDiff * mouseRatio;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, [render]);

  // ─── Init ───
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Set initial offset to show latest candles
    const chartW = container.clientWidth - PRICE_AXIS_WIDTH;
    const visibleCandles = Math.floor(chartW / stateRef.current.candleWidth);
    stateRef.current.offsetX = Math.max(0, dataRef.current.length - visibleCandles);

    render();

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(render);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  return (
    <div ref={containerRef} className="w-full h-full relative select-none" style={{ cursor: stateRef.current.dragging ? 'grabbing' : 'crosshair' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
      />
      <div className="absolute top-1 right-[70px] flex items-center gap-2 pointer-events-none">
        <span className="text-[9px] font-mono text-white/20 tracking-wider uppercase">BTC/USDT • 1D</span>
      </div>
    </div>
  );
}

// ─── Utility: calculate nice grid step ───
function calculateNiceStep(range: number, minPixels: number): number {
  const roughStep = range / (minPixels > 0 ? (range / minPixels) : 5);
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / mag;
  let niceStep: number;
  if (residual <= 1.5) niceStep = 1;
  else if (residual <= 3) niceStep = 2;
  else if (residual <= 7) niceStep = 5;
  else niceStep = 10;
  return niceStep * mag;
}
