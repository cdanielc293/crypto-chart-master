import { useState, useRef, useEffect, useCallback } from 'react';
import { useChart } from '@/context/ChartContext';
import type { ChartLayout, LayoutPanel, LayoutSyncOptions } from '@/types/layout';
import { ALL_GRID_LAYOUTS, DEFAULT_SYNC_OPTIONS } from '@/types/layout';
import { DEFAULT_CHART_SETTINGS } from '@/types/chartSettings';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import {
  ChevronDown, Save, Copy, Pencil, Download, Plus, Trash2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function LayoutManager() {
  const ctx = useChart();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [open, setOpen] = useState(false);
  const [layouts, setLayouts] = useState<ChartLayout[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);
  const [autosave, setAutosave] = useState(() => localStorage.getItem('layoutAutosave') === 'true');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [loaded, setLoaded] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLayout = layouts.find(l => l.id === activeLayoutId);
  const displayName = activeLayout?.name || 'Untitled';

  // Load layouts from DB
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_layouts')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load layouts:', error);
          return;
        }
        const rows = (data || []) as ChartLayout[];
        setLayouts(rows);
        const active = rows.find(r => r.is_active) || rows[0];
        if (active) {
          setActiveLayoutId(active.id);
          applyLayout(active);
        }
        setLoaded(true);
      });
  }, [userId]);

  // Capture current full workspace state into panels array
  const captureCurrentPanels = useCallback((): LayoutPanel[] => {
    const panelCount = ctx.gridLayout.count;
    const panels: LayoutPanel[] = [];

    if (panelCount === 1) {
      panels.push({
        symbol: ctx.symbol,
        interval: ctx.interval,
        chartType: ctx.chartType,
        indicators: [...ctx.indicators],
        indicatorConfigs: Object.fromEntries(ctx.indicatorConfigs),
        hiddenIndicators: Array.from(ctx.hiddenIndicators),
        drawings: JSON.parse(JSON.stringify(ctx.drawings)),
      });
    } else {
      for (let i = 0; i < panelCount; i++) {
        const panelState = ctx.panelIndicatorStates.get(i);
        panels.push({
          symbol: ctx.syncOptions.symbol ? ctx.symbol : (ctx.panelSymbols[i] || 'BTCUSDT'),
          interval: panelState?.interval || ctx.interval,
          chartType: panelState?.chartType || ctx.chartType,
          indicators: panelState ? [...panelState.indicators] : [],
          indicatorConfigs: panelState ? Object.fromEntries(panelState.indicatorConfigs) : {},
          hiddenIndicators: panelState ? Array.from(panelState.hiddenIndicators) : [],
          drawings: [],
        });
      }
    }
    return panels;
  }, [ctx]);

  const captureFullState = useCallback(() => ({
    grid_layout_id: ctx.gridLayout.id,
    sync_options: ctx.syncOptions,
    panels: captureCurrentPanels(),
    chart_settings: ctx.chartSettings,
    updated_at: new Date().toISOString(),
  }), [ctx.gridLayout.id, ctx.syncOptions, ctx.chartSettings, captureCurrentPanels]);

  // Apply a layout to the chart
  const applyLayout = useCallback((layout: ChartLayout) => {
    // Restore grid
    const grid = ALL_GRID_LAYOUTS.find(g => g.id === layout.grid_layout_id) || ALL_GRID_LAYOUTS[0];
    ctx.setGridLayout(grid);

    // Restore sync options
    if (layout.sync_options && typeof layout.sync_options === 'object') {
      ctx.setSyncOptions({ ...DEFAULT_SYNC_OPTIONS, ...(layout.sync_options as LayoutSyncOptions) });
    }

    // Restore chart settings
    if (layout.chart_settings && typeof layout.chart_settings === 'object') {
      ctx.setChartSettings(layout.chart_settings);
    }

    // Restore panels
    const panels = Array.isArray(layout.panels) ? layout.panels : [];
    if (panels.length > 0) {
      const firstPanel = panels[0];
      ctx.setSymbol(firstPanel.symbol || 'BTCUSDT');
      ctx.setInterval((firstPanel.interval || '1d') as any);
      ctx.setChartType((firstPanel.chartType || 'candles') as any);

      // Restore main indicators
      // Clear current, then add from layout
      // We need to set indicators directly - use a reset approach
      if (grid.count === 1 && firstPanel.indicators) {
        // This will be handled by persistence per symbol
      }

      // Restore multi-panel symbols, intervals, and chart types
      if (grid.count > 1) {
        panels.forEach((panel, i) => {
          ctx.setPanelSymbol(i, panel.symbol || 'BTCUSDT');
          if (panel.interval) {
            ctx.setPanelInterval(i, panel.interval as any);
          }
          if (panel.chartType) {
            ctx.setPanelChartType(i, panel.chartType as any);
          }
        });
      }
    }
  }, [ctx]);

  // Save to DB
  const saveLayoutToDB = useCallback(async (layout: Partial<ChartLayout> & { id: string }) => {
    if (!userId) return;
    const { error } = await supabase
      .from('user_layouts')
      .update({
        ...layout,
        updated_at: new Date().toISOString(),
      })
      .eq('id', layout.id)
      .eq('user_id', userId);
    if (error) console.error('Failed to save layout:', error);
  }, [userId]);

  // Mark active in DB
  const setActiveInDB = useCallback(async (layoutId: string) => {
    if (!userId) return;
    // Unset all active
    await supabase
      .from('user_layouts')
      .update({ is_active: false })
      .eq('user_id', userId);
    // Set new active
    await supabase
      .from('user_layouts')
      .update({ is_active: true })
      .eq('id', layoutId)
      .eq('user_id', userId);
  }, [userId]);

  // Autosave
  useEffect(() => {
    if (!autosave || !activeLayoutId || !loaded || !userId) return;
    const timer = setTimeout(() => {
      const state = captureFullState();
      saveLayoutToDB({ id: activeLayoutId, ...state });
      setLayouts(prev => prev.map(l =>
        l.id === activeLayoutId ? { ...l, ...state } : l
      ));
    }, 3000);
    return () => clearTimeout(timer);
  }, [autosave, activeLayoutId, loaded, userId, ctx.symbol, ctx.interval, ctx.chartType, ctx.gridLayout.id, ctx.syncOptions, ctx.indicators, ctx.chartSettings, captureFullState, saveLayoutToDB]);

  useEffect(() => { localStorage.setItem('layoutAutosave', String(autosave)); }, [autosave]);

  const handleSave = async () => {
    if (!userId) return;
    const state = captureFullState();

    if (activeLayoutId) {
      await saveLayoutToDB({ id: activeLayoutId, ...state });
      setLayouts(prev => prev.map(l =>
        l.id === activeLayoutId ? { ...l, ...state } : l
      ));
      toast.success('Layout saved');
    } else {
      // Create new
      const { data, error } = await supabase
        .from('user_layouts')
        .insert({
          user_id: userId,
          name: 'Layout ' + (layouts.length + 1),
          is_active: true,
          ...state,
          sort_order: layouts.length,
        })
        .select()
        .single();

      if (error) {
        toast.error('Failed to save layout');
        return;
      }
      setLayouts(prev => [...prev, data as ChartLayout]);
      setActiveLayoutId(data.id);
      await setActiveInDB(data.id);
      toast.success('Layout created');
    }
    setOpen(false);
  };

  const handleCreateNew = async () => {
    if (!userId) return;
    const state = captureFullState();
    const { data, error } = await supabase
      .from('user_layouts')
      .insert({
        user_id: userId,
        name: 'Layout ' + (layouts.length + 1),
        is_active: true,
        ...state,
        sort_order: layouts.length,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create layout');
      return;
    }
    const newLayout = data as ChartLayout;
    setLayouts(prev => [...prev, newLayout]);
    setActiveLayoutId(newLayout.id);
    await setActiveInDB(newLayout.id);
    toast.success('New layout created');
    setOpen(false);
  };

  const handleCopy = async () => {
    if (!activeLayout || !userId) return;
    const { data, error } = await supabase
      .from('user_layouts')
      .insert({
        user_id: userId,
        name: activeLayout.name + ' (copy)',
        is_active: true,
        grid_layout_id: activeLayout.grid_layout_id,
        sync_options: activeLayout.sync_options,
        panels: activeLayout.panels,
        chart_settings: activeLayout.chart_settings,
        sort_order: layouts.length,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to copy layout');
      return;
    }
    const copy = data as ChartLayout;
    setLayouts(prev => [...prev, copy]);
    setActiveLayoutId(copy.id);
    await setActiveInDB(copy.id);
    toast.success('Layout copied');
    setOpen(false);
  };

  const handleRename = (id: string) => {
    const layout = layouts.find(l => l.id === id);
    if (!layout) return;
    setRenaming(id);
    setRenameValue(layout.name);
    setTimeout(() => renameRef.current?.focus(), 50);
  };

  const submitRename = async () => {
    if (renaming && renameValue.trim() && userId) {
      await saveLayoutToDB({ id: renaming, name: renameValue.trim() });
      setLayouts(prev => prev.map(l =>
        l.id === renaming ? { ...l, name: renameValue.trim() } : l
      ));
    }
    setRenaming(null);
  };

  const handleSelectLayout = async (layout: ChartLayout) => {
    // Save current layout before switching
    if (activeLayoutId && autosave) {
      const state = captureFullState();
      await saveLayoutToDB({ id: activeLayoutId, ...state });
    }

    setActiveLayoutId(layout.id);
    applyLayout(layout);
    await setActiveInDB(layout.id);
    setOpen(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    await supabase.from('user_layouts').delete().eq('id', id).eq('user_id', userId);
    setLayouts(prev => prev.filter(l => l.id !== id));
    if (activeLayoutId === id) {
      const remaining = layouts.filter(l => l.id !== id);
      if (remaining.length > 0) {
        setActiveLayoutId(remaining[0].id);
        applyLayout(remaining[0]);
        await setActiveInDB(remaining[0].id);
      } else {
        setActiveLayoutId(null);
      }
    }
  };

  const handleDownload = () => {
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

  // Save on page close
  useEffect(() => {
    if (!activeLayoutId || !userId) return;
    const handleBeforeUnload = () => {
      const state = captureFullState();
      const payload = JSON.stringify({
        ...state,
        updated_at: new Date().toISOString(),
      });
      // Use sendBeacon for reliable save on close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_layouts?id=eq.${activeLayoutId}&user_id=eq.${userId}`;
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeLayoutId, userId, captureFullState]);

  const recentLayouts = [...layouts]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8);

  // Get primary symbol for display
  const getLayoutInfo = (layout: ChartLayout) => {
    const panels = Array.isArray(layout.panels) ? layout.panels : [];
    const sym = panels[0]?.symbol?.replace('USDT', '') || '—';
    const interval = panels[0]?.interval || '—';
    const grid = ALL_GRID_LAYOUTS.find(g => g.id === layout.grid_layout_id);
    const chartCount = grid?.count || 1;
    return { sym, interval, chartCount };
  };

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
          <div className="absolute top-full right-0 mt-1 z-50 w-[300px] bg-card border border-chart-border rounded-md shadow-xl py-1">
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

            {/* Download */}
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

            {/* Layout list */}
            {recentLayouts.length > 0 && (
              <>
                <div className="h-px bg-chart-border my-1" />
                <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                  My Layouts
                </div>
                {recentLayouts.map(layout => {
                  const info = getLayoutInfo(layout);
                  return (
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
                              {info.sym}, {info.interval}{info.chartCount > 1 ? ` · ${info.chartCount} charts` : ''}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(layout.id);
                          }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(layout.id, e)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
