import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Drawing, ChartType, Interval } from '@/types/chart';
import type { IndicatorInstance } from '@/types/indicators';

interface ChartState {
  drawings: Drawing[];
  indicators: string[];
  indicatorConfigs: Map<string, IndicatorInstance>;
  hiddenIndicators: Set<string>;
  chartType: ChartType;
  interval: Interval;
}

interface SavePayload {
  user_id: string;
  symbol: string;
  drawings: any;
  indicators: any;
  indicator_configs: any;
  hidden_indicators: any;
  chart_type: string;
  interval: string;
  updated_at: string;
}

function serializeState(userId: string, symbol: string, state: ChartState): SavePayload {
  return {
    user_id: userId,
    symbol,
    drawings: JSON.parse(JSON.stringify(state.drawings)),
    indicators: state.indicators,
    indicator_configs: Object.fromEntries(state.indicatorConfigs),
    hidden_indicators: Array.from(state.hiddenIndicators),
    chart_type: state.chartType,
    interval: state.interval,
    updated_at: new Date().toISOString(),
  };
}

export interface PersistedChartState {
  drawings: Drawing[];
  indicators: string[];
  indicatorConfigs: Map<string, IndicatorInstance>;
  hiddenIndicators: Set<string>;
  chartType: ChartType;
  interval: Interval;
}

function deserializeState(row: any): PersistedChartState {
  const configs = new Map<string, IndicatorInstance>();
  if (row.indicator_configs && typeof row.indicator_configs === 'object') {
    for (const [k, v] of Object.entries(row.indicator_configs)) {
      configs.set(k, v as IndicatorInstance);
    }
  }

  return {
    drawings: Array.isArray(row.drawings) ? row.drawings : [],
    indicators: Array.isArray(row.indicators) ? row.indicators : [],
    indicatorConfigs: configs,
    hiddenIndicators: new Set(Array.isArray(row.hidden_indicators) ? row.hidden_indicators : []),
    chartType: (row.chart_type || 'candles') as ChartType,
    interval: (row.interval || '1d') as Interval,
  };
}

export function useChartPersistence(
  userId: string | null,
  symbol: string,
  state: ChartState,
  onLoad: (state: PersistedChartState) => void,
) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const loadedSymbolRef = useRef<string>('');
  const isLoadingRef = useRef(false);
  const currentSymbolRef = useRef(symbol);

  // Keep currentSymbolRef in sync
  currentSymbolRef.current = symbol;

  // Load state when symbol or user changes
  useEffect(() => {
    if (!userId) return;
    if (loadedSymbolRef.current === symbol) return;

    isLoadingRef.current = true;
    loadedSymbolRef.current = symbol;

    // Cancel any pending save from the previous symbol
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const loadSymbol = symbol; // capture for closure

    supabase
      .from('user_chart_state')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', loadSymbol)
      .maybeSingle()
      .then(({ data, error }) => {
        // If user switched symbol again while we were loading, discard
        if (currentSymbolRef.current !== loadSymbol) return;

        isLoadingRef.current = false;
        if (error) {
          console.error('Failed to load chart state:', error);
          onLoad({ drawings: [], indicators: [], indicatorConfigs: new Map(), hiddenIndicators: new Set(), chartType: 'candles', interval: '1d' });
          return;
        }
        if (data) {
          const deserialized = deserializeState(data);
          lastSavedRef.current = JSON.stringify(serializeState(userId, loadSymbol, {
            ...deserialized,
            indicatorConfigs: deserialized.indicatorConfigs,
            hiddenIndicators: deserialized.hiddenIndicators,
          }));
          onLoad(deserialized);
        } else {
          onLoad({ drawings: [], indicators: [], indicatorConfigs: new Map(), hiddenIndicators: new Set(), chartType: 'candles', interval: '1d' });
        }
      });
  }, [userId, symbol]); // intentionally excluding onLoad to avoid re-triggers

  // Debounced auto-save
  const save = useCallback(() => {
    if (!userId || isLoadingRef.current) return;

    const payload = serializeState(userId, symbol, state);
    const serialized = JSON.stringify(payload);

    // Skip if nothing changed
    if (serialized === lastSavedRef.current) return;
    lastSavedRef.current = serialized;

    supabase
      .from('user_chart_state')
      .upsert(payload, { onConflict: 'user_id,symbol' })
      .then(({ error }) => {
        if (error) console.error('Failed to save chart state:', error);
      });
  }, [userId, symbol, state]);

  useEffect(() => {
    if (!userId) return;
    if (isLoadingRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [save, userId]);

  // Save immediately on unmount / page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!userId) return;
      // Synchronous save attempt on page close
      save();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userId, symbol, state, save]);
}
