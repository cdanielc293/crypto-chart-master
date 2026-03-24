// New UI layout persistence — localStorage only, fully isolated from Classic

import { useState, useCallback } from 'react';
import type { WidgetInstance, WidgetPosition } from './types';
import { WIDGET_REGISTRY } from './types';

const STORAGE_KEY = 'newui_widgets';
const FAVORITES_KEY = 'newui_favorites';

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

  // Legacy grid migration: { col, row, colSpan, rowSpan }
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

function load(): WidgetInstance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
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

function save(widgets: WidgetInstance[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch {
    // ignore storage write errors
  }
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

  const toggleFavorite = useCallback((type: string) => {
    const next = favorites.includes(type) ? favorites.filter(f => f !== type) : [...favorites, type];
    setFavoritesState(next);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // ignore storage write errors
    }
  }, [favorites]);

  return {
    widgets,
    addWidget,
    removeWidget,
    updateWidgetPosition,
    toggleWidgetLock,
    focusWidget,
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
