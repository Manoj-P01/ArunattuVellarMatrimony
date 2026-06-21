/**
 * AVS Matrimony — Nodemailer utility
 *
 * Uses the Gmail App Password already configured in .env.local
 * (GMAIL_USER + GMAIL_APP_PASS).
 *
 * All send functions are non-throwing — they catch internally
 * and return { ok: true } or { ok: false, error } so that
 * email failures never break the API response.
 */

import nodemailer from "nodemailer";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "AVS Matrimony";
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  || "http://localhost:5173";

// ── Singleton transporter ─────────────────────────────────────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASS,
    },
  });
  return _transporter;
}

// ── Shared HTML wrapper ───────────────────────────────────────────────────────
function htmlWrap(bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#B22222,#8B0000);padding:28px 32px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${APP_NAME}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">Arunattu Vellalar Community</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eeeeee;">
            <p style="margin:0;font-size:12px;color:#999999;">
              © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.<br/>
              This is an automated message — please do not reply directly.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Send profile-approved email ───────────────────────────────────────────────
/**
 * @param {object} opts
 * @param {string} opts.toEmail      - Recipient email
 * @param {string} opts.userName     - Full name of the profile owner
 * @param {string} opts.profileId    - Assigned profile ID (e.g. AVS-BR-001)
 * @param {string} opts.profileType  - "bride" | "groom"
 * @param {string} opts.adminName    - Name of the admin who approved
 */
export async function sendApprovalEmail({ toEmail, userName, profileId, profileType, adminName, adminMobile, appUrl }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) {
    console.warn("[mailer] GMAIL_USER or GMAIL_APP_PASS not set — skipping approval email");
    return { ok: false, error: "SMTP not configured" };
  }

  const typeLabel  = profileType === "bride" ? "Bride" : "Groom";
  const urlToUse   = appUrl || APP_URL;
  const loginUrl   = `${urlToUse}/login`;
  const approvedBy = adminName || "AVS Matrimony Admin";

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">🎉 Profile Approved!</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;">Dear <strong>${userName}</strong>,</p>

    <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.7;">
      We are delighted to inform you that your <strong>${typeLabel}</strong> profile on
      <strong>${APP_NAME}</strong> has been <span style="color:#1B7A3D;font-weight:700;">approved</span>
      by <strong>${approvedBy}</strong>.
    </p>

    <!-- Profile ID highlight box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:#FFF8F0;border:1.5px solid #F5CBA7;border-radius:8px;padding:16px 20px;text-align:center;">
          <div style="font-size:12px;color:#E65100;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px;">Your Profile ID</div>
          <div style="font-size:26px;font-weight:800;color:#B22222;letter-spacing:1px;">${profileId}</div>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.7;">
      You can now log in and start exploring compatible matches from the Arunattu Vellalar community.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td style="background:#B22222;border-radius:8px;padding:12px 32px;text-align:center;">
          <a href="${loginUrl}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">
            Login &amp; Explore Matches →
          </a>
        </td>
      </tr>
    </table>

    <div style="background:#F0FFF4;border-left:4px solid #38A169;border-radius:4px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#276749;line-height:1.6;">
        <strong>Quick Reminders:</strong><br/>
        • Keep your profile information up to date.<br/>
        • Use your Profile ID <strong>${profileId}</strong> when contacting support.<br/>
        • Reach out to admin for any assistance.
      </p>
    </div>

    <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;">
      Best wishes,<br/>
      <strong style="color:#333333;">${approvedBy}</strong><br/>
      ${adminMobile ? `<span style="color:#666666;font-size:12px;">Mobile: ${adminMobile}</span><br/>` : ""}
      <span style="color:#B22222;">${APP_NAME}</span>
    </p>
  `;

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from:    `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to:      toEmail,
      subject: `✅ Your ${APP_NAME} Profile is Approved! ID: ${profileId}`,
      html:    htmlWrap(body),
    });
    console.log(`[mailer] Approval email sent to ${toEmail} — messageId: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("[mailer] Failed to send approval email:", err.message);
    return { ok: false, error: err.message };
  }
}
