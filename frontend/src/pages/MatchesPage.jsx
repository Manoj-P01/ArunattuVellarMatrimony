import { Icon } from "../components/Icon.jsx";
import { ProfileCard } from "../components/ProfileCard.jsx";

export function MatchesPage({ state, dispatch, t }) {
  if (!state.user) {
    return (
      <div className="empty-state">
        <Icon name="lock" size={48} />
        <p>Please login to see your shortlist</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }}
          onClick={() => dispatch({ type: "SET_PAGE", payload: "login" })}>
          {t("login")}
        </button>
      </div>
    );
  }

  const shortlistedProfiles = state.profiles.filter(p =>
    state.shortlisted.includes(p.id) && !state.blocked.includes(p.id)
  );

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>
          {t("matches")}
        </h2>
        <p style={{ fontSize: 13, color: "var(--clr-text-muted)", marginTop: 4 }}>
          {shortlistedProfiles.length} shortlisted profile{shortlistedProfiles.length !== 1 ? "s" : ""}
        </p>
      </div>

      {shortlistedProfiles.length === 0 ? (
        <div className="empty-state">
          <Icon name="bookmark" size={48} />
          <p>No profiles shortlisted yet</p>
          <p style={{ fontSize: 13, color: "var(--clr-text-muted)", marginTop: 4 }}>
            Browse profiles and tap the bookmark icon to shortlist them here
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }}
            onClick={() => dispatch({ type: "SET_PAGE", payload: "search" })}>
            <Icon name="search" size={15} /> Browse Profiles
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {shortlistedProfiles.map(p => (
            <ProfileCard key={p.id} profile={p} state={state} dispatch={dispatch} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
