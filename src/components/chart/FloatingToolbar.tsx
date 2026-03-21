import type { ChartDrawing } from '@/lib/drawing/types';
import { Palette, Copy, Trash2, Lock, Unlock, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

const COLORS = ['#2962ff', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#ffeb3b', '#ffffff', '#787b86'];

interface Props {
  x: number;
  y: number;
  drawing: ChartDrawing | null;
  onUpdate: (updates: Partial<ChartDrawing>) => void;
  onClone: () => void;
  onDelete: () => void;
}

export default function FloatingToolbar({ x, y, drawing, onUpdate, onClone, onDelete }: Props) {
  const [showColors, setShowColors] = useState(false);

  if (!drawing) return null;

  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 bg-card border border-chart-border rounded-md shadow-xl px-1 py-0.5"
      style={{
        left: Math.max(5, x - 100),
        top: Math.max(5, y),
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Color picker */}
      <div className="relative">
        <button
          onClick={() => setShowColors(!showColors)}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors"
          title="Color"
        >
          <div className="w-4 h-4 rounded-sm border border-chart-border" style={{ backgroundColor: drawing.color }} />
        </button>
        {showColors && (
          <div className="absolute top-full left-0 mt-1 bg-card border border-chart-border rounded-md shadow-xl p-1.5 grid grid-cols-5 gap-1 min-w-[120px]">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { onUpdate({ color: c }); setShowColors(false); }}
                className="w-5 h-5 rounded-sm border border-chart-border hover:scale-125 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Line width */}
      <button
        onClick={() => onUpdate({ lineWidth: Math.max(1, drawing.lineWidth - 1) })}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors text-muted-foreground hover:text-foreground"
        title="Thinner"
      >
        <Minus size={12} />
      </button>
      <span className="text-[10px] text-muted-foreground w-4 text-center">{drawing.lineWidth}</span>
      <button
        onClick={() => onUpdate({ lineWidth: Math.min(8, drawing.lineWidth + 1) })}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors text-muted-foreground hover:text-foreground"
        title="Thicker"
      >
        <Plus size={12} />
      </button>

      <div className="w-px h-5 bg-chart-border mx-0.5" />

      {/* Lock */}
      <button
        onClick={() => onUpdate({ locked: !drawing.locked })}
        className={`w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors ${drawing.locked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        title={drawing.locked ? 'Unlock' : 'Lock'}
      >
        {drawing.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>

      {/* Clone */}
      <button
        onClick={onClone}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors text-muted-foreground hover:text-foreground"
        title="Clone"
      >
        <Copy size={13} />
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors text-muted-foreground hover:text-destructive"
        title="Delete"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
