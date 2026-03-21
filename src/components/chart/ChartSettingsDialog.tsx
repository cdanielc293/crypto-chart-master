import { useState } from 'react';
import { X } from 'lucide-react';
import { useChart } from '@/context/ChartContext';
import type { ChartSettings } from '@/types/chartSettings';
import { DEFAULT_CHART_SETTINGS } from '@/types/chartSettings';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const TABS = [
  { id: 'symbol', label: 'Symbol', icon: '⎔' },
  { id: 'statusline', label: 'Status line', icon: '≡' },
  { id: 'scales', label: 'Scales and lines', icon: '↕' },
  { id: 'canvas', label: 'Canvas', icon: '✎' },
] as const;

type TabId = typeof TABS[number]['id'];

interface Props {
  open: boolean;
  onClose: () => void;
}

function ColorSwatch({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return (
    <label className="relative w-7 h-7 rounded cursor-pointer border border-chart-border overflow-hidden">
      <div className="w-full h-full" style={{ backgroundColor: color }} />
      <input
        type="color"
        value={color}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mt-4 mb-2 first:mt-0">
      {children}
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer text-sm text-foreground hover:text-primary transition-colors">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

export default function ChartSettingsDialog({ open, onClose }: Props) {
  const { chartSettings, setChartSettings } = useChart();
  const [tab, setTab] = useState<TabId>('symbol');
  const [draft, setDraft] = useState<ChartSettings>(() => ({ ...chartSettings }));

  if (!open) return null;

  const update = <K extends keyof ChartSettings>(
    section: K,
    key: keyof ChartSettings[K],
    value: any
  ) => {
    setDraft(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleOk = () => {
    setChartSettings(draft);
    localStorage.setItem('chartSettings', JSON.stringify(draft));
    onClose();
  };

  const handleCancel = () => {
    setDraft({ ...chartSettings });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleCancel} />
      <div className="relative bg-card border border-chart-border rounded-lg shadow-2xl w-[620px] max-h-[80vh] flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-chart-border">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-[170px] border-r border-chart-border py-2 flex-shrink-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 w-full px-5 py-2.5 text-sm transition-colors ${
                  tab === t.id
                    ? 'text-primary bg-toolbar-hover font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[350px]">
            {tab === 'symbol' && <SymbolTab draft={draft} update={update} />}
            {tab === 'statusline' && <StatusLineTab draft={draft} update={update} />}
            {tab === 'scales' && <ScalesTab draft={draft} update={update} />}
            {tab === 'canvas' && <CanvasTab draft={draft} update={update} />}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-chart-border">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 text-sm text-foreground bg-secondary hover:bg-accent rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleOk}
            className="px-4 py-1.5 text-sm text-primary-foreground bg-primary hover:opacity-90 rounded transition-colors"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Symbol Tab ───
function SymbolTab({ draft, update }: { draft: ChartSettings; update: any }) {
  const c = draft.candle;
  return (
    <>
      <SectionTitle>CANDLES</SectionTitle>
      <CheckRow
        label="Color bars based on previous close"
        checked={c.colorByPrevClose}
        onChange={v => update('candle', 'colorByPrevClose', v)}
      />

      <div className="space-y-3 mt-3">
        {/* Body */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2.5 w-24">
            <Checkbox checked={c.showBody} onCheckedChange={v => update('candle', 'showBody', v)} />
            <span className="text-sm text-foreground">Body</span>
          </label>
          <ColorSwatch color={c.bodyUp} onChange={v => update('candle', 'bodyUp', v)} />
          <ColorSwatch color={c.bodyDown} onChange={v => update('candle', 'bodyDown', v)} />
        </div>

        {/* Borders */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2.5 w-24">
            <Checkbox checked={c.showBorders} onCheckedChange={v => update('candle', 'showBorders', v)} />
            <span className="text-sm text-foreground">Borders</span>
          </label>
          <ColorSwatch color={c.borderUp} onChange={v => update('candle', 'borderUp', v)} />
          <ColorSwatch color={c.borderDown} onChange={v => update('candle', 'borderDown', v)} />
        </div>

        {/* Wick */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2.5 w-24">
            <Checkbox checked={c.showWick} onCheckedChange={v => update('candle', 'showWick', v)} />
            <span className="text-sm text-foreground">Wick</span>
          </label>
          <ColorSwatch color={c.wickUp} onChange={v => update('candle', 'wickUp', v)} />
          <ColorSwatch color={c.wickDown} onChange={v => update('candle', 'wickDown', v)} />
        </div>
      </div>
    </>
  );
}

// ─── Status Line Tab ───
function StatusLineTab({ draft, update }: { draft: ChartSettings; update: any }) {
  const s = draft.statusLine;
  return (
    <>
      <SectionTitle>SYMBOL</SectionTitle>
      <CheckRow label="Logo" checked={s.showLogo} onChange={v => update('statusLine', 'showLogo', v)} />
      <div className="flex items-center gap-3 py-1.5">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Checkbox checked={s.showTitle} onCheckedChange={v => update('statusLine', 'showTitle', v)} />
          <span className="text-sm text-foreground">Title</span>
        </label>
        {s.showTitle && (
          <Select value={s.titleMode} onValueChange={v => update('statusLine', 'titleMode', v)}>
            <SelectTrigger className="w-[130px] h-7 text-xs bg-secondary border-chart-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ticker">Ticker</SelectItem>
              <SelectItem value="description">Description</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <CheckRow label="Open market status" checked={s.showOpenMarketStatus} onChange={v => update('statusLine', 'showOpenMarketStatus', v)} />
      <CheckRow label="Chart values" checked={s.showChartValues} onChange={v => update('statusLine', 'showChartValues', v)} />
      <CheckRow label="Bar change values" checked={s.showBarChangeValues} onChange={v => update('statusLine', 'showBarChangeValues', v)} />
      <CheckRow label="Volume" checked={s.showVolume} onChange={v => update('statusLine', 'showVolume', v)} />
      <CheckRow label="Last day change values" checked={s.showLastDayChange} onChange={v => update('statusLine', 'showLastDayChange', v)} />

      <SectionTitle>INDICATORS</SectionTitle>
      <CheckRow label="Titles" checked={s.showIndicatorTitles} onChange={v => update('statusLine', 'showIndicatorTitles', v)} />
      {s.showIndicatorTitles && (
        <div className="pl-6">
          <CheckRow label="Inputs" checked={s.showIndicatorInputs} onChange={v => update('statusLine', 'showIndicatorInputs', v)} />
        </div>
      )}
      <CheckRow label="Values" checked={s.showIndicatorValues} onChange={v => update('statusLine', 'showIndicatorValues', v)} />

      <div className="flex items-center gap-3 mt-2">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Checkbox checked={s.showBackground} onCheckedChange={v => update('statusLine', 'showBackground', v)} />
          <span className="text-sm text-foreground">Background</span>
        </label>
        {s.showBackground && (
          <Slider
            value={[s.backgroundOpacity]}
            onValueChange={([v]) => update('statusLine', 'backgroundOpacity', v)}
            min={0} max={100} step={1}
            className="w-[120px]"
          />
        )}
      </div>
    </>
  );
}

// ─── Scales and Lines Tab ───
function ScalesTab({ draft, update }: { draft: ChartSettings; update: any }) {
  const s = draft.scalesAndLines;
  return (
    <>
      <SectionTitle>PRICE SCALE</SectionTitle>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Currency and Unit</span>
          <Select value={s.currencyVisibility} onValueChange={v => update('scalesAndLines', 'currencyVisibility', v)}>
            <SelectTrigger className="w-[160px] h-7 text-xs bg-secondary border-chart-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Always visible</SelectItem>
              <SelectItem value="mouse_over">Visible on mouse over</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Scale modes (A and L)</span>
          <Select value={s.scaleMode} onValueChange={v => update('scalesAndLines', 'scaleMode', v)}>
            <SelectTrigger className="w-[160px] h-7 text-xs bg-secondary border-chart-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Always visible</SelectItem>
              <SelectItem value="mouse_over">Visible on mouse over</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Scales placement</span>
          <Select value={s.scalesPlacement} onValueChange={v => update('scalesAndLines', 'scalesPlacement', v)}>
            <SelectTrigger className="w-[160px] h-7 text-xs bg-secondary border-chart-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SectionTitle>PRICE LABELS & LINES</SectionTitle>
      <CheckRow label="No overlapping labels" checked={s.noOverlappingLabels} onChange={v => update('scalesAndLines', 'noOverlappingLabels', v)} />
      <CheckRow label="Plus button" checked={s.showPlusButton} onChange={v => update('scalesAndLines', 'showPlusButton', v)} />
      <CheckRow label="Countdown to bar close" checked={s.countdownToBarClose} onChange={v => update('scalesAndLines', 'countdownToBarClose', v)} />

      <div className="space-y-3 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Symbol</span>
          <Select value={s.symbolDisplay} onValueChange={v => update('scalesAndLines', 'symbolDisplay', v)}>
            <SelectTrigger className="w-[160px] h-7 text-xs bg-secondary border-chart-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_value_line">Name, value, line</SelectItem>
              <SelectItem value="name_value">Name, value</SelectItem>
              <SelectItem value="value">Value</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Previous day close</span>
          <Select value={s.previousDayClose} onValueChange={v => update('scalesAndLines', 'previousDayClose', v)}>
            <SelectTrigger className="w-[160px] h-7 text-xs bg-secondary border-chart-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hidden">Hidden</SelectItem>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="value_line">Value & line</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">High and low</span>
          <Select value={s.highLowDisplay} onValueChange={v => update('scalesAndLines', 'highLowDisplay', v)}>
            <SelectTrigger className="w-[160px] h-7 text-xs bg-secondary border-chart-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hidden">Hidden</SelectItem>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="value_line">Value & line</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SectionTitle>TIME SCALE</SectionTitle>
      <CheckRow label="Day of week on labels" checked={s.showDayOfWeek} onChange={v => update('scalesAndLines', 'showDayOfWeek', v)} />
      <div className="space-y-3 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Time hours format</span>
          <Select value={s.timeFormat} onValueChange={v => update('scalesAndLines', 'timeFormat', v)}>
            <SelectTrigger className="w-[160px] h-7 text-xs bg-secondary border-chart-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24-hours</SelectItem>
              <SelectItem value="12h">12-hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

// ─── Canvas Tab ───
function CanvasTab({ draft, update }: { draft: ChartSettings; update: any }) {
  const c = draft.canvas;
  return (
    <>
      <SectionTitle>CHART BASIC STYLES</SectionTitle>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Background</span>
          <div className="flex items-center gap-2">
            <Select value={c.backgroundType} onValueChange={v => update('canvas', 'backgroundType', v)}>
              <SelectTrigger className="w-[110px] h-7 text-xs bg-secondary border-chart-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
              </SelectContent>
            </Select>
            <ColorSwatch color={c.backgroundColor} onChange={v => update('canvas', 'backgroundColor', v)} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Grid lines</span>
          <div className="flex items-center gap-2">
            <Select value={c.gridType} onValueChange={v => update('canvas', 'gridType', v)}>
              <SelectTrigger className="w-[130px] h-7 text-xs bg-secondary border-chart-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Vert and horz</SelectItem>
                <SelectItem value="vert">Vertical only</SelectItem>
                <SelectItem value="horz">Horizontal only</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
            <ColorSwatch color={c.gridVertColor} onChange={v => { update('canvas', 'gridVertColor', v); update('canvas', 'gridHorzColor', v); }} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Crosshair</span>
          <div className="flex items-center gap-2">
            <ColorSwatch color={c.crosshairColor} onChange={v => update('canvas', 'crosshairColor', v)} />
            <Select value={c.crosshairStyle} onValueChange={v => update('canvas', 'crosshairStyle', v)}>
              <SelectTrigger className="w-[80px] h-7 text-xs bg-secondary border-chart-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashed">- - - -</SelectItem>
                <SelectItem value="dotted">· · · ·</SelectItem>
                <SelectItem value="solid">────</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Watermark</span>
          <Select value={c.watermarkMode} onValueChange={v => update('canvas', 'watermarkMode', v)}>
            <SelectTrigger className="w-[140px] h-7 text-xs bg-secondary border-chart-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="symbol">Symbol</SelectItem>
              <SelectItem value="replay">Replay mode</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SectionTitle>SCALES</SectionTitle>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Text</span>
          <div className="flex items-center gap-2">
            <ColorSwatch color={c.scaleTextColor} onChange={v => update('canvas', 'scaleTextColor', v)} />
            <Select value={String(c.scaleTextSize)} onValueChange={v => update('canvas', 'scaleTextSize', Number(v))}>
              <SelectTrigger className="w-[70px] h-7 text-xs bg-secondary border-chart-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 11, 12, 13, 14, 16].map(s => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Lines</span>
          <ColorSwatch color={c.scaleLinesColor} onChange={v => update('canvas', 'scaleLinesColor', v)} />
        </div>
      </div>

      <SectionTitle>BUTTONS</SectionTitle>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Navigation</span>
          <Select value={c.navigationVisibility} onValueChange={v => update('canvas', 'navigationVisibility', v)}>
            <SelectTrigger className="w-[160px] h-7 text-xs bg-secondary border-chart-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Always visible</SelectItem>
              <SelectItem value="mouse_over">Visible on mouse over</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Pane</span>
          <Select value={c.paneVisibility} onValueChange={v => update('canvas', 'paneVisibility', v)}>
            <SelectTrigger className="w-[160px] h-7 text-xs bg-secondary border-chart-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Always visible</SelectItem>
              <SelectItem value="mouse_over">Visible on mouse over</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SectionTitle>MARGINS</SectionTitle>
      <div className="space-y-3">
        {[
          { label: 'Top', key: 'marginTop' as const, unit: '%' },
          { label: 'Bottom', key: 'marginBottom' as const, unit: '%' },
          { label: 'Right', key: 'marginRight' as const, unit: 'bars' },
        ].map(({ label, key, unit }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{label}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={c[key]}
                onChange={e => update('canvas', key, Number(e.target.value))}
                className="w-16 h-7 px-2 text-xs bg-secondary border border-chart-border rounded text-foreground"
              />
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
