import { useReducer, useCallback, useEffect, useRef, useState } from "react";
import { TRANSLATIONS } from "./i18n/translations.js";
import { appReducer, initialState } from "./state/appReducer.js";
import { fetchInitialData, apiGetMe, apiAdminGetAllProfiles, apiLogout } from "./api/client.js";
import { GlobalStyles } from "./styles/GlobalStyles.jsx";
import { Header } from "./components/layout/Header.jsx";
import { Sidebar } from "./components/layout/Sidebar.jsx";
import { BottomNav } from "./components/layout/BottomNav.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { SearchPage } from "./pages/SearchPage.jsx";
import { ViewProfilePage } from "./pages/ViewProfilePage.jsx";
import { MatchesPage } from "./pages/MatchesPage.jsx";
import { InterestsPage } from "./pages/InterestsPage.jsx";
import { ShortlistPage } from "./pages/ShortlistPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { AdminPanel } from "./pages/AdminPanel.jsx";
import { AdminRegisterPage }  from "./pages/AdminRegisterPage.jsx";
import { ResetPasswordPage }  from "./pages/ResetPasswordPage.jsx";
import { HappyStoryPage } from "./pages/HappyStoryPage.jsx";
import { Footer } from "./components/layout/Footer.jsx";
import { AdminDetailsPage } from "./pages/AdminDetailsPage.jsx";


// Check URL query params for special pages
// Invite link format: http://localhost:5173/admin?token=xxx
// Reset link format:  http://localhost:5173?page=reset-password#access_token=...
const urlParams     = new URLSearchParams(window.location.search);
const INVITE_TOKEN  = urlParams.get("token");
const IS_ADMIN_REGISTER = (
  (window.location.pathname === "/admin" && !!INVITE_TOKEN) ||
  (urlParams.get("page") === "admin-register" && !!INVITE_TOKEN)  // backwards compat
);
const IS_RESET_PASSWORD = urlParams.get("page") === "reset-password";

const INACTIVITY_MS = 15 * 60 * 1000; // 15 minutes

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [loadError, setLoadError]   = useState(null);
  const [checking, setChecking]     = useState(false);
  const pollRef        = useRef(null);
  const inactivityRef  = useRef(null);

  // ── Shared logout (calls backend + clears state) ──────────────────────────
  const handleLogout = useCallback(async () => {
    try { await apiLogout(); } catch {}
    dispatch({ type: "LOGOUT" });
  }, [dispatch]);

  // ── Inactivity auto-logout after 5 minutes ────────────────────────────────
  useEffect(() => {
    if (!state.user) return; // only track when logged in

    const resetTimer = () => {
      clearTimeout(inactivityRef.current);
      inactivityRef.current = setTimeout(handleLogout, INACTIVITY_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start the initial timer

    return () => {
      clearTimeout(inactivityRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [state.user, handleLogout]);

  // ── Scroll to top on page navigation ─────────────────────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [state.page]);

  useEffect(() => {
    let cancelled = false;

    // Run both fetches in parallel: public profiles + session restore
    Promise.all([
      fetchInitialData(),
      apiGetMe(),
    ]).then(([{ profiles, notifications }, meData]) => {
      if (cancelled) return;
      dispatch({ type: "SET_DATA", payload: { profiles, notifications } });
      // Restore Supabase session if cookie is still valid
      if (meData?.user) {
        dispatch({ type: "RESTORE_SESSION", payload: meData });
      }
    }).catch((err) => {
      if (!cancelled) setLoadError(err.message ?? "Load failed");
    });

    return () => { cancelled = true; };
  }, []);

  // ── When admin logs in, load ALL profiles once (pending, rejected, inactive…) ──
  const adminProfilesLoadedRef = useRef(false);
  useEffect(() => {
    if (!state.isAdmin) {
      adminProfilesLoadedRef.current = false; // reset on logout
      return;
    }
    if (adminProfilesLoadedRef.current) return; // already loaded this session
    adminProfilesLoadedRef.current = true;

    let cancelled = false;
    apiAdminGetAllProfiles({ limit: 200 }).then(profiles => {
      if (cancelled || !profiles?.length) return;
      const normalised = profiles.map(p => ({
        ...p,
        avatar: p.avatar || p.name?.slice(0, 2).toUpperCase() || "??",
        photo:  p.photo  || p.photo_url || null,
      }));
      dispatch({ type: "SET_DATA", payload: { profiles: normalised } });
    }).catch(() => {
      adminProfilesLoadedRef.current = false; // allow retry on error
    });
    return () => { cancelled = true; };
  }, [state.isAdmin]);

  // ── Poll /api/auth/me every 30 s while user is on the pending-approval screen ──
  useEffect(() => {
    const myProfile = state.user
      ? state.profiles.find(p => p.id === state.user.profileId)
      : null;
    const stillPending =
      state.user && !state.isAdmin && myProfile?.approval_status !== "approved";

    if (stillPending) {
      pollRef.current = setInterval(async () => {
        try {
          const meData = await apiGetMe();
          if (meData?.success && meData.user) {
            dispatch({ type: "RESTORE_SESSION", payload: meData });
          }
        } catch { /* ignore transient errors */ }
      }, 30_000);
    } else {
      clearInterval(pollRef.current);
    }

    return () => clearInterval(pollRef.current);
  }, [state.user, state.isAdmin, state.profiles]);

  // ── Manual "Check Status" handler ────────────────────────────────────────
  const handleCheckStatus = useCallback(async () => {
    setChecking(true);
    try {
      const meData = await apiGetMe();
      if (meData?.success && meData.user) {
        dispatch({ type: "RESTORE_SESSION", payload: meData });
      }
    } catch { /* ignore */ }
    finally { setChecking(false); }
  }, []);

  const t = useCallback(
    (key) => TRANSLATIONS[state.lang]?.[key] || TRANSLATIONS.en[key] || key,
    [state.lang]
  );

  // ── Approval gate ─────────────────────────────────────────────────────────
  const myProfile = state.user
    ? state.profiles.find(p => p.id === state.user.profileId)
    : null;
  const isApproved = myProfile?.approval_status === "approved";
  // Non-admin users who have a profile but it's not yet approved → gate them
  const needsApproval = state.user && !state.isAdmin && state.user.profileId && !isApproved;

  const showSidebar =
    state.user && !["login", "register"].includes(state.page) && !needsApproval;

  // Pending approval screen
  const PendingApprovalPage = () => (
    <div className="pending-container">
      <div className="card" style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div className="pending-card-inner">
          <div style={{
            width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px",
            background: "linear-gradient(135deg,#FFFDE7,#FFE082)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(255,193,7,0.25)",
          }}>
            <span style={{ fontSize: 36 }}>⏳</span>
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
            Awaiting Admin Approval
          </h2>
          <p style={{ fontSize: 14, color: "var(--clr-text-muted)", lineHeight: 1.7, marginBottom: 24 }}>
            Thank you for registering with <strong>AVS Matrimony</strong>!
            Your profile has been submitted and is currently under review by our admin team.
          </p>
          <div className="pending-info-box">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--clr-saffron)" }}>What happens next?</div>
            {[
              "Our team reviews your profile details",
              "Verification is usually completed within 24 hours",
              "You'll get access to all features once approved",
              "Contact us if you need faster review",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, fontSize: 13, color: "var(--clr-text-body)" }}>
                <span style={{ color: "var(--clr-success)", fontWeight: 700, marginTop: 1 }}>✓</span>
                {item}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: "var(--clr-text-muted)", marginBottom: 20 }}>
            Registered as: <strong style={{ color: "var(--clr-text-body)" }}>{state.user?.name}</strong>
            <br />Profile ID: {
              (state.user?.profile_id || myProfile?.profile_id)
                ? <strong style={{ color: "var(--clr-saffron)" }}>{state.user?.profile_id || myProfile?.profile_id}</strong>
                : <strong style={{ fontSize: 11, color: "#856404" }}>⏳ Pending Approval</strong>
            }
          </div>
          <div className="pending-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCheckStatus}
              disabled={checking}
              style={{ minWidth: 130 }}
            >
              {checking ? "Checking…" : "🔄 Check Status"}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "var(--clr-text-muted)" }}>
            Auto-checks every 30 seconds
          </div>
        </div>
      </div>
    </div>
  );

  const renderPage = () => {
    // Password reset — Supabase email link lands here with #access_token hash
    if (IS_RESET_PASSWORD || state.page === "reset-password") {
      return <ResetPasswordPage dispatch={dispatch} t={t} />;
    }
    // Admin register via invite link
    if (IS_ADMIN_REGISTER || state.page === "admin-register") {
      return <AdminRegisterPage token={INVITE_TOKEN || urlParams.get("token")} dispatch={dispatch} t={t} />;
    }
    // Non-logged-in pages always visible
    if (state.page === "login")    return <LoginPage    state={state} dispatch={dispatch} t={t} />;
    if (state.page === "register") return <RegisterPage state={state} dispatch={dispatch} t={t} />;

    // Approval gate: logged-in but not approved (non-admin)
    if (needsApproval) return <PendingApprovalPage />;

    switch (state.page) {
      case "search":      return <SearchPage      state={state} dispatch={dispatch} t={t} />;
      case "viewProfile": return <ViewProfilePage state={state} dispatch={dispatch} t={t} />;
      case "matches":     return <MatchesPage     state={state} dispatch={dispatch} t={t} />;
      case "interests":   return <InterestsPage   state={state} dispatch={dispatch} t={t} />;
      case "shortlist":   return <ShortlistPage   state={state} dispatch={dispatch} t={t} />;
      case "profile":     return <ProfilePage     state={state} dispatch={dispatch} t={t} />;
      case "admin":       return <AdminPanel      state={state} dispatch={dispatch} t={t} />;
      case "happyStory":  return <HappyStoryPage  state={state} dispatch={dispatch} t={t} />;
      case "adminDetails":return <AdminDetailsPage state={state} dispatch={dispatch} t={t} />;
      default:            return <HomePage        state={state} dispatch={dispatch} t={t} />;
    }
  };

  return (
    <div className={`avs-root ${state.theme === "dark" ? "dark-theme" : ""}`}>
      <GlobalStyles />
      {loadError && (
        <div
          style={{
            background: "#fff3cd",
            color: "#856404",
            padding: "10px 16px",
            textAlign: "center",
            fontSize: 13,
            borderBottom: "1px solid #ffc107",
          }}
        >
          {loadError} — Run the Next.js backend (<code style={{ fontSize: 12 }}>npm run dev --prefix backend</code>, port 3000) or set VITE_API_URL.
        </div>
      )}
      <Header
        state={state}
        dispatch={dispatch}
        t={t}
        onLogout={handleLogout}
        showSidebar={showSidebar}
        needsApproval={needsApproval}
      />

      <div style={{ display: "flex" }}>
        {/* Desktop layout spacer — keeps main content from going under the fixed sidebar */}
        {showSidebar && state.sidebarOpen && (
          <div className="hide-mobile" style={{ width: 220, flexShrink: 0 }} />
        )}

        <main style={{ flex: 1, minHeight: "calc(100vh - 68px)", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1 }}>
            {renderPage()}
          </div>
          <Footer state={state} t={t} dispatch={dispatch} />
        </main>
      </div>

      {/* Sidebar rendered outside hide-mobile so it mounts on mobile too (hamburger toggle) */}
      {showSidebar && <Sidebar state={state} dispatch={dispatch} t={t} onLogout={handleLogout} />}

      <BottomNav state={state} dispatch={dispatch} t={t} />


    </div>
  );
}
