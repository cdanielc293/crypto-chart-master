import { useViewMode, type ViewMode } from '@/context/ViewModeContext';
import { LayoutGrid, BarChart3 } from 'lucide-react';

export default function ViewModeToggle() {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div className="flex items-center bg-toolbar-hover/50 rounded-lg p-0.5 gap-0.5">
      <button
        onClick={() => setViewMode('classic')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-200 ${
          viewMode === 'classic'
            ? 'bg-primary/20 text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover'
        }`}
      >
        <BarChart3 size={13} />
        Classic
      </button>
      <button
        onClick={() => setViewMode('newui')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-200 ${
          viewMode === 'newui'
            ? 'bg-primary/20 text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover'
        }`}
      >
        <LayoutGrid size={13} />
        New UI
      </button>
    </div>
  );
}
