import { Icon } from "./Icon.jsx";

export function ProfileCard({ profile, state, dispatch, t, compact = false }) {
  const isShortlisted = state.shortlisted.includes(profile.id);
  const interestSent  = state.interests.includes(profile.id);
  const isViewed      = state.user && state.viewedProfiles?.some(v => v.id === profile.id);

  if (compact) {
    return (
      <div className="card" style={{ cursor: state.user ? "pointer" : "default", opacity: state.user ? 1 : 0.85 }}
        onClick={() => { if(state.user) dispatch({ type: "SELECT_PROFILE", payload: profile }) }}>
        <div style={{ padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
          <div className={`avatar avatar-md avatar-${profile.profile_type}`}>
            {state.user ? profile.avatar : <Icon name="lock" size={16} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{state.user ? profile.name : "Name Hidden"}</div>
            <div style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>
              {profile.age} {t("yrs")} · {profile.education} · {profile.district}
            </div>
          </div>
          <span className={`badge badge-${profile.profile_type}`}>{t(profile.profile_type)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-in" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{
        height: 80,
        background: profile.profile_type === "bride"
          ? "linear-gradient(135deg, #FFD1DC 0%, #FFB6C1 50%, #FFC0CB 100%)"
          : "linear-gradient(135deg, #B8D4E3 0%, #87CEEB 50%, #ADD8E6 100%)",
        position: "relative",
      }}>
        <span className={`badge badge-${profile.profile_type}`} style={{ position: "absolute", top: 10, right: 10 }}>
          {t(profile.profile_type)}
        </span>
        {isViewed && (
          <span style={{
            position: "absolute", top: 10, left: 10,
            background: "rgba(0,0,0,0.45)", color: "white",
            fontSize: 10, fontWeight: 600, padding: "2px 7px",
            borderRadius: 10, display: "flex", alignItems: "center", gap: 4,
          }}>
            <Icon name="eye" size={10} /> Viewed
          </span>
        )}
      </div>
      <div style={{ padding: "0 20px 20px", marginTop: -30, position: "relative" }}>
        <div className={`avatar avatar-lg avatar-${profile.profile_type}`} style={{ border: "3px solid var(--clr-border)", boxShadow: "var(--shadow-sm)" }}>
          {state.user ? profile.avatar : <Icon name="lock" size={24} />}
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>{state.user ? profile.name : "Name Hidden"}</div>
          <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginTop: 2 }}>
            {state.user ? (profile.profile_id || (profile.approval_status === "pending" ? "⏳ Pending Approval" : "—")) : (profile.profile_type === "bride" ? "AVS-BR-XXX" : "AVS-GR-XXX")}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, fontSize: 13, color: "var(--clr-text)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="calendar" size={13} className="" /> {profile.age} {t("yrs")}
          </span>
          <span style={{ color: "var(--clr-border)" }}>·</span>
          <span>{profile.height}</span>
          <span style={{ color: "var(--clr-border)" }}>·</span>
          <span>{profile.education}</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--clr-text-muted)", marginTop: 4 }}>
          {profile.occupation} · {profile.district}
        </div>
        {profile.salary && (
          <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginTop: 2 }}>
            ₹{profile.salary} {t("lpa")}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn btn-sm btn-primary" style={{ flex: 1, opacity: state.user ? 1 : 0.6 }}
            disabled={!state.user}
            onClick={() => dispatch({ type: "SELECT_PROFILE", payload: profile })}>
            {state.user ? t("viewProfile") : "Login to view"}
          </button>
          {state.user && !state.isAdmin && (
            <button className={`btn btn-sm ${isShortlisted ? 'btn-gold' : 'btn-secondary'}`}
              onClick={(e) => { e.stopPropagation(); dispatch({ type: "TOGGLE_SHORTLIST", payload: profile.id }); }}
              title={t("addToShortlist")}>
              <Icon name="star" size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
