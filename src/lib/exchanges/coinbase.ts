import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

let cachedSymbols: SearchResult[] | null = null;

const coinbaseAdapter: ExchangeAdapter = {
  info: {
    id: 'coinbase',
    name: 'Coinbase',
    logo: '🔵',
    color: '#0052FF',
    categories: ['crypto'],
    supportsTrade: true,
    requiresApiKey: true,
  },

  async searchSymbols(query: string, category?: AssetCategory): Promise<SearchResult[]> {
    const all = await this.fetchAllSymbols();
    const q = query.toLowerCase();
    return all
      .filter(s => {
        if (category && s.category !== category) return false;
        return s.symbol.toLowerCase().includes(q) || s.baseAsset.toLowerCase().includes(q);
      })
      .slice(0, 50);
  },

  async fetchAllSymbols(): Promise<SearchResult[]> {
    if (cachedSymbols) return cachedSymbols;

    try {
      const res = await fetch('https://api.exchange.coinbase.com/products');
      const data = await res.json();
      const results: SearchResult[] = [];

      for (const p of data) {
        if (p.status !== 'online' || p.trading_disabled) continue;
        results.push({
          symbol: p.id.replace('-', ''),
          displaySymbol: p.id,
          baseAsset: p.base_currency,
          quoteAsset: p.quote_currency,
          fullName: `${p.base_currency} / ${p.quote_currency}`,
          exchangeId: 'coinbase',
          exchangeName: 'Coinbase',
          category: 'crypto',
          marketType: 'spot',
          tags: ['spot', 'crypto', 'defi'],
        });
      }

      cachedSymbols = results;
      return results;
    } catch {
      return [];
    }
  },

  async fetchKlines(symbol: string, interval: string, limit = 300): Promise<OHLCV[]> {
    const product = symbol.replace(/([A-Z]+)(USDT?|USD|EUR|GBP)/, '$1-$2');
    const granMap: Record<string, number> = {
      '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '6h': 21600, '1d': 86400,
    };
    const granularity = granMap[interval] || 3600;
    try {
      const res = await fetch(
        `https://api.exchange.coinbase.com/products/${product}/candles?granularity=${granularity}`
      );
      const data = await res.json();
      return data.reverse().map((k: number[]) => ({
        time: k[0] * 1000,
        open: k[3],
        high: k[2],
        low: k[1],
        close: k[4],
        volume: k[5],
      }));
    } catch {
      return [];
    }
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    const product = symbol.replace(/([A-Z]+)(USDT?|USD|EUR|GBP)/, '$1-$2');
    try {
      const [tickerRes, statsRes] = await Promise.all([
        fetch(`https://api.exchange.coinbase.com/products/${product}/ticker`).then(r => r.json()),
        fetch(`https://api.exchange.coinbase.com/products/${product}/stats`).then(r => r.json()),
      ]);
      const price = parseFloat(tickerRes.price);
      const open = parseFloat(statsRes.open);
      return {
        symbol,
        lastPrice: price,
        change24h: price - open,
        changePct24h: open > 0 ? ((price - open) / open) * 100 : 0,
        volume24h: parseFloat(statsRes.volume_30day || statsRes.volume || '0'),
        high24h: parseFloat(statsRes.high),
        low24h: parseFloat(statsRes.low),
      };
    } catch {
      return null;
    }
  },
};

registerExchange(coinbaseAdapter);
export default coinbaseAdapter;
