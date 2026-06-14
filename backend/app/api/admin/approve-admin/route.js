import { NextResponse } from "next/server";
import { cookies }      from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdmin }  from "../_auth.js";

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/admin/approve-admin
 * Approve or reject a pending admin registration.
 * Body: { admin_detail_id, action: "approve" | "reject", reason? }
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const admin = await requireAdmin(supabase, request);
    if (!admin || admin.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { admin_detail_id, action, reason } = await request.json();
    if (!admin_detail_id || !["approve","reject"].includes(action)) {
      return NextResponse.json({ error: "admin_detail_id and action (approve|reject) required" }, { status: 400 });
    }

    const db = svc();

    // Fetch the pending admin details
    const { data: det, error: detErr } = await db
      .from("admin_details")
      .select("id, user_id, name, email, status, role")
      .eq("id", admin_detail_id)
      .single();

    if (detErr || !det) {
      return NextResponse.json({ error: "Admin request not found" }, { status: 404 });
    }
    if (det.status !== "pending") {
      return NextResponse.json({ error: `Already ${det.status}` }, { status: 400 });
    }

    if (action === "approve") {
      // 1. Upgrade user role to target role
      await db.from("users").update({ role: det.role }).eq("id", det.user_id);

      // 2. Update admin_details status
      await db.from("admin_details").update({
        status:      "active",
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      }).eq("id", admin_detail_id);

      // 3. In-app notification
      Promise.resolve(
        db.from("notifications").insert({
          user_id:  det.user_id,
          type:     "admin_approved",
          title:    "Admin Access Granted!",
          message:  `Welcome ${det.name}! Your admin account has been approved by ${admin.name || "Admin"}. You can now access the admin panel.`,
          metadata: { approved_by: admin.name },
        })
      ).catch(() => {});

      return NextResponse.json({ success: true, action: "approved", message: `${det.name} is now an admin.` });
    } else {
      // Reject — keep role as member, update status
      await db.from("admin_details").update({
        status:          "rejected",
        rejected_reason: reason || null,
        updated_at:      new Date().toISOString(),
      }).eq("id", admin_detail_id);

      return NextResponse.json({ success: true, action: "rejected", message: `${det.name}'s admin request rejected.` });
    }
  } catch (e) {
    console.error("POST /api/admin/approve-admin error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/approve-admin?status=pending
 * List admin detail records by status.
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const admin = await requireAdmin(supabase, request);
    if (!admin || admin.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const db = svc();
    const { data, error } = await db
      .from("admin_details")
      .select("*, profiles!admin_details_profile_id_fkey(profile_id, profile_type)")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ admins: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
