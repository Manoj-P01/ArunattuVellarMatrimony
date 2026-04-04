import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRefreshToken, generateAccessToken } from "../../../../lib/auth.js";

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     description: Parses the securely stored HttpOnly refresh token to issue a fast, new Access Token avoiding re-login.
 *     responses:
 *       200:
 *         description: New access token issued successfully
 *       401:
 *         description: Unauthorized or expired refresh session meaning users need to sign in again
 */
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ success: false, error: "No refresh token available. Session absent." }, { status: 401 });
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return NextResponse.json({ success: false, error: "Invalid or expired refresh token. Please re-authenticate." }, { status: 401 });
  }

  // Destructure properties avoiding standard JWT footprint claims preventing token bloat
  const newPayload = {
    id: payload.id,
    identifier: payload.identifier,
    role: payload.role
  };
  
  const accessToken = generateAccessToken(newPayload);
  return NextResponse.json({ success: true, accessToken });
}
