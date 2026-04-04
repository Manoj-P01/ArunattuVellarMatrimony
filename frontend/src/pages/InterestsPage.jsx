import { useState } from "react";
import { Icon } from "../components/Icon.jsx";
import { ProfileCard } from "../components/ProfileCard.jsx";

export function InterestsPage({ state, dispatch, t }) {
  const [tab, setTab] = useState("sent");

  const sentProfiles = state.profiles.filter(p => state.interests.includes(p.id));
  const receivedProfiles = state.profiles.filter(p => ["2", "4"].includes(p.id)); // Demo

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t("interests")}</h2>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab("sent")}>
          {t("interestSent")} ({sentProfiles.length})
        </button>
        <button className={`tab ${tab === 'received' ? 'active' : ''}`} onClick={() => setTab("received")}>
          {t("interestReceived")} ({receivedProfiles.length})
        </button>
      </div>

      {tab === "sent" && (
        sentProfiles.length === 0 ? (
          <div className="empty-state">
            <Icon name="heart" size={48} />
            <p>No interests sent yet</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sentProfiles.map(p => (
              <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", padding: 16, gap: 14 }}>
                <div className={`avatar avatar-md avatar-${p.type}`}>{p.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>{p.profile_id} · {p.age} {t("yrs")} · {p.district}</div>
                </div>
                <span className="badge badge-pending">{t("pending")}</span>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "received" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {receivedProfiles.map(p => (
            <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", padding: 16, gap: 14, flexWrap: "wrap" }}>
              <div className={`avatar avatar-md avatar-${p.type}`}>{p.avatar}</div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>{p.profile_id} · {p.age} {t("yrs")} · {p.district}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-sm btn-success"><Icon name="check" size={14} /> {t("accept")}</button>
                <button className="btn btn-sm btn-danger"><Icon name="x" size={14} /> {t("reject")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
