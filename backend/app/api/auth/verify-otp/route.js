import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyOtp, clearOtps } from "../../../../lib/otp/index.js";

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and create Supabase auth session
 *     description: |
 *       Verifies the OTP from our custom otp_tokens table (sent via Gmail).
 *       On success, signs the user into Supabase Auth using admin API (OTP-less sign-in),
 *       returning a session so subsequent requests are authenticated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, otp]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: The user's email address
 *               otp:
 *                 type: string
 *                 description: The 6-digit OTP received in email
 *     responses:
 *       200:
 *         description: OTP verified, session created
 *       400:
 *         description: Invalid or expired OTP
 */
export async function POST(request) {
  try {
    const { identifier, otp } = await request.json();

    if (!identifier || !otp) {
      return NextResponse.json(
        { success: false, error: "identifier and otp are required" },
        { status: 400 }
      );
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: "OTP must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // ── Step 1: Verify OTP from our custom table ──────────────────────────
    const result = await verifyOtp({
      identifier: identifier.trim().toLowerCase(),
      otp: otp.trim(),
    });

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.reason },
        { status: 400 }
      );
    }

    // ── Step 2: Sign user into Supabase Auth (create or get user) ─────────
    // We use the admin (service-role) client to create/sign-in the user
    // without requiring a password, since we verified identity via OTP.
    const adminSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if user already exists in Supabase Auth
    const { data: listData } = await adminSupabase.auth.admin.listUsers();
    const existingUser = listData?.users?.find(
      u => u.email?.toLowerCase() === identifier.trim().toLowerCase()
    );

    let authUserId;
    if (existingUser) {
      authUserId = existingUser.id;
    } else {
      // Create a new Supabase Auth user
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email:            identifier.trim().toLowerCase(),
        email_confirm:    true,         // mark as verified since OTP confirmed identity
        user_metadata: { registered_via: "otp" },
      });
      if (createError) throw new Error("Failed to create auth user: " + createError.message);
      authUserId = newUser.user.id;
    }

    // Generate a magic link token to create a real session (cookie-based)
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    // Use the anon client to generate OTP link and exchange for session
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type:  "magiclink",
      email: identifier.trim().toLowerCase(),
    });

    if (linkError) throw new Error("Session creation failed: " + linkError.message);

    // Extract the token from the magic link and exchange for session
    const url         = new URL(linkData.properties.action_link);
    const tokenHash   = url.searchParams.get("token_hash") ||
                        linkData.properties.hashed_token;
    const accessToken = linkData.properties.access_token;
    const refreshToken = linkData.properties.refresh_token;

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    }

    // ── Step 3: Fetch user's profile from DB ─────────────────────────────
    const { data: userData } = await adminSupabase
      .from("users")
      .select("id, role, language_pref")
      .eq("id", authUserId)
      .single();

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id, profile_id, type, name, approval_status, profile_status")
      .eq("user_id", authUserId)
      .single();

    // ── Step 4: Clean up used OTPs ────────────────────────────────────────
    await clearOtps(identifier.trim().toLowerCase());

    return NextResponse.json({
      success: true,
      token: accessToken || null,
      user: {
        id:            authUserId,
        email:         identifier.trim().toLowerCase(),
        role:          userData?.role || "member",
        language_pref: userData?.language_pref || "en",
        profile:       profile || null,
      },
    });
  } catch (error) {
    console.error("verify-otp error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
