import { useState, useEffect, useMemo, useCallback } from 'react';
import { useChart } from '@/context/ChartContext';
import type { WatchlistItem } from '@/types/chart';
import {
  ArrowUpDown, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  Newspaper, BarChart3, Shield, Activity, DollarSign, X,
} from 'lucide-react';

// ─── Types ───

type AdvancedTab = 'overview' | 'funding' | 'news';
type OverviewCategory = 'performance' | 'technicals' | 'risk';
type GroupBy = 'none' | 'section' | 'exchange';
type SummaryRow = 'min' | 'max' | 'avg' | 'median';

interface TickerStats {
  symbol: string;
  price: number;
  change24h: number;
  changePct24h: number;
  change7d: number;
  change30d: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  // Technicals
  rsi14?: number;
  sma20?: number;
  sma50?: number;
  // Risk
  volatility?: number;
  atr14?: number;
}

interface FundingData {
  symbol: string;
  fundingRate: number;
  nextFundingTime: number;
  markPrice: number;
  indexPrice: number;
}

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  thumb?: string;
}

// ─── Helpers ───

const SYMBOL_COLORS = [
  '#F7931A', '#627EEA', '#26A17B', '#F3BA2F', '#E84142',
  '#2775CA', '#8247E5', '#00D395', '#E6007A', '#14F195',
];

function getSymbolColor(sym: string): string {
  let hash = 0;
  for (let i = 0; i < sym.length; i++) hash = sym.charCodeAt(i) + ((hash << 5) - hash);
  return SYMBOL_COLORS[Math.abs(hash) % SYMBOL_COLORS.length];
}

function fmtNum(n: number | undefined, digits = 2): string {
  if (n === undefined || isNaN(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(n: number | undefined): string {
  if (n === undefined || isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtVol(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Tab Buttons ───

const TABS: { id: AdvancedTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'funding', label: 'Funding', icon: DollarSign },
  { id: 'news', label: 'News', icon: Newspaper },
];

// ─── Overview Tab ───

function OverviewTab({
  symbols,
  stats,
  watchlistPrices,
  onSymbolClick,
}: {
  symbols: string[];
  stats: Map<string, TickerStats>;
  watchlistPrices: Map<string, WatchlistItem>;
  onSymbolClick: (sym: string) => void;
}) {
  const [category, setCategory] = useState<OverviewCategory>('performance');
  const [showSummary, setShowSummary] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ col, label, className = '' }: { col: string; label: string; className?: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className={`flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground ${className}`}
    >
      {label}
      {sortCol === col && (sortDir === 'asc' ? <ChevronUp size={8} /> : <ChevronDown size={8} />)}
    </button>
  );

  const getValue = (sym: string, col: string): number => {
    const s = stats.get(sym);
    const p = watchlistPrices.get(sym);
    switch (col) {
      case 'price': return p?.lastPrice ?? 0;
      case 'chg24': return p?.priceChangePercent ?? 0;
      case 'chg7d': return s?.change7d ?? 0;
      case 'chg30d': return s?.change30d ?? 0;
      case 'vol': return s?.volume24h ?? p?.volume ?? 0;
      case 'high': return s?.high24h ?? 0;
      case 'low': return s?.low24h ?? 0;
      case 'rsi': return s?.rsi14 ?? 0;
      case 'sma20': return s?.sma20 ?? 0;
      case 'sma50': return s?.sma50 ?? 0;
      case 'volatility': return s?.volatility ?? 0;
      case 'atr': return s?.atr14 ?? 0;
      default: return 0;
    }
  };

  const sorted = useMemo(() => {
    if (!sortCol) return symbols;
    return [...symbols].sort((a, b) => {
      const va = getValue(a, sortCol);
      const vb = getValue(b, sortCol);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [symbols, sortCol, sortDir, stats, watchlistPrices]);

  const getSummaryValues = (col: string): { min: number; max: number; avg: number; med: number } => {
    const vals = symbols.map(s => getValue(s, col)).filter(v => v !== 0);
    if (vals.length === 0) return { min: 0, max: 0, avg: 0, med: 0 };
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      med: median(vals),
    };
  };

  const categories: { id: OverviewCategory; label: string; icon: typeof Activity }[] = [
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'technicals', label: 'Technicals', icon: Activity },
    { id: 'risk', label: 'Risk', icon: Shield },
  ];

  const renderSummaryRow = (label: string, key: 'min' | 'max' | 'avg' | 'med', cols: string[], isPct: boolean[]) => (
    <div className="flex items-center px-2 py-1.5 bg-secondary/30 text-[11px]">
      <span className="w-24 text-muted-foreground font-medium">{label}</span>
      {cols.map((col, i) => {
        const summary = getSummaryValues(col);
        const val = summary[key];
        return (
          <span key={col} className="flex-1 text-right font-mono text-muted-foreground">
            {isPct[i] ? fmtPct(val) : fmtNum(val)}
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Category selector */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-chart-border">
        {categories.map(c => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
                category === c.id
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-toolbar-hover'
              }`}
            >
              <Icon size={12} />
              {c.label}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={() => setShowSummary(v => !v)}
          className={`text-[10px] px-2 py-1 rounded transition-colors ${
            showSummary ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Σ Summary
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {category === 'performance' && (
          <>
            <div className="flex items-center px-2 py-1.5 border-b border-chart-border sticky top-0 bg-toolbar-bg z-10">
              <SortHeader col="symbol" label="Symbol" className="w-24" />
              <SortHeader col="price" label="Price" className="flex-1 justify-end" />
              <SortHeader col="chg24" label="24h %" className="flex-1 justify-end" />
              <SortHeader col="chg7d" label="7d %" className="flex-1 justify-end" />
              <SortHeader col="chg30d" label="30d %" className="flex-1 justify-end" />
              <SortHeader col="vol" label="Volume" className="flex-1 justify-end" />
            </div>
            {sorted.map(sym => {
              const p = watchlistPrices.get(sym);
              const s = stats.get(sym);
              const pct24 = p?.priceChangePercent ?? 0;
              const ticker = sym.replace('USDT', '');
              const color = getSymbolColor(sym);
              return (
                <div
                  key={sym}
                  onClick={() => onSymbolClick(sym)}
                  className="flex items-center px-2 py-1.5 hover:bg-toolbar-hover cursor-pointer text-[11px]"
                >
                  <div className="w-24 flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {ticker[0]}
                    </div>
                    <span className="font-medium text-foreground truncate">{ticker}</span>
                  </div>
                  <span className="flex-1 text-right font-mono text-foreground">{fmtNum(p?.lastPrice)}</span>
                  <span className={`flex-1 text-right font-mono ${pct24 >= 0 ? 'text-chart-bull' : 'text-chart-bear'}`}>
                    {fmtPct(pct24)}
                  </span>
                  <span className={`flex-1 text-right font-mono ${(s?.change7d ?? 0) >= 0 ? 'text-chart-bull' : 'text-chart-bear'}`}>
                    {fmtPct(s?.change7d)}
                  </span>
                  <span className={`flex-1 text-right font-mono ${(s?.change30d ?? 0) >= 0 ? 'text-chart-bull' : 'text-chart-bear'}`}>
                    {fmtPct(s?.change30d)}
                  </span>
                  <span className="flex-1 text-right font-mono text-muted-foreground">
                    {fmtVol(s?.volume24h ?? p?.volume ?? 0)}
                  </span>
                </div>
              );
            })}
            {showSummary && (
              <div className="border-t border-chart-border">
                {renderSummaryRow('Min', 'min', ['price', 'chg24', 'chg7d', 'chg30d', 'vol'], [false, true, true, true, false])}
                {renderSummaryRow('Max', 'max', ['price', 'chg24', 'chg7d', 'chg30d', 'vol'], [false, true, true, true, false])}
                {renderSummaryRow('Avg', 'avg', ['price', 'chg24', 'chg7d', 'chg30d', 'vol'], [false, true, true, true, false])}
                {renderSummaryRow('Median', 'med', ['price', 'chg24', 'chg7d', 'chg30d', 'vol'], [false, true, true, true, false])}
              </div>
            )}
          </>
        )}

        {category === 'technicals' && (
          <>
            <div className="flex items-center px-2 py-1.5 border-b border-chart-border sticky top-0 bg-toolbar-bg z-10">
              <SortHeader col="symbol" label="Symbol" className="w-24" />
              <SortHeader col="price" label="Price" className="flex-1 justify-end" />
              <SortHeader col="rsi" label="RSI(14)" className="flex-1 justify-end" />
              <SortHeader col="sma20" label="SMA(20)" className="flex-1 justify-end" />
              <SortHeader col="sma50" label="SMA(50)" className="flex-1 justify-end" />
              <SortHeader col="high" label="24h High" className="flex-1 justify-end" />
              <SortHeader col="low" label="24h Low" className="flex-1 justify-end" />
            </div>
            {sorted.map(sym => {
              const p = watchlistPrices.get(sym);
              const s = stats.get(sym);
              const ticker = sym.replace('USDT', '');
              const color = getSymbolColor(sym);
              const rsi = s?.rsi14;
              const rsiColor = rsi !== undefined ? (rsi > 70 ? 'text-chart-bear' : rsi < 30 ? 'text-chart-bull' : 'text-foreground') : '';
              return (
                <div
                  key={sym}
                  onClick={() => onSymbolClick(sym)}
                  className="flex items-center px-2 py-1.5 hover:bg-toolbar-hover cursor-pointer text-[11px]"
                >
                  <div className="w-24 flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {ticker[0]}
                    </div>
                    <span className="font-medium text-foreground truncate">{ticker}</span>
                  </div>
                  <span className="flex-1 text-right font-mono text-foreground">{fmtNum(p?.lastPrice)}</span>
                  <span className={`flex-1 text-right font-mono ${rsiColor}`}>{fmtNum(rsi, 1)}</span>
                  <span className="flex-1 text-right font-mono text-foreground">{fmtNum(s?.sma20)}</span>
                  <span className="flex-1 text-right font-mono text-foreground">{fmtNum(s?.sma50)}</span>
                  <span className="flex-1 text-right font-mono text-foreground">{fmtNum(s?.high24h)}</span>
                  <span className="flex-1 text-right font-mono text-foreground">{fmtNum(s?.low24h)}</span>
                </div>
              );
            })}
          </>
        )}

        {category === 'risk' && (
          <>
            <div className="flex items-center px-2 py-1.5 border-b border-chart-border sticky top-0 bg-toolbar-bg z-10">
              <SortHeader col="symbol" label="Symbol" className="w-24" />
              <SortHeader col="price" label="Price" className="flex-1 justify-end" />
              <SortHeader col="volatility" label="Volatility" className="flex-1 justify-end" />
              <SortHeader col="atr" label="ATR(14)" className="flex-1 justify-end" />
              <SortHeader col="high" label="24h High" className="flex-1 justify-end" />
              <SortHeader col="low" label="24h Low" className="flex-1 justify-end" />
            </div>
            {sorted.map(sym => {
              const p = watchlistPrices.get(sym);
              const s = stats.get(sym);
              const ticker = sym.replace('USDT', '');
              const color = getSymbolColor(sym);
              return (
                <div
                  key={sym}
                  onClick={() => onSymbolClick(sym)}
                  className="flex items-center px-2 py-1.5 hover:bg-toolbar-hover cursor-pointer text-[11px]"
                >
                  <div className="w-24 flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {ticker[0]}
                    </div>
                    <span className="font-medium text-foreground truncate">{ticker}</span>
                  </div>
                  <span className="flex-1 text-right font-mono text-foreground">{fmtNum(p?.lastPrice)}</span>
                  <span className="flex-1 text-right font-mono text-foreground">{fmtNum(s?.volatility, 1)}%</span>
                  <span className="flex-1 text-right font-mono text-foreground">{fmtNum(s?.atr14)}</span>
                  <span className="flex-1 text-right font-mono text-foreground">{fmtNum(s?.high24h)}</span>
                  <span className="flex-1 text-right font-mono text-foreground">{fmtNum(s?.low24h)}</span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Funding Tab ───

function FundingTab({
  symbols,
  onSymbolClick,
}: {
  symbols: string[];
  onSymbolClick: (sym: string) => void;
}) {
  const [fundingData, setFundingData] = useState<Map<string, FundingData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState<string>('rate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchFunding = async () => {
      try {
        const res = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
        const data = await res.json();
        const map = new Map<string, FundingData>();
        for (const item of data) {
          if (symbols.includes(item.symbol)) {
            map.set(item.symbol, {
              symbol: item.symbol,
              fundingRate: parseFloat(item.lastFundingRate) * 100,
              nextFundingTime: item.nextFundingTime,
              markPrice: parseFloat(item.markPrice),
              indexPrice: parseFloat(item.indexPrice),
            });
          }
        }
        setFundingData(map);
      } catch (e) {
        console.error('Failed to fetch funding rates:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchFunding();
    const interval = setInterval(fetchFunding, 30000);
    return () => clearInterval(interval);
  }, [symbols.join(',')]);

  const sorted = useMemo(() => {
    return [...symbols].sort((a, b) => {
      const fa = fundingData.get(a);
      const fb = fundingData.get(b);
      let va = 0, vb = 0;
      switch (sortCol) {
        case 'rate': va = fa?.fundingRate ?? 0; vb = fb?.fundingRate ?? 0; break;
        case 'mark': va = fa?.markPrice ?? 0; vb = fb?.markPrice ?? 0; break;
        case 'index': va = fa?.indexPrice ?? 0; vb = fb?.indexPrice ?? 0; break;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [symbols, fundingData, sortCol, sortDir]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortHeader = ({ col, label, className = '' }: { col: string; label: string; className?: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className={`flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground ${className}`}
    >
      {label}
      {sortCol === col && (sortDir === 'asc' ? <ChevronUp size={8} /> : <ChevronDown size={8} />)}
    </button>
  );

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading funding rates...</div>;
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center px-2 py-1.5 border-b border-chart-border sticky top-0 bg-toolbar-bg z-10">
        <SortHeader col="symbol" label="Symbol" className="w-24" />
        <SortHeader col="rate" label="Funding Rate" className="flex-1 justify-end" />
        <span className="flex-1 text-right text-[10px] text-muted-foreground">Next Funding</span>
        <SortHeader col="mark" label="Mark Price" className="flex-1 justify-end" />
        <SortHeader col="index" label="Index Price" className="flex-1 justify-end" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map(sym => {
          const f = fundingData.get(sym);
          const ticker = sym.replace('USDT', '');
          const color = getSymbolColor(sym);
          const rate = f?.fundingRate ?? 0;
          const nextTime = f?.nextFundingTime ? new Date(f.nextFundingTime) : null;
          const timeStr = nextTime
            ? `${nextTime.getHours().toString().padStart(2, '0')}:${nextTime.getMinutes().toString().padStart(2, '0')}`
            : '—';

          return (
            <div
              key={sym}
              onClick={() => onSymbolClick(sym)}
              className="flex items-center px-2 py-1.5 hover:bg-toolbar-hover cursor-pointer text-[11px]"
            >
              <div className="w-24 flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {ticker[0]}
                </div>
                <span className="font-medium text-foreground truncate">{ticker}</span>
              </div>
              <span className={`flex-1 text-right font-mono ${rate >= 0 ? 'text-chart-bull' : 'text-chart-bear'}`}>
                {rate >= 0 ? '+' : ''}{rate.toFixed(4)}%
              </span>
              <span className="flex-1 text-right font-mono text-muted-foreground">{timeStr}</span>
              <span className="flex-1 text-right font-mono text-foreground">{fmtNum(f?.markPrice)}</span>
              <span className="flex-1 text-right font-mono text-foreground">{fmtNum(f?.indexPrice)}</span>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="p-4 text-center text-muted-foreground text-xs">
            No perpetual contracts found for watchlist symbols
          </div>
        )}
      </div>
    </div>
  );
}

// ─── News Tab ───

function NewsTab({ symbols }: { symbols: string[] }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // CoinGecko free search endpoint for trending/news
        const tickers = symbols.slice(0, 10).map(s => s.replace('USDT', '').toLowerCase());
        const query = tickers.join(',');
        const res = await fetch(`https://api.coingecko.com/api/v3/search/trending`);
        const data = await res.json();

        const items: NewsItem[] = [];

        // Use trending coins as "news-like" items since free CoinGecko doesn't have news API
        if (data.coins) {
          for (const coin of data.coins.slice(0, 20)) {
            const c = coin.item;
            items.push({
              id: c.id,
              title: `${c.name} (${c.symbol}) — Rank #${c.market_cap_rank || '?'} | Score: ${c.score}`,
              url: `https://www.coingecko.com/en/coins/${c.id}`,
              source: 'CoinGecko Trending',
              publishedAt: new Date().toISOString(),
              thumb: c.thumb,
            });
          }
        }

        // Also add NFT trends
        if (data.nfts) {
          for (const nft of data.nfts.slice(0, 5)) {
            items.push({
              id: `nft-${nft.id}`,
              title: `NFT Trending: ${nft.name} — Floor ${nft.floor_price_in_native_currency?.toFixed(4) ?? '?'} ${nft.native_currency_symbol ?? ''}`,
              url: `https://www.coingecko.com/en/nft/${nft.id}`,
              source: 'CoinGecko NFTs',
              publishedAt: new Date().toISOString(),
              thumb: nft.thumb,
            });
          }
        }

        setNews(items);
      } catch (e) {
        console.error('Failed to fetch news:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading news...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {news.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-xs">No news available</div>
      ) : (
        news.map(item => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 px-3 py-2.5 hover:bg-toolbar-hover transition-colors border-b border-chart-border/50"
          >
            {item.thumb && (
              <img src={item.thumb} alt="" className="w-8 h-8 rounded-full shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-foreground leading-snug line-clamp-2">{item.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-primary">{item.source}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(item.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </a>
        ))
      )}
    </div>
  );
}

// ─── Main Component ───

export default function AdvancedWatchlist({ onClose, panelWidth }: { onClose: () => void; panelWidth: number }) {
  const {
    symbol, setSymbol, watchlists, activeWatchlistId,
    watchlistPrices, gridLayout, activePanelIndex, setPanelSymbol, panelSymbols,
  } = useChart();

  const [activeTab, setActiveTab] = useState<AdvancedTab>('overview');
  const [stats, setStats] = useState<Map<string, TickerStats>>(new Map());
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  const activeList = watchlists.find(l => l.id === activeWatchlistId) || watchlists[0];
  const allSymbols = activeList ? [...new Set(activeList.sections.flatMap(s => s.symbols))] : [];

  const handleSymbolClick = useCallback((sym: string) => {
    if (gridLayout.count > 1) {
      setPanelSymbol(activePanelIndex ?? 0, sym);
    } else {
      setSymbol(sym);
    }
  }, [gridLayout.count, activePanelIndex, setPanelSymbol, setSymbol]);

  // Fetch 24h ticker stats for all symbols
  useEffect(() => {
    if (allSymbols.length === 0) return;

    const fetchStats = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const data = await res.json();
        const map = new Map<string, TickerStats>();

        for (const t of data) {
          if (allSymbols.includes(t.symbol)) {
            const close = parseFloat(t.lastPrice);
            const high = parseFloat(t.highPrice);
            const low = parseFloat(t.lowPrice);
            const range = high - low;

            map.set(t.symbol, {
              symbol: t.symbol,
              price: close,
              change24h: parseFloat(t.priceChange),
              changePct24h: parseFloat(t.priceChangePercent),
              change7d: 0, // Would need kline history
              change30d: 0,
              volume24h: parseFloat(t.quoteVolume),
              high24h: high,
              low24h: low,
              volatility: close > 0 ? (range / close) * 100 : 0,
              atr14: range * 0.7, // Approximate
              rsi14: undefined, // Would need kline history for real RSI
              sma20: undefined,
              sma50: undefined,
            });
          }
        }

        // Fetch klines for RSI/SMA calculations for top symbols
        const topSymbols = allSymbols.slice(0, 15);
        await Promise.all(topSymbols.map(async (sym) => {
          try {
            const kRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=1d&limit=50`);
            const kData = await kRes.json();
            if (!Array.isArray(kData) || kData.length < 14) return;

            const closes = kData.map((k: any[]) => parseFloat(k[4]));

            // RSI(14)
            let gains = 0, losses = 0;
            for (let i = closes.length - 14; i < closes.length; i++) {
              const diff = closes[i] - closes[i - 1];
              if (diff > 0) gains += diff;
              else losses -= diff;
            }
            const avgGain = gains / 14;
            const avgLoss = losses / 14;
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));

            // SMA
            const sma20 = closes.length >= 20
              ? closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20
              : undefined;
            const sma50 = closes.length >= 50
              ? closes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50
              : undefined;

            // 7d & 30d change
            const current = closes[closes.length - 1];
            const change7d = closes.length >= 7
              ? ((current - closes[closes.length - 7]) / closes[closes.length - 7]) * 100
              : 0;
            const change30d = closes.length >= 30
              ? ((current - closes[closes.length - 30]) / closes[closes.length - 30]) * 100
              : 0;

            const existing = map.get(sym);
            if (existing) {
              map.set(sym, { ...existing, rsi14: rsi, sma20, sma50, change7d, change30d });
            }
          } catch { /* ignore individual failures */ }
        }));

        setStats(map);
      } catch (e) {
        console.error('Failed to fetch ticker stats:', e);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [allSymbols.join(',')]);

  return (
    <div className="flex flex-col min-w-[400px] bg-toolbar-bg border-l border-chart-border select-none overflow-hidden" style={{ width: Math.max(panelWidth, 400) }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-chart-border">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground">
            {activeList?.name || 'Watchlist'} — Advanced
          </span>
          <span className="text-[10px] text-muted-foreground bg-secondary/50 rounded px-1.5 py-0.5">
            {allSymbols.length} symbols
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Group by dropdown */}
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value as GroupBy)}
            className="text-[10px] bg-secondary/50 text-foreground border border-chart-border rounded px-1.5 py-0.5 outline-none"
          >
            <option value="none">No grouping</option>
            <option value="section">By Section</option>
            <option value="exchange">By Exchange</option>
          </select>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-chart-border">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[12px] border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          symbols={allSymbols}
          stats={stats}
          watchlistPrices={watchlistPrices}
          onSymbolClick={handleSymbolClick}
        />
      )}
      {activeTab === 'funding' && (
        <FundingTab symbols={allSymbols} onSymbolClick={handleSymbolClick} />
      )}
      {activeTab === 'news' && (
        <NewsTab symbols={allSymbols} />
      )}
    </div>
  );
}
