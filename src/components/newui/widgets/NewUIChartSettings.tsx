// Chart settings dialog for New UI — isolated from Classic
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export interface ChartConfig {
  candleUp: string;
  candleDown: string;
  wickUp: string;
  wickDown: string;
  bg: string;
  showGrid: boolean;
  showGlow: boolean;
  showVolume: boolean;
  showBorders: boolean;
  crosshairColor: string;
}

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  candleUp: '#26a69a',
  candleDown: '#ef5350',
  wickUp: '#26a69a',
  wickDown: '#ef5350',
  bg: '#131722',
  showGrid: true,
  showGlow: false,
  showVolume: true,
  showBorders: true,
  crosshairColor: '#758696',
};

interface Props {
  open: boolean;
  onClose: () => void;
  config: ChartConfig;
  onChange: (config: ChartConfig) => void;
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-white/60 font-mono">{label}</span>
      <label className="relative cursor-pointer group">
        <div
          className="w-8 h-5 rounded border border-white/10 group-hover:border-white/25 transition-colors"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-white/60 font-mono">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-75" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/30 font-mono mb-1.5">{title}</h4>
      {children}
    </div>
  );
}

export default function NewUIChartSettings({ open, onClose, config, onChange }: Props) {
  const update = (patch: Partial<ChartConfig>) => onChange({ ...config, ...patch });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[380px] bg-[#0a1628]/95 backdrop-blur-xl border-white/[0.06] text-white">
        <DialogHeader>
          <DialogTitle className="text-sm font-mono tracking-wide text-white/80">Chart Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Candle Colors */}
          <Section title="Candlesticks">
            <ColorRow label="Bull body" value={config.candleUp} onChange={(v) => update({ candleUp: v })} />
            <ColorRow label="Bear body" value={config.candleDown} onChange={(v) => update({ candleDown: v })} />
            <ColorRow label="Bull wick" value={config.wickUp} onChange={(v) => update({ wickUp: v })} />
            <ColorRow label="Bear wick" value={config.wickDown} onChange={(v) => update({ wickDown: v })} />
            <ToggleRow label="Show borders" checked={config.showBorders} onChange={(v) => update({ showBorders: v })} />
          </Section>

          {/* Canvas */}
          <Section title="Canvas">
            <ColorRow label="Background" value={config.bg} onChange={(v) => update({ bg: v })} />
            <ColorRow label="Crosshair" value={config.crosshairColor} onChange={(v) => update({ crosshairColor: v })} />
            <ToggleRow label="Show grid" checked={config.showGrid} onChange={(v) => update({ showGrid: v })} />
            <ToggleRow label="Candle glow" checked={config.showGlow} onChange={(v) => update({ showGlow: v })} />
            <ToggleRow label="Show volume" checked={config.showVolume} onChange={(v) => update({ showVolume: v })} />
          </Section>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.05]">
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] font-mono text-white/40 hover:text-white/70 gap-1.5"
            onClick={() => onChange(DEFAULT_CHART_CONFIG)}
          >
            <RotateCcw size={11} />
            Reset defaults
          </Button>
          <Button
            size="sm"
            className="text-[10px] font-mono bg-white/10 hover:bg-white/15 text-white/80"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
