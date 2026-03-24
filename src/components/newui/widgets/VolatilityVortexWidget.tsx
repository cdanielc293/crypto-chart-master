// Volatility Gauge — professional radial gauge with mock data
import { useEffect, useRef } from 'react';

export default function VolatilityVortexWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * 2;
      canvas.height = h * 2;
      ctx.scale(2, 2);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.55;
      const radius = Math.min(w, h) * 0.35;
      const startAngle = Math.PI * 0.8;
      const endAngle = Math.PI * 2.2;
      const value = 0.62; // 62% volatility

      // Background arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Value arc — gradient from green to yellow to red
      const valueAngle = startAngle + (endAngle - startAngle) * value;
      const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
      grad.addColorStop(0, '#10b981');
      grad.addColorStop(0.5, '#eab308');
      grad.addColorStop(1, '#ef4444');
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, valueAngle);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Needle dot
      const nx = cx + Math.cos(valueAngle) * radius;
      const ny = cy + Math.sin(valueAngle) * radius;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(nx, ny, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Center text
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `bold ${Math.max(14, radius * 0.4)}px 'Inter', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('62%', cx, cy - 4);

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = `${Math.max(8, radius * 0.15)}px 'Inter', sans-serif`;
      ctx.fillText('MODERATE', cx, cy + 12);

      // Labels
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = "8px 'Inter', sans-serif";
      ctx.textAlign = 'left';
      ctx.fillText('LOW', cx - radius - 5, cy + radius * 0.5);
      ctx.textAlign = 'right';
      ctx.fillText('HIGH', cx + radius + 5, cy + radius * 0.5);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
