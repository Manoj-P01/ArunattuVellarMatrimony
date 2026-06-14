import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyInviteToken } from "../_invite_utils.js";

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/admin/register?email=xxx
 * Check if an email is already registered as a user/bride/groom.
 * Used by the registration form to show the right UI.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase();
    if (!email) return NextResponse.json({ exists: false });

    const db = svc();
    const { data: user } = await db
      .from("users")
      .select("id, email, name, role")
      .eq("email", email)
      .single();

    if (!user) return NextResponse.json({ exists: false });

    // Check for existing profile
    const { data: profile } = await db
      .from("profiles")
      .select("id, profile_id, profile_type, name, approval_status")
      .eq("user_id", user.id)
      .single();

    // Check if already an admin
    const { data: adminDet } = await db
      .from("admin_details")
      .select("id, status")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      exists: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      profile: profile || null,
      adminDetails: adminDet || null,
    });
  } catch (e) {
    return NextResponse.json({ exists: false });
  }
}

/**
 * POST /api/admin/register
 * Register a new admin (requires valid invite token).
 * New admin is set to 'pending' — existing admin must approve.
 *
 * Body: { token, name, email, password, mobile, whatsapp, native_place, kothiram }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, name, email, password, mobile, whatsapp, native_place, kothiram } = body;

    if (!token || !name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ success: false, error: "Name, email, password and token are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // ── 1. Verify HMAC invite token ───────────────────────────────────────
    const verification = verifyInviteToken(token);
    if (!verification.valid) {
      return NextResponse.json({ success: false, error: verification.error || "Invalid invite token" }, { status: 400 });
    }

    const targetRole = verification.role || "admin";

    const db = svc();
    const emailLower = email.trim().toLowerCase();

    // ── 2. Check if email already in auth.users ────────────────────────────
    const { data: existingUsers } = await db.auth.admin.listUsers({ perPage: 1000 });
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === emailLower);

    let authUserId;
    let isUpgrade = false;

    if (existingAuthUser) {
      authUserId = existingAuthUser.id;
      isUpgrade  = true;
      // Update password
      await db.auth.admin.updateUserById(authUserId, { password });
    } else {
      // Create new Supabase auth user (email not confirmed yet — admin will approve)
      const { data: newAuth, error: authErr } = await db.auth.admin.createUser({
        email:         emailLower,
        password,
        email_confirm: true,
        user_metadata: { name: name.trim() },
      });
      if (authErr) throw authErr;
      authUserId = newAuth.user.id;
    }

    // ── 3. Upsert public.users (role stays 'member' until approved) ───────
    const { error: userErr } = await db
      .from("users")
      .upsert({
        id:    authUserId,
        email: emailLower,
        name:  name.trim(),
        role:  "member",  // role set to targetRole only after existing admin approves
      }, { onConflict: "id" });
    if (userErr) throw userErr;

    // ── 4. Fetch existing profile (bride/groom) if any ────────────────────
    const { data: profile } = await db
      .from("profiles")
      .select("id, profile_id, profile_type, name, approval_status")
      .eq("user_id", authUserId)
      .single();

    // ── 5. Insert admin_details with status = 'pending' ───────────────────
    const { data: adminDet, error: detErr } = await db
      .from("admin_details")
      .upsert({
        user_id:      authUserId,
        name:         name.trim(),
        email:        emailLower,
        mobile:       mobile    || null,
        whatsapp:     whatsapp  || null,
        native_place: native_place || null,
        kothiram:     kothiram  || null,
        status:       "pending",
        role:         targetRole,
        has_profile:  !!profile,
        profile_id:   profile?.id || null,
        updated_at:   new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (detErr) throw detErr;

    return NextResponse.json({
      success: true,
      pending: true,
      isUpgrade,
      message: "Registration successful! Waiting for admin approval.",
      hasProfile: !!profile,
      profile:    profile || null,
    });
  } catch (e) {
    console.error("POST /api/admin/register error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
