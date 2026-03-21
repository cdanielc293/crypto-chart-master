import type { Drawing } from '@/types/chart';
import { Copy, Trash2, Lock, Unlock, Minus, Plus, Type, MoreHorizontal, GripVertical, Eye, Settings } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const COLORS = ['#2962ff', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#ffeb3b', '#ffffff', '#787b86'];

const LINE_STYLES: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'solid', label: 'Line', icon: <span className="inline-block w-5 border-t-2 border-current" /> },
  { value: 'dashed', label: 'Dashed line', icon: <span className="inline-block w-5 border-t-2 border-dashed border-current" /> },
  { value: 'dotted', label: 'Dotted line', icon: <span className="inline-block w-5 border-t-2 border-dotted border-current" /> },
];

interface Props {
  x: number;
  y: number;
  drawing: Drawing | null;
  onUpdate: (updates: Partial<Drawing>) => void;
  onClone: () => void;
  onDelete: () => void;
  onOpenSettings?: () => void;
}

export default function FloatingToolbar({ x, y, drawing, onUpdate, onClone, onDelete, onOpenSettings }: Props) {
  const [showColors, setShowColors] = useState(false);
  const [showLineStyles, setShowLineStyles] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textValue, setTextValue] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowColors(false);
        setShowLineStyles(false);
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!drawing) return null;

  const lineStyle = drawing.props?.lineStyle || 'solid';
  const currentStyleIcon = LINE_STYLES.find(s => s.value === lineStyle)?.icon || LINE_STYLES[0].icon;
  const hasText = drawing.props?.text && drawing.props.text.trim().length > 0;

  const updateProps = (updates: Record<string, any>) => {
    onUpdate({ props: { ...drawing.props, ...updates } });
  };

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex items-center gap-0.5 bg-card border border-chart-border rounded-md shadow-xl px-1 py-0.5"
      style={{ left: Math.max(5, x - 160), top: Math.max(5, y), pointerEvents: 'auto' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Drag handle */}
      <div className="w-6 h-7 flex items-center justify-center text-muted-foreground cursor-grab">
        <GripVertical size={12} />
      </div>

      {/* Color picker */}
      <div className="relative">
        <button onClick={() => { setShowColors(!showColors); setShowLineStyles(false); setShowMore(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors" title="Color">
          <div className="w-4 h-4 rounded-sm border border-chart-border" style={{ backgroundColor: drawing.color }} />
        </button>
        {showColors && (
          <div className="absolute top-full left-0 mt-1 bg-card border border-chart-border rounded-md shadow-xl p-1.5 grid grid-cols-5 gap-1 min-w-[120px]">
            {COLORS.map(c => (
              <button key={c} onClick={() => { onUpdate({ color: c }); setShowColors(false); }} className="w-5 h-5 rounded-sm border border-chart-border hover:scale-125 transition-transform" style={{ backgroundColor: c }} />
            ))}
          </div>
        )}
      </div>

      {/* Line width: minus / value / plus */}
      <div className="w-px h-5 bg-chart-border mx-0.5" />
      <button onClick={() => onUpdate({ lineWidth: Math.max(1, drawing.lineWidth - 1) })} className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors text-muted-foreground hover:text-foreground" title="Thinner"><Minus size={12} /></button>
      <span className="text-[10px] text-muted-foreground w-6 text-center">{drawing.lineWidth}px</span>
      <button onClick={() => onUpdate({ lineWidth: Math.min(8, drawing.lineWidth + 1) })} className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors text-muted-foreground hover:text-foreground" title="Thicker"><Plus size={12} /></button>

      {/* Line style dropdown */}
      <div className="relative">
        <button
          onClick={() => { setShowLineStyles(!showLineStyles); setShowColors(false); setShowMore(false); }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors text-muted-foreground hover:text-foreground"
          title="Line style"
        >
          {currentStyleIcon}
        </button>
        {showLineStyles && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-card border border-chart-border rounded-md shadow-xl py-1 min-w-[140px]">
            {LINE_STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => { updateProps({ lineStyle: s.value }); setShowLineStyles(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors ${lineStyle === s.value ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-chart-border mx-0.5" />

      {/* Text toggle + input */}
      <div className="relative">
        <button
          onClick={() => {
            if (showTextInput) {
              setShowTextInput(false);
            } else {
              setTextValue(drawing.props?.text || '');
              setShowTextInput(true);
              setShowColors(false);
              setShowLineStyles(false);
              setShowMore(false);
              setTimeout(() => textInputRef.current?.focus(), 50);
            }
          }}
          className={`w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors ${hasText ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          title="Add text"
        >
          <Type size={13} />
        </button>
        {showTextInput && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-card border border-chart-border rounded-md shadow-xl p-2 min-w-[200px]">
            <input
              ref={textInputRef}
              type="text"
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  updateProps({ text: textValue });
                  setShowTextInput(false);
                } else if (e.key === 'Escape') {
                  setShowTextInput(false);
                }
                e.stopPropagation();
              }}
              placeholder="Enter text..."
              className="w-full bg-muted border border-border rounded px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <div className="flex justify-end gap-1 mt-1.5">
              {hasText && (
                <button
                  onClick={() => { updateProps({ text: '' }); setShowTextInput(false); }}
                  className="text-xs text-destructive hover:text-destructive/80 px-2 py-0.5"
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => { updateProps({ text: textValue }); setShowTextInput(false); }}
                className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded hover:bg-primary/90"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-chart-border mx-0.5" />

      {/* Lock */}
      <button onClick={() => onUpdate({ locked: !drawing.locked })} className={`w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors ${drawing.locked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} title={drawing.locked ? 'Unlock' : 'Lock'}>{drawing.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>

      {/* Visibility */}
      <button onClick={() => onUpdate({ visible: !drawing.visible })} className={`w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors ${!drawing.visible ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} title={drawing.visible ? 'Hide' : 'Show'}>
        <Eye size={13} />
      </button>

      {/* Clone */}
      <button onClick={onClone} className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors text-muted-foreground hover:text-foreground" title="Clone"><Copy size={13} /></button>

      {/* Delete */}
      <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors text-muted-foreground hover:text-destructive" title="Delete"><Trash2 size={13} /></button>

      {/* More menu */}
      <div className="relative">
        <button
          onClick={() => { setShowMore(!showMore); setShowColors(false); setShowLineStyles(false); }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-toolbar-hover transition-colors text-muted-foreground hover:text-foreground"
          title="More"
        >
          <MoreHorizontal size={13} />
        </button>
        {showMore && (
          <div className="absolute top-full right-0 mt-1 bg-card border border-chart-border rounded-md shadow-xl py-1 min-w-[150px]">
            {onOpenSettings && (
              <button
                onClick={() => { onOpenSettings(); setShowMore(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Settings size={14} />
                Settings…
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
