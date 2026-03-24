export default function YouTubeWidget() {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://www.youtube.com"
        className="w-full h-full rounded-b border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title="YouTube"
      />
    </div>
  );
}
