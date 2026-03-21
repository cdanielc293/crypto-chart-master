// Geometry math for hit testing drawings

export function distToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function distToLine(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(px - x1, py - y1);
  return Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / len;
}

export function distToRay(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  if (t < 0) return Math.hypot(px - x1, py - y1);
  // ray extends past t=1
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function pointInRect(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): boolean {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  return px >= left && px <= right && py >= top && py <= bottom;
}

export function distToEllipse(
  px: number, py: number,
  cx: number, cy: number,
  rx: number, ry: number
): number {
  if (rx === 0 || ry === 0) return Math.hypot(px - cx, py - cy);
  // Normalized distance
  const nx = (px - cx) / rx;
  const ny = (py - cy) / ry;
  const d = Math.hypot(nx, ny);
  // Distance to boundary
  return Math.abs(d - 1) * Math.min(rx, ry);
}

export function distToPolyline(
  px: number, py: number,
  points: { x: number; y: number }[]
): number {
  let minDist = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const d = distToSegment(px, py, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    if (d < minDist) minDist = d;
  }
  return minDist;
}
