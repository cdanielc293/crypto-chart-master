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
  // Text & Emoji
  | 'text' | 'emoji';

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
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
  '1M': '1M',
};
