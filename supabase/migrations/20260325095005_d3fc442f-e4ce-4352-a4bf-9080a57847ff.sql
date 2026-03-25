CREATE TABLE public.user_widget_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  favorites jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_widget_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own widget layouts"
  ON public.user_widget_layouts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own widget layouts"
  ON public.user_widget_layouts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own widget layouts"
  ON public.user_widget_layouts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own widget layouts"
  ON public.user_widget_layouts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);