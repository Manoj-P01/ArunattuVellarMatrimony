// ─── 15 Arunattu Vellalar Kothirams ──────────────────────────────────────────
// Each entry: en = English transliteration, ta = Tamil name, alts = alternate spellings
export const AVS_KOTHIRAMS = [
  {
    en: "Alathudaiyaan",//1
    ta: "ஆலத்துடையான்"
  },
  {
    en: "Edhumaludaiyaan",//2
    ta: "எதுமலுடையான்"
  },
  {
    en: "Kalaththudaiyaan",//3
    ta: "களத்துடையான்"
  },
  {
    en: "Kalapplaan (Valamudaiyaan)",//4
    ta: "களப்பாளன் (வளமுடையான்)"
  },
  {
    en: "Kaarudaiyaan",//5
    ta: "காருடையான்"
  },
  {
    en: "Gunakkoththudaiyaan",//6
    ta: "குணக்கொத்துடையான்"
  },
  {
    en: "Kuruvalludaiyaan",//7
    ta: "குருவலுடையான்"
  },
  {
    en: "Kooththudaiyaan",//8
    ta: "கூத்துடையான்"
  },
  {
    en: "Konnakkudaiyaan",//9
    ta: "கொன்னக்குடையான்",
  },
  {
    en: "Koattudaiyaan",//10
    ta: "கோட்டுடையான்"
  },
  {
    en: "Koanudaiyaan",//11
    ta: "கோனுடையான்"
  },
  {
    en: "Samayamandhiri",//12
    ta: "சமயமந்திரி",
  },
  {
    en: "Sanamangalaththudaiyaan",//13
    ta: "சனமங்கலத்துடையான்",
  },
  {
    en: "Saaththudaiyaan",//14
    ta: "சாத்துடையான்",
  },
  {
    en: "Siruthaludaiyaan",//15
    ta: "சிறுதலுடையான்",
  },
  {
    en: "Thiruchchangudaiyaan",//16
    ta: "திருச்சங்குடையான்"
  },
  {
    en: "Thetthamangalaththudaiyaan",//17
    ta: "தெத்தமங்கலத்துடையான்"
  }, {
    en: "Thevangudaiyaan",//18
    ta: "தேவங்குடையான்"
  }, {
    en: "Naththamudaiyaan",//19
    ta: "நத்தமுடையான்"
  }, {
    en: "Nalludaiyaan",//20
    ta: "நல்லுடையான்"
  }, {
    en: "Nimmaludaiyaan",//21
    ta: "நிம்மலுடையான்"
  },
  {
    en: "Panaiyadiyaan",//22
    ta: "பனையடியான்"
  },
  {
    en: "Paavaludaiyaan",//23
    ta: "பாவலுடையான்"
  },
  {
    en: "Poondiludaiyaan",//24
    ta: "பூண்டிலுடையான்"
  },
  {
    en: "Marududaiyaan",//25
    ta: "மருதுடையான்"
  },
  {
    en: "Maaththudaiyaan",//26
    ta: "மாத்துடையான்"
  },
  {
    en: "Mirattudaiyaan",//27
    ta: "மிரட்டுடையான்"
  },
  {
    en: "Murukkaththudaiyaan",//28
    ta: "முருக்கத்துடையான்"
  },
  {
    en: "Valavuthirai Nallathambi",//29
    ta: "வளவுத்திரை நல்லதம்பி"
  },
  {
    en: "Vilvaraayan",//30
    ta: "வில்வராயன்"
  },
  {
    en: "Vennavaludaiyaan",//31
    ta: "வெண்ணாவலுடையான்"
  },
  {
    en: "Chakravarththi",//32
    ta: "சக்கரவர்த்தி"
  }
];

// ─── Fuzzy similarity (Levenshtein-based) ─────────────────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(s1, s2) {
  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return (maxLen - levenshtein(a, b)) / maxLen;
}

// ─── Validate kothiram against the 15 known AVS kothirams ────────────────────
// Returns { matched: bool, bestMatch: string, score: number, kothiram: obj|null }
export function validateKothiram(input) {
  if (!input || !input.trim()) return { matched: false, score: 0, bestMatch: "", kothiram: null };
  const inp = input.trim();
  let best = { score: 0, match: "", kothiram: null };

  for (const k of AVS_KOTHIRAMS) {
    // Compare against English name
    const enScore = similarity(inp, k.en);
    if (enScore > best.score) best = { score: enScore, match: k.en, kothiram: k };

    // Compare against Tamil name
    const taScore = similarity(inp, k.ta);
    if (taScore > best.score) best = { score: taScore, match: k.ta, kothiram: k };

    // Compare against alternate spellings
    for (const alt of k.alts) {
      const altScore = similarity(inp, alt);
      if (altScore > best.score) best = { score: altScore, match: k.en, kothiram: k };
    }
  }

  return {
    matched: best.score >= 0.70,
    score: best.score,
    bestMatch: best.match,
    kothiram: best.kothiram,
  };
}

// ─── Get display label for a kothiram ────────────────────────────────────────
export function getKothiramLabel(enName) {
  const k = AVS_KOTHIRAMS.find(x => x.en.toLowerCase() === enName?.toLowerCase());
  return k ? `${k.en} (${k.ta})` : enName || "";
}
