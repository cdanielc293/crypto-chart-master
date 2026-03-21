import { useEffect, useRef } from 'react';
import { useChart } from '@/context/ChartContext';
import { X, Plus, Star } from 'lucide-react';
import { useState } from 'react';
import SymbolSearch from './SymbolSearch';

export default function Watchlist() {
  const { watchlist, setWatchlist, symbol, setSymbol, removeFromWatchlist } = useChart();
  const [searchOpen, setSearchOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (watchlist.length === 0) return;

    const streams = watchlist.map(w => `${w.symbol.toLowerCase()}@miniTicker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const data = msg.data;
      if (!data) return;

      setWatchlist(prev =>
        prev.map(item =>
          item.symbol === data.s
            ? {
                ...item,
                lastPrice: parseFloat(data.c),
                priceChange: parseFloat(data.p),
                priceChangePercent: parseFloat(data.P),
              }
            : item
        )
      );
    };

    return () => {
      ws.close();
    };
  }, [watchlist.map(w => w.symbol).join(',')]);

  return (
    <>
      <div className="flex flex-col w-64 bg-toolbar-bg border-l border-chart-border select-none">
        <div className="flex items-center justify-between px-3 py-2 border-b border-chart-border">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Star size={12} />
            Watchlist
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex items-center px-3 py-1.5 text-[10px] text-muted-foreground border-b border-chart-border">
          <span className="flex-1">Symbol</span>
          <span className="w-20 text-right">Last</span>
          <span className="w-16 text-right">Chg%</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {watchlist.map(item => {
            const isPositive = item.priceChangePercent >= 0;
            const isSelected = item.symbol === symbol;
            return (
              <div
                key={item.symbol}
                onClick={() => setSymbol(item.symbol)}
                className={`flex items-center px-3 py-2 cursor-pointer text-xs transition-colors group ${
                  isSelected ? 'bg-accent' : 'hover:bg-toolbar-hover'
                }`}
              >
                <span className="flex-1 font-medium text-foreground">{item.symbol.replace('USDT', '')}</span>
                <span className="w-20 text-right font-mono text-foreground">
                  {item.lastPrice > 0 ? item.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                </span>
                <span className={`w-14 text-right font-mono ${isPositive ? 'text-chart-bull' : 'text-chart-bear'}`}>
                  {item.lastPrice > 0 ? `${isPositive ? '+' : ''}${item.priceChangePercent.toFixed(2)}%` : '—'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.symbol); }}
                  className="ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {searchOpen && <SymbolSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}
