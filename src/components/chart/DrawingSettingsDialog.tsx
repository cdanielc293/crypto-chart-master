import { useState, useEffect } from 'react';
import { X, Pencil } from 'lucide-react';
import DraggableDialog from './DraggableDialog';
import type { Drawing } from '@/types/chart';

const LINE_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

const EXTEND_OPTIONS = [
  { value: 'none', label: "Don't extend" },
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
  { value: 'both', label: 'Both' },
];

const TEXT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

const TABS = ['Style', 'Text', 'Coordinates', 'Visibility'] as const;
type Tab = typeof TABS[number];

interface Props {
  open: boolean;
  drawing: Drawing | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Drawing>) => void;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-muted border border-border rounded px-2 py-1 text-sm text-foreground min-w-[140px]"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="rounded border-border" />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

export default function DrawingSettingsDialog({ open, drawing, onClose, onUpdate }: Props) {
  const [tab, setTab] = useState<Tab>('Style');
  const [localProps, setLocalProps] = useState<Record<string, any>>({});
  const [localColor, setLocalColor] = useState('');
  const [localLineWidth, setLocalLineWidth] = useState(2);

  useEffect(() => {
    if (open && drawing) {
      setLocalProps({ ...drawing.props });
      setLocalColor(drawing.color);
      setLocalLineWidth(drawing.lineWidth);
    }
  }, [open, drawing?.id]);

  if (!open || !drawing) return null;

  const toolLabel = drawing.type.charAt(0).toUpperCase() + drawing.type.slice(1).replace(/([A-Z])/g, ' $1');

  const updateLocal = (key: string, value: any) => {
    setLocalProps(prev => ({ ...prev, [key]: value }));
  };

  const handleOk = () => {
    onUpdate({ color: localColor, lineWidth: localLineWidth, props: { ...drawing.props, ...localProps } });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <DraggableDialog
      id="drawing-settings"
      open={open}
      onClose={handleCancel}
      title={toolLabel}
      className="w-[380px]"
      zClass="z-[200]"
    >

        {/* Tabs */}
        <div className="flex gap-4 px-4 pt-3 border-b border-border">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 text-sm transition-colors ${tab === t ? 'text-foreground border-b-2 border-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'Style' && (
            <>
              {/* Line color + style */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Line</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localColor}
                    onChange={e => setLocalColor(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <div className="flex border border-border rounded overflow-hidden">
                    {LINE_STYLES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => updateLocal('lineStyle', s.value)}
                        className={`px-2 py-1.5 text-xs ${(localProps.lineStyle || 'solid') === s.value ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}
                        title={s.label}
                      >
                        {s.value === 'solid' && <span className="inline-block w-4 border-t-2 border-current" />}
                        {s.value === 'dashed' && <span className="inline-block w-4 border-t-2 border-dashed border-current" />}
                        {s.value === 'dotted' && <span className="inline-block w-4 border-t-2 border-dotted border-current" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Line width */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Width</span>
                <select
                  value={localLineWidth}
                  onChange={e => setLocalLineWidth(Number(e.target.value))}
                  className="bg-muted border border-border rounded px-2 py-1 text-sm text-foreground min-w-[80px]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(w => (
                    <option key={w} value={w}>{w}px</option>
                  ))}
                </select>
              </div>

              {/* Extend */}
              <SelectField
                label="Extend"
                value={localProps.extend || 'none'}
                options={EXTEND_OPTIONS}
                onChange={v => updateLocal('extend', v)}
              />

              <div className="space-y-2">
                <CheckField label="Middle point" checked={!!localProps.middlePoint} onChange={v => updateLocal('middlePoint', v)} />
                <CheckField label="Price labels" checked={!!localProps.priceLabels} onChange={v => updateLocal('priceLabels', v)} />
              </div>

              {/* Info section */}
              <div className="pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Info</span>
                <div className="mt-2 space-y-3">
                  <SelectField
                    label="Stats"
                    value={localProps.stats || 'hidden'}
                    options={[{ value: 'hidden', label: 'Hidden' }, { value: 'compact', label: 'Compact' }, { value: 'detailed', label: 'Detailed' }]}
                    onChange={v => updateLocal('stats', v)}
                  />
                  <SelectField
                    label="Stats position"
                    value={localProps.statsPosition || 'right'}
                    options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
                    onChange={v => updateLocal('statsPosition', v)}
                  />
                  <CheckField label="Always show stats" checked={!!localProps.alwaysShowStats} onChange={v => updateLocal('alwaysShowStats', v)} />
                </div>
              </div>
            </>
          )}

          {tab === 'Text' && (
            <>
              {/* Text styling */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={localProps.textColor || '#ffffff'}
                  onChange={e => updateLocal('textColor', e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                />
                <select
                  value={localProps.textSize || 14}
                  onChange={e => updateLocal('textSize', Number(e.target.value))}
                  className="bg-muted border border-border rounded px-2 py-1 text-sm text-foreground min-w-[60px]"
                >
                  {TEXT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={() => updateLocal('textBold', !localProps.textBold)}
                  className={`w-8 h-8 flex items-center justify-center rounded border text-sm font-bold transition-colors ${localProps.textBold ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  B
                </button>
                <button
                  onClick={() => updateLocal('textItalic', !localProps.textItalic)}
                  className={`w-8 h-8 flex items-center justify-center rounded border text-sm italic transition-colors ${localProps.textItalic ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  I
                </button>
              </div>

              {/* Text input */}
              <textarea
                value={localProps.text || ''}
                onChange={e => updateLocal('text', e.target.value)}
                placeholder="Add text"
                className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground resize-none h-20 focus:border-primary focus:outline-none"
              />

              {/* Text alignment */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Text alignment</span>
                <div className="flex gap-2">
                  <select
                    value={localProps.textVAlign || 'middle'}
                    onChange={e => updateLocal('textVAlign', e.target.value)}
                    className="bg-muted border border-border rounded px-2 py-1 text-sm text-foreground"
                  >
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                  <select
                    value={localProps.textHAlign || 'center'}
                    onChange={e => updateLocal('textHAlign', e.target.value)}
                    className="bg-muted border border-border rounded px-2 py-1 text-sm text-foreground"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {tab === 'Coordinates' && (
            <>
              {drawing.points.map((p, i) => (
                <div key={i} className="space-y-2 p-3 bg-muted rounded border border-border">
                  <span className="text-xs text-muted-foreground uppercase">Point {i + 1}</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <span className="text-sm text-foreground font-mono">{p.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Time</span>
                    <span className="text-sm text-foreground font-mono">{new Date(p.time * 1000).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'Visibility' && (
            <>
              <CheckField label="Show on all timeframes" checked={localProps.showAllTimeframes !== false} onChange={v => updateLocal('showAllTimeframes', v)} />
              <div className="pt-2 border-t border-border space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Show on timeframes</span>
                {['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M'].map(tf => (
                  <CheckField
                    key={tf}
                    label={tf}
                    checked={localProps.showAllTimeframes !== false || (localProps.visibleTimeframes || []).includes(tf)}
                    onChange={() => {
                      const current = localProps.visibleTimeframes || [];
                      const next = current.includes(tf) ? current.filter((t: string) => t !== tf) : [...current, tf];
                      updateLocal('visibleTimeframes', next);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <select className="bg-muted border border-border rounded px-2 py-1 text-sm text-muted-foreground">
            <option>Template</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleCancel} className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded transition-colors">Cancel</button>
            <button onClick={handleOk} className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Ok</button>
          </div>
        </div>
    </DraggableDialog>
  );
}
