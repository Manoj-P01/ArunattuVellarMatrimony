/**
 * POST /api/auth/refresh
 *
 * Refreshes the Supabase session (rotates the access_token in the cookie).
 * Supabase JS handles this automatically in the browser, but this endpoint
 * exists for server-side use or explicit refresh requests.
 */

import { NextResponse } from "next/server";
import { cookies }      from "next/headers";
import { createClient } from "../../../../utils/supabase/server.ts";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      return NextResponse.json(
        { success: false, error: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, message: "Session refreshed" });
  } catch (error) {
    console.error("POST /api/auth/refresh error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
