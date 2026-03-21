export interface CandleColors {
  bodyUp: string;
  bodyDown: string;
  borderUp: string;
  borderDown: string;
  wickUp: string;
  wickDown: string;
  showBody: boolean;
  showBorders: boolean;
  showWick: boolean;
  colorByPrevClose: boolean;
}

export interface StatusLineSettings {
  showLogo: boolean;
  showTitle: boolean;
  titleMode: 'ticker' | 'description';
  showOpenMarketStatus: boolean;
  showChartValues: boolean;
  showBarChangeValues: boolean;
  showVolume: boolean;
  showLastDayChange: boolean;
  showIndicatorTitles: boolean;
  showIndicatorInputs: boolean;
  showIndicatorValues: boolean;
  showBackground: boolean;
  backgroundOpacity: number;
}

export interface ScalesAndLinesSettings {
  // Price scale
  currencyVisibility: 'always' | 'mouse_over' | 'hidden';
  scaleMode: 'always' | 'mouse_over';
  scalesPlacement: 'auto' | 'left' | 'right';
  // Price labels & lines
  noOverlappingLabels: boolean;
  showPlusButton: boolean;
  countdownToBarClose: boolean;
  symbolDisplay: 'name_value_line' | 'name_value' | 'value' | 'hidden';
  previousDayClose: 'hidden' | 'line' | 'value_line';
  indicatorsDisplay: 'value' | 'name_value' | 'hidden';
  highLowDisplay: 'hidden' | 'line' | 'value_line';
  bidAskDisplay: 'hidden' | 'line' | 'value_line';
  // Time scale
  showDayOfWeek: boolean;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface CanvasSettings {
  // Background
  backgroundType: 'solid' | 'gradient';
  backgroundColor: string;
  backgroundGradientTop: string;
  backgroundGradientBottom: string;
  // Grid
  gridType: 'both' | 'vert' | 'horz' | 'none';
  gridVertColor: string;
  gridHorzColor: string;
  // Crosshair
  crosshairColor: string;
  crosshairStyle: 'dashed' | 'dotted' | 'solid';
  // Watermark
  watermarkMode: 'symbol' | 'replay' | 'none';
  // Scales
  scaleTextSize: number;
  scaleTextColor: string;
  scaleLinesColor: string;
  // Buttons
  navigationVisibility: 'always' | 'mouse_over' | 'hidden';
  paneVisibility: 'always' | 'mouse_over' | 'hidden';
  // Margins
  marginTop: number;
  marginBottom: number;
  marginRight: number;
}

export interface ChartSettings {
  candle: CandleColors;
  statusLine: StatusLineSettings;
  scalesAndLines: ScalesAndLinesSettings;
  canvas: CanvasSettings;
}

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  candle: {
    bodyUp: '#26a69a',
    bodyDown: '#ef5350',
    borderUp: '#26a69a',
    borderDown: '#ef5350',
    wickUp: '#26a69a',
    wickDown: '#ef5350',
    showBody: true,
    showBorders: true,
    showWick: true,
    colorByPrevClose: false,
  },
  statusLine: {
    showLogo: true,
    showTitle: true,
    titleMode: 'description',
    showOpenMarketStatus: false,
    showChartValues: true,
    showBarChangeValues: true,
    showVolume: false,
    showLastDayChange: false,
    showIndicatorTitles: true,
    showIndicatorInputs: true,
    showIndicatorValues: true,
    showBackground: true,
    backgroundOpacity: 50,
  },
  scalesAndLines: {
    currencyVisibility: 'always',
    scaleMode: 'mouse_over',
    scalesPlacement: 'auto',
    noOverlappingLabels: true,
    showPlusButton: true,
    countdownToBarClose: true,
    symbolDisplay: 'name_value_line',
    previousDayClose: 'hidden',
    indicatorsDisplay: 'value',
    highLowDisplay: 'hidden',
    bidAskDisplay: 'hidden',
    showDayOfWeek: true,
    dateFormat: 'Mon 29 Sep \'97',
    timeFormat: '24h',
  },
  canvas: {
    backgroundType: 'solid',
    backgroundColor: '#131722',
    backgroundGradientTop: '#131722',
    backgroundGradientBottom: '#1e222d',
    gridType: 'both',
    gridVertColor: '#1e222d',
    gridHorzColor: '#1e222d',
    crosshairColor: '#758696',
    crosshairStyle: 'dashed',
    watermarkMode: 'symbol',
    scaleTextSize: 12,
    scaleTextColor: '#787b86',
    scaleLinesColor: '#2a2e39',
    navigationVisibility: 'mouse_over',
    paneVisibility: 'mouse_over',
    marginTop: 10,
    marginBottom: 8,
    marginRight: 10,
  },
};
