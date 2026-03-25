import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, X, Rewind, ChevronRight, ChevronDown } from 'lucide-react';

export type NewUIReplayState = 'off' | 'selecting' | 'paused' | 'playing';

const REPLAY_SPEEDS = [
  { value: 10, label: '10x' },
  { value: 7, label: '7x' },
  { value: 5, label: '5x' },
  { value: 3, label: '3x' },
  { value: 1, label: '1x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.3, label: '0.3x' },
  { value: 0.1, label: '0.1x' },
];

interface Props {
  replayState: NewUIReplayState;
  onSetState: (s: NewUIReplayState) => void;
  speed: number;
  onSetSpeed: (s: number) => void;
  barIndex: number;
  startIndex: number;
  totalBars: number;
  onStepForward: () => void;
  onStop: () => void;
}

export default function NewUIReplayControls({
  replayState, onSetState, speed, onSetSpeed,
  barIndex, startIndex, totalBars, onStepForward, onStop,
}: Props) {
  const [speedOpen, setSpeedOpen] = useState(false);
  const speedRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!speedOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          speedRef.current && !speedRef.current.contains(e.target as Node)) {
        setSpeedOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [speedOpen]);

  if (replayState === 'off') return null;

  if (replayState === 'selecting') {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-3 py-1.5 bg-[#0a1628]/95 backdrop-blur-md border-t border-white/[0.06] text-xs select-none">
        <Rewind size={14} className="text-cyan-400" />
        <span className="text-white/50">Click on the chart to select a replay starting point</span>
        <button
          onClick={onStop}
          className="ml-auto p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  const handlePlayPause = () => {
    onSetState(replayState === 'playing' ? 'paused' : 'playing');
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-1 px-3 py-1 bg-[#0a1628]/95 backdrop-blur-md border-t border-white/[0.06] text-xs select-none">
      <div className="flex items-center gap-1.5 text-white/40 mr-1">
        <Rewind size={13} className="text-cyan-400" />
        <span className="text-cyan-400 font-medium">Replay</span>
        <span className="text-white/25 text-[10px] ml-1">Bar {barIndex - startIndex + 1} / {totalBars - startIndex}</span>
      </div>

      <div className="w-px h-5 bg-white/[0.06] mx-1" />

      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        className="p-1.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
        title={replayState === 'playing' ? 'Pause' : 'Play'}
      >
        {replayState === 'playing' ? <Pause size={14} /> : <Play size={14} />}
      </button>

      {/* Step Forward */}
      <button
        onClick={onStepForward}
        className="p-1.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
        title="Step forward"
      >
        <SkipForward size={14} />
      </button>

      <div className="w-px h-5 bg-white/[0.06] mx-1" />

      {/* Speed */}
      <div className="relative">
        <button
          ref={speedRef}
          onClick={() => setSpeedOpen(!speedOpen)}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors font-mono"
        >
          {speed}x
          <ChevronDown size={10} />
        </button>
        {speedOpen && (
          <div ref={dropRef} className="absolute bottom-full mb-1 left-0 min-w-[120px] rounded-md border border-white/[0.08] bg-[#0a1628]/95 backdrop-blur-md shadow-xl z-50 py-1">
            <div className="px-3 py-1 text-[9px] uppercase tracking-wider text-white/25 font-semibold">Speed</div>
            {REPLAY_SPEEDS.map(s => (
              <button
                key={s.value}
                onClick={() => { onSetSpeed(s.value); setSpeedOpen(false); }}
                className={`w-full flex items-center px-3 py-1.5 text-xs hover:bg-white/[0.06] transition-colors ${
                  speed === s.value ? 'text-cyan-400' : 'text-white/60'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-white/[0.06] mx-1" />

      {/* Jump to real time */}
      <button
        onClick={onStop}
        className="flex items-center gap-0.5 px-2 py-1 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
        title="Jump to real-time"
      >
        <ChevronRight size={14} />
        <span className="font-mono">|</span>
      </button>

      {/* Close */}
      <button
        onClick={onStop}
        className="ml-auto p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60"
      >
        <X size={14} />
      </button>
    </div>
  );
}
