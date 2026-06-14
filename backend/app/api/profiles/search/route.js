import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";

const PROFILE_SELECT = `
  id, profile_id, profile_type, name, dob, age,
  height, marital_status, education, occupation, salary,
  kothiram, native_place, district, state, country,
  photo_url, photo_privacy, about_me,
  profile_status, approval_status, created_at
`.trim();

/**
 * GET /api/profiles/search
 * Search and filter approved profiles.
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const profile_type   = searchParams.get("profile_type");
    const min_age        = searchParams.get("min_age");
    const max_age        = searchParams.get("max_age");
    const district       = searchParams.get("district");
    const state          = searchParams.get("state");
    const marital_status = searchParams.get("marital_status");
    const education      = searchParams.get("education");
    const occupation     = searchParams.get("occupation");
    const kothiram       = searchParams.get("kothiram") || searchParams.get("sub_caste");
    const page           = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit          = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const from           = (page - 1) * limit;

    let query = supabase
      .from("profiles")
      .select(PROFILE_SELECT, { count: "exact" })
      .eq("approval_status", "approved")
      .eq("profile_status", "active");

    if (profile_type)   query = query.eq("profile_type",    profile_type);
    if (marital_status) query = query.eq("marital_status",  marital_status);
    if (district)       query = query.ilike("district",     `%${district}%`);
    if (state)          query = query.ilike("state",        `%${state}%`);
    if (education)      query = query.ilike("education",    `%${education}%`);
    if (occupation)     query = query.ilike("occupation",   `%${occupation}%`);
    if (kothiram)       query = query.ilike("kothiram",     `%${kothiram}%`);
    if (min_age)        query = query.gte("age",            parseInt(min_age));
    if (max_age)        query = query.lte("age",            parseInt(max_age));

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      profiles:   data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error("GET /api/profiles/search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
