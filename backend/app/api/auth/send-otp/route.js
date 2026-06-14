import { NextResponse } from "next/server";
import { sendOtp } from "../../../../lib/otp/index.js";

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to an email address
 *     description: |
 *       Generates a 6-digit OTP, stores a SHA-256 hash in otp_tokens table,
 *       and sends a branded email from the configured Gmail account (GMAIL_USER).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, identifier]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email]
 *               identifier:
 *                 type: string
 *                 description: The recipient's email address
 *               name:
 *                 type: string
 *                 description: Optional — recipient's name for personalised greeting
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Email sending failed
 */
export async function POST(request) {
  try {
    const { type, identifier, name } = await request.json();

    if (!identifier?.trim()) {
      return NextResponse.json(
        { success: false, error: "identifier (email) is required" },
        { status: 400 }
      );
    }

    if (type && type !== "email") {
      return NextResponse.json(
        { success: false, error: "Only email OTP is supported. Use type: 'email'" },
        { status: 400 }
      );
    }

    // Basic email format check
    if (!identifier.includes("@") || !identifier.includes(".")) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Generate OTP → hash → store in otp_tokens → send Gmail
    await sendOtp({ identifier: identifier.trim().toLowerCase(), name: name || "" });

    return NextResponse.json({
      success: true,
      message: `OTP sent to ${identifier}. Valid for 10 minutes.`,
    });
  } catch (error) {
    console.error("send-otp error:", error);

    // Surface config errors clearly during development
    if (error.message?.includes("GMAIL_USER") || error.message?.includes("GMAIL_APP_PASS")) {
      return NextResponse.json(
        { success: false, error: "Email service not configured. Check GMAIL_USER and GMAIL_APP_PASS in .env.local" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}
