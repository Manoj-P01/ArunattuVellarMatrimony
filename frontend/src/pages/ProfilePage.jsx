import { useState } from "react";
import { Icon } from "../components/Icon.jsx";
import { DISTRICTS, EDUCATIONS, OCCUPATIONS, MARITAL_STATUSES } from "../constants/options.js";

export function ProfilePage({ state, dispatch, t }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: state.user?.name || "",
    dob: "2001-03-15",
    height: "5'4\"",
    marital_status: "single",
    education: "M.E / M.Tech",
    occupation: "IT Professional",
    salary: "8",
    kothiram: "Kongu Vellalar",
    mother_tongue: "Tamil",
    country: "India",
    state: "Tamil Nadu",
    district: "Coimbatore",
    city: "Coimbatore",
    about: "Working as a software engineer.",
    family: "Father: Retired, Mother: Homemaker",
    photo_privacy: "public",
    profile_status: "active",
  });

  const update = (k, v) => setForm({ ...form, [k]: v });

  if (!state.user) {
    return (
      <div className="empty-state">
        <Icon name="lock" size={48} />
        <p>Please login to view your profile</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }}
          onClick={() => dispatch({ type: "SET_PAGE", payload: "login" })}>
          {t("login")}
        </button>
      </div>
    );
  }

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", maxWidth: 720, paddingBottom: 80 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{t("profile")}</h2>
        <button className="btn btn-sm btn-secondary" onClick={() => setEditing(!editing)}>
          <Icon name="edit" size={14} /> {editing ? "Cancel" : t("editProfile")}
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div className={`avatar avatar-xl avatar-${state.user.type || 'bride'}`}
            style={{ border: "3px solid var(--clr-border)" }}>
            {state.user.name?.[0] || "U"}
          </div>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>{state.user.name}</h3>
            <div style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>{state.user.profile_id}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <span className={`badge badge-${state.user.type || 'bride'}`}>{t(state.user.type || 'bride')}</span>
              <span className="badge badge-active">{t("active")}</span>
              <span className="badge badge-pending">{t("pending")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Form Sections */}
      {[
        {
          title: t("personalDetails"),
          fields: [
            { key: "name", label: t("name"), type: "text" },
            { key: "dob", label: t("dob"), type: "date" },
            { key: "height", label: t("height"), type: "text" },
            { key: "marital_status", label: t("maritalStatus"), type: "select", options: MARITAL_STATUSES.map(s => ({ v: s, l: t(s) })) },
            { key: "education", label: t("education"), type: "select", options: EDUCATIONS.map(e => ({ v: e, l: e })) },
            { key: "occupation", label: t("occupation"), type: "select", options: OCCUPATIONS.map(o => ({ v: o, l: o })) },
            { key: "salary", label: t("salary") + " (LPA)", type: "text" },
          ],
        },
        {
          title: t("communityDetails"),
          fields: [
            { key: "religion", label: t("religion"), type: "text", value: "Hindu", disabled: true },
            { key: "community", label: t("community"), type: "text", value: "Arunattu Vellalar", disabled: true },
            { key: "kothiram", label: t("subCaste"), type: "text" },
            { key: "mother_tongue", label: t("motherTongue"), type: "text" },
          ],
        },
        {
          title: t("locationDetails"),
          fields: [
            { key: "country", label: t("country"), type: "text" },
            { key: "state", label: t("state"), type: "text" },
            { key: "district", label: t("district"), type: "select", options: DISTRICTS.map(d => ({ v: d, l: d })) },
            { key: "city", label: t("city"), type: "text" },
          ],
        },
      ].map((section, i) => (
        <div key={i} className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              {section.title}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {section.fields.map(f => (
                <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{f.label}</label>
                  {editing ? (
                    f.type === "select" ? (
                      <select className="form-input" value={form[f.key]} onChange={e => update(f.key, e.target.value)} disabled={f.disabled}>
                        {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    ) : (
                      <input className="form-input" type={f.type} value={f.disabled ? f.value : form[f.key]}
                        onChange={e => update(f.key, e.target.value)} disabled={f.disabled} />
                    )
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500, padding: "10px 0 0" }}>
                      {f.disabled ? f.value : (f.type === "select" && f.options ? f.options.find(o => o.v === form[f.key])?.l : form[f.key]) || "-"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* About & Family */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t("additionalDetails")}</h3>
          <div className="form-group">
            <label className="form-label">{t("aboutMe")}</label>
            {editing ? (
              <textarea className="form-input" value={form.about} onChange={e => update("about", e.target.value)} />
            ) : (
              <p style={{ fontSize: 14 }}>{form.about}</p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">{t("familyDetails")}</label>
            {editing ? (
              <textarea className="form-input" value={form.family} onChange={e => update("family", e.target.value)} />
            ) : (
              <p style={{ fontSize: 14 }}>{form.family}</p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">{t("photoPrivacy")}</label>
            {editing ? (
              <select className="form-input" value={form.photo_privacy} onChange={e => update("photo_privacy", e.target.value)}>
                <option value="public">{t("public")}</option>
                <option value="accepted">{t("acceptedOnly")}</option>
                <option value="loggedIn">{t("loggedInOnly")}</option>
              </select>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 500, paddingTop: 4 }}>{t(form.photo_privacy === "accepted" ? "acceptedOnly" : form.photo_privacy === "loggedIn" ? "loggedInOnly" : "public")}</div>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <button className="btn btn-primary btn-block btn-lg" onClick={() => setEditing(false)}>
          <Icon name="check" size={16} /> {t("saveProfile")}
        </button>
      )}
    </div>
  );
}
