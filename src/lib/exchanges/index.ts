// Import all exchange adapters to register them
// Crypto
import './binance';
import './bybit';
import './coinbase';
import './okx';
import './kraken';
import './kucoin';
import './gateio';
import './mexc';
import './htx';
import './bitget';
import './bitstamp';
// Stocks & Forex & Indices
import './yahoo-stocks';
import './yahoo-forex';
import './yahoo-indices';

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
