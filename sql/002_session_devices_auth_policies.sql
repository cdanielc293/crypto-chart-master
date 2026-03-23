-- Run this on your self-hosted Supabase to allow authenticated users
-- to manage their own session_devices records from the client.

-- Allow authenticated users to insert their own session devices
CREATE POLICY "Users can insert own session devices"
  ON public.session_devices
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own session devices
CREATE POLICY "Users can update own session devices"
  ON public.session_devices
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
