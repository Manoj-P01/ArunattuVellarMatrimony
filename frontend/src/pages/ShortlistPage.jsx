import { Icon } from "../components/Icon.jsx";
import { ProfileCard } from "../components/ProfileCard.jsx";

export function ShortlistPage({ state, dispatch, t }) {
  const shortlisted = state.profiles.filter(p => state.shortlisted.includes(p.id));

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        {t("shortlist")} ({shortlisted.length})
      </h2>
      {shortlisted.length === 0 ? (
        <div className="empty-state">
          <Icon name="star" size={48} />
          <p>No profiles shortlisted yet</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {shortlisted.map(p => <ProfileCard key={p.id} profile={p} state={state} dispatch={dispatch} t={t} />)}
        </div>
      )}
    </div>
  );
}
