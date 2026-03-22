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
const OAUTH_TIMEOUT_MS = 30000;

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
        await new Promise(r => setTimeout(r, 1500));
        await supabase.functions.invoke('register-device', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-real-user-agent': navigator.userAgent,
          },
        });
      } catch (e) {
        // Non-critical, silently ignore
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.access_token && (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED')) {
        registerDevice(session.access_token);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.access_token) {
        registerDevice(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    if (signingIn) return;
    setSigningIn(true);
    
    try {
      console.log(`[Auth] Starting ${provider} sign-in...`);
      
      const result = await Promise.race([
        lovable.auth.signInWithOAuth(provider, {
          redirect_uri: window.location.origin,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OAuth timeout')), OAUTH_TIMEOUT_MS)
        ),
      ]);

      console.log(`[Auth] OAuth result:`, result);

      if (result.error) {
        throw result.error;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Auth] Sign-in error:`, msg);

      if (msg.includes('Popup was blocked') || msg.includes('popup')) {
        toast.error('הדפדפן חסם את חלון ההתחברות. אפשר חלונות קופצים ונסה שוב.');
      } else if (msg.includes('timeout') || msg.includes('deadline')) {
        toast.error('ההתחברות נתקעה. סגור את חלון Google ונסה שוב.');
      } else if (msg.includes('Preview mode') || msg.includes('legacy_flow')) {
        toast.error('במצב Preview ההתחברות עשויה להיתקע. פתח את האפליקציה בטאב חדש ונסה שוב.');
      } else if (msg.includes('closed') || msg.includes('cancelled')) {
        // User closed the popup, no error needed
      } else {
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
      console.log('[Auth] Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] Sign-out error:', error);
        // Force clear local state even if signOut fails
        setUser(null);
        setSession(null);
        toast.error('שגיאה בהתנתקות, אך הוצאת מהחשבון מקומית.');
      } else {
        console.log('[Auth] Signed out successfully');
        setUser(null);
        setSession(null);
      }
    } catch (e) {
      console.error('[Auth] Sign-out exception:', e);
      // Force clear local state
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
