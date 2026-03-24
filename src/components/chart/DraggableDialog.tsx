import { useState, useCallback, useRef, useEffect, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react';

interface Position {
  x: number;
  y: number;
}

function getSavedPosition(id: string): Position | null {
  try {
    const saved = localStorage.getItem(`dialog-pos-${id}`);
    if (!saved) return null;
    const pos = JSON.parse(saved);
    // Validate position is still on screen
    if (
      typeof pos.x === 'number' && typeof pos.y === 'number' &&
      pos.x >= -200 && pos.y >= -50 &&
      pos.x < window.innerWidth - 50 && pos.y < window.innerHeight - 50
    ) {
      return pos;
    }
  } catch {}
  return null;
}

function savePosition(id: string, pos: Position) {
  localStorage.setItem(`dialog-pos-${id}`, JSON.stringify(pos));
}

interface DraggableDialogProps {
  /** Unique ID for position persistence */
  id: string;
  /** Whether the dialog is visible */
  open: boolean;
  /** Close callback */
  onClose: () => void;
  /** Title shown in the drag handle header */
  title: string;
  /** Dialog content */
  children: ReactNode;
  /** Width class or style — default w-[720px] */
  className?: string;
  /** Whether to show a backdrop overlay */
  backdrop?: boolean;
  /** z-index class — default z-[100] */
  zClass?: string;
  /** Additional header content (right side) */
  headerExtra?: ReactNode;
}

export default function DraggableDialog({
  id,
  open,
  onClose,
  title,
  children,
  className = 'w-[720px] max-w-[90vw]',
  backdrop = true,
  zClass = 'z-[100]',
  headerExtra,
}: DraggableDialogProps) {
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);

  // Load saved position on open
  useEffect(() => {
    if (open) {
      const saved = getSavedPosition(id);
      setPosition(saved);
    }
  }, [open, id]);

  const handleMouseDown = useCallback((e: ReactMouseEvent) => {
    // Only drag from the header area
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const x = e.clientX - dragOffset.current.x;
      const y = e.clientY - dragOffset.current.y;
      setPosition({ x, y });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position
      setPosition(prev => {
        if (prev) savePosition(id, prev);
        return prev;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, id]);

  if (!open) return null;

  const positionStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'none',
      }
    : {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };

  return (
    <div className={`fixed inset-0 ${zClass}`} style={{ pointerEvents: backdrop ? 'auto' : 'none' }}>
      {/* Backdrop */}
      {backdrop && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      )}

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={`${className} max-h-[85vh] bg-card border border-chart-border rounded-xl shadow-2xl flex flex-col overflow-hidden`}
        style={{ ...positionStyle, pointerEvents: 'auto' }}
      >
        {/* Draggable Header */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-b border-chart-border select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-toolbar-hover transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
