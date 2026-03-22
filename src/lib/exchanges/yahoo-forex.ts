import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

// Major forex pairs - using Yahoo Finance for data
const FOREX_PAIRS: { base: string; quote: string; name: string }[] = [
  { base: 'EUR', quote: 'USD', name: 'Euro / U.S. Dollar' },
  { base: 'GBP', quote: 'USD', name: 'British Pound / U.S. Dollar' },
  { base: 'USD', quote: 'JPY', name: 'U.S. Dollar / Japanese Yen' },
  { base: 'USD', quote: 'CHF', name: 'U.S. Dollar / Swiss Franc' },
  { base: 'AUD', quote: 'USD', name: 'Australian Dollar / U.S. Dollar' },
  { base: 'USD', quote: 'CAD', name: 'U.S. Dollar / Canadian Dollar' },
  { base: 'NZD', quote: 'USD', name: 'New Zealand Dollar / U.S. Dollar' },
  { base: 'EUR', quote: 'GBP', name: 'Euro / British Pound' },
  { base: 'EUR', quote: 'JPY', name: 'Euro / Japanese Yen' },
  { base: 'GBP', quote: 'JPY', name: 'British Pound / Japanese Yen' },
  { base: 'EUR', quote: 'CHF', name: 'Euro / Swiss Franc' },
  { base: 'AUD', quote: 'JPY', name: 'Australian Dollar / Japanese Yen' },
  { base: 'GBP', quote: 'CHF', name: 'British Pound / Swiss Franc' },
  { base: 'CHF', quote: 'JPY', name: 'Swiss Franc / Japanese Yen' },
  { base: 'EUR', quote: 'AUD', name: 'Euro / Australian Dollar' },
  { base: 'EUR', quote: 'CAD', name: 'Euro / Canadian Dollar' },
  { base: 'EUR', quote: 'NZD', name: 'Euro / New Zealand Dollar' },
  { base: 'GBP', quote: 'AUD', name: 'British Pound / Australian Dollar' },
  { base: 'GBP', quote: 'CAD', name: 'British Pound / Canadian Dollar' },
  { base: 'AUD', quote: 'CAD', name: 'Australian Dollar / Canadian Dollar' },
  { base: 'AUD', quote: 'NZD', name: 'Australian Dollar / New Zealand Dollar' },
  { base: 'NZD', quote: 'JPY', name: 'New Zealand Dollar / Japanese Yen' },
  { base: 'USD', quote: 'SGD', name: 'U.S. Dollar / Singapore Dollar' },
  { base: 'USD', quote: 'HKD', name: 'U.S. Dollar / Hong Kong Dollar' },
  { base: 'USD', quote: 'NOK', name: 'U.S. Dollar / Norwegian Krone' },
  { base: 'USD', quote: 'SEK', name: 'U.S. Dollar / Swedish Krona' },
  { base: 'USD', quote: 'TRY', name: 'U.S. Dollar / Turkish Lira' },
  { base: 'USD', quote: 'MXN', name: 'U.S. Dollar / Mexican Peso' },
  { base: 'USD', quote: 'ZAR', name: 'U.S. Dollar / South African Rand' },
  { base: 'USD', quote: 'CNH', name: 'U.S. Dollar / Chinese Yuan Offshore' },
  { base: 'USD', quote: 'ILS', name: 'U.S. Dollar / Israeli Shekel' },
  { base: 'XAU', quote: 'USD', name: 'Gold / U.S. Dollar' },
  { base: 'XAG', quote: 'USD', name: 'Silver / U.S. Dollar' },
];

const yahooForexAdapter: ExchangeAdapter = {
  info: {
    id: 'yahoo_forex',
    name: 'Yahoo Forex',
    color: '#6001D2',
    categories: ['forex'],
    supportsTrade: false,
    requiresApiKey: false,
  },

  async searchSymbols(query: string, category?: AssetCategory) {
    const all = await this.fetchAllSymbols();
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(s =>
      s.symbol.toLowerCase().includes(q) ||
      s.baseAsset.toLowerCase().includes(q) ||
      s.fullName.toLowerCase().includes(q)
    );
  },

  async fetchAllSymbols(): Promise<SearchResult[]> {
    return FOREX_PAIRS.map(p => ({
      symbol: `${p.base}${p.quote}`,
      displaySymbol: `${p.base}/${p.quote}`,
      baseAsset: p.base,
      quoteAsset: p.quote,
      fullName: p.name,
      exchangeId: 'yahoo_forex',
      exchangeName: 'Forex',
      category: 'forex' as AssetCategory,
      marketType: 'spot' as const,
      tags: ['forex', 'fx'],
    }));
  },

  async fetchKlines(symbol: string, interval: string, limit = 200): Promise<OHLCV[]> {
    // Yahoo uses format like EURUSD=X
    const yahooSymbol = `${symbol}=X`;
    const intMap: Record<string, { i: string; range: string }> = {
      '1m': { i: '1m', range: '1d' },
      '5m': { i: '5m', range: '5d' },
      '15m': { i: '15m', range: '5d' },
      '30m': { i: '30m', range: '1mo' },
      '1h': { i: '1h', range: '1mo' },
      '4h': { i: '1h', range: '6mo' },
      '1d': { i: '1d', range: '1y' },
      '1w': { i: '1wk', range: '5y' },
      '1M': { i: '1mo', range: '10y' },
    };
    const { i, range } = intMap[interval] || { i: '1d', range: '1y' };

    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${i}&range=${range}`
      );
      const data = await res.json();
      const result = data.chart?.result?.[0];
      if (!result) return [];
      const ts = result.timestamp || [];
      const q = result.indicators?.quote?.[0] || {};
      const ohlcv: OHLCV[] = [];
      for (let j = 0; j < ts.length; j++) {
        if (q.open?.[j] == null) continue;
        ohlcv.push({
          time: ts[j] * 1000,
          open: q.open[j],
          high: q.high[j],
          low: q.low[j],
          close: q.close[j],
          volume: q.volume?.[j] || 0,
        });
      }
      return ohlcv;
    } catch { return []; }
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    const yahooSymbol = `${symbol}=X`;
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=2d`
      );
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const last = meta.regularMarketPrice;
      const prevClose = meta.previousClose || meta.chartPreviousClose;
      return {
        symbol,
        lastPrice: last,
        change24h: last - prevClose,
        changePct24h: prevClose > 0 ? ((last - prevClose) / prevClose) * 100 : 0,
        volume24h: meta.regularMarketVolume || 0,
        high24h: meta.regularMarketDayHigh || last,
        low24h: meta.regularMarketDayLow || last,
      };
    } catch { return null; }
  },
};

registerExchange(yahooForexAdapter);
export default yahooForexAdapter;
