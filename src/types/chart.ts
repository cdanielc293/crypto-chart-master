export type Interval = '1s' | '5s' | '10s' | '15s' | '30s' | '45s' | '1m' | '2m' | '3m' | '5m' | '10m' | '15m' | '30m' | '45m' | '1h' | '2h' | '3h' | '4h' | '1d' | '1w' | '1M' | '3M' | '6M' | '12M';

export type DrawingTool =
  // Cursor group
  | 'cursor' | 'dot' | 'arrow_cursor'
  // Lines
  | 'trendline' | 'ray' | 'infoline' | 'extendedline' | 'trendangle'
  | 'horizontalline' | 'horizontalray' | 'verticalline' | 'crossline'
  // Channels
  | 'parallelchannel' | 'regressiontrend' | 'flattopbottom' | 'disjointchannel'
  // Pitchforks
  | 'pitchfork' | 'schiffpitchfork' | 'modifiedschiff' | 'insidepitchfork'
  // Fibonacci
  | 'fibonacci' | 'fibextension' | 'fibchannel' | 'fibtimezone'
  | 'fibspeedresistance' | 'fibtrendtime' | 'fibcircles' | 'fibspiral'
  | 'fibspeedarcs' | 'fibwedge' | 'pitchfan'
  // Gann
  | 'gannbox' | 'gannsquarefixed' | 'gannsquare' | 'gannfan'
  // Patterns
  | 'xabcd' | 'cypher' | 'headshoulders' | 'abcd' | 'trianglepattern' | 'threedrives'
  // Elliott
  | 'elliottimpulse' | 'elliottcorrection' | 'elliotttriangle' | 'elliottdouble' | 'elliotttriple'
  // Cycles
  | 'cycliclines' | 'timecycles' | 'sineline'
  // Forecasting
  | 'longposition' | 'shortposition' | 'positionforecast' | 'barpattern' | 'ghostfeed' | 'sector'
  // Volume-based
  | 'anchoredvwap' | 'fixedrangevolume' | 'anchoredvolume'
  // Measurers
  | 'pricerange' | 'daterange' | 'datepricerange'
  // Brushes
  | 'brush' | 'highlighter'
  // Arrows
  | 'arrowmarker' | 'arrowdraw' | 'arrowmarkup' | 'arrowmarkdown'
  // Shapes
  | 'rectangle' | 'rotatedrectangle' | 'path' | 'circle' | 'ellipse'
  | 'polyline' | 'triangle' | 'arc' | 'curve' | 'doublecurve'
  // Text, Note & Emoji
  | 'text' | 'note' | 'emoji';

export type ChartType =
  | 'bars' | 'candles' | 'hollow' | 'volume_candles'
  | 'line' | 'line_markers' | 'step_line'
  | 'area' | 'hlc_area' | 'baseline'
  | 'columns' | 'high_low'
  | 'heikin_ashi' | 'renko' | 'line_break' | 'kagi' | 'point_figure';

export interface WatchlistItem {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume?: number;
}

export interface WatchlistSection {
  id: string;
  name: string;
  collapsed: boolean;
  symbols: string[];
}

export interface WatchlistList {
  id: string;
  name: string;
  flagColor?: string; // colored flag for flagged lists
  favorite: boolean;
  sections: WatchlistSection[];
}

export interface Drawing {
  id: string;
  type: DrawingTool;
  points: { time: number; price: number }[];
  color: string;
  lineWidth: number;
  selected: boolean;
  visible: boolean;
  locked: boolean;
  props?: Record<string, any>;
}

export interface BinanceKline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const INTERVAL_MAP: Record<Interval, string> = {
  '1s': '1s',
  '5s': '5s',
  '10s': '10s',
  '15s': '15s',
  '30s': '30s',
  '45s': '45s',
  '1m': '1m',
  '2m': '2m',
  '3m': '3m',
  '5m': '5m',
  '10m': '10m',
  '15m': '15m',
  '30m': '30m',
  '45m': '45m',
  '1h': '1h',
  '2h': '2h',
  '3h': '3h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
  '1M': '1M',
  '3M': '3M',
  '6M': '6M',
  '12M': '12M',
};

export interface IntervalOption {
  label: string;
  value: Interval;
  group: string;
}

export const ALL_INTERVALS: IntervalOption[] = [
  { label: '1 second', value: '1s', group: 'SECONDS' },
  { label: '5 seconds', value: '5s', group: 'SECONDS' },
  { label: '10 seconds', value: '10s', group: 'SECONDS' },
  { label: '15 seconds', value: '15s', group: 'SECONDS' },
  { label: '30 seconds', value: '30s', group: 'SECONDS' },
  { label: '45 seconds', value: '45s', group: 'SECONDS' },
  { label: '1 minute', value: '1m', group: 'MINUTES' },
  { label: '2 minutes', value: '2m', group: 'MINUTES' },
  { label: '3 minutes', value: '3m', group: 'MINUTES' },
  { label: '5 minutes', value: '5m', group: 'MINUTES' },
  { label: '10 minutes', value: '10m', group: 'MINUTES' },
  { label: '15 minutes', value: '15m', group: 'MINUTES' },
  { label: '30 minutes', value: '30m', group: 'MINUTES' },
  { label: '45 minutes', value: '45m', group: 'MINUTES' },
  { label: '1 hour', value: '1h', group: 'HOURS' },
  { label: '2 hours', value: '2h', group: 'HOURS' },
  { label: '3 hours', value: '3h', group: 'HOURS' },
  { label: '4 hours', value: '4h', group: 'HOURS' },
  { label: '1 day', value: '1d', group: 'DAYS' },
  { label: '1 week', value: '1w', group: 'DAYS' },
  { label: '1 month', value: '1M', group: 'DAYS' },
  { label: '3 months', value: '3M', group: 'DAYS' },
  { label: '6 months', value: '6M', group: 'DAYS' },
  { label: '12 months', value: '12M', group: 'DAYS' },
];

export const DEFAULT_FAVORITE_INTERVALS: Interval[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1M'];
