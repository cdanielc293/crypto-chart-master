import { useState, useRef, useEffect, useCallback } from 'react';
import { useChart } from '@/context/ChartContext';
import type { ChartLayout } from '@/types/layout';
import { DEFAULT_CHART_SETTINGS } from '@/types/chartSettings';
import {
  ChevronDown, Save, Copy, Pencil, Download, Plus, Star, Trash2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function loadLayouts(): ChartLayout[] {
  try {
    const saved = localStorage.getItem('chartLayouts');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveLayouts(layouts: ChartLayout[]) {
  localStorage.setItem('chartLayouts', JSON.stringify(layouts));
}

function loadActiveLayoutId(): string | null {
  return localStorage.getItem('activeLayoutId');
}

function saveActiveLayoutId(id: string | null) {
  if (id) localStorage.setItem('activeLayoutId', id);
  else localStorage.removeItem('activeLayoutId');
}

export default function LayoutManager() {
  const ctx = useChart();
  const [open, setOpen] = useState(false);
  const [layouts, setLayouts] = useState<ChartLayout[]>(loadLayouts);
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(loadActiveLayoutId);
  const [autosave, setAutosave] = useState(() => localStorage.getItem('layoutAutosave') === 'true');
  const [sharing, setSharing] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLayout = layouts.find(l => l.id === activeLayoutId);
  const displayName = activeLayout?.name || 'Untitled';

  // Persist layouts
  useEffect(() => { saveLayouts(layouts); }, [layouts]);
  useEffect(() => { saveActiveLayoutId(activeLayoutId); }, [activeLayoutId]);
  useEffect(() => { localStorage.setItem('layoutAutosave', String(autosave)); }, [autosave]);

  const captureCurrentState = useCallback((): Omit<ChartLayout, 'id' | 'name' | 'createdAt'> => ({
    symbol: ctx.symbol,
    interval: ctx.interval,
    chartType: ctx.chartType,
    indicators: [...ctx.indicators],
    drawings: [...ctx.drawings],
    chartSettings: { ...ctx.chartSettings },
    updatedAt: Date.now(),
  }), [ctx.symbol, ctx.interval, ctx.chartType, ctx.indicators, ctx.drawings, ctx.chartSettings]);

  const applyLayout = useCallback((layout: ChartLayout) => {
    ctx.setSymbol(layout.symbol);
    ctx.setInterval(layout.interval);
    ctx.setChartType(layout.chartType);
    layout.indicators.forEach(ind => {
      if (!ctx.indicators.includes(ind)) ctx.toggleIndicator(ind);
    });
    ctx.indicators.forEach(ind => {
      if (!layout.indicators.includes(ind)) ctx.toggleIndicator(ind);
    });
    if (layout.chartSettings) ctx.setChartSettings(layout.chartSettings);
  }, [ctx]);

  // Autosave
  useEffect(() => {
    if (!autosave || !activeLayoutId) return;
    const timer = setTimeout(() => {
      setLayouts(prev => prev.map(l =>
        l.id === activeLayoutId ? { ...l, ...captureCurrentState() } : l
      ));
    }, 2000);
    return () => clearTimeout(timer);
  }, [autosave, activeLayoutId, ctx.symbol, ctx.interval, ctx.chartType, ctx.indicators, ctx.chartSettings, captureCurrentState]);

  const handleSave = () => {
    if (activeLayoutId) {
      setLayouts(prev => prev.map(l =>
        l.id === activeLayoutId ? { ...l, ...captureCurrentState() } : l
      ));
    } else {
      const id = generateId();
      const layout: ChartLayout = {
        id,
        name: 'Layout ' + (layouts.length + 1),
        ...captureCurrentState(),
        createdAt: Date.now(),
      };
      setLayouts(prev => [...prev, layout]);
      setActiveLayoutId(id);
    }
    setOpen(false);
  };

  const handleCreateNew = () => {
    const id = generateId();
    const layout: ChartLayout = {
      id,
      name: 'Layout ' + (layouts.length + 1),
      symbol: 'BTCUSDT',
      interval: '1d',
      chartType: 'candles',
      indicators: [],
      drawings: [],
      chartSettings: DEFAULT_CHART_SETTINGS,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setLayouts(prev => [...prev, layout]);
    setActiveLayoutId(id);
    applyLayout(layout);
    setOpen(false);
  };

  const handleCopy = () => {
    if (!activeLayout) return;
    const id = generateId();
    const copy: ChartLayout = {
      ...activeLayout,
      id,
      name: activeLayout.name + ' (copy)',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setLayouts(prev => [...prev, copy]);
    setActiveLayoutId(id);
    setOpen(false);
  };

  const handleRename = (id: string) => {
    const layout = layouts.find(l => l.id === id);
    if (!layout) return;
    setRenaming(id);
    setRenameValue(layout.name);
    setTimeout(() => renameRef.current?.focus(), 50);
  };

  const submitRename = () => {
    if (renaming && renameValue.trim()) {
      setLayouts(prev => prev.map(l =>
        l.id === renaming ? { ...l, name: renameValue.trim(), updatedAt: Date.now() } : l
      ));
    }
    setRenaming(null);
  };

  const handleDownload = () => {
    // Export chart data as CSV placeholder
    const data = `Symbol,${ctx.symbol}\nInterval,${ctx.interval}\nChart Type,${ctx.chartType}\nIndicators,"${ctx.indicators.join(', ')}"`;
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${displayName}_chart_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handleSelectLayout = (layout: ChartLayout) => {
    setActiveLayoutId(layout.id);
    applyLayout(layout);
    setOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLayouts(prev => prev.filter(l => l.id !== id));
    if (activeLayoutId === id) setActiveLayoutId(null);
  };

  const recentLayouts = [...layouts]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-toolbar-hover text-foreground font-semibold text-[14px]"
      >
        <span>{displayName}</span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setRenaming(null); }} />
          <div className="absolute top-full right-0 mt-1 z-50 w-[280px] bg-card border border-chart-border rounded-md shadow-xl py-1">
            {/* Save */}
            <button
              onClick={handleSave}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-foreground hover:bg-toolbar-hover transition-colors"
            >
              <Save size={15} className="text-muted-foreground" />
              <span className="flex-1 text-left">Save layout</span>
              <span className="text-[11px] text-muted-foreground">Ctrl + S</span>
            </button>

            {/* Autosave */}
            <div className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-foreground">
              <span className="flex-1">Autosave</span>
              <Switch checked={autosave} onCheckedChange={setAutosave} className="scale-75" />
            </div>

            {/* Sharing */}
            <div className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-foreground">
              <span className="flex-1">Sharing <span className="text-muted-foreground text-[11px]">ⓘ</span></span>
              <Switch checked={sharing} onCheckedChange={setSharing} className="scale-75" />
            </div>

            <div className="h-px bg-chart-border my-1" />

            {/* Make a copy */}
            <button
              onClick={handleCopy}
              disabled={!activeLayout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-foreground hover:bg-toolbar-hover transition-colors disabled:opacity-40"
            >
              <Copy size={15} className="text-muted-foreground" />
              <span>Make a copy…</span>
            </button>

            {/* Rename */}
            <button
              onClick={() => activeLayoutId && handleRename(activeLayoutId)}
              disabled={!activeLayout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-foreground hover:bg-toolbar-hover transition-colors disabled:opacity-40"
            >
              <Pencil size={15} className="text-muted-foreground" />
              <span>Rename…</span>
            </button>

            {/* Download chart data */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-foreground hover:bg-toolbar-hover transition-colors"
            >
              <Download size={15} className="text-muted-foreground" />
              <span>Download chart data…</span>
            </button>

            <div className="h-px bg-chart-border my-1" />

            {/* Create new layout */}
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-foreground hover:bg-toolbar-hover transition-colors"
            >
              <Plus size={15} className="text-muted-foreground" />
              <span>Create new layout…</span>
            </button>

            {/* Recently Used */}
            {recentLayouts.length > 0 && (
              <>
                <div className="h-px bg-chart-border my-1" />
                <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                  Recently Used
                </div>
                {recentLayouts.map(layout => (
                  <div
                    key={layout.id}
                    onClick={() => handleSelectLayout(layout)}
                    className={`flex items-center gap-3 w-full px-4 py-2 text-[13px] hover:bg-toolbar-hover transition-colors cursor-pointer ${
                      layout.id === activeLayoutId ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      {renaming === layout.id ? (
                        <input
                          ref={renameRef}
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={submitRename}
                          onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenaming(null); }}
                          onClick={e => e.stopPropagation()}
                          className="w-full bg-muted border border-chart-border rounded px-2 py-0.5 text-[13px] text-foreground outline-none"
                        />
                      ) : (
                        <>
                          <div className="font-medium truncate">{layout.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {layout.symbol.replace('USDT', '')}, {layout.interval}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDelete(layout.id, e)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={12} />
                      </button>
                      <Star size={14} className="text-muted-foreground hover:text-yellow-500 cursor-pointer" />
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Open layout */}
            <div className="h-px bg-chart-border my-1" />
            <button
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-muted-foreground hover:bg-toolbar-hover transition-colors"
            >
              <span className="flex-1 text-left">Open layout…</span>
              <span className="text-[11px]">Dot</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
