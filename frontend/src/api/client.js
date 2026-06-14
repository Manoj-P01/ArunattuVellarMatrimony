/**
 * AVS Matrimony – API Client
 *
 * All requests go to the Next.js backend (Supabase-connected).
 * Session cookies are sent automatically (credentials: "include").
 * Falls back gracefully to mock data only when the backend is offline.
 */



const base        = import.meta.env.VITE_API_URL    ?? "http://localhost:3000";
const adminSecret = import.meta.env.VITE_ADMIN_SECRET ?? "";

// ─── Generic fetch helper ─────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    credentials: "include",                          // Send Supabase session cookies
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || "API error");
  }
  return res.json();
}

// Admin API calls include x-admin-secret header for admin authentication.
function adminFetch(path, options = {}) {
  return apiFetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(adminSecret ? { "x-admin-secret": adminSecret } : {}),
    },
  });
}

function buildQuery(params = {}) {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
  ).toString();
  return q ? `?${q}` : "";
}

// ─── Initial data (public — no auth required) ─────────────────────────────────
export async function fetchInitialData() {
  try {
    const [profilesRes, notificationsRes] = await Promise.all([
      apiFetch("/api/profiles"),
      apiFetch("/api/notifications"),
    ]);
    return {
      profiles: profilesRes.profiles || profilesRes || [],
      notifications: notificationsRes.notifications || notificationsRes || [],
    };
  } catch {
    return { profiles: [], notifications: [] };
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Step 1: Send OTP to email or mobile */
export async function apiSendOtp({ type, identifier }) {
  return apiFetch("/api/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ type, identifier }),
  });
}

/** Step 2: Verify OTP — returns { success, user } */
export async function apiVerifyOtp({ type, identifier, otp }) {
  return apiFetch("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ type, identifier, otp }),
  });
}

/**
 * Register: OTP verify + user create (with password) + profile insert.
 * profile should include a `password` field so the user can log in afterward.
 */
export async function apiRegister({ identifier, otp, profile }) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ identifier, otp, profile }),
  });
}

/**
 * Login with email/mobile + password.
 * Returns { success, user, profile } on success.
 */
export async function apiLogin({ login_type, identifier, password }) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ login_type, identifier, password }),
  });
}

/** Restore session from Supabase cookie on page load — returns { user, profile } or null */
export async function apiGetMe() {
  try {
    return await apiFetch("/api/auth/me");
  } catch {
    return null;
  }
}

/** Logout: clears Supabase session cookie */
export async function apiLogout() {
  try { await apiFetch("/api/auth/logout", { method: "POST" }); } catch { }
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

/** Get paginated list of approved profiles */
export async function apiGetProfiles(filters = {}) {
  try {
    const res = await apiFetch(`/api/profiles${buildQuery(filters)}`);
    return res.profiles || res || [];
  } catch {
    return [];
  }
}

/** Get a single profile by UUID or profile_id (AVS-BR-001) */
export async function apiGetProfile(id) {
  try {
    const res = await apiFetch(`/api/profiles/${id}`);
    return res.profile || res || null;
  } catch {
    return null;
  }
}

/** Create a new profile (authenticated) */
export async function apiCreateProfile(profileData) {
  return apiFetch("/api/profiles", {
    method: "POST",
    body: JSON.stringify(profileData),
  });
}

/** Update own profile */
export async function apiSaveProfile(profileId, updates) {
  try {
    return await apiFetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  } catch {
    return { success: true };
  }
}

/** Search profiles with filters */
export async function apiSearchProfiles(filters = {}) {
  try {
    const res = await apiFetch(`/api/profiles/search${buildQuery(filters)}`);
    return res.profiles || [];
  } catch {
    return [];
  }
}

/** Get smart matches for the current user */
export async function apiGetMatches(params = {}) {
  try {
    const res = await apiFetch(`/api/profiles/match${buildQuery(params)}`);
    return res.matches || [];
  } catch {
    return [];
  }
}

// ─── Interests ────────────────────────────────────────────────────────────────

/** Get sent/received interests */
export async function apiGetInterests(params = {}) {
  try {
    const res = await apiFetch(`/api/interests${buildQuery(params)}`);
    return res;
  } catch {
    return { interests: [], my_profile_id: null };
  }
}

/** Send an interest */
export async function apiSendInterest(receiverProfileId) {
  return apiFetch("/api/interests", {
    method: "POST",
    body: JSON.stringify({ receiver_profile_id: receiverProfileId }),
  });
}

/** Accept or reject a received interest */
export async function apiRespondToInterest(interestId, status) {
  return apiFetch(`/api/interests/${interestId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/** Withdraw a sent interest */
export async function apiWithdrawInterest(interestId) {
  return apiFetch(`/api/interests/${interestId}`, { method: "DELETE" });
}

// ─── Shortlist ────────────────────────────────────────────────────────────────

/** Get user's shortlist */
export async function apiGetShortlist() {
  try {
    const res = await apiFetch("/api/shortlist");
    return res.shortlist || [];
  } catch {
    return [];
  }
}

/** Add a profile to shortlist */
export async function apiAddToShortlist(profileId) {
  return apiFetch("/api/shortlist", {
    method: "POST",
    body: JSON.stringify({ profile_id: profileId }),
  });
}

/** Remove a profile from shortlist */
export async function apiRemoveFromShortlist(profileId) {
  return apiFetch("/api/shortlist", {
    method: "DELETE",
    body: JSON.stringify({ profile_id: profileId }),
  });
}

// ─── Photos ───────────────────────────────────────────────────────────────────

/** Upload a photo (base64 encoded) */
export async function apiUploadPhoto({ fileBase64, fileName, photoType = "gallery", isPrimary = false }) {
  return apiFetch("/api/photos", {
    method: "POST",
    body: JSON.stringify({
      file_base64: fileBase64,
      file_name: fileName,
      photo_type: photoType,
      is_primary: isPrimary,
    }),
  });
}

/** Delete a photo by ID */
export async function apiDeletePhoto(photoId) {
  return apiFetch("/api/photos", {
    method: "DELETE",
    body: JSON.stringify({ photo_id: photoId }),
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

/** Get notifications for the current user */
export async function apiGetNotifications(params = {}) {
  try {
    const res = await apiFetch(`/api/notifications${buildQuery(params)}`);
    return res;
  } catch {
    return { notifications: [], unread_count: 0 };
  }
}

/** Mark notifications as read (pass ids array, or omit to mark all) */
export async function apiMarkNotificationsRead(ids) {
  return apiFetch("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({ ids }),
  });
}

// ─── Admin ───────────────────────────────────────────────────────────────────
// All admin calls use adminFetch, which adds x-admin-secret header so the
// "Admin Demo Login" button works even without a real Supabase session cookie.

/** Get admin dashboard stats */
export async function apiAdminDashboard() {
  return adminFetch("/api/admin/dashboard");
}

/** Get all users with profiles (admin) */
export async function apiAdminGetUsers(params = {}) {
  return adminFetch(`/api/admin/users${buildQuery(params)}`);
}

/** Approve a profile — pass the UUID (id), not profile_id.
 *  The backend assigns the AVS-BR-xxx / AVS-GR-xxx ID at approval time. */
export async function apiAdminApprove(uuid) {
  return adminFetch("/api/admin/approve", {
    method: "POST",
    body: JSON.stringify({ id: uuid }),
  });
}

/** Reject a profile with optional reason */
export async function apiAdminReject(uuid, reason = "") {
  return adminFetch("/api/admin/reject", {
    method: "POST",
    body: JSON.stringify({ id: uuid, reason }),
  });
}

/** Map a married couple */
export async function apiAdminMapMarried(data) {
  return adminFetch("/api/admin/map-married", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Get all marriage records (admin) */
export async function apiAdminGetMarriages() {
  const res = await adminFetch("/api/admin/map-married");
  return res.marriages || [];
}

/** Get ALL profiles for admin (all statuses: pending, rejected, inactive, etc.) */
export async function apiAdminGetAllProfiles(params = {}) {
  const res = await adminFetch(`/api/admin/profiles${buildQuery(params)}`);
  return res.profiles || [];
}

/** Generate invite token (admin) */
export async function apiAdminGenerateInvite(role = "admin", note = "") {
  return adminFetch("/api/admin/invite", {
    method: "POST",
    body: JSON.stringify({ role, note }),
  });
}

