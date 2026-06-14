/**
 * PhoneInput — reusable component with country-code selector + phone number field.
 *
 * Props:
 *   value        : full value stored as "COUNTRYCODE|NUMBER", e.g. "+91|9876543210"
 *   onChange(v)  : called with the combined string "+91|9876543210"
 *   placeholder  : optional placeholder for the number field (default: "Phone number")
 *   maxLength    : optional max digits (default: 15)
 *   required     : boolean
 *   disabled     : boolean
 *   className    : extra class for the wrapper
 *
 * Helper exports:
 *   parsePhone(v)   → { code: "+91", number: "9876543210" }
 *   formatPhone(v)  → "+91 9876543210"  (for display)
 *   waLink(v)       → "https://wa.me/919876543210"  (WhatsApp URL)
 */

import React, { useState } from "react";

// ── Country list ─────────────────────────────────────────────────────────────
export const COUNTRY_CODES = [
  { code: "+91",  flag: "🇮🇳", name: "India" },
  { code: "+1",   flag: "🇺🇸", name: "USA / Canada" },
  { code: "+44",  flag: "🇬🇧", name: "UK" },
  { code: "+61",  flag: "🇦🇺", name: "Australia" },
  { code: "+65",  flag: "🇸🇬", name: "Singapore" },
  { code: "+60",  flag: "🇲🇾", name: "Malaysia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+973", flag: "🇧🇭", name: "Bahrain" },
  { code: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "+64",  flag: "🇳🇿", name: "New Zealand" },
  { code: "+49",  flag: "🇩🇪", name: "Germany" },
  { code: "+33",  flag: "🇫🇷", name: "France" },
  { code: "+41",  flag: "🇨🇭", name: "Switzerland" },
  { code: "+31",  flag: "🇳🇱", name: "Netherlands" },
  { code: "+46",  flag: "🇸🇪", name: "Sweden" },
  { code: "+47",  flag: "🇳🇴", name: "Norway" },
  { code: "+45",  flag: "🇩🇰", name: "Denmark" },
  { code: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "+81",  flag: "🇯🇵", name: "Japan" },
  { code: "+82",  flag: "🇰🇷", name: "South Korea" },
  { code: "+86",  flag: "🇨🇳", name: "China" },
  { code: "+94",  flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+92",  flag: "🇵🇰", name: "Pakistan" },
  { code: "+27",  flag: "🇿🇦", name: "South Africa" },
  { code: "+55",  flag: "🇧🇷", name: "Brazil" },
  { code: "+52",  flag: "🇲🇽", name: "Mexico" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Parse stored value "CODE|NUMBER" → { code, number } */
export function parsePhone(value = "") {
  if (!value) return { code: "+91", number: "" };
  if (value.includes("|")) {
    const [code, ...rest] = value.split("|");
    return { code: code || "+91", number: rest.join("|") };
  }
  // International format without pipe (e.g. "+919443408662" saved by backend).
  // Try to match the longest known country code prefix first to avoid mis-splitting.
  if (value.startsWith("+")) {
    // Sort codes longest-first so "+971" is tried before "+97", etc.
    const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    for (const { code } of sorted) {
      if (value.startsWith(code)) {
        const number = value.slice(code.length);
        // Only accept if the remaining part looks like digits (not another code)
        if (number && /^\d/.test(number)) {
          return { code, number };
        }
      }
    }
    // Unknown country code — return as-is with +91 default
    return { code: "+91", number: value };
  }
  // legacy: plain number without code → assume +91
  return { code: "+91", number: value };
}

/**
 * Convert stored "+91|9876543210" → international string "+919876543210"
 * Safe to pass to the backend — no pipe character.
 * Legacy plain numbers (e.g. "9876543210") are returned as-is.
 */
export function toInternational(value = "") {
  const { code, number } = parsePhone(value);
  if (!number) return "";
  // Strip leading zeros from the subscriber number
  const digits = number.replace(/^0+/, "");
  return `${code}${digits}`;
}

/** Display helper: "+91 9876543210" */
export function formatPhone(value = "") {
  const { code, number } = parsePhone(value);
  if (!number) return "";
  return `${code} ${number}`;
}

/** WhatsApp URL: strips leading 0s, prepends country code digits */
export function waLink(value = "") {
  const { code, number } = parsePhone(value);
  if (!number) return "#";
  const digits = code.replace(/\D/g, "") + number.replace(/^0+/, "");
  return `https://wa.me/${digits}`;
}

/** Returns true if value has both a code and at least 5 digits */
export function isValidPhone(value = "") {
  const { number } = parsePhone(value);
  return number.replace(/\D/g, "").length >= 5;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function PhoneInput({
  value = "",
  onChange,
  placeholder = "Phone number",
  maxLength = 15,
  required = false,
  disabled = false,
  className = "",
}) {
  const { code, number } = parsePhone(value);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = COUNTRY_CODES.find(c => c.code === code) || COUNTRY_CODES[0];

  const filtered = search.trim()
    ? COUNTRY_CODES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.includes(search)
      )
    : COUNTRY_CODES;

  const pick = (c) => {
    setOpen(false);
    setSearch("");
    onChange?.(`${c.code}|${number}`);
  };

  const onNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    onChange?.(`${code}|${digits}`);
  };

  return (
    <div className={`phone-input-wrapper ${className}`} style={{ position: "relative", display: "flex", gap: 0 }}>
      {/* Country code button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "0 10px",
          border: "1.5px solid var(--clr-border)",
          borderRight: "none",
          borderRadius: "8px 0 0 8px",
          background: "var(--clr-bg-subtle, #f9fafb)",
          cursor: disabled ? "default" : "pointer",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--clr-text)",
          whiteSpace: "nowrap",
          minWidth: 80,
          height: "40px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18 }}>{selected.flag}</span>
        <span>{selected.code}</span>
        <span style={{ fontSize: 10, marginLeft: 2, opacity: 0.6 }}>▼</span>
      </button>

      {/* Number input */}
      <input
        type="tel"
        className="form-input"
        value={number}
        onChange={onNumberChange}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        style={{
          borderRadius: "0 8px 8px 0",
          borderLeft: "none",
          flex: 1,
          minWidth: 0,
        }}
      />

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 999,
            background: "#fff",
            border: "1.5px solid var(--clr-border)",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
            minWidth: 260,
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            marginTop: 4,
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Search country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: "none",
              borderBottom: "1px solid var(--clr-border)",
              padding: "8px 12px",
              fontSize: 13,
              outline: "none",
              flexShrink: 0,
            }}
          />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => pick(c)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 14px",
                  border: "none",
                  background: c.code === code ? "var(--clr-saffron-light, #fff7ed)" : "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  textAlign: "left",
                  fontWeight: c.code === code ? 700 : 400,
                }}
              >
                <span style={{ fontSize: 18 }}>{c.flag}</span>
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ color: "var(--clr-text-muted)", fontWeight: 600 }}>{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: "12px 14px", color: "var(--clr-text-muted)", fontSize: 13 }}>
                No country found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {open && (
        <div
          onClick={() => { setOpen(false); setSearch(""); }}
          style={{ position: "fixed", inset: 0, zIndex: 998 }}
        />
      )}
    </div>
  );
}
