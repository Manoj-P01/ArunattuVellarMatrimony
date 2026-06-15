import { useState, useEffect } from "react";
import { Icon } from "../components/Icon.jsx";

const base = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");

/**
 * ResetPasswordPage
 * Shown when user arrives via ?page=reset-password from the Supabase reset email.
 * Supabase JS client automatically exchanges the #access_token hash into a session,
 * so we can call /api/auth/update-password while that session is active.
 */
export function ResetPasswordPage({ dispatch, t }) {
  const [password, setPassword]     = useState("");
  const [confirm,  setConfirm]      = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [done, setDone]             = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const [accessToken, setAccessToken] = useState("");

  // Parse the #access_token from the URL hash (Supabase recovery link format)
  useEffect(() => {
    const hash = window.location.hash.slice(1); // remove leading #
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const type  = params.get("type");
    if (token && type === "recovery") {
      setAccessToken(token);
      setSessionReady(true);
      // Clean the hash from the URL bar (security)
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    } else {
      // No valid recovery token — may already be on a page redirect, wait briefly
      const timer = setTimeout(() => setSessionReady(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm)  { setError("Passwords do not match"); return; }

    setSubmitting(true);
    try {
      const res  = await fetch(`${base}/api/auth/update-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, access_token: accessToken }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        // Clean the URL so the token isn't reused
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setError(data.error || "Failed to update password. The link may have expired — request a new one.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success ───────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
        <div className="card" style={{ maxWidth: 400, width: "100%", textAlign: "center", padding: "40px 28px" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
            background: "linear-gradient(135deg,#e6ffed,#b2f5c8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={32} style={{ color: "var(--clr-success)" }} />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Password Updated!
          </h2>
          <p style={{ fontSize: 14, color: "var(--clr-text-muted)", marginBottom: 24 }}>
            Your password has been changed successfully. You can now log in with your new password.
          </p>
          <button className="btn btn-primary btn-block btn-lg"
            onClick={() => dispatch({ type: "SET_PAGE", payload: "login" })}>
            <Icon name="chevronRight" size={16} /> Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Parsing URL hash ────────────────────────────────────────────────────────
  if (!sessionReady) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <Icon name="loader" size={40} style={{ color: "var(--clr-saffron)" }} />
          <p style={{ color: "var(--clr-text-muted)", marginTop: 12 }}>Verifying reset link…</p>
        </div>
      </div>
    );
  }

  // ── No valid recovery token ─────────────────────────────────────────────────
  if (!accessToken) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
        <div className="card" style={{ maxWidth: 400, width: "100%", textAlign: "center", padding: "40px 28px" }}>
          <span style={{ fontSize: 48 }}>🔗</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--clr-danger)" }}>
            Link Expired or Invalid
          </h2>
          <p style={{ fontSize: 14, color: "var(--clr-text-muted)", marginBottom: 24 }}>
            This reset link has already been used or has expired.<br />Please request a new one from the login page.
          </p>
          <button className="btn btn-primary btn-block"
            onClick={() => dispatch({ type: "SET_PAGE", payload: "login" })}>
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Reset Form ────────────────────────────────────────────────────────────
  // Strength indicator
  const strength = (() => {
    const s = (password.length >= 8 ? 1 : 0) + (/[A-Z]/.test(password) ? 1 : 0)
            + (/[0-9]/.test(password) ? 1 : 0) + (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
    return s;
  })();
  const strengthColors = ["#e53e3e","#dd6b20","#d69e2e","#38a169"];
  const strengthLabels = ["Weak","Fair","Good","Strong"];

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20, background: "var(--clr-bg)" }}>
      <div className="card" style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ padding: "32px 28px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", margin: "0 auto 14px",
              background: "linear-gradient(135deg,var(--clr-saffron),var(--clr-maroon))",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="lock" size={26} style={{ color: "white" }} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>Set New Password</h2>
            <p style={{ fontSize: 13, color: "var(--clr-text-muted)", marginTop: 4 }}>
              Choose a strong password for your AVS Matrimony account.
            </p>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {/* New password */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">New Password *</label>
              <div style={{ position: "relative" }}>
                <input className="form-input"
                  type={showPass ? "text" : "password"}
                  value={password} placeholder="Minimum 6 characters"
                  style={{ paddingRight: 40 }}
                  onChange={e => { setPassword(e.target.value); setError(""); }} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "var(--clr-text-muted)" }}>
                  <Icon name={showPass ? "eyeOff" : "eye"} size={16} />
                </button>
              </div>
              {password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 2 }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2,
                        background: i < strength ? strengthColors[strength-1] : "var(--clr-border)" }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: strengthColors[strength-1] }}>
                    {strengthLabels[strength-1] || ""}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm Password *</label>
              <input className="form-input"
                type="password"
                value={confirm} placeholder="Re-enter password"
                style={{ borderColor: confirm && password !== confirm ? "var(--clr-danger)" : undefined }}
                onChange={e => { setConfirm(e.target.value); setError(""); }} />
              {confirm && password !== confirm && (
                <div style={{ fontSize: 12, color: "var(--clr-danger)", marginTop: 3 }}>⚠ Passwords do not match</div>
              )}
              {confirm && password === confirm && confirm.length >= 6 && (
                <div style={{ fontSize: 12, color: "var(--clr-success)", marginTop: 3 }}>✓ Passwords match</div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ color: "var(--clr-danger)", fontSize: 13, margin: "16px 0",
              padding: "10px 14px", background: "#fff5f5", borderRadius: 8,
              display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="alertCircle" size={15} /> {error}
            </div>
          )}

          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 20 }}
            onClick={handleSubmit}
            disabled={submitting || !password || !confirm || password !== confirm}>
            {submitting
              ? <span>Updating… <Icon name="loader" size={16} /></span>
              : <span><Icon name="check" size={16} /> Update Password</span>}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--clr-text-muted)" }}>
            Remember your password?{" "}
            <span style={{ color: "var(--clr-saffron)", cursor: "pointer", fontWeight: 600 }}
              onClick={() => dispatch({ type: "SET_PAGE", payload: "login" })}>
              Login
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
