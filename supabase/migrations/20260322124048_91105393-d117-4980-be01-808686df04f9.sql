
CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id UUID)
RETURNS TABLE (
  session_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  refreshed_at TIMESTAMPTZ,
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

CREATE OR REPLACE FUNCTION public.revoke_user_session(p_user_id UUID, p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM auth.sessions WHERE id = p_session_id AND user_id = p_user_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN FALSE;
  END IF;

  DELETE FROM auth.refresh_tokens WHERE session_id = p_session_id;
  DELETE FROM auth.sessions WHERE id = p_session_id;
  RETURN TRUE;
END;
$$;
