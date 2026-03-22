import { useState } from 'react';
import { useChart } from '@/context/ChartContext';
import { Eye, EyeOff, Settings, Trash2, ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';

export default function IndicatorOverlay() {
  const { symbol, interval, indicators, toggleIndicator } = useChart();
  const [collapsed, setCollapsed] = useState(false);
  const [hiddenIndicators, setHiddenIndicators] = useState<Set<string>>(new Set());
  const [hoveredIndicator, setHoveredIndicator] = useState<string | null>(null);

  const toggleVisibility = (name: string) => {
    setHiddenIndicators(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Color map for indicator lines
  const colorMap: Record<string, string> = {
    'EMA 9': '#f59e0b',
    'EMA 21': '#3b82f6',
    'EMA 50': '#a855f7',
    'EMA 200': '#ef4444',
    'SMA 20': '#06b6d4',
    'SMA 50': '#10b981',
    'SMA 100': '#f97316',
    'SMA 200': '#ec4899',
    'Bollinger Bands': '#8b5cf6',
    'Volume': '#6366f1',
    'RSI': '#14b8a6',
    'MACD': '#f43f5e',
  };

  if (indicators.length === 0) return null;

  return (
    <div className="absolute top-1 left-1 z-30 select-none">
      {/* Symbol header */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[11px] font-semibold text-foreground/80">
          {symbol} · {interval.toUpperCase()}
        </span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 rounded hover:bg-toolbar-hover transition-colors"
        >
          {collapsed ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronUp size={12} className="text-muted-foreground" />}
        </button>
      </div>

      {!collapsed && indicators.map(name => {
        const isHidden = hiddenIndicators.has(name);
        const isHovered = hoveredIndicator === name;
        const color = colorMap[name] || '#94a3b8';

        return (
          <div
            key={name}
            className="group flex items-center gap-1 py-0.5 rounded transition-colors"
            onMouseEnter={() => setHoveredIndicator(name)}
            onMouseLeave={() => setHoveredIndicator(null)}
          >
            {/* Color dot */}
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: isHidden ? 'transparent' : color, border: isHidden ? `1px solid ${color}` : 'none' }}
            />

            {/* Name */}
            <span className={`text-[11px] ${isHidden ? 'text-muted-foreground/40 line-through' : 'text-foreground/70'}`}>
              {name}
            </span>

            {/* Action buttons - show on hover */}
            {isHovered && (
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  onClick={() => toggleVisibility(name)}
                  className="p-0.5 rounded hover:bg-toolbar-hover transition-colors"
                  title={isHidden ? 'Show' : 'Hide'}
                >
                  {isHidden
                    ? <EyeOff size={11} className="text-muted-foreground" />
                    : <Eye size={11} className="text-muted-foreground" />
                  }
                </button>
                <button
                  onClick={() => toggleIndicator(name)}
                  className="p-0.5 rounded hover:bg-destructive/20 transition-colors"
                  title="Remove"
                >
                  <Trash2 size={11} className="text-muted-foreground hover:text-destructive" />
                </button>
                <button
                  className="p-0.5 rounded hover:bg-toolbar-hover transition-colors"
                  title="More"
                >
                  <MoreHorizontal size={11} className="text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
