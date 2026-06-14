import { NextResponse }  from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/update-password
 * Updates password after the user clicks the Supabase reset-email link.
 *
 * Flow:
 *  1. User clicks email link → lands on frontend with #access_token=xxx&type=recovery
 *  2. Frontend extracts access_token from the URL hash and sends it here
 *  3. Backend verifies the token, gets the user, and updates the password via service role
 *
 * Body: { password, access_token }
 */
export async function POST(request) {
  try {
    const { password, access_token } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 });
    }
    if (!access_token) {
      return NextResponse.json({ success: false, error: "Reset token missing. Please use the link from your email." }, { status: 400 });
    }

    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify the access_token to get the user's ID
    const { data: { user }, error: userErr } = await svc.auth.getUser(access_token);
    if (userErr || !user) {
      return NextResponse.json({
        success: false,
        error: "Invalid or expired reset link. Please request a new one.",
      }, { status: 400 });
    }

    // Update the password via admin API (service role bypasses session requirement)
    const { error: updateErr } = await svc.auth.admin.updateUserById(user.id, { password });
    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (e) {
    console.error("POST /api/auth/update-password error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
