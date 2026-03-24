// New UI — Professional modular trading terminal
// Fully isolated from Classic view
import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import './styles.css';
import { useNewUILayout } from './useNewUILayout';
import WidgetHub from './WidgetHub';
import WidgetWrapper from './WidgetWrapper';
import WidgetRenderer from './widgets/WidgetRenderer';

export default function NewUIView() {
  const {
    widgets,
    addWidget,
    removeWidget,
    updateWidgetPosition,
    toggleWidgetLock,
    focusWidget,
    favorites,
    toggleFavorite,
  } = useNewUILayout();

  const [hubOpen, setHubOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const updateSize = () => {
      setWorkspaceSize({
        width: workspace.clientWidth,
        height: workspace.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(workspace);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="newui-root newui-grid-bg flex flex-col h-full w-full overflow-hidden">
      <div className="flex-1 p-3 min-h-0">
        <div
          ref={workspaceRef}
          className="relative h-full w-full rounded-lg border border-white/[0.05] bg-black/10 overflow-hidden"
          
        >
          <button
            className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-white/60 hover:text-white/80 transition-colors text-[10px] uppercase tracking-wider font-mono"
            onClick={() => setHubOpen(true)}
          >
            <Plus size={13} /> Add Widget
          </button>

          {widgets.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                className="newui-slot px-6 py-5 flex flex-col items-center gap-2"
                onClick={() => setHubOpen(true)}
              >
                <div className="w-10 h-10 rounded border border-dashed border-white/[0.12] flex items-center justify-center text-white/30">
                  <Plus size={18} />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-white/35">Add first widget</span>
              </button>
            </div>
          )}

          {widgets.map((widget, index) => (
            <div
              key={widget.id}
              className="absolute"
              style={{
                left: widget.position.x,
                top: widget.position.y,
                width: widget.position.width,
                height: widget.position.height,
                zIndex: index + 1,
              }}
            >
              <WidgetWrapper
                widget={widget}
                onRemove={removeWidget}
                onUpdatePosition={updateWidgetPosition}
                onToggleLock={toggleWidgetLock}
                onFocus={focusWidget}
                workspaceSize={workspaceSize}
              >
                <WidgetRenderer widget={widget} />
              </WidgetWrapper>
            </div>
          ))}
        </div>
      </div>

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
