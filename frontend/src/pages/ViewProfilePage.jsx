import { useState, useEffect } from "react";
import { Icon } from "../components/Icon.jsx";
import { RASIS, NATCHATHIRAMS, DOSHAM_TYPES, LAGNAM_POSITIONS } from "../constants/jothidam.js";
import { AVS_KOTHIRAMS } from "../constants/kothirams.js";
import { EDUCATIONS } from "../constants/options.js";
import { formatPhone, waLink } from "../components/PhoneInput.jsx";

// Map raw DB marital_status values → display labels
const MARITAL_STATUS_LABELS = {
  never_married: "Never Married",
  single:        "Never Married",
  divorced:      "Divorced",
  widowed:       "Widowed",
  married:       "Married",
};

/** Lookup education label from value (e.g. "bachelors_arts" → "Bachelor's — Arts / Science / Commerce") */
function educationLabel(val) {
  if (!val) return null;
  const found = EDUCATIONS.find(e => e.value === val);
  return found ? found.label : val;
}

/** Compute age dynamically from DOB string — always uses today's date */
function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const base = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");

async function fetchProfilePhotos(profileId) {
  try {
    const res = await fetch(`${base}/api/photos?profile_id=${profileId}`, { credentials: "include" });
    const data = await res.json();
    return data.photos || [];
  } catch { return []; }
}

/** Return "en — ta" for a kothiram string stored in DB */
function kothiramLabel(val) {
  if (!val) return "—";
  const k = AVS_KOTHIRAMS.find(x => x.en.toLowerCase() === val.toLowerCase());
  return k ? `${k.en} — ${k.ta}` : val;
}

/** Format 24h time string → 12h AM/PM */
function fmtTime(t) {
  if (!t) return "—";
  try {
    const [h, m] = t.split(":");
    const hh = parseInt(h, 10);
    return `${hh > 12 ? hh - 12 : hh || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`;
  } catch { return t; }
}

export function ViewProfilePage({ state, dispatch, t }) {
  const p = state.selectedProfile;
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null); // url string
  const [photos, setPhotos]   = useState([]);
  const [jathagam, setJathagam] = useState(null);

  useEffect(() => {
    if (!p?.id) return;
    fetchProfilePhotos(p.id).then(all => {
      setPhotos(all.filter(ph => ph.photo_type === "gallery" && ph.status === "approved"));
      const j = all.find(ph => ph.photo_type === "horoscope" && ph.status === "approved");
      setJathagam(j || null);
    });
  }, [p?.id]);

  if (!p) return (
    <div className="page-container" style={{ padding: 40, textAlign: "center" }}>
      <p>{t("noProfileSelected")}</p>
      <button className="btn btn-primary" style={{ marginTop: 12 }}
        onClick={() => dispatch({ type: "GO_BACK" })}>
        {t("back")}
      </button>
    </div>
  );

  /* ── Fullscreen photo modal ── */
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

  const myProfile = state.profiles.find(pr => pr.id === state.user?.profileId);
  const myProfileId = myProfile?.id;

  // Interest from me to this person
  const myInterest = state.interests.find(i =>
    (i.from === myProfileId || i.from === state.user?.profile_id) && i.to === p.id
  );
  const interestSent = !!myInterest;
  const interestAccepted = myInterest?.status === "accepted";

  const isShortlisted = state.shortlisted.includes(p.id);
  const isBlocked = state.blocked.includes(p.id);

  const handleSendInterest = () => {
    if (!myProfile) {
      dispatch({ type: "SET_PAGE", payload: "profile" });
      return;
    }
    dispatch({ type: "SEND_INTEREST", payload: { from: myProfileId, to: p.id } });
  };

  // Photo visibility
  const canSeePhoto = (privacy) => {
    if (privacy === "public") return true;
    if (!state.user) return false;
    if (state.isAdmin) return true;
    if (privacy === "loggedIn") return true;
    if (privacy === "accepted") return interestAccepted;
    return false;
  };

  const showPhoto = canSeePhoto(p.photo_privacy);

  const canSeeAboutMe = (privacy) => {
    if (!privacy || privacy === "public") return true;
    if (!state.user) return false;
    if (state.isAdmin) return true;
    if (privacy === "loggedIn") return true;
    if (privacy === "accepted") return interestAccepted;
    return false;
  };

  const showSocialLinks = canSeeAboutMe(p.social_links_privacy);
  const showContactDetails = canSeeAboutMe(p.contact_privacy);

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", maxWidth: 760, paddingBottom: 80 }}>
      <button className="btn btn-sm btn-secondary" style={{ marginBottom: 16 }}
        onClick={() => dispatch({ type: "GO_BACK" })}>
        {t("back")}
      </button>

      {/* Profile Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          height: 120,
          background: p.profile_type === "bride"
            ? "linear-gradient(135deg, #FFD1DC 0%, #FFB6C1 50%, #FFC0CB 100%)"
            : "linear-gradient(135deg, #B8D4E3 0%, #87CEEB 50%, #ADD8E6 100%)",
        }} />
        <div style={{ padding: "0 24px 24px", marginTop: -52 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <div className={`avatar avatar-xl avatar-${p.profile_type}`}
              onClick={() => showPhoto && p.photo && setFullscreenPhoto(p.photo)}
              style={{ border: "4px solid white", boxShadow: "var(--shadow-md)", overflow: "hidden",
                cursor: showPhoto && p.photo ? "zoom-in" : "default", position: "relative" }}>
              {showPhoto && p.photo
                ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                : showPhoto
                  ? <span style={{ fontSize: 20, fontWeight: 700 }}>{p.avatar}</span>
                  : <Icon name="lock" size={24} />
              }
              {showPhoto && p.photo && (
                <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.5)",
                  borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="eye" size={12} style={{ color: "white" }} />
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 200, paddingBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>{state.user ? p.name : "Name Hidden"}</h2>
                <span className={`badge badge-${p.profile_type}`}>{t(p.profile_type)}</span>
                <span className={`badge badge-${p.profile_status || "active"}`}>{t(p.profile_status || "active")}</span>
              </div>
              <div style={{ fontSize: 14, color: "var(--clr-text-muted)", marginTop: 4 }}>
                {state.user ? (p.profile_id || "—") : (p.profile_type === "bride" ? "AVS-BR-XXX" : "AVS-GR-XXX")}
              </div>
              {!showPhoto && state.user && (
                <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginTop: 4 }}>
                  🔒 Photo hidden — {p.photo_privacy === "accepted" ? t("acceptToView") : t("login") + " " + t("viewProfile")}
                </div>
              )}
            </div>
          </div>

          {state.user && !state.isAdmin && (
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <button
                className={`btn ${interestAccepted ? "btn-success" : interestSent ? "btn-secondary" : "btn-primary"}`}
                onClick={handleSendInterest}
                disabled={interestSent}>
                <Icon name="heart" size={16} />
                {interestAccepted ? t("interestAccepted") : interestSent ? t("interestSent") : t("sendInterest")}
              </button>
              <button className={`btn ${isShortlisted ? "btn-gold" : "btn-secondary"}`}
                onClick={() => dispatch({ type: "TOGGLE_SHORTLIST", payload: p.id })}>
                <Icon name="star" size={16} />
                {isShortlisted ? t("shortlisted") : t("addToShortlist")}
              </button>
              {!isBlocked ? (
                <button className="btn btn-secondary" style={{ color: "var(--clr-danger)" }}
                  onClick={() => dispatch({ type: "BLOCK_USER", payload: p.id })}>
                  <Icon name="x" size={16} /> {t("block")}
                </button>
              ) : (
                <button className="btn btn-secondary"
                  onClick={() => dispatch({ type: "UNBLOCK_USER", payload: p.id })}>
                  Unblock
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details grid sections */}
      {[
        {
          title: t("personalDetails"),
          fields: [
            [t("age"),           p.dob ? `${calcAge(p.dob)} ${t("yrs")}` : "—"],
            [t("dob"),           p.dob ? new Date(p.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"],
            [t("birthTime"),       fmtTime(p.birth_time)],
            [t("birthPlace"),      p.birth_place || "—"],
            [t("height"),        p.height || "—"],
            [t("maritalStatus"), p.marital_status ? (MARITAL_STATUS_LABELS[p.marital_status] || p.marital_status) : "—"],
            [t("education"),     educationLabel(p.education) || "—"],
            [t("occupation"),    p.occupation || "—"],
            [t("salary"),        p.salary ? `₹${p.salary} ${t("lpa")}` : "—"],
          ].filter(([, v]) => v && v !== "—"),
        },
        {
          title: t("communityDetails"),
          fields: [
            [t("subCaste") + " (Kothiram)", kothiramLabel(p.kothiram)],
            [t("nativePlaceLabel"),               p.native_place || "—"],
          ].filter(([, v]) => v && v !== "—"),
        },
        {
          title: t("locationDetails"),
          fields: [
            [t("country"),  p.country || "India"],
            [t("state"),    p.state || "Tamil Nadu"],
            [t("district"), p.district || "—"],
          ].filter(([, v]) => v && v !== "—"),
        },
      ].map((section, i) => (
        <div key={i} className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>{section.title}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {section.fields.map(([label, value], j) => (
                <div key={j}>
                  <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Jothidam Details */}
      {p.rasi && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>🔯 Jothidam Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {[
                ["Rasi", RASIS.find(r => r.id === p.rasi) ? `${RASIS.find(r => r.id === p.rasi).en} — ${RASIS.find(r => r.id === p.rasi).ta}` : p.rasi],
                ["Natchathiram", NATCHATHIRAMS.find(n => n.id === p.natchathiram) ? `${NATCHATHIRAMS.find(n => n.id === p.natchathiram).en} — ${NATCHATHIRAMS.find(n => n.id === p.natchathiram).ta}` : p.natchathiram],
                ["Patham", p.patham ? `${p.patham}${p.patham==="1"?"st":p.patham==="2"?"nd":p.patham==="3"?"rd":"th"} Patham` : "—"],
                ["Dosham", DOSHAM_TYPES.find(d => d.id === p.dosham)?.en || p.dosham || "—"],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{val || t("notSet")}</div>
                </div>
              ))}
            </div>
            {(p.sevvai_position || p.ragu_position || p.kedhu_position) && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--clr-border)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-saffron)", marginBottom: 8 }}>{t("doshamPositions")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                  {p.sevvai_position && (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginBottom: 2 }}>{t("sevvai")}</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{LAGNAM_POSITIONS.find(l => l.id === p.sevvai_position)?.en || p.sevvai_position}</div>
                    </div>
                  )}
                  {p.ragu_position && (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginBottom: 2 }}>{t("ragu")}</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{LAGNAM_POSITIONS.find(l => l.id === p.ragu_position)?.en || p.ragu_position}</div>
                    </div>
                  )}
                  {p.kedhu_position && (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginBottom: 2 }}>{t("kedhu")}</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{LAGNAM_POSITIONS.find(l => l.id === p.kedhu_position)?.en || p.kedhu_position}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* About & Expectations */}
      {(p.about_me || p.about || p.expectations) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            {(p.about_me || p.about) && (
              <div style={{ marginBottom: p.expectations ? 16 : 0 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t("aboutMe")}</h3>
                <p style={{ fontSize: 14, color: "var(--clr-text)", lineHeight: 1.7 }}>{p.about_me || p.about}</p>
              </div>
            )}
            {p.expectations && (
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Partner Expectations</h3>
                <p style={{ fontSize: 14, color: "var(--clr-text)", lineHeight: 1.7 }}>{p.expectations}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Social Media Links */}
      {p.social_links?.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>🔗 Social Media Links</h3>
            {showSocialLinks ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {p.social_links.map((link, idx) => (
                  <a key={idx} href={link.url} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--clr-bg-subtle)", borderRadius: 8, border: "1px solid var(--clr-border)", textDecoration: "none", color: "inherit" }}>
                    <span style={{ fontSize: 20 }}>
                      {link.platform === "facebook" ? "📘" : link.platform === "instagram" ? "📸" : link.platform === "linkedin" ? "💼" : link.platform === "youtube" ? "📺" : "🔗"}
                    </span>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--clr-text-muted)", textTransform: "capitalize" }}>{link.platform}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160, color: "var(--clr-saffron)" }}>Visit Link →</div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--clr-text-muted)", fontStyle: "italic" }}>
                🔒 Social Media Links hidden — this member restricts viewing of this field to: {p.social_links_privacy === "accepted" ? t("acceptedOnly") || "Accepted Interests Only" : p.social_links_privacy === "loggedIn" ? t("loggedInOnly") || "Logged-in Users Only" : "Everyone"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Family Details */}
      {(p.father_name || p.mother_name || p.brother_count !== undefined) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>{t("familyDetails")}</h3>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--clr-saffron)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{t("parents")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                {[
                  [t("fatherName"),           p.father_name],
                  [t("fatherKothiram"),       kothiramLabel(p.father_kothiram)],
                  ["Father's Mobile",         p.father_mobile ? formatPhone(p.father_mobile) : null],
                  ["Father's WhatsApp",       p.father_whatsapp ? formatPhone(p.father_whatsapp) : (p.father_mobile ? formatPhone(p.father_mobile) + " (Same)" : null)],
                  [t("motherName"),           p.mother_name],
                  [t("motherKothiram"),       kothiramLabel(p.mother_kothiram)],
                  ["Mother's Mobile",         p.mother_mobile ? formatPhone(p.mother_mobile) : null],
                  ["Mother's WhatsApp",       p.mother_whatsapp ? formatPhone(p.mother_whatsapp) : (p.mother_mobile ? formatPhone(p.mother_mobile) + " (Same)" : null)],
                ].filter(([, v]) => v !== null).map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{val || t("notSet")}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Currently Living In */}
            {(p.living_district || p.living_state || p.living_country) && (
              <div style={{ marginBottom: 14, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--clr-border)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--clr-saffron)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                  Currently Living In
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                  {[
                    [t("livingCountry"), p.living_country],
                    [t("livingState"), p.living_state],
                    [t("livingDistrict"), p.living_district],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
{(() => {
                // Build sibling rows from the granular elder/younger fields
                const siblingRows = [
                  { label: "Elder Brother(s)",    count: parseInt(p.elder_brothers   || 0), married: parseInt(p.elder_brothers_married   || 0) },
                  { label: "Younger Brother(s)",  count: parseInt(p.younger_brothers || 0), married: parseInt(p.younger_brothers_married || 0) },
                  { label: "Elder Sister(s)",      count: parseInt(p.elder_sisters    || 0), married: parseInt(p.elder_sisters_married    || 0) },
                  { label: "Younger Sister(s)",    count: parseInt(p.younger_sisters  || 0), married: parseInt(p.younger_sisters_married  || 0) },
                ].filter(r => r.count > 0);
                if (siblingRows.length === 0) return null;
                return (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--clr-saffron)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{t("siblings")}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                      {siblingRows.map(({ label, count, married }) => (
                        <div key={label}>
                          <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>
                            {count}{married > 0 ? ` (${married} married)` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {/* Contact Details — visible to all logged-in users */}
      {state.user && (
        <div className="card" style={{ marginBottom: 16, border: `2px solid ${interestAccepted ? "var(--clr-success)" : "var(--clr-saffron)"}` }}>
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 14,
              color: interestAccepted ? "var(--clr-success)" : "var(--clr-saffron)" }}>
              📞 {t("contactDetailsSection")} {interestAccepted && <span style={{ fontSize: 13, fontWeight: 400 }}>· {t("interestAccepted")}</span>}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              {p.whatsapp && (
                showContactDetails ? (
                  <a
                    href={waLink(p.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", textDecoration: "none", color: "inherit" }}
                  >
                    <span style={{ fontSize: 20 }}>💬</span>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginBottom: 2 }}>WhatsApp</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{formatPhone(p.whatsapp)}</div>
                      <div style={{ fontSize: 10, color: "#16a34a", marginTop: 1 }}>Tap to chat →</div>
                    </div>
                  </a>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--clr-bg-subtle)", borderRadius: 8, border: "1px solid var(--clr-border)", color: "var(--clr-text-muted)" }}>
                    <span style={{ fontSize: 20 }}>🔒</span>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginBottom: 2 }}>WhatsApp</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>WhatsApp Hidden</div>
                      <div style={{ fontSize: 10, color: "var(--clr-text-muted)", marginTop: 1 }}>Accepted interests only</div>
                    </div>
                  </div>
                )
              )}
              {p.contact && p.contact !== p.whatsapp && (
                showContactDetails ? (
                  <a
                    href={`tel:${formatPhone(p.contact).replace(/\s/g, "")}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe", textDecoration: "none", color: "inherit" }}
                  >
                    <span style={{ fontSize: 20 }}>📱</span>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginBottom: 2 }}>{t("contact")}</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{formatPhone(p.contact)}</div>
                    </div>
                  </a>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--clr-bg-subtle)", borderRadius: 8, border: "1px solid var(--clr-border)", color: "var(--clr-text-muted)" }}>
                    <span style={{ fontSize: 20 }}>🔒</span>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginBottom: 2 }}>{t("contact")}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Contact Number Hidden</div>
                      <div style={{ fontSize: 10, color: "var(--clr-text-muted)", marginTop: 1 }}>Accepted interests only</div>
                    </div>
                  </div>
                )
              )}
              {(p.alt_contact || p.altContact) && (
                <a
                  href={`tel:${formatPhone(p.alt_contact || p.altContact).replace(/\s/g, "")}`}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe", textDecoration: "none", color: "inherit" }}
                >
                  <span style={{ fontSize: 20 }}>📞</span>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginBottom: 2 }}>{t("altContact")}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{formatPhone(p.alt_contact || p.altContact)}</div>
                  </div>
                </a>
              )}
              {p.email && (
                <a
                  href={`mailto:${p.email}`}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fdf4ff", borderRadius: 8, border: "1px solid #e9d5ff", textDecoration: "none", color: "inherit" }}
                >
                  <span style={{ fontSize: 20 }}>✉️</span>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginBottom: 2 }}>{t("email")}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, wordBreak: "break-all" }}>{p.email}</div>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Gallery ── */}
      {state.user && photos.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
              📷 Photo Gallery
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
              {photos.map(ph => (
                <div key={ph.id}
                  onClick={() => setFullscreenPhoto(ph.photo_url)}
                  style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "zoom-in",
                    border: "1px solid var(--clr-border)", background: "var(--clr-bg-subtle)" }}>
                  <img src={ph.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Jathagam / Horoscope ── */}
      {state.user && jathagam && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
              🔯 Jathagam (Horoscope)
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
              background: "var(--clr-bg-subtle)", borderRadius: 10, border: "1px solid var(--clr-border)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: "linear-gradient(135deg,#FFF5F0,var(--clr-saffron))",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 24 }}>📄</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Jathagam uploaded</div>
                <div style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>Verified by Admin ✓</div>
              </div>
              <a href={jathagam.photo_url} target="_blank" rel="noreferrer"
                className="btn btn-sm btn-secondary">
                <Icon name="eye" size={13} /> View
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
