-- DMify: One-shot fix for auth→users pipeline
-- Run in Supabase SQL Editor. Returns diagnostic output at the end.

BEGIN;

-- =============================================
-- STEP 1: Clean up existing RLS policies on users
-- =============================================
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "service_role_all" ON public.users;
DROP POLICY IF EXISTS "users_own_data" ON public.users;
DROP POLICY IF EXISTS "service_role_insert" ON public.users;

-- =============================================
-- STEP 2: Create proper RLS policies
-- =============================================
-- service_role: full access (bypasses RLS natively, but explicit policy as safety)
CREATE POLICY "service_role_full_access" ON public.users
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- anon: no access
CREATE POLICY "anon_no_access" ON public.users
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

-- authenticated: own row only (all operations)
CREATE POLICY "authenticated_own_row" ON public.users
  FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =============================================
-- STEP 3: Recreate trigger function
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, auth_provider, auth_provider_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN NEW.raw_user_meta_data->>'provider' = 'google' THEN 'google'
      WHEN NEW.raw_user_meta_data->>'provider' = 'instagram' THEN 'instagram'
      ELSE 'google'
    END,
    NEW.id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- =============================================
-- STEP 4: Recreate trigger
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STEP 5: Backfill existing auth users
-- =============================================
INSERT INTO public.users (id, email, name, auth_provider, auth_provider_id)
SELECT
  au.id,
  COALESCE(au.email, ''),
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  CASE
    WHEN au.raw_user_meta_data->>'provider' = 'google' THEN 'google'
    WHEN au.raw_user_meta_data->>'provider' = 'instagram' THEN 'instagram'
    ELSE 'google'
  END,
  au.id
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =============================================
-- VERIFY: Output results
-- =============================================
SELECT 'VERIFICATION' AS step;

SELECT 'auth_users' AS source, count(*) AS cnt FROM auth.users;

SELECT 'public_users' AS source, count(*) AS cnt FROM public.users;

SELECT id, email, name, auth_provider FROM public.users;

SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

SELECT proname, prosecdef AS is_security_definer
FROM pg_proc WHERE proname = 'handle_new_user';

SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
