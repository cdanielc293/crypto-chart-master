import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

const SELF_HOSTED_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL?.trim() || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const SELF_HOSTED_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpemlvbnhfbG9jYWwiLCJpYXQiOjE3NzQyODU1MTIsImV4cCI6MjA4OTY0NTUxMiwicm9sZSI6ImFub24ifQ.UuqmTgOaEWEpFxKiCIN8qCeviQOAbdzoQaHbs2uMM7Y';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingIn: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'apple') => void;
  enterAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

async function callAuthProxy(body: Record<string, string | undefined>) {
  const { action, email, password, access_token, refresh_token } = body;
  let endpoint = '';
  let method: 'GET' | 'POST' = 'POST';
  let payload: Record<string, string | undefined> | undefined;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    apikey: SELF_HOSTED_ANON_KEY,
  };

  switch (action) {
    case 'signup':
      endpoint = '/auth/v1/signup';
      payload = { email, password };
      break;
    case 'signin':
      endpoint = '/auth/v1/token?grant_type=password';
      payload = { email, password };
      break;
    case 'signout':
      endpoint = '/auth/v1/logout';
      payload = {};
      if (access_token) headers.Authorization = `Bearer ${access_token}`;
      break;
    case 'get_user':
      endpoint = '/auth/v1/user';
      method = 'GET';
      if (access_token) headers.Authorization = `Bearer ${access_token}`;
      break;
    case 'refresh':
      endpoint = '/auth/v1/token?grant_type=refresh_token';
      payload = { refresh_token };
      break;
    default:
      throw new Error('Unknown auth action');
  }

  const res = await fetch(`${SELF_HOSTED_SUPABASE_URL}${endpoint}`, {
    method,
    headers,
    ...(method === 'POST' ? { body: JSON.stringify(payload ?? {}) } : {}),
  });

  const raw = await res.text();
  let data: any = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { error: raw };
    }
  }

  if (!res.ok) {
    throw new Error(
      (data.error as string) ||
        (data.msg as string) ||
        (data.error_description as string) ||
        `Auth request failed (${res.status})`
    );
  }

  return data;
}

// Persist session to localStorage
const SESSION_KEY = 'vizion_self_hosted_session';

function saveSession(session: { access_token: string; refresh_token: string; user: User }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): { access_token: string; refresh_token: string; user: User } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('vizion_guest') === 'true');

  // Bootstrap: try to restore session or handle OAuth callback
  useEffect(() => {
    const restore = async () => {
      // Check for OAuth callback tokens in URL hash
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken) {
          try {
            const userData = await callAuthProxy({ action: 'get_user', access_token: accessToken });
            const sessionData = {
              access_token: accessToken,
              refresh_token: refreshToken || '',
              user: userData as User,
            };
            setUser(userData as User);
            setSession({ access_token: accessToken, refresh_token: refreshToken } as unknown as Session);
            saveSession(sessionData);
            setIsGuest(false);
            localStorage.removeItem('vizion_guest');
            // Clear the hash from the URL
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            toast.success('התחברת בהצלחה עם Google');
          } catch (err) {
            console.error('OAuth callback error', err);
            toast.error('ההתחברות עם Google נכשלה.');
          }
          setLoading(false);
          return;
        }
      }

      const saved = loadSession();
      if (saved) {
        try {
          const userData = await callAuthProxy({ action: 'get_user', access_token: saved.access_token });
          setUser(userData as User);
          setSession({ access_token: saved.access_token, refresh_token: saved.refresh_token } as unknown as Session);
        } catch {
          try {
            const refreshed = await callAuthProxy({ action: 'refresh', refresh_token: saved.refresh_token });
            setUser(refreshed.user as User);
            setSession({ access_token: refreshed.access_token, refresh_token: refreshed.refresh_token } as unknown as Session);
            saveSession(refreshed);
          } catch {
            clearSession();
          }
        }
      }
      setLoading(false);
    };
    void restore();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    if (signingIn) return;
    if (!navigator.onLine) { toast.error('אין חיבור אינטרנט כרגע.'); return; }
    setSigningIn(true);
    try {
      const data = await callAuthProxy({ action: 'signin', email, password });
      setUser(data.user as User);
      setSession({ access_token: data.access_token, refresh_token: data.refresh_token } as unknown as Session);
      saveSession(data);
      setIsGuest(false);
      localStorage.removeItem('vizion_guest');
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
      const data = await callAuthProxy({ action: 'signup', email, password });
      // If auto-confirm is on, we get access_token directly
      if (data.access_token) {
        setUser(data.user as User);
        setSession({ access_token: data.access_token, refresh_token: data.refresh_token } as unknown as Session);
        saveSession(data);
        setIsGuest(false);
        localStorage.removeItem('vizion_guest');
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

  const signInWithOAuth = (provider: 'google' | 'apple') => {
    const redirectTo = encodeURIComponent(window.location.origin + '/auth/callback');
    window.location.href = `${SELF_HOSTED_SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirectTo}`;
  };

  const enterAsGuest = () => {
    localStorage.setItem('vizion_guest', 'true');
    setIsGuest(true);
  };

  const signOut = async () => {
    const saved = loadSession();
    try {
      if (saved?.access_token) {
        await callAuthProxy({ action: 'signout', access_token: saved.access_token });
      }
    } catch {
      // Non-critical
    } finally {
      setUser(null);
      setSession(null);
      setIsGuest(false);
      clearSession();
      localStorage.removeItem('vizion_guest');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signingIn, isGuest, signInWithEmail, signUpWithEmail, signInWithOAuth, enterAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
