// ─── Multi-Exchange Abstraction Layer ───

export type AssetCategory = 'crypto' | 'stocks' | 'forex' | 'futures' | 'indices' | 'bonds' | 'funds' | 'options' | 'economy';
export type MarketType = 'spot' | 'swap' | 'futures' | 'index' | 'margin';

export interface ExchangeInfo {
  id: string;
  name: string;
  logo?: string;           // emoji or URL
  color: string;           // brand hex color
  categories: AssetCategory[];
  supportsTrade: boolean;
  requiresApiKey: boolean;
}

export interface SearchResult {
  symbol: string;          // e.g. BTCUSDT, AAPL
  displaySymbol: string;   // e.g. BTCUSDT, AAPL
  baseAsset: string;       // e.g. BTC, AAPL
  quoteAsset: string;      // e.g. USDT, USD
  fullName: string;        // e.g. "Bitcoin / TetherUS"
  exchangeId: string;
  exchangeName: string;
  category: AssetCategory;
  marketType: MarketType;
  tags: string[];          // e.g. ['spot', 'crypto', 'defi']
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker {
  symbol: string;
  lastPrice: number;
  change24h: number;
  changePct24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export interface ExchangeAdapter {
  info: ExchangeInfo;

  /** Search for symbols matching a query */
  searchSymbols(query: string, category?: AssetCategory): Promise<SearchResult[]>;

  /** Fetch all tradeable symbols (cached) */
  fetchAllSymbols(): Promise<SearchResult[]>;

  /** Fetch OHLCV candles */
  fetchKlines(symbol: string, interval: string, limit?: number): Promise<OHLCV[]>;

  /** Fetch 24h ticker */
  fetchTicker(symbol: string): Promise<Ticker | null>;

  /** Get WebSocket stream URL for live price updates */
  getTickerStreamUrl?(symbols: string[]): string;

  /** Parse incoming WebSocket ticker message */
  parseTickerMessage?(data: any): { symbol: string; price: number; change: number; changePct: number; volume: number } | null;
}

// ─── Exchange Registry ───

const registry = new Map<string, ExchangeAdapter>();

export function registerExchange(adapter: ExchangeAdapter) {
  registry.set(adapter.info.id, adapter);
}

export function getExchange(id: string): ExchangeAdapter | undefined {
  return registry.get(id);
}

export function getAllExchanges(): ExchangeAdapter[] {
  return Array.from(registry.values());
}

export function getExchangesByCategory(category: AssetCategory): ExchangeAdapter[] {
  return getAllExchanges().filter(e => e.info.categories.includes(category));
}

// ─── Exchange color map for icons ───
export const EXCHANGE_COLORS: Record<string, string> = {
  binance: '#F3BA2F',
  bybit: '#F7A600',
  coinbase: '#0052FF',
  kraken: '#5741D9',
  okx: '#FFFFFF',
  kucoin: '#23AF91',
  yahoo: '#6001D2',
  coingecko: '#8DC63F',
};
