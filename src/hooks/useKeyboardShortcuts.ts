import { useEffect, useCallback } from 'react';
import { useChart } from '@/context/ChartContext';
import type { DrawingTool } from '@/types/chart';

export function useKeyboardShortcuts() {
  const ctx = useChart();
  const {
    setDrawingTool, drawings, removeDrawing,
    setSymbol, setInterval, chartSettings, setChartSettings,
    replayState, setReplayState, replayBarIndex, setReplayBarIndex,
  } = ctx;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input/textarea
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if ((e.target as HTMLElement)?.isContentEditable) return;

    const ctrl = e.ctrlKey || e.metaKey;
    const alt = e.altKey;
    const shift = e.shiftKey;
    const key = e.key;

    // ─── Chart Navigation ───

    // Ctrl+K → Quick search (symbol search)
    if (ctrl && key.toLowerCase() === 'k') {
      e.preventDefault();
      // Dispatch custom event for symbol search
      window.dispatchEvent(new CustomEvent('shortcut:symbol-search'));
      return;
    }

    // / → Open indicators dialog
    if (!ctrl && !alt && !shift && key === '/') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:open-indicators'));
      return;
    }

    // Alt+R → Reset chart view
    if (alt && key.toLowerCase() === 'r') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:reset-chart'));
      return;
    }

    // Ctrl+S → Save chart layout
    if (ctrl && !alt && !shift && key.toLowerCase() === 's') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:save-layout'));
      return;
    }

    // Arrow left/right → Move chart 1 bar
    if (!ctrl && !alt && !shift && key === 'ArrowLeft') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'left' } }));
      return;
    }
    if (!ctrl && !alt && !shift && key === 'ArrowRight') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'right' } }));
      return;
    }

    // Ctrl+Arrow → Move further
    if (ctrl && !alt && !shift && key === 'ArrowLeft') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'far-left' } }));
      return;
    }
    if (ctrl && !alt && !shift && key === 'ArrowRight') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'far-right' } }));
      return;
    }

    // Ctrl+Up/Down → Zoom in/out
    if (ctrl && !alt && key === 'ArrowUp') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:zoom', { detail: { direction: 'in' } }));
      return;
    }
    if (ctrl && !alt && key === 'ArrowDown') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:zoom', { detail: { direction: 'out' } }));
      return;
    }

    // Alt+Shift+Left → Move to first bar
    if (alt && shift && key === 'ArrowLeft') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'start' } }));
      return;
    }
    // Alt+Shift+Right → Move to last bar
    if (alt && shift && key === 'ArrowRight') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'end' } }));
      return;
    }

    // Shift+F → Fullscreen mode
    if (shift && !ctrl && !alt && key.toLowerCase() === 'f') {
      e.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
      return;
    }

    // ─── Scale shortcuts ───

    // Alt+I → Invert series scale
    if (alt && !ctrl && key.toLowerCase() === 'i') {
      e.preventDefault();
      setChartSettings(prev => ({
        ...prev,
        priceScale: { ...prev.priceScale, invertScale: !prev.priceScale.invertScale },
      }));
      return;
    }

    // Alt+L → Toggle logarithmic scale
    if (alt && !ctrl && key.toLowerCase() === 'l') {
      e.preventDefault();
      setChartSettings(prev => ({
        ...prev,
        priceScale: {
          ...prev.priceScale,
          mode: prev.priceScale.mode === 'logarithmic' ? 'regular' : 'logarithmic',
        },
      }));
      return;
    }

    // Alt+P → Toggle percent scale
    if (alt && !ctrl && key.toLowerCase() === 'p') {
      e.preventDefault();
      setChartSettings(prev => ({
        ...prev,
        priceScale: {
          ...prev.priceScale,
          mode: prev.priceScale.mode === 'percent' ? 'regular' : 'percent',
        },
      }));
      return;
    }

    // ─── Drawing shortcuts ───

    // Alt+T → Trendline
    if (alt && !ctrl && key.toLowerCase() === 't') {
      e.preventDefault();
      setDrawingTool('trendline');
      return;
    }

    // Alt+H → Horizontal line
    if (alt && !ctrl && key.toLowerCase() === 'h') {
      e.preventDefault();
      setDrawingTool('horizontalline');
      return;
    }

    // Alt+J → Horizontal ray
    if (alt && !ctrl && key.toLowerCase() === 'j') {
      e.preventDefault();
      setDrawingTool('horizontalray');
      return;
    }

    // Alt+V → Vertical line (already in DrawingCanvas, but keep here too)
    if (alt && !ctrl && key.toLowerCase() === 'v') {
      e.preventDefault();
      setDrawingTool('verticalline');
      return;
    }

    // Alt+C → Cross line
    if (alt && !ctrl && key.toLowerCase() === 'c') {
      e.preventDefault();
      setDrawingTool('crossline');
      return;
    }

    // Alt+F → Fibonacci retracement
    if (alt && !ctrl && key.toLowerCase() === 'f') {
      e.preventDefault();
      setDrawingTool('fibonacci');
      return;
    }

    // Shift+Alt+R → Rectangle
    if (shift && alt && !ctrl && key.toLowerCase() === 'r') {
      e.preventDefault();
      setDrawingTool('rectangle');
      return;
    }

    // Ctrl+Alt+H → Hide all drawings
    if (ctrl && alt && key.toLowerCase() === 'h') {
      e.preventDefault();
      drawings.forEach(d => {
        ctx.updateDrawing(d.id, { ...d, visible: !d.visible });
      });
      return;
    }

    // ─── Interval shortcuts (number keys) ───
    if (!ctrl && !alt && !shift) {
      const intervalMap: Record<string, string> = {
        '1': '1m', '2': '2m', '3': '3m', '5': '5m',
      };
      if (intervalMap[key]) {
        e.preventDefault();
        setInterval(intervalMap[key] as any);
        return;
      }
    }

    // , (comma) → Open interval selector
    if (!ctrl && !alt && !shift && key === ',') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:open-intervals'));
      return;
    }

    // Alt+A → Add alert
    if (alt && !ctrl && key.toLowerCase() === 'a') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:add-alert'));
      return;
    }

    // Alt+G → Go to date
    if (alt && !ctrl && key.toLowerCase() === 'g') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:go-to-date'));
      return;
    }

    // ? → Open keyboard shortcuts dialog
    if (!ctrl && !alt && key === '?') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:show-shortcuts'));
      return;
    }

    // Any letter key → Open symbol search (like TradingView)
    if (!ctrl && !alt && !shift && key.length === 1 && /^[a-zA-Z]$/.test(key)) {
      window.dispatchEvent(new CustomEvent('shortcut:symbol-search', { detail: { initialChar: key } }));
      return;
    }
  }, [drawings, setDrawingTool, setInterval, setChartSettings, ctx]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Shortcut definitions for the dialog
export interface ShortcutDef {
  label: string;
  keys: string[];
  icon?: string;
}

export interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutDef[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Chart',
    shortcuts: [
      { label: 'Quick search', keys: ['Ctrl', 'K'] },
      { label: 'Open indicators', keys: ['/'] },
      { label: 'Change symbol', keys: ['Any letter key'] },
      { label: 'Change interval', keys: ['Any number key'] },
      { label: 'Open interval selector', keys: [','] },
      { label: 'Save Chart Layout', keys: ['Ctrl', 'S'] },
      { label: 'Move chart 1 bar to the left', keys: ['←'] },
      { label: 'Move chart 1 bar to the right', keys: ['→'] },
      { label: 'Zoom in', keys: ['Ctrl', '↑'] },
      { label: 'Zoom out', keys: ['Ctrl', '↓'] },
      { label: 'Move further to the left', keys: ['Ctrl', '←'] },
      { label: 'Move further to the right', keys: ['Ctrl', '→'] },
      { label: 'Move chart to the first bar', keys: ['Alt', 'Shift', '←'] },
      { label: 'Move chart to the last bar', keys: ['Alt', 'Shift', '→'] },
      { label: 'Replay play/pause', keys: ['Shift', '↓'] },
      { label: 'Replay step forward', keys: ['Shift', '→'] },
      { label: 'Reset chart view', keys: ['Alt', 'R'] },
      { label: 'Invert series scale', keys: ['Alt', 'I'] },
      { label: 'Enable/disable logarithmic scale', keys: ['Alt', 'L'] },
      { label: 'Enable/disable percent scale', keys: ['Alt', 'P'] },
      { label: 'Add alert', keys: ['Alt', 'A'] },
      { label: 'Go to date', keys: ['Alt', 'G'] },
      { label: 'Fullscreen mode', keys: ['Shift', 'F'] },
    ],
  },
  {
    title: 'Indicators and drawings',
    shortcuts: [
      { label: 'Copy selected object', keys: ['Ctrl', 'C'] },
      { label: 'Paste object', keys: ['Ctrl', 'V'] },
      { label: 'Remove object', keys: ['Delete'] },
      { label: 'Hide all drawings', keys: ['Ctrl', 'Alt', 'H'] },
      { label: 'Drawings multiselect', keys: ['Ctrl', 'Click'] },
      { label: 'Move selected drawing left', keys: ['←'] },
      { label: 'Move selected drawing right', keys: ['→'] },
      { label: 'Move selected drawing up', keys: ['↑'] },
      { label: 'Move selected drawing down', keys: ['↓'] },
      { label: 'Trendline', keys: ['Alt', 'T'] },
      { label: 'Horizontal line', keys: ['Alt', 'H'] },
      { label: 'Horizontal ray', keys: ['Alt', 'J'] },
      { label: 'Vertical line', keys: ['Alt', 'V'] },
      { label: 'Cross line', keys: ['Alt', 'C'] },
      { label: 'Fib retracement', keys: ['Alt', 'F'] },
      { label: 'Rectangle', keys: ['Shift', 'Alt', 'R'] },
    ],
  },
];
