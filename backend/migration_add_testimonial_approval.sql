-- Migration: Add column to support testimonial approval by admin
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS testimonial_approved BOOLEAN DEFAULT false;
