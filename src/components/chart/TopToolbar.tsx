import { useChart } from '@/context/ChartContext';
import { useTheme, THEMES } from '@/context/ThemeContext';
import type { Interval, ChartType } from '@/types/chart';
import { ALL_INTERVALS } from '@/types/chart';
import { useState, useMemo } from 'react';
import {
  Search, ChevronDown, BarChart3, CandlestickChart, Star, Rewind, Settings, Palette, Camera, Fullscreen,
} from 'lucide-react';
import SymbolSearch from './SymbolSearch';
import ChartSettingsDialog from './ChartSettingsDialog';
import LayoutManager from './LayoutManager';
import MultiChartLayoutSelector from './MultiChartLayoutSelector';
import type { LayoutSyncOptions, GridLayout } from '@/types/layout';
import { DEFAULT_SYNC_OPTIONS, ALL_GRID_LAYOUTS } from '@/types/layout';

const chartTypes: { label: string; value: ChartType; group?: string }[] = [
  { label: 'Bars', value: 'bars' },
  { label: 'Candles', value: 'candles' },
  { label: 'Hollow candles', value: 'hollow' },
  { label: 'Volume candles', value: 'volume_candles' },
  { label: 'Line', value: 'line' },
  { label: 'Line with markers', value: 'line_markers' },
  { label: 'Step line', value: 'step_line' },
  { label: 'Area', value: 'area' },
  { label: 'HLC area', value: 'hlc_area' },
  { label: 'Baseline', value: 'baseline' },
  { label: 'Columns', value: 'columns' },
  { label: 'High-low', value: 'high_low' },
  { label: 'Heikin Ashi', value: 'heikin_ashi', group: 'special' },
  { label: 'Renko', value: 'renko', group: 'special' },
  { label: 'Line break', value: 'line_break', group: 'special' },
  { label: 'Kagi', value: 'kagi', group: 'special' },
  { label: 'Point & Figure', value: 'point_figure', group: 'special' },
];

const indicatorList = ['EMA 9', 'EMA 21', 'EMA 50', 'EMA 200', 'SMA 20', 'SMA 50', 'Bollinger Bands', 'Volume'];

// Short labels for the toolbar buttons
const shortLabel: Record<string, string> = {
  '1s': '1s', '5s': '5s', '10s': '10s', '15s': '15s', '30s': '30s', '45s': '45s',
  '1m': '1m', '2m': '2m', '3m': '3m', '5m': '5m', '10m': '10m', '15m': '15m', '30m': '30m', '45m': '45m',
  '1h': '1h', '2h': '2h', '3h': '3h', '4h': '4h',
  '1d': 'D', '1w': 'W', '1M': 'M', '3M': '3M', '6M': '6M', '12M': '12M',
};

export default function TopToolbar() {
  const {
    symbol, interval, setInterval, chartType, setChartType,
    indicators, toggleIndicator, replayState, setReplayState,
    favoriteIntervals, toggleFavoriteInterval,
  } = useChart();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [chartTypeOpen, setChartTypeOpen] = useState(false);
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [intervalDropdownOpen, setIntervalDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [gridLayout, setGridLayout] = useState<GridLayout>(ALL_GRID_LAYOUTS[0]);
  const [syncOptions, setSyncOptions] = useState<LayoutSyncOptions>(DEFAULT_SYNC_OPTIONS);

  const pair = symbol.replace('USDT', ' / TetherUS');
  const currentChartLabel = chartTypes.find(c => c.value === chartType)?.label ?? 'Candles';

  // Group intervals for dropdown
  const groupedIntervals = useMemo(() => {
    const groups: { label: string; items: typeof ALL_INTERVALS }[] = [];
    let currentGroup = '';
    for (const iv of ALL_INTERVALS) {
      if (iv.group !== currentGroup) {
        currentGroup = iv.group;
        groups.push({ label: currentGroup, items: [] });
      }
      groups[groups.length - 1].items.push(iv);
    }
    return groups;
  }, []);

  const closeAll = () => {
    setChartTypeOpen(false);
    setIndicatorOpen(false);
    setIntervalDropdownOpen(false);
    setThemeOpen(false);
  };

  return (
    <>
      <div className="flex items-center h-12 bg-toolbar-bg border-b border-chart-border px-2 gap-1 text-sm select-none">
        {/* Symbol */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-toolbar-hover text-foreground font-semibold text-[14px]"
        >
          <Search size={16} className="text-muted-foreground" />
          <span>{pair}</span>
          <span className="text-muted-foreground text-xs">· Binance</span>
        </button>

        <div className="w-px h-5 bg-chart-border mx-1" />

        {/* Favorite intervals in toolbar */}
        {favoriteIntervals.map(iv => (
          <button
            key={iv}
            onClick={() => setInterval(iv)}
            className={`px-2.5 py-1.5 rounded text-[13px] font-medium transition-colors ${
              interval === iv
                ? 'bg-toolbar-active text-primary-foreground'
                : 'text-muted-foreground hover:bg-toolbar-hover hover:text-foreground'
            }`}
          >
            {shortLabel[iv] || iv}
          </button>
        ))}

        {/* Dropdown toggle for all intervals */}
        <div className="relative">
          <button
            onClick={() => { setIntervalDropdownOpen(!intervalDropdownOpen); setChartTypeOpen(false); setIndicatorOpen(false); }}
            className={`flex items-center px-1.5 py-1.5 rounded text-[13px] transition-colors ${
              intervalDropdownOpen
                ? 'bg-toolbar-active text-primary-foreground'
                : 'text-muted-foreground hover:bg-toolbar-hover hover:text-foreground'
            }`}
          >
            <ChevronDown size={16} />
          </button>
          {intervalDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-chart-border rounded-md shadow-xl z-50 py-1 min-w-[220px] max-h-[500px] overflow-y-auto">
              {groupedIntervals.map(group => (
                <div key={group.label}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                    {group.label}
                  </div>
                  {group.items.map(iv => {
                    const isFav = favoriteIntervals.includes(iv.value);
                    const isActive = interval === iv.value;
                    return (
                      <div
                        key={iv.value}
                        className={`flex items-center w-full px-3 py-2 text-[13px] hover:bg-toolbar-hover transition-colors cursor-pointer ${
                          isActive ? 'text-primary bg-toolbar-hover' : 'text-foreground'
                        }`}
                      >
                        <span
                          className="flex-1 text-left"
                          onClick={() => { setInterval(iv.value); setIntervalDropdownOpen(false); }}
                        >
                          {iv.label}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavoriteInterval(iv.value); }}
                          className="ml-2 p-0.5 rounded hover:bg-muted"
                        >
                          <Star
                            size={12}
                            className={isFav ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-chart-border mx-1" />

        {/* Chart Type */}
        <div className="relative">
          <button
            onClick={() => { setChartTypeOpen(!chartTypeOpen); setIndicatorOpen(false); setIntervalDropdownOpen(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-muted-foreground hover:bg-toolbar-hover hover:text-foreground text-[13px]"
          >
            <CandlestickChart size={16} />
            <span>{currentChartLabel}</span>
            <ChevronDown size={14} />
          </button>
          {chartTypeOpen && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-chart-border rounded-md shadow-xl z-50 py-1 min-w-[200px] max-h-[420px] overflow-y-auto">
              {chartTypes.map((ct, i) => {
                const prevGroup = i > 0 ? chartTypes[i - 1].group : undefined;
                const showSep = ct.group !== prevGroup && i > 0;
                return (
                  <div key={ct.value}>
                    {showSep && <div className="h-px bg-chart-border my-1" />}
                    <button
                      onClick={() => { setChartType(ct.value); setChartTypeOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-[13px] hover:bg-toolbar-hover transition-colors ${
                        chartType === ct.value ? 'text-primary bg-toolbar-hover' : 'text-foreground'
                      }`}
                    >
                      <span className="flex-1 text-left">{ct.label}</span>
                      {chartType === ct.value && <Star size={10} className="text-primary fill-primary" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-chart-border mx-1" />

        {/* Indicators */}
        <div className="relative">
          <button
            onClick={() => { setIndicatorOpen(!indicatorOpen); setChartTypeOpen(false); setIntervalDropdownOpen(false); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-muted-foreground hover:bg-toolbar-hover hover:text-foreground text-[13px]"
          >
            <BarChart3 size={16} />
            <span>Indicators</span>
            {indicators.length > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
                {indicators.length}
              </span>
            )}
          </button>
          {indicatorOpen && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-chart-border rounded-md shadow-xl z-50 py-1 min-w-[180px] max-h-[300px] overflow-y-auto">
              {indicatorList.map(ind => (
                <button
                  key={ind}
                  onClick={() => toggleIndicator(ind)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-toolbar-hover ${
                    indicators.includes(ind) ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-sm border ${
                    indicators.includes(ind) ? 'bg-primary border-primary' : 'border-muted-foreground'
                  }`} />
                  {ind}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-chart-border mx-1" />

        {/* Bar Replay */}
        <button
          onClick={() => setReplayState(replayState === 'off' ? 'selecting' : 'off')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[13px] transition-colors ${
            replayState !== 'off'
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:bg-toolbar-hover hover:text-foreground'
          }`}
        >
          <Rewind size={16} />
          <span>Replay</span>
        </button>

        <div className="w-px h-5 bg-chart-border mx-1" />

        {/* Theme Switcher */}
        <div className="relative">
          <button
            onClick={() => { closeAll(); setThemeOpen(!themeOpen); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-muted-foreground hover:bg-toolbar-hover hover:text-foreground text-[13px]"
            title="Change theme"
          >
            <Palette size={16} />
          </button>
          {themeOpen && (
            <div className="absolute top-full mt-1 right-0 z-50 w-52 max-h-[400px] overflow-y-auto rounded-md border bg-popover border-border shadow-lg py-1">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-toolbar-hover transition-colors ${
                    theme === t.id ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-border shrink-0"
                    style={{ background: t.preview }}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Layout Manager */}
        <LayoutManager />
        <div className="w-px h-5 bg-chart-border mx-1" />

        {/* Multi-chart layout */}
        <MultiChartLayoutSelector
          grid={multiGrid}
          onGridChange={setMultiGrid}
          syncOptions={syncOptions}
          onSyncChange={setSyncOptions}
        />
        <div className="w-px h-5 bg-chart-border mx-1" />

        {/* Screenshot */}
        <button
          className="flex items-center gap-1 px-2 py-1.5 rounded text-muted-foreground hover:bg-toolbar-hover hover:text-foreground text-[13px]"
          title="Take a snapshot"
        >
          <Camera size={16} />
        </button>

        {/* Fullscreen */}
        <button
          onClick={() => document.documentElement.requestFullscreen?.()}
          className="flex items-center gap-1 px-2 py-1.5 rounded text-muted-foreground hover:bg-toolbar-hover hover:text-foreground text-[13px]"
          title="Fullscreen"
        >
          <Fullscreen size={16} />
        </button>

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded text-muted-foreground hover:bg-toolbar-hover hover:text-foreground text-[13px]"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Close dropdowns on outside click */}
      {(chartTypeOpen || indicatorOpen || intervalDropdownOpen || themeOpen) && (
        <div className="fixed inset-0 z-40" onClick={closeAll} />
      )}

      {searchOpen && <SymbolSearch onClose={() => setSearchOpen(false)} />}
      <ChartSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
