export default function SpotifyWidget() {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://open.spotify.com"
        className="w-full h-full rounded-b border-0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen"
        allowFullScreen
        title="Spotify"
      />
    </div>
  );
}
