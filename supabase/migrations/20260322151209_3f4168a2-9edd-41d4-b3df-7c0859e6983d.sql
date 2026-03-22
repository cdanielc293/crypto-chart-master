
CREATE TABLE public.user_chart_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  drawings jsonb NOT NULL DEFAULT '[]'::jsonb,
  indicators jsonb NOT NULL DEFAULT '[]'::jsonb,
  indicator_configs jsonb NOT NULL DEFAULT '{}'::jsonb,
  hidden_indicators jsonb NOT NULL DEFAULT '[]'::jsonb,
  chart_type text NOT NULL DEFAULT 'candles',
  interval text NOT NULL DEFAULT '1d',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);

ALTER TABLE public.user_chart_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chart state"
  ON public.user_chart_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chart state"
  ON public.user_chart_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chart state"
  ON public.user_chart_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chart state"
  ON public.user_chart_state FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
