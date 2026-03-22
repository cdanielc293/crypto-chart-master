import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingIn: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SIGNOUT_TIMEOUT_MS = 8000;
const AUTH_REQUEST_TIMEOUT_MS = 15000;

const withAuthTimeout = <T,>(promise: Promise<T>) => {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('Auth request timeout')), AUTH_REQUEST_TIMEOUT_MS);
    }),
  ]);
};

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

  const signInWithEmail = async (email: string, password: string) => {
    if (signingIn) return;

    setSigningIn(true);

    try {
      const { error } = await withAuthTimeout(
        supabase.auth.signInWithPassword({ email, password }),
      );
      if (error) throw error;
      toast.success('התחברת בהצלחה');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('Auth request timeout')) {
        toast.error('הבקשה ארוכה מדי. בדוק חיבור אינטרנט ונסה שוב.');
      } else {
        toast.error(msg.includes('Invalid login credentials') ? 'אימייל או סיסמה שגויים.' : 'ההתחברות נכשלה. נסה שוב.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (signingIn) return;

    setSigningIn(true);

    try {
      const { data, error } = await withAuthTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/chart`,
          },
        }),
      );

      if (error) throw error;

      if (data.user && !data.session) {
        toast.success('נשלח אליך מייל אימות. אשר את האימייל ואז התחבר.');
      } else {
        toast.success('ההרשמה הושלמה בהצלחה.');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('Auth request timeout')) {
        toast.error('הבקשה ארוכה מדי. בדוק חיבור אינטרנט ונסה שוב.');
      } else if (msg.includes('already registered')) {
        toast.error('האימייל כבר קיים במערכת. נסה להתחבר.');
      } else {
        toast.error('ההרשמה נכשלה. נסה שוב.');
      }
    } finally {
      setSigningIn(false);
    }
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
    <AuthContext.Provider value={{ user, session, loading, signingIn, signInWithEmail, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
