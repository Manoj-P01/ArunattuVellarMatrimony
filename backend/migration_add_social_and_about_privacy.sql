-- Run this SQL in your Supabase SQL Editor to add the social media links and about me privacy columns:

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links        JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS about_me_privacy    VARCHAR(20) DEFAULT 'public';
