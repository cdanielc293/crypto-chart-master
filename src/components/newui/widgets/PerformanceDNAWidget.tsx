// Performance Metrics — professional stats dashboard
import { TrendingUp, TrendingDown, BarChart3, Target } from 'lucide-react';

const METRICS = [
  { label: 'Win Rate', value: '68.4%', change: '+2.1%', positive: true, icon: Target },
  { label: 'Profit Factor', value: '2.34', change: '+0.12', positive: true, icon: BarChart3 },
  { label: 'Avg Win', value: '$842', change: '+$56', positive: true, icon: TrendingUp },
  { label: 'Avg Loss', value: '$360', change: '-$12', positive: true, icon: TrendingDown },
  { label: 'Total Trades', value: '347', change: '+18', positive: true, icon: BarChart3 },
  { label: 'Max Drawdown', value: '-8.2%', change: '-0.4%', positive: false, icon: TrendingDown },
];

export default function PerformanceDNAWidget() {
  return (
    <div className="w-full h-full overflow-auto p-1">
      <div className="grid grid-cols-2 gap-2">
        {METRICS.map((m) => (
          <div key={m.label} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon size={10} className="text-white/20" />
              <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">{m.label}</span>
            </div>
            <div className="text-sm font-bold text-white/85 font-mono">{m.value}</div>
            <div className={`text-[9px] font-mono mt-0.5 ${m.positive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
              {m.change}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
