-------------------------------------------------------------------------------
-- VizionX – Full database schema
-- Auto-generated from the production Supabase types.
-- This file runs on first `docker compose up` to bootstrap the database.
-------------------------------------------------------------------------------

-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- Klines (candle cache)
CREATE TABLE IF NOT EXISTS public.klines (
  symbol       TEXT             NOT NULL,
  interval     TEXT             NOT NULL,
  time         BIGINT           NOT NULL,
  open         DOUBLE PRECISION NOT NULL,
  high         DOUBLE PRECISION NOT NULL,
  low          DOUBLE PRECISION NOT NULL,
  close        DOUBLE PRECISION NOT NULL,
  volume       DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (symbol, interval, time)
);

CREATE INDEX IF NOT EXISTS idx_klines_symbol_interval
  ON public.klines (symbol, interval, time);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID        PRIMARY KEY,
  username          TEXT,
  full_name         TEXT,
  avatar_url        TEXT,
  bio               TEXT,
  website           TEXT,
  x_profile         TEXT,
  instagram_profile TEXT,
  facebook_profile  TEXT,
  youtube_channel   TEXT,
  signature         TEXT,
  plan              TEXT        NOT NULL DEFAULT 'free',
  referral_code     TEXT        UNIQUE,
  referral_balance  NUMERIC     NOT NULL DEFAULT 0,
  referrals_free    INTEGER     NOT NULL DEFAULT 0,
  referrals_paid    INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session devices (tracks device info per auth session)
CREATE TABLE IF NOT EXISTS public.session_devices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL,
  session_id      UUID        NOT NULL,
  real_ip         TEXT,
  real_user_agent TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);

-- User chart state (persisted drawings, indicators, etc.)
CREATE TABLE IF NOT EXISTS public.user_chart_state (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL,
  symbol            TEXT        NOT NULL,
  drawings          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  indicators        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  indicator_configs JSONB       NOT NULL DEFAULT '{}'::jsonb,
  hidden_indicators JSONB       NOT NULL DEFAULT '[]'::jsonb,
  chart_type        TEXT        NOT NULL DEFAULT 'candlestick',
  interval          TEXT        NOT NULL DEFAULT '1h',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);

-- User exchange API keys
CREATE TABLE IF NOT EXISTS public.user_exchange_keys (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  exchange_id TEXT        NOT NULL,
  label       TEXT        NOT NULL DEFAULT '',
  api_key     TEXT        NOT NULL,
  api_secret  TEXT        NOT NULL,
  passphrase  TEXT,
  permissions TEXT[]      NOT NULL DEFAULT '{}',
  is_testnet  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- 2. ROW LEVEL SECURITY
-- =============================================================================

-- Klines: public read/write (cache data)
ALTER TABLE public.klines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access" ON public.klines
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anonymous insert access" ON public.klines
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON public.klines
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Profiles: users can read all, update own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Session devices: users manage own records
ALTER TABLE public.session_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own session devices" ON public.session_devices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session devices" ON public.session_devices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session devices" ON public.session_devices
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User chart state: users manage own records
ALTER TABLE public.user_chart_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own chart state" ON public.user_chart_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chart state" ON public.user_chart_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chart state" ON public.user_chart_state
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User exchange keys: users manage own records
ALTER TABLE public.user_exchange_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own exchange keys" ON public.user_exchange_keys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exchange keys" ON public.user_exchange_keys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exchange keys" ON public.user_exchange_keys
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exchange keys" ON public.user_exchange_keys
  FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- =============================================================================
-- 3. FUNCTIONS (RPCs)
-- =============================================================================

-- Get all active sessions for a user (joins auth.sessions + session_devices)
CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id UUID)
RETURNS TABLE (
  session_id    UUID,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ,
  refreshed_at  TIMESTAMPTZ,
  ip            INET,
  user_agent    TEXT,
  real_ip       TEXT,
  real_user_agent TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id         AS session_id,
    s.created_at,
    s.updated_at,
    s.refreshed_at,
    s.ip,
    s.user_agent,
    sd.real_ip,
    sd.real_user_agent
  FROM auth.sessions s
  LEFT JOIN public.session_devices sd
    ON sd.user_id = s.user_id AND sd.session_id = s.id
  WHERE s.user_id = p_user_id
  ORDER BY s.created_at DESC;
$$;

-- Revoke (delete) a specific session for a user
CREATE OR REPLACE FUNCTION public.revoke_user_session(p_user_id UUID, p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM auth.sessions
  WHERE id = p_session_id AND user_id = p_user_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Also clean up device record
  DELETE FROM public.session_devices
  WHERE session_id = p_session_id AND user_id = p_user_id;

  RETURN deleted_count > 0;
END;
$$;


-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', ''),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 5. REALTIME
-- =============================================================================

-- Enable realtime for tables that need it
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chart_state;
