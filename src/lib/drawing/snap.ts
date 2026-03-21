import type { CandleData, CoordHelper } from './types';

const SNAP_PIXEL_RADIUS = 12;

/** Find nearest OHLC price to snap to within radius */
export function snapToCandle(
  mx: number, my: number,
  candles: CandleData[],
  coord: CoordHelper
): { time: number; price: number } | null {
  let bestDist = SNAP_PIXEL_RADIUS;
  let bestResult: { time: number; price: number } | null = null;

  for (const c of candles) {
    const x = coord.timeToX(c.time);
    if (x === null) continue;
    const xDist = Math.abs(mx - x);
    if (xDist > 30) continue; // Skip candles too far horizontally

    for (const price of [c.open, c.high, c.low, c.close]) {
      const y = coord.priceToY(price);
      if (y === null) continue;
      const dist = Math.hypot(mx - x, my - y);
      if (dist < bestDist) {
        bestDist = dist;
        bestResult = { time: c.time, price };
      }
    }
  }

  return bestResult;
}
