// New UI — Futuristic modular trading terminal
// Fully isolated from Classic view
import { useState } from 'react';
import { Plus } from 'lucide-react';
import './styles.css';
import { useNewUILayout } from './useNewUILayout';
import WidgetHub from './WidgetHub';
import WidgetWrapper from './WidgetWrapper';
import WidgetRenderer from './widgets/WidgetRenderer';

const COLS = 4;
const ROW_HEIGHT = 200;

export default function NewUIView() {
  const { widgets, addWidget, removeWidget, favorites, toggleFavorite } = useNewUILayout();
  const [hubOpen, setHubOpen] = useState(false);

  // Calculate grid rows needed
  const maxRow = widgets.reduce((max, w) => Math.max(max, w.position.row + w.position.rowSpan), 0);
  const totalRows = Math.max(maxRow + 1, 3);

  // Build occupied map
  const occupied = new Set<string>();
  widgets.forEach(w => {
    for (let r = w.position.row; r < w.position.row + w.position.rowSpan; r++) {
      for (let c = w.position.col; c < w.position.col + w.position.colSpan; c++) {
        occupied.add(`${c},${r}`);
      }
    }
  });

  // Empty slots
  const emptySlots: { col: number; row: number }[] = [];
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!occupied.has(`${c},${r}`)) {
        emptySlots.push({ col: c, row: r });
      }
    }
  }

  return (
    <div className="newui-root newui-grid-bg flex flex-col h-full w-full overflow-auto">
      <div className="flex-1 p-4 md:p-6">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridAutoRows: `${ROW_HEIGHT}px`,
          }}
        >
          {/* Placed widgets */}
          {widgets.map(w => (
            <div
              key={w.id}
              style={{
                gridColumn: `${w.position.col + 1} / span ${w.position.colSpan}`,
                gridRow: `${w.position.row + 1} / span ${w.position.rowSpan}`,
              }}
              className="animate-scale-in"
            >
              <WidgetWrapper widget={w} onRemove={removeWidget}>
                <WidgetRenderer widget={w} />
              </WidgetWrapper>
            </div>
          ))}

          {/* Empty slots with + button */}
          {emptySlots.map(slot => (
            <div
              key={`empty-${slot.col}-${slot.row}`}
              style={{
                gridColumn: `${slot.col + 1} / span 1`,
                gridRow: `${slot.row + 1} / span 1`,
              }}
              className="newui-slot flex items-center justify-center group"
              onClick={() => setHubOpen(true)}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl border border-dashed border-[#00f0ff]/15 flex items-center justify-center text-[#00f0ff]/25 group-hover:text-[#00f0ff]/60 group-hover:border-[#00f0ff]/30 transition-all duration-300">
                  <Plus size={20} />
                </div>
                <span className="text-[10px] font-medium tracking-wider text-white/15 group-hover:text-white/30 transition-colors uppercase">
                  Add Widget
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Widget Hub overlay */}
      <WidgetHub
        open={hubOpen}
        onClose={() => setHubOpen(false)}
        onAdd={addWidget}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        activeWidgetTypes={widgets.map(w => w.type)}
      />
    </div>
  );
}
