import { useChart } from '@/context/ChartContext';
import { Play, Pause, SkipForward, X, Rewind, ChevronRight } from 'lucide-react';

const speeds = [0.5, 1, 2, 3, 5, 10];

export default function ReplayControls() {
  const {
    replayState, setReplayState,
    replaySpeed, setReplaySpeed,
    replayBarIndex, setReplayBarIndex,
  } = useChart();

  if (replayState === 'off') return null;

  if (replayState === 'selecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-toolbar-bg border-b border-chart-border text-xs select-none">
        <Rewind size={14} className="text-primary" />
        <span className="text-muted-foreground">לחץ על הגרף כדי לבחור נקודת התחלה לריפליי</span>
        <button
          onClick={() => setReplayState('off')}
          className="ml-auto p-1 rounded hover:bg-toolbar-hover text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  const handlePlayPause = () => {
    setReplayState(replayState === 'playing' ? 'paused' : 'playing');
  };

  const handleStepForward = () => {
    if (replayState === 'playing') setReplayState('paused');
    setReplayBarIndex(replayBarIndex + 1);
  };

  const handleStop = () => {
    setReplayState('off');
  };

  const nextSpeed = () => {
    const idx = speeds.indexOf(replaySpeed);
    setReplaySpeed(speeds[(idx + 1) % speeds.length]);
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-toolbar-bg border-b border-chart-border text-xs select-none">
      <Rewind size={14} className="text-primary" />
      <span className="text-primary font-medium mr-2">Replay</span>

      <div className="w-px h-5 bg-chart-border mx-1" />

      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        className="p-1.5 rounded hover:bg-toolbar-hover text-muted-foreground hover:text-foreground transition-colors"
        title={replayState === 'playing' ? 'Pause (Shift+↓)' : 'Play (Shift+↓)'}
      >
        {replayState === 'playing' ? <Pause size={14} /> : <Play size={14} />}
      </button>

      {/* Step Forward */}
      <button
        onClick={handleStepForward}
        className="p-1.5 rounded hover:bg-toolbar-hover text-muted-foreground hover:text-foreground transition-colors"
        title="Forward (Shift+→)"
      >
        <SkipForward size={14} />
      </button>

      <div className="w-px h-5 bg-chart-border mx-1" />

      {/* Speed */}
      <button
        onClick={nextSpeed}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-toolbar-hover text-muted-foreground hover:text-foreground transition-colors"
        title="Change speed"
      >
        <span>{replaySpeed}x</span>
      </button>

      <div className="w-px h-5 bg-chart-border mx-1" />

      {/* Jump to real time */}
      <button
        onClick={handleStop}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-toolbar-hover text-muted-foreground hover:text-foreground transition-colors"
        title="Jump to real-time"
      >
        <ChevronRight size={14} />
        <span>Real-time</span>
      </button>

      <button
        onClick={handleStop}
        className="ml-auto p-1 rounded hover:bg-toolbar-hover text-muted-foreground hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  );
}
