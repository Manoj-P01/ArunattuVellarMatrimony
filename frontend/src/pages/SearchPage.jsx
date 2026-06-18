import { useState, useRef, useEffect } from "react";
import { Icon } from "../components/Icon.jsx";
import { ProfileCard } from "../components/ProfileCard.jsx";
import { EDUCATIONS, OCCUPATIONS, MARITAL_STATUSES } from "../constants/options.js";
import { AVS_KOTHIRAMS } from "../constants/kothirams.js";
import { DOSHAM_TYPES, RASIS, NATCHATHIRAMS } from "../constants/jothidam.js";

// ── Multi-select kothiram inline panel ────────────────────────────
function KothiramDropdown({ selected, onChange, onClose, t }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tempSelected, setTempSelected] = useState(selected);

  useEffect(() => {
    if (open) setTempSelected(selected);
  }, [open, selected]);

  const filtered = AVS_KOTHIRAMS.filter(k =>
    k.en.toLowerCase().includes(search.toLowerCase()) ||
    k.ta.includes(search)
  );

  const toggle = (en) => {
    if (tempSelected.includes(en)) setTempSelected(tempSelected.filter(k => k !== en));
    else setTempSelected([...tempSelected, en]);
  };

  const label = selected.length === 0
    ? (t ? t("subCaste") : "Kothiram")
    : selected.length === 1
      ? selected[0]
      : `${selected.length} ${t ? t("subCaste") : "Kothiram"} selected`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", borderRadius: open ? "var(--radius-sm) var(--radius-sm) 0 0" : "var(--radius-sm)",
          fontSize: 13,
          border: `1.5px solid ${open ? "var(--clr-saffron)" : "var(--clr-border)"}`,
          borderBottom: open ? "none" : undefined,
          background: "var(--clr-white)", cursor: "pointer",
          color: selected.length ? "var(--clr-text)" : "var(--clr-text-muted)",
        }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
          {label}
        </span>
        {selected.length > 0 && (
          <span
            onClick={e => { e.stopPropagation(); onChange([]); }}
            style={{ marginLeft: 6, color: "var(--clr-text-muted)", fontSize: 12, flexShrink: 0 }}>
            ✕
          </span>
        )}
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} style={{ marginLeft: 6, flexShrink: 0 }} />
      </button>

      {/* Inline expanded panel */}
      {open && (
        <div style={{
          border: "1.5px solid var(--clr-saffron)", borderTop: "none",
          borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
          background: "var(--clr-white)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--clr-border)" }}>
            <input
              autoFocus
              type="text"
              placeholder="Search kothiram..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "6px 10px", fontSize: 12,
                border: "1px solid var(--clr-border)", borderRadius: 6,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Select All / Clear */}
          <div style={{ display: "flex", gap: 6, padding: "6px 10px", borderBottom: "1px solid var(--clr-border)" }}>
            <button type="button" onClick={() => setTempSelected(AVS_KOTHIRAMS.map(k => k.en))}
              style={{ flex: 1, fontSize: 11, padding: "4px 0", borderRadius: 4, border: "1px solid var(--clr-border)", cursor: "pointer", background: "var(--clr-bg-subtle)" }}>
              Select All
            </button>
            <button type="button" onClick={() => setTempSelected([])}
              style={{ flex: 1, fontSize: 11, padding: "4px 0", borderRadius: 4, border: "1px solid var(--clr-border)", cursor: "pointer", background: "var(--clr-bg-subtle)" }}>
              Clear All
            </button>
          </div>

          {/* Kothiram list — max 220px then scrolls */}
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0
              ? <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--clr-text-muted)" }}>No match found</div>
              : filtered.map(k => (
                <label key={k.en}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    cursor: "pointer", fontSize: 13,
                    background: tempSelected.includes(k.en) ? "#FFF5F0" : "transparent",
                    borderBottom: "1px solid var(--clr-border)",
                  }}>
                  <input
                    type="checkbox"
                    checked={tempSelected.includes(k.en)}
                    onChange={() => toggle(k.en)}
                    style={{ accentColor: "var(--clr-saffron)", width: 15, height: 15, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1 }}>{k.en}</span>
                  <span style={{ fontSize: 11, color: "var(--clr-text-muted)", flexShrink: 0 }}>{k.ta}</span>
                </label>
              ))
            }
          </div>

          {/* Actions */}
          <div style={{
            display: "flex", gap: 8, padding: "8px 12px",
            borderTop: "1px solid var(--clr-border)", background: "var(--clr-bg-subtle)",
            justifyContent: "flex-end"
          }}>
            <button type="button" onClick={() => { setOpen(false); if (onClose) onClose(); }}
              style={{
                padding: "5px 12px", fontSize: 12, borderRadius: 4,
                border: "1px solid var(--clr-border)", background: "var(--clr-white)", cursor: "pointer",
                color: "var(--clr-text)"
              }}>
              Cancel
            </button>
            <button type="button" onClick={() => { onChange(tempSelected); setOpen(false); if (onClose) onClose(); }}
              style={{
                padding: "5px 12px", fontSize: 12, borderRadius: 4,
                border: "none", background: "var(--clr-saffron)", color: "white", cursor: "pointer",
                fontWeight: "600"
              }}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Multi-select Rasi inline panel ────────────────────────────
function RasiDropdown({ selected, onChange, onClose }) {
  const [open, setOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState(selected);

  useEffect(() => {
    if (open) setTempSelected(selected);
  }, [open, selected]);

  const toggle = (id) => {
    if (tempSelected.includes(id)) setTempSelected(tempSelected.filter(x => x !== id));
    else setTempSelected([...tempSelected, id]);
  };

  const selectedRasis = RASIS.filter(r => selected.includes(r.id));
  const label = selected.length === 0
    ? "Select Rasi"
    : selected.length === 1
      ? `${selectedRasis[0].en} - ${selectedRasis[0].ta}`
      : `${selected.length} Rasis selected`;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", fontSize: 13,
          borderRadius: open ? "var(--radius-sm) var(--radius-sm) 0 0" : "var(--radius-sm)",
          border: `1.5px solid ${open ? "var(--clr-saffron)" : "var(--clr-border)"}`,
          borderBottom: open ? "none" : undefined,
          background: "var(--clr-white)", cursor: "pointer",
          color: selected.length ? "var(--clr-text)" : "var(--clr-text-muted)",
        }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
          {label}
        </span>
        {selected.length > 0 && (
          <span
            onClick={e => { e.stopPropagation(); onChange([]); }}
            style={{ marginRight: 6, color: "var(--clr-text-muted)", fontSize: 12, flexShrink: 0 }}>
            ✕
          </span>
        )}
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          border: "1.5px solid var(--clr-saffron)", borderTop: "none",
          borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
          background: "var(--clr-white)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Select All / Clear */}
          <div style={{ display: "flex", gap: 6, padding: "6px 10px", borderBottom: "1px solid var(--clr-border)" }}>
            <button type="button" onClick={() => setTempSelected(RASIS.map(r => r.id))}
              style={{ flex: 1, fontSize: 11, padding: "4px 0", borderRadius: 4, border: "1px solid var(--clr-border)", cursor: "pointer", background: "var(--clr-bg-subtle)" }}>
              Select All
            </button>
            <button type="button" onClick={() => setTempSelected([])}
              style={{ flex: 1, fontSize: 11, padding: "4px 0", borderRadius: 4, border: "1px solid var(--clr-border)", cursor: "pointer", background: "var(--clr-bg-subtle)" }}>
              Clear All
            </button>
          </div>

          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {RASIS.map(r => (
              <label key={r.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  cursor: "pointer", fontSize: 13,
                  background: tempSelected.includes(r.id) ? "#FFF5F0" : "transparent",
                  borderBottom: "1px solid var(--clr-border)",
                }}>
                <input
                  type="checkbox"
                  checked={tempSelected.includes(r.id)}
                  onChange={() => toggle(r.id)}
                  style={{ accentColor: "var(--clr-saffron)", width: 15, height: 15, flexShrink: 0 }}
                />
                <span style={{ flex: 1 }}>{r.en}</span>
                <span style={{ fontSize: 12, color: "var(--clr-text-muted)", flexShrink: 0 }}>{r.ta}</span>
              </label>
            ))}
          </div>

          <div style={{
            display: "flex", gap: 8, padding: "8px 12px",
            borderTop: "1px solid var(--clr-border)", background: "var(--clr-bg-subtle)",
            justifyContent: "flex-end"
          }}>
            <button type="button" onClick={() => { setOpen(false); if (onClose) onClose(); }}
              style={{
                padding: "5px 12px", fontSize: 12, borderRadius: 4,
                border: "1px solid var(--clr-border)", background: "var(--clr-white)", cursor: "pointer",
                color: "var(--clr-text)"
              }}>
              Cancel
            </button>
            <button type="button" onClick={() => { onChange(tempSelected); setOpen(false); if (onClose) onClose(); }}
              style={{
                padding: "5px 12px", fontSize: 12, borderRadius: 4,
                border: "none", background: "var(--clr-saffron)", color: "white", cursor: "pointer",
                fontWeight: "600"
              }}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Multi-select Natchathiram inline panel ────────────────────────────
function NatchathiramDropdown({ selected, onChange, onClose }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tempSelected, setTempSelected] = useState(selected);

  useEffect(() => {
    if (open) setTempSelected(selected);
  }, [open, selected]);

  const filtered = NATCHATHIRAMS.filter(n =>
    n.en.toLowerCase().includes(search.toLowerCase()) ||
    n.ta.includes(search)
  );

  const toggle = (id) => {
    if (tempSelected.includes(id)) setTempSelected(tempSelected.filter(x => x !== id));
    else setTempSelected([...tempSelected, id]);
  };

  const selectedStars = NATCHATHIRAMS.filter(n => selected.includes(n.id));
  const label = selected.length === 0
    ? "Select Natchathiram"
    : selected.length === 1
      ? `${selectedStars[0].en} - ${selectedStars[0].ta}`
      : `${selected.length} Stars selected`;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", fontSize: 13,
          borderRadius: open ? "var(--radius-sm) var(--radius-sm) 0 0" : "var(--radius-sm)",
          border: `1.5px solid ${open ? "var(--clr-saffron)" : "var(--clr-border)"}`,
          borderBottom: open ? "none" : undefined,
          background: "var(--clr-white)", cursor: "pointer",
          color: selected.length ? "var(--clr-text)" : "var(--clr-text-muted)",
        }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
          {label}
        </span>
        {selected.length > 0 && (
          <span
            onClick={e => { e.stopPropagation(); onChange([]); }}
            style={{ marginRight: 6, color: "var(--clr-text-muted)", fontSize: 12, flexShrink: 0 }}>
            ✕
          </span>
        )}
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          border: "1.5px solid var(--clr-saffron)", borderTop: "none",
          borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
          background: "var(--clr-white)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--clr-border)" }}>
            <input
              autoFocus
              type="text"
              placeholder="Search star..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "6px 10px", fontSize: 12,
                border: "1px solid var(--clr-border)", borderRadius: 6,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Select All / Clear */}
          <div style={{ display: "flex", gap: 6, padding: "6px 10px", borderBottom: "1px solid var(--clr-border)" }}>
            <button type="button" onClick={() => setTempSelected(NATCHATHIRAMS.map(n => n.id))}
              style={{ flex: 1, fontSize: 11, padding: "4px 0", borderRadius: 4, border: "1px solid var(--clr-border)", cursor: "pointer", background: "var(--clr-bg-subtle)" }}>
              Select All
            </button>
            <button type="button" onClick={() => setTempSelected([])}
              style={{ flex: 1, fontSize: 11, padding: "4px 0", borderRadius: 4, border: "1px solid var(--clr-border)", cursor: "pointer", background: "var(--clr-bg-subtle)" }}>
              Clear All
            </button>
          </div>

          {/* Star list — max 220px then scrolls */}
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0
              ? <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--clr-text-muted)" }}>No match found</div>
              : filtered.map(n => (
                <label key={n.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    cursor: "pointer", fontSize: 13,
                    background: tempSelected.includes(n.id) ? "#FFF5F0" : "transparent",
                    borderBottom: "1px solid var(--clr-border)",
                  }}>
                  <input
                    type="checkbox"
                    checked={tempSelected.includes(n.id)}
                    onChange={() => toggle(n.id)}
                    style={{ accentColor: "var(--clr-saffron)", width: 15, height: 15, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1 }}>{n.en}</span>
                  <span style={{ fontSize: 12, color: "var(--clr-text-muted)", flexShrink: 0 }}>{n.ta}</span>
                </label>
              ))
            }
          </div>

          <div style={{
            display: "flex", gap: 8, padding: "8px 12px",
            borderTop: "1px solid var(--clr-border)", background: "var(--clr-bg-subtle)",
            justifyContent: "flex-end"
          }}>
            <button type="button" onClick={() => { setOpen(false); if (onClose) onClose(); }}
              style={{
                padding: "5px 12px", fontSize: 12, borderRadius: 4,
                border: "1px solid var(--clr-border)", background: "var(--clr-white)", cursor: "pointer",
                color: "var(--clr-text)"
              }}>
              Cancel
            </button>
            <button type="button" onClick={() => { onChange(tempSelected); setOpen(false); if (onClose) onClose(); }}
              style={{
                padding: "5px 12px", fontSize: 12, borderRadius: 4,
                border: "none", background: "var(--clr-saffron)", color: "white", cursor: "pointer",
                fontWeight: "600"
              }}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function SearchPage({ state, dispatch, t }) {
  const { searchFilters } = state;
  const [showFilters, setShowFilters] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const splitRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (splitRef.current && !splitRef.current.contains(e.target)) {
        setActiveCategory(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Default to opposite gender when user first visits — only if no type filter is set yet
  const myProfileType = state.user?.profile_type; // "bride" or "groom"
  const oppositeGender = myProfileType === "bride" ? "groom" : myProfileType === "groom" ? "bride" : "";

  useEffect(() => {
    if (state.user && oppositeGender && searchFilters.type === "") {
      dispatch({ type: "UPDATE_FILTERS", payload: { type: oppositeGender } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.id]); // run once per login

  const sf = searchFilters;

  // Age calculation helper
  const calcAge = (dob) => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  const filtered = state.profiles.filter(p => {
    if (p.approval_status !== "approved") return false;
    if ((p.profile_status || "active") !== "active") return false;   // hide inactive
    if (state.blocked.includes(p.id)) return false;
    // Hide the logged-in user's own profile
    if (state.user?.profileId && p.id === state.user.profileId) return false;
    if (sf.type && p.profile_type !== sf.type) return false;
    const age = calcAge(p.dob);
    if (sf.ageMin && (age == null || age < parseInt(sf.ageMin))) return false;
    if (sf.ageMax && (age == null || age > parseInt(sf.ageMax))) return false;
    if (sf.education && p.education !== sf.education) return false;
    if (sf.occupation && p.occupation !== sf.occupation) return false;
    if (sf.marital_status && p.marital_status !== sf.marital_status) return false;
    if (sf.dosham && p.dosham !== sf.dosham) return false;
    // Multi-select kothiram filter
    if (sf.kothiram && sf.kothiram.length > 0 && !sf.kothiram.includes(p.kothiram)) return false;
    // Religion filter
    if (sf.religion) {
      const pRel = (p.religion || "").trim().toLowerCase();
      if (sf.religion === "Hindu") {
        if (pRel !== "hindu") return false;
      } else if (sf.religion === "Christian") {
        if (pRel !== "christian") return false;
      } else if (sf.religion === "Muslim") {
        if (pRel !== "muslim") return false;
      } else if (sf.religion === "Other") {
        if (pRel === "hindu" || pRel === "christian" || pRel === "muslim") return false;
      }
    }
    // Community filter
    if (sf.community) {
      const isAVS = (p.community || "").trim().toLowerCase() === "arunattu vellalar";
      if (sf.community === "Arunattu Vellalar" && !isAVS) return false;
      if (sf.community === "Other" && isAVS) return false;
    }
    // Rasi multi-select filter
    if (sf.rasi && sf.rasi.length > 0 && !sf.rasi.includes(p.rasi?.toLowerCase())) return false;
    // Natchathiram multi-select filter
    if (sf.natchathiram && sf.natchathiram.length > 0 && !sf.natchathiram.includes(p.natchathiram?.toLowerCase())) return false;
    return true;
  });

  const hasFilters = sf.type !== "" || sf.ageMin !== "" || sf.ageMax !== "" ||
    sf.education !== "" || sf.occupation !== "" || sf.marital_status !== "" ||
    sf.dosham !== "" || sf.religion !== "" || sf.community !== "" ||
    (Array.isArray(sf.kothiram) ? sf.kothiram.length > 0 : sf.kothiram !== "") ||
    (Array.isArray(sf.rasi) ? sf.rasi.length > 0 : false) ||
    (Array.isArray(sf.natchathiram) ? sf.natchathiram.length > 0 : false);

  const CATEGORIES = [
    { id: "gender", label: t ? t("bride") + "/" + t("groom") : "Gender" },
    { id: "age", label: t ? t("ageRange") : "Age Range" },
    { id: "education", label: t ? t("filterEducation") : "Education" },
    { id: "occupation", label: t ? t("filterJob") : "Occupation" },
    { id: "marital", label: t ? t("filterMarital") : "Marital Status" },
    { id: "dosham", label: t ? t("dosham") : "Dosham" },
    { id: "religion", label: "Religion" },
    { id: "community", label: "Community" },
    { id: "kothiram", label: t ? t("subCaste") : "Kothiram" },
    { id: "rasi", label: "Rasi" },
    { id: "natchathiram", label: "Natchathiram" },
  ];

  const isCatActive = (cat) => {
    switch (cat) {
      case "gender": return sf.type !== "";
      case "age": return sf.ageMin !== "" || sf.ageMax !== "";
      case "education": return sf.education !== "";
      case "occupation": return sf.occupation !== "";
      case "marital": return sf.marital_status !== "";
      case "dosham": return sf.dosham !== "";
      case "religion": return sf.religion !== "";
      case "community": return sf.community !== "";
      case "kothiram": return Array.isArray(sf.kothiram) ? sf.kothiram.length > 0 : sf.kothiram !== "";
      case "rasi": return Array.isArray(sf.rasi) ? sf.rasi.length > 0 : false;
      case "natchathiram": return Array.isArray(sf.natchathiram) ? sf.natchathiram.length > 0 : false;
      default: return false;
    }
  };

  const renderCategoryContent = (cat) => {
    switch (cat) {
      case "gender":
        return (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>{t("bride")}/{t("groom")}</label>
            <select className="form-input" value={sf.type}
              onChange={e => {
                dispatch({ type: "UPDATE_FILTERS", payload: { type: e.target.value } });
                setActiveCategory(null);
              }}>
              <option value="">All</option>
              <option value="bride">{t("bride")}</option>
              <option value="groom">{t("groom")}</option>
            </select>
          </div>
        );
      case "age":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>{t("ageRange")} (Min)</label>
              <input className="form-input" type="number" min="18" max="60" placeholder="18"
                value={sf.ageMin}
                onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { ageMin: e.target.value } })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>{t("ageRange")} (Max)</label>
              <input className="form-input" type="number" min="18" max="60" placeholder="45"
                value={sf.ageMax}
                onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { ageMax: e.target.value } })} />
            </div>
          </div>
        );
      case "education":
        return (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>{t("filterEducation")}</label>
            <select className="form-input" value={sf.education}
              onChange={e => {
                dispatch({ type: "UPDATE_FILTERS", payload: { education: e.target.value } });
                setActiveCategory(null);
              }}>
              <option value="">All</option>
              {EDUCATIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
        );
      case "occupation":
        return (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>{t("filterJob")}</label>
            <select className="form-input" value={sf.occupation}
              onChange={e => {
                dispatch({ type: "UPDATE_FILTERS", payload: { occupation: e.target.value } });
                setActiveCategory(null);
              }}>
              <option value="">All</option>
              {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        );
      case "marital":
        return (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>{t("filterMarital")}</label>
            <select className="form-input" value={sf.marital_status}
              onChange={e => {
                dispatch({ type: "UPDATE_FILTERS", payload: { marital_status: e.target.value } });
                setActiveCategory(null);
              }}>
              <option value="">All</option>
              {MARITAL_STATUSES.map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
          </div>
        );
      case "dosham":
        return (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>{t("dosham")}</label>
            <select className="form-input" value={sf.dosham || ""}
              onChange={e => {
                dispatch({ type: "UPDATE_FILTERS", payload: { dosham: e.target.value } });
                setActiveCategory(null);
              }}>
              <option value="">All</option>
              {DOSHAM_TYPES.map(d => (
                <option key={d.id} value={d.id}>{d.en}</option>
              ))}
            </select>
          </div>
        );
      case "religion":
        return (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Religion</label>
            <select className="form-input" value={sf.religion || ""}
              onChange={e => {
                dispatch({ type: "UPDATE_FILTERS", payload: { religion: e.target.value } });
                setActiveCategory(null);
              }}>
              <option value="">All</option>
              <option value="Hindu">Hindu</option>
              <option value="Christian">Christian</option>
              <option value="Muslim">Muslim</option>
              <option value="Other">Other</option>
            </select>
          </div>
        );
      case "community":
        return (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Community</label>
            <select className="form-input" value={sf.community || ""}
              onChange={e => {
                dispatch({ type: "UPDATE_FILTERS", payload: { community: e.target.value } });
                setActiveCategory(null);
              }}>
              <option value="">All</option>
              <option value="Arunattu Vellalar">Arunattu Vellalar</option>
              <option value="Other">Other Community</option>
            </select>
          </div>
        );
      case "kothiram":
        return (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>{t("subCaste")}</label>
            <KothiramDropdown
              t={t}
              selected={Array.isArray(sf.kothiram) ? sf.kothiram : []}
              onChange={val => dispatch({ type: "UPDATE_FILTERS", payload: { kothiram: val } })}
              onClose={() => setActiveCategory(null)}
            />
          </div>
        );
      case "rasi":
        return (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Rasi</label>
            <RasiDropdown
              selected={Array.isArray(sf.rasi) ? sf.rasi : []}
              onChange={val => dispatch({ type: "UPDATE_FILTERS", payload: { rasi: val } })}
              onClose={() => setActiveCategory(null)}
            />
          </div>
        );
      case "natchathiram":
        return (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Natchathiram</label>
            <NatchathiramDropdown
              selected={Array.isArray(sf.natchathiram) ? sf.natchathiram : []}
              onChange={val => dispatch({ type: "UPDATE_FILTERS", payload: { natchathiram: val } })}
              onClose={() => setActiveCategory(null)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const handleCategoryClick = (catId) => {
    if (activeCategory === catId) {
      setActiveCategory(null);
    } else {
      setActiveCategory(catId);
    }
  };

  const renderSplitFilters = () => (
    <div ref={splitRef} style={{ display: "flex", height: "450px", border: "1.5px solid var(--clr-border)", borderRadius: "var(--radius-sm)", overflowX: "hidden", overflowY: "visible" }}>
      {/* Left Column (Categories) */}
      <div style={{
        width: activeCategory ? "120px" : "100%",
        background: "var(--clr-bg-subtle)",
        borderRight: activeCategory ? "1.5px solid var(--clr-border)" : "none",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        flexShrink: 0,
        transition: "width 0.3s ease"
      }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id;
          const hasSelectedFilters = isCatActive(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 12px",
                fontSize: 12,
                fontWeight: isActive ? "700" : "500",
                color: isActive ? "var(--clr-saffron)" : "var(--clr-text)",
                background: isActive ? "var(--clr-white)" : "transparent",
                border: "none",
                borderBottom: "1px solid var(--clr-border)",
                borderLeft: isActive ? "3px solid var(--clr-saffron)" : "3px solid transparent",
                cursor: "pointer",
                textAlign: "left",
                outline: "none"
              }}>
              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: 4 }}>
                {cat.label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {hasSelectedFilters && (
                  <span style={{
                    width: 6, height: 6,
                    borderRadius: "50%",
                    background: "var(--clr-saffron)",
                    display: "inline-block"
                  }} />
                )}
                <span style={{
                  color: isActive ? "var(--clr-saffron)" : "var(--clr-text-muted)",
                  fontSize: 12,
                  opacity: isActive ? 1 : 0.5,
                  transform: isActive ? "translateX(2px)" : "none",
                  transition: "all 0.2s ease",
                  display: "inline-block"
                }}>
                  ➔
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Right Column (Inputs) */}
      {activeCategory && (
        <div style={{ flex: 1, padding: "16px 14px", background: "var(--clr-white)", overflowY: "auto", overflowX: "hidden", minWidth: 0 }}>
          {renderCategoryContent(activeCategory)}
        </div>
      )}
    </div>
  );

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <style>{`
        .search-layout {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          margin-top: 10px;
        }
        .filters-sidebar {
          width: 210px;
          flex-shrink: 0;
          position: sticky;
          top: 84px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: width 0.3s ease;
          overflow: hidden;
        }
        .filters-sidebar.expanded {
          width: 460px;
        }
        .filters-sidebar.expanded-wide {
          width: 650px;
        }
        .results-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        
        /* Mobile & Tablet Drawer Styles */
        @media (max-width: 991px) {
          .search-layout {
            flex-direction: column;
            gap: 16px;
          }
          .filters-sidebar-drawer {
            position: fixed;
            top: 0;
            left: 0;
            width: 210px;
            height: 100vh;
            background: var(--clr-surface);
            z-index: 1000;
            box-shadow: var(--shadow-xl);
            transform: translateX(-100%);
            transition: transform 0.3s ease, width 0.3s ease;
            display: flex;
            flex-direction: column;
            max-width: 100vw;
          }
          .filters-sidebar-drawer.open {
            transform: translateX(0);
          }
          .filters-sidebar-drawer.expanded {
            width: 420px;
          }
          .filters-sidebar-drawer.expanded-wide {
            width: 660px;
          }
          .filters-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            display: block !important;
          }
          .filters-backdrop.open {
            opacity: 1;
            pointer-events: auto;
          }
          /* Hide standard sidebar on mobile */
          .filters-sidebar {
            display: none !important;
          }
        }

        /* Desktop Styles */
        @media (min-width: 992px) {
          .filters-sidebar-drawer {
            display: none !important;
          }
          .filters-backdrop {
            display: none !important;
          }
          .filters-sidebar {
            display: flex !important;
          }
        }
      `}</style>

      {/* Mobile Backdrop & Drawer */}
      <div className={`filters-backdrop ${showFilters ? "open" : ""}`} onClick={() => { setShowFilters(false); setActiveCategory(null); }} style={{ display: "none" }} />
      <div className={`filters-sidebar-drawer ${showFilters ? "open" : ""} ${activeCategory === "kothiram" ? "expanded-wide" : activeCategory ? "expanded" : ""}`}>
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--clr-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, color: "var(--clr-text)" }}>
            <Icon name="filter" size={16} /> Filters
          </h3>
          <button onClick={() => { setShowFilters(false); setActiveCategory(null); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--clr-text-muted)" }}>✕</button>
        </div>
        <div style={{ flex: 1, padding: "16px" }}>
          {renderSplitFilters()}
        </div>
      </div>

      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{t("searchProfiles")}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {hasFilters && (
            <button className="btn btn-sm btn-secondary" style={{ color: "var(--clr-danger)" }}
              onClick={() => { dispatch({ type: "RESET_FILTERS" }); setActiveCategory(null); }}>
              <Icon name="x" size={14} /> {t("clearFilters")}
            </button>
          )}
          <button className="btn btn-sm btn-secondary" onClick={() => {
            const nextShow = !showFilters;
            setShowFilters(nextShow);
            if (!nextShow) setActiveCategory(null);
          }}>
            <Icon name="filter" size={14} /> {showFilters ? t("hideFilters") : t("showFilters")}
          </button>
        </div>
      </div>

      <div className="search-layout">
        {/* Desktop Left-side Filter Sidebar */}
        {showFilters && (
          <div className={`filters-sidebar card ${activeCategory === "kothiram" ? "expanded-wide" : activeCategory ? "expanded" : ""}`} style={{ padding: "16px", background: "var(--clr-surface)" }}>
            <div style={{ borderBottom: "1px solid var(--clr-border)", paddingBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="filter" size={16} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--clr-text)" }}>Filters</h3>
            </div>
            <div style={{ marginTop: 10 }}>
              {renderSplitFilters()}
            </div>
          </div>
        )}

        {/* Results grid */}
        <div className="results-main">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>
              {filtered.length} profile{filtered.length !== 1 ? "s" : ""} found
              {hasFilters && " (filtered)"}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <Icon name="search" size={48} />
              <p>{t("noResults")}</p>
              {hasFilters && (
                <button className="btn btn-secondary" style={{ marginTop: 12 }}
                  onClick={() => { dispatch({ type: "RESET_FILTERS" }); setActiveCategory(null); }}>
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {filtered.map(p => (
                <ProfileCard key={p.id} profile={p} state={state} dispatch={dispatch} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
