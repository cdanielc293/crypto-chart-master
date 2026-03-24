import MediaEmbedWidget from './MediaEmbedWidget';

export default function YouTubeWidget() {
  return (
    <MediaEmbedWidget
      platform="youtube"
      title="YouTube"
      placeholder="הדבק קישור YouTube (watch / shorts / playlist)"
      helpText="הדבק קישור לווידאו/פלייליסט כדי לצפות ישירות בתוך הווידג׳ט"
    />
  );
}
