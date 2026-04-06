import { Icon } from "../Icon.jsx";

export function Sidebar({ state, dispatch, t }) {
  const navItems = state.isAdmin
    ? [
        { id: "admin", icon: "grid", label: t("admin") },
        { id: "home", icon: "home", label: t("home") },
      ]
    : [
        { id: "home", icon: "home", label: t("home") },
        { id: "search", icon: "search", label: t("search") },
        { id: "matches", icon: "heart", label: t("matches") },
        { id: "interests", icon: "mail", label: t("interests") },
        { id: "shortlist", icon: "star", label: t("shortlist") },
        { id: "profile", icon: "user", label: t("profile") },
      ];

  return (
    <>
      {state.sidebarOpen && (
        <div className="hide-desktop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 59 }}
          onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })} />
      )}
      <nav style={{
        width: 220, background: "var(--clr-white)", borderRight: "1px solid var(--clr-border)",
        height: "calc(100vh - 68px)", position: "fixed", top: 68, left: state.sidebarOpen ? 0 : -240,
        zIndex: 60, transition: "left 0.3s ease", overflowY: "auto", padding: "16px 0",
      }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => dispatch({ type: "SET_PAGE", payload: item.id })}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", width: "100%",
              background: state.page === item.id ? "var(--clr-surface-alt)" : "none",
              border: "none", cursor: "pointer", fontSize: 14, fontWeight: state.page === item.id ? 600 : 400,
              color: state.page === item.id ? "var(--clr-saffron)" : "var(--clr-text)",
              borderRight: state.page === item.id ? "3px solid var(--clr-saffron)" : "3px solid transparent",
              transition: "all 0.15s",
            }}>
            <Icon name={item.icon} size={18} />
            {item.label}
          </button>
        ))}
        {state.user && !state.isAdmin && (
          <button onClick={() => dispatch({ type: "LOGIN_ADMIN" })}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", width: "100%",
              background: "none", border: "none", cursor: "pointer", fontSize: 14,
              color: "var(--clr-text-muted)", marginTop: 20,
              borderRight: "3px solid transparent",
            }}>
            <Icon name="shield" size={18} />
            {t("admin")} (Demo)
          </button>
        )}
      </nav>
    </>
  );
}
