import { NextResponse } from "next/server";
import { cookies }      from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";
import { requireAdmin }  from "../_auth.js";
import { createInviteToken, verifyInviteToken } from "../_invite_utils.js";

/**
 * POST /api/admin/invite
 * Admin generates a signed invite token (valid 48 h, no DB required).
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const admin = await requireAdmin(supabase, request);
    // Only super admin can generate invites
    if (!admin || admin.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { role } = await request.json().catch(() => ({}));
    const targetRole = role === "super_admin" ? "super_admin" : "admin";

    const token = createInviteToken(targetRole);
    let origin = request.headers.get("origin") || request.headers.get("referer");
    if (origin) {
      try {
        const urlObj = new URL(origin);
        origin = urlObj.origin;
      } catch (err) {}
    }
    if (!origin) {
      origin = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:5173";
    }
    const invite_url = `${origin}/admin?token=${token}`;
    const expires_at = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    return NextResponse.json({ success: true, token, invite_url, expires_at, role: targetRole });
  } catch (e) {
    console.error("POST /api/admin/invite error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/invite?token=xxx
 * Validate an invite token (public — no auth required).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const result = verifyInviteToken(token);
    if (!result.valid) return NextResponse.json({ valid: false, error: result.error });
    const expires_at = new Date(result.exp).toISOString();
    return NextResponse.json({ valid: true, expires_at, role: result.role || "admin" });
  } catch (e) {
    return NextResponse.json({ valid: false, error: e.message }, { status: 500 });
  }
}
