import { useState } from 'react';
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

export default function RightSidebar() {
  const [activePanel, setActivePanel] = useState<RightPanel>('watchlist');

  const togglePanel = (id: RightPanel) => {
    setActivePanel(prev => prev === id ? null : id);
  };

  return (
    <div className="flex h-full shrink-0">
      {/* Panel content */}
      {activePanel === 'watchlist' && <Watchlist />}
      {activePanel === 'advanced' && <AdvancedWatchlist onClose={() => setActivePanel('watchlist')} />}
      {activePanel === 'alerts' && <AlertsPanel />}
      {activePanel === 'objects' && <ObjectTreePanel />}
      {activePanel === 'chat' && (
        <div className="flex flex-col w-[300px] min-w-0 bg-toolbar-bg border-l border-chart-border items-center justify-center">
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
