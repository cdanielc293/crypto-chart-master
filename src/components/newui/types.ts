// New UI widget types and layout definitions — fully isolated from Classic view

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetInstance {
  id: string;
  type: string;
  position: WidgetPosition;
  locked?: boolean;
  config?: Record<string, any>;
}

export interface WidgetDefinition {
  type: string;
  label: string;
  description: string;
  category: WidgetCategory;
  icon: string; // lucide icon name
  defaultSize: { colSpan: number; rowSpan: number };
  previewColor: string;
}

export type WidgetCategory = 'charts' | 'analytics' | 'social' | 'trading' | 'data' | 'media';

export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string }[] = [
  { id: 'charts', label: 'Charts' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'social', label: 'Sentiment' },
  { id: 'trading', label: 'Trading' },
  { id: 'data', label: 'Data Feeds' },
  { id: 'media', label: 'Media & Social' },
];

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    type: 'price-chart',
    label: 'Price Chart',
    description: 'Professional custom candlestick chart with volume, crosshair, and full zoom/scroll.',
    category: 'charts',
    icon: 'candlestick-chart',
    defaultSize: { colSpan: 2, rowSpan: 2 },
    previewColor: '#26a69a',
  },
  {
    type: 'whale-bubbles',
    label: 'Whale Tracker',
    description: 'Real-time feed of large institutional trades across major exchanges with size, direction, and timing.',
    category: 'trading',
    icon: 'anchor',
    defaultSize: { colSpan: 2, rowSpan: 2 },
    previewColor: '#8b5cf6',
  },
  {
    type: 'sentiment-heatmap',
    label: 'Sentiment Heatmap',
    description: 'Multi-timeframe sentiment scores for top assets. Color-coded from bearish (red) to bullish (green).',
    category: 'social',
    icon: 'grid-3x3',
    defaultSize: { colSpan: 2, rowSpan: 1 },
    previewColor: '#f59e0b',
  },
  {
    type: 'performance-dna',
    label: 'Performance Metrics',
    description: 'Key trading statistics: win rate, profit factor, average win/loss, drawdown — all in one compact view.',
    category: 'analytics',
    icon: 'bar-chart-3',
    defaultSize: { colSpan: 1, rowSpan: 2 },
    previewColor: '#06b6d4',
  },
  {
    type: 'volatility-vortex',
    label: 'Volatility Gauge',
    description: 'Radial gauge displaying current market volatility level with low-to-high gradient scale.',
    category: 'charts',
    icon: 'gauge',
    defaultSize: { colSpan: 1, rowSpan: 1 },
    previewColor: '#ef4444',
  },
  {
    type: 'orderbook-depth',
    label: 'Order Book Depth',
    description: 'Visualize bid/ask depth with stacked liquidity view across price levels.',
    category: 'trading',
    icon: 'layers',
    defaultSize: { colSpan: 2, rowSpan: 1 },
    previewColor: '#10b981',
  },
  {
    type: 'ticker-tape',
    label: 'Ticker Tape',
    description: 'Compact scrolling ticker showing real-time price updates across your watchlist.',
    category: 'data',
    icon: 'radio',
    defaultSize: { colSpan: 4, rowSpan: 1 },
    previewColor: '#eab308',
  },
  {
    type: 'correlation-matrix',
    label: 'Correlation Matrix',
    description: 'Asset correlation heatmap showing statistical relationships between tracked instruments.',
    category: 'analytics',
    icon: 'grid-2x2',
    defaultSize: { colSpan: 2, rowSpan: 2 },
    previewColor: '#6366f1',
  },
  {
    type: 'youtube',
    label: 'YouTube',
    description: 'Embed YouTube videos directly in your workspace. Watch market analysis and tutorials while trading.',
    category: 'media',
    icon: 'play-circle',
    defaultSize: { colSpan: 2, rowSpan: 2 },
    previewColor: '#ef4444',
  },
  {
    type: 'spotify',
    label: 'Spotify',
    description: 'Listen to music, podcasts, and playlists while trading. Embed any Spotify content.',
    category: 'media',
    icon: 'music',
    defaultSize: { colSpan: 1, rowSpan: 2 },
    previewColor: '#22c55e',
  },
  {
    type: 'twitter',
    label: 'X / Twitter',
    description: 'Follow real-time market commentary and crypto news from X/Twitter profiles.',
    category: 'media',
    icon: 'at-sign',
    defaultSize: { colSpan: 1, rowSpan: 2 },
    previewColor: '#38bdf8',
  },
  {
    type: 'tiktok',
    label: 'TikTok',
    description: 'Watch TikTok videos in your workspace. Follow trading content creators.',
    category: 'media',
    icon: 'clapperboard',
    defaultSize: { colSpan: 1, rowSpan: 2 },
    previewColor: '#ec4899',
  },
  {
    type: 'instagram',
    label: 'Instagram',
    description: 'View Instagram posts and reels directly in your trading workspace.',
    category: 'media',
    icon: 'camera',
    defaultSize: { colSpan: 1, rowSpan: 2 },
    previewColor: '#c084fc',
  },
  {
    type: 'web-browser',
    label: 'Web Browser',
    description: 'Open any website in a mini browser widget. Browse freely while trading.',
    category: 'media',
    icon: 'globe',
    defaultSize: { colSpan: 2, rowSpan: 2 },
    previewColor: '#60a5fa',
  },
];
