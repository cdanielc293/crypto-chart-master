import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import bugMascot from '@/assets/bug-mascot.png';
import featureMascot from '@/assets/feature-mascot.png';

// ─── Draggable button hook ───
function useDraggable(initialPos: { x: number; y: number }) {
  const [pos, setPos] = useState(initialPos);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    hasMoved.current = false;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    hasMoved.current = true;
    const size = 48;
    const nx = Math.max(0, Math.min(window.innerWidth - size, e.clientX - offset.current.x));
    const ny = Math.max(0, Math.min(window.innerHeight - size, e.clientY - offset.current.y));
    setPos({ x: nx, y: ny });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return { pos, onPointerDown, onPointerMove, onPointerUp, hasMoved };
}

interface FeedbackPanelProps {
  type: 'bug' | 'feature';
  open: boolean;
  onClose: () => void;
  anchorPos: { x: number; y: number };
}

function FeedbackPanel({ type, open, onClose, anchorPos }: FeedbackPanelProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);

  const isBug = type === 'bug';
  const mascot = isBug ? bugMascot : featureMascot;
  const title = isBug ? 'Found a bug? 🐛' : 'Missing a feature? 💡';
  const placeholder = isBug
    ? 'Describe what happened, where, and what you expected...'
    : 'Tell us what you would like us to add...';
  const accent = isBug ? 'from-rose-500/20 to-orange-500/20' : 'from-violet-500/20 to-cyan-500/20';
  const borderAccent = isBug ? 'border-rose-500/30' : 'border-violet-500/30';
  const btnBg = isBug ? 'bg-rose-500 hover:bg-rose-600' : 'bg-violet-500 hover:bg-violet-600';

  // Position panel above the button, clamped to screen
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(8, Math.min(anchorPos.x - 120, window.innerWidth - 296)),
    top: Math.max(8, anchorPos.y - 320),
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
          ref={panelRef}
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

  const bugDrag = useDraggable({ x: window.innerWidth - 60, y: window.innerHeight - 60 });
  const featureDrag = useDraggable({ x: 12, y: window.innerHeight - 60 });

  return (
    <>
      {/* Bug report */}
      <FeedbackPanel type="bug" open={bugOpen} onClose={() => setBugOpen(false)} anchorPos={bugDrag.pos} />
      <div
        style={{ position: 'fixed', left: bugDrag.pos.x, top: bugDrag.pos.y, zIndex: 50, touchAction: 'none' }}
        onPointerDown={bugDrag.onPointerDown}
        onPointerMove={bugDrag.onPointerMove}
        onPointerUp={bugDrag.onPointerUp}
      >
        <motion.button
          onClick={() => { if (!bugDrag.hasMoved.current) { setBugOpen(!bugOpen); setFeatureOpen(false); } }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative group cursor-grab active:cursor-grabbing"
          title="Report a bug"
        >
          <div className="w-12 h-12 rounded-full bg-popover/90 border border-border shadow-lg flex items-center justify-center backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-xl hover:border-rose-500/40">
            <img src={bugMascot} alt="Bug report" className="w-9 h-9 object-contain" />
          </div>
          <span className="absolute -top-8 right-1/2 translate-x-1/2 bg-popover border border-border text-foreground text-[10px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
            Report Bug 🐛
          </span>
        </motion.button>
      </div>

      {/* Feature request */}
      <FeedbackPanel type="feature" open={featureOpen} onClose={() => setFeatureOpen(false)} anchorPos={featureDrag.pos} />
      <div
        style={{ position: 'fixed', left: featureDrag.pos.x, top: featureDrag.pos.y, zIndex: 50, touchAction: 'none' }}
        onPointerDown={featureDrag.onPointerDown}
        onPointerMove={featureDrag.onPointerMove}
        onPointerUp={featureDrag.onPointerUp}
      >
        <motion.button
          onClick={() => { if (!featureDrag.hasMoved.current) { setFeatureOpen(!featureOpen); setBugOpen(false); } }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative group cursor-grab active:cursor-grabbing"
          title="Request a feature"
        >
          <div className="w-12 h-12 rounded-full bg-popover/90 border border-border shadow-lg flex items-center justify-center backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-xl hover:border-violet-500/40">
            <img src={featureMascot} alt="Feature request" className="w-9 h-9 object-contain" />
          </div>
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border text-foreground text-[10px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
            Feature Request 💡
          </span>
        </motion.button>
      </div>
    </>
  );
}
