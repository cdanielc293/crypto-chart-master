// Performance DNA Spiral — artistic spiral visualization
import { useEffect, useRef } from 'react';

export default function PerformanceDNAWidget() {
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
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const points = 80;

      for (let strand = 0; strand < 2; strand++) {
        ctx.beginPath();
        for (let i = 0; i < points; i++) {
          const progress = i / points;
          const y = progress * h;
          const wave = Math.sin(progress * Math.PI * 4 + t * 0.04 + strand * Math.PI) * (w * 0.25);
          const x = cx + wave;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const color = strand === 0 ? '#22d3ee' : '#06b6d4';
        ctx.strokeStyle = color + '60';
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Nodes
        for (let i = 0; i < points; i += 5) {
          const progress = i / points;
          const y = progress * h;
          const wave = Math.sin(progress * Math.PI * 4 + t * 0.04 + strand * Math.PI) * (w * 0.25);
          const x = cx + wave;
          ctx.fillStyle = color + '80';
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Cross links
      for (let i = 0; i < points; i += 8) {
        const progress = i / points;
        const y = progress * h;
        const x1 = cx + Math.sin(progress * Math.PI * 4 + t * 0.04) * (w * 0.25);
        const x2 = cx + Math.sin(progress * Math.PI * 4 + t * 0.04 + Math.PI) * (w * 0.25);
        ctx.strokeStyle = 'rgba(34,211,238,0.1)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      }

      t++;
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 text-[9px] tracking-widest text-cyan-400/40 font-mono uppercase">
        DNA Analysis
      </div>
    </div>
  );
}
