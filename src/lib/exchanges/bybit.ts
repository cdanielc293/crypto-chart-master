import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

let cachedSymbols: SearchResult[] | null = null;

const bybitAdapter: ExchangeAdapter = {
  info: {
    id: 'bybit',
    name: 'Bybit',
    logo: '🔶',
    color: '#F7A600',
    categories: ['crypto', 'futures'],
    supportsTrade: true,
    requiresApiKey: true,
  },

  async searchSymbols(query: string, category?: AssetCategory): Promise<SearchResult[]> {
    const all = await this.fetchAllSymbols();
    const q = query.toLowerCase();
    return all
      .filter(s => {
        if (category && s.category !== category) return false;
        return s.symbol.toLowerCase().includes(q) ||
               s.baseAsset.toLowerCase().includes(q);
      })
      .slice(0, 50);
  },

  async fetchAllSymbols(): Promise<SearchResult[]> {
    if (cachedSymbols) return cachedSymbols;

    try {
      const res = await fetch('https://api.bybit.com/v5/market/instruments-info?category=spot');
      const data = await res.json();
      const results: SearchResult[] = [];

      for (const s of data.result?.list || []) {
        if (s.status !== 'Trading') continue;
        results.push({
          symbol: s.symbol,
          displaySymbol: s.symbol,
          baseAsset: s.baseCoin,
          quoteAsset: s.quoteCoin,
          fullName: `${s.baseCoin} / ${s.quoteCoin}`,
          exchangeId: 'bybit',
          exchangeName: 'Bybit',
          category: 'crypto',
          marketType: 'spot',
          tags: ['spot', 'crypto'],
        });
      }

      // Perpetual contracts
      const futRes = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear');
      const futData = await futRes.json();
      for (const s of futData.result?.list || []) {
        if (s.status !== 'Trading' || s.contractType !== 'LinearPerpetual') continue;
        results.push({
          symbol: `${s.symbol}.P`,
          displaySymbol: `${s.symbol}.P`,
          baseAsset: s.baseCoin,
          quoteAsset: s.quoteCoin,
          fullName: `${s.baseCoin} Perpetual Contract`,
          exchangeId: 'bybit',
          exchangeName: 'Bybit',
          category: 'futures',
          marketType: 'swap',
          tags: ['swap', 'crypto', 'defi'],
        });
      }

      cachedSymbols = results;
      return results;
    } catch {
      return [];
    }
  },

  async fetchKlines(symbol: string, interval: string, limit = 200): Promise<OHLCV[]> {
    const cleanSymbol = symbol.replace('.P', '');
    const isFutures = symbol.endsWith('.P');
    const category = isFutures ? 'linear' : 'spot';

    // Bybit interval mapping
    const intervalMap: Record<string, string> = {
      '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
      '1h': '60', '2h': '120', '4h': '240', '6h': '360', '12h': '720',
      '1d': 'D', '1w': 'W', '1M': 'M',
    };
    const bybitInterval = intervalMap[interval] || '60';

    try {
      const res = await fetch(
        `https://api.bybit.com/v5/market/kline?category=${category}&symbol=${cleanSymbol}&interval=${bybitInterval}&limit=${limit}`
      );
      const data = await res.json();
      return (data.result?.list || []).reverse().map((k: any[]) => ({
        time: parseInt(k[0]),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch {
      return [];
    }
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    const cleanSymbol = symbol.replace('.P', '');
    try {
      const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${cleanSymbol}`);
      const data = await res.json();
      const t = data.result?.list?.[0];
      if (!t) return null;
      return {
        symbol: t.symbol,
        lastPrice: parseFloat(t.lastPrice),
        change24h: parseFloat(t.lastPrice) - parseFloat(t.prevPrice24h),
        changePct24h: parseFloat(t.price24hPcnt) * 100,
        volume24h: parseFloat(t.turnover24h),
        high24h: parseFloat(t.highPrice24h),
        low24h: parseFloat(t.lowPrice24h),
      };
    } catch {
      return null;
    }
  },

  getTickerStreamUrl(symbols: string[]): string {
    return 'wss://stream.bybit.com/v5/public/spot';
  },

  parseTickerMessage(msg: any) {
    if (msg.topic?.startsWith('tickers.') && msg.data) {
      const d = msg.data;
      return {
        symbol: d.symbol,
        price: parseFloat(d.lastPrice),
        change: parseFloat(d.lastPrice) - parseFloat(d.prevPrice24h || '0'),
        changePct: parseFloat(d.price24hPcnt || '0') * 100,
        volume: parseFloat(d.turnover24h || '0'),
      };
    }
    return null;
  },
};

registerExchange(bybitAdapter);
export default bybitAdapter;
