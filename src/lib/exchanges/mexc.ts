import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

let cached: SearchResult[] | null = null;

const mexcAdapter: ExchangeAdapter = {
  info: {
    id: 'mexc',
    name: 'MEXC',
    color: '#2EBD85',
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
      const res = await fetch('https://api.mexc.com/api/v3/exchangeInfo');
      const data = await res.json();
      const results: SearchResult[] = [];
      for (const s of data.symbols || []) {
        if (s.status !== 'ENABLED' && s.status !== '1') continue;
        results.push({
          symbol: s.symbol,
          displaySymbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
          fullName: `${s.baseAsset} / ${s.quoteAsset}`,
          exchangeId: 'mexc',
          exchangeName: 'MEXC',
          category: 'crypto',
          marketType: 'spot',
          tags: ['spot', 'crypto'],
        });
      }
      cached = results;
      return results;
    } catch { return []; }
  },

  async fetchKlines(symbol: string, interval: string, limit = 500): Promise<OHLCV[]> {
    try {
      const res = await fetch(`https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      const data = await res.json();
      return data.map((k: any[]) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch { return []; }
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    try {
      const res = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`);
      const d = await res.json();
      return {
        symbol, lastPrice: parseFloat(d.lastPrice),
        change24h: parseFloat(d.priceChange),
        changePct24h: parseFloat(d.priceChangePercent),
        volume24h: parseFloat(d.quoteVolume),
        high24h: parseFloat(d.highPrice), low24h: parseFloat(d.lowPrice),
      };
    } catch { return null; }
  },
};

registerExchange(mexcAdapter);
export default mexcAdapter;
