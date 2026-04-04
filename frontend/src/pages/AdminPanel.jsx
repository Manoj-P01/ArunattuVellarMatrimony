import { Icon } from "../components/Icon.jsx";

export function AdminPanel({ state, dispatch, t }) {
  const { adminTab } = state;
  const tabs = [
    { id: "dashboard", icon: "grid", label: t("dashboard") },
    { id: "approve", icon: "check", label: t("approveUsers") },
    { id: "users", icon: "users", label: t("allUsers") },
    { id: "married", icon: "award", label: t("marriedUsers") },
    { id: "reports", icon: "barChart", label: t("reports") },
  ];

  const stats = {
    total: state.profiles.length,
    active: state.profiles.filter(p => p.profile_status === "active").length,
    married: state.profiles.filter(p => p.profile_status === "married").length,
    success: 2,
    newReg: 3,
    pending: state.profiles.filter(p => p.approval_status === "pending").length,
  };

  return (
    <div className="animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <div className="page-container">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <Icon name="shield" size={24} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{t("admin")}</h2>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 24, flexWrap: "nowrap" }}>
          {tabs.map(tab => (
            <button key={tab.id} className={`tab ${adminTab === tab.id ? 'active' : ''}`}
              onClick={() => dispatch({ type: "SET_ADMIN_TAB", payload: tab.id })}>
              <Icon name={tab.icon} size={14} style={{ marginRight: 6 }} />
              <span className="hide-mobile">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {adminTab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: t("totalUsers"), value: stats.total, icon: "users", color: "#E3F0F8", iconColor: "#1a3a5c" },
                { label: t("activeProfiles"), value: stats.active, icon: "activity", color: "#E6F9EE", iconColor: "#1B7A3D" },
                { label: t("marriedProfiles"), value: stats.married, icon: "award", color: "#F3E8FF", iconColor: "#6B21A8" },
                { label: t("successCount"), value: stats.success, icon: "heart", color: "#FFE8ED", iconColor: "var(--clr-maroon)" },
                { label: t("newRegistrations"), value: stats.newReg, icon: "trendingUp", color: "#FFF3E0", iconColor: "#E65100" },
                { label: t("pending"), value: stats.pending, icon: "eye", color: "#FFFDE7", iconColor: "#F57F17" },
              ].map((s, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-icon" style={{ background: s.color, color: s.iconColor }}>
                    <Icon name={s.icon} size={22} />
                  </div>
                  <div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Profiles */}
            <div className="card">
              <div className="card-body">
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  Recent Profiles
                </h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("profileId")}</th>
                        <th>{t("name")}</th>
                        <th>Type</th>
                        <th>{t("district")}</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.profiles.slice(0, 5).map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600, fontSize: 13 }}>{p.profile_id}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div className={`avatar avatar-sm avatar-${p.type}`}>{p.avatar}</div>
                              {p.name}
                            </div>
                          </td>
                          <td><span className={`badge badge-${p.type}`}>{t(p.type)}</span></td>
                          <td>{p.district}</td>
                          <td><span className={`badge badge-${p.approval_status}`}>{t(p.approval_status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approve Users */}
        {adminTab === "approve" && (
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                {t("approveUsers")}
              </h3>
              {state.profiles.filter(p => p.approval_status === "pending").length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <Icon name="check" size={40} />
                  <p>All profiles have been reviewed</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Profile</th>
                        <th>Details</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.profiles.filter(p => p.approval_status === "pending").map(p => (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div className={`avatar avatar-md avatar-${p.type}`}>{p.avatar}</div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{p.name}</div>
                                <div style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>{p.profile_id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>
                            {p.age} {t("yrs")} · {p.education} · {p.district}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-sm btn-success" onClick={() => dispatch({ type: "APPROVE_PROFILE", payload: p.id })}>
                                <Icon name="check" size={14} /> {t("approve")}
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: "REJECT_PROFILE", payload: p.id })}>
                                <Icon name="x" size={14} /> {t("reject")}
                              </button>
                              <button className="btn btn-sm btn-secondary" onClick={() => dispatch({ type: "SELECT_PROFILE", payload: p })}>
                                <Icon name="eye" size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Users */}
        {adminTab === "users" && (
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                {t("allUsers")} ({state.profiles.length})
              </h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("profileId")}</th>
                      <th>{t("name")}</th>
                      <th>Type</th>
                      <th>{t("education")}</th>
                      <th>{t("district")}</th>
                      <th>Status</th>
                      <th>Approval</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.profiles.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{p.profile_id}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className={`avatar avatar-sm avatar-${p.type}`}>{p.avatar}</div>
                            {p.name}
                          </div>
                        </td>
                        <td><span className={`badge badge-${p.type}`}>{t(p.type)}</span></td>
                        <td style={{ fontSize: 13 }}>{p.education}</td>
                        <td style={{ fontSize: 13 }}>{p.district}</td>
                        <td><span className={`badge badge-${p.profile_status}`}>{t(p.profile_status)}</span></td>
                        <td><span className={`badge badge-${p.approval_status}`}>{t(p.approval_status)}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => dispatch({ type: "SELECT_PROFILE", payload: p })}
                              title="View"><Icon name="eye" size={14} /></button>
                            <button className="btn btn-sm btn-secondary" title="Edit"><Icon name="edit" size={14} /></button>
                            <button className="btn btn-sm btn-secondary" style={{ color: "var(--clr-danger)" }} title="Delete">
                              <Icon name="trash" size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Married Users */}
        {adminTab === "married" && (
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                {t("marriedUsers")} — {t("mapPartner")}
              </h3>
              <div style={{ background: "var(--clr-surface-alt)", borderRadius: "var(--radius-sm)", padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Map Marriage</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t("bride")} {t("profileId")}</label>
                    <select className="form-input">
                      <option value="">Select Bride</option>
                      {state.profiles.filter(p => p.type === "bride").map(p => (
                        <option key={p.id} value={p.id}>{p.profile_id} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t("groom")} {t("profileId")}</label>
                    <select className="form-input">
                      <option value="">Select Groom</option>
                      {state.profiles.filter(p => p.type === "groom").map(p => (
                        <option key={p.id} value={p.id}>{p.profile_id} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t("marriedDate")}</label>
                    <input className="form-input" type="date" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t("marriageType")}</label>
                    <select className="form-input">
                      <option value="arranged">{t("arranged")}</option>
                      <option value="love">{t("love")}</option>
                      <option value="matrimony">{t("matrimonyMatch")}</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 14 }}>
                  <Icon name="link" size={14} /> {t("mapPartner")}
                </button>
              </div>
              <div className="empty-state" style={{ padding: 24 }}>
                <Icon name="award" size={40} />
                <p>No married profiles mapped yet</p>
              </div>
            </div>
          </div>
        )}

        {/* Reports */}
        {adminTab === "reports" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", padding: 32 }}>
                <Icon name="pieChart" size={40} style={{ color: "var(--clr-saffron)", marginBottom: 12 }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Gender Distribution</h3>
                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16 }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--clr-maroon)" }}>
                      {state.profiles.filter(p => p.type === "bride").length}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>Brides</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-display)", color: "#1a3a5c" }}>
                      {state.profiles.filter(p => p.type === "groom").length}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>Grooms</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", padding: 32 }}>
                <Icon name="barChart" size={40} style={{ color: "var(--clr-olive)", marginBottom: 12 }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>District Wise</h3>
                <div style={{ marginTop: 16 }}>
                  {[...new Set(state.profiles.map(p => p.district))].map(d => {
                    const count = state.profiles.filter(p => p.district === d).length;
                    return (
                      <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 100, fontSize: 13, textAlign: "right" }}>{d}</div>
                        <div style={{ flex: 1, height: 20, background: "var(--clr-surface-alt)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{
                            width: `${(count / state.profiles.length) * 100}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, var(--clr-saffron), var(--clr-gold))",
                            borderRadius: 4,
                            minWidth: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            paddingRight: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: "white",
                          }}>{count}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", padding: 32 }}>
                <Icon name="trendingUp" size={40} style={{ color: "var(--clr-success)", marginBottom: 12 }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Success Rate</h3>
                <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--clr-success)", marginTop: 16 }}>
                  33%
                </div>
                <div style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>of matched profiles got married</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
