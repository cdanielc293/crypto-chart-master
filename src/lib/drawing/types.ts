export interface DrawingPoint {
  time: number;
  price: number;
}

export interface ChartDrawing {
  id: string;
  type: string;
  points: DrawingPoint[];
  color: string;
  lineWidth: number;
  selected: boolean;
  visible: boolean;
  locked: boolean;
  props?: Record<string, any>;
}

export interface CoordHelper {
  timeToX: (time: number) => number | null;
  priceToY: (price: number) => number | null;
  xToTime: (x: number) => number | null;
  yToPrice: (y: number) => number | null;
}

export interface AnchorPoint {
  x: number;
  y: number;
  pointIndex: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// How many points needed to complete each tool
export const TOOL_POINT_COUNT: Record<string, number> = {
  cursor: 0,
  dot: 0,
  arrow_cursor: 0,
  
  // Single-point
  horizontalline: 1,
  verticalline: 1,
  crossline: 1,
  arrowmarkup: 1,
  arrowmarkdown: 1,
  arrowmarker: 1,
  text: 1,
  note: 1,
  emoji: 1,
  // Two-point
  trendline: 2,
  ray: 2,
  infoline: 2,
  extendedline: 2,
  trendangle: 2,
  horizontalray: 2,
  fibonacci: 2,
  fibextension: 2,
  fibchannel: 2,
  rectangle: 2,
  rotatedrectangle: 2,
  circle: 2,
  ellipse: 2,
  pricerange: 2,
  daterange: 2,
  datepricerange: 2,
  longposition: 2,
  shortposition: 2,
  anchoredvwap: 1,
  fixedrangevolume: 2,
  anchoredvolume: 1,
  gannbox: 2,
  gannfan: 2,
  // Three-point
  parallelchannel: 3,
  triangle: 3,
  pitchfork: 3,
  schiffpitchfork: 3,
  modifiedschiff: 3,
  insidepitchfork: 3,
  arc: 3,
  curve: 3,
  // Multi-point
  xabcd: 5,
  cypher: 5,
  abcd: 4,
  headshoulders: 7,
  trianglepattern: 4,
  threedrives: 7,
  path: -1,        // unlimited (double-click to finish)
  polyline: -1,
  brush: -1,
  highlighter: -1,
  arrowdraw: -1,
};

export function getToolPointCount(tool: string): number {
  return TOOL_POINT_COUNT[tool] ?? 2;
}
