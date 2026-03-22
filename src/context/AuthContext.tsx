import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const OAUTH_TIMEOUT_MS = 20000;

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const registerDevice = async (accessToken: string) => {
      try {
        // Small delay to let the session propagate on the backend
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
    try {
      const result = await Promise.race([
        lovable.auth.signInWithOAuth(provider, {
          redirect_uri: window.location.origin,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OAuth timeout')), OAUTH_TIMEOUT_MS)
        ),
      ]);

      if (result.error) {
        throw result.error;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';

      if (msg.includes('Popup was blocked')) {
        toast.error('הדפדפן חסם את חלון ההתחברות. אפשר חלונות קופצים ונסה שוב.');
        return;
      }

      if (msg.includes('timeout') || msg.includes('deadline')) {
        toast.error('ההתחברות נתקעה זמנית. סגור את חלון Google ונסה שוב בעוד כמה שניות.');
        return;
      }

      if (msg.includes('Preview mode') || msg.includes('legacy_flow')) {
        toast.error('במצב Preview ההתחברות עשויה להיתקע. פתח את האפליקציה בטאב חדש ונסה שוב.');
        return;
      }

      toast.error('ההתחברות נכשלה. נסה שוב.');
    }
  };

  const signInWithGoogle = async () => {
    await signInWithProvider('google');
  };

  const signInWithApple = async () => {
    await signInWithProvider('apple');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
