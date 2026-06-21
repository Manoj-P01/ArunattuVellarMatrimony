import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const PROFILE_SELECT = `
  id, user_id, profile_id, profile_type, name, dob, age,
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

    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let isAdmin = false;
    if (user) {
      const { data: viewer } = await svc.from("users").select("role").eq("id", user.id).single();
      isAdmin = viewer?.role === "admin" || viewer?.role === "super_admin";
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

    // Check for unapproved photos
    const profileIds = (data || []).map(p => p.id);
    let unapprovedUrls = new Set();
    if (profileIds.length > 0) {
      const { data: photosData } = await svc
        .from("photos")
        .select("photo_url, status, profile_id")
        .in("profile_id", profileIds)
        .neq("status", "approved");

      let records = photosData || [];
      const hasPhotoUrlCol = records.length > 0 || !(await svc.from("photos").select("photo_url").limit(1)).error;
      if (!hasPhotoUrlCol) {
        const { data: retryData } = await svc
          .from("photos")
          .select("url, status, profile_id")
          .in("profile_id", profileIds)
          .neq("status", "approved");
        records = (retryData || []).map(r => ({ ...r, photo_url: r.url }));
      }
      unapprovedUrls = new Set(records.map(r => r.photo_url).filter(Boolean));
    }

    const sanitized = (data || []).map(p => {
      const isOwner = user && p.user_id === user.id;
      if (isAdmin || isOwner) {
        return p;
      }
      if (p.photo_url && unapprovedUrls.has(p.photo_url)) {
        return { ...p, photo_url: null };
      }
      return p;
    });

    return NextResponse.json({
      profiles:   sanitized,
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error("GET /api/profiles/search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

