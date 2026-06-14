-- Run this SQL in your Supabase SQL Editor to add the parent contact columns to your existing profiles table:

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS father_mobile    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS father_whatsapp  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mother_mobile    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mother_whatsapp  VARCHAR(20);
