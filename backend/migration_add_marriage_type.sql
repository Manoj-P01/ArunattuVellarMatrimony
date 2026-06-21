-- Migration: Add marriage_type column to the profiles table
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS marriage_type VARCHAR(50);
