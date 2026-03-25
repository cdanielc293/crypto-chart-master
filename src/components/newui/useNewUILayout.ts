// New UI layout persistence — localStorage cache + Supabase DB sync

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import type { WidgetInstance, WidgetPosition } from './types';
import { WIDGET_REGISTRY } from './types';

const STORAGE_KEY = 'newui_widgets';
const FAVORITES_KEY = 'newui_favorites';
const SAVE_DEBOUNCE_MS = 1500;

function migratePosition(position: any, index: number): WidgetPosition {
  if (
    position &&
    typeof position === 'object' &&
    typeof position.x === 'number' &&
    typeof position.y === 'number' &&
    typeof position.width === 'number' &&
    typeof position.height === 'number'
  ) {
    return {
      x: position.x,
      y: position.y,
      width: Math.max(280, position.width),
      height: Math.max(180, position.height),
    };
  }

  const col = Number(position?.col ?? 0);
  const row = Number(position?.row ?? 0);
  const colSpan = Number(position?.colSpan ?? 1);
  const rowSpan = Number(position?.rowSpan ?? 1);

  return {
    x: 20 + Math.max(0, col) * 320 + (index % 3) * 12,
    y: 20 + Math.max(0, row) * 220 + (index % 2) * 12,
    width: Math.max(320, Math.max(1, colSpan) * 340),
    height: Math.max(220, Math.max(1, rowSpan) * 210),
  };
}

function parseWidgets(raw: any): WidgetInstance[] {
  try {
    const parsed = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index): WidgetInstance | null => {
        if (!item || typeof item !== 'object') return null;
        if (typeof item.type !== 'string') return null;
        return {
          id: typeof item.id === 'string' ? item.id : `${item.type}-${Date.now()}-${index}`,
          type: item.type,
          position: migratePosition(item.position, index),
          locked: Boolean(item.locked),
          config: item.config && typeof item.config === 'object' ? item.config : undefined,
        };
      })
      .filter((item): item is WidgetInstance => Boolean(item));
  } catch {
    return [];
  }
}

function loadLocal(): WidgetInstance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseWidgets(raw) : [];
  } catch {
    return [];
  }
}

function loadLocalFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(widgets: WidgetInstance[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets)); } catch {}
}

function saveLocalFavorites(favs: string[]) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs)); } catch {}
}

function clampPosition(position: WidgetPosition): WidgetPosition {
  return {
    x: Math.max(0, Math.round(position.x)),
    y: Math.max(0, Math.round(position.y)),
    width: Math.max(280, Math.round(position.width)),
    height: Math.max(180, Math.round(position.height)),
  };
}

export function useNewUILayout() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [widgets, setWidgets] = useState<WidgetInstance[]>(loadLocal);
  const [favorites, setFavoritesState] = useState<string[]>(loadLocalFavorites);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const dbLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  // ---- DB load on mount / user change ----
  useEffect(() => {
    if (!userId) {
      dbLoadedRef.current = false;
      return;
    }
    if (dbLoadedRef.current) return;

    isLoadingRef.current = true;
    supabase
      .from('user_widget_layouts')
      .select('widgets, favorites')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        isLoadingRef.current = false;
        dbLoadedRef.current = true;
        if (error) {
          console.error('Failed to load widget layout:', error);
          return;
        }
        if (data) {
          const dbWidgets = parseWidgets(data.widgets);
          const dbFavs = Array.isArray(data.favorites) ? data.favorites as string[] : [];
          setWidgets(dbWidgets);
          setFavoritesState(dbFavs);
          saveLocal(dbWidgets);
          saveLocalFavorites(dbFavs);
          lastSavedRef.current = JSON.stringify({ widgets: dbWidgets, favorites: dbFavs });
        }
        // If no DB row yet, keep localStorage state (first time)
      });
  }, [userId]);

  // ---- Debounced DB save ----
  const saveToDb = useCallback((w: WidgetInstance[], f: string[]) => {
    if (!userId || isLoadingRef.current) return;

    const payload = JSON.stringify({ widgets: w, favorites: f });
    if (payload === lastSavedRef.current) return;
    lastSavedRef.current = payload;

    supabase
      .from('user_widget_layouts')
      .upsert(
        {
          user_id: userId,
          widgets: JSON.parse(JSON.stringify(w)),
          favorites: f,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .then(({ error }) => {
        if (error) console.error('Failed to save widget layout:', error);
      });
  }, [userId]);

  const scheduleSave = useCallback((w: WidgetInstance[], f: string[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveToDb(w, f), SAVE_DEBOUNCE_MS);
  }, [saveToDb]);

  // ---- Persist helper: localStorage immediately, DB debounced ----
  const persist = useCallback((next: WidgetInstance[], nextFavs?: string[]) => {
    setWidgets(next);
    saveLocal(next);
    const favs = nextFavs ?? favorites;
    scheduleSave(next, favs);
  }, [favorites, scheduleSave]);

  // ---- Save on page close ----
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!userId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      const payload = {
        user_id: userId,
        widgets: JSON.parse(JSON.stringify(widgets)),
        favorites,
        updated_at: new Date().toISOString(),
      };
      const serialized = JSON.stringify({ widgets, favorites });
      if (serialized === lastSavedRef.current) return;

      const url = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://api.vizionx.pro'}/rest/v1/user_widget_layouts?on_conflict=user_id`;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

      // Use sendBeacon for reliability on page close
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      // sendBeacon can't set custom headers easily, so use keepalive fetch
      try {
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${(supabase as any).auth?.currentSession?.access_token || ''}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [userId, widgets, favorites]);

  // ---- Actions ----
  const addWidget = useCallback((type: string) => {
    const def = WIDGET_REGISTRY.find(w => w.type === type);
    if (!def) return;
    const size = {
      width: Math.max(360, def.defaultSize.colSpan * 340),
      height: Math.max(240, def.defaultSize.rowSpan * 220),
    };
    const instance: WidgetInstance = {
      id: `${type}-${Date.now()}`,
      type,
      position: findOpenPosition(widgets, size),
      locked: false,
    };
    persist([...widgets, instance]);
  }, [widgets, persist]);

  const removeWidget = useCallback((id: string) => {
    persist(widgets.filter(w => w.id !== id));
  }, [widgets, persist]);

  const updateWidgetPosition = useCallback((id: string, position: Partial<WidgetPosition>) => {
    persist(
      widgets.map(w =>
        w.id === id
          ? { ...w, position: clampPosition({ ...w.position, ...position }) }
          : w,
      ),
    );
  }, [widgets, persist]);

  const toggleWidgetLock = useCallback((id: string) => {
    persist(widgets.map(w => (w.id === id ? { ...w, locked: !w.locked } : w)));
  }, [widgets, persist]);

  const focusWidget = useCallback((id: string) => {
    const idx = widgets.findIndex(w => w.id === id);
    if (idx === -1 || idx === widgets.length - 1) return;
    const next = [...widgets];
    const [picked] = next.splice(idx, 1);
    next.push(picked);
    persist(next);
  }, [widgets, persist]);

  const bringToFront = useCallback((id: string) => {
    const idx = widgets.findIndex(w => w.id === id);
    if (idx === -1 || idx === widgets.length - 1) return;
    const next = [...widgets];
    const [picked] = next.splice(idx, 1);
    next.push(picked);
    persist(next);
  }, [widgets, persist]);

  const sendToBack = useCallback((id: string) => {
    const idx = widgets.findIndex(w => w.id === id);
    if (idx <= 0) return;
    const next = [...widgets];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    persist(next);
  }, [widgets, persist]);

  const toggleFavorite = useCallback((type: string) => {
    const next = favorites.includes(type) ? favorites.filter(f => f !== type) : [...favorites, type];
    setFavoritesState(next);
    saveLocalFavorites(next);
    scheduleSave(widgets, next);
  }, [favorites, widgets, scheduleSave]);

  return {
    widgets,
    addWidget,
    removeWidget,
    updateWidgetPosition,
    toggleWidgetLock,
    focusWidget,
    bringToFront,
    sendToBack,
    favorites,
    toggleFavorite,
  };
}

function findOpenPosition(
  existing: WidgetInstance[],
  size: { width: number; height: number },
): WidgetPosition {
  const index = existing.length;
  return {
    x: 24 + (index % 4) * 36,
    y: 24 + (index % 5) * 36,
    width: size.width,
    height: size.height,
  };
}
