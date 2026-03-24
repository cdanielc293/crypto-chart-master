import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export default function TwitterWidget() {
  const [url, setUrl] = useState('');
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const extractProfile = (input: string): string | null => {
    // https://x.com/username or https://twitter.com/username
    const m = input.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/);
    if (m) return m[1];
    // bare @username or username
    const bare = input.replace(/^@/, '').trim();
    if (/^[a-zA-Z0-9_]{1,15}$/.test(bare)) return bare;
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const profile = extractProfile(url.trim());
    if (profile) setProfileUrl(profile);
  };

  // Load Twitter widget script
  useEffect(() => {
    if (!profileUrl) return;
    const existing = document.getElementById('twitter-wjs');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      document.head.appendChild(script);
    } else {
      (window as any).twttr?.widgets?.load(containerRef.current);
    }
    const timer = setTimeout(() => {
      (window as any).twttr?.widgets?.load(containerRef.current);
    }, 500);
    return () => clearTimeout(timer);
  }, [profileUrl]);

  if (!profileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
        <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <p className="text-[11px] text-white/40 font-mono uppercase tracking-wider">Enter X/Twitter Profile</p>
        <form onSubmit={handleSubmit} className="flex w-full max-w-[280px] gap-1.5">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="@username or x.com/username"
            className="flex-1 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-sky-500/40"
          />
          <button type="submit" className="p-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition-colors">
            <Search size={14} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto custom-scrollbar p-2">
      <a
        className="twitter-timeline"
        data-theme="dark"
        data-chrome="noheader nofooter noborders transparent"
        href={`https://twitter.com/${profileUrl}`}
      >
        Loading @{profileUrl}...
      </a>
    </div>
  );
}
