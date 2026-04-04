import { Icon } from "../components/Icon.jsx";
import { ProfileCard } from "../components/ProfileCard.jsx";

export function MatchesPage({ state, dispatch, t }) {
  const userType = state.user?.type || "bride";
  const matchType = userType === "bride" ? "groom" : "bride";
  const matches = state.profiles.filter(p => p.type === matchType && p.approval_status === "approved" && !state.blocked.includes(p.id));

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t("matches")}</h2>
      {matches.length === 0 ? (
        <div className="empty-state">
          <Icon name="heart" size={48} />
          <p>{t("noResults")}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {matches.map(p => <ProfileCard key={p.id} profile={p} state={state} dispatch={dispatch} t={t} />)}
        </div>
      )}
    </div>
  );
}
