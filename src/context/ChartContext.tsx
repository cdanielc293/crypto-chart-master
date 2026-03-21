import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Interval, DrawingTool, ChartType, WatchlistItem, Drawing } from '@/types/chart';
import { DEFAULT_FAVORITE_INTERVALS } from '@/types/chart';

export type ReplayState = 'off' | 'selecting' | 'ready' | 'playing' | 'paused';

interface ChartContextType {
  symbol: string;
  setSymbol: (s: string) => void;
  interval: Interval;
  setInterval: (i: Interval) => void;
  chartType: ChartType;
  setChartType: (t: ChartType) => void;
  drawingTool: DrawingTool;
  setDrawingTool: (t: DrawingTool) => void;
  watchlist: WatchlistItem[];
  setWatchlist: React.Dispatch<React.SetStateAction<WatchlistItem[]>>;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
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
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([
    { symbol: 'BTCUSDT', lastPrice: 0, priceChange: 0, priceChangePercent: 0 },
    { symbol: 'ETHUSDT', lastPrice: 0, priceChange: 0, priceChangePercent: 0 },
  ]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<string[]>([]);

  // Replay state
  const [replayState, setReplayState] = useState<ReplayState>('off');
  const [replayBarIndex, setReplayBarIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayStartIndex, setReplayStartIndex] = useState(0);

  const addToWatchlist = useCallback((sym: string) => {
    setWatchlist(prev => {
      if (prev.find(w => w.symbol === sym)) return prev;
      return [...prev, { symbol: sym, lastPrice: 0, priceChange: 0, priceChangePercent: 0 }];
    });
  }, []);

  const removeFromWatchlist = useCallback((sym: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== sym));
  }, []);

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

  return (
    <ChartContext.Provider value={{
      symbol, setSymbol,
      interval, setInterval,
      chartType, setChartType,
      drawingTool, setDrawingTool,
      watchlist, setWatchlist,
      addToWatchlist, removeFromWatchlist,
      drawings, addDrawing, updateDrawing, removeDrawing,
      selectedDrawingId, setSelectedDrawingId,
      indicators, toggleIndicator,
      replayState, setReplayState,
      replayBarIndex, setReplayBarIndex,
      replaySpeed, setReplaySpeed,
      replayStartIndex, setReplayStartIndex,
    }}>
      {children}
    </ChartContext.Provider>
  );
};