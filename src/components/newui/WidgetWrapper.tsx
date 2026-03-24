// Widget container — draggable/resizable professional terminal module
import { useCallback } from 'react';
import { Settings, X, GripVertical, Lock, Unlock, MoveDiagonal2, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import type { WidgetInstance, WidgetPosition } from './types';
import { WIDGET_REGISTRY } from './types';

interface Props {
  widget: WidgetInstance;
  onRemove: (id: string) => void;
  onUpdatePosition: (id: string, patch: Partial<WidgetPosition>) => void;
  onToggleLock: (id: string) => void;
  onFocus: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  workspaceSize: { width: number; height: number };
  children: React.ReactNode;
}

const MIN_WIDTH = 280;
const MIN_HEIGHT = 180;

export default function WidgetWrapper({
  widget,
  onRemove,
  onUpdatePosition,
  onToggleLock,
  onFocus,
  onBringToFront,
  onSendToBack,
  workspaceSize,
  children,
}: Props) {
  const def = WIDGET_REGISTRY.find(w => w.type === widget.type);
  const label = def?.label ?? widget.type;
  const isChart = widget.type === 'price-chart';

  const clampMove = useCallback((x: number, y: number) => {
    const hasBounds = workspaceSize.width > 200 && workspaceSize.height > 200;
    if (!hasBounds) return { x: Math.max(0, x), y: Math.max(0, y) };

    return {
      x: Math.max(0, Math.min(x, workspaceSize.width - widget.position.width)),
      y: Math.max(0, Math.min(y, workspaceSize.height - widget.position.height)),
    };
  }, [workspaceSize.height, workspaceSize.width, widget.position.height, widget.position.width]);

  const startDrag = useCallback((event: React.MouseEvent) => {
    if (widget.locked) return;
    event.preventDefault();
    event.stopPropagation();
    onFocus(widget.id);

    const startMouseX = event.clientX;
    const startMouseY = event.clientY;
    const startX = widget.position.x;
    const startY = widget.position.y;

    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;
      const next = clampMove(startX + dx, startY + dy);
      onUpdatePosition(widget.id, { x: next.x, y: next.y });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [clampMove, onFocus, onUpdatePosition, widget.id, widget.locked, widget.position.x, widget.position.y]);

  const startResize = useCallback((event: React.MouseEvent) => {
    if (widget.locked) return;
    event.preventDefault();
    event.stopPropagation();
    onFocus(widget.id);

    const startMouseX = event.clientX;
    const startMouseY = event.clientY;
    const startWidth = widget.position.width;
    const startHeight = widget.position.height;

    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;

      const maxWidth = workspaceSize.width > 200
        ? Math.max(MIN_WIDTH, workspaceSize.width - widget.position.x)
        : Math.max(MIN_WIDTH, startWidth + dx);
      const maxHeight = workspaceSize.height > 200
        ? Math.max(MIN_HEIGHT, workspaceSize.height - widget.position.y)
        : Math.max(MIN_HEIGHT, startHeight + dy);

      const nextWidth = Math.max(MIN_WIDTH, Math.min(startWidth + dx, maxWidth));
      const nextHeight = Math.max(MIN_HEIGHT, Math.min(startHeight + dy, maxHeight));

      onUpdatePosition(widget.id, { width: nextWidth, height: nextHeight });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onFocus, onUpdatePosition, widget.id, widget.locked, widget.position.height, widget.position.width, widget.position.x, widget.position.y, workspaceSize.height, workspaceSize.width]);

  return (
    <div
      className={`newui-glass newui-widget h-full flex flex-col ${widget.locked ? 'ring-1 ring-white/10' : ''}`}
      onMouseDown={() => onFocus(widget.id)}
    >
      {/* Header */}
      <div
        className={`newui-widget-header flex items-center gap-1.5 px-2.5 py-1.5 ${widget.locked ? 'cursor-default' : 'cursor-move'}`}
        onMouseDown={startDrag}
      >
        <GripVertical size={12} className="text-white/20 shrink-0" />
        <span className="text-[10px] font-semibold tracking-wide text-white/60 uppercase flex-1 font-mono">
          {label}
        </span>

        <button
          className={`p-0.5 rounded transition-colors ${widget.locked ? 'text-amber-300/80 hover:text-amber-200' : 'text-white/20 hover:bg-white/5 hover:text-white/50'}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(widget.id);
          }}
          title={widget.locked ? 'Unlock widget' : 'Lock widget'}
        >
          {widget.locked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>

        <button
          className="p-0.5 rounded hover:bg-white/5 text-white/20 hover:text-white/50 transition-colors"
          onClick={(e) => { e.stopPropagation(); onBringToFront(widget.id); }}
          title="Bring to front"
        >
          <ArrowUpToLine size={11} />
        </button>

        <button
          className="p-0.5 rounded hover:bg-white/5 text-white/20 hover:text-white/50 transition-colors"
          onClick={(e) => { e.stopPropagation(); onSendToBack(widget.id); }}
          title="Send to back"
        >
          <ArrowDownToLine size={11} />
        </button>

        <button
          className="p-0.5 rounded hover:bg-white/5 text-white/20 hover:text-white/50 transition-colors"
          title="Settings"
          onClick={(e) => e.stopPropagation()}
        >
          <Settings size={11} />
        </button>

        <button
          className="p-0.5 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400/70 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(widget.id);
          }}
          title="Remove"
        >
          <X size={11} />
        </button>
      </div>

      {/* Body */}
      <div className={`flex-1 overflow-hidden ${isChart ? 'p-0' : 'p-2'}`}>
        {children}
      </div>

      {/* Resize handle */}
      <button
        className={`absolute bottom-1 right-1 w-5 h-5 rounded flex items-center justify-center transition-colors ${widget.locked ? 'text-white/10 cursor-default' : 'text-white/20 hover:text-white/45 hover:bg-white/5 cursor-se-resize'}`}
        onMouseDown={startResize}
        title={widget.locked ? 'Widget locked' : 'Resize widget'}
      >
        <MoveDiagonal2 size={12} />
      </button>
    </div>
  );
}
