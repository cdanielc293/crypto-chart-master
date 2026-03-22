import { useState, useEffect, useRef } from 'react';
import { useChart } from '@/context/ChartContext';
import { Search, X } from 'lucide-react';
import DraggableDialog from './DraggableDialog';

interface ExchangeSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

interface Props {
  onClose: () => void;
  onSelectSymbol?: (symbol: string) => void;
}

export default function SymbolSearch({ onClose, onSelectSymbol }: Props) {
  const { setSymbol, addToWatchlist } = useChart();
  const [query, setQuery] = useState('');
  const [symbols, setSymbols] = useState<ExchangeSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetch('https://api.binance.com/api/v3/exchangeInfo')
      .then(r => r.json())
      .then(data => {
        const usdtPairs = data.symbols
          .filter((s: any) => s.quoteAsset === 'USDT' && s.status === 'TRADING')
          .map((s: any) => ({
            symbol: s.symbol,
            baseAsset: s.baseAsset,
            quoteAsset: s.quoteAsset,
          }));
        setSymbols(usdtPairs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = symbols.filter(s =>
    s.symbol.toLowerCase().includes(query.toLowerCase()) ||
    s.baseAsset.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50);

  const selectSymbol = (sym: string) => {
    if (onSelectSymbol) {
      onSelectSymbol(sym);
    } else {
      setSymbol(sym);
    }
    addToWatchlist(sym);
    onClose();
  };

  return (
    <DraggableDialog
      id="symbol-search"
      open={true}
      onClose={onClose}
      title="Symbol Search"
      className="w-[440px]"
      zClass="z-50"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-chart-border">
        <Search size={16} className="text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search symbol..."
          className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="overflow-y-auto flex-1 max-h-[400px]">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">Loading symbols...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">No results</div>
        ) : (
          filtered.map(s => (
            <button
              key={s.symbol}
              onClick={() => selectSymbol(s.symbol)}
              className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-toolbar-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{s.baseAsset}</span>
                <span className="text-muted-foreground">/ {s.quoteAsset}</span>
              </div>
              <span className="text-xs text-muted-foreground">Binance</span>
            </button>
          ))
        )}
      </div>
    </DraggableDialog>
  );
}
