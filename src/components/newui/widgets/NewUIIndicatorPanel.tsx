// Indicator management panel for New UI — isolated from Classic
import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Trash2, Search, TrendingUp } from 'lucide-react';
import { getAllIndicators } from '@/lib/indicators/registry';
import type { IndicatorDefinition } from '@/types/indicators';

export interface ActiveIndicator {
  id: string;
  defId: string;
  params: Record<string, any>;
  color: string;
  visible: boolean;
}

interface Props {
  indicators: ActiveIndicator[];
  onAdd: (defId: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  children: React.ReactNode; // trigger
}

export default function NewUIIndicatorPanel({ indicators, onAdd, onRemove, onToggle, children }: Props) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const overlayIndicators = useMemo(() => {
    const all = getAllIndicators();
    return all.filter((d) => d.overlay);
  }, []);

  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? overlayIndicators.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.shortName.toLowerCase().includes(q) ||
            d.category.toLowerCase().includes(q)
        )
      : overlayIndicators;

    const groups = new Map<string, IndicatorDefinition[]>();
    for (const d of filtered) {
      const arr = groups.get(d.category) ?? [];
      arr.push(d);
      groups.set(d.category, arr);
    }
    return groups;
  }, [overlayIndicators, search]);

  const handleAdd = (defId: string) => {
    onAdd(defId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 bg-[#0a1628]/95 backdrop-blur-xl border-white/[0.06] text-white"
        align="start"
        sideOffset={6}
      >
        {/* Active indicators */}
        {indicators.length > 0 && (
          <div className="border-b border-white/[0.05] p-2 space-y-0.5">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/25 px-1 mb-1">Active</div>
            {indicators.map((ind) => {
              const def = overlayIndicators.find((d) => d.id === ind.defId);
              return (
                <div
                  key={ind.id}
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-white/[0.03] group"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                  <span
                    className={`text-[11px] font-mono flex-1 ${
                      ind.visible ? 'text-white/60' : 'text-white/25 line-through'
                    }`}
                  >
                    {def?.shortName ?? ind.defId}
                  </span>
                  <button
                    className="p-0.5 rounded hover:bg-white/5 text-white/20 hover:text-white/50"
                    onClick={() => onToggle(ind.id)}
                  >
                    {ind.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                  </button>
                  <button
                    className="p-0.5 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400/60"
                    onClick={() => onRemove(ind.id)}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="p-2 border-b border-white/[0.05]">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search indicators..."
              className="h-7 pl-7 text-[11px] font-mono bg-white/[0.03] border-white/[0.06] text-white/70 placeholder:text-white/20"
            />
          </div>
        </div>

        {/* Available indicators */}
        <div className="max-h-64 overflow-y-auto p-1">
          {Array.from(grouped.entries()).map(([category, defs]) => (
            <div key={category} className="mb-1.5">
              <div className="text-[9px] font-mono uppercase tracking-wider text-white/20 px-2 py-1">
                {category}
              </div>
              {defs.map((def) => {
                const isActive = indicators.some((i) => i.defId === def.id);
                return (
                  <button
                    key={def.id}
                    className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-mono flex items-center gap-2 transition-colors ${
                      isActive
                        ? 'text-white/30 cursor-default'
                        : 'text-white/60 hover:bg-white/[0.04] hover:text-white/80'
                    }`}
                    onClick={() => !isActive && handleAdd(def.id)}
                    disabled={isActive}
                  >
                    <TrendingUp size={11} className="shrink-0 text-white/15" />
                    <span className="flex-1">{def.name}</span>
                    <span className="text-[9px] text-white/20">{def.shortName}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {grouped.size === 0 && (
            <div className="text-center py-4 text-[11px] text-white/20 font-mono">No indicators found</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
