import { useEffect, useState } from "react";
import { Icon } from "../components/Icon.jsx";
import { formatPhone } from "../components/PhoneInput.jsx";

const apiBase = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");

export function AdminDetailsPage({ state, dispatch, t }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    fetch(`${apiBase}/api/contact`)
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          if (data && data.admins && data.admins.length > 0) {
            setAdmins(data.admins);
          } else {
            // Fallback: if data.admins is empty, use the config's main admin details
            const fallbackAdmin = {
              name: data?.adminName || "Manoj Kumar",
              email: data?.email || "avsmatrimony26@gmail.com",
              mobile: data?.phone || "+91 96296 61778",
              whatsapp: data?.whatsapp || "+91 96296 61778"
            };
            setAdmins([fallbackAdmin]);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading admins:", err);
        if (active) {
          setError("Failed to load administrator details.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button 
          className="btn btn-icon" 
          onClick={() => dispatch({ type: "SET_PAGE", payload: "home" })}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--clr-text)" }}
        >
          ←
        </button>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, margin: 0 }}>
          Administrator Details
        </h2>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
          <p style={{ color: "var(--clr-text-muted)", fontSize: 14 }}>Loading administrator records...</p>
        </div>
      ) : error ? (
        <div className="empty-state" style={{ padding: "32px 16px" }}>
          <Icon name="x" size={48} style={{ color: "var(--clr-danger)" }} />
          <p style={{ marginTop: 12 }}>{error}</p>
        </div>
      ) : admins.length === 0 ? (
        <div className="empty-state" style={{ padding: "32px 16px" }}>
          <Icon name="user" size={48} />
          <p style={{ marginTop: 12 }}>No administrators found.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600, fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--clr-border, rgba(0,0,0,0.1))", background: "var(--clr-surface-alt, rgba(0,0,0,0.02))" }}>
                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600 }}>S.No</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600 }}>Name</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600 }}>Mobile</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600 }}>WhatsApp</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600 }}>Email</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((adm, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--clr-border, rgba(0,0,0,0.05))" }}>
                  <td style={{ padding: "14px 16px", color: "var(--clr-text-muted)" }}>{idx + 1}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>{adm.name || "—"}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {adm.mobile ? (
                      <a href={`tel:${formatPhone(adm.mobile).replace(/\s/g, "")}`} style={{ color: "var(--clr-saffron, #E56D25)", textDecoration: "none", fontWeight: 500 }}>
                        {formatPhone(adm.mobile)}
                      </a>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {adm.whatsapp ? (
                      <a 
                        href={`https://wa.me/${formatPhone(adm.whatsapp).replace(/\D/g, "")}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: "#25D366", textDecoration: "none", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        💬 {formatPhone(adm.whatsapp)}
                      </a>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {adm.email ? (
                      <a href={`mailto:${adm.email}`} style={{ color: "var(--clr-link, #0284c7)", textDecoration: "none" }}>
                        {adm.email}
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
