import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Plus, Star, ChevronDown, ChevronRight, ChevronUp,
  MoreHorizontal, Trash2, Edit3, FolderPlus, List, Search,
  Grid3X3, Copy,
} from 'lucide-react';
import type { WatchlistItem } from '@/types/chart';

// ─── Types ───
export interface WLSection {
  id: string;
  name: string;
  collapsed: boolean;
  symbols: string[];
}

export interface WLList {
  id: string;
  name: string;
  favorite: boolean;
  flagColor?: string;
  sections: WLSection[];
}

const STORAGE_KEY = 'newui-watchlists-v1';
const ACTIVE_KEY = 'newui-watchlist-active';

const DEFAULT_LISTS: WLList[] = [
  {
    id: 'main',
    name: 'My Watchlist',
    favorite: true,
    sections: [{
      id: 'default',
      name: 'TOP COINS',
      collapsed: false,
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT'],
    }],
  },
];

function loadLists(): WLList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_LISTS;
}

function saveLists(lists: WLList[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

// ─── Colors ───
const SYMBOL_COLORS = [
  '#F7931A', '#627EEA', '#26A17B', '#F3BA2F', '#E84142',
  '#2775CA', '#8247E5', '#00D395', '#E6007A', '#14F195',
];

function getSymbolColor(sym: string): string {
  let hash = 0;
  for (let i = 0; i < sym.length; i++) hash = sym.charCodeAt(i) + ((hash << 5) - hash);
  return SYMBOL_COLORS[Math.abs(hash) % SYMBOL_COLORS.length];
}

type SortField = 'symbol' | 'last' | 'chgp';
type SortDir = 'asc' | 'desc';

// ─── Inline symbol search (simplified) ───
function InlineSearch({ onAdd, onClose }: { onAdd: (sym: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number>();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    timerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price`);
        const data: { symbol: string }[] = await res.json();
        const q = query.toUpperCase();
        const matches = data
          .filter(d => d.symbol.includes(q) && d.symbol.endsWith('USDT'))
          .slice(0, 20)
          .map(d => d.symbol);
        setResults(matches);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return (
    <div className="border-b border-white/[0.06]">
      <div className="flex items-center gap-2 px-3 py-2">
        <Search size={12} className="text-white/30 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search symbol…"
          className="flex-1 bg-transparent text-xs text-white/80 outline-none placeholder:text-white/20 font-mono"
        />
        <button onClick={onClose} className="text-white/20 hover:text-white/50">
          <X size={12} />
        </button>
      </div>
      {results.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto">
          {results.map(sym => {
            const ticker = sym.replace('USDT', '');
            const color = getSymbolColor(sym);
            return (
              <button
                key={sym}
                onClick={() => { onAdd(sym); onClose(); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-white/[0.04] transition-colors"
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {ticker[0]}
                </div>
                <span className="text-white/70 font-mono">{ticker}</span>
                <span className="text-white/20 text-[10px]">USDT</span>
                <Plus size={10} className="ml-auto text-white/20" />
              </button>
            );
          })}
        </div>
      )}
      {loading && <div className="px-3 py-2 text-[10px] text-white/20">Searching…</div>}
    </div>
  );
}

// ─── Props ───
interface Props {
  open: boolean;
  onClose: () => void;
  activeSymbol: string;
  onSelectSymbol: (sym: string) => void;
}

export default function NewUIWatchlist({ open, onClose, activeSymbol, onSelectSymbol }: Props) {
  const [lists, setLists] = useState<WLList[]>(loadLists);
  const [activeListId, setActiveListId] = useState(() => localStorage.getItem(ACTIVE_KEY) || 'main');
  const [prices, setPrices] = useState<Map<string, WatchlistItem>>(new Map());
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [renamingList, setRenamingList] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [sectionRenameValue, setSectionRenameValue] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeList = lists.find(l => l.id === activeListId) || lists[0];
  const allSymbols = useMemo(
    () => activeList ? [...new Set(activeList.sections.flatMap(s => s.symbols))] : [],
    [activeList]
  );

  // Persist
  useEffect(() => { saveLists(lists); }, [lists]);
  useEffect(() => { localStorage.setItem(ACTIVE_KEY, activeListId); }, [activeListId]);

  // WebSocket for live prices
  useEffect(() => {
    if (!open || allSymbols.length === 0) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    wsRef.current?.close();
    const streams = allSymbols.map(s => `${s.toLowerCase()}@miniTicker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const data = msg.data;
      if (!data) return;
      const close = parseFloat(data.c);
      const openPrice = parseFloat(data.o);
      const change = close - openPrice;
      const changePercent = openPrice > 0 ? ((change / openPrice) * 100) : 0;

      setPrices(prev => {
        const next = new Map(prev);
        next.set(data.s, {
          symbol: data.s,
          lastPrice: close,
          priceChange: change,
          priceChangePercent: changePercent,
          volume: parseFloat(data.v),
        });
        return next;
      });
    };

    return () => { ws.close(); wsRef.current = null; };
  }, [open, allSymbols.join(',')]);

  // ─── List operations ───
  const addSymbol = useCallback((sym: string) => {
    setLists(prev => prev.map(l => {
      if (l.id !== activeListId) return l;
      const firstSection = l.sections[0];
      if (!firstSection || firstSection.symbols.includes(sym)) return l;
      return {
        ...l,
        sections: l.sections.map((s, i) =>
          i === 0 ? { ...s, symbols: [...s.symbols, sym] } : s
        ),
      };
    }));
  }, [activeListId]);

  const removeSymbol = useCallback((sym: string) => {
    setLists(prev => prev.map(l => {
      if (l.id !== activeListId) return l;
      return {
        ...l,
        sections: l.sections.map(s => ({
          ...s,
          symbols: s.symbols.filter(x => x !== sym),
        })),
      };
    }));
  }, [activeListId]);

  const createNewList = useCallback((name: string) => {
    const id = `list_${Date.now()}`;
    setLists(prev => [...prev, {
      id,
      name: name || 'New list',
      favorite: false,
      sections: [{ id: `sec_${Date.now()}`, name: 'DEFAULT', collapsed: false, symbols: [] }],
    }]);
    setActiveListId(id);
  }, []);

  const deleteList = useCallback((id: string) => {
    setLists(prev => {
      const next = prev.filter(l => l.id !== id);
      return next.length === 0 ? DEFAULT_LISTS : next;
    });
    if (activeListId === id) setActiveListId(lists[0]?.id || 'main');
  }, [activeListId, lists]);

  const addSection = useCallback(() => {
    setLists(prev => prev.map(l => {
      if (l.id !== activeListId) return l;
      return {
        ...l,
        sections: [...l.sections, { id: `sec_${Date.now()}`, name: 'NEW SECTION', collapsed: false, symbols: [] }],
      };
    }));
  }, [activeListId]);

  const deleteSection = useCallback((sectionId: string) => {
    setLists(prev => prev.map(l => {
      if (l.id !== activeListId) return l;
      const filtered = l.sections.filter(s => s.id !== sectionId);
      return { ...l, sections: filtered.length === 0 ? [{ id: `sec_${Date.now()}`, name: 'DEFAULT', collapsed: false, symbols: [] }] : filtered };
    }));
  }, [activeListId]);

  const toggleCollapse = useCallback((sectionId: string) => {
    setLists(prev => prev.map(l => {
      if (l.id !== activeListId) return l;
      return { ...l, sections: l.sections.map(s => s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s) };
    }));
  }, [activeListId]);

  const renameSection = useCallback((sectionId: string, name: string) => {
    if (!name.trim()) return;
    setLists(prev => prev.map(l => {
      if (l.id !== activeListId) return l;
      return { ...l, sections: l.sections.map(s => s.id === sectionId ? { ...s, name: name.trim().toUpperCase() } : s) };
    }));
  }, [activeListId]);

  const renameList = useCallback((id: string, name: string) => {
    if (!name.trim()) return;
    setLists(prev => prev.map(l => l.id === id ? { ...l, name: name.trim() } : l));
  }, []);

  // Sorting
  const toggleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return field; }
      setSortDir('asc');
      return field;
    });
  }, []);

  const sortSymbols = useCallback((syms: string[]): string[] => {
    if (!sortField) return syms;
    return [...syms].sort((a, b) => {
      const pa = prices.get(a);
      const pb = prices.get(b);
      if (sortField === 'symbol') return sortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      const va = sortField === 'last' ? (pa?.lastPrice ?? 0) : (pa?.priceChangePercent ?? 0);
      const vb = sortField === 'last' ? (pb?.lastPrice ?? 0) : (pb?.priceChangePercent ?? 0);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [sortField, sortDir, prices]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={8} /> : <ChevronDown size={8} />;
  };

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute top-0 left-0 bottom-0 z-30 w-[260px] flex flex-col bg-[#060e1e]/95 backdrop-blur-xl border-r border-white/[0.06] select-none animate-fade-in"
      style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.4)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        {renamingList ? (
          <input
            autoFocus
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={() => { renameList(activeListId, renameValue); setRenamingList(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') { renameList(activeListId, renameValue); setRenamingList(false); }
              if (e.key === 'Escape') setRenamingList(false);
            }}
            className="flex-1 bg-transparent text-xs font-semibold text-white/80 outline-none border-b border-cyan-400/50 font-mono"
          />
        ) : (
          <div className="relative">
            <button
              ref={menuRef}
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-white/70 hover:text-white/90 font-mono"
            >
              {activeList?.name || 'Watchlist'}
              <ChevronDown size={10} />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-white/[0.08] bg-[#0a1628]/95 backdrop-blur-md py-1 shadow-xl">
                {lists.map(l => (
                  <button
                    key={l.id}
                    onClick={() => { setActiveListId(l.id); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                      l.id === activeListId ? 'text-cyan-400 bg-white/[0.04]' : 'text-white/60 hover:text-white/80 hover:bg-white/[0.04]'
                    }`}
                  >
                    {l.favorite && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
                    <span className="truncate">{l.name}</span>
                  </button>
                ))}
                <div className="mx-2 my-1 border-t border-white/[0.06]" />
                <button
                  onClick={() => { createNewList('New list'); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                >
                  <Plus size={10} />
                  Create new list
                </button>
                <button
                  onClick={() => { setRenameValue(activeList?.name || ''); setRenamingList(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                >
                  <Edit3 size={10} />
                  Rename list
                </button>
                <button
                  onClick={() => { addSection(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                >
                  <FolderPlus size={10} />
                  Add section
                </button>
                {lists.length > 1 && (
                  <button
                    onClick={() => { deleteList(activeListId); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400/60 hover:text-red-400 hover:bg-white/[0.04]"
                  >
                    <Trash2 size={10} />
                    Delete list
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(v => !v)}
            className="p-1 text-white/25 hover:text-white/60 transition-colors"
            title="Add symbol"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-white/25 hover:text-white/60 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Inline search */}
      {searchOpen && <InlineSearch onAdd={addSymbol} onClose={() => setSearchOpen(false)} />}

      {/* Column headers */}
      <div className="flex items-center px-3 py-1 text-[9px] text-white/20 uppercase tracking-wider border-b border-white/[0.04]">
        <button onClick={() => toggleSort('symbol')} className="flex items-center gap-0.5 flex-1 hover:text-white/40">
          Symbol <SortIcon field="symbol" />
        </button>
        <button onClick={() => toggleSort('last')} className="flex items-center justify-end gap-0.5 w-[60px] hover:text-white/40">
          Last <SortIcon field="last" />
        </button>
        <button onClick={() => toggleSort('chgp')} className="flex items-center justify-end gap-0.5 w-[50px] hover:text-white/40">
          Chg% <SortIcon field="chgp" />
        </button>
      </div>

      {/* Symbols */}
      <div className="flex-1 overflow-y-auto">
        {activeList?.sections.map(section => (
          <div key={section.id}>
            {/* Section header */}
            <div
              className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-white/[0.02] group"
              onClick={() => toggleCollapse(section.id)}
            >
              {section.collapsed
                ? <ChevronRight size={10} className="text-white/15" />
                : <ChevronDown size={10} className="text-white/15" />
              }
              {renamingSectionId === section.id ? (
                <input
                  autoFocus
                  value={sectionRenameValue}
                  onChange={e => setSectionRenameValue(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onBlur={() => { renameSection(section.id, sectionRenameValue); setRenamingSectionId(null); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { renameSection(section.id, sectionRenameValue); setRenamingSectionId(null); }
                    if (e.key === 'Escape') setRenamingSectionId(null);
                  }}
                  className="flex-1 bg-transparent text-[9px] text-white/60 outline-none border-b border-cyan-400/40 uppercase tracking-wider"
                />
              ) : (
                <span
                  className="flex-1 text-[9px] text-white/20 uppercase tracking-wider"
                  onDoubleClick={e => {
                    e.stopPropagation();
                    setRenamingSectionId(section.id);
                    setSectionRenameValue(section.name);
                  }}
                >
                  {section.name}
                </span>
              )}
              <button
                onClick={e => { e.stopPropagation(); deleteSection(section.id); }}
                className="opacity-0 group-hover:opacity-100 text-white/15 hover:text-red-400/60"
              >
                <X size={8} />
              </button>
            </div>

            {/* Symbol rows */}
            {!section.collapsed && sortSymbols(section.symbols).map(sym => {
              const price = prices.get(sym);
              const isPositive = (price?.priceChangePercent ?? 0) >= 0;
              const isActive = sym === activeSymbol;
              const ticker = sym.replace('USDT', '');
              const color = getSymbolColor(sym);

              return (
                <div
                  key={`${section.id}-${sym}`}
                  onClick={() => onSelectSymbol(sym)}
                  className={`flex items-center px-3 py-1.5 cursor-pointer text-xs transition-colors group ${
                    isActive ? 'bg-cyan-500/10' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold mr-2 shrink-0"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    {ticker[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`font-mono text-[11px] ${isActive ? 'text-cyan-400' : 'text-white/60'}`}>
                      {ticker}
                    </span>
                  </div>
                  <span className="w-[60px] text-right font-mono text-[10px] text-white/50">
                    {price && price.lastPrice > 0
                      ? price.lastPrice > 1
                        ? price.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : price.lastPrice.toPrecision(4)
                      : '—'}
                  </span>
                  <span className={`w-[50px] text-right font-mono text-[10px] ${
                    isPositive ? 'text-emerald-400/70' : 'text-red-400/70'
                  }`}>
                    {price && price.lastPrice > 0
                      ? `${isPositive ? '+' : ''}${price.priceChangePercent.toFixed(2)}%`
                      : '—'}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); removeSymbol(sym); }}
                    className="ml-1 opacity-0 group-hover:opacity-100 text-white/15 hover:text-red-400/60 shrink-0"
                  >
                    <X size={9} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[9px] text-white/15 font-mono">{allSymbols.length} symbols</span>
        <button
          onClick={() => setSearchOpen(true)}
          className="text-[9px] text-cyan-400/40 hover:text-cyan-400/70 font-mono transition-colors"
        >
          + Add symbol
        </button>
      </div>
    </div>
  );
}
