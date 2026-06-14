/**
 * OTP Module — Main Entry Point
 *
 * Usage:
 *   import { sendOtp, verifyOtp } from "../../lib/otp/index.js";
 *
 * Flow:
 *   1. sendOtp({ identifier: "user@email.com", name: "Manoj" })
 *      → generates OTP, saves hashed OTP to otp_tokens table,
 *        sends branded email from GMAIL_USER
 *
 *   2. verifyOtp({ identifier: "user@email.com", otp: "483921" })
 *      → returns { valid: true } or { valid: false, reason: "..." }
 */

export { generateOtp, hashOtp, OTP_EXPIRY_MS } from "./generate.js";
export { sendOtpEmail }                          from "./mailer.js";
export { storeOtp, verifyStoredOtp, clearOtps } from "./store.js";

import { generateOtp }     from "./generate.js";
import { sendOtpEmail }    from "./mailer.js";
import { storeOtp, verifyStoredOtp } from "./store.js";

/**
 * High-level: Generate + store + send OTP in one call.
 *
 * @param {Object} params
 * @param {string} params.identifier - Email address
 * @param {string} [params.name]     - User's name for email personalisation
 * @returns {Promise<void>}
 */
export async function sendOtp({ identifier, name = "" }) {
  const otp = generateOtp();
  await storeOtp(identifier, otp);
  await sendOtpEmail({ to: identifier, otp, name });
}

/**
 * High-level: Verify OTP entered by the user.
 *
 * @param {Object} params
 * @param {string} params.identifier
 * @param {string} params.otp
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
export async function verifyOtp({ identifier, otp }) {
  return verifyStoredOtp(identifier, otp);
}
