import { Icon } from "../Icon.jsx";

export function BottomNav({ state, dispatch, t }) {
  if (!state.user) return null;
  const items = [
    { id: "home", icon: "home", label: t("home") },
    { id: "search", icon: "search", label: t("search") },
    { id: "matches", icon: "heart", label: t("matches") },
    { id: "interests", icon: "mail", label: t("interests") },
    { id: "profile", icon: "user", label: t("profile") },
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
          }}>
          <Icon name={item.icon} size={20} />
          {item.label}
        </button>
      ))}
    </div>
  );
}
