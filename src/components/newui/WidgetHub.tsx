// Widget Hub — clean, elegant overlay catalog
import { useState } from 'react';
import { X, Search, Star, Plus, CandlestickChart, Anchor, Grid3X3, BarChart3, Gauge, Layers, Radio, Grid2X2 } from 'lucide-react';
import { WIDGET_REGISTRY, WIDGET_CATEGORIES, type WidgetCategory } from './types';

const ICON_MAP: Record<string, React.ReactNode> = {
  'candlestick-chart': <CandlestickChart size={16} />,
  'anchor': <Anchor size={16} />,
  'grid-3x3': <Grid3X3 size={16} />,
  'bar-chart-3': <BarChart3 size={16} />,
  'gauge': <Gauge size={16} />,
  'layers': <Layers size={16} />,
  'radio': <Radio size={16} />,
  'grid-2x2': <Grid2X2 size={16} />,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (type: string) => void;
  favorites: string[];
  onToggleFavorite: (type: string) => void;
  activeWidgetTypes: string[];
}

export default function WidgetHub({ open, onClose, onAdd, favorites, onToggleFavorite, activeWidgetTypes }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<WidgetCategory | 'all' | 'favorites'>('all');

  if (!open) return null;

  const filtered = WIDGET_REGISTRY.filter(w => {
    if (search && !w.label.toLowerCase().includes(search.toLowerCase()) && !w.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (category === 'favorites') return favorites.includes(w.type);
    if (category !== 'all' && w.category !== category) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[200] newui-hub-overlay flex items-center justify-center" onClick={onClose}>
      <div
        className="w-[860px] max-w-[92vw] max-h-[80vh] flex flex-col rounded-lg border border-white/[0.06] overflow-hidden"
        style={{ background: 'rgba(8, 12, 24, 0.97)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04]">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white/80 tracking-tight">
              Widget Hub
            </h2>
            <p className="text-[10px] text-white/20 mt-0.5 font-mono">Select modules for your workspace</p>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/15" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-md pl-8 pr-3 py-1.5 text-[11px] text-white/70 placeholder:text-white/15 outline-none focus:border-white/10 w-48 transition-colors font-mono"
            />
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/5 text-white/25 hover:text-white/50 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-0.5 px-5 py-2 border-b border-white/[0.03] overflow-x-auto">
          <CatBtn active={category === 'all'} onClick={() => setCategory('all')}>All</CatBtn>
          <CatBtn active={category === 'favorites'} onClick={() => setCategory('favorites')}>
            <Star size={10} className="inline mr-0.5" />Saved
          </CatBtn>
          {WIDGET_CATEGORIES.map(c => (
            <CatBtn key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
              {c.label}
            </CatBtn>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-5">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-white/15 text-xs font-mono">No widgets found</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map(w => {
                const isActive = activeWidgetTypes.includes(w.type);
                const isFav = favorites.includes(w.type);
                return (
                  <div key={w.type} className="newui-hub-card group">
                    <div className="newui-card-preview" style={{ background: w.previewColor }} />
                    <div className="p-3.5">
                      <div className="flex items-start gap-2.5 mb-2">
                        <div className="text-white/30 mt-0.5">
                          {ICON_MAP[w.icon] || <BarChart3 size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[11px] font-semibold text-white/80">{w.label}</h3>
                          <span className="text-[9px] uppercase tracking-wider text-white/15 font-mono">{w.category}</span>
                        </div>
                        <button
                          onClick={() => onToggleFavorite(w.type)}
                          className={`p-0.5 rounded transition-colors ${isFav ? 'text-amber-400' : 'text-white/10 hover:text-amber-400/50'}`}
                        >
                          <Star size={12} fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <p className="text-[10px] text-white/25 leading-relaxed mb-3 line-clamp-2">{w.description}</p>
                      <button
                        onClick={() => { onAdd(w.type); onClose(); }}
                        disabled={isActive}
                        className={`w-full py-1.5 rounded text-[10px] font-semibold tracking-wide transition-all flex items-center justify-center gap-1 font-mono uppercase ${
                          isActive
                            ? 'bg-white/[0.02] text-white/15 cursor-default border border-white/[0.03]'
                            : 'bg-white/[0.04] text-white/60 hover:text-white/80 hover:bg-white/[0.06] border border-white/[0.06]'
                        }`}
                      >
                        {isActive ? 'Active' : <><Plus size={11} /> Add</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CatBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-all font-mono ${
        active
          ? 'bg-white/[0.06] text-white/60 border border-white/[0.08]'
          : 'text-white/20 hover:text-white/40 hover:bg-white/[0.02] border border-transparent'
      }`}
    >
      {children}
    </button>
  );
}
