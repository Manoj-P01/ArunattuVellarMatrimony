import { NextResponse }  from "next/server";
import { cookies }       from "next/headers";
import { createClient }  from "../../../../utils/supabase/server.ts";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdmin }  from "../_auth.js";

/**
 * POST /api/admin/map-married
 * Records a marriage and sets both profiles' status to 'married'.
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

    const {
      bride_profile_id,
      groom_profile_id,
      partner_name,
      married_date,
      marriage_type,
      married_via_matrimony = false,
      testimonial,
    } = await request.json();

    if (!married_date || !marriage_type) {
      return NextResponse.json(
        { success: false, error: "married_date and marriage_type are required" },
        { status: 400 }
      );
    }
    if (!["arranged", "love", "matrimony"].includes(marriage_type)) {
      return NextResponse.json(
        { success: false, error: "marriage_type must be arranged, love, or matrimony" },
        { status: 400 }
      );
    }

    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: marriage, error: marriageError } = await svc
      .from("marriage")
      .insert({
        bride_profile_id:      bride_profile_id || null,
        groom_profile_id:      groom_profile_id || null,
        partner_name:          partner_name     || null,
        married_date,
        marriage_type,
        married_via_matrimony,
        mapped_by: admin.id,
      })
      .select()
      .single();

    if (marriageError) throw marriageError;

    // Get profiles to fetch their human-readable profile IDs
    let bride_human_id = null;
    let groom_human_id = null;
    if (bride_profile_id || groom_profile_id) {
      const ids = [bride_profile_id, groom_profile_id].filter(Boolean);
      const { data: profiles } = await svc
        .from("profiles")
        .select("id, profile_id")
        .in("id", ids);
      if (profiles) {
        const brideProf = profiles.find(p => p.id === bride_profile_id);
        const groomProf = profiles.find(p => p.id === groom_profile_id);
        if (brideProf) bride_human_id = brideProf.profile_id;
        if (groomProf) groom_human_id = groomProf.profile_id;
      }
    }

    // Set profiles status to 'married', set got_married, and store the testimonial
    if (bride_profile_id) {
      await svc
        .from("profiles")
        .update({
          profile_status: "married",
          got_married: true,
          marriage_date: married_date,
          partner_profile_id: groom_human_id || null,
          marriage_feedback: testimonial || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", bride_profile_id);
    }
    if (groom_profile_id) {
      await svc
        .from("profiles")
        .update({
          profile_status: "married",
          got_married: true,
          marriage_date: married_date,
          partner_profile_id: bride_human_id || null,
          marriage_feedback: testimonial || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", groom_profile_id);
    }

    await svc.from("admin_log").insert({
      admin_id:          admin.id,
      action:            "map_married",
      target_profile_id: bride_profile_id || groom_profile_id || null,
      details:           { marriage_id: marriage.id, bride_profile_id, groom_profile_id, partner_name, married_date, marriage_type },
    });

    return NextResponse.json({ success: true, marriage }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/map-married error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/map-married
 * Get all marriage records (admin only).
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

    const { data, error } = await svc
      .from("marriage")
      .select(`
        id, married_date, marriage_type, married_via_matrimony, partner_name, created_at,
        bride_profile:bride_profile_id (id, profile_id, name, district, marriage_feedback),
        groom_profile:groom_profile_id (id, profile_id, name, district, marriage_feedback)
      `)
      .order("married_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ marriages: data || [] });
  } catch (error) {
    console.error("GET /api/admin/map-married error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
