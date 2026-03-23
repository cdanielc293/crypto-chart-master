import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Handles OAuth callback from the self-hosted Supabase instance.
 * Tokens arrive in the URL hash; AuthContext's bootstrap effect picks them up.
 * This page simply redirects to /chart once the hash has been consumed.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // AuthContext's useEffect will detect the hash tokens on mount.
    // Give it a tick to process, then navigate to /chart.
    const timer = setTimeout(() => {
      navigate('/chart', { replace: true });
    }, 500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <p className="text-sm text-muted-foreground animate-pulse">מאמת... מתחבר...</p>
    </div>
  );
}
