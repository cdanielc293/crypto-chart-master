import { useState } from 'react';
import { useChart } from '@/context/ChartContext';
import { BarChart3, Trash2, TrendingUp, Minus } from 'lucide-react';

export default function ObjectTreePanel() {
  const { symbol, interval, drawings, removeDrawing, indicators, toggleIndicator } = useChart();
  const [tab, setTab] = useState<'tree' | 'data'>('tree');

  return (
    <div className="flex flex-col w-72 bg-toolbar-bg border-l border-chart-border select-none">
      {/* Tabs */}
      <div className="flex border-b border-chart-border">
        <button
          onClick={() => setTab('tree')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            tab === 'tree'
              ? 'text-foreground bg-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Object tree
        </button>
        <button
          onClick={() => setTab('data')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            tab === 'data'
              ? 'text-foreground bg-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Data window
        </button>
      </div>

      {tab === 'tree' ? (
        <div className="flex-1 overflow-y-auto">
          {/* Main symbol */}
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground border-b border-chart-border">
            <Candlestick size={14} className="text-muted-foreground" />
            <span>{symbol} · Binance, {interval}</span>
          </div>

          {/* Indicators */}
          {indicators.map(ind => (
            <div
              key={ind}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-toolbar-hover group"
            >
              <TrendingUp size={13} className="text-muted-foreground" />
              <span className="flex-1">{ind}</span>
              <button
                onClick={() => toggleIndicator(ind)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive"
                title="Remove"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Drawings */}
          {drawings.map(d => (
            <div
              key={d.id}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-toolbar-hover group"
            >
              <Minus size={13} className="text-muted-foreground" />
              <span className="flex-1 capitalize">{d.type}</span>
              <button
                onClick={() => removeDrawing(d.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive"
                title="Remove"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {indicators.length === 0 && drawings.length === 0 && (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              No objects on chart
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          Hover over the chart to see data
        </div>
      )}
    </div>
  );
}
