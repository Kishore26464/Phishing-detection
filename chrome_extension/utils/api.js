// ============================================================
// utils/api.js — PhishGuard AI Backend API Client
// ============================================================

const BACKEND_URL = "https://rohanv56-phishing-api.hf.space/api/v1";
const API_TIMEOUT_MS = 20000;

/**
 * Extract the 30 binary features the ML model expects from a URL.
 * Mirrors the feature set in train_url_classifier.py exactly.
 */
function extractFeatures(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return {}; }

  const full    = rawUrl.toLowerCase();
  const host    = parsed.hostname.toLowerCase();
  const path    = parsed.pathname.toLowerCase();
  const isHttps = parsed.protocol === "https:";

  // UsingIP — hostname is a raw IP address
  const UsingIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ? 1 : 0;

  // LongURL — over 75 characters
  const LongURL = rawUrl.length > 75 ? 1 : 0;

  // ShortURL — known URL shorteners
  const shorteners = ["bit.ly","tinyurl","goo.gl","ow.ly","t.co","is.gd","buff.ly","adf.ly","tiny.cc"];
  const ShortURL = shorteners.some(s => host.includes(s)) ? 1 : 0;

  // Symbol@ — @ in URL
  const SymbolAt = full.includes("@") ? 1 : 0;

  // Redirecting// — double slash after protocol
  const afterProto = rawUrl.slice(rawUrl.indexOf("//") + 2);
  const RedirectingSlash = afterProto.includes("//") ? 1 : 0;

  // PrefixSuffix- — hyphen in domain name
  const PrefixSuffix = host.includes("-") ? 1 : 0;

  // SubDomains — more than 2 dots in hostname (e.g. sub.sub.domain.com)
  const SubDomains = (host.match(/\./g) || []).length > 2 ? 1 : 0;

  // HTTPS — 1 if NO HTTPS (risky), 0 if HAS HTTPS (safe)
  const HTTPS = isHttps ? 0 : 1;

  // DomainRegLen — domain appears newly registered (heuristic: short numeric or random hostname)
  const DomainRegLen = /[0-9]{4,}/.test(host) || host.replace(/[^a-z]/g,"").length < 4 ? 1 : 0;

  // Favicon — can't check remotely; default 0
  const Favicon = 0;

  // NonStdPort — non-standard port used
  const NonStdPort = (parsed.port && !["80","443","8080","8443"].includes(parsed.port)) ? 1 : 0;

  // HTTPSDomainURL — "https" appears in domain name itself (fake https signal)
  const HTTPSDomainURL = host.includes("https") ? 1 : 0;

  // RequestURL — external resources heuristic (path has external indicators)
  const RequestURL = (full.match(/https?:\/\//g) || []).length > 1 ? 1 : 0;

  // AnchorURL — fragment with redirect-like content
  const AnchorURL = parsed.hash.length > 10 ? 1 : 0;

  // LinksInScriptTags — can't check statically; default 0
  const LinksInScriptTags = 0;

  // ServerFormHandler — path contains form-like patterns
  const ServerFormHandler = /\/(login|signin|submit|verify|update|confirm|secure)/.test(path) ? 1 : 0;

  // InfoEmail — mailto or email pattern
  const InfoEmail = full.includes("mailto:") || full.includes("@gmail") || full.includes("@yahoo") ? 1 : 0;

  // AbnormalURL — hostname not in full URL (shouldn't happen normally)
  const AbnormalURL = !full.includes(host) ? 1 : 0;

  // WebsiteForwarding — multiple redirects heuristic via URL params
  const WebsiteForwarding = (full.includes("redirect") || full.includes("forward") || full.includes("goto")) ? 1 : 0;

  // StatusBarCust — javascript: in URL
  const StatusBarCust = full.includes("javascript:") ? 1 : 0;

  // DisableRightClick — can't check statically; default 0
  const DisableRightClick = 0;

  // UsingPopupWindow — can't check statically; default 0
  const UsingPopupWindow = 0;

  // IframeRedirection — can't check statically; default 0
  const IframeRedirection = 0;

  // AgeofDomain — heuristic: free TLDs tend to be newer
  const freeTLDs = [".tk",".ml",".ga",".cf",".gq",".xyz",".top",".click",".pw",".cc"];
  const AgeofDomain = freeTLDs.some(t => host.endsWith(t)) ? 1 : 0;

  // DNSRecording — IP-based or no proper domain = likely no DNS record
  const DNSRecording = UsingIP;

  // WebsiteTraffic — very long or obfuscated URLs tend to have no traffic
  const WebsiteTraffic = rawUrl.length > 150 ? 1 : 0;

  // PageRank — heuristic: suspicious TLD or no HTTPS = low rank
  const PageRank = (!isHttps || AgeofDomain) ? 1 : 0;

  // GoogleIndex — heuristic: IP-based or free TLD = likely not indexed
  const GoogleIndex = (UsingIP || AgeofDomain) ? 1 : 0;

  // LinksPointingToPage — can't check statically; default 0
  const LinksPointingToPage = 0;

  // StatsReport — known phishing/malware report heuristic
  const phishingKeywords = ["secure","verify","account","update","banking","paypal","amazon","apple","microsoft","login","signin","confirm","credential","wallet","otp","kyc","aadhar","reward","prize","winner"];
  const keywordHits = phishingKeywords.filter(k => full.includes(k)).length;
  const StatsReport = keywordHits >= 2 ? 1 : 0;

  return {
    UsingIP, LongURL, ShortURL, "Symbol@": SymbolAt,
    "Redirecting//": RedirectingSlash, "PrefixSuffix-": PrefixSuffix,
    SubDomains, HTTPS, DomainRegLen, Favicon, NonStdPort,
    HTTPSDomainURL, RequestURL, AnchorURL, LinksInScriptTags,
    ServerFormHandler, InfoEmail, AbnormalURL, WebsiteForwarding,
    StatusBarCust, DisableRightClick, UsingPopupWindow, IframeRedirection,
    AgeofDomain, DNSRecording, WebsiteTraffic, PageRank,
    GoogleIndex, LinksPointingToPage, StatsReport,
  };
}

/**
 * Normalize backend response — handles different field conventions
 */
function normalizeResponse(raw, url) {
  if (!raw || typeof raw !== "object") throw new Error("Empty response from backend");

  let threat_level = raw.threat_level || raw.label || raw.prediction || null;
  if (!threat_level) {
    if (raw.is_phishing === true)  threat_level = "dangerous";
    if (raw.is_phishing === false) threat_level = "safe";
  }
  const tl = (threat_level || "").toLowerCase();
  if (["phishing","malicious","dangerous","high","critical"].some(x => tl.includes(x))) threat_level = "dangerous";
  else if (["suspicious","medium","moderate","warning"].some(x => tl.includes(x)))     threat_level = "suspicious";
  else                                                                                   threat_level = "safe";

  let confidence = raw.confidence ?? raw.score ?? raw.probability ?? null;
  if (typeof confidence === "number" && confidence > 1) confidence = confidence / 100;
  if (confidence === null) confidence = threat_level === "safe" ? 0.85 : 0.75;

  const is_phishing = raw.is_phishing ?? (threat_level === "dangerous");

  let reasons = raw.reasons || raw.flags || raw.indicators || [];
  if (typeof reasons === "string") reasons = [reasons];
  if (!Array.isArray(reasons)) reasons = [];

  // Pull top features from ml_result if reasons is empty
  if (reasons.length === 0 && raw.ml_result?.top_features) {
    reasons = raw.ml_result.top_features
      .filter(f => f.flagged)
      .map(f => `${f.feature}: ${f.risk_contribution || "risk factor"}`);
  }

  const virustotal_count = raw.virustotal?.positives ?? raw.virustotal_count ?? null;

  return {
    threat_level,
    confidence,
    is_phishing,
    reasons,
    virustotal_count,
    scan_time_ms: raw.scan_time_ms ?? null,
    safe_browsing_flagged: raw.safe_browsing_flagged ?? false,
    scanned_at: Date.now(),
    url,
  };
}

/**
 * Generic fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error("Request timed out — space may be waking up, try again.");
    throw err;
  }
}

/**
 * POST /scan-url — sends URL + all 30 extracted binary features
 */
export async function scanUrl(url) {
  const features = extractFeatures(url);
  const raw = await fetchWithTimeout(`${BACKEND_URL}/scan-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, features }),
  });
  return normalizeResponse(raw, url);
}

export { BACKEND_URL };
