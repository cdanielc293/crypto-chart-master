// Shared Yahoo Finance proxy utility
// Routes requests through our edge function to avoid CORS issues

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function yahooFetch(path: string): Promise<any> {
  const proxyUrl = `${SUPABASE_URL}/functions/v1/yahoo-proxy?path=${encodeURIComponent(path)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Yahoo proxy error: ${res.status}`);
  return res.json();
}

export function getYahooChartUrl(symbol: string, interval: string, range: string): string {
  return `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
}

export function getYahooSearchUrl(query: string): string {
  return `/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
}

export const YAHOO_INTERVAL_MAP: Record<string, { i: string; range: string }> = {
  '1m': { i: '1m', range: '7d' },
  '5m': { i: '5m', range: '60d' },
  '15m': { i: '15m', range: '60d' },
  '30m': { i: '30m', range: '60d' },
  '1h': { i: '1h', range: '2y' },
  '4h': { i: '1h', range: '2y' },
  '1d': { i: '1d', range: '10y' },
  '1w': { i: '1wk', range: 'max' },
  '1M': { i: '1mo', range: 'max' },
};

export function parseYahooChart(data: any): { time: number; open: number; high: number; low: number; close: number; volume: number }[] {
  const result = data.chart?.result?.[0];
  if (!result) return [];
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const ohlcv: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = [];
  for (let j = 0; j < ts.length; j++) {
    if (q.open?.[j] == null || q.close?.[j] == null) continue;
    ohlcv.push({
      time: ts[j] * 1000,
      open: q.open[j],
      high: q.high[j] ?? q.open[j],
      low: q.low[j] ?? q.open[j],
      close: q.close[j],
      volume: q.volume?.[j] || 0,
    });
  }
  return ohlcv;
}

export function parseYahooTicker(data: any, symbol: string) {
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const last = meta.regularMarketPrice;
  const prevClose = meta.previousClose || meta.chartPreviousClose;
  return {
    symbol,
    lastPrice: last,
    change24h: last - prevClose,
    changePct24h: prevClose > 0 ? ((last - prevClose) / prevClose) * 100 : 0,
    volume24h: meta.regularMarketVolume || 0,
    high24h: meta.regularMarketDayHigh || last,
    low24h: meta.regularMarketDayLow || last,
  };
}
