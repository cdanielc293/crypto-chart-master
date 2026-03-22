import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useChart } from '@/context/ChartContext';
import { Search, X, Plus, ChevronDown } from 'lucide-react';
import DraggableDialog from './DraggableDialog';
import {
  getAllExchanges,
  getExchangesByCategory,
  type SearchResult,
  type AssetCategory,
  EXCHANGE_COLORS,
} from '@/lib/exchanges';

// ─── Category tabs ───
const CATEGORIES: { id: AssetCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'futures', label: 'Futures' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'forex', label: 'Forex' },
  { id: 'indices', label: 'Indices' },
  { id: 'funds', label: 'Funds' },
  { id: 'bonds', label: 'Bonds' },
  { id: 'economy', label: 'Economy' },
  { id: 'options', label: 'Options' },
];

// ─── Exchange logo component ───
function ExchangeLogo({ exchangeId, size = 16 }: { exchangeId: string; size?: number }) {
  const color = EXCHANGE_COLORS[exchangeId] || '#888';
  const letter = exchangeId[0]?.toUpperCase() || '?';
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}22`,
        color: color,
        fontSize: size * 0.55,
        fontWeight: 700,
      }}
    >
      {letter}
    </div>
  );
}

// ─── Symbol icon with deterministic color ───
const SYMBOL_COLORS = [
  '#F7931A', '#627EEA', '#26A17B', '#F3BA2F', '#E84142',
  '#2775CA', '#8247E5', '#00D395', '#E6007A', '#14F195',
  '#FF007A', '#2B6DEF', '#C3A634', '#FF6B00', '#00AEFF',
];

function getSymbolColor(sym: string): string {
  let hash = 0;
  for (let i = 0; i < sym.length; i++) hash = sym.charCodeAt(i) + ((hash << 5) - hash);
  return SYMBOL_COLORS[Math.abs(hash) % SYMBOL_COLORS.length];
}

// ─── Dropdown component ───
function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {selected?.label || label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-chart-border bg-card py-1 shadow-xl">
          {options.map(o => (
            <button
              key={o.id}
              onClick={() => { onChange(o.id); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-toolbar-hover transition-colors ${
                o.id === value ? 'text-primary' : 'text-foreground'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Props ───
interface Props {
  onClose: () => void;
  onSelectSymbol?: (symbol: string) => void;
}

const PAGE_SIZE = 50;

export default function SymbolSearch({ onClose, onSelectSymbol }: Props) {
  const { setSymbol, addToWatchlist } = useChart();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<AssetCategory | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeCategory, sourceFilter, typeFilter, query]);

  // Fetch all symbols from all exchanges on mount
  useEffect(() => {
    inputRef.current?.focus();

    const fetchAll = async () => {
      setLoading(true);
      const exchanges = getAllExchanges();
      const allResults = await Promise.all(
        exchanges.map(ex => ex.fetchAllSymbols().catch(() => []))
      );
      setResults(allResults.flat());
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setVisibleCount(prev => prev + PAGE_SIZE);
    }
  }, []);

  // Available exchanges for source filter
  const sourceOptions = useMemo(() => {
    const exchanges = getAllExchanges();
    return [
      { id: 'all', label: 'All sources' },
      ...exchanges.map(e => ({ id: e.info.id, label: e.info.name })),
    ];
  }, []);

  const typeOptions = [
    { id: 'all', label: 'All types' },
    { id: 'spot', label: 'Spot' },
    { id: 'swap', label: 'Perpetual' },
    { id: 'futures', label: 'Futures' },
    { id: 'index', label: 'Index' },
    { id: 'margin', label: 'Margin' },
  ];

  // Filtered results
  const filtered = useMemo(() => {
    let items = results;

    if (activeCategory !== 'all') {
      items = items.filter(s => s.category === activeCategory);
    }
    if (sourceFilter !== 'all') {
      items = items.filter(s => s.exchangeId === sourceFilter);
    }
    if (typeFilter !== 'all') {
      items = items.filter(s => s.marketType === typeFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(s =>
        s.symbol.toLowerCase().includes(q) ||
        s.baseAsset.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q)
      );
    }

    return items;
  }, [results, activeCategory, sourceFilter, typeFilter, query]);

  const visibleResults = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const selectSymbol = useCallback((result: SearchResult) => {
    const sym = result.symbol.replace('.P', ''); // Clean for watchlist
    if (onSelectSymbol) {
      onSelectSymbol(sym);
    } else {
      setSymbol(sym);
    }
    addToWatchlist(sym);
    onClose();
  }, [onSelectSymbol, setSymbol, addToWatchlist, onClose]);

  const addToList = useCallback((e: React.MouseEvent, result: SearchResult) => {
    e.stopPropagation();
    const sym = result.symbol.replace('.P', '');
    addToWatchlist(sym);
  }, [addToWatchlist]);

  return (
    <DraggableDialog
      id="symbol-search"
      open={true}
      onClose={onClose}
      title="Add symbol"
      className="w-[560px]"
      zClass="z-50"
    >
      {/* Search input */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-chart-border">
        <Search size={16} className="text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Symbol, ISIN, or CUSIP"
          className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-chart-border overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 rounded text-[12px] whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover border border-transparent'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-chart-border">
        <FilterDropdown
          label="All sources"
          value={sourceFilter}
          options={sourceOptions}
          onChange={setSourceFilter}
        />
        <FilterDropdown
          label="All types"
          value={typeFilter}
          options={typeOptions}
          onChange={setTypeFilter}
        />
      </div>

      {/* Results */}
      <div ref={scrollRef} onScroll={handleScroll} className="overflow-y-auto flex-1 max-h-[60vh]">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Loading symbols...</div>
        ) : visibleResults.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No results</div>
        ) : (
          <>
            {visibleResults.map((result, idx) => {
              const color = getSymbolColor(result.baseAsset);
              return (
                <button
                  key={`${result.exchangeId}-${result.symbol}-${idx}`}
                  onClick={() => selectSymbol(result)}
                  className="flex items-center w-full px-4 py-2 text-[13px] hover:bg-toolbar-hover transition-colors group"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mr-3 shrink-0" style={{ backgroundColor: `${color}22`, color }}>
                    {result.baseAsset[0]}
                  </div>
                  <div className="w-[100px] text-left shrink-0">
                    <span className="font-semibold text-foreground">{result.displaySymbol.replace('.P', '')}</span>
                    {result.symbol.endsWith('.P') && <span className="text-[10px] text-muted-foreground ml-0.5">.P</span>}
                  </div>
                  <span className="flex-1 text-left text-muted-foreground truncate mr-3">{result.fullName}</span>
                  <div className="flex items-center gap-1.5 mr-3">
                    {result.tags.map(tag => <span key={tag} className="text-[10px] text-muted-foreground">{tag}</span>)}
                  </div>
                  <div className="flex items-center gap-1.5 w-[90px] justify-end mr-2">
                    <span className="text-[11px] text-foreground font-medium">{result.exchangeName}</span>
                    <ExchangeLogo exchangeId={result.exchangeId} size={14} />
                  </div>
                  <button onClick={(e) => addToList(e, result)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity shrink-0">
                    <Plus size={14} />
                  </button>
                </button>
              );
            })}
            {hasMore && (
              <div className="p-3 text-center text-muted-foreground text-[11px]">
                Showing {visibleResults.length} of {filtered.length} — scroll for more
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-chart-border text-[11px] text-muted-foreground">
        <span className="px-1.5 py-0.5 bg-secondary/50 rounded text-[10px]">Shift</span>
        <span>+</span>
        <span className="px-1.5 py-0.5 bg-secondary/50 rounded text-[10px]">Click</span>
        <span>or</span>
        <span className="px-1.5 py-0.5 bg-secondary/50 rounded text-[10px]">Shift</span>
        <span>+</span>
        <span className="px-1.5 py-0.5 bg-secondary/50 rounded text-[10px]">Enter</span>
        <span>to add symbol and close dialog</span>
      </div>
    </DraggableDialog>
  );
}
