
-- Create chart-history storage bucket for backtest CSV data
INSERT INTO storage.buckets (id, name, public)
VALUES ('chart-history', 'chart-history', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read from chart-history bucket
CREATE POLICY "Authenticated users can read chart history"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chart-history');

-- Allow service role (edge functions) to insert/update
CREATE POLICY "Service role can manage chart history"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'chart-history');

CREATE POLICY "Service role can update chart history"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'chart-history');
