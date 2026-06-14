-- ════════════════════════════════════════════════════════════════════════════
-- migration_admin_details.sql
-- Stores admin-specific details separate from user/profile tables.
-- New admins start as 'pending' and need approval from an existing admin.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_details (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  mobile       TEXT,
  whatsapp     TEXT,
  native_place TEXT,
  kothiram     TEXT,
  status       TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'rejected'
  approved_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at  TIMESTAMPTZ,
  rejected_reason TEXT,
  has_profile  BOOLEAN DEFAULT false,  -- true if this admin also has a bride/groom profile
  profile_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS admin_details_status_idx ON public.admin_details(status);
CREATE INDEX IF NOT EXISTS admin_details_email_idx  ON public.admin_details(email);

-- RLS
ALTER TABLE public.admin_details ENABLE ROW LEVEL SECURITY;

-- Admins can read all admin_details
DROP POLICY IF EXISTS "Admins can manage admin_details" ON public.admin_details;
CREATE POLICY "Admins can manage admin_details"
  ON public.admin_details FOR ALL
  USING (public.is_admin());

-- Users can read their own admin_details (to check pending status)
DROP POLICY IF EXISTS "Users can read own admin_details" ON public.admin_details;
CREATE POLICY "Users can read own admin_details"
  ON public.admin_details FOR SELECT
  USING (user_id = auth.uid());

-- Anyone with a valid session can insert (during registration)
DROP POLICY IF EXISTS "Authenticated insert admin_details" ON public.admin_details;
CREATE POLICY "Authenticated insert admin_details"
  ON public.admin_details FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
