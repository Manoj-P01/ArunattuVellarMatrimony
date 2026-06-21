import { NextResponse } from "next/server";
import { cookies }      from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";

/**
 * POST /api/auth/reset-password
 * Sends a password-reset email via Supabase Auth.
 * Body: { email }
 */
export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Valid email is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    // redirectTo is where Supabase sends the user after clicking the link.
    // The frontend handles the #access_token hash on load.
    let frontendUrl = request.headers.get("origin") || request.headers.get("referer");
    if (frontendUrl) {
      try {
        const urlObj = new URL(frontendUrl);
        frontendUrl = urlObj.origin;
      } catch (err) {}
    }
    if (!frontendUrl) {
      frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:5173";
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${frontendUrl}?page=reset-password`,
    });

    // Always return success to avoid email enumeration
    if (error) {
      console.warn("resetPasswordForEmail warning:", error.message);
    }

    return NextResponse.json({
      success: true,
      message: "If this email is registered, a reset link has been sent.",
    });
  } catch (e) {
    console.error("POST /api/auth/reset-password error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
