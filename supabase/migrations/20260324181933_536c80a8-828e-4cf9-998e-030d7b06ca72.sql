
-- Backfill profiles for any auth.users that don't have one
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Update admin_get_all_profiles to include email from auth.users
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
    SELECT COALESCE(jsonb_agg(row_order), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'username', p.username,
        'plan', p.plan,
        'avatar_url', p.avatar_url,
        'created_at', p.created_at,
        'email', u.email,
        'is_blocked', false
      ) as row_order
      FROM profiles p
      JOIN auth.users u ON u.id = p.id
      ORDER BY p.created_at DESC
    ) sub
  );
END;
$$;

-- Also update admin_get_stats to handle is_blocked properly
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
  blocked := 0;
  SELECT count(*) INTO open_tix FROM feedback_tickets WHERE status = 'open';
  SELECT count(*) INTO open_sup FROM support_messages WHERE status = 'open';

  SELECT COALESCE(jsonb_object_agg(plan, cnt), '{}'::jsonb) INTO plans
  FROM (SELECT plan, count(*) as cnt FROM profiles GROUP BY plan) sub;

  result := jsonb_build_object(
    'total_users', total,
    'blocked_users', blocked,
    'open_tickets', open_tix,
    'open_support', open_sup,
    'plan_counts', plans
  );

  RETURN result;
END;
$$;
