-- Migration: Add columns to support marriage testimonials
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS got_married BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS marriage_date DATE,
ADD COLUMN IF NOT EXISTS partner_profile_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS marriage_feedback TEXT;
