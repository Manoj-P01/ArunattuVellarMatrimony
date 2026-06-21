// ─── Persistence helpers ──────────────────────────────────────────────────────
const SESSION_KEY  = "avs_session";
const INTERESTS_KEY = "avs_interests";
const SHORTLIST_KEY = "avs_shortlist";
const VIEWED_KEY    = "avs_viewed";

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function saveSession(user, isAdmin, token) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, isAdmin }));
    if (token) {
      localStorage.setItem("avs_jwt", token);
    }
  } catch {}
}
function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(INTERESTS_KEY);
    localStorage.removeItem(SHORTLIST_KEY);
    localStorage.removeItem("avs_jwt");
  } catch {}
}
function loadInterests() {
  try { return JSON.parse(localStorage.getItem(INTERESTS_KEY) || "[]"); } catch { return []; }
}
function saveInterests(interests) {
  try { localStorage.setItem(INTERESTS_KEY, JSON.stringify(interests)); } catch {}
}
function loadShortlist() {
  try { return JSON.parse(localStorage.getItem(SHORTLIST_KEY) || "[]"); } catch { return []; }
}
function saveShortlist(list) {
  try { localStorage.setItem(SHORTLIST_KEY, JSON.stringify(list)); } catch {}
}
function loadViewed() {
  try { return JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]"); } catch { return []; }
}
function saveViewed(list) {
  try { localStorage.setItem(VIEWED_KEY, JSON.stringify(list)); } catch {}
}

// ─── Initial State ────────────────────────────────────────────────────────────
const _session = loadSession();

export const initialState = {
  lang: "en",
  theme: "light",
  page: "home",
  user: _session?.user ?? null,
  isAdmin: _session?.isAdmin ?? false,
  pendingDualRole: null, // set when admin+member user needs to pick a role on login
  forceLoginMode: null,
  profiles: [],
  notifications: [],
  marriages: [],
  /**
   * interests: Array of { id, from, to, status, timestamp }
   *   from = profile_id or "me" for sent interests
   *   to   = profile.id of the target person
   *   status = "pending" | "accepted" | "rejected"
   */
  interests: loadInterests(),
  shortlisted: loadShortlist(),
  blocked: [],
  viewedProfiles: loadViewed(), // [{ id, name, avatar, profile_type, viewedAt }]
  selectedProfile: null,
  showModal: null,
  sidebarOpen: typeof window !== "undefined" ? window.innerWidth > 768 : true,
  pageHistory: [],
  searchFilters: {
    type: "",
    ageMin: "",
    ageMax: "",
    education: "",
    occupation: "",
    marital_status: "",
    dosham: "",
    kothiram: [],
    religion: "",
    community: "",
    rasi: [],
    natchathiram: [],
  },
  regStep: 0,
  regData: {
    type: "bride",
    name: "",
    email: "",
    whatsapp: "+91|",
    contact_privacy: "public",
    contact: "+91|",
    altContact: "",
    sameAsWhatsapp: true,
    password: "",
    confirmPassword: "",
    dob: "",
    birth_time: "",
    birth_place: "",
    height: "",
    marital_status: "single",
    education: "",
    occupation: "",
    salary: "",
    kothiram: "",
    native_place: "",
    country: "",
    state: "",
    district: "",
    living_country: "India",
    living_state: "",
    living_district: "",
    about: "",
    about_me_privacy: "public",
    social_links_privacy: "public",
    social_links: [],
    expectations: "",
    father_name: "",
    father_kothiram: "",
    father_mobile: "",
    father_whatsapp: "",
    father_whatsapp_same: true,
    mother_name: "",
    mother_kothiram: "",
    mother_mobile: "",
    mother_whatsapp: "",
    mother_whatsapp_same: true,
    rasi: "",
    natchathiram: "",
    patham: "",
    dosham: "",
    sevvai_position: "",
    ragu_position: "",
    kedhu_position: "",
    brother_count: "",
    brother_married_status: "",
    sister_count: "",
    sister_married_status: "",
    otp: "",
    otpSent: false,
    otpVerified: false,
  },
  profileForm: {},
  adminTab: "dashboard",
  marriages: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeProfileId(type, profiles) {
  const seq = profiles.filter(p => p.profile_type === type).length + 1;
  return type === "bride"
    ? `AVS-BR-${String(seq).padStart(3, "0")}`
    : `AVS-GR-${String(seq).padStart(3, "0")}`;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
export function appReducer(state, action) {
  switch (action.type) {

    // ── Theme / Lang ─────────────────────────────────────────────
    case "TOGGLE_THEME":
      return { ...state, theme: state.theme === "light" ? "dark" : "light" };
    case "SET_LANG":
      return { ...state, lang: action.payload };

    // ── Data load ────────────────────────────────────────────────
    case "SET_DATA": {
      const { profiles, notifications, marriages } = action.payload;
      // Only update fields that were actually provided (allows profiles-only reload for admin)
      return {
        ...state,
        ...(profiles      !== undefined ? { profiles }      : {}),
        ...(notifications !== undefined ? { notifications } : {}),
        ...(marriages     !== undefined ? { marriages }     : {}),
      };
    }

    // ── Navigation ───────────────────────────────────────────────
    case "SET_PAGE": {
      const prevPage = state.page;
      // Don't push viewProfile into history (it's always navigated to via SELECT_PROFILE)
      const newHistory = prevPage && prevPage !== action.payload && prevPage !== "viewProfile"
        ? [...state.pageHistory.slice(-9), prevPage]
        : state.pageHistory;
      return { ...state, page: action.payload, sidebarOpen: false, selectedProfile: null, pageHistory: newHistory };
    }
    case "SELECT_PROFILE": {
      // Push current page to history before opening profile view
      const fromPage = state.page !== "viewProfile" ? state.page : (state.pageHistory.slice(-1)[0] || "home");
      const newHistory = [...state.pageHistory.slice(-9), fromPage];
      // Auto-mark as viewed
      const p = action.payload;
      const viewEntry = { id: p.id, name: p.name, avatar: p.avatar, profile_type: p.profile_type, profile_id: p.profile_id, viewedAt: Date.now() };
      const existing = state.viewedProfiles.filter(v => v.id !== p.id);
      const updatedViewed = [viewEntry, ...existing].slice(0, 30); // keep last 30
      saveViewed(updatedViewed);
      return { ...state, selectedProfile: p, page: "viewProfile", pageHistory: newHistory, viewedProfiles: updatedViewed };
    }

    case "CLEAR_VIEWED":
      saveViewed([]);
      return { ...state, viewedProfiles: [] };
    case "GO_BACK": {
      if (state.pageHistory.length === 0) {
        return { ...state, page: "home", selectedProfile: null };
      }
      const history = [...state.pageHistory];
      const backPage = history.pop();
      return { ...state, page: backPage, selectedProfile: null, pageHistory: history };
    }
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "SET_MODAL":
      return { ...state, showModal: action.payload };

    // ── Auth ─────────────────────────────────────────────────────
    case "LOGIN": {
      const user = action.payload;
      saveSession(user, false);
      return { ...state, user, isAdmin: false, page: "home" };
    }

    // ── Dual-role pending: admin+member user needs to pick which mode ────
    case "SET_DUAL_ROLE_PENDING":
      return { ...state, pendingDualRole: action.payload, page: "login" };

    case "GO_TO_ADMIN_LOGIN": {
      const prevPage = state.page;
      const newHistory = prevPage && prevPage !== "login" && prevPage !== "viewProfile"
        ? [...state.pageHistory.slice(-9), prevPage]
        : state.pageHistory;
      return { ...state, page: "login", forceLoginMode: "admin", sidebarOpen: false, selectedProfile: null, pageHistory: newHistory };
    }

    case "CLEAR_FORCE_LOGIN_MODE":
      return { ...state, forceLoginMode: null };

    // ── Real OTP login result from /api/auth/login ───────────────────────
    case "LOGIN_SUCCESS": {
      const { user: apiUser, profile: apiProfile, forceRole, token } = action.payload;
      // forceRole: "admin" | "member" — set by dual-role picker when user is both admin + bride/groom

      // Spread the full DB record so every field (including future ones) flows through.
      // Only override the handful of shape-normalisation fields needed by the frontend.
      const newProfile = apiProfile
        ? {
            ...apiProfile,
            date_of_birth: apiProfile.dob,           // alias used in some form fields
            email:         apiProfile.email || apiUser.email,
            photos:        [],
            avatar:        apiProfile.name?.slice(0, 2).toUpperCase() || "??",
          }
        : null;

      const user = {
        id:           apiUser.id,
        name:         apiUser.name,
        email:        apiUser.email,
        role:         apiUser.role,
        profile_type: newProfile?.profile_type || null,
        profileId:    newProfile?.id || null,
        profile_id:   newProfile?.profile_id || null,
      };

      // If forceRole is set, override what role they act as this session
      const actingAsAdmin = forceRole
        ? (forceRole === "admin" || forceRole === "super_admin")
        : (apiUser.role === "admin" || apiUser.role === "super_admin");

      saveSession(user, actingAsAdmin, token);

      // Merge profile into profiles list (add if not already there)
      const updatedProfiles = newProfile
        ? [
            ...state.profiles.filter(p => p.id !== newProfile.id),
            newProfile,
          ]
        : state.profiles;

      return {
        ...state,
        user,
        isAdmin: actingAsAdmin,
        pendingDualRole: null,  // clear after role is chosen
        profiles: updatedProfiles,
        page: actingAsAdmin ? "admin" : "home",
      };
    }

    // ── Restore session from /api/auth/me on page load ────────────────────
    case "RESTORE_SESSION": {
      if (!action.payload || !action.payload.user) {
        return {
          ...state,
          user: null,
          isAdmin: false,
        };
      }
      const { user: apiUser, profile: apiProfile, token } = action.payload;

      // Spread full DB record — every field the API returns flows through automatically.
      const restoredProfile = apiProfile
        ? {
            ...apiProfile,
            date_of_birth: apiProfile.dob,
            email:         apiProfile.email || apiUser.email,
            photos:        [],
            avatar:        apiProfile.name?.slice(0, 2).toUpperCase() || "??",
          }
        : null;

      const user = {
        id:           apiUser.id,
        name:         apiUser.name,
        email:        apiUser.email,
        role:         apiUser.role,
        profile_type: restoredProfile?.profile_type || null,
        profileId:    restoredProfile?.id || null,
        profile_id:   restoredProfile?.profile_id || null,
      };

      // Preserve the forceRole the user chose in the role picker.
      // The saved session already has the correct isAdmin value (set during LOGIN_SUCCESS).
      // Only fall back to role-based if no saved session exists yet.
      const savedSession = loadSession();
      const actingAsAdmin = savedSession?.user?.id === apiUser.id
        ? (savedSession.isAdmin ?? (apiUser.role === "admin" || apiUser.role === "super_admin"))  // honour saved choice
        : (apiUser.role === "admin" || apiUser.role === "super_admin");

      saveSession(user, actingAsAdmin, token);

      const updatedProfiles = restoredProfile
        ? [
            ...state.profiles.filter(p => p.id !== restoredProfile.id),
            restoredProfile,
          ]
        : state.profiles;

      return {
        ...state,
        user,
        isAdmin: actingAsAdmin,
        profiles: updatedProfiles,
        // Only navigate if not already on a valid page
        page: state.page === "login" || state.page === "home"
          ? (actingAsAdmin ? "admin" : "home")
          : state.page,
      };
    }

    // ── Legacy password login (kept as fallback) ──────────────────────────
    case "LOGIN_WITH_PASSWORD": {
      const { loginType, identifier, password } = action.payload;
      const matchedProfile = state.profiles.find(p => {
        if (loginType === "email") return p.email?.toLowerCase() === identifier.toLowerCase();
        // Match against all storage formats:
        // stored as "+919876543210" (new), "+91|9876543210" (old), or "9876543210" (legacy)
        const tail10 = identifier.replace(/\D/g, "").slice(-10);
        const matchNum = (stored = "") => {
          if (!stored) return false;
          // Strip pipe: "+91|9876543210" → "+919876543210"
          const clean = stored.replace("|", "");
          return clean === identifier || clean.endsWith(tail10) || stored === identifier;
        };
        return matchNum(p.whatsapp) || matchNum(p.contact);
      });
      if (!matchedProfile) {
        return {
          ...state,
          notifications: [{
            id: Date.now(), type: "error",
            message: `LOGIN_ERROR:${loginType === "email" ? "No account found with this email." : "No account found with this mobile number."}`,
            time: "now", read: false,
          }, ...state.notifications],
        };
      }
      const user = {
        name:         matchedProfile.name,
        email:        matchedProfile.email,
        profile_type: matchedProfile.profile_type,
        profileId:    matchedProfile.id,
        profile_id:   matchedProfile.profile_id,
      };
      saveSession(user, false);
      return { ...state, user, isAdmin: false, page: "home" };
    }

    case "LOGOUT": {
      clearSession();
      return {
        ...initialState,
        profiles: state.profiles,
        notifications: [],
        user: null,
        isAdmin: false,
        pendingDualRole: null,
        page: "home",
        interests: [],
        shortlisted: [],
        blocked: [],
      };
    }

    // ── Registration: OTP verified + profile saved to Supabase ──────────
    case "COMPLETE_REGISTRATION": {
      const { regData, dbProfile, dbUser, token } = action.payload;

      // If dbProfile is provided, the data was saved to Supabase successfully.
      // Build a local profile object from the real DB record.
      const savedProfile = dbProfile || null;

      const newProfile = savedProfile
        ? {
            // Spread full DB record so every field flows through automatically
            ...savedProfile,
            date_of_birth: savedProfile.dob,
            email:         savedProfile.email || regData.email,
            photos:        [],
            avatar:        savedProfile.name?.slice(0, 2).toUpperCase() || "??",
          }
        : {
            // Fallback: local-only profile (backend offline)
            id:            `local_${Date.now()}`,
            profile_id:    makeProfileId(regData.type, state.profiles),
            profile_type:  regData.type,
            name:          regData.name,
            dob:           regData.dob,
            height:        regData.height,
            marital_status: regData.marital_status,
            education:     regData.education,
            occupation:    regData.occupation,
            salary:        regData.salary,
            kothiram:      regData.kothiram,
            country:       regData.country,
            state:         regData.state,
            district:      regData.district,
            living_country: regData.living_country || "India",
            living_state:    regData.living_state || "",
            living_district: regData.living_district || "",
            about_me:      regData.about,
            about_me_privacy: "public",
            social_links_privacy: regData.social_links_privacy || "public",
            contact_privacy: regData.contact_privacy || "public",
            social_links:  regData.social_links || [],
            // Convert "+91|9876543210" → "+919876543210" for storage
            whatsapp:      (regData.whatsapp || "").replace("|", ""),
            contact:       (regData.sameAsWhatsapp ? regData.whatsapp : regData.contact || "").replace("|", ""),
            father_name:    regData.father_name,
            father_kothiram: regData.father_kothiram,
            father_mobile:  (regData.father_mobile || "").replace("|", ""),
            father_whatsapp: (regData.father_whatsapp_same ? regData.father_mobile : regData.father_whatsapp || "").replace("|", ""),
            mother_name:    regData.mother_name,
            mother_kothiram: regData.mother_kothiram,
            mother_mobile:  (regData.mother_mobile || "").replace("|", ""),
            mother_whatsapp: (regData.mother_whatsapp_same ? regData.mother_mobile : regData.mother_whatsapp || "").replace("|", ""),
            photo_privacy: "public",
            profile_status: "active",
            approval_status: "pending",
            photos:        [],
            avatar:        regData.name?.slice(0, 2).toUpperCase() || "??",
            email:         regData.email,
          };

      const user = {
        id:           dbUser?.id || newProfile.id,
        name:         newProfile.name,
        email:        regData.email,
        profile_type: newProfile.profile_type,
        profileId:    newProfile.id,
        profile_id:   newProfile.profile_id,
      };

      saveSession(user, false, token);

      const newNotif = {
        id:      Date.now(),
        type:    "profile_approved",
        message: "Registration successful! Your profile is under admin review. You'll be notified once approved.",
        time:    "Just now",
        read:    false,
      };

      return {
        ...state,
        user,
        isAdmin: false,
        page:    "profile",
        profiles: [...state.profiles, newProfile],
        notifications: [newNotif, ...state.notifications],
        regStep: 0,
        regData: initialState.regData,
      };
    }

    // ── Profile: save edits ──────────────────────────────────────
    case "SAVE_PROFILE": {
      const { profileId, updates } = action.payload;
      const updatedProfiles = state.profiles.map(p =>
        p.id === profileId
          ? {
              ...p,
              ...updates,
              avatar: (updates.name || p.name)?.slice(0, 2).toUpperCase() || p.avatar,
            }
          : p
      );
      // Sync user name if changed
      const updatedUser = updates.name
        ? { ...state.user, name: updates.name }
        : state.user;
      saveSession(updatedUser, state.isAdmin);
      return { ...state, profiles: updatedProfiles, user: updatedUser };
    }

    case "UPDATE_PROFILE_FORM":
      return { ...state, profileForm: { ...state.profileForm, ...action.payload } };

    // ── Search ───────────────────────────────────────────────────
    case "UPDATE_FILTERS":
      return { ...state, searchFilters: { ...state.searchFilters, ...action.payload } };
    case "RESET_FILTERS":
      return { ...state, searchFilters: initialState.searchFilters };

    // ── Interests ────────────────────────────────────────────────
    case "SEND_INTEREST": {
      const { from, to } = action.payload;
      const alreadySent = state.interests.some(i => i.from === from && i.to === to && i.status !== "rejected");
      if (alreadySent) return state;
      const newInterest = {
        id: `int_${Date.now()}`,
        from,
        to,
        status: "pending",
        timestamp: new Date().toISOString(),
      };
      const newInterests = [...state.interests, newInterest];
      saveInterests(newInterests);
      const targetName = state.profiles.find(p => p.id === to)?.name || "the member";
      const notif = {
        id: Date.now(),
        type: "interest",
        message: `You sent an interest to ${targetName}`,
        time: "Just now",
        read: false,
      };
      return {
        ...state,
        interests: newInterests,
        notifications: [notif, ...state.notifications],
      };
    }
    // Legacy compat
    case "ADD_INTEREST": {
      const alreadySent = state.interests.some(i => i.to === action.payload && i.status !== "rejected");
      if (alreadySent) return state;
      const interest = {
        id: `int_${Date.now()}`,
        from: state.user?.profile_id || "me",
        to: action.payload,
        status: "pending",
        timestamp: new Date().toISOString(),
      };
      const newInterests = [...state.interests, interest];
      saveInterests(newInterests);
      return { ...state, interests: newInterests };
    }

    case "ACCEPT_INTEREST": {
      const newInterests = state.interests.map(i =>
        i.id === action.payload ? { ...i, status: "accepted" } : i
      );
      saveInterests(newInterests);
      const interest = state.interests.find(i => i.id === action.payload);
      const sender = interest ? state.profiles.find(p => p.id === interest.from || p.profile_id === interest.from) : null;
      const notif = {
        id: Date.now(),
        type: "match",
        message: `You accepted the interest from ${sender?.name || "a member"} 🎉`,
        time: "Just now",
        read: false,
      };
      return { ...state, interests: newInterests, notifications: [notif, ...state.notifications] };
    }

    case "REJECT_INTEREST": {
      const newInterests = state.interests.map(i =>
        i.id === action.payload ? { ...i, status: "rejected" } : i
      );
      saveInterests(newInterests);
      return { ...state, interests: newInterests };
    }

    case "WITHDRAW_INTEREST": {
      const newInterests = state.interests.filter(i => i.id !== action.payload);
      saveInterests(newInterests);
      return { ...state, interests: newInterests };
    }

    // ── Shortlist ────────────────────────────────────────────────
    case "TOGGLE_SHORTLIST": {
      const exists = state.shortlisted.includes(action.payload);
      const newList = exists
        ? state.shortlisted.filter(id => id !== action.payload)
        : [...state.shortlisted, action.payload];
      saveShortlist(newList);
      return { ...state, shortlisted: newList };
    }

    // ── Block ────────────────────────────────────────────────────
    case "BLOCK_USER":
      return { ...state, blocked: [...new Set([...state.blocked, action.payload])] };
    case "UNBLOCK_USER":
      return { ...state, blocked: state.blocked.filter(id => id !== action.payload) };

    // ── Notifications ────────────────────────────────────────────
    case "MARK_NOTIF_READ":
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case "MARK_ALL_NOTIF_READ":
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case "ADD_NOTIFICATION":
      return { ...state, notifications: [action.payload, ...state.notifications] };

    // ── Admin ────────────────────────────────────────────────────
    case "APPROVE_PROFILE": {
      // payload can be { id, profile_id } (from API) or just an id string (legacy)
      const approveId = typeof action.payload === "object" ? action.payload.id : action.payload;
      const assignedProfileId = typeof action.payload === "object" ? action.payload.profile_id : null;
      return {
        ...state,
        profiles: state.profiles.map(p =>
          p.id === approveId
            ? { ...p, approval_status: "approved", ...(assignedProfileId ? { profile_id: assignedProfileId } : {}) }
            : p
        ),
      };
    }
    case "REJECT_PROFILE":
      return {
        ...state,
        profiles: state.profiles.map(p =>
          p.id === action.payload ? { ...p, approval_status: "rejected" } : p
        ),
      };
    case "DELETE_PROFILE":
      return { ...state, profiles: state.profiles.filter(p => p.id !== action.payload) };

    case "MAP_MARRIAGE": {
      const { brideId, groomId, marriedDate, marriageType } = action.payload;
      const marriage = {
        id: `m_${Date.now()}`,
        brideId,
        groomId,
        marriedDate,
        marriageType,
      };
      const updatedProfiles = state.profiles.map(p =>
        (brideId && p.id === brideId) || (groomId && p.id === groomId) ? { ...p, profile_status: "married" } : p
      );
      const bride = brideId ? state.profiles.find(p => p.id === brideId) : null;
      const groom = groomId ? state.profiles.find(p => p.id === groomId) : null;
      
      let message = "";
      if (bride && groom) {
        message = `Marriage mapped: ${bride.name} & ${groom.name} 💑`;
      } else if (bride) {
        message = `${bride.name} marked as Married (Out of Matrimony) 💍`;
      } else if (groom) {
        message = `${groom.name} marked as Married (Out of Matrimony) 💍`;
      } else {
        message = "Marriage recorded 💍";
      }

      const notif = {
        id: Date.now(),
        type: "match",
        message,
        time: "Just now",
        read: false,
      };
      return {
        ...state,
        marriages: [...state.marriages, marriage],
        profiles: updatedProfiles,
        notifications: [notif, ...state.notifications],
      };
    }
    case "SET_ADMIN_TAB":
      return { ...state, adminTab: action.payload };

    // ── Reg form ─────────────────────────────────────────────────
    case "SET_REG_STEP":
      return { ...state, regStep: action.payload };
    case "UPDATE_REG":
      return { ...state, regData: { ...state.regData, ...action.payload } };

    default:
      return state;
  }
}
