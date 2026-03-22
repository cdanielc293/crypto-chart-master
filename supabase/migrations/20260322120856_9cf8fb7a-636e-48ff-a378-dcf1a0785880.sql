
CREATE TABLE public.klines (
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,
  time BIGINT NOT NULL,
  open DOUBLE PRECISION NOT NULL,
  high DOUBLE PRECISION NOT NULL,
  low DOUBLE PRECISION NOT NULL,
  close DOUBLE PRECISION NOT NULL,
  volume DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (symbol, interval, time)
);

ALTER TABLE public.klines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to klines"
  ON public.klines FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert to klines"
  ON public.klines FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update to klines"
  ON public.klines FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_klines_symbol_interval_time ON public.klines (symbol, interval, time DESC);
