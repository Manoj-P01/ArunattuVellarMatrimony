import { NextResponse }  from "next/server";
import { cookies }       from "next/headers";
import { createClient }  from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdmin }  from "../_auth.js";
import { sendApprovalEmail } from "../../../utils/mailer.js";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    const admin = await requireAdmin(supabase, request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await request.json();
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

    // ── 1. Fetch profile type before approval (need it to generate the ID) ──
    const { data: preProfile, error: preErr } = await adminSupabase
      .from("profiles")
      .select("id, profile_id, profile_type, name, user_id, email")
      .eq("id", id)
      .single();
    if (preErr || !preProfile) throw preErr || new Error("Profile not found");

    // ── 2. Generate AVS-BR-XXX / AVS-GR-XXX if not already assigned ──────────
    let assignedProfileId = preProfile.profile_id;
    if (!assignedProfileId) {
      const prefix = preProfile.profile_type === "bride" ? "AVS-BR" : "AVS-GR";

      // Find the highest existing sequential number for this type
      const { data: existing } = await adminSupabase
        .from("profiles")
        .select("profile_id")
        .like("profile_id", `${prefix}-%`)
        .not("profile_id", "is", null);

      let maxNum = 0;
      for (const row of existing || []) {
        const match = row.profile_id?.match(/-(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
      assignedProfileId = `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
    }

    // ── 3. Approve + persist the new profile_id in one update ─────────────────
    const { data: profile, error } = await adminSupabase
      .from("profiles")
      .update({
        approval_status: "approved",
        profile_id:      assignedProfileId,
        approved_by:     admin.id,
        approved_at:     new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, profile_id, profile_type, name, user_id, email")
      .single();

    if (error) throw error;

    // Admin log (non-fatal — wrap in Promise so .catch works)
    Promise.resolve(
      adminSupabase.from("admin_log").insert({
        admin_id:          admin.id,
        action:            "approve_profile",
        target_profile_id: id,
        details:           { assigned_profile_id: profile.profile_id, approved_by_name: admin.name },
      })
    ).catch(e => console.warn("[approve] admin_log failed:", e?.message));

    // In-app notification (non-fatal)
    if (profile.user_id) {
      Promise.resolve(
        adminSupabase.from("notifications").insert({
          user_id:  profile.user_id,
          type:     "profile_approved",
          title:    "Profile Approved!",
          message:  "Congratulations " + profile.name + "! Your profile ID is " + profile.profile_id + ". Approved by " + admin.name + ". You can now browse and connect with matches.",
          metadata: { profile_uuid: id, profile_id: profile.profile_id, approved_by: admin.name },
        })
      ).catch(e => console.warn("[approve] notification failed:", e?.message));
    }

    // Approval email — resolve email from profile or auth.users
    let userEmail = profile.email || null;
    if (!userEmail && profile.user_id) {
      try {
        const { data: authUserData } = await adminSupabase.auth.admin.getUserById(profile.user_id);
        userEmail = authUserData?.user?.email || null;
      } catch (e) {
        console.warn("[approve] Could not fetch auth user email:", e.message);
      }
    }

    // Fetch approving admin's mobile number from admin_details
    let adminMobile = "";
    if (admin.id) {
      try {
        const { data: adminDet } = await adminSupabase
          .from("admin_details")
          .select("mobile")
          .eq("user_id", admin.id)
          .maybeSingle();
        if (adminDet?.mobile) {
          adminMobile = adminDet.mobile;
        }
      } catch (e) {
        console.warn("[approve] Could not fetch admin mobile number:", e.message);
      }
    }

    if (userEmail) {
      let origin = request.headers.get("origin") || request.headers.get("referer");
      if (origin) {
        try {
          const urlObj = new URL(origin);
          origin = urlObj.origin;
        } catch (err) {}
      }
      if (!origin) {
        origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
      }

      sendApprovalEmail({
        toEmail:     userEmail,
        userName:    profile.name,
        profileId:   profile.profile_id,
        profileType: profile.profile_type,
        adminName:   admin.name,
        adminMobile: adminMobile,
        appUrl:      origin,
      }).then(r => {
        if (!r.ok) console.warn("[approve] email failed:", r.error);
      });
    }

    return NextResponse.json({
      success: true,
      message: "Profile approved. ID assigned: " + profile.profile_id,
      profile,
    });

  } catch (error) {
    console.error("POST /api/admin/approve error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
