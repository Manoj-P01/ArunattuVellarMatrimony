import { createHmac } from "crypto";

const SECRET = process.env.ADMIN_INVITE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "avs-invite-secret";

export function createInviteToken(role = "admin") {
  const now = Date.now();
  const payload = JSON.stringify({ iat: now, exp: now + 48 * 3600 * 1000, role });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig  = createHmac("sha256", SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyInviteToken(token) {
  if (!token || typeof token !== "string") return { valid: false, error: "Token missing" };
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return { valid: false, error: "Invalid token format" };
  const expected = createHmac("sha256", SECRET).update(b64).digest("base64url");
  if (expected !== sig) return { valid: false, error: "Invalid token signature" };
  try {
    const { iat, exp, role } = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (Date.now() > exp) return { valid: false, error: "Invite link has expired" };
    return { valid: true, iat, exp, role: role || "admin" };
  } catch {
    return { valid: false, error: "Malformed token" };
  }
}
