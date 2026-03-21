import { useCallback } from 'react';
import { Check, ChevronRight, Settings, RotateCcw } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuCheckboxItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { useChart } from '@/context/ChartContext';
import type { PriceScaleSettings, ScalesAndLinesSettings } from '@/types/chartSettings';

interface Props {
  children: React.ReactNode;
  onOpenSettings: () => void;
  onResetScale?: () => void;
}

export default function PriceScaleContextMenu({ children, onOpenSettings, onResetScale }: Props) {
  const { chartSettings, setChartSettings } = useChart();
  const ps = chartSettings.priceScale;
  const scales = chartSettings.scalesAndLines;

  const updatePriceScale = useCallback((patch: Partial<PriceScaleSettings>) => {
    setChartSettings(prev => ({
      ...prev,
      priceScale: { ...prev.priceScale, ...patch },
    }));
  }, [setChartSettings]);

  const updateScales = useCallback((patch: Partial<ScalesAndLinesSettings>) => {
    setChartSettings(prev => ({
      ...prev,
      scalesAndLines: { ...prev.scalesAndLines, ...patch },
    }));
  }, [setChartSettings]);

  const resetPriceScale = useCallback(() => {
    updatePriceScale({ autoScale: true, mode: 'regular' });
  }, [updatePriceScale]);

  const setMode = useCallback((mode: PriceScaleSettings['mode']) => {
    updatePriceScale({ mode });
  }, [updatePriceScale]);

  const moveScaleToLeft = useCallback(() => {
    updateScales({
      scalesPlacement: scales.scalesPlacement === 'left' ? 'right' : 'left',
    });
  }, [updateScales, scales.scalesPlacement]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-[hsl(var(--card))] border-[hsl(var(--border))]">
        {/* Reset */}
        <ContextMenuItem onClick={resetPriceScale} className="gap-2">
          <RotateCcw size={14} className="text-muted-foreground" />
          Reset price scale
          <span className="ml-auto text-xs text-muted-foreground">Alt + R</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Auto / Lock / Scale chart only / Invert */}
        <ContextMenuCheckboxItem
          checked={ps.autoScale}
          onCheckedChange={(v) => updatePriceScale({ autoScale: !!v })}
        >
          Auto (fits data to screen)
        </ContextMenuCheckboxItem>

        <ContextMenuItem disabled className="text-muted-foreground">
          Lock price to bar ratio
          <span className="ml-auto text-xs text-muted-foreground/60">1.2667</span>
        </ContextMenuItem>

        <ContextMenuCheckboxItem
          checked={ps.scalePriceChartOnly}
          onCheckedChange={(v) => updatePriceScale({ scalePriceChartOnly: !!v })}
        >
          Scale price chart only
        </ContextMenuCheckboxItem>

        <ContextMenuCheckboxItem
          checked={ps.invertScale}
          onCheckedChange={(v) => updatePriceScale({ invertScale: !!v })}
        >
          Invert scale
          <span className="ml-auto text-xs text-muted-foreground">Alt + I</span>
        </ContextMenuCheckboxItem>

        <ContextMenuSeparator />

        {/* Scale modes */}
        {(['regular', 'percent', 'indexed_to_100', 'logarithmic'] as const).map((mode) => {
          const labels: Record<string, string> = {
            regular: 'Regular',
            percent: 'Percent',
            indexed_to_100: 'Indexed to 100',
            logarithmic: 'Logarithmic',
          };
          const shortcuts: Record<string, string> = {
            percent: 'Alt + P',
            logarithmic: 'Alt + L',
          };
          return (
            <ContextMenuItem
              key={mode}
              onClick={() => setMode(mode)}
              className="gap-2"
            >
              {ps.mode === mode ? (
                <Check size={14} />
              ) : (
                <span className="w-[14px]" />
              )}
              {labels[mode]}
              {shortcuts[mode] && (
                <span className="ml-auto text-xs text-muted-foreground">{shortcuts[mode]}</span>
              )}
            </ContextMenuItem>
          );
        })}

        <ContextMenuSeparator />

        {/* Move scale */}
        <ContextMenuItem onClick={moveScaleToLeft} className="gap-2">
          <span className="w-[14px]" />
          {scales.scalesPlacement === 'left' ? 'Move scale to right' : 'Move scale to left'}
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Labels submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <span className="w-[14px]" />
            Labels
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56 bg-[hsl(var(--card))] border-[hsl(var(--border))]">
            {([
              { key: 'symbolDisplay', label: 'Symbol last value', options: ['name_value_line', 'name_value', 'value', 'hidden'] },
              { key: 'previousDayClose', label: 'Previous day close', options: ['hidden', 'line', 'value_line'] },
              { key: 'highLowDisplay', label: 'High/Low price', options: ['hidden', 'line', 'value_line'] },
              { key: 'indicatorsDisplay', label: 'Indicators', options: ['value', 'name_value', 'hidden'] },
            ] as const).map(({ key, label }) => (
              <ContextMenuCheckboxItem
                key={key}
                checked={scales[key] !== 'hidden'}
                onCheckedChange={(v) => updateScales({ [key]: v ? (key === 'indicatorsDisplay' ? 'value' : 'name_value_line') : 'hidden' } as any)}
              >
                {label}
              </ContextMenuCheckboxItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Lines submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <span className="w-[14px]" />
            Lines
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56 bg-[hsl(var(--card))] border-[hsl(var(--border))]">
            <ContextMenuCheckboxItem
              checked={scales.countdownToBarClose}
              onCheckedChange={(v) => updateScales({ countdownToBarClose: !!v })}
            >
              Countdown to bar close
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem
              checked={scales.noOverlappingLabels}
              onCheckedChange={(v) => updateScales({ noOverlappingLabels: !!v })}
            >
              No overlapping labels
            </ContextMenuCheckboxItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Plus button */}
        <ContextMenuCheckboxItem
          checked={scales.showPlusButton}
          onCheckedChange={(v) => updateScales({ showPlusButton: !!v })}
        >
          Plus button
        </ContextMenuCheckboxItem>

        <ContextMenuSeparator />

        {/* More settings */}
        <ContextMenuItem onClick={onOpenSettings} className="gap-2">
          <Settings size={14} className="text-muted-foreground" />
          More settings…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
