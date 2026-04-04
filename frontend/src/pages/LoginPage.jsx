import { useState } from "react";
import { Icon } from "../components/Icon.jsx";
import { MobileSchema } from "../utils/validations.js";

export function LoginPage({ state, dispatch, t }) {
  const [loginType, setLoginType] = useState("email");
  const [value, setValue] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: loginType,
          identifier: value,
          otp: otp || "123456"
        })
      });
      const data = await response.json();
      
      if (data.success) {
        dispatch({
          type: "LOGIN",
          payload: {
            accessToken: data.accessToken,
            identifier: value,
            type: "bride", // Assuming mock data type mapped previously
          },
        });
      } else {
        const errorMsg = Array.isArray(data.errors) 
          ? data.errors[0].message 
          : (data.error || "Login Failed");
        setError(errorMsg);
      }
    } catch (e) {
      setError("Network err: API may be offline.");
    }
  };

  return (
    <div className="animate-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 180px)", padding: 20 }}>
      <div className="card" style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ padding: "32px 28px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px",
              background: "linear-gradient(135deg, var(--clr-saffron), var(--clr-maroon))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20,
            }}>A</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{t("login")}</h2>
            <p style={{ fontSize: 13, color: "var(--clr-text-muted)", marginTop: 4 }}>{t("appName")}</p>
          </div>

          {/* Login Type */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {["email", "mobile"].map(type => (
              <button key={type} className={`btn btn-sm ${loginType === type ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }} onClick={() => { setLoginType(type); setOtpSent(false); setValue(""); setOtp(""); }}>
                <Icon name={type === "email" ? "mail" : "phone"} size={14} />
                {type === "email" ? t("email") : "Mobile"}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">{loginType === "email" ? t("email") : "Mobile Number"}</label>
            <input className="form-input" type={loginType === "email" ? "email" : "tel"}
              placeholder={loginType === "email" ? "name@example.com" : "+91 XXXXX XXXXX"}
              value={value} onChange={e => {
                const parsed = loginType === "mobile" ? e.target.value.replace(/\D/g, '') : e.target.value;
                setValue(parsed);
                setError("");
              }} />
            {error && <div style={{ color: "var(--clr-saffron)", fontSize: 13, marginTop: 4 }}>{error}</div>}
          </div>

          {!otpSent ? (
            <button className="btn btn-primary btn-block btn-lg" onClick={() => {
              if (loginType === "mobile") {
                const val = MobileSchema.safeParse(value);
                if (!val.success) { setError(val.error.issues[0].message); return; }
              } else if (!value.trim()) {
                setError("Email is required"); return;
              }
              setOtpSent(true);
            }}>
              {t("sendOtp")} <Icon name="chevronRight" size={16} />
            </button>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">{t("enterOtp")}</label>
                <input className="form-input" type="text" placeholder="Enter 6-digit OTP"
                  value={otp} onChange={e => { setOtp(e.target.value); setError(""); }} maxLength={6}
                  style={{ letterSpacing: 8, textAlign: "center", fontSize: 20, fontWeight: 700 }} />
                <div style={{ fontSize: 12, color: "var(--clr-success)", marginTop: 6 }}>
                  ✓ OTP sent to {value || "your " + loginType} (Demo: use any 6 digits)
                </div>
                {error && <div style={{ color: "var(--clr-saffron)", fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</div>}
              </div>
              <button className="btn btn-primary btn-block btn-lg" onClick={handleLogin}>
                {t("verifyOtp")} & {t("login")} <Icon name="check" size={16} />
              </button>
            </>
          )}

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--clr-text-muted)" }}>
            Don't have an account?{" "}
            <span style={{ color: "var(--clr-saffron)", cursor: "pointer", fontWeight: 600 }}
              onClick={() => dispatch({ type: "SET_PAGE", payload: "register" })}>
              {t("register")}
            </span>
          </div>

          {/* Demo Admin Login */}
          <div style={{ borderTop: "1px solid var(--clr-border)", marginTop: 20, paddingTop: 16, textAlign: "center" }}>
            <button className="btn btn-sm btn-secondary" onClick={() => dispatch({ type: "LOGIN_ADMIN" })}>
              <Icon name="shield" size={14} /> Admin Demo Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
