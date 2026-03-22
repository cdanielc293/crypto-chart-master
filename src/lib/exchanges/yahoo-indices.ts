import type { ExchangeAdapter, SearchResult, OHLCV, Ticker, AssetCategory } from './types';
import { registerExchange } from './types';
import { yahooFetch, getYahooChartUrl, YAHOO_INTERVAL_MAP, parseYahooChart, parseYahooTicker } from './yahoo-utils';

const INDICES: { symbol: string; yahoo: string; name: string }[] = [
  { symbol: 'SPX', yahoo: '^GSPC', name: 'S&P 500' },
  { symbol: 'DJI', yahoo: '^DJI', name: 'Dow Jones Industrial Average' },
  { symbol: 'IXIC', yahoo: '^IXIC', name: 'NASDAQ Composite' },
  { symbol: 'RUT', yahoo: '^RUT', name: 'Russell 2000' },
  { symbol: 'VIX', yahoo: '^VIX', name: 'CBOE Volatility Index' },
  { symbol: 'FTSE', yahoo: '^FTSE', name: 'FTSE 100 (London)' },
  { symbol: 'GDAXI', yahoo: '^GDAXI', name: 'DAX (Germany)' },
  { symbol: 'FCHI', yahoo: '^FCHI', name: 'CAC 40 (France)' },
  { symbol: 'N225', yahoo: '^N225', name: 'Nikkei 225 (Japan)' },
  { symbol: 'HSI', yahoo: '^HSI', name: 'Hang Seng Index' },
  { symbol: 'SSEC', yahoo: '000001.SS', name: 'Shanghai Composite' },
  { symbol: 'BSESN', yahoo: '^BSESN', name: 'BSE SENSEX (India)' },
  { symbol: 'KOSPI', yahoo: '^KS11', name: 'KOSPI (South Korea)' },
  { symbol: 'STOXX50E', yahoo: '^STOXX50E', name: 'Euro Stoxx 50' },
  { symbol: 'IBEX', yahoo: '^IBEX', name: 'IBEX 35 (Spain)' },
  { symbol: 'AXJO', yahoo: '^AXJO', name: 'ASX 200 (Australia)' },
  { symbol: 'TA35', yahoo: '^TA125.TA', name: 'TA-125 (Israel)' },
];

// Export for use in klineCache routing
export function getYahooIndexSymbol(symbol: string): string | null {
  const idx = INDICES.find(i => i.symbol === symbol);
  return idx?.yahoo || null;
}

const indicesAdapter: ExchangeAdapter = {
  info: {
    id: 'yahoo_indices',
    name: 'Indices',
    color: '#FF6B00',
    categories: ['indices'],
    supportsTrade: false,
    requiresApiKey: false,
  },

  async searchSymbols(query: string) {
    const all = await this.fetchAllSymbols();
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(s =>
      s.symbol.toLowerCase().includes(q) || s.fullName.toLowerCase().includes(q)
    );
  },

  async fetchAllSymbols(): Promise<SearchResult[]> {
    return INDICES.map(idx => ({
      symbol: idx.symbol,
      displaySymbol: idx.symbol,
      baseAsset: idx.symbol,
      quoteAsset: '',
      fullName: idx.name,
      exchangeId: 'yahoo_indices',
      exchangeName: 'INDEX',
      category: 'indices' as AssetCategory,
      marketType: 'index' as const,
      tags: ['index'],
    }));
  },

  async fetchKlines(symbol: string, interval: string): Promise<OHLCV[]> {
    const idx = INDICES.find(i => i.symbol === symbol);
    const yahooSymbol = idx?.yahoo || `^${symbol}`;
    const { i, range } = YAHOO_INTERVAL_MAP[interval] || { i: '1d', range: '1y' };
    try {
      const data = await yahooFetch(getYahooChartUrl(yahooSymbol, i, range));
      return parseYahooChart(data);
    } catch { return []; }
  },

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    const idx = INDICES.find(i => i.symbol === symbol);
    const yahooSymbol = idx?.yahoo || `^${symbol}`;
    try {
      const data = await yahooFetch(getYahooChartUrl(yahooSymbol, '1d', '2d'));
      return parseYahooTicker(data, symbol);
    } catch { return null; }
  },
};

registerExchange(indicesAdapter);
export default indicesAdapter;
