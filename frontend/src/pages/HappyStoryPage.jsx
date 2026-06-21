import { useState } from "react";
import { Icon } from "../components/Icon.jsx";

const base = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");

function convertToWebP(file, maxWidthOrHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          } else {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const webpBase64 = canvas.toDataURL("image/webp", quality);
        resolve(webpBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function HappyStoryPage({ state, dispatch, t }) {
  const myProfile = state.profiles.find(p => p.id === state.user?.profileId);
  const [isEditing, setIsEditing] = useState(!myProfile?.got_married);

  // Form states
  const [marriageDate, setMarriageDate] = useState(myProfile?.marriage_date || "");
  const [isPartnerFromMatrimony, setIsPartnerFromMatrimony] = useState(!!myProfile?.partner_profile_id);
  const [partnerProfileId, setPartnerProfileId] = useState(myProfile?.partner_profile_id || "");
  const [feedback, setFeedback] = useState(myProfile?.marriage_feedback || "");
  const [marriagePhoto, setMarriagePhoto] = useState(myProfile?.marriage_photo || "");
  const [marriageType, setMarriageType] = useState(myProfile?.marriage_type || "arranged");
  const [photoLoading, setPhotoLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!myProfile) {
    return (
      <div className="page-container" style={{ padding: "40px 16px", textAlign: "center" }}>
        <div className="card" style={{ maxWidth: 500, margin: "0 auto", padding: 32 }}>
          <Icon name="alertCircle" size={48} style={{ color: "var(--clr-danger)", marginBottom: 16 }} />
          <h3>Profile Not Found</h3>
          <p style={{ color: "var(--clr-text-muted)", marginTop: 8 }}>
            Please complete your profile registration first.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!marriageDate) {
      setError(t("marriageDateRequired") || "Marriage date is required");
      return;
    }
    if (!feedback.trim()) {
      setError(t("feedbackRequired") || "Feedback is required");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      got_married: true,
      marriage_date: marriageDate,
      partner_profile_id: isPartnerFromMatrimony ? partnerProfileId.trim() : "",
      marriage_feedback: feedback.trim(),
      marriage_photo: marriagePhoto,
      marriage_type: marriageType,
      profile_status: "married", // Set to married so they are hidden from other users
    };

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("avs_jwt") : null;
      const res = await fetch(`${base}/api/profiles/${myProfile.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        dispatch({
          type: "SAVE_PROFILE",
          payload: {
            profileId: myProfile.id,
            updates: {
              got_married: true,
              marriage_date: marriageDate,
              partner_profile_id: payload.partner_profile_id,
              marriage_feedback: payload.marriage_feedback,
              marriage_photo: payload.marriage_photo,
              marriage_type: marriageType,
              profile_status: "married",
              testimonial_approved: false,
            },
          },
        });
        setSuccess(true);
        setIsEditing(false);
      } else {
        setError(data.error || "Failed to submit happy story");
      }
    } catch (err) {
      setError("Network error — please check connection");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-container animate-in" style={{ padding: "40px 16px", paddingBottom: 80 }}>
        <div className="card" style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", padding: "48px 32px" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px",
            background: "linear-gradient(135deg, #FFF0F2, #FFE4E6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(225, 29, 72, 0.15)",
          }}>
            <span style={{ fontSize: 40 }}>💖</span>
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--clr-maroon)" }}>
            Congratulations!
          </h2>
          <p style={{ fontSize: 14, color: "var(--clr-text-muted)", lineHeight: 1.6, marginTop: 12, marginBottom: 24 }}>
            {t("happyStorySuccess")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: "SET_PAGE", payload: "home" })}>
              Go to Home
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSuccess(false)}>
              View Story
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-in" style={{ padding: "24px 16px", paddingBottom: 80 }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--clr-maroon)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <span>💖</span> {t("happyStory")}
        </h2>
        <p style={{ color: "var(--clr-text-muted)", fontSize: 14, marginBottom: 24 }}>
          Share your happy news and feedback with the community! Once marked as married, your profile will be hidden from searches.
        </p>

        {!isEditing ? (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              {myProfile.testimonial_approved ? (
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-success)", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--clr-success)" }} />
                  Story Published
                </span>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-saffron, #f57c00)", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--clr-saffron, #f57c00)" }} />
                  Pending Admin Approval
                </span>
              )}

              <button className="btn btn-sm btn-secondary" onClick={() => setIsEditing(true)}>
                Edit Story
              </button>
            </div>

            {!myProfile.testimonial_approved && (
              <div className="alert alert-warning" style={{
                marginBottom: 20, padding: "12px 16px", borderRadius: 8, fontSize: 13,
                background: "#FFF8E1", color: "#B78103", border: "1px solid #FFE082",
                display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left"
              }}>
                <span style={{ fontSize: 16 }}>⏳</span>
                <div>
                  <strong>Awaiting Admin Review:</strong> Your happy story and photo have been saved and are currently pending review by our administrator. They will be visible on the homepage once approved.
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--clr-text-muted)", display: "block", marginBottom: 4 }}>
                  {t("marriageDate")}
                </label>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {new Date(myProfile.marriage_date).toLocaleDateString(state.lang === "ta" ? "ta-IN" : "en-US", {
                    year: "numeric", month: "long", day: "numeric"
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--clr-text-muted)", display: "block", marginBottom: 4 }}>
                  {t("marriageType")}
                </label>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {myProfile.marriage_type === "arranged" ? t("arranged") :
                   myProfile.marriage_type === "love" ? t("love") :
                   myProfile.marriage_type === "matrimony" ? t("matrimonyMatch") :
                   (t(myProfile.marriage_type) || myProfile.marriage_type || t("arranged"))}
                </div>
              </div>
              {myProfile.partner_profile_id && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--clr-text-muted)", display: "block", marginBottom: 4 }}>
                    {t("partnerProfileId")}
                  </label>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--clr-saffron)" }}>
                    {myProfile.partner_profile_id}
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--clr-border)", paddingTop: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--clr-text-muted)", display: "block", marginBottom: 8 }}>
                {t("feedback")}
              </label>
              <div style={{
                fontSize: 14, fontStyle: "italic", background: "var(--clr-bg-subtle)",
                padding: 16, borderRadius: 8, color: "var(--clr-text-body)", lineHeight: 1.6,
                marginBottom: myProfile.marriage_photo ? 16 : 0
              }}>
                "{myProfile.marriage_feedback}"
              </div>
              {myProfile.marriage_photo && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--clr-text-muted)", display: "block", marginBottom: 6 }}>
                    Marriage Photo
                  </label>
                  <div style={{ maxWidth: 280, borderRadius: 8, overflow: "hidden", border: "1px solid var(--clr-border)" }}>
                    <img src={myProfile.marriage_photo} alt="Marriage" style={{ width: "100%", height: "auto", display: "block" }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form className="card" onSubmit={handleSubmit} style={{ padding: 24 }}>
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 6, fontSize: 13, background: "#FFEBEB", color: "#B71C1C", border: "1px solid #FFCDD2" }}>
                ⚠️ {error}
              </div>
            )}

            {/* Marriage Date */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {t("marriageDate")} <span style={{ color: "var(--clr-danger)" }}>*</span>
              </label>
              <input
                type="date"
                className="input-field"
                value={marriageDate}
                onChange={(e) => setMarriageDate(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--clr-border)", borderRadius: 6 }}
                required
              />
            </div>

            {/* Marriage Type */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {t("marriageType")} <span style={{ color: "var(--clr-danger)" }}>*</span>
              </label>
              <select
                className="input-field"
                value={marriageType}
                onChange={(e) => setMarriageType(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--clr-border)", borderRadius: 6, background: "white" }}
                required
              >
                <option value="arranged">{t("arranged")}</option>
                <option value="love">{t("love")}</option>
                <option value="matrimony">{t("matrimonyMatch")}</option>
              </select>
            </div>

            {/* Partner from Matrimony? */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isPartnerFromMatrimony}
                  onChange={(e) => setIsPartnerFromMatrimony(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                Partner is a member of this Matrimony?
              </label>
            </div>

            {/* Partner Profile ID */}
            {isPartnerFromMatrimony && (
              <div className="animate-in" style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {t("partnerProfileId")}
                </label>
                <input
                  type="text"
                  placeholder="e.g. AVS-GR-002"
                  className="input-field"
                  value={partnerProfileId}
                  onChange={(e) => setPartnerProfileId(e.target.value.toUpperCase())}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--clr-border)", borderRadius: 6 }}
                />
              </div>
            )}

            {/* Feedback / Testimony */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {t("feedback")} <span style={{ color: "var(--clr-danger)" }}>*</span>
              </label>
              <textarea
                placeholder="Share your experience and thoughts about our matrimony service..."
                className="input-field"
                rows={5}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--clr-border)", borderRadius: 6, resize: "vertical" }}
                required
              />
            </div>

            {/* Marriage Photo (Optional) */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Marriage Photo (Optional)
              </label>
              {marriagePhoto ? (
                <div style={{ position: "relative", width: 140, height: 140, borderRadius: 8, overflow: "hidden", border: "1px solid var(--clr-border)" }}>
                  <img src={marriagePhoto} alt="Marriage preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => setMarriagePhoto("")} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                    ✕
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        setError("Photo must be under 5 MB");
                        return;
                      }
                      setPhotoLoading(true);
                      setError("");
                      try {
                        const webpB64 = await convertToWebP(file);
                        const dotIdx = file.name.lastIndexOf('.');
                        const webpName = (dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name) + ".webp";
                        
                        const token = typeof window !== "undefined" ? localStorage.getItem("avs_jwt") : null;
                        const uploadRes = await fetch(`${base}/api/photos`, {
                          method: "POST",
                          credentials: "include",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token ? { "Authorization": `Bearer ${token}` } : {})
                          },
                          body: JSON.stringify({ file_base64: webpB64, file_name: webpName, photo_type: "testimonial" }),
                        });
                        const uploadData = await uploadRes.json();
                        if (uploadData.success && uploadData.photo?.photo_url) {
                          setMarriagePhoto(uploadData.photo.photo_url);
                        } else {
                          setError(uploadData.error || "Failed to upload photo");
                        }
                      } catch (err) {
                        setError("Failed to upload photo");
                      } finally {
                        setPhotoLoading(false);
                      }
                    }}
                    style={{ display: "none" }}
                    id="marriage-photo-input"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => document.getElementById("marriage-photo-input")?.click()}
                    disabled={photoLoading}
                  >
                    {photoLoading ? "Uploading..." : "Upload Marriage Photo"}
                  </button>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              {myProfile.got_married && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  {t("cancel")}
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                {loading ? "Submitting..." : t("submitHappyStory")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
