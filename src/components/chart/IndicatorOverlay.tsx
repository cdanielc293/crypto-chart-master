import { useState } from 'react';
import { useChart } from '@/context/ChartContext';
import { Eye, EyeOff, Settings, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import IndicatorSettingsDialog from './IndicatorSettingsDialog';
import { getDefaultConfig, type IndicatorConfig } from '@/types/indicators';

export default function IndicatorOverlay() {
  const {
    symbol, interval, indicators, toggleIndicator,
    hiddenIndicators, toggleHiddenIndicator,
    indicatorConfigs, updateIndicatorConfig,
  } = useChart();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredIndicator, setHoveredIndicator] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<string | null>(null);

  const getColor = (name: string): string => {
    const cfg = indicatorConfigs.get(name);
    if (!cfg) return '#94a3b8';
    if (cfg.type === 'EMA' || cfg.type === 'SMA') return cfg.style.color;
    if (cfg.type === 'Bollinger Bands') return cfg.basisStyle.color;
    if (cfg.type === 'Volume') return cfg.upColor;
    return '#94a3b8';
  };

  if (indicators.length === 0) return null;

  return (
    <div className="absolute top-1 left-1 z-30 select-none">
      {/* Symbol header */}
      <div
        className="flex items-center gap-1.5 mb-0.5 px-1.5 py-0.5 rounded"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <span className="text-[13px] font-bold text-white drop-shadow-sm whitespace-nowrap">
          {symbol} · {interval.toUpperCase()}
        </span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 rounded hover:bg-white/10 transition-colors"
        >
          {collapsed
            ? <ChevronDown size={13} className="text-white/70" />
            : <ChevronUp size={13} className="text-white/70" />}
        </button>
      </div>

      {!collapsed && indicators.map(name => {
        const isHidden = hiddenIndicators.has(name);
        const isHovered = hoveredIndicator === name;
        const color = getColor(name);

        return (
          <div
            key={name}
            className="flex items-center gap-1.5 h-[24px] px-1.5 rounded whitespace-nowrap"
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
              className="text-[13px] font-semibold drop-shadow-sm shrink-0"
              style={{
                color: isHidden ? 'rgba(255,255,255,0.35)' : '#ffffff',
                textDecoration: isHidden ? 'line-through' : 'none',
              }}
            >
              {name}
            </span>

            {/* Actions — always rendered, visibility toggled */}
            <div
              className="flex items-center gap-0.5 ml-1 shrink-0"
              style={{ opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? 'auto' : 'none' }}
            >
              <button
                onClick={() => toggleHiddenIndicator(name)}
                className="p-0.5 rounded hover:bg-white/15 transition-colors"
                title={isHidden ? 'Show' : 'Hide'}
              >
                {isHidden
                  ? <EyeOff size={13} className="text-white/60" />
                  : <Eye size={13} className="text-white/60" />}
              </button>
              <button
                onClick={() => setSettingsOpen(name)}
                className="p-0.5 rounded hover:bg-white/15 transition-colors"
                title="Settings"
              >
                <Settings size={13} className="text-white/60" />
              </button>
              <button
                onClick={() => toggleIndicator(name)}
                className="p-0.5 rounded hover:bg-red-500/30 transition-colors"
                title="Remove"
              >
                <Trash2 size={13} className="text-white/60 hover:text-red-400" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Settings dialog */}
      {settingsOpen && (
        <IndicatorSettingsDialog
          open={!!settingsOpen}
          onClose={() => setSettingsOpen(null)}
          indicatorName={settingsOpen}
          config={indicatorConfigs.get(settingsOpen) || getDefaultConfig(settingsOpen)}
          onApply={(cfg) => updateIndicatorConfig(settingsOpen, cfg)}
        />
      )}
    </div>
  );
}
