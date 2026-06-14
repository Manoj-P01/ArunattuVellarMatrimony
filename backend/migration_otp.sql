-- =============================================================================
-- MIGRATION: Create otp_tokens table for custom Gmail OTP system
-- Run this in your Supabase SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.otp_tokens (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   VARCHAR(255) NOT NULL,          -- email or phone (lowercase)
  otp_hash     VARCHAR(64)  NOT NULL,          -- SHA-256 hash of the OTP
  expires_at   TIMESTAMPTZ  NOT NULL,          -- OTP expiry time (10 minutes)
  used         BOOLEAN      DEFAULT false,     -- true once verified
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Index for fast look-up by identifier
CREATE INDEX IF NOT EXISTS idx_otp_identifier ON public.otp_tokens(identifier);

-- Auto-clean expired OTPs older than 1 hour (optional, keeps table lean)
-- You can run this manually or set up a Supabase cron:
-- DELETE FROM public.otp_tokens WHERE expires_at < NOW() - INTERVAL '1 hour';

-- Row Level Security: only service-role key can read/write otp_tokens
ALTER TABLE public.otp_tokens ENABLE ROW LEVEL SECURITY;

-- No user-facing RLS policies — all OTP ops use SUPABASE_SERVICE_ROLE_KEY
-- This table is never exposed to the frontend directly.

-- =============================================================================
-- Run this SQL in Supabase → SQL Editor → New Query → Run
-- =============================================================================
