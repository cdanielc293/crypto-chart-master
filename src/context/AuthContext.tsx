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
      // IMPORTANT: avoid Supabase calls directly inside onAuthStateChange callback
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

    void supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);

      if (existingSession?.access_token) {
        scheduleDeviceRegistration(existingSession.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    if (signingIn) return;
    setSigningIn(true);

    try {
      // Preview/iframe environments often block OAuth popups.
      if (window.self !== window.top) {
        const standaloneUrl = window.location.href;
        window.open(standaloneUrl, '_blank', 'noopener,noreferrer');
        toast.info('פתחנו טאב חדש להתחברות מאובטחת. המשך שם את ההתחברות.');
        return;
      }

      const result = await Promise.race([
        lovable.auth.signInWithOAuth(provider, {
          redirect_uri: window.location.origin,
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
        toast.info('פתחנו טאב חדש להתחברות מאובטחת. המשך שם את ההתחברות.');
      } else if (msg.includes('timeout') || msg.includes('deadline')) {
        toast.error('ההתחברות נתקעה זמנית. סגור חלונות התחברות פתוחים ונסה שוב.');
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
