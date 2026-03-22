// Indicator configuration types for per-indicator settings

export type MASource = 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4';
export type MAType = 'SMA' | 'EMA';
export type LineStyleType = 'solid' | 'dashed' | 'dotted';

export interface IndicatorLineStyle {
  color: string;
  lineWidth: number;
  lineStyle: LineStyleType;
  visible: boolean;
}

export interface EMAConfig {
  type: 'EMA';
  period: number;
  source: MASource;
  offset: number;
  style: IndicatorLineStyle;
}

export interface SMAConfig {
  type: 'SMA';
  period: number;
  source: MASource;
  offset: number;
  style: IndicatorLineStyle;
}

export interface BollingerConfig {
  type: 'Bollinger Bands';
  length: number;
  basisMAType: MAType;
  source: MASource;
  stdDev: number;
  offset: number;
  basisStyle: IndicatorLineStyle;
  upperStyle: IndicatorLineStyle;
  lowerStyle: IndicatorLineStyle;
  showBackground: boolean;
  backgroundColor: string;
}

export interface VolumeConfig {
  type: 'Volume';
  upColor: string;
  downColor: string;
  showMA: boolean;
  maPeriod: number;
  maColor: string;
}

export type IndicatorConfig = EMAConfig | SMAConfig | BollingerConfig | VolumeConfig;

export const DEFAULT_INDICATOR_COLORS: Record<string, string> = {
  'EMA 9': '#f7931a',
  'EMA 21': '#e91e63',
  'EMA 50': '#2196f3',
  'EMA 200': '#9c27b0',
  'SMA 20': '#ff9800',
  'SMA 50': '#4caf50',
  'SMA 100': '#00bcd4',
  'SMA 200': '#e91e63',
};

export function getDefaultConfig(name: string): IndicatorConfig {
  if (name.startsWith('EMA')) {
    const period = parseInt(name.split(' ')[1]) || 9;
    return {
      type: 'EMA',
      period,
      source: 'close',
      offset: 0,
      style: {
        color: DEFAULT_INDICATOR_COLORS[name] || '#ffffff',
        lineWidth: 1,
        lineStyle: 'solid',
        visible: true,
      },
    };
  }
  if (name.startsWith('SMA')) {
    const period = parseInt(name.split(' ')[1]) || 20;
    return {
      type: 'SMA',
      period,
      source: 'close',
      offset: 0,
      style: {
        color: DEFAULT_INDICATOR_COLORS[name] || '#ffffff',
        lineWidth: 1,
        lineStyle: 'solid',
        visible: true,
      },
    };
  }
  if (name === 'Bollinger Bands') {
    return {
      type: 'Bollinger Bands',
      length: 20,
      basisMAType: 'SMA',
      source: 'close',
      stdDev: 2,
      offset: 0,
      basisStyle: { color: '#2196f3', lineWidth: 1, lineStyle: 'solid', visible: true },
      upperStyle: { color: '#e91e63', lineWidth: 1, lineStyle: 'dashed', visible: true },
      lowerStyle: { color: '#4caf50', lineWidth: 1, lineStyle: 'dashed', visible: true },
      showBackground: true,
      backgroundColor: 'rgba(33, 150, 243, 0.08)',
    };
  }
  if (name === 'Volume') {
    return {
      type: 'Volume',
      upColor: '#26a69a',
      downColor: '#ef5350',
      showMA: false,
      maPeriod: 20,
      maColor: '#ff9800',
    };
  }
  // fallback
  return {
    type: 'EMA',
    period: 9,
    source: 'close',
    offset: 0,
    style: { color: '#ffffff', lineWidth: 1, lineStyle: 'solid', visible: true },
  };
}

export function getIndicatorDisplayName(config: IndicatorConfig): string {
  switch (config.type) {
    case 'EMA': return `EMA ${config.period}`;
    case 'SMA': return `SMA ${config.period}`;
    case 'Bollinger Bands': return `BB ${config.length}, ${config.stdDev}`;
    case 'Volume': return 'Volume';
  }
}
