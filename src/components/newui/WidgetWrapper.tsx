// Widget container with glass frame, header, settings, remove
import { Settings, X, GripVertical } from 'lucide-react';
import type { WidgetInstance } from './types';
import { WIDGET_REGISTRY } from './types';

interface Props {
  widget: WidgetInstance;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}

export default function WidgetWrapper({ widget, onRemove, children }: Props) {
  const def = WIDGET_REGISTRY.find(w => w.type === widget.type);
  const label = def?.label ?? widget.type;
  const accent = def?.previewColor ?? '#00f0ff';

  return (
    <div className="newui-glass newui-widget h-full flex flex-col">
      {/* top accent line */}
      <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

      {/* header */}
      <div className="newui-widget-header flex items-center gap-2 px-3 py-2">
        <GripVertical size={14} className="text-[#00f0ff]/40 shrink-0" />
        <span className="text-xs font-semibold tracking-wide flex-1" style={{ color: accent }}>
          {def?.icon} {label}
        </span>
        <button
          className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
          title="Settings"
        >
          <Settings size={12} />
        </button>
        <button
          className="p-1 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
          onClick={() => onRemove(widget.id)}
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>

      {/* body */}
      <div className="flex-1 overflow-hidden p-3">
        {children}
      </div>
    </div>
  );
}
