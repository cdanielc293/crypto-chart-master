// Import all exchange adapters to register them
import './binance';
import './bybit';
import './coinbase';

// Re-export types and registry
export {
  type ExchangeAdapter,
  type SearchResult,
  type OHLCV,
  type Ticker,
  type ExchangeInfo,
  type AssetCategory,
  type MarketType,
  getAllExchanges,
  getExchange,
  getExchangesByCategory,
  registerExchange,
  EXCHANGE_COLORS,
} from './types';
