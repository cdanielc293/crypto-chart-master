
-- Table for storing user exchange API keys securely
CREATE TABLE public.user_exchange_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exchange_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  passphrase TEXT,
  is_testnet BOOLEAN NOT NULL DEFAULT false,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exchange_id, label)
);

-- Enable RLS
ALTER TABLE public.user_exchange_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own keys
CREATE POLICY "Users can read own exchange keys"
  ON public.user_exchange_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exchange keys"
  ON public.user_exchange_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exchange keys"
  ON public.user_exchange_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exchange keys"
  ON public.user_exchange_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
