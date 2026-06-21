import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../utils/supabase/server.ts";

/**
 * @swagger
 * /api/shortlist:
 *   get:
 *     summary: Get the authenticated user's shortlisted profiles
 *     responses:
 *       200:
 *         description: Shortlist
 *       401:
 *         description: Unauthorized
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore, request);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!myProfile) {
      return NextResponse.json({ shortlist: [] });
    }

    const { data, error } = await supabase
      .from("shortlists")
      .select(`
        id, created_at,
        shortlisted_profile:shortlisted_profile_id (
          id, profile_id, profile_type, name, age, district, education, occupation
        )
      `)
      .eq("user_profile_id", myProfile.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ shortlist: data || [] });
  } catch (error) {
    console.error("GET /api/shortlist error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/shortlist:
 *   post:
 *     summary: Add a profile to shortlist
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [profile_id]
 *             properties:
 *               profile_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Added to shortlist
 *       409:
 *         description: Already shortlisted
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore, request);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!myProfile) {
      return NextResponse.json({ success: false, error: "Create your profile first" }, { status: 400 });
    }

    const { profile_id } = await request.json();
    if (!profile_id) {
      return NextResponse.json({ success: false, error: "profile_id is required" }, { status: 400 });
    }

    if (profile_id === myProfile.id) {
      return NextResponse.json({ success: false, error: "Cannot shortlist yourself" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("shortlists")
      .insert({ user_profile_id: myProfile.id, shortlisted_profile_id: profile_id })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ success: false, error: "Already shortlisted" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, shortlist: data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/shortlist error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/shortlist:
 *   delete:
 *     summary: Remove a profile from shortlist
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [profile_id]
 *             properties:
 *               profile_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Removed from shortlist
 */
export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore, request);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let profile_id;
    const { searchParams } = new URL(request.url);
    const queryProfileId = searchParams.get("profile_id");
    if (queryProfileId) {
      profile_id = queryProfileId;
    } else {
      const body = await request.json().catch(() => ({}));
      profile_id = body.profile_id;
    }

    if (!profile_id) {
      return NextResponse.json({ success: false, error: "profile_id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("shortlists")
      .delete()
      .eq("user_profile_id",        myProfile?.id)
      .eq("shortlisted_profile_id", profile_id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Removed from shortlist" });
  } catch (error) {
    console.error("DELETE /api/shortlist error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
