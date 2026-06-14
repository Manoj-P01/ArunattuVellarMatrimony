/**
 * POST /api/auth/login
 *
 * Password-based login using email (or mobile number looked up via profiles).
 * On success sets a Supabase session cookie and returns user + profile data.
 */

import { NextResponse } from "next/server";
import { cookies }      from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const body = await request.json();
    const { login_type, identifier, password } = body;

    if (!identifier?.trim()) {
      return NextResponse.json(
        { success: false, error: "Email or Profile ID is required" },
        { status: 400 }
      );
    }
    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    const adminSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let email = identifier.trim().toLowerCase();

    // ── If logging in with Profile ID, look up the email ─────────────────
    if (login_type === "profileId") {
      const cleanProfileId = identifier.trim().toUpperCase();
      const { data: profileRow } = await adminSupabase
        .from("profiles")
        .select("id, user_id, users!profiles_user_id_fkey!inner(email)")
        .eq("profile_id", cleanProfileId)
        .limit(1)
        .maybeSingle();

      if (!profileRow?.users?.email) {
        return NextResponse.json(
          { success: false, error: "No account found with this Profile ID." },
          { status: 404 }
        );
      }
      email = profileRow.users.email;
    }

    // ── Sign in with Supabase (sets session cookie) ───────────────────────
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr || !authData?.user) {
      const msg = authErr?.message || "";
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials")) {
        return NextResponse.json(
          { success: false, error: "Incorrect email or password. Please try again." },
          { status: 401 }
        );
      }
      if (msg.toLowerCase().includes("email not confirmed")) {
        return NextResponse.json(
          { success: false, error: "Email not verified. Please contact support." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: msg || "Login failed. Please try again." },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // ── Fetch user record ─────────────────────────────────────────────────
    const { data: dbUser } = await adminSupabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", userId)
      .single();

    // ── Fetch profile ─────────────────────────────────────────────────────
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select(`
        id, profile_id, profile_type, name, dob, age,
        height, marital_status, education, occupation, salary,
        religion, community, kothiram, native_place,
        country, state, district, city,
        living_country, living_state, living_district,
        about_me, about_me_privacy, social_links, social_links_privacy,
        photo_url, photo_privacy,
        whatsapp, contact, alt_contact, email, phone_country_code,
        contact_privacy,
        birth_time, birth_place,
        rasi, natchathiram, patham, dosham,
        sevvai_position, ragu_position, kedhu_position,
        expectations,
        father_name, father_kothiram, father_occupation, father_mobile, father_whatsapp,
        mother_name, mother_kothiram, mother_occupation, mother_mobile, mother_whatsapp,
        elder_brothers, elder_brothers_married, younger_brothers, younger_brothers_married,
        elder_sisters, elder_sisters_married, younger_sisters, younger_sisters_married,
        brother_count, brother_married_status, sister_count, sister_married_status,
        profile_status, approval_status, approved_by, approved_at,
        created_at, updated_at
      `)
      .eq("user_id", userId)
      .single();

    const role = dbUser?.role || "member";
    // dualRole = admin who also has a bride/groom profile → frontend shows role picker
    const dualRole = role === "admin" && !!profile;

    return NextResponse.json({
      success: true,
      message: "Login successful",
      dualRole,   // true → frontend should ask: "Login as Admin" or "Login as {profile_type}"
      user: {
        id:    userId,
        email: dbUser?.email || email,
        name:  dbUser?.name  || authData.user.user_metadata?.name || "",
        role,
        profile: profile ? {
          id:              profile.id,
          profile_id:      profile.profile_id,
          profile_type:    profile.profile_type,
          name:            profile.name,
          approval_status: profile.approval_status,
        } : null,
      },
      profile: profile || null,
    });

  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
