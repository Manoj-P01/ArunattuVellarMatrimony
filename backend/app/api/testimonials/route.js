import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * GET /api/testimonials
 * Fetches all public marriage testimonials/success stories.
 */
export async function GET(request) {
  try {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await svc
      .from("profiles")
      .select("id, name, profile_id, profile_type, marriage_date, partner_profile_id, marriage_feedback, photo_url")
      .eq("got_married", true)
      .not("marriage_feedback", "is", null)
      .neq("profile_status", "deleted")
      .order("marriage_date", { ascending: false });

    if (error) throw error;

    // Map default avatars for display if empty
    const sanitized = (data || []).map(p => ({
      ...p,
      avatar: p.avatar || p.name?.slice(0, 2).toUpperCase() || "??",
    }));

    return NextResponse.json({ testimonials: sanitized });
  } catch (error) {
    console.error("GET /api/testimonials error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
