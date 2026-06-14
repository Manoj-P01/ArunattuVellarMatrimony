/**
 * OTP Mailer
 * Sends OTP emails from the configured Gmail account using Nodemailer.
 *
 * Required environment variables:
 *   GMAIL_USER      - your Gmail address     e.g. avsmatrimony26@gmail.com
 *   GMAIL_APP_PASS  - your Gmail App Password (16-digit, no spaces)
 */

import nodemailer from "nodemailer";

// ─── Create transporter (lazy-initialised so env vars are read at runtime) ───
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASS;

  if (!user || !pass) {
    throw new Error(
      "Missing GMAIL_USER or GMAIL_APP_PASS in environment variables. " +
      "Add them to backend/.env.local"
    );
  }

  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return _transporter;
}

/**
 * Send an OTP email.
 *
 * @param {Object} params
 * @param {string} params.to       - Recipient email address
 * @param {string} params.otp      - The 6-digit OTP to send
 * @param {string} [params.name]   - Recipient's name (optional, for personalisation)
 * @returns {Promise<void>}
 */
export async function sendOtpEmail({ to, otp, name = "" }) {
  const transporter = getTransporter();
  const senderName  = process.env.SENDER_NAME || "AVS Matrimony";
  const senderEmail = process.env.GMAIL_USER;
  const appName     = process.env.NEXT_PUBLIC_APP_NAME || "AVS Matrimony";
  const greeting    = name ? `Dear ${name},` : "Hello,";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OTP Verification – ${appName}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#8B1A1A,#C0392B);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                🕉 ${appName}
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">
                Arunattu Vellalar Community Matrimony
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 16px;color:#333;font-size:15px;">${greeting}</p>
              <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
                You requested an OTP to verify your email address for <strong>${appName}</strong>.
                Use the code below to complete your verification.
              </p>

              <!-- OTP Box -->
              <div style="text-align:center;margin:0 0 28px;">
                <div style="display:inline-block;background:#FFF5F0;border:2px dashed #C0392B;
                            border-radius:10px;padding:18px 40px;">
                  <p style="margin:0 0 4px;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;">
                    Your OTP Code
                  </p>
                  <p style="margin:0;font-size:40px;font-weight:700;color:#8B1A1A;
                            letter-spacing:10px;font-family:monospace;">
                    ${otp}
                  </p>
                </div>
              </div>

              <!-- Expiry notice -->
              <div style="background:#FFF9F0;border-left:4px solid #E67E22;border-radius:4px;
                          padding:12px 16px;margin:0 0 24px;">
                <p style="margin:0;color:#856404;font-size:13px;">
                  ⏱ This OTP is valid for <strong>10 minutes</strong> only.
                  Do not share it with anyone.
                </p>
              </div>

              <p style="margin:0 0 8px;color:#777;font-size:13px;">
                If you did not request this OTP, please ignore this email.
                Your account is safe.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:18px 32px;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;color:#999;font-size:11px;">
                © ${new Date().getFullYear()} ${appName} · All rights reserved<br/>
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
${greeting}

Your OTP for ${appName} is: ${otp}

This code is valid for 10 minutes. Do not share it with anyone.

If you did not request this OTP, please ignore this email.

– ${appName} Team
  `.trim();

  await transporter.sendMail({
    from:    `"${senderName}" <${senderEmail}>`,
    to,
    subject: `${otp} is your ${appName} OTP`,
    text,
    html,
  });
}
