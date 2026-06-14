import { useState, useEffect } from "react";
import { Icon } from "../components/Icon.jsx";
import PhoneInput from "../components/PhoneInput.jsx";
import { AVS_KOTHIRAMS } from "../constants/kothirams.js";

const base = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function validateToken(token) {
  const res = await fetch(`${base}/api/admin/invite?token=${token}`);
  return res.json();
}

async function checkEmail(email) {
  const res = await fetch(`${base}/api/admin/register?email=${encodeURIComponent(email)}`, { credentials: "include" });
  return res.json();
}

async function registerAdmin(body) {
  const res = await fetch(`${base}/api/admin/register`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function AdminRegisterPage({ token, dispatch, t }) {
  const [phase, setPhase]             = useState("validating"); // validating|email|account_check|form|success|error
  const [inviteInfo, setInviteInfo]   = useState(null);
  const [tokenError, setTokenError]   = useState("");

  // Email check step
  const [email, setEmail]             = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const [existingAccount, setExistingAccount] = useState(null); // { user, profile, adminDetails }

  // Registration form
  const [form, setForm]               = useState({ name: "", password: "", confirm: "", mobile: "+91|", whatsapp: "+91|", native_place: "", kothiram: "" });
  const [showPass, setShowPass]       = useState(false);
  const [formError, setFormError]     = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState(null);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Validate token on mount
  useEffect(() => {
    if (!token) { setPhase("error"); setTokenError("No invite token found in the link."); return; }
    validateToken(token).then(data => {
      if (data.valid) { setInviteInfo(data); setPhase("email"); }
      else            { setPhase("error"); setTokenError(data.error || "Invalid or expired invite link."); }
    }).catch(() => { setPhase("error"); setTokenError("Could not validate invite link."); });
  }, [token]);

  // Check if email exists
  const handleEmailCheck = async () => {
    if (!email.trim() || !email.includes("@")) { setFormError("Enter a valid email address"); return; }
    setEmailChecking(true); setFormError("");
    try {
      const data = await checkEmail(email.trim());
      setExistingAccount(data.exists ? data : null);
      if (data.exists) {
        // Pre-fill name if known
        if (data.user?.name) upd("name", data.user.name);
        if (data.adminDetails?.status === "active") {
          setTokenError("This email is already an active admin.");
          setPhase("error"); return;
        }
        if (data.adminDetails?.status === "pending") {
          // Already registered, awaiting approval
          setResult({ pending: true, name: data.user?.name, isUpgrade: true, hasProfile: !!data.profile, profile: data.profile });
          setPhase("success"); return;
        }
      }
      setPhase("form");
    } catch { setFormError("Network error. Try again."); }
    finally { setEmailChecking(false); }
  };

  // Submit registration
  const handleSubmit = async () => {
    setFormError("");
    if (!form.name.trim())                         return setFormError("Name is required");
    if (form.password.length < 6)                  return setFormError("Password must be at least 6 characters");
    if (form.password !== form.confirm)            return setFormError("Passwords do not match");
    if (!form.mobile.trim())                       return setFormError("Mobile number is required");

    setSubmitting(true);
    try {
      const res = await registerAdmin({
        token, name: form.name.trim(), email: email.trim(), password: form.password,
        mobile: form.mobile.trim(), whatsapp: form.whatsapp.trim(),
        native_place: form.native_place.trim(), kothiram: form.kothiram.trim(),
      });
      if (res.success) { setResult(res); setPhase("success"); }
      else setFormError(res.error || "Registration failed. Please try again.");
    } catch { setFormError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  };

  // Password strength
  const strength = (() => {
    const p = form.password;
    return (p.length >= 8 ? 1 : 0) + (/[A-Z]/.test(p) ? 1 : 0) + (/[0-9]/.test(p) ? 1 : 0) + (/[^A-Za-z0-9]/.test(p) ? 1 : 0);
  })();
  const strColors = ["#e53e3e","#dd6b20","#d69e2e","#38a169"];
  const strLabels = ["Weak","Fair","Good","Strong"];

  const expiresIn = inviteInfo?.expires_at
    ? (() => { const hrs = Math.floor((new Date(inviteInfo.expires_at) - Date.now()) / 3600000); return hrs > 0 ? `${hrs}h remaining` : "expires soon"; })()
    : "";

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === "validating") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <div style={{ textAlign:"center" }}>
        <Icon name="loader" size={40} style={{ color:"var(--clr-saffron)" }} />
        <p style={{ color:"var(--clr-text-muted)", marginTop:12 }}>Verifying invite link…</p>
      </div>
    </div>
  );

  // ── Invalid token ─────────────────────────────────────────────────────────
  if (phase === "error") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:20 }}>
      <div className="card" style={{ maxWidth:420, width:"100%", textAlign:"center", padding:"40px 28px" }}>
        <span style={{ fontSize:48 }}>🔗</span>
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, marginTop:16, marginBottom:8, color:"var(--clr-danger)" }}>
          Invalid Invite Link
        </h2>
        <p style={{ fontSize:14, color:"var(--clr-text-muted)", marginBottom:24 }}>{tokenError}</p>
        <button className="btn btn-secondary" onClick={() => dispatch({ type:"SET_PAGE", payload:"login" })}>
          ← Go to Login
        </button>
      </div>
    </div>
  );

  // ── Success / Pending ─────────────────────────────────────────────────────
  if (phase === "success") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:20 }}>
      <div className="card" style={{ maxWidth:480, width:"100%", textAlign:"center", padding:"40px 28px" }}>
        <div style={{ width:80, height:80, borderRadius:"50%", margin:"0 auto 20px",
          background:"linear-gradient(135deg,#FFF0E0,var(--clr-saffron))",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon name="shield" size={36} style={{ color:"white" }} />
        </div>
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:700, marginBottom:8 }}>
          ⏳ Awaiting Admin Approval
        </h2>
        <p style={{ fontSize:14, color:"var(--clr-text-muted)", marginBottom:16 }}>
          {result?.isUpgrade
            ? "Your existing account has been submitted for admin upgrade."
            : "Your admin registration has been received."}
        </p>
        <div style={{ background:"#FFF8E1", border:"1px solid #FFD54F", borderRadius:8, padding:"12px 16px", margin:"16px 0", fontSize:13 }}>
          ⏳ An existing admin must approve your request before you can access the admin panel. You'll receive a notification once approved.
        </div>
        {result?.hasProfile && (
          <div style={{ background:"#E3F0F8", border:"1px solid #90CAF9", borderRadius:8, padding:"10px 16px", margin:"8px 0", fontSize:13, color:"#1a3a5c" }}>
            ℹ️ You also have a <strong>{result?.profile?.profile_type}</strong> profile ({result?.profile?.profile_id || "pending"}). After admin approval, you can switch between Admin and Member roles.
          </div>
        )}
        <button className="btn btn-primary btn-lg" style={{ marginTop:20, width:"100%" }}
          onClick={() => dispatch({ type:"SET_PAGE", payload:"login" })}>
          <Icon name="chevronRight" size={16} /> Go to Login
        </button>
      </div>
    </div>
  );

  // ── Email step ────────────────────────────────────────────────────────────
  if (phase === "email") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:20, background:"var(--clr-bg)" }}>
      <div className="card" style={{ maxWidth:460, width:"100%" }}>
        <div style={{ padding:"32px 28px" }}>
          <div style={{ textAlign:"center", marginBottom:24 }}>
            <div style={{ width:64, height:64, borderRadius:"50%", margin:"0 auto 14px",
              background:"linear-gradient(135deg,var(--clr-saffron),var(--clr-maroon))",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="shield" size={28} style={{ color:"white" }} />
            </div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:700 }}>Admin Registration</h2>
            <p style={{ fontSize:13, color:"var(--clr-text-muted)", marginTop:4 }}>AVS Matrimony — Admin Invite</p>
            {expiresIn && (
              <span style={{ fontSize:11, color:"#E65100", background:"#FFF3E0", border:"1px solid #FFE082", borderRadius:4, padding:"2px 8px", display:"inline-block", marginTop:6 }}>
                ⏱ Invite {expiresIn}
              </span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input className="form-input" type="email" value={email}
              placeholder="name@example.com"
              onChange={e => { setEmail(e.target.value); setFormError(""); }}
              onKeyDown={e => e.key === "Enter" && handleEmailCheck()} />
            {formError && <div style={{ color:"var(--clr-danger)", fontSize:13, marginTop:6 }}>⚠ {formError}</div>}
          </div>
          <button className="btn btn-primary btn-block btn-lg" onClick={handleEmailCheck} disabled={emailChecking}>
            {emailChecking
              ? <span>Checking… <Icon name="loader" size={16} /></span>
              : <span>Continue <Icon name="chevronRight" size={16} /></span>}
          </button>
          <div style={{ textAlign:"center", marginTop:16, fontSize:13, color:"var(--clr-text-muted)" }}>
            Already have an account?{" "}
            <span style={{ color:"var(--clr-saffron)", cursor:"pointer", fontWeight:600 }}
              onClick={() => dispatch({ type:"SET_PAGE", payload:"login" })}>Login</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Registration Form ─────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:20, background:"var(--clr-bg)" }}>
      <div className="card" style={{ maxWidth:540, width:"100%" }}>
        <div style={{ padding:"32px 28px" }}>
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div style={{ width:56, height:56, borderRadius:"50%", margin:"0 auto 12px",
              background:"linear-gradient(135deg,var(--clr-saffron),var(--clr-maroon))",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="shield" size={24} style={{ color:"white" }} />
            </div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700 }}>Admin Registration</h2>
            <p style={{ fontSize:12, color:"var(--clr-saffron)", fontWeight:600, marginTop:4 }}>{email}</p>
          </div>

          {/* Existing account notice */}
          {existingAccount?.exists && (
            <div style={{ background:"#E3F0F8", border:"1px solid #90CAF9", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#1a3a5c" }}>
              <strong>ℹ️ Existing account found</strong>
              {existingAccount.profile && (
                <div style={{ marginTop:4 }}>
                  You have a <strong>{existingAccount.profile.profile_type}</strong> profile ({existingAccount.profile.profile_id || "pending approval"}).
                  After admin approval you can switch between Admin and Member roles.
                </div>
              )}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {/* Name */}
            <div className="form-group" style={{ marginBottom:0, gridColumn:"span 2" }}>
              <label className="form-label">Full Name *</label>
              <input className="form-input" type="text" value={form.name}
                placeholder="Your full name"
                onChange={e => { upd("name", e.target.value); setFormError(""); }} />
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Password *</label>
              <div style={{ position:"relative" }}>
                <input className="form-input" type={showPass ? "text" : "password"} value={form.password}
                  placeholder="Min. 6 characters" style={{ paddingRight:40 }}
                  onChange={e => { upd("password", e.target.value); setFormError(""); }} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--clr-text-muted)" }}>
                  <Icon name={showPass ? "eyeOff" : "eye"} size={15} />
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop:4 }}>
                  <div style={{ display:"flex", gap:3 }}>
                    {[0,1,2,3].map(i => <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i < strength ? strColors[strength-1] : "var(--clr-border)" }} />)}
                  </div>
                  <span style={{ fontSize:10, color:strColors[strength-1] }}>{strLabels[strength-1]||""}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Confirm Password *</label>
              <input className="form-input" type="password" value={form.confirm}
                placeholder="Re-enter password"
                style={{ borderColor: form.confirm && form.password !== form.confirm ? "var(--clr-danger)" : undefined }}
                onChange={e => { upd("confirm", e.target.value); setFormError(""); }} />
              {form.confirm && form.password !== form.confirm && (
                <div style={{ fontSize:11, color:"var(--clr-danger)", marginTop:2 }}>⚠ Mismatch</div>
              )}
            </div>

            {/* Mobile */}
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Mobile Number *</label>
              <PhoneInput
                value={form.mobile}
                placeholder="Phone number"
                onChange={v => { upd("mobile", v); setFormError(""); }}
              />
            </div>

            {/* WhatsApp */}
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">WhatsApp Number</label>
              <PhoneInput
                value={form.whatsapp}
                placeholder="Same as mobile or different"
                onChange={v => upd("whatsapp", v)}
              />
            </div>

            {/* Native Place */}
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Native Place</label>
              <input className="form-input" type="text" value={form.native_place}
                placeholder="e.g. Karur, Salem…"
                onChange={e => upd("native_place", e.target.value)} />
            </div>

            {/* Kothiram */}
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Kothiram</label>
              <select className="form-input" value={form.kothiram}
                onChange={e => upd("kothiram", e.target.value)}>
                <option value="">— Select Kothiram —</option>
                {AVS_KOTHIRAMS.map(k => (
                  <option key={k.en} value={k.en}>{k.en} — {k.ta}</option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <div style={{ color:"var(--clr-danger)", fontSize:13, margin:"14px 0",
              padding:"10px 14px", background:"#fff5f5", borderRadius:8,
              display:"flex", alignItems:"center", gap:8 }}>
              <Icon name="alertCircle" size={15} /> {formError}
            </div>
          )}

          <div style={{ background:"#FFF8E1", border:"1px solid #FFD54F", borderRadius:8, padding:"10px 14px", margin:"16px 0", fontSize:12, color:"#856404" }}>
            ℹ️ Your admin account will require approval from an existing admin before activation.
          </div>

          <button className="btn btn-primary btn-block btn-lg"
            onClick={handleSubmit}
            disabled={submitting || (form.confirm && form.password !== form.confirm)}>
            {submitting
              ? <span>Submitting… <Icon name="loader" size={16} /></span>
              : <span><Icon name="shield" size={16} /> Submit Admin Registration</span>}
          </button>

          <button style={{ marginTop:12, background:"none", border:"none", color:"var(--clr-text-muted)", fontSize:13, cursor:"pointer", width:"100%", textAlign:"center" }}
            onClick={() => setPhase("email")}>
            ← Change email
          </button>
        </div>
      </div>
    </div>
  );
}
