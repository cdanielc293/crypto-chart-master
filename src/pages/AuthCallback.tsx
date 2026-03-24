import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

/**
 * Handles OAuth callback. Supabase client picks up tokens from the URL
 * automatically via onAuthStateChange. We just wait and redirect.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/chart', { replace: true });
      }
    });

    // Fallback redirect after 3s
    const timer = setTimeout(() => {
      navigate('/chart', { replace: true });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050508] text-white">
      <p className="text-sm text-white/40 animate-pulse">Verifying... Signing in...</p>
    </div>
  );
}
