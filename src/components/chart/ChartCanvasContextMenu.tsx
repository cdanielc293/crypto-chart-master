import { RotateCcw, Settings, Trash2, BarChart3, Pencil } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

export type CanvasMenuOpenMode = 'open' | 'pass' | 'block';

interface Props {
  children: React.ReactNode;
  getOpenMode: (event: React.MouseEvent<HTMLElement>) => CanvasMenuOpenMode;
  onResetChartView: () => void;
  onOpenSettings: () => void;
  onOpenSymbolSettings: () => void;
  onRemoveIndicators: () => void;
  onRemoveDrawings: () => void;
  indicatorCount: number;
  drawingCount: number;
  chartTypeLabel?: string;
}

export default function ChartCanvasContextMenu({
  children,
  getOpenMode,
  onResetChartView,
  onOpenSettings,
  onOpenSymbolSettings,
  onRemoveIndicators,
  indicatorCount,
  chartTypeLabel,
}: Props) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        onContextMenuCapture={(event) => {
          const mode = getOpenMode(event as React.MouseEvent<HTMLElement>);
          if (mode === 'block') event.preventDefault();
        }}
      >
        {children}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64 bg-[hsl(var(--card))] border-[hsl(var(--border))]">
        <ContextMenuItem onClick={onOpenSymbolSettings} className="gap-2">
          <BarChart3 size={14} className="text-muted-foreground" />
          {chartTypeLabel || 'Symbol'} settings…
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onResetChartView} className="gap-2">
          <RotateCcw size={14} className="text-muted-foreground" />
          Reset chart view
          <span className="ml-auto text-xs text-muted-foreground">Alt + R</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onRemoveIndicators}
          disabled={indicatorCount === 0}
          className="gap-2"
        >
          <Trash2 size={14} className="text-muted-foreground" />
          {indicatorCount > 0 ? `Remove ${indicatorCount} indicator${indicatorCount > 1 ? 's' : ''}` : 'No indicators to remove'}
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onOpenSettings} className="gap-2">
          <Settings size={14} className="text-muted-foreground" />
          Settings…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
