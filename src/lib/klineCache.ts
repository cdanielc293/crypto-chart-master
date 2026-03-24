import { supabase } from '@/lib/supabaseClient';
import { ALL_INTERVALS } from '@/types/chart';
import type { Interval } from '@/types/chart';
import {
  aggregateCandlesToInterval,
  getBinanceSourceInterval,
  getEstimatedSourceBarsPerTargetBar,
} from '@/lib/chartIntervals';

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
const MAX_SOURCE_QUERY_LIMIT = 20000;
const BACKFILL_REQUESTS_PER_PASS = 80;
const BACKFILL_CONTINUE_DELAY_MS = 300;
const RENDER_CACHE_TTL_MS = 45_000;
const REPLAY_RENDER_CACHE_TTL_MS = 20_000;
const SOURCE_SYNC_COOLDOWN_MS = 12_000;
const REPLAY_HISTORY_TARGET_BARS = 12_000;
const REPLAY_FUTURE_TARGET_BARS = 3_500;

// Fast initial fetch: just 1000 bars from Binance for instant render
const FAST_INITIAL_BINANCE_LIMIT = 1000;
// Supabase timeout reduced — if DB is slow, skip it fast
const SUPABASE_QUERY_TIMEOUT_MS = 3000;
// Track if Supabase is responsive
let supabaseHealthy = true;
let supabaseLastFailAt = 0;
const SUPABASE_HEALTH_COOLDOWN_MS = 30_000;

const backfillInProgress = new Set<string>();
const backfillComplete = new Set<string>();
const backfillContinuationScheduled = new Set<string>();
const backfillCursorMs = new Map<string, number>();
const symbolPrefetchInProgress = new Set<string>();
const sourcePrefetchInProgress = new Set<string>();
const sourcePrefetchComplete = new Set<string>();
const sourceSyncInProgress = new Set<string>();
const sourceLastSyncAt = new Map<string, number>();
const renderCache = new Map<string, { rows: RawKline[]; updatedAt: number }>();
const replayRenderCache = new Map<string, { rows: RawKline[]; updatedAt: number }>();
const renderFetchInProgress = new Map<string, Promise<RawKline[]>>();
const replayFetchInProgress = new Map<string, Promise<RawKline[]>>();
const renderRefreshInProgress = new Set<string>();

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dedupeByTime(rows: RawKline[]): RawKline[] {
  const map = new Map<number, RawKline>();
  for (const row of rows) map.set(row.time, row);
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

function getBackfillKey(symbol: string, cacheInterval: string): string {
  return `${symbol}:${cacheInterval}`;
}

function getSourcePrefetchKey(symbol: string, cacheInterval: string): string {
  return `${symbol}:${cacheInterval}`;
}

function getRenderCacheKey(symbol: string, interval: Interval): string {
  return `${symbol}:${interval}`;
}

function getReplayCacheKey(symbol: string, interval: Interval, endTimeSec: number): string {
  return `${symbol}:${interval}:replay:${endTimeSec}`;
}

function setRenderCache(key: string, rows: RawKline[]) {
  renderCache.set(key, {
    rows: dedupeByTime(rows),
    updatedAt: Date.now(),
  });
}

function setReplayRenderCache(key: string, rows: RawKline[]) {
  replayRenderCache.set(key, {
    rows: dedupeByTime(rows),
    updatedAt: Date.now(),
  });
}

function toRawKlines(rows: { time: number; open: number; high: number; low: number; close: number; volume: number }[]): RawKline[] {
  return rows.map(row => ({
    time: row.time,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
  }));
}

function aggregateForInterval(rows: RawKline[], interval: Interval): RawKline[] {
  return toRawKlines(aggregateCandlesToInterval(rows, interval));
}

function getSourceWindowLimit(interval: Interval): number {
  const barsPerTarget = getEstimatedSourceBarsPerTargetBar(interval);
  const preferred = INITIAL_RENDER_LIMIT * barsPerTarget + barsPerTarget;
  return Math.min(Math.max(preferred, INITIAL_RENDER_LIMIT), MAX_SOURCE_QUERY_LIMIT);
}

function getReplayHistorySourceLimit(interval: Interval): number {
  const barsPerTarget = getEstimatedSourceBarsPerTargetBar(interval);
  const preferred = REPLAY_HISTORY_TARGET_BARS * barsPerTarget + barsPerTarget;
  return Math.min(Math.max(preferred, INITIAL_RENDER_LIMIT), MAX_SOURCE_QUERY_LIMIT);
}

function getReplayFutureSourceLimit(interval: Interval): number {
  const barsPerTarget = getEstimatedSourceBarsPerTargetBar(interval);
  const preferred = REPLAY_FUTURE_TARGET_BARS * barsPerTarget + barsPerTarget;
  return Math.min(Math.max(preferred, INITIAL_RENDER_LIMIT), MAX_SOURCE_QUERY_LIMIT);
}

function findNearestIndexAtOrBefore(rows: RawKline[], targetTimeSec: number): number {
  if (rows.length === 0) return -1;
  let low = 0;
  let high = rows.length - 1;
  let best = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (rows[mid].time <= targetTimeSec) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

function sliceReplayWindow(rows: RawKline[], replayAnchorTimeSec: number): RawKline[] {
  if (rows.length === 0) return [];
  const deduped = dedupeByTime(rows);
  const anchorIndex = findNearestIndexAtOrBefore(deduped, replayAnchorTimeSec);
  const normalizedAnchorIndex = anchorIndex >= 0 ? anchorIndex : 0;
  const from = Math.max(0, normalizedAnchorIndex - REPLAY_HISTORY_TARGET_BARS);
  const to = Math.min(deduped.length, normalizedAnchorIndex + REPLAY_FUTURE_TARGET_BARS + 1);
  return deduped.slice(from, to);
}

function scheduleBackfillContinuation(symbol: string, cacheInterval: string) {
  const key = getBackfillKey(symbol, cacheInterval);
  if (backfillComplete.has(key) || backfillContinuationScheduled.has(key)) return;
  backfillContinuationScheduled.add(key);
  setTimeout(() => {
    backfillContinuationScheduled.delete(key);
    void backfillHistory(symbol, cacheInterval);
  }, BACKFILL_CONTINUE_DELAY_MS);
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

function isSupabaseAvailable(): boolean {
  if (supabaseHealthy) return true;
  if (Date.now() - supabaseLastFailAt > SUPABASE_HEALTH_COOLDOWN_MS) {
    supabaseHealthy = true;
    return true;
  }
  return false;
}

function markSupabaseFailed() {
  supabaseHealthy = false;
  supabaseLastFailAt = Date.now();
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function getCacheBound(
  symbol: string,
  cacheInterval: string,
  ascending: boolean,
): Promise<number | null> {
  if (!isSupabaseAvailable()) return null;

  const query = supabase
    .from('klines')
    .select('time')
    .eq('symbol', symbol)
    .eq('interval', cacheInterval)
    .order('time', { ascending })
    .limit(1);

  const p = query.then(({ data, error }) => {
    if (error) { markSupabaseFailed(); return null; }
    if (!data || data.length === 0) return null;
    return data[0].time as number;
  });

  return withTimeout(Promise.resolve(p), SUPABASE_QUERY_TIMEOUT_MS, null);
}

async function getLatestCachedKlines(symbol: string, cacheInterval: string, limit = INITIAL_RENDER_LIMIT): Promise<RawKline[]> {
  if (!isSupabaseAvailable()) return [];

  const p = supabase
    .from('klines')
    .select('time, open, high, low, close, volume')
    .eq('symbol', symbol)
    .eq('interval', cacheInterval)
    .order('time', { ascending: false })
    .limit(limit)
    .then(({ data, error }) => {
      if (error) { markSupabaseFailed(); return []; }
      if (!data || data.length === 0) return [];
      return (data as RawKline[]).reverse();
    });

  return withTimeout(Promise.resolve(p), SUPABASE_QUERY_TIMEOUT_MS, []);
}

async function getCachedKlinesEndingAt(
  symbol: string,
  cacheInterval: string,
  endTimeSec: number,
  limit: number,
): Promise<RawKline[]> {
  if (!isSupabaseAvailable()) return [];

  const p = supabase
    .from('klines')
    .select('time, open, high, low, close, volume')
    .eq('symbol', symbol)
    .eq('interval', cacheInterval)
    .lte('time', endTimeSec)
    .order('time', { ascending: false })
    .limit(limit)
    .then(({ data, error }) => {
      if (error) { markSupabaseFailed(); return []; }
      if (!data || data.length === 0) return [];
      return (data as RawKline[]).reverse();
    });

  return withTimeout(Promise.resolve(p), SUPABASE_QUERY_TIMEOUT_MS, []);
}

async function getCachedKlinesStartingAt(
  symbol: string,
  cacheInterval: string,
  startTimeSec: number,
  limit: number,
): Promise<RawKline[]> {
  if (!isSupabaseAvailable()) return [];

  const p = supabase
    .from('klines')
    .select('time, open, high, low, close, volume')
    .eq('symbol', symbol)
    .eq('interval', cacheInterval)
    .gt('time', startTimeSec)
    .order('time', { ascending: true })
    .limit(limit)
    .then(({ data, error }) => {
      if (error) { markSupabaseFailed(); return []; }
      if (!data || data.length === 0) return [];
      return data as RawKline[];
    });

  return withTimeout(Promise.resolve(p), SUPABASE_QUERY_TIMEOUT_MS, []);
}

async function upsertKlines(symbol: string, cacheInterval: string, klines: RawKline[]) {
  if (klines.length === 0 || !isSupabaseAvailable()) return;

  const rows = klines.map(k => ({
    symbol,
    interval: cacheInterval,
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
    const { error } = await supabase.from('klines').upsert(chunk, { onConflict: 'symbol,interval,time' });
    if (error) { markSupabaseFailed(); return; }
  }
}

async function backfillHistory(symbol: string, interval: string, oldestKnownTime?: number | null) {
  const key = getBackfillKey(symbol, interval);
  if (backfillInProgress.has(key) || backfillComplete.has(key)) return;

  backfillContinuationScheduled.delete(key);
  backfillInProgress.add(key);
  let endTime = backfillCursorMs.get(key) ?? (oldestKnownTime ? oldestKnownTime * 1000 - 1 : Date.now());
  let requests = 0;
  let needsContinuation = false;

  try {
    while (requests < BACKFILL_REQUESTS_PER_PASS) {
      requests += 1;
      const batch = await fetchFromBinance(symbol, interval, 1000, undefined, endTime);
      if (batch.length === 0) {
        backfillComplete.add(key);
        backfillCursorMs.delete(key);
        break;
      }

      await upsertKlines(symbol, interval, batch);

      const oldestBatchTime = batch[0].time * 1000;
      endTime = oldestBatchTime - 1;
      backfillCursorMs.set(key, endTime);

      if (batch.length < 1000) {
        backfillComplete.add(key);
        backfillCursorMs.delete(key);
        break;
      }

      await wait(150);
    }

    needsContinuation = !backfillComplete.has(key);
  } catch {
    needsContinuation = true;
  } finally {
    backfillInProgress.delete(key);
  }

  if (needsContinuation) {
    scheduleBackfillContinuation(symbol, interval);
  }
}

/**
 * Fetch source candles from Binance using parallel requests for speed.
 */
async function fetchSourceWindow(
  symbol: string,
  sourceInterval: string,
  targetBars: number,
  endTimeMs?: number,
): Promise<RawKline[]> {
  const requestsToMake = Math.max(1, Math.min(20, Math.ceil(targetBars / 1000)));

  // For fast initial render: make first request immediately, then continue in background
  const firstBatch = await fetchFromBinance(symbol, sourceInterval, 1000, undefined, endTimeMs);
  if (firstBatch.length === 0) return [];
  if (requestsToMake <= 1 || firstBatch.length < 1000) return dedupeByTime(firstBatch);

  // Continue fetching remaining batches in parallel (up to 4 concurrent)
  const collected: RawKline[] = [...firstBatch];
  let endTime = firstBatch[0].time * 1000 - 1;

  const PARALLEL_BATCH_SIZE = 4;
  let remaining = requestsToMake - 1;

  while (remaining > 0) {
    const batchCount = Math.min(remaining, PARALLEL_BATCH_SIZE);
    const promises: Promise<RawKline[]>[] = [];

    for (let i = 0; i < batchCount; i++) {
      const et = endTime - i * 1000 * getIntervalSeconds(sourceInterval) * 1000;
      promises.push(fetchFromBinance(symbol, sourceInterval, 1000, undefined, et).catch(() => []));
    }

    const results = await Promise.all(promises);
    let gotData = false;

    for (const batch of results) {
      if (batch.length > 0) {
        collected.push(...batch);
        gotData = true;
      }
    }

    if (!gotData) break;

    // Update endTime to oldest received
    const allTimes = collected.map(k => k.time);
    endTime = Math.min(...allTimes) * 1000 - 1;
    remaining -= batchCount;
  }

  return dedupeByTime(collected);
}

function getIntervalSeconds(interval: string): number {
  const map: Record<string, number> = {
    '1s': 1, '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800,
    '1h': 3600, '2h': 7200, '4h': 14400, '6h': 21600, '8h': 28800, '12h': 43200,
    '1d': 86400, '3d': 259200, '1w': 604800, '1M': 2592000,
  };
  return map[interval] || 60;
}

async function fetchSourceForwardWindow(
  symbol: string,
  sourceInterval: string,
  targetBars: number,
  startTimeMs?: number,
): Promise<RawKline[]> {
  const requestsToMake = Math.max(1, Math.min(20, Math.ceil(targetBars / 1000)));
  let startTime = startTimeMs;
  const collected: RawKline[] = [];

  for (let i = 0; i < requestsToMake; i += 1) {
    const batch = await fetchFromBinance(symbol, sourceInterval, 1000, startTime, undefined);
    if (batch.length === 0) break;

    collected.push(...batch);

    const newestBatchMs = batch[batch.length - 1].time * 1000;
    startTime = newestBatchMs + 1;

    if (batch.length < 1000) break;
    await wait(80);
  }

  return dedupeByTime(collected);
}

async function loadKlinesForReplay(symbol: string, interval: Interval, replayEndTimeSec: number): Promise<RawKline[]> {
  const sourceInterval = getBinanceSourceInterval(interval);
  const safeReplayEndTime = Math.floor(replayEndTimeSec);
  const replayHistorySourceLimit = getReplayHistorySourceLimit(interval);
  const replayFutureSourceLimit = getReplayFutureSourceLimit(interval);

  const [cachedHistory, cachedFuture] = await Promise.all([
    getCachedKlinesEndingAt(symbol, sourceInterval, safeReplayEndTime, replayHistorySourceLimit),
    getCachedKlinesStartingAt(symbol, sourceInterval, safeReplayEndTime, replayFutureSourceLimit),
  ]);

  const cachedSourceWindow = dedupeByTime([...cachedHistory, ...cachedFuture]);

  if (cachedSourceWindow.length > 0) {
    const cachedAggregated = sliceReplayWindow(
      aggregateForInterval(cachedSourceWindow, interval),
      safeReplayEndTime,
    );

    if (cachedAggregated.length > 0) {
      void backfillHistory(symbol, sourceInterval, cachedHistory[0]?.time ?? null);
      if (cachedFuture.length < Math.min(1500, Math.floor(replayFutureSourceLimit / 2))) {
        void fetchSourceForwardWindow(symbol, sourceInterval, replayFutureSourceLimit, (safeReplayEndTime + 1) * 1000)
          .then(rows => { if (rows.length > 0) void upsertKlines(symbol, sourceInterval, rows); })
          .catch(() => undefined);
      }
      return cachedAggregated;
    }
  }

  try {
    const [fetchedHistory, fetchedFuture] = await Promise.all([
      fetchSourceWindow(symbol, sourceInterval, replayHistorySourceLimit, safeReplayEndTime * 1000),
      fetchSourceForwardWindow(symbol, sourceInterval, replayFutureSourceLimit, (safeReplayEndTime + 1) * 1000),
    ]);

    const fetchedSourceWindow = dedupeByTime([...fetchedHistory, ...fetchedFuture]);
    if (fetchedSourceWindow.length > 0) {
      void upsertKlines(symbol, sourceInterval, fetchedSourceWindow);
      void backfillHistory(symbol, sourceInterval, fetchedHistory[0]?.time ?? fetchedSourceWindow[0].time);
    }

    return sliceReplayWindow(aggregateForInterval(fetchedSourceWindow, interval), safeReplayEndTime);
  } catch {
    return [];
  }
}

async function syncLatestAndBackfill(
  symbol: string,
  sourceInterval: string,
  targetInterval: Interval,
  newestCachedTime: number,
  oldestCachedTime: number | null,
  cachedSourceWindow: RawKline[],
) {
  const sourceKey = getSourcePrefetchKey(symbol, sourceInterval);
  const lastSync = sourceLastSyncAt.get(sourceKey) ?? 0;
  if (sourceSyncInProgress.has(sourceKey) || Date.now() - lastSync < SOURCE_SYNC_COOLDOWN_MS) {
    void backfillHistory(symbol, sourceInterval, oldestCachedTime);
    return;
  }

  sourceSyncInProgress.add(sourceKey);
  try {
    const fresh = await fetchFromBinance(symbol, sourceInterval, 1000, newestCachedTime * 1000);
    const updatedLast = fresh.find(k => k.time === newestCachedTime);
    const newRows = fresh.filter(k => k.time > newestCachedTime);
    const deltaRows = updatedLast ? [updatedLast, ...newRows] : newRows;

    if (deltaRows.length > 0) {
      await upsertKlines(symbol, sourceInterval, deltaRows);
      const mergedSource = dedupeByTime([...cachedSourceWindow, ...deltaRows]);
      const aggregated = aggregateForInterval(mergedSource, targetInterval).slice(-INITIAL_RENDER_LIMIT);
      setRenderCache(getRenderCacheKey(symbol, targetInterval), aggregated);
    }

    void backfillHistory(symbol, sourceInterval, oldestCachedTime);
  } catch {
    void backfillHistory(symbol, sourceInterval, oldestCachedTime);
  } finally {
    sourceLastSyncAt.set(sourceKey, Date.now());
    sourceSyncInProgress.delete(sourceKey);
  }
}

/**
 * FAST-PATH: Race Supabase cache vs Binance direct fetch.
 * Whichever resolves first with data wins. The other result
 * is used to enrich/backfill in background.
 */
async function loadKlinesFromSource(symbol: string, interval: Interval): Promise<RawKline[]> {
  const sourceInterval = getBinanceSourceInterval(interval);
  const sourceWindowLimit = getSourceWindowLimit(interval);

  // Race: Supabase cache vs Binance fast fetch
  const supabasePromise = (async (): Promise<{ source: 'cache'; rows: RawKline[]; oldest: number | null; newest: number | null }> => {
    if (!isSupabaseAvailable()) return { source: 'cache', rows: [], oldest: null, newest: null };
    const [oldest, newest] = await Promise.all([
      getCacheBound(symbol, sourceInterval, true),
      getCacheBound(symbol, sourceInterval, false),
    ]);
    if (newest === null) return { source: 'cache', rows: [], oldest: null, newest: null };
    const cachedRows = await getLatestCachedKlines(symbol, sourceInterval, sourceWindowLimit);
    return { source: 'cache', rows: cachedRows, oldest, newest };
  })();

  const binancePromise = (async (): Promise<{ source: 'binance'; rows: RawKline[] }> => {
    // Fast initial: just 1 request (1000 bars) for instant render
    const rows = await fetchFromBinance(symbol, sourceInterval, FAST_INITIAL_BINANCE_LIMIT);
    return { source: 'binance', rows };
  })();

  // Use Promise.allSettled to get both results, but render from whichever is faster
  type CacheResult = Awaited<typeof supabasePromise>;
  type BinanceResult = Awaited<typeof binancePromise>;

  let fastResult: RawKline[] = [];
  let cacheResult: CacheResult | null = null;

  try {
    // Race for fastest data
    const winner = await Promise.race([
      supabasePromise.then(r => ({ type: 'cache' as const, data: r })),
      binancePromise.then(r => ({ type: 'binance' as const, data: r })),
    ]);

    if (winner.type === 'cache' && winner.data.rows.length > 0) {
      cacheResult = winner.data;
      fastResult = aggregateForInterval(winner.data.rows, interval).slice(-INITIAL_RENDER_LIMIT);

      // Also await Binance result in background to sync latest
      void binancePromise.then(br => {
        if (br.rows.length > 0 && cacheResult) {
          void upsertKlines(symbol, sourceInterval, br.rows);
          void syncLatestAndBackfill(symbol, sourceInterval, interval, cacheResult.newest!, cacheResult.oldest, cacheResult.rows);
        }
      }).catch(() => {});
    } else if (winner.type === 'binance' && winner.data.rows.length > 0) {
      fastResult = aggregateForInterval(winner.data.rows, interval).slice(-INITIAL_RENDER_LIMIT);

      // Cache the Binance result and start backfill
      void upsertKlines(symbol, sourceInterval, winner.data.rows);
      void backfillHistory(symbol, sourceInterval, winner.data.rows[0].time);

      // Also check if Supabase has more historical data
      void supabasePromise.then(cr => {
        if (cr.rows.length > 0) {
          const merged = dedupeByTime([...cr.rows, ...winner.data.rows]);
          const aggregated = aggregateForInterval(merged, interval).slice(-INITIAL_RENDER_LIMIT);
          setRenderCache(getRenderCacheKey(symbol, interval), aggregated);
        }
      }).catch(() => {});
    } else {
      // Winner had no data, try the other
      const results = await Promise.allSettled([supabasePromise, binancePromise]);
      for (const r of results) {
        if (r.status === 'fulfilled') {
          const data = r.value;
          if (data.rows.length > 0) {
            fastResult = aggregateForInterval(data.rows, interval).slice(-INITIAL_RENDER_LIMIT);
            if (data.source === 'binance') {
              void upsertKlines(symbol, sourceInterval, data.rows);
              void backfillHistory(symbol, sourceInterval, data.rows[0].time);
            }
            break;
          }
        }
      }
    }
  } catch {
    // If race fails, try Binance directly
    try {
      const rows = await fetchFromBinance(symbol, sourceInterval, FAST_INITIAL_BINANCE_LIMIT);
      if (rows.length > 0) {
        fastResult = aggregateForInterval(rows, interval).slice(-INITIAL_RENDER_LIMIT);
        void upsertKlines(symbol, sourceInterval, rows);
        void backfillHistory(symbol, sourceInterval, rows[0].time);
      }
    } catch {
      return [];
    }
  }

  if (fastResult.length > 0) {
    setRenderCache(getRenderCacheKey(symbol, interval), fastResult);

    // Background: fetch more history for depth
    void fetchMoreHistoryInBackground(symbol, sourceInterval, interval, sourceWindowLimit);
  }

  return fastResult;
}

/**
 * After fast render, fetch more candles in background to fill the chart with deeper history.
 */
async function fetchMoreHistoryInBackground(
  symbol: string,
  sourceInterval: string,
  targetInterval: Interval,
  targetBars: number,
) {
  try {
    await wait(500); // Let UI render first
    const fullData = await fetchSourceWindow(symbol, sourceInterval, targetBars);
    if (fullData.length > 0) {
      void upsertKlines(symbol, sourceInterval, fullData);
      const aggregated = aggregateForInterval(fullData, targetInterval).slice(-INITIAL_RENDER_LIMIT);
      setRenderCache(getRenderCacheKey(symbol, targetInterval), aggregated);
      void backfillHistory(symbol, sourceInterval, fullData[0].time);
    }
  } catch {
    // Silent
  }
}

/**
 * Fast load for chart rendering:
 * - races Supabase cache vs Binance for fastest first paint
 * - syncs newest candles incrementally
 * - continues full-history backfill in background
 */
export interface GetKlinesOptions {
  replayEndTimeSec?: number | null;
}

export async function getKlines(
  symbol: string,
  interval: Interval,
  options: GetKlinesOptions = {},
): Promise<RawKline[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) return [];

  const replayEndTimeSec = options.replayEndTimeSec;
  if (replayEndTimeSec !== null && replayEndTimeSec !== undefined && Number.isFinite(replayEndTimeSec)) {
    const normalizedReplayEnd = Math.floor(replayEndTimeSec);
    const replayCacheKey = getReplayCacheKey(normalizedSymbol, interval, normalizedReplayEnd);
    const cachedReplay = replayRenderCache.get(replayCacheKey);

    if (cachedReplay?.rows.length && Date.now() - cachedReplay.updatedAt <= REPLAY_RENDER_CACHE_TTL_MS) {
      return cachedReplay.rows;
    }

    const replayInFlight = replayFetchInProgress.get(replayCacheKey);
    if (replayInFlight) return replayInFlight;

    const replayPromise = loadKlinesForReplay(normalizedSymbol, interval, normalizedReplayEnd)
      .then(rows => {
        if (rows.length > 0) setReplayRenderCache(replayCacheKey, rows);
        return rows;
      })
      .finally(() => { replayFetchInProgress.delete(replayCacheKey); });

    replayFetchInProgress.set(replayCacheKey, replayPromise);
    return replayPromise;
  }

  const renderKey = getRenderCacheKey(normalizedSymbol, interval);
  const cachedRender = renderCache.get(renderKey);

  if (cachedRender?.rows.length) {
    const isStale = Date.now() - cachedRender.updatedAt > RENDER_CACHE_TTL_MS;
    if (isStale && !renderRefreshInProgress.has(renderKey)) {
      renderRefreshInProgress.add(renderKey);
      void loadKlinesFromSource(normalizedSymbol, interval)
        .then(rows => { if (rows.length > 0) setRenderCache(renderKey, rows); })
        .finally(() => { renderRefreshInProgress.delete(renderKey); });
    }
    return cachedRender.rows;
  }

  const inFlight = renderFetchInProgress.get(renderKey);
  if (inFlight) return inFlight;

  const fetchPromise = loadKlinesFromSource(normalizedSymbol, interval)
    .then(rows => {
      if (rows.length > 0) setRenderCache(renderKey, rows);
      return rows;
    })
    .finally(() => { renderFetchInProgress.delete(renderKey); });

  renderFetchInProgress.set(renderKey, fetchPromise);
  return fetchPromise;
}

/** Load older cached bars before a given timestamp (for lazy-load on left scroll). */
export async function getOlderKlinesFromCache(
  symbol: string,
  interval: Interval,
  beforeTime: number,
  limit = OLDER_PAGE_LIMIT,
): Promise<RawKline[]> {
  const sourceInterval = getBinanceSourceInterval(interval);
  const sourceBarsPerTarget = getEstimatedSourceBarsPerTargetBar(interval);
  const sourceLimit = Math.min(Math.max(limit * sourceBarsPerTarget * 2, limit), MAX_SOURCE_QUERY_LIMIT);

  // Try cache first, fallback to Binance
  const cachePromise = (async () => {
    if (!isSupabaseAvailable()) return [];
    const p = supabase
      .from('klines')
      .select('time, open, high, low, close, volume')
      .eq('symbol', symbol)
      .eq('interval', sourceInterval)
      .lt('time', beforeTime)
      .order('time', { ascending: false })
      .limit(sourceLimit)
      .then(({ data, error }) => {
        if (error) { markSupabaseFailed(); return []; }
        if (!data || data.length === 0) return [];
        const sourceRows = (data as RawKline[]).reverse();
        return aggregateForInterval(sourceRows, interval)
          .filter(k => k.time < beforeTime)
          .slice(-limit);
      });
    return withTimeout(Promise.resolve(p), SUPABASE_QUERY_TIMEOUT_MS, []);
  })();

  const cached = await cachePromise;
  if (cached.length > 0) return cached;

  // Fallback: fetch from Binance
  try {
    const endTimeMs = beforeTime * 1000 - 1;
    const rows = await fetchFromBinance(symbol, sourceInterval, 1000, undefined, endTimeMs);
    if (rows.length > 0) {
      void upsertKlines(symbol, sourceInterval, rows);
      return aggregateForInterval(rows, interval)
        .filter(k => k.time < beforeTime)
        .slice(-limit);
    }
  } catch {}

  return [];
}

/** Warm cache for all source intervals used across timeframe options for a symbol. */
export async function prefetchSymbolHistory(symbol: string): Promise<void> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) return;
  if (symbolPrefetchInProgress.has(normalizedSymbol)) return;

  symbolPrefetchInProgress.add(normalizedSymbol);
  try {
    const sourceTargets = new Map<string, Interval>();
    for (const option of ALL_INTERVALS) {
      const targetInterval = option.value as Interval;
      const sourceInterval = getBinanceSourceInterval(targetInterval);
      if (!sourceTargets.has(sourceInterval)) {
        sourceTargets.set(sourceInterval, targetInterval);
      }
    }

    // Prefetch in parallel batches of 3 instead of serial
    const entries = Array.from(sourceTargets.entries());
    const BATCH_SIZE = 3;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async ([sourceInterval, targetInterval]) => {
          const sourceKey = getSourcePrefetchKey(normalizedSymbol, sourceInterval);
          if (sourcePrefetchComplete.has(sourceKey) || sourcePrefetchInProgress.has(sourceKey)) return;
          sourcePrefetchInProgress.add(sourceKey);
          try {
            await getKlines(normalizedSymbol, targetInterval);
            sourcePrefetchComplete.add(sourceKey);
          } finally {
            sourcePrefetchInProgress.delete(sourceKey);
          }
        })
      );
    }
  } finally {
    symbolPrefetchInProgress.delete(normalizedSymbol);
  }
}

export function getBackfillStatus(symbol: string, interval: Interval): 'idle' | 'running' | 'complete' {
  const key = getBackfillKey(symbol, getBinanceSourceInterval(interval));
  if (backfillComplete.has(key)) return 'complete';
  if (backfillInProgress.has(key)) return 'running';
  return 'idle';
}

export { fetchFromBinance };
