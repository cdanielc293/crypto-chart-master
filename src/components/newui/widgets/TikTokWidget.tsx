export default function TikTokWidget() {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://www.tiktok.com"
        className="w-full h-full rounded-b border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        allowFullScreen
        title="TikTok"
      />
    </div>
  );
}
