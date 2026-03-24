import { useState } from 'react';
import { Search } from 'lucide-react';

export default function YouTubeWidget() {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);

  const extractVideoId = (input: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
      const m = input.match(p);
      if (m) return m[1];
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractVideoId(url.trim());
    if (id) setVideoId(id);
  };

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="currentColor">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
          </svg>
        </div>
        <p className="text-[11px] text-white/50 font-mono uppercase tracking-wider">Paste a YouTube link</p>
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs gap-1.5">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="youtube.com/watch?v=... or youtu.be/..."
            className="flex-1 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-red-500/40"
          />
          <button type="submit" className="px-2.5 py-1.5 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-medium transition-colors">
            Load
          </button>
        </form>
        <p className="text-[10px] text-white/25">Supports videos, shorts & playlists</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
        className="w-full h-full rounded-b border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title="YouTube"
      />
      <button
        onClick={() => setVideoId(null)}
        className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-black/60 hover:bg-black/80 text-white/50 hover:text-white/80 text-[10px] font-mono transition-colors"
      >
        Change
      </button>
    </div>
  );
}
