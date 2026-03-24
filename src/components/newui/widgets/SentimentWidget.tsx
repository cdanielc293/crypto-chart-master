// AI Sentiment Heatmap placeholder
import { useEffect, useRef } from 'react';

export default function SentimentWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: number;
    let t = 0;

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * 2;
      canvas.height = h * 2;
      ctx.scale(2, 2);

      const cols = 12;
      const rows = 4;
      const cw = w / cols;
      const ch = h / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const val = Math.sin((c + t * 0.02) * 0.5) * Math.cos((r + t * 0.01) * 0.8);
          const hue = val > 0 ? 142 : 0; // green vs red
          const sat = 70;
          const light = 25 + Math.abs(val) * 30;
          ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.6)`;
          ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
        }
      }
      t++;
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full rounded-lg" />
      <div className="absolute top-2 right-2 text-[9px] tracking-widest text-orange-400/50 font-mono uppercase">
        AI Sentiment
      </div>
    </div>
  );
}
