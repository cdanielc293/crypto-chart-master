import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import bugMascot from '@/assets/bug-mascot.png';
import featureMascot from '@/assets/feature-mascot.png';

interface FeedbackPanelProps {
  type: 'bug' | 'feature';
  open: boolean;
  onClose: () => void;
}

function FeedbackPanel({ type, open, onClose }: FeedbackPanelProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const isBug = type === 'bug';
  const mascot = isBug ? bugMascot : featureMascot;
  const title = isBug ? 'מצאת באג? 🐛' : 'חסר פיצ׳ר? 💡';
  const placeholder = isBug
    ? 'תאר לנו מה קרה, איפה, ומה ציפית שיקרה...'
    : 'ספר לנו מה היית רוצה שנוסיף...';
  const accent = isBug ? 'from-rose-500/20 to-orange-500/20' : 'from-violet-500/20 to-cyan-500/20';
  const borderAccent = isBug ? 'border-rose-500/30' : 'border-violet-500/30';
  const btnBg = isBug ? 'bg-rose-500 hover:bg-rose-600' : 'bg-violet-500 hover:bg-violet-600';

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('כתוב משהו לפני שליחה 😊');
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
      toast.success(isBug ? 'הדיווח נשלח! תודה רבה 🙏' : 'הבקשה נשלחה! תודה רבה 🙏');
      setMessage('');
      onClose();
    } catch (err) {
      console.error('Feedback submit error:', err);
      toast.error('שגיאה בשליחה, נסה שוב');
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
          className={`absolute bottom-16 ${isBug ? 'right-0' : 'left-0'} w-72 rounded-2xl border ${borderAccent} bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50`}
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
              dir="rtl"
            />
            <button
              onClick={handleSubmit}
              disabled={sending}
              className={`mt-2 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${btnBg} disabled:opacity-50`}
            >
              <Send size={14} />
              {sending ? 'שולח...' : 'שלח'}
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

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <FeedbackPanel type="bug" open={bugOpen} onClose={() => setBugOpen(false)} />
        <motion.button
          onClick={() => { setBugOpen(!bugOpen); setFeatureOpen(false); }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative group"
          title="דיווח על באג"
        >
          <div className="w-12 h-12 rounded-full bg-popover/90 border border-border shadow-lg flex items-center justify-center backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-xl hover:border-rose-500/40">
            <img src={bugMascot} alt="Bug report" className="w-9 h-9 object-contain" />
          </div>
          <span className="absolute -top-8 right-1/2 translate-x-1/2 bg-popover border border-border text-foreground text-[10px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
            דיווח באג 🐛
          </span>
        </motion.button>
      </div>

      <div className="fixed bottom-4 left-4 z-50">
        <FeedbackPanel type="feature" open={featureOpen} onClose={() => setFeatureOpen(false)} />
        <motion.button
          onClick={() => { setFeatureOpen(!featureOpen); setBugOpen(false); }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative group"
          title="בקשת פיצ׳ר"
        >
          <div className="w-12 h-12 rounded-full bg-popover/90 border border-border shadow-lg flex items-center justify-center backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-xl hover:border-violet-500/40">
            <img src={featureMascot} alt="Feature request" className="w-9 h-9 object-contain" />
          </div>
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border text-foreground text-[10px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
            בקשת פיצ׳ר 💡
          </span>
        </motion.button>
      </div>
    </>
  );
}
