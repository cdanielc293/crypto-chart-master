import { supabase } from '@/integrations/supabase/client';
import type { Interval } from '@/types/chart';

export interface RawKline {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── Binance fetch helpers ───

const BINANCE_ENDPOINTS = [
  'https://data-api.binance.vision',
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
];

/** Fetch klines from Binance with optional startTime/endTime (ms) */
async function fetchFromBinance(
  symbol: string,
  interval: string,
  limit = 1000,
  startTime?: number,
  endTime?: number,
): Promise<RawKline[]> {
  let lastError: unknown = null;
  for (const endpoint of BINANCE_ENDPOINTS) {
    try {
      let url = `${endpoint}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      if (startTime) url += `&startTime=${startTime}`;
      if (endTime) url += `&endTime=${endTime}`;
      const res = await fetch(url);
      const json = await res.json();
      if (Array.isArray(json)) {
        return json.map((k: any) => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
      }
      lastError = new Error(json?.msg || 'Invalid response');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Failed to fetch klines from all Binance endpoints');
}

// ─── Supabase cache helpers ───

/** Get all cached klines for a symbol+interval, ordered by time */
async function getCachedKlines(symbol: string, interval: string): Promise<RawKline[]> {
  try {
    // Supabase has a default 1000 row limit; paginate to get all
    const allData: RawKline[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('klines')
        .select('time, open, high, low, close, volume')
        .eq('symbol', symbol)
        .eq('interval', interval)
        .order('time', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error || !data || data.length === 0) break;
      allData.push(...(data as RawKline[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return allData;
  } catch {
    return [];
  }
}

/** Upsert klines into cache in chunks */
async function upsertKlines(symbol: string, interval: string, klines: RawKline[]) {
  if (klines.length === 0) return;

  const rows = klines.map(k => ({
    symbol,
    interval,
    time: k.time,
    open: k.open,
    high: k.high,
    low: k.low,
    close: k.close,
    volume: k.volume,
  }));

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await supabase
      .from('klines')
      .upsert(chunk, { onConflict: 'symbol,interval,time' });
  }
}

// ─── Interval duration helper (in ms) ───

function intervalToMs(interval: Interval): number {
  const units: Record<string, number> = {
    s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000, M: 2_592_000_000,
  };
  const match = interval.match(/^(\d+)([smhdwM])$/);
  if (!match) return 86_400_000;
  return parseInt(match[1]) * (units[match[2]] || 86_400_000);
}

// ─── Backfill tracking (per session, avoid duplicate backfills) ───

const backfillInProgress = new Set<string>();
const backfillComplete = new Set<string>();

/**
 * Backfill ALL historical klines from Binance for a symbol+interval.
 * Fetches backwards from the oldest cached candle (or from now) in batches of 1000.
 * Runs in the background, doesn't block the UI.
 */
async function backfillHistory(symbol: string, interval: Interval, oldestCachedTime?: number) {
  const key = `${symbol}:${interval}`;
  if (backfillInProgress.has(key) || backfillComplete.has(key)) return;
  backfillInProgress.add(key);

  const candleDurationMs = intervalToMs(interval);
  // Start fetching from just before the oldest cached candle
  let endTime = oldestCachedTime
    ? oldestCachedTime * 1000 - 1  // ms, just before oldest cached
    : Date.now();

  let totalFetched = 0;
  const RATE_LIMIT_DELAY = 300; // ms between requests to avoid IP ban

  try {
    while (true) {
      const batch = await fetchFromBinance(symbol, interval, 1000, undefined, endTime);

      if (batch.length === 0) break; // no more data, reached listing date

      // Save to DB
      await upsertKlines(symbol, interval, batch);
      totalFetched += batch.length;

      // Move endTime to before the oldest candle in this batch
      const oldestInBatch = batch[0].time * 1000;
      endTime = oldestInBatch - 1;

      // If we got less than 1000, we've reached the beginning
      if (batch.length < 1000) break;

      // Rate limit: small delay between requests
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }

    console.log(`[KlineCache] Backfill complete for ${key}: ${totalFetched} candles total`);
    backfillComplete.add(key);
  } catch (err) {
    console.warn(`[KlineCache] Backfill error for ${key}:`, err);
  } finally {
    backfillInProgress.delete(key);
  }
}

// ─── Main API ───

/**
 * Get klines with smart caching:
 * 1. Load cached data from Supabase (all history)
 * 2. Fetch latest candles from Binance (incremental update)
 * 3. Trigger background backfill for full history if needed
 * 4. Return merged data immediately
 */
export async function getKlines(symbol: string, interval: Interval): Promise<RawKline[]> {
  // Step 1: Get cached data
  const cached = await getCachedKlines(symbol, interval);

  if (cached.length > 0) {
    // Step 2: Fetch only new candles since last cached
    const lastCachedTime = cached[cached.length - 1].time;
    try {
      const fresh = await fetchFromBinance(symbol, interval, 1000, lastCachedTime * 1000);
      const newCandles = fresh.filter(k => k.time > lastCachedTime);

      // Update last candle (may be incomplete) + new ones
      const lastUpdate = fresh.find(k => k.time === lastCachedTime);
      const toUpsert = lastUpdate ? [lastUpdate, ...newCandles] : newCandles;

      // Save incrementally (don't block)
      if (toUpsert.length > 0) {
        upsertKlines(symbol, interval, toUpsert).catch(() => {});
      }

      // Merge into result
      const merged = [...cached];
      if (lastUpdate) {
        merged[merged.length - 1] = lastUpdate;
      }
      merged.push(...newCandles);

      // Step 3: Check if we need to backfill older data
      // If the oldest cached candle is recent, we probably don't have full history yet
      const key = `${symbol}:${interval}`;
      if (!backfillComplete.has(key)) {
        backfillHistory(symbol, interval, cached[0].time);
      }

      return merged;
    } catch {
      return cached; // Binance unreachable, serve from cache
    }
  }

  // No cache: fetch latest from Binance, start backfill
  try {
    const klines = await fetchFromBinance(symbol, interval, 1000);
    // Save and start backfill in background
    upsertKlines(symbol, interval, klines).catch(() => {});

    if (klines.length > 0) {
      backfillHistory(symbol, interval, klines[0].time);
    }

    return klines;
  } catch (err) {
    console.error('[KlineCache] Failed to fetch from Binance:', err);
    return [];
  }
}

/** Check backfill status for a symbol+interval */
export function getBackfillStatus(symbol: string, interval: Interval): 'idle' | 'running' | 'complete' {
  const key = `${symbol}:${interval}`;
  if (backfillComplete.has(key)) return 'complete';
  if (backfillInProgress.has(key)) return 'running';
  return 'idle';
}

export { fetchFromBinance };
