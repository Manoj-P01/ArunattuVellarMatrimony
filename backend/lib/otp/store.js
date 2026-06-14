/**
 * OTP Store
 * Saves and verifies OTPs in Supabase (otp_tokens table).
 * OTPs are stored as SHA-256 hashes — never in plaintext.
 *
 * Required Supabase table (run migration_otp.sql to create it):
 *   otp_tokens (id, identifier, otp_hash, expires_at, used, created_at)
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { hashOtp, OTP_EXPIRY_MS } from "./generate.js";

/**
 * Get a service-role Supabase client that can bypass RLS.
 * We use the service-role key here so the OTP operations work
 * even for unauthenticated users (they're logging in!).
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Add SUPABASE_SERVICE_ROLE_KEY to backend/.env.local"
    );
  }

  return createSupabaseClient(url, key);
}

/**
 * Save a new OTP for the given identifier (email or phone).
 * Deletes any previous unused OTPs for the same identifier first.
 *
 * @param {string} identifier - email or phone number
 * @param {string} otp        - plaintext OTP
 */
export async function storeOtp(identifier, otp) {
  const supabase   = getServiceClient();
  const otp_hash   = hashOtp(otp);
  const expires_at = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();

  // Remove all previous OTPs for this identifier (keep DB clean)
  await supabase
    .from("otp_tokens")
    .delete()
    .eq("identifier", identifier.toLowerCase());

  // Insert new hashed OTP
  const { error } = await supabase.from("otp_tokens").insert({
    identifier:  identifier.toLowerCase(),
    otp_hash,
    expires_at,
    used:        false,
  });

  if (error) throw new Error("Failed to store OTP: " + error.message);
}

/**
 * Verify an OTP for the given identifier.
 * Returns { valid: true } on success, or { valid: false, reason: string } on failure.
 * Marks the OTP as used on successful verification.
 *
 * @param {string} identifier
 * @param {string} otp
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
export async function verifyStoredOtp(identifier, otp) {
  const supabase  = getServiceClient();
  const otp_hash  = hashOtp(otp);

  const { data, error } = await supabase
    .from("otp_tokens")
    .select("id, expires_at, used")
    .eq("identifier", identifier.toLowerCase())
    .eq("otp_hash",   otp_hash)
    .single();

  if (error || !data) {
    return { valid: false, reason: "Invalid OTP. Please check and try again." };
  }

  if (data.used) {
    return { valid: false, reason: "This OTP has already been used. Please request a new one." };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, reason: "OTP expired. Please request a new one." };
  }

  // Mark as used
  await supabase
    .from("otp_tokens")
    .update({ used: true })
    .eq("id", data.id);

  return { valid: true };
}

/**
 * Delete all OTPs for a given identifier (cleanup after registration complete).
 */
export async function clearOtps(identifier) {
  const supabase = getServiceClient();
  await supabase
    .from("otp_tokens")
    .delete()
    .eq("identifier", identifier.toLowerCase());
}
