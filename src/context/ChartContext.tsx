import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Interval, DrawingTool, ChartType, WatchlistItem, WatchlistList, Drawing } from '@/types/chart';
import { DEFAULT_FAVORITE_INTERVALS } from '@/types/chart';
import type { ChartSettings } from '@/types/chartSettings';
import { DEFAULT_CHART_SETTINGS, normalizeChartSettings } from '@/types/chartSettings';
import type { GridLayout, LayoutSyncOptions } from '@/types/layout';
import { ALL_GRID_LAYOUTS, DEFAULT_SYNC_OPTIONS } from '@/types/layout';

export type ReplayState = 'off' | 'selecting' | 'ready' | 'playing' | 'paused';

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
  indicators: string[];
  toggleIndicator: (name: string) => void;
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
}

const ChartContext = createContext<ChartContextType | null>(null);

export const useChart = () => {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used within ChartProvider');
  return ctx;
};

export const ChartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [symbol, setSymbol] = useState('BTCUSDT');
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
  const [indicators, setIndicators] = useState<string[]>([]);
  const [favoriteIntervals, setFavoriteIntervals] = useState<Interval[]>(() => {
    const saved = localStorage.getItem('favoriteIntervals');
    return saved ? JSON.parse(saved) : DEFAULT_FAVORITE_INTERVALS;
  });

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

  const setGridLayout = useCallback((layout: GridLayout) => {
    setGridLayoutState(layout);
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

  const addToWatchlist = useCallback((sym: string) => {
    setWatchlists(prev => prev.map(list => {
      if (list.id !== activeWatchlistId) return list;
      const allSyms = list.sections.flatMap(s => s.symbols);
      if (allSyms.includes(sym)) return list;
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
  }, [activeWatchlistId]);

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
  }, []);

  const toggleIndicator = useCallback((name: string) => {
    setIndicators(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  }, []);

  const toggleFavoriteInterval = useCallback((iv: Interval) => {
    setFavoriteIntervals(prev => {
      const next = prev.includes(iv) ? prev.filter(i => i !== iv) : [...prev, iv];
      localStorage.setItem('favoriteIntervals', JSON.stringify(next));
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
      indicators, toggleIndicator,
      favoriteIntervals, toggleFavoriteInterval,
      replayState, setReplayState,
      replayBarIndex, setReplayBarIndex,
      replaySpeed, setReplaySpeed,
      replayStartIndex, setReplayStartIndex,
      chartSettings, setChartSettings,
      gridLayout, setGridLayout,
      syncOptions, setSyncOptions,
      panelSymbols, setPanelSymbol,
    }}>
      {children}
    </ChartContext.Provider>
  );
};
