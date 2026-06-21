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
      .select("id, name, profile_id, profile_type, marriage_date, partner_profile_id, marriage_feedback, photo_url, marriage_photo, approval_status, testimonial_approved")
      .eq("got_married", true)
      .eq("approval_status", "approved")
      .eq("testimonial_approved", true)
      .not("marriage_feedback", "is", null)
      .neq("profile_status", "deleted")
      .order("marriage_date", { ascending: false });

    if (error) throw error;

    // Get all approved photos for these profiles to verify marriage_photo approval status
    const profileIds = (data || []).map(p => p.id);
    let approvedPhotos = [];
    if (profileIds.length > 0) {
      const { data: photosData, error: photosError } = await svc
        .from("photos")
        .select("photo_url, status, profile_id")
        .in("profile_id", profileIds)
        .eq("status", "approved");
      
      if (photosError?.message?.includes("photo_url")) {
        const { data: retryData } = await svc
          .from("photos")
          .select("url, status, profile_id")
          .in("profile_id", profileIds)
          .eq("status", "approved");
        approvedPhotos = (retryData || []).map(p => ({ ...p, photo_url: p.url }));
      } else {
        approvedPhotos = photosData || [];
      }
    }

    // Map default avatars for display if empty and verify marriage photo status
    const sanitized = (data || []).map(p => {
      const isPhotoApproved = approvedPhotos.some(photo => photo.photo_url === p.marriage_photo);
      return {
        ...p,
        avatar: p.avatar || p.name?.slice(0, 2).toUpperCase() || "??",
        marriage_photo: isPhotoApproved ? p.marriage_photo : null,
      };
    });

    return NextResponse.json({ testimonials: sanitized });
  } catch (error) {
    console.error("GET /api/testimonials error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
