-- =============================================================================
-- MIGRATION: Add columns for full registration field coverage
-- Run in Supabase Dashboard → SQL Editor
-- Safe to re-run (ADD COLUMN IF NOT EXISTS throughout)
-- =============================================================================

-- 1. Father & Mother occupation
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS father_occupation  TEXT,
  ADD COLUMN IF NOT EXISTS mother_occupation  TEXT;

-- 2. Split sibling counts (elder / younger, brothers / sisters, with married sub-counts)
--    Replaces the old simplified brother_count / sister_count where needed.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS elder_brothers           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elder_brothers_married   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS younger_brothers         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS younger_brothers_married INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elder_sisters            INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elder_sisters_married    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS younger_sisters          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS younger_sisters_married  INTEGER DEFAULT 0;

-- 3. Religion & Community (free-text, derived from is_hindu / is_avs checkboxes)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS religion   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS community  VARCHAR(100);

-- =============================================================================
-- Done.  Re-deploy the backend (npm run build / restart Next.js) after running.
-- =============================================================================
