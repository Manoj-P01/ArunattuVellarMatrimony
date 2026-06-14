-- Migration: Add approved_by and approved_at columns to public.profiles table
--
-- How to apply:
--   Supabase Dashboard → SQL Editor → Paste → Run
--

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
