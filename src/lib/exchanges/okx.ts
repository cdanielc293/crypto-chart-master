import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

let cached: SearchResult[] | null = null;

const okxAdapter: ExchangeAdapter = {
  info: {
    id: 'okx',
    name: 'OKX',
    color: '#FFFFFF',
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
      const res = await fetch('https://www.okx.com/api/v5/public/instruments?instType=SPOT');
      const data = await res.json();
      const results: SearchResult[] = [];
      for (const s of data.data || []) {
        if (s.state !== 'live') continue;
        const base = s.baseCcy;
        const quote = s.quoteCcy;
        results.push({
          symbol: `${base}${quote}`,
          displaySymbol: s.instId,
          baseAsset: base,
          quoteAsset: quote,
          fullName: `${base} / ${quote}`,
          exchangeId: 'okx',
          exchangeName: 'OKX',
          category: 'crypto',
          marketType: 'spot',
          tags: ['spot', 'crypto'],
        });
      }

      // Perpetual swaps
      try {
        const swapRes = await fetch('https://www.okx.com/api/v5/public/instruments?instType=SWAP');
        const swapData = await swapRes.json();
        for (const s of swapData.data || []) {
          if (s.state !== 'live' || s.settleCcy !== 'USDT') continue;
          results.push({
            symbol: `${s.ctValCcy}USDT.P`,
            displaySymbol: `${s.instId}`,
            baseAsset: s.ctValCcy,
            quoteAsset: 'USDT',
            fullName: `${s.ctValCcy} Perpetual Swap`,
            exchangeId: 'okx',
            exchangeName: 'OKX',
            category: 'futures',
            marketType: 'swap',
            tags: ['swap', 'crypto', 'defi'],
          });
        }
      } catch {}

      cached = results;
      return results;
    } catch { return []; }
  },

  async fetchKlines(symbol: string, interval: string, limit = 100): Promise<OHLCV[]> {
    const barMap: Record<string, string> = {
      '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1H', '2h': '2H', '4h': '4H', '6h': '6H', '12h': '12H',
      '1d': '1D', '1w': '1W', '1M': '1M',
    };
    const bar = barMap[interval] || '1H';
    const instId = symbol.replace(/([A-Z]+)(USDT?)/, '$1-$2');
    try {
      const res = await fetch(`https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`);
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
    const instId = symbol.replace('.P', '').replace(/([A-Z]+)(USDT?)/, '$1-$2');
    try {
      const res = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`);
      const data = await res.json();
      const t = data.data?.[0];
      if (!t) return null;
      const last = parseFloat(t.last);
      const open = parseFloat(t.open24h);
      return {
        symbol, lastPrice: last, change24h: last - open,
        changePct24h: open > 0 ? ((last - open) / open) * 100 : 0,
        volume24h: parseFloat(t.vol24h), high24h: parseFloat(t.high24h), low24h: parseFloat(t.low24h),
      };
    } catch { return null; }
  },
};

registerExchange(okxAdapter);
export default okxAdapter;
