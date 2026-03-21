import type { Interval, ChartType, Drawing } from './chart';
import type { ChartSettings } from './chartSettings';

export interface ChartLayout {
  id: string;
  name: string;
  symbol: string;
  interval: Interval;
  chartType: ChartType;
  indicators: string[];
  drawings: Drawing[];
  chartSettings: ChartSettings;
  createdAt: number;
  updatedAt: number;
}

export type MultiChartGrid = 
  | '1' | '2h' | '2v' 
  | '3h1' | '3h2' | '3v1' | '3v2'
  | '4' | '4h1' | '4v1'
  | '6h' | '6v'
  | '8' | '9' | '12' | '16';

export interface LayoutSyncOptions {
  symbol: boolean;
  interval: boolean;
  crosshair: boolean;
  time: boolean;
  dateRange: boolean;
}

export const DEFAULT_SYNC_OPTIONS: LayoutSyncOptions = {
  symbol: false,
  interval: false,
  crosshair: true,
  time: false,
  dateRange: false,
};

export function getGridCells(grid: MultiChartGrid): number {
  switch (grid) {
    case '1': return 1;
    case '2h': case '2v': return 2;
    case '3h1': case '3h2': case '3v1': case '3v2': return 3;
    case '4': case '4h1': case '4v1': return 4;
    case '6h': case '6v': return 6;
    case '8': return 8;
    case '9': return 9;
    case '12': return 12;
    case '16': return 16;
    default: return 1;
  }
}
