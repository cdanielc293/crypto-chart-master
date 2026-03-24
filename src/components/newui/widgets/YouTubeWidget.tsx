import { useState } from 'react';
import { Search } from 'lucide-react';

export default function YouTubeWidget() {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);

  const extractVideoId = (input: string): string | null => {
    // Support various YouTube URL formats + direct ID
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
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
        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-500" fill="currentColor">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
          </svg>
        </div>
        <p className="text-[11px] text-white/40 font-mono uppercase tracking-wider">Paste YouTube URL</p>
        <form onSubmit={handleSubmit} className="flex w-full max-w-[280px] gap-1.5">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-red-500/40"
          />
          <button type="submit" className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
            <Search size={14} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
        className="w-full h-full rounded-b"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube"
      />
    </div>
  );
}
