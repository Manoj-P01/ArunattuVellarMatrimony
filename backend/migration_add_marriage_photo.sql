-- Migration: Add column to support marriage photo in testimonials
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS marriage_photo TEXT;
