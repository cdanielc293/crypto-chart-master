export default function InstagramWidget() {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://www.instagram.com"
        className="w-full h-full rounded-b border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media"
        allowFullScreen
        title="Instagram"
      />
    </div>
  );
}
