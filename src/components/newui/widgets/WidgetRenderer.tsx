// Maps widget type to component — isolated registry
import type { WidgetInstance } from '../types';
import PriceChartWidget from './PriceChartWidget';
import WhaleBubblesWidget from './WhaleBubblesWidget';
import SentimentWidget from './SentimentWidget';
import VolatilityVortexWidget from './VolatilityVortexWidget';
import PerformanceDNAWidget from './PerformanceDNAWidget';
import YouTubeWidget from './YouTubeWidget';
import SpotifyWidget from './SpotifyWidget';
import TwitterWidget from './TwitterWidget';
import TikTokWidget from './TikTokWidget';
import InstagramWidget from './InstagramWidget';
import WebBrowserWidget from './WebBrowserWidget';

const WIDGET_COMPONENTS: Record<string, React.FC> = {
  'price-chart': PriceChartWidget,
  'whale-bubbles': WhaleBubblesWidget,
  'sentiment-heatmap': SentimentWidget,
  'volatility-vortex': VolatilityVortexWidget,
  'performance-dna': PerformanceDNAWidget,
  'youtube': YouTubeWidget,
  'spotify': SpotifyWidget,
  'twitter': TwitterWidget,
  'tiktok': TikTokWidget,
  'instagram': InstagramWidget,
  'web-browser': WebBrowserWidget,
};

export default function WidgetRenderer({ widget }: { widget: WidgetInstance }) {
  const Component = WIDGET_COMPONENTS[widget.type];
  if (!Component) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-white/20 font-mono">
        Widget: {widget.type}
      </div>
    );
  }
  return <Component />;
}
