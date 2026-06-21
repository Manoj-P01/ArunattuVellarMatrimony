import { useState, useEffect } from "react";
import { Icon } from "../components/Icon.jsx";
import { ProfileCard } from "../components/ProfileCard.jsx";

const apiBase = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");

export function HomePage({ state, dispatch, t }) {
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    let active = true;
    fetch(`${apiBase}/api/testimonials`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.testimonials) {
          setTestimonials(data.testimonials);
        }
      })
      .catch((err) => console.error("Error loading testimonials:", err));
    return () => {
      active = false;
    };
  }, []);

  const myProfileType = state.user?.profile_type;
  const oppositeGender = myProfileType === "bride" ? "groom" : myProfileType === "groom" ? "bride" : "";

  let featuredProfiles = state.profiles.filter(p =>
    p.approval_status === "approved" &&
    (p.profile_status || "active") === "active" &&
    !(state.user?.profileId && p.id === state.user.profileId)
  );

  if (state.user) {
    if (myProfileType === "bride") {
      featuredProfiles = featuredProfiles.filter(p => p.profile_type === "groom");
    } else if (myProfileType === "groom") {
      featuredProfiles = featuredProfiles.filter(p => p.profile_type === "bride");
    }
    // Recently added: sort by created_at descending
    featuredProfiles = [...featuredProfiles].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  return (
    <div className="animate-in">
      {/* Hero */}
      <section style={{
        padding: "48px 0 40px",
        background: "linear-gradient(180deg, var(--clr-cream) 0%, var(--clr-bg) 100%)",
        textAlign: "center",
      }}>
        <div className="page-container">
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: "var(--clr-gold-light)",
            padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "var(--clr-maroon-dark)",
            marginBottom: 20,
          }}>
            <Icon name="award" size={14} />
            Arunattu Vellalar Community
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 700, lineHeight: 1.2, maxWidth: 600, margin: "0 auto 16px",
          }}>
            <span className="text-gradient">{t("welcomeMsg")}</span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--clr-text-muted)", maxWidth: 480, margin: "0 auto 28px" }}>
            {t("tagline")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {!state.user ? (
              <>
                <button className="btn btn-lg btn-primary" onClick={() => dispatch({ type: "SET_PAGE", payload: "register" })}>
                  {t("register")} <Icon name="chevronRight" size={18} />
                </button>
                <button className="btn btn-lg btn-secondary" onClick={() => dispatch({ type: "SET_PAGE", payload: "login" })}>
                  {t("login")}
                </button>
              </>
            ) : (
              <button className="btn btn-lg btn-primary" onClick={() => dispatch({ type: "SET_PAGE", payload: "search" })}>
                {t("searchProfiles")} <Icon name="search" size={18} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: "48px 0" }}>
        <div className="page-container">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, textAlign: "center", marginBottom: 32 }}>
            {t("howItWorks")}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {[
              { icon: "user", title: t("step1Title"), desc: t("step1Desc"), color: "#E3F0F8" },
              { icon: "edit", title: t("step2Title"), desc: t("step2Desc"), color: "#FFE8ED" },
              { icon: "heart", title: t("step3Title"), desc: t("step3Desc"), color: "#E6F9EE" },
              { icon: "link", title: t("step4Title"), desc: t("step4Desc"), color: "#F3E8FF" },
            ].map((step, i) => (
              <div key={i} className="card" style={{ textAlign: "center", padding: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: step.color,
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
                }}>
                  <Icon name={step.icon} size={24} />
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--clr-text-muted)", lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Profiles */}
      <section style={{ padding: "0 0 48px" }}>
        <div className="page-container">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
            {t("featuredProfiles")}
          </h2>
          {featuredProfiles.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--clr-text-muted)", fontSize: 14 }}>
              No matches found currently.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {featuredProfiles.slice(0, 4).map(p => (
                <ProfileCard key={p.id} profile={p} state={state} dispatch={dispatch} t={t} />
              ))}
            </div>
          )}

          {state.user && (
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  dispatch({ type: "RESET_FILTERS" });
                  if (oppositeGender) {
                    dispatch({ type: "UPDATE_FILTERS", payload: { type: oppositeGender } });
                  }
                  dispatch({ type: "SET_PAGE", payload: "search" });
                }}
                style={{
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 30,
                  boxShadow: "var(--shadow-sm)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer"
                }}
              >
                <Icon name="search" size={16} /> Show More Profiles
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials / Success Stories */}
      {testimonials.length > 0 && (
        <section style={{
          padding: "48px 0",
          background: "linear-gradient(180deg, var(--clr-bg) 0%, var(--clr-cream) 100%)",
          borderTop: "1px solid var(--clr-border)",
        }}>
          <div className="page-container">
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700,
              textAlign: "center", color: "var(--clr-maroon)", marginBottom: 12
            }}>
              🎉 {t("testimonials")}
            </h2>
            <p style={{
              textAlign: "center", color: "var(--clr-text-muted)",
              fontSize: 14, maxWidth: 500, margin: "0 auto 36px"
            }}>
              Read inspiring stories from our members who found their perfect match and shared their journey.
            </p>

            {(() => {
              const shouldAnimate = testimonials.length > 3;

              if (!shouldAnimate) {
                return (
                  <div style={{
                    display: "flex",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    gap: "20px",
                    padding: "12px 0"
                  }}>
                    {testimonials.map((test) => (
                      <div key={test.id} className="card animate-in" style={{
                        width: "320px", padding: 24, position: "relative", display: "flex", flexDirection: "column",
                        justifyContent: "space-between", borderLeft: "4px solid var(--clr-saffron)",
                        boxShadow: "var(--shadow-sm)", background: "var(--clr-white)",
                        cursor: "default", margin: 0
                      }}>
                        <div>
                          <div style={{
                            color: "rgba(229, 109, 37, 0.15)", fontSize: 48, fontFamily: "serif",
                            position: "absolute", top: 10, right: 20, lineHeight: 1, pointerEvents: "none"
                          }}>
                            ”
                          </div>
                          <p style={{
                            fontSize: 14, fontStyle: "italic", color: "var(--clr-text-body)",
                            lineHeight: 1.6, marginBottom: 20, position: "relative", zIndex: 1
                          }}>
                            "{test.marriage_feedback}"
                          </p>
                          {test.marriage_photo && (
                            <div style={{
                              width: "100%",
                              height: 180,
                              overflow: "hidden",
                              borderRadius: 6,
                              marginBottom: 20,
                              border: "1px solid var(--clr-border)"
                            }}>
                              <img 
                                src={test.marriage_photo} 
                                alt={`${test.name}'s marriage`} 
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover"
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div style={{
                          display: "flex", alignItems: "center", gap: 12,
                          borderTop: "1px solid var(--clr-border)", paddingTop: 16
                        }}>
                          <div className={`avatar avatar-sm avatar-${test.profile_type}`} style={{ fontWeight: 700, flexShrink: 0 }}>
                            {test.avatar || test.name?.[0] || "?"}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--clr-text-title)" }}>
                              {test.name}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginTop: 2 }}>
                              Married: {new Date(test.marriage_date).toLocaleDateString(state.lang === "ta" ? "ta-IN" : "en-US", {
                                year: "numeric", month: "short", day: "numeric"
                              })}
                            </div>
                            {test.partner_profile_id && (
                              <div style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                background: "linear-gradient(135deg, #FFF0F2, #FFE4E6)",
                                color: "#E11D48", fontSize: 9, fontWeight: 700,
                                padding: "1px 6px", borderRadius: 4, marginTop: 4
                              }}>
                                💑 Matched via AVS
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              let list = testimonials;
              if (testimonials.length > 0) {
                while (list.length < 6) {
                  list = [...list, ...testimonials];
                }
              }
              const duplicatedTestimonials = [...list, ...list];

              return (
                <div style={{ overflow: "hidden", width: "100%", position: "relative", padding: "12px 0" }}>
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes avsMarquee {
                      0% { transform: translate3d(0, 0, 0); }
                      100% { transform: translate3d(-50%, 0, 0); }
                    }
                    .avs-marquee-track {
                      display: flex;
                      width: max-content;
                      gap: 20px;
                      animation: avsMarquee 35s linear infinite;
                    }
                    .avs-marquee-track:hover {
                      animation-play-state: paused;
                    }
                    .avs-testimonial-card {
                      width: 320px;
                      flex-shrink: 0;
                    }
                  `}} />
                  <div className="avs-marquee-track">
                    {duplicatedTestimonials.map((test, index) => (
                      <div key={`${test.id}-${index}`} className="card avs-testimonial-card animate-in" style={{
                        padding: 24, position: "relative", display: "flex", flexDirection: "column",
                        justifyContent: "space-between", borderLeft: "4px solid var(--clr-saffron)",
                        boxShadow: "var(--shadow-sm)", background: "var(--clr-white)",
                        cursor: "default", margin: 0
                      }}>
                        <div>
                          <div style={{
                            color: "rgba(229, 109, 37, 0.15)", fontSize: 48, fontFamily: "serif",
                            position: "absolute", top: 10, right: 20, lineHeight: 1, pointerEvents: "none"
                          }}>
                            ”
                          </div>
                          <p style={{
                            fontSize: 14, fontStyle: "italic", color: "var(--clr-text-body)",
                            lineHeight: 1.6, marginBottom: 20, position: "relative", zIndex: 1
                          }}>
                            "{test.marriage_feedback}"
                          </p>
                          {test.marriage_photo && (
                            <div style={{
                              width: "100%",
                              height: 180,
                              overflow: "hidden",
                              borderRadius: 6,
                              marginBottom: 20,
                              border: "1px solid var(--clr-border)"
                            }}>
                              <img 
                                src={test.marriage_photo} 
                                alt={`${test.name}'s marriage`} 
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover"
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div style={{
                          display: "flex", alignItems: "center", gap: 12,
                          borderTop: "1px solid var(--clr-border)", paddingTop: 16
                        }}>
                          <div className={`avatar avatar-sm avatar-${test.profile_type}`} style={{ fontWeight: 700, flexShrink: 0 }}>
                            {test.avatar || test.name?.[0] || "?"}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--clr-text-title)" }}>
                              {test.name}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--clr-text-muted)", marginTop: 2 }}>
                              Married: {new Date(test.marriage_date).toLocaleDateString(state.lang === "ta" ? "ta-IN" : "en-US", {
                                year: "numeric", month: "short", day: "numeric"
                              })}
                            </div>
                            {test.partner_profile_id && (
                              <div style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                background: "linear-gradient(135deg, #FFF0F2, #FFE4E6)",
                                color: "#E11D48", fontSize: 9, fontWeight: 700,
                                padding: "1px 6px", borderRadius: 4, marginTop: 4
                              }}>
                                💑 Matched via AVS
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}
    </div>
  );
}
