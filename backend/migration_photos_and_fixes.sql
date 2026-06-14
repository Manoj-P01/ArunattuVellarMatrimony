-- ═══════════════════════════════════════════════════════════════════════════
-- migration_photos_and_fixes.sql
-- Run this in Supabase Dashboard → SQL Editor → Run
-- Self-contained: creates is_admin() if missing, then sets up photos table
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Create is_admin() SECURITY DEFINER helper (idempotent) ────────────
-- This fixes infinite-recursion RLS errors AND is needed by photos policies.
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

-- ── 2. Create photos table if missing ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL DEFAULT '',
  photo_type  TEXT NOT NULL DEFAULT 'gallery',  -- 'profile' | 'gallery' | 'horoscope'
  status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  is_primary  BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Add missing columns if table already exists with partial schema ────
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS photo_url   TEXT;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS photo_type  TEXT NOT NULL DEFAULT 'gallery';
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS is_primary  BOOLEAN DEFAULT false;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS sort_order  INTEGER DEFAULT 0;

-- ── 4. Rename 'url' → 'photo_url' if old schema was used ─────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'photos' AND column_name = 'url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'photos' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.photos RENAME COLUMN url TO photo_url;
    RAISE NOTICE 'Renamed photos.url -> photos.photo_url';
  END IF;
END
$$;

-- ── 5. Enable RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved photos viewable by logged in users" ON public.photos;
CREATE POLICY "Approved photos viewable by logged in users"
  ON public.photos FOR SELECT
  USING (
    status = 'approved'
    OR EXISTS (SELECT 1 FROM profiles WHERE id = photos.profile_id AND user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can upload their own photos" ON public.photos;
CREATE POLICY "Users can upload their own photos"
  ON public.photos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = photos.profile_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own photos" ON public.photos;
CREATE POLICY "Users can delete their own photos"
  ON public.photos FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = photos.profile_id AND user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can update photo status" ON public.photos;
CREATE POLICY "Admins can update photo status"
  ON public.photos FOR UPDATE
  USING (public.is_admin());

-- ── 6. Storage buckets (run only if not already created) ──────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('photos',     'photos',     true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('horoscopes', 'horoscopes', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- ── 7. Storage RLS policies ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Public photos readable" ON storage.objects;
CREATE POLICY "Public photos readable"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('photos', 'horoscopes'));

DROP POLICY IF EXISTS "Authenticated users upload photos" ON storage.objects;
CREATE POLICY "Authenticated users upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('photos','horoscopes') AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users delete own photos" ON storage.objects;
CREATE POLICY "Users delete own photos"
  ON storage.objects FOR DELETE
  USING (bucket_id IN ('photos','horoscopes') AND auth.uid()::text = (storage.foldername(name))[1]);
