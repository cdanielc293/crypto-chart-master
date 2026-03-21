import { useState } from 'react';
import type { LayoutSyncOptions, GridLayout } from '@/types/layout';
import { DEFAULT_SYNC_OPTIONS, ALL_GRID_LAYOUTS, getLayoutsByCount } from '@/types/layout';
import { LayoutGrid } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Props {
  gridLayout: GridLayout;
  onGridLayoutChange: (layout: GridLayout) => void;
  syncOptions: LayoutSyncOptions;
  onSyncChange: (o: LayoutSyncOptions) => void;
}

function GridIcon({ layout, size = 28, active }: { layout: GridLayout; size?: number; active?: boolean }) {
  const gap = 1.5;
  const pad = 1;

  return (
    <svg width={size} height={size} className={active ? 'text-primary' : 'text-muted-foreground'}>
      {layout.cells.map((cell, i) => {
        const cellW = (size - pad * 2 - gap * (layout.cols - 1)) / layout.cols;
        const cellH = (size - pad * 2 - gap * (layout.rows - 1)) / layout.rows;
        return (
          <rect
            key={i}
            x={pad + cell.c * (cellW + gap)}
            y={pad + cell.r * (cellH + gap)}
            width={cellW * cell.w + gap * (cell.w - 1)}
            height={cellH * cell.h + gap * (cell.h - 1)}
            rx={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
          />
        );
      })}
    </svg>
  );
}

const layoutsByCount = getLayoutsByCount();
const sortedCounts = Array.from(layoutsByCount.keys()).sort((a, b) => a - b);

export default function MultiChartLayoutSelector({ gridLayout, onGridLayoutChange, syncOptions, onSyncChange }: Props) {
  const [open, setOpen] = useState(false);

  const toggleSync = (key: keyof LayoutSyncOptions) => {
    onSyncChange({ ...syncOptions, [key]: !syncOptions[key] });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 rounded text-muted-foreground hover:bg-toolbar-hover hover:text-foreground text-[13px]"
        title="Layout setup"
      >
        <LayoutGrid size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 z-50 w-[380px] bg-card border border-chart-border rounded-md shadow-xl py-3 px-4 max-h-[600px] overflow-y-auto">
            {sortedCounts.map(count => {
              const layouts = layoutsByCount.get(count)!;
              return (
                <div key={count} className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[11px] text-muted-foreground w-5 text-right mr-1 shrink-0">{count}</span>
                  {layouts.map(layout => (
                    <button
                      key={layout.id}
                      onClick={() => onGridLayoutChange(layout)}
                      className={`p-1 rounded transition-colors ${
                        gridLayout.id === layout.id ? 'bg-toolbar-active' : 'hover:bg-toolbar-hover'
                      }`}
                    >
                      <GridIcon layout={layout} active={gridLayout.id === layout.id} />
                    </button>
                  ))}
                </div>
              );
            })}

            {/* Sync options */}
            <div className="h-px bg-chart-border my-3" />
            <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-2">
              Sync in layout
            </div>
            {([
              ['symbol', 'Symbol'],
              ['interval', 'Interval'],
              ['crosshair', 'Crosshair'],
              ['time', 'Time'],
              ['dateRange', 'Date range'],
            ] as [keyof LayoutSyncOptions, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between py-1.5">
                <span className="text-[13px] text-foreground font-medium">
                  {label} <span className="text-muted-foreground text-[11px]">ⓘ</span>
                </span>
                <Switch
                  checked={syncOptions[key]}
                  onCheckedChange={() => toggleSync(key)}
                  className="scale-75"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
