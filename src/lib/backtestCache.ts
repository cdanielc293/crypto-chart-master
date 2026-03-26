/**
 * Backtest Data Cache — IndexedDB + Storage-based edge function
 * 
 * For replay/backtest mode, data flows:
 * 1. Check IndexedDB (client-side cache)
 * 2. If miss → call backtest-klines edge function (Storage bucket + Binance fill)
 * 3. Cache result in IndexedDB for future use
 * 
 * This completely bypasses the klines DB table to preserve server RAM.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Interval } from '@/types/chart';
import { parseSymbol } from '@/lib/symbolUtils';
import {
  aggregateCandlesToInterval,
  getBinanceSourceInterval,
  getEstimatedSourceBarsPerTargetBar,
  getIntervalDurationMs,
} from '@/lib/chartIntervals';

export interface BacktestCandle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── IndexedDB layer ───

const DB_NAME = 'vizionx-backtest';
const DB_VERSION = 1;
const STORE_NAME = 'candles';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function idbKey(symbol: string, interval: string, year: number): string {
  return `${symbol}:${interval}:${year}`;
}

async function getFromIDB(key: string): Promise<BacktestCandle[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function putToIDB(key: string, candles: BacktestCandle[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(candles, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silent fail
  }
}

// ─── Edge function caller ───

async function fetchFromEdgeFunction(
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number,
): Promise<BacktestCandle[]> {
  const { data, error } = await supabase.functions.invoke('backtest-klines', {
    body: { symbol, interval, startTime, endTime },
  });

  if (error) {
    console.error('backtest-klines edge function error:', error);
    return [];
  }

  return data?.candles ?? [];
}

// ─── Year helpers ───

function getYearFromTimeSec(timeSec: number): number {
  return new Date(timeSec * 1000).getUTCFullYear();
}

function getYearStartSec(year: number): number {
  return Math.floor(Date.UTC(year, 0, 1) / 1000);
}

function getYearEndSec(year: number): number {
  return Math.floor(Date.UTC(year + 1, 0, 1) / 1000) - 1;
}

// ─── Public API ───

// In-flight tracking to prevent duplicate requests
const inFlightRequests = new Map<string, Promise<BacktestCandle[]>>();

/**
 * Get backtest candles for replay mode.
 * Completely bypasses the klines DB table — uses Storage + IndexedDB only.
 * 
 * @param symbol Raw symbol (e.g. BTCUSDT)
 * @param interval Target display interval (e.g. '1h', '15m')  
 * @param replayTimeSec The unix timestamp (seconds) the user selected as replay point
 * @param historyBars How many bars of history before the replay point
 * @param futureBars How many bars after the replay point (for step-forward)
 */
export async function getBacktestKlines(
  symbol: string,
  interval: Interval,
  replayTimeSec: number,
  historyBars = 12000,
  futureBars = 3500,
): Promise<BacktestCandle[]> {
  const { raw } = parseSymbol(symbol);
  const normalizedSymbol = raw.trim().toUpperCase();
  if (!normalizedSymbol) return [];

  const sourceInterval = getBinanceSourceInterval(interval);
  const barsPerTarget = getEstimatedSourceBarsPerTargetBar(interval);
  const intervalDurationSec = Math.floor(getIntervalDurationMs(interval) / 1000);

  // Calculate time range we need
  const startTimeSec = replayTimeSec - (historyBars * intervalDurationSec);
  const endTimeSec = replayTimeSec + (futureBars * intervalDurationSec);

  const requestKey = `${normalizedSymbol}:${sourceInterval}:${startTimeSec}:${endTimeSec}`;

  // Dedupe in-flight requests
  const existing = inFlightRequests.get(requestKey);
  if (existing) return existing;

  const promise = _fetchBacktestData(
    normalizedSymbol,
    sourceInterval,
    interval,
    startTimeSec,
    endTimeSec,
  );

  inFlightRequests.set(requestKey, promise);
  promise.finally(() => inFlightRequests.delete(requestKey));

  return promise;
}

async function _fetchBacktestData(
  symbol: string,
  sourceInterval: string,
  targetInterval: Interval,
  startTimeSec: number,
  endTimeSec: number,
): Promise<BacktestCandle[]> {
  const startYear = getYearFromTimeSec(startTimeSec);
  const endYear = getYearFromTimeSec(endTimeSec);

  let allCandles: BacktestCandle[] = [];
  const yearsToFetch: number[] = [];

  // 1. Check IndexedDB for each year
  for (let year = startYear; year <= endYear; year++) {
    const key = idbKey(symbol, sourceInterval, year);
    const cached = await getFromIDB(key);

    if (cached && cached.length > 0) {
      allCandles.push(...cached);
    } else {
      yearsToFetch.push(year);
    }
  }

  // 2. Fetch missing years from edge function
  if (yearsToFetch.length > 0) {
    // Batch into a single edge function call covering the full gap
    const fetchStart = Math.min(startTimeSec, getYearStartSec(yearsToFetch[0]));
    const fetchEnd = Math.max(endTimeSec, getYearEndSec(yearsToFetch[yearsToFetch.length - 1]));

    const fetched = await fetchFromEdgeFunction(symbol, sourceInterval, fetchStart, fetchEnd);

    if (fetched.length > 0) {
      allCandles.push(...fetched);

      // Cache per year in IndexedDB
      const byYear = new Map<number, BacktestCandle[]>();
      for (const c of fetched) {
        const year = getYearFromTimeSec(c.time);
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year)!.push(c);
      }

      for (const [year, candles] of byYear) {
        const key = idbKey(symbol, sourceInterval, year);
        // Merge with any existing IDB data
        const existing = await getFromIDB(key);
        const merged = mergeAndDedupe(existing ?? [], candles);
        void putToIDB(key, merged);
      }
    }
  }

  // 3. Also check if we have gaps in the range we need and fill them
  // (the IDB data might be partial for a year)
  const sorted = mergeAndDedupe([], allCandles);
  const inRange = sorted.filter(c => c.time >= startTimeSec && c.time <= endTimeSec);

  if (inRange.length === 0 && sorted.length === 0) {
    // Last resort: direct edge function call for exact range
    const lastResort = await fetchFromEdgeFunction(symbol, sourceInterval, startTimeSec, endTimeSec);
    if (lastResort.length > 0) {
      cacheToIDB(symbol, sourceInterval, lastResort);
      return aggregateIfNeeded(lastResort, targetInterval, sourceInterval);
    }
    return [];
  }

  // 4. Aggregate source candles to target interval if needed
  return aggregateIfNeeded(inRange.length > 0 ? inRange : sorted, targetInterval, sourceInterval);
}

function aggregateIfNeeded(
  candles: BacktestCandle[],
  targetInterval: Interval,
  sourceInterval: string,
): BacktestCandle[] {
  if (sourceInterval === targetInterval) return candles;
  const aggregated = aggregateCandlesToInterval(candles, targetInterval);
  return aggregated.map(c => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}

function mergeAndDedupe(a: BacktestCandle[], b: BacktestCandle[]): BacktestCandle[] {
  const map = new Map<number, BacktestCandle>();
  for (const c of a) map.set(c.time, c);
  for (const c of b) map.set(c.time, c);
  return Array.from(map.values()).sort((x, y) => x.time - y.time);
}

function cacheToIDB(symbol: string, interval: string, candles: BacktestCandle[]): void {
  const byYear = new Map<number, BacktestCandle[]>();
  for (const c of candles) {
    const year = getYearFromTimeSec(c.time);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(c);
  }
  for (const [year, yearCandles] of byYear) {
    const key = idbKey(symbol, interval, year);
    void putToIDB(key, yearCandles.sort((a, b) => a.time - b.time));
  }
}

/**
 * Get older backtest candles for scrolling left in replay mode.
 */
export async function getOlderBacktestKlines(
  symbol: string,
  interval: Interval,
  beforeTimeSec: number,
  limit = 2500,
): Promise<BacktestCandle[]> {
  const { raw } = parseSymbol(symbol);
  const normalizedSymbol = raw.trim().toUpperCase();
  const sourceInterval = getBinanceSourceInterval(interval);
  const intervalDurationSec = Math.floor(getIntervalDurationMs(interval) / 1000);

  const startTimeSec = beforeTimeSec - (limit * intervalDurationSec);
  const endTimeSec = beforeTimeSec - 1;

  // Check IDB first
  const startYear = getYearFromTimeSec(startTimeSec);
  const endYear = getYearFromTimeSec(endTimeSec);
  let allCandles: BacktestCandle[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const key = idbKey(normalizedSymbol, sourceInterval, year);
    const cached = await getFromIDB(key);
    if (cached) allCandles.push(...cached);
  }

  let result = allCandles
    .filter(c => c.time >= startTimeSec && c.time < beforeTimeSec)
    .sort((a, b) => a.time - b.time);

  // If not enough data, fetch from edge function
  if (result.length < limit * 0.3) {
    const fetched = await fetchFromEdgeFunction(
      normalizedSymbol,
      sourceInterval,
      startTimeSec,
      endTimeSec,
    );
    if (fetched.length > 0) {
      cacheToIDB(normalizedSymbol, sourceInterval, fetched);
      result = mergeAndDedupe(result, fetched)
        .filter(c => c.time >= startTimeSec && c.time < beforeTimeSec);
    }
  }

  return aggregateIfNeeded(result.slice(-limit), interval, sourceInterval);
}
