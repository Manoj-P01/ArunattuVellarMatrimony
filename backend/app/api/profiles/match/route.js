import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";

const PROFILE_SELECT = `
  id, profile_id, profile_type, name, dob, age,
  height, marital_status, education, occupation, salary,
  kothiram, district, state, country,
  photo_url, photo_privacy, about_me, created_at
`.trim();

/**
 * GET /api/profiles/match
 * Smart matches for the authenticated user (opposite profile_type, ±5 age).
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id, profile_type, age, district, marital_status, education")
      .eq("user_id", user.id)
      .single();

    if (!myProfile) {
      return NextResponse.json({ error: "Complete your profile to see matches" }, { status: 404 });
    }

    const oppositeType = myProfile.profile_type === "bride" ? "groom" : "bride";
    const minAge = (myProfile.age || 25) - 5;
    const maxAge = (myProfile.age || 25) + 5;

    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const from  = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT, { count: "exact" })
      .eq("profile_type",    oppositeType)
      .eq("approval_status", "approved")
      .eq("profile_status",  "active")
      .gte("age", minAge)
      .lte("age", maxAge)
      .neq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;

    // Sort: same district first, then same marital_status
    const sorted = (data || []).sort((a, b) => {
      const aD = a.district === myProfile.district ? 1 : 0;
      const bD = b.district === myProfile.district ? 1 : 0;
      if (bD !== aD) return bD - aD;
      const aM = a.marital_status === myProfile.marital_status ? 1 : 0;
      const bM = b.marital_status === myProfile.marital_status ? 1 : 0;
      return bM - aM;
    });

    return NextResponse.json({
      matches:    sorted,
      my_profile: { id: myProfile.id, profile_type: myProfile.profile_type },
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error("GET /api/profiles/match error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
