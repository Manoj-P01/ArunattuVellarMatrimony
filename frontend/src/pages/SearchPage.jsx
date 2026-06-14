import { useState, useRef, useEffect } from "react";
import { Icon } from "../components/Icon.jsx";
import { ProfileCard } from "../components/ProfileCard.jsx";
import { EDUCATIONS, OCCUPATIONS, MARITAL_STATUSES } from "../constants/options.js";
import { AVS_KOTHIRAMS } from "../constants/kothirams.js";
import { DOSHAM_TYPES } from "../constants/jothidam.js";

// ── Multi-select kothiram dropdown with checkboxes ────────────────────────────
function KothiramDropdown({ selected, onChange, t }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = AVS_KOTHIRAMS.filter(k =>
    k.en.toLowerCase().includes(search.toLowerCase()) ||
    k.ta.includes(search)
  );

  const toggle = (en) => {
    if (selected.includes(en)) onChange(selected.filter(k => k !== en));
    else onChange([...selected, en]);
  };

  const label = selected.length === 0
    ? (t ? t("subCaste") : "Kothiram")
    : selected.length === 1
    ? selected[0]
    : `${selected.length} ${t ? t("subCaste") : "Kothiram"} selected`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", borderRadius: "var(--radius-sm)", fontSize: 13,
          border: `1.5px solid ${open ? "var(--clr-saffron)" : "var(--clr-border)"}`,
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

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "var(--clr-white)", border: "1.5px solid var(--clr-saffron)",
          borderRadius: "var(--radius-sm)", boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
          maxHeight: 300, display: "flex", flexDirection: "column",
          minWidth: 240,
        }}>
          {/* Search inside dropdown */}
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
            <button type="button" onClick={() => onChange(AVS_KOTHIRAMS.map(k => k.en))}
              style={{ flex: 1, fontSize: 11, padding: "4px 0", borderRadius: 4, border: "1px solid var(--clr-border)", cursor: "pointer", background: "var(--clr-bg-subtle)" }}>
              Select All
            </button>
            <button type="button" onClick={() => onChange([])}
              style={{ flex: 1, fontSize: 11, padding: "4px 0", borderRadius: 4, border: "1px solid var(--clr-border)", cursor: "pointer", background: "var(--clr-bg-subtle)" }}>
              Clear All
            </button>
          </div>

          {/* Kothiram list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0
              ? <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--clr-text-muted)" }}>No match found</div>
              : filtered.map(k => (
                <label key={k.en}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    cursor: "pointer", fontSize: 13,
                    background: selected.includes(k.en) ? "#FFF5F0" : "transparent",
                    borderBottom: "1px solid var(--clr-border)",
                  }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(k.en)}
                    onChange={() => toggle(k.en)}
                    style={{ accentColor: "var(--clr-saffron)", width: 15, height: 15, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1 }}>{k.en}</span>
                  <span style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>{k.ta}</span>
                </label>
              ))
            }
          </div>

          {selected.length > 0 && (
            <div style={{ padding: "6px 12px", fontSize: 11, color: "var(--clr-saffron)", borderTop: "1px solid var(--clr-border)", fontWeight: 600 }}>
              {selected.length} kothiram{selected.length > 1 ? "s" : ""} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function SearchPage({ state, dispatch, t }) {
  const { searchFilters } = state;
  const [showFilters, setShowFilters] = useState(true);

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
    return true;
  });

  const hasFilters = sf.type !== "" || sf.ageMin !== "" || sf.ageMax !== "" ||
    sf.education !== "" || sf.occupation !== "" || sf.marital_status !== "" ||
    sf.dosham !== "" ||
    (Array.isArray(sf.kothiram) ? sf.kothiram.length > 0 : sf.kothiram !== "");

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{t("searchProfiles")}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {hasFilters && (
            <button className="btn btn-sm btn-secondary" style={{ color: "var(--clr-danger)" }}
              onClick={() => dispatch({ type: "RESET_FILTERS" })}>
              <Icon name="x" size={14} /> {t("clearFilters")}
            </button>
          )}
          <button className="btn btn-sm btn-secondary" onClick={() => setShowFilters(!showFilters)}>
            <Icon name="filter" size={14} /> {showFilters ? t("hideFilters") : t("showFilters")}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("bride")}/{t("groom")}</label>
                <select className="form-input" value={sf.type}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { type: e.target.value } })}>
                  <option value="">All</option>
                  <option value="bride">{t("bride")}</option>
                  <option value="groom">{t("groom")}</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("ageRange")} (Min)</label>
                <input className="form-input" type="number" min="18" max="60" placeholder="18"
                  value={sf.ageMin}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { ageMin: e.target.value } })} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("ageRange")} (Max)</label>
                <input className="form-input" type="number" min="18" max="60" placeholder="45"
                  value={sf.ageMax}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { ageMax: e.target.value } })} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("filterEducation")}</label>
                <select className="form-input" value={sf.education}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { education: e.target.value } })}>
                  <option value="">All</option>
                  {EDUCATIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("filterJob")}</label>
                <select className="form-input" value={sf.occupation}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { occupation: e.target.value } })}>
                  <option value="">All</option>
                  {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("filterMarital")}</label>
                <select className="form-input" value={sf.marital_status}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { marital_status: e.target.value } })}>
                  <option value="">All</option>
                  {MARITAL_STATUSES.map(s => <option key={s} value={s}>{t(s)}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("dosham")}</label>
                <select className="form-input" value={sf.dosham || ""}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { dosham: e.target.value } })}>
                  <option value="">All</option>
                  {DOSHAM_TYPES.map(d => (
                    <option key={d.id} value={d.id}>{d.en}</option>
                  ))}
                </select>
              </div>

              {/* Kothiram multi-select — spans full remaining width */}
              <div className="form-group" style={{ marginBottom: 0, gridColumn: "span 2" }}>
                <label className="form-label">{t("subCaste")} (Kothiram)</label>
                <KothiramDropdown
                  t={t}
                  selected={Array.isArray(sf.kothiram) ? sf.kothiram : []}
                  onChange={val => dispatch({ type: "UPDATE_FILTERS", payload: { kothiram: val } })}
                />
              </div>

            </div>
          </div>
        </div>
      )}

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
              onClick={() => dispatch({ type: "RESET_FILTERS" })}>
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
  );
}
