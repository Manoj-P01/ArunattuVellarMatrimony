import { NextResponse } from "next/server";
import { cookies }      from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdmin }  from "../_auth.js";

const PROFILE_SELECT = `
  id, profile_id, profile_type, name, dob, age,
  height, marital_status, education, occupation, salary,
  religion, community, kothiram, native_place, country, state, district, city,
  living_country, living_state, living_district,
  birth_time, birth_place, rasi, natchathiram, patham, dosham,
  sevvai_position, ragu_position, kedhu_position, expectations,
  photo_url, photo_privacy, email, phone_country_code,
  whatsapp, contact, alt_contact, contact_privacy,
  father_name, father_kothiram, father_occupation, father_mobile, father_whatsapp,
  mother_name, mother_kothiram, mother_occupation, mother_mobile, mother_whatsapp,
  elder_brothers, elder_brothers_married, younger_brothers, younger_brothers_married,
  elder_sisters, elder_sisters_married, younger_sisters, younger_sisters_married,
  brother_count, brother_married_status, sister_count, sister_married_status,
  about_me, social_links, about_me_privacy, social_links_privacy,
  profile_status, approval_status, approved_by, approved_at,
  created_at, updated_at
`.trim();

/**
 * GET /api/admin/profiles
 * Returns ALL profiles (all statuses) for admin dashboard.
 * Unlike /api/profiles which only returns approved+active.
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    const admin = await requireAdmin(supabase, request);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1,   parseInt(searchParams.get("page")  || "1"));
    const limit  = Math.min(200, parseInt(searchParams.get("limit") || "100"));
    const from   = (page - 1) * limit;

    const { data, error, count } = await svc
      .from("profiles")
      .select(PROFILE_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;

    // Normalise each profile to match the frontend shape
    const profiles = (data || []).map(p => ({
      ...p,
      avatar: p.name?.slice(0, 2).toUpperCase() || "??",
      photo:  p.photo_url || null,
    }));

    return NextResponse.json({
      profiles,
      pagination: {
        page, limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/profiles error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
