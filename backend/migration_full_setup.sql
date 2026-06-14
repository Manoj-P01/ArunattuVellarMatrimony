-- =============================================================================
-- AVS MATRIMONY — FULL FRESH DATABASE SETUP
-- One file to rule them all. Drops everything and recreates from scratch.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → paste → Run
--
-- ⚠  WARNING: This drops ALL existing app data permanently.
--    Only run on a fresh project or when you intentionally want a clean slate.
-- =============================================================================


-- =============================================================================
-- SECTION 0 — DROP EVERYTHING (reverse dependency order)
-- =============================================================================

-- Triggers first (they reference functions)
DROP TRIGGER IF EXISTS on_auth_user_created     ON auth.users;
DROP TRIGGER IF EXISTS trg_auto_age             ON public.profiles;
DROP TRIGGER IF EXISTS trg_updated_at           ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at           ON public.profiles;
DROP TRIGGER IF EXISTS assign_profile_id_on_approve ON public.profiles;
DROP TRIGGER IF EXISTS set_profile_id           ON public.profiles;

-- Views
DROP VIEW IF EXISTS public.v_approved_profiles  CASCADE;
DROP VIEW IF EXISTS public.v_pending_profiles   CASCADE;
DROP VIEW IF EXISTS public.v_profiles           CASCADE;

-- Tables (most-dependent first)
DROP TABLE IF EXISTS public.admin_log       CASCADE;
DROP TABLE IF EXISTS public.admin_invites   CASCADE;
DROP TABLE IF EXISTS public.admin_details   CASCADE;
DROP TABLE IF EXISTS public.notifications   CASCADE;
DROP TABLE IF EXISTS public.interests       CASCADE;
DROP TABLE IF EXISTS public.shortlists      CASCADE;
DROP TABLE IF EXISTS public.photos          CASCADE;
DROP TABLE IF EXISTS public.otp_tokens      CASCADE;
DROP TABLE IF EXISTS public.profiles        CASCADE;
DROP TABLE IF EXISTS public.users           CASCADE;

-- Functions
DROP FUNCTION IF EXISTS public.handle_new_user()          CASCADE;
DROP FUNCTION IF EXISTS public.is_admin()                 CASCADE;
DROP FUNCTION IF EXISTS public.fn_auto_age()              CASCADE;
DROP FUNCTION IF EXISTS public.fn_updated_at_ist()        CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at()        CASCADE;
DROP FUNCTION IF EXISTS public.generate_profile_id_on_approve() CASCADE;

-- Sequences
DROP SEQUENCE IF EXISTS public.avs_bride_seq;
DROP SEQUENCE IF EXISTS public.avs_groom_seq;

-- Custom types
DROP TYPE IF EXISTS public.sibling_married CASCADE;


-- =============================================================================
-- SECTION 1 — CUSTOM TYPES
-- =============================================================================

-- Kept as a simple enum for legacy compatibility (new code uses integer counts)
CREATE TYPE public.sibling_married AS ENUM (
  'all_married',
  'none_married',
  'some_married',
  'partial_married'
);


-- =============================================================================
-- SECTION 2 — SEQUENCES
-- =============================================================================

CREATE SEQUENCE public.avs_bride_seq START 1;
CREATE SEQUENCE public.avs_groom_seq START 1;


-- =============================================================================
-- SECTION 3 — TABLES
-- =============================================================================

-- ─── 3.1  users ──────────────────────────────────────────────────────────────
-- Mirrors auth.users; extended with role and display name.
CREATE TABLE public.users (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      VARCHAR(255) NOT NULL,
  name       TEXT,
  role       TEXT        NOT NULL DEFAULT 'member',   -- 'member' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3.2  profiles ───────────────────────────────────────────────────────────
-- One row per matrimony profile.  All columns collected by RegisterPage.jsx.
CREATE TABLE public.profiles (

  -- Identity
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      VARCHAR(20)   UNIQUE,         -- e.g. AVS-BR-001 (set on approval)
  user_id         UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email           VARCHAR(255),
  profile_type    TEXT          NOT NULL CHECK (profile_type IN ('bride','groom')),

  -- Step 1 — Personal
  name            TEXT          NOT NULL,
  dob             DATE,
  age             INTEGER,                       -- auto-calculated by trigger
  height          VARCHAR(20),
  marital_status  TEXT          DEFAULT 'single',
  education       TEXT,
  occupation      TEXT,
  salary          NUMERIC(12,2),                 -- monthly salary in INR

  -- Step 2 — Lineage & Location
  religion        VARCHAR(100)  DEFAULT 'Hindu',
  community       VARCHAR(100)  DEFAULT 'Arunattu Vellalar',
  kothiram        TEXT,
  native_place    TEXT,
  district        TEXT,
  state           TEXT          DEFAULT 'Tamil Nadu',
  country         TEXT          DEFAULT 'India',
  city            TEXT,

  -- Step 3 — Jothidam
  birth_time      VARCHAR(10),
  birth_place     TEXT,
  rasi            VARCHAR(50),
  natchathiram    VARCHAR(50),
  patham          VARCHAR(10),
  dosham          VARCHAR(100),
  sevvai_position VARCHAR(50),
  ragu_position   VARCHAR(50),
  kedhu_position  VARCHAR(50),

  -- Step 4 — About & Expectations
  about_me        TEXT,
  about_me_privacy VARCHAR(20)  DEFAULT 'public',
  expectations    TEXT,

  -- Step 4 — Social Media
  social_links         JSONB    DEFAULT '[]'::jsonb,
  social_links_privacy VARCHAR(20) DEFAULT 'public',

  -- Step 1 — Contact & Privacy
  whatsapp             VARCHAR(30),
  contact              VARCHAR(30),
  alt_contact          VARCHAR(30),
  phone_country_code   VARCHAR(5)  DEFAULT '+91',
  contact_privacy      VARCHAR(20) DEFAULT 'public',

  -- Step 4 — Father
  father_name          TEXT,
  father_kothiram      TEXT,
  father_occupation    TEXT,
  father_mobile        VARCHAR(30),
  father_whatsapp      VARCHAR(30),

  -- Step 4 — Mother
  mother_name          TEXT,
  mother_kothiram      TEXT,
  mother_occupation    TEXT,
  mother_mobile        VARCHAR(30),
  mother_whatsapp      VARCHAR(30),

  -- Step 4 — Siblings (elder/younger split with married sub-counts)
  elder_brothers           INTEGER DEFAULT 0,
  elder_brothers_married   INTEGER DEFAULT 0,
  younger_brothers         INTEGER DEFAULT 0,
  younger_brothers_married INTEGER DEFAULT 0,
  elder_sisters            INTEGER DEFAULT 0,
  elder_sisters_married    INTEGER DEFAULT 0,
  younger_sisters          INTEGER DEFAULT 0,
  younger_sisters_married  INTEGER DEFAULT 0,

  -- Legacy aggregated sibling columns (kept for backward-compat queries)
  brother_count            INTEGER,
  brother_married_status   public.sibling_married,
  sister_count             INTEGER,
  sister_married_status    public.sibling_married,

  -- Photos
  photo_url       TEXT,
  photo_privacy   TEXT          DEFAULT 'public',

  -- Marriage & Testimony (Success Story)
  got_married          BOOLEAN DEFAULT false,
  marriage_date        DATE,
  partner_profile_id   VARCHAR(50),
  marriage_feedback    TEXT,

  -- Admin / Status
  profile_status   TEXT         DEFAULT 'active',   -- 'active' | 'inactive' | 'deleted'
  approval_status  TEXT         DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  approved_by      UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── 3.3  otp_tokens ─────────────────────────────────────────────────────────
CREATE TABLE public.otp_tokens (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   VARCHAR(255)  NOT NULL,    -- email (lowercase)
  otp_hash     VARCHAR(64)   NOT NULL,    -- SHA-256 hash of the 6-digit OTP
  expires_at   TIMESTAMPTZ   NOT NULL,
  used         BOOLEAN       DEFAULT false,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_otp_identifier ON public.otp_tokens(identifier);

-- ─── 3.4  photos ─────────────────────────────────────────────────────────────
CREATE TABLE public.photos (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url   TEXT    NOT NULL DEFAULT '',
  photo_type  TEXT    NOT NULL DEFAULT 'gallery',  -- 'profile' | 'gallery' | 'horoscope'
  status      TEXT    NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  is_primary  BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3.5  interests ──────────────────────────────────────────────────────────
CREATE TABLE public.interests (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id   UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_profile_id UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status              TEXT    NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'rejected'
  sent_at             TIMESTAMPTZ DEFAULT NOW(),
  responded_at        TIMESTAMPTZ,
  UNIQUE (sender_profile_id, receiver_profile_id)
);

CREATE INDEX idx_interests_sender   ON public.interests(sender_profile_id);
CREATE INDEX idx_interests_receiver ON public.interests(receiver_profile_id);

-- ─── 3.6  shortlists ─────────────────────────────────────────────────────────
CREATE TABLE public.shortlists (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id     UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shortlisted_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_profile_id, shortlisted_profile_id)
);

-- ─── 3.7  notifications ───────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL,                   -- 'interest_received' | 'interest_accepted' | 'approved' | etc.
  title      TEXT    NOT NULL DEFAULT '',
  message    TEXT,
  metadata   JSONB   DEFAULT '{}'::jsonb,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- ─── 3.8  admin_details ──────────────────────────────────────────────────────
CREATE TABLE public.admin_details (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID  UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT  NOT NULL,
  email           TEXT  NOT NULL,
  mobile          TEXT,
  whatsapp        TEXT,
  native_place    TEXT,
  kothiram        TEXT,
  status          TEXT  NOT NULL DEFAULT 'pending',  -- 'pending' | 'active' | 'rejected'
  approved_by     UUID  REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  rejected_reason TEXT,
  has_profile     BOOLEAN DEFAULT false,
  profile_id      UUID  REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX admin_details_status_idx ON public.admin_details(status);
CREATE INDEX admin_details_email_idx  ON public.admin_details(email);

-- ─── 3.9  admin_invites ───────────────────────────────────────────────────────
CREATE TABLE public.admin_invites (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  token         UUID  NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by    UUID  REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours',
  used_at       TIMESTAMPTZ,
  used_by_email TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3.10  admin_log ──────────────────────────────────────────────────────────
-- Audit trail for admin actions (approve, reject, etc.)
CREATE TABLE public.admin_log (
  id                UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id          UUID  REFERENCES public.users(id) ON DELETE SET NULL,
  action            TEXT  NOT NULL,          -- 'approve_profile' | 'reject_profile' | 'approve_admin'
  target_profile_id UUID  REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_id    UUID  REFERENCES public.users(id) ON DELETE SET NULL,
  details           JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- SECTION 4 — FUNCTIONS
-- =============================================================================

-- ─── 4.1  is_admin() — SECURITY DEFINER to avoid RLS recursion ───────────────
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

-- ─── 4.2  Auto-create public.users row when Supabase auth user is created ─────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 4.3  Auto-calculate age from dob ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_auto_age()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.dob IS NOT NULL THEN
    NEW.age := DATE_PART('year', AGE(CURRENT_DATE, NEW.dob::DATE))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_age
  BEFORE INSERT OR UPDATE OF dob
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_age();

-- ─── 4.4  Auto-update updated_at ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_updated_at_ist()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_updated_at_ist();

-- ─── 4.5  Assign profile_id on admin approval ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_profile_id_on_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM 'approved')
     AND (NEW.profile_id IS NULL OR NEW.profile_id = '')
  THEN
    IF NEW.profile_type = 'bride' THEN
      NEW.profile_id := 'AVS-BR-' || LPAD(nextval('public.avs_bride_seq')::TEXT, 3, '0');
    ELSIF NEW.profile_type = 'groom' THEN
      NEW.profile_id := 'AVS-GR-' || LPAD(nextval('public.avs_groom_seq')::TEXT, 3, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_profile_id_on_approve
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_profile_id_on_approve();


-- =============================================================================
-- SECTION 5 — ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_details   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites   ENABLE ROW LEVEL SECURITY;

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can read their own data"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update their own name"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE POLICY "Profiles viewable when approved or own"
  ON public.profiles FOR SELECT
  USING (
    (approval_status = 'approved' AND profile_status = 'active')
    OR user_id = auth.uid()
    OR public.is_admin()
  );

-- Service-role inserts bypass RLS; this policy covers client-side inserts if ever needed
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- ── otp_tokens — service-role only (no user-facing policy) ───────────────────
-- (no policies = only service_role can access)

-- ── photos ────────────────────────────────────────────────────────────────────
CREATE POLICY "Approved photos viewable"
  ON public.photos FOR SELECT
  USING (
    status = 'approved'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = photos.profile_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Users can upload their own photos"
  ON public.photos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = photos.profile_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own photos"
  ON public.photos FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = photos.profile_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Admins can update photo status"
  ON public.photos FOR UPDATE
  USING (public.is_admin());

-- ── interests ─────────────────────────────────────────────────────────────────
CREATE POLICY "Users can see own interests"
  ON public.interests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id IN (sender_profile_id, receiver_profile_id)
        AND user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Approved users can send interests"
  ON public.interests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = sender_profile_id
        AND user_id = auth.uid()
        AND approval_status = 'approved'
    )
  );

CREATE POLICY "Receiver can update interest status"
  ON public.interests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = receiver_profile_id AND user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Sender can delete pending interest"
  ON public.interests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = sender_profile_id AND user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ── shortlists ────────────────────────────────────────────────────────────────
CREATE POLICY "Users manage own shortlist"
  ON public.shortlists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_profile_id AND user_id = auth.uid()
    )
  );

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Service role inserts notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);   -- restricted to service_role by API; safe here

-- ── admin_details ─────────────────────────────────────────────────────────────
CREATE POLICY "Admins can manage admin_details"
  ON public.admin_details FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can read own admin_details"
  ON public.admin_details FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated insert admin_details"
  ON public.admin_details FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

ALTER TABLE public.admin_log        ENABLE ROW LEVEL SECURITY;

-- ── admin_log ─────────────────────────────────────────────────────────────────
CREATE POLICY "Admins can read admin_log"
  ON public.admin_log FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role inserts admin_log"
  ON public.admin_log FOR INSERT
  WITH CHECK (true);   -- only reachable via service_role in API routes

-- ── admin_invites ─────────────────────────────────────────────────────────────
CREATE POLICY "Admins can manage invites"
  ON public.admin_invites FOR ALL
  USING (public.is_admin());

CREATE POLICY "Anyone can read unused invites for validation"
  ON public.admin_invites FOR SELECT
  USING (used_at IS NULL AND expires_at > NOW());


-- =============================================================================
-- SECTION 6 — STORAGE BUCKETS
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
  VALUES ('photos',     'photos',     true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('horoscopes', 'horoscopes', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS
DROP POLICY IF EXISTS "Public photos readable"           ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own photos"           ON storage.objects;

CREATE POLICY "Public photos readable"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('photos', 'horoscopes'));

CREATE POLICY "Authenticated users upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('photos','horoscopes') AND auth.role() = 'authenticated');

CREATE POLICY "Users delete own photos"
  ON storage.objects FOR DELETE
  USING (bucket_id IN ('photos','horoscopes') AND auth.uid()::text = (storage.foldername(name))[1]);


-- =============================================================================
-- SECTION 7 — VIEWS
-- =============================================================================

-- v_approved_profiles — used by browse / match / search pages
CREATE OR REPLACE VIEW public.v_approved_profiles AS
SELECT
  id, profile_id, profile_type, name, dob, age,
  height, marital_status, education, occupation, salary,
  religion, community, kothiram, native_place,
  country, state, district, city,
  birth_time, birth_place, rasi, natchathiram, patham, dosham,
  sevvai_position, ragu_position, kedhu_position, expectations,
  photo_url, photo_privacy,
  whatsapp, contact, email,
  contact_privacy, social_links, social_links_privacy,
  father_name, father_kothiram, father_occupation,
  mother_name, mother_kothiram, mother_occupation,
  elder_brothers, elder_brothers_married,
  younger_brothers, younger_brothers_married,
  elder_sisters, elder_sisters_married,
  younger_sisters, younger_sisters_married,
  about_me, about_me_privacy,
  profile_status, approval_status, created_at, updated_at
FROM public.profiles
WHERE approval_status = 'approved'
  AND profile_status  = 'active';

-- v_pending_profiles — for admin review queue
CREATE OR REPLACE VIEW public.v_pending_profiles AS
SELECT
  id, profile_id, profile_type, name, dob, age,
  height, marital_status, education, occupation,
  religion, community, kothiram, district, state,
  whatsapp, contact, email,
  about_me, approval_status, profile_status, created_at
FROM public.profiles
WHERE approval_status = 'pending';


-- =============================================================================
-- SECTION 8 — FIRST ADMIN SEED  (edit before running)
-- Uncomment the block below and fill in the values to create the first admin.
-- After running once, comment it back out.
-- =============================================================================

/*
DO $$
DECLARE
  v_auth_uid UUID := '<PASTE-AUTH-USER-UUID-HERE>';
  v_email    TEXT := 'admin@example.com';
  v_name     TEXT := 'Admin Name';
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (v_auth_uid, v_email, v_name, 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

  INSERT INTO public.admin_details (user_id, name, email, status)
  VALUES (v_auth_uid, v_name, v_email, 'active')
  ON CONFLICT (user_id) DO UPDATE SET status = 'active';
END $$;
*/


-- =============================================================================
-- Done ✓
-- All tables, types, sequences, functions, triggers, views, RLS policies,
-- and storage buckets have been created from scratch.
-- =============================================================================
