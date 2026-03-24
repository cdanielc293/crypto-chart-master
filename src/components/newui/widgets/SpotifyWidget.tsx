import { useState } from 'react';
import { Search } from 'lucide-react';

export default function SpotifyWidget() {
  const [url, setUrl] = useState('');
  const [embedUri, setEmbedUri] = useState<string | null>(null);

  const extractSpotifyUri = (input: string): string | null => {
    const m = input.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
    if (m) return `${m[1]}/${m[2]}`;
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const uri = extractSpotifyUri(url.trim());
    if (uri) setEmbedUri(uri);
  };

  if (!embedUri) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-500" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.7 0 12 0zm5.5 17.3c-.2.3-.6.5-1 .3-2.7-1.7-6.2-2-10.2-1.1-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 4.5-1 8.3-.6 11.3 1.3.4.2.5.7.3 1zm1.5-3.3c-.3.4-.8.6-1.2.3-3.1-1.9-7.9-2.5-11.6-1.4-.5.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 4.2-1.3 9.5-.7 13 1.6.4.3.6.8.3 1.2zm.1-3.4c-3.8-2.2-9.9-2.4-13.5-1.3-.5.2-1.1-.1-1.3-.7-.2-.5.1-1.1.7-1.3 4.1-1.3 10.8-1 15.1 1.5.5.3.7.9.4 1.4-.2.5-.9.7-1.4.4z" />
          </svg>
        </div>
        <p className="text-[11px] text-white/50 font-mono uppercase tracking-wider">Paste a Spotify link</p>
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs gap-1.5">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="open.spotify.com/track/..."
            className="flex-1 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-green-500/40"
          />
          <button type="submit" className="px-2.5 py-1.5 rounded bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-medium transition-colors">
            Load
          </button>
        </form>
        <p className="text-[10px] text-white/25">Tracks, albums, playlists, podcasts & shows</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <iframe
        src={`https://open.spotify.com/embed/${embedUri}?theme=0`}
        className="w-full h-full rounded-b border-0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Spotify"
      />
      <button
        onClick={() => setEmbedUri(null)}
        className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-black/60 hover:bg-black/80 text-white/50 hover:text-white/80 text-[10px] font-mono transition-colors"
      >
        Change
      </button>
    </div>
  );
}
