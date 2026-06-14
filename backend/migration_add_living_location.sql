-- ═══════════════════════════════════════════════════════════════════════════
-- migration_add_living_location.sql
-- Run this in Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS living_district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS living_state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS living_country VARCHAR(100);
