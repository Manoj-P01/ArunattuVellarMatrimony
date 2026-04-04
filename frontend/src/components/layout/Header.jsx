import { useState } from "react";
import { Icon } from "../Icon.jsx";

export function Header({ state, dispatch, t }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = state.notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout fetch failed", e);
    }
    dispatch({ type: "LOGOUT" });
  };

  return (
    <>
      <div className="kolam-border" />
      <header style={{
        background: "var(--clr-white)",
        borderBottom: "1px solid var(--clr-border)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div className="page-container" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 64, gap: 16,
        }}>
          {/* Left */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {state.user && (
              <button className="hide-desktop" onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--clr-text)", padding: 4 }}>
                <Icon name="menu" size={22} />
              </button>
            )}
            <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              onClick={() => dispatch({ type: "SET_PAGE", payload: "home" })}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--clr-saffron), var(--clr-maroon))",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
              }}>A</div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, lineHeight: 1.2 }} className="text-gradient">
                  {t("appName")}
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Theme Toggle */}
            <button className="btn btn-sm btn-secondary" onClick={() => dispatch({ type: "TOGGLE_THEME" })} style={{ padding: "5px 10px" }}>
              <Icon name={state.theme === "dark" ? "moon" : "sun"} size={14} />
            </button>

            {/* Language Toggle */}
            <button className="btn btn-sm btn-secondary"
              onClick={() => dispatch({ type: "SET_LANG", payload: state.lang === "en" ? "ta" : "en" })}
              style={{ fontSize: 12, padding: "5px 10px" }}>
              <Icon name="globe" size={14} />
              {state.lang === "en" ? "தமிழ்" : "EN"}
            </button>

            {state.user ? (
              <>
                {/* Notifications */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => setNotifOpen(!notifOpen)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--clr-text)", padding: 6, position: "relative" }}>
                    <Icon name="bell" size={20} />
                    {unreadCount > 0 && <span className="notif-dot" />}
                  </button>
                  {notifOpen && (
                    <div style={{
                      position: "absolute", right: 0, top: "100%", marginTop: 8,
                      width: 340, background: "var(--clr-white)", borderRadius: "var(--radius-md)",
                      border: "1px solid var(--clr-border)", boxShadow: "var(--shadow-lg)", zIndex: 60,
                    }} className="animate-in">
                      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--clr-border)", fontWeight: 600, fontSize: 15 }}>
                        {t("notifications")}
                      </div>
                      {state.notifications.map(n => (
                        <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                          <div className="notif-icon" style={{
                            background: n.type === "interest" ? "#FFE8ED" : n.type === "match" ? "#E6F9EE" : n.type === "anniversary" ? "#F3E8FF" : "#E3F0F8",
                            color: n.type === "interest" ? "var(--clr-maroon)" : n.type === "match" ? "#1B7A3D" : n.type === "anniversary" ? "#6B21A8" : "#1a3a5c",
                          }}>
                            <Icon name={n.type === "interest" ? "heart" : n.type === "match" ? "users" : n.type === "anniversary" ? "award" : "check"} size={18} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, lineHeight: 1.4 }}>{n.message}</div>
                            <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginTop: 2 }}>{n.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Profile */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
                  <div className="avatar avatar-sm avatar-bride" style={{ cursor: "pointer" }}
                    onClick={() => dispatch({ type: "SET_PAGE", payload: "profile" })}>
                    {state.user.name?.[0] || "U"}
                  </div>
                  <button className="btn btn-sm btn-secondary hide-mobile" onClick={handleLogout}
                    style={{ fontSize: 12, padding: "5px 10px" }}>
                    <Icon name="logout" size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-sm btn-secondary" onClick={() => dispatch({ type: "SET_PAGE", payload: "login" })}>
                  {t("login")}
                </button>
                <button className="btn btn-sm btn-primary" onClick={() => dispatch({ type: "SET_PAGE", payload: "register" })}>
                  {t("register")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Click outside to close notifications */}
      {notifOpen && <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setNotifOpen(false)} />}
    </>
  );
}
