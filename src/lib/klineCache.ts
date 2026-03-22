import { supabase } from '@/integrations/supabase/client';
import { ALL_INTERVALS } from '@/types/chart';
import type { Interval } from '@/types/chart';
import {
  aggregateCandlesToInterval,
  getBinanceSourceInterval,
  getEstimatedSourceBarsPerTargetBar,
} from '@/lib/chartIntervals';
// Exchange routing removed — currently crypto-only (Binance)

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
    const midTime = rows[mid].time;

    if (midTime <= targetTimeSec) {
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

async function getCacheBound(
  symbol: string,
  cacheInterval: string,
  ascending: boolean,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('klines')
    .select('time')
    .eq('symbol', symbol)
    .eq('interval', cacheInterval)
    .order('time', { ascending })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0].time as number;
}

async function getLatestCachedKlines(symbol: string, cacheInterval: string, limit = INITIAL_RENDER_LIMIT): Promise<RawKline[]> {
  const { data, error } = await supabase
    .from('klines')
    .select('time, open, high, low, close, volume')
    .eq('symbol', symbol)
    .eq('interval', cacheInterval)
    .order('time', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return [];
  return (data as RawKline[]).reverse();
}

async function getCachedKlinesEndingAt(
  symbol: string,
  cacheInterval: string,
  endTimeSec: number,
  limit: number,
): Promise<RawKline[]> {
  const { data, error } = await supabase
    .from('klines')
    .select('time, open, high, low, close, volume')
    .eq('symbol', symbol)
    .eq('interval', cacheInterval)
    .lte('time', endTimeSec)
    .order('time', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return [];
  return (data as RawKline[]).reverse();
}

async function getCachedKlinesStartingAt(
  symbol: string,
  cacheInterval: string,
  startTimeSec: number,
  limit: number,
): Promise<RawKline[]> {
  const { data, error } = await supabase
    .from('klines')
    .select('time, open, high, low, close, volume')
    .eq('symbol', symbol)
    .eq('interval', cacheInterval)
    .gt('time', startTimeSec)
    .order('time', { ascending: true })
    .limit(limit);

  if (error || !data || data.length === 0) return [];
  return data as RawKline[];
}

async function upsertKlines(symbol: string, cacheInterval: string, klines: RawKline[]) {
  if (klines.length === 0) return;

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
    await supabase.from('klines').upsert(chunk, { onConflict: 'symbol,interval,time' });
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
    // Silent fail: chart continues with existing cached data + live Binance updates.
    needsContinuation = true;
  } finally {
    backfillInProgress.delete(key);
  }

  if (needsContinuation) {
    scheduleBackfillContinuation(symbol, interval);
  }
}

async function fetchSourceWindow(
  symbol: string,
  sourceInterval: string,
  targetBars: number,
  endTimeMs?: number,
): Promise<RawKline[]> {
  const requestsToMake = Math.max(1, Math.min(20, Math.ceil(targetBars / 1000)));
  let endTime = endTimeMs;
  const collected: RawKline[] = [];

  for (let i = 0; i < requestsToMake; i += 1) {
    const batch = await fetchFromBinance(symbol, sourceInterval, 1000, undefined, endTime);
    if (batch.length === 0) break;

    collected.push(...batch);

    const oldestBatchMs = batch[0].time * 1000;
    endTime = oldestBatchMs - 1;

    if (batch.length < 1000) break;
    await wait(120);
  }

  return dedupeByTime(collected);
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
    await wait(120);
  }

  return dedupeByTime(collected);
}

async function loadKlinesForReplay(symbol: string, interval: Interval, replayEndTimeSec: number): Promise<RawKline[]> {
  const sourceInterval = getBinanceSourceInterval(interval);
  const safeReplayEndTime = Math.floor(replayEndTimeSec);
  const replayHistorySourceLimit = getReplayHistorySourceLimit(interval);
  const replayFutureSourceLimit = getReplayFutureSourceLimit(interval);

  const [cachedHistory, cachedFuture] = await Promise.all([
    getCachedKlinesEndingAt(
      symbol,
      sourceInterval,
      safeReplayEndTime,
      replayHistorySourceLimit,
    ),
    getCachedKlinesStartingAt(
      symbol,
      sourceInterval,
      safeReplayEndTime,
      replayFutureSourceLimit,
    ),
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
        void fetchSourceForwardWindow(
          symbol,
          sourceInterval,
          replayFutureSourceLimit,
          (safeReplayEndTime + 1) * 1000,
        ).then(rows => {
          if (rows.length > 0) {
            void upsertKlines(symbol, sourceInterval, rows);
          }
        }).catch(() => undefined);
      }

      return cachedAggregated;
    }
  }

  try {
    const [fetchedHistory, fetchedFuture] = await Promise.all([
      fetchSourceWindow(
        symbol,
        sourceInterval,
        replayHistorySourceLimit,
        safeReplayEndTime * 1000,
      ),
      fetchSourceForwardWindow(
        symbol,
        sourceInterval,
        replayFutureSourceLimit,
        (safeReplayEndTime + 1) * 1000,
      ),
    ]);

    const fetchedSourceWindow = dedupeByTime([...fetchedHistory, ...fetchedFuture]);

    if (fetchedSourceWindow.length > 0) {
      void upsertKlines(symbol, sourceInterval, fetchedSourceWindow);
      void backfillHistory(symbol, sourceInterval, fetchedHistory[0]?.time ?? fetchedSourceWindow[0].time);
    }

    return sliceReplayWindow(
      aggregateForInterval(fetchedSourceWindow, interval),
      safeReplayEndTime,
    );
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

async function loadKlinesFromSource(symbol: string, interval: Interval): Promise<RawKline[]> {
  const sourceInterval = getBinanceSourceInterval(interval);
  const sourceWindowLimit = getSourceWindowLimit(interval);

  const [oldestCachedTime, newestCachedTime] = await Promise.all([
    getCacheBound(symbol, sourceInterval, true),
    getCacheBound(symbol, sourceInterval, false),
  ]);

  if (newestCachedTime !== null) {
    const cachedSourceWindow = await getLatestCachedKlines(symbol, sourceInterval, sourceWindowLimit);
    if (cachedSourceWindow.length > 0) {
      const aggregated = aggregateForInterval(cachedSourceWindow, interval).slice(-INITIAL_RENDER_LIMIT);
      setRenderCache(getRenderCacheKey(symbol, interval), aggregated);
      void syncLatestAndBackfill(
        symbol,
        sourceInterval,
        interval,
        newestCachedTime,
        oldestCachedTime,
        cachedSourceWindow,
      );
      return aggregated;
    }
  }

  try {
    const latestSource = await fetchSourceWindow(symbol, sourceInterval, sourceWindowLimit);
    if (latestSource.length > 0) {
      void upsertKlines(symbol, sourceInterval, latestSource);
      void backfillHistory(symbol, sourceInterval, latestSource[0].time);
    }
    const aggregated = aggregateForInterval(latestSource, interval).slice(-INITIAL_RENDER_LIMIT);
    setRenderCache(getRenderCacheKey(symbol, interval), aggregated);
    return aggregated;
  } catch {
    return [];
  }
}

/**
 * Fast load for chart rendering:
 * - returns latest cached window quickly (avoids freezes on timeframe switch)
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

  // ─── Binance path ───
  const replayEndTimeSec = options.replayEndTimeSec;
  if (replayEndTimeSec !== null && replayEndTimeSec !== undefined && Number.isFinite(replayEndTimeSec)) {
    const normalizedReplayEnd = Math.floor(replayEndTimeSec);
    const replayCacheKey = getReplayCacheKey(normalizedSymbol, interval, normalizedReplayEnd);
    const cachedReplay = replayRenderCache.get(replayCacheKey);

    if (cachedReplay?.rows.length && Date.now() - cachedReplay.updatedAt <= REPLAY_RENDER_CACHE_TTL_MS) {
      return cachedReplay.rows;
    }

    const replayInFlight = replayFetchInProgress.get(replayCacheKey);
    if (replayInFlight) {
      return replayInFlight;
    }

    const replayPromise = loadKlinesForReplay(normalizedSymbol, interval, normalizedReplayEnd)
      .then(rows => {
        if (rows.length > 0) {
          setReplayRenderCache(replayCacheKey, rows);
        }
        return rows;
      })
      .finally(() => {
        replayFetchInProgress.delete(replayCacheKey);
      });

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
        .then(rows => {
          if (rows.length > 0) {
            setRenderCache(renderKey, rows);
          }
        })
        .finally(() => {
          renderRefreshInProgress.delete(renderKey);
        });
    }

    return cachedRender.rows;
  }

  const inFlight = renderFetchInProgress.get(renderKey);
  if (inFlight) {
    return inFlight;
  }

  const fetchPromise = loadKlinesFromSource(normalizedSymbol, interval)
    .then(rows => {
      if (rows.length > 0) {
        setRenderCache(renderKey, rows);
      }
      return rows;
    })
    .finally(() => {
      renderFetchInProgress.delete(renderKey);
    });

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
  // Non-Binance symbols don't use supabase cache for older data
  if (!isBinanceSymbol(symbol)) return [];

  const sourceInterval = getBinanceSourceInterval(interval);
  const sourceBarsPerTarget = getEstimatedSourceBarsPerTargetBar(interval);
  const sourceLimit = Math.min(Math.max(limit * sourceBarsPerTarget * 2, limit), MAX_SOURCE_QUERY_LIMIT);

  const { data, error } = await supabase
    .from('klines')
    .select('time, open, high, low, close, volume')
    .eq('symbol', symbol)
    .eq('interval', sourceInterval)
    .lt('time', beforeTime)
    .order('time', { ascending: false })
    .limit(sourceLimit);

  if (error || !data || data.length === 0) return [];

  const sourceRows = (data as RawKline[]).reverse();
  const aggregated = aggregateForInterval(sourceRows, interval)
    .filter(k => k.time < beforeTime)
    .slice(-limit);

  return aggregated;
}

/** Warm cache for all source intervals used across timeframe options for a symbol. */
export async function prefetchSymbolHistory(symbol: string): Promise<void> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) return;
  
  // Skip heavy prefetch for non-Binance symbols - they fetch on demand
  if (!isBinanceSymbol(normalizedSymbol)) return;
  
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

    for (const [sourceInterval, targetInterval] of sourceTargets.entries()) {
      const sourceKey = getSourcePrefetchKey(normalizedSymbol, sourceInterval);
      if (sourcePrefetchComplete.has(sourceKey) || sourcePrefetchInProgress.has(sourceKey)) {
        continue;
      }

      sourcePrefetchInProgress.add(sourceKey);
      try {
        await getKlines(normalizedSymbol, targetInterval);
        sourcePrefetchComplete.add(sourceKey);
      } catch {
        // Keep UI responsive; we'll retry on next relevant symbol interaction.
      } finally {
        sourcePrefetchInProgress.delete(sourceKey);
      }

      await wait(120);
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
