import { useChart } from '@/context/ChartContext';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/context/AuthContext';
import { Play, Pause, SkipForward, X, Rewind, ChevronRight, ChevronDown, Lock } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Interval } from '@/types/chart';
import { ALL_INTERVALS } from '@/types/chart';

const REPLAY_SPEEDS = [
  { value: 10, label: '10x', desc: '10 upd per 1 sec' },
  { value: 7, label: '7x', desc: '7 upd per 1 sec' },
  { value: 5, label: '5x', desc: '5 upd per 1 sec' },
  { value: 3, label: '3x', desc: '3 upd per 1 sec' },
  { value: 1, label: '1x', desc: '1 upd per 1 sec' },
  { value: 0.5, label: '0.5x', desc: '1 upd per 2 sec' },
  { value: 0.3, label: '0.3x', desc: '1 upd per 3 sec' },
  { value: 0.2, label: '0.2x', desc: '1 upd per 5 sec' },
  { value: 0.1, label: '0.1x', desc: '1 upd per 10 sec' },
];

const REPLAY_INTERVALS: Interval[] = [
  '1m', '2m', '3m', '5m', '10m', '15m', '30m', '45m',
  '1h', '2h', '3h', '4h', '1d', '1w', '1M',
];

const SHORT_LABEL: Record<string, string> = {
  '1m': '1m', '2m': '2m', '3m': '3m', '5m': '5m', '10m': '10m',
  '15m': '15m', '30m': '30m', '45m': '45m',
  '1h': '1H', '2h': '2H', '3h': '3H', '4h': '4H',
  '1d': 'D', '1w': 'W', '1M': 'M',
};

/** Plans that unlock all replay intervals */
const PAID_PLANS = ['core', 'prime', 'elite', 'zenith'];

function isPaidPlan(plan: string | undefined): boolean {
  return PAID_PLANS.includes(plan || '');
}

function Dropdown({
  open,
  onClose,
  anchorRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-1 left-0 min-w-[180px] rounded-lg border border-chart-border bg-toolbar-bg shadow-xl z-[200] py-1 text-xs"
    >
      {children}
    </div>
  );
}

export default function ReplayControls() {
  const {
    replayState, setReplayState,
    replaySpeed, setReplaySpeed,
    replayBarIndex, setReplayBarIndex,
    interval, setInterval,
  } = useChart();
  const { user, isGuest } = useAuth();
  const { data: profile } = useProfile();

  const [speedOpen, setSpeedOpen] = useState(false);
  const [intervalOpen, setIntervalOpen] = useState(false);
  const speedBtnRef = useRef<HTMLButtonElement>(null);
  const intervalBtnRef = useRef<HTMLButtonElement>(null);

  const plan = profile?.plan;
  const hasPaid = isPaidPlan(plan);

  // Free users can only use daily interval for replay
  const canUseInterval = (iv: Interval) => {
    if (hasPaid) return true;
    return iv === '1d';
  };

  if (replayState === 'off') return null;

  if (replayState === 'selecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-toolbar-bg border-b border-chart-border text-xs select-none">
        <Rewind size={14} className="text-primary" />
        <span className="text-muted-foreground">Click on the chart to select a replay starting point</span>
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

  const handleSelectSpeed = (speed: number) => {
    setReplaySpeed(speed);
    setSpeedOpen(false);
  };

  const handleSelectInterval = (iv: Interval) => {
    if (!canUseInterval(iv)) return;
    setInterval(iv);
    setIntervalOpen(false);
    // After changing interval during replay, reset to selecting mode
    setReplayState('selecting');
  };

  const intervalLabel = SHORT_LABEL[interval] || interval;

  return (
    <div className="flex items-center gap-1 px-3 py-1 bg-toolbar-bg border-b border-chart-border text-xs select-none">
      {/* Select bar label */}
      <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
        <Rewind size={13} className="text-primary" />
        <span className="text-primary font-medium">Select bar</span>
        <ChevronDown size={12} className="text-muted-foreground" />
      </div>

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

      {/* Speed button */}
      <div className="relative">
        <button
          ref={speedBtnRef}
          onClick={() => { setSpeedOpen(!speedOpen); setIntervalOpen(false); }}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-toolbar-hover text-muted-foreground hover:text-foreground transition-colors font-medium"
          title="Replay speed"
        >
          <span>{replaySpeed}x</span>
        </button>
        <Dropdown open={speedOpen} onClose={() => setSpeedOpen(false)} anchorRef={speedBtnRef}>
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Replay Speed
          </div>
          {REPLAY_SPEEDS.map((s) => (
            <button
              key={s.value}
              onClick={() => handleSelectSpeed(s.value)}
              className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-toolbar-hover transition-colors ${
                replaySpeed === s.value ? 'bg-primary/10 text-primary' : 'text-foreground'
              }`}
            >
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground text-[10px]">{s.desc}</span>
            </button>
          ))}
        </Dropdown>
      </div>

      {/* Interval button */}
      <div className="relative">
        <button
          ref={intervalBtnRef}
          onClick={() => { setIntervalOpen(!intervalOpen); setSpeedOpen(false); }}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-toolbar-hover text-muted-foreground hover:text-foreground transition-colors font-medium"
          title="Update interval"
        >
          <span>{intervalLabel}</span>
        </button>
        <Dropdown open={intervalOpen} onClose={() => setIntervalOpen(false)} anchorRef={intervalBtnRef}>
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Update Interval
          </div>
          {REPLAY_INTERVALS.map((iv) => {
            const allowed = canUseInterval(iv);
            const label = ALL_INTERVALS.find(a => a.value === iv)?.label || iv;
            return (
              <button
                key={iv}
                onClick={() => allowed && handleSelectInterval(iv)}
                className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors ${
                  !allowed
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : interval === iv
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-toolbar-hover'
                }`}
                disabled={!allowed}
              >
                <span>{label}</span>
                {!allowed && <Lock size={10} className="text-muted-foreground/40" />}
              </button>
            );
          })}
          {!hasPaid && (
            <div className="px-3 py-2 text-[10px] text-muted-foreground border-t border-chart-border mt-1">
              Upgrade to VizionX Core or above to unlock all replay intervals
            </div>
          )}
        </Dropdown>
      </div>

      <div className="w-px h-5 bg-chart-border mx-1" />

      {/* Jump to real time */}
      <button
        onClick={handleStop}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-toolbar-hover text-muted-foreground hover:text-foreground transition-colors"
        title="Jump to real-time"
      >
        <ChevronRight size={14} />
        <span>|</span>
      </button>

      {/* Close */}
      <button
        onClick={handleStop}
        className="ml-auto p-1 rounded hover:bg-toolbar-hover text-muted-foreground hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  );
}
