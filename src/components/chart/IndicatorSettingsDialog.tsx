import { useState, useEffect } from 'react';
import DraggableDialog from './DraggableDialog';
import type {
  IndicatorConfig, EMAConfig, SMAConfig, BollingerConfig, VolumeConfig,
  MASource, MAType, LineStyleType,
} from '@/types/indicators';

interface Props {
  open: boolean;
  onClose: () => void;
  indicatorName: string;
  config: IndicatorConfig;
  onApply: (config: IndicatorConfig) => void;
}

const MA_SOURCES: { value: MASource; label: string }[] = [
  { value: 'close', label: 'Close' },
  { value: 'open', label: 'Open' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
  { value: 'hl2', label: 'HL/2' },
  { value: 'hlc3', label: 'HLC/3' },
  { value: 'ohlc4', label: 'OHLC/4' },
];

const LINE_STYLES: { value: LineStyleType; label: string }[] = [
  { value: 'solid', label: '━━━' },
  { value: 'dashed', label: '┅┅┅' },
  { value: 'dotted', label: '╌╌╌' },
];

function InputRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4">
      <span className="text-[13px] text-foreground">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, min, max, className = '' }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(Math.max(min ?? 0, Math.min(max ?? 9999, Number(e.target.value) || 0)))}
      className={`w-16 bg-muted/40 border border-chart-border rounded px-2 py-1 text-[13px] text-foreground text-right outline-none focus:border-primary ${className}`}
    />
  );
}

function SelectInput<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="bg-muted/40 border border-chart-border rounded px-2 py-1 text-[13px] text-foreground outline-none focus:border-primary cursor-pointer"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-8 h-6 rounded border border-chart-border overflow-hidden cursor-pointer">
      <input
        type="color"
        value={value.startsWith('#') ? value : '#ffffff'}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
      />
      <div className="w-full h-full" style={{ backgroundColor: value }} />
    </div>
  );
}

function LineStyleRow({ label, style, onChange }: {
  label: string;
  style: { color: string; lineWidth: number; lineStyle: LineStyleType; visible: boolean };
  onChange: (s: typeof style) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-4">
      <input
        type="checkbox"
        checked={style.visible}
        onChange={e => onChange({ ...style, visible: e.target.checked })}
        className="accent-primary w-4 h-4 cursor-pointer"
      />
      <span className="text-[13px] text-foreground w-16">{label}</span>
      <ColorInput value={style.color} onChange={c => onChange({ ...style, color: c })} />
      <SelectInput
        value={String(style.lineWidth) as string}
        options={[
          { value: '1', label: '1px' },
          { value: '2', label: '2px' },
          { value: '3', label: '3px' },
          { value: '4', label: '4px' },
        ]}
        onChange={v => onChange({ ...style, lineWidth: Number(v) })}
      />
      <SelectInput
        value={style.lineStyle}
        options={LINE_STYLES}
        onChange={v => onChange({ ...style, lineStyle: v })}
      />
    </div>
  );
}

function EMASettings({ config, onChange }: { config: EMAConfig; onChange: (c: EMAConfig) => void }) {
  const [tab, setTab] = useState<'inputs' | 'style'>('inputs');
  return (
    <>
      <Tabs active={tab} onChange={setTab} tabs={['inputs', 'style']} />
      {tab === 'inputs' && (
        <div className="divide-y divide-chart-border/30">
          <InputRow label="Length">
            <NumberInput value={config.period} onChange={v => onChange({ ...config, period: v })} min={1} max={500} />
          </InputRow>
          <InputRow label="Source">
            <SelectInput value={config.source} options={MA_SOURCES} onChange={v => onChange({ ...config, source: v })} />
          </InputRow>
          <InputRow label="Offset">
            <NumberInput value={config.offset} onChange={v => onChange({ ...config, offset: v })} min={-100} max={100} />
          </InputRow>
        </div>
      )}
      {tab === 'style' && (
        <div>
          <LineStyleRow label="Line" style={config.style} onChange={s => onChange({ ...config, style: s })} />
        </div>
      )}
    </>
  );
}

function SMASettings({ config, onChange }: { config: SMAConfig; onChange: (c: SMAConfig) => void }) {
  const [tab, setTab] = useState<'inputs' | 'style'>('inputs');
  return (
    <>
      <Tabs active={tab} onChange={setTab} tabs={['inputs', 'style']} />
      {tab === 'inputs' && (
        <div className="divide-y divide-chart-border/30">
          <InputRow label="Length">
            <NumberInput value={config.period} onChange={v => onChange({ ...config, period: v })} min={1} max={500} />
          </InputRow>
          <InputRow label="Source">
            <SelectInput value={config.source} options={MA_SOURCES} onChange={v => onChange({ ...config, source: v })} />
          </InputRow>
          <InputRow label="Offset">
            <NumberInput value={config.offset} onChange={v => onChange({ ...config, offset: v })} min={-100} max={100} />
          </InputRow>
        </div>
      )}
      {tab === 'style' && (
        <div>
          <LineStyleRow label="Line" style={config.style} onChange={s => onChange({ ...config, style: s })} />
        </div>
      )}
    </>
  );
}

function BollingerSettings({ config, onChange }: { config: BollingerConfig; onChange: (c: BollingerConfig) => void }) {
  const [tab, setTab] = useState<'inputs' | 'style'>('inputs');
  return (
    <>
      <Tabs active={tab} onChange={setTab} tabs={['inputs', 'style']} />
      {tab === 'inputs' && (
        <div className="divide-y divide-chart-border/30">
          <InputRow label="Length">
            <NumberInput value={config.length} onChange={v => onChange({ ...config, length: v })} min={1} max={500} />
          </InputRow>
          <InputRow label="Basis MA Type">
            <SelectInput
              value={config.basisMAType}
              options={[{ value: 'SMA' as MAType, label: 'SMA' }, { value: 'EMA' as MAType, label: 'EMA' }]}
              onChange={v => onChange({ ...config, basisMAType: v })}
            />
          </InputRow>
          <InputRow label="Source">
            <SelectInput value={config.source} options={MA_SOURCES} onChange={v => onChange({ ...config, source: v })} />
          </InputRow>
          <InputRow label="StdDev">
            <NumberInput value={config.stdDev} onChange={v => onChange({ ...config, stdDev: v })} min={0.1} max={10} />
          </InputRow>
          <InputRow label="Offset">
            <NumberInput value={config.offset} onChange={v => onChange({ ...config, offset: v })} min={-100} max={100} />
          </InputRow>
        </div>
      )}
      {tab === 'style' && (
        <div className="divide-y divide-chart-border/30">
          <LineStyleRow label="Basis" style={config.basisStyle} onChange={s => onChange({ ...config, basisStyle: s })} />
          <LineStyleRow label="Upper" style={config.upperStyle} onChange={s => onChange({ ...config, upperStyle: s })} />
          <LineStyleRow label="Lower" style={config.lowerStyle} onChange={s => onChange({ ...config, lowerStyle: s })} />
          <div className="flex items-center gap-3 py-2.5 px-4">
            <input
              type="checkbox"
              checked={config.showBackground}
              onChange={e => onChange({ ...config, showBackground: e.target.checked })}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
            <span className="text-[13px] text-foreground">Background</span>
            <ColorInput
              value={config.backgroundColor.startsWith('rgba') ? '#2196f3' : config.backgroundColor}
              onChange={c => onChange({ ...config, backgroundColor: c })}
            />
          </div>
        </div>
      )}
    </>
  );
}

function VolumeSettings({ config, onChange }: { config: VolumeConfig; onChange: (c: VolumeConfig) => void }) {
  const [tab, setTab] = useState<'inputs' | 'style'>('inputs');
  return (
    <>
      <Tabs active={tab} onChange={setTab} tabs={['inputs', 'style']} />
      {tab === 'inputs' && (
        <div className="divide-y divide-chart-border/30">
          <InputRow label="Show MA">
            <input
              type="checkbox"
              checked={config.showMA}
              onChange={e => onChange({ ...config, showMA: e.target.checked })}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </InputRow>
          {config.showMA && (
            <InputRow label="MA Period">
              <NumberInput value={config.maPeriod} onChange={v => onChange({ ...config, maPeriod: v })} min={1} max={200} />
            </InputRow>
          )}
        </div>
      )}
      {tab === 'style' && (
        <div className="divide-y divide-chart-border/30">
          <InputRow label="Up Color">
            <ColorInput value={config.upColor} onChange={c => onChange({ ...config, upColor: c })} />
          </InputRow>
          <InputRow label="Down Color">
            <ColorInput value={config.downColor} onChange={c => onChange({ ...config, downColor: c })} />
          </InputRow>
          {config.showMA && (
            <InputRow label="MA Color">
              <ColorInput value={config.maColor} onChange={c => onChange({ ...config, maColor: c })} />
            </InputRow>
          )}
        </div>
      )}
    </>
  );
}

function Tabs({ active, onChange, tabs }: { active: string; onChange: (t: any) => void; tabs: string[] }) {
  return (
    <div className="flex border-b border-chart-border">
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-2.5 text-[13px] font-medium capitalize transition-colors relative ${
            active === t
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t}
          {active === t && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}

export default function IndicatorSettingsDialog({ open, onClose, indicatorName, config, onApply }: Props) {
  const [localConfig, setLocalConfig] = useState<IndicatorConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config, open]);

  const handleApply = () => {
    onApply(localConfig);
    onClose();
  };

  const shortName = indicatorName.startsWith('EMA') || indicatorName.startsWith('SMA')
    ? indicatorName
    : indicatorName === 'Bollinger Bands' ? 'BB' : indicatorName;

  return (
    <DraggableDialog
      id={`indicator-settings-${indicatorName}`}
      open={open}
      onClose={onClose}
      title={shortName}
      className="w-[380px] max-w-[90vw]"
    >
      <div className="min-h-[200px]">
        {localConfig.type === 'EMA' && <EMASettings config={localConfig} onChange={setLocalConfig as any} />}
        {localConfig.type === 'SMA' && <SMASettings config={localConfig} onChange={setLocalConfig as any} />}
        {localConfig.type === 'Bollinger Bands' && <BollingerSettings config={localConfig} onChange={setLocalConfig as any} />}
        {localConfig.type === 'Volume' && <VolumeSettings config={localConfig} onChange={setLocalConfig as any} />}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-chart-border">
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-[13px] text-muted-foreground hover:text-foreground rounded border border-chart-border hover:bg-muted/30 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-1.5 text-[13px] bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors font-medium"
        >
          Ok
        </button>
      </div>
    </DraggableDialog>
  );
}
