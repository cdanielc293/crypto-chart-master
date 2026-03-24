import { useState, useMemo } from 'react';
import { Search, X, Star, BarChart3, Lock } from 'lucide-react';
import { useChart } from '@/context/ChartContext';
import DraggableDialog from './DraggableDialog';
import { getAllIndicators, getCategories, getIndicatorsByCategory } from '@/lib/indicators/registry';
import { useProfile } from '@/hooks/useProfile';
import { getPlanLimits } from '@/lib/planLimits';
import { useNavigate } from 'react-router-dom';

interface Props { open: boolean; onClose: () => void; }

export default function IndicatorsDialog({ open, onClose }: Props) {
  const ctx = useChart();
  const { activePanelIndex, gridLayout, addIndicator, addPanelIndicator, indicators } = ctx;
  const { profile } = useProfile();
  const limits = getPlanLimits(profile?.plan);
  const navigate = useNavigate();
  const atLimit = indicators.length >= limits.indicatorsPerChart;
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('indicatorFavorites');
    return saved ? new Set(JSON.parse(saved)) : new Set<string>();
  });

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('indicatorFavorites', JSON.stringify([...next]));
      return next;
    });
  };

  const categories = useMemo(() => getCategories(), []);
  const byCategory = useMemo(() => getIndicatorsByCategory(), []);
  const allIndicators = useMemo(() => getAllIndicators(), []);

  const filtered = useMemo(() => {
    let list = activeCategory === 'favorites'
      ? allIndicators.filter(i => favorites.has(i.id))
      : activeCategory === 'all'
        ? allIndicators
        : byCategory.get(activeCategory) || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.shortName.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, search, favorites, allIndicators, byCategory]);

  const handleAdd = (defId: string) => {
    if (gridLayout.count > 1 && activePanelIndex !== null) {
      addPanelIndicator(activePanelIndex, defId);
    } else {
      addIndicator(defId);
    }
    onClose();
  };

  return (
    <DraggableDialog id="indicators" open={open} onClose={onClose} title="Indicators" className="w-[520px] max-w-[90vw]">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-muted/30 border border-chart-border rounded-lg px-3 py-2">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search indicators..."
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1" autoFocus />
          {search && <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 border-t border-chart-border">
        <nav className="w-44 shrink-0 border-r border-chart-border py-2 overflow-y-auto max-h-[400px]">
          <button onClick={() => setActiveCategory('favorites')}
            className={`w-full flex items-center gap-2 px-4 py-2 text-[13px] transition-colors ${activeCategory === 'favorites' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover'}`}>
            <Star size={15} /> Favorites
          </button>
          <button onClick={() => setActiveCategory('all')}
            className={`w-full flex items-center gap-2 px-4 py-2 text-[13px] transition-colors ${activeCategory === 'all' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover'}`}>
            <BarChart3 size={15} /> All
          </button>
          <div className="h-px bg-chart-border my-1" />
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${activeCategory === cat ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover'}`}>
              {cat}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto max-h-[400px]">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              {activeCategory === 'favorites' ? 'No favorites yet — click ★' : 'No indicators found'}
            </div>
          ) : (
            filtered.map(ind => (
              <div key={ind.id} className="group flex items-center px-4 py-2.5 hover:bg-toolbar-hover transition-colors cursor-pointer border-b border-chart-border/30">
                <button onClick={e => { e.stopPropagation(); toggleFavorite(ind.id); }} className="mr-2.5 shrink-0">
                  <Star size={14} className={favorites.has(ind.id) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/40 hover:text-amber-400'} />
                </button>
                <button onClick={() => handleAdd(ind.id)} className="flex-1 text-left text-[13px] text-foreground hover:text-primary transition-colors">
                  {ind.name}
                  <span className="ml-2 text-muted-foreground text-[11px]">{ind.shortName}</span>
                </button>
                <span className="text-[11px] text-muted-foreground/50">{ind.overlay ? 'overlay' : 'pane'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </DraggableDialog>
  );
}
