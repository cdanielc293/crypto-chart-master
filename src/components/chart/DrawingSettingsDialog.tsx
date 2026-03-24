import { useState, useEffect, useMemo } from 'react';
import DraggableDialog from './DraggableDialog';
import type { Drawing } from '@/types/chart';
import { Save, Trash2 } from 'lucide-react';

// ─── Template helpers ───
interface DrawingTemplate {
  name: string;
  color: string;
  lineWidth: number;
  props: Record<string, any>;
}

function getTemplatesForType(type: string): DrawingTemplate[] {
  try {
    const raw = localStorage.getItem(`drawing_templates_${type}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTemplatesForType(type: string, templates: DrawingTemplate[]) {
  localStorage.setItem(`drawing_templates_${type}`, JSON.stringify(templates));
}

// Store default template per type (applied automatically to new drawings)
export function getDefaultTemplate(type: string): DrawingTemplate | null {
  try {
    const raw = localStorage.getItem(`drawing_default_template_${type}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setDefaultTemplate(type: string, template: DrawingTemplate | null) {
  if (template) {
    localStorage.setItem(`drawing_default_template_${type}`, JSON.stringify(template));
  } else {
    localStorage.removeItem(`drawing_default_template_${type}`);
  }
}

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

// Tools that support trendline-style features
const LINE_TOOLS = ['trendline', 'ray', 'extendedline', 'infoline', 'trendangle', 'horizontalray'];
const SHAPE_TOOLS = ['triangle', 'trianglepattern', 'rectangle', 'rotatedrectangle', 'circle', 'ellipse', 'xabcd', 'cypher', 'abcd', 'headshoulders', 'threedrives'];
const VERTICAL_TOOLS = ['verticalline'];
const CHANNEL_TOOLS = ['parallelchannel'];

const DEFAULT_CHANNEL_LEVELS = [
  { value: -0.25, visible: false, color: '#2962ff', style: 'solid' },
  { value: 0,     visible: true,  color: '#2962ff', style: 'solid' },
  { value: 0.25,  visible: false, color: '#2962ff', style: 'solid' },
  { value: 0.5,   visible: true,  color: '#2962ff', style: 'dashed' },
  { value: 0.75,  visible: false, color: '#2962ff', style: 'solid' },
  { value: 1,     visible: true,  color: '#2962ff', style: 'solid' },
  { value: 1.25,  visible: false, color: '#2962ff', style: 'solid' },
];

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
  const [templates, setTemplates] = useState<DrawingTemplate[]>([]);
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    if (open && drawing) {
      setLocalProps({ ...drawing.props });
      setLocalColor(drawing.color);
      setLocalLineWidth(drawing.lineWidth);
      setTemplates(getTemplatesForType(drawing.type));
      setShowTemplateSave(false);
    }
  }, [open, drawing?.id]);

  if (!open || !drawing) return null;

  const toolLabel = drawing.type.charAt(0).toUpperCase() + drawing.type.slice(1).replace(/([A-Z])/g, ' $1');
  const isLineTool = LINE_TOOLS.includes(drawing.type);
  const isShapeTool = SHAPE_TOOLS.includes(drawing.type);
  const isVerticalTool = VERTICAL_TOOLS.includes(drawing.type);
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

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) return;
    const tmpl: DrawingTemplate = {
      name: newTemplateName.trim(),
      color: localColor,
      lineWidth: localLineWidth,
      props: { ...localProps },
    };
    const updated = [...templates, tmpl];
    setTemplates(updated);
    saveTemplatesForType(drawing.type, updated);
    setNewTemplateName('');
    setShowTemplateSave(false);
  };

  const handleApplyTemplate = (tmpl: DrawingTemplate) => {
    setLocalColor(tmpl.color);
    setLocalLineWidth(tmpl.lineWidth);
    setLocalProps(prev => ({ ...prev, ...tmpl.props }));
  };

  const handleDeleteTemplate = (idx: number) => {
    const updated = templates.filter((_, i) => i !== idx);
    setTemplates(updated);
    saveTemplatesForType(drawing.type, updated);
  };

  const handleSetDefault = () => {
    setDefaultTemplate(drawing.type, {
      name: 'default',
      color: localColor,
      lineWidth: localLineWidth,
      props: { ...localProps },
    });
  };

  return (
    <DraggableDialog
      id="drawing-settings"
      open={open}
      onClose={handleCancel}
      title={toolLabel}
      className="w-[400px]"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[60vh]">
        {tab === 'Style' && (
          <StyleTab
            localColor={localColor}
            setLocalColor={setLocalColor}
            localLineWidth={localLineWidth}
            setLocalLineWidth={setLocalLineWidth}
            localProps={localProps}
            updateLocal={updateLocal}
            isLineTool={isLineTool}
            isShapeTool={isShapeTool}
            isVerticalTool={isVerticalTool}
          />
        )}
        {tab === 'Text' && (
          <TextTab localProps={localProps} updateLocal={updateLocal} />
        )}
        {tab === 'Coordinates' && (
          <CoordinatesTab points={drawing.points} />
        )}
        {tab === 'Visibility' && (
          <VisibilityTab localProps={localProps} updateLocal={updateLocal} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border gap-2">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {showTemplateSave ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                placeholder="Template name"
                className="bg-muted border border-border rounded px-2 py-1 text-sm text-foreground w-28 focus:border-primary focus:outline-none"
                autoFocus
              />
              <button onClick={handleSaveTemplate} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">Save</button>
              <button onClick={() => setShowTemplateSave(false)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <select
                onChange={e => {
                  const idx = parseInt(e.target.value);
                  if (!isNaN(idx) && templates[idx]) handleApplyTemplate(templates[idx]);
                  e.target.value = '';
                }}
                className="bg-muted border border-border rounded px-2 py-1 text-sm text-muted-foreground max-w-[120px]"
                defaultValue=""
              >
                <option value="" disabled>Template</option>
                {templates.map((t, i) => (
                  <option key={i} value={i}>{t.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowTemplateSave(true)}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                title="Save as template"
              >
                <Save size={14} />
              </button>
              {templates.length > 0 && (
                <button
                  onClick={() => {
                    const name = prompt('Delete template name:');
                    if (name) {
                      const idx = templates.findIndex(t => t.name === name);
                      if (idx >= 0) handleDeleteTemplate(idx);
                    }
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                  title="Delete template"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={handleSetDefault}
                className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 border border-border rounded transition-colors"
                title="Set current style as default for this tool type"
              >
                Set default
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleCancel} className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded transition-colors">Cancel</button>
          <button onClick={handleOk} className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Ok</button>
        </div>
      </div>
    </DraggableDialog>
  );
}

// ─── Style Tab ───
function StyleTab({ localColor, setLocalColor, localLineWidth, setLocalLineWidth, localProps, updateLocal, isLineTool, isShapeTool, isVerticalTool }: {
  localColor: string; setLocalColor: (c: string) => void;
  localLineWidth: number; setLocalLineWidth: (w: number) => void;
  localProps: Record<string, any>; updateLocal: (k: string, v: any) => void;
  isLineTool: boolean;
  isShapeTool: boolean;
  isVerticalTool: boolean;
}) {
  return (
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

      {/* Arrow ends (line tools) */}
      {isLineTool && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Arrow ends</span>
          <div className="flex gap-2">
            <button
              onClick={() => updateLocal('leftArrow', !localProps.leftArrow)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${localProps.leftArrow ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              ← Left
            </button>
            <button
              onClick={() => updateLocal('rightArrow', !localProps.rightArrow)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${localProps.rightArrow ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              Right →
            </button>
          </div>
        </div>
      )}
      {/* Vertical line specific */}
      {isVerticalTool && (
        <div className="space-y-2">
          <CheckField label="Time label" checked={localProps.timeLabel !== false} onChange={v => updateLocal('timeLabel', v)} />
        </div>
      )}

      {/* Extend (not for vertical) */}
      {!isVerticalTool && (
        <SelectField
          label="Extend"
          value={localProps.extend || 'none'}
          options={EXTEND_OPTIONS}
          onChange={v => updateLocal('extend', v)}
        />
      )}

      {!isVerticalTool && (
        <div className="space-y-2">
          <CheckField label="Middle point" checked={!!localProps.middlePoint} onChange={v => updateLocal('middlePoint', v)} />
          <CheckField label="Price labels" checked={!!localProps.priceLabels} onChange={v => updateLocal('priceLabels', v)} />
        </div>
      )}

      {/* Stats section */}
      {isLineTool && (
        <div className="pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Stats</span>
          <div className="mt-2 space-y-2">
            <CheckField label="Price range" checked={!!localProps.statsPriceRange} onChange={v => updateLocal('statsPriceRange', v)} />
            <CheckField label="Percent change" checked={!!localProps.statsPercentChange} onChange={v => updateLocal('statsPercentChange', v)} />
            <CheckField label="Change in pips" checked={!!localProps.statsPips} onChange={v => updateLocal('statsPips', v)} />
            <CheckField label="Bars range" checked={!!localProps.statsBarsRange} onChange={v => updateLocal('statsBarsRange', v)} />
            <CheckField label="Date/time range" checked={!!localProps.statsDateTimeRange} onChange={v => updateLocal('statsDateTimeRange', v)} />
            <CheckField label="Distance" checked={!!localProps.statsDistance} onChange={v => updateLocal('statsDistance', v)} />
            <CheckField label="Angle" checked={!!localProps.statsAngle} onChange={v => updateLocal('statsAngle', v)} />
          </div>
          <div className="mt-3 space-y-2">
            <SelectField
              label="Stats position"
              value={localProps.statsPosition || 'right'}
              options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
              onChange={v => updateLocal('statsPosition', v)}
            />
            <CheckField label="Always show stats" checked={!!localProps.alwaysShowStats} onChange={v => updateLocal('alwaysShowStats', v)} />
          </div>
        </div>
      )}

      {/* Shape-specific: Background */}
      {isShapeTool && (
        <div className="pt-2 border-t border-border space-y-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Background</span>
          <CheckField label="Show background" checked={localProps.showBackground !== false} onChange={v => updateLocal('showBackground', v)} />
          {localProps.showBackground !== false && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Color</span>
                <input
                  type="color"
                  value={localProps.backgroundColor || localColor}
                  onChange={e => updateLocal('backgroundColor', e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Opacity</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((localProps.backgroundOpacity ?? 0.08) * 100)}
                  onChange={e => updateLocal('backgroundOpacity', Number(e.target.value) / 100)}
                  className="w-32"
                />
                <span className="text-xs text-muted-foreground ml-2 w-8">{Math.round((localProps.backgroundOpacity ?? 0.08) * 100)}%</span>
              </div>
            </>
          )}
          <CheckField label="Price labels" checked={!!localProps.priceLabels} onChange={v => updateLocal('priceLabels', v)} />
        </div>
      )}
    </>
  );
}

// ─── Text Tab ───
function TextTab({ localProps, updateLocal }: { localProps: Record<string, any>; updateLocal: (k: string, v: any) => void }) {
  return (
    <>
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

      <textarea
        value={localProps.text || ''}
        onChange={e => updateLocal('text', e.target.value)}
        placeholder="Add text"
        className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground resize-none h-20 focus:border-primary focus:outline-none"
      />

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

      {/* Text orientation */}
      <SelectField
        label="Text orientation"
        value={localProps.textOrientation || 'horizontal'}
        options={[{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }]}
        onChange={v => updateLocal('textOrientation', v)}
      />
    </>
  );
}

// ─── Coordinates Tab ───
function CoordinatesTab({ points }: { points: { time: number; price: number }[] }) {
  return (
    <>
      {points.map((p, i) => (
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
  );
}

// ─── Visibility Tab ───
function VisibilityTab({ localProps, updateLocal }: { localProps: Record<string, any>; updateLocal: (k: string, v: any) => void }) {
  return (
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
  );
}
