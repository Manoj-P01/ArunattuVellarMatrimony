import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../utils/supabase/server.ts";

/**
 * @swagger
 * /api/photos:
 *   post:
 *     summary: Upload a photo for the authenticated user's profile
 *     description: |
 *       Accepts a base64-encoded image or a multipart file upload.
 *       Stores the file in Supabase Storage (bucket: 'photos') and
 *       records the URL in the photos table.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [file_base64, file_name]
 *             properties:
 *               file_base64:
 *                 type: string
 *                 description: Base64-encoded file content
 *               file_name:
 *                 type: string
 *               photo_type:
 *                 type: string
 *                 enum: [profile, gallery, horoscope]
 *                 default: gallery
 *               is_primary:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Photo uploaded
 *       401:
 *         description: Unauthorized
 */
/**
 * GET /api/photos?profile_id=xxx
 * Returns approved photos for a profile (gallery + horoscope).
 * Own profile: returns all statuses (so user can see pending too).
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const { searchParams } = new URL(request.url);
    const profile_id = searchParams.get("profile_id");
    if (!profile_id) return NextResponse.json({ photos: [] });

    const { data: { user } } = await supabase.auth.getUser();

    // Find out if requester owns this profile
    let isOwner = false;
    if (user) {
      const { data: myProfile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      isOwner = myProfile?.id === profile_id;
    }

    let query = supabase
      .from("photos")
      .select("id, photo_url, photo_type, status, is_primary, sort_order, created_at")
      .eq("profile_id", profile_id)
      .order("sort_order", { ascending: true });

    if (!isOwner) query = query.eq("status", "approved");

    let { data, error } = await query;

    // Fallback: some DB schemas use 'url' instead of 'photo_url'
    if (error?.message?.includes("photo_url")) {
      let q2 = supabase
        .from("photos")
        .select("id, url, photo_type, status, is_primary, sort_order, created_at")
        .eq("profile_id", profile_id)
        .order("sort_order", { ascending: true });
      if (!isOwner) q2 = q2.eq("status", "approved");
      const r2 = await q2;
      if (!r2.error) {
        data = (r2.data || []).map(p => ({ ...p, photo_url: p.url }));
        error = null;
      } else { throw r2.error; }
    } else if (error) { throw error; }

    return NextResponse.json({ photos: data || [] });
  } catch (error) {
    console.error("GET /api/photos error:", error);
    return NextResponse.json({ photos: [] }, { status: 500 });
  }
}

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
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!myProfile) {
      return NextResponse.json({ success: false, error: "Create your profile first" }, { status: 400 });
    }

    const body = await request.json();
    const { file_base64, file_name, photo_type = "gallery", is_primary = false } = body;

    if (!file_base64 || !file_name) {
      return NextResponse.json({ success: false, error: "file_base64 and file_name are required" }, { status: 400 });
    }

    // Decode base64 and upload to Supabase Storage
    const fileBuffer = Buffer.from(
      file_base64.replace(/^data:[a-z/]+;base64,/, ""),
      "base64"
    );

    const ext        = file_name.split(".").pop() || "jpg";
    const storagePath = `${user.id}/${myProfile.id}/${Date.now()}.${ext}`;
    const bucket     = photo_type === "horoscope" ? "horoscopes" : "photos";

    let contentType = `image/${ext}`;
    const lowerExt = ext.toLowerCase();
    if (lowerExt === "pdf") {
      contentType = "application/pdf";
    } else if (lowerExt === "png") {
      contentType = "image/png";
    } else if (lowerExt === "jpg" || lowerExt === "jpeg") {
      contentType = "image/jpeg";
    } else if (lowerExt === "webp") {
      contentType = "image/webp";
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    // If setting as primary, unset previous primary
    if (is_primary) {
      await supabase
        .from("photos")
        .update({ is_primary: false })
        .eq("profile_id", myProfile.id)
        .eq("is_primary", true);
    }

    // Get current max sort_order for this profile
    const { data: lastPhoto } = await supabase
      .from("photos")
      .select("sort_order")
      .eq("profile_id", myProfile.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const sort_order = (lastPhoto?.sort_order ?? -1) + 1;

    const { data, error: dbError } = await supabase
      .from("photos")
      .insert({
        profile_id:      myProfile.id,
        photo_url:       publicUrl,
        is_primary,
        photo_type,
        sort_order,
        status:          "pending",  // admin must approve before visible to others
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, photo: data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/photos error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/photos:
 *   delete:
 *     summary: Delete a photo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [photo_id]
 *             properties:
 *               photo_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Photo deleted
 */
export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const { photo_id } = await request.json();

    // Verify ownership
    const { data: photo } = await supabase
      .from("photos")
      .select("id, photo_url, profile_id")
      .eq("id", photo_id)
      .single();

    if (!photo || photo.profile_id !== myProfile?.id) {
      return NextResponse.json({ success: false, error: "Photo not found or access denied" }, { status: 404 });
    }

    // Delete from DB
    const { error } = await supabase.from("photos").delete().eq("id", photo_id);
    if (error) throw error;

    // Try to delete from storage (non-blocking)
    try {
      const urlParts = photo.photo_url.split("/storage/v1/object/public/");
      if (urlParts.length === 2) {
        const [bucket, ...pathParts] = urlParts[1].split("/");
        await supabase.storage.from(bucket).remove([pathParts.join("/")]);
      }
    } catch (_) {}

    return NextResponse.json({ success: true, message: "Photo deleted" });
  } catch (error) {
    console.error("DELETE /api/photos error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
