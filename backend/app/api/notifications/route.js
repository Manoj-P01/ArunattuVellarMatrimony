import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../utils/supabase/server.ts";

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for the authenticated user
 *     parameters:
 *       - { in: query, name: unread_only, schema: { type: boolean } }
 *       - { in: query, name: limit, schema: { type: integer, default: 30 } }
 *     responses:
 *       200:
 *         description: Notifications list
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore, request);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ notifications: [], unread_count: 0 });
    }

    const { searchParams } = new URL(request.url);
    const unread_only = searchParams.get("unread_only") === "true";
    const limit       = Math.min(100, parseInt(searchParams.get("limit") || "30"));

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unread_only) query = query.eq("is_read", false);

    const { data, error } = await query;
    if (error) throw error;

    const unread_count = (data || []).filter(n => !n.is_read).length;

    return NextResponse.json({ notifications: data || [], unread_count });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ notifications: [], unread_count: 0 });
  }
}

/**
 * @swagger
 * /api/notifications:
 *   patch:
 *     summary: Mark notifications as read
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *                 description: Specific notification IDs. Omit to mark all as read.
 *     responses:
 *       200:
 *         description: Marked as read
 */
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore, request);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { ids } = await request.json().catch(() => ({}));

    let query = supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id);

    if (ids && ids.length > 0) {
      query = query.in("id", ids);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
