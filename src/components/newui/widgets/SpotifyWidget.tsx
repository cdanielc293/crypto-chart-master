import MediaEmbedWidget from './MediaEmbedWidget';

export default function SpotifyWidget() {
  return (
    <MediaEmbedWidget
      platform="spotify"
      title="Spotify"
      placeholder="הדבק קישור Spotify (track / playlist / album)"
      helpText="הדבק קישור לשיר/פלייליסט/אלבום כדי לנגן ישירות בווידג׳ט"
    />
  );
}
