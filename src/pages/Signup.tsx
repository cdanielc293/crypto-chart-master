import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import signupHero from '@/assets/signup-hero.jpg';

const tierNames: Record<string, string> = {
  core: 'VizionX Core',
  prime: 'VizionX Prime',
  elite: 'VizionX Elite',
  zenith: 'VizionX Zenith',
};

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signInWithEmail, signUpWithEmail, signInWithOAuth, signingIn, enterAsGuest } = useAuth();
  const tier = searchParams.get('tier') || 'zenith';
  const tierLabel = tierNames[tier] || 'VizionX Zenith';
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (user) navigate('/chart', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.error('Please fill in email and password.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        toast.error('Passwords do not match.');
        return;
      }
      await signUpWithEmail(trimmedEmail, password, { plan: tier });
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
        <img src={signupHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
          <img src={vizionLogo} alt="VizionX" className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            VIZIONX
          </span>
        </motion.div>

        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-center mb-2">
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-sm text-white/40 text-center mb-8">
            Selected plan:{' '}
            <span className="text-cyan-400 font-semibold">{tierLabel}</span>
            <span className="text-white/20"> · Free for Beta Version</span>
          </p>

          {/* Primary OAuth buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => signInWithOAuth('google')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-sm font-semibold"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
            </button>

            <button
              type="button"
              onClick={() => signInWithOAuth('apple')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-sm font-semibold"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              {mode === 'signup' ? 'Sign up with Apple' : 'Sign in with Apple'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/20">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email toggle button */}
          {!showEmailForm && (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-sm text-white/60 hover:text-white/90"
            >
              <Mail className="w-4 h-4" />
              {mode === 'signup' ? 'Sign up with Email' : 'Sign in with Email'}
            </button>
          )}

          {/* Email form (expandable) */}
          <AnimatePresence>
            {showEmailForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 rounded-lg border border-white/10 p-1 mb-4 bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className={`rounded-md py-2 text-sm transition-colors ${mode === 'signup' ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white/80'}`}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className={`rounded-md py-2 text-sm transition-colors ${mode === 'signin' ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white/80'}`}
                  >
                    Sign In
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="Password"
                    className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                  {mode === 'signup' && (
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Confirm password"
                      className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                    />
                  )}
                  <button
                    type="submit"
                    disabled={signingIn}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-cyan-400/40 bg-cyan-400/15 hover:bg-cyan-400/20 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {signingIn ? 'Loading...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Guest divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/20">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Guest */}
          <button
            type="button"
            onClick={() => { enterAsGuest(); navigate('/chart'); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-sm text-white/60 hover:text-white/90"
          >
            Continue as Guest
          </button>

          <p className="text-center text-sm text-white/30 mt-6">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              {mode === 'signup' ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </motion.div>

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
