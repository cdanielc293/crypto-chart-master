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

async function fetchFromBinance(symbol: string, interval: string, limit = 1000): Promise<RawKline[]> {
  let lastError: unknown = null;
  for (const endpoint of BINANCE_ENDPOINTS) {
    try {
      const res = await fetch(`${endpoint}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
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

async function getCachedKlines(symbol: string, interval: string): Promise<RawKline[] | null> {
  try {
    const { data, error } = await supabase
      .from('klines')
      .select('time, open, high, low, close, volume')
      .eq('symbol', symbol)
      .eq('interval', interval)
      .order('time', { ascending: true });

    if (error || !data || data.length === 0) return null;
    return data as RawKline[];
  } catch {
    return null;
  }
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

  // Batch upsert in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await supabase
      .from('klines')
      .upsert(chunk, { onConflict: 'symbol,interval,time' });
  }
}

/**
 * Get klines with cache-first strategy:
 * 1. Check Supabase cache
 * 2. If cache exists, fetch only newer candles from Binance
 * 3. If no cache, fetch all from Binance and store
 */
export async function getKlines(symbol: string, interval: Interval): Promise<RawKline[]> {
  // Try cache first
  const cached = await getCachedKlines(symbol, interval);

  if (cached && cached.length > 0) {
    // Fetch only candles newer than last cached
    const lastTime = cached[cached.length - 1].time;
    try {
      const fresh = await fetchFromBinance(symbol, interval, 100);
      const newCandles = fresh.filter(k => k.time > lastTime);

      if (newCandles.length > 0) {
        // Update the last cached candle (might be incomplete) + add new ones
        const lastCachedUpdate = fresh.find(k => k.time === lastTime);
        const toUpsert = lastCachedUpdate
          ? [lastCachedUpdate, ...newCandles]
          : newCandles;

        // Fire and forget - don't block UI
        upsertKlines(symbol, interval, toUpsert).catch(() => {});

        // Merge: replace last candle if updated, add new ones
        const merged = [...cached];
        if (lastCachedUpdate) {
          merged[merged.length - 1] = lastCachedUpdate;
        }
        merged.push(...newCandles);
        return merged;
      }

      return cached;
    } catch {
      // Binance unreachable, return cache as-is
      return cached;
    }
  }

  // No cache - full fetch from Binance
  const klines = await fetchFromBinance(symbol, interval, 1000);

  // Cache in background
  upsertKlines(symbol, interval, klines).catch(() => {});

  return klines;
}

/**
 * Direct Binance fetch (bypass cache) - for fallback
 */
export { fetchFromBinance };
