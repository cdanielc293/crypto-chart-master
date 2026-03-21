import { useChart } from '@/context/ChartContext';
import type { Interval, ChartType } from '@/types/chart';
import { useState } from 'react';
import { Search, ChevronDown, BarChart3, CandlestickChart, LineChart, AreaChart } from 'lucide-react';
import SymbolSearch from './SymbolSearch';

const intervals: { label: string; value: Interval }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: 'D', value: '1d' },
  { label: 'W', value: '1w' },
  { label: 'M', value: '1M' },
];

const chartTypes: { label: string; value: ChartType; icon: React.ReactNode }[] = [
  { label: 'Candles', value: 'candles', icon: <CandlestickChart size={14} /> },
  { label: 'Hollow', value: 'hollow', icon: <CandlestickChart size={14} /> },
  { label: 'Line', value: 'line', icon: <LineChart size={14} /> },
  { label: 'Area', value: 'area', icon: <AreaChart size={14} /> },
];

const indicatorList = ['EMA 9', 'EMA 21', 'EMA 50', 'EMA 200', 'SMA 20', 'SMA 50', 'Bollinger Bands', 'Volume'];

export default function TopToolbar() {
  const { symbol, interval, setInterval, chartType, setChartType, indicators, toggleIndicator } = useChart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [chartTypeOpen, setChartTypeOpen] = useState(false);
  const [indicatorOpen, setIndicatorOpen] = useState(false);

  const pair = symbol.replace('USDT', ' / TetherUS');

  return (
    <>
      <div className="flex items-center h-10 bg-toolbar-bg border-b border-chart-border px-2 gap-1 text-sm select-none">
        {/* Symbol */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded hover:bg-toolbar-hover text-foreground font-semibold"
        >
          <Search size={14} className="text-muted-foreground" />
          <span>{pair}</span>
          <span className="text-muted-foreground text-xs">· Binance</span>
        </button>

        <div className="w-px h-5 bg-chart-border mx-1" />

        {/* Intervals */}
        {intervals.map(i => (
          <button
            key={i.value}
            onClick={() => setInterval(i.value)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              interval === i.value
                ? 'bg-toolbar-active text-primary-foreground'
                : 'text-muted-foreground hover:bg-toolbar-hover hover:text-foreground'
            }`}
          >
            {i.label}
          </button>
        ))}

        <div className="w-px h-5 bg-chart-border mx-1" />

        {/* Chart Type */}
        <div className="relative">
          <button
            onClick={() => setChartTypeOpen(!chartTypeOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded text-muted-foreground hover:bg-toolbar-hover hover:text-foreground"
          >
            {chartTypes.find(c => c.value === chartType)?.icon}
            <ChevronDown size={12} />
          </button>
          {chartTypeOpen && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-chart-border rounded-md shadow-lg z-50 py-1 min-w-[140px]">
              {chartTypes.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => { setChartType(ct.value); setChartTypeOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-toolbar-hover ${
                    chartType === ct.value ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {ct.icon} {ct.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-chart-border mx-1" />

        {/* Indicators */}
        <div className="relative">
          <button
            onClick={() => setIndicatorOpen(!indicatorOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded text-muted-foreground hover:bg-toolbar-hover hover:text-foreground text-xs"
          >
            <BarChart3 size={14} />
            <span>Indicators</span>
            {indicators.length > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
                {indicators.length}
              </span>
            )}
          </button>
          {indicatorOpen && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-chart-border rounded-md shadow-lg z-50 py-1 min-w-[180px] max-h-[300px] overflow-y-auto">
              {indicatorList.map(ind => (
                <button
                  key={ind}
                  onClick={() => toggleIndicator(ind)}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-toolbar-hover ${
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

        {/* OHLC will be shown in chart component */}
      </div>

      {searchOpen && <SymbolSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}
