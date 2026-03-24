// New UI widget types and layout definitions — fully isolated from Classic view

export interface WidgetPosition {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface WidgetInstance {
  id: string;
  type: string;
  position: WidgetPosition;
  config?: Record<string, any>;
}

export interface WidgetDefinition {
  type: string;
  label: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  defaultSize: { colSpan: number; rowSpan: number };
  previewColor: string; // neon accent for preview card
}

export type WidgetCategory = 'charts' | 'analytics' | 'social' | 'trading' | 'data';

export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string; icon: string }[] = [
  { id: 'charts', label: 'Charts & Visuals', icon: '📊' },
  { id: 'analytics', label: 'Analytics', icon: '🔬' },
  { id: 'social', label: 'Social & Sentiment', icon: '🌐' },
  { id: 'trading', label: 'Trading Tools', icon: '⚡' },
  { id: 'data', label: 'Data Feeds', icon: '📡' },
];

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    type: 'price-chart',
    label: 'Price Chart',
    description: 'High-end futuristic candlestick chart with neon glow lines, gradient fills, and liquid-smooth animations.',
    category: 'charts',
    icon: '📈',
    defaultSize: { colSpan: 2, rowSpan: 2 },
    previewColor: '#00f0ff',
  },
  {
    type: 'whale-bubbles',
    label: 'Whale Trade Bubbles',
    description: '3D floating bubbles that visualize large trades in real-time. Size represents volume, color represents direction.',
    category: 'analytics',
    icon: '🐋',
    defaultSize: { colSpan: 2, rowSpan: 2 },
    previewColor: '#a855f7',
  },
  {
    type: 'sentiment-heatmap',
    label: 'AI Sentiment Heatmap',
    description: 'Visual heatmap showing market sentiment (Bullish/Bearish) powered by social data analysis and AI scoring.',
    category: 'social',
    icon: '🧠',
    defaultSize: { colSpan: 2, rowSpan: 1 },
    previewColor: '#f97316',
  },
  {
    type: 'performance-dna',
    label: 'Performance DNA Spiral',
    description: 'Artistic spiral visualization analyzing your trading history. Patterns reveal strengths and weaknesses.',
    category: 'analytics',
    icon: '🧬',
    defaultSize: { colSpan: 1, rowSpan: 2 },
    previewColor: '#22d3ee',
  },
  {
    type: 'volatility-vortex',
    label: 'Volatility Vortex',
    description: 'Dynamic vortex animation that morphs based on market volatility. Faster swirl = higher volatility.',
    category: 'charts',
    icon: '🌀',
    defaultSize: { colSpan: 1, rowSpan: 1 },
    previewColor: '#ec4899',
  },
  {
    type: 'orderbook-depth',
    label: 'Depth Visualizer',
    description: 'Futuristic order book depth chart with glowing bid/ask walls and real-time liquidity mapping.',
    category: 'trading',
    icon: '📊',
    defaultSize: { colSpan: 2, rowSpan: 1 },
    previewColor: '#10b981',
  },
  {
    type: 'ticker-tape',
    label: 'Live Ticker Tape',
    description: 'Scrolling neon ticker showing real-time price changes across your watchlist with spark lines.',
    category: 'data',
    icon: '📡',
    defaultSize: { colSpan: 4, rowSpan: 1 },
    previewColor: '#eab308',
  },
  {
    type: 'correlation-matrix',
    label: 'Correlation Matrix',
    description: 'Interactive heatmap showing correlations between your tracked assets with animated transitions.',
    category: 'analytics',
    icon: '🔗',
    defaultSize: { colSpan: 2, rowSpan: 2 },
    previewColor: '#6366f1',
  },
];
