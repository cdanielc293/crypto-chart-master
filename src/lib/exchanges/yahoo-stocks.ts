import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';

// Uses Yahoo Finance public chart/quote endpoints (no API key needed)
// Popular stocks pre-seeded for search

const POPULAR_STOCKS: { symbol: string; name: string; sector?: string }[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway B', sector: 'Finance' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Finance' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Finance' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare' },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Retail' },
  { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Finance' },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer' },
  { symbol: 'HD', name: 'Home Depot Inc.', sector: 'Retail' },
  { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Entertainment' },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Finance' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy' },
  { symbol: 'KO', name: 'Coca-Cola Company', sector: 'Consumer' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Technology' },
  { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology' },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Technology' },
  { symbol: 'CSCO', name: 'Cisco Systems', sector: 'Technology' },
  { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Technology' },
  { symbol: 'PYPL', name: 'PayPal Holdings', sector: 'Finance' },
  { symbol: 'UBER', name: 'Uber Technologies', sector: 'Technology' },
  { symbol: 'SQ', name: 'Block Inc.', sector: 'Finance' },
  { symbol: 'SHOP', name: 'Shopify Inc.', sector: 'Technology' },
  { symbol: 'SPOT', name: 'Spotify Technology', sector: 'Technology' },
  { symbol: 'SNAP', name: 'Snap Inc.', sector: 'Technology' },
  { symbol: 'COIN', name: 'Coinbase Global', sector: 'Finance' },
  { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Technology' },
  { symbol: 'SOFI', name: 'SoFi Technologies', sector: 'Finance' },
  { symbol: 'NIO', name: 'NIO Inc.', sector: 'Automotive' },
  { symbol: 'RIVN', name: 'Rivian Automotive', sector: 'Automotive' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', sector: 'ETF' },
  { symbol: 'IWM', name: 'iShares Russell 2000', sector: 'ETF' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', sector: 'ETF' },
  { symbol: 'VTI', name: 'Vanguard Total Stock', sector: 'ETF' },
  { symbol: 'BA', name: 'Boeing Company', sector: 'Industrial' },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance' },
  { symbol: 'IBM', name: 'IBM Corporation', sector: 'Technology' },
  { symbol: 'T', name: 'AT&T Inc.', sector: 'Telecom' },
  { symbol: 'VZ', name: 'Verizon Communications', sector: 'Telecom' },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare' },
  { symbol: 'MRK', name: 'Merck & Co.', sector: 'Healthcare' },
  { symbol: 'ABT', name: 'Abbott Laboratories', sector: 'Healthcare' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific', sector: 'Healthcare' },
  { symbol: 'LLY', name: 'Eli Lilly and Co.', sector: 'Healthcare' },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Retail' },
  { symbol: 'TGT', name: 'Target Corporation', sector: 'Retail' },
  { symbol: 'LOW', name: 'Lowe\'s Companies', sector: 'Retail' },
  { symbol: 'MCD', name: 'McDonald\'s Corporation', sector: 'Consumer' },
  { symbol: 'SBUX', name: 'Starbucks Corporation', sector: 'Consumer' },
  { symbol: 'NKE', name: 'Nike Inc.', sector: 'Consumer' },
];

let cachedResults: SearchResult[] | null = null;

const yahooStocksAdapter: ExchangeAdapter = {
  info: {
    id: 'yahoo_stocks',
    name: 'Yahoo Finance',
    color: '#6001D2',
    categories: ['stocks', 'funds'],
    supportsTrade: false,
    requiresApiKey: false,
  },

  async searchSymbols(query: string, category?: AssetCategory) {
    if (!query.trim()) {
      return this.fetchAllSymbols().then(all => all.slice(0, 50));
    }

    // Use Yahoo search API for dynamic results
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`
      );
      const data = await res.json();
      const results: SearchResult[] = [];
      for (const q of data.quotes || []) {
        if (!q.symbol || q.quoteType === 'CRYPTOCURRENCY') continue;
        const isETF = q.quoteType === 'ETF';
        results.push({
          symbol: q.symbol,
          displaySymbol: q.symbol,
          baseAsset: q.symbol,
          quoteAsset: 'USD',
          fullName: q.longname || q.shortname || q.symbol,
          exchangeId: 'yahoo_stocks',
          exchangeName: q.exchange || 'NYSE',
          category: isETF ? 'funds' : 'stocks',
          marketType: 'spot',
          tags: [isETF ? 'etf' : 'stock', q.exchange?.toLowerCase() || 'us'],
        });
      }
      return results;
    } catch {
      // Fallback to local search
      const all = await this.fetchAllSymbols();
      const q = query.toLowerCase();
      return all.filter(s =>
        s.symbol.toLowerCase().includes(q) || s.fullName.toLowerCase().includes(q)
      ).slice(0, 50);
    }
  },

  async fetchAllSymbols(): Promise<SearchResult[]> {
    if (cachedResults) return cachedResults;
    cachedResults = POPULAR_STOCKS.map(s => ({
      symbol: s.symbol,
      displaySymbol: s.symbol,
      baseAsset: s.symbol,
      quoteAsset: 'USD',
      fullName: s.name,
      exchangeId: 'yahoo_stocks',
      exchangeName: 'NYSE',
      category: (s.sector === 'ETF' ? 'funds' : 'stocks') as AssetCategory,
      marketType: 'spot' as const,
      tags: [s.sector === 'ETF' ? 'etf' : 'stock', 'us'],
    }));
    return cachedResults;
  },

  async fetchKlines(symbol: string, interval: string, limit = 200): Promise<OHLCV[]> {
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
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${i}&range=${range}`
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
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`
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

registerExchange(yahooStocksAdapter);
export default yahooStocksAdapter;
