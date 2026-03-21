import { useState, useRef } from 'react';
import type { MultiChartGrid, LayoutSyncOptions } from '@/types/layout';
import { DEFAULT_SYNC_OPTIONS } from '@/types/layout';
import { LayoutGrid } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Props {
  grid: MultiChartGrid;
  onGridChange: (g: MultiChartGrid) => void;
  syncOptions: LayoutSyncOptions;
  onSyncChange: (o: LayoutSyncOptions) => void;
}

type GridOption = { value: MultiChartGrid; cols: number; rows: number; cells: number[][]; };

// Define grid layouts by row count
const gridGroups: { count: number; options: GridOption[] }[] = [
  { count: 1, options: [
    { value: '1', cols: 1, rows: 1, cells: [[1]] },
  ]},
  { count: 2, options: [
    { value: '2h', cols: 2, rows: 1, cells: [[1,1]] },
    { value: '2v', cols: 1, rows: 2, cells: [[1],[1]] },
  ]},
  { count: 3, options: [
    { value: '3h1', cols: 3, rows: 1, cells: [[1,1,1]] },
    { value: '3h2', cols: 2, rows: 2, cells: [[2,1],[0,1]] }, // 1 big left, 2 stacked right
    { value: '3v1', cols: 2, rows: 2, cells: [[1,1],[2,0]] }, // 2 top, 1 big bottom
  ]},
  { count: 4, options: [
    { value: '4', cols: 2, rows: 2, cells: [[1,1],[1,1]] },
    { value: '4h1', cols: 4, rows: 1, cells: [[1,1,1,1]] },
    { value: '4v1', cols: 1, rows: 4, cells: [[1],[1],[1],[1]] },
  ]},
  { count: 6, options: [
    { value: '6h', cols: 3, rows: 2, cells: [[1,1,1],[1,1,1]] },
    { value: '6v', cols: 2, rows: 3, cells: [[1,1],[1,1],[1,1]] },
  ]},
  { count: 8, options: [
    { value: '8', cols: 4, rows: 2, cells: [[1,1,1,1],[1,1,1,1]] },
  ]},
  { count: 9, options: [
    { value: '9', cols: 3, rows: 3, cells: [[1,1,1],[1,1,1],[1,1,1]] },
  ]},
  { count: 12, options: [
    { value: '12', cols: 4, rows: 3, cells: [[1,1,1,1],[1,1,1,1],[1,1,1,1]] },
  ]},
  { count: 16, options: [
    { value: '16', cols: 4, rows: 4, cells: [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]] },
  ]},
];

function GridIcon({ option, size = 28, active }: { option: GridOption; size?: number; active?: boolean }) {
  const gap = 1;
  const cellW = (size - gap * (option.cols - 1)) / option.cols;
  const cellH = (size - gap * (option.rows - 1)) / option.rows;
  
  return (
    <svg width={size} height={size} className={active ? 'text-primary' : 'text-muted-foreground'}>
      {option.cells.flatMap((row, ri) =>
        row.map((cell, ci) => {
          if (cell === 0) return null;
          const spanW = cell > 1 ? cell : 1;
          return (
            <rect
              key={`${ri}-${ci}`}
              x={ci * (cellW + gap)}
              y={ri * (cellH + gap)}
              width={cellW * spanW + gap * (spanW - 1)}
              height={cellH}
              rx={1.5}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            />
          );
        })
      )}
    </svg>
  );
}

export default function MultiChartLayoutSelector({ grid, onGridChange, syncOptions, onSyncChange }: Props) {
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
          <div className="absolute top-full right-0 mt-1 z-50 w-[320px] bg-card border border-chart-border rounded-md shadow-xl py-3 px-4">
            {/* Grid options */}
            {gridGroups.map(group => (
              <div key={group.count} className="flex items-center gap-2 mb-2">
                <span className="text-[12px] text-muted-foreground w-6 text-right mr-1">{group.count}</span>
                {group.options.map(option => (
                  <button
                    key={option.value}
                    onClick={() => { onGridChange(option.value); }}
                    className={`p-1.5 rounded transition-colors ${
                      grid === option.value
                        ? 'bg-toolbar-active'
                        : 'hover:bg-toolbar-hover'
                    }`}
                  >
                    <GridIcon option={option} active={grid === option.value} />
                  </button>
                ))}
              </div>
            ))}

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
