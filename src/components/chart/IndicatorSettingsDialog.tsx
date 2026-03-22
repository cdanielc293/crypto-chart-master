import { useState, useEffect, useMemo } from 'react';
import DraggableDialog from './DraggableDialog';
import { getIndicator } from '@/lib/indicators/registry';
import type { IndicatorInstance, LineStyleType } from '@/types/indicators';
import { resetInstance } from '@/types/indicators';

interface Props {
  open: boolean;
  onClose: () => void;
  instanceId: string;
  instance: IndicatorInstance;
  onApply: (instance: IndicatorInstance) => void;
}

const SOURCE_OPTIONS = [
  { value: 'close', label: 'Close' }, { value: 'open', label: 'Open' },
  { value: 'high', label: 'High' }, { value: 'low', label: 'Low' },
  { value: 'hl2', label: 'HL/2' }, { value: 'hlc3', label: 'HLC/3' },
  { value: 'ohlc4', label: 'OHLC/4' },
];

const LINE_STYLES: { value: LineStyleType; label: string }[] = [
  { value: 'solid', label: '━━━' }, { value: 'dashed', label: '┅┅┅' }, { value: 'dotted', label: '╌╌╌' },
];

function Tabs({ active, tabs, onChange }: { active: string; tabs: string[]; onChange: (t: string) => void }) {
  return (
    <div className="flex border-b border-chart-border">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`px-4 py-2.5 text-[13px] font-medium capitalize relative ${active === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          {t}
          {active === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      ))}
    </div>
  );
}

export default function IndicatorSettingsDialog({ open, onClose, instanceId, instance, onApply }: Props) {
  const def = getIndicator(instance.definitionId);
  const [local, setLocal] = useState<IndicatorInstance>(instance);
  const [tab, setTab] = useState('inputs');

  useEffect(() => { setLocal(instance); }, [instance, open]);

  if (!def) return null;

  const updateParam = (key: string, val: any) => {
    setLocal(prev => ({ ...prev, params: { ...prev.params, [key]: val } }));
  };

  const updateLineStyle = (lineKey: string, updates: Partial<IndicatorInstance['lineStyles'][string]>) => {
    setLocal(prev => ({
      ...prev,
      lineStyles: { ...prev.lineStyles, [lineKey]: { ...prev.lineStyles[lineKey], ...updates } },
    }));
  };

  const handleReset = () => {
    setLocal(resetInstance(def));
  };

  return (
    <DraggableDialog id={`ind-settings-${instanceId}`} open={open} onClose={onClose} title={def.shortName} className="w-[400px] max-w-[90vw]">
      <Tabs active={tab} tabs={def.params.length > 0 ? ['inputs', 'style'] : ['style']} onChange={setTab} />

      <div className="min-h-[180px] max-h-[400px] overflow-y-auto">
        {tab === 'inputs' && (
          <div className="divide-y divide-chart-border/30">
            {def.params.map(p => (
              <div key={p.key} className="flex items-center justify-between py-2.5 px-4">
                <span className="text-[13px] text-foreground">{p.label}</span>
                {p.type === 'number' && (
                  <input type="number" value={local.params[p.key] ?? p.default}
                    onChange={e => updateParam(p.key, Number(e.target.value) || 0)}
                    min={p.min} max={p.max} step={p.step}
                    className="w-20 bg-muted/40 border border-chart-border rounded px-2 py-1 text-[13px] text-foreground text-right outline-none focus:border-primary" />
                )}
                {p.type === 'source' && (
                  <select value={local.params[p.key] ?? 'close'} onChange={e => updateParam(p.key, e.target.value)}
                    className="bg-muted/40 border border-chart-border rounded px-2 py-1 text-[13px] text-foreground outline-none cursor-pointer">
                    {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
                {p.type === 'select' && p.options && (
                  <select value={local.params[p.key] ?? p.default} onChange={e => updateParam(p.key, e.target.value)}
                    className="bg-muted/40 border border-chart-border rounded px-2 py-1 text-[13px] text-foreground outline-none cursor-pointer">
                    {p.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
                {p.type === 'boolean' && (
                  <input type="checkbox" checked={local.params[p.key] ?? p.default}
                    onChange={e => updateParam(p.key, e.target.checked)}
                    className="accent-primary w-4 h-4 cursor-pointer" />
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'style' && (
          <div className="divide-y divide-chart-border/30">
            {def.lines.map(l => {
              const ls = local.lineStyles[l.key] || { color: l.color, width: l.width, style: l.style, visible: l.visible };
              return (
                <div key={l.key} className="flex items-center gap-3 py-2.5 px-4">
                  <input type="checkbox" checked={ls.visible}
                    onChange={e => updateLineStyle(l.key, { visible: e.target.checked })}
                    className="accent-primary w-4 h-4 cursor-pointer" />
                  <span className="text-[13px] text-foreground w-16">{l.label}</span>
                  <div className="relative w-8 h-6 rounded border border-chart-border overflow-hidden cursor-pointer">
                    <input type="color" value={ls.color} onChange={e => updateLineStyle(l.key, { color: e.target.value })}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                    <div className="w-full h-full" style={{ backgroundColor: ls.color }} />
                  </div>
                  <select value={String(ls.width)} onChange={e => updateLineStyle(l.key, { width: Number(e.target.value) })}
                    className="bg-muted/40 border border-chart-border rounded px-2 py-1 text-[13px] text-foreground outline-none cursor-pointer">
                    {[1,2,3,4].map(w => <option key={w} value={w}>{w}px</option>)}
                  </select>
                  <select value={ls.style} onChange={e => updateLineStyle(l.key, { style: e.target.value as LineStyleType })}
                    className="bg-muted/40 border border-chart-border rounded px-2 py-1 text-[13px] text-foreground outline-none cursor-pointer">
                    {LINE_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-chart-border">
        <button onClick={handleReset} className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground rounded border border-chart-border hover:bg-muted/30 transition-colors">
          Defaults
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-[13px] text-muted-foreground hover:text-foreground rounded border border-chart-border hover:bg-muted/30 transition-colors">Cancel</button>
          <button onClick={() => { onApply(local); onClose(); }} className="px-4 py-1.5 text-[13px] bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors font-medium">Ok</button>
        </div>
      </div>
    </DraggableDialog>
  );
}
