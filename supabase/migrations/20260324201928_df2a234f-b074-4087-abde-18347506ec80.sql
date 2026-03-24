
CREATE TABLE public.user_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled',
  is_active boolean NOT NULL DEFAULT false,
  grid_layout_id text NOT NULL DEFAULT '1',
  sync_options jsonb NOT NULL DEFAULT '{"symbol":false,"interval":false,"crosshair":true,"time":false,"dateRange":false}'::jsonb,
  panels jsonb NOT NULL DEFAULT '[]'::jsonb,
  chart_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own layouts" ON public.user_layouts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own layouts" ON public.user_layouts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own layouts" ON public.user_layouts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own layouts" ON public.user_layouts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_layouts_user_id ON public.user_layouts (user_id);
