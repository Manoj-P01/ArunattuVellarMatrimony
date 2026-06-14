/**
 * OTP Generator
 * Generates a cryptographically secure 6-digit numeric OTP.
 */

import crypto from "crypto";

/**
 * Generate a 6-digit OTP (padded to ensure it's always 6 digits).
 * @returns {string} 6-digit OTP string, e.g. "083421"
 */
export function generateOtp() {
  // Secure random number between 100000 and 999999
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0);
  const otp = String(100000 + (num % 900000));
  return otp;
}

/**
 * Hash an OTP using SHA-256 for secure storage.
 * @param {string} otp
 * @returns {string} hex hash
 */
export function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex");
}

/**
 * OTP expiry time in milliseconds (10 minutes)
 */
export const OTP_EXPIRY_MS = 10 * 60 * 1000;
