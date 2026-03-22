import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const OAUTH_TIMEOUT_MS = 20000;
const SIGNOUT_TIMEOUT_MS = 8000;

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const AUTH_URL_KEYS = new Set([
  'access_token',
  'refresh_token',
  'expires_at',
  'expires_in',
  'token_type',
  'type',
]);

function getTokensFromUrl() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(window.location.search);

  const accessToken = hashParams.get('access_token') ?? searchParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') ?? searchParams.get('refresh_token');

  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

function cleanAuthParamsFromUrl() {
  const currentUrl = new URL(window.location.href);
  currentUrl.hash = '';

  AUTH_URL_KEYS.forEach((key) => {
    currentUrl.searchParams.delete(key);
  });

  const next = `${currentUrl.pathname}${currentUrl.search}`;
  window.history.replaceState({}, document.title, next);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const registerDevice = async (accessToken: string) => {
      try {
        await supabase.functions.invoke('register-device', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-real-user-agent': navigator.userAgent,
          },
        });
      } catch {
        // Non-critical: do nothing
      }
    };

    const scheduleDeviceRegistration = (accessToken: string) => {
      window.setTimeout(() => {
        void registerDevice(accessToken);
      }, 800);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (nextSession?.access_token && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        scheduleDeviceRegistration(nextSession.access_token);
      }
    });

    const bootstrapAuth = async () => {
      const tokens = getTokensFromUrl();
      if (tokens) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });

        if (!error) {
          cleanAuthParamsFromUrl();
        }
      }

      const { data: { session: existingSession } } = await supabase.auth.getSession();
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);

      if (existingSession?.access_token) {
        scheduleDeviceRegistration(existingSession.access_token);
      }
    };

    void bootstrapAuth();

    return () => subscription.unsubscribe();
  }, []);

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    if (signingIn) return;
    setSigningIn(true);

    try {
      const result = await Promise.race([
        lovable.auth.signInWithOAuth(provider, {
          redirect_uri: `${window.location.origin}/chart`,
          ...(provider === 'google' ? { extraParams: { prompt: 'select_account' } } : {}),
        }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('OAuth timeout')), OAUTH_TIMEOUT_MS);
        }),
      ]);

      if (result.error) throw result.error;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';

      if (msg.includes('Popup was blocked') || msg.includes('Preview mode') || msg.includes('legacy_flow')) {
        window.open(window.location.href, '_blank', 'noopener,noreferrer');
        toast.info('התחברות נפתחה בטאב חדש. המשך שם.');
      } else if (msg.includes('timeout') || msg.includes('deadline')) {
        toast.error('ההתחברות נתקעה זמנית. נסה שוב.');
      } else if (!msg.includes('closed') && !msg.includes('cancelled')) {
        toast.error('ההתחברות נכשלה. נסה שוב.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithGoogle = async () => {
    await signInWithProvider('google');
  };

  const signInWithApple = async () => {
    await signInWithProvider('apple');
  };

  const signOut = async () => {
    try {
      const result = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{ error: Error }>((resolve) => {
          window.setTimeout(() => resolve({ error: new Error('Sign out timeout') }), SIGNOUT_TIMEOUT_MS);
        }),
      ]);

      if (result?.error) {
        toast.error('ההתנתקות מתעכבת, בוצעה יציאה מקומית.');
      }
    } catch {
      toast.error('שגיאה בהתנתקות, בוצעה יציאה מקומית.');
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signingIn, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
