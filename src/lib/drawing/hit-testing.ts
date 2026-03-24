import type { ChartDrawing, CoordHelper, AnchorPoint } from './types';
import { distToSegment, distToLine, distToRay, pointInRect, distToEllipse, distToPolyline } from './math';
import { getAnchors } from './renderers';

const HIT_RADIUS = 8;
const ANCHOR_RADIUS = 8;

function toXY(coord: CoordHelper, time: number, price: number): { x: number; y: number } | null {
  const x = coord.timeToX(time);
  const y = coord.priceToY(price);
  if (x === null || y === null) return null;
  return { x, y };
}

/** Returns the index of the anchor point hit, or -1 */
export function hitTestAnchors(
  drawing: ChartDrawing,
  mx: number, my: number,
  coord: CoordHelper
): number {
  const anchors = getAnchors(drawing, coord);
  for (const a of anchors) {
    if (Math.hypot(mx - a.x, my - a.y) <= ANCHOR_RADIUS) {
      return a.pointIndex;
    }
  }
  return -1;
}

/** Returns true if the mouse is close enough to the drawing body */
export function hitTestDrawing(
  drawing: ChartDrawing,
  mx: number, my: number,
  coord: CoordHelper,
  w: number, h: number
): boolean {
  if (!drawing.visible) return false;
  const type = drawing.type;

  // Single-point types
  if (['horizontalline'].includes(type)) {
    if (drawing.points.length < 1) return false;
    const y = coord.priceToY(drawing.points[0].price);
    if (y === null) return false;
    return Math.abs(my - y) <= HIT_RADIUS;
  }

  if (['verticalline'].includes(type)) {
    if (drawing.points.length < 1) return false;
    const x = coord.timeToX(drawing.points[0].time);
    if (x === null) return false;
    return Math.abs(mx - x) <= HIT_RADIUS;
  }

  if (['crossline'].includes(type)) {
    if (drawing.points.length < 1) return false;
    const p = toXY(coord, drawing.points[0].time, drawing.points[0].price);
    if (!p) return false;
    return Math.abs(mx - p.x) <= HIT_RADIUS || Math.abs(my - p.y) <= HIT_RADIUS;
  }

  if (['arrowmarkup', 'arrowmarkdown', 'arrowmarker', 'text', 'emoji'].includes(type)) {
    if (drawing.points.length < 1) return false;
    const p = toXY(coord, drawing.points[0].time, drawing.points[0].price);
    if (!p) return false;
    return Math.hypot(mx - p.x, my - p.y) <= 15;
  }

  // Two-point line types
  if (['trendline', 'infoline', 'trendangle'].includes(type)) {
    if (drawing.points.length < 2) return false;
    const p1 = toXY(coord, drawing.points[0].time, drawing.points[0].price);
    const p2 = toXY(coord, drawing.points[1].time, drawing.points[1].price);
    if (!p1 || !p2) return false;
    return distToSegment(mx, my, p1.x, p1.y, p2.x, p2.y) <= HIT_RADIUS;
  }

  if (['ray', 'horizontalray'].includes(type)) {
    if (drawing.points.length < 2) return false;
    const p1 = toXY(coord, drawing.points[0].time, drawing.points[0].price);
    const p2 = toXY(coord, drawing.points[1].time, drawing.points[1].price);
    if (!p1 || !p2) return false;
    return distToRay(mx, my, p1.x, p1.y, p2.x, p2.y) <= HIT_RADIUS;
  }

  if (['extendedline'].includes(type)) {
    if (drawing.points.length < 2) return false;
    const p1 = toXY(coord, drawing.points[0].time, drawing.points[0].price);
    const p2 = toXY(coord, drawing.points[1].time, drawing.points[1].price);
    if (!p1 || !p2) return false;
    return distToLine(mx, my, p1.x, p1.y, p2.x, p2.y) <= HIT_RADIUS;
  }

  // Rectangle-like
  if (['rectangle', 'rotatedrectangle', 'pricerange', 'daterange', 'datepricerange',
    'gannbox', 'gannsquare', 'gannsquarefixed', 'longposition', 'shortposition',
    'fixedrangevolume', 'anchoredvolume'].includes(type)) {
    if (drawing.points.length < 2) return false;
    const p1 = toXY(coord, drawing.points[0].time, drawing.points[0].price);
    const p2 = toXY(coord, drawing.points[1].time, drawing.points[1].price);
    if (!p1 || !p2) return false;
    // Hit on border or inside
    if (pointInRect(mx, my, p1.x, p1.y, p2.x, p2.y)) return true;
    // Also check edges
    const left = Math.min(p1.x, p2.x), right = Math.max(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y), bottom = Math.max(p1.y, p2.y);
    if (Math.abs(mx - left) <= HIT_RADIUS || Math.abs(mx - right) <= HIT_RADIUS) {
      if (my >= top - HIT_RADIUS && my <= bottom + HIT_RADIUS) return true;
    }
    if (Math.abs(my - top) <= HIT_RADIUS || Math.abs(my - bottom) <= HIT_RADIUS) {
      if (mx >= left - HIT_RADIUS && mx <= right + HIT_RADIUS) return true;
    }
    return false;
  }

  // Circle
  if (type === 'circle') {
    if (drawing.points.length < 2) return false;
    const p1 = toXY(coord, drawing.points[0].time, drawing.points[0].price);
    const p2 = toXY(coord, drawing.points[1].time, drawing.points[1].price);
    if (!p1 || !p2) return false;
    const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const dist = Math.hypot(mx - p1.x, my - p1.y);
    return Math.abs(dist - r) <= HIT_RADIUS || dist <= r;
  }

  // Ellipse
  if (type === 'ellipse') {
    if (drawing.points.length < 2) return false;
    const p1 = toXY(coord, drawing.points[0].time, drawing.points[0].price);
    const p2 = toXY(coord, drawing.points[1].time, drawing.points[1].price);
    if (!p1 || !p2) return false;
    return distToEllipse(mx, my, p1.x, p1.y, Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y)) <= HIT_RADIUS;
  }

  // Fibonacci
  if (['fibonacci', 'fibextension'].includes(type)) {
    if (drawing.points.length < 2) return false;
    const y1 = coord.priceToY(drawing.points[0].price);
    const y2 = coord.priceToY(drawing.points[1].price);
    if (y1 === null || y2 === null) return false;
    // Check if mouse is near any fib level line
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const priceDiff = drawing.points[1].price - drawing.points[0].price;
    for (const l of levels) {
      const price = drawing.points[0].price + priceDiff * l;
      const y = coord.priceToY(price);
      if (y !== null && Math.abs(my - y) <= HIT_RADIUS) return true;
    }
    return false;
  }

  // Multi-point types (polyline, brush, path, etc.)
  if (['brush', 'highlighter', 'path', 'polyline', 'arrowdraw'].includes(type)) {
    if (drawing.points.length < 2) return false;
    const pts = drawing.points
      .map(p => toXY(coord, p.time, p.price))
      .filter(Boolean) as { x: number; y: number }[];
    if (pts.length < 2) return false;
    return distToPolyline(mx, my, pts) <= (type === 'highlighter' ? 15 : HIT_RADIUS);
  }

  // Multi-point patterns (XABCD, cypher, abcd, headshoulders, threedrives)
  if (['xabcd', 'cypher', 'abcd', 'headshoulders', 'threedrives'].includes(type)) {
    if (drawing.points.length < 2) return false;
    const pts = drawing.points
      .map(p => toXY(coord, p.time, p.price))
      .filter(Boolean) as { x: number; y: number }[];
    // Check zigzag segments
    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegment(mx, my, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= HIT_RADIUS) return true;
    }
    // Check cross-lines (XB, AC, XD, BD)
    if (pts.length >= 5) {
      if (distToSegment(mx, my, pts[0].x, pts[0].y, pts[2].x, pts[2].y) <= HIT_RADIUS) return true;
      if (distToSegment(mx, my, pts[1].x, pts[1].y, pts[3].x, pts[3].y) <= HIT_RADIUS) return true;
      if (distToSegment(mx, my, pts[0].x, pts[0].y, pts[4].x, pts[4].y) <= HIT_RADIUS) return true;
      if (distToSegment(mx, my, pts[2].x, pts[2].y, pts[4].x, pts[4].y) <= HIT_RADIUS) return true;
    }
    return false;
  }

  // Triangle and 3-point shapes
  if (['triangle', 'trianglepattern', 'parallelchannel', 'pitchfork',
    'schiffpitchfork', 'modifiedschiff', 'insidepitchfork', 'arc', 'curve'].includes(type)) {
    if (drawing.points.length < 2) return false;
    const pts = drawing.points
      .map(p => toXY(coord, p.time, p.price))
      .filter(Boolean) as { x: number; y: number }[];
    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegment(mx, my, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= HIT_RADIUS) return true;
    }
    if (['triangle', 'trianglepattern'].includes(type) && pts.length >= 3) {
      if (distToSegment(mx, my, pts[pts.length - 1].x, pts[pts.length - 1].y, pts[0].x, pts[0].y) <= HIT_RADIUS) return true;
    }
    return false;
  }

  // Fallback: check all point pairs as segments
  if (drawing.points.length >= 2) {
    const pts = drawing.points
      .map(p => toXY(coord, p.time, p.price))
      .filter(Boolean) as { x: number; y: number }[];
    return distToPolyline(mx, my, pts) <= HIT_RADIUS;
  }

  if (drawing.points.length === 1) {
    const p = toXY(coord, drawing.points[0].time, drawing.points[0].price);
    if (!p) return false;
    return Math.hypot(mx - p.x, my - p.y) <= 15;
  }

  return false;
}
