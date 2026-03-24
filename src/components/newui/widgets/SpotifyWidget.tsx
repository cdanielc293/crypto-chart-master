import MediaEmbedWidget from './MediaEmbedWidget';

export default function SpotifyWidget() {
  return (
    <MediaEmbedWidget
      platform="spotify"
      title="Spotify"
      placeholder="Paste a Spotify link (track / playlist / album)"
      helpText="Paste a track, playlist, or album link to play directly in the widget"
    />
  );
}
