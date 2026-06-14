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
 * GET /api/admin/photos
 * Returns all pending photos & jathagams for admin review.
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const admin = await requireAdmin(supabase, request);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "pending";

    const db = svc();

    // Try photo_url first; if that fails fall back to url (different schema versions)
    let { data, error } = await db
      .from("photos")
      .select("id, photo_url, photo_type, status, is_primary, created_at, profile_id, profiles(id, profile_id, name, profile_type)")
      .eq("status", statusFilter)
      .order("created_at", { ascending: true });

    if (error?.message?.includes("photo_url")) {
      // DB uses 'url' column — retry with that name
      const retry = await db
        .from("photos")
        .select("id, url, photo_type, status, is_primary, created_at, profile_id, profiles(id, profile_id, name, profile_type)")
        .eq("status", statusFilter)
        .order("created_at", { ascending: true });
      if (retry.error) throw retry.error;
      // Normalise: map url → photo_url
      data = (retry.data || []).map(p => ({ ...p, photo_url: p.url }));
    } else if (error) {
      throw error;
    }

    return NextResponse.json({ photos: data || [] });
  } catch (e) {
    console.error("GET /api/admin/photos error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/photos
 * Approve or reject a photo/jathagam.
 * Body: { photo_id, action: "approve" | "reject" }
 */
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const admin = await requireAdmin(supabase, request);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { photo_id, action } = await request.json();
    if (!photo_id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "photo_id and action (approve|reject) required" }, { status: 400 });
    }

    const db = svc();
    const { data, error } = await db
      .from("photos")
      .update({ status: action === "approve" ? "approved" : "rejected" })
      .eq("id", photo_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, photo: data });
  } catch (e) {
    console.error("PATCH /api/admin/photos error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
