import MediaEmbedWidget from './MediaEmbedWidget';

export default function TikTokWidget() {
  return (
    <MediaEmbedWidget
      platform="tiktok"
      title="TikTok"
      placeholder="Paste a TikTok video link"
      helpText="Paste a specific video link to watch it inside the widget"
    />
  );
}
