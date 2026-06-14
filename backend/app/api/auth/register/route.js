/**
 * POST /api/auth/register
 *
 * OTP verified → Supabase auth user create (with password) → profile insert.
 * family_details JSON from frontend is parsed into individual DB columns.
 *
 * Fields handled (aligned with RegisterPage.jsx v2):
 *   Step 0 : profile_type (bride/groom)
 *   Step 1 : name, email, whatsapp, contact, contact_privacy, password,
 *             height, marital_status, education, occupation, monthly_salary
 *   Step 2 : kothiram, native_place, district, state, country,
 *             religion (derived from is_hindu / custom_religion),
 *             community (derived from is_avs / custom_community)
 *   Step 3 : dob, birth_time, birth_place, rasi, natchathiram, patham,
 *             dosham, sevvai_position, ragu_position, kedhu_position
 *   Step 4 : about_me, social_links_privacy, social_links, expectations,
 *             father_name, father_kothiram, father_occupation,
 *             father_mobile, father_whatsapp,
 *             mother_name, mother_kothiram, mother_occupation,
 *             mother_mobile, mother_whatsapp,
 *             elder_brothers, elder_brothers_married,
 *             younger_brothers, younger_brothers_married,
 *             elder_sisters, elder_sisters_married,
 *             younger_sisters, younger_sisters_married
 */

import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyOtp, clearOtps } from "../../../../lib/otp/index.js";

/** Parse an integer from a possibly-empty string; returns null if invalid. */
function toInt(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

/** Parse non-negative integer; returns 0 (not null) for sibling counts. */
function toCount(v) {
  const n = toInt(v);
  return n === null ? 0 : Math.max(0, n);
}

/** Trim a string; return null if blank. */
function str(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { identifier, otp, profile: profilePayload } = body;

    // ── 1. Basic validation ──────────────────────────────────────────────
    if (!identifier || !otp) {
      return NextResponse.json(
        { success: false, error: "identifier and otp are required" },
        { status: 400 }
      );
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      return NextResponse.json(
        { success: false, error: "OTP must be exactly 6 digits" },
        { status: 400 }
      );
    }
    if (!profilePayload?.profile_type || !profilePayload?.name || !profilePayload?.date_of_birth) {
      return NextResponse.json(
        { success: false, error: "profile_type, name, and date_of_birth are required" },
        { status: 400 }
      );
    }

    const email    = identifier.trim().toLowerCase();
    const password = profilePayload.password || null;

    // ── 2. Verify OTP ────────────────────────────────────────────────────
    const otpResult = await verifyOtp({ identifier: email, otp: otp.trim() });
    if (!otpResult.valid) {
      return NextResponse.json({ success: false, error: otpResult.reason }, { status: 400 });
    }

    // ── 3. Find or create Supabase Auth user ─────────────────────────────
    const adminSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let userId;

    const createPayload = {
      email,
      email_confirm: true,
      user_metadata: { name: profilePayload.name, registered_via: "otp" },
    };
    if (password) createPayload.password = password;

    const { data: created, error: createErr } = await adminSupabase.auth.admin.createUser(createPayload);

    if (!createErr && created?.user?.id) {
      userId = created.user.id;
    } else {
      // User already exists in auth — find them by email
      const { data: listData, error: listErr } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw new Error("Could not check existing users: " + listErr.message);

      const found = listData?.users?.find(u => u.email?.toLowerCase() === email);
      if (!found?.id) throw new Error("Auth user creation failed: " + (createErr?.message || "unknown error"));

      userId = found.id;
      if (password) {
        await adminSupabase.auth.admin.updateUserById(userId, { password }).catch(() => {});
      }
    }

    // ── 4. Ensure public.users row exists (FK target for profiles.user_id) ─
    const { error: upsertErr } = await adminSupabase
      .from("users")
      .upsert(
        { id: userId, email, name: profilePayload.name, role: "member" },
        { onConflict: "id" }
      );
    if (upsertErr) console.warn("public.users upsert warning:", upsertErr.message);

    // Verify the row actually exists before inserting profile
    const { data: verifiedUser } = await adminSupabase
      .from("users").select("id").eq("id", userId).single();
    if (!verifiedUser) {
      throw new Error(
        "User record missing in public.users. Please run supabase_migration.sql and try again."
      );
    }

    // ── 5. Check if profile already exists ───────────────────────────────
    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("id, profile_id")
      .eq("user_id", userId)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "A profile already exists for this email. Please log in instead.",
          profile_id: existingProfile.profile_id,
        },
        { status: 409 }
      );
    }

    // ── 6. Parse family_details JSON into individual DB columns ──────────
    let fd = {};
    if (profilePayload.family_details) {
      try {
        fd = typeof profilePayload.family_details === "string"
          ? JSON.parse(profilePayload.family_details)
          : profilePayload.family_details;
      } catch (_) {
        console.warn("Could not parse family_details JSON — individual fields will be null");
      }
    }

    // ── 7. Derive religion & community from frontend boolean flags ────────
    //   is_hindu === false → use custom_religion, else default "Hindu"
    //   is_avs   === false → use custom_community, else default "Arunattu Vellalar"
    const religionValue = profilePayload.is_hindu === false
      ? str(profilePayload.custom_religion) || "Other"
      : "Hindu";

    const communityValue = profilePayload.is_avs === false
      ? str(profilePayload.custom_community) || "Other"
      : "Arunattu Vellalar";

    // ── 8. Build profile record ──────────────────────────────────────────
    const profileData = {
      user_id:       userId,
      email,                                              // store email on profile too
      profile_type:  profilePayload.profile_type,        // DB col: 'profile_type'
      name:          profilePayload.name,
      dob:           profilePayload.date_of_birth,       // DB col: 'dob' (age auto-calc by trigger)
      height:        str(profilePayload.height),
      marital_status: profilePayload.marital_status || "single",
      education:     str(profilePayload.education),
      occupation:    str(profilePayload.occupation),
      // Accept monthly_salary (new) or legacy salary field
      salary:        str(profilePayload.monthly_salary) || str(profilePayload.salary),
      kothiram:      str(profilePayload.kothiram),       // renamed from sub_caste
      country:       profilePayload.country   || "India",
      state:         profilePayload.state     || "Tamil Nadu",
      district:      str(profilePayload.district),
      living_country: profilePayload.living_country || "India",
      living_state:   str(profilePayload.living_state),
      living_district: str(profilePayload.living_district),
      religion:      religionValue,
      community:     communityValue,
      about_me:      str(profilePayload.about_me),
      about_me_privacy: profilePayload.about_me_privacy || "public",
      social_links_privacy: profilePayload.social_links_privacy || "public",
      contact_privacy: profilePayload.contact_privacy || "public",
      social_links:    profilePayload.social_links    || [],
      photo_privacy: profilePayload.photo_privacy || "public",
      whatsapp:      str(profilePayload.whatsapp)  || str(profilePayload.whatsapp_number),
      contact:       str(profilePayload.contact)   || str(profilePayload.contact_number),
      phone_country_code: profilePayload.phone_country_code || "+91",

      // ── Astrology & native place (from parsed family_details) ────────────
      birth_time:    str(fd.birth_time),
      birth_place:   str(fd.birth_place),
      native_place:  str(fd.native_place),
      rasi:          str(fd.rasi),
      natchathiram:  str(fd.natchathiram),
      patham:        str(fd.patham),
      dosham:        str(fd.dosham),
      sevvai_position: str(fd.sevvai_position),
      ragu_position:   str(fd.ragu_position),
      kedhu_position:  str(fd.kedhu_position),
      expectations:  str(fd.expectations),

      // ── Parents ──────────────────────────────────────────────────────────
      father_name:       str(fd.father_name)       || str(profilePayload.father_name),
      father_kothiram:   str(fd.father_kothiram)   || str(profilePayload.father_kothiram),
      father_occupation: str(fd.father_occupation),
      father_mobile:     str(fd.father_mobile)     || str(profilePayload.father_mobile),
      father_whatsapp:   str(fd.father_whatsapp)   || str(profilePayload.father_whatsapp),
      mother_name:       str(fd.mother_name)       || str(profilePayload.mother_name),
      mother_kothiram:   str(fd.mother_kothiram)   || str(profilePayload.mother_kothiram),
      mother_occupation: str(fd.mother_occupation),
      mother_mobile:     str(fd.mother_mobile)     || str(profilePayload.mother_mobile),
      mother_whatsapp:   str(fd.mother_whatsapp)   || str(profilePayload.mother_whatsapp),

      // ── Siblings — elder/younger split with married sub-counts ────────────
      elder_brothers:           toCount(fd.elder_brothers),
      elder_brothers_married:   toCount(fd.elder_brothers_married),
      younger_brothers:         toCount(fd.younger_brothers),
      younger_brothers_married: toCount(fd.younger_brothers_married),
      elder_sisters:            toCount(fd.elder_sisters),
      elder_sisters_married:    toCount(fd.elder_sisters_married),
      younger_sisters:          toCount(fd.younger_sisters),
      younger_sisters_married:  toCount(fd.younger_sisters_married),

      // ── Legacy aggregated sibling columns (back-filled for old queries) ──
      // brother_count = elder + younger, sister_count = elder + younger
      brother_count: toCount(fd.elder_brothers) + toCount(fd.younger_brothers) || null,
      sister_count:  toCount(fd.elder_sisters)  + toCount(fd.younger_sisters)  || null,

      approval_status: "pending",
      profile_status:  "active",
    };

    // ── 9. Insert profile (service-role bypasses RLS) ────────────────────
    const { data: savedProfile, error: profileErr } = await adminSupabase
      .from("profiles")
      .insert(profileData)
      .select(`
        id, profile_id, profile_type, name, dob, age,
        height, marital_status, education, occupation, salary,
        kothiram, native_place, country, state, district,
        living_country, living_state, living_district,
        religion, community,
        birth_time, birth_place, rasi, natchathiram, patham, dosham,
        sevvai_position, ragu_position, kedhu_position, expectations,
        photo_privacy, email, whatsapp, contact,
        contact_privacy, social_links, social_links_privacy, about_me_privacy,
        father_name, father_kothiram, father_occupation,
        father_mobile, father_whatsapp,
        mother_name, mother_kothiram, mother_occupation,
        mother_mobile, mother_whatsapp,
        elder_brothers, elder_brothers_married,
        younger_brothers, younger_brothers_married,
        elder_sisters, elder_sisters_married,
        younger_sisters, younger_sisters_married,
        brother_count, sister_count,
        about_me, about_me_privacy, social_links_privacy, contact_privacy,
        profile_status, approval_status, created_at
      `)
      .single();

    if (profileErr) {
      console.error("Profile insert error:", profileErr);
      throw new Error("Profile creation failed: " + profileErr.message);
    }

    // ── 10. Clean up used OTPs ───────────────────────────────────────────
    await clearOtps(email);

    return NextResponse.json({
      success: true,
      message: "Registration successful! Your profile is under review.",
      user: {
        id:    userId,
        email,
        role:  "member",
        profile: {
          id:              savedProfile.id,
          profile_id:      null,   // assigned only on admin approval
          name:            savedProfile.name,
          profile_type:    savedProfile.profile_type,
          approval_status: savedProfile.approval_status,
        },
      },
      profile: savedProfile,
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
