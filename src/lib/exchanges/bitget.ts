import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

let cached: SearchResult[] | null = null;

const bitgetAdapter: ExchangeAdapter = {
  info: {
    id: 'bitget',
    name: 'Bitget',
    color: '#00F0FF',
    categories: ['crypto', 'futures'],
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
      const res = await fetch('https://api.bitget.com/api/v2/spot/public/symbols');
      const data = await res.json();
      const results: SearchResult[] = [];
      for (const s of data.data || []) {
        if (s.status !== 'online') continue;
        results.push({
          symbol: s.symbol?.replace('_', '') || `${s.baseCoin}${s.quoteCoin}`,
          displaySymbol: s.symbolName || s.symbol,
          baseAsset: s.baseCoin,
          quoteAsset: s.quoteCoin,
          fullName: `${s.baseCoin} / ${s.quoteCoin}`,
          exchangeId: 'bitget',
          exchangeName: 'Bitget',
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
    const intMap: Record<string, string> = {
      '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
      '1h': '1h', '4h': '4h', '6h': '6h', '12h': '12h', '1d': '1day', '1w': '1week',
    };
    const granularity = intMap[interval] || '1h';
    const bgSymbol = symbol.replace(/([A-Z]+)(USDT?)/, '$1$2');
    try {
      const res = await fetch(`https://api.bitget.com/api/v2/spot/market/candles?symbol=${bgSymbol}&granularity=${granularity}&limit=${limit}`);
      const data = await res.json();
      return (data.data || []).reverse().map((k: string[]) => ({
        time: parseInt(k[0]),
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
      const res = await fetch(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${symbol}`);
      const data = await res.json();
      const t = data.data?.[0];
      if (!t) return null;
      const last = parseFloat(t.lastPr || t.close);
      const open = parseFloat(t.open24h || t.open);
      return {
        symbol, lastPrice: last, change24h: last - open,
        changePct24h: parseFloat(t.change24h || '0') * 100,
        volume24h: parseFloat(t.quoteVolume || t.usdtVolume || '0'),
        high24h: parseFloat(t.high24h), low24h: parseFloat(t.low24h),
      };
    } catch { return null; }
  },
};

registerExchange(bitgetAdapter);
export default bitgetAdapter;
