import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";

/**
 * @swagger
 * /api/interests/{id}:
 *   patch:
 *     summary: Accept or reject a received interest
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, rejected]
 *     responses:
 *       200:
 *         description: Interest status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the receiver can respond
 */
export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore, request);
    const { id } = await params;

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
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    // Fetch the interest
    const { data: interest } = await supabase
      .from("interests")
      .select("id, receiver_profile_id, sender_profile_id, status")
      .eq("id", id)
      .single();

    if (!interest) {
      return NextResponse.json({ success: false, error: "Interest not found" }, { status: 404 });
    }

    // Only the receiver can respond
    if (interest.receiver_profile_id !== myProfile.id) {
      return NextResponse.json({ success: false, error: "Only the receiver can respond to an interest" }, { status: 403 });
    }

    if (interest.status !== "pending") {
      return NextResponse.json({ success: false, error: `Interest already ${interest.status}` }, { status: 409 });
    }

    const { status } = await request.json();
    if (!["accepted", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, error: "status must be 'accepted' or 'rejected'" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("interests")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Notify the sender
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("user_id, name")
      .eq("id", interest.sender_profile_id)
      .single();

    const { data: receiverProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", myProfile.id)
      .single();

    if (senderProfile?.user_id) {
      await supabase.from("notifications").insert({
        user_id:  senderProfile.user_id,
        type:     status === "accepted" ? "interest_accepted" : "interest_rejected",
        title:    status === "accepted" ? "Interest Accepted!" : "Interest Declined",
        message:  status === "accepted"
          ? `${receiverProfile?.name || "Someone"} has accepted your interest!`
          : `${receiverProfile?.name || "Someone"} has declined your interest.`,
        metadata: { interest_id: id, receiver_profile_id: myProfile.id },
      });
    }

    return NextResponse.json({ success: true, interest: data });
  } catch (error) {
    console.error("PATCH /api/interests/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/interests/{id}:
 *   delete:
 *     summary: Withdraw a sent interest (sender only, only if still pending)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Interest withdrawn
 */
export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore, request);
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const { data: interest } = await supabase
      .from("interests")
      .select("id, sender_profile_id, status")
      .eq("id", id)
      .single();

    if (!interest) {
      return NextResponse.json({ success: false, error: "Interest not found" }, { status: 404 });
    }

    if (interest.sender_profile_id !== myProfile?.id) {
      return NextResponse.json({ success: false, error: "Only the sender can withdraw an interest" }, { status: 403 });
    }

    if (interest.status !== "pending") {
      return NextResponse.json({ success: false, error: "Cannot withdraw an already responded interest" }, { status: 409 });
    }

    const { error } = await supabase.from("interests").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: "Interest withdrawn" });
  } catch (error) {
    console.error("DELETE /api/interests/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
