// Indicator system types

export type LineStyleType = 'solid' | 'dashed' | 'dotted';
export type ParamType = 'number' | 'source' | 'select' | 'boolean';

export type IndicatorCategory =
  | 'Moving Averages'
  | 'Bands & Channels'
  | 'Trend'
  | 'Oscillators'
  | 'Volume'
  | 'Volatility'
  | 'Momentum';

export interface ParamDef {
  key: string;
  label: string;
  type: ParamType;
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface LineDef {
  key: string;
  label: string;
  color: string;
  width: number;
  style: LineStyleType;
  visible: boolean;
  isHistogram?: boolean;
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Point {
  time: number;
  value: number;
}

export interface IndicatorDefinition {
  id: string;
  name: string;
  shortName: string;
  category: IndicatorCategory;
  overlay: boolean;
  params: ParamDef[];
  lines: LineDef[];
  calculate: (data: OHLCV[], params: Record<string, any>) => Record<string, Point[]>;
}

export interface LineStyleConfig {
  color: string;
  width: number;
  style: LineStyleType;
  visible: boolean;
}

export interface IndicatorInstance {
  definitionId: string;
  params: Record<string, any>;
  lineStyles: Record<string, LineStyleConfig>;
}

export function createInstance(def: IndicatorDefinition): IndicatorInstance {
  const params: Record<string, any> = {};
  for (const p of def.params) params[p.key] = p.default;
  const lineStyles: Record<string, LineStyleConfig> = {};
  for (const l of def.lines) {
    lineStyles[l.key] = { color: l.color, width: l.width, style: l.style, visible: l.visible };
  }
  return { definitionId: def.id, params, lineStyles };
}

export function resetInstance(def: IndicatorDefinition): IndicatorInstance {
  return createInstance(def);
}

export function getDisplayName(def: IndicatorDefinition, instance: IndicatorInstance): string {
  const p = instance.params;
  switch (def.id) {
    case 'macd': return `MACD ${p.fast},${p.slow},${p.signal}`;
    case 'bbands': return `BB ${p.period},${p.mult}`;
    case 'stoch': return `Stoch ${p.kPeriod},${p.dPeriod}`;
    case 'ichimoku': return 'Ichimoku';
    case 'volume': return 'Volume';
    case 'vwap': return 'VWAP';
    default:
      if (p.period !== undefined) return `${def.shortName} ${p.period}`;
      return def.shortName;
  }
}
