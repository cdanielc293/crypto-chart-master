import { useMemo, useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useChart } from '@/context/ChartContext';
import type { ChartSettings } from '@/types/chartSettings';
import {
  DEFAULT_CHART_SETTINGS,
  HEX_COLOR_REGEX,
  normalizeChartSettings,
  sanitizeHexColor,
} from '@/types/chartSettings';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const TABS = [
  { id: 'symbol', label: 'Symbol', icon: '⎔' },
  { id: 'statusline', label: 'Status line', icon: '≡' },
  { id: 'scales', label: 'Scales and lines', icon: '↕' },
  { id: 'canvas', label: 'Canvas', icon: '✎' },
  { id: 'trading', label: 'Trading', icon: '⟐' },
  { id: 'alerts', label: 'Alerts', icon: '⏰' },
  { id: 'events', label: 'Events', icon: '✦' },
  { id: 'priceScale', label: 'More price scale', icon: '₿' },
  { id: 'template', label: 'Template', icon: '★' },
] as const;

const PRESET_COLORS = [
  '#131722', '#1e222d', '#2a2e39', '#787b86', '#b2b5be',
  '#ffffff', '#26a69a', '#ef5350', '#2962ff', '#ff9800',
  '#e91e63', '#9c27b0', '#00bcd4', '#4caf50', '#ff5722',
  '#f5f5f5', '#111827', '#374151', '#d1d5db', '#f59e0b',
];

const TEMPLATES_KEY = 'chartSettingsTemplates';

type TabId = typeof TABS[number]['id'];
type TemplateMap = Record<string, ChartSettings>;

interface Props {
  open: boolean;
  onClose: () => void;
}

function loadTemplates(): TemplateMap {
  const raw = localStorage.getItem(TEMPLATES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([name, cfg]) => [name, normalizeChartSettings(cfg)])
    );
  } catch {
    return {};
  }
}

function saveTemplates(templates: TemplateMap) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

function ColorSwatch({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [showPresets, setShowPresets] = useState(false);
  const [draft, setDraft] = useState(color);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(color);
  }, [color]);

  useEffect(() => {
    if (!showPresets) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [showPresets]);

  const commitDraft = () => {
    if (HEX_COLOR_REGEX.test(draft)) {
      onChange(draft);
    } else {
      setDraft(color);
    }
  };

  const safeColor = sanitizeHexColor(color, '#131722');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="h-7 w-7 overflow-hidden rounded border border-chart-border"
        style={{ backgroundColor: safeColor }}
        onClick={() => setShowPresets(prev => !prev)}
      />

      {showPresets && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[230px] rounded-lg border border-chart-border bg-card p-2 shadow-xl">
          <div className="mb-2 grid grid-cols-10 gap-1">
            {PRESET_COLORS.map(preset => (
              <button
                key={preset}
                type="button"
                className={`h-5 w-5 rounded-sm border transition-transform hover:scale-110 ${
                  safeColor === preset ? 'border-primary ring-1 ring-primary' : 'border-chart-border'
                }`}
                style={{ backgroundColor: preset }}
                onClick={() => {
                  onChange(preset);
                  setDraft(preset);
                  setShowPresets(false);
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-chart-border pt-2">
            <input
              type="color"
              value={safeColor}
              onChange={e => {
                onChange(e.target.value);
                setDraft(e.target.value);
              }}
              className="h-7 w-10 cursor-pointer rounded border border-chart-border bg-transparent p-0"
            />
            <Input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  commitDraft();
                  setShowPresets(false);
                }
              }}
              className="h-7 font-mono text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
      {children}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-foreground transition-colors hover:text-primary">
      <Checkbox checked={checked} onCheckedChange={v => onChange(Boolean(v))} />
      <span>{label}</span>
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-foreground">{label}</span>
      {children}
    </div>
  );
}

export default function ChartSettingsDialog({ open, onClose }: Props) {
  const { chartSettings, setChartSettings } = useChart();
  const [tab, setTab] = useState<TabId>('symbol');
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<TemplateMap>({});
  const originalRef = useRef<ChartSettings>(chartSettings);

  useEffect(() => {
    if (!open) return;
    originalRef.current = JSON.parse(JSON.stringify(chartSettings));
    setTemplates(loadTemplates());
  }, [open, chartSettings]);

  const updateSection = <K extends keyof ChartSettings>(section: K, patch: Partial<ChartSettings[K]>) => {
    setChartSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...patch,
      },
    }));
  };

  const updateTradingGeneral = (patch: Partial<ChartSettings['trading']['general']>) => {
    setChartSettings(prev => ({
      ...prev,
      trading: {
        ...prev.trading,
        general: { ...prev.trading.general, ...patch },
      },
    }));
  };

  const updateTradingAppearance = (patch: Partial<ChartSettings['trading']['appearance']>) => {
    setChartSettings(prev => ({
      ...prev,
      trading: {
        ...prev.trading,
        appearance: { ...prev.trading.appearance, ...patch },
      },
    }));
  };

  const handleSave = () => {
    localStorage.setItem('chartSettings', JSON.stringify(chartSettings));
    onClose();
  };

  const handleCancel = () => {
    setChartSettings(originalRef.current);
    onClose();
  };

  const handleReset = () => {
    setChartSettings(DEFAULT_CHART_SETTINGS);
  };

  const handleSaveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    const next = { ...templates, [name]: chartSettings };
    setTemplates(next);
    saveTemplates(next);
    setTemplateName('');
  };

  const templateNames = useMemo(() => Object.keys(templates).sort(), [templates]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleCancel} />
      <div className="relative z-10 flex max-h-[85vh] w-[860px] flex-col overflow-hidden rounded-lg border border-chart-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-chart-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <button type="button" onClick={handleCancel} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[210px] shrink-0 border-r border-chart-border py-2">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex w-full items-center gap-2.5 px-5 py-2.5 text-sm transition-colors ${
                  tab === t.id
                    ? 'bg-toolbar-hover font-medium text-primary'
                    : 'text-muted-foreground hover:bg-toolbar-hover hover:text-foreground'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="min-h-[420px] flex-1 overflow-y-auto px-6 py-4">
            {tab === 'symbol' && <SymbolTab settings={chartSettings} updateSection={updateSection} />}
            {tab === 'statusline' && <StatusLineTab settings={chartSettings} updateSection={updateSection} />}
            {tab === 'scales' && <ScalesTab settings={chartSettings} updateSection={updateSection} />}
            {tab === 'canvas' && <CanvasTab settings={chartSettings} updateSection={updateSection} />}
            {tab === 'trading' && (
              <TradingTab
                settings={chartSettings}
                updateTradingGeneral={updateTradingGeneral}
                updateTradingAppearance={updateTradingAppearance}
              />
            )}
            {tab === 'alerts' && <AlertsTab settings={chartSettings} updateSection={updateSection} />}
            {tab === 'events' && <EventsTab settings={chartSettings} updateSection={updateSection} />}
            {tab === 'priceScale' && <PriceScaleTab settings={chartSettings} updateSection={updateSection} />}
            {tab === 'template' && (
              <TemplateTab
                templateName={templateName}
                setTemplateName={setTemplateName}
                templateNames={templateNames}
                onSaveTemplate={handleSaveTemplate}
                onApplyTemplate={(name) => {
                  const selected = templates[name];
                  if (selected) setChartSettings(normalizeChartSettings(selected));
                }}
                onDeleteTemplate={(name) => {
                  const next = { ...templates };
                  delete next[name];
                  setTemplates(next);
                  saveTemplates(next);
                }}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-chart-border px-6 py-3">
          <button type="button" onClick={handleReset} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            Reset to defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded bg-secondary px-4 py-1.5 text-sm text-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:opacity-90"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SymbolTab({
  settings,
  updateSection,
}: {
  settings: ChartSettings;
  updateSection: <K extends keyof ChartSettings>(section: K, patch: Partial<ChartSettings[K]>) => void;
}) {
  const c = settings.candle;
  const s = settings.symbol;

  return (
    <>
      <SectionTitle>CANDLES</SectionTitle>
      <CheckRow
        label="Color bars based on previous close"
        checked={c.colorByPrevClose}
        onChange={v => updateSection('candle', { colorByPrevClose: v })}
      />

      <Row label="Body">
        <div className="flex items-center gap-2">
          <Checkbox checked={c.showBody} onCheckedChange={v => updateSection('candle', { showBody: Boolean(v) })} />
          <ColorSwatch color={c.bodyUp} onChange={v => updateSection('candle', { bodyUp: v })} />
          <ColorSwatch color={c.bodyDown} onChange={v => updateSection('candle', { bodyDown: v })} />
        </div>
      </Row>

      <Row label="Borders">
        <div className="flex items-center gap-2">
          <Checkbox checked={c.showBorders} onCheckedChange={v => updateSection('candle', { showBorders: Boolean(v) })} />
          <ColorSwatch color={c.borderUp} onChange={v => updateSection('candle', { borderUp: v })} />
          <ColorSwatch color={c.borderDown} onChange={v => updateSection('candle', { borderDown: v })} />
        </div>
      </Row>

      <Row label="Wick">
        <div className="flex items-center gap-2">
          <Checkbox checked={c.showWick} onCheckedChange={v => updateSection('candle', { showWick: Boolean(v) })} />
          <ColorSwatch color={c.wickUp} onChange={v => updateSection('candle', { wickUp: v })} />
          <ColorSwatch color={c.wickDown} onChange={v => updateSection('candle', { wickDown: v })} />
        </div>
      </Row>

      <SectionTitle>DATA MODIFICATION</SectionTitle>
      <Row label="Session">
        <Select value={s.session} onValueChange={v => updateSection('symbol', { session: v as ChartSettings['symbol']['session'] })}>
          <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="extended">Extended</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <CheckRow label="Back adjustment (futures)" checked={s.backAdjustment} onChange={v => updateSection('symbol', { backAdjustment: v })} />
      <CheckRow label="Adjust for dividends" checked={s.adjustForDividends} onChange={v => updateSection('symbol', { adjustForDividends: v })} />

      <Row label="Precision">
        <Select value={String(s.precision)} onValueChange={v => updateSection('symbol', { precision: Number(v) })}>
          <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(p => (
              <SelectItem key={p} value={String(p)}>{p} decimals</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>

      <Row label="Timezone">
        <Select value={s.timezone} onValueChange={v => updateSection('symbol', { timezone: v })}>
          <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Exchange">Exchange</SelectItem>
            <SelectItem value="UTC">UTC</SelectItem>
            <SelectItem value="Asia/Jerusalem">Asia/Jerusalem</SelectItem>
            <SelectItem value="America/New_York">America/New_York</SelectItem>
          </SelectContent>
        </Select>
      </Row>
    </>
  );
}

function StatusLineTab({
  settings,
  updateSection,
}: {
  settings: ChartSettings;
  updateSection: <K extends keyof ChartSettings>(section: K, patch: Partial<ChartSettings[K]>) => void;
}) {
  const s = settings.statusLine;

  return (
    <>
      <SectionTitle>SYMBOL</SectionTitle>
      <CheckRow label="Logo" checked={s.showLogo} onChange={v => updateSection('statusLine', { showLogo: v })} />
      <Row label="Title">
        <div className="flex items-center gap-2">
          <Checkbox checked={s.showTitle} onCheckedChange={v => updateSection('statusLine', { showTitle: Boolean(v) })} />
          {s.showTitle && (
            <Select value={s.titleMode} onValueChange={v => updateSection('statusLine', { titleMode: v as ChartSettings['statusLine']['titleMode'] })}>
              <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ticker">Ticker</SelectItem>
                <SelectItem value="description">Description</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </Row>
      <CheckRow label="Open market status" checked={s.showOpenMarketStatus} onChange={v => updateSection('statusLine', { showOpenMarketStatus: v })} />
      <CheckRow label="Chart values" checked={s.showChartValues} onChange={v => updateSection('statusLine', { showChartValues: v })} />
      <CheckRow label="Bar change values" checked={s.showBarChangeValues} onChange={v => updateSection('statusLine', { showBarChangeValues: v })} />
      <CheckRow label="Volume" checked={s.showVolume} onChange={v => updateSection('statusLine', { showVolume: v })} />
      <CheckRow label="Last day change" checked={s.showLastDayChange} onChange={v => updateSection('statusLine', { showLastDayChange: v })} />

      <SectionTitle>INDICATORS</SectionTitle>
      <CheckRow label="Titles" checked={s.showIndicatorTitles} onChange={v => updateSection('statusLine', { showIndicatorTitles: v })} />
      <CheckRow label="Inputs" checked={s.showIndicatorInputs} onChange={v => updateSection('statusLine', { showIndicatorInputs: v })} />
      <CheckRow label="Values" checked={s.showIndicatorValues} onChange={v => updateSection('statusLine', { showIndicatorValues: v })} />

      <SectionTitle>BACKGROUND</SectionTitle>
      <CheckRow label="Show background" checked={s.showBackground} onChange={v => updateSection('statusLine', { showBackground: v })} />
      {s.showBackground && (
        <Row label={`Opacity ${s.backgroundOpacity}%`}>
          <Slider
            value={[s.backgroundOpacity]}
            onValueChange={([v]) => updateSection('statusLine', { backgroundOpacity: v })}
            min={0}
            max={100}
            step={1}
            className="w-[180px]"
          />
        </Row>
      )}
    </>
  );
}

function ScalesTab({
  settings,
  updateSection,
}: {
  settings: ChartSettings;
  updateSection: <K extends keyof ChartSettings>(section: K, patch: Partial<ChartSettings[K]>) => void;
}) {
  const s = settings.scalesAndLines;

  return (
    <>
      <SectionTitle>PRICE SCALE</SectionTitle>
      <Row label="Currency and unit">
        <Select value={s.currencyVisibility} onValueChange={v => updateSection('scalesAndLines', { currencyVisibility: v as ChartSettings['scalesAndLines']['currencyVisibility'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="always">Always visible</SelectItem>
            <SelectItem value="mouse_over">Visible on mouse over</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Scale mode buttons (A/L)">
        <Select value={s.scaleMode} onValueChange={v => updateSection('scalesAndLines', { scaleMode: v as ChartSettings['scalesAndLines']['scaleMode'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="always">Always visible</SelectItem>
            <SelectItem value="mouse_over">Visible on mouse over</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Scales placement">
        <Select value={s.scalesPlacement} onValueChange={v => updateSection('scalesAndLines', { scalesPlacement: v as ChartSettings['scalesAndLines']['scalesPlacement'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <SectionTitle>PRICE LABELS & LINES</SectionTitle>
      <CheckRow label="No overlapping labels" checked={s.noOverlappingLabels} onChange={v => updateSection('scalesAndLines', { noOverlappingLabels: v })} />
      <CheckRow label="Plus button" checked={s.showPlusButton} onChange={v => updateSection('scalesAndLines', { showPlusButton: v })} />
      <CheckRow label="Countdown to bar close" checked={s.countdownToBarClose} onChange={v => updateSection('scalesAndLines', { countdownToBarClose: v })} />

      <Row label="Symbol">
        <Select value={s.symbolDisplay} onValueChange={v => updateSection('scalesAndLines', { symbolDisplay: v as ChartSettings['scalesAndLines']['symbolDisplay'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name_value_line">Name, value, line</SelectItem>
            <SelectItem value="name_value">Name, value</SelectItem>
            <SelectItem value="value">Value only</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Previous day close">
        <Select value={s.previousDayClose} onValueChange={v => updateSection('scalesAndLines', { previousDayClose: v as ChartSettings['scalesAndLines']['previousDayClose'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="line">Line</SelectItem>
            <SelectItem value="value_line">Value and line</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <SectionTitle>TIME SCALE</SectionTitle>
      <CheckRow label="Day of week on labels" checked={s.showDayOfWeek} onChange={v => updateSection('scalesAndLines', { showDayOfWeek: v })} />
      <Row label="Time format">
        <Select value={s.timeFormat} onValueChange={v => updateSection('scalesAndLines', { timeFormat: v as ChartSettings['scalesAndLines']['timeFormat'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24-hours</SelectItem>
            <SelectItem value="12h">12-hours</SelectItem>
          </SelectContent>
        </Select>
      </Row>
    </>
  );
}

function CanvasTab({
  settings,
  updateSection,
}: {
  settings: ChartSettings;
  updateSection: <K extends keyof ChartSettings>(section: K, patch: Partial<ChartSettings[K]>) => void;
}) {
  const c = settings.canvas;

  return (
    <>
      <SectionTitle>CHART BASIC STYLES</SectionTitle>
      <Row label="Background type">
        <Select value={c.backgroundType} onValueChange={v => updateSection('canvas', { backgroundType: v as ChartSettings['canvas']['backgroundType'] })}>
          <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      {c.backgroundType === 'solid' ? (
        <Row label="Background color">
          <ColorSwatch color={c.backgroundColor} onChange={v => updateSection('canvas', { backgroundColor: v })} />
        </Row>
      ) : (
        <>
          <Row label="Gradient top">
            <ColorSwatch color={c.backgroundGradientTop} onChange={v => updateSection('canvas', { backgroundGradientTop: v })} />
          </Row>
          <Row label="Gradient bottom">
            <ColorSwatch color={c.backgroundGradientBottom} onChange={v => updateSection('canvas', { backgroundGradientBottom: v })} />
          </Row>
        </>
      )}

      <Row label="Grid lines">
        <Select value={c.gridType} onValueChange={v => updateSection('canvas', { gridType: v as ChartSettings['canvas']['gridType'] })}>
          <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="both">Vert and horz</SelectItem>
            <SelectItem value="vert">Vertical only</SelectItem>
            <SelectItem value="horz">Horizontal only</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Grid vertical color">
        <ColorSwatch color={c.gridVertColor} onChange={v => updateSection('canvas', { gridVertColor: v })} />
      </Row>
      <Row label="Grid horizontal color">
        <ColorSwatch color={c.gridHorzColor} onChange={v => updateSection('canvas', { gridHorzColor: v })} />
      </Row>

      <Row label="Crosshair color">
        <ColorSwatch color={c.crosshairColor} onChange={v => updateSection('canvas', { crosshairColor: v })} />
      </Row>
      <Row label="Crosshair style">
        <Select value={c.crosshairStyle} onValueChange={v => updateSection('canvas', { crosshairStyle: v as ChartSettings['canvas']['crosshairStyle'] })}>
          <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
            <SelectItem value="solid">Solid</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <Row label="Watermark">
        <Select value={c.watermarkMode} onValueChange={v => updateSection('canvas', { watermarkMode: v as ChartSettings['canvas']['watermarkMode'] })}>
          <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="symbol">Symbol</SelectItem>
            <SelectItem value="replay">Replay mode</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <SectionTitle>SCALES</SectionTitle>
      <Row label="Scale text color">
        <ColorSwatch color={c.scaleTextColor} onChange={v => updateSection('canvas', { scaleTextColor: v })} />
      </Row>
      <Row label="Scale text size">
        <Select value={String(c.scaleTextSize)} onValueChange={v => updateSection('canvas', { scaleTextSize: Number(v) })}>
          <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 11, 12, 13, 14, 16].map(size => (
              <SelectItem key={size} value={String(size)}>{size}px</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>
      <Row label="Scale lines color">
        <ColorSwatch color={c.scaleLinesColor} onChange={v => updateSection('canvas', { scaleLinesColor: v })} />
      </Row>

      <SectionTitle>BUTTONS</SectionTitle>
      <Row label="Navigation buttons">
        <Select value={c.navigationVisibility} onValueChange={v => updateSection('canvas', { navigationVisibility: v as ChartSettings['canvas']['navigationVisibility'] })}>
          <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="always">Always visible</SelectItem>
            <SelectItem value="mouse_over">Visible on mouse over</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Pane buttons">
        <Select value={c.paneVisibility} onValueChange={v => updateSection('canvas', { paneVisibility: v as ChartSettings['canvas']['paneVisibility'] })}>
          <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="always">Always visible</SelectItem>
            <SelectItem value="mouse_over">Visible on mouse over</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <SectionTitle>MARGINS</SectionTitle>
      <Row label="Top margin (%)">
        <Input
          type="number"
          value={c.marginTop}
          min={0}
          max={80}
          onChange={e => updateSection('canvas', { marginTop: Number(e.target.value) })}
          className="h-8 w-[120px]"
        />
      </Row>
      <Row label="Bottom margin (%)">
        <Input
          type="number"
          value={c.marginBottom}
          min={0}
          max={80}
          onChange={e => updateSection('canvas', { marginBottom: Number(e.target.value) })}
          className="h-8 w-[120px]"
        />
      </Row>
      <Row label="Right margin (bars)">
        <Input
          type="number"
          value={c.marginRight}
          min={0}
          max={100}
          onChange={e => updateSection('canvas', { marginRight: Number(e.target.value) })}
          className="h-8 w-[120px]"
        />
      </Row>
    </>
  );
}

function TradingTab({
  settings,
  updateTradingGeneral,
  updateTradingAppearance,
}: {
  settings: ChartSettings;
  updateTradingGeneral: (patch: Partial<ChartSettings['trading']['general']>) => void;
  updateTradingAppearance: (patch: Partial<ChartSettings['trading']['appearance']>) => void;
}) {
  const g = settings.trading.general;
  const a = settings.trading.appearance;

  return (
    <>
      <SectionTitle>GENERAL</SectionTitle>
      <CheckRow label="Show buy and sell buttons" checked={g.showBuySellButtons} onChange={v => updateTradingGeneral({ showBuySellButtons: v })} />
      <CheckRow label="Instant order placement" checked={g.instantOrderPlacement} onChange={v => updateTradingGeneral({ instantOrderPlacement: v })} />

      <Row label="Play sound for executions">
        <Select value={g.executionSound} onValueChange={v => updateTradingGeneral({ executionSound: v as ChartSettings['trading']['general']['executionSound'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="ding">Ding</SelectItem>
            <SelectItem value="bell">Bell</SelectItem>
            <SelectItem value="chime">Chime</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <Row label="Notifications">
        <Select value={g.notifications} onValueChange={v => updateTradingGeneral({ notifications: v as ChartSettings['trading']['general']['notifications'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="rejections_only">Rejections only</SelectItem>
            <SelectItem value="all_events">All events</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <SectionTitle>APPEARANCE</SectionTitle>
      <CheckRow label="Positions" checked={a.showPositions} onChange={v => updateTradingAppearance({ showPositions: v })} />
      <Row label="Position P&L display">
        <Select value={a.positionPnlDisplay} onValueChange={v => updateTradingAppearance({ positionPnlDisplay: v as ChartSettings['trading']['appearance']['positionPnlDisplay'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="money">Money</SelectItem>
            <SelectItem value="ticks">Ticks</SelectItem>
            <SelectItem value="percent">Percent</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <CheckRow label="Reverse button on hover" checked={a.reverseButtonOnHover} onChange={v => updateTradingAppearance({ reverseButtonOnHover: v })} />
      <CheckRow label="Orders" checked={a.showOrders} onChange={v => updateTradingAppearance({ showOrders: v })} />
      <CheckRow label="Executions" checked={a.showExecutions} onChange={v => updateTradingAppearance({ showExecutions: v })} />
      <CheckRow label="Execution labels" checked={a.showExecutionLabels} onChange={v => updateTradingAppearance({ showExecutionLabels: v })} />
      <CheckRow label="Extended price line" checked={a.extendedPriceLine} onChange={v => updateTradingAppearance({ extendedPriceLine: v })} />
      <CheckRow label="Show on screenshots" checked={a.showOnScreenshots} onChange={v => updateTradingAppearance({ showOnScreenshots: v })} />

      <Row label="Brackets P&L">
        <Select value={a.bracketPnlDisplay} onValueChange={v => updateTradingAppearance({ bracketPnlDisplay: v as ChartSettings['trading']['appearance']['bracketPnlDisplay'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="money">Money</SelectItem>
            <SelectItem value="ticks">Ticks</SelectItem>
            <SelectItem value="percent">Percent</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <Row label="Orders & positions alignment">
        <Select value={a.ordersAndPositionsAlignment} onValueChange={v => updateTradingAppearance({ ordersAndPositionsAlignment: v as ChartSettings['trading']['appearance']['ordersAndPositionsAlignment'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
          </SelectContent>
        </Select>
      </Row>
    </>
  );
}

function AlertsTab({
  settings,
  updateSection,
}: {
  settings: ChartSettings;
  updateSection: <K extends keyof ChartSettings>(section: K, patch: Partial<ChartSettings[K]>) => void;
}) {
  const a = settings.alerts;

  return (
    <>
      <SectionTitle>ALERTS</SectionTitle>
      <Row label="Alert line color">
        <ColorSwatch color={a.alertLineColor} onChange={v => updateSection('alerts', { alertLineColor: v })} />
      </Row>
      <CheckRow label="Only active alerts" checked={a.onlyActiveAlerts} onChange={v => updateSection('alerts', { onlyActiveAlerts: v })} />
      <Row label={`Alert volume ${a.alertVolume}%`}>
        <Slider
          value={[a.alertVolume]}
          onValueChange={([v]) => updateSection('alerts', { alertVolume: v })}
          min={0}
          max={100}
          step={1}
          className="w-[180px]"
        />
      </Row>
      <CheckRow label="Automatically hide toasts" checked={a.autoHideToasts} onChange={v => updateSection('alerts', { autoHideToasts: v })} />
    </>
  );
}

function EventsTab({
  settings,
  updateSection,
}: {
  settings: ChartSettings;
  updateSection: <K extends keyof ChartSettings>(section: K, patch: Partial<ChartSettings[K]>) => void;
}) {
  const e = settings.events;

  return (
    <>
      <SectionTitle>EVENTS</SectionTitle>
      <CheckRow label="Ideas" checked={e.showIdeas} onChange={v => updateSection('events', { showIdeas: v })} />
      <CheckRow label="Dividends" checked={e.showDividends} onChange={v => updateSection('events', { showDividends: v })} />
      <CheckRow label="Stock splits" checked={e.showSplits} onChange={v => updateSection('events', { showSplits: v })} />
      <CheckRow label="Earnings" checked={e.showEarnings} onChange={v => updateSection('events', { showEarnings: v })} />
      <CheckRow label="Earnings break" checked={e.showEarningsBreak} onChange={v => updateSection('events', { showEarningsBreak: v })} />
      <CheckRow label="Latest news" checked={e.showLatestNews} onChange={v => updateSection('events', { showLatestNews: v })} />
      <CheckRow label="News notifications" checked={e.newsNotifications} onChange={v => updateSection('events', { newsNotifications: v })} />
    </>
  );
}

function PriceScaleTab({
  settings,
  updateSection,
}: {
  settings: ChartSettings;
  updateSection: <K extends keyof ChartSettings>(section: K, patch: Partial<ChartSettings[K]>) => void;
}) {
  const p = settings.priceScale;

  return (
    <>
      <SectionTitle>MORE PRICE SCALE SETTINGS</SectionTitle>
      <CheckRow label="Auto scale" checked={p.autoScale} onChange={v => updateSection('priceScale', { autoScale: v })} />
      <CheckRow label="Scale price chart only" checked={p.scalePriceChartOnly} onChange={v => updateSection('priceScale', { scalePriceChartOnly: v })} />
      <CheckRow label="Invert scale" checked={p.invertScale} onChange={v => updateSection('priceScale', { invertScale: v })} />

      <Row label="Scale type">
        <Select value={p.mode} onValueChange={v => updateSection('priceScale', { mode: v as ChartSettings['priceScale']['mode'] })}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="percent">Percent</SelectItem>
            <SelectItem value="indexed_to_100">Indexed to 100</SelectItem>
            <SelectItem value="logarithmic">Logarithmic</SelectItem>
          </SelectContent>
        </Select>
      </Row>
    </>
  );
}

function TemplateTab({
  templateName,
  setTemplateName,
  templateNames,
  onSaveTemplate,
  onApplyTemplate,
  onDeleteTemplate,
}: {
  templateName: string;
  setTemplateName: (v: string) => void;
  templateNames: string[];
  onSaveTemplate: () => void;
  onApplyTemplate: (name: string) => void;
  onDeleteTemplate: (name: string) => void;
}) {
  return (
    <>
      <SectionTitle>TEMPLATE</SectionTitle>
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="Template name"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          className="h-8"
        />
        <button
          type="button"
          onClick={onSaveTemplate}
          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          Save template
        </button>
      </div>

      {templateNames.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates yet — save one to reuse your setup instantly.</p>
      ) : (
        <div className="space-y-2">
          {templateNames.map(name => (
            <div key={name} className="flex items-center justify-between rounded border border-chart-border px-3 py-2">
              <span className="text-sm text-foreground">{name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onApplyTemplate(name)}
                  className="rounded bg-secondary px-3 py-1 text-xs text-foreground hover:bg-accent"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTemplate(name)}
                  className="rounded bg-secondary px-3 py-1 text-xs text-foreground hover:bg-accent"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}