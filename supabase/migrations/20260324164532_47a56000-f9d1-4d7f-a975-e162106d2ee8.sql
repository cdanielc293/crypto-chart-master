-- Active tab tracking for single-session enforcement
CREATE TABLE public.user_active_tab (
  user_id uuid PRIMARY KEY,
  tab_id text NOT NULL,
  ip_address text,
  user_agent text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_active_tab ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own active tab" ON public.user_active_tab
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own active tab" ON public.user_active_tab
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own active tab" ON public.user_active_tab
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Security alerts for admin dashboard and user notifications
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own security alerts" ON public.security_alerts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert alerts" ON public.security_alerts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);