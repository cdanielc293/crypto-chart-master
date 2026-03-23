import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingIn: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  enterAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('vizion_guest') === 'true');

  // Bootstrap: listen to Supabase auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setIsGuest(false);
        localStorage.removeItem('vizion_guest');
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    if (signingIn) return;
    if (!navigator.onLine) { toast.error('אין חיבור אינטרנט כרגע.'); return; }
    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('התחברת בהצלחה');
    } catch (error) {
      console.error('Auth sign-in failed', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('Invalid login credentials')) {
        toast.error('אימייל או סיסמה שגויים.');
      } else {
        toast.error('ההתחברות נכשלה. נסה שוב.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (signingIn) return;
    if (!navigator.onLine) { toast.error('אין חיבור אינטרנט כרגע.'); return; }
    setSigningIn(true);
    try {
      const { error, data } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        toast.success('ההרשמה הושלמה בהצלחה! מתחבר...');
      } else {
        toast.success('נשלח אליך מייל אימות. אשר את האימייל ואז התחבר.');
      }
    } catch (error) {
      console.error('Auth sign-up failed', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        toast.error('האימייל כבר קיים במערכת. נסה להתחבר.');
      } else {
        toast.error('ההרשמה נכשלה: ' + msg);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) {
      console.error('OAuth error', error);
      toast.error('ההתחברות נכשלה. נסה שוב.');
    }
  };

  const enterAsGuest = () => {
    localStorage.setItem('vizion_guest', 'true');
    setIsGuest(true);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Non-critical
    } finally {
      setUser(null);
      setSession(null);
      setIsGuest(false);
      localStorage.removeItem('vizion_guest');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signingIn, isGuest, signInWithEmail, signUpWithEmail, signInWithOAuth, enterAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
