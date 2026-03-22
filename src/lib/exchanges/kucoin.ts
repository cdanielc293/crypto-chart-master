import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

let cached: SearchResult[] | null = null;

const kucoinAdapter: ExchangeAdapter = {
  info: {
    id: 'kucoin',
    name: 'KuCoin',
    color: '#23AF91',
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
      const res = await fetch('https://api.kucoin.com/api/v1/symbols');
      const data = await res.json();
      const results: SearchResult[] = [];
      for (const s of data.data || []) {
        if (!s.enableTrading) continue;
        results.push({
          symbol: s.symbol.replace('-', ''),
          displaySymbol: s.symbol,
          baseAsset: s.baseCurrency,
          quoteAsset: s.quoteCurrency,
          fullName: `${s.baseCurrency} / ${s.quoteCurrency}`,
          exchangeId: 'kucoin',
          exchangeName: 'KuCoin',
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
      '1m': '1min', '3m': '3min', '5m': '5min', '15m': '15min', '30m': '30min',
      '1h': '1hour', '2h': '2hour', '4h': '4hour', '6h': '6hour', '8h': '8hour', '12h': '12hour',
      '1d': '1day', '1w': '1week',
    };
    const type = intMap[interval] || '1hour';
    const dashSymbol = symbol.replace(/([A-Z]+)(USDT?)/, '$1-$2');
    try {
      const res = await fetch(`https://api.kucoin.com/api/v1/market/candles?type=${type}&symbol=${dashSymbol}`);
      const data = await res.json();
      return (data.data || []).reverse().map((k: string[]) => ({
        time: parseInt(k[0]) * 1000,
        open: parseFloat(k[1]),
        close: parseFloat(k[2]),
        high: parseFloat(k[3]),
        low: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch { return []; }
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    const dashSymbol = symbol.replace(/([A-Z]+)(USDT?)/, '$1-$2');
    try {
      const res = await fetch(`https://api.kucoin.com/api/v1/market/stats?symbol=${dashSymbol}`);
      const data = await res.json();
      const t = data.data;
      if (!t) return null;
      const last = parseFloat(t.last);
      const open = parseFloat(t.open || t.last);
      return {
        symbol, lastPrice: last, change24h: last - open,
        changePct24h: parseFloat(t.changeRate || '0') * 100,
        volume24h: parseFloat(t.volValue || '0'), high24h: parseFloat(t.high), low24h: parseFloat(t.low),
      };
    } catch { return null; }
  },
};

registerExchange(kucoinAdapter);
export default kucoinAdapter;
