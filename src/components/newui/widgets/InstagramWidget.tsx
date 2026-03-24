import MediaEmbedWidget from './MediaEmbedWidget';

export default function InstagramWidget() {
  return (
    <MediaEmbedWidget
      platform="instagram"
      title="Instagram"
      placeholder="Paste a post or reel link"
      helpText="Paste a post or reel link to view it inside the widget"
    />
  );
}
