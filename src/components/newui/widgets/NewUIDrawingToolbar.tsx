import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Copy, Trash2, Lock, Unlock, Eye, EyeOff, GripVertical,
} from 'lucide-react';

const COLORS = ['#2962ff', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#ffeb3b', '#ffffff', '#778ba4'];
const LINE_WIDTHS = [1, 1.5, 2, 3, 4];
const STORAGE_KEY = 'newui-drawing-toolbar-pos';

function loadSavedPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.x === 'number' && typeof p.y === 'number' &&
        p.x >= -200 && p.y >= -50 &&
        p.x < window.innerWidth - 50 && p.y < window.innerHeight - 50) {
      return p;
    }
  } catch {}
  return null;
}

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

  // Dragging state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const posRef = useRef<{ x: number; y: number } | null>(null);

  // On mount or when position prop changes, use saved position or fallback to prop
  useEffect(() => {
    const saved = loadSavedPos();
    if (saved) {
      setPos(saved);
    } else {
      setPos({
        x: Math.max(8, Math.min(position.x - 120, window.innerWidth - 280)),
        y: Math.max(8, position.y - 48),
      });
    }
  }, []); // only on mount — use saved pos

  // If no saved pos exists and the drawing changes, update from prop (first time only)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && !loadSavedPos()) {
      setPos({
        x: Math.max(8, Math.min(position.x - 120, window.innerWidth - 280)),
        y: Math.max(8, position.y - 48),
      });
    }
    initializedRef.current = true;
  }, [position.x, position.y]);

  useEffect(() => {
    setShowColors(false);
    setShowWidths(false);
  }, [drawing.id]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const newPos = {
        x: Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 100)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 50)),
      };
      setPos(newPos);
      posRef.current = newPos;
    };
    const onUp = () => {
      setIsDragging(false);
      if (posRef.current) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current));
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  const currentPos = pos || {
    x: Math.max(8, Math.min(position.x - 120, window.innerWidth - 280)),
    y: Math.max(8, position.y - 48),
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: currentPos.x,
    top: currentPos.y,
    zIndex: 60,
  };

  return (
    <div ref={ref} style={style} className="pointer-events-auto" onMouseDown={e => e.stopPropagation()}>
      <div className={`flex items-center gap-0.5 bg-[#0a1628]/95 backdrop-blur-md border border-white/[0.08] rounded-md shadow-2xl px-1 py-0.5 ${isDragging ? 'cursor-grabbing' : ''}`}>
        {/* Drag handle */}
        <div
          onMouseDown={handleDragStart}
          className={`w-6 h-7 rounded flex items-center justify-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} hover:bg-white/[0.06] transition-colors`}
          title="Drag to move"
        >
          <GripVertical size={13} className="text-white/30" />
        </div>

        <div className="w-px h-5 bg-white/[0.08]" />

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
