import { useState } from 'react';

export default function InstagramWidget() {
  const [url, setUrl] = useState('');
  const [postUrl, setPostUrl] = useState<string | null>(null);

  const extractPostUrl = (input: string): string | null => {
    const m = input.match(/(instagram\.com\/(?:p|reel)\/[a-zA-Z0-9_-]+)/);
    if (m) return `https://www.${m[1]}`;
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const extracted = extractPostUrl(url.trim());
    if (extracted) setPostUrl(extracted);
  };

  if (!postUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-orange-500/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-pink-400" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
        </div>
        <p className="text-[11px] text-white/50 font-mono uppercase tracking-wider">Paste an Instagram post link</p>
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs gap-1.5">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="instagram.com/p/... or /reel/..."
            className="flex-1 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-pink-400/40"
          />
          <button type="submit" className="px-2.5 py-1.5 rounded bg-pink-500/15 hover:bg-pink-500/25 text-pink-400 text-xs font-medium transition-colors">
            Load
          </button>
        </form>
        <p className="text-[10px] text-white/25">Posts & Reels</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-auto">
      <iframe
        src={`${postUrl}/embed`}
        className="w-full h-full rounded-b border-0"
        allowFullScreen
        loading="lazy"
        title="Instagram"
      />
      <button
        onClick={() => setPostUrl(null)}
        className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-black/60 hover:bg-black/80 text-white/50 hover:text-white/80 text-[10px] font-mono transition-colors z-10"
      >
        Change
      </button>
    </div>
  );
}
