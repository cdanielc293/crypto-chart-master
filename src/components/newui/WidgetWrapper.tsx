// Widget container — sharp, minimal, professional
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

  return (
    <div className="newui-glass newui-widget h-full flex flex-col">
      {/* header */}
      <div className="newui-widget-header flex items-center gap-1.5 px-2.5 py-1.5">
        <GripVertical size={12} className="text-white/15 shrink-0" />
        <span className="text-[10px] font-semibold tracking-wide text-white/50 uppercase flex-1 font-mono">
          {label}
        </span>
        <button
          className="p-0.5 rounded hover:bg-white/5 text-white/20 hover:text-white/50 transition-colors"
          title="Settings"
        >
          <Settings size={11} />
        </button>
        <button
          className="p-0.5 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400/70 transition-colors"
          onClick={() => onRemove(widget.id)}
          title="Remove"
        >
          <X size={11} />
        </button>
      </div>

      {/* body */}
      <div className="flex-1 overflow-hidden p-2">
        {children}
      </div>
    </div>
  );
}
