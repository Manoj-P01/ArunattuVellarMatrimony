-- ════════════════════════════════════════════════════════════════════════════
-- migration_rls_fix.sql
-- Fixes "infinite recursion detected in policy for relation users" (42P17)
--
-- Root cause: The "Admins can read all users" policy on public.users does:
--   EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
-- When any query reads from public.users, Postgres evaluates this policy,
-- which itself tries to SELECT from public.users → infinite recursion.
--
-- Fix: a SECURITY DEFINER function bypasses RLS when checking admin status.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Create a SECURITY DEFINER helper — runs as table owner, bypasses RLS ──
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── 2. Fix users table policies ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can read all users"           ON public.users;
DROP POLICY IF EXISTS "Users can read their own data"       ON public.users;
DROP POLICY IF EXISTS "Users can update their own name/password" ON public.users;

-- Own row — no subquery needed
CREATE POLICY "Users can read their own data"
  ON public.users FOR SELECT
  USING (id = auth.uid());

-- Admin reads all — uses SECURITY DEFINER function (no recursion)
CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

-- Own row update
CREATE POLICY "Users can update their own name/password"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- ── 3. Fix profiles table policies ───────────────────────────────────────────
DROP POLICY IF EXISTS "Profiles are viewable by everyone"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"  ON public.profiles;

-- Public can see approved + active; owners see their own; admins see all
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (
    (approval_status = 'approved' AND (profile_status IS NULL OR profile_status = 'active'))
    OR user_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- ── 4. Fix photos table (uses profiles subquery — fine, no recursion there) ──
-- These were already correct but listed for completeness.
DROP POLICY IF EXISTS "Approved photos viewable by logged in users" ON public.photos;
DROP POLICY IF EXISTS "Users can upload their own photos"           ON public.photos;
DROP POLICY IF EXISTS "Users can delete their own photos"           ON public.photos;

CREATE POLICY "Approved photos viewable by logged in users"
  ON public.photos FOR SELECT
  USING (
    status = 'approved'
    OR EXISTS (SELECT 1 FROM profiles WHERE id = photos.profile_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Users can upload their own photos"
  ON public.photos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = photos.profile_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own photos"
  ON public.photos FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = photos.profile_id AND user_id = auth.uid())
    OR public.is_admin()
  );
