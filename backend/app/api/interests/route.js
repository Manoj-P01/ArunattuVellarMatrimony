import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../utils/supabase/server.ts";

/**
 * @swagger
 * /api/interests:
 *   get:
 *     summary: Get all interests (sent + received) for the authenticated user
 *     parameters:
 *       - { in: query, name: type, schema: { type: string, enum: [sent, received, all] }, description: "Filter by sent/received" }
 *       - { in: query, name: status, schema: { type: string, enum: [pending, accepted, rejected] } }
 *     responses:
 *       200:
 *         description: List of interests
 *       401:
 *         description: Unauthorized
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

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
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type   = searchParams.get("type")   || "all";
    const status = searchParams.get("status");

    const INTEREST_SELECT = `
      id, status, sent_at, responded_at,
      sender_profile:sender_profile_id (
        id, profile_id, name, age, district, education, occupation
      ),
      receiver_profile:receiver_profile_id (
        id, profile_id, name, age, district, education, occupation
      )
    `.trim();

    let query = supabase.from("interests").select(INTEREST_SELECT);

    if (type === "sent") {
      query = query.eq("sender_profile_id", myProfile.id);
    } else if (type === "received") {
      query = query.eq("receiver_profile_id", myProfile.id);
    } else {
      query = query.or(`sender_profile_id.eq.${myProfile.id},receiver_profile_id.eq.${myProfile.id}`);
    }

    if (status) query = query.eq("status", status);

    const { data, error } = await query.order("sent_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ interests: data || [], my_profile_id: myProfile.id });
  } catch (error) {
    console.error("GET /api/interests error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/interests:
 *   post:
 *     summary: Send an interest to another profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiver_profile_id]
 *             properties:
 *               receiver_profile_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Interest sent
 *       400:
 *         description: Already sent or self-interest
 *       401:
 *         description: Unauthorized
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id, approval_status")
      .eq("user_id", user.id)
      .single();

    if (!myProfile) {
      return NextResponse.json({ success: false, error: "Complete your profile first" }, { status: 400 });
    }

    if (myProfile.approval_status !== "approved") {
      return NextResponse.json({ success: false, error: "Your profile must be approved before sending interests" }, { status: 403 });
    }

    const { receiver_profile_id } = await request.json();

    if (!receiver_profile_id) {
      return NextResponse.json({ success: false, error: "receiver_profile_id is required" }, { status: 400 });
    }

    if (receiver_profile_id === myProfile.id) {
      return NextResponse.json({ success: false, error: "Cannot send interest to yourself" }, { status: 400 });
    }

    // Check receiver profile exists and is active
    const { data: receiver } = await supabase
      .from("profiles")
      .select("id, approval_status, profile_status")
      .eq("id", receiver_profile_id)
      .single();

    if (!receiver || receiver.approval_status !== "approved" || receiver.profile_status !== "active") {
      return NextResponse.json({ success: false, error: "Receiver profile not found or inactive" }, { status: 404 });
    }

    // Check if interest already exists
    const { data: existing } = await supabase
      .from("interests")
      .select("id, status")
      .eq("sender_profile_id",   myProfile.id)
      .eq("receiver_profile_id", receiver_profile_id)
      .single();

    if (existing) {
      return NextResponse.json({ success: false, error: `Interest already ${existing.status}`, interest: existing }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("interests")
      .insert({
        sender_profile_id:   myProfile.id,
        receiver_profile_id: receiver_profile_id,
        status:              "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for receiver
    await supabase.from("notifications").insert({
      user_id: (await supabase.from("profiles").select("user_id").eq("id", receiver_profile_id).single()).data?.user_id,
      type:    "interest_received",
      title:   "New Interest Received",
      message: "Someone has sent you an interest. Visit the Interests page to respond.",
      metadata: { interest_id: data.id, sender_profile_id: myProfile.id },
    });

    return NextResponse.json({ success: true, interest: data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/interests error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
