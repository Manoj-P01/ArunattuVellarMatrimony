-- Run this SQL in your Supabase SQL Editor to add the social_links_privacy column:

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links_privacy VARCHAR(20) DEFAULT 'public';
