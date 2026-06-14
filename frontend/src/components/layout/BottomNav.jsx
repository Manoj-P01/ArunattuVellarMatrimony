import { Icon } from "../Icon.jsx";

export function BottomNav({ state, dispatch, t }) {
  if (!state.user) return null;

  // Compute interest badge (sent + pending received)
  const myProfile = state.profiles.find(p => p.id === state.user?.profileId);
  const myProfileId = myProfile?.id;
  const sentCount = myProfileId
    ? state.interests.filter(i => i.from === myProfileId || i.from === state.user?.profile_id).length
    : 0;
  const pendingReceived = myProfileId
    ? state.interests.filter(i =>
        (i.to === myProfileId || i.to === state.user?.profile_id) && i.status === "pending"
      ).length
    : 0;
  const interestBadge = sentCount + pendingReceived;

  const items = [
    { id: "home",      icon: "home",     label: t("home"),      badge: 0 },
    { id: "search",    icon: "search",   label: t("search"),    badge: 0 },
    { id: "matches",   icon: "bookmark", label: t("shortlist"), badge: 0 },
    { id: "interests", icon: "mail",     label: t("interests"), badge: interestBadge },
    { id: "profile",   icon: "user",     label: t("profile"),   badge: 0 },
  ];
  return (
    <div className="hide-desktop" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--clr-white)",
      borderTop: "1px solid var(--clr-border)", display: "flex", zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {items.map(item => (
        <button key={item.id} onClick={() => dispatch({ type: "SET_PAGE", payload: item.id })}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "8px 4px", background: "none", border: "none", cursor: "pointer",
            color: state.page === item.id ? "var(--clr-saffron)" : "var(--clr-text-muted)",
            fontSize: 10, fontWeight: state.page === item.id ? 600 : 400,
            position: "relative",
          }}>
          <div style={{ position: "relative" }}>
            <Icon name={item.icon} size={20} />
            {item.badge > 0 && (
              <span style={{
                position: "absolute", top: -5, right: -7,
                background: "#e53e3e", color: "white",
                borderRadius: "50%", width: 16, height: 16,
                fontSize: 9, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}>{item.badge > 9 ? "9+" : item.badge}</span>
            )}
          </div>
          {item.label}
        </button>
      ))}
    </div>
  );
}
