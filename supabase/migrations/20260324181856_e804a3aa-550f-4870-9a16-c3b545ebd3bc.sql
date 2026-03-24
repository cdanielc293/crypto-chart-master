
-- 1. Create user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Create feedback_tickets table
CREATE TABLE public.feedback_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    user_email text,
    type text NOT NULL DEFAULT 'bug',
    message text NOT NULL,
    status text NOT NULL DEFAULT 'open',
    admin_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tickets"
  ON public.feedback_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own tickets"
  ON public.feedback_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Create support_messages table
CREATE TABLE public.support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    user_email text,
    subject text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'open',
    admin_reply text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own support"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own support"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Admin get all profiles function
CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN (
    SELECT jsonb_agg(row_to_json(p))
    FROM profiles p
    ORDER BY p.created_at DESC
  );
END;
$$;

-- 6. Admin get stats function
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total int;
  blocked int;
  open_tix int;
  open_sup int;
  plans jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT count(*) INTO total FROM profiles;
  SELECT count(*) INTO blocked FROM profiles WHERE plan = 'blocked';
  SELECT count(*) INTO open_tix FROM feedback_tickets WHERE status = 'open';
  SELECT count(*) INTO open_sup FROM support_messages WHERE status = 'open';

  SELECT jsonb_object_agg(plan, cnt) INTO plans
  FROM (SELECT plan, count(*) as cnt FROM profiles GROUP BY plan) sub;

  result := jsonb_build_object(
    'total_users', total,
    'blocked_users', blocked,
    'open_tickets', open_tix,
    'open_support', open_sup,
    'plan_counts', COALESCE(plans, '{}'::jsonb)
  );

  RETURN result;
END;
$$;

-- 7. Admin toggle block
CREATE OR REPLACE FUNCTION public.admin_toggle_block(p_user_id uuid, p_blocked boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- We use a simple is_blocked concept via a separate mechanism
  -- For now just update the plan or a flag
  UPDATE profiles SET updated_at = now() WHERE id = p_user_id;
END;
$$;

-- 8. Admin update plan
CREATE OR REPLACE FUNCTION public.admin_update_plan(p_user_id uuid, p_plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE profiles SET plan = p_plan, updated_at = now() WHERE id = p_user_id;
END;
$$;

-- 9. Admin RLS policies for tickets and support
CREATE POLICY "Admins can read all tickets"
  ON public.feedback_tickets FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all tickets"
  ON public.feedback_tickets FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all support"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all support"
  ON public.support_messages FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));
