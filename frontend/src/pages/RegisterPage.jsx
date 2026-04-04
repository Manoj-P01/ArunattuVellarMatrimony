import { useState } from "react";
import { Icon } from "../components/Icon.jsx";
import { MobileSchema } from "../utils/validations.js";

export function RegisterPage({ state, dispatch, t }) {
  const [error, setError] = useState("");
  const { regData, regStep } = state;
  const update = (data) => dispatch({ type: "UPDATE_REG", payload: data });

  const steps = [
    { label: t("type"), icon: "user" },
    { label: t("personalDetails"), icon: "edit" },
    { label: "OTP", icon: "lock" },
  ];

  const handleRegister = () => {
    dispatch({
      type: "LOGIN",
      payload: {
        name: regData.name,
        email: regData.email,
        type: regData.type,
        profile_id: regData.type === "bride" ? "AVS-BR-004" : "AVS-GR-004",
      },
    });
  };

  return (
    <div className="animate-in" style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", minHeight: "calc(100vh - 180px)", padding: "32px 20px" }}>
      <div className="card" style={{ maxWidth: 520, width: "100%" }}>
        <div style={{ padding: "28px 24px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>
            {t("register")}
          </h2>
          <p style={{ fontSize: 13, color: "var(--clr-text-muted)", textAlign: "center", marginBottom: 24 }}>
            {t("appName")} - {t("tagline")}
          </p>

          {/* Steps */}
          <div className="steps">
            {steps.map((s, i) => (
              <div key={i} className="step-item">
                <div className={`step-circle ${i < regStep ? 'done' : i === regStep ? 'active' : ''}`}>
                  {i < regStep ? <Icon name="check" size={16} /> : i + 1}
                </div>
                <span className="step-label">{s.label}</span>
                {i < steps.length - 1 && <div className={`step-line ${i < regStep ? 'done' : ''}`} />}
              </div>
            ))}
          </div>

          {/* Step 0: Bride/Groom */}
          {regStep === 0 && (
            <div>
              <div className="form-label" style={{ marginBottom: 12 }}>{t("bride")} / {t("groom")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {["bride", "groom"].map(type => (
                  <button key={type} onClick={() => update({ type })}
                    style={{
                      padding: 20, borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "center",
                      border: `2px solid ${regData.type === type ? 'var(--clr-saffron)' : 'var(--clr-border)'}`,
                      background: regData.type === type ? "#FFF5F0" : "var(--clr-white)",
                      transition: "all 0.2s",
                    }}>
                    <div className={`avatar avatar-lg avatar-${type}`} style={{ margin: "0 auto 10px" }}>
                      <Icon name="user" size={28} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{t(type)}</div>
                  </button>
                ))}
              </div>
              <button className="btn btn-primary btn-block" style={{ marginTop: 24 }}
                onClick={() => dispatch({ type: "SET_REG_STEP", payload: 1 })}>
                {t("next")} <Icon name="chevronRight" size={16} />
              </button>
            </div>
          )}

          {/* Step 1: Details */}
          {regStep === 1 && (
            <div>
              <div className="form-group">
                <label className="form-label">{t("name")} *</label>
                <input className="form-input" value={regData.name} onChange={e => update({ name: e.target.value })} placeholder="Full Name" />
              </div>
              <div className="form-group">
                <label className="form-label">{t("email")} *</label>
                <input className="form-input" type="email" value={regData.email} onChange={e => update({ email: e.target.value })} placeholder="name@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">{t("whatsapp")} *</label>
                <input className="form-input" type="tel" value={regData.whatsapp} onChange={e => { update({ whatsapp: e.target.value.replace(/\D/g, '') }); setError(""); }} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={regData.sameAsWhatsapp} onChange={e => update({ sameAsWhatsapp: e.target.checked })} />
                  {t("sameAsWhatsapp")}
                </label>
              </div>
              {!regData.sameAsWhatsapp && (
                <div className="form-group">
                  <label className="form-label">{t("contact")} *</label>
                  <input className="form-input" type="tel" value={regData.contact} onChange={e => { update({ contact: e.target.value.replace(/\D/g, '') }); setError(""); }} placeholder="+91 XXXXX XXXXX" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">{t("altContact")} *</label>
                <input className="form-input" type="tel" value={regData.altContact} onChange={e => { update({ altContact: e.target.value.replace(/\D/g, '') }); setError(""); }} placeholder="Alternate contact number" />
              </div>
              {error && <div style={{ color: "var(--clr-saffron)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => dispatch({ type: "SET_REG_STEP", payload: 0 })}>
                  {t("previous")}
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }}
                  onClick={() => {
                    const wVal = MobileSchema.safeParse(regData.whatsapp || "");
                    if (!wVal.success) { setError("WhatsApp: " + wVal.error.issues[0].message); return; }
                    
                    if (!regData.sameAsWhatsapp) {
                      const cVal = MobileSchema.safeParse(regData.contact || "");
                      if (!cVal.success) { setError("Contact: " + cVal.error.issues[0].message); return; }
                    }

                    if (regData.altContact) {
                      const aVal = MobileSchema.safeParse(regData.altContact);
                      if (!aVal.success) { setError("Alt Contact: " + aVal.error.issues[0].message); return; }
                    }
                    
                    setError("");
                    update({ otpSent: true }); 
                    dispatch({ type: "SET_REG_STEP", payload: 2 }); 
                  }}>
                  {t("next")} <Icon name="chevronRight" size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: OTP */}
          {regStep === 2 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "var(--clr-text-muted)", marginBottom: 20 }}>
                OTP sent to <strong>{regData.email || "your email"}</strong>
              </div>
              <div className="form-group">
                <input className="form-input" type="text" placeholder="Enter 6-digit OTP"
                  value={regData.otp} onChange={e => update({ otp: e.target.value })} maxLength={6}
                  style={{ letterSpacing: 8, textAlign: "center", fontSize: 22, fontWeight: 700, maxWidth: 240, margin: "0 auto" }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--clr-success)", marginBottom: 20 }}>
                ✓ Demo: Enter any 6 digits to verify
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => dispatch({ type: "SET_REG_STEP", payload: 1 })}>
                  {t("previous")}
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRegister}>
                  {t("verifyOtp")} & {t("register")} <Icon name="check" size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
