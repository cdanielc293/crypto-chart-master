import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

let cached: SearchResult[] | null = null;

const gateioAdapter: ExchangeAdapter = {
  info: {
    id: 'gateio',
    name: 'Gate.io',
    color: '#2354E6',
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
      const res = await fetch('https://api.gateio.ws/api/v4/spot/currency_pairs');
      const data = await res.json();
      const results: SearchResult[] = [];
      for (const s of data) {
        if (s.trade_status !== 'tradable') continue;
        results.push({
          symbol: s.id.replace('_', ''),
          displaySymbol: s.id,
          baseAsset: s.base,
          quoteAsset: s.quote,
          fullName: `${s.base} / ${s.quote}`,
          exchangeId: 'gateio',
          exchangeName: 'Gate.io',
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
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '8h': '8h', '1d': '1d', '1w': '7d',
    };
    const i = intMap[interval] || '1h';
    const pair = symbol.replace(/([A-Z]+)(USDT?)/, '$1_$2');
    try {
      const res = await fetch(`https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${pair}&interval=${i}&limit=${limit}`);
      const data = await res.json();
      return data.map((k: string[]) => ({
        time: parseInt(k[0]) * 1000,
        open: parseFloat(k[5]),
        high: parseFloat(k[3]),
        low: parseFloat(k[4]),
        close: parseFloat(k[2]),
        volume: parseFloat(k[1]),
      }));
    } catch { return []; }
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    const pair = symbol.replace(/([A-Z]+)(USDT?)/, '$1_$2');
    try {
      const res = await fetch(`https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${pair}`);
      const data = await res.json();
      const t = data[0];
      if (!t) return null;
      const last = parseFloat(t.last);
      return {
        symbol, lastPrice: last,
        change24h: parseFloat(t.change_utc0 || '0'),
        changePct24h: parseFloat(t.change_percentage || '0'),
        volume24h: parseFloat(t.quote_volume || '0'),
        high24h: parseFloat(t.high_24h), low24h: parseFloat(t.low_24h),
      };
    } catch { return null; }
  },
};

registerExchange(gateioAdapter);
export default gateioAdapter;
