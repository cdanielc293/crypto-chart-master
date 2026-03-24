import MediaEmbedWidget from './MediaEmbedWidget';

export default function TwitterWidget() {
  return (
    <MediaEmbedWidget
      platform="twitter"
      title="X / Twitter"
      placeholder="הדבק קישור לפוסט (status)"
      helpText="הדבק קישור לפוסט ספציפי כדי לצפות בו בתוך הווידג׳ט"
    />
  );
}
