import { NextResponse }  from "next/server";
import { cookies }       from "next/headers";
import { createClient }  from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdmin }  from "../_auth.js";
import fs from "fs";
import path from "path";

/**
 * GET /api/admin/users
 * List all users with their profiles (admin only).
 * Auth: real Supabase session (role=admin/super_admin) OR x-admin-secret header.
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
    const page  = Math.max(1,   parseInt(searchParams.get("page")  || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "30"));
    const from  = (page - 1) * limit;

    let dbQuery = svc
      .from("users")
      .select(`
        id, email, name, role, created_at,
        profiles!profiles_user_id_fkey (id, profile_id, profile_type, name, approval_status, profile_status, created_at),
        admin_details\!admin_details_user_id_fkey (mobile, whatsapp, native_place, kothiram, status, approved_at)
      `, { count: "exact" });

    // Normal admins cannot see other admins details but can see only super admin details and themselves
    if (admin.role === "admin") {
      dbQuery = dbQuery.or(`role.neq.admin,id.eq.${admin.id}`);
    }

    const { data, error, count } = await dbQuery
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      users: data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users
 * Update a user's role or active status.
 */
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    const admin = await requireAdmin(supabase, request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { user_id, role, is_active } = await request.json();
    if (!user_id) {
      return NextResponse.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const updates = {};
    if (role      !== undefined) updates.role      = role;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await svc
      .from("users")
      .update(updates)
      .eq("id", user_id)
      .select()
      .single();

    if (error) throw error;

    await svc.from("admin_log").insert({
      admin_id:          admin.id,
      action:            "update_user",
      target_profile_id: null,
      details:           { user_id, ...updates },
    });

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error("PATCH /api/admin/users error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user and their auth account (super_admin only).
 */
export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    const admin = await requireAdmin(supabase, request);
    if (!admin || admin.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { user_id } = await request.json();
    if (!user_id) {
      return NextResponse.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── 1. Fetch user to check protection ───────────────────────────────────
    const { data: targetUser } = await svc
      .from("users")
      .select("id, email, name, role")
      .eq("id", user_id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Load protected mobile numbers from contact-config.json
    const configPath = path.join(process.cwd(), "contact-config.json");
    let protectedNumbers = [];
    try {
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, "utf-8");
        const config = JSON.parse(fileContent);
        protectedNumbers = config.superAdminMobileNumbers || [];
      }
    } catch (err) {
      console.error("Error reading config for phone protection:", err);
    }

    // Helper: normalise phone numbers
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

    // Check target's phone numbers in profiles and admin_details
    const { data: targetProfile } = await svc
      .from("profiles")
      .select("contact, whatsapp")
      .eq("user_id", user_id)
      .single();

    const { data: targetAdminDet } = await svc
      .from("admin_details")
      .select("mobile, whatsapp")
      .eq("user_id", user_id)
      .single();

    const targetPhones = [
      targetProfile?.contact,
      targetProfile?.whatsapp,
      targetAdminDet?.mobile,
      targetAdminDet?.whatsapp
    ].filter(Boolean);

    const hasProtectedPhone = targetPhones.some(phone => isProtected(phone));

    if (hasProtectedPhone) {
      return NextResponse.json({ success: false, error: "This super admin is protected in config and cannot be deleted." }, { status: 400 });
    }

    // ── 2. Delete auth user (cascades to public.users/profiles/admin_details) ──
    const { error: deleteError } = await svc.auth.admin.deleteUser(user_id);
    if (deleteError) throw deleteError;

    // Log action
    await svc.from("admin_log").insert({
      admin_id:          admin.id,
      action:            "delete_user",
      target_user_id:    user_id,
      details:           { user_id, email: targetUser.email, name: targetUser.name },
    });

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/users error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
