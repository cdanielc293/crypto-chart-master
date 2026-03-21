import { useChart } from '@/context/ChartContext';
import type { DrawingTool } from '@/types/chart';
import {
  MousePointer2,
  TrendingUp,
  Minus,
  GitBranch,
  Type,
  Trash2,
  Crosshair,
} from 'lucide-react';

const tools: { tool: DrawingTool; icon: React.ReactNode; label: string }[] = [
  { tool: 'cursor', icon: <MousePointer2 size={18} />, label: 'Cursor' },
  { tool: 'trendline', icon: <TrendingUp size={18} />, label: 'Trend Line' },
  { tool: 'horizontalline', icon: <Minus size={18} />, label: 'Horizontal Line' },
  { tool: 'ray', icon: <Crosshair size={18} />, label: 'Ray' },
  { tool: 'fibonacci', icon: <GitBranch size={18} />, label: 'Fibonacci' },
];

export default function LeftToolbar() {
  const { drawingTool, setDrawingTool, drawings, removeDrawing } = useChart();

  return (
    <div className="flex flex-col items-center w-11 bg-toolbar-bg border-r border-chart-border py-2 gap-0.5 select-none">
      {tools.map(t => (
        <button
          key={t.tool}
          onClick={() => setDrawingTool(t.tool)}
          title={t.label}
          className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
            drawingTool === t.tool
              ? 'bg-toolbar-active text-primary-foreground'
              : 'text-muted-foreground hover:bg-toolbar-hover hover:text-foreground'
          }`}
        >
          {t.icon}
        </button>
      ))}

      <div className="flex-1" />

      {drawings.length > 0 && (
        <button
          onClick={() => drawings.forEach(d => removeDrawing(d.id))}
          title="Clear all drawings"
          className="w-9 h-9 flex items-center justify-center rounded text-muted-foreground hover:bg-toolbar-hover hover:text-destructive"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
