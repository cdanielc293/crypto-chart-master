import type { ChartDrawing, CoordHelper, AnchorPoint, CandleData } from './types';

type Renderer = (
  ctx: CanvasRenderingContext2D,
  drawing: ChartDrawing,
  coord: CoordHelper,
  w: number,
  h: number,
  candles?: CandleData[]
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

  const props = d.props || {};
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Draw the main line
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // Arrow ends
  const arrowSize = Math.max(8, d.lineWidth * 3);
  const angle = Math.atan2(dy, dx);
  if (props.leftArrow) {
    drawArrowhead(ctx, p1.x, p1.y, angle + Math.PI, arrowSize, d.color);
  }
  if (props.rightArrow) {
    drawArrowhead(ctx, p2.x, p2.y, angle, arrowSize, d.color);
  }

  // Middle point
  if (props.middlePoint) {
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Price labels on price axis
  if (props.priceLabels) {
    ctx.save();
    ctx.fillStyle = d.color;
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    // Draw small labels near the right edge
    const labelX = Math.max(p1.x, p2.x) + 8;
    ctx.fillText(d.points[0].price.toFixed(2), labelX, p1.y + 4);
    ctx.fillText(d.points[1].price.toFixed(2), labelX, p2.y + 4);
    ctx.restore();
  }

  // Stats
  const showStats = d.selected || props.alwaysShowStats;
  if (showStats && hasAnyStats(props)) {
    const statsLines = buildStatsLines(d, p1, p2, props);
    if (statsLines.length > 0) {
      const statsPos = props.statsPosition || 'right';
      let sx: number, sy: number;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      if (statsPos === 'left') { sx = Math.min(p1.x, p2.x) - 8; }
      else if (statsPos === 'center') { sx = midX; }
      else { sx = Math.max(p1.x, p2.x) + 8; }
      sy = midY - (statsLines.length * 14) / 2;

      ctx.save();
      ctx.font = '11px monospace';
      ctx.textAlign = statsPos === 'left' ? 'right' : statsPos === 'center' ? 'center' : 'left';
      // Background
      const metrics = statsLines.map(l => ctx.measureText(l));
      const maxW = Math.max(...metrics.map(m => m.width)) + 8;
      const totalH = statsLines.length * 14 + 6;
      const bgX = statsPos === 'right' ? sx - 4 : statsPos === 'center' ? sx - maxW / 2 - 4 : sx - maxW - 4;
      ctx.fillStyle = 'rgba(19,23,34,0.85)';
      ctx.fillRect(bgX, sy - 12, maxW + 8, totalH);
      ctx.fillStyle = d.color;
      statsLines.forEach((line, i) => {
        ctx.fillText(line, sx, sy + i * 14);
      });
      ctx.restore();
    }
  }
};

function drawArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function hasAnyStats(props: Record<string, any>): boolean {
  return !!(props.statsPriceRange || props.statsPercentChange || props.statsPips || props.statsBarsRange || props.statsDateTimeRange || props.statsDistance || props.statsAngle);
}

function buildStatsLines(d: ChartDrawing, p1: { x: number; y: number }, p2: { x: number; y: number }, props: Record<string, any>): string[] {
  const lines: string[] = [];
  const priceDiff = d.points[1].price - d.points[0].price;
  const pctChange = (priceDiff / d.points[0].price) * 100;
  const timeDiff = d.points[1].time - d.points[0].time;

  if (props.statsPriceRange) {
    lines.push(`${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)}`);
  }
  if (props.statsPercentChange) {
    lines.push(`${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%`);
  }
  if (props.statsPips) {
    lines.push(`${Math.abs(priceDiff * 10000).toFixed(1)} pips`);
  }
  if (props.statsBarsRange) {
    // Approximate bars from time diff (assumes 1-min bars for simplicity)
    const bars = Math.abs(Math.round(timeDiff / 60));
    lines.push(`${bars} bars`);
  }
  if (props.statsDateTimeRange) {
    const d1 = new Date(d.points[0].time * 1000);
    const d2 = new Date(d.points[1].time * 1000);
    lines.push(`${d1.toLocaleDateString()} – ${d2.toLocaleDateString()}`);
  }
  if (props.statsDistance) {
    const dist = Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y));
    lines.push(`${dist}px`);
  }
  if (props.statsAngle) {
    const angle = Math.atan2(p1.y - p2.y, p2.x - p1.x) * (180 / Math.PI);
    lines.push(`${angle.toFixed(1)}°`);
  }
  return lines;
}

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
  const props = d.props || {};
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, h);
  ctx.stroke();

  // Time label at bottom
  if (props.timeLabel !== false) {
    const date = new Date(d.points[0].time * 1000);
    const label = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = d.color;
    ctx.textAlign = 'center';
    // Background pill
    const m = ctx.measureText(label);
    const pw = m.width + 8;
    const ph = 16;
    ctx.fillStyle = 'rgba(19,23,34,0.9)';
    ctx.fillRect(x - pw / 2, h - ph - 2, pw, ph);
    ctx.fillStyle = d.color;
    ctx.fillText(label, x, h - 6);
    ctx.restore();
  }

  // Text along the line
  const text = props.text;
  if (text && text.trim()) {
    ctx.save();
    const fontSize = props.textSize || 12;
    const bold = props.textBold ? 'bold ' : '';
    const italic = props.textItalic ? 'italic ' : '';
    ctx.font = `${italic}${bold}${fontSize}px sans-serif`;
    ctx.fillStyle = props.textColor || d.color;

    const orientation = props.textOrientation || 'horizontal';
    const vAlign = props.textVAlign || 'top';
    const hAlign = props.textHAlign || 'left';

    let ty = vAlign === 'top' ? 20 : vAlign === 'bottom' ? h - 20 : h / 2;
    let tx = hAlign === 'left' ? x + 8 : hAlign === 'right' ? x - 8 : x;

    if (orientation === 'vertical') {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    } else {
      ctx.textAlign = hAlign === 'right' ? 'right' : 'left';
      ctx.fillText(text, tx, ty);
    }
    ctx.restore();
  }
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
  const props = d.props || {};
  setupStroke(ctx, d);
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const rw = Math.abs(p2.x - p1.x);
  const rh = Math.abs(p2.y - p1.y);
  ctx.strokeRect(x, y, rw, rh);
  if (props.showBackground !== false) {
    ctx.save();
    ctx.globalAlpha = props.backgroundOpacity ?? 0.08;
    ctx.fillStyle = props.backgroundColor || d.color;
    ctx.fillRect(x, y, rw, rh);
    ctx.restore();
  }
};

const renderCircle: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  const props = d.props || {};
  const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
  ctx.stroke();
  if (props.showBackground !== false) {
    ctx.save();
    ctx.globalAlpha = props.backgroundOpacity ?? 0.08;
    ctx.fillStyle = props.backgroundColor || d.color;
    ctx.fill();
    ctx.restore();
  }
};

const renderEllipse: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const p1 = toXY(coord, d.points[0].time, d.points[0].price);
  const p2 = toXY(coord, d.points[1].time, d.points[1].price);
  if (!p1 || !p2) return;
  const props = d.props || {};
  const rx = Math.abs(p2.x - p1.x);
  const ry = Math.abs(p2.y - p1.y);
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.ellipse(p1.x, p1.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (props.showBackground !== false) {
    ctx.save();
    ctx.globalAlpha = props.backgroundOpacity ?? 0.08;
    ctx.fillStyle = props.backgroundColor || d.color;
    ctx.fill();
    ctx.restore();
  }
};

const renderTriangle: Renderer = (ctx, d, coord) => {
  if (d.points.length < 3) return;
  const pts = d.points.map(p => toXY(coord, p.time, p.price)).filter(Boolean) as { x: number; y: number }[];
  if (pts.length < 3) return;

  const props = d.props || {};
  const borderColor = props.borderColor || d.color;
  const bgColor = props.backgroundColor || d.color;
  const bgOpacity = props.backgroundOpacity ?? 0.08;
  const showBg = props.showBackground !== false;

  // Border
  setupStroke(ctx, d);
  ctx.strokeStyle = borderColor;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.closePath();
  ctx.stroke();

  // Background fill
  if (showBg) {
    ctx.save();
    ctx.globalAlpha = bgOpacity;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Price/time labels on axes when selected
  if (d.selected && props.priceLabels) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = borderColor;
    ctx.textAlign = 'left';
    d.points.forEach((p, i) => {
      const pt = pts[i];
      if (pt) {
        ctx.fillText(`P${i + 1}: ${p.price.toFixed(2)}`, pt.x + 6, pt.y - 4);
      }
    });
    ctx.restore();
  }
};

// ─── Triangle Pattern (4-point: A, B, C, D) ───

const renderTrianglePattern: Renderer = (ctx, d, coord) => {
  if (d.points.length < 4) {
    // Preview: draw what we have so far as connected lines
    if (d.points.length >= 2) {
      const pts = d.points.map(p => toXY(coord, p.time, p.price)).filter(Boolean) as { x: number; y: number }[];
      if (pts.length >= 2) {
        setupStroke(ctx, d);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
    }
    return;
  }

  const [pA, pB, pC, pD] = d.points.map(p => toXY(coord, p.time, p.price));
  if (!pA || !pB || !pC || !pD) return;

  const props = d.props || {};
  const borderColor = props.borderColor || d.color;
  const bgColor = props.backgroundColor || d.color;
  const bgOpacity = props.backgroundOpacity ?? 0.08;
  const showBg = props.showBackground !== false;

  // Line A→C (upper/lower trendline)
  setupStroke(ctx, d);
  ctx.strokeStyle = borderColor;

  // Extend A→C and B→D lines to find apex
  const acDx = pC.x - pA.x;
  const acDy = pC.y - pA.y;
  const bdDx = pD.x - pB.x;
  const bdDy = pD.y - pB.y;

  // Find intersection (apex) of AC and BD lines
  let apex: { x: number; y: number } | null = null;
  const det = acDx * bdDy - acDy * bdDx;
  if (Math.abs(det) > 0.001) {
    const t = ((pB.x - pA.x) * bdDy - (pB.y - pA.y) * bdDx) / det;
    if (t > 0) {
      apex = { x: pA.x + t * acDx, y: pA.y + t * acDy };
    }
  }

  // Draw the zigzag A→B→C→D
  ctx.beginPath();
  ctx.moveTo(pA.x, pA.y);
  ctx.lineTo(pB.x, pB.y);
  ctx.lineTo(pC.x, pC.y);
  ctx.lineTo(pD.x, pD.y);
  ctx.stroke();

  // Draw trendlines A→C and B→D (extended to apex or further)
  ctx.setLineDash([6, 3]);
  const extendTarget = apex || { x: Math.max(pC.x, pD.x) + 100, y: (pC.y + pD.y) / 2 };

  // A→C extended
  ctx.beginPath();
  ctx.moveTo(pA.x, pA.y);
  ctx.lineTo(extendTarget.x, pA.y + (extendTarget.x - pA.x) * (acDy / (acDx || 1)));
  ctx.stroke();

  // B→D extended
  ctx.beginPath();
  ctx.moveTo(pB.x, pB.y);
  ctx.lineTo(extendTarget.x, pB.y + (extendTarget.x - pB.x) * (bdDy / (bdDx || 1)));
  ctx.stroke();
  ctx.setLineDash([]);

  // Background fill (polygon A→B→C→D)
  if (showBg) {
    ctx.save();
    ctx.globalAlpha = bgOpacity;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.lineTo(pC.x, pC.y);
    ctx.lineTo(pD.x, pD.y);
    ctx.closePath();
    ctx.fill();

    // Also fill extended triangle to apex
    if (apex) {
      ctx.beginPath();
      ctx.moveTo(pC.x, pC.y);
      ctx.lineTo(pD.x, pD.y);
      ctx.lineTo(apex.x, apex.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Labels (A, B, C, D)
  const labels = ['A', 'B', 'C', 'D'];
  const pts = [pA, pB, pC, pD];
  ctx.save();
  const fontSize = props.textSize || 12;
  const bold = props.textBold ? 'bold ' : '';
  const italic = props.textItalic ? 'italic ' : '';
  ctx.font = `${italic}${bold}${fontSize}px sans-serif`;
  ctx.fillStyle = props.textColor || borderColor;
  ctx.textAlign = 'center';
  pts.forEach((pt, i) => {
    // Place label above or below depending on position
    const isHigh = i === 0 || i === 2; // A, C are typically on one side
    const offsetY = isHigh ? -12 : 18;
    ctx.fillText(labels[i], pt.x, pt.y + offsetY);
  });
  ctx.restore();
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

// ─── Emoji ───

const renderEmoji: Renderer = (ctx, d, coord) => {
  if (d.points.length < 1) return;
  const p = toXY(coord, d.points[0].time, d.points[0].price);
  if (!p) return;
  const emoji = d.props?.emoji || '😀';
  const size = d.props?.emojiSize || 32;
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, p.x, p.y);
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
// ─── XABCD Pattern ───

const renderXabcd: Renderer = (ctx, d, coord) => {
  if (d.points.length < 2) return;
  const props = d.props || {};
  const pts = d.points.map(p => toXY(coord, p.time, p.price)).filter(Boolean) as { x: number; y: number }[];
  if (pts.length < 2) return;

  const borderColor = props.borderColor || d.color;
  const showBg = props.showBackground !== false;
  const bgColor = props.backgroundColor || d.color;
  const bgOpacity = props.backgroundOpacity ?? 0.08;

  setupStroke(ctx, d);
  ctx.strokeStyle = borderColor;

  // Draw zigzag path X→A→B→C→D
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();

  // Draw connecting lines XB, XD, AC, BD (dashed) for pattern visualization
  if (pts.length >= 5) {
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.globalAlpha = 0.5;
    // X→B
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[2].x, pts[2].y); ctx.stroke();
    // A→C
    ctx.beginPath(); ctx.moveTo(pts[1].x, pts[1].y); ctx.lineTo(pts[3].x, pts[3].y); ctx.stroke();
    // X→D
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[4].x, pts[4].y); ctx.stroke();
    // B→D
    ctx.beginPath(); ctx.moveTo(pts[2].x, pts[2].y); ctx.lineTo(pts[4].x, pts[4].y); ctx.stroke();
    ctx.restore();
  }

  // Background fill - two triangles: XAB and BCD
  if (showBg && pts.length >= 5) {
    ctx.save();
    ctx.globalAlpha = bgOpacity;
    ctx.fillStyle = bgColor;
    // Triangle XAB
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.closePath();
    ctx.fill();
    // Triangle BCD
    ctx.beginPath();
    ctx.moveTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.lineTo(pts[4].x, pts[4].y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Fibonacci ratio labels on legs
  if (pts.length >= 5) {
    ctx.save();
    const ratioFont = `${props.textSize || 11}px sans-serif`;
    ctx.font = ratioFont;
    ctx.fillStyle = props.textColor || borderColor;
    ctx.textAlign = 'center';

    // AB/XA ratio
    const xaRange = Math.abs(d.points[1].price - d.points[0].price);
    const abRange = Math.abs(d.points[2].price - d.points[1].price);
    if (xaRange > 0) {
      const abRatio = (abRange / xaRange).toFixed(3);
      const mx1 = (pts[1].x + pts[2].x) / 2;
      const my1 = (pts[1].y + pts[2].y) / 2;
      ctx.fillText(abRatio, mx1, my1 - 8);
    }

    // BC/AB ratio
    const bcRange = Math.abs(d.points[3].price - d.points[2].price);
    if (abRange > 0) {
      const bcRatio = (bcRange / abRange).toFixed(3);
      const mx2 = (pts[2].x + pts[3].x) / 2;
      const my2 = (pts[2].y + pts[3].y) / 2;
      ctx.fillText(bcRatio, mx2, my2 - 8);
    }

    // CD/BC ratio
    const cdRange = Math.abs(d.points[4].price - d.points[3].price);
    if (bcRange > 0) {
      const cdRatio = (cdRange / bcRange).toFixed(3);
      const mx3 = (pts[3].x + pts[4].x) / 2;
      const my3 = (pts[3].y + pts[4].y) / 2;
      ctx.fillText(cdRatio, mx3, my3 - 8);
    }

    ctx.restore();
  }

  // Point labels (X, A, B, C, D)
  const labels = ['X', 'A', 'B', 'C', 'D'];
  ctx.save();
  const fontSize = props.textSize || 12;
  const bold = props.textBold ? 'bold ' : '';
  const italic = props.textItalic ? 'italic ' : '';
  ctx.font = `${italic}${bold}${fontSize}px sans-serif`;
  ctx.fillStyle = props.textColor || borderColor;
  ctx.textAlign = 'center';
  pts.forEach((pt, i) => {
    if (i >= labels.length) return;
    // Place above highs, below lows
    const prev = i > 0 ? pts[i - 1] : null;
    const isHigh = prev ? pt.y < prev.y : true;
    const offsetY = isHigh ? -(fontSize + 4) : (fontSize + 8);
    ctx.fillText(labels[i], pt.x, pt.y + offsetY);
  });
  ctx.restore();
};

// ─── Anchored VWAP ───
const renderAnchoredVwap: Renderer = (ctx, d, coord, w, _h, candles) => {
  if (d.points.length < 1 || !candles || candles.length === 0) return;
  const anchorTime = d.points[0].time;
  const startIdx = candles.findIndex(c => c.time >= anchorTime);
  if (startIdx < 0) return;
  let cumVP = 0, cumV = 0;
  const pts: { x: number; y: number }[] = [];
  for (let i = startIdx; i < candles.length; i++) {
    const c = candles[i];
    const tp = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1;
    cumVP += tp * vol; cumV += vol;
    const vwap = cumVP / cumV;
    const x = coord.timeToX(c.time);
    const y = coord.priceToY(vwap);
    if (x !== null && y !== null) pts.push({ x, y });
  }
  if (pts.length < 1) return;
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  const last = pts[pts.length - 1];
  ctx.save();
  ctx.font = '10px monospace';
  ctx.fillStyle = d.color;
  ctx.textAlign = 'left';
  ctx.fillText('AVWAP', last.x + 5, last.y - 4);
  ctx.restore();
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
  trianglepattern: renderTrianglePattern,
  arrowmarkup: renderArrowUp,
  arrowmarkdown: renderArrowDown,
  arrowmarker: renderArrowUp,
  brush: renderBrush,
  highlighter: renderBrush,
  text: renderText,
  emoji: renderEmoji,
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
  xabcd: renderXabcd,
  cypher: renderXabcd,
  abcd: renderXabcd,
  headshoulders: renderXabcd,
  threedrives: renderXabcd,
  anchoredvwap: renderAnchoredVwap,
};

  if (d.points.length < 1 || !candles || candles.length === 0) return;
  const anchorTime = d.points[0].time;
  
  // Find candles from anchor point forward
  const startIdx = candles.findIndex(c => c.time >= anchorTime);
  if (startIdx < 0) return;
  
  let cumVolumePrice = 0;
  let cumVolume = 0;
  const vwapPoints: { x: number; y: number }[] = [];
  
  for (let i = startIdx; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1;
    cumVolumePrice += typicalPrice * vol;
    cumVolume += vol;
    const vwap = cumVolumePrice / cumVolume;
    const x = coord.timeToX(c.time);
    const y = coord.priceToY(vwap);
    if (x !== null && y !== null) {
      vwapPoints.push({ x, y });
    }
  }
  
  if (vwapPoints.length < 1) return;
  
  setupStroke(ctx, d);
  ctx.beginPath();
  ctx.moveTo(vwapPoints[0].x, vwapPoints[0].y);
  for (let i = 1; i < vwapPoints.length; i++) {
    ctx.lineTo(vwapPoints[i].x, vwapPoints[i].y);
  }
  ctx.stroke();
  
  // Label
  const last = vwapPoints[vwapPoints.length - 1];
  ctx.save();
  ctx.font = '10px monospace';
  ctx.fillStyle = d.color;
  ctx.textAlign = 'left';
  ctx.fillText('AVWAP', last.x + 5, last.y - 4);
  ctx.restore();
};

export function renderDrawing(
  ctx: CanvasRenderingContext2D,
  drawing: ChartDrawing,
  coord: CoordHelper,
  w: number,
  h: number,
  candles?: CandleData[]
) {
  if (!drawing.visible) return;
  const renderer = RENDERERS[drawing.type] || renderGeneric;
  ctx.save();
  renderer(ctx, drawing, coord, w, h, candles);
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
