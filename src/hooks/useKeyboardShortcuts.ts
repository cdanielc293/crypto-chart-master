import { useEffect, useCallback } from 'react';
import { useChart } from '@/context/ChartContext';

export function useKeyboardShortcuts() {
  const ctx = useChart();
  const { setDrawingTool, drawings, setInterval, setChartSettings } = ctx;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input/textarea
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (target?.isContentEditable) return;

    const ctrl = e.ctrlKey || e.metaKey;
    const alt = e.altKey;
    const shift = e.shiftKey;
    const key = e.key;
    const code = e.code;

    const consume = () => {
      e.preventDefault();
      e.stopPropagation();
    };

    // ─── Chart Navigation ───

    // Ctrl+K → Quick search (symbol search)
    if (ctrl && code === 'KeyK' && !alt && !shift) {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:symbol-search'));
      return;
    }

    // / → Open indicators dialog
    if (!ctrl && !alt && !shift && code === 'Slash') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:open-indicators'));
      return;
    }

    // Alt+R → Reset chart view
    if (alt && !ctrl && code === 'KeyR') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:reset-chart'));
      return;
    }

    // Ctrl+S → Save chart layout
    if (ctrl && !alt && !shift && code === 'KeyS') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:save-layout'));
      return;
    }

    // Arrow left/right → Move chart 1 bar
    if (!ctrl && !alt && !shift && code === 'ArrowLeft') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'left' } }));
      return;
    }
    if (!ctrl && !alt && !shift && code === 'ArrowRight') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'right' } }));
      return;
    }

    // Ctrl+Arrow → Move further
    if (ctrl && !alt && !shift && code === 'ArrowLeft') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'far-left' } }));
      return;
    }
    if (ctrl && !alt && !shift && code === 'ArrowRight') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'far-right' } }));
      return;
    }

    // Ctrl+Up/Down → Zoom in/out
    if (ctrl && !alt && code === 'ArrowUp') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:zoom', { detail: { direction: 'in' } }));
      return;
    }
    if (ctrl && !alt && code === 'ArrowDown') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:zoom', { detail: { direction: 'out' } }));
      return;
    }

    // Alt+Shift+Left → Move to first bar
    if (alt && shift && code === 'ArrowLeft') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'start' } }));
      return;
    }
    // Alt+Shift+Right → Move to last bar
    if (alt && shift && code === 'ArrowRight') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:move-chart', { detail: { direction: 'end' } }));
      return;
    }

    // Shift+F → Fullscreen mode
    if (shift && !ctrl && !alt && code === 'KeyF') {
      consume();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
      return;
    }

    // ─── Scale shortcuts ───

    // Alt+I → Invert series scale
    if (alt && !ctrl && code === 'KeyI') {
      consume();
      setChartSettings(prev => ({
        ...prev,
        priceScale: { ...prev.priceScale, invertScale: !prev.priceScale.invertScale },
      }));
      return;
    }

    // Alt+L → Toggle logarithmic scale
    if (alt && !ctrl && code === 'KeyL') {
      consume();
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
    if (alt && !ctrl && code === 'KeyP') {
      consume();
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
    if (alt && !ctrl && code === 'KeyT') {
      consume();
      setDrawingTool('trendline');
      return;
    }

    // Alt+H → Horizontal line
    if (alt && !ctrl && code === 'KeyH') {
      consume();
      setDrawingTool('horizontalline');
      return;
    }

    // Alt+J → Horizontal ray
    if (alt && !ctrl && code === 'KeyJ') {
      consume();
      setDrawingTool('horizontalray');
      return;
    }

    // Alt+V → Vertical line
    if (alt && !ctrl && code === 'KeyV') {
      consume();
      setDrawingTool('verticalline');
      return;
    }

    // Alt+C → Cross line
    if (alt && !ctrl && code === 'KeyC') {
      consume();
      setDrawingTool('crossline');
      return;
    }

    // Alt+F → Fibonacci retracement
    if (alt && !ctrl && code === 'KeyF') {
      consume();
      setDrawingTool('fibonacci');
      return;
    }

    // Shift+Alt+R → Rectangle
    if (shift && alt && !ctrl && code === 'KeyR') {
      consume();
      setDrawingTool('rectangle');
      return;
    }

    // Ctrl+H (also Ctrl+Alt+H) → Hide/show all drawings
    if (ctrl && code === 'KeyH') {
      consume();
      drawings.forEach(d => {
        ctx.updateDrawing(d.id, { ...d, visible: !d.visible });
      });
      return;
    }

    // ─── Interval shortcuts (number keys) ───
    if (!ctrl && !alt && !shift) {
      const intervalMap: Record<string, string> = {
        Digit1: '1m',
        Digit2: '2m',
        Digit3: '3m',
        Digit5: '5m',
        Numpad1: '1m',
        Numpad2: '2m',
        Numpad3: '3m',
        Numpad5: '5m',
      };
      if (intervalMap[code]) {
        consume();
        setInterval(intervalMap[code] as any);
        return;
      }
    }

    // , (comma) → Open interval selector
    if (!ctrl && !alt && !shift && code === 'Comma') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:open-intervals'));
      return;
    }

    // Alt+A → Add alert
    if (alt && !ctrl && code === 'KeyA') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:add-alert'));
      return;
    }

    // Alt+G → Go to date
    if (alt && !ctrl && code === 'KeyG') {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:go-to-date'));
      return;
    }

    // ? → Open keyboard shortcuts dialog
    if (!ctrl && !alt && (key === '?' || (shift && code === 'Slash'))) {
      consume();
      window.dispatchEvent(new CustomEvent('shortcut:show-shortcuts'));
      return;
    }

    // Any letter key → Open symbol search (layout-independent)
    if (!ctrl && !alt && !shift && /^Key[A-Z]$/.test(code)) {
      consume();
      const initialChar = code.slice(3).toLowerCase();
      window.dispatchEvent(new CustomEvent('shortcut:symbol-search', { detail: { initialChar } }));
      return;
    }
  }, [drawings, setDrawingTool, setInterval, setChartSettings, ctx]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
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
      { label: 'Hide all drawings', keys: ['Ctrl', 'H'] },
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
