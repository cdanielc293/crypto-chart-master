import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BINANCE_MAX_LIMIT = 1000;
const MAX_FETCH_ITERATIONS = 50; // max 50K candles per request
const CSV_HEADER = "time,open,high,low,close,volume\n";

// Binance API endpoints (with fallbacks)
const BINANCE_ENDPOINTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
  "https://api1.binance.com",
];

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── CSV helpers ───

function candlesToCsv(candles: Candle[]): string {
  return candles.map(c => `${c.time},${c.open},${c.high},${c.low},${c.close},${c.volume}`).join("\n") + "\n";
}

function csvToCandles(csv: string): Candle[] {
  const lines = csv.trim().split("\n");
  const candles: Candle[] = [];
  for (const line of lines) {
    if (line.startsWith("time,") || !line.trim()) continue;
    const parts = line.split(",");
    if (parts.length < 6) continue;
    candles.push({
      time: parseInt(parts[0]),
      open: parseFloat(parts[1]),
      high: parseFloat(parts[2]),
      low: parseFloat(parts[3]),
      close: parseFloat(parts[4]),
      volume: parseFloat(parts[5]),
    });
  }
  return candles;
}

function getYearFromTimeSec(timeSec: number): number {
  return new Date(timeSec * 1000).getUTCFullYear();
}

function getStoragePath(symbol: string, interval: string, year: number): string {
  return `${symbol}/${interval}/${year}.csv`;
}

// ─── Binance fetch ───

async function fetchBinanceKlines(
  symbol: string,
  interval: string,
  startTimeMs: number,
  endTimeMs: number,
): Promise<Candle[]> {
  const cleanSymbol = symbol.replace(".P", "");
  const isFutures = symbol.endsWith(".P");

  for (const baseUrl of BINANCE_ENDPOINTS) {
    try {
      const base = isFutures
        ? "https://fapi.binance.com/fapi/v1"
        : `${baseUrl}/api/v3`;

      const allCandles: Candle[] = [];
      let currentStart = startTimeMs;
      let iterations = 0;

      while (currentStart < endTimeMs && iterations < MAX_FETCH_ITERATIONS) {
        iterations++;
        const url = `${base}/klines?symbol=${cleanSymbol}&interval=${interval}&startTime=${currentStart}&endTime=${endTimeMs}&limit=${BINANCE_MAX_LIMIT}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Binance ${res.status}`);
        const data = await res.json();
        if (!data.length) break;

        for (const k of data) {
          allCandles.push({
            time: Math.floor(k[0] / 1000),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          });
        }

        if (data.length < BINANCE_MAX_LIMIT) break;
        currentStart = data[data.length - 1][0] + 1;
      }

      return allCandles;
    } catch {
      continue;
    }
  }

  return [];
}

// ─── Storage helpers ───

async function readCsvFromStorage(
  storageClient: any,
  path: string,
): Promise<Candle[]> {
  const { data, error } = await storageClient
    .from("chart-history")
    .download(path);

  if (error || !data) return [];

  const text = await data.text();
  return csvToCandles(text);
}

async function writeCsvToStorage(
  storageClient: any,
  path: string,
  candles: Candle[],
): Promise<void> {
  const csvContent = CSV_HEADER + candlesToCsv(candles);
  const blob = new Blob([csvContent], { type: "text/csv" });

  // Try update first, then insert
  const { error: updateError } = await storageClient
    .from("chart-history")
    .update(path, blob, { contentType: "text/csv", upsert: true });

  if (updateError) {
    await storageClient
      .from("chart-history")
      .upload(path, blob, { contentType: "text/csv", upsert: true });
  }
}

function mergeCandles(existing: Candle[], incoming: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of existing) map.set(c.time, c);
  for (const c of incoming) map.set(c.time, c);
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate — verify the caller has a valid session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use service role to verify the JWT token
    const adminClient = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for storage operations
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { symbol, interval, startTime, endTime } = await req.json();
    if (!symbol || !interval || !startTime || !endTime) {
      return new Response(
        JSON.stringify({ error: "symbol, interval, startTime (unix sec), endTime (unix sec) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedSymbol = symbol.toUpperCase();
    const startYear = getYearFromTimeSec(startTime);
    const endYear = getYearFromTimeSec(endTime);

    let allCandles: Candle[] = [];
    const gapRanges: { start: number; end: number }[] = [];

    // 1. Read existing CSV files from Storage for each year in range
    for (let year = startYear; year <= endYear; year++) {
      const path = getStoragePath(normalizedSymbol, interval, year);
      const cached = await readCsvFromStorage(adminClient.storage, path);

      if (cached.length > 0) {
        allCandles.push(...cached);
      }
    }

    // Sort and dedupe
    allCandles = mergeCandles([], allCandles);

    // 2. Find gaps in the requested range
    const filteredInRange = allCandles.filter(c => c.time >= startTime && c.time <= endTime);

    if (filteredInRange.length === 0) {
      // No data at all — fetch everything from Binance
      gapRanges.push({ start: startTime * 1000, end: endTime * 1000 });
    } else {
      // Check for gap at the beginning
      if (filteredInRange[0].time > startTime) {
        gapRanges.push({ start: startTime * 1000, end: filteredInRange[0].time * 1000 - 1 });
      }
      // Check for gap at the end
      if (filteredInRange[filteredInRange.length - 1].time < endTime) {
        gapRanges.push({
          start: filteredInRange[filteredInRange.length - 1].time * 1000 + 1,
          end: endTime * 1000,
        });
      }
    }

    // 3. Fill gaps from Binance
    let newCandlesFetched = false;
    for (const gap of gapRanges) {
      const fetched = await fetchBinanceKlines(normalizedSymbol, interval, gap.start, gap.end);
      if (fetched.length > 0) {
        allCandles = mergeCandles(allCandles, fetched);
        newCandlesFetched = true;
      }
    }

    // 4. If we fetched new data, update Storage CSVs per year
    if (newCandlesFetched) {
      const byYear = new Map<number, Candle[]>();
      for (const c of allCandles) {
        const year = getYearFromTimeSec(c.time);
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year)!.push(c);
      }

      // Write updated CSV files in parallel
      const writePromises: Promise<void>[] = [];
      for (const [year, candles] of byYear) {
        const sorted = candles.sort((a, b) => a.time - b.time);
        const path = getStoragePath(normalizedSymbol, interval, year);
        writePromises.push(writeCsvToStorage(adminClient.storage, path, sorted));
      }
      await Promise.allSettled(writePromises);
    }

    // 5. Return filtered result
    const result = allCandles
      .filter(c => c.time >= startTime && c.time <= endTime)
      .sort((a, b) => a.time - b.time);

    return new Response(
      JSON.stringify({ candles: result, cached: !newCandlesFetched, total: result.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("backtest-klines error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
