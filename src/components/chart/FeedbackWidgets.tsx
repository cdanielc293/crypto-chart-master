import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import bugMascot from '@/assets/bug-mascot.png';
import featureMascot from '@/assets/feature-mascot.png';

// ─── Draggable wrapper ───
function DraggableWidget({ children, initialX, initialY, onClick }: {
  children: React.ReactNode;
  initialX: number;
  initialY: number;
  onClick: () => void;
}) {
  const posRef = useRef({ x: initialX, y: initialY });
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const draggingRef = useRef(false);
  const startRef = useRef({ mx: 0, my: 0, sx: 0, sy: 0 });
  const movedRef = useRef(false);
  const elRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    movedRef.current = false;
    startRef.current = { mx: e.clientX, my: e.clientY, sx: posRef.current.x, sy: posRef.current.y };

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = ev.clientX - startRef.current.mx;
      const dy = ev.clientY - startRef.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
      const nx = Math.max(0, Math.min(window.innerWidth - 48, startRef.current.sx + dx));
      const ny = Math.max(0, Math.min(window.innerHeight - 48, startRef.current.sy + dy));
      posRef.current = { x: nx, y: ny };
      setPos({ x: nx, y: ny });
    };

    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (!movedRef.current) onClick();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onClick]);

  return (
    <div
      ref={elRef}
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 50,
        userSelect: 'none',
        cursor: draggingRef.current ? 'grabbing' : 'grab',
      }}
    >
      {children}
    </div>
  );
}

interface FeedbackPanelProps {
  type: 'bug' | 'feature';
  open: boolean;
  onClose: () => void;
  anchorX: number;
  anchorY: number;
}

function FeedbackPanel({ type, open, onClose, anchorX, anchorY }: FeedbackPanelProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const isBug = type === 'bug';
  const mascot = isBug ? bugMascot : featureMascot;
  const title = isBug ? 'Found a bug? 🐛' : 'Missing a feature? 💡';
  const placeholder = isBug
    ? 'Describe what happened, where, and what you expected...'
    : 'Tell us what you would like us to add...';
  const accent = isBug ? 'from-rose-500/20 to-orange-500/20' : 'from-violet-500/20 to-cyan-500/20';
  const borderAccent = isBug ? 'border-rose-500/30' : 'border-violet-500/30';
  const btnBg = isBug ? 'bg-rose-500 hover:bg-rose-600' : 'bg-violet-500 hover:bg-violet-600';

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(8, Math.min(anchorX - 120, window.innerWidth - 296)),
    top: Math.max(8, anchorY - 320),
    zIndex: 60,
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please write something before submitting 😊');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('feedback_tickets').insert({
        user_id: user?.id || null,
        user_email: user?.email || null,
        type: isBug ? 'bug' : 'feature',
        message: message.trim(),
      });
      if (error) throw error;
      toast.success(isBug ? 'Bug report sent! Thank you 🙏' : 'Feature request sent! Thank you 🙏');
      setMessage('');
      onClose();
    } catch (err) {
      console.error('Feedback submit error:', err);
      toast.error('Failed to send, please try again');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={panelStyle}
          className={`w-72 rounded-2xl border ${borderAccent} bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden`}
        >
          <div className={`relative bg-gradient-to-br ${accent} px-4 pt-4 pb-8`}>
            <button
              onClick={onClose}
              className="absolute top-2 left-2 text-foreground/40 hover:text-foreground/80 transition-colors"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3">
              <img src={mascot} alt="" className="w-14 h-14 drop-shadow-lg" />
              <h3 className="text-base font-bold text-foreground">{title}</h3>
            </div>
          </div>

          <div className="px-4 pt-3 pb-4 -mt-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleSubmit}
              disabled={sending}
              className={`mt-2 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${btnBg} disabled:opacity-50`}
            >
              <Send size={14} />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function FeedbackWidgets() {
  const [bugOpen, setBugOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);
  const bugPosRef = useRef({ x: 0, y: 0 });
  const featurePosRef = useRef({ x: 0, y: 0 });

  return (
    <>
      {/* Bug report */}
      <FeedbackPanel type="bug" open={bugOpen} onClose={() => setBugOpen(false)} anchorX={bugPosRef.current.x} anchorY={bugPosRef.current.y} />
      <DraggableWidget
        initialX={typeof window !== 'undefined' ? window.innerWidth - 60 : 0}
        initialY={typeof window !== 'undefined' ? window.innerHeight - 60 : 0}
        onClick={() => { setBugOpen(v => !v); setFeatureOpen(false); }}
      >
        <div className="relative group">
          <div className="w-12 h-12 rounded-full bg-popover/90 border border-border shadow-lg flex items-center justify-center backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-xl hover:border-rose-500/40">
            <img src={bugMascot} alt="Bug report" className="w-9 h-9 object-contain pointer-events-none" />
          </div>
          <span className="absolute -top-8 right-1/2 translate-x-1/2 bg-popover border border-border text-foreground text-[10px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
            Report Bug 🐛
          </span>
        </div>
      </DraggableWidget>

      {/* Feature request */}
      <FeedbackPanel type="feature" open={featureOpen} onClose={() => setFeatureOpen(false)} anchorX={featurePosRef.current.x} anchorY={featurePosRef.current.y} />
      <DraggableWidget
        initialX={12}
        initialY={typeof window !== 'undefined' ? window.innerHeight - 60 : 0}
        onClick={() => { setFeatureOpen(v => !v); setBugOpen(false); }}
      >
        <div className="relative group">
          <div className="w-12 h-12 rounded-full bg-popover/90 border border-border shadow-lg flex items-center justify-center backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-xl hover:border-violet-500/40">
            <img src={featureMascot} alt="Feature request" className="w-9 h-9 object-contain pointer-events-none" />
          </div>
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border text-foreground text-[10px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
            Feature Request 💡
          </span>
        </div>
      </DraggableWidget>
    </>
  );
}
