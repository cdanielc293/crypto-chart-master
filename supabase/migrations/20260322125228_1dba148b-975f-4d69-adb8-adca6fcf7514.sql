
CREATE TABLE public.session_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  real_ip TEXT,
  real_user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_id)
);

ALTER TABLE public.session_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own session devices"
ON public.session_devices FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session devices"
ON public.session_devices FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session devices"
ON public.session_devices FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Update get_user_sessions to join with session_devices for real data
DROP FUNCTION IF EXISTS public.get_user_sessions(UUID);

CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id UUID)
RETURNS TABLE (
  session_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  refreshed_at TIMESTAMP,
  ip INET,
  user_agent TEXT,
  real_ip TEXT,
  real_user_agent TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.created_at, s.updated_at, s.refreshed_at, s.ip, s.user_agent,
         sd.real_ip, sd.real_user_agent
  FROM auth.sessions s
  LEFT JOIN public.session_devices sd ON sd.session_id = s.id AND sd.user_id = p_user_id
  WHERE s.user_id = p_user_id
  ORDER BY s.updated_at DESC;
END;
$$;
