import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

let cachedSymbols: SearchResult[] | null = null;

const binanceAdapter: ExchangeAdapter = {
  info: {
    id: 'binance',
    name: 'Binance',
    logo: '⚙',
    color: '#F3BA2F',
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
               s.baseAsset.toLowerCase().includes(q) ||
               s.fullName.toLowerCase().includes(q);
      })
      .slice(0, 50);
  },

  async fetchAllSymbols(): Promise<SearchResult[]> {
    if (cachedSymbols) return cachedSymbols;

    const [spotRes, futuresRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/exchangeInfo').then(r => r.json()).catch(() => ({ symbols: [] })),
      fetch('https://fapi.binance.com/fapi/v1/exchangeInfo').then(r => r.json()).catch(() => ({ symbols: [] })),
    ]);

    const results: SearchResult[] = [];

    // Spot pairs
    for (const s of spotRes.symbols || []) {
      if (s.status !== 'TRADING') continue;
      results.push({
        symbol: s.symbol,
        displaySymbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        fullName: `${s.baseAsset} / ${s.quoteAsset}`,
        exchangeId: 'binance',
        exchangeName: 'Binance',
        category: 'crypto',
        marketType: 'spot',
        tags: ['spot', 'crypto'],
      });
    }

    // Futures (perpetual)
    for (const s of futuresRes.symbols || []) {
      if (s.status !== 'TRADING' || s.contractType !== 'PERPETUAL') continue;
      // Avoid duplicating spot symbols
      results.push({
        symbol: `${s.symbol}.P`,
        displaySymbol: `${s.symbol}.P`,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        fullName: `${s.baseAsset} / ${s.quoteAsset} PERPETUAL CONTRACT`,
        exchangeId: 'binance',
        exchangeName: 'Binance',
        category: 'futures',
        marketType: 'swap',
        tags: ['swap', 'crypto', 'defi'],
      });
    }

    cachedSymbols = results;
    return results;
  },

  async fetchKlines(symbol: string, interval: string, limit = 500): Promise<OHLCV[]> {
    const cleanSymbol = symbol.replace('.P', '');
    const isFutures = symbol.endsWith('.P');
    const base = isFutures ? 'https://fapi.binance.com/fapi/v1' : 'https://api.binance.com/api/v3';
    const res = await fetch(`${base}/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}`);
    const data = await res.json();
    return data.map((k: any[]) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    const cleanSymbol = symbol.replace('.P', '');
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${cleanSymbol}`);
      const d = await res.json();
      return {
        symbol: d.symbol,
        lastPrice: parseFloat(d.lastPrice),
        change24h: parseFloat(d.priceChange),
        changePct24h: parseFloat(d.priceChangePercent),
        volume24h: parseFloat(d.quoteVolume),
        high24h: parseFloat(d.highPrice),
        low24h: parseFloat(d.lowPrice),
      };
    } catch {
      return null;
    }
  },

  getTickerStreamUrl(symbols: string[]): string {
    const streams = symbols.map(s => `${s.replace('.P', '').toLowerCase()}@miniTicker`).join('/');
    return `wss://stream.binance.com:9443/stream?streams=${streams}`;
  },

  parseTickerMessage(msg: any) {
    const data = msg.data;
    if (!data) return null;
    const close = parseFloat(data.c);
    const open = parseFloat(data.o);
    return {
      symbol: data.s,
      price: close,
      change: close - open,
      changePct: open > 0 ? ((close - open) / open) * 100 : 0,
      volume: parseFloat(data.v),
    };
  },
};

registerExchange(binanceAdapter);
export default binanceAdapter;
