// Whale Trade Bubbles — animated floating bubbles
import { useEffect, useRef } from 'react';

interface Bubble {
  x: number; y: number; r: number; vx: number; vy: number;
  color: string; alpha: number;
}

export default function WhaleBubblesWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#a855f7', '#7c3aed', '#c084fc', '#6366f1'];
    const bubbles: Bubble[] = [];

    for (let i = 0; i < 15; i++) {
      bubbles.push({
        x: Math.random() * 300,
        y: Math.random() * 200,
        r: 8 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.2 + Math.random() * 0.4,
      });
    }

    let frame: number;
    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * 2;
      canvas.height = h * 2;
      ctx.scale(2, 2);
      ctx.clearRect(0, 0, w, h);

      for (const b of bubbles) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -b.r) b.x = w + b.r;
        if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r;
        if (b.y > h + b.r) b.y = -b.r;

        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, b.color + '60');
        grad.addColorStop(0.7, b.color + '20');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        // glow ring
        ctx.strokeStyle = b.color + '30';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute bottom-2 right-2 text-[9px] tracking-widest text-purple-400/40 font-mono uppercase">
        Whale Tracker
      </div>
    </div>
  );
}
