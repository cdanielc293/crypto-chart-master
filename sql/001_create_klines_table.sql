-- Klines cache table for Binance candle data
-- Run this on your self-hosted Supabase instance

CREATE TABLE IF NOT EXISTS public.klines (
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,
  time BIGINT NOT NULL,
  open DOUBLE PRECISION NOT NULL,
  high DOUBLE PRECISION NOT NULL,
  low DOUBLE PRECISION NOT NULL,
  close DOUBLE PRECISION NOT NULL,
  volume DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (symbol, interval, time)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_klines_symbol_interval 
  ON public.klines (symbol, interval, time);

-- Enable RLS
ALTER TABLE public.klines ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads (public data)
CREATE POLICY "Allow anonymous read access" ON public.klines
  FOR SELECT TO anon USING (true);

-- Allow anonymous inserts (cache writes from frontend)
CREATE POLICY "Allow anonymous insert access" ON public.klines
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous updates (upsert support)
CREATE POLICY "Allow anonymous update access" ON public.klines
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
