import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Full profile columns — aligned with migration_full_setup.sql
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
  got_married, marriage_date, partner_profile_id, marriage_feedback,
  profile_status, approval_status, approved_by, approved_at,
  created_at, updated_at
`.trim();

/**
 * GET /api/profiles
 * Returns approved & active profiles (paginated).
 */
export async function GET(request) {
  try {
    // Use service role to bypass RLS — avoids infinite recursion in the
    // "Admins can read all users" policy. Visibility is enforced by the
    // explicit .eq() filters below (approved + active only).
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const from  = (page - 1) * limit;

    const { data, error, count } = await svc
      .from("profiles")
      .select(PROFILE_SELECT, { count: "exact" })
      .eq("approval_status", "approved")
      .eq("profile_status", "active")
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      profiles:   data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error("GET /api/profiles error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/profiles
 * Create a profile for the authenticated user (used if not going through /register).
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id, profile_id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Profile already exists. Use PATCH to update.", profile_id: existing.profile_id },
        { status: 409 }
      );
    }

    const body = await request.json();
    const profileType = body.profile_type;
    const dob         = body.date_of_birth || body.dob;

    if (!profileType || !body.name || !dob) {
      return NextResponse.json(
        { success: false, error: "profile_type, name, and date_of_birth are required" },
        { status: 400 }
      );
    }
    if (!["bride", "groom"].includes(profileType)) {
      return NextResponse.json({ success: false, error: "profile_type must be 'bride' or 'groom'" }, { status: 400 });
    }

    // Parse family_details JSON if sent as a string
    let fd = {};
    if (body.family_details) {
      try { fd = typeof body.family_details === "string" ? JSON.parse(body.family_details) : body.family_details; }
      catch (_) {}
    }

    const profileData = {
      user_id:        user.id,
      email:          user.email,
      profile_type:   profileType,
      name:           body.name,
      dob,
      height:         body.height          || null,
      marital_status: body.marital_status  || "single",
      education:      body.education       || null,
      occupation:     body.occupation      || null,
      salary:         body.monthly_salary  || body.salary || null,
      religion:       body.religion        || "Hindu",
      community:      body.community       || "Arunattu Vellalar",
      kothiram:       body.kothiram        || null,
      native_place:   fd.native_place      || body.native_place || null,
      country:        body.country         || "India",
      state:          body.state           || "Tamil Nadu",
      district:       body.district        || null,
      living_country: body.living_country  || fd.living_country || "India",
      living_state:    body.living_state    || fd.living_state    || null,
      living_district: body.living_district || fd.living_district || null,
      city:           body.city            || null,
      about_me:       body.about_me        || null,
      about_me_privacy: body.about_me_privacy || "public",
      social_links_privacy: body.social_links_privacy || "public",
      contact_privacy: body.contact_privacy || "public",
      social_links:    body.social_links    || [],
      photo_privacy:  body.photo_privacy   || "public",
      whatsapp:       body.whatsapp        || null,
      contact:        body.contact         || null,
      alt_contact:    body.alt_contact     || null,
      phone_country_code: body.phone_country_code || "+91",
      // Individual family / astrology fields
      birth_time:     fd.birth_time        || body.birth_time    || null,
      birth_place:    fd.birth_place       || body.birth_place   || null,
      rasi:           fd.rasi              || body.rasi          || null,
      natchathiram:   fd.natchathiram      || body.natchathiram  || null,
      patham:         fd.patham            || body.patham        || null,
      dosham:         fd.dosham            || body.dosham        || null,
      sevvai_position:  fd.sevvai_position  || body.sevvai_position  || null,
      ragu_position:    fd.ragu_position    || body.ragu_position    || null,
      kedhu_position:   fd.kedhu_position   || body.kedhu_position   || null,
      expectations:   fd.expectations      || body.expectations  || null,
      father_name:        fd.father_name       || body.father_name       || null,
      father_kothiram:    fd.father_kothiram   || body.father_kothiram   || null,
      father_occupation:  fd.father_occupation || body.father_occupation || null,
      father_mobile:      fd.father_mobile     || body.father_mobile     || null,
      father_whatsapp:    fd.father_whatsapp   || body.father_whatsapp   || null,
      mother_name:        fd.mother_name       || body.mother_name       || null,
      mother_kothiram:    fd.mother_kothiram   || body.mother_kothiram   || null,
      mother_occupation:  fd.mother_occupation || body.mother_occupation || null,
      mother_mobile:      fd.mother_mobile     || body.mother_mobile     || null,
      mother_whatsapp:    fd.mother_whatsapp   || body.mother_whatsapp   || null,
      // Split sibling counts
      elder_brothers:           parseInt(fd.elder_brothers   || 0),
      elder_brothers_married:   parseInt(fd.elder_brothers_married   || 0),
      younger_brothers:         parseInt(fd.younger_brothers || 0),
      younger_brothers_married: parseInt(fd.younger_brothers_married || 0),
      elder_sisters:            parseInt(fd.elder_sisters    || 0),
      elder_sisters_married:    parseInt(fd.elder_sisters_married    || 0),
      younger_sisters:          parseInt(fd.younger_sisters  || 0),
      younger_sisters_married:  parseInt(fd.younger_sisters_married  || 0),
      // Legacy aggregated sibling columns (back-filled)
      brother_count:  (parseInt(fd.elder_brothers || 0) + parseInt(fd.younger_brothers || 0)) || null,
      sister_count:   (parseInt(fd.elder_sisters  || 0) + parseInt(fd.younger_sisters  || 0)) || null,
      approval_status: "pending",
      profile_status:  "active",
    };

    const { data, error } = await supabase
      .from("profiles")
      .insert(profileData)
      .select(PROFILE_SELECT)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, profile: data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/profiles error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
