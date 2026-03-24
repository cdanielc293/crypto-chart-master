import MediaEmbedWidget from './MediaEmbedWidget';

export default function TwitterWidget() {
  return (
    <MediaEmbedWidget
      platform="twitter"
      title="X / Twitter"
      placeholder="Paste a post link (status URL)"
      helpText="Paste a specific post link to view it inside the widget"
    />
  );
}
