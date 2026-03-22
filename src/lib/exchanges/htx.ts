import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

let cached: SearchResult[] | null = null;

const htxAdapter: ExchangeAdapter = {
  info: {
    id: 'htx',
    name: 'HTX',
    color: '#2B6DEF',
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
      const res = await fetch('https://api.huobi.pro/v1/common/symbols');
      const data = await res.json();
      const results: SearchResult[] = [];
      for (const s of data.data || []) {
        if (s.state !== 'online') continue;
        const base = s['base-currency']?.toUpperCase() || '';
        const quote = s['quote-currency']?.toUpperCase() || '';
        results.push({
          symbol: `${base}${quote}`,
          displaySymbol: s.symbol,
          baseAsset: base,
          quoteAsset: quote,
          fullName: `${base} / ${quote}`,
          exchangeId: 'htx',
          exchangeName: 'HTX',
          category: 'crypto',
          marketType: 'spot',
          tags: ['spot', 'crypto'],
        });
      }
      cached = results;
      return results;
    } catch { return []; }
  },

  async fetchKlines(symbol: string, interval: string, limit = 300): Promise<OHLCV[]> {
    const intMap: Record<string, string> = {
      '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
      '1h': '60min', '4h': '4hour', '1d': '1day', '1w': '1week', '1M': '1mon',
    };
    const period = intMap[interval] || '60min';
    const htxSymbol = symbol.toLowerCase();
    try {
      const res = await fetch(`https://api.huobi.pro/market/history/kline?symbol=${htxSymbol}&period=${period}&size=${limit}`);
      const data = await res.json();
      return (data.data || []).reverse().map((k: any) => ({
        time: k.id * 1000,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.vol,
      }));
    } catch { return []; }
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    const htxSymbol = symbol.toLowerCase();
    try {
      const res = await fetch(`https://api.huobi.pro/market/detail/merged?symbol=${htxSymbol}`);
      const data = await res.json();
      const t = data.tick;
      if (!t) return null;
      const last = t.close;
      const open = t.open;
      return {
        symbol, lastPrice: last, change24h: last - open,
        changePct24h: open > 0 ? ((last - open) / open) * 100 : 0,
        volume24h: t.vol, high24h: t.high, low24h: t.low,
      };
    } catch { return null; }
  },
};

registerExchange(htxAdapter);
export default htxAdapter;
