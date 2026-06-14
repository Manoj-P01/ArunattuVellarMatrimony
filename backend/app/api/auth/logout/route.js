import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Signs out from Supabase and clears the session cookie.
 *     responses:
 *       200:
 *         description: Successfully logged out
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.auth.signOut();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("logout error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
