import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

// INDICES - major global indices via Yahoo Finance
const INDICES: { symbol: string; yahoo: string; name: string }[] = [
  { symbol: 'SPX', yahoo: '^GSPC', name: 'S&P 500' },
  { symbol: 'DJI', yahoo: '^DJI', name: 'Dow Jones Industrial Average' },
  { symbol: 'IXIC', yahoo: '^IXIC', name: 'NASDAQ Composite' },
  { symbol: 'RUT', yahoo: '^RUT', name: 'Russell 2000' },
  { symbol: 'VIX', yahoo: '^VIX', name: 'CBOE Volatility Index' },
  { symbol: 'FTSE', yahoo: '^FTSE', name: 'FTSE 100 (London)' },
  { symbol: 'GDAXI', yahoo: '^GDAXI', name: 'DAX (Germany)' },
  { symbol: 'FCHI', yahoo: '^FCHI', name: 'CAC 40 (France)' },
  { symbol: 'N225', yahoo: '^N225', name: 'Nikkei 225 (Japan)' },
  { symbol: 'HSI', yahoo: '^HSI', name: 'Hang Seng Index' },
  { symbol: 'SSEC', yahoo: '000001.SS', name: 'Shanghai Composite' },
  { symbol: 'BSESN', yahoo: '^BSESN', name: 'BSE SENSEX (India)' },
  { symbol: 'KOSPI', yahoo: '^KS11', name: 'KOSPI (South Korea)' },
  { symbol: 'STOXX50E', yahoo: '^STOXX50E', name: 'Euro Stoxx 50' },
  { symbol: 'IBEX', yahoo: '^IBEX', name: 'IBEX 35 (Spain)' },
  { symbol: 'AXJO', yahoo: '^AXJO', name: 'ASX 200 (Australia)' },
  { symbol: 'TA35', yahoo: '^TA125.TA', name: 'TA-125 (Israel)' },
];

const indicesAdapter: ExchangeAdapter = {
  info: {
    id: 'yahoo_indices',
    name: 'Indices',
    color: '#FF6B00',
    categories: ['indices'],
    supportsTrade: false,
    requiresApiKey: false,
  },

  async searchSymbols(query: string) {
    const all = await this.fetchAllSymbols();
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(s =>
      s.symbol.toLowerCase().includes(q) || s.fullName.toLowerCase().includes(q)
    );
  },

  async fetchAllSymbols(): Promise<SearchResult[]> {
    return INDICES.map(idx => ({
      symbol: idx.symbol,
      displaySymbol: idx.symbol,
      baseAsset: idx.symbol,
      quoteAsset: '',
      fullName: idx.name,
      exchangeId: 'yahoo_indices',
      exchangeName: 'INDEX',
      category: 'indices' as AssetCategory,
      marketType: 'index' as const,
      tags: ['index'],
    }));
  },

  async fetchKlines(symbol: string, interval: string): Promise<OHLCV[]> {
    const idx = INDICES.find(i => i.symbol === symbol);
    const yahooSymbol = idx?.yahoo || `^${symbol}`;
    const intMap: Record<string, { i: string; range: string }> = {
      '1m': { i: '1m', range: '1d' },
      '5m': { i: '5m', range: '5d' },
      '15m': { i: '15m', range: '5d' },
      '1h': { i: '1h', range: '1mo' },
      '1d': { i: '1d', range: '1y' },
      '1w': { i: '1wk', range: '5y' },
      '1M': { i: '1mo', range: '10y' },
    };
    const { i, range } = intMap[interval] || { i: '1d', range: '1y' };

    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${i}&range=${range}`
      );
      const data = await res.json();
      const result = data.chart?.result?.[0];
      if (!result) return [];
      const ts = result.timestamp || [];
      const q = result.indicators?.quote?.[0] || {};
      const ohlcv: OHLCV[] = [];
      for (let j = 0; j < ts.length; j++) {
        if (q.open?.[j] == null) continue;
        ohlcv.push({
          time: ts[j] * 1000,
          open: q.open[j], high: q.high[j], low: q.low[j],
          close: q.close[j], volume: q.volume?.[j] || 0,
        });
      }
      return ohlcv;
    } catch { return []; }
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    const idx = INDICES.find(i => i.symbol === symbol);
    const yahooSymbol = idx?.yahoo || `^${symbol}`;
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`
      );
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const last = meta.regularMarketPrice;
      const prev = meta.previousClose || meta.chartPreviousClose;
      return {
        symbol, lastPrice: last, change24h: last - prev,
        changePct24h: prev > 0 ? ((last - prev) / prev) * 100 : 0,
        volume24h: meta.regularMarketVolume || 0,
        high24h: meta.regularMarketDayHigh || last,
        low24h: meta.regularMarketDayLow || last,
      };
    } catch { return null; }
  },
};

registerExchange(indicesAdapter);
export default indicesAdapter;
