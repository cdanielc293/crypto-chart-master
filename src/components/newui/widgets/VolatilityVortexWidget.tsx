// Volatility Vortex — spinning animated vortex
import { useEffect, useRef } from 'react';

export default function VolatilityVortexWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: number;
    let angle = 0;

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * 2;
      canvas.height = h * 2;
      ctx.scale(2, 2);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.4;

      for (let i = 0; i < 60; i++) {
        const a = angle + (i / 60) * Math.PI * 6;
        const r = (i / 60) * maxR;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const size = 1 + (i / 60) * 3;

        ctx.fillStyle = `hsla(${320 + i * 2}, 80%, 60%, ${0.1 + (i / 60) * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
      grad.addColorStop(0, 'rgba(236,72,153,0.4)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();

      angle += 0.03;
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 text-[9px] tracking-widest text-pink-400/40 font-mono uppercase">
        Volatility
      </div>
    </div>
  );
}
