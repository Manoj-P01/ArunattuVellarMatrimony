import { useState } from "react";
import { Icon } from "../Icon.jsx";

export function Header({ state, dispatch, t, onLogout }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = state.notifications.filter(n => !n.read).length;

  const notifIconMap = {
    interest: { icon: "heart", bg: "#FFE8ED", color: "var(--clr-maroon)" },
    match: { icon: "users", bg: "#E6F9EE", color: "#1B7A3D" },
    anniversary: { icon: "award", bg: "#F3E8FF", color: "#6B21A8" },
    approved: { icon: "check", bg: "#E3F0F8", color: "#1a3a5c" },
    admin_message: { icon: "shield", bg: "#FFF3E0", color: "#E65100" },
  };

  return (
    <>
      <div className="kolam-border" />
      <header style={{
        background: "var(--clr-white)",
        borderBottom: "1px solid var(--clr-border)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, gap: 16 }}>
          {/* Left */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {state.user && (
              <button onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
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
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, lineHeight: 1.2 }} className="text-gradient">
                {t("appName")}
              </div>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn btn-sm btn-secondary" onClick={() => dispatch({ type: "TOGGLE_THEME" })} style={{ padding: "5px 10px" }}>
              <Icon name={state.theme === "dark" ? "moon" : "sun"} size={14} />
            </button>
            {/* Language toggle — pill style */}
            <button
              onClick={() => dispatch({ type: "SET_LANG", payload: state.lang === "en" ? "ta" : "en" })}
              title={state.lang === "en" ? "Switch to Tamil" : "Switch to English"}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20,
                border: "1.5px solid var(--clr-saffron)",
                background: state.lang === "ta" ? "var(--clr-saffron)" : "transparent",
                color: state.lang === "ta" ? "white" : "var(--clr-saffron)",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                transition: "all 0.2s", lineHeight: 1.4,
              }}>
              <Icon name="globe" size={13} />
              {state.lang === "en" ? "தமிழ்" : "EN"}
            </button>

            {state.user ? (
              <>
                {/* Notifications Bell */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => setNotifOpen(!notifOpen)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--clr-text)", padding: 6, position: "relative" }}>
                    <Icon name="bell" size={20} />
                    {unreadCount > 0 && (
                      <span style={{
                        position: "absolute", top: 2, right: 2,
                        background: "var(--clr-saffron)", color: "white",
                        width: 16, height: 16, borderRadius: "50%",
                        fontSize: 9, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        lineHeight: 1,
                      }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
                    )}
                  </button>

                  {notifOpen && (
                    <div style={{
                      position: "absolute", right: 0, top: "100%", marginTop: 8,
                      width: 340, background: "var(--clr-white)", borderRadius: "var(--radius-md)",
                      border: "1px solid var(--clr-border)", boxShadow: "var(--shadow-lg)", zIndex: 60,
                      maxHeight: 400, overflowY: "auto",
                    }} className="animate-in">
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--clr-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{t("notifications")}</span>
                        {unreadCount > 0 && (
                          <button style={{ fontSize: 11, color: "var(--clr-saffron)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                            onClick={() => { dispatch({ type: "MARK_ALL_NOTIF_READ" }); }}>
                            Mark all read
                          </button>
                        )}
                      </div>
                      {state.notifications.length === 0 ? (
                        <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--clr-text-muted)" }}>
                          No notifications yet
                        </div>
                      ) : (
                        state.notifications.slice(0, 10).map(n => {
                          const conf = notifIconMap[n.type] || notifIconMap.approved;
                          return (
                            <div key={n.id}
                              style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--clr-border)", background: n.read ? "transparent" : "var(--clr-cream)", cursor: "pointer" }}
                              onClick={() => dispatch({ type: "MARK_NOTIF_READ", payload: n.id })}>
                              <div style={{ width: 36, height: 36, borderRadius: "50%", background: conf.bg, color: conf.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Icon name={conf.icon} size={16} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, lineHeight: 1.4, fontWeight: n.read ? 400 : 500 }}>{n.message}</div>
                                <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginTop: 2 }}>{n.time}</div>
                              </div>
                              {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--clr-saffron)", flexShrink: 0, marginTop: 4 }} />}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Avatar + Logout */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
                  <div className={`avatar avatar-sm avatar-${state.user.profile_type || "bride"}`}
                    style={{ cursor: "pointer", fontWeight: 700 }}
                    onClick={() => dispatch({ type: "SET_PAGE", payload: state.isAdmin ? "admin" : "profile" })}>
                    {state.user.name?.[0] || "U"}
                  </div>
                  <div className="hide-mobile" style={{ fontSize: 13, fontWeight: 500, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {state.user.name?.split(" ")[0]}
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={onLogout} style={{ fontSize: 12, padding: "5px 10px" }}>
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
      {notifOpen && <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setNotifOpen(false)} />}
    </>
  );
}
