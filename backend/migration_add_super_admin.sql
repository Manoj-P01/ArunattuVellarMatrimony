-- ═══════════════════════════════════════════════════════════════════════════
-- migration_add_super_admin.sql
-- Run this in Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Redefine is_admin() SECURITY DEFINER helper to support both admin and super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  );
$$;

-- 2. Add role column to admin_details table if missing
ALTER TABLE public.admin_details ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';

-- 3. Recreate public.profiles select/update RLS policies to use is_admin() instead of direct role checks
DROP POLICY IF EXISTS "Profiles viewable when approved or own" ON public.profiles;
CREATE POLICY "Profiles viewable when approved or own"
  ON public.profiles FOR SELECT
  USING (
    (approval_status = 'approved' AND profile_status = 'active')
    OR user_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());
