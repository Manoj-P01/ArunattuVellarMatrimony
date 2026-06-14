// ─── Rasi (12 zodiac signs) ────────────────────────────────────────────────
export const RASIS = [
  { id: "mesham",     en: "Mesham (Aries)",       ta: "மேஷம்" },
  { id: "rishabam",   en: "Rishabam (Taurus)",     ta: "ரிஷபம்" },
  { id: "midhunam",   en: "Midhunam (Gemini)",     ta: "மிதுனம்" },
  { id: "kadagam",    en: "Kadagam (Cancer)",      ta: "கடகம்" },
  { id: "simmam",     en: "Simmam (Leo)",          ta: "சிம்மம்" },
  { id: "kanni",      en: "Kanni (Virgo)",         ta: "கன்னி" },
  { id: "thulam",     en: "Thulam (Libra)",        ta: "துலாம்" },
  { id: "viruchigam", en: "Viruchigam (Scorpio)",  ta: "விருச்சிகம்" },
  { id: "thanusu",    en: "Thanusu (Sagittarius)", ta: "தனுசு" },
  { id: "magaram",    en: "Magaram (Capricorn)",   ta: "மகரம்" },
  { id: "kumbam",     en: "Kumbam (Aquarius)",     ta: "கும்பம்" },
  { id: "meenam",     en: "Meenam (Pisces)",       ta: "மீனம்" },
];

// ─── Natchathirams with Rasi mapping and Patham count ─────────────────────
// Each star spans across rasis; we store the *primary* rasi (where most padas fall)
// rasi: array of rasi ids this star covers (first = primary for ≥2 padas)
export const NATCHATHIRAMS = [
  { id: "ashwini",       en: "Ashwini",        ta: "அஸ்வினி",      rasis: ["mesham"],                    padams: 4 },
  { id: "bharani",       en: "Bharani",         ta: "பரணி",         rasis: ["mesham"],                    padams: 4 },
  { id: "karthigai",     en: "Karthigai",       ta: "கார்த்திகை",   rasis: ["mesham","rishabam"],         padams: 4, raseSplit: { mesham: [1], rishabam: [2,3,4] } },
  { id: "rohini",        en: "Rohini",          ta: "ரோகிணி",       rasis: ["rishabam"],                  padams: 4 },
  { id: "mirugashirisham",en:"Mirugashirisham", ta: "மிருகசீரிஷம்", rasis: ["rishabam","midhunam"],       padams: 4, raseSplit: { rishabam: [1,2], midhunam: [3,4] } },
  { id: "thiruvathirai", en: "Thiruvathirai",   ta: "திருவாதிரை",   rasis: ["midhunam"],                  padams: 4 },
  { id: "punarpoosam",   en: "Punarpoosam",     ta: "புனர்பூசம்",   rasis: ["midhunam","kadagam"],        padams: 4, raseSplit: { midhunam: [1,2,3], kadagam: [4] } },
  { id: "poosam",        en: "Poosam",          ta: "பூசம்",         rasis: ["kadagam"],                   padams: 4 },
  { id: "ayilyam",       en: "Ayilyam",         ta: "ஆயில்யம்",     rasis: ["kadagam"],                   padams: 4 },
  { id: "magam",         en: "Magam",           ta: "மகம்",          rasis: ["simmam"],                    padams: 4 },
  { id: "pooram",        en: "Pooram",          ta: "பூரம்",         rasis: ["simmam"],                    padams: 4 },
  { id: "uthiram",       en: "Uthiram",         ta: "உத்திரம்",      rasis: ["simmam","kanni"],            padams: 4, raseSplit: { simmam: [1], kanni: [2,3,4] } },
  { id: "hastham",       en: "Hastham",         ta: "ஹஸ்தம்",       rasis: ["kanni"],                     padams: 4 },
  { id: "chithirai",     en: "Chithirai",       ta: "சித்திரை",     rasis: ["kanni","thulam"],            padams: 4, raseSplit: { kanni: [1,2], thulam: [3,4] } },
  { id: "swathi",        en: "Swathi",          ta: "சுவாதி",        rasis: ["thulam"],                    padams: 4 },
  { id: "visakam",       en: "Visakam",         ta: "விசாகம்",       rasis: ["thulam","viruchigam"],       padams: 4, raseSplit: { thulam: [1,2,3], viruchigam: [4] } },
  { id: "anusham",       en: "Anusham",         ta: "அனுஷம்",       rasis: ["viruchigam"],                padams: 4 },
  { id: "kettai",        en: "Kettai",          ta: "கேட்டை",       rasis: ["viruchigam"],                padams: 4 },
  { id: "moolam",        en: "Moolam",          ta: "மூலம்",         rasis: ["thanusu"],                   padams: 4 },
  { id: "pooradam",      en: "Pooradam",        ta: "பூராடம்",       rasis: ["thanusu"],                   padams: 4 },
  { id: "uthiradam",     en: "Uthiradam",       ta: "உத்திராடம்",    rasis: ["thanusu","magaram"],         padams: 4, raseSplit: { thanusu: [1], magaram: [2,3,4] } },
  { id: "thiruvonam",    en: "Thiruvonam",      ta: "திருவோணம்",    rasis: ["magaram"],                   padams: 4 },
  { id: "avittam",       en: "Avittam",         ta: "அவிட்டம்",      rasis: ["magaram","kumbam"],          padams: 4, raseSplit: { magaram: [1,2], kumbam: [3,4] } },
  { id: "sathayam",      en: "Sathayam",        ta: "சதயம்",         rasis: ["kumbam"],                    padams: 4 },
  { id: "poorattathi",   en: "Poorattathi",     ta: "பூரட்டாதி",     rasis: ["kumbam","meenam"],           padams: 4, raseSplit: { kumbam: [1,2,3], meenam: [4] } },
  { id: "uthirattathi",  en: "Uthirattathi",    ta: "உத்திரட்டாதி",  rasis: ["meenam"],                    padams: 4 },
  { id: "revathi",       en: "Revathi",         ta: "ரேவதி",         rasis: ["meenam"],                    padams: 4 },
];

// Get natchathirams that belong to a given rasi id
export function getNatchathiramsByRasi(rasiId) {
  return NATCHATHIRAMS.filter(n => n.rasis.includes(rasiId));
}

// Get available padams for a natchathiram + rasi combination
export function getPadamsForRasi(natchathiramId, rasiId) {
  const n = NATCHATHIRAMS.find(x => x.id === natchathiramId);
  if (!n) return [];
  if (n.raseSplit && n.raseSplit[rasiId]) return n.raseSplit[rasiId];
  return Array.from({ length: n.padams }, (_, i) => i + 1);
}

// ─── Dosham types ──────────────────────────────────────────────────────────
export const DOSHAM_TYPES = [
  { id: "sutha",           en: "Sutha Kathagam (No Dosham)",        ta: "சுத்த கதாகம் (தோஷம் இல்லை)" },
  { id: "sevvai",          en: "Sevvai Dosham (Mars)",              ta: "செவ்வாய் தோஷம்" },
  { id: "ragu_kedhu",      en: "Ragu / Kedhu Dosham",               ta: "ராகு / கேது தோஷம்" },
  { id: "sevvai_ragu_kedhu", en: "Both Sevvai + Ragu/Kedhu Dosham", ta: "செவ்வாய் + ராகு/கேது தோஷம்" },
];

// The 12 houses (Lagnam positions)
export const LAGNAM_POSITIONS = [
  { id: "1",  en: "1st House (Lagnam)",    ta: "லக்னம் (1ம் இடம்)" },
  { id: "2",  en: "2nd House (Dhanam)",    ta: "தனம் (2ம் இடம்)" },
  { id: "3",  en: "3rd House (Sahodar)",   ta: "சகோதரம் (3ம் இடம்)" },
  { id: "4",  en: "4th House (Maatham)",   ta: "மாதம் (4ம் இடம்)" },
  { id: "5",  en: "5th House (Puthirar)",  ta: "புத்திரர் (5ம் இடம்)" },
  { id: "6",  en: "6th House (Shatru)",    ta: "சத்ரு (6ம் இடம்)" },
  { id: "7",  en: "7th House (Kalathram)", ta: "கலத்திரம் (7ம் இடம்)" },
  { id: "8",  en: "8th House (Ayul)",      ta: "ஆயுள் (8ம் இடம்)" },
  { id: "9",  en: "9th House (Bhagyam)",   ta: "பாக்யம் (9ம் இடம்)" },
  { id: "10", en: "10th House (Kariyam)",  ta: "கார்யம் (10ம் இடம்)" },
  { id: "11", en: "11th House (Labam)",    ta: "லாபம் (11ம் இடம்)" },
  { id: "12", en: "12th House (Vyayam)",   ta: "வியாயம் (12ம் இடம்)" },
];
