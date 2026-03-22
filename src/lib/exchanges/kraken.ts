import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

let cached: SearchResult[] | null = null;

const krakenAdapter: ExchangeAdapter = {
  info: {
    id: 'kraken',
    name: 'Kraken',
    color: '#5741D9',
    categories: ['crypto'],
    supportsTrade: true,
    requiresApiKey: true,
  },

  async searchSymbols(query: string, category?: AssetCategory) {
    const all = await this.fetchAllSymbols();
    const q = query.toLowerCase();
    return all.filter(s => {
      if (category && s.category !== category) return false;
      return s.symbol.toLowerCase().includes(q) || s.baseAsset.toLowerCase().includes(q);
    }).slice(0, 50);
  },

  async fetchAllSymbols(): Promise<SearchResult[]> {
    if (cached) return cached;
    try {
      const res = await fetch('https://api.kraken.com/0/public/AssetPairs');
      const data = await res.json();
      const results: SearchResult[] = [];
      for (const [pair, info] of Object.entries(data.result || {})) {
        const i = info as any;
        if (i.status !== 'online') continue;
        results.push({
          symbol: pair.replace('/', ''),
          displaySymbol: pair,
          baseAsset: i.base?.replace('X', '').replace('Z', '') || pair.split('/')[0] || pair,
          quoteAsset: i.quote?.replace('X', '').replace('Z', '') || 'USD',
          fullName: `${i.wsname || pair}`,
          exchangeId: 'kraken',
          exchangeName: 'Kraken',
          category: 'crypto',
          marketType: 'spot',
          tags: ['spot', 'crypto'],
        });
      }
      cached = results;
      return results;
    } catch { return []; }
  },

  async fetchKlines(symbol: string, interval: string, limit = 720): Promise<OHLCV[]> {
    const intMap: Record<string, number> = {
      '1m': 1, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 240, '1d': 1440, '1w': 10080,
    };
    const i = intMap[interval] || 60;
    try {
      const res = await fetch(`https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=${i}`);
      const data = await res.json();
      const key = Object.keys(data.result || {}).find(k => k !== 'last');
      if (!key) return [];
      return (data.result[key] as any[]).map((k: any[]) => ({
        time: k[0] * 1000,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[6]),
      }));
    } catch { return []; }
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    try {
      const res = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${symbol}`);
      const data = await res.json();
      const key = Object.keys(data.result || {})[0];
      if (!key) return null;
      const t = data.result[key];
      const last = parseFloat(t.c[0]);
      const open = parseFloat(t.o);
      return {
        symbol, lastPrice: last, change24h: last - open,
        changePct24h: open > 0 ? ((last - open) / open) * 100 : 0,
        volume24h: parseFloat(t.v[1]), high24h: parseFloat(t.h[1]), low24h: parseFloat(t.l[1]),
      };
    } catch { return null; }
  },
};

registerExchange(krakenAdapter);
export default krakenAdapter;
