export const initialState = {
  lang: "en",
  theme: "light",
  page: "home",
  user: null,
  isAdmin: false,
  profiles: [],
  notifications: [],
  interests: [],
  shortlisted: [],
  blocked: [],
  selectedProfile: null,
  showModal: null,
  sidebarOpen: false,
  searchFilters: {
    ageMin: "",
    ageMax: "",
    district: "",
    education: "",
    occupation: "",
    marital_status: "",
    kothiram: "",
    type: "",
  },
  regStep: 0,
  regData: {
    type: "bride",
    name: "",
    email: "",
    whatsapp: "",
    contact: "",
    altContact: "",
    sameAsWhatsapp: true,
    otp: "",
    otpSent: false,
    otpVerified: false,
  },
  profileForm: {},
  adminTab: "dashboard",
};

export function appReducer(state, action) {
  switch (action.type) {
    case "TOGGLE_THEME":
      return { ...state, theme: state.theme === "light" ? "dark" : "light" };
    case "SET_DATA":
      return {
        ...state,
        profiles: action.payload.profiles,
        notifications: action.payload.notifications,
      };
    case "SET_LANG":
      return { ...state, lang: action.payload };
    case "SET_PAGE":
      return {
        ...state,
        page: action.payload,
        sidebarOpen: false,
        selectedProfile: null,
      };
    case "LOGIN":
      return { ...state, user: action.payload, page: "home" };
    case "LOGIN_ADMIN":
      return {
        ...state,
        isAdmin: true,
        user: { name: "Admin", email: "admin@avs.com" },
        page: "admin",
      };
    case "LOGOUT":
      return { ...state, user: null, isAdmin: false, page: "home" };
    case "SELECT_PROFILE":
      return { ...state, selectedProfile: action.payload, page: "viewProfile" };
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "SET_MODAL":
      return { ...state, showModal: action.payload };
    case "SET_REG_STEP":
      return { ...state, regStep: action.payload };
    case "UPDATE_REG":
      return { ...state, regData: { ...state.regData, ...action.payload } };
    case "UPDATE_FILTERS":
      return {
        ...state,
        searchFilters: { ...state.searchFilters, ...action.payload },
      };
    case "RESET_FILTERS":
      return { ...state, searchFilters: initialState.searchFilters };
    case "ADD_INTEREST": {
      if (state.interests.includes(action.payload)) return state;
      return { ...state, interests: [...state.interests, action.payload] };
    }
    case "TOGGLE_SHORTLIST": {
      const exists = state.shortlisted.includes(action.payload);
      return {
        ...state,
        shortlisted: exists
          ? state.shortlisted.filter((id) => id !== action.payload)
          : [...state.shortlisted, action.payload],
      };
    }
    case "BLOCK_USER":
      return { ...state, blocked: [...state.blocked, action.payload] };
    case "APPROVE_PROFILE":
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.payload ? { ...p, approval_status: "approved" } : p
        ),
      };
    case "REJECT_PROFILE":
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.payload ? { ...p, approval_status: "rejected" } : p
        ),
      };
    case "SET_ADMIN_TAB":
      return { ...state, adminTab: action.payload };
    case "UPDATE_PROFILE_FORM":
      return {
        ...state,
        profileForm: { ...state.profileForm, ...action.payload },
      };
    default:
      return state;
  }
}
