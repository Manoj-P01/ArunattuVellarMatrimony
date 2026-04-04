// ─── Global Styles ────────────────────────────────────────────────────────────
export function GlobalStyles() {
  return (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=Noto+Sans+Tamil:wght@300;400;500;600;700&display=swap');

    :root {
      --clr-saffron: #E8652E;
      --clr-saffron-light: #F4A261;
      --clr-gold: #D4A843;
      --clr-gold-light: #F2E4B3;
      --clr-maroon: #8B1A1A;
      --clr-maroon-dark: #5C1010;
      --clr-cream: #FFF8F0;
      --clr-cream-dark: #F5EDE0;
      --clr-olive: #4A6741;
      --clr-olive-light: #7BA370;
      --clr-text: #2D2418;
      --clr-text-muted: #8B7D6B;
      --clr-border: #E8DFD3;
      --clr-white: #FFFFFF;
      --clr-bg: #FDFAF5;
      --clr-surface: #FFFFFF;
      --clr-surface-alt: #F9F4EC;
      --clr-danger: #C53030;
      --clr-success: #38A169;
      --clr-info: #3182CE;
      --font-display: 'Playfair Display', serif;
      --font-body: 'DM Sans', 'Noto Sans Tamil', sans-serif;
      --shadow-sm: 0 1px 3px rgba(45,36,24,0.08);
      --shadow-md: 0 4px 16px rgba(45,36,24,0.1);
      --shadow-lg: 0 8px 32px rgba(45,36,24,0.12);
      --shadow-xl: 0 16px 48px rgba(45,36,24,0.16);
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-xl: 24px;
    }

    .dark-theme {
      --clr-bg: #121212;
      --clr-surface: #1E1E1E;
      --clr-surface-alt: #2D2D2D;
      --clr-text: #E0E0E0;
      --clr-text-muted: #A0A0A0;
      --clr-border: #333333;
      --clr-white: #1E1E1E;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    .avs-root {
      font-family: var(--font-body);
      background: var(--clr-bg);
      color: var(--clr-text);
      min-height: 100vh;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .avs-root input, .avs-root select, .avs-root textarea, .avs-root button {
      font-family: var(--font-body);
    }

    /* Patterns & Decorations */
    .kolam-border {
      background-image: repeating-linear-gradient(
        90deg,
        var(--clr-gold) 0px, var(--clr-gold) 4px,
        transparent 4px, transparent 8px,
        var(--clr-saffron) 8px, var(--clr-saffron) 12px,
        transparent 12px, transparent 16px
      );
      height: 4px;
    }

    .gradient-saffron {
      background: linear-gradient(135deg, var(--clr-maroon) 0%, var(--clr-saffron) 50%, var(--clr-gold) 100%);
    }

    .text-gradient {
      background: linear-gradient(135deg, var(--clr-maroon) 0%, var(--clr-saffron) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      text-decoration: none;
      white-space: nowrap;
    }

    .btn:active { transform: scale(0.97); }

    .btn-primary {
      background: linear-gradient(135deg, var(--clr-saffron) 0%, var(--clr-maroon) 100%);
      color: white;
    }
    .btn-primary:hover { opacity: 0.9; box-shadow: var(--shadow-md); }

    .btn-secondary {
      background: var(--clr-surface);
      color: var(--clr-text);
      border: 1.5px solid var(--clr-border);
    }
    .btn-secondary:hover { border-color: var(--clr-saffron); color: var(--clr-saffron); }

    .btn-gold {
      background: linear-gradient(135deg, var(--clr-gold) 0%, var(--clr-saffron-light) 100%);
      color: var(--clr-maroon-dark);
    }

    .btn-success { background: var(--clr-success); color: white; }
    .btn-danger { background: var(--clr-danger); color: white; }
    .btn-sm { padding: 6px 14px; font-size: 13px; }
    .btn-lg { padding: 14px 32px; font-size: 16px; }
    .btn-block { width: 100%; justify-content: center; }

    /* Cards */
    .card {
      background: var(--clr-surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--clr-border);
      overflow: hidden;
      transition: all 0.2s ease;
    }
    .card:hover { box-shadow: var(--shadow-md); }
    .card-body { padding: 20px; }

    /* Form elements */
    .form-group { margin-bottom: 16px; }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--clr-text);
      margin-bottom: 6px;
      letter-spacing: 0.3px;
    }
    .form-input {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid var(--clr-border);
      border-radius: var(--radius-sm);
      font-size: 14px;
      background: var(--clr-white);
      color: var(--clr-text);
      transition: border-color 0.2s;
      outline: none;
    }
    .form-input:focus { border-color: var(--clr-saffron); box-shadow: 0 0 0 3px rgba(232,101,46,0.1); }
    .form-input::placeholder { color: var(--clr-text-muted); }

    select.form-input { cursor: pointer; appearance: auto; }
    textarea.form-input { resize: vertical; min-height: 80px; }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      cursor: pointer;
    }
    .checkbox-label input[type="checkbox"] {
      width: 18px; height: 18px;
      accent-color: var(--clr-saffron);
    }

    /* Profile Avatar */
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-weight: 700;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .avatar-sm { width: 36px; height: 36px; font-size: 13px; }
    .avatar-md { width: 48px; height: 48px; font-size: 16px; }
    .avatar-lg { width: 72px; height: 72px; font-size: 24px; }
    .avatar-xl { width: 120px; height: 120px; font-size: 40px; }
    .avatar-bride { background: linear-gradient(135deg, #FFD1DC, #FFB6C1); color: var(--clr-maroon); }
    .avatar-groom { background: linear-gradient(135deg, #B8D4E3, #87CEEB); color: #1a3a5c; }

    /* Badge */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .badge-bride { background: #FFE8ED; color: var(--clr-maroon); }
    .badge-groom { background: #E3F0F8; color: #1a3a5c; }
    .badge-active { background: #E6F9EE; color: #1B7A3D; }
    .badge-pending { background: #FFF3E0; color: #E65100; }
    .badge-married { background: #F3E8FF; color: #6B21A8; }
    .badge-approved { background: #E6F9EE; color: #1B7A3D; }
    .badge-rejected { background: #FEE2E2; color: var(--clr-danger); }

    /* Stat Card */
    .stat-card {
      background: var(--clr-surface);
      border-radius: var(--radius-md);
      padding: 20px;
      border: 1px solid var(--clr-border);
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .stat-icon {
      width: 48px; height: 48px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-value { font-size: 28px; font-weight: 700; font-family: var(--font-display); line-height: 1.2; }
    .stat-label { font-size: 13px; color: var(--clr-text-muted); margin-top: 2px; }

    /* Table */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 16px; text-align: left; font-size: 14px; }
    th { font-weight: 600; color: var(--clr-text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--clr-border); }
    td { border-bottom: 1px solid var(--clr-border); }
    tr:hover td { background: var(--clr-surface-alt); }

    /* Notification dot */
    .notif-dot {
      width: 8px; height: 8px;
      background: var(--clr-saffron);
      border-radius: 50%;
      position: absolute;
      top: -2px; right: -2px;
    }

    /* Tabs */
    .tabs { display: flex; border-bottom: 2px solid var(--clr-border); gap: 4px; overflow-x: auto; }
    .tab {
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 500;
      color: var(--clr-text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      white-space: nowrap;
      background: none;
      border-top: none;
      border-left: none;
      border-right: none;
      transition: all 0.2s;
    }
    .tab:hover { color: var(--clr-saffron); }
    .tab.active { color: var(--clr-saffron); border-bottom-color: var(--clr-saffron); font-weight: 600; }

    /* Steps */
    .steps { display: flex; align-items: center; gap: 0; margin-bottom: 32px; }
    .step-item {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }
    .step-circle {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
      border: 2px solid var(--clr-border);
      color: var(--clr-text-muted);
      background: var(--clr-white);
    }
    .step-circle.active { background: var(--clr-saffron); color: white; border-color: var(--clr-saffron); }
    .step-circle.done { background: var(--clr-success); color: white; border-color: var(--clr-success); }
    .step-line { flex: 1; height: 2px; background: var(--clr-border); margin: 0 8px; }
    .step-line.done { background: var(--clr-success); }
    .step-label { font-size: 12px; color: var(--clr-text-muted); display: none; }

    /* Notification item */
    .notif-item {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--clr-border);
      cursor: pointer;
      transition: background 0.15s;
    }
    .notif-item:hover { background: var(--clr-surface-alt); }
    .notif-item.unread { background: #FFF8F0; }
    .notif-icon {
      width: 40px; height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* Animations */
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .animate-in { animation: fadeIn 0.4s ease forwards; }
    .animate-slide { animation: slideIn 0.3s ease forwards; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--clr-border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--clr-text-muted); }

    /* Layout */
    .page-container { max-width: 1200px; margin: 0 auto; padding: 0 16px; }

    /* Responsive */
    @media (max-width: 768px) {
      .hide-mobile { display: none !important; }
      .step-label { display: none !important; }
    }
    @media (min-width: 769px) {
      .hide-desktop { display: none !important; }
      .step-label { display: block; }
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 48px 20px;
      color: var(--clr-text-muted);
    }
    .empty-state svg { opacity: 0.3; margin-bottom: 16px; }

    /* Modal overlay */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }
    .modal-content {
      background: var(--clr-white);
      border-radius: var(--radius-lg);
      max-width: 560px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: var(--shadow-xl);
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--clr-border);
    }
    .modal-body { padding: 24px; }
  `}</style>
  );
}
