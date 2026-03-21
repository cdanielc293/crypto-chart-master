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

export interface SymbolSettings {
  session: 'regular' | 'extended';
  backAdjustment: boolean;
  adjustForDividends: boolean;
  precision: number;
  timezone: string;
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
  gridVertOpacity: number;
  gridHorzColor: string;
  gridHorzOpacity: number;
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

export interface TradingGeneralSettings {
  showBuySellButtons: boolean;
  instantOrderPlacement: boolean;
  executionSound: 'none' | 'ding' | 'bell' | 'chime';
  notifications: 'none' | 'rejections_only' | 'all_events';
}

export interface TradingAppearanceSettings {
  showPositions: boolean;
  positionPnlDisplay: 'money' | 'ticks' | 'percent';
  reverseButtonOnHover: boolean;
  showOrders: boolean;
  bracketPnlDisplay: 'money' | 'ticks' | 'percent';
  showExecutions: boolean;
  showExecutionLabels: boolean;
  extendedPriceLine: boolean;
  ordersAndPositionsAlignment: 'right' | 'left' | 'center';
  showOnScreenshots: boolean;
}

export interface TradingSettings {
  general: TradingGeneralSettings;
  appearance: TradingAppearanceSettings;
}

export interface AlertsSettings {
  alertLineColor: string;
  onlyActiveAlerts: boolean;
  alertVolume: number;
  autoHideToasts: boolean;
}

export interface EventsSettings {
  showIdeas: boolean;
  showDividends: boolean;
  showSplits: boolean;
  showEarnings: boolean;
  showEarningsBreak: boolean;
  showLatestNews: boolean;
  newsNotifications: boolean;
}

export interface PriceScaleSettings {
  autoScale: boolean;
  scalePriceChartOnly: boolean;
  invertScale: boolean;
  mode: 'regular' | 'percent' | 'indexed_to_100' | 'logarithmic';
}

export interface ChartSettings {
  symbol: SymbolSettings;
  candle: CandleColors;
  statusLine: StatusLineSettings;
  scalesAndLines: ScalesAndLinesSettings;
  canvas: CanvasSettings;
  trading: TradingSettings;
  alerts: AlertsSettings;
  events: EventsSettings;
  priceScale: PriceScaleSettings;
}

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  symbol: {
    session: 'regular',
    backAdjustment: false,
    adjustForDividends: false,
    precision: 2,
    timezone: 'Exchange',
  },
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
    gridVertOpacity: 100,
    gridHorzColor: '#1e222d',
    gridHorzOpacity: 100,
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
  trading: {
    general: {
      showBuySellButtons: false,
      instantOrderPlacement: false,
      executionSound: 'none',
      notifications: 'all_events',
    },
    appearance: {
      showPositions: false,
      positionPnlDisplay: 'money',
      reverseButtonOnHover: false,
      showOrders: false,
      bracketPnlDisplay: 'money',
      showExecutions: false,
      showExecutionLabels: false,
      extendedPriceLine: false,
      ordersAndPositionsAlignment: 'right',
      showOnScreenshots: false,
    },
  },
  alerts: {
    alertLineColor: '#2962ff',
    onlyActiveAlerts: false,
    alertVolume: 60,
    autoHideToasts: true,
  },
  events: {
    showIdeas: false,
    showDividends: false,
    showSplits: false,
    showEarnings: false,
    showEarningsBreak: false,
    showLatestNews: false,
    newsNotifications: false,
  },
  priceScale: {
    autoScale: true,
    scalePriceChartOnly: false,
    invertScale: false,
    mode: 'regular',
  },
};

export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function sanitizeHexColor(value: string, fallback: string): string {
  return HEX_COLOR_REGEX.test(value) ? value : fallback;
}

function mergeSection<T extends Record<string, any>>(defaults: T, incoming: Partial<T> | undefined): T {
  return { ...defaults, ...(incoming ?? {}) };
}

export function normalizeChartSettings(saved: unknown): ChartSettings {
  if (!saved || typeof saved !== 'object') return DEFAULT_CHART_SETTINGS;
  const s = saved as Partial<ChartSettings>;

  return {
    symbol: mergeSection(DEFAULT_CHART_SETTINGS.symbol, s.symbol),
    candle: mergeSection(DEFAULT_CHART_SETTINGS.candle, s.candle),
    statusLine: mergeSection(DEFAULT_CHART_SETTINGS.statusLine, s.statusLine),
    scalesAndLines: mergeSection(DEFAULT_CHART_SETTINGS.scalesAndLines, s.scalesAndLines),
    canvas: mergeSection(DEFAULT_CHART_SETTINGS.canvas, s.canvas),
    trading: {
      general: mergeSection(DEFAULT_CHART_SETTINGS.trading.general, s.trading?.general),
      appearance: mergeSection(DEFAULT_CHART_SETTINGS.trading.appearance, s.trading?.appearance),
    },
    alerts: mergeSection(DEFAULT_CHART_SETTINGS.alerts, s.alerts),
    events: mergeSection(DEFAULT_CHART_SETTINGS.events, s.events),
    priceScale: mergeSection(DEFAULT_CHART_SETTINGS.priceScale, s.priceScale),
  };
}
