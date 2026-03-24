import { useState } from 'react';
import { Plus, Search, ArrowDownUp, MoreHorizontal, Bell } from 'lucide-react';

export default function AlertsPanel({ panelWidth }: { panelWidth: number }) {
  const [tab, setTab] = useState<'alerts' | 'log'>('alerts');

  return (
    <div className="flex flex-col min-w-0 bg-toolbar-bg border-l border-chart-border select-none overflow-hidden" style={{ width: panelWidth }}>
      {/* Tabs */}
      <div className="flex border-b border-chart-border">
        <button
          onClick={() => setTab('alerts')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            tab === 'alerts'
              ? 'text-foreground bg-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Alerts
        </button>
        <button
          onClick={() => setTab('log')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            tab === 'log'
              ? 'text-foreground bg-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Log
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-chart-border">
        <button className="p-1 text-muted-foreground hover:text-foreground">
          <Plus size={14} />
        </button>
        <div className="flex items-center gap-1">
          <button className="p-1 text-muted-foreground hover:text-foreground">
            <Search size={14} />
          </button>
          <button className="p-1 text-muted-foreground hover:text-foreground">
            <ArrowDownUp size={14} />
          </button>
          <button className="p-1 text-muted-foreground hover:text-foreground">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <div className="relative w-16 h-16 text-muted-foreground">
          <Bell size={48} strokeWidth={1} className="mx-auto" />
          <Plus size={16} className="absolute bottom-0 right-2" />
        </div>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Alerts notify you instantly when your conditions are met. Create one to get started.
        </p>
        <button className="px-4 py-1.5 text-xs font-medium rounded border border-chart-border text-foreground hover:bg-toolbar-hover transition-colors">
          Create alert
        </button>
      </div>
    </div>
  );
}
