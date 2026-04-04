import { Icon } from "../components/Icon.jsx";
import { ProfileCard } from "../components/ProfileCard.jsx";

export function ViewProfilePage({ state, dispatch, t }) {
  const p = state.selectedProfile;
  if (!p) return <div className="page-container" style={{ padding: 40, textAlign: "center" }}>No profile selected</div>;

  const interestSent = state.interests.includes(p.id);
  const isShortlisted = state.shortlisted.includes(p.id);

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", maxWidth: 720, paddingBottom: 80 }}>
      <button className="btn btn-sm btn-secondary" style={{ marginBottom: 16 }}
        onClick={() => dispatch({ type: "SET_PAGE", payload: "search" })}>
        ← Back
      </button>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          height: 120,
          background: p.type === "bride"
            ? "linear-gradient(135deg, #FFD1DC 0%, #FFB6C1 50%, #FFC0CB 100%)"
            : "linear-gradient(135deg, #B8D4E3 0%, #87CEEB 50%, #ADD8E6 100%)",
        }} />
        <div style={{ padding: "0 24px 24px", marginTop: -48 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <div className={`avatar avatar-xl avatar-${p.type}`} style={{ border: "4px solid white", boxShadow: "var(--shadow-md)" }}>
              {p.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 200, paddingBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>{p.name}</h2>
                <span className={`badge badge-${p.type}`}>{t(p.type)}</span>
                <span className="badge badge-active">{t(p.profile_status)}</span>
              </div>
              <div style={{ fontSize: 14, color: "var(--clr-text-muted)", marginTop: 4 }}>{p.profile_id}</div>
            </div>
          </div>

          {state.user && !state.isAdmin && (
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <button className={`btn ${interestSent ? 'btn-success' : 'btn-primary'}`}
                onClick={() => dispatch({ type: "ADD_INTEREST", payload: p.id })} disabled={interestSent}>
                <Icon name="heart" size={16} /> {interestSent ? t("interestSent") : t("sendInterest")}
              </button>
              <button className={`btn ${isShortlisted ? 'btn-gold' : 'btn-secondary'}`}
                onClick={() => dispatch({ type: "TOGGLE_SHORTLIST", payload: p.id })}>
                <Icon name="star" size={16} /> {t("addToShortlist")}
              </button>
              <button className="btn btn-secondary" style={{ color: "var(--clr-danger)" }}
                onClick={() => dispatch({ type: "BLOCK_USER", payload: p.id })}>
                <Icon name="x" size={16} /> {t("block")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Details Sections */}
      {[
        {
          title: t("personalDetails"),
          fields: [
            [t("age"), `${p.age} ${t("yrs")}`],
            [t("dob"), p.dob],
            [t("height"), p.height],
            [t("maritalStatus"), t(p.marital_status)],
            [t("education"), p.education],
            [t("occupation"), p.occupation],
            [t("salary"), p.salary ? `₹${p.salary} ${t("lpa")}` : "-"],
          ],
        },
        {
          title: t("communityDetails"),
          fields: [
            [t("religion"), p.religion],
            [t("community"), p.community],
            [t("subCaste"), p.kothiram || "-"],
            [t("motherTongue"), p.mother_tongue],
          ],
        },
        {
          title: t("locationDetails"),
          fields: [
            [t("country"), p.country],
            [t("state"), p.state],
            [t("district"), p.district],
            [t("city"), p.city],
          ],
        },
      ].map((section, i) => (
        <div key={i} className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
              {section.title}
            </h3>
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

      {/* About & Family */}
      {(p.about || p.family) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            {p.about && (
              <>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {t("aboutMe")}
                </h3>
                <p style={{ fontSize: 14, color: "var(--clr-text)", lineHeight: 1.6, marginBottom: 16 }}>{p.about}</p>
              </>
            )}
            {p.family && (
              <>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {t("familyDetails")}
                </h3>
                <p style={{ fontSize: 14, color: "var(--clr-text)", lineHeight: 1.6 }}>{p.family}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
