// New UI layout persistence — localStorage only, fully isolated from Classic

import { useState, useCallback } from 'react';
import type { WidgetInstance, WidgetPosition } from './types';
import { WIDGET_REGISTRY } from './types';

const STORAGE_KEY = 'newui_widgets';
const FAVORITES_KEY = 'newui_favorites';

function load(): WidgetInstance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(widgets: WidgetInstance[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch {}
}

export function useNewUILayout() {
  const [widgets, setWidgets] = useState<WidgetInstance[]>(load);
  const [favorites, setFavoritesState] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback((next: WidgetInstance[]) => {
    setWidgets(next);
    save(next);
  }, []);

  const addWidget = useCallback((type: string, position?: WidgetPosition) => {
    const def = WIDGET_REGISTRY.find(w => w.type === type);
    if (!def) return;

    const pos = position ?? findOpenPosition(widgets, def.defaultSize);
    const instance: WidgetInstance = {
      id: `${type}-${Date.now()}`,
      type,
      position: { ...pos, colSpan: def.defaultSize.colSpan, rowSpan: def.defaultSize.rowSpan },
    };
    persist([...widgets, instance]);
  }, [widgets, persist]);

  const removeWidget = useCallback((id: string) => {
    persist(widgets.filter(w => w.id !== id));
  }, [widgets, persist]);

  const updateWidgetPosition = useCallback((id: string, position: Partial<WidgetPosition>) => {
    persist(widgets.map(w => w.id === id ? { ...w, position: { ...w.position, ...position } } : w));
  }, [widgets, persist]);

  const toggleFavorite = useCallback((type: string) => {
    const next = favorites.includes(type) ? favorites.filter(f => f !== type) : [...favorites, type];
    setFavoritesState(next);
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch {}
  }, [favorites]);

  return { widgets, addWidget, removeWidget, updateWidgetPosition, favorites, toggleFavorite };
}

function findOpenPosition(existing: WidgetInstance[], size: { colSpan: number; rowSpan: number }): WidgetPosition {
  // Simple: place at next available row
  const maxRow = existing.reduce((max, w) => Math.max(max, w.position.row + w.position.rowSpan), 0);
  return { col: 0, row: maxRow, colSpan: size.colSpan, rowSpan: size.rowSpan };
}
