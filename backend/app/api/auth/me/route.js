/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user + their profile.
 * Used on app load to restore session from Supabase cookie.
 */

import { NextResponse } from "next/server";
import { cookies }      from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    // Use service-role to read user + profile (bypasses RLS for own data)
    const adminSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: dbUser } = await adminSupabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User record not found" }, { status: 404 });
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select(`
        id, profile_id, profile_type, name, dob, age,
        height, marital_status, education, occupation, salary,
        kothiram, native_place, country, state, district, city,
        living_country, living_state, living_district,
        about_me, photo_url, photo_privacy,
        whatsapp, contact, alt_contact, email, phone_country_code,
        birth_time, birth_place,
        rasi, natchathiram, patham, dosham,
        sevvai_position, ragu_position, kedhu_position,
        expectations,
        father_name, father_kothiram, mother_name, mother_kothiram,
        brother_count, brother_married_status,
        sister_count, sister_married_status,
        profile_status, approval_status, approved_by, approved_at,
        created_at, updated_at
      `)
      .eq("user_id", user.id)
      .single();

    const dualRole = dbUser.role === "admin" && !!profile;

    return NextResponse.json({
      success: true,
      dualRole,
      user: {
        id:    dbUser.id,
        email: dbUser.email,
        name:  dbUser.name,
        role:  dbUser.role,
        profile: profile
          ? {
              id:              profile.id,
              profile_id:      profile.profile_id,
              profile_type:    profile.profile_type,
              name:            profile.name,
              approval_status: profile.approval_status,
            }
          : null,
      },
      profile: profile || null,
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}