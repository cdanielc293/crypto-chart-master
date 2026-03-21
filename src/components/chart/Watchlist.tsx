import { useEffect, useRef, useState, useCallback } from 'react';
import { useChart } from '@/context/ChartContext';
import type { WatchlistList, WatchlistSection, WatchlistItem } from '@/types/chart';
import {
  X, Plus, Star, ChevronDown, ChevronRight, MoreHorizontal,
  Copy, Trash2, Edit3, FolderPlus, List, Upload, Search, Grid3X3,
} from 'lucide-react';
import SymbolSearch from './SymbolSearch';

// ─── Watchlist Manager Dialog ───

function WatchlistManagerDialog({
  open,
  onClose,
  watchlists,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: {
  open: boolean;
  onClose: () => void;
  watchlists: WatchlistList[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!open) return null;

  const filtered = search
    ? watchlists.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
    : watchlists;

  const flagged = filtered.filter(l => l.flagColor);
  const created = filtered.filter(l => !l.flagColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex w-[700px] max-h-[70vh] flex-col rounded-lg border border-chart-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-chart-border px-5 py-3">
          <h2 className="text-base font-semibold text-foreground">Watchlists</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="px-5 py-2 border-b border-chart-border">
          <div className="flex items-center gap-2 bg-secondary/50 rounded px-2 py-1.5">
            <Search size={13} className="text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search lists"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[160px] shrink-0 border-r border-chart-border py-2">
            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground bg-toolbar-hover">
              <List size={14} /> My watchlists
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {flagged.length > 0 && (
              <>
                <div className="flex items-center justify-between px-4 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                  <span>Flagged lists</span>
                  <span>Symbols</span>
                </div>
                {flagged.map(list => (
                  <WatchlistRow
                    key={list.id}
                    list={list}
                    isActive={list.id === activeId}
                    editing={editingId === list.id}
                    editName={editName}
                    onStartEdit={() => { setEditingId(list.id); setEditName(list.name); }}
                    onEditChange={setEditName}
                    onEditDone={() => { onRename(list.id, editName); setEditingId(null); }}
                    onSelect={() => { onSelect(list.id); onClose(); }}
                    onDelete={() => onDelete(list.id)}
                  />
                ))}
              </>
            )}

            <div className="flex items-center justify-between px-4 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mt-2">
              <span>Created lists</span>
              <span>Symbols</span>
            </div>
            {created.map(list => (
              <WatchlistRow
                key={list.id}
                list={list}
                isActive={list.id === activeId}
                editing={editingId === list.id}
                editName={editName}
                onStartEdit={() => { setEditingId(list.id); setEditName(list.name); }}
                onEditChange={setEditName}
                onEditDone={() => { onRename(list.id, editName); setEditingId(null); }}
                onSelect={() => { onSelect(list.id); onClose(); }}
                onDelete={() => onDelete(list.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WatchlistRow({
  list,
  isActive,
  editing,
  editName,
  onStartEdit,
  onEditChange,
  onEditDone,
  onSelect,
  onDelete,
}: {
  list: WatchlistList;
  isActive: boolean;
  editing: boolean;
  editName: string;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onEditDone: () => void;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const count = list.sections.reduce((s, sec) => s + sec.symbols.length, 0);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer group transition-colors ${
        isActive ? 'bg-accent' : 'hover:bg-toolbar-hover'
      }`}
      onClick={onSelect}
    >
      {list.flagColor && (
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: list.flagColor }} />
      )}
      {list.favorite && !list.flagColor && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
      {editing ? (
        <input
          autoFocus
          value={editName}
          onChange={e => onEditChange(e.target.value)}
          onBlur={onEditDone}
          onKeyDown={e => { if (e.key === 'Enter') onEditDone(); }}
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-transparent text-sm text-foreground outline-none border-b border-primary"
        />
      ) : (
        <span className="flex-1 text-sm text-foreground truncate">{list.name}</span>
      )}
      <span className="text-sm text-muted-foreground font-mono w-8 text-right">{count}</span>
      <div className="hidden group-hover:flex items-center gap-1 ml-1">
        <button
          onClick={e => { e.stopPropagation(); onStartEdit(); }}
          className="text-muted-foreground hover:text-foreground"
        >
          <Edit3 size={11} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ─── Dropdown Menu ───

function DropdownMenu({
  open,
  anchorRef,
  onClose,
  onAddSection,
  onRename,
  onClearList,
  onCreateNew,
  onOpenManager,
  onDuplicate,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  onAddSection: () => void;
  onRename: () => void;
  onClearList: () => void;
  onCreateNew: () => void;
  onOpenManager: () => void;
  onDuplicate: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const items = [
    { icon: <FolderPlus size={13} />, label: 'Add section', action: onAddSection },
    { icon: <Copy size={13} />, label: 'Make a copy...', action: onDuplicate },
    { icon: <Edit3 size={13} />, label: 'Rename', action: onRename },
    { icon: <Trash2 size={13} />, label: 'Clear list', action: onClearList },
    'sep' as const,
    { icon: <Plus size={13} />, label: 'Create new list...', action: onCreateNew },
    { icon: <Upload size={13} />, label: 'Upload list...', action: () => onClose() },
    'sep' as const,
    { icon: <List size={13} />, label: 'Open list...', action: onOpenManager },
  ];

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-chart-border bg-card py-1 shadow-xl"
    >
      {items.map((item, i) =>
        item === 'sep' ? (
          <div key={i} className="mx-2 my-1 border-t border-chart-border" />
        ) : (
          <button
            key={i}
            onClick={() => { (item as any).action(); onClose(); }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-foreground hover:bg-toolbar-hover"
          >
            <span className="text-muted-foreground">{(item as any).icon}</span>
            <span>{(item as any).label}</span>
          </button>
        )
      )}
    </div>
  );
}

// ─── Symbol Details Panel ───

function SymbolDetailsPanel({ symbol, price }: { symbol: string; price: WatchlistItem | null }) {
  if (!price || price.lastPrice <= 0) return null;

  const isPositive = price.priceChangePercent >= 0;
  const ticker = symbol.replace('USDT', '');

  return (
    <div className="border-t border-chart-border px-3 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          {ticker[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{symbol}</div>
          <div className="text-[10px] text-muted-foreground">{ticker}USDT SPOT · BYBIT</div>
          <div className="text-[10px] text-muted-foreground">Spot · Crypto</div>
        </div>
      </div>
      <div>
        <span className="text-xl font-bold text-foreground font-mono">
          {price.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
        <span className="text-xs text-muted-foreground ml-1">USDT</span>
      </div>
      <div className={`text-xs font-mono ${isPositive ? 'text-chart-bull' : 'text-chart-bear'}`}>
        {isPositive ? '+' : ''}{price.priceChange.toFixed(1)}{' '}
        {isPositive ? '+' : ''}{price.priceChangePercent.toFixed(2)}%
      </div>
    </div>
  );
}

// ─── Main Watchlist ───

export default function Watchlist() {
  const {
    symbol, setSymbol, removeFromWatchlist, addToWatchlist,
    watchlists, setWatchlists, activeWatchlistId, setActiveWatchlistId,
    watchlistPrices, setWatchlistPrices,
  } = useChart();

  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [renamingList, setRenamingList] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [sectionRenameValue, setSectionRenameValue] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'rows'>('table');

  const wsRef = useRef<WebSocket | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const activeList = watchlists.find(l => l.id === activeWatchlistId) || watchlists[0];
  const allSymbols = activeList ? [...new Set(activeList.sections.flatMap(s => s.symbols))] : [];

  // WebSocket for live prices
  useEffect(() => {
    if (allSymbols.length === 0) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      return;
    }

    if (wsRef.current) wsRef.current.close();

    const streams = allSymbols.map(s => `${s.toLowerCase()}@miniTicker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const data = msg.data;
      if (!data) return;

      setWatchlistPrices(prev => {
        const next = new Map(prev);
        next.set(data.s, {
          symbol: data.s,
          lastPrice: parseFloat(data.c),
          priceChange: parseFloat(data.p),
          priceChangePercent: parseFloat(data.P),
          volume: parseFloat(data.v),
        });
        return next;
      });
    };

    return () => { ws.close(); wsRef.current = null; };
  }, [allSymbols.join(',')]);

  // ─── List operations ───

  const createNewList = useCallback((name: string) => {
    const id = `list_${Date.now()}`;
    setWatchlists(prev => [...prev, {
      id,
      name: name || 'New list',
      favorite: false,
      sections: [{ id: `sec_${Date.now()}`, name: 'DEFAULT', collapsed: false, symbols: [] }],
    }]);
    setActiveWatchlistId(id);
  }, [setWatchlists, setActiveWatchlistId]);

  const deleteList = useCallback((id: string) => {
    setWatchlists(prev => {
      const next = prev.filter(l => l.id !== id);
      if (next.length === 0) return DEFAULT_WATCHLISTS_FALLBACK;
      return next;
    });
    if (activeWatchlistId === id) {
      const remaining = watchlists.filter(l => l.id !== id);
      setActiveWatchlistId(remaining[0]?.id || 'private');
    }
  }, [activeWatchlistId, watchlists, setWatchlists, setActiveWatchlistId]);

  const renameList = useCallback((id: string, name: string) => {
    if (!name.trim()) return;
    setWatchlists(prev => prev.map(l => l.id === id ? { ...l, name: name.trim() } : l));
  }, [setWatchlists]);

  const duplicateList = useCallback(() => {
    if (!activeList) return;
    const id = `list_${Date.now()}`;
    setWatchlists(prev => [...prev, {
      ...JSON.parse(JSON.stringify(activeList)),
      id,
      name: `${activeList.name} (copy)`,
    }]);
    setActiveWatchlistId(id);
  }, [activeList, setWatchlists, setActiveWatchlistId]);

  const clearList = useCallback(() => {
    setWatchlists(prev => prev.map(l => {
      if (l.id !== activeWatchlistId) return l;
      return { ...l, sections: l.sections.map(s => ({ ...s, symbols: [] })) };
    }));
  }, [activeWatchlistId, setWatchlists]);

  const addSection = useCallback(() => {
    const id = `sec_${Date.now()}`;
    setWatchlists(prev => prev.map(l => {
      if (l.id !== activeWatchlistId) return l;
      return { ...l, sections: [...l.sections, { id, name: 'NEW SECTION', collapsed: false, symbols: [] }] };
    }));
  }, [activeWatchlistId, setWatchlists]);

  const toggleSectionCollapse = useCallback((sectionId: string) => {
    setWatchlists(prev => prev.map(l => {
      if (l.id !== activeWatchlistId) return l;
      return {
        ...l,
        sections: l.sections.map(s =>
          s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s
        ),
      };
    }));
  }, [activeWatchlistId, setWatchlists]);

  const renameSection = useCallback((sectionId: string, name: string) => {
    if (!name.trim()) return;
    setWatchlists(prev => prev.map(l => {
      if (l.id !== activeWatchlistId) return l;
      return {
        ...l,
        sections: l.sections.map(s =>
          s.id === sectionId ? { ...s, name: name.trim().toUpperCase() } : s
        ),
      };
    }));
  }, [activeWatchlistId, setWatchlists]);

  const deleteSection = useCallback((sectionId: string) => {
    setWatchlists(prev => prev.map(l => {
      if (l.id !== activeWatchlistId) return l;
      const filtered = l.sections.filter(s => s.id !== sectionId);
      if (filtered.length === 0) {
        return { ...l, sections: [{ id: `sec_${Date.now()}`, name: 'DEFAULT', collapsed: false, symbols: [] }] };
      }
      return { ...l, sections: filtered };
    }));
  }, [activeWatchlistId, setWatchlists]);

  const selectedPrice = selectedSymbol ? watchlistPrices.get(selectedSymbol) || null : null;

  return (
    <>
      <div className="flex flex-col w-72 bg-toolbar-bg border-l border-chart-border select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-chart-border relative">
          {renamingList ? (
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={() => {
                renameList(activeWatchlistId, renameValue);
                setRenamingList(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') { renameList(activeWatchlistId, renameValue); setRenamingList(false); }
                if (e.key === 'Escape') setRenamingList(false);
              }}
              className="flex-1 bg-transparent text-xs font-semibold text-foreground outline-none border-b border-primary"
            />
          ) : (
            <button
              onClick={() => setManagerOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary"
            >
              {activeList?.name || 'Watchlist'}
              <ChevronDown size={12} />
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1 text-muted-foreground hover:text-foreground"
              title="Add symbol"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => setViewMode(v => v === 'table' ? 'rows' : 'table')}
              className="p-1 text-muted-foreground hover:text-foreground"
              title="Toggle view"
            >
              <Grid3X3 size={14} />
            </button>
            <button
              ref={menuBtnRef as React.RefObject<HTMLButtonElement>}
              onClick={() => setMenuOpen(v => !v)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>

          <DropdownMenu
            open={menuOpen}
            anchorRef={menuBtnRef as React.RefObject<HTMLElement>}
            onClose={() => setMenuOpen(false)}
            onAddSection={addSection}
            onRename={() => {
              setRenameValue(activeList?.name || '');
              setRenamingList(true);
            }}
            onClearList={clearList}
            onCreateNew={() => createNewList('New list')}
            onOpenManager={() => setManagerOpen(true)}
            onDuplicate={duplicateList}
          />
        </div>

        {/* Column headers */}
        {viewMode === 'table' && (
          <div className="flex items-center px-3 py-1 text-[10px] text-muted-foreground border-b border-chart-border">
            <span className="flex-1">Symbol</span>
            <span className="w-[72px] text-right">Last</span>
            <span className="w-14 text-right">Chg</span>
            <span className="w-14 text-right">Chg%</span>
          </div>
        )}

        {/* Sections & Symbols */}
        <div className="flex-1 overflow-y-auto">
          {activeList?.sections.map(section => (
            <div key={section.id}>
              {/* Section header */}
              <div
                className="flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-toolbar-hover group"
                onClick={() => toggleSectionCollapse(section.id)}
              >
                {section.collapsed ? <ChevronRight size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
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
                    className="flex-1 bg-transparent text-[10px] text-foreground outline-none border-b border-primary uppercase"
                  />
                ) : (
                  <span
                    className="flex-1 text-[10px] text-muted-foreground uppercase tracking-wider"
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
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                >
                  <X size={10} />
                </button>
              </div>

              {/* Symbols in section */}
              {!section.collapsed && section.symbols.map(sym => {
                const price = watchlistPrices.get(sym);
                const isPositive = (price?.priceChangePercent ?? 0) >= 0;
                const isSelected = sym === symbol;
                const isDetailSelected = sym === selectedSymbol;

                return (
                  <div
                    key={sym}
                    onClick={() => setSymbol(sym)}
                    onDoubleClick={() => setSelectedSymbol(prev => prev === sym ? null : sym)}
                    className={`flex items-center px-3 py-1.5 cursor-pointer text-xs transition-colors group ${
                      isSelected ? 'bg-accent' : isDetailSelected ? 'bg-toolbar-hover/50' : 'hover:bg-toolbar-hover'
                    }`}
                  >
                    {/* Logo placeholder */}
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary mr-2 shrink-0">
                      {sym[0]}
                    </div>
                    <span className="flex-1 font-medium text-foreground truncate">
                      {sym.replace('USDT', '')}
                    </span>
                    {viewMode === 'table' ? (
                      <>
                        <span className="w-[72px] text-right font-mono text-foreground text-[11px]">
                          {price && price.lastPrice > 0
                            ? price.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '—'}
                        </span>
                        <span className={`w-14 text-right font-mono text-[11px] ${isPositive ? 'text-chart-bull' : 'text-chart-bear'}`}>
                          {price && price.lastPrice > 0
                            ? `${isPositive ? '' : ''}${price.priceChange.toFixed(1)}`
                            : '—'}
                        </span>
                        <span className={`w-14 text-right font-mono text-[11px] ${isPositive ? 'text-chart-bull' : 'text-chart-bear'}`}>
                          {price && price.lastPrice > 0
                            ? `${isPositive ? '' : ''}${price.priceChangePercent.toFixed(2)}%`
                            : '—'}
                        </span>
                      </>
                    ) : (
                      <span className={`font-mono text-[11px] ${isPositive ? 'text-chart-bull' : 'text-chart-bear'}`}>
                        {price && price.lastPrice > 0
                          ? `${price.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                          : '—'}
                      </span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); removeFromWatchlist(sym); }}
                      className="ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Symbol details at bottom */}
        {selectedSymbol && (
          <SymbolDetailsPanel
            symbol={selectedSymbol}
            price={selectedPrice}
          />
        )}
      </div>

      {searchOpen && <SymbolSearch onClose={() => setSearchOpen(false)} />}

      <WatchlistManagerDialog
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        watchlists={watchlists}
        activeId={activeWatchlistId}
        onSelect={setActiveWatchlistId}
        onCreate={createNewList}
        onDelete={deleteList}
        onRename={renameList}
      />
    </>
  );
}

const DEFAULT_WATCHLISTS_FALLBACK: WatchlistList[] = [
  {
    id: 'private',
    name: 'Private',
    favorite: true,
    sections: [{ id: 'default', name: 'DEFAULT', collapsed: false, symbols: [] }],
  },
];
