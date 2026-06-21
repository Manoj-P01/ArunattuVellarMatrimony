import { Icon } from "../Icon.jsx";

export function Sidebar({ state, dispatch, t, onLogout }) {
  // Compute interest badge: sent interests + pending received interests
  const myProfile = state.profiles.find(p => p.id === state.user?.profileId);
  const myProfileId = myProfile?.id;
  const sentCount = (!state.isAdmin && myProfileId)
    ? state.interests.filter(i => i.from === myProfileId || i.from === state.user?.profile_id).length
    : 0;
  const pendingReceived = (!state.isAdmin && myProfileId)
    ? state.interests.filter(i =>
        (i.to === myProfileId || i.to === state.user?.profile_id) && i.status === "pending"
      ).length
    : 0;
  const interestBadge = sentCount + pendingReceived;

  const navItems = state.isAdmin
    ? [
        { id: "admin", icon: "grid",  label: t("admin"),     badge: 0 },
        { id: "home",  icon: "home",  label: t("home"),      badge: 0 },
      ]
    : [
        { id: "home",      icon: "home",     label: t("home"),      badge: 0 },
        { id: "search",    icon: "search",   label: t("search"),    badge: 0 },
        { id: "matches",   icon: "bookmark", label: t("shortlist"), badge: 0 },
        { id: "interests", icon: "mail",     label: t("interests"), badge: interestBadge },
        { id: "profile",   icon: "user",     label: t("profile"),   badge: 0 },
        ...(myProfileId ? [{
          id: "happyStory",
          icon: "heart",
          label: myProfile?.got_married ? (t("updateTestimonial") || "Update Testimonial") : t("gotMarried"),
          badge: 0
        }] : []),
      ];

  return (
    <>
      {state.sidebarOpen && (
        <div className="hide-desktop"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 59 }}
          onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })} />
      )}
      <nav className="app-sidebar" style={{
        width: 220, background: "var(--clr-white)", borderRight: "1px solid var(--clr-border)",
        height: "calc(100vh - 68px)", position: "fixed", top: 68,
        left: state.sidebarOpen ? 0 : -240,
        zIndex: 60, transition: "left 0.3s ease",
        display: "flex", flexDirection: "column",
        padding: "16px 0 0",
      }}>
        {/* Nav items */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {navItems.map(item => (
            <button key={item.id}
              onClick={() => dispatch({ type: "SET_PAGE", payload: item.id })}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 20px", width: "100%",
                background: state.page === item.id ? "var(--clr-surface-alt)" : "none",
                border: "none", cursor: "pointer", fontSize: 14,
                fontWeight: state.page === item.id ? 600 : 400,
                color: state.page === item.id ? "var(--clr-saffron)" : "var(--clr-text)",
                borderRight: state.page === item.id
                  ? "3px solid var(--clr-saffron)"
                  : "3px solid transparent",
                transition: "all 0.15s",
              }}>
              <Icon name={item.icon} size={18} />
              <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{
                  background: "var(--clr-danger, #e53e3e)",
                  color: "white",
                  borderRadius: 10,
                  padding: "1px 7px",
                  fontSize: 11,
                  fontWeight: 700,
                  minWidth: 18,
                  textAlign: "center",
                  lineHeight: "18px",
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* ── Recently Viewed ── */}
          {state.user && !state.isAdmin && state.viewedProfiles?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 8px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--clr-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <Icon name="eye" size={11} /> Recently Viewed
                </div>
                <button onClick={() => dispatch({ type: "CLEAR_VIEWED" })}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--clr-text-muted)" }}>
                  Clear
                </button>
              </div>
              {state.viewedProfiles.slice(0, 5).map(v => (
                <button key={v.id}
                  onClick={() => {
                    const profile = state.profiles.find(p => p.id === v.id);
                    if (profile) dispatch({ type: "SELECT_PROFILE", payload: profile });
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "6px 20px",
                    width: "100%", background: "none", border: "none", cursor: "pointer",
                    borderRight: "3px solid transparent", textAlign: "left",
                  }}>
                  <div className={`avatar avatar-sm avatar-${v.profile_type || "bride"}`}
                    style={{ flexShrink: 0, fontSize: 11, fontWeight: 700 }}>
                    {v.avatar || v.name?.[0] || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--clr-text-muted)" }}>
                      {v.profile_id || (v.profile_type === "bride" ? "Bride" : "Groom")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Logout button pinned at bottom ── */}
        {state.user && (
          <div style={{ padding: "12px 12px 20px", borderTop: "1px solid var(--clr-border)" }}>
            {/* User info chip */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8,
              background: state.isAdmin ? "linear-gradient(135deg,#FFF5F0,#FFE8D6)" : "var(--clr-surface-alt)",
              border: state.isAdmin ? "1px solid var(--clr-saffron)" : "none",
              marginBottom: 10,
            }}>
              {state.isAdmin ? (
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,var(--clr-saffron),var(--clr-maroon))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name="shield" size={15} style={{ color: "white" }} />
                </div>
              ) : (
                <div className={`avatar avatar-sm avatar-${state.user.profile_type || "bride"}`}
                  style={{ fontWeight: 700, flexShrink: 0 }}>
                  {state.user.name?.[0] || "U"}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {state.user.name?.split(" ")[0]}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: state.isAdmin ? "var(--clr-saffron)" : "var(--clr-text-muted)" }}>
                  {state.isAdmin ? "Admin" : (state.user.profile_type || "Member")}
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "9px 16px",
                background: "#FFF5F5", border: "1px solid #FFCDD2",
                borderRadius: 8, cursor: "pointer",
                fontSize: 13, fontWeight: 600, color: "#C62828",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#FFEBEE"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#FFF5F5"; }}
            >
              <Icon name="logout" size={16} />
              {t("logout") || "Logout"}
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
