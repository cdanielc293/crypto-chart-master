import type { Interval } from '@/types/chart';

export interface CandleLike {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const INTERVAL_DURATION_SECONDS: Record<Interval, number> = {
  '1s': 1,
  '5s': 5,
  '10s': 10,
  '15s': 15,
  '30s': 30,
  '45s': 45,
  '1m': 60,
  '2m': 120,
  '3m': 180,
  '5m': 300,
  '10m': 600,
  '15m': 900,
  '30m': 1800,
  '45m': 2700,
  '1h': 3600,
  '2h': 7200,
  '3h': 10800,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
  '1M': 2592000,
  '3M': 7776000,
  '6M': 15552000,
  '12M': 31104000,
};

const SOURCE_INTERVAL_MAP: Record<Interval, string> = {
  '1s': '1s',
  '5s': '1s',
  '10s': '1s',
  '15s': '1s',
  '30s': '1s',
  '45s': '1s',
  '1m': '1m',
  '2m': '1m',
  '3m': '3m',
  '5m': '5m',
  '10m': '5m',
  '15m': '15m',
  '30m': '30m',
  '45m': '15m',
  '1h': '1h',
  '2h': '2h',
  '3h': '3h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
  '1M': '1M',
  '3M': '1M',
  '6M': '1M',
  '12M': '1M',
};

function parseBinanceIntervalSeconds(interval: string): number {
  const match = interval.match(/^(\d+)([smhdwM])$/);
  if (!match) return 60;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return value;
  if (unit === 'm') return value * 60;
  if (unit === 'h') return value * 3600;
  if (unit === 'd') return value * 86400;
  if (unit === 'w') return value * 604800;
  return value * 2592000;
}

export function getBinanceSourceInterval(interval: Interval): string {
  return SOURCE_INTERVAL_MAP[interval];
}

export function shouldAggregateInterval(interval: Interval): boolean {
  const sourceInterval = getBinanceSourceInterval(interval);
  if (sourceInterval === interval) return false;
  if (interval === '3M' || interval === '6M' || interval === '12M') return true;
  return INTERVAL_DURATION_SECONDS[interval] > parseBinanceIntervalSeconds(sourceInterval);
}

export function getEstimatedSourceBarsPerTargetBar(interval: Interval): number {
  const sourceInterval = getBinanceSourceInterval(interval);
  if (sourceInterval === interval) return 1;

  if (interval === '3M') return 3;
  if (interval === '6M') return 6;
  if (interval === '12M') return 12;

  const sourceSeconds = parseBinanceIntervalSeconds(sourceInterval);
  const targetSeconds = INTERVAL_DURATION_SECONDS[interval];
  return Math.max(1, Math.ceil(targetSeconds / sourceSeconds));
}

export function getIntervalDurationMs(interval: Interval): number {
  return INTERVAL_DURATION_SECONDS[interval] * 1000;
}

export function toIntervalBucketStart(timeSec: number, interval: Interval): number {
  if (interval === '1w') {
    const dayStart = Math.floor(timeSec / 86400) * 86400;
    const date = new Date(dayStart * 1000);
    const weekdayFromMonday = (date.getUTCDay() + 6) % 7;
    return dayStart - weekdayFromMonday * 86400;
  }

  if (interval === '1M' || interval === '3M' || interval === '6M' || interval === '12M') {
    const date = new Date(timeSec * 1000);
    const months = interval === '1M' ? 1 : Number(interval.replace('M', ''));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const bucketMonth = Math.floor(month / months) * months;
    return Math.floor(Date.UTC(year, bucketMonth, 1, 0, 0, 0) / 1000);
  }

  const bucketSeconds = INTERVAL_DURATION_SECONDS[interval];
  return Math.floor(timeSec / bucketSeconds) * bucketSeconds;
}

export function aggregateCandlesToInterval<T extends CandleLike>(candles: T[], interval: Interval): CandleLike[] {
  if (candles.length === 0) return [];

  const sorted = [...candles].sort((a, b) => a.time - b.time);
  if (!shouldAggregateInterval(interval)) {
    const deduped = new Map<number, CandleLike>();
    for (const candle of sorted) {
      deduped.set(candle.time, {
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
    }
    return Array.from(deduped.values()).sort((a, b) => a.time - b.time);
  }

  const byBucket = new Map<number, CandleLike>();
  for (const candle of sorted) {
    const bucketTime = toIntervalBucketStart(candle.time, interval);
    const existing = byBucket.get(bucketTime);

    if (!existing) {
      byBucket.set(bucketTime, {
        time: bucketTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
      continue;
    }

    existing.high = Math.max(existing.high, candle.high);
    existing.low = Math.min(existing.low, candle.low);
    existing.close = candle.close;
    existing.volume += candle.volume;
  }

  return Array.from(byBucket.values()).sort((a, b) => a.time - b.time);
}
