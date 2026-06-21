import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "../components/Icon.jsx";
import PhoneInput, { formatPhone, toInternational } from "../components/PhoneInput.jsx";
import { EDUCATIONS, OCCUPATIONS, MARITAL_STATUSES } from "../constants/options.js";
import { RASIS, NATCHATHIRAMS, DOSHAM_TYPES, LAGNAM_POSITIONS, getNatchathiramsByRasi, getPadamsForRasi } from "../constants/jothidam.js";
import { AVS_KOTHIRAMS } from "../constants/kothirams.js";

const base = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");

// ── Height picker (ft & in OR cm) ─────────────────────────────────────────────
function HeightPicker({ value, onChange }) {
  const parseHeight = useCallback((val) => {
    if (!val) return { feet: "5", inches: "0", cm: "152", unit: "ft" };
    const mFtIn = val.match(/^(\d+)\s*(?:ft|'|’)\s*(\d+)?\s*(?:in|")?/i);
    if (mFtIn) {
      const f = mFtIn[1];
      const i = mFtIn[2] || "0";
      const totalIn = parseInt(f) * 12 + parseInt(i);
      const c = String(Math.round(totalIn * 2.54));
      return { feet: f, inches: i, cm: c, unit: "ft" };
    }
    const mCm = val.match(/^(\d+)\s*cm/i);
    if (mCm) {
      const c = mCm[1];
      const totalIn = Math.round(parseInt(c) / 2.54);
      const f = String(Math.floor(totalIn / 12));
      const i = String(totalIn % 12);
      return { feet: f, inches: i, cm: c, unit: "cm" };
    }
    return { feet: "5", inches: "0", cm: "152", unit: "ft" };
  }, []);

  const parsed = parseHeight(value);

  const [unit, setUnit] = useState(parsed.unit);
  const [feet, setFeet] = useState(parsed.feet);
  const [inches, setInches] = useState(parsed.inches);
  const [cm, setCm] = useState(parsed.cm);

  // Sync state if value changes from parent (e.g. reset/load)
  useEffect(() => {
    const p = parseHeight(value);
    setUnit(p.unit);
    setFeet(p.feet);
    setInches(p.inches);
    setCm(p.cm);
  }, [value, parseHeight]);

  const emit = useCallback((u, f, i, c) => {
    onChange(u === "ft" ? `${f}ft ${i}in` : `${c} cm`);
  }, [onChange]);

  // Ensure default value is emitted when value is empty
  useEffect(() => {
    if (!value) {
      emit(unit, feet, inches, cm);
    }
  }, [value, unit, feet, inches, cm, emit]);

  const handleUnit = (u) => {
    setUnit(u);
    if (u === "ft") {
      const totalIn = Math.round(parseInt(cm || 152) / 2.54);
      const f = String(Math.floor(totalIn / 12));
      const i = String(totalIn % 12);
      setFeet(f); setInches(i);
      emit("ft", f, i, cm);
    } else {
      const c = String(Math.round((parseInt(feet || 5) * 12 + parseInt(inches || 0)) * 2.54));
      setCm(c);
      emit("cm", feet, inches, c);
    }
  };

  const feetOpts = Array.from({ length: 5 }, (_, i) => String(i + 4));   // 4–8
  const inchesOpts = Array.from({ length: 12 }, (_, i) => String(i));       // 0–11

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", width: "100%", marginTop: 6 }}>
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
          <span style={{ fontSize: 12, color: "var(--clr-text-muted)", whiteSpace: "nowrap" }}>
            cm = {(() => {
              const val = parseInt(cm);
              if (isNaN(val) || val <= 0) return "—";
              const totalIn = val / 2.54;
              let f = Math.floor(totalIn / 12);
              let i = Math.round(totalIn % 12);
              if (i === 12) {
                f += 1;
                i = 0;
              }
              return `${f}ft ${i}in`;
            })()}
          </span>
        </>
      )}
    </div>
  );
}

async function uploadPhoto(fileBase64, fileName, photoType = "gallery") {
  const token = typeof window !== "undefined" ? localStorage.getItem("avs_jwt") : null;
  const res = await fetch(`${base}/api/photos`, {
    method: "POST", credentials: "include",
    headers: { 
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ file_base64: fileBase64, file_name: fileName, photo_type: photoType }),
  });
  return res.json();
}

async function deletePhoto(photoId) {
  const token = typeof window !== "undefined" ? localStorage.getItem("avs_jwt") : null;
  const res = await fetch(`${base}/api/photos?photo_id=${photoId}`, {
    method: "DELETE", credentials: "include",
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  });
  return res.json();
}

async function fetchMyPhotos(profileId) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("avs_jwt") : null;
    const res = await fetch(`${base}/api/photos?profile_id=${profileId}`, { 
      credentials: "include",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    });
    const d = await res.json(); return d.photos || [];
  } catch { return []; }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function convertToWebP(file, maxWidthOrHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          } else {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const webpBase64 = canvas.toDataURL("image/webp", quality);
        resolve(webpBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

// SIBLING_MARRIED defined inside component to support t()

export function ProfilePage({ state, dispatch, t }) {
  const photoInputRef    = useRef(null);
  const galleryInputRef  = useRef(null);
  const jathagamInputRef = useRef(null);
  const [editing, setEditing]               = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [error, setError]                   = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [myPhotos, setMyPhotos]             = useState([]);
  const [uploading, setUploading]           = useState(false);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  const [fatherKothiramCustom, setFatherKothiramCustom] = useState(false);
  const [motherKothiramCustom, setMotherKothiramCustom] = useState(false);
  const [kothiramCustom, setKothiramCustom]             = useState(false);
  const [fatherWhatsappSame, setFatherWhatsappSame]     = useState(true);
  const [motherWhatsappSame, setMotherWhatsappSame]     = useState(true);

  const myProfile = state.profiles.find(p => p.id === state.user?.profileId) || null;

  const makeDefault = () => ({
    name: state.user?.name || "",
    dob: "",
    birth_time: "",
    birth_place: "",
    height: "",
    marital_status: "single",
    education: "",
    occupation: "",
    salary: "",
    kothiram: "",
    native_place: "",
    country: "India",
    state: "Tamil Nadu",
    district: "",
    living_country: "India",
    living_state: "",
    living_district: "",
    about_me: "",
    about_me_privacy: "public",
    social_links: [],
    expectations: "",
    photo_privacy: "public",
    profile_status: "active",
    photo: null,
    email: state.user?.email || "",
    whatsapp: "+91|",
    contact_privacy: "public",
    contact: "+91|",
    alt_contact: "",
    // Jothidam
    rasi: "",
    natchathiram: "",
    patham: "",
    dosham: "",
    sevvai_position: "",
    ragu_position: "",
    kedhu_position: "",
    // Family
    father_name: "",
    father_kothiram: "",
    father_mobile: "",
    father_whatsapp: "",
    mother_name: "",
    mother_kothiram: "",
    mother_mobile: "",
    mother_whatsapp: "",
    // Siblings — granular fields (matching RegisterPage)
    elder_brothers: "",
    elder_brothers_married: "",
    younger_brothers: "",
    younger_brothers_married: "",
    elder_sisters: "",
    elder_sisters_married: "",
    younger_sisters: "",
    younger_sisters_married: "",
  });

  const profileToForm = (p) => ({
    ...makeDefault(),
    ...p,
    // Normalise field-name differences / aliases
    dob:         p.dob || p.date_of_birth || "",
    about_me:    p.about_me || p.about || "",
    about_me_privacy: p.about_me_privacy || "public",
    social_links_privacy: p.social_links_privacy || "public",
    contact_privacy: p.contact_privacy || "public",
    social_links:  p.social_links || [],
    alt_contact: p.alt_contact || p.altContact || "",
    father_mobile: p.father_mobile || "",
    father_whatsapp: p.father_whatsapp || "",
    mother_mobile: p.mother_mobile || "",
    mother_whatsapp: p.mother_whatsapp || "",
    // Granular sibling counts — coerce to strings for controlled inputs
    elder_brothers:         p.elder_brothers   != null ? String(p.elder_brothers)   : "",
    elder_brothers_married: p.elder_brothers_married != null ? String(p.elder_brothers_married) : "",
    younger_brothers:         p.younger_brothers != null ? String(p.younger_brothers) : "",
    younger_brothers_married: p.younger_brothers_married != null ? String(p.younger_brothers_married) : "",
    elder_sisters:         p.elder_sisters   != null ? String(p.elder_sisters)   : "",
    elder_sisters_married: p.elder_sisters_married != null ? String(p.elder_sisters_married) : "",
    younger_sisters:         p.younger_sisters != null ? String(p.younger_sisters) : "",
    younger_sisters_married: p.younger_sisters_married != null ? String(p.younger_sisters_married) : "",
    living_country:          p.living_country || "India",
    living_state:            p.living_state || "",
    living_district:         p.living_district || "",
  });

  const [form, setForm] = useState(() => myProfile ? profileToForm(myProfile) : makeDefault());
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (editing) {
      setFatherKothiramCustom(form.father_kothiram ? !AVS_KOTHIRAMS.some(k => k.en === form.father_kothiram) : false);
      setMotherKothiramCustom(form.mother_kothiram ? !AVS_KOTHIRAMS.some(k => k.en === form.mother_kothiram) : false);
      setKothiramCustom(form.kothiram ? !AVS_KOTHIRAMS.some(k => k.en === form.kothiram) : false);
      setFatherWhatsappSame(!form.father_whatsapp || form.father_whatsapp === form.father_mobile);
      setMotherWhatsappSame(!form.mother_whatsapp || form.mother_whatsapp === form.mother_mobile);
    }
  }, [editing, form.father_kothiram, form.mother_kothiram, form.kothiram, form.father_whatsapp, form.father_mobile, form.mother_whatsapp, form.mother_mobile]);

  useEffect(() => {
    // Reset form fully from fresh profile data — do NOT spread old form state
    // so that async-loaded profile values are never overwritten by empty defaults.
    if (myProfile) setForm(profileToForm(myProfile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProfile?.id]);

  // Load own photos when profile is known
  useEffect(() => {
    if (!myProfile?.id) return;
    fetchMyPhotos(myProfile.id).then(setMyPhotos);
  }, [myProfile?.id]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Photo must be under 5 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => update("photo", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.father_mobile?.replace(/\D/g, "")) { setError("Father's mobile number is required"); return; }
    if (fatherWhatsappSame === false && !form.father_whatsapp?.replace(/\D/g, "")) { setError("Father's WhatsApp number is required"); return; }
    const motherMobileClean = form.mother_mobile?.replace(/\D/g, "");
    if (motherMobileClean && motherMobileClean !== "91") {
      if (motherWhatsappSame === false && !form.mother_whatsapp?.replace(/\D/g, "")) {
        setError("Mother's WhatsApp number is required");
        return;
      }
    }

    // Build the payload — convert phone fields to international format before persisting
    const payload = {
      name:            form.name,
      dob:             form.dob,
      height:          form.height,
      marital_status:  form.marital_status,
      education:       form.education,
      occupation:      form.occupation,
      salary:          form.salary,
      kothiram:        form.kothiram,
      native_place:    form.native_place,
      country:         form.country,
      state:           form.state,
      district:        form.district,
      living_country:  form.living_country,
      living_state:    form.living_state,
      living_district: form.living_district,
      about_me:        form.about_me,
      about_me_privacy: form.about_me_privacy || "public",
      social_links_privacy: form.social_links_privacy || "public",
      contact_privacy: form.contact_privacy || "public",
      social_links:    form.social_links || [],
      photo_privacy:   form.photo_privacy,
      // Phone — strip pipe before sending to backend
      whatsapp:        toInternational(form.whatsapp),
      contact:         toInternational(form.contact),
      alt_contact:     toInternational(form.alt_contact),
      // Jothidam
      birth_time:      form.birth_time,
      birth_place:     form.birth_place,
      rasi:            form.rasi,
      natchathiram:    form.natchathiram,
      patham:          form.patham,
      dosham:          form.dosham,
      sevvai_position: form.sevvai_position,
      ragu_position:   form.ragu_position,
      kedhu_position:  form.kedhu_position,
      // Partner expectations
      expectations:    form.expectations,
      // Family details
      father_name:     form.father_name,
      father_kothiram: form.father_kothiram,
      father_mobile:   toInternational(form.father_mobile),
      father_whatsapp: toInternational(fatherWhatsappSame ? form.father_mobile : form.father_whatsapp),
      mother_name:     form.mother_name,
      mother_kothiram: form.mother_kothiram,
      mother_mobile:   toInternational(form.mother_mobile),
      mother_whatsapp: toInternational(motherWhatsappSame ? form.mother_mobile : form.mother_whatsapp),
      // Granular sibling fields — sent to DB and reflected to other users
      elder_brothers:         form.elder_brothers         || "0",
      elder_brothers_married: form.elder_brothers_married || "0",
      younger_brothers:         form.younger_brothers         || "0",
      younger_brothers_married: form.younger_brothers_married || "0",
      elder_sisters:         form.elder_sisters         || "0",
      elder_sisters_married: form.elder_sisters_married || "0",
      younger_sisters:         form.younger_sisters         || "0",
      younger_sisters_married: form.younger_sisters_married || "0",
      // Keep aggregated counts in sync (total brothers / sisters)
      brother_count: String((parseInt(form.elder_brothers || 0) + parseInt(form.younger_brothers || 0)) || ""),
      sister_count:  String((parseInt(form.elder_sisters  || 0) + parseInt(form.younger_sisters  || 0)) || ""),
    };

    // Save to backend if we have a real profile id
    if (myProfile?.id && !myProfile.id.startsWith("local_")) {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("avs_jwt") : null;
        const res = await fetch(`${base}/api/profiles/${myProfile.id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Failed to save profile. Please try again.");
          return;
        }
        // Update local state from the confirmed DB response — reflects to all users immediately
        const dbp = data.profile;
        const updates = {
          ...dbp,
          date_of_birth:  dbp.dob,
          age:            calcAge(dbp.dob || form.dob),
          avatar:         (dbp.name || form.name).slice(0, 2).toUpperCase(),
          alt_contact:    dbp.alt_contact || "",
          // Granular sibling fields — reflected to others viewing the profile
          elder_brothers:           dbp.elder_brothers          != null ? String(dbp.elder_brothers)          : "0",
          elder_brothers_married:   dbp.elder_brothers_married  != null ? String(dbp.elder_brothers_married)  : "0",
          younger_brothers:         dbp.younger_brothers        != null ? String(dbp.younger_brothers)        : "0",
          younger_brothers_married: dbp.younger_brothers_married!= null ? String(dbp.younger_brothers_married): "0",
          elder_sisters:            dbp.elder_sisters           != null ? String(dbp.elder_sisters)           : "0",
          elder_sisters_married:    dbp.elder_sisters_married   != null ? String(dbp.elder_sisters_married)   : "0",
          younger_sisters:          dbp.younger_sisters         != null ? String(dbp.younger_sisters)         : "0",
          younger_sisters_married:  dbp.younger_sisters_married != null ? String(dbp.younger_sisters_married) : "0",
          brother_count:  dbp.brother_count  != null ? String(dbp.brother_count)  : "",
          sister_count:   dbp.sister_count   != null ? String(dbp.sister_count)   : "",
          living_country:  dbp.living_country  || "India",
          living_state:    dbp.living_state    || "",
          living_district: dbp.living_district || "",
        };
        dispatch({ type: "SAVE_PROFILE", payload: { profileId: myProfile.id, updates } });
      } catch (e) {
        setError("Network error — please check your connection and try again.");
        return;
      }
    } else {
      // Local/offline fallback
      const updates = { ...form, ...payload, age: calcAge(form.dob), avatar: form.name.slice(0, 2).toUpperCase() };
      dispatch({ type: "SAVE_PROFILE", payload: { profileId: myProfile?.id, updates } });
    }

    setEditing(false); setSaved(true); setError("");
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCancel = () => {
    setEditing(false); setError("");
    setForm(myProfile ? profileToForm(myProfile) : makeDefault());
  };

  const handleToggleStatus = useCallback(async () => {
    if (!myProfile?.id || statusUpdating) return;
    const newStatus = (myProfile.profile_status || "active") === "active" ? "inactive" : "active";
    setStatusUpdating(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("avs_jwt") : null;
      const res = await fetch(`${base}/api/profiles/${myProfile.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        credentials: "include",
        body: JSON.stringify({ profile_status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch({ type: "SAVE_PROFILE", payload: { profileId: myProfile.id, updates: { profile_status: newStatus } } });
      } else {
        setError(data.error || "Failed to update status");
      }
    } catch (e) {
      setError("Network error updating status");
    } finally {
      setStatusUpdating(false);
    }
  }, [myProfile?.id, myProfile?.profile_status, statusUpdating, dispatch]);

  if (!state.user) {
    return (
      <div className="empty-state">
        <Icon name="lock" size={48} />
        <p>Please login to view your profile</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }}
          onClick={() => dispatch({ type: "SET_PAGE", payload: "login" })}>{t("login")}</button>
      </div>
    );
  }

  const pType = myProfile?.profile_type || state.user?.profile_type || "bride";
  const displayAge = calcAge(form.dob);

  // ── Profile completion percentage ─────────────────────────────────────────
  const COMPLETION_FIELDS = [
    { key: "name", label: t("completionName") },
    { key: "dob", label: t("completionDob") },
    { key: "height", label: t("completionHeight") },
    { key: "education", label: t("completionEducation") },
    { key: "occupation", label: t("completionOccupation") },
    { key: "kothiram", label: t("completionKothiram") },
    { key: "native_place", label: t("completionNative") },
    { key: "district", label: t("completionDistrict") },
    { key: "birth_time", label: t("completionBirthTime") },
    { key: "birth_place", label: t("completionBirthPlace") },
    { key: "rasi", label: t("completionRasi") },
    { key: "natchathiram", label: t("completionNatchathiram") },
    { key: "dosham", label: t("completionDosham") },
    { key: "about_me", label: t("completionAbout") },
    { key: "expectations", label: t("completionExpectations") },
    { key: "whatsapp", label: t("completionWhatsapp") },
    { key: "father_name", label: t("fatherName") },
    { key: "mother_name", label: t("motherName") },
    { key: "photo_url", label: t("completionPhoto") },
  ];
  const filledCount = COMPLETION_FIELDS.filter(f =>
    form[f.key] && String(form[f.key]).trim() !== ""
  ).length;
  const completionPct = Math.round((filledCount / COMPLETION_FIELDS.length) * 100);
  const completionColor =
    completionPct >= 80 ? "#1B7A3D" :
      completionPct >= 50 ? "#E65100" : "#C62828";
  const missingFields = COMPLETION_FIELDS
    .filter(f => !form[f.key] || String(form[f.key]).trim() === "")
    .map(f => f.label)
    .slice(0, 4); // show max 4 hints

  if (fullscreenPhoto) {
    return (
      <div onClick={() => setFullscreenPhoto(null)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
        <button onClick={() => setFullscreenPhoto(null)}
          style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none",
            color: "white", fontSize: 32, cursor: "pointer", lineHeight: 1 }}>✕</button>
        <img src={fullscreenPhoto} alt=""
          style={{ maxWidth: "94vw", maxHeight: "94vh", objectFit: "contain", borderRadius: 8,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
          onClick={e => e.stopPropagation()} />
      </div>
    );
  }

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", maxWidth: 760, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{t("profile")}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {editing ? (
            <>
              <button className="btn btn-sm btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={handleSave}><Icon name="check" size={14} /> Save</button>
            </>
          ) : (
            <button className="btn btn-sm btn-secondary" onClick={() => setEditing(true)}>
              <Icon name="edit" size={14} /> {t("editProfile")}
            </button>
          )}
        </div>
      </div>

      {saved && <div style={{ background: "#E6F9EE", color: "#1B7A3D", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>✓ Profile saved successfully!</div>}
      {error && <div style={{ background: "#fff5f5", color: "var(--clr-danger)", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>⚠ {error}</div>}

      {/* Profile Header Card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ height: 90, background: pType === "bride" ? "linear-gradient(135deg,#FFD1DC,#FFB6C1)" : "linear-gradient(135deg,#B8D4E3,#87CEEB)" }} />
        <div style={{ padding: "0 24px 24px", marginTop: -44 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <div className={`avatar avatar-xl avatar-${pType}`}
                style={{ border: "4px solid white", boxShadow: "var(--shadow-md)", overflow: "hidden", cursor: editing ? "pointer" : (form.photo ? "zoom-in" : "default") }}
                onClick={() => {
                  if (editing) {
                    photoInputRef.current?.click();
                  } else if (form.photo) {
                    setFullscreenPhoto(form.photo);
                  }
                }}>
                {form.photo
                  ? <img src={form.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                  : <span style={{ fontSize: 20, fontWeight: 700 }}>{form.name?.slice(0, 2).toUpperCase() || "?"}</span>
                }
              </div>
              {editing && (
                <button onClick={() => photoInputRef.current?.click()}
                  style={{ position: "absolute", bottom: 0, right: 0, background: "var(--clr-saffron)", color: "white", border: "2px solid white", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="camera" size={13} />
                </button>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
            </div>
            <div style={{ flex: 1, minWidth: 200, paddingBottom: 4 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>{form.name || state.user.name}</h3>
              <div style={{ fontSize: 13, color: "var(--clr-text-muted)", marginTop: 2 }}>
                {myProfile?.profile_id || state.user?.profile_id
                  ? (myProfile?.profile_id || state.user?.profile_id)
                  : <span style={{ fontSize: 11, fontWeight: 600, color: "#856404", background: "#FFF3CD", border: "1px solid #FFD166", borderRadius: 4, padding: "1px 6px" }}>⏳ Pending Approval</span>
                }
                {displayAge ? ` · ${displayAge} yrs` : ""}
                {form.district ? ` · ${form.district}` : ""}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <span className={`badge badge-${pType}`}>{t(pType)}</span>
                <span className={`badge badge-${myProfile?.profile_status || "active"}`}>{t(myProfile?.profile_status || "active")}</span>
                <span className={`badge badge-${myProfile?.approval_status || "pending"}`}>{t(myProfile?.approval_status || "pending")}</span>
              </div>
              {/* ── Active / Inactive toggle ── */}
              {myProfile && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-text-muted)" }}>
                    Profile Visibility:
                  </span>
                  <button
                    onClick={handleToggleStatus}
                    disabled={statusUpdating}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "5px 12px",
                      borderRadius: 20, border: "none", cursor: statusUpdating ? "not-allowed" : "pointer",
                      fontWeight: 600, fontSize: 12, transition: "all 0.2s",
                      background: (myProfile.profile_status || "active") === "active"
                        ? "linear-gradient(135deg,#1B7A3D,#27ae60)" : "#bdc3c7",
                      color: "white", opacity: statusUpdating ? 0.6 : 1,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                    }}
                  >
                    <span style={{
                      width: 14, height: 14, borderRadius: "50%", background: "rgba(255,255,255,0.9)",
                      display: "inline-block", flexShrink: 0,
                      boxShadow: (myProfile.profile_status || "active") === "active"
                        ? "0 0 0 3px rgba(255,255,255,0.3)" : "none",
                    }} />
                    {statusUpdating ? t("profileUpdating")
                      : (myProfile.profile_status || "active") === "active"
                        ? t("profileVisible") : t("profileHidden")}
                  </button>
                </div>
              )}

              {/* ── Profile completion bar ── */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: completionColor }}>
                    Profile {completionPct}% Complete
                  </span>
                  {missingFields.length > 0 && !editing && (
                    <span style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>
                      Missing: {missingFields.join(", ")}
                    </span>
                  )}
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--clr-border)", overflow: "hidden" }}>
                  <div style={{ width: `${completionPct}%`, height: "100%", background: completionColor, borderRadius: 3, transition: "width 0.4s ease" }} />
                </div>
              </div>
            </div>
          </div>
          {(myProfile?.approval_status === "pending" || !myProfile) && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#FFFDE7", border: "1px solid #FFD166", borderRadius: 6, fontSize: 12, color: "#856404" }}>
              ⏳ Your profile is pending admin approval. Complete your profile details for faster review.
            </div>
          )}
        </div>
      </div>

      {/* ── Personal Details ── */}
      {renderSection(t("personalDetails"), [
        { key: "name", label: t("name"), type: "text" },
        { key: "dob", label: t("dob"), type: "date" },
        { key: "birth_time", label: t("birthTime"), type: "time" },
        { key: "birth_place", label: t("birthPlace"), type: "text", placeholder: t("birthPlace") + "..." },
        { key: "height", label: t("height"), type: "custom_height" },
        { key: "marital_status", label: t("maritalStatus"), type: "select", options: [
          { v: "never_married", l: "Never Married" },
          { v: "divorced",      l: "Divorced" },
          { v: "widowed",       l: "Widowed" },
        ]},
        { key: "education", label: t("education"), type: "select", options: [{ v: "", l: "— Select —" }, ...EDUCATIONS.map(e => ({ v: e.value, l: e.label }))] },
        { key: "occupation", label: t("occupation"), type: "select", options: [{ v: "", l: "— Select —" }, ...OCCUPATIONS.map(o => ({ v: o, l: o }))] },
        { key: "salary", label: `${t("salary")} (LPA)`, type: "number", placeholder: "e.g. 10" },
      ], form, update, editing, t)}

      {/* ── Community Details ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t("communityDetails")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t("subCaste")} (Kothiram)</label>
              {editing ? (
                <>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 6 }}>
                    <input type="checkbox" style={{ accentColor: "var(--clr-saffron)" }}
                      checked={!kothiramCustom}
                      onChange={e => {
                        setKothiramCustom(!e.target.checked);
                        update("kothiram", "");
                      }} />
                    <span style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>
                      Belongs to our community (ஆறுநாட்டு வேளாளர்)
                    </span>
                  </label>
                  {!kothiramCustom ? (
                    <select className="form-input" value={form.kothiram || ""} onChange={e => update("kothiram", e.target.value)}>
                      <option value="">— Select Kothiram —</option>
                      {AVS_KOTHIRAMS.map(k => (
                        <option key={k.en} value={k.en}>{k.en} — {k.ta}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="form-input" type="text" value={form.kothiram || ""}
                      placeholder="Enter your Kothiram"
                      onChange={e => update("kothiram", e.target.value)} />
                  )}
                </>
              ) : (
                <ReadOnlyField>
                  {AVS_KOTHIRAMS.find(k => k.en === form.kothiram)
                    ? `${form.kothiram} — ${AVS_KOTHIRAMS.find(k => k.en === form.kothiram).ta}`
                    : form.kothiram || <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}
                </ReadOnlyField>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Native Place</label>
              {editing
                ? <input className="form-input" type="text" value={form.native_place || ""} placeholder={t("nativePlaceLabel") + "..."} onChange={e => update("native_place", e.target.value)} />
                : <ReadOnlyField>{form.native_place || <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}</ReadOnlyField>
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── Location Details ── */}
      {renderSection(t("locationDetails"), [
        { key: "country", label: t("country"), type: "text", placeholder: "e.g. India" },
        { key: "state", label: t("state"), type: "text", placeholder: "e.g. Tamil Nadu" },
        { key: "district", label: t("district"), type: "text", placeholder: "e.g. Coimbatore" },
      ], form, update, editing, t)}

      {/* ── Jothidam Details ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🔯 Jothidam Details</h3>
          <div style={{ display: "grid", gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Rasi (Zodiac)</label>
              {editing ? (
                <select className="form-input" value={form.rasi || ""} onChange={e => update("rasi", e.target.value)}>
                  <option value="">— Select Rasi —</option>
                  {RASIS.map(r => <option key={r.id} value={r.id}>{r.en} — {r.ta}</option>)}
                </select>
              ) : (
                <ReadOnlyField>
                  {RASIS.find(r => r.id === form.rasi) ? `${RASIS.find(r => r.id === form.rasi).en} — ${RASIS.find(r => r.id === form.rasi).ta}` : <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}
                </ReadOnlyField>
              )}
            </div>
            {(editing ? form.rasi : form.natchathiram) && (
              <div className="form-group">
                <label className="form-label">Natchathiram (Birth Star)</label>
                {editing ? (
                  <select className="form-input" value={form.natchathiram || ""} onChange={e => update("natchathiram", e.target.value)}>
                    <option value="">— Select Natchathiram —</option>
                    {getNatchathiramsByRasi(form.rasi).map(n => <option key={n.id} value={n.id}>{n.en} — {n.ta}</option>)}
                  </select>
                ) : (
                  <ReadOnlyField>
                    {NATCHATHIRAMS.find(n => n.id === form.natchathiram) ? `${NATCHATHIRAMS.find(n => n.id === form.natchathiram).en} — ${NATCHATHIRAMS.find(n => n.id === form.natchathiram).ta}` : <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}
                  </ReadOnlyField>
                )}
              </div>
            )}
            {(editing ? (form.rasi && form.natchathiram) : form.patham) && (
              <div className="form-group">
                <label className="form-label">Patham (Pada)</label>
                {editing ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {getPadamsForRasi(form.natchathiram, form.rasi).map(p => (
                      <button key={p} type="button"
                        onClick={() => update("patham", String(p))}
                        style={{
                          padding: "10px 0", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 700, fontSize: 14,
                          border: `2px solid ${form.patham === String(p) ? "var(--clr-saffron)" : "var(--clr-border)"}`,
                          background: form.patham === String(p) ? "#FFF5F0" : "var(--clr-white)",
                          color: form.patham === String(p) ? "var(--clr-saffron)" : "var(--clr-text-muted)",
                        }}>
                        {p}<sup style={{ fontSize: 9 }}>{p === 1 ? "st" : p === 2 ? "nd" : p === 3 ? "rd" : "th"}</sup> Patham
                      </button>
                    ))}
                  </div>
                ) : (
                  <ReadOnlyField>
                    {form.patham ? `${form.patham}${form.patham === "1" ? "st" : form.patham === "2" ? "nd" : form.patham === "3" ? "rd" : "th"} Patham` : <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}
                  </ReadOnlyField>
                )}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Dosham Status</label>
              {editing ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {DOSHAM_TYPES.map(d => (
                    <button key={d.id} type="button"
                      onClick={() => update("dosham", d.id)}
                      style={{
                        padding: "10px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "left",
                        border: `2px solid ${form.dosham === d.id ? "var(--clr-saffron)" : "var(--clr-border)"}`,
                        background: form.dosham === d.id ? "#FFF5F0" : "var(--clr-white)",
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${form.dosham === d.id ? "var(--clr-saffron)" : "var(--clr-border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {form.dosham === d.id && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--clr-saffron)" }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.en}</div>
                        <div style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>{d.ta}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <ReadOnlyField>
                  {DOSHAM_TYPES.find(d => d.id === form.dosham)?.en || <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}
                </ReadOnlyField>
              )}
            </div>
            {(form.dosham === "sevvai" || form.dosham === "sevvai_ragu_kedhu") && (
              <div className="form-group">
                <label className="form-label">Sevvai (Mars) Position from Lagnam</label>
                {editing ? (
                  <select className="form-input" value={form.sevvai_position || ""} onChange={e => update("sevvai_position", e.target.value)}>
                    <option value="">— Select House —</option>
                    {LAGNAM_POSITIONS.map(lp => <option key={lp.id} value={lp.id}>{lp.en} — {lp.ta}</option>)}
                  </select>
                ) : (
                  <ReadOnlyField>
                    {LAGNAM_POSITIONS.find(l => l.id === form.sevvai_position)?.en || <span style={{ color: "var(--clr-text-muted)" }}>Not specified</span>}
                  </ReadOnlyField>
                )}
              </div>
            )}
            {(form.dosham === "ragu_kedhu" || form.dosham === "sevvai_ragu_kedhu") && (
              <>
                <div className="form-group">
                  <label className="form-label">Ragu Position from Lagnam</label>
                  {editing ? (
                    <select className="form-input" value={form.ragu_position || ""} onChange={e => update("ragu_position", e.target.value)}>
                      <option value="">— Select House —</option>
                      {LAGNAM_POSITIONS.map(lp => <option key={lp.id} value={lp.id}>{lp.en} — {lp.ta}</option>)}
                    </select>
                  ) : (
                    <ReadOnlyField>
                      {LAGNAM_POSITIONS.find(l => l.id === form.ragu_position)?.en || <span style={{ color: "var(--clr-text-muted)" }}>Not specified</span>}
                    </ReadOnlyField>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Kedhu Position from Lagnam</label>
                  {editing ? (
                    <select className="form-input" value={form.kedhu_position || ""} onChange={e => update("kedhu_position", e.target.value)}>
                      <option value="">— Select House —</option>
                      {LAGNAM_POSITIONS.map(lp => <option key={lp.id} value={lp.id}>{lp.en} — {lp.ta}</option>)}
                    </select>
                  ) : (
                    <ReadOnlyField>
                      {LAGNAM_POSITIONS.find(l => l.id === form.kedhu_position)?.en || <span style={{ color: "var(--clr-text-muted)" }}>Not specified</span>}
                    </ReadOnlyField>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── About Me ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t("additionalDetails")}</h3>
          <div className="form-group">
            <label className="form-label">{t("aboutMe")}</label>
            {editing ? (
              <textarea className="form-input" rows={4} value={form.about_me || ""} placeholder={t("aboutMe") + "..."} onChange={e => update("about_me", e.target.value)} />
            ) : (
              <p style={{ fontSize: 14, lineHeight: 1.7 }}>{form.about_me || <span style={{ color: "var(--clr-text-muted)" }}>Not added</span>}</p>
            )}
          </div>

          {/* Social Media Links */}
          <div className="form-group">
            <label className="form-label">Social Media Links</label>
            {editing ? (
              <div style={{ display: "grid", gap: 10 }}>
                {(form.social_links || []).map((link, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--clr-bg-subtle)", padding: "8px 12px", borderRadius: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", minWidth: 80 }}>{link.platform}:</span>
                    <a href={link.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--clr-saffron)", textDecoration: "underline" }}>{link.url}</a>
                    <button type="button" onClick={() => {
                      const nextLinks = (form.social_links || []).filter((_, i) => i !== idx);
                      update("social_links", nextLinks);
                    }} style={{ background: "none", border: "none", color: "var(--clr-danger)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select className="form-input" style={{ width: 120, margin: 0 }} id="edit-link-platform">
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                    <option value="other">Other</option>
                  </select>
                  <input className="form-input" type="text" placeholder="Paste link URL here..." style={{ flex: 1, margin: 0 }} id="edit-link-url" />
                  <button type="button" className="btn btn-secondary" style={{ padding: "8px 14px", height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => {
                      const pSel = document.getElementById("edit-link-platform");
                      const uInput = document.getElementById("edit-link-url");
                      if (!uInput || !pSel) return;
                      const url = uInput.value.trim();
                      const platform = pSel.value;
                      if (!url) return;
                      const nextLinks = [...(form.social_links || []), { platform, url }];
                      update("social_links", nextLinks);
                      uInput.value = "";
                    }}>
                    <Icon name="plus" size={16} /> Add
                  </button>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>Who can view your Social Media Links?</label>
                  <select className="form-input" style={{ maxWidth: 260 }} value={form.social_links_privacy || "public"} onChange={e => update("social_links_privacy", e.target.value)}>
                    <option value="public">View to Others (Everyone)</option>
                    <option value="loggedIn">Logged-in Users Only</option>
                    <option value="accepted">Accepted Interests Only</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                {(form.social_links || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>No social media links added.</p>
                ) : (
                  <>
                    <div style={{ display: "grid", gap: 8 }}>
                      {(form.social_links || []).map((link, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "capitalize", minWidth: 80, color: "var(--clr-text-muted)" }}>{link.platform}:</span>
                          <a href={link.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--clr-saffron)", fontWeight: 600, textDecoration: "underline" }}>{link.url}</a>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginTop: 8 }}>
                      🔒 Visibility: {form.social_links_privacy === "accepted" ? "Accepted Interests Only" : form.social_links_privacy === "loggedIn" ? "Logged-in Users Only" : "Everyone"}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Partner Expectations</label>
            {editing
              ? <textarea className="form-input" rows={4} value={form.expectations || ""} placeholder={t("expectations") + "..."} onChange={e => update("expectations", e.target.value)} />
              : <p style={{ fontSize: 14, lineHeight: 1.7 }}>{form.expectations || <span style={{ color: "var(--clr-text-muted)" }}>Not added</span>}</p>
            }
          </div>
        </div>
      </div>

      {/* ── Family Details ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            {t("familyDetails")}
          </h3>

          {/* Parents */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--clr-saffron)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
              Parents
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              {/* Father's Name — free text */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Father's Name</label>
                {editing
                  ? <input className="form-input" type="text" value={form.father_name || ""} placeholder="Father's full name" onChange={e => update("father_name", e.target.value)} />
                  : <ReadOnlyField>{form.father_name || <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}</ReadOnlyField>
                }
              </div>
              {/* Father's Kothiram — dropdown */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Father's Kothiram</label>
                {editing ? (
                  <>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 6 }}>
                      <input type="checkbox" style={{ accentColor: "var(--clr-saffron)" }}
                        checked={!fatherKothiramCustom}
                        onChange={e => {
                          setFatherKothiramCustom(!e.target.checked);
                          update("father_kothiram", "");
                        }} />
                      <span style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>
                        Belongs to our community (ஆறுநாட்டு வேளாளர்)
                      </span>
                    </label>
                    {!fatherKothiramCustom ? (
                      <select className="form-input" value={form.father_kothiram || ""} onChange={e => update("father_kothiram", e.target.value)}>
                        <option value="">— Select Kothiram —</option>
                        {AVS_KOTHIRAMS.map(k => (
                          <option key={k.en} value={k.en}>{k.en} — {k.ta}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="form-input" type="text" value={form.father_kothiram || ""}
                        placeholder="Enter father's Kothiram"
                        onChange={e => update("father_kothiram", e.target.value)} />
                    )}
                  </>
                ) : (
                  <ReadOnlyField>
                    {AVS_KOTHIRAMS.find(k => k.en === form.father_kothiram)
                      ? `${form.father_kothiram} — ${AVS_KOTHIRAMS.find(k => k.en === form.father_kothiram).ta}`
                      : form.father_kothiram || <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}
                  </ReadOnlyField>
                )}
              </div>
              {/* Mother's Name — free text */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mother's Name</label>
                {editing
                  ? <input className="form-input" type="text" value={form.mother_name || ""} placeholder="Mother's full name" onChange={e => update("mother_name", e.target.value)} />
                  : <ReadOnlyField>{form.mother_name || <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}</ReadOnlyField>
                }
              </div>
              {/* Mother's Birth Kothiram — dropdown */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mother's Birth Kothiram</label>
                {editing ? (
                  <>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 6 }}>
                      <input type="checkbox" style={{ accentColor: "var(--clr-saffron)" }}
                        checked={!motherKothiramCustom}
                        onChange={e => {
                          setMotherKothiramCustom(!e.target.checked);
                          update("mother_kothiram", "");
                        }} />
                      <span style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>
                        Belongs to our community (ஆறுநாட்டு வேளாளர்)
                      </span>
                    </label>
                    {!motherKothiramCustom ? (
                      <select className="form-input" value={form.mother_kothiram || ""} onChange={e => update("mother_kothiram", e.target.value)}>
                        <option value="">— Select Kothiram —</option>
                        {AVS_KOTHIRAMS.map(k => (
                          <option key={k.en} value={k.en}>{k.en} — {k.ta}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="form-input" type="text" value={form.mother_kothiram || ""}
                        placeholder="Enter mother's Birth Kothiram"
                        onChange={e => update("mother_kothiram", e.target.value)} />
                    )}
                  </>
                ) : (
                  <ReadOnlyField>
                    {AVS_KOTHIRAMS.find(k => k.en === form.mother_kothiram)
                      ? `${form.mother_kothiram} — ${AVS_KOTHIRAMS.find(k => k.en === form.mother_kothiram).ta}`
                      : form.mother_kothiram || <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}
                  </ReadOnlyField>
                )}
              </div>
              {/* Father's Mobile */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Father's Mobile Number</label>
                {editing ? (
                  <>
                    <PhoneInput
                      value={form.father_mobile || ""}
                      placeholder="Father's phone number"
                      onChange={v => update("father_mobile", v)}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 6 }}>
                      <input type="checkbox" style={{ accentColor: "var(--clr-saffron)" }}
                        checked={fatherWhatsappSame}
                        onChange={e => {
                          setFatherWhatsappSame(e.target.checked);
                          if (e.target.checked) update("father_whatsapp", "");
                        }} />
                      <span style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>
                        Contact same as WhatsApp
                      </span>
                    </label>
                  </>
                ) : (
                  <ReadOnlyField>
                    <div style={{ width: "100%" }}>
                      <span>{form.father_mobile ? formatPhone(form.father_mobile) : <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}</span>
                      {form.father_mobile && (!form.father_whatsapp || form.father_whatsapp === form.father_mobile) && (
                        <span style={{ fontSize: 11, color: "var(--clr-success)", marginLeft: 6, fontWeight: 600 }}>(WhatsApp Same)</span>
                      )}
                    </div>
                  </ReadOnlyField>
                )}
              </div>
              {/* Father's WhatsApp */}
              {(editing ? !fatherWhatsappSame : (form.father_whatsapp && form.father_whatsapp !== form.father_mobile)) && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Father's WhatsApp Number</label>
                  {editing ? (
                    <PhoneInput
                      value={form.father_whatsapp || ""}
                      placeholder="Father's WhatsApp number"
                      onChange={v => update("father_whatsapp", v)}
                    />
                  ) : (
                    <ReadOnlyField>
                      {form.father_whatsapp ? formatPhone(form.father_whatsapp) : <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}
                    </ReadOnlyField>
                  )}
                </div>
              )}
              {/* Mother's Mobile */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mother's Mobile Number (Optional)</label>
                {editing ? (
                  <>
                    <PhoneInput
                      value={form.mother_mobile || ""}
                      placeholder="Mother's phone number"
                      onChange={v => update("mother_mobile", v)}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 6 }}>
                      <input type="checkbox" style={{ accentColor: "var(--clr-saffron)" }}
                        checked={motherWhatsappSame}
                        onChange={e => {
                          setMotherWhatsappSame(e.target.checked);
                          if (e.target.checked) update("mother_whatsapp", "");
                        }} />
                      <span style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>
                        Contact same as WhatsApp
                      </span>
                    </label>
                  </>
                ) : (
                  <ReadOnlyField>
                    <div style={{ width: "100%" }}>
                      <span>{form.mother_mobile ? formatPhone(form.mother_mobile) : <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}</span>
                      {form.mother_mobile && (!form.mother_whatsapp || form.mother_whatsapp === form.mother_mobile) && (
                        <span style={{ fontSize: 11, color: "var(--clr-success)", marginLeft: 6, fontWeight: 600 }}>(WhatsApp Same)</span>
                      )}
                    </div>
                  </ReadOnlyField>
                )}
              </div>
              {/* Mother's WhatsApp */}
              {(editing ? !motherWhatsappSame : (form.mother_whatsapp && form.mother_whatsapp !== form.mother_mobile)) && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mother's WhatsApp Number (Optional)</label>
                  {editing ? (
                    <PhoneInput
                      value={form.mother_whatsapp || ""}
                      placeholder="Mother's WhatsApp number"
                      onChange={v => update("mother_whatsapp", v)}
                    />
                  ) : (
                    <ReadOnlyField>
                      {form.mother_whatsapp ? formatPhone(form.mother_whatsapp) : <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}
                    </ReadOnlyField>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Family Living In */}
          <div style={{ marginBottom: 18, marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--clr-border)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--clr-saffron)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
              Family Living In
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("livingCountry")}</label>
                {editing ? (
                  <input className="form-input" type="text" value={form.living_country || ""} placeholder="e.g. India" onChange={e => update("living_country", e.target.value)} />
                ) : (
                  <ReadOnlyField>{form.living_country || <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}</ReadOnlyField>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("livingState")}</label>
                {editing ? (
                  <input className="form-input" type="text" value={form.living_state || ""} placeholder="e.g. Tamil Nadu" onChange={e => update("living_state", e.target.value)} />
                ) : (
                  <ReadOnlyField>{form.living_state || <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}</ReadOnlyField>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("livingDistrict")}</label>
                {editing ? (
                  <input className="form-input" type="text" value={form.living_district || ""} placeholder="e.g. Coimbatore" onChange={e => update("living_district", e.target.value)} />
                ) : (
                  <ReadOnlyField>{form.living_district || <span style={{ color: "var(--clr-text-muted)" }}>Not set</span>}</ReadOnlyField>
                )}
              </div>
            </div>
          </div>

          {/* Siblings — Elder/Younger split with married counts */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--clr-saffron)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
              Siblings
            </div>

            {/* Brothers */}
            <div style={{ background: "var(--clr-bg-subtle)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--clr-saffron)", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="users" size={15} /> Brothers
              </div>

              {/* Elder Brothers */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: 8 }}>Elder Brothers</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">No. of Elder Brothers</label>
                    {editing
                      ? <input className="form-input" type="number" min="0" max="10"
                          value={form.elder_brothers || ""} placeholder="0"
                          onChange={e => { update("elder_brothers", e.target.value); update("elder_brothers_married", ""); }} />
                      : <ReadOnlyField>{form.elder_brothers || "0"}</ReadOnlyField>
                    }
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">No. Married</label>
                    {editing
                      ? <input className="form-input" type="number" min="0"
                          max={parseInt(form.elder_brothers || 0)}
                          disabled={!parseInt(form.elder_brothers)}
                          style={{ opacity: !parseInt(form.elder_brothers) ? 0.5 : 1 }}
                          value={form.elder_brothers_married || ""} placeholder="0"
                          onChange={e => update("elder_brothers_married", e.target.value)} />
                      : <ReadOnlyField>{form.elder_brothers_married || "0"}</ReadOnlyField>
                    }
                  </div>
                </div>
              </div>

              {/* Younger Brothers */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: 8 }}>Younger Brothers</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">No. of Younger Brothers</label>
                    {editing
                      ? <input className="form-input" type="number" min="0" max="10"
                          value={form.younger_brothers || ""} placeholder="0"
                          onChange={e => { update("younger_brothers", e.target.value); update("younger_brothers_married", ""); }} />
                      : <ReadOnlyField>{form.younger_brothers || "0"}</ReadOnlyField>
                    }
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">No. Married</label>
                    {editing
                      ? <input className="form-input" type="number" min="0"
                          max={parseInt(form.younger_brothers || 0)}
                          disabled={!parseInt(form.younger_brothers)}
                          style={{ opacity: !parseInt(form.younger_brothers) ? 0.5 : 1 }}
                          value={form.younger_brothers_married || ""} placeholder="0"
                          onChange={e => update("younger_brothers_married", e.target.value)} />
                      : <ReadOnlyField>{form.younger_brothers_married || "0"}</ReadOnlyField>
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Sisters */}
            <div style={{ background: "var(--clr-bg-subtle)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--clr-saffron)", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="users" size={15} /> Sisters
              </div>

              {/* Elder Sisters */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: 8 }}>Elder Sisters</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">No. of Elder Sisters</label>
                    {editing
                      ? <input className="form-input" type="number" min="0" max="10"
                          value={form.elder_sisters || ""} placeholder="0"
                          onChange={e => { update("elder_sisters", e.target.value); update("elder_sisters_married", ""); }} />
                      : <ReadOnlyField>{form.elder_sisters || "0"}</ReadOnlyField>
                    }
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">No. Married</label>
                    {editing
                      ? <input className="form-input" type="number" min="0"
                          max={parseInt(form.elder_sisters || 0)}
                          disabled={!parseInt(form.elder_sisters)}
                          style={{ opacity: !parseInt(form.elder_sisters) ? 0.5 : 1 }}
                          value={form.elder_sisters_married || ""} placeholder="0"
                          onChange={e => update("elder_sisters_married", e.target.value)} />
                      : <ReadOnlyField>{form.elder_sisters_married || "0"}</ReadOnlyField>
                    }
                  </div>
                </div>
              </div>

              {/* Younger Sisters */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: 8 }}>Younger Sisters</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">No. of Younger Sisters</label>
                    {editing
                      ? <input className="form-input" type="number" min="0" max="10"
                          value={form.younger_sisters || ""} placeholder="0"
                          onChange={e => { update("younger_sisters", e.target.value); update("younger_sisters_married", ""); }} />
                      : <ReadOnlyField>{form.younger_sisters || "0"}</ReadOnlyField>
                    }
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">No. Married</label>
                    {editing
                      ? <input className="form-input" type="number" min="0"
                          max={parseInt(form.younger_sisters || 0)}
                          disabled={!parseInt(form.younger_sisters)}
                          style={{ opacity: !parseInt(form.younger_sisters) ? 0.5 : 1 }}
                          value={form.younger_sisters_married || ""} placeholder="0"
                          onChange={e => update("younger_sisters_married", e.target.value)} />
                      : <ReadOnlyField>{form.younger_sisters_married || "0"}</ReadOnlyField>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      {renderSection(t("contactDetails"), [
        { key: "email", label: t("email"), type: "email" },
        { key: "whatsapp", label: t("whatsapp"), type: "tel" },
        { key: "contact", label: t("contact"), type: "tel" },
        { key: "alt_contact", label: t("altContact"), type: "tel" },
      ], form, update, editing, t)}

      {/* ── Photo Gallery ── */}
      {myProfile && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>📷 Photo Gallery</h3>
              <button className="btn btn-sm btn-secondary" disabled={uploading || myPhotos.filter(p => p.photo_type === "gallery").length >= 4}
                onClick={() => galleryInputRef.current?.click()}>
                <Icon name="camera" size={13} /> {uploading ? "Uploading…" : myPhotos.filter(p => p.photo_type === "gallery").length >= 4 ? "Limit Reached (Max 4)" : "Add Photo"}
              </button>
              <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={async e => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const currentGalleryCount = myPhotos.filter(p => p.photo_type === "gallery").length;
                  if (currentGalleryCount >= 4) {
                    setError("Maximum 4 images allowed in the gallery.");
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) { setError("Photo must be under 5 MB"); return; }
                  setUploading(true);
                  try {
                    const webpB64 = await convertToWebP(file);
                    // Change file extension to .webp
                    const dotIdx = file.name.lastIndexOf('.');
                    const webpName = (dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name) + ".webp";
                    const res = await uploadPhoto(webpB64, webpName, "gallery");
                    if (res.success) setMyPhotos(prev => [...prev, res.photo]);
                    else setError(res.error || "Upload failed");
                  } catch (err) {
                    console.error("Gallery upload error:", err);
                    setError("Upload failed");
                  }
                  finally { setUploading(false); e.target.value = ""; }
                }} />
            </div>
            {myPhotos.filter(p => p.photo_type === "gallery").length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>No photos yet. Add photos to your gallery.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
                {myPhotos.filter(p => p.photo_type === "gallery").map(ph => (
                  <div key={ph.id}
                    onClick={() => setFullscreenPhoto(ph.photo_url)}
                    style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "zoom-in",
                      border: "2px solid " + (ph.status === "approved" ? "var(--clr-success)" : ph.status === "rejected" ? "var(--clr-danger)" : "var(--clr-border)") }}>
                    <img src={ph.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)",
                      fontSize: 9, fontWeight: 700, color: "white", textAlign: "center", padding: 3 }}>
                      {ph.status === "approved" ? "✓ Approved" : ph.status === "rejected" ? "✗ Rejected" : "⏳ Pending"}
                    </div>
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("Delete this photo?")) return;
                      const res = await deletePhoto(ph.id);
                      if (res.success) setMyPhotos(prev => prev.filter(x => x.id !== ph.id));
                    }} style={{ position: "absolute", top: 4, right: 4, zIndex: 10, background: "rgba(0,0,0,0.6)",
                      border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                      <Icon name="x" size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11, color: "var(--clr-text-muted)", marginTop: 8 }}>
              ⏳ Photos are reviewed by Admin before being visible to others.
            </p>
            {/* Photo Privacy — placed here next to gallery */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--clr-border)" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("photoPrivacy")}</label>
                {editing ? (
                  <select className="form-input" style={{ maxWidth: 260 }} value={form.photo_privacy || "public"} onChange={e => update("photo_privacy", e.target.value)}>
                    <option value="public">{t("public")}</option>
                    <option value="accepted">{t("acceptedOnly")}</option>
                    <option value="loggedIn">{t("loggedInOnly")}</option>
                  </select>
                ) : (
                  <ReadOnlyField>
                    🔒 {form.photo_privacy === "accepted" ? t("acceptedOnly") : form.photo_privacy === "loggedIn" ? t("loggedInOnly") : t("public")}
                  </ReadOnlyField>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Jathagam (Horoscope) ── */}
      {myProfile && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>🔯 Jathagam (Horoscope)</h3>
            {(() => {
              const jathagam = myPhotos.find(p => p.photo_type === "horoscope");
              if (jathagam) {
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                    background: "var(--clr-bg-subtle)", borderRadius: 10,
                    border: "2px solid " + (jathagam.status === "approved" ? "var(--clr-success)" : jathagam.status === "rejected" ? "var(--clr-danger)" : "var(--clr-border)") }}>
                    <span style={{ fontSize: 32 }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Jathagam uploaded</div>
                      <div style={{ fontSize: 12, color: jathagam.status === "approved" ? "var(--clr-success)" : jathagam.status === "rejected" ? "var(--clr-danger)" : "var(--clr-text-muted)" }}>
                        {jathagam.status === "approved" ? "✓ Verified by Admin" : jathagam.status === "rejected" ? "✗ Rejected — upload again" : "⏳ Pending Admin verification"}
                      </div>
                    </div>
                    <a href={jathagam.photo_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">
                      <Icon name="eye" size={13} /> View
                    </a>
                    <button className="btn btn-sm btn-danger" onClick={async () => {
                      if (!confirm("Remove jathagam?")) return;
                      const res = await deletePhoto(jathagam.id);
                      if (res.success) setMyPhotos(prev => prev.filter(x => x.id !== jathagam.id));
                    }}>
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                );
              }
              return (
                <div>
                  <p style={{ fontSize: 13, color: "var(--clr-text-muted)", marginBottom: 14 }}>
                    Upload your horoscope (PDF or image). Admin will verify before others can view it.
                  </p>
                  <button className="btn btn-secondary" disabled={uploading}
                    onClick={() => jathagamInputRef.current?.click()}>
                    <Icon name="upload" size={14} /> {uploading ? "Uploading…" : "Upload Jathagam"}
                  </button>
                  <input ref={jathagamInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }}
                    onChange={async e => {
                      const file = e.target.files?.[0]; if (!file) return;
                      if (file.size > 10 * 1024 * 1024) { setError("File must be under 10 MB"); return; }
                      setUploading(true);
                      try {
                        const b64 = await toBase64(file);
                        const res = await uploadPhoto(b64, file.name, "horoscope");
                        if (res.success) setMyPhotos(prev => [...prev, res.photo]);
                        else setError(res.error || "Upload failed");
                      } catch { setError("Upload failed"); }
                      finally { setUploading(false); e.target.value = ""; }
                    }} />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {editing && (
        <button className="btn btn-primary btn-block btn-lg" onClick={handleSave}>
          <Icon name="check" size={16} /> {t("saveProfile")}
        </button>
      )}
    </div>
  );
}

function ReadOnlyField({ children }) {
  return (
    <div style={{
      fontSize: 14,
      fontWeight: 500,
      color: "var(--clr-text)",
      padding: "8px 12px",
      background: "var(--clr-bg-subtle, #f9f9f9)",
      borderRadius: 6,
      border: "1px solid var(--clr-border, #e2e8f0)",
      marginTop: 6,
      minHeight: 38,
      display: "flex",
      alignItems: "center"
    }}>
      {children}
    </div>
  );
}

function renderSection(title, fields, form, update, editing, t) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-body">
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{title}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {fields.map(f => (
            <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{f.label}</label>
              {editing && !f.disabled ? (
                f.type === "select" ? (
                  <select className="form-input" value={form[f.key] || ""} onChange={e => update(f.key, e.target.value)}>
                    {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                ) : f.type === "custom_height" ? (
                  <HeightPicker
                    value={form[f.key] || ""}
                    onChange={v => update(f.key, v)}
                  />
                ) : f.type === "tel" ? (
                  <>
                    <PhoneInput
                      value={form[f.key] || ""}
                      placeholder="Phone number"
                      onChange={v => update(f.key, v)}
                    />
                    {f.key === "whatsapp" && (
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 6 }}>
                        <input type="checkbox" style={{ accentColor: "var(--clr-saffron)" }}
                          checked={form.contact_privacy === "public"}
                          onChange={e => update("contact_privacy", e.target.checked ? "public" : "accepted")} />
                        <span style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>
                          Show Contact & WhatsApp Number to other profiles
                        </span>
                      </label>
                    )}
                  </>
                ) : (
                  <input className="form-input" type={f.type || "text"} value={form[f.key] || ""} placeholder={f.placeholder || ""}
                    onChange={e => update(f.key, e.target.value)} />
                )
              ) : (
                <ReadOnlyField>
                  {f.disabled ? f.fixedValue
                    : f.type === "select" ? (f.options?.find(o => o.v === form[f.key])?.l || form[f.key] || <span style={{ color: "var(--clr-text-muted)" }}>{t("notSet")}</span>)
                    : f.type === "tel" ? (
                      <div style={{ width: "100%" }}>
                        <div>{form[f.key] ? formatPhone(form[f.key]) : <span style={{ color: "var(--clr-text-muted)" }}>{t("notSet")}</span>}</div>
                        {(f.key === "whatsapp" || f.key === "contact") && form[f.key] && (
                          <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginTop: 4 }}>
                            🔒 Visibility: {form.contact_privacy === "accepted" ? "Accepted Interests Only" : "Everyone"}
                          </div>
                        )}
                      </div>
                    )
                      : (form[f.key] || <span style={{ color: "var(--clr-text-muted)" }}>{t("notSet")}</span>)}
                </ReadOnlyField>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
