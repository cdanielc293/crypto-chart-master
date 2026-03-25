import { useState, useRef, useEffect } from 'react';
import {
  Copy, Trash2, Lock, Unlock, Eye, EyeOff, Settings,
  Pencil, GripVertical, ChevronDown,
} from 'lucide-react';

const COLORS = ['#2962ff', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#ffeb3b', '#ffffff', '#778ba4'];
const LINE_WIDTHS = [1, 1.5, 2, 3, 4];

interface WidgetDrawing {
  id: string;
  type: string;
  points: { time: number; price: number }[];
  color: string;
  lineWidth: number;
  selected?: boolean;
  locked?: boolean;
  visible?: boolean;
}

interface Props {
  drawing: WidgetDrawing;
  position: { x: number; y: number };
  onUpdate: (id: string, updates: Partial<WidgetDrawing>) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function NewUIDrawingToolbar({ drawing, position, onUpdate, onClone, onDelete }: Props) {
  const [showColors, setShowColors] = useState(false);
  const [showWidths, setShowWidths] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Position toolbar above the first anchor point
  const style: React.CSSProperties = {
    position: 'absolute',
    left: Math.max(8, Math.min(position.x - 120, window.innerWidth - 280)),
    top: Math.max(8, position.y - 48),
    zIndex: 60,
  };

  useEffect(() => {
    setShowColors(false);
    setShowWidths(false);
  }, [drawing.id]);

  const toolLabel = drawing.type.charAt(0).toUpperCase() + drawing.type.slice(1).replace(/([A-Z])/g, ' $1');

  return (
    <div ref={ref} style={style} className="pointer-events-auto" onMouseDown={e => e.stopPropagation()}>
      <div className="flex items-center gap-0.5 bg-[#0a1628]/95 backdrop-blur-md border border-white/[0.08] rounded-md shadow-2xl px-1 py-0.5">
        {/* Color button */}
        <div className="relative">
          <button
            onClick={() => { setShowColors(!showColors); setShowWidths(false); }}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/[0.06] transition-colors"
            title="Color"
          >
            <div className="w-4 h-4 rounded-sm border border-white/20" style={{ backgroundColor: drawing.color }} />
          </button>
          {showColors && (
            <div className="absolute top-full left-0 mt-1 bg-[#0a1628]/95 backdrop-blur-md border border-white/[0.08] rounded-md shadow-2xl p-1.5 flex gap-1 z-50">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { onUpdate(drawing.id, { color: c }); setShowColors(false); }}
                  className="w-5 h-5 rounded-sm border border-white/20 hover:scale-125 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Line width */}
        <div className="relative">
          <button
            onClick={() => { setShowWidths(!showWidths); setShowColors(false); }}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/[0.06] transition-colors text-white/50 text-[10px] font-mono"
            title="Line width"
          >
            {drawing.lineWidth}px
          </button>
          {showWidths && (
            <div className="absolute top-full left-0 mt-1 bg-[#0a1628]/95 backdrop-blur-md border border-white/[0.08] rounded-md shadow-2xl p-1 flex gap-0.5 z-50">
              {LINE_WIDTHS.map(w => (
                <button
                  key={w}
                  onClick={() => { onUpdate(drawing.id, { lineWidth: w }); setShowWidths(false); }}
                  className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-mono transition-colors ${
                    drawing.lineWidth === w ? 'bg-white/10 text-cyan-400' : 'text-white/50 hover:bg-white/[0.06]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-white/[0.08]" />

        {/* Lock */}
        <button
          onClick={() => onUpdate(drawing.id, { locked: !drawing.locked })}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/[0.06] transition-colors"
          title={drawing.locked ? 'Unlock' : 'Lock'}
        >
          {drawing.locked
            ? <Lock size={13} className="text-cyan-400" />
            : <Unlock size={13} className="text-white/40" />}
        </button>

        {/* Visibility */}
        <button
          onClick={() => onUpdate(drawing.id, { visible: drawing.visible === false ? true : false })}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/[0.06] transition-colors"
          title={drawing.visible === false ? 'Show' : 'Hide'}
        >
          {drawing.visible === false
            ? <EyeOff size={13} className="text-white/30" />
            : <Eye size={13} className="text-white/40" />}
        </button>

        {/* Clone */}
        <button
          onClick={() => onClone(drawing.id)}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/[0.06] transition-colors"
          title="Clone"
        >
          <Copy size={13} className="text-white/40" />
        </button>

        <div className="w-px h-5 bg-white/[0.08]" />

        {/* Delete */}
        <button
          onClick={() => onDelete(drawing.id)}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/[0.06] hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={13} className="text-white/40" />
        </button>
      </div>
    </div>
  );
}
