import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
 * GET /api/profiles/[id]
 * Get a single profile by UUID or profile_id (AVS-BR-001).
 */
export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // Use service role for the actual data read to sidestep RLS recursion;
    // we enforce visibility rules manually below.
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const { data, error } = await (isUUID
      ? svc.from("profiles").select(PROFILE_SELECT).eq("id", id)
      : svc.from("profiles").select(PROFILE_SELECT).eq("profile_id", id)
    ).single();

    if (error || !data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Enforce visibility: non-owners only see approved + active (unless admin)
    if (user?.id !== data.user_id) {
      let isAdmin = false;
      if (user) {
        const { data: viewer } = await svc.from("users").select("role").eq("id", user.id).single();
        isAdmin = viewer?.role === "admin" || viewer?.role === "super_admin";
      }
      if (!isAdmin && (data.approval_status !== "approved" || data.profile_status !== "active")) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("GET /api/profiles/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/profiles/[id]
 * Update own profile (or any profile if admin).
 */
export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Use service role for ownership / role checks to bypass RLS and avoid
    // the infinite recursion in the "Admins can read all users" policy.
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: existing, error: existErr } = await svc
      .from("profiles").select("id, user_id").eq("id", id).single();
    if (existErr || !existing) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    const { data: userRecord } = await svc
      .from("users").select("role").eq("id", user.id).single();
    const isAdmin = userRecord?.role === "admin" || userRecord?.role === "super_admin";

    if (existing.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Fields a regular user can update
    const safeFields = [
      "name", "dob", "height", "marital_status", "education",
      "occupation", "salary", "about_me", "kothiram",
      "religion", "community",
      "native_place", "country", "state", "district", "city",
      "living_district", "living_state", "living_country",
      "photo_privacy", "photo_url", "whatsapp", "contact", "alt_contact",
      "phone_country_code", "expectations", "social_links", "about_me_privacy", "social_links_privacy", "contact_privacy",
      // Astrology / family
      "birth_time", "birth_place", "rasi", "natchathiram", "patham", "dosham",
      "sevvai_position", "ragu_position", "kedhu_position",
      "father_name", "father_kothiram", "father_occupation", "father_mobile", "father_whatsapp",
      "mother_name", "mother_kothiram", "mother_occupation", "mother_mobile", "mother_whatsapp",
      // Split sibling counts
      "elder_brothers", "elder_brothers_married",
      "younger_brothers", "younger_brothers_married",
      "elder_sisters", "elder_sisters_married",
      "younger_sisters", "younger_sisters_married",
      // Legacy aggregated
      "brother_count", "brother_married_status",
      "sister_count", "sister_married_status",
      // Marriage details
      "got_married", "marriage_date", "partner_profile_id", "marriage_feedback",
    ];

    const updates = {};
    const integerFields = [
      "brother_count", "sister_count",
      "elder_brothers", "elder_brothers_married",
      "younger_brothers", "younger_brothers_married",
      "elder_sisters", "elder_sisters_married",
      "younger_sisters", "younger_sisters_married"
    ];

    for (const field of safeFields) {
      if (body[field] !== undefined) {
        const val = body[field];
        if (integerFields.includes(field)) {
          if (val === "" || val === null || val === undefined) {
            updates[field] = null;
          } else {
            updates[field] = parseInt(val, 10);
          }
        } else if (field === "salary") {
          if (val === "" || val === null || val === undefined) {
            updates[field] = null;
          } else {
            updates[field] = parseFloat(val);
          }
        } else {
          updates[field] = val;
        }
      }
    }

    // Regular users can toggle their own profile between active / inactive
    if (existing.user_id === user.id && body.profile_status !== undefined) {
      if (["active", "inactive"].includes(body.profile_status)) {
        updates.profile_status = body.profile_status;
      }
    }

    // Admins can also change status fields
    if (isAdmin) {
      if (body.approval_status !== undefined) updates.approval_status = body.approval_status;
      if (body.profile_status !== undefined) updates.profile_status = body.profile_status;
      if (body.approved_by !== undefined) updates.approved_by = user.id;
      if (body.approved_at !== undefined) updates.approved_at = new Date().toISOString();
    }

    // Always use service role for the update so it succeeds regardless of RLS state
    const { data, error } = await svc
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select(PROFILE_SELECT)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    console.error("PATCH /api/profiles/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/profiles/[id]
 * Soft-delete (set profile_status = 'deleted').
 */
export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: existing } = await svc
      .from("profiles").select("id, user_id, contact, whatsapp").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    const { data: userRecord } = await svc
      .from("users").select("role").eq("id", user.id).single();

    if (existing.user_id !== user.id) {
      if (userRecord?.role !== "admin" && userRecord?.role !== "super_admin") {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      // Check if target is a protected super admin
      const configPath = path.join(process.cwd(), "contact-config.json");
      let protectedNumbers = [];
      try {
        if (fs.existsSync(configPath)) {
          const fileContent = fs.readFileSync(configPath, "utf-8");
          const config = JSON.parse(fileContent);
          protectedNumbers = config.superAdminMobileNumbers || [];
        }
      } catch (err) {
        console.error("Error reading config for profile deletion check:", err);
      }

      const normalizePhone = (num) => {
        if (!num) return "";
        let digits = num.replace(/\D/g, "");
        if (digits.startsWith("00")) digits = digits.slice(2);
        if (digits.startsWith("0")) digits = digits.slice(1);
        return digits;
      };

      const isProtected = (phone) => {
        if (!phone) return false;
        const normalizedNum = normalizePhone(phone);
        if (!normalizedNum) return false;
        return protectedNumbers.some(p => {
          const normalizedP = normalizePhone(p);
          if (!normalizedP) return false;
          return normalizedNum.endsWith(normalizedP) || normalizedP.endsWith(normalizedNum);
        });
      };

      // Check admin_details table for target owner
      const { data: targetAdminDet } = await svc
        .from("admin_details")
        .select("mobile, whatsapp")
        .eq("user_id", existing.user_id)
        .single();

      const targetPhones = [
        existing.contact,
        existing.whatsapp,
        targetAdminDet?.mobile,
        targetAdminDet?.whatsapp
      ].filter(Boolean);

      const hasProtectedPhone = targetPhones.some(phone => isProtected(phone));

      if (hasProtectedPhone) {
        return NextResponse.json({ success: false, error: "This profile belongs to a protected super admin and cannot be deleted by other admins." }, { status: 400 });
      }
    }

    const { error } = await svc
      .from("profiles")
      .update({ profile_status: "deleted" })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Profile deactivated" });
  } catch (error) {
    console.error("DELETE /api/profiles/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
