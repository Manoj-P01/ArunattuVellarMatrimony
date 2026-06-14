/**
 * Shared admin authentication helper.
 *
 * Two ways to authenticate as admin:
 *   1. Real Supabase session cookie + role='admin' in public.users   (production)
 *   2. x-admin-secret header matching ADMIN_SECRET env var            (dev / demo)
 *
 * Returns an admin user object { id, email, role: "admin" } or null.
 */

import { createClient as createServiceClient } from "@supabase/supabase-js";

const DEMO_ADMIN_ID = "00000000-0000-0000-0000-000000000001";

export async function requireAdmin(supabase, request = null) {
  // ── Path 1: Real Supabase session ───────────────────────────────────────
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      const adminSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data } = await adminSupabase
        .from("users")
        .select("role, email, name")
        .eq("id", user.id)
        .single();
      if (data?.role === "admin" || data?.role === "super_admin") {
        return { id: user.id, email: data.email, name: data.name || "AVS Admin", role: data.role };
      }
    }
  } catch {}

  // ── Path 2: Admin secret header (dev / demo) ─────────────────────────────
  if (request) {
    const secret       = request.headers.get("x-admin-secret");
    const adminSecret  = process.env.ADMIN_SECRET;
    if (secret && adminSecret && secret === adminSecret) {
      return { id: DEMO_ADMIN_ID, email: "admin@avs.com", name: "AVS Admin", role: "super_admin" };
    }
  }

  return null;
}
