import { useState, useRef, useCallback, useEffect } from 'react';
import { BookOpen, Bell, Layers, MessageSquare, BarChart3 } from 'lucide-react';
import Watchlist from './Watchlist';
import AlertsPanel from './AlertsPanel';
import ObjectTreePanel from './ObjectTreePanel';
import AdvancedWatchlist from './AdvancedWatchlist';

type RightPanel = 'watchlist' | 'alerts' | 'objects' | 'chat' | 'advanced' | null;

const TABS: { id: RightPanel; icon: typeof BookOpen; label: string }[] = [
  { id: 'watchlist', icon: BookOpen, label: 'Watchlist' },
  { id: 'advanced', icon: BarChart3, label: 'Advanced' },
  { id: 'alerts', icon: Bell, label: 'Alerts' },
  { id: 'objects', icon: Layers, label: 'Object tree' },
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
];

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 300;

export default function RightSidebar() {
  const [activePanel, setActivePanel] = useState<RightPanel>('watchlist');
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('vizionx-watchlist-width');
    return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parseInt(saved, 10))) : DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const togglePanel = (id: RightPanel) => {
    setActivePanel(prev => prev === id ? null : id);
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = { startX: e.clientX, startWidth: panelWidth };
  }, [panelWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startX - e.clientX;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeRef.current.startWidth + delta));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('vizionx-watchlist-width', String(panelWidth));
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, panelWidth]);

  return (
    <div className="flex h-full shrink-0">
      {/* Resize handle */}
      {activePanel && (
        <div
          onMouseDown={handleResizeStart}
          className={`w-1 cursor-col-resize hover:bg-primary/40 transition-colors shrink-0 ${
            isResizing ? 'bg-primary/40' : 'bg-transparent'
          }`}
        />
      )}

      {/* Panel content */}
      {activePanel === 'watchlist' && <Watchlist panelWidth={panelWidth} />}
      {activePanel === 'advanced' && <AdvancedWatchlist onClose={() => setActivePanel('watchlist')} />}
      {activePanel === 'alerts' && <AlertsPanel />}
      {activePanel === 'objects' && <ObjectTreePanel />}
      {activePanel === 'chat' && (
        <div
          className="flex flex-col min-w-0 bg-toolbar-bg border-l border-chart-border items-center justify-center"
          style={{ width: panelWidth }}
        >
          <p className="text-muted-foreground text-xs">Chat coming soon</p>
        </div>
      )}

      {/* Icon strip */}
      <div className="flex flex-col items-center w-11 shrink-0 bg-toolbar-bg border-l border-chart-border py-2 gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activePanel === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => togglePanel(tab.id)}
              title={tab.label}
              className={`p-2 rounded transition-colors ${
                isActive
                  ? 'text-primary bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover'
              }`}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
