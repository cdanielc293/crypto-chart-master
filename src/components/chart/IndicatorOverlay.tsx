import { useState } from 'react';
import { useChart } from '@/context/ChartContext';
import { Eye, EyeOff, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function IndicatorOverlay() {
  const { symbol, interval, indicators, toggleIndicator, hiddenIndicators, toggleHiddenIndicator } = useChart();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredIndicator, setHoveredIndicator] = useState<string | null>(null);

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
      <div className="flex items-center gap-1.5 mb-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <span className="text-[13px] font-bold text-white drop-shadow-sm">
          {symbol} · {interval.toUpperCase()}
        </span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 rounded hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronDown size={13} className="text-white/70" /> : <ChevronUp size={13} className="text-white/70" />}
        </button>
      </div>

      {!collapsed && indicators.map(name => {
        const isHidden = hiddenIndicators.has(name);
        const isHovered = hoveredIndicator === name;
        const color = colorMap[name] || '#94a3b8';

        return (
          <div
            key={name}
            className="group flex items-center gap-1.5 py-0.5 px-1.5 rounded transition-colors"
            style={{ backgroundColor: isHovered ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.3)' }}
            onMouseEnter={() => setHoveredIndicator(name)}
            onMouseLeave={() => setHoveredIndicator(null)}
          >
            {/* Color dot */}
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: isHidden ? 'transparent' : color,
                border: isHidden ? `1.5px solid ${color}` : 'none',
              }}
            />

            {/* Name */}
            <span
              className="text-[13px] font-semibold drop-shadow-sm"
              style={{ color: isHidden ? 'rgba(255,255,255,0.35)' : '#ffffff', textDecoration: isHidden ? 'line-through' : 'none' }}
            >
              {name}
            </span>

            {/* Action buttons - show on hover */}
            {isHovered && (
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  onClick={() => toggleHiddenIndicator(name)}
                  className="p-0.5 rounded hover:bg-white/15 transition-colors"
                  title={isHidden ? 'Show' : 'Hide'}
                >
                  {isHidden
                    ? <EyeOff size={13} className="text-white/60" />
                    : <Eye size={13} className="text-white/60" />
                  }
                </button>
                <button
                  onClick={() => toggleIndicator(name)}
                  className="p-0.5 rounded hover:bg-red-500/30 transition-colors"
                  title="Remove"
                >
                  <Trash2 size={13} className="text-white/60 hover:text-red-400" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
