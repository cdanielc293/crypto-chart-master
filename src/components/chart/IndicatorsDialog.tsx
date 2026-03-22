import { useState, useMemo } from 'react';
import { Search, X, Star, BarChart3, TrendingUp, Award, ShoppingBag, Users, Code, Lock, ChevronRight } from 'lucide-react';
import { useChart } from '@/context/ChartContext';
import DraggableDialog from './DraggableDialog';

interface IndicatorDef {
  name: string;
  category: string;
  author?: string;
  boosts?: string;
  favorite?: boolean;
}

const BUILT_IN_INDICATORS: IndicatorDef[] = [
  // Trend
  { name: 'EMA 9', category: 'technicals' },
  { name: 'EMA 21', category: 'technicals' },
  { name: 'EMA 50', category: 'technicals' },
  { name: 'EMA 200', category: 'technicals' },
  { name: 'SMA 20', category: 'technicals' },
  { name: 'SMA 50', category: 'technicals' },
  { name: 'SMA 100', category: 'technicals' },
  { name: 'SMA 200', category: 'technicals' },
  // Volatility
  { name: 'Bollinger Bands', category: 'technicals' },
  { name: 'Average True Range', category: 'technicals' },
  { name: 'Keltner Channel', category: 'technicals' },
  // Volume
  { name: 'Volume', category: 'technicals' },
  { name: 'On Balance Volume', category: 'technicals' },
  { name: 'Volume Weighted Average Price', category: 'technicals' },
  { name: 'Visible Range Volume Profile', category: 'technicals' },
  // Momentum
  { name: 'RSI', category: 'technicals' },
  { name: 'MACD', category: 'technicals' },
  { name: 'Stochastic', category: 'technicals' },
  { name: 'Relative Strength Index', category: 'technicals' },
  { name: 'Commodity Channel Index', category: 'technicals' },
  { name: 'Williams %R', category: 'technicals' },
  // Community
  { name: 'Smart Money Concepts (SMC)', category: 'community', author: 'LuxAlgo', boosts: '127K' },
  { name: 'Liquidity Swings', category: 'community', author: 'LuxAlgo', boosts: '29.8K' },
  { name: 'Order Blocks & Breaker Blocks', category: 'community', author: 'LuxAlgo', boosts: '24.4K' },
  { name: 'Trend Lines v2', category: 'community', author: 'LonesomeThe...', boosts: '25.6K' },
  { name: 'Super OrderBlock / FVG / BoS Tools', category: 'community', author: 'makuchaku', boosts: '24.5K' },
  { name: 'Elliott Wave', category: 'community', author: 'LuxAlgo', boosts: '15.5K' },
  { name: 'All Chart Patterns', category: 'community', author: '', boosts: '' },
  { name: 'Liquidation Heatmap', category: 'community', author: 'AlphaExtract', boosts: '542' },
];

type SidebarCategory = {
  id: string;
  label: string;
  icon: React.ElementType;
  group: string;
};

const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  { id: 'favorites', label: 'Favorites', icon: Star, group: 'PERSONAL' },
  { id: 'my-scripts', label: 'My scripts', icon: Code, group: 'PERSONAL' },
  { id: 'invite-only', label: 'Invite-only', icon: Lock, group: 'PERSONAL' },
  { id: 'purchased', label: 'Purchased', icon: ShoppingBag, group: 'PERSONAL' },
  { id: 'technicals', label: 'Technicals', icon: BarChart3, group: 'BUILT-IN' },
  { id: 'fundamentals', label: 'Fundamentals', icon: TrendingUp, group: 'BUILT-IN' },
  { id: 'editors-picks', label: "Editors' picks", icon: Award, group: 'COMMUNITY' },
  { id: 'top', label: 'Top', icon: TrendingUp, group: 'COMMUNITY' },
  { id: 'trending', label: 'Trending', icon: TrendingUp, group: 'COMMUNITY' },
  { id: 'community', label: 'Store', icon: ShoppingBag, group: 'COMMUNITY' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function IndicatorsDialog({ open, onClose }: Props) {
  const { indicators, toggleIndicator } = useChart();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('favorites');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('indicatorFavorites');
    return saved ? new Set(JSON.parse(saved)) : new Set<string>();
  });

  const toggleFavorite = (name: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      localStorage.setItem('indicatorFavorites', JSON.stringify([...next]));
      return next;
    });
  };

  const filteredIndicators = useMemo(() => {
    let list = BUILT_IN_INDICATORS;

    if (activeCategory === 'favorites') {
      list = list.filter(i => favorites.has(i.name));
    } else if (activeCategory === 'technicals') {
      list = list.filter(i => i.category === 'technicals');
    } else if (activeCategory === 'community' || activeCategory === 'top' || activeCategory === 'trending' || activeCategory === 'editors-picks') {
      list = list.filter(i => i.category === 'community');
    } else {
      // my-scripts, invite-only, purchased, fundamentals - empty for now
      list = [];
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.author?.toLowerCase().includes(q));
    }

    return list;
  }, [activeCategory, search, favorites]);

  const groups = useMemo(() => {
    const map = new Map<string, SidebarCategory[]>();
    for (const cat of SIDEBAR_CATEGORIES) {
      if (!map.has(cat.group)) map.set(cat.group, []);
      map.get(cat.group)!.push(cat);
    }
    return map;
  }, []);

  if (!open) return null;

  return (
    <DraggableDialog
      id="indicators"
      open={open}
      onClose={onClose}
      title="Indicators, metrics, and strategies"
      className="w-[720px] max-w-[90vw]"
    >
      {/* Search */}
      <div className="px-5 py-3">
        <div className="flex items-center gap-2 bg-muted/30 border border-chart-border rounded-lg px-3 py-2.5">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 border-t border-chart-border">
          {/* Sidebar */}
          <nav className="w-48 shrink-0 border-r border-chart-border py-2 overflow-y-auto">
            {[...groups.entries()].map(([group, cats]) => (
              <div key={group} className="mb-2">
                <p className="px-4 py-1 text-[10px] font-bold tracking-widest text-muted-foreground">
                  {group}
                </p>
                {cats.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors ${
                      activeCategory === cat.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover'
                    }`}
                  >
                    <cat.icon size={15} />
                    {cat.label}
                    {cat.id === 'community' && (
                      <span className="ml-auto text-[9px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded">NEW</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {/* Indicator List */}
          <div className="flex-1 overflow-y-auto">
            {/* Column headers */}
            <div className="flex items-center px-4 py-2 text-[10px] font-bold tracking-wider text-muted-foreground border-b border-chart-border sticky top-0 bg-card z-10">
              <span className="flex-1">NAME</span>
              {(activeCategory === 'community' || activeCategory === 'top' || activeCategory === 'trending' || activeCategory === 'editors-picks') && (
                <>
                  <span className="w-28 text-left">AUTHOR</span>
                  <span className="w-20 text-right">BOOSTS</span>
                </>
              )}
            </div>

            {filteredIndicators.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                {activeCategory === 'favorites' ? 'No favorites yet — click the ★ on any indicator' : 'No indicators found'}
              </div>
            ) : (
              filteredIndicators.map(ind => {
                const isActive = indicators.includes(ind.name);
                const isFav = favorites.has(ind.name);
                return (
                  <div
                    key={ind.name}
                    className="group flex items-center px-4 py-2.5 hover:bg-toolbar-hover transition-colors cursor-pointer border-b border-chart-border/30"
                  >
                    {/* Favorite star */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFavorite(ind.name); }}
                      className="mr-2 shrink-0"
                    >
                      <Star
                        size={14}
                        className={isFav
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-muted-foreground/40 hover:text-amber-400'
                        }
                      />
                    </button>

                    {/* Name */}
                    <button
                      onClick={() => toggleIndicator(ind.name)}
                      className="flex-1 text-left text-[13px] text-foreground hover:text-primary transition-colors"
                    >
                      <span className={isActive ? 'text-primary font-medium' : ''}>
                        {ind.name}
                      </span>
                    </button>

                    {/* Author & Boosts for community */}
                    {ind.author !== undefined && (
                      <>
                        <span className="w-28 text-[12px] text-primary/70 truncate">{ind.author}</span>
                        <span className="w-20 text-right text-[12px] text-muted-foreground">{ind.boosts}</span>
                      </>
                    )}

                    {/* Active indicator badge */}
                    {isActive && (
                      <span className="ml-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DraggableDialog>
  );
}
