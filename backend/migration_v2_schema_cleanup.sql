-- =============================================================================
-- MIGRATION V2: Schema Cleanup
-- Run in Supabase Dashboard → SQL Editor
-- Safe to re-run (uses IF EXISTS / IF NOT EXISTS throughout)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Drop views that depend on columns we are about to remove / rename.
--    They will be recreated at the end of this script.
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_approved_profiles CASCADE;
DROP VIEW IF EXISTS public.v_pending_profiles  CASCADE;
DROP VIEW IF EXISTS public.v_profiles          CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Rename  type → profile_type
--    (drop the old NULL stub column first so the rename doesn't conflict)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles DROP COLUMN IF EXISTS profile_type;
ALTER TABLE public.profiles RENAME COLUMN type TO profile_type;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Drop columns that are now redundant / removed from the app
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS religion;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS community;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS sub_caste;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS mother_tongue;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS date_of_birth;     -- duplicate of dob
ALTER TABLE public.profiles DROP COLUMN IF EXISTS about;             -- replaced by about_me
ALTER TABLE public.profiles DROP COLUMN IF EXISTS whatsapp_number;   -- replaced by whatsapp
ALTER TABLE public.profiles DROP COLUMN IF EXISTS contact_number;    -- replaced by contact
ALTER TABLE public.profiles DROP COLUMN IF EXISTS alternate_contact; -- replaced by alt_contact

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Ensure all individual family / astrology columns exist
--    (most already exist; ADD COLUMN IF NOT EXISTS is a no-op if present)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email              VARCHAR(255),
  ADD COLUMN IF NOT EXISTS birth_time        VARCHAR(10),
  ADD COLUMN IF NOT EXISTS birth_place       TEXT,
  ADD COLUMN IF NOT EXISTS native_place      TEXT,
  ADD COLUMN IF NOT EXISTS rasi              VARCHAR(50),
  ADD COLUMN IF NOT EXISTS natchathiram      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS patham            VARCHAR(10),
  ADD COLUMN IF NOT EXISTS dosham            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sevvai_position   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ragu_position     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kedhu_position    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS expectations      TEXT,
  ADD COLUMN IF NOT EXISTS father_name       TEXT,
  ADD COLUMN IF NOT EXISTS father_kothiram   TEXT,
  ADD COLUMN IF NOT EXISTS mother_name       TEXT,
  ADD COLUMN IF NOT EXISTS mother_kothiram   TEXT,
  ADD COLUMN IF NOT EXISTS brother_count     INTEGER,
  ADD COLUMN IF NOT EXISTS brother_married_status sibling_married,
  ADD COLUMN IF NOT EXISTS sister_count      INTEGER,
  ADD COLUMN IF NOT EXISTS sister_married_status  sibling_married,
  ADD COLUMN IF NOT EXISTS alt_contact       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(5) DEFAULT '+91',
  ADD COLUMN IF NOT EXISTS photo_url         TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Migrate existing family_details JSON → individual columns
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.profiles
SET
  birth_time             = CASE
                             WHEN NULLIF(TRIM(family_details::jsonb->>'birth_time'), '') IS NULL THEN NULL
                             ELSE (NULLIF(TRIM(family_details::jsonb->>'birth_time'), ''))::TIME
                           END,
  birth_place            = NULLIF(TRIM(family_details::jsonb->>'birth_place'), ''),
  native_place           = NULLIF(TRIM(family_details::jsonb->>'native_place'), ''),
  rasi                   = NULLIF(TRIM(family_details::jsonb->>'rasi'), ''),
  natchathiram           = NULLIF(TRIM(family_details::jsonb->>'natchathiram'), ''),
  patham                 = NULLIF(TRIM(family_details::jsonb->>'patham'), ''),
  dosham                 = NULLIF(TRIM(family_details::jsonb->>'dosham'), ''),
  sevvai_position        = NULLIF(TRIM(family_details::jsonb->>'sevvai_position'), ''),
  ragu_position          = NULLIF(TRIM(family_details::jsonb->>'ragu_position'), ''),
  kedhu_position         = NULLIF(TRIM(family_details::jsonb->>'kedhu_position'), ''),
  expectations           = NULLIF(TRIM(family_details::jsonb->>'expectations'), ''),
  father_name            = NULLIF(TRIM(family_details::jsonb->>'father_name'), ''),
  father_kothiram        = NULLIF(TRIM(family_details::jsonb->>'father_kothiram'), ''),
  mother_name            = NULLIF(TRIM(family_details::jsonb->>'mother_name'), ''),
  mother_kothiram        = NULLIF(TRIM(family_details::jsonb->>'mother_kothiram'), ''),
  brother_count          = NULLIF(TRIM(family_details::jsonb->>'brother_count'), '')::INTEGER,
  brother_married_status = CASE
                             WHEN NULLIF(TRIM(family_details::jsonb->>'brother_married_status'), '') IS NULL THEN NULL
                             WHEN NULLIF(TRIM(family_details::jsonb->>'brother_married_status'), '') IN (
                               SELECT enumlabel FROM pg_enum
                               JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
                               WHERE pg_type.typname = 'sibling_married'
                             ) THEN (NULLIF(TRIM(family_details::jsonb->>'brother_married_status'), ''))::sibling_married
                             ELSE NULL
                           END,
  sister_count           = NULLIF(TRIM(family_details::jsonb->>'sister_count'), '')::INTEGER,
  sister_married_status  = CASE
                             WHEN NULLIF(TRIM(family_details::jsonb->>'sister_married_status'), '') IS NULL THEN NULL
                             WHEN NULLIF(TRIM(family_details::jsonb->>'sister_married_status'), '') IN (
                               SELECT enumlabel FROM pg_enum
                               JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
                               WHERE pg_type.typname = 'sibling_married'
                             ) THEN (NULLIF(TRIM(family_details::jsonb->>'sister_married_status'), ''))::sibling_married
                             ELSE NULL
                           END
WHERE family_details IS NOT NULL
  AND family_details::text <> 'null'
  AND family_details::text <> '';

-- Drop family_details column once data is migrated
ALTER TABLE public.profiles DROP COLUMN IF EXISTS family_details;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Back-fill email from auth.users for existing profiles
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.profiles p
SET    email = u.email
FROM   auth.users u
WHERE  p.user_id = u.id
  AND  (p.email IS NULL OR p.email = '');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Auto-calculate age from dob  (trigger fires on INSERT and UPDATE of dob)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_auto_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dob IS NOT NULL THEN
    NEW.age := DATE_PART('year', AGE(CURRENT_DATE, NEW.dob::DATE))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_age ON public.profiles;
CREATE TRIGGER trg_auto_age
  BEFORE INSERT OR UPDATE OF dob
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_age();

-- Back-fill age for existing rows
UPDATE public.profiles
SET    age = DATE_PART('year', AGE(CURRENT_DATE, dob::DATE))::INTEGER
WHERE  dob IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Update updated_at trigger to use IST (stored as TIMESTAMPTZ = UTC offset)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_updated_at_ist()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = (NOW() AT TIME ZONE 'UTC');   -- store UTC; display IST in app
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at    ON public.profiles;
DROP TRIGGER IF EXISTS trg_updated_at    ON public.profiles;
CREATE TRIGGER trg_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_updated_at_ist();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Rebuild profile-ID assignment trigger to use new column name (profile_type)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_profile_id_on_approve()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM 'approved')
     AND (NEW.profile_id IS NULL OR NEW.profile_id = '')
  THEN
    IF NEW.profile_type = 'bride' THEN
      NEW.profile_id := 'AVS-BR-' || LPAD(nextval('avs_bride_seq')::TEXT, 3, '0');
    ELSIF NEW.profile_type = 'groom' THEN
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. RLS – rebuild SELECT policy to use profile_type
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Profiles viewable when approved or own" ON public.profiles;
CREATE POLICY "Profiles viewable when approved or own"
  ON public.profiles FOR SELECT
  USING (
    (profile_status = 'active' AND approval_status = 'approved')
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Recreate views (dropped at step 0) using the updated schema
-- ─────────────────────────────────────────────────────────────────────────────

-- v_approved_profiles  — approved & active members (used by browse / match pages)
CREATE OR REPLACE VIEW public.v_approved_profiles AS
SELECT
  id, profile_id, profile_type, name, dob, age,
  height, marital_status, education, occupation, salary,
  kothiram, native_place, country, state, district, city,
  birth_time, birth_place, rasi, natchathiram, patham, dosham,
  sevvai_position, ragu_position, kedhu_position, expectations,
  photo_url, photo_privacy,
  whatsapp, contact, email,
  father_name, father_kothiram, mother_name, mother_kothiram,
  brother_count, brother_married_status, sister_count, sister_married_status,
  about_me, profile_status, approval_status, created_at, updated_at
FROM public.profiles
WHERE approval_status = 'approved'
  AND profile_status  = 'active';

-- v_pending_profiles  — profiles awaiting admin review
CREATE OR REPLACE VIEW public.v_pending_profiles AS
SELECT
  id, profile_id, profile_type, name, dob, age,
  height, marital_status, education, occupation,
  kothiram, district, state,
  whatsapp, contact, email,
  about_me, approval_status, profile_status, created_at
FROM public.profiles
WHERE approval_status = 'pending';

-- =============================================================================
-- Done. Run migration_otp.sql separately if the otp_tokens table is missing.
-- =============================================================================
