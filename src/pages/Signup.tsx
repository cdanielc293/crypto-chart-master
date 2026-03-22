import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import vizionLogo from '@/assets/vizion-logo.png';
import signupHero from '@/assets/signup-hero.jpg';

const tierNames: Record<string, string> = {
  core: 'Vizion Core',
  prime: 'Vizion Prime',
  elite: 'Vizion Elite',
  zenith: 'Vizion Zenith',
};

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signInWithEmail, signUpWithEmail, signingIn } = useAuth();
  const { enterAsGuest } = useAuth();
  const navigate2 = useNavigate();
  const tier = searchParams.get('tier') || 'zenith';
  const tierLabel = tierNames[tier] || 'Vizion Zenith';
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // If already logged in, redirect to chart
  useEffect(() => {
    if (user) navigate('/chart', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.error('יש למלא אימייל וסיסמה.');
      return;
    }

    if (password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        toast.error('אימות הסיסמה לא תואם.');
        return;
      }
      await signUpWithEmail(trimmedEmail, password);
      return;
    }

    await signInWithEmail(trimmedEmail, password);
  };

  return (
    <div className="min-h-screen h-screen flex bg-[#050508] text-white overflow-hidden">
      {/* Left — Hero Image */}
      <motion.div
        className="hidden lg:flex relative w-1/2 items-center justify-center overflow-hidden"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={signupHero}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#050508]/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/60 via-transparent to-[#050508]/40" />

        <div className="relative z-10 px-12 pb-20 self-end w-full">
          <motion.h2
            className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            See first.
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Then act.
            </span>
          </motion.h2>
        </div>
      </motion.div>

      {/* Right — Auth Panel */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 relative"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Close button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-5 right-5 text-white/30 hover:text-white/60 transition-colors text-2xl"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Logo */}
        <motion.div
          className="flex items-center gap-2.5 mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <img src={vizionLogo} alt="Vizion" className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            VIZION
          </span>
        </motion.div>

        {/* Sign Up Card */}
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-center mb-2">Sign up</h1>
          <p className="text-sm text-white/40 text-center mb-8">
            Selected plan:{' '}
            <span className="text-cyan-400 font-semibold">{tierLabel}</span>
            <span className="text-white/20"> · Free during launch</span>
          </p>

          <div className="grid grid-cols-2 rounded-lg border border-white/10 p-1 mb-5 bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`rounded-md py-2 text-sm transition-colors ${mode === 'signup' ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              הרשמה
            </button>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`rounded-md py-2 text-sm transition-colors ${mode === 'signin' ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              התחברות
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="name@company.com"
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="סיסמה"
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
            />
            {mode === 'signup' && (
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="אימות סיסמה"
                className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
              />
            )}

            <button
              type="submit"
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-cyan-400/40 bg-cyan-400/15 hover:bg-cyan-400/20 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingIn ? 'טוען...' : mode === 'signup' ? 'יצירת חשבון עם אימייל' : 'התחברות עם אימייל'}
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-6">
            {mode === 'signup' ? 'כבר יש לך חשבון?' : 'אין לך חשבון עדיין?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              {mode === 'signup' ? 'להתחברות' : 'להרשמה'}
            </button>
          </p>
        </motion.div>

        {/* Footer text */}
        <motion.p
          className="absolute bottom-6 text-xs text-white/15 text-center max-w-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </motion.p>
      </motion.div>
    </div>
  );
}
