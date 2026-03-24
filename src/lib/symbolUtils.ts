/**
 * Symbol format: "BTCUSDT" (default = binance) or "BTCUSDT:bybit"
 * This utility parses and formats exchange-aware symbols.
 */

export interface ParsedSymbol {
  /** Raw symbol without exchange suffix, e.g. "BTCUSDT" */
  raw: string;
  /** Exchange ID, e.g. "binance" */
  exchange: string;
  /** Display label, e.g. "Binance" */
  exchangeLabel: string;
}

const EXCHANGE_LABELS: Record<string, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  coinbase: 'Coinbase',
  okx: 'OKX',
  kraken: 'Kraken',
  kucoin: 'KuCoin',
  gateio: 'Gate.io',
  mexc: 'MEXC',
  htx: 'HTX',
  bitget: 'Bitget',
  bitstamp: 'Bitstamp',
};

/** Parse a symbol string like "BTCUSDT:bybit" into parts */
export function parseSymbol(symbol: string): ParsedSymbol {
  const colonIdx = symbol.lastIndexOf(':');
  if (colonIdx > 0) {
    const raw = symbol.substring(0, colonIdx);
    const exchange = symbol.substring(colonIdx + 1).toLowerCase();
    return {
      raw,
      exchange,
      exchangeLabel: EXCHANGE_LABELS[exchange] || exchange.charAt(0).toUpperCase() + exchange.slice(1),
    };
  }
  return {
    raw: symbol,
    exchange: 'binance',
    exchangeLabel: 'Binance',
  };
}

/** Format a symbol with exchange, e.g. "BTCUSDT:bybit" */
export function formatSymbol(raw: string, exchangeId: string): string {
  // Default exchange = binance, no suffix needed for backward compat
  if (exchangeId === 'binance') return raw;
  return `${raw}:${exchangeId}`;
}

/** Get display pair name, e.g. "BTC / USDT" */
export function getDisplayPair(symbol: string): string {
  const { raw } = parseSymbol(symbol);
  // Common quote assets
  for (const quote of ['USDT', 'BUSD', 'USD', 'EUR', 'GBP', 'BTC', 'ETH', 'BNB']) {
    if (raw.endsWith(quote) && raw.length > quote.length) {
      return `${raw.slice(0, -quote.length)} / ${quote}`;
    }
  }
  return raw;
}
