import { useState, useEffect, useCallback } from "react";
import { Icon } from "../components/Icon.jsx";
import PhoneInput, { toInternational, formatPhone } from "../components/PhoneInput.jsx";
import { MobileSchema } from "../utils/validations.js";
import { EDUCATIONS, OCCUPATIONS, MOTHER_OCCUPATIONS, MARITAL_STATUSES } from "../constants/options.js";
import { RASIS, NATCHATHIRAMS, DOSHAM_TYPES, LAGNAM_POSITIONS, getNatchathiramsByRasi, getPadamsForRasi } from "../constants/jothidam.js";
import { AVS_KOTHIRAMS } from "../utils/validateKothiram.js";
import { apiSendOtp, apiRegister } from "../api/client.js";

// ── Height picker (ft & in OR cm) ─────────────────────────────────────────────
function HeightPicker({ value, onChange }) {
  const [unit, setUnit] = useState(() => (value || "").includes("cm") ? "cm" : "ft");
  const [feet, setFeet] = useState(() => {
    const m = (value || "").match(/^(\d+)'(\d+)"/);
    return m ? m[1] : "5";
  });
  const [inches, setInches] = useState(() => {
    const m = (value || "").match(/^(\d+)'(\d+)"/);
    return m ? m[2] : "0";
  });
  const [cm, setCm] = useState(() => {
    const m = (value || "").match(/^(\d+)\s*cm/);
    return m ? m[1] : "160";
  });

  const emit = useCallback((u, f, i, c) => {
    onChange(u === "ft" ? `${f}'${i}"` : `${c} cm`);
  }, [onChange]);

  const handleUnit = (u) => {
    setUnit(u);
    if (u === "ft") {
      // Convert cm → ft/in
      const totalIn = Math.round(parseInt(cm || 160) / 2.54);
      const f = String(Math.floor(totalIn / 12));
      const i = String(totalIn % 12);
      setFeet(f); setInches(i);
      emit("ft", f, i, cm);
    } else {
      // Convert ft/in → cm
      const c = String(Math.round((parseInt(feet || 5) * 12 + parseInt(inches || 0)) * 2.54));
      setCm(c);
      emit("cm", feet, inches, c);
    }
  };

  const feetOpts = Array.from({ length: 5 }, (_, i) => String(i + 4));   // 4–8
  const inchesOpts = Array.from({ length: 12 }, (_, i) => String(i));       // 0–11

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {/* Unit toggle */}
      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--clr-border)", flexShrink: 0 }}>
        {["ft", "cm"].map(u => (
          <button key={u} type="button"
            onClick={() => handleUnit(u)}
            style={{
              padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
              background: unit === u ? "var(--clr-saffron)" : "var(--clr-bg)",
              color: unit === u ? "white" : "var(--clr-text-muted)",
            }}>
            {u === "ft" ? "ft & in" : "cm"}
          </button>
        ))}
      </div>

      {unit === "ft" ? (
        <>
          <select className="form-input" style={{ flex: 1, minWidth: 80, margin: 0 }}
            value={feet}
            onChange={e => { setFeet(e.target.value); emit("ft", e.target.value, inches, cm); }}>
            {feetOpts.map(f => <option key={f} value={f}>{f} ft</option>)}
          </select>
          <select className="form-input" style={{ flex: 1, minWidth: 80, margin: 0 }}
            value={inches}
            onChange={e => { setInches(e.target.value); emit("ft", feet, e.target.value, cm); }}>
            {inchesOpts.map(i => <option key={i} value={i}>{i} in</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--clr-text-muted)", whiteSpace: "nowrap" }}>
            = {Math.round((parseInt(feet || 5) * 12 + parseInt(inches || 0)) * 2.54)} cm
          </span>
        </>
      ) : (
        <>
          <input className="form-input" type="number" min={100} max={250}
            style={{ flex: 1, maxWidth: 82, margin: 0 }}
            value={cm}
            onChange={e => { setCm(e.target.value); emit("cm", feet, inches, e.target.value); }}
            placeholder="e.g. 165"
          />
          <span style={{ fontSize: 12, color: "var(--clr-text-muted)", whiteSpace: "nowrap" }}>cm</span>
        </>
      )}
    </div>
  );
}

// SIBLING_MARRIED and STEPS are defined inside the component (dynamic, uses t())

function Field({ label, required, children, hint }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">
        {label} {required && <span style={{ color: "var(--clr-danger)" }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ color: "var(--clr-danger)", fontSize: 13, margin: "12px 0", padding: "10px 14px", background: "#fff5f5", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name="alertCircle" size={14} /> {msg}
    </div>
  );
}

export function RegisterPage({ state, dispatch, t }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { regData, regStep } = state;

  // Dynamic arrays — depend on t() for translation
  const SIBLING_MARRIED = [
    { v: "", l: `— ${t("select") || "Select"} —` },
    { v: "all_married", l: t("allMarried") },
    { v: "all_unmarried", l: t("allUnmarried") },
    { v: "partially_married", l: t("partiallyMarried") },
  ];
  const STEPS = [
    { label: t("type"), icon: "user" },
    { label: t("register"), icon: "lock" },
    { label: "Lineage & Location", icon: "globe" },
    { label: t("jothidamDetails"), icon: "star" },
    { label: t("aboutAndFamily"), icon: "edit" },
    { label: "Preview", icon: "eye" },
    { label: t("verifyOtp"), icon: "mail" },
  ];
  const update = (data) => dispatch({ type: "UPDATE_REG", payload: data });
  const go = (step) => { dispatch({ type: "SET_REG_STEP", payload: step }); setError(""); };

  // ── Auto-send OTP every time Step 6 is entered (fresh OTP each visit) ──────
  useEffect(() => {
    if (regStep === 6 && regData.email) {
      // Always reset + send fresh OTP — handles retries after failed submissions
      setOtpSent(false);
      setOtpSending(true);
      setError("");
      update({ otp: "" });
      apiSendOtp({ type: "email", identifier: regData.email })
        .then(() => {
          setOtpSent(true);
          setOtpSending(false);
        })
        .catch((err) => {
          setError("Could not send OTP: " + (err.message || "Try again"));
          setOtpSending(false);
        });
    }
  }, [regStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const resendOtp = () => {
    setOtpSent(false);
    setOtpSending(true);
    setError("");
    update({ otp: "" });
    apiSendOtp({ type: "email", identifier: regData.email })
      .then(() => { setOtpSent(true); setOtpSending(false); })
      .catch((err) => { setError("Resend failed: " + (err.message || "Try again")); setOtpSending(false); });
  };

  // ── Validators per step ──────────────────────────────────────────────────
  const validateStep = (step) => {
    const d = regData;
    switch (step) {
      case 1: {
        if (!d.name?.trim()) return t("fullName") + " " + t("notSet");
        if (!d.email?.trim() || !d.email.includes("@")) return t("emailAddress") + " " + t("notSet");
        const wv = MobileSchema.safeParse(d.whatsapp || "");
        if (!wv.success) return "WhatsApp: " + wv.error.issues[0].message;
        if (!d.sameAsWhatsapp) {
          const cv = MobileSchema.safeParse(d.contact || "");
          if (!cv.success) return "Contact: " + cv.error.issues[0].message;
        }
        if (!d.password || d.password.length < 6) return t("confirmPassword");
        if (d.password !== d.confirmPassword) return t("passwordMismatch");
        // Height, Marital Status, Education, Occupation
        if (!d.height?.trim()) return t("height") + " " + t("notSet");
        if (!d.marital_status) return t("maritalStatus") + " " + t("notSet");
        if (!d.education) return t("education") + " " + t("notSet");
        if (d.education === "other" && !d.education_other?.trim()) return "Please specify your education";
        if (!d.occupation) return t("occupation") + " " + t("notSet");
        if (d.occupation === "Other" && !d.occupation_other?.trim()) return "Please specify your occupation";
        if (!d.district?.trim()) return t("district") + " " + t("notSet");
        if (!d.state?.trim()) return t("state") + " " + t("notSet");
        if (!d.country?.trim()) return t("country") + " " + t("notSet");
        return null;
      }
      case 2: {
        // Lineage & Location
        if (!d.kothiram?.trim() && d.is_avs !== false) return "Kothiram is required";
        if (d.is_avs !== false && d.kothiram_is_avs !== false) {
          //const kv = validateKothiram(d.kothiram);
          //if (!kv.matched) return `கோத்திரம் சரியில்லை — "${d.kothiram}" ஆறுநாட்டு வேளாளர் கோத்திரங்களில் இல்லை. சரியான கோத்திரப் பெயரை உள்ளிடவும். (Kothiram not recognised. Please check spelling or contact admin.)`;
        }
        if (d.is_hindu !== true && d.is_hindu !== undefined && !d.custom_religion?.trim()) return "Please specify your religion";
        if (d.is_avs !== true && d.is_avs !== undefined && !d.custom_community?.trim()) return "Please specify your community";
        if (!d.native_place?.trim()) return t("nativePlaceLabel") + " " + t("notSet");
        return null;
      }
      case 3: {
        // Jothidam — DOB/BirthTime/BirthPlace validated here too
        if (!d.dob) return t("dob") + " " + t("notSet");
        if (!d.birth_time?.trim()) return t("birthTime") + " " + t("notSet");
        if (!d.birth_place?.trim()) return t("birthPlace") + " " + t("notSet");
        if (!d.rasi) return t("rasi") + " " + t("notSet");
        if (!d.natchathiram) return t("natchathiram") + " " + t("notSet");
        if (!d.patham) return t("patham") + " " + t("notSet");
        if (!d.dosham) return t("dosham") + " " + t("notSet");
        return null;
      }
      case 4: {
        // About + Expectations
        if (!d.about?.trim()) return t("aboutMe") + " " + t("notSet");
        if (!d.expectations?.trim()) return t("expectations") + " " + t("notSet");
        // Parents
        if (!d.father_name?.trim()) return t("fatherName") + " " + t("notSet");
        if (!d.father_kothiram?.trim()) return t("fatherKothiram") + " " + t("notSet");
        if (d.father_kothiram_is_avs !== false) {
          //const fkv = validateKothiram(d.father_kothiram);
          //if (!fkv.matched) return `தந்தையின் கோத்திரம் சரியில்லை — "${d.father_kothiram}" ஆறுநாட்டு வேளாளர் கோத்திரங்களில் இல்லை. (Father's kothiram not recognised.)`;
        }
        if (!d.father_occupation?.trim()) return "Father's occupation is required";
        if (d.father_occupation === "Other" && !d.father_occupation_other?.trim()) return "Please specify father's occupation";
        const fmv = MobileSchema.safeParse(d.father_mobile || "");
        if (!fmv.success) return "Father's Mobile: " + fmv.error.issues[0].message;
        if (d.father_whatsapp_same === false) {
          const fwv = MobileSchema.safeParse(d.father_whatsapp || "");
          if (!fwv.success) return "Father's WhatsApp: " + fwv.error.issues[0].message;
        }
        if (!d.mother_name?.trim()) return t("motherName") + " " + t("notSet");
        if (!d.mother_kothiram?.trim()) return t("motherKothiram") + " " + t("notSet");
        if (d.mother_kothiram_is_avs !== false) {
          //const mkv = validateKothiram(d.mother_kothiram);
          //if (!mkv.matched) return `தாயின் கோத்திரம் சரியில்லை — "${d.mother_kothiram}" ஆறுநாட்டு வேளாளர் கோத்திரங்களில் இல்லை. (Mother's kothiram not recognised.)`;
        }
        if (!d.mother_occupation?.trim()) return "Mother's occupation is required";
        if (d.mother_occupation === "Other" && !d.mother_occupation_other?.trim()) return "Please specify mother's occupation";
        const motherMobileNum = (d.mother_mobile || "").includes("|")
          ? (d.mother_mobile.split("|")[1] || "")
          : d.mother_mobile;
        if (motherMobileNum) {
          const mmv = MobileSchema.safeParse(d.mother_mobile || "");
          if (!mmv.success) return "Mother's Mobile: " + mmv.error.issues[0].message;
          if (d.mother_whatsapp_same === false) {
            const mwv = MobileSchema.safeParse(d.mother_whatsapp || "");
            if (!mwv.success) return "Mother's WhatsApp: " + mwv.error.issues[0].message;
          }
        }
        // Sibling married counts must not exceed total
        const eb = parseInt(d.elder_brothers || 0), yb = parseInt(d.younger_brothers || 0);
        const es = parseInt(d.elder_sisters || 0), ys = parseInt(d.younger_sisters || 0);
        if (parseInt(d.elder_brothers_married || 0) > eb) return "Married elder brothers cannot exceed total";
        if (parseInt(d.younger_brothers_married || 0) > yb) return "Married younger brothers cannot exceed total";
        if (parseInt(d.elder_sisters_married || 0) > es) return "Married elder sisters cannot exceed total";
        if (parseInt(d.younger_sisters_married || 0) > ys) return "Married younger sisters cannot exceed total";
        if (!d.living_country?.trim()) return "Country (Currently living in) is required";
        if (!d.living_state?.trim()) return "State (Currently living in) is required";
        if (!d.living_district?.trim()) return "District (Currently living in) is required";
        return null;
      }
      case 5: {
        // Preview step — no required validation
        return null;
      }
      case 6: {
        if (!d.otp || d.otp.length < 6) return t("enterOtp");
        return null;
      }
      default: return null;
    }
  };

  const nextStep = (from) => {
    const err = validateStep(from);
    if (err) { setError(err); return; }
    setError("");
    // After step 5 (About+Family), go to OTP (step 6)
    go(from + 1);
  };

  const handleComplete = async () => {
    const err = validateStep(6);
    if (err) { setError(err); return; }
    setSubmitting(true);
    setError("");

    try {
      // ── Build profile payload mapped to DB columns ───────────────────────
      const familyDetails = JSON.stringify({
        father_name: regData.father_name,
        father_kothiram: regData.father_kothiram,
        father_occupation: regData.father_occupation === "Other" ? (regData.father_occupation_other || "Other") : regData.father_occupation,
        mother_name: regData.mother_name,
        mother_kothiram: regData.mother_kothiram,
        mother_occupation: regData.mother_occupation === "Other" ? (regData.mother_occupation_other || "Other") : regData.mother_occupation,
        father_mobile: toInternational(regData.father_mobile),
        father_whatsapp: toInternational(regData.father_whatsapp_same !== false ? regData.father_mobile : regData.father_whatsapp),
        mother_mobile: toInternational(regData.mother_mobile),
        mother_whatsapp: toInternational(regData.mother_whatsapp_same !== false ? regData.mother_mobile : regData.mother_whatsapp),
        // Siblings — elder/younger split with married counts
        elder_brothers: regData.elder_brothers || "0",
        elder_brothers_married: regData.elder_brothers_married || "0",
        younger_brothers: regData.younger_brothers || "0",
        younger_brothers_married: regData.younger_brothers_married || "0",
        elder_sisters: regData.elder_sisters || "0",
        elder_sisters_married: regData.elder_sisters_married || "0",
        younger_sisters: regData.younger_sisters || "0",
        younger_sisters_married: regData.younger_sisters_married || "0",
        birth_time: regData.birth_time,
        birth_place: regData.birth_place,
        rasi: regData.rasi,
        natchathiram: regData.natchathiram,
        patham: regData.patham,
        dosham: regData.dosham,
        sevvai_position: regData.sevvai_position,
        ragu_position: regData.ragu_position,
        kedhu_position: regData.kedhu_position,
        expectations: regData.expectations,
        native_place: regData.native_place,
      });

      const profilePayload = {
        profile_type: regData.type,           // 'bride' or 'groom'
        name: regData.name,
        date_of_birth: regData.dob,            // backend maps → dob; age auto-calc by DB trigger
        password: regData.password,
        height: regData.height,
        marital_status: regData.marital_status || "never_married",
        // For education/occupation store the "Other" text if applicable
        education: regData.education === "other" ? (regData.education_other || "Other") : regData.education,
        occupation: regData.occupation === "Other" ? (regData.occupation_other || "Other") : regData.occupation,
        monthly_salary: regData.monthly_salary || null,
        // Religion & Community — pass the raw flags so backend can derive the stored value
        is_hindu: regData.is_hindu !== false,
        custom_religion: regData.custom_religion || null,
        is_avs: regData.is_avs !== false,
        custom_community: regData.custom_community || null,
        kothiram: regData.kothiram,       // direct — no longer aliased as sub_caste
        country: regData.country,
        state: regData.state,
        district: regData.district,
        living_country: regData.living_country || "India",
        living_state: regData.living_state || "",
        living_district: regData.living_district || "",
        about_me: regData.about,
        about_me_privacy: "public",
        social_links_privacy: regData.social_links_privacy || "public",
        contact_privacy: regData.contact_privacy || "public",
        social_links: regData.social_links || [],
        family_details: familyDetails,          // backend parses this JSON into individual columns
        photo_privacy: "public",
        // Convert "+91|9876543210" → "+919876543210" before sending to backend
        whatsapp: toInternational(regData.whatsapp),
        contact: toInternational(regData.sameAsWhatsapp ? regData.whatsapp : regData.contact),
        father_mobile: toInternational(regData.father_mobile),
        father_whatsapp: toInternational(regData.father_whatsapp_same !== false ? regData.father_mobile : regData.father_whatsapp),
        mother_mobile: toInternational(regData.mother_mobile),
        mother_whatsapp: toInternational(regData.mother_whatsapp_same !== false ? regData.mother_mobile : regData.mother_whatsapp),
      };

      // ── Single call: OTP verify + user create + profile insert ───────────
      // Uses service-role on the backend — no session cookie needed.
      const result = await apiRegister({
        identifier: regData.email,
        otp: regData.otp,
        profile: profilePayload,
      });

      if (!result.success) {
        setError(result.error || "Registration failed. Please try again.");
        setSubmitting(false);
        return;
      }

      // ── Update local state with real DB data ─────────────────────────────
      dispatch({
        type: "COMPLETE_REGISTRATION",
        payload: {
          regData,
          dbProfile: result.profile,
          dbUser: result.user,
        },
      });

    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step indicator (compact scrollable) ─────────────────────────────────
  const StepBar = () => (
    <div style={{ display: "flex", overflowX: "auto", gap: 0, marginBottom: 24, paddingBottom: 4 }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 52 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, transition: "all 0.2s",
              background: i < regStep ? "var(--clr-success)" : i === regStep ? "var(--clr-saffron)" : "var(--clr-bg-subtle)",
              color: i <= regStep ? "white" : "var(--clr-text-muted)",
              border: i === regStep ? "2px solid var(--clr-saffron)" : "2px solid transparent",
            }}>
              {i < regStep ? <Icon name="check" size={14} /> : i + 1}
            </div>
            <span style={{ fontSize: 9, marginTop: 3, color: i === regStep ? "var(--clr-saffron)" : "var(--clr-text-muted)", fontWeight: i === regStep ? 700 : 400, textAlign: "center" }}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 20, height: 2, background: i < regStep ? "var(--clr-success)" : "var(--clr-border)", margin: "0 2px", marginBottom: 16, flexShrink: 0 }} />
          )}
        </div>
      ))}
    </div>
  );

  const NavButtons = ({ step, disableNext }) => (
    <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
      {step > 0 && (
        <button className="btn btn-secondary" onClick={() => go(step - 1)}>
          <Icon name="chevronLeft" size={16} /> {t("back")}
        </button>
      )}
      <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => nextStep(step)} disabled={disableNext}>
        {t("next")} <Icon name="chevronRight" size={16} />
      </button>
    </div>
  );

  return (
    <div className="animate-in" style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", minHeight: "calc(100vh - 68px)", padding: "24px 16px" }}>
      <div className="card" style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ padding: "24px 24px 28px" }}>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 2, textAlign: "center" }}>
            {t("register")} — {STEPS[regStep]?.label}
          </h2>
          <p style={{ fontSize: 12, color: "var(--clr-text-muted)", textAlign: "center", marginBottom: 20 }}>
            {t("step")} {regStep + 1} / {STEPS.length}
          </p>

          <StepBar />

          {/* ── Step 0: Type ── */}
          {regStep === 0 && (
            <div>
              <div className="form-label" style={{ marginBottom: 12, fontSize: 14 }}>I am registering as *</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {["bride", "groom"].map(type => (
                  <button key={type} onClick={() => update({ type })}
                    style={{
                      padding: 20, borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "center",
                      border: `2px solid ${regData.type === type ? "var(--clr-saffron)" : "var(--clr-border)"}`,
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
              <button className="btn btn-primary btn-block" style={{ marginTop: 24 }} onClick={() => go(1)}>
                {t("next")} <Icon name="chevronRight" size={16} />
              </button>
              <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--clr-text-muted)" }}>
                {t("If already have an account! ")}
                <span style={{ color: "var(--clr-saffron)", cursor: "pointer", fontWeight: 600 }}
                  onClick={() => dispatch({ type: "SET_PAGE", payload: "login" })}>
                  {t("login")}
                </span>
              </div>
            </div>
          )}

          {/* ── Step 1: Account + Education/Occupation/Height/Marital Status ── */}
          {regStep === 1 && (
            <div>
              <div style={{ display: "grid", gap: 14 }}>
                {/* ── Account Section ── */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clr-saffron)", borderBottom: "1px solid var(--clr-border)", paddingBottom: 6 }}>
                  {regData.type === "bride" ? "Bride Details" : regData.type === "groom" ? "Groom Details" : "Account Details"}
                </div>
                <Field label={t("fullName")} required>
                  <input className="form-input" value={regData.name || ""} placeholder="Your full name"
                    onChange={e => { update({ name: e.target.value }); setError(""); }} />
                </Field>
                <Field label={t("emailAddress")} required hint={t("otpSent")}>
                  <input className="form-input" type="email" value={regData.email || ""} placeholder="name@example.com"
                    onChange={e => { update({ email: e.target.value }); setError(""); }} />
                </Field>
                <Field label={t("whatsapp")} required>
                  <PhoneInput
                    value={regData.whatsapp || ""}
                    placeholder="Phone number"
                    onChange={v => { update({ whatsapp: v }); setError(""); }}
                  />
                </Field>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={regData.sameAsWhatsapp !== false}
                      onChange={e => update({ sameAsWhatsapp: e.target.checked })} />
                    Contact same as WhatsApp
                  </label>
                </div>
                {regData.sameAsWhatsapp === false && (
                  <Field label={t("contact")} required>
                    <PhoneInput
                      value={regData.contact || ""}
                      placeholder="Phone number"
                      onChange={v => { update({ contact: v }); setError(""); }}
                    />
                  </Field>
                )}
                <Field label="Show Contact & WhatsApp Number to other profiles? *" required>
                  <select className="form-input" value={regData.contact_privacy || "public"}
                    onChange={e => { update({ contact_privacy: e.target.value }); setError(""); }}>
                    <option value="public">Yes</option>
                    <option value="accepted">No (Hide from other profiles)</option>
                  </select>
                </Field>
                <Field label="Password" required>
                  <div style={{ position: "relative" }}>
                    <input className="form-input" type={showPass ? "text" : "password"} value={regData.password || ""}
                      placeholder="Create a password" style={{ paddingRight: 40 }}
                      onChange={e => { update({ password: e.target.value }); setError(""); }} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--clr-text-muted)" }}>
                      <Icon name={showPass ? "eyeOff" : "eye"} size={16} />
                    </button>
                  </div>
                  {regData.password && (() => {
                    const p = regData.password;
                    const s = (p.length >= 8 ? 1 : 0) + (/[A-Z]/.test(p) ? 1 : 0) + (/[0-9]/.test(p) ? 1 : 0) + (/[^A-Za-z0-9]/.test(p) ? 1 : 0);
                    const colors = ["#e53e3e", "#dd6b20", "#d69e2e", "#38a169"];
                    const labels = [t("notSet"), "Fair", "Good", "Strong"];
                    return (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: "flex", gap: 4, marginBottom: 2 }}>
                          {[0, 1, 2, 3].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < s ? colors[s - 1] : "var(--clr-border)" }} />)}
                        </div>
                        <span style={{ fontSize: 11, color: colors[s - 1] }}>{labels[s - 1] || ""}</span>
                      </div>
                    );
                  })()}
                </Field>
                <Field label="Confirm Password" required>
                  <div style={{ position: "relative" }}>
                    <input className="form-input" type={showConfirm ? "text" : "password"} value={regData.confirmPassword || ""}
                      placeholder="Re-enter password" style={{ paddingRight: 40, borderColor: regData.confirmPassword && regData.password !== regData.confirmPassword ? "var(--clr-danger)" : undefined }}
                      onChange={e => { update({ confirmPassword: e.target.value }); setError(""); }} />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--clr-text-muted)" }}>
                      <Icon name={showConfirm ? "eyeOff" : "eye"} size={16} />
                    </button>
                  </div>
                  {regData.confirmPassword && regData.password !== regData.confirmPassword && (
                    <div style={{ fontSize: 12, color: "var(--clr-danger)", marginTop: 3 }}>⚠ Passwords do not match</div>
                  )}
                  {regData.confirmPassword && regData.password === regData.confirmPassword && (
                    <div style={{ fontSize: 12, color: "var(--clr-success)", marginTop: 3 }}>✓ Passwords match</div>
                  )}
                </Field>

                {/* ── Personal Info Section ── */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clr-saffron)", borderBottom: "1px solid var(--clr-border)", paddingBottom: 6, marginTop: 4 }}>Personal Info</div>

                <Field label={t("height")} required hint='e.g. 5&apos;6" or 168 cm'>
                  <HeightPicker
                    value={regData.height}
                    onChange={v => { update({ height: v }); setError(""); }}
                  />
                </Field>

                <Field label={t("maritalStatus")} required>
                  <select className="form-input" value={regData.marital_status || ""}
                    onChange={e => { update({ marital_status: e.target.value }); setError(""); }}>
                    <option value="">— Select —</option>
                    <option value="never_married">Never Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </Field>

                {/* ── Education & Occupation Section ── */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clr-saffron)", borderBottom: "1px solid var(--clr-border)", paddingBottom: 6, marginTop: 4 }}>Education &amp; Occupation</div>

                <Field label={t("education")} required>
                  <select className="form-input" value={regData.education || ""}
                    onChange={e => { update({ education: e.target.value, education_other: "" }); setError(""); }}>
                    <option value="">— Select —</option>
                    {EDUCATIONS.map(ed => <option key={ed.value} value={ed.value}>{ed.label}</option>)}
                  </select>
                  {regData.education === "other" && (
                    <input className="form-input" type="text" style={{ marginTop: 8 }}
                      placeholder="Please specify your education"
                      value={regData.education_other || ""}
                      onChange={e => { update({ education_other: e.target.value }); setError(""); }} />
                  )}
                </Field>

                <Field label={t("occupation")} required>
                  <select className="form-input" value={regData.occupation || ""}
                    onChange={e => { update({ occupation: e.target.value, occupation_other: "" }); setError(""); }}>
                    <option value="">— Select —</option>
                    {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {regData.occupation === "Other" && (
                    <input className="form-input" type="text" style={{ marginTop: 8 }}
                      placeholder="Please specify your occupation"
                      value={regData.occupation_other || ""}
                      onChange={e => { update({ occupation_other: e.target.value }); setError(""); }} />
                  )}
                </Field>

                <Field label="Monthly Salary" hint="(Only in Indian Rupees) Optional">
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--clr-text-muted)" }}>₹</span>
                    <input className="form-input" type="number" style={{ paddingLeft: 28 }}
                      value={regData.monthly_salary || ""} placeholder="e.g. 50000"
                      onChange={e => update({ monthly_salary: e.target.value })} />
                  </div>
                </Field>

                {/* Working Place */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clr-saffron)", borderBottom: "1px solid var(--clr-border)", paddingBottom: 6, marginTop: 4 }}>Working Place</div>
                <Field label={t("country")} required>
                  <input className="form-input" type="text" value={regData.country || ""} placeholder="Country"
                    onChange={e => { update({ country: e.target.value }); setError(""); }} />
                </Field>
                <Field label={t("state")} required>
                  <input className="form-input" type="text" value={regData.state || ""} placeholder="State"
                    onChange={e => { update({ state: e.target.value }); setError(""); }} />
                </Field>
                <Field label={t("district")} required>
                  <input className="form-input" type="text" value={regData.district || ""} placeholder={t("district")}
                    onChange={e => { update({ district: e.target.value }); setError(""); }} />
                </Field>

              </div>
              <ErrorBox msg={error} />
              <NavButtons step={1} />
            </div>
          )}

          {/* ── Step 2: Lineage & Location ── */}
          {regStep === 2 && (
            <div>
              {/* Religion & Community checkboxes */}
              <div style={{ background: "var(--clr-bg-subtle)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--clr-saffron)", marginBottom: 10 }}>Religion &amp; Community</div>

                {/* Hindu Religion */}
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 8 }}>
                  <input type="checkbox" style={{ marginTop: 2, accentColor: "var(--clr-saffron)" }}
                    checked={regData.is_hindu !== false}
                    onChange={e => update({ is_hindu: e.target.checked, custom_religion: e.target.checked ? "" : regData.custom_religion })} />
                  <span style={{ fontSize: 13 }}>
                    <strong>Hindu</strong> Religion
                    <span style={{ fontSize: 11, color: "var(--clr-text-muted)", marginLeft: 6 }}>(uncheck if different)</span>
                  </span>
                </label>
                {regData.is_hindu === false && (
                  <input className="form-input" type="text" style={{ marginBottom: 10 }}
                    placeholder="Specify your religion (e.g. Christian, Muslim...)"
                    value={regData.custom_religion || ""}
                    onChange={e => { update({ custom_religion: e.target.value }); setError(""); }} />
                )}

                {/* AVS Community */}
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 8 }}>
                  <input type="checkbox" style={{ marginTop: 2, accentColor: "var(--clr-saffron)" }}
                    checked={regData.is_avs !== false}
                    onChange={e => update({ is_avs: e.target.checked, custom_community: e.target.checked ? "" : regData.custom_community })} />
                  <span style={{ fontSize: 13 }}>
                    <strong>Arunattu Vellalar</strong> Community
                    <span style={{ fontSize: 11, color: "var(--clr-text-muted)", marginLeft: 6 }}>(uncheck if different)</span>
                  </span>
                </label>
                {regData.is_avs === false && (
                  <input className="form-input" type="text"
                    placeholder="Specify your community (e.g. Mudaliar, Gounder...)"
                    value={regData.custom_community || ""}
                    onChange={e => { update({ custom_community: e.target.value }); setError(""); }} />
                )}
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {/* Kothiram — only required for AVS members */}
                {regData.is_avs !== false && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 8 }}>
                      <input type="checkbox" style={{ marginTop: 2, accentColor: "var(--clr-saffron)" }}
                        checked={regData.kothiram_is_avs !== false}
                        onChange={e => update({ kothiram_is_avs: e.target.checked, kothiram: "" })} />
                      <span style={{ fontSize: 13 }}>
                        My Kothiram belongs to our community
                        <span style={{ fontSize: 11, color: "var(--clr-text-muted)", marginLeft: 6 }}>(uncheck if different)</span>
                      </span>
                    </label>
                    <Field label="Kothiram (கோத்திரம்)" required>
                      {regData.kothiram_is_avs !== false ? (
                        <select className="form-input" value={regData.kothiram || ""}
                          onChange={e => { update({ kothiram: e.target.value }); setError(""); }}>
                          <option value="">{t("selectKothiram")}</option>
                          {AVS_KOTHIRAMS.map(k => (
                            <option key={k.en} value={k.en}>{k.en} — {k.ta}</option>
                          ))}
                        </select>
                      ) : (
                        <input className="form-input" type="text" value={regData.kothiram || ""}
                          placeholder="Enter your Kothiram"
                          onChange={e => { update({ kothiram: e.target.value }); setError(""); }} />
                      )}
                    </Field>
                  </div>
                )}

                <Field label="Native Place" required>
                  <input className="form-input" type="text" value={regData.native_place || ""} placeholder="Your native place"
                    onChange={e => { update({ native_place: e.target.value }); setError(""); }} />
                </Field>
              </div>
              <ErrorBox msg={error} />
              <NavButtons step={2} />
            </div>
          )}

          {/* ── Step 4 (About+Family) — now step 4 ── */}
          {regStep === 4 && (
            <div>
              <div style={{ display: "grid", gap: 14 }}>
                {/* About Me & Expectations */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clr-saffron)", borderBottom: "1px solid var(--clr-border)", paddingBottom: 6 }}>About &amp; Expectations</div>
                <Field label={t("aboutMe")} required>
                  <textarea className="form-input" rows={3} value={regData.about || ""}
                    placeholder="Tell us about yourself — your personality, interests, hobbies, values..."
                    onChange={e => { update({ about: e.target.value }); setError(""); }} />
                </Field>
                <Field label="Who can view your Social Media Links?">
                  <select className="form-input" value={regData.social_links_privacy || "public"}
                    onChange={e => update({ social_links_privacy: e.target.value })}>
                    <option value="public">View to Others (Everyone)</option>
                    <option value="loggedIn">Logged-in Users Only</option>
                    <option value="accepted">Accepted Interests Only</option>
                  </select>
                </Field>

                {/* Social Media Links */}
                <Field label="Social Media Links (Attach links like Facebook, Instagram, LinkedIn, YouTube...)">
                  <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                    {(regData.social_links || []).map((link, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--clr-bg-subtle)", padding: "8px 12px", borderRadius: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", minWidth: 80 }}>{link.platform}:</span>
                        <a href={link.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--clr-saffron)", textDecoration: "underline" }}>{link.url}</a>
                        <button type="button" onClick={() => {
                          const nextLinks = (regData.social_links || []).filter((_, i) => i !== idx);
                          update({ social_links: nextLinks });
                        }} style={{ background: "none", border: "none", color: "var(--clr-danger)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    ))}

                    {/* Add new link form */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <select className="form-input" style={{ width: 120, margin: 0 }} id="new-link-platform">
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="youtube">YouTube</option>
                        <option value="other">Other</option>
                      </select>
                      <input className="form-input" type="text" placeholder="Paste link URL here..." style={{ flex: 1, margin: 0 }} id="new-link-url" />
                      <button type="button" className="btn btn-primary" style={{ padding: "8px 14px", height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => {
                          const pSel = document.getElementById("new-link-platform");
                          const uInput = document.getElementById("new-link-url");
                          if (!uInput || !pSel) return;
                          const url = uInput.value.trim();
                          const platform = pSel.value;
                          if (!url) return;
                          const nextLinks = [...(regData.social_links || []), { platform, url }];
                          update({ social_links: nextLinks });
                          uInput.value = "";
                        }}>
                        <Icon name="plus" size={16} /> Add
                      </button>
                    </div>
                  </div>
                </Field>

                <Field label={t("expectations")} required>
                  <textarea className="form-input" rows={3} value={regData.expectations || ""}
                    placeholder="Describe the qualities and background you expect in your life partner..."
                    onChange={e => { update({ expectations: e.target.value }); setError(""); }} />
                </Field>

                {/* Parents */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clr-saffron)", borderBottom: "1px solid var(--clr-border)", paddingBottom: 6, marginTop: 4 }}>Family Details</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--clr-text-muted)" }}>Parents</div>
                <Field label={t("fatherName")} required>
                  <input className="form-input" type="text" value={regData.father_name || ""} placeholder="Father's full name"
                    onChange={e => { update({ father_name: e.target.value }); setError(""); }} />
                </Field>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 8 }}>
                    <input type="checkbox" style={{ marginTop: 2, accentColor: "var(--clr-saffron)" }}
                      checked={regData.father_kothiram_is_avs !== false}
                      onChange={e => update({ father_kothiram_is_avs: e.target.checked, father_kothiram: "" })} />
                    <span style={{ fontSize: 13 }}>
                      Father's Kothiram belongs to our community
                      <span style={{ fontSize: 11, color: "var(--clr-text-muted)", marginLeft: 6 }}>(uncheck if different)</span>
                    </span>
                  </label>
                  <Field label={t("fatherKothiram")} required>
                    {regData.father_kothiram_is_avs !== false ? (
                      <select className="form-input" value={regData.father_kothiram || ""}
                        onChange={e => { update({ father_kothiram: e.target.value }); setError(""); }}>
                        <option value="">{t("selectKothiram")}</option>
                        {AVS_KOTHIRAMS.map(k => (
                          <option key={k.en} value={k.en}>{k.en} — {k.ta}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="form-input" type="text" value={regData.father_kothiram || ""}
                        placeholder="Enter father's Kothiram"
                        onChange={e => { update({ father_kothiram: e.target.value }); setError(""); }} />
                    )}
                  </Field>
                </div>
                <Field label="Father's Occupation" required>
                  <select className="form-input" value={regData.father_occupation || ""}
                    onChange={e => { update({ father_occupation: e.target.value, father_occupation_other: "" }); setError(""); }}>
                    <option value="">— Select —</option>
                    {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {regData.father_occupation === "Other" && (
                    <input className="form-input" type="text" style={{ marginTop: 8 }}
                      placeholder="Please specify father's occupation"
                      value={regData.father_occupation_other || ""}
                      onChange={e => { update({ father_occupation_other: e.target.value }); setError(""); }} />
                  )}
                </Field>
                <Field label="Father's Mobile Number" required>
                  <PhoneInput
                    value={regData.father_mobile || ""}
                    placeholder="Father's mobile number"
                    onChange={v => { update({ father_mobile: v }); setError(""); }}
                  />
                </Field>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" style={{ accentColor: "var(--clr-saffron)" }}
                      checked={regData.father_whatsapp_same !== false}
                      onChange={e => {
                        update({ father_whatsapp_same: e.target.checked, father_whatsapp: e.target.checked ? "" : regData.father_whatsapp });
                        setError("");
                      }} />
                    Contact same as WhatsApp
                  </label>
                </div>
                {regData.father_whatsapp_same === false && (
                  <Field label="Father's WhatsApp Number" required>
                    <PhoneInput
                      value={regData.father_whatsapp || ""}
                      placeholder="Father's WhatsApp number"
                      onChange={v => { update({ father_whatsapp: v }); setError(""); }}
                    />
                  </Field>
                )}

                <Field label={t("motherName")} required>
                  <input className="form-input" type="text" value={regData.mother_name || ""} placeholder="Mother's full name"
                    onChange={e => { update({ mother_name: e.target.value }); setError(""); }} />
                </Field>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 8 }}>
                    <input type="checkbox" style={{ marginTop: 2, accentColor: "var(--clr-saffron)" }}
                      checked={regData.mother_kothiram_is_avs !== false}
                      onChange={e => update({ mother_kothiram_is_avs: e.target.checked, mother_kothiram: "" })} />
                    <span style={{ fontSize: 13 }}>
                      Mother's Birth Kothiram belongs to our community
                      <span style={{ fontSize: 11, color: "var(--clr-text-muted)", marginLeft: 6 }}>(uncheck if different)</span>
                    </span>
                  </label>
                  <Field label={t("motherKothiram")} required>
                    {regData.mother_kothiram_is_avs !== false ? (
                      <select className="form-input" value={regData.mother_kothiram || ""}
                        onChange={e => { update({ mother_kothiram: e.target.value }); setError(""); }}>
                        <option value="">{t("selectKothiram")}</option>
                        {AVS_KOTHIRAMS.map(k => (
                          <option key={k.en} value={k.en}>{k.en} — {k.ta}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="form-input" type="text" value={regData.mother_kothiram || ""}
                        placeholder="Enter mother's Birth Kothiram"
                        onChange={e => { update({ mother_kothiram: e.target.value }); setError(""); }} />
                    )}
                  </Field>
                </div>
                <Field label="Mother's Occupation" required>
                  <select className="form-input" value={regData.mother_occupation || ""}
                    onChange={e => { update({ mother_occupation: e.target.value, mother_occupation_other: "" }); setError(""); }}>
                    <option value="">— Select —</option>
                    {MOTHER_OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {regData.mother_occupation === "Other" && (
                    <input className="form-input" type="text" style={{ marginTop: 8 }}
                      placeholder="Please specify mother's occupation"
                      value={regData.mother_occupation_other || ""}
                      onChange={e => { update({ mother_occupation_other: e.target.value }); setError(""); }} />
                  )}
                </Field>
                <Field label="Mother's Mobile Number" hint="(Optional)">

                  <PhoneInput
                    value={regData.mother_mobile || ""}
                    placeholder="Mother's mobile number"
                    onChange={v => { update({ mother_mobile: v }); setError(""); }}
                  />
                </Field>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" style={{ accentColor: "var(--clr-saffron)" }}
                      checked={regData.mother_whatsapp_same !== false}
                      onChange={e => {
                        update({ mother_whatsapp_same: e.target.checked, mother_whatsapp: e.target.checked ? "" : regData.mother_whatsapp });
                        setError("");
                      }} />
                    Contact same as WhatsApp
                  </label>
                </div>
                {regData.mother_whatsapp_same === false && (
                  <Field label="Mother's WhatsApp Number (Optional)">
                    <PhoneInput
                      value={regData.mother_whatsapp || ""}
                      placeholder="Mother's WhatsApp number"
                      onChange={v => { update({ mother_whatsapp: v }); setError(""); }}
                    />
                  </Field>
                )}

                {/* Siblings — Elder/Younger split with married counts */}
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--clr-text-muted)" }}>Siblings</div>

                {/* Brothers */}
                <div style={{ background: "var(--clr-bg-subtle)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--clr-saffron)" }}>Brothers</div>

                  {/* Elder Brothers */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: 6 }}>Elder Brothers</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Field label="No. of Elder Brothers">
                        <input className="form-input" type="number" min="0" max="10"
                          value={regData.elder_brothers || ""} placeholder="0"
                          onChange={e => { update({ elder_brothers: e.target.value, elder_brothers_married: "" }); setError(""); }} />
                      </Field>
                      <Field label="No. Married">
                        <input className="form-input" type="number" min="0"
                          max={parseInt(regData.elder_brothers || 0)}
                          disabled={!parseInt(regData.elder_brothers)}
                          style={{ opacity: !parseInt(regData.elder_brothers) ? 0.5 : 1 }}
                          value={regData.elder_brothers_married || ""} placeholder="0"
                          onChange={e => { update({ elder_brothers_married: e.target.value }); setError(""); }} />
                      </Field>
                    </div>
                  </div>

                  {/* Younger Brothers */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: 6 }}>Younger Brothers</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Field label="No. of Younger Brothers">
                        <input className="form-input" type="number" min="0" max="10"
                          value={regData.younger_brothers || ""} placeholder="0"
                          onChange={e => { update({ younger_brothers: e.target.value, younger_brothers_married: "" }); setError(""); }} />
                      </Field>
                      <Field label="No. Married">
                        <input className="form-input" type="number" min="0"
                          max={parseInt(regData.younger_brothers || 0)}
                          disabled={!parseInt(regData.younger_brothers)}
                          style={{ opacity: !parseInt(regData.younger_brothers) ? 0.5 : 1 }}
                          value={regData.younger_brothers_married || ""} placeholder="0"
                          onChange={e => { update({ younger_brothers_married: e.target.value }); setError(""); }} />
                      </Field>
                    </div>
                  </div>
                </div>

                {/* Sisters */}
                <div style={{ background: "var(--clr-bg-subtle)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--clr-saffron)" }}>Sisters</div>

                  {/* Elder Sisters */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: 6 }}>Elder Sisters</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Field label="No. of Elder Sisters">
                        <input className="form-input" type="number" min="0" max="10"
                          value={regData.elder_sisters || ""} placeholder="0"
                          onChange={e => { update({ elder_sisters: e.target.value, elder_sisters_married: "" }); setError(""); }} />
                      </Field>
                      <Field label="No. Married">
                        <input className="form-input" type="number" min="0"
                          max={parseInt(regData.elder_sisters || 0)}
                          disabled={!parseInt(regData.elder_sisters)}
                          style={{ opacity: !parseInt(regData.elder_sisters) ? 0.5 : 1 }}
                          value={regData.elder_sisters_married || ""} placeholder="0"
                          onChange={e => { update({ elder_sisters_married: e.target.value }); setError(""); }} />
                      </Field>
                    </div>
                  </div>

                  {/* Younger Sisters */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: 6 }}>Younger Sisters</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Field label="No. of Younger Sisters">
                        <input className="form-input" type="number" min="0" max="10"
                          value={regData.younger_sisters || ""} placeholder="0"
                          onChange={e => { update({ younger_sisters: e.target.value, younger_sisters_married: "" }); setError(""); }} />
                      </Field>
                      <Field label="No. Married">
                        <input className="form-input" type="number" min="0"
                          max={parseInt(regData.younger_sisters || 0)}
                          disabled={!parseInt(regData.younger_sisters)}
                          style={{ opacity: !parseInt(regData.younger_sisters) ? 0.5 : 1 }}
                          value={regData.younger_sisters_married || ""} placeholder="0"
                          onChange={e => { update({ younger_sisters_married: e.target.value }); setError(""); }} />
                      </Field>
                    </div>
                  </div>
                </div>

                {/* Family Living In */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clr-saffron)", borderBottom: "1px solid var(--clr-border)", paddingBottom: 6, marginTop: 4 }}>Family Living In</div>
                <Field label={t("livingCountry")} required>
                  <input className="form-input" type="text" value={regData.living_country || ""} placeholder="Country"
                    onChange={e => { update({ living_country: e.target.value }); setError(""); }} />
                </Field>
                <Field label={t("livingState")} required>
                  <input className="form-input" type="text" value={regData.living_state || ""} placeholder="State"
                    onChange={e => { update({ living_state: e.target.value }); setError(""); }} />
                </Field>
                <Field label={t("livingDistrict")} required>
                  <input className="form-input" type="text" value={regData.living_district || ""} placeholder={t("district")}
                    onChange={e => { update({ living_district: e.target.value }); setError(""); }} />
                </Field>

              </div>
              <ErrorBox msg={error} />
              {/* Step 4 NavButtons — Next goes to Preview (step 5) */}
              <NavButtons step={4} />
            </div>
          )}

          {/* ── Step 5: Preview & Download ── */}
          {regStep === 5 && (() => {
            // Helper to get education label
            const eduLabel = (() => {
              if (!regData.education) return "—";
              if (regData.education === "other") return regData.education_other || "Other";
              const found = EDUCATIONS.find(e => e.value === regData.education);
              return found ? found.label : regData.education;
            })();
            const occLabel = regData.occupation === "Other" ? (regData.occupation_other || "Other") : (regData.occupation || "—");

            const siblingLine = (label, count, married) => {
              const c = parseInt(count || 0);
              if (!c) return null;
              return `${c} ${label} (${parseInt(married || 0)} married)`;
            };
            const siblingLines = [
              siblingLine("Elder Brother(s)", regData.elder_brothers, regData.elder_brothers_married),
              siblingLine("Younger Brother(s)", regData.younger_brothers, regData.younger_brothers_married),
              siblingLine("Elder Sister(s)", regData.elder_sisters, regData.elder_sisters_married),
              siblingLine("Younger Sister(s)", regData.younger_sisters, regData.younger_sisters_married),
            ].filter(Boolean);

            // ── Download as HTML ────────────────────────────────────────────
            const downloadHTML = () => {
              const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${regData.name || ""} — Marriage Profile</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #222; background: #fff; padding: 0 24px; }
  h1 { font-size: 26px; color: #b45309; margin-bottom: 4px; }
  .sub { font-size: 14px; color: #888; margin-bottom: 32px; }
  h2 { font-size: 16px; font-weight: 700; color: #b45309; border-bottom: 2px solid #fde68a; padding-bottom: 4px; margin: 28px 0 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  td { padding: 6px 8px; font-size: 14px; vertical-align: top; }
  td:first-child { color: #666; width: 46%; font-style: italic; }
  td:last-child { font-weight: 600; }
  .footer { margin-top: 48px; font-size: 11px; color: #aaa; text-align: center; }
</style>
</head>
<body>
<h1>${regData.name || ""} &mdash; ${(regData.type || "").charAt(0).toUpperCase() + (regData.type || "").slice(1)} Profile</h1>
<div class="sub">Arunattu Vellalar Matrimony &bull; Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>

<h2>Personal Details</h2>
<table>
  <tr><td>Date of Birth</td><td>${regData.dob || "—"}</td></tr>
  <tr><td>Birth Time</td><td>${regData.birth_time || "—"}</td></tr>
  <tr><td>Birth Place</td><td>${regData.birth_place || "—"}</td></tr>
  <tr><td>Height</td><td>${regData.height || "—"}</td></tr>
  <tr><td>Marital Status</td><td>${(regData.marital_status || "—").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</td></tr>
</table>

<h2>Education &amp; Career</h2>
<table>
  <tr><td>Education</td><td>${eduLabel}</td></tr>
  <tr><td>Occupation</td><td>${occLabel}</td></tr>
  <tr><td>Monthly Salary</td><td>${regData.monthly_salary ? "\u20b9" + parseInt(regData.monthly_salary).toLocaleString("en-IN") : "—"}</td></tr>
  <tr><td>Country (Currently working in)</td><td>${regData.country || "—"}</td></tr>
  <tr><td>State (Currently working in)</td><td>${regData.state || "—"}</td></tr>
  <tr><td>District (Currently working in)</td><td>${regData.district || "—"}</td></tr>
</table>

<h2>Community &amp; Location</h2>
<table>
  <tr><td>Religion</td><td>Hindu</td></tr>
  <tr><td>Community</td><td>Arunattu Vellalar</td></tr>
  <tr><td>Kothiram</td><td>${regData.kothiram || "—"}</td></tr>
  <tr><td>Native Place</td><td>${regData.native_place || "—"}</td></tr>
</table>

<h2>Jothidam Details</h2>
<table>
  <tr><td>Rasi</td><td>${regData.rasi || "—"}</td></tr>
  <tr><td>Natchathiram</td><td>${regData.natchathiram || "—"}</td></tr>
  <tr><td>Patham</td><td>${regData.patham || "—"}</td></tr>
  <tr><td>Dosham</td><td>${(regData.dosham || "—").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</td></tr>
</table>

<h2>About Me</h2>
<p style="font-size:14px;line-height:1.7">${(regData.about || "").replace(/\n/g, "<br/>")}</p>
${regData.social_links?.length ? `<h2>Social Links</h2><table>${regData.social_links.map(l => `<tr><td>${l.platform.charAt(0).toUpperCase() + l.platform.slice(1)}</td><td><a href="${l.url}">${l.url}</a></td></tr>`).join("")}</table>` : ""}

<h2>Expectations</h2>
<p style="font-size:14px;line-height:1.7">${(regData.expectations || "").replace(/\n/g, "<br/>")}</p>

<h2>Family Details</h2>
<table>
  <tr><td>Father's Name</td><td>${regData.father_name || "—"}</td></tr>
  <tr><td>Father's Kothiram</td><td>${regData.father_kothiram || "—"}</td></tr>
  <tr><td>Father's Occupation</td><td>${regData.father_occupation || "—"}</td></tr>
  <tr><td>Father's Contact</td><td>${regData.father_mobile ? formatPhone(regData.father_mobile) : "—"}${regData.father_whatsapp_same !== false ? " (WhatsApp same)" : ` / WhatsApp: ${regData.father_whatsapp ? formatPhone(regData.father_whatsapp) : "—"}`}</td></tr>
  <tr><td>Mother's Name</td><td>${regData.mother_name || "—"}</td></tr>
  <tr><td>Mother's Kothiram</td><td>${regData.mother_kothiram || "—"}</td></tr>
  <tr><td>Mother's Occupation</td><td>${regData.mother_occupation || "—"}</td></tr>
  <tr><td>Mother's Contact</td><td>${regData.mother_mobile ? formatPhone(regData.mother_mobile) : "—"}${regData.mother_whatsapp_same !== false ? " (WhatsApp same)" : ` / WhatsApp: ${regData.mother_whatsapp ? formatPhone(regData.mother_whatsapp) : "—"}`}</td></tr>
  <tr><td>Family Living In</td><td>${[regData.living_district, regData.living_state, regData.living_country].filter(Boolean).join(", ") || "—"}</td></tr>
</table>
${siblingLines.length ? `<h2>Siblings</h2><table>${siblingLines.map(l => `<tr><td colspan="2">${l}</td></tr>`).join("")}</table>` : ""}

<div class="footer">Arunattu Vellalar Matrimony &bull; Confidential Profile</div>
</body></html>`;
              const blob = new Blob([html], { type: "text/html;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `${(regData.name || "profile").replace(/\s+/g, "_")}_profile.html`;
              a.click(); URL.revokeObjectURL(url);
            };

            const Row = ({ label, value }) => (
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--clr-border)" }}>
                <span style={{ fontSize: 12, color: "var(--clr-text-muted)", fontStyle: "italic" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--clr-text)" }}>{value || "—"}</span>
              </div>
            );
            const SectionHead = ({ children }) => (
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clr-saffron)", borderBottom: "2px solid var(--clr-saffron)", paddingBottom: 4, marginTop: 20, marginBottom: 10 }}>{children}</div>
            );

            return (
              <div>
                <div style={{ background: "linear-gradient(135deg,#FFF5E8,#FFF9F0)", borderRadius: 10, padding: "16px", marginBottom: 16, textAlign: "center", border: "1px solid #fde68a" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--clr-saffron)" }}>{regData.name}</div>
                  <div style={{ fontSize: 13, color: "var(--clr-text-muted)", marginTop: 4 }}>
                    {regData.type?.charAt(0).toUpperCase() + regData.type?.slice(1)} &bull; Arunattu Vellalar Matrimony
                  </div>
                </div>

                <SectionHead>Personal Details</SectionHead>
                <Row label="Date of Birth" value={regData.dob} />
                <Row label="Birth Time" value={regData.birth_time} />
                <Row label="Birth Place" value={regData.birth_place} />
                <Row label="Height" value={regData.height} />
                <Row label="Marital Status" value={(regData.marital_status || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />

                <SectionHead>Education &amp; Career</SectionHead>
                <Row label="Education" value={eduLabel} />
                <Row label="Occupation" value={occLabel} />
                <Row label="Monthly Salary" value={regData.monthly_salary ? "\u20b9" + parseInt(regData.monthly_salary).toLocaleString("en-IN") : ""} />
                <Row label="Currently working in" value={[regData.district, regData.state, regData.country].filter(Boolean).join(", ")} />

                <SectionHead>Lineage &amp; Location</SectionHead>
                <Row label="Religion" value={regData.is_hindu === false ? (regData.custom_religion || "—") : "Hindu"} />
                <Row label="Community" value={regData.is_avs === false ? (regData.custom_community || "—") : "Arunattu Vellalar"} />
                {regData.is_avs !== false && <Row label="Kothiram" value={regData.kothiram} />}
                <Row label="Native Place" value={regData.native_place} />

                <SectionHead>Jothidam</SectionHead>
                <Row label="Rasi" value={regData.rasi} />
                <Row label="Natchathiram" value={regData.natchathiram} />
                <Row label="Patham" value={regData.patham} />
                <Row label="Dosham" value={(regData.dosham || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />

                <SectionHead>About Me &amp; Expectations</SectionHead>
                <div style={{ fontSize: 13, color: "var(--clr-text)", lineHeight: 1.7, marginBottom: 10, padding: "8px 0" }}>{regData.about}</div>
                {regData.social_links?.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--clr-text-muted)", marginBottom: 4 }}>Social Links (Privacy: {regData.social_links_privacy}):</div>
                    <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                      {regData.social_links.map((link, idx) => (
                        <div key={idx} style={{ fontSize: 13, fontWeight: 600 }}>
                          <span style={{ textTransform: "capitalize", color: "var(--clr-text-muted)", marginRight: 6 }}>{link.platform}:</span>
                          <a href={link.url} target="_blank" rel="noreferrer" style={{ color: "var(--clr-saffron)", textDecoration: "underline" }}>{link.url}</a>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--clr-text-muted)", marginBottom: 4 }}>Partner Expectations:</div>
                <div style={{ fontSize: 13, color: "var(--clr-text)", lineHeight: 1.7 }}>{regData.expectations}</div>

                <SectionHead>Family Details</SectionHead>
                <Row label="Father" value={`${regData.father_name || ""} (${regData.father_kothiram || "—"}) — ${regData.father_occupation || "—"}`} />
                <Row label="Father's Contact" value={`${regData.father_mobile ? formatPhone(regData.father_mobile) : "—"}${regData.father_whatsapp_same !== false ? " (WhatsApp same)" : ` / WhatsApp: ${regData.father_whatsapp ? formatPhone(regData.father_whatsapp) : "—"}`}`} />
                <Row label="Mother" value={`${regData.mother_name || ""} (${regData.mother_kothiram || "—"}) — ${regData.mother_occupation || "—"}`} />
                <Row label="Mother's Contact" value={`${regData.mother_mobile ? formatPhone(regData.mother_mobile) : "—"}${regData.mother_whatsapp_same !== false ? " (WhatsApp same)" : ` / WhatsApp: ${regData.mother_whatsapp ? formatPhone(regData.mother_whatsapp) : "—"}`}`} />
                {siblingLines.length > 0 && (
                  <Row label="Siblings" value={siblingLines.join(" | ")} />
                )}
                <Row label="Family Living In" value={[regData.living_district, regData.living_state, regData.living_country].filter(Boolean).join(", ")} />

                <ErrorBox msg={error} />

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button className="btn btn-secondary" onClick={() => go(4)}>
                    <Icon name="chevronLeft" size={16} /> Back
                  </button>
                  <button className="btn btn-secondary" onClick={downloadHTML}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    ⬇ Download HTML
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => nextStep(5)}>
                    Proceed to Verify <Icon name="chevronRight" size={16} />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── Step 3: Jothidam (+ DOB/BirthTime/BirthPlace) ── */}
          {regStep === 3 && (() => {
            const availableNatchathirams = regData.rasi ? getNatchathiramsByRasi(regData.rasi) : [];
            const availablePadams = (regData.rasi && regData.natchathiram) ? getPadamsForRasi(regData.natchathiram, regData.rasi) : [];
            const hasDosham = regData.dosham && regData.dosham !== "sutha";
            const hasSevvai = regData.dosham === "sevvai" || regData.dosham === "sevvai_ragu_kedhu";
            const hasRaguKedhu = regData.dosham === "ragu_kedhu" || regData.dosham === "sevvai_ragu_kedhu";
            return (
              <div>
                <div style={{ fontSize: 12, color: "var(--clr-text-muted)", padding: "8px 12px", background: "var(--clr-bg-subtle)", borderRadius: 6, marginBottom: 16 }}>
                  🔯 Jothidam details help with horoscope matching. All fields are mandatory.
                </div>
                <div style={{ display: "grid", gap: 14 }}>

                  {/* Birth Details sub-section */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clr-saffron)", borderBottom: "1px solid var(--clr-border)", paddingBottom: 6 }}>Birth Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label={t("dob")} required>
                      <input className="form-input" type="date" value={regData.dob || ""}
                        onChange={e => { update({ dob: e.target.value }); setError(""); }} />
                    </Field>
                    <Field label={t("birthTime")} required>
                      <input className="form-input" type="time" value={regData.birth_time || ""}
                        onChange={e => { update({ birth_time: e.target.value }); setError(""); }} />
                    </Field>
                  </div>
                  <Field label={t("birthPlace")} required>
                    <input className="form-input" type="text" value={regData.birth_place || ""}
                      placeholder="Town/City of birth"
                      onChange={e => { update({ birth_place: e.target.value }); setError(""); }} />
                  </Field>

                  {/* Jothidam sub-section */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clr-saffron)", borderBottom: "1px solid var(--clr-border)", paddingBottom: 6, marginTop: 4 }}>Horoscope Details</div>
                  <Field label={t("rasi")} required>
                    <select className="form-input" value={regData.rasi || ""}
                      onChange={e => { update({ rasi: e.target.value, natchathiram: "", patham: "" }); setError(""); }}>
                      <option value="">— Select Rasi —</option>
                      {RASIS.map(r => <option key={r.id} value={r.id}>{r.en} — {r.ta}</option>)}
                    </select>
                  </Field>

                  {regData.rasi && (
                    <Field label={t("natchathiram")} required>
                      <select className="form-input" value={regData.natchathiram || ""}
                        onChange={e => { update({ natchathiram: e.target.value, patham: "" }); setError(""); }}>
                        <option value="">— Select Natchathiram —</option>
                        {availableNatchathirams.map(n => <option key={n.id} value={n.id}>{n.en} — {n.ta}</option>)}
                      </select>
                    </Field>
                  )}

                  {regData.natchathiram && availablePadams.length > 0 && (
                    <Field label={t("patham")} required>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                        {availablePadams.map(p => (
                          <button key={p} type="button"
                            onClick={() => { update({ patham: String(p) }); setError(""); }}
                            style={{
                              padding: "10px 0", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 700, fontSize: 14,
                              border: `2px solid ${regData.patham === String(p) ? "var(--clr-saffron)" : "var(--clr-border)"}`,
                              background: regData.patham === String(p) ? "#FFF5F0" : "var(--clr-white)",
                              color: regData.patham === String(p) ? "var(--clr-saffron)" : "var(--clr-text-muted)",
                            }}>
                            {p}<sup style={{ fontSize: 9 }}>{p === 1 ? "st" : p === 2 ? "nd" : p === 3 ? "rd" : "th"}</sup> Patham
                          </button>
                        ))}
                      </div>
                    </Field>
                  )}

                  <Field label={t("dosham")} required>
                    <div style={{ display: "grid", gap: 8 }}>
                      {DOSHAM_TYPES.map(d => (
                        <button key={d.id} type="button"
                          onClick={() => { update({ dosham: d.id, sevvai_position: "", ragu_position: "", kedhu_position: "" }); setError(""); }}
                          style={{
                            padding: "10px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "left",
                            border: `2px solid ${regData.dosham === d.id ? "var(--clr-saffron)" : "var(--clr-border)"}`,
                            background: regData.dosham === d.id ? "#FFF5F0" : "var(--clr-white)",
                            display: "flex", alignItems: "center", gap: 10,
                          }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${regData.dosham === d.id ? "var(--clr-saffron)" : "var(--clr-border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {regData.dosham === d.id && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--clr-saffron)" }} />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{d.en}</div>
                            <div style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>{d.ta}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </Field>

                  {hasDosham && (
                    <div style={{ background: "var(--clr-bg-subtle)", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--clr-saffron)" }}>
                        Dosham Position from Lagnam <span style={{ fontSize: 11, fontWeight: 400, color: "var(--clr-text-muted)" }}>(optional — fill if known)</span>
                      </div>
                      <div style={{ display: "grid", gap: 12 }}>
                        {hasSevvai && (
                          <Field label={t("sevvai")}>
                            <select className="form-input" value={regData.sevvai_position || ""}
                              onChange={e => update({ sevvai_position: e.target.value })}>
                              <option value="">— Select House —</option>
                              {LAGNAM_POSITIONS.map(lp => <option key={lp.id} value={lp.id}>{lp.en} — {lp.ta}</option>)}
                            </select>
                          </Field>
                        )}
                        {hasRaguKedhu && (
                          <>
                            <Field label={t("ragu")}>
                              <select className="form-input" value={regData.ragu_position || ""}
                                onChange={e => update({ ragu_position: e.target.value })}>
                                <option value="">— Select House —</option>
                                {LAGNAM_POSITIONS.map(lp => <option key={lp.id} value={lp.id}>{lp.en} — {lp.ta}</option>)}
                              </select>
                            </Field>
                            <Field label={t("kedhu")}>
                              <select className="form-input" value={regData.kedhu_position || ""}
                                onChange={e => update({ kedhu_position: e.target.value })}>
                                <option value="">— Select House —</option>
                                {LAGNAM_POSITIONS.map(lp => <option key={lp.id} value={lp.id}>{lp.en} — {lp.ta}</option>)}
                              </select>
                            </Field>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <ErrorBox msg={error} />
                <NavButtons step={3} />
              </div>
            );
          })()}



          {/* ── Step 6: Email OTP ── */}
          {regStep === 6 && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg,#FFF0E0,#FFD9B0)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                boxShadow: "0 4px 12px rgba(220,90,30,0.15)",
              }}>
                <Icon name="mail" size={32} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Verify Your Email</div>

              {otpSending ? (
                <div style={{ fontSize: 13, color: "var(--clr-text-muted)", marginBottom: 24, padding: "10px 14px", background: "var(--clr-bg-subtle)", borderRadius: 8 }}>
                  <Icon name="loader" size={14} /> Sending OTP to <strong>{regData.email}</strong>…
                </div>
              ) : otpSent ? (
                <div style={{ fontSize: 13, color: "var(--clr-text-muted)", marginBottom: 6 }}>
                  OTP sent to
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--clr-danger)", marginBottom: 6 }}>
                  Could not send OTP automatically.
                </div>
              )}

              {!otpSending && (
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--clr-saffron)", marginBottom: 24 }}>
                  📧 {regData.email}
                </div>
              )}

              <input className="form-input" type="text" placeholder="• • • • • •"
                value={regData.otp || ""}
                onChange={e => { update({ otp: e.target.value.replace(/\D/g, "") }); setError(""); }}
                maxLength={6}
                disabled={otpSending}
                style={{ letterSpacing: 12, textAlign: "center", fontSize: 28, fontWeight: 700, maxWidth: 220, margin: "0 auto 8px", display: "block", opacity: otpSending ? 0.5 : 1 }} />

              {otpSent && (
                <div style={{ fontSize: 12, color: "var(--clr-success)", marginBottom: 16, padding: "6px 14px", background: "#f0fff4", borderRadius: 6, display: "inline-block" }}>
                  ✓ OTP sent — check your inbox (or spam folder)
                </div>
              )}

              <ErrorBox msg={error} />
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => go(5)} disabled={submitting}>
                  <Icon name="chevronLeft" size={16} /> {t("back")}
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleComplete}
                  disabled={submitting || otpSending || !otpSent || (regData.otp || "").length < 6}>
                  {submitting
                    ? <span>Creating Account… <Icon name="loader" size={16} /></span>
                    : <span>Complete Registration <Icon name="check" size={16} /></span>}
                </button>
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: "var(--clr-text-muted)" }}>
                Didn't receive OTP?{" "}
                <span
                  style={{ color: otpSending ? "var(--clr-text-muted)" : "var(--clr-saffron)", cursor: otpSending ? "default" : "pointer", fontWeight: 600 }}
                  onClick={!otpSending ? resendOtp : undefined}>
                  {otpSending ? t("sendOtp") : t("resendOtp")}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
