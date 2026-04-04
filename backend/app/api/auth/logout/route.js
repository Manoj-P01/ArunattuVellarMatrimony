import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Actively kills the ongoing session by forcing the browser to clear and expire the HttpOnly secure cookie containing the Refresh Token.
 *     responses:
 *       200:
 *         description: Successfully logged out
 */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0, // Enforces explicit and immediate client-side deletion
    path: "/",
  });

  return NextResponse.json({ success: true, message: "Logged out completely. Refresh cookie expunged." });
}
