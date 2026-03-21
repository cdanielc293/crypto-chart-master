import { Copy, Trash2, Lock, Unlock, Eye, EyeOff, Settings, GripVertical, Pencil } from 'lucide-react';
import type { Drawing } from '@/types/chart';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

const COLORS = ['#2962ff', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#ffeb3b', '#ffffff', '#787b86'];

interface Props {
  open: boolean;
  position: { x: number; y: number };
  drawing: Drawing | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Drawing>) => void;
  onClone: () => void;
  onDelete: () => void;
  onOpenSettings?: () => void;
}

export default function DrawingContextMenu({
  open,
  position,
  drawing,
  onClose,
  onUpdate,
  onClone,
  onDelete,
  onOpenSettings,
}: Props) {
  if (!open || !drawing) return null;

  const toolLabel = drawing.type.charAt(0).toUpperCase() + drawing.type.slice(1).replace(/([A-Z])/g, ' $1');

  return (
    <div
      className="fixed z-[100]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="min-w-[200px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <div className="px-2 py-1.5 text-sm font-semibold text-foreground flex items-center gap-2">
          <Pencil size={14} className="text-muted-foreground" />
          {toolLabel}
        </div>

        <div className="-mx-1 my-1 h-px bg-border" />

        {/* Color row */}
        <div className="px-2 py-1.5 flex items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => { onUpdate({ color: c }); onClose(); }}
              className="w-5 h-5 rounded-sm border border-border hover:scale-125 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Line width */}
        <div className="px-2 py-1.5 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs">Width:</span>
          {[1, 2, 3, 4].map(w => (
            <button
              key={w}
              onClick={() => { onUpdate({ lineWidth: w }); onClose(); }}
              className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
                drawing.lineWidth === w ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'
              }`}
            >
              {w}px
            </button>
          ))}
        </div>

        <div className="-mx-1 my-1 h-px bg-border" />

        {/* Actions */}
        <button
          onClick={() => { onClone(); onClose(); }}
          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground w-full gap-2"
        >
          <Copy size={14} className="text-muted-foreground" />
          Clone
        </button>

        <button
          onClick={() => { onUpdate({ locked: !drawing.locked }); onClose(); }}
          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground w-full gap-2"
        >
          {drawing.locked ? <Lock size={14} className="text-primary" /> : <Unlock size={14} className="text-muted-foreground" />}
          {drawing.locked ? 'Unlock' : 'Lock'}
        </button>

        <button
          onClick={() => { onUpdate({ visible: !drawing.visible }); onClose(); }}
          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground w-full gap-2"
        >
          {drawing.visible ? <Eye size={14} className="text-muted-foreground" /> : <EyeOff size={14} className="text-muted-foreground" />}
          {drawing.visible ? 'Hide' : 'Show'}
        </button>

        <div className="-mx-1 my-1 h-px bg-border" />

        {onOpenSettings && (
          <button
            onClick={() => { onOpenSettings(); onClose(); }}
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground w-full gap-2"
          >
            <Settings size={14} className="text-muted-foreground" />
            Settings…
          </button>
        )}

        <button
          onClick={() => { onDelete(); onClose(); }}
          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-destructive w-full gap-2"
        >
          <Trash2 size={14} className="text-muted-foreground" />
          Delete
          <span className="ml-auto text-xs text-muted-foreground">Del</span>
        </button>
      </div>

      {/* Backdrop to close */}
      <div className="fixed inset-0 z-[-1]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
    </div>
  );
}
