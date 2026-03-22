
DROP FUNCTION IF EXISTS public.get_user_sessions(UUID);

CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id UUID)
RETURNS TABLE (
  session_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  refreshed_at TIMESTAMP,
  ip INET,
  user_agent TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.created_at, s.updated_at, s.refreshed_at, s.ip, s.user_agent
  FROM auth.sessions s
  WHERE s.user_id = p_user_id
  ORDER BY s.updated_at DESC;
END;
$$;
