import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export default function TwitterWidget() {
  const [username, setUsername] = useState('');
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const extractUsername = (input: string): string | null => {
    const m = input.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/);
    if (m) return m[1];
    const bare = input.replace(/^@/, '').trim();
    if (/^[a-zA-Z0-9_]{1,15}$/.test(bare)) return bare;
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = extractUsername(username.trim());
    if (user) setActiveUser(user);
  };

  useEffect(() => {
    if (!activeUser) return;
    const existing = document.getElementById('twitter-wjs');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      document.head.appendChild(script);
    }
    const timer = setTimeout(() => {
      (window as any).twttr?.widgets?.load(containerRef.current);
    }, 500);
    return () => clearTimeout(timer);
  }, [activeUser]);

  if (!activeUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
        <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <p className="text-[11px] text-white/50 font-mono uppercase tracking-wider">Enter X/Twitter profile</p>
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs gap-1.5">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="@elonmusk or x.com/username"
            className="flex-1 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-sky-500/40"
          />
          <button type="submit" className="px-2.5 py-1.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 text-xs font-medium transition-colors">
            Load
          </button>
        </form>
        <p className="text-[10px] text-white/25">View any public timeline</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full overflow-auto p-2" style={{ colorScheme: 'dark' }}>
        <a
          className="twitter-timeline"
          data-theme="dark"
          data-chrome="noheader nofooter noborders transparent"
          href={`https://twitter.com/${activeUser}`}
        >
          Loading @{activeUser}...
        </a>
      </div>
      <button
        onClick={() => setActiveUser(null)}
        className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-black/60 hover:bg-black/80 text-white/50 hover:text-white/80 text-[10px] font-mono transition-colors z-10"
      >
        Change
      </button>
    </div>
  );
}
