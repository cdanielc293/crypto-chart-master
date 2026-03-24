import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, Share2, Check, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { planLabels } from '@/hooks/useProfile';

interface Props {
  open: boolean;
  onClose: () => void;
  userName: string;
  plan: string;
}

const SHARE_TEXT = 'I just joined the VizionX Beta! The next-gen charting platform for traders. Check it out:';
const SHARE_URL = 'https://vizionx.pro';

const socialChannels = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    color: 'from-green-500 to-green-600',
    getUrl: () => `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + ' ' + SHARE_URL)}`,
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: 'from-neutral-700 to-neutral-900',
    getUrl: () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    color: 'from-blue-400 to-blue-600',
    getUrl: () => `https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    color: 'from-blue-600 to-blue-700',
    getUrl: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}&quote=${encodeURIComponent(SHARE_TEXT)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: 'from-blue-700 to-blue-800',
    getUrl: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`,
  },
];

function fireConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#22d3ee', '#14b8a6', '#a855f7', '#f59e0b', '#10b981'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function BetaPassDialog({ open, onClose, userName, plan }: Props) {
  const [shared, setShared] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => fireConfetti(), 400);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const markShared = useCallback(async () => {
    if (!user || shared) return;
    setShared(true);
    setShowThankYou(true);
    fireConfetti();

    // Update profile
    await supabase
      .from('profiles')
      .update({ has_shared_beta: true, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
  }, [user, shared, queryClient]);

  const handleShare = (channel: typeof socialChannels[0]) => {
    window.open(channel.getUrl(), '_blank', 'noopener,noreferrer,width=600,height=400');
    markShared();
  };

  const firstName = userName.split(' ')[0] || 'Explorer';
  const planLabel = planLabels[plan] || planLabels.start;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10"
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#0d1525] to-[#0a0a1a]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.08),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.06),transparent_60%)]" />

            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-2xl border border-cyan-400/20 animate-pulse" />

            {/* Content */}
            <div className="relative p-6 sm:p-8">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <motion.div
                className="text-center mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                  <Sparkles size={12} />
                  Beta Access Granted
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Welcome, {firstName}!
                </h2>
                <p className="text-white/40 text-sm mt-1.5">
                  You're now part of the future of trading.
                </p>
              </motion.div>

              {/* Beta Pass Card */}
              <motion.div
                className="relative rounded-xl overflow-hidden mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <div className="bg-gradient-to-br from-cyan-950/50 via-slate-900/80 to-purple-950/30 border border-white/[0.06] rounded-xl p-5">
                  {/* Card top row */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Beta Pass</p>
                      <p className="text-lg font-bold text-white mt-0.5">{userName || 'Explorer'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Plan</p>
                      <p className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent mt-0.5">
                        {planLabel}
                      </p>
                    </div>
                  </div>

                  {/* Card bottom row */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Status</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-sm text-emerald-400 font-semibold">Active</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Access</p>
                      <p className="text-sm text-white/60 font-medium mt-0.5">
                        {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Decorative line */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
                </div>
              </motion.div>

              {/* Thank you message */}
              <AnimatePresence>
                {showThankYou && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
                      <Check size={16} className="text-emerald-400 shrink-0" />
                      <p className="text-sm text-emerald-300 font-medium">
                        Thanks for sharing! You've earned your Beta Pioneer badge ✨
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Share section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Share2 size={14} className="text-white/40" />
                  <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">
                    Share & earn your pioneer badge
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {socialChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => handleShare(channel)}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-gradient-to-r ${channel.color} 
                        text-white text-sm font-medium transition-all hover:scale-[1.03] hover:shadow-lg 
                        hover:shadow-cyan-400/10 active:scale-[0.98] ${shared ? 'opacity-60' : ''}`}
                    >
                      {channel.icon}
                      {channel.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Skip */}
              <motion.div
                className="text-center mt-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <button
                  onClick={onClose}
                  className="text-xs text-white/25 hover:text-white/50 transition-colors"
                >
                  {shared ? 'Continue to VizionX →' : 'Skip for now →'}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
