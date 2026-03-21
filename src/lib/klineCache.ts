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

const BINANCE_ENDPOINTS = [
  'https://data-api.binance.vision',
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
];

const INITIAL_RENDER_LIMIT = 3000;
const OLDER_PAGE_LIMIT = 2500;

const backfillInProgress = new Set<string>();
const backfillComplete = new Set<string>();

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dedupeByTime(rows: RawKline[]): RawKline[] {
  const map = new Map<number, RawKline>();
  for (const row of rows) map.set(row.time, row);
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

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
      const params = new URLSearchParams({
        symbol,
        interval,
        limit: String(limit),
      });
      if (startTime) params.set('startTime', String(startTime));
      if (endTime) params.set('endTime', String(endTime));

      const res = await fetch(`${endpoint}/api/v3/klines?${params.toString()}`);
      const json = await res.json();
      if (!Array.isArray(json)) {
        lastError = new Error(json?.msg || 'Invalid Binance kline response');
        continue;
      }

      return json.map((k: any) => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to fetch klines from Binance');
}

async function getCacheBound(
  symbol: string,
  interval: string,
  ascending: boolean,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('klines')
    .select('time')
    .eq('symbol', symbol)
    .eq('interval', interval)
    .order('time', { ascending })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0].time as number;
}

async function getLatestCachedKlines(symbol: string, interval: string, limit = INITIAL_RENDER_LIMIT): Promise<RawKline[]> {
  const { data, error } = await supabase
    .from('klines')
    .select('time, open, high, low, close, volume')
    .eq('symbol', symbol)
    .eq('interval', interval)
    .order('time', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return [];
  return (data as RawKline[]).reverse();
}

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
    await supabase.from('klines').upsert(chunk, { onConflict: 'symbol,interval,time' });
  }
}

async function backfillHistory(symbol: string, interval: Interval, oldestKnownTime?: number | null) {
  const key = `${symbol}:${interval}`;
  if (backfillInProgress.has(key) || backfillComplete.has(key)) return;

  backfillInProgress.add(key);
  let endTime = oldestKnownTime ? oldestKnownTime * 1000 - 1 : Date.now();
  let requests = 0;
  const maxRequestsPerRun = 150;

  try {
    while (requests < maxRequestsPerRun) {
      requests += 1;
      const batch = await fetchFromBinance(symbol, interval, 1000, undefined, endTime);
      if (batch.length === 0) {
        backfillComplete.add(key);
        break;
      }

      await upsertKlines(symbol, interval, batch);

      const oldestBatchTime = batch[0].time * 1000;
      endTime = oldestBatchTime - 1;

      if (batch.length < 1000) {
        backfillComplete.add(key);
        break;
      }

      await wait(280);
    }
  } catch {
    // Silent fail: chart continues with existing cached data + live Binance updates.
  } finally {
    backfillInProgress.delete(key);
  }
}

/**
 * Fast load for chart rendering:
 * - returns latest cached window quickly (avoids freezes on timeframe switch)
 * - syncs newest candles incrementally
 * - continues full-history backfill in background
 */
export async function getKlines(symbol: string, interval: Interval): Promise<RawKline[]> {
  const [oldestCachedTime, newestCachedTime] = await Promise.all([
    getCacheBound(symbol, interval, true),
    getCacheBound(symbol, interval, false),
  ]);

  if (newestCachedTime !== null) {
    const cachedWindow = await getLatestCachedKlines(symbol, interval, INITIAL_RENDER_LIMIT);

    try {
      const fresh = await fetchFromBinance(symbol, interval, 1000, newestCachedTime * 1000);
      const updatedLast = fresh.find(k => k.time === newestCachedTime);
      const newRows = fresh.filter(k => k.time > newestCachedTime);
      const deltaRows = updatedLast ? [updatedLast, ...newRows] : newRows;

      if (deltaRows.length > 0) {
        void upsertKlines(symbol, interval, deltaRows);
      }

      void backfillHistory(symbol, interval, oldestCachedTime);
      return dedupeByTime([...cachedWindow, ...deltaRows]);
    } catch {
      void backfillHistory(symbol, interval, oldestCachedTime);
      return cachedWindow;
    }
  }

  try {
    const latest = await fetchFromBinance(symbol, interval, 1000);
    if (latest.length > 0) {
      void upsertKlines(symbol, interval, latest);
      void backfillHistory(symbol, interval, latest[0].time);
    }
    return latest;
  } catch {
    return [];
  }
}

/** Load older cached bars before a given timestamp (for lazy-load on left scroll). */
export async function getOlderKlinesFromCache(
  symbol: string,
  interval: Interval,
  beforeTime: number,
  limit = OLDER_PAGE_LIMIT,
): Promise<RawKline[]> {
  const { data, error } = await supabase
    .from('klines')
    .select('time, open, high, low, close, volume')
    .eq('symbol', symbol)
    .eq('interval', interval)
    .lt('time', beforeTime)
    .order('time', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return [];
  return (data as RawKline[]).reverse();
}

export function getBackfillStatus(symbol: string, interval: Interval): 'idle' | 'running' | 'complete' {
  const key = `${symbol}:${interval}`;
  if (backfillComplete.has(key)) return 'complete';
  if (backfillInProgress.has(key)) return 'running';
  return 'idle';
}

export { fetchFromBinance };
