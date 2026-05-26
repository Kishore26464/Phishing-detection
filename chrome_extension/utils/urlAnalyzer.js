// ============================================================
// utils/urlAnalyzer.js — Client-side URL pattern analysis
// Runs BEFORE the API call for instant pre-screening
// ============================================================

/**
 * Extract features from a URL string (mirrors backend feature extraction)
 */
export function extractUrlFeatures(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const full = rawUrl.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  return {
    url_length: rawUrl.length,
    hostname_length: hostname.length,
    dot_count: (hostname.match(/\./g) || []).length,
    hyphen_count: (hostname.match(/-/g) || []).length,
    digit_count: (hostname.match(/\d/g) || []).length,
    has_https: parsed.protocol === "https:",
    is_ip_based: /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname),
    at_symbol: full.includes("@"),
    double_slash_redirect: (full.match(/\/\//g) || []).length > 1,
    has_port: parsed.port !== "",
    subdomain_count: hostname.split(".").length - 2,
    path_length: path.length,
    query_length: parsed.search.length,
    special_char_count: (full.match(/[!$&'()*+,;=]/g) || []).length,
    hex_chars: (full.match(/%[0-9a-f]{2}/gi) || []).length,
  };
}

// Suspicious keywords commonly found in phishing URLs
const PHISHING_KEYWORDS = [
  "login", "signin", "verify", "account", "update", "secure",
  "banking", "paypal", "amazon", "apple", "microsoft", "google",
  "netflix", "confirm", "password", "credential", "wallet",
  "support", "helpdesk", "suspended", "unlock", "validate",
  "alert", "urgent", "click", "free", "prize", "winner",
  "kyc", "otp", "aadhar", "pan", "ifsc", "upi", "reward",
];

// Legitimate TLDs less commonly used by legit sites in phishing context
const SUSPICIOUS_TLDS = [
  ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click",
  ".link", ".live", ".online", ".site", ".website", ".space",
  ".pw", ".cc", ".biz"
];

// Well-known domains that phishing sites often impersonate
const BRAND_NAMES = [
  "paypal", "amazon", "google", "apple", "microsoft", "netflix",
  "facebook", "instagram", "twitter", "linkedin", "sbi", "hdfc",
  "icici", "axis", "kotak", "paytm", "phonepe", "gpay",
];

/**
 * Run client-side heuristic checks on a URL.
 * Returns a pre-screening result before the API call.
 *
 * @param {string} rawUrl
 * @returns {{ score: number, flags: string[], quickVerdict: 'safe'|'suspicious'|'dangerous' }}
 */
export function analyzeUrl(rawUrl) {
  const flags = [];
  let score = 0; // 0–100, higher = more suspicious

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { score: 50, flags: ["Invalid or malformed URL"], quickVerdict: "suspicious" };
  }

  const full = rawUrl.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const features = extractUrlFeatures(rawUrl);

  // === Instant red flags ===
  if (features.is_ip_based) {
    flags.push("Uses raw IP address instead of domain name");
    score += 40;
  }
  if (features.at_symbol) {
    flags.push("Contains @ symbol — may redirect to different host");
    score += 30;
  }
  if (features.double_slash_redirect) {
    flags.push("Double slash redirect pattern detected");
    score += 20;
  }
  if (!features.has_https) {
    flags.push("No HTTPS — connection is not encrypted");
    score += 15;
  }

  // === Domain checks ===
  if (features.hyphen_count >= 3) {
    flags.push(`Excessive hyphens in domain (${features.hyphen_count})`);
    score += 15;
  }
  if (features.subdomain_count >= 3) {
    flags.push(`Suspicious subdomain depth (${features.subdomain_count} levels)`);
    score += 20;
  }
  if (features.dot_count >= 5) {
    flags.push("Unusual number of dots in URL");
    score += 10;
  }
  SUSPICIOUS_TLDS.forEach((tld) => {
    if (hostname.endsWith(tld)) {
      flags.push(`Suspicious TLD: ${tld}`);
      score += 25;
    }
  });

  // === Phishing keyword check ===
  const foundKeywords = PHISHING_KEYWORDS.filter((kw) => full.includes(kw));
  if (foundKeywords.length >= 3) {
    flags.push(`Multiple phishing keywords: ${foundKeywords.slice(0, 4).join(", ")}`);
    score += 25;
  } else if (foundKeywords.length >= 1) {
    flags.push(`Phishing keyword detected: ${foundKeywords[0]}`);
    score += 10;
  }

  // === Brand impersonation ===
  BRAND_NAMES.forEach((brand) => {
    if (hostname.includes(brand)) {
      // Check if it's actually the legit domain
      const isLegit =
        hostname === `${brand}.com` ||
        hostname === `www.${brand}.com` ||
        hostname.endsWith(`.${brand}.com`);
      if (!isLegit) {
        flags.push(`Possible brand impersonation: "${brand}" in domain`);
        score += 35;
      }
    }
  });

  // === URL length ===
  if (features.url_length > 100) {
    flags.push(`Unusually long URL (${features.url_length} chars)`);
    score += 10;
  }
  if (features.url_length > 200) {
    score += 10;
  }

  // === Hex / encoded chars ===
  if (features.hex_chars > 5) {
    flags.push("Many URL-encoded characters — possible obfuscation");
    score += 15;
  }

  // === Port usage ===
  if (features.has_port && !["80", "443", "8080", "8443"].includes(parsed.port)) {
    flags.push(`Non-standard port: ${parsed.port}`);
    score += 20;
  }

  score = Math.min(score, 100);

  let quickVerdict;
  if (score >= 60) quickVerdict = "dangerous";
  else if (score >= 30) quickVerdict = "suspicious";
  else quickVerdict = "safe";

  return { score, flags, quickVerdict };
}

/**
 * Check if URL is a known safe/internal URL that should be skipped
 */
export function shouldSkipUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const skipProtocols = ["chrome:", "chrome-extension:", "about:", "data:", "javascript:", "file:"];
    if (skipProtocols.includes(parsed.protocol)) return true;

    const skipHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
    if (skipHosts.includes(parsed.hostname)) return true;

    // Skip internal IPs
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) return true;

    // Skip new tab / blank pages
    if (rawUrl === "about:blank" || rawUrl === "about:newtab") return true;

    return false;
  } catch {
    return true;
  }
}

/**
 * Determine badge color based on threat level string
 */
export function threatLevelToColor(level) {
  switch ((level || "").toLowerCase()) {
    case "dangerous":
    case "high":
    case "critical":
      return "#FF3B3B";
    case "suspicious":
    case "medium":
    case "moderate":
      return "#FFB300";
    case "safe":
    case "low":
    case "clean":
      return "#00E676";
    default:
      return "#888888";
  }
}

/**
 * Format confidence as a display string
 */
export function formatConfidence(confidence) {
  if (typeof confidence !== "number") return "N/A";
  return `${Math.round(confidence * 100)}%`;
}
