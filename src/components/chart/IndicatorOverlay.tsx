import { useState } from 'react';
import { useChart } from '@/context/ChartContext';
import { Eye, EyeOff, Settings, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import IndicatorSettingsDialog from './IndicatorSettingsDialog';
import { getIndicator } from '@/lib/indicators/registry';
import { getDisplayName } from '@/types/indicators';

export default function IndicatorOverlay() {
  const {
    symbol, interval, indicators, removeIndicator,
    hiddenIndicators, toggleHiddenIndicator,
    indicatorConfigs, updateIndicatorConfig,
  } = useChart();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const getColor = (instanceId: string): string => {
    const inst = indicatorConfigs.get(instanceId);
    if (!inst) return '#94a3b8';
    const def = getIndicator(inst.definitionId);
    if (!def || def.lines.length === 0) return '#94a3b8';
    const firstLine = def.lines[0];
    return inst.lineStyles[firstLine.key]?.color || firstLine.color;
  };

  const getName = (instanceId: string): string => {
    const inst = indicatorConfigs.get(instanceId);
    if (!inst) return instanceId;
    const def = getIndicator(inst.definitionId);
    if (!def) return instanceId;
    return getDisplayName(def, inst);
  };

  if (indicators.length === 0) return null;

  return (
    <div className="absolute top-1 left-1 z-30 select-none">
      <div className="flex items-center gap-1.5 mb-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <span className="text-[13px] font-bold text-white drop-shadow-sm whitespace-nowrap">
          {symbol} · {interval.toUpperCase()}
        </span>
        <button onClick={() => setCollapsed(!collapsed)} className="p-0.5 rounded hover:bg-white/10 transition-colors">
          {collapsed ? <ChevronDown size={13} className="text-white/70" /> : <ChevronUp size={13} className="text-white/70" />}
        </button>
      </div>

      {!collapsed && indicators.map(id => {
        const isHidden = hiddenIndicators.has(id);
        const isHovered = hoveredId === id;
        const color = getColor(id);
        const name = getName(id);

        return (
          <div key={id} className="flex items-center gap-1.5 h-[24px] px-1.5 rounded whitespace-nowrap"
            style={{ backgroundColor: isHovered ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.3)' }}
            onMouseEnter={() => setHoveredId(id)} onMouseLeave={() => setHoveredId(null)}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: isHidden ? 'transparent' : color, border: isHidden ? `1.5px solid ${color}` : 'none' }} />
            <span className="text-[13px] font-semibold drop-shadow-sm shrink-0"
              style={{ color: isHidden ? 'rgba(255,255,255,0.35)' : '#ffffff', textDecoration: isHidden ? 'line-through' : 'none' }}>
              {name}
            </span>
            <div className="flex items-center gap-0.5 ml-1 shrink-0"
              style={{ opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? 'auto' : 'none' }}>
              <button onClick={() => toggleHiddenIndicator(id)} className="p-0.5 rounded hover:bg-white/15 transition-colors" title={isHidden ? 'Show' : 'Hide'}>
                {isHidden ? <EyeOff size={13} className="text-white/60" /> : <Eye size={13} className="text-white/60" />}
              </button>
              <button onClick={() => setSettingsId(id)} className="p-0.5 rounded hover:bg-white/15 transition-colors" title="Settings">
                <Settings size={13} className="text-white/60" />
              </button>
              <button onClick={() => removeIndicator(id)} className="p-0.5 rounded hover:bg-red-500/30 transition-colors" title="Remove">
                <Trash2 size={13} className="text-white/60 hover:text-red-400" />
              </button>
            </div>
          </div>
        );
      })}

      {settingsId && indicatorConfigs.has(settingsId) && (
        <IndicatorSettingsDialog
          open={!!settingsId}
          onClose={() => setSettingsId(null)}
          instanceId={settingsId}
          instance={indicatorConfigs.get(settingsId)!}
          onApply={(cfg) => updateIndicatorConfig(settingsId, cfg)}
        />
      )}
    </div>
  );
}
