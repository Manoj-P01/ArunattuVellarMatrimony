-- =============================================================================
-- MIGRATION: Add missing columns to the profiles table
-- Run in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS throughout)
--
-- The profiles table already has these columns (created by you):
--   id, name, type, dob, height, marital_status, education, occupation,
--   salary, religion, community, kothiram, mother_tongue, country, state,
--   district, city, about, family, photo_privacy, profile_status,
--   approval_status, created_at, whatsapp, contact
--
-- This migration adds only the NEW columns your app needs.
-- =============================================================================

-- 1. Add columns that may be missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age              INTEGER,
  ADD COLUMN IF NOT EXISTS user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id       VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS father_mobile    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS father_whatsapp  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mother_mobile    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mother_whatsapp  VARCHAR(20);

-- Make sure photo_privacy has a default (safe even if column already exists)
ALTER TABLE public.profiles
  ALTER COLUMN photo_privacy SET DEFAULT 'public';

ALTER TABLE public.profiles
  ALTER COLUMN profile_status SET DEFAULT 'active';

ALTER TABLE public.profiles
  ALTER COLUMN approval_status SET DEFAULT 'pending';

-- =============================================================================
-- 2. profile_id auto-generation
--    Assigned ONLY when admin approves — not at registration time.
--    Uses the DB column 'type' (bride/groom) — the actual column name.
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS avs_bride_seq START 1;
CREATE SEQUENCE IF NOT EXISTS avs_groom_seq START 1;

-- Drop old insert-time trigger if it exists
DROP TRIGGER IF EXISTS set_profile_id ON public.profiles;

-- Function: assigns profile_id when approval_status → 'approved'
CREATE OR REPLACE FUNCTION public.generate_profile_id_on_approve()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM 'approved')
     AND (NEW.profile_id IS NULL OR NEW.profile_id = '')
  THEN
    IF NEW.type = 'bride' THEN
      NEW.profile_id := 'AVS-BR-' || LPAD(nextval('avs_bride_seq')::TEXT, 3, '0');
    ELSIF NEW.type = 'groom' THEN
      NEW.profile_id := 'AVS-GR-' || LPAD(nextval('avs_groom_seq')::TEXT, 3, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assign_profile_id_on_approve ON public.profiles;
CREATE TRIGGER assign_profile_id_on_approve
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_profile_id_on_approve();

-- =============================================================================
-- 3. updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 4. RLS policies (safe to re-run — DROP IF EXISTS before each)
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles viewable when approved or own" ON public.profiles;
CREATE POLICY "Profiles viewable when approved or own"
  ON public.profiles FOR SELECT
  USING (
    (profile_status = 'active' AND approval_status = 'approved')
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- Done! Also run migration_otp.sql if you haven't already.
-- =============================================================================
