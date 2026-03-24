import MediaEmbedWidget from './MediaEmbedWidget';

export default function YouTubeWidget() {
  return (
    <MediaEmbedWidget
      platform="youtube"
      title="YouTube"
      placeholder="Paste a YouTube link (watch / shorts / playlist)"
      helpText="Paste a video or playlist link to watch directly inside the widget"
    />
  );
}
