import { NextResponse }  from "next/server";
import { cookies }       from "next/headers";
import { createClient }  from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdmin }  from "../_auth.js";

/**
 * POST /api/admin/reject
 *
 * Rejects a pending profile by UUID with an optional reason.
 * Auth: real Supabase session (role=admin) OR x-admin-secret header.
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    const admin = await requireAdmin(supabase, request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id, reason } = await request.json();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "profile UUID (id) is required" },
        { status: 400 }
      );
    }

    const adminSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: profile, error } = await adminSupabase
      .from("profiles")
      .update({
        approval_status: "rejected",
        updated_at:      new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, profile_id, name, user_id")
      .single();

    if (error) throw error;

    await adminSupabase.from("admin_log").insert({
      admin_id:          admin.id,
      action:            "reject_profile",
      target_profile_id: id,
      details:           { reason: reason || null },
    });

    if (profile.user_id) {
      await adminSupabase.from("notifications").insert({
        user_id: profile.user_id,
        type:    "admin_message",
        title:   "Profile Review Update",
        message: reason
          ? `Your profile was not approved at this time. Reason: ${reason}. Please update your profile and contact admin.`
          : "Your profile requires some updates. Please contact admin for details.",
        metadata: { profile_uuid: id, reason: reason || null },
      });
    }

    return NextResponse.json({ success: true, message: "Profile rejected", profile });
  } catch (error) {
    console.error("POST /api/admin/reject error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
