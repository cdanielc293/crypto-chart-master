import { useState, useMemo } from 'react';
import { Search, X, Star, BarChart3 } from 'lucide-react';
import { useChart } from '@/context/ChartContext';
import DraggableDialog from './DraggableDialog';

const ALL_INDICATORS = [
  'EMA 9', 'EMA 21', 'EMA 50', 'EMA 200',
  'SMA 20', 'SMA 50', 'SMA 100', 'SMA 200',
  'Bollinger Bands',
  'Volume',
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function IndicatorsDialog({ open, onClose }: Props) {
  const { indicators, toggleIndicator } = useChart();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'favorites'>('all');
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

  const addIndicator = (name: string) => {
    if (!indicators.includes(name)) {
      toggleIndicator(name);
    }
    onClose();
  };

  const filteredIndicators = useMemo(() => {
    let list = ALL_INDICATORS;

    if (activeCategory === 'favorites') {
      list = list.filter(i => favorites.has(i));
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.toLowerCase().includes(q));
    }

    return list;
  }, [activeCategory, search, favorites]);

  return (
    <DraggableDialog
      id="indicators"
      open={open}
      onClose={onClose}
      title="Indicators"
      className="w-[480px] max-w-[90vw]"
    >
      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-muted/30 border border-chart-border rounded-lg px-3 py-2">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search indicators..."
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
        <nav className="w-40 shrink-0 border-r border-chart-border py-2">
          <button
            onClick={() => setActiveCategory('favorites')}
            className={`w-full flex items-center gap-2 px-4 py-2 text-[13px] transition-colors ${
              activeCategory === 'favorites'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover'
            }`}
          >
            <Star size={15} />
            Favorites
          </button>
          <button
            onClick={() => setActiveCategory('all')}
            className={`w-full flex items-center gap-2 px-4 py-2 text-[13px] transition-colors ${
              activeCategory === 'all'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover'
            }`}
          >
            <BarChart3 size={15} />
            All Indicators
          </button>
        </nav>

        {/* List */}
        <div className="flex-1 overflow-y-auto max-h-[400px]">
          {filteredIndicators.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              {activeCategory === 'favorites' ? 'No favorites yet — click the ★ on any indicator' : 'No indicators found'}
            </div>
          ) : (
            filteredIndicators.map(name => {
              const isActive = indicators.includes(name);
              const isFav = favorites.has(name);
              return (
                <div
                  key={name}
                  className="group flex items-center px-4 py-2.5 hover:bg-toolbar-hover transition-colors cursor-pointer border-b border-chart-border/30"
                >
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavorite(name); }}
                    className="mr-2.5 shrink-0"
                  >
                    <Star
                      size={14}
                      className={isFav
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-muted-foreground/40 hover:text-amber-400'
                      }
                    />
                  </button>

                  <button
                    onClick={() => addIndicator(name)}
                    className="flex-1 text-left text-[13px] text-foreground hover:text-primary transition-colors"
                  >
                    <span className={isActive ? 'text-primary font-medium' : ''}>
                      {name}
                    </span>
                  </button>

                  {isActive && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </DraggableDialog>
  );
}
