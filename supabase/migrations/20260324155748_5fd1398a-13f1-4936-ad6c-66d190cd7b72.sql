-- Table to track user activity (heartbeats) for online count
CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activity_last_seen ON public.user_activity (last_seen_at DESC);
CREATE UNIQUE INDEX idx_user_activity_user ON public.user_activity (user_id);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upsert own activity"
ON public.user_activity FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity"
ON public.user_activity FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can read own activity"
ON public.user_activity FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Table to log daily login counts
CREATE TABLE public.user_login_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_log_date ON public.user_login_log (logged_in_at DESC);

ALTER TABLE public.user_login_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own login log"
ON public.user_login_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own login log"
ON public.user_login_log FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admin function to get online users and login stats
CREATE OR REPLACE FUNCTION public.admin_get_activity_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  online_count int;
  today_logins int;
  week_logins int;
  month_logins int;
BEGIN
  SELECT count(DISTINCT user_id) INTO online_count
  FROM user_activity
  WHERE last_seen_at > now() - interval '5 minutes';

  SELECT count(DISTINCT user_id) INTO today_logins
  FROM user_login_log
  WHERE logged_in_at >= date_trunc('day', now());

  SELECT count(DISTINCT user_id) INTO week_logins
  FROM user_login_log
  WHERE logged_in_at >= date_trunc('week', now());

  SELECT count(DISTINCT user_id) INTO month_logins
  FROM user_login_log
  WHERE logged_in_at >= date_trunc('month', now());

  result := jsonb_build_object(
    'online_now', online_count,
    'today_logins', today_logins,
    'week_logins', week_logins,
    'month_logins', month_logins
  );

  RETURN result;
END;
$$;