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
      .from("marriages")
      .insert({
        bride_profile_id:      bride_profile_id || null,
        groom_profile_id:      groom_profile_id || null,
        notes:                 JSON.stringify({ partner_name, married_via_matrimony }),
        married_date,
        marriage_type,
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

    const { data: marriages, error: marriagesError } = await svc
      .from("marriages")
      .select(`
        id, married_date, marriage_type, notes, mapped_by, created_at,
        bride_profile_id, groom_profile_id
      `)
      .order("married_date", { ascending: false });

    if (marriagesError) throw marriagesError;

    const profileIds = [...new Set(
      (marriages || []).flatMap(m => [m.bride_profile_id, m.groom_profile_id]).filter(Boolean)
    )];

    let profilesMap = {};
    if (profileIds.length > 0) {
      const { data: profiles, error: profilesError } = await svc
        .from("profiles")
        .select("id, profile_id, name, district, marriage_feedback, marriage_photo, testimonial_approved")
        .in("id", profileIds);

      if (profilesError) throw profilesError;

      profilesMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
    }

    const mappedMarriages = (marriages || []).map(m => {
      let partner_name = null;
      let married_via_matrimony = m.marriage_type === "matrimony";
      if (m.notes) {
        try {
          const parsed = JSON.parse(m.notes);
          if (parsed && typeof parsed === "object") {
            partner_name = parsed.partner_name ?? null;
            if (parsed.married_via_matrimony !== undefined) {
              married_via_matrimony = parsed.married_via_matrimony;
            }
          }
        } catch (e) {
          partner_name = m.notes;
        }
      }
      return {
        id: m.id,
        married_date: m.married_date,
        marriage_type: m.marriage_type,
        married_via_matrimony,
        partner_name,
        created_at: m.created_at,
        bride_profile: m.bride_profile_id ? (profilesMap[m.bride_profile_id] || null) : null,
        groom_profile: m.groom_profile_id ? (profilesMap[m.groom_profile_id] || null) : null
      };
    });

    return NextResponse.json({ marriages: mappedMarriages });
  } catch (error) {
    console.error("GET /api/admin/map-married error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
