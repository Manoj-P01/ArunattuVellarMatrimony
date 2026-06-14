-- Run this SQL in your Supabase SQL Editor to add the contact_privacy column:

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_privacy VARCHAR(20) DEFAULT 'public';
