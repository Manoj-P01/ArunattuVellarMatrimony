import { useState } from "react";
import { Icon } from "../components/Icon.jsx";
import { ProfileCard } from "../components/ProfileCard.jsx";
import { DISTRICTS, EDUCATIONS, MARITAL_STATUSES } from "../constants/options.js";

export function SearchPage({ state, dispatch, t }) {
  const { searchFilters } = state;
  const [showFilters, setShowFilters] = useState(true);

  const filtered = state.profiles.filter(p => {
    if (p.approval_status !== "approved") return false;
    if (state.blocked.includes(p.id)) return false;
    const f = searchFilters;
    if (f.type && p.type !== f.type) return false;
    if (f.ageMin && p.age < parseInt(f.ageMin)) return false;
    if (f.ageMax && p.age > parseInt(f.ageMax)) return false;
    if (f.district && p.district !== f.district) return false;
    if (f.education && p.education !== f.education) return false;
    if (f.occupation && p.occupation !== f.occupation) return false;
    if (f.marital_status && p.marital_status !== f.marital_status) return false;
    return true;
  });

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{t("searchProfiles")}</h2>
        <button className="btn btn-sm btn-secondary" onClick={() => setShowFilters(!showFilters)}>
          <Icon name="filter" size={14} /> {showFilters ? "Hide" : "Filters"}
        </button>
      </div>

      {showFilters && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("bride")}/{t("groom")}</label>
                <select className="form-input" value={searchFilters.type}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { type: e.target.value } })}>
                  <option value="">All</option>
                  <option value="bride">{t("bride")}</option>
                  <option value="groom">{t("groom")}</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("ageRange")} (Min)</label>
                <input className="form-input" type="number" placeholder="18" value={searchFilters.ageMin}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { ageMin: e.target.value } })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("ageRange")} (Max)</label>
                <input className="form-input" type="number" placeholder="40" value={searchFilters.ageMax}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { ageMax: e.target.value } })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("filterDistrict")}</label>
                <select className="form-input" value={searchFilters.district}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { district: e.target.value } })}>
                  <option value="">All Districts</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("filterEducation")}</label>
                <select className="form-input" value={searchFilters.education}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { education: e.target.value } })}>
                  <option value="">All</option>
                  {EDUCATIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t("filterMarital")}</label>
                <select className="form-input" value={searchFilters.marital_status}
                  onChange={e => dispatch({ type: "UPDATE_FILTERS", payload: { marital_status: e.target.value } })}>
                  <option value="">All</option>
                  {MARITAL_STATUSES.map(s => <option key={s} value={s}>{t(s)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn btn-sm btn-secondary" onClick={() => dispatch({ type: "RESET_FILTERS" })}>
                <Icon name="x" size={14} /> Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 13, color: "var(--clr-text-muted)", marginBottom: 16 }}>
        {filtered.length} profile{filtered.length !== 1 ? 's' : ''} found
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Icon name="search" size={48} />
          <p>{t("noResults")}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {filtered.map(p => <ProfileCard key={p.id} profile={p} state={state} dispatch={dispatch} t={t} />)}
        </div>
      )}
    </div>
  );
}
