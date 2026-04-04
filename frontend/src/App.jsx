import { useReducer, useCallback, useEffect, useState } from "react";
import { TRANSLATIONS } from "./i18n/translations.js";
import { appReducer, initialState } from "./state/appReducer.js";
import { fetchInitialData } from "./api/client.js";
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

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchInitialData()
      .then(({ profiles, notifications }) => {
        if (!cancelled) {
          dispatch({ type: "SET_DATA", payload: { profiles, notifications } });
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message ?? "Load failed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const t = useCallback(
    (key) => TRANSLATIONS[state.lang]?.[key] || TRANSLATIONS.en[key] || key,
    [state.lang]
  );

  const showSidebar =
    state.user && !["login", "register"].includes(state.page);

  const renderPage = () => {
    switch (state.page) {
      case "login":
        return <LoginPage state={state} dispatch={dispatch} t={t} />;
      case "register":
        return <RegisterPage state={state} dispatch={dispatch} t={t} />;
      case "search":
        return <SearchPage state={state} dispatch={dispatch} t={t} />;
      case "viewProfile":
        return <ViewProfilePage state={state} dispatch={dispatch} t={t} />;
      case "matches":
        return <MatchesPage state={state} dispatch={dispatch} t={t} />;
      case "interests":
        return <InterestsPage state={state} dispatch={dispatch} t={t} />;
      case "shortlist":
        return <ShortlistPage state={state} dispatch={dispatch} t={t} />;
      case "profile":
        return <ProfilePage state={state} dispatch={dispatch} t={t} />;
      case "admin":
        return <AdminPanel state={state} dispatch={dispatch} t={t} />;
      default:
        return <HomePage state={state} dispatch={dispatch} t={t} />;
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
      <Header state={state} dispatch={dispatch} t={t} />

      <div style={{ display: "flex" }}>
        {showSidebar && (
          <div className="hide-mobile" style={{ width: 220, flexShrink: 0 }}>
            <Sidebar state={state} dispatch={dispatch} t={t} />
          </div>
        )}
        {showSidebar && <Sidebar state={state} dispatch={dispatch} t={t} />}

        <main style={{ flex: 1, minHeight: "calc(100vh - 68px)", minWidth: 0 }}>
          {renderPage()}
        </main>
      </div>

      <BottomNav state={state} dispatch={dispatch} t={t} />

      {state.page === "home" && !state.user && (
        <footer
          style={{
            background: "var(--clr-maroon-dark)",
            color: "rgba(255,255,255,0.7)",
            padding: "32px 0",
            textAlign: "center",
            fontSize: 13,
          }}
        >
          <div className="page-container">
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 700,
                color: "white",
                marginBottom: 8,
              }}
            >
              {t("appName")}
            </div>
            <div style={{ marginBottom: 4 }}>{t("tagline")}</div>
            <div style={{ marginTop: 16, fontSize: 11, opacity: 0.6 }}>
              © 2026 AVS Matrimony. All rights reserved.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
