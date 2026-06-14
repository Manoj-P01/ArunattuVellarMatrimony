import { useState, useCallback, useEffect } from "react";
import { Icon } from "../components/Icon.jsx";
import { RASIS, NATCHATHIRAMS, DOSHAM_TYPES, LAGNAM_POSITIONS } from "../constants/jothidam.js";
import { AVS_KOTHIRAMS } from "../constants/kothirams.js";
import { apiAdminApprove, apiAdminReject, apiAdminGenerateInvite } from "../api/client.js";
import { formatPhone, waLink } from "../components/PhoneInput.jsx";


/** Human-readable relative time: "3 days ago", "2 hrs ago", "Just now" */
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (mins < 2) return "Just now";
  if (hours < 1) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return `${months}mo ago`;
}

/** Format a date string to "14 Apr 2026 09:32" */
function fmtDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/** Return "en — ta" for a kothiram stored in DB */
function kothiramLabel(val) {
  if (!val) return "—";
  const k = AVS_KOTHIRAMS.find(x => x.en.toLowerCase() === val.toLowerCase());
  return k ? `${k.en} (${k.ta})` : val;
}

/** Show profile_id only after admin approval; show badge if still pending */
function ProfileIdBadge({ profile_id, approval_status, style = {} }) {
  if (profile_id) {
    return <span style={{ fontWeight: 600, ...style }}>{profile_id}</span>;
  }
  if (approval_status === "pending") {
    return (
      <span style={{
        fontSize: 11, fontWeight: 600, color: "#856404",
        background: "#FFF3CD", border: "1px solid #FFD166",
        borderRadius: 4, padding: "1px 6px", ...style,
      }}>
        Pending Approval
      </span>
    );
  }
  return <span style={{ color: "var(--clr-text-muted)", ...style }}>—</span>;
}

const SIBLING_MARRIED_LABELS = {
  all_married: "All Married",
  all_unmarried: "All Unmarried",
  partially_married: "Partially Married",
};

// ── Tooltip wrapper for tab icons ─────────────────────────────────────────────
function TooltipIcon({ label, icon, active, badge, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      className={`tab ${active ? "active" : ""}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative" }}
    >
      <Icon name={icon} size={15} />
      <span className="hide-mobile" style={{ marginLeft: 6 }}>{label}</span>
      {badge > 0 && (
        <span style={{ background: "var(--clr-saffron)", color: "white", borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 700, marginLeft: 4 }}>{badge}</span>
      )}
      {/* Tooltip — visible on mobile (where text is hidden) */}
      {hovered && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "var(--clr-text)", color: "white", fontSize: 11, fontWeight: 600,
          padding: "5px 10px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 999,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)", pointerEvents: "none",
        }}>
          {label}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid var(--clr-text)" }} />
        </div>
      )}
    </button>
  );
}

// ── Admin full profile detail view ────────────────────────────────────────────
function AdminProfileDetail({ profile, onClose, dispatch, t, onApprove, onReject, actionLoading }) {
  if (!profile) return null;
  const p = profile;
  const calcAge = (dob) => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  const Row = ({ label, value }) => (
    <div style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--clr-border)" }}>
      <div style={{ width: 180, flexShrink: 0, fontSize: 13, color: "var(--clr-text-muted)", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--clr-text-body)", flex: 1 }}>{value || <span style={{ color: "var(--clr-text-muted)", fontWeight: 400 }}>—</span>}</div>
    </div>
  );

  const Section = ({ title, icon, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid var(--clr-saffron)" }}>
        <Icon name={icon} size={15} style={{ color: "var(--clr-saffron)" }} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--clr-saffron)", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px", overflowY: "auto" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card animate-in" style={{ maxWidth: 680, width: "100%", marginBottom: 20 }}>
        {/* Header */}
        <div style={{ height: 80, background: p.profile_type === "bride" ? "linear-gradient(135deg,#FFD1DC,#FFB6C1)" : "linear-gradient(135deg,#B8D4E3,#87CEEB)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", position: "relative" }}>
          <button onClick={onClose}
            style={{ position: "absolute", top: 12, right: 14, background: "rgba(255,255,255,0.8)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ padding: "0 24px 24px", marginTop: -40 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 16 }}>
            <div className={`avatar avatar-xl avatar-${p.profile_type}`} style={{ border: "4px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "hidden", flexShrink: 0 }}>
              {p.photo ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : <span style={{ fontSize: 22, fontWeight: 700 }}>{p.avatar}</span>}
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{p.name}</h3>
              <div style={{ fontSize: 13, color: "var(--clr-text-muted)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <ProfileIdBadge profile_id={p.profile_id} approval_status={p.approval_status} />
                {calcAge(p.dob) ? `· ${calcAge(p.dob)} yrs` : ""}
                {p.district ? `· ${p.district}` : ""}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <span className={`badge badge-${p.profile_type}`}>{t(p.profile_type)}</span>
                <span className={`badge badge-${p.approval_status}`}>{t(p.approval_status)}</span>
                <span className={`badge badge-${p.profile_status || "active"}`}>{t(p.profile_status || "active")}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {p.approval_status === "pending" && (
            <div style={{ display: "flex", gap: 10, marginBottom: 20, padding: "12px 16px", background: "#FFFDE7", borderRadius: 8, border: "1px solid #FFD166", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 13, flex: 1, color: "#856404", minWidth: 180 }}>⏳ Pending — Profile ID will be assigned on approval</span>
              <button className="btn btn-sm btn-success"
                disabled={!!actionLoading?.[p.id]}
                onClick={async () => { await onApprove(p.id); onClose(); }}>
                {actionLoading?.[p.id] === "approving" ? "Approving…" : <><Icon name="check" size={13} /> Approve</>}
              </button>
              <button className="btn btn-sm btn-danger"
                disabled={!!actionLoading?.[p.id]}
                onClick={async () => { await onReject(p.id); onClose(); }}>
                {actionLoading?.[p.id] === "rejecting" ? "Rejecting…" : <><Icon name="x" size={13} /> Reject</>}
              </button>
            </div>
          )}

          <Section title={t("personalDetails")} icon="user">
            <Row label={t("dob")} value={p.dob ? `${new Date(p.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} (${calcAge(p.dob)} ${t("yrs")})` : null} />
            <Row label={t("birthTime")} value={p.birth_time ? (() => { try { const [h, m] = p.birth_time.split(":"); const hh = parseInt(h); return `${hh > 12 ? hh - 12 : hh || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`; } catch { return p.birth_time; } })() : null} />
            <Row label={t("birthPlace")} value={p.birth_place} />
            <Row label={t("height")} value={p.height} />
            <Row label={t("maritalStatus")} value={p.marital_status ? t(p.marital_status) : null} />
            <Row label={t("education")} value={p.education} />
            <Row label={t("occupation")} value={p.occupation} />
            <Row label={t("salary")} value={p.salary ? `₹${p.salary} ${t("lpa")}` : null} />
          </Section>

          <Section title={t("communityDetails")} icon="globe">
            <Row label={t("subCaste")} value={p.kothiram} />
            <Row label={t("nativePlaceLabel")} value={p.native_place} />
          </Section>

          <Section title={t("locationDetails")} icon="mapPin">
            <Row label={t("country")} value={p.country} />
            <Row label={t("state")} value={p.state} />
            <Row label={t("district")} value={p.district} />
          </Section>

          <Section title={"🔯 " + t("jothidamDetails")} icon="star">
            <Row label={t("rasi")} value={RASIS.find(r => r.id === p.rasi) ? `${RASIS.find(r => r.id === p.rasi).en} — ${RASIS.find(r => r.id === p.rasi).ta}` : p.rasi} />
            <Row label={t("natchathiram")} value={NATCHATHIRAMS.find(n => n.id === p.natchathiram) ? `${NATCHATHIRAMS.find(n => n.id === p.natchathiram).en} — ${NATCHATHIRAMS.find(n => n.id === p.natchathiram).ta}` : p.natchathiram} />
            <Row label={t("patham")} value={p.patham ? `${p.patham}${p.patham === "1" ? "st" : p.patham === "2" ? "nd" : p.patham === "3" ? "rd" : "th"} ${t("patham")}` : null} />
            <Row label={t("dosham")} value={DOSHAM_TYPES.find(d => d.id === p.dosham)?.en || p.dosham} />
            {p.sevvai_position && <Row label={t("sevvai")} value={LAGNAM_POSITIONS.find(l => l.id === p.sevvai_position)?.en || p.sevvai_position} />}
            {p.ragu_position && <Row label={t("ragu")} value={LAGNAM_POSITIONS.find(l => l.id === p.ragu_position)?.en || p.ragu_position} />}
            {p.kedhu_position && <Row label={t("kedhu")} value={LAGNAM_POSITIONS.find(l => l.id === p.kedhu_position)?.en || p.kedhu_position} />}
          </Section>

          <Section title={t("additionalDetails")} icon="edit">
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "var(--clr-text-muted)", fontWeight: 600, marginBottom: 4 }}>{t("aboutMe")}</div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--clr-text-body)" }}>{p.about_me || p.about || <span style={{ color: "var(--clr-text-muted)" }}>—</span>}</p>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--clr-text-muted)", fontWeight: 600, marginBottom: 4 }}>{t("expectations")}</div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--clr-text-body)" }}>{p.expectations || <span style={{ color: "var(--clr-text-muted)" }}>—</span>}</p>
            </div>
          </Section>

          <Section title={t("familyDetails")} icon="users">
            <Row label={t("fatherName")} value={p.father_name} />
            <Row label={t("fatherKothiram")} value={p.father_kothiram} />
            <Row label={t("motherName")} value={p.mother_name} />
            <Row label={t("motherKothiram")} value={p.mother_kothiram} />
            <Row label={t("brothers")} value={
              p.brother_count !== "" && p.brother_count !== undefined
                ? `${p.brother_count}${p.brother_married_status ? " — " + (SIBLING_MARRIED_LABELS[p.brother_married_status] || p.brother_married_status) : ""}`
                : null
            } />
            <Row label={t("sisters")} value={
              p.sister_count !== "" && p.sister_count !== undefined
                ? `${p.sister_count}${p.sister_married_status ? " — " + (SIBLING_MARRIED_LABELS[p.sister_married_status] || p.sister_married_status) : ""}`
                : null
            } />
            {(p.living_district || p.living_state || p.living_country) && (
              <Row label="Currently Living In" value={
                [p.living_district, p.living_state, p.living_country].filter(Boolean).join(", ")
              } />
            )}
          </Section>

          <Section title={t("contactDetails")} icon="phone">
            <Row label={t("email")} value={p.email} />
            <Row label="WhatsApp" value={p.whatsapp ? (
              <a href={waLink(p.whatsapp)} target="_blank" rel="noopener noreferrer"
                style={{ color: "#16a34a", fontWeight: 600 }}>
                {formatPhone(p.whatsapp)}
              </a>
            ) : null} />
            <Row label={t("contact")} value={p.contact ? formatPhone(p.contact) : null} />
            <Row label={t("altContact")} value={(p.alt_contact || p.altContact) ? formatPhone(p.alt_contact || p.altContact) : null} />
          </Section>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Panel ──────────────────────────────────────────────────────────
export function AdminPanel({ state, dispatch, t }) {
  const { adminTab } = state;
  const isSuperAdmin = state.user?.role === "super_admin";
  const [marriageForm, setMarriageForm] = useState({ brideId: "", groomId: "", marriedDate: "", marriageType: "arranged" });
  const [mapSuccess, setMapSuccess] = useState("");

  // ── Photos / Jathagam pending approval ─────────────────────────────────
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [pendingPhotosCount, setPendingPhotosCount] = useState(0);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null); // { url, name, profileId, photoType }

  // ── Admins list + pending approvals ─────────────────────────────────────
  const [adminsList, setAdminsList] = useState([]);
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState({});

  const loadAdmins = () => {
    setAdminsLoading(true);
    const calls = [
      fetch(`${base}/api/admin/users?limit=100`, { credentials: "include" }).then(r => r.json()),
    ];
    if (isSuperAdmin) {
      calls.push(fetch(`${base}/api/admin/approve-admin?status=pending`, { credentials: "include" }).then(r => r.json()));
    }
    Promise.all(calls).then(([usersData, pendingData]) => {
      setAdminsList((usersData.users || []).filter(u => u.role === "admin" || u.role === "super_admin"));
      if (pendingData) {
        setPendingAdmins(pendingData.admins || []);
      } else {
        setPendingAdmins([]);
      }
    }).catch(() => { }).finally(() => setAdminsLoading(false));
  };

  const handleDeleteAdmin = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete the admin account of ${userName || "this admin"}? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${base}/api/admin/users`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Admin account deleted successfully.");
        loadAdmins();
      } else {
        alert(data.error || "Failed to delete admin.");
      }
    } catch {
      alert("Network error.");
    }
  };

  useEffect(() => { loadAdmins(); }, []);

  const handleAdminApproval = async (detId, action) => {
    setAdminActionLoading(l => ({ ...l, [detId]: action }));
    try {
      const res = await fetch(`${base}/api/admin/approve-admin`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_detail_id: detId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingAdmins(prev => prev.filter(a => a.id !== detId));
        if (action === "approve") loadAdmins(); // refresh full list
      } else { alert(data.error || "Action failed"); }
    } catch { alert("Network error"); }
    finally { setAdminActionLoading(l => ({ ...l, [detId]: null })); }
  };

  const loadPendingPhotos = async () => {
    setPhotosLoading(true);
    try {
      const res = await fetch(`${base}/api/admin/photos?status=pending`, { credentials: "include" });
      const data = await res.json();
      const photos = data.photos || [];
      setPendingPhotos(photos);
      setPendingPhotosCount(photos.length);
    } catch { } finally { setPhotosLoading(false); }
  };

  useEffect(() => { loadPendingPhotos(); }, []);

  const handlePhotoAction = async (photoId, action) => {
    const res = await fetch(`${base}/api/admin/photos`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_id: photoId, action }),
    });
    if ((await res.json()).success) {
      setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
      setPendingPhotosCount(prev => prev - 1);
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingProfile, setViewingProfile] = useState(null);
  const [approveFilter, setApproveFilter] = useState("all"); // "all" | "bride" | "groom"

  // Admin invite link
  const [inviteRole, setInviteRole] = useState("admin");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  const generateInviteLink = useCallback((role) => {
    setInviteLink("");
    apiAdminGenerateInvite(role).then(res => {
      if (res.invite_url) setInviteLink(res.invite_url);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      generateInviteLink(inviteRole);
    }
  }, [inviteRole, isSuperAdmin, generateInviteLink]);

  const handleCopyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    });
  };

  const setTab = (id) => dispatch({ type: "SET_ADMIN_TAB", payload: id });

  const nowMonthStart = (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; })();
  const activeAdminsCount = adminsList.length;
  const stats = {
    total: state.profiles.length,
    active: state.profiles.filter(p => (p.profile_status || "active") === "active" && p.approval_status === "approved").length,
    inactive: state.profiles.filter(p => p.profile_status === "inactive").length,
    married: state.profiles.filter(p => p.profile_status === "married").length,
    success: state.marriages.length,
    pending: state.profiles.filter(p => p.approval_status === "pending").length,
    // Current month approved
    newReg: state.profiles.filter(p =>
      p.approval_status === "approved" &&
      p.approved_at &&
      new Date(p.approved_at) >= nowMonthStart
    ).length,
  };

  const currentMonthName = new Date().toLocaleString("en-IN", { month: "long" });
  const statCards = [
    { label: t("totalUsers"), value: stats.total, icon: "users", color: "#E3F0F8", iconColor: "#1a3a5c", tab: "users", filter: null },
    { label: t("activeProfiles"), value: stats.active, icon: "activity", color: "#E6F9EE", iconColor: "#1B7A3D", tab: "users", filter: "active" },
    { label: t("inactiveProfiles"), value: stats.inactive, icon: "eyeOff", color: "#F5F5F5", iconColor: "#757575", tab: "users", filter: "inactive" },
    { label: t("marriedProfiles"), value: stats.married, icon: "award", color: "#F3E8FF", iconColor: "#6B21A8", tab: "married", filter: null },
    { label: t("pending"), value: stats.pending, icon: "eye", color: "#FFFDE7", iconColor: "#F57F17", tab: "approve", filter: null },
    { label: String(t("newRegistrations")) + " (" + currentMonthName + ")", value: stats.newReg, icon: "trendingUp", color: "#FFF3E0", iconColor: "#E65100", tab: "users", filter: "newMonth" },
    { label: t("successCount"), value: stats.success, icon: "heart", color: "#FFE8ED", iconColor: "var(--clr-maroon)", tab: "married", filter: null },
    { label: "Active Admins", value: activeAdminsCount, icon: "shield", color: "#FFF5F0", iconColor: "var(--clr-saffron)", tab: "admins", filter: null },
  ];

  const [usersStatusFilter, setUsersStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState({}); // { [profileId]: "approving"|"rejecting" }

  // ── Shared approve / reject (always hits the backend) ─────────────────────
  const handleApprove = useCallback(async (profileId) => {
    setActionLoading(l => ({ ...l, [profileId]: "approving" }));
    try {
      const result = await apiAdminApprove(profileId);
      if (result?.success) {
        dispatch({ type: "APPROVE_PROFILE", payload: { id: profileId, profile_id: result.profile?.profile_id } });
      } else {
        alert(result?.error || "Approval failed. Please try again.");
      }
    } catch (e) {
      alert(e.message || "Approval failed. Please try again.");
    } finally {
      setActionLoading(l => ({ ...l, [profileId]: null }));
    }
  }, [dispatch]);

  const handleReject = useCallback(async (profileId, reason = "") => {
    setActionLoading(l => ({ ...l, [profileId]: "rejecting" }));
    try {
      await apiAdminReject(profileId, reason);
      dispatch({ type: "REJECT_PROFILE", payload: profileId });
    } catch (e) {
      alert(e.message || "Rejection failed. Please try again.");
    } finally {
      setActionLoading(l => ({ ...l, [profileId]: null }));
    }
  }, [dispatch]);

  const filteredUsers = state.profiles.filter(p => {
    const matchSearch = !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.profile_id?.toLowerCase().includes(searchTerm.toLowerCase()) || p.district?.toLowerCase().includes(searchTerm.toLowerCase());
    let matchStatus = true;
    if (usersStatusFilter === "newMonth") {
      matchStatus = p.approval_status === "approved" && p.approved_at && new Date(p.approved_at) >= nowMonthStart;
    } else if (usersStatusFilter) {
      matchStatus = p.profile_status === usersStatusFilter || p.approval_status === usersStatusFilter;
    }
    return matchSearch && matchStatus;
  });

  const pendingProfiles = state.profiles
    .filter(p =>
      p.approval_status === "pending" &&
      (approveFilter === "all" || p.profile_type === approveFilter)
    )
    // Show oldest (most urgent) registrations first
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  const handleMapMarriage = () => {
    if (!marriageForm.brideId || !marriageForm.groomId || !marriageForm.marriedDate) return;
    dispatch({ type: "MAP_MARRIAGE", payload: marriageForm });
    setMapSuccess("Marriage mapped successfully! 💑");
    setMarriageForm({ brideId: "", groomId: "", marriedDate: "", marriageType: "arranged" });
    setTimeout(() => setMapSuccess(""), 3000);
  };

  const handleStatClick = (card) => {
    setUsersStatusFilter(card.filter || "");
    setTab(card.tab);
  };

  return (
    <div className="animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <div className="page-container">

        {/* ── Lightbox / Fullscreen Photo Viewer ── */}
        {lightboxPhoto && (
          <div
            onClick={() => setLightboxPhoto(null)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)",
              zIndex: 9999, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "zoom-out",
              flexDirection: "column", gap: 16, padding: 24,
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxPhoto(null)}
              style={{
                position: "absolute", top: 20, right: 24,
                background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.25)",
                color: "white", fontSize: 22, cursor: "pointer",
                borderRadius: "50%", width: 42, height: 42,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1, transition: "background 0.2s",
              }}
            >✕</button>

            {/* Photo info */}
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "white" }}>
                {lightboxPhoto.name}
              </span>
              {lightboxPhoto.profileId && (
                <span style={{ marginLeft: 8, opacity: 0.65 }}>· {lightboxPhoto.profileId}</span>
              )}
              {lightboxPhoto.photoType && (
                <span style={{
                  marginLeft: 10, background: "rgba(255,255,255,0.18)",
                  padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                }}>
                  {lightboxPhoto.photoType === "horoscope" ? "🔯 Jathagam" : "📷 Gallery"}
                </span>
              )}
            </div>

            {/* Image */}
            <img
              src={lightboxPhoto.url}
              alt=""
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: "92vw", maxHeight: "80vh",
                objectFit: "contain", borderRadius: 10,
                boxShadow: "0 8px 48px rgba(0,0,0,0.7)",
                cursor: "default",
              }}
            />

            {/* Action hint */}
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
              Click anywhere outside image to close
            </div>
          </div>
        )}

        {/* Profile Detail Modal */}
        {viewingProfile && (
          <AdminProfileDetail
            profile={viewingProfile}
            onClose={() => setViewingProfile(null)}
            dispatch={dispatch}
            t={t}
            onApprove={handleApprove}
            onReject={handleReject}
            actionLoading={actionLoading}
          />
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <Icon name="shield" size={24} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{t("admin")} Panel</h2>
        </div>

        {/* Tabs with tooltips */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {[
            { id: "dashboard", icon: "grid", label: t("dashboard") },
            { id: "approve", icon: "check", label: t("approveUsers"), badge: stats.pending },
            { id: "users", icon: "users", label: t("allUsers") },
            { id: "married", icon: "award", label: t("marriedUsers") },
            { id: "photos", icon: "camera", label: "Photos", badge: pendingPhotosCount },
            { id: "reports", icon: "barChart", label: t("reports") },
          ].map(tab => (
            <TooltipIcon
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={adminTab === tab.id}
              badge={tab.badge || 0}
              onClick={() => setTab(tab.id)}
            />
          ))}
        </div>

        {/* ── Dashboard ── */}
        {adminTab === "dashboard" && (
          <div>
            {/* Clickable stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
              {statCards.map((s, i) => (
                <div key={i} className="stat-card"
                  style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
                  onClick={() => handleStatClick(s)}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                  <div className="stat-icon" style={{ background: s.color, color: s.iconColor }}>
                    <Icon name={s.icon} size={22} />
                  </div>
                  <div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                  <div style={{ marginLeft: "auto", color: "var(--clr-text-muted)", opacity: 0.5 }}>
                    <Icon name="chevronRight" size={14} />
                  </div>
                </div>
              ))}
            </div>

            {/* Admin Invite Link */}
            {isSuperAdmin && (
              <div className="card" style={{ marginBottom: 20, border: "1.5px solid var(--clr-saffron)" }}>
                <div className="card-body">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,var(--clr-saffron),var(--clr-maroon))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name="shield" size={15} style={{ color: "white" }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Admin Invite Link</div>
                        <div style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>Copy and share to invite a new admin or super admin. Expires in 48 hours.</div>
                      </div>
                    </div>
                    {/* Role Selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--clr-surface-alt)", padding: "4px 10px", borderRadius: 8 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", fontWeight: inviteRole === "admin" ? 700 : 500, color: inviteRole === "admin" ? "var(--clr-saffron)" : "var(--clr-text-muted)" }}>
                        <input
                          type="radio"
                          name="inviteRole"
                          value="admin"
                          checked={inviteRole === "admin"}
                          onChange={() => setInviteRole("admin")}
                          style={{ accentColor: "var(--clr-saffron)" }}
                        />
                        Admin
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", fontWeight: inviteRole === "super_admin" ? 700 : 500, color: inviteRole === "super_admin" ? "var(--clr-maroon)" : "var(--clr-text-muted)" }}>
                        <input
                          type="radio"
                          name="inviteRole"
                          value="super_admin"
                          checked={inviteRole === "super_admin"}
                          onChange={() => setInviteRole("super_admin")}
                          style={{ accentColor: "var(--clr-maroon)" }}
                        />
                        Super Admin
                      </label>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--clr-bg-subtle)", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ flex: 1, fontSize: 12, wordBreak: "break-all", color: "var(--clr-saffron)", fontWeight: 500 }}>
                      {inviteLink || "Generating link…"}
                    </div>
                    <button
                      onClick={handleCopyInvite}
                      disabled={!inviteLink}
                      style={{
                        flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 16px", borderRadius: 8, border: "none",
                        cursor: inviteLink ? "pointer" : "default",
                        fontWeight: 700, fontSize: 13, transition: "all 0.2s",
                        background: inviteCopied ? "var(--clr-success)" : inviteLink ? "var(--clr-saffron)" : "var(--clr-border)",
                        color: "white",
                      }}>
                      <Icon name={inviteCopied ? "check" : "copy"} size={14} />
                      {inviteCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent profiles */}
            <div className="card">
              <div className="card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>Recent Profiles</h3>
                  <button className="btn btn-sm btn-secondary" onClick={() => setTab("users")}>View All</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr>
                      <th>{t("profileId")}</th>
                      <th>{t("name")}</th>
                      <th>Type</th>
                      <th>{t("district")}</th>
                      <th>Status</th>
                      <th>Timeline</th>
                      <th>Action</th>
                    </tr></thead>
                    <tbody>
                      {/* Show 3 pending first (urgent), then recent approved */}
                      {[
                        ...state.profiles.filter(p => p.approval_status === "pending").sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)).slice(0, 3),
                        ...state.profiles.filter(p => p.approval_status === "approved").sort((a, b) => new Date(b.approved_at || 0) - new Date(a.approved_at || 0)).slice(0, 4),
                      ].map(p => {
                        const isPending = p.approval_status === "pending";
                        const timeline = isPending
                          ? (() => {
                            const d = Math.floor((Date.now() - new Date(p.created_at || 0).getTime()) / 86400000);
                            return <span style={{ fontSize: 11, color: d >= 3 ? "#C62828" : "#E65100", fontWeight: 600 }}>⏳ {d}d waiting</span>;
                          })()
                          : <span style={{ fontSize: 11, color: "#1B7A3D", fontWeight: 600 }}>✓ {timeAgo(p.approved_at)}</span>;
                        return (
                          <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setViewingProfile(p)}>
                            <td style={{ fontSize: 13 }}><ProfileIdBadge profile_id={p.profile_id} approval_status={p.approval_status} /></td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div className={`avatar avatar-sm avatar-${p.profile_type}`}>
                                  {p.photo ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : p.avatar}
                                </div>
                                {p.name}
                              </div>
                            </td>
                            <td><span className={`badge badge-${p.profile_type}`}>{t(p.profile_type)}</span></td>
                            <td style={{ fontSize: 13 }}>{p.district || "—"}</td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <span className={`badge badge-${p.profile_status || "active"}`} style={{ fontSize: 10 }}>{t(p.profile_status || "active")}</span>
                                <span className={`badge badge-${p.approval_status}`} style={{ fontSize: 10 }}>{t(p.approval_status)}</span>
                              </div>
                            </td>
                            <td style={{ fontSize: 12 }}>{timeline}</td>
                            <td>
                              <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); setViewingProfile(p); }}>
                                <Icon name="eye" size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Approve Users ── */}
        {adminTab === "approve" && (
          <div>
            {/* Filter by type */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { v: "all", l: `All (${state.profiles.filter(p => p.approval_status === "pending").length})` },
                { v: "bride", l: `Brides (${state.profiles.filter(p => p.approval_status === "pending" && p.profile_type === "bride").length})` },
                { v: "groom", l: `Grooms (${state.profiles.filter(p => p.approval_status === "pending" && p.profile_type === "groom").length})` },
              ].map(f => (
                <button key={f.v}
                  className={`btn btn-sm ${approveFilter === f.v ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setApproveFilter(f.v)}>{f.l}</button>
              ))}
            </div>

            <div className="card">
              <div className="card-body">
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  Pending Approval ({pendingProfiles.length})
                </h3>
                {pendingProfiles.length === 0 ? (
                  <div className="empty-state" style={{ padding: 40 }}>
                    <Icon name="check" size={44} />
                    <p>All profiles reviewed ✓</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {pendingProfiles.map(p => (
                      <div key={p.id} className="card" style={{ border: "1px solid var(--clr-border)", marginBottom: 0, boxShadow: "none" }}>
                        <div style={{ padding: "16px 18px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                            <div className={`avatar avatar-lg avatar-${p.profile_type}`} style={{ flexShrink: 0 }}>
                              {p.photo ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : p.avatar}
                            </div>
                            <div style={{ flex: 1, minWidth: 180 }}>
                              <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                              <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#856404", background: "#FFF3CD", border: "1px solid #FFD166", borderRadius: 4, padding: "1px 6px" }}>⏳ ID will be assigned on approval</span>
                                · <span className={`badge badge-${p.profile_type}`}>{t(p.profile_type)}</span>
                                {p.created_at && (() => {
                                  const days = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);
                                  const hrs = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 3600000);
                                  const label = days > 0 ? `${days}d` : `${hrs}h`;
                                  return (
                                    <span style={{
                                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                                      background: days >= 3 ? "#FFEBEE" : "#FFF8E1",
                                      color: days >= 3 ? "#C62828" : "#E65100",
                                      border: `1px solid ${days >= 3 ? "#FFCDD2" : "#FFE082"}`,
                                    }}>
                                      ⏱ Waiting {label} · {fmtDateTime(p.created_at)}
                                    </span>
                                  );
                                })()}
                              </div>

                              {/* ── Kothiram Verification Block ── */}
                              <div style={{
                                background: "#FFF8F0",
                                border: "1.5px solid var(--clr-saffron)",
                                borderRadius: 8,
                                padding: "10px 14px",
                                marginBottom: 10,
                              }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--clr-saffron)", marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>
                                  🔍 Kothiram Verification (Admin Check Required)
                                </div>
                                <div style={{ display: "grid", gap: 6 }}>
                                  {[
                                    ["Self Kothiram", p.kothiram],
                                    ["Father's Kothiram", p.father_kothiram],
                                    ["Mother's Birth Kothiram", p.mother_kothiram],
                                  ].map(([label, val]) => (
                                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span style={{ fontSize: 12, color: "var(--clr-text-muted)", minWidth: 160 }}>{label}:</span>
                                      <span style={{
                                        fontSize: 13, fontWeight: 700,
                                        padding: "2px 10px", borderRadius: 4,
                                        background: val ? "#FFF0E0" : "#f5f5f5",
                                        color: val ? "var(--clr-saffron)" : "var(--clr-text-muted)",
                                        border: val ? "1px solid #F5CBA7" : "1px solid var(--clr-border)",
                                      }}>
                                        {val || "— Not provided —"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* ── Other Details ── */}
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "4px 16px", fontSize: 13 }}>
                                {[
                                  ["Age", p.dob ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + " yrs" : null],
                                  [t("education"), p.education],
                                  ["Occupation", p.occupation],
                                  ["Native Place", p.native_place],
                                  ["District", p.district],
                                  ["Email", p.email],
                                  ["WhatsApp", p.whatsapp ? formatPhone(p.whatsapp) : null],
                                ].map(([label, val]) => val ? (
                                  <div key={label}>
                                    <span style={{ color: "var(--clr-text-muted)" }}>{label}: </span>
                                    <span style={{ fontWeight: 500 }}>{val}</span>
                                  </div>
                                ) : null)}
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => setViewingProfile(p)}>
                                <Icon name="eye" size={13} /> Full View
                              </button>
                              <button className="btn btn-sm btn-success"
                                disabled={!!actionLoading[p.id]}
                                onClick={() => handleApprove(p.id)}>
                                {actionLoading[p.id] === "approving"
                                  ? "…"
                                  : <><Icon name="check" size={13} /> Approve</>}
                              </button>
                              <button className="btn btn-sm btn-danger"
                                disabled={!!actionLoading[p.id]}
                                onClick={() => handleReject(p.id)}>
                                {actionLoading[p.id] === "rejecting"
                                  ? "…"
                                  : <><Icon name="x" size={13} /> Reject</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── All Users ── */}
        {adminTab === "users" && (
          <div className="card">
            <div className="card-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>
                  {t("allUsers")} ({filteredUsers.length})
                </h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select className="form-input" style={{ maxWidth: 160, margin: 0, fontSize: 13 }}
                    value={usersStatusFilter} onChange={e => setUsersStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="married">Married</option>
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="newMonth">This Month ({currentMonthName})</option>
                  </select>
                  <input className="form-input" style={{ maxWidth: 220, margin: 0 }} type="text"
                    placeholder={t("searchPlaceholder")} value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>{t("profileId")}</th>
                    <th>{t("name")}</th>
                    <th>Type</th>
                    <th>Kothiram</th>
                    <th>{t("district")}</th>
                    <th>Status</th>
                    <th>Status Since / Info</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map(p => {
                      // Determine the "status since" tooltip and display
                      const isActive = (p.profile_status || "active") === "active" && p.approval_status === "approved";
                      const isInactive = p.profile_status === "inactive";
                      const isPending = p.approval_status === "pending";
                      const isRejected = p.approval_status === "rejected";

                      let statusInfo = null;
                      if (isPending) {
                        const waitDays = p.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) : null;
                        statusInfo = (
                          <div>
                            <span style={{ color: "#856404", fontWeight: 600, fontSize: 11 }}>
                              ⏳ Waiting {waitDays != null ? `${waitDays}d` : "—"}
                            </span>
                            <div style={{ fontSize: 10, color: "var(--clr-text-muted)" }}>
                              Since {fmtDateTime(p.created_at)}
                            </div>
                          </div>
                        );
                      } else if (isActive) {
                        statusInfo = (
                          <div>
                            <span style={{ color: "#1B7A3D", fontWeight: 600, fontSize: 11 }}>
                              ✓ Active since {timeAgo(p.approved_at)}
                            </span>
                            <div style={{ fontSize: 10, color: "var(--clr-text-muted)" }}>
                              Approved by Admin · {fmtDateTime(p.approved_at)}
                            </div>
                          </div>
                        );
                      } else if (isInactive) {
                        statusInfo = (
                          <div>
                            <span style={{ color: "#757575", fontWeight: 600, fontSize: 11 }}>
                              ⏸ Inactive {timeAgo(p.updated_at)}
                            </span>
                            <div style={{ fontSize: 10, color: "var(--clr-text-muted)" }}>
                              Since {fmtDateTime(p.updated_at)}
                            </div>
                          </div>
                        );
                      } else if (isRejected) {
                        statusInfo = (
                          <span style={{ color: "var(--clr-danger)", fontSize: 11, fontWeight: 600 }}>
                            ✗ Rejected {timeAgo(p.updated_at)}
                          </span>
                        );
                      }

                      return (
                        <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setViewingProfile(p)}>
                          <td style={{ fontSize: 12 }}><ProfileIdBadge profile_id={p.profile_id} approval_status={p.approval_status} /></td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div className={`avatar avatar-sm avatar-${p.profile_type}`}>
                                {p.photo ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : p.avatar}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                <div style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>
                                  {p.dob ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + " yrs" : ""}
                                  {p.education ? ` · ${p.education}` : ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td><span className={`badge badge-${p.profile_type}`}>{t(p.profile_type)}</span></td>
                          <td style={{ fontSize: 12 }}>{kothiramLabel(p.kothiram)}</td>
                          <td style={{ fontSize: 12 }}>{p.district || "—"}</td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <span className={`badge badge-${p.profile_status || "active"}`}>{t(p.profile_status || "active")}</span>
                              <span className={`badge badge-${p.approval_status}`} style={{ fontSize: 10 }}>{t(p.approval_status)}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, minWidth: 160 }}>{statusInfo}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button className="btn btn-sm btn-secondary" title="View Full Profile"
                                onClick={() => setViewingProfile(p)}><Icon name="eye" size={13} /></button>
                              {p.approval_status === "pending" && (
                                <button className="btn btn-sm btn-success" title={t("approve")}
                                  disabled={!!actionLoading[p.id]}
                                  onClick={() => handleApprove(p.id)}>
                                  {actionLoading[p.id] === "approving" ? "…" : <Icon name="check" size={13} />}
                                </button>
                              )}
                              {p.approval_status === "pending" && (
                                <button className="btn btn-sm btn-danger" title={t("reject")}
                                  disabled={!!actionLoading[p.id]}
                                  onClick={() => handleReject(p.id)}>
                                  {actionLoading[p.id] === "rejecting" ? "…" : <Icon name="x" size={13} />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Married Users ── */}
        {adminTab === "married" && (
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-body">
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  {t("mapPartner")} — Record a Marriage
                </h3>
                {mapSuccess && (
                  <div style={{ background: "#E6F9EE", color: "#1B7A3D", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
                    {mapSuccess}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t("bride")} Profile *</label>
                    <select className="form-input" value={marriageForm.brideId}
                      onChange={e => setMarriageForm(f => ({ ...f, brideId: e.target.value }))}>
                      <option value="">— Select Bride —</option>
                      {state.profiles.filter(p => p.profile_type === "bride" && p.approval_status === "approved" && p.profile_status !== "married").map(p => (
                        <option key={p.id} value={p.id}>{p.profile_id} — {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t("groom")} Profile *</label>
                    <select className="form-input" value={marriageForm.groomId}
                      onChange={e => setMarriageForm(f => ({ ...f, groomId: e.target.value }))}>
                      <option value="">— Select Groom —</option>
                      {state.profiles.filter(p => p.profile_type === "groom" && p.approval_status === "approved" && p.profile_status !== "married").map(p => (
                        <option key={p.id} value={p.id}>{p.profile_id} — {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t("marriedDate")} *</label>
                    <input className="form-input" type="date" value={marriageForm.marriedDate}
                      onChange={e => setMarriageForm(f => ({ ...f, marriedDate: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t("marriageType")}</label>
                    <select className="form-input" value={marriageForm.marriageType}
                      onChange={e => setMarriageForm(f => ({ ...f, marriageType: e.target.value }))}>
                      <option value="arranged">{t("arranged")}</option>
                      <option value="love">{t("love")}</option>
                      <option value="matrimony">{t("matrimonyMatch")}</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 16 }}
                  disabled={!marriageForm.brideId || !marriageForm.groomId || !marriageForm.marriedDate}
                  onClick={handleMapMarriage}>
                  <Icon name="link" size={14} /> {t("mapPartner")}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  Married Couples ({state.marriages.length})
                </h3>
                {state.marriages.length === 0 ? (
                  <div className="empty-state" style={{ padding: 32 }}>
                    <Icon name="award" size={40} />
                    <p>No marriages mapped yet</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr>
                        <th>Bride</th>
                        <th>Groom</th>
                        <th>Married Date</th>
                        <th>Type</th>
                      </tr></thead>
                      <tbody>
                        {state.marriages.map(m => {
                          const bride = state.profiles.find(p => p.id === m.brideId);
                          const groom = state.profiles.find(p => p.id === m.groomId);
                          return (
                            <tr key={m.id}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div className="avatar avatar-sm avatar-bride">{bride?.avatar || "?"}</div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{bride?.name || "—"}</div>

                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{bride?.name || "—"}</div>

                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{bride?.name || "—"}</div>
                                    <div style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>{bride?.profile_id}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div className="avatar avatar-sm avatar-groom">{groom?.avatar || "?"}</div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{groom?.name || "—"}</div>
                                    <div style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>{groom?.profile_id}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: 13 }}>
                                {m.marriedDate
                                  ? new Date(m.marriedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                  : "—"}
                              </td>
                              <td><span className="badge badge-approved">{m.marriageType}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Admins List ── */}
        {adminTab === "admins" && (
          <div>
            {/* ── Pending Admin Approvals ── */}
            {isSuperAdmin && pendingAdmins.length > 0 && (
              <div className="card" style={{ marginBottom: 20, border: "1.5px solid #F57F17" }}>
                <div className="card-body">
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 14, color: "#E65100" }}>
                    ⏳ Pending Admin Approvals ({pendingAdmins.length})
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pendingAdmins.map(a => (
                      <div key={a.id} style={{
                        display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px",
                        background: "#FFF8E1", borderRadius: 10, border: "1px solid #FFE082", flexWrap: "wrap"
                      }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#FFD54F,#F57F17)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}>
                          <Icon name="shield" size={18} style={{ color: "white" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                          <div style={{ fontSize: 12, color: "var(--clr-text-muted)", marginTop: 2 }}>{a.email}</div>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6, fontSize: 12 }}>
                            {a.mobile && <span>📱 {formatPhone(a.mobile)}</span>}
                            {a.whatsapp && (
                              <a href={waLink(a.whatsapp)} target="_blank" rel="noopener noreferrer"
                                style={{ color: "#16a34a", textDecoration: "none" }}>
                                💬 {formatPhone(a.whatsapp)}
                              </a>
                            )}
                            {a.native_place && <span>📍 {a.native_place}</span>}
                            {a.kothiram && <span>🏛 {a.kothiram}</span>}
                          </div>
                          {a.has_profile && (
                            <div style={{
                              marginTop: 6, fontSize: 11, color: "#1a3a5c", background: "#E3F0F8",
                              padding: "3px 10px", borderRadius: 6, display: "inline-block"
                            }}>
                              Has bride/groom profile
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginTop: 4 }}>
                            Registered: {a.created_at ? new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button className="btn btn-sm btn-success"
                            disabled={!!adminActionLoading[a.id]}
                            onClick={() => handleAdminApproval(a.id, "approve")}>
                            {adminActionLoading[a.id] === "approve" ? "…" : <><Icon name="check" size={13} /> Approve</>}
                          </button>
                          <button className="btn btn-sm btn-danger"
                            disabled={!!adminActionLoading[a.id]}
                            onClick={() => handleAdminApproval(a.id, "reject")}>
                            {adminActionLoading[a.id] === "reject" ? "…" : <><Icon name="x" size={13} /> Reject</>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Active Admins ── */}
            <div className="card">
              <div className="card-body">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>
                    Active Admins ({adminsList.length})
                  </h3>
                  <button className="btn btn-sm btn-secondary" onClick={loadAdmins} disabled={adminsLoading}>
                    <Icon name="activity" size={13} /> Refresh
                  </button>
                </div>
                {adminsLoading ? (
                  <div style={{ textAlign: "center", padding: 32, color: "var(--clr-text-muted)" }}>Loading…</div>
                ) : adminsList.length === 0 ? (
                  <div className="empty-state" style={{ padding: 32 }}>
                    <Icon name="shield" size={40} />
                    <p>No active admin accounts</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr>
                        <th>Admin</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Kothiram / Native</th>
                        <th>Profile</th>
                        <th>Joined</th>
                        {isSuperAdmin && <th>Actions</th>}
                      </tr></thead>
                      <tbody>
                        {adminsList.map(u => {
                          const profile = (u["profiles\!profiles_user_id_fkey"] || u.profiles || [])[0] || null;
                          const ad = (u["admin_details\!admin_details_user_id_fkey"] || u.admin_details || null);
                          return (
                            <tr key={u.id}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{
                                    width: 34, height: 34, borderRadius: "50%",
                                    background: u.role === "super_admin" ? "linear-gradient(135deg,var(--clr-maroon),#C62828)" : "linear-gradient(135deg,var(--clr-saffron),var(--clr-maroon))",
                                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                                  }}>
                                    <Icon name="shield" size={16} style={{ color: "white" }} />
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name || "Admin"}</div>
                                    <span style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: u.role === "super_admin" ? "var(--clr-maroon)" : "var(--clr-saffron)",
                                      background: u.role === "super_admin" ? "#FFE8ED" : "#FFF5F0",
                                      padding: "1px 6px",
                                      borderRadius: 4
                                    }}>
                                      {u.role === "super_admin" ? "SUPER ADMIN" : "ADMIN"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: 12 }}>{u.email}</td>
                              <td style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>
                                {ad?.mobile ? formatPhone(ad.mobile) : ad?.whatsapp ? formatPhone(ad.whatsapp) : "—"}
                              </td>
                              <td style={{ fontSize: 12 }}>
                                <div>{ad?.kothiram || "—"}</div>
                                <div style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>{ad?.native_place || ""}</div>
                              </td>
                              <td>
                                {profile ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span className={"badge badge-" + profile.profile_type}>{profile.profile_type}</span>
                                    <span style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>{profile.profile_id || "Pending"}</span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 12, color: "var(--clr-text-muted)" }}>No profile</span>
                                )}
                              </td>
                              <td style={{ fontSize: 12, color: "var(--clr-text-muted)", whiteSpace: "nowrap" }}>
                                {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </td>
                              {isSuperAdmin && (
                                <td>
                                  {u.id !== state.user?.id ? (
                                    <button className="btn btn-sm btn-danger" title="Delete Admin Account"
                                      onClick={() => handleDeleteAdmin(u.id, u.name)}>
                                      <Icon name="trash" size={13} /> Delete
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: 11, color: "var(--clr-text-muted)", fontStyle: "italic" }}>Current User</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {adminTab === "photos" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 }}>
                📷 Photos & Jathagam Approval
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={loadPendingPhotos} disabled={photosLoading}>
                <Icon name="activity" size={13} /> {photosLoading ? "Loading…" : "Refresh"}
              </button>
            </div>

            {pendingPhotos.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <Icon name="check" size={44} />
                <p>All photos reviewed ✓</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {pendingPhotos.map(ph => (
                  <div key={ph.id} className="card" style={{ overflow: "hidden" }}>
                    {ph.photo_type === "horoscope" ? (
                      <div style={{
                        height: 180, background: "var(--clr-surface-alt)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexDirection: "column", gap: 10,
                      }}>
                        <span style={{ fontSize: 52 }}>📄</span>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--clr-text-muted)" }}>Jathagam / Horoscope</div>
                        <a href={ph.photo_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">
                          <Icon name="eye" size={13} /> Open File
                        </a>
                      </div>
                    ) : (
                      <div style={{ position: "relative", overflow: "hidden" }}>
                        <img
                          src={ph.photo_url}
                          alt=""
                          onClick={() => setLightboxPhoto({
                            url: ph.photo_url,
                            name: ph.profiles?.name || "Unknown",
                            profileId: ph.profiles?.profile_id,
                            photoType: ph.photo_type,
                          })}
                          style={{
                            width: "100%", height: 200, objectFit: "cover",
                            display: "block", cursor: "zoom-in",
                            transition: "transform 0.25s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        />
                        {/* Fullscreen hint badge */}
                        <div
                          onClick={() => setLightboxPhoto({
                            url: ph.photo_url,
                            name: ph.profiles?.name || "Unknown",
                            profileId: ph.profiles?.profile_id,
                            photoType: ph.photo_type,
                          })}
                          style={{
                            position: "absolute", bottom: 8, right: 8,
                            background: "rgba(0,0,0,0.55)", borderRadius: 6,
                            padding: "4px 10px", fontSize: 11, fontWeight: 600,
                            color: "white", cursor: "zoom-in",
                            display: "flex", alignItems: "center", gap: 5,
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          <Icon name="eye" size={11} style={{ color: "white" }} /> Full View
                        </div>
                      </div>
                    )}
                    <div style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div className={`avatar avatar-sm avatar-${ph.profiles?.profile_type || "bride"}`} style={{ flexShrink: 0, fontWeight: 700 }}>
                          {ph.profiles?.name?.[0] || "?"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{ph.profiles?.name}</div>
                          <div style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>
                            {ph.profiles?.profile_id} · {ph.photo_type === "horoscope" ? "🔯 Jathagam" : "📷 Gallery Photo"}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {/* {ph.photo_type !== "horoscope" && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ flexShrink: 0 }}
                            onClick={() => setLightboxPhoto({
                              url: ph.photo_url,
                              name: ph.profiles?.name || "Unknown",
                              profileId: ph.profiles?.profile_id,
                              photoType: ph.photo_type,
                            })}
                          >
                            <Icon name="eye" size={13} /> Full View
                          </button>
                        )} */}
                        <button className="btn btn-sm btn-success" style={{ flex: 1 }}
                          onClick={() => handlePhotoAction(ph.id, "approve")}>
                          <Icon name="check" size={13} /> Approve
                        </button>
                        <button className="btn btn-sm btn-danger" style={{ flex: 1 }}
                          onClick={() => handlePhotoAction(ph.id, "reject")}>
                          <Icon name="x" size={13} /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Reports ── */}
        {adminTab === "reports" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>

            {/* Gender distribution */}
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", padding: 28 }}>
                <Icon name="pieChart" size={36} style={{ color: "var(--clr-saffron)", marginBottom: 10 }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Gender Distribution</h3>
                <div style={{ display: "flex", justifyContent: "center", gap: 32 }}>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--clr-maroon)" }}>
                      {state.profiles.filter(p => p.profile_type === "bride").length}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>Brides</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--font-display)", color: "#1a3a5c" }}>
                      {state.profiles.filter(p => p.profile_type === "groom").length}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>Grooms</div>
                  </div>
                </div>
                <div style={{ marginTop: 16, height: 12, borderRadius: 6, overflow: "hidden", display: "flex" }}>
                  <div style={{ flex: state.profiles.filter(p => p.profile_type === "bride").length || 1, background: "var(--clr-maroon)" }} />
                  <div style={{ flex: state.profiles.filter(p => p.profile_type === "groom").length || 1, background: "#1a3a5c" }} />
                </div>
              </div>
            </div>

            {/* Status breakdown */}
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", padding: 28 }}>
                <Icon name="activity" size={36} style={{ color: "#1B7A3D", marginBottom: 10 }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Profile Status Breakdown</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: t("active"), value: stats.active, color: "#1B7A3D", bg: "#E6F9EE" },
                    { label: t("inactive"), value: stats.inactive, color: "#757575", bg: "#F5F5F5" },
                    { label: "Pending", value: stats.pending, color: "#E65100", bg: "#FFF3E0" },
                    { label: t("married"), value: stats.married, color: "#6B21A8", bg: "#F3E8FF" },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: "12px 8px" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Success metrics */}
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", padding: 28 }}>
                <Icon name="trendingUp" size={36} style={{ color: "var(--clr-success)", marginBottom: 10 }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Success Metrics</h3>
                <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--clr-success)" }}>
                  {state.marriages.length}
                </div>
                <div style={{ fontSize: 13, color: "var(--clr-text-muted)", marginBottom: 16 }}>Successful Marriages</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { v: state.profiles.filter(p => p.approval_status === "approved").length, l: t("approved") },
                    { v: state.profiles.filter(p => p.approval_status === "pending").length, l: "Pending" },
                    { v: stats.newReg, l: String(t("newRegistrations")) + " (" + currentMonthName + ")" },
                    { v: stats.total, l: "Total" },
                  ].map(s => (
                    <div key={s.l} style={{ background: "var(--clr-surface-alt)", borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)" }}>{s.v}</div>
                      <div style={{ fontSize: 11, color: "var(--clr-text-muted)" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* District distribution */}
            <div className="card">
              <div className="card-body" style={{ padding: 28 }}>
                <Icon name="barChart" size={36} style={{ color: "var(--clr-olive)", marginBottom: 10, display: "block" }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>District Distribution</h3>
                {(() => {
                  const districts = [...new Set(state.profiles.map(p => p.district).filter(Boolean))];
                  if (districts.length === 0) return <div style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>No data yet</div>;
                  return districts.slice(0, 8).map(d => {
                    const count = state.profiles.filter(p => p.district === d).length;
                    const pct = Math.round((count / state.profiles.length) * 100);
                    return (
                      <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 90, fontSize: 12, textAlign: "right", color: "var(--clr-text-muted)" }}>{d}</div>
                        <div style={{ flex: 1, height: 18, background: "var(--clr-surface-alt)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${pct || 5}%`, height: "100%", background: "linear-gradient(90deg,var(--clr-saffron),var(--clr-gold))", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "white" }}>{count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Education distribution */}
            <div className="card">
              <div className="card-body" style={{ padding: 28 }}>
                <Icon name="award" size={36} style={{ color: "var(--clr-gold)", marginBottom: 10, display: "block" }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Education Distribution</h3>
                {(() => {
                  const edus = [...new Set(state.profiles.map(p => p.education).filter(Boolean))];
                  if (edus.length === 0) return <div style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>No data yet</div>;
                  return edus.slice(0, 8).map(edu => {
                    const count = state.profiles.filter(p => p.education === edu).length;
                    return (
                      <div key={edu} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
                        <span style={{ color: "var(--clr-text-muted)" }}>{edu}</span>
                        <span style={{ fontWeight: 600, background: "var(--clr-surface-alt)", padding: "1px 8px", borderRadius: 8 }}>{count}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Pending wait analysis */}
            <div className="card">
              <div className="card-body" style={{ padding: 28 }}>
                <Icon name="eye" size={36} style={{ color: "#F57F17", marginBottom: 10, display: "block" }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Pending Wait Analysis</h3>
                {(() => {
                  const pending = state.profiles.filter(p => p.approval_status === "pending" && p.created_at);
                  if (pending.length === 0) return <div style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>No pending profiles</div>;
                  const buckets = [
                    { label: t("todayLabel"), color: "#1B7A3D", count: pending.filter(p => Math.floor((Date.now() - new Date(p.created_at)) / 86400000) < 1).length },
                    { label: "1-3 days", color: "#E65100", count: pending.filter(p => { const d = Math.floor((Date.now() - new Date(p.created_at)) / 86400000); return d >= 1 && d < 3; }).length },
                    { label: "3-7 days", color: "#C62828", count: pending.filter(p => { const d = Math.floor((Date.now() - new Date(p.created_at)) / 86400000); return d >= 3 && d < 7; }).length },
                    { label: "7+ days", color: "#6A1B9A", count: pending.filter(p => Math.floor((Date.now() - new Date(p.created_at)) / 86400000) >= 7).length },
                  ];
                  return buckets.map(b => (
                    <div key={b.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: "var(--clr-text-muted)" }}>{b.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: Math.max(b.count * 20, 4), height: 8, borderRadius: 4, background: b.color }} />
                        <span style={{ fontWeight: 700, fontSize: 13, color: b.color, minWidth: 20 }}>{b.count}</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
