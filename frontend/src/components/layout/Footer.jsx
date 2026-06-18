import { useEffect, useState } from "react";
import { Icon } from "../Icon.jsx";

const apiBase = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");

export function Footer({ state, t, dispatch }) {
  const [contact, setContact] = useState({
    appName: "AVS Matrimony",
    officeAddress: "",
    adminName: "",
    phone: "",
    whatsapp: "",
    email: "",
    workingHours: "",
    aboutText: "",
    admins: []
  });

  useEffect(() => {
    let active = true;
    fetch(`${apiBase}/api/contact`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data) {
          setContact(data);
        }
      })
      .catch((err) => console.error("Error loading contact info:", err));
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer style={{
      background: "linear-gradient(135deg, var(--clr-maroon-dark, #4A0E17) 0%, #2D050B 100%)",
      color: "rgba(255, 255, 255, 0.75)",
      padding: "48px 0 24px",
      fontSize: 13,
      borderTop: "3px solid var(--clr-saffron, #E56D25)",
    }}>
      <div className="page-container" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 32,
        marginBottom: 32,
      }}>
        {/* About column */}
        <div>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--clr-white, #ffffff)",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <span>🔯</span> {contact.appName}
          </h3>
          {contact.aboutText && (
            <p style={{ lineHeight: 1.6, color: "rgba(255, 255, 255, 0.65)" }}>
              {contact.aboutText}
            </p>
          )}
        </div>

        {/* Quick Links Column */}
        <div>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--clr-white, #ffffff)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 16
          }}>
            Quick Navigation
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {[
              { id: "home", label: t("home") },
              { id: "search", label: t("search") },
              { id: "matches", label: t("matches") },
              { id: "interests", label: t("interests") },
              { id: "adminDetails", label: "Admin Details" },
            ].map(link => (
              <li key={link.id}>
                <button
                  onClick={() => dispatch({ type: "SET_PAGE", payload: link.id })}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.7)",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 13,
                    transition: "color 0.2s",
                    textAlign: "left",
                    fontWeight: 500
                  }}
                  onMouseOver={(e) => e.target.style.color = "var(--clr-saffron, #E56D25)"}
                  onMouseOut={(e) => e.target.style.color = "rgba(255,255,255,0.7)"}
                >
                  → {link.label}
                </button>
              </li>
            ))}
            {!state.isAdmin && (
              <li style={{ marginTop: 6, borderTop: "1px dashed rgba(255,255,255,0.15)", paddingTop: 6 }}>
                <button
                  onClick={() => dispatch({ type: "GO_TO_ADMIN_LOGIN" })}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.5)",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 12,
                    transition: "color 0.2s",
                    textAlign: "left",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                  onMouseOver={(e) => e.target.style.color = "#a78bfa"}
                  onMouseOut={(e) => e.target.style.color = "rgba(255,255,255,0.5)"}
                >
                  🛡️ {t("adminLogin")}
                </button>
              </li>
            )}
          </ul>
        </div>

        {/* Contact/Admin Details Column */}
        <div>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--clr-white, #ffffff)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 16
          }}>
            Office & Contact
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {contact.officeAddress && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Icon name="mapPin" size={16} style={{ color: "var(--clr-saffron, #E56D25)", marginTop: 2, flexShrink: 0 }} />
                <span style={{ lineHeight: 1.5 }}>{contact.officeAddress}</span>
              </div>
            )}
            {contact.adminName && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="user" size={16} style={{ color: "var(--clr-saffron, #E56D25)", flexShrink: 0 }} />
                <span>Admin: <strong>{contact.adminName}</strong></span>
              </div>
            )}
            {contact.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="phone" size={16} style={{ color: "var(--clr-saffron, #E56D25)", flexShrink: 0 }} />
                <a href={`tel:${contact.phone}`} style={{ color: "inherit", textDecoration: "none" }}
                   onMouseOver={(e) => e.target.style.color = "var(--clr-saffron, #E56D25)"}
                   onMouseOut={(e) => e.target.style.color = "inherit"}>
                  {contact.phone}
                </a>
              </div>
            )}
            {contact.whatsapp && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, marginLeft: 2, marginRight: 2, flexShrink: 0 }}>💬</span>
                <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}
                   onMouseOver={(e) => e.target.style.color = "var(--clr-saffron, #E56D25)"}
                   onMouseOut={(e) => e.target.style.color = "inherit"}>
                  {contact.whatsapp}
                </a>
              </div>
            )}
            {contact.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="mail" size={16} style={{ color: "var(--clr-saffron, #E56D25)", flexShrink: 0 }} />
                <a href={`mailto:${contact.email}`} style={{ color: "inherit", textDecoration: "none" }}
                   onMouseOver={(e) => e.target.style.color = "var(--clr-saffron, #E56D25)"}
                   onMouseOut={(e) => e.target.style.color = "inherit"}>
                  {contact.email}
                </a>
              </div>
            )}
            {contact.workingHours && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                <Icon name="activity" size={14} style={{ flexShrink: 0 }} />
                <span>{contact.workingHours}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copyright sub-footer */}
      <div style={{
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        paddingTop: 20,
        textAlign: "center",
        fontSize: 11,
        color: "rgba(255, 255, 255, 0.4)"
      }}>
        © 2026 {contact.appName}. All rights reserved.
      </div>
    </footer>
  );
}
