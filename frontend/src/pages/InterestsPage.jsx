import { useState } from "react";
import { Icon } from "../components/Icon.jsx";

export function InterestsPage({ state, dispatch, t }) {
  const [tab, setTab] = useState("received");

  const myProfile = state.profiles.find(p => p.id === state.user?.profileId);
  const myProfileId = myProfile?.id;

  // Sent interests = I initiated, to = target profile id
  const sentInterests = state.interests.filter(i => i.from === myProfileId || i.from === state.user?.profile_id);

  // Received interests = from = someone else's id, to = my profile id
  const receivedInterests = state.interests.filter(i =>
    i.to === myProfileId || i.to === state.user?.profile_id
  );

  const getProfile = (id) => state.profiles.find(p => p.id === id);

  const sentCount = sentInterests.length;
  const receivedCount = receivedInterests.length;

  if (!state.user) {
    return (
      <div className="empty-state">
        <Icon name="lock" size={48} />
        <p>Please login to view interests</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }}
          onClick={() => dispatch({ type: "SET_PAGE", payload: "login" })}>{t("login")}</button>
      </div>
    );
  }

  const statusBadge = (status) => {
    if (status === "accepted") return <span className="badge badge-approved">Accepted ✓</span>;
    if (status === "rejected") return <span className="badge badge-rejected">Rejected</span>;
    return <span className="badge badge-pending">Pending</span>;
  };

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t("interests")}</h2>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === "received" ? "active" : ""}`} onClick={() => setTab("received")}>
          <Icon name="heart" size={14} /> {t("interestReceived")} ({receivedCount})
        </button>
        <button className={`tab ${tab === "sent" ? "active" : ""}`} onClick={() => setTab("sent")}>
          <Icon name="send" size={14} /> {t("interestSent")} ({sentCount})
        </button>
      </div>

      {/* Received Tab */}
      {tab === "received" && (
        receivedInterests.length === 0 ? (
          <div className="empty-state">
            <Icon name="heart" size={48} />
            <p>No interests received yet</p>
            <p style={{ fontSize: 12, color: "var(--clr-text-muted)", marginTop: 8 }}>
              Complete your profile and get admin approval to start receiving interests
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {receivedInterests.map(interest => {
              const sender = getProfile(interest.from);
              if (!sender) return null;
              return (
                <div key={interest.id} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div className={`avatar avatar-md avatar-${sender.profile_type}`} style={{ cursor: "pointer" }}
                    onClick={() => dispatch({ type: "SELECT_PROFILE", payload: sender })}>
                    {sender.photo
                      ? <img src={sender.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                      : sender.avatar
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, cursor: "pointer" }}
                      onClick={() => dispatch({ type: "SELECT_PROFILE", payload: sender })}>
                      {sender.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginTop: 2 }}>
                      {sender.profile_id} · {sender.age ? `${sender.age} yrs` : ""} · {sender.district}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>
                      {sender.education} · {sender.occupation}
                    </div>
                    <div style={{ marginTop: 6 }}>{statusBadge(interest.status)}</div>
                  </div>
                  {interest.status === "pending" && (
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button className="btn btn-sm btn-success"
                        onClick={() => dispatch({ type: "ACCEPT_INTEREST", payload: interest.id })}>
                        <Icon name="check" size={14} /> {t("accept")}
                      </button>
                      <button className="btn btn-sm btn-danger"
                        onClick={() => dispatch({ type: "REJECT_INTEREST", payload: interest.id })}>
                        <Icon name="x" size={14} /> {t("reject")}
                      </button>
                    </div>
                  )}
                  {interest.status === "accepted" && (
                    <button className="btn btn-sm btn-primary"
                      onClick={() => dispatch({ type: "SELECT_PROFILE", payload: sender })}>
                      <Icon name="eye" size={14} /> View Profile
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Sent Tab */}
      {tab === "sent" && (
        sentInterests.length === 0 ? (
          <div className="empty-state">
            <Icon name="send" size={48} />
            <p>No interests sent yet</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }}
              onClick={() => dispatch({ type: "SET_PAGE", payload: "search" })}>
              Browse Profiles
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sentInterests.map(interest => {
              const target = getProfile(interest.to);
              if (!target) return null;
              return (
                <div key={interest.id} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div className={`avatar avatar-md avatar-${target.profile_type}`} style={{ cursor: "pointer" }}
                    onClick={() => dispatch({ type: "SELECT_PROFILE", payload: target })}>
                    {target.photo
                      ? <img src={target.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                      : target.avatar
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, cursor: "pointer" }}
                      onClick={() => dispatch({ type: "SELECT_PROFILE", payload: target })}>
                      {target.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginTop: 2 }}>
                      {target.profile_id} · {target.age ? `${target.age} yrs` : ""} · {target.district}
                    </div>
                    <div style={{ marginTop: 6 }}>{statusBadge(interest.status)}</div>
                    <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginTop: 2 }}>
                      {new Date(interest.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-sm btn-secondary"
                      onClick={() => dispatch({ type: "SELECT_PROFILE", payload: target })}>
                      <Icon name="eye" size={14} /> View
                    </button>
                    {interest.status === "pending" && (
                      <button className="btn btn-sm btn-secondary" style={{ color: "var(--clr-danger)" }}
                        onClick={() => dispatch({ type: "WITHDRAW_INTEREST", payload: interest.id })}>
                        <Icon name="x" size={14} /> {t("reject")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
       
          </div>
        )
      )}
    </div>
  );
}
