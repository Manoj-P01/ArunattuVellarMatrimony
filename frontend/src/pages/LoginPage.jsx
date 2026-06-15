import { useState, useEffect } from "react";
import { Icon } from "../components/Icon.jsx";
import { apiLogin } from "../api/client.js";

export function LoginPage({ state, dispatch, t }) {
  // loginMode: "member" | "admin"
  const [loginMode, setLoginMode] = useState(() => {
    if (state.forceLoginMode) return state.forceLoginMode;
    return "member";
  });
  const [loginType, setLoginType] = useState("email"); // "email" | "profileId" (member only)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);



  // Forgot password states
  const [mode, setMode] = useState("login"); // "login" | "forgot" | "reset_sent"
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotError, setForgotError] = useState("");

  useEffect(() => {
    if (state.forceLoginMode) {
      setLoginMode(state.forceLoginMode);
      dispatch({ type: "CLEAR_FORCE_LOGIN_MODE" });
    }
  }, [state.forceLoginMode, dispatch]);

  const handleLogin = async () => {
    setError("");
    if (!identifier.trim()) {
      if (loginMode === "admin") {
        setError("Admin email is required");
      } else {
        setError(loginType === "email" ? t("email") + " " + t("notSet") : t("profileId") + " " + t("notSet"));
      }
      return;
    }
    if (loginMode === "member" && loginType === "profileId" && !identifier.trim().toUpperCase().startsWith("AVS-")) {
      setError("Enter a valid Profile ID (e.g. AVS-GR-001 or AVS-BR-001)");
      return;
    }
    if (!password) {
      setError(t("confirmPassword") + " " + t("notSet"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiLogin({
        login_type: loginMode === "admin" ? "email" : loginType,
        identifier: identifier.trim(),
        password,
        // hint to backend: caller expects admin access
        // backend validates role; non-admins who try admin login will get an appropriate error from dispatch
      });
      if (res.success) {
        // Admin mode: if the user is not actually an admin or super_admin, show error
        if (loginMode === "admin" && res.user?.role !== "admin" && res.user?.role !== "super_admin") {
          setError("This account does not have admin privileges.");
          setSubmitting(false);
          return;
        }
        if (loginMode === "admin") {
          // Force admin role on the session
          dispatch({ type: "LOGIN_SUCCESS", payload: { ...res, forceRole: "admin" } });
        } else {
          // Force member role on the session
          dispatch({ type: "LOGIN_SUCCESS", payload: { ...res, forceRole: "member" } });
        }
      } else {
        setError(res.error || "Login failed. Please try again.");
      }
    } catch (e) {
      setError(e.message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotError(""); setForgotSending(true);
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      setForgotError(t("enterEmail")); setForgotSending(false); return;
    }
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");
      const res = await fetch(apiBase + "/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) { setMode("reset_sent"); }
      else { setForgotError(data.error || "Failed to send reset email. Try again."); }
    } catch { setForgotError("Network error. Please try again."); }
    finally { setForgotSending(false); }
  };

  // ── Forgot Password: Email Input ──────────────────────────────────────────
  if (mode === "forgot") {
    return (
      <div className="animate-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 180px)", padding: 20 }}>
        <div className="card" style={{ maxWidth: 420, width: "100%" }}>
          <div style={{ padding: "32px 28px" }}>
            <button onClick={() => setMode("login")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--clr-text-muted)", marginBottom: 20, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <Icon name="chevronLeft" size={16} /> Back to Login
            </button>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", margin: "0 auto 14px", background: "linear-gradient(135deg, #FFF0E0, #FFD9B0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="lock" size={26} />
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>Forgot Password?</h2>
              <p style={{ fontSize: 13, color: "var(--clr-text-muted)", marginTop: 6 }}>Enter your registered email. We'll send a password reset link.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Registered Email *</label>
              <input className="form-input" type="email" value={forgotEmail}
                onChange={e => { setForgotEmail(e.target.value); setForgotError(""); }}
                placeholder="name@example.com" />
              {forgotError && <div style={{ color: "var(--clr-danger)", fontSize: 13, marginTop: 6 }}>⚠ {forgotError}</div>}
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={handleForgotPassword} disabled={forgotSending}>
              {forgotSending
                ? <span>Sending… <Icon name="loader" size={16} /></span>
                : <span>Send Reset Link <Icon name="mail" size={16} /></span>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Forgot Password: Success ──────────────────────────────────────────────
  if (mode === "reset_sent") {
    return (
      <div className="animate-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 180px)", padding: 20 }}>
        <div className="card" style={{ maxWidth: 420, width: "100%" }}>
          <div style={{ padding: "40px 28px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px", background: "linear-gradient(135deg, #e6ffed, #b2f5c8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="check" size={32} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Reset Link Sent!</h2>
            <p style={{ fontSize: 14, color: "var(--clr-text-muted)", marginBottom: 6 }}>A password reset link has been sent to</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--clr-saffron)", marginBottom: 24 }}>📧 {forgotEmail}</p>
            <button className="btn btn-primary btn-block" onClick={() => { setMode("login"); setForgotEmail(""); }}>
              Back to Login <Icon name="chevronRight" size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }



  const isAdminMode = loginMode === "admin";

  // ── Main Login Form ───────────────────────────────────────────────────────
  return (
    <div className="animate-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 180px)", padding: 20 }}>
      <div className="card" style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ padding: "32px 28px" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%", margin: "0 auto 14px",
              background: isAdminMode
                ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                : "linear-gradient(135deg, var(--clr-saffron), var(--clr-maroon))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", transition: "background 0.3s",
            }}>
              {isAdminMode
                ? <Icon name="shield" size={28} />
                : <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>A</span>
              }
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>
              {isAdminMode ? "Admin Login" : t("login")}
            </h2>
            <p style={{ fontSize: 13, color: "var(--clr-text-muted)", marginTop: 4 }}>
              {isAdminMode ? "Sign in to the Admin Panel" : t("appName")}
            </p>
          </div>


          {/* Member sub-tabs: Email / Profile ID — hidden in admin mode */}
          {!isAdminMode && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20, background: "var(--clr-bg-subtle)", borderRadius: "var(--radius-md)", padding: 4 }}>
              {["email", "profileId"].map(type => (
                <button key={type}
                  id={`login-type-${type}`}
                  style={{
                    flex: 1, padding: "7px 0", borderRadius: "var(--radius-sm)", border: "none",
                    cursor: "pointer", fontWeight: 600, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: loginType === type ? "var(--clr-white)" : "transparent",
                    color: loginType === type ? "var(--clr-saffron)" : "var(--clr-text-muted)",
                    boxShadow: loginType === type ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.2s",
                  }}
                  onClick={() => { setLoginType(type); setIdentifier(""); setError(""); }}>
                  <Icon name={type === "email" ? "mail" : "user"} size={14} />
                  {type === "email" ? t("email") : t("profileId")}
                </button>
              ))}
            </div>
          )}

          {/* Admin badge hint */}
          {isAdminMode && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 18,
              padding: "10px 14px", borderRadius: 8,
              background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
              border: "1px solid #ddd6fe",
            }}>
              <Icon name="shield" size={16} style={{ color: "#7c3aed", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#5b21b6", lineHeight: 1.4 }}>
                Admin accounts require an email and password set by the system administrator.
              </span>
            </div>
          )}

          {/* Identifier Input */}
          <div className="form-group">
            <label className="form-label">
              {isAdminMode ? "Admin Email *" : (loginType === "email" ? t("emailAddress") : t("profileId"))}
            </label>
            <input
              id="login-identifier"
              className="form-input"
              type={isAdminMode || loginType === "email" ? "email" : "text"}
              placeholder={isAdminMode ? "admin@example.com" : (loginType === "email" ? "name@example.com" : "e.g. AVS-GR-001")}
              value={identifier}
              onChange={e => {
                setIdentifier(e.target.value);
                setError("");
              }}
              style={isAdminMode ? { borderColor: "#7c3aed" } : {}}
            />
          </div>

          {/* Password Input */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              {!isAdminMode && (
                <span style={{ fontSize: 12, color: "var(--clr-saffron)", cursor: "pointer", fontWeight: 600 }}
                  onClick={() => { setMode("forgot"); setForgotEmail(loginType === "email" ? identifier : ""); setForgotError(""); }}>
                  Forgot Password?
                </span>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                className="form-input"
                type={showPass ? "text" : "password"}
                placeholder={t("confirmPassword")}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ paddingRight: 40, ...(isAdminMode ? { borderColor: "#7c3aed" } : {}) }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--clr-text-muted)" }}>
                <Icon name={showPass ? "eyeOff" : "eye"} size={16} />
              </button>
            </div>
          </div>

          {error && (
            <div style={{ color: "var(--clr-danger)", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "#fff5f5", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="alertCircle" size={15} /> {error}
            </div>
          )}

          <button
            id="login-submit"
            className="btn btn-block btn-lg"
            onClick={handleLogin}
            disabled={submitting}
            style={{
              background: isAdminMode
                ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                : "linear-gradient(135deg, var(--clr-saffron), var(--clr-maroon))",
              color: "white", border: "none", borderRadius: "var(--radius-md)",
              fontWeight: 700, fontSize: 15, padding: "12px 0",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              transition: "all 0.2s",
            }}>
            {submitting
              ? <span>Signing in… <Icon name="loader" size={16} /></span>
              : isAdminMode
                ? <span><Icon name="shield" size={16} /> Sign in as Admin</span>
                : <span>{t("login")} <Icon name="chevronRight" size={16} /></span>
            }
          </button>

          {!isAdminMode ? (
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--clr-text-muted)" }}>
              Don't have an account?{" "}
              <span style={{ color: "var(--clr-saffron)", cursor: "pointer", fontWeight: 600 }}
                onClick={() => dispatch({ type: "SET_PAGE", payload: "register" })}>
                {t("register")}
              </span>
            </div>
          ) : (
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--clr-text-muted)" }}>
              Not an admin?{" "}
              <span style={{ color: "#7c3aed", cursor: "pointer", fontWeight: 600 }}
                onClick={() => { setLoginMode("member"); setIdentifier(""); setError(""); }}>
                Log in as Member
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
