-- ════════════════════════════════════════════════════════════════════════════
-- migration_admin_invites.sql
-- One-time admin invite tokens — admin generates a link, recipient registers
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours',
  used_at     TIMESTAMPTZ,
  used_by_email TEXT,         -- email of the person who used the invite
  note        TEXT,           -- optional note from the admin (e.g. "for Manoj")
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: only admins can create/read invites; anyone can validate a token (for registration)
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage invites" ON public.admin_invites;
CREATE POLICY "Admins can manage invites"
  ON public.admin_invites FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can read unused invites for validation" ON public.admin_invites;
CREATE POLICY "Anyone can read unused invites for validation"
  ON public.admin_invites FOR SELECT
  USING (used_at IS NULL AND expires_at > NOW());
