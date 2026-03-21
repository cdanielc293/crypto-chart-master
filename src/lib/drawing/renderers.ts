import type { ChartDrawing, CoordHelper, AnchorPoint } from './types';

type Renderer = (
  ctx: CanvasRenderingContext2D,
  drawing: ChartDrawing,
  coord: CoordHelper,
  w: number,
  h: number
) => void;

function toXY(coord: CoordHelper, time: number, price: number): { x: number; y: number } | null {
  const x = coord.timeToX(time);
  const y = coord.priceToY(price);
  if (x === null || y === null) return null;
  return { x, y };
}

function setupStroke(ctx: CanvasRenderingContext2D, drawing: ChartDrawing) {
  ctx.strokeStyle = drawing.color;
  ctx.lineWidth = drawing.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const lineStyle = drawing.props?.lineStyle || 'solid';
  if (lineStyle === 'dashed') {
    ctx.setLineDash([8, 4]);
  } else if (lineStyle === 'dotted') {
    ctx.setLineDash([2, 3]);
  } else {
    ctx.setLineDash([]);
  }
}

// ─── Lines ───

const renderTrendline: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
};

const renderRay: Renderer = (ctx, d, coord, w) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  setupStroke(ctx, d);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;
  const scale = (w * 3) / len;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p1.x + dx * scale, p1.y + dy * scale);
  ctx.stroke();
};

const renderExtendedLine: Renderer = (ctx, d, coord, w, h) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  setupStroke(ctx, d);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;
  const scale = (Math.max(w, h) * 3) / len;
  ctx.beginPath();
  ctx.moveTo(p1.x - dx * scale, p1.y - dy * scale);
  ctx.lineTo(p1.x + dx * scale, p1.y + dy * scale);
  ctx.stroke();
};

const renderHorizontalLine: Renderer = (ctx, d, coord, w) => {
  if (d.points.length < 1) return;
  const y = coord.priceToY(d.points[0].price);
  if (y === null) return;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  // Price label
  ctx.fillStyle = d.color;
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(d.points[0].price.toFixed(2), w - 5, y - 4);
};

const renderVerticalLine: Renderer = (ctx, d, coord, _w, h) => {
  if (d.points.length < 1) return;
  const x = coord.timeToX(d.points[0].time);
  if (x === null) return;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, h);
  ctx.stroke();
};

const renderCrossLine: Renderer = (ctx, d, coord, w, h) => {
  if (d.points.length < 1) return;
  const p = toXY(coord, d.points[0].time, d.points[0].price);
  if (!p) return;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(0, p.y);
  ctx.lineTo(w, p.y);
  ctx.moveTo(p.x, 0);
  ctx.lineTo(p.x, h);
  ctx.stroke();
};

const renderHorizontalRay: Renderer = (ctx, d, coord, w) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  if (!p1) return;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(w, p1.y);
  ctx.stroke();
};

const renderInfoLine: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  // Info label
  const priceDiff = d.points[1].price - d.points[0].price;
  const pctDiff = ((priceDiff / d.points[0].price) * 100).toFixed(2);
  const dist = Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y));
  ctx.fillStyle = d.color;
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)} (${pctDiff}%) | ${dist}px`, (p1.x + p2.x) / 2, Math.min(p1.y, p2.y) - 8);
};

const renderTrendAngle: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p2.x, p1.y);
  ctx.stroke();
  const angle = Math.atan2(p1.y - p2.y, p2.x - p1.x) * (180 / Math.PI);
  ctx.fillStyle = d.color;
  ctx.font = '11px monospace';
  ctx.fillText(`${angle.toFixed(1)}°`, p2.x + 5, p1.y - 4);
};

// ─── Channels ───

const renderParallelChannel: Renderer = (ctx, d, coord) => {
  if (d.points.length < 3) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  const p3 = toXY(coord, d.points[2].time, d.points[2].price);
  if (!p1 || !p2 || !p3) return;
  // p3 defines the offset
  const offsetY = p3.y - p1.y;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y + offsetY);
  ctx.lineTo(p2.x, p2.y + offsetY);
  ctx.stroke();
  // Fill
  ctx.fillStyle = d.color + '15';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p2.x, p2.y + offsetY);
  ctx.lineTo(p1.x, p1.y + offsetY);
  ctx.closePath();
  ctx.fill();
};

// ─── Fibonacci ───

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS = ['#787b86', '#f44336', '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#787b86'];

const renderFibonacci: Renderer = (ctx, d, coord, w) => {
  if (d.points.length < 2) return;
  const y1 = coord.priceToY(d.points[0].price);
  const y2 = coord.priceToY(d.points[1].price);
  const x1 = coord.timeToX(d.points[0].time);
  const x2 = coord.timeToX(d.points[1].time);
  if (y1 === null || y2 === null || x1 === null || x2 === null) return;

  const priceDiff = d.points[1].price - d.points[0].price;

  for (let i = 0; i < FIB_LEVELS.length; i++) {
    const price = d.points[0].price + priceDiff * FIB_LEVELS[i];
    const y = coord.priceToY(price);
    if (y === null) continue;
    ctx.strokeStyle = FIB_COLORS[i];
    ctx.lineWidth = 1;
    ctx.setLineDash(i === 0 || i === FIB_LEVELS.length - 1 ? [] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(Math.min(x1, x2) - 50, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Label
    ctx.fillStyle = FIB_COLORS[i];
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${(FIB_LEVELS[i] * 100).toFixed(1)}% (${price.toFixed(2)})`, 5, y - 3);
  }
  // Fill between levels
  for (let i = 0; i < FIB_LEVELS.length - 1; i++) {
    const yTop = coord.priceToY(d.points[0].price + priceDiff * FIB_LEVELS[i]);
    const yBot = coord.priceToY(d.points[0].price + priceDiff * FIB_LEVELS[i + 1]);
    if (yTop === null || yBot === null) continue;
    ctx.fillStyle = FIB_COLORS[i] + '08';
    ctx.fillRect(0, Math.min(yTop, yBot), w, Math.abs(yBot - yTop));
  }
};

// ─── Shapes ───

const renderRectangle: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  setupStroke(ctx, d);
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const rw = Math.abs(p2.x - p1.x);
  const rh = Math.abs(p2.y - p1.y);
  ctx.strokeRect(x, y, rw, rh);
  ctx.fillStyle = d.color + '15';
  ctx.fillRect(x, y, rw, rh);
};

const renderCircle: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = d.color + '15';
  ctx.fill();
};

const renderEllipse: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  const rx = Math.abs(p2.x - p1.x);
  const ry = Math.abs(p2.y - p1.y);
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.ellipse(p1.x, p1.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = d.color + '15';
  ctx.fill();
};

const renderTriangle: Renderer = (ctx, d, coord) => {
  if (d.points.length < 3) return;
  const pts = d.points.map(p => toXY(coord, p.time, p.price)).filter(Boolean) as { x: number; y: number }[];
  if (pts.length < 3) return;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = d.color + '15';
  ctx.fill();
};

// ─── Arrows ───

const renderArrowUp: Renderer = (ctx, d, coord) => {
  if (d.points.length < 1) return;
  const p = toXY(coord, d.points[0].time, d.points[0].price);
  if (!p) return;
  const s = 12;
  ctx.fillStyle = '#26a69a';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - s);
  ctx.lineTo(p.x - s * 0.7, p.y + s * 0.5);
  ctx.lineTo(p.x + s * 0.7, p.y + s * 0.5);
  ctx.closePath();
  ctx.fill();
};

const renderArrowDown: Renderer = (ctx, d, coord) => {
  if (d.points.length < 1) return;
  const p = toXY(coord, d.points[0].time, d.points[0].price);
  if (!p) return;
  const s = 12;
  ctx.fillStyle = '#ef5350';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + s);
  ctx.lineTo(p.x - s * 0.7, p.y - s * 0.5);
  ctx.lineTo(p.x + s * 0.7, p.y - s * 0.5);
  ctx.closePath();
  ctx.fill();
};

// ─── Brush / Highlighter ───

const renderBrush: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const pts = d.points.map(p => toXY(coord, p.time, p.price)).filter(Boolean) as { x: number; y: number }[];
  if (pts.length < 2) return;
  setupStroke(ctx, d);
  ctx.globalAlpha = d.type === 'highlighter' ? 0.35 : 1;
  ctx.lineWidth = d.type === 'highlighter' ? 12 : d.lineWidth;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
};

// ─── Text ───

const renderText: Renderer = (ctx, d, coord) => {
  if (d.points.length < 1) return;
  const p = toXY(coord, d.points[0].time, d.points[0].price);
  if (!p) return;
  const text = d.props?.text || 'Text';
  const fontSize = d.props?.fontSize || 14;
  ctx.fillStyle = d.color;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, p.x, p.y);
};

// ─── Pitchfork ───

const renderPitchfork: Renderer = (ctx, d, coord) => {
  if (d.points.length < 3) return;
  const p0 = toXY(coord, d.points[0].time, d.points[0].price);
  const p1 = toXY(coord, d.points[1].time, d.points[1].price);
  const p2 = toXY(coord, d.points[2].time, d.points[2].price);
  if (!p0 || !p1 || !p2) return;
  setupStroke(ctx, d);
  // Median line from p0 to midpoint of p1-p2
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(midX + (midX - p0.x) * 5, midY + (midY - p0.y) * 5);
  ctx.stroke();
  // Upper line parallel through p1
  const dx = midX - p0.x;
  const dy = midY - p0.y;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p1.x + dx * 5, p1.y + dy * 5);
  ctx.stroke();
  // Lower line parallel through p2
  ctx.beginPath();
  ctx.moveTo(p2.x, p2.y);
  ctx.lineTo(p2.x + dx * 5, p2.y + dy * 5);
  ctx.stroke();
  // Connection lines
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.setLineDash([]);
};

// ─── Positions ───

const renderPosition: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  const isLong = d.type === 'longposition';
  const entry = d.points[0].price;
  const target = d.points[1].price;
  const yEntry = coord.priceToY(entry);
  const yTarget = coord.priceToY(target);
  if (yEntry === null || yTarget === null) return;

  // Background
  const profitColor = isLong ? (target > entry) : (target < entry);
  ctx.fillStyle = profitColor ? 'rgba(38,166,154,0.12)' : 'rgba(239,83,80,0.12)';
  ctx.fillRect(p1.x, Math.min(yEntry, yTarget), Math.abs(p2.x - p1.x) || 150, Math.abs(yTarget - yEntry));

  // Entry line
  ctx.strokeStyle = '#2196f3';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p1.x, yEntry);
  ctx.lineTo(p1.x + 150, yEntry);
  ctx.stroke();
  // Target line
  ctx.strokeStyle = profitColor ? '#26a69a' : '#ef5350';
  ctx.beginPath();
  ctx.moveTo(p1.x, yTarget);
  ctx.lineTo(p1.x + 150, yTarget);
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#d1d4dc';
  ctx.font = '10px monospace';
  ctx.fillText(`Entry: ${entry.toFixed(2)}`, p1.x + 5, yEntry - 4);
  ctx.fillText(`Target: ${target.toFixed(2)}`, p1.x + 5, yTarget - 4);
  const pnl = isLong ? target - entry : entry - target;
  const pnlPct = ((pnl / entry) * 100).toFixed(2);
  ctx.fillStyle = profitColor ? '#26a69a' : '#ef5350';
  ctx.fillText(`${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} (${pnlPct}%)`, p1.x + 5, (yEntry + yTarget) / 2);
};

// ─── Gann Box ───

const renderGannBox: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  setupStroke(ctx, d);
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const rw = Math.abs(p2.x - p1.x);
  const rh = Math.abs(p2.y - p1.y);
  ctx.strokeRect(x, y, rw, rh);
  // Grid lines
  ctx.setLineDash([2, 2]);
  ctx.lineWidth = 0.5;
  const levels = [0.25, 0.382, 0.5, 0.618, 0.75];
  for (const l of levels) {
    ctx.beginPath();
    ctx.moveTo(x, y + rh * l);
    ctx.lineTo(x + rw, y + rh * l);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + rw * l, y);
    ctx.lineTo(x + rw * l, y + rh);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Diagonal
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
};

// ─── Date/Price Range ───

const renderDatePriceRange: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const rw = Math.abs(p2.x - p1.x);
  const rh = Math.abs(p2.y - p1.y);
  ctx.fillStyle = 'rgba(41, 98, 255, 0.08)';
  ctx.fillRect(x, y, rw, rh);
  ctx.strokeStyle = '#2962ff';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(x, y, rw, rh);
  ctx.setLineDash([]);
  // Labels
  const priceDiff = d.points[1].price - d.points[0].price;
  const pctDiff = ((priceDiff / d.points[0].price) * 100).toFixed(2);
  ctx.fillStyle = '#d1d4dc';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)} (${pctDiff}%)`,
    x + rw / 2,
    y + rh / 2
  );
};

// ─── Polyline / Path / ArrowDraw ───

const renderPolyline: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const pts = d.points.map(p => toXY(coord, p.time, p.price)).filter(Boolean) as { x: number; y: number }[];
  if (pts.length < 2) return;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
};

// ─── Arc / Curve ───

const renderArc: Renderer = (ctx, d, coord) => {
  if (d.points.length < 3) return;
  const pts = d.points.map(p => toXY(coord, p.time, p.price)).filter(Boolean) as { x: number; y: number }[];
  if (pts.length < 3) return;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
  ctx.stroke();
};

// ─── Fallback: generic multi-point line ───

const renderGeneric: Renderer = (ctx, d, coord) => {
  if (d.points.length === 0) return;
  if (d.points.length === 1) {
    const p = toXY(coord, d.points[0].time, d.points[0].price);
    if (!p) return;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  renderPolyline(ctx, d, coord, 0, 0);
};

// ─── Renderer map ───

const RENDERERS: Record<string, Renderer> = {
  trendline: renderTrendline,
  ray: renderRay,
  extendedline: renderExtendedLine,
  horizontalline: renderHorizontalLine,
  verticalline: renderVerticalLine,
  crossline: renderCrossLine,
  horizontalray: renderHorizontalRay,
  infoline: renderInfoLine,
  trendangle: renderTrendAngle,
  parallelchannel: renderParallelChannel,
  fibonacci: renderFibonacci,
  fibextension: renderFibonacci,
  rectangle: renderRectangle,
  rotatedrectangle: renderRectangle,
  circle: renderCircle,
  ellipse: renderEllipse,
  triangle: renderTriangle,
  trianglepattern: renderTriangle,
  arrowmarkup: renderArrowUp,
  arrowmarkdown: renderArrowDown,
  arrowmarker: renderArrowUp,
  brush: renderBrush,
  highlighter: renderBrush,
  text: renderText,
  pitchfork: renderPitchfork,
  schiffpitchfork: renderPitchfork,
  modifiedschiff: renderPitchfork,
  insidepitchfork: renderPitchfork,
  longposition: renderPosition,
  shortposition: renderPosition,
  gannbox: renderGannBox,
  gannsquare: renderGannBox,
  gannsquarefixed: renderGannBox,
  gannfan: renderGannBox,
  pricerange: renderDatePriceRange,
  daterange: renderDatePriceRange,
  datepricerange: renderDatePriceRange,
  path: renderPolyline,
  polyline: renderPolyline,
  arrowdraw: renderPolyline,
  arc: renderArc,
  curve: renderArc,
  doublecurve: renderArc,
};

export function renderDrawing(
  ctx: CanvasRenderingContext2D,
  drawing: ChartDrawing,
  coord: CoordHelper,
  w: number,
  h: number
) {
  if (!drawing.visible) return;
  const renderer = RENDERERS[drawing.type] || renderGeneric;
  ctx.save();
  renderer(ctx, drawing, coord, w, h);
  ctx.restore();

  // Render text label if present
  const text = drawing.props?.text;
  if (text && text.trim() && drawing.points.length >= 2) {
    const p1 = toXY(coord, drawing.points[0].time, drawing.points[0].price);
    const p2 = toXY(coord, drawing.points[1].time, drawing.points[1].price);
    if (p1 && p2) {
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const fontSize = drawing.props?.textSize || 14;
      const bold = drawing.props?.textBold ? 'bold ' : '';
      const italic = drawing.props?.textItalic ? 'italic ' : '';
      ctx.save();
      ctx.font = `${italic}${bold}${fontSize}px sans-serif`;
      ctx.fillStyle = drawing.props?.textColor || drawing.color;
      ctx.textAlign = 'center';
      const vAlign = drawing.props?.textVAlign || 'middle';
      const offset = vAlign === 'top' ? -fontSize : vAlign === 'bottom' ? fontSize * 1.2 : 0;
      ctx.fillText(text, mx, my + offset);
      ctx.restore();
    }
  } else if (text && text.trim() && drawing.points.length === 1) {
    const p = toXY(coord, drawing.points[0].time, drawing.points[0].price);
    if (p) {
      const fontSize = drawing.props?.textSize || 14;
      const bold = drawing.props?.textBold ? 'bold ' : '';
      const italic = drawing.props?.textItalic ? 'italic ' : '';
      ctx.save();
      ctx.font = `${italic}${bold}${fontSize}px sans-serif`;
      ctx.fillStyle = drawing.props?.textColor || drawing.color;
      ctx.textAlign = 'center';
      ctx.fillText(text, p.x, p.y - 10);
      ctx.restore();
    }
  }
}

// ─── Anchors ───

export function getAnchors(drawing: ChartDrawing, coord: CoordHelper): AnchorPoint[] {
  return drawing.points
    .map((p, i) => {
      const x = coord.timeToX(p.time);
      const y = coord.priceToY(p.price);
      if (x === null || y === null) return null;
      return { x, y, pointIndex: i };
    })
    .filter(Boolean) as AnchorPoint[];
}

export function renderAnchors(ctx: CanvasRenderingContext2D, anchors: AnchorPoint[]) {
  for (const a of anchors) {
    // Outer ring
    ctx.strokeStyle = '#2962ff';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#131722';
    ctx.beginPath();
    ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
