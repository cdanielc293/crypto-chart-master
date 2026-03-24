import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles, Bug, Lightbulb, Heart, ArrowRight, X, Rocket } from 'lucide-react';
import { useProfile, planLabels } from '@/hooks/useProfile';

function fireWelcomeConfetti() {
  const duration = 4000;
  const end = Date.now() + duration;
  const colors = ['#22d3ee', '#14b8a6', '#a855f7', '#f59e0b', '#10b981', '#ec4899'];

  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors });
    confetti({ particleCount: 2, angle: 90, spread: 100, origin: { x: 0.5, y: 0.3 }, colors, gravity: 0.6 });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

const steps = [
  {
    id: 'welcome',
    icon: <Sparkles className="w-8 h-8" />,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-400/10 border-cyan-400/20',
    title: "Welcome to VizionX!",
    subtitle: "You're officially part of something big.",
    body: "We're thrilled to have you here. VizionX is in Beta — that means you're among the first to experience the next generation of trading tools. Every feature you see is crafted with passion, and it's only going to get better.",
  },
  {
    id: 'beta',
    icon: <Rocket className="w-8 h-8" />,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-400/10 border-purple-400/20',
    title: "We're in Beta — Together",
    subtitle: "Your voice shapes our future.",
    body: "Being in Beta means we're building this alongside you. We're here to deliver the best possible experience, and your feedback is the fuel that drives us forward. Every suggestion matters, every report helps.",
  },
  {
    id: 'bug',
    icon: <Bug className="w-8 h-8" />,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-400/10 border-rose-400/20',
    title: "Found Something Off?",
    subtitle: "We want to know about it.",
    body: "See the little mascot in the bottom-right corner? That's your direct line to our team. If anything feels broken, glitchy, or just not right — tap it and let us know. We fix things fast.",
    highlight: 'bottom-right',
  },
  {
    id: 'feature',
    icon: <Lightbulb className="w-8 h-8" />,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-400/10 border-amber-400/20',
    title: "Got an Idea?",
    subtitle: "We're all ears.",
    body: "In the bottom-left corner, you'll find the feature request button. Dream big — whether it's a new indicator, a layout tweak, or something nobody's thought of yet. The best features come from our community.",
    highlight: 'bottom-left',
  },
  {
    id: 'family',
    icon: <Heart className="w-8 h-8" />,
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-400/10 border-pink-400/20',
    title: "You're Family Now",
    subtitle: "Let's build the future of trading together.",
    body: "This isn't just a platform — it's a community. We're committed to making VizionX smooth, powerful, and truly yours. Thank you for believing in us from the start. Now let's make some great trades!",
  },
];

export default function WelcomeOnboardingDialog() {
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!profile) return;
    const key = `vizionx_welcomed_${profile.id}`;
    if (localStorage.getItem(key)) return;
    // Small delay so the chart loads first
    const timer = setTimeout(() => {
      setOpen(true);
      fireWelcomeConfetti();
    }, 1200);
    return () => clearTimeout(timer);
  }, [profile]);

  const handleClose = useCallback(() => {
    if (profile) localStorage.setItem(`vizionx_welcomed_${profile.id}`, '1');
    setOpen(false);
  }, [profile]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      if (step === 0) fireWelcomeConfetti();
    } else {
      handleClose();
    }
  };

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const planLabel = planLabels[profile?.plan || 'start'] || planLabels.start;

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
            onClick={handleClose}
          />

          {/* Pointer highlights */}
          <AnimatePresence>
            {current.highlight === 'bottom-right' && (
              <motion.div
                key="ptr-right"
                className="fixed bottom-4 right-4 z-[101] w-16 h-16 rounded-full border-2 border-rose-400 pointer-events-none"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: [1, 1.3, 1], transition: { scale: { repeat: Infinity, duration: 1.5 } } }}
                exit={{ opacity: 0 }}
              />
            )}
            {current.highlight === 'bottom-left' && (
              <motion.div
                key="ptr-left"
                className="fixed bottom-4 left-4 z-[101] w-16 h-16 rounded-full border-2 border-amber-400 pointer-events-none"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: [1, 1.3, 1], transition: { scale: { repeat: Infinity, duration: 1.5 } } }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>

          {/* Dialog */}
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10"
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#0d1525] to-[#0a0a1a]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.06),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.05),transparent_60%)]" />

            {/* Content */}
            <div className="relative p-6 sm:p-8">
              {/* Close */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors z-10"
              >
                <X size={18} />
              </button>

              {/* Plan badge */}
              {step === 0 && (
                <motion.div
                  className="flex justify-center mb-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                    <Sparkles size={12} />
                    {planLabel} — Beta Access
                  </span>
                </motion.div>
              )}

              {/* Step content with key-based animation */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="text-center"
                >
                  {/* Icon */}
                  <div className="flex justify-center mb-5 mt-2">
                    <motion.div
                      className={`w-16 h-16 rounded-2xl ${current.iconBg} border flex items-center justify-center ${current.iconColor}`}
                      animate={{ rotate: [0, -5, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    >
                      {current.icon}
                    </motion.div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1">
                    {current.title}
                  </h2>
                  <p className="text-sm text-white/50 font-medium mb-4">
                    {current.subtitle}
                  </p>
                  <p className="text-sm text-white/40 leading-relaxed max-w-md mx-auto">
                    {current.body}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 mt-6 mb-5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? 'w-6 bg-cyan-400' : 'w-1.5 bg-white/15 hover:bg-white/30'
                    }`}
                  />
                ))}
              </div>

              {/* CTA */}
              <motion.button
                onClick={handleNext}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-sm tracking-wide hover:from-cyan-400 hover:to-teal-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLast ? (
                  <>Let's Go! <Rocket size={16} /></>
                ) : (
                  <>Next <ArrowRight size={16} /></>
                )}
              </motion.button>

              {/* Skip */}
              <div className="text-center mt-3">
                <button
                  onClick={handleClose}
                  className="text-[11px] text-white/20 hover:text-white/40 transition-colors"
                >
                  Skip intro →
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
