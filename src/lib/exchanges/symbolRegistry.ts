// Symbol → Exchange mapping registry
// When a user selects a symbol from search, we register which exchange it belongs to
// so klineCache knows how to fetch its data

const symbolExchangeMap = new Map<string, string>();

export function registerSymbolExchange(symbol: string, exchangeId: string) {
  symbolExchangeMap.set(symbol.toUpperCase(), exchangeId);
}

export function getSymbolExchange(symbol: string): string | null {
  return symbolExchangeMap.get(symbol.toUpperCase()) || null;
}

// Check if a symbol uses Binance (default behavior) or an alternative exchange
export function isBinanceSymbol(symbol: string): boolean {
  const exchange = getSymbolExchange(symbol);
  // If no exchange registered, assume Binance (backward compat)
  if (!exchange) return true;
  return exchange === 'binance';
}

// Check if a symbol uses a Yahoo Finance-based adapter
export function isYahooSymbol(symbol: string): boolean {
  const exchange = getSymbolExchange(symbol);
  return exchange === 'yahoo_stocks' || exchange === 'yahoo_forex' || exchange === 'yahoo_indices';
}

// Check if symbol uses any non-Binance crypto exchange
export function isNonBinanceCryptoExchange(symbol: string): boolean {
  const exchange = getSymbolExchange(symbol);
  if (!exchange) return false;
  const nonBinanceCrypto = ['bybit', 'coinbase', 'okx', 'kraken', 'kucoin', 'gateio', 'mexc', 'htx', 'bitget', 'bitstamp'];
  return nonBinanceCrypto.includes(exchange);
}
