import { NextResponse }  from "next/server";
import { cookies }       from "next/headers";
import { createClient }  from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdmin }  from "../_auth.js";

/**
 * GET /api/admin/dashboard
 * Admin dashboard statistics.
 * Auth: real Supabase session (role=admin) OR x-admin-secret header.
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    const admin = await requireAdmin(supabase, request);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use service-role to bypass RLS for admin reads
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const [
      { count: totalUsers },
      { count: totalProfiles },
      { count: pendingProfiles },
      { count: approvedProfiles },
      { count: totalBrides },
      { count: totalGrooms },
      { count: totalInterests },
      { count: acceptedInterests },
    ] = await Promise.all([
      svc.from("users").select("*",     { count: "exact", head: true }),
      svc.from("profiles").select("*",  { count: "exact", head: true }).neq("profile_status", "deleted"),
      svc.from("profiles").select("*",  { count: "exact", head: true }).eq("approval_status", "pending"),
      svc.from("profiles").select("*",  { count: "exact", head: true }).eq("approval_status", "approved"),
      svc.from("profiles").select("*",  { count: "exact", head: true }).eq("profile_type", "bride").eq("approval_status", "approved"),
      svc.from("profiles").select("*",  { count: "exact", head: true }).eq("profile_type", "groom").eq("approval_status", "approved"),
      svc.from("interests").select("*", { count: "exact", head: true }),
      svc.from("interests").select("*", { count: "exact", head: true }).eq("status", "accepted"),
    ]);

    // Recent pending profiles
    const { data: recentPending } = await svc
      .from("profiles")
      .select("id, profile_id, profile_type, name, created_at, approval_status")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      stats: {
        total_users:        totalUsers        || 0,
        total_profiles:     totalProfiles     || 0,
        pending_profiles:   pendingProfiles   || 0,
        approved_profiles:  approvedProfiles  || 0,
        total_brides:       totalBrides       || 0,
        total_grooms:       totalGrooms       || 0,
        total_marriages:    0,                           // reserved for future feature
        total_interests:    totalInterests    || 0,
        accepted_interests: acceptedInterests || 0,
        success_rate: totalInterests
          ? Math.round(((acceptedInterests || 0) / totalInterests) * 100)
          : 0,
      },
      recent_pending: recentPending || [],
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
