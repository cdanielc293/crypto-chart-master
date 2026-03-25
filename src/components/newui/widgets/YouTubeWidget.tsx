import { useState, useMemo, useCallback, type FormEvent } from 'react';
import { Search, ExternalLink, Play, Clock, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchResult {
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  duration: number;
  views: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 0) return 'LIVE';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase();
    if (host.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] ?? null;
    if (host.includes('youtube.com')) {
      if (url.pathname.startsWith('/watch')) return url.searchParams.get('v');
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] ?? null;
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] ?? null;
    }
  } catch {}
  return null;
}

function extractPlaylistId(input: string): string | null {
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    return url.searchParams.get('list');
  } catch { return null; }
}

function isUrl(input: string): boolean {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) || /^[a-zA-Z0-9_-]{11}$/.test(trimmed) ||
    trimmed.includes('youtube.com') || trimmed.includes('youtu.be');
}

export default function YouTubeWidget() {
  const [input, setInput] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [mode, setMode] = useState<'idle' | 'player' | 'results'>('idle');

  const embedUrl = useMemo(() => {
    if (activePlaylistId && !activeVideoId) {
      return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(activePlaylistId)}&autoplay=1&rel=1&modestbranding=1`;
    }
    if (activeVideoId) {
      let url = `https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=1&modestbranding=1`;
      if (activePlaylistId) url += `&list=${encodeURIComponent(activePlaylistId)}`;
      return url;
    }
    return null;
  }, [activeVideoId, activePlaylistId]);

  const doSearch = useCallback(async (query: string) => {
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const res = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=videos`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const items: SearchResult[] = (data.items || [])
        .filter((item: any) => item.url && item.title)
        .slice(0, 20)
        .map((item: any) => ({
          url: item.url,
          title: item.title,
          thumbnail: item.thumbnail || '',
          uploaderName: item.uploaderName || '',
          duration: item.duration ?? -1,
          views: item.views ?? 0,
        }));
      setSearchResults(items);
      setMode('results');
    } catch {
      setSearchError('Search unavailable. Try pasting a YouTube link instead.');
    } finally {
      setSearching(false);
    }
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    if (isUrl(trimmed)) {
      const vid = extractVideoId(trimmed);
      const pid = extractPlaylistId(trimmed);
      setActiveVideoId(vid);
      setActivePlaylistId(pid);
      setMode('player');
      setSearchResults([]);
    } else {
      doSearch(trimmed);
    }
  };

  const playResult = (result: SearchResult) => {
    // result.url is like /watch?v=XXXX
    const vid = result.url.split('v=')[1]?.split('&')[0] ?? result.url.split('/').pop();
    if (vid) {
      setActiveVideoId(vid);
      setActivePlaylistId(null);
      setMode('player');
      setInput('');
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-1.5">
      {/* Search / URL bar */}
      <form onSubmit={submit} className="flex items-center gap-1.5 shrink-0">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search YouTube or paste a link..."
            className="h-7 text-xs pl-7 pr-2"
            spellCheck={false}
          />
        </div>
        <Button type="submit" size="sm" className="h-7 px-2.5 text-[11px]" disabled={searching}>
          {searching ? '...' : isUrl(input.trim()) ? 'Play' : 'Search'}
        </Button>
        {mode === 'results' && (
          <Button
            type="button" size="sm" variant="ghost"
            className="h-7 px-2 text-[11px] text-muted-foreground"
            onClick={() => { setMode(activeVideoId ? 'player' : 'idle'); }}
          >
            Back
          </Button>
        )}
      </form>

      {/* Idle state */}
      {mode === 'idle' && (
        <div className="flex flex-1 items-center justify-center rounded-md border border-border/60 bg-muted/20 p-4 text-center">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">YouTube</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Search for videos or paste a link.<br />
              Related videos will play automatically after each video ends.
            </p>
          </div>
        </div>
      )}

      {/* Player */}
      {mode === 'player' && embedUrl && (
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border/60 bg-background/30">
          <iframe
            key={embedUrl}
            src={embedUrl}
            className="h-full w-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            title="YouTube Player"
          />
        </div>
      )}

      {/* Search results */}
      {mode === 'results' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
          {searchError && (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              {searchError}
            </div>
          )}
          {searchResults.map((r, i) => (
            <button
              key={i}
              onClick={() => playResult(r)}
              className="w-full flex items-start gap-2 rounded-md p-1.5 text-left hover:bg-muted/30 transition-colors group"
            >
              <div className="relative shrink-0 w-24 aspect-video rounded overflow-hidden bg-muted/20">
                {r.thumbnail && (
                  <img src={r.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <Play size={16} className="text-white fill-white" />
                </div>
                {r.duration > 0 && (
                  <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[9px] px-1 rounded font-mono">
                    {formatDuration(r.duration)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <p className="text-[11px] font-medium text-foreground leading-tight line-clamp-2">
                  {r.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {r.uploaderName}
                </p>
                {r.views > 0 && (
                  <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                    <Eye size={9} />
                    {formatViews(r.views)} views
                  </p>
                )}
              </div>
            </button>
          ))}
          {searchResults.length === 0 && !searchError && !searching && (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
