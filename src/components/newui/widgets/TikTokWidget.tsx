import { useState } from 'react';

export default function TikTokWidget() {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);

  const extractVideoId = (input: string): string | null => {
    const m = input.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    if (m) return m[1];
    if (/^\d{15,}$/.test(input.trim())) return input.trim();
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
        <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-pink-400" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.3 0 .59.04.86.12V9a6.27 6.27 0 0 0-.86-.06A6.33 6.33 0 0 0 3.16 15.3a6.33 6.33 0 0 0 6.33 6.33 6.33 6.33 0 0 0 6.34-6.33V8.75a8.18 8.18 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.18z" />
          </svg>
        </div>
        <p className="text-[11px] text-white/50 font-mono uppercase tracking-wider">Paste a TikTok video link</p>
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs gap-1.5">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="tiktok.com/@user/video/123..."
            className="flex-1 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-pink-500/40"
          />
          <button type="submit" className="px-2.5 py-1.5 rounded bg-pink-500/15 hover:bg-pink-500/25 text-pink-400 text-xs font-medium transition-colors">
            Load
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <iframe
        src={`https://www.tiktok.com/embed/v2/${videoId}`}
        className="w-full h-full rounded-b border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        allowFullScreen
        title="TikTok"
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
