import { useState, useRef, useCallback } from 'react';
import { Globe, ArrowLeft, ArrowRight, RotateCw, Home } from 'lucide-react';

interface WebBrowserWidgetProps {
  defaultUrl?: string;
  brandColor?: string;
  brandName?: string;
}

export default function WebBrowserWidget({ defaultUrl, brandColor = '#60a5fa', brandName }: WebBrowserWidgetProps) {
  const [currentUrl, setCurrentUrl] = useState(defaultUrl || '');
  const [addressBar, setAddressBar] = useState(defaultUrl || '');
  const [isLoaded, setIsLoaded] = useState(!!defaultUrl);
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigate = useCallback((url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl) return;
    if (!/^https?:\/\//i.test(finalUrl)) {
      if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      } else {
        finalUrl = `https://www.google.com/search?igu=1&q=${encodeURIComponent(finalUrl)}`;
      }
    }
    setCurrentUrl(finalUrl);
    setAddressBar(finalUrl);
    setIsLoaded(true);
    setLoadError(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(addressBar);
  };

  const reload = () => {
    if (iframeRef.current && currentUrl) {
      setLoadError(false);
      iframeRef.current.src = currentUrl;
    }
  };

  const goHome = () => {
    if (defaultUrl) {
      navigate(defaultUrl);
    } else {
      setIsLoaded(false);
      setCurrentUrl('');
      setAddressBar('');
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: `${brandColor}15` }}
        >
          <Globe className="w-7 h-7" style={{ color: brandColor }} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs text-white/70 font-medium">
            {brandName ? `Open ${brandName}` : 'Mini Browser'}
          </p>
          <p className="text-[10px] text-white/30">
            Enter a URL or search term
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-1.5">
          <input
            value={addressBar}
            onChange={e => setAddressBar(e.target.value)}
            placeholder={defaultUrl || 'Enter URL or search...'}
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 outline-none transition-colors"
            style={{ borderColor: addressBar ? `${brandColor}40` : undefined }}
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: `${brandColor}20`,
              color: brandColor,
            }}
          >
            Go
          </button>
        </form>
        {defaultUrl && (
          <button
            onClick={() => navigate(defaultUrl)}
            className="text-[10px] transition-colors hover:underline"
            style={{ color: `${brandColor}90` }}
          >
            Open {brandName || defaultUrl}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Browser toolbar */}
      <div className="flex items-center gap-1 px-1.5 py-1 bg-white/[0.02] border-b border-white/[0.06] shrink-0">
        <button onClick={goHome} className="p-1 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors">
          <Home size={12} />
        </button>
        <button onClick={reload} className="p-1 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors">
          <RotateCw size={12} />
        </button>
        <form onSubmit={handleSubmit} className="flex-1 flex">
          <input
            value={addressBar}
            onChange={e => setAddressBar(e.target.value)}
            className="w-full px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/60 placeholder:text-white/20 outline-none focus:border-white/[0.15] font-mono transition-colors"
            spellCheck={false}
          />
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 relative min-h-0">
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 z-10">
            <p className="text-xs text-white/50">This site may block embedding</p>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(currentUrl, '_blank')}
                className="px-3 py-1.5 rounded text-[10px] font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white/70 transition-colors"
              >
                Open in new tab ↗
              </button>
              <button
                onClick={goHome}
                className="px-3 py-1.5 rounded text-[10px] font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white/70 transition-colors"
              >
                Try another URL
              </button>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={currentUrl}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; camera; microphone"
          allowFullScreen
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
          title={brandName || 'Web Browser'}
          onError={() => setLoadError(true)}
        />
      </div>
    </div>
  );
}
