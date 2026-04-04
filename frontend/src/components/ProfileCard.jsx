import { Icon } from "./Icon.jsx";

export function ProfileCard({ profile, state, dispatch, t, compact = false }) {
  const isShortlisted = state.shortlisted.includes(profile.id);
  const interestSent = state.interests.includes(profile.id);

  if (compact) {
    return (
      <div className="card" style={{ cursor: state.user ? "pointer" : "default", opacity: state.user ? 1 : 0.85 }}
        onClick={() => { if(state.user) dispatch({ type: "SELECT_PROFILE", payload: profile }) }}>
        <div style={{ padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
          <div className={`avatar avatar-md avatar-${profile.type}`}>
            {state.user ? profile.avatar : <Icon name="lock" size={16} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{profile.name}</div>
            <div style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>
              {profile.age} {t("yrs")} · {profile.education} · {profile.district}
            </div>
          </div>
          <span className={`badge badge-${profile.type}`}>{t(profile.type)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-in" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{
        height: 80,
        background: profile.type === "bride"
          ? "linear-gradient(135deg, #FFD1DC 0%, #FFB6C1 50%, #FFC0CB 100%)"
          : "linear-gradient(135deg, #B8D4E3 0%, #87CEEB 50%, #ADD8E6 100%)",
        position: "relative",
      }}>
        <span className={`badge badge-${profile.type}`} style={{ position: "absolute", top: 10, right: 10 }}>
          {t(profile.type)}
        </span>
      </div>
      <div style={{ padding: "0 20px 20px", marginTop: -30, position: "relative" }}>
        <div className={`avatar avatar-lg avatar-${profile.type}`} style={{ border: "3px solid var(--clr-border)", boxShadow: "var(--shadow-sm)" }}>
          {state.user ? profile.avatar : <Icon name="lock" size={24} />}
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>{profile.name}</div>
          <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginTop: 2 }}>{profile.profile_id}</div>
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
