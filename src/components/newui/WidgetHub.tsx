// Widget Hub — sleek overlay for browsing and adding widgets
import { useState } from 'react';
import { X, Search, Star, Plus } from 'lucide-react';
import { WIDGET_REGISTRY, WIDGET_CATEGORIES, type WidgetCategory } from './types';

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
    <div className="fixed inset-0 z-[200] newui-hub-overlay flex items-center justify-center animate-fade-in" onClick={onClose}>
      <div
        className="w-[900px] max-w-[92vw] max-h-[80vh] flex flex-col rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ background: 'rgba(8,12,28,0.95)', backdropFilter: 'blur(40px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.04]">
          <div className="flex-1">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: '#00f0ff' }}>
              ⚡ Widget Hub
            </h2>
            <p className="text-[11px] text-white/30 mt-0.5">Choose modules to add to your workspace</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="text"
              placeholder="Search widgets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-[#00f0ff]/30 w-56 transition-colors"
            />
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-white/[0.03] overflow-x-auto">
          <CatBtn active={category === 'all'} onClick={() => setCategory('all')}>All</CatBtn>
          <CatBtn active={category === 'favorites'} onClick={() => setCategory('favorites')}>
            <Star size={11} className="inline mr-1" />Favorites
          </CatBtn>
          {WIDGET_CATEGORIES.map(c => (
            <CatBtn key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
              {c.icon} {c.label}
            </CatBtn>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-white/20 text-sm">No widgets found</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map(w => {
                const isActive = activeWidgetTypes.includes(w.type);
                const isFav = favorites.includes(w.type);
                return (
                  <div key={w.type} className="newui-hub-card group">
                    {/* Accent bar */}
                    <div className="newui-card-preview" style={{ background: `linear-gradient(90deg, transparent, ${w.previewColor}, transparent)` }} />
                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">{w.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white/90 truncate">{w.label}</h3>
                          <span className="text-[10px] uppercase tracking-wider text-white/20 font-mono">{w.category}</span>
                        </div>
                        <button
                          onClick={() => onToggleFavorite(w.type)}
                          className={`p-1 rounded transition-colors ${isFav ? 'text-yellow-400' : 'text-white/15 hover:text-yellow-400/60'}`}
                        >
                          <Star size={14} fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <p className="text-[11px] text-white/35 leading-relaxed mb-4 line-clamp-2">{w.description}</p>
                      <button
                        onClick={() => { onAdd(w.type); onClose(); }}
                        disabled={isActive}
                        className={`w-full py-2 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                          isActive
                            ? 'bg-white/[0.03] text-white/20 cursor-default'
                            : 'text-white/80 hover:text-white'
                        }`}
                        style={!isActive ? {
                          background: `linear-gradient(135deg, ${w.previewColor}15, ${w.previewColor}08)`,
                          border: `1px solid ${w.previewColor}25`,
                        } : undefined}
                      >
                        {isActive ? 'Active' : <><Plus size={13} /> Add Widget</>}
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
      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20'
          : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03] border border-transparent'
      }`}
    >
      {children}
    </button>
  );
}
