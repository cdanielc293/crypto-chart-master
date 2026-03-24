export default function TwitterWidget() {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://x.com"
        className="w-full h-full rounded-b border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media"
        allowFullScreen
        title="X / Twitter"
      />
    </div>
  );
}
