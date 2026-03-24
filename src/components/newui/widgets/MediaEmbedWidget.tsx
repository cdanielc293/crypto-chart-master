import { useMemo, useState, type FormEvent } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type MediaPlatform = 'youtube' | 'spotify' | 'twitter' | 'instagram' | 'tiktok';

interface MediaEmbedWidgetProps {
  platform: MediaPlatform;
  title: string;
  placeholder: string;
  helpText: string;
  defaultUrl?: string;
}

const SPOTIFY_TYPES = new Set(['track', 'playlist', 'album', 'artist', 'episode', 'show']);

function toUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
}

function youtubeEmbed(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/embed/${trimmed}?rel=0&modestbranding=1`;
  }

  const url = toUrl(trimmed);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  const playlistId = url.searchParams.get('list');

  let videoId: string | null = null;

  if (host.includes('youtu.be')) {
    videoId = path.split('/').filter(Boolean)[0] ?? null;
  } else if (host.includes('youtube.com')) {
    if (path.startsWith('/watch')) {
      videoId = url.searchParams.get('v');
    } else if (path.startsWith('/shorts/')) {
      videoId = path.split('/')[2] ?? null;
    } else if (path.startsWith('/embed/')) {
      videoId = path.split('/')[2] ?? null;
    }
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  }

  if (playlistId) {
    return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`;
  }

  return null;
}

function spotifyEmbed(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('spotify:')) {
    const [, type, id] = trimmed.split(':');
    if (type && id && SPOTIFY_TYPES.has(type)) {
      return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    }
  }

  const url = toUrl(trimmed);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  if (!host.includes('spotify.com')) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  const normalized = parts[0] === 'embed' ? parts.slice(1) : parts;
  const [type, id] = normalized;

  if (!type || !id || !SPOTIFY_TYPES.has(type)) return null;

  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
}

function twitterEmbed(input: string): string | null {
  const url = toUrl(input);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  if (!host.includes('x.com') && !host.includes('twitter.com')) return null;

  const isStatus = /\/status\/\d+/.test(url.pathname);
  if (!isStatus) return null;

  const sourceUrl = `https://x.com${url.pathname}${url.search}`;
  return `https://twitframe.com/show?url=${encodeURIComponent(sourceUrl)}`;
}

function instagramEmbed(input: string): string | null {
  const url = toUrl(input);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  if (!host.includes('instagram.com')) return null;

  const match = url.pathname.match(/^\/(p|reel|tv)\/([^/?#]+)/);
  if (!match) return null;

  const [, type, id] = match;
  return `https://www.instagram.com/${type}/${id}/embed/captioned`;
}

function tiktokEmbed(input: string): string | null {
  const url = toUrl(input);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  if (!host.includes('tiktok.com')) return null;

  const match = url.pathname.match(/\/video\/(\d+)/);
  if (!match) return null;

  const [, id] = match;
  return `https://www.tiktok.com/embed/v2/${id}`;
}

function toEmbedUrl(platform: MediaPlatform, input: string): string | null {
  switch (platform) {
    case 'youtube':
      return youtubeEmbed(input);
    case 'spotify':
      return spotifyEmbed(input);
    case 'twitter':
      return twitterEmbed(input);
    case 'instagram':
      return instagramEmbed(input);
    case 'tiktok':
      return tiktokEmbed(input);
    default:
      return null;
  }
}

function toExternalUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parsed = toUrl(trimmed);
  if (parsed) return parsed.toString();

  return null;
}

export default function MediaEmbedWidget({
  platform,
  title,
  placeholder,
  helpText,
  defaultUrl,
}: MediaEmbedWidgetProps) {
  const [input, setInput] = useState(defaultUrl ?? '');
  const [activeUrl, setActiveUrl] = useState(defaultUrl ?? '');
  const [loadError, setLoadError] = useState(false);

  const embedUrl = useMemo(() => toEmbedUrl(platform, activeUrl), [platform, activeUrl]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setActiveUrl(input.trim());
    setLoadError(false);
  };

  const externalUrl = toExternalUrl(activeUrl);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <form onSubmit={submit} className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs"
          spellCheck={false}
        />
        <Button type="submit" size="sm" className="h-8 px-3 text-xs">
          Open
        </Button>
      </form>

      {!embedUrl ? (
        <div className="flex flex-1 items-center justify-center rounded-md border border-border/60 bg-muted/20 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{title}</span>
            {' — '}
            {helpText}
          </p>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border/60 bg-background/30">
          {loadError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/95 p-4 text-center">
              <p className="text-xs text-muted-foreground">
                This content cannot be embedded via {title}. Try a different link.
              </p>
              {externalUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink size={14} />
                  Open in new tab
                </Button>
              )}
            </div>
          )}

          <iframe
            key={embedUrl}
            src={embedUrl}
            className="h-full w-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
            title={`${title} Embed`}
            onError={() => setLoadError(true)}
          />
        </div>
      )}
    </div>
  );
}