import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

let cached: SearchResult[] | null = null;

const bitstampAdapter: ExchangeAdapter = {
  info: {
    id: 'bitstamp',
    name: 'Bitstamp',
    color: '#15A157',
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
      const res = await fetch('https://www.bitstamp.net/api/v2/trading-pairs-info/');
      const data = await res.json();
      const results: SearchResult[] = [];
      for (const s of data) {
        if (s.trading !== 'Enabled') continue;
        const [base, quote] = s.name.split('/');
        results.push({
          symbol: s.url_symbol?.toUpperCase() || `${base}${quote}`,
          displaySymbol: s.name,
          baseAsset: base,
          quoteAsset: quote,
          fullName: `${base} / ${quote}`,
          exchangeId: 'bitstamp',
          exchangeName: 'Bitstamp',
          category: 'crypto',
          marketType: 'spot',
          tags: ['spot', 'crypto'],
        });
      }
      cached = results;
      return results;
    } catch { return []; }
  },

  async fetchKlines(symbol: string, interval: string, limit = 200): Promise<OHLCV[]> {
    const stepMap: Record<string, number> = {
      '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800,
      '1h': 3600, '4h': 14400, '1d': 86400,
    };
    const step = stepMap[interval] || 3600;
    const pair = symbol.toLowerCase();
    try {
      const res = await fetch(`https://www.bitstamp.net/api/v2/ohlc/${pair}/?step=${step}&limit=${limit}`);
      const data = await res.json();
      return (data.data?.ohlc || []).map((k: any) => ({
        time: parseInt(k.timestamp) * 1000,
        open: parseFloat(k.open),
        high: parseFloat(k.high),
        low: parseFloat(k.low),
        close: parseFloat(k.close),
        volume: parseFloat(k.volume),
      }));
    } catch { return []; }
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    const pair = symbol.toLowerCase();
    try {
      const res = await fetch(`https://www.bitstamp.net/api/v2/ticker/${pair}/`);
      const t = await res.json();
      const last = parseFloat(t.last);
      const open = parseFloat(t.open);
      return {
        symbol, lastPrice: last, change24h: last - open,
        changePct24h: open > 0 ? ((last - open) / open) * 100 : 0,
        volume24h: parseFloat(t.volume), high24h: parseFloat(t.high), low24h: parseFloat(t.low),
      };
    } catch { return null; }
  },
};

registerExchange(bitstampAdapter);
export default bitstampAdapter;
