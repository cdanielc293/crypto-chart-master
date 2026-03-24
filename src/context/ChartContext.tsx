import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { Interval, DrawingTool, ChartType, WatchlistItem, WatchlistList, Drawing } from '@/types/chart';
import { DEFAULT_FAVORITE_INTERVALS } from '@/types/chart';
import type { ChartSettings } from '@/types/chartSettings';
import { DEFAULT_CHART_SETTINGS, normalizeChartSettings } from '@/types/chartSettings';
import type { GridLayout, LayoutSyncOptions } from '@/types/layout';
import { ALL_GRID_LAYOUTS, DEFAULT_SYNC_OPTIONS } from '@/types/layout';
import { prefetchSymbolHistory } from '@/lib/klineCache';
import type { IndicatorInstance } from '@/types/indicators';
import { createInstance } from '@/types/indicators';
import { getIndicator } from '@/lib/indicators/registry';
import { useChartPersistence, type PersistedChartState } from '@/hooks/useChartPersistence';
import { useAuth } from '@/context/AuthContext';

export type ReplayState = 'off' | 'selecting' | 'ready' | 'playing' | 'paused';

export interface PanelIndicatorState {
  indicators: string[];
  indicatorConfigs: Map<string, IndicatorInstance>;
  hiddenIndicators: Set<string>;
  interval?: Interval;
  chartType?: ChartType;
}

const DEFAULT_WATCHLISTS: WatchlistList[] = [
  {
    id: 'private',
    name: 'Private',
    favorite: true,
    sections: [
      {
        id: 'default',
        name: 'IN A TRADE',
        collapsed: false,
        symbols: ['BTCUSDT', 'ETHUSDT'],
      },
    ],
  },
];

function loadWatchlists(): WatchlistList[] {
  const saved = localStorage.getItem('watchlists');
  if (!saved) return DEFAULT_WATCHLISTS;
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_WATCHLISTS;
  } catch {
    return DEFAULT_WATCHLISTS;
  }
}

function saveWatchlists(lists: WatchlistList[]) {
  localStorage.setItem('watchlists', JSON.stringify(lists));
}

interface ChartContextType {
  symbol: string;
  setSymbol: (s: string) => void;
  interval: Interval;
  setInterval: (i: Interval) => void;
  chartType: ChartType;
  setChartType: (t: ChartType) => void;
  drawingTool: DrawingTool;
  setDrawingTool: (t: DrawingTool) => void;
  // Watchlist
  watchlists: WatchlistList[];
  setWatchlists: React.Dispatch<React.SetStateAction<WatchlistList[]>>;
  activeWatchlistId: string;
  setActiveWatchlistId: (id: string) => void;
  watchlistPrices: Map<string, WatchlistItem>;
  setWatchlistPrices: React.Dispatch<React.SetStateAction<Map<string, WatchlistItem>>>;
  // Legacy compat
  watchlist: WatchlistItem[];
  setWatchlist: React.Dispatch<React.SetStateAction<WatchlistItem[]>>;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  // Drawings
  drawings: Drawing[];
  addDrawing: (d: Drawing) => void;
  updateDrawing: (id: string, d: Drawing) => void;
  removeDrawing: (id: string) => void;
  selectedDrawingId: string | null;
  setSelectedDrawingId: (id: string | null) => void;
  selectedDrawingIds: Set<string>;
  setSelectedDrawingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleSelectedDrawing: (id: string) => void;
  indicators: string[];
  addIndicator: (definitionId: string) => void;
  removeIndicator: (instanceId: string) => void;
  toggleIndicator: (name: string) => void;
  hiddenIndicators: Set<string>;
  toggleHiddenIndicator: (name: string) => void;
  indicatorConfigs: Map<string, IndicatorInstance>;
  updateIndicatorConfig: (name: string, config: IndicatorInstance) => void;
  favoriteIntervals: Interval[];
  toggleFavoriteInterval: (interval: Interval) => void;
  // Replay
  replayState: ReplayState;
  setReplayState: (s: ReplayState) => void;
  replayBarIndex: number;
  setReplayBarIndex: (i: number) => void;
  replaySpeed: number;
  setReplaySpeed: (s: number) => void;
  replayStartIndex: number;
  setReplayStartIndex: (i: number) => void;
  chartSettings: ChartSettings;
  setChartSettings: React.Dispatch<React.SetStateAction<ChartSettings>>;
  gridLayout: GridLayout;
  setGridLayout: (layout: GridLayout) => void;
  syncOptions: LayoutSyncOptions;
  setSyncOptions: React.Dispatch<React.SetStateAction<LayoutSyncOptions>>;
  // Per-panel symbols for multi-chart
  panelSymbols: string[];
  setPanelSymbol: (index: number, symbol: string) => void;
  activePanelIndex: number | null;
  setActivePanelIndex: (index: number | null) => void;
  // Per-panel indicators for multi-chart
  panelIndicatorStates: Map<number, PanelIndicatorState>;
  addPanelIndicator: (panelIndex: number, definitionId: string) => void;
  removePanelIndicator: (panelIndex: number, instanceId: string) => void;
  togglePanelHiddenIndicator: (panelIndex: number, instanceId: string) => void;
  updatePanelIndicatorConfig: (panelIndex: number, instanceId: string, config: IndicatorInstance) => void;
  setPanelInterval: (panelIndex: number, interval: Interval) => void;
  setPanelChartType: (panelIndex: number, chartType: ChartType) => void;
}

const ChartContext = createContext<ChartContextType | null>(null);

export const useChart = () => {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used within ChartProvider');
  return ctx;
};

export const ChartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [symbol, setSymbolRaw] = useState(() => {
    return localStorage.getItem('lastSymbol') || 'BTCUSDT';
  });
  const [interval, setInterval] = useState<Interval>('1d');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('cursor');

  // New multi-list watchlists
  const [watchlists, setWatchlists] = useState<WatchlistList[]>(loadWatchlists);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>(() => {
    const lists = loadWatchlists();
    return lists[0]?.id || 'private';
  });
  const [watchlistPrices, setWatchlistPrices] = useState<Map<string, WatchlistItem>>(new Map());

  // Persist watchlists
  useEffect(() => {
    saveWatchlists(watchlists);
  }, [watchlists]);

  useEffect(() => {
    const symbols = new Set<string>();
    for (const list of watchlists) {
      for (const section of list.sections) {
        for (const sym of section.symbols) {
          symbols.add(sym.toUpperCase());
        }
      }
    }

    let cancelled = false;
    const prefetchWatchlistSymbols = async () => {
      for (const sym of symbols) {
        if (cancelled) return;
        await prefetchSymbolHistory(sym);
      }
    };

    void prefetchWatchlistSymbols();
    return () => {
      cancelled = true;
    };
  }, [watchlists]);

  // Legacy compat: derive flat watchlist from active list
  const activeList = watchlists.find(l => l.id === activeWatchlistId) || watchlists[0];
  const allSymbols = activeList ? activeList.sections.flatMap(s => s.symbols) : [];
  const watchlist: WatchlistItem[] = allSymbols.map(sym => {
    const price = watchlistPrices.get(sym);
    return price || { symbol: sym, lastPrice: 0, priceChange: 0, priceChangePercent: 0 };
  });

  const setWatchlist: React.Dispatch<React.SetStateAction<WatchlistItem[]>> = () => {};

  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<Set<string>>(new Set());
  const [indicators, setIndicators] = useState<string[]>([]);
  const [hiddenIndicators, setHiddenIndicators] = useState<Set<string>>(new Set());
  const [indicatorConfigs, setIndicatorConfigs] = useState<Map<string, IndicatorInstance>>(new Map());
  const [favoriteIntervals, setFavoriteIntervals] = useState<Interval[]>(() => {
    const saved = localStorage.getItem('favoriteIntervals');
    return saved ? JSON.parse(saved) : DEFAULT_FAVORITE_INTERVALS;
  });

  // Symbol setter that persists and resets drawing selection
  const setSymbol = useCallback((s: string) => {
    setSymbolRaw(s);
    localStorage.setItem('lastSymbol', s);
    setSelectedDrawingId(null);
    setSelectedDrawingIds(new Set());
  }, []);

  // Persistence state for auto-save
  const persistenceState = useMemo(() => ({
    drawings,
    indicators,
    indicatorConfigs,
    hiddenIndicators,
    chartType,
    interval,
  }), [drawings, indicators, indicatorConfigs, hiddenIndicators, chartType, interval]);

  // Load handler for restoring persisted state
  const handleLoadState = useCallback((loaded: PersistedChartState) => {
    setDrawings(loaded.drawings);
    setIndicators(loaded.indicators);
    setIndicatorConfigs(loaded.indicatorConfigs);
    setHiddenIndicators(loaded.hiddenIndicators);
    setChartType(loaded.chartType);
    setInterval(loaded.interval);
  }, []);

  // Auto-save and load per symbol
  useChartPersistence(userId, symbol, persistenceState, handleLoadState);

  const [replayState, setReplayState] = useState<ReplayState>('off');
  const [replayBarIndex, setReplayBarIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayStartIndex, setReplayStartIndex] = useState(0);
  const [chartSettings, setChartSettings] = useState<ChartSettings>(() => {
    const saved = localStorage.getItem('chartSettings');
    if (!saved) return DEFAULT_CHART_SETTINGS;
    try {
      return normalizeChartSettings(JSON.parse(saved));
    } catch {
      return DEFAULT_CHART_SETTINGS;
    }
  });

  const [gridLayout, setGridLayoutState] = useState<GridLayout>(ALL_GRID_LAYOUTS[0]);
  const [syncOptions, setSyncOptions] = useState<LayoutSyncOptions>(DEFAULT_SYNC_OPTIONS);
  const [panelSymbols, setPanelSymbolsState] = useState<string[]>(['BTCUSDT']);
  const [activePanelIndex, setActivePanelIndex] = useState<number | null>(null);
  const [panelIndicatorStates, setPanelIndicatorStates] = useState<Map<number, PanelIndicatorState>>(new Map());

  const setGridLayout = useCallback((layout: GridLayout) => {
    setGridLayoutState(layout);
    setActivePanelIndex(layout.count > 1 ? 0 : null);
    setPanelSymbolsState(prev => {
      if (prev.length >= layout.count) return prev;
      const next = [...prev];
      while (next.length < layout.count) next.push('BTCUSDT');
      return next;
    });
  }, []);

  const setPanelSymbol = useCallback((index: number, sym: string) => {
    setPanelSymbolsState(prev => {
      const next = [...prev];
      while (next.length <= index) next.push('BTCUSDT');
      next[index] = sym;
      return next;
    });
  }, []);

  const queueSymbolPrefetch = useCallback((sym: string) => {
    const normalized = sym.trim().toUpperCase();
    if (!normalized) return;
    void prefetchSymbolHistory(normalized);
  }, []);

  const addToWatchlist = useCallback((sym: string) => {
    setWatchlists(prev => prev.map(list => {
      if (list.id !== activeWatchlistId) return list;
      const sections = [...list.sections];
      if (sections.length === 0) {
        sections.push({ id: 'default', name: 'DEFAULT', collapsed: false, symbols: [sym] });
      } else {
        sections[sections.length - 1] = {
          ...sections[sections.length - 1],
          symbols: [...sections[sections.length - 1].symbols, sym],
        };
      }
      return { ...list, sections };
    }));
    queueSymbolPrefetch(sym);
  }, [activeWatchlistId, queueSymbolPrefetch]);

  const removeFromWatchlist = useCallback((sym: string) => {
    setWatchlists(prev => prev.map(list => {
      if (list.id !== activeWatchlistId) return list;
      return {
        ...list,
        sections: list.sections.map(s => ({
          ...s,
          symbols: s.symbols.filter(ss => ss !== sym),
        })),
      };
    }));
  }, [activeWatchlistId]);

  const addDrawing = useCallback((d: Drawing) => {
    setDrawings(prev => [...prev, d]);
  }, []);

  const updateDrawing = useCallback((id: string, d: Drawing) => {
    setDrawings(prev => prev.map(dd => dd.id === id ? d : dd));
  }, []);

  const removeDrawing = useCallback((id: string) => {
    setDrawings(prev => prev.filter(d => d.id !== id));
    setSelectedDrawingId(prev => prev === id ? null : prev);
    setSelectedDrawingIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleSelectedDrawing = useCallback((id: string) => {
    setSelectedDrawingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addIndicator = useCallback((definitionId: string) => {
    const def = getIndicator(definitionId);
    if (!def) return;
    const instanceId = `${definitionId}_${Date.now()}`;
    const instance = createInstance(def);
    setIndicators(prev => [...prev, instanceId]);
    setIndicatorConfigs(prev => {
      const next = new Map(prev);
      next.set(instanceId, instance);
      return next;
    });
  }, []);

  const removeIndicator = useCallback((instanceId: string) => {
    setIndicators(prev => prev.filter(i => i !== instanceId));
    setIndicatorConfigs(prev => { const next = new Map(prev); next.delete(instanceId); return next; });
    setHiddenIndicators(prev => { const next = new Set(prev); next.delete(instanceId); return next; });
  }, []);

  const toggleIndicator = useCallback((name: string) => {
    // Legacy compat - works as addIndicator for new system
    addIndicator(name);
  }, [addIndicator]);

  const updateIndicatorConfig = useCallback((name: string, config: IndicatorInstance) => {
    setIndicatorConfigs(prev => {
      const next = new Map(prev);
      next.set(name, config);
      return next;
    });
  }, []);

  const toggleHiddenIndicator = useCallback((name: string) => {
    setHiddenIndicators(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleFavoriteInterval = useCallback((iv: Interval) => {
    setFavoriteIntervals(prev => {
      const next = prev.includes(iv) ? prev.filter(i => i !== iv) : [...prev, iv];
      localStorage.setItem('favoriteIntervals', JSON.stringify(next));
      return next;
    });
  }, []);

  // Per-panel indicator functions
  const getOrCreatePanelState = useCallback((pi: number): PanelIndicatorState => {
    return panelIndicatorStates.get(pi) || { indicators: [], indicatorConfigs: new Map(), hiddenIndicators: new Set() };
  }, [panelIndicatorStates]);

  const addPanelIndicator = useCallback((pi: number, definitionId: string) => {
    const def = getIndicator(definitionId);
    if (!def) return;
    const instanceId = `${definitionId}_${Date.now()}`;
    const instance = createInstance(def);
    setPanelIndicatorStates(prev => {
      const next = new Map(prev);
      const state = next.get(pi) || { indicators: [], indicatorConfigs: new Map(), hiddenIndicators: new Set() };
      next.set(pi, {
        ...state,
        indicators: [...state.indicators, instanceId],
        indicatorConfigs: new Map(state.indicatorConfigs).set(instanceId, instance),
      });
      return next;
    });
  }, []);

  const removePanelIndicator = useCallback((pi: number, instanceId: string) => {
    setPanelIndicatorStates(prev => {
      const next = new Map(prev);
      const state = next.get(pi);
      if (!state) return prev;
      const configs = new Map(state.indicatorConfigs);
      configs.delete(instanceId);
      const hidden = new Set(state.hiddenIndicators);
      hidden.delete(instanceId);
      next.set(pi, {
        indicators: state.indicators.filter(i => i !== instanceId),
        indicatorConfigs: configs,
        hiddenIndicators: hidden,
      });
      return next;
    });
  }, []);

  const togglePanelHiddenIndicator = useCallback((pi: number, instanceId: string) => {
    setPanelIndicatorStates(prev => {
      const next = new Map(prev);
      const state = next.get(pi);
      if (!state) return prev;
      const hidden = new Set(state.hiddenIndicators);
      if (hidden.has(instanceId)) hidden.delete(instanceId);
      else hidden.add(instanceId);
      next.set(pi, { ...state, hiddenIndicators: hidden });
      return next;
    });
  }, []);

  const updatePanelIndicatorConfig = useCallback((pi: number, instanceId: string, config: IndicatorInstance) => {
    setPanelIndicatorStates(prev => {
      const next = new Map(prev);
      const state = next.get(pi);
      if (!state) return prev;
      const configs = new Map(state.indicatorConfigs);
      configs.set(instanceId, config);
      next.set(pi, { ...state, indicatorConfigs: configs });
      return next;
    });
  }, []);

  return (
    <ChartContext.Provider value={{
      symbol, setSymbol,
      interval, setInterval,
      chartType, setChartType,
      drawingTool, setDrawingTool,
      watchlists, setWatchlists,
      activeWatchlistId, setActiveWatchlistId,
      watchlistPrices, setWatchlistPrices,
      watchlist, setWatchlist,
      addToWatchlist, removeFromWatchlist,
      drawings, addDrawing, updateDrawing, removeDrawing,
      selectedDrawingId, setSelectedDrawingId,
      selectedDrawingIds, setSelectedDrawingIds, toggleSelectedDrawing,
      indicators, addIndicator, removeIndicator, toggleIndicator,
      hiddenIndicators, toggleHiddenIndicator,
      indicatorConfigs, updateIndicatorConfig,
      favoriteIntervals, toggleFavoriteInterval,
      replayState, setReplayState,
      replayBarIndex, setReplayBarIndex,
      replaySpeed, setReplaySpeed,
      replayStartIndex, setReplayStartIndex,
      chartSettings, setChartSettings,
      gridLayout, setGridLayout,
      syncOptions, setSyncOptions,
      panelSymbols, setPanelSymbol,
      activePanelIndex, setActivePanelIndex,
      panelIndicatorStates,
      addPanelIndicator,
      removePanelIndicator,
      togglePanelHiddenIndicator,
      updatePanelIndicatorConfig,
    }}>
      {children}
    </ChartContext.Provider>
  );
};
