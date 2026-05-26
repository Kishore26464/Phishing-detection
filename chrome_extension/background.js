// ============================================================
// background.js — PhishGuard AI Service Worker
// Handles: tab monitoring, badge coloring, API scanning,
//          scan history storage, notifications
// ============================================================

import { scanUrl } from "./utils/api.js";
import { analyzeUrl, shouldSkipUrl, threatLevelToColor } from "./utils/urlAnalyzer.js";

// ── Constants ──────────────────────────────────────────────
const SCAN_HISTORY_KEY = "phishguard_scan_history";
const SETTINGS_KEY = "phishguard_settings";
const MAX_HISTORY = 10;
const SCAN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache per URL

// In-memory cache: url → { result, timestamp }
const scanCache = new Map();

// ── Default Settings ───────────────────────────────────────
const DEFAULT_SETTINGS = {
  autoScan: true,
  showNotifications: true,
  showPageBanner: true,
  blockDangerous: false,
};

// ── Helpers ────────────────────────────────────────────────
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (data) => {
      resolve({ ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) });
    });
  });
}

async function getScanHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get(SCAN_HISTORY_KEY, (data) => {
      resolve(data[SCAN_HISTORY_KEY] || []);
    });
  });
}

async function saveScanResult(url, result) {
  const history = await getScanHistory();
  const entry = {
    url,
    result,
    timestamp: Date.now(),
    domain: (() => { try { return new URL(url).hostname; } catch { return url; } })(),
  };

  // Remove duplicates for same URL, then prepend
  const filtered = history.filter((h) => h.url !== url);
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);

  return new Promise((resolve) => {
    chrome.storage.local.set({ [SCAN_HISTORY_KEY]: updated }, resolve);
  });
}

function setCachedResult(url, result) {
  scanCache.set(url, { result, timestamp: Date.now() });
}

function getCachedResult(url) {
  const cached = scanCache.get(url);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > SCAN_CACHE_TTL_MS) {
    scanCache.delete(url);
    return null;
  }
  return cached.result;
}

// ── Badge Management ────────────────────────────────────────
function setBadge(tabId, threatLevel) {
  const configs = {
    dangerous: { text: "●", color: "#FF3B3B" },
    suspicious: { text: "●", color: "#FFB300" },
    safe:       { text: "●", color: "#00E676" },
    scanning:   { text: "...", color: "#00B4D8" },
    error:      { text: "!",  color: "#888888" },
  };

  const cfg = configs[threatLevel] || configs.error;

  chrome.action.setBadgeText({ tabId, text: cfg.text });
  chrome.action.setBadgeBackgroundColor({ tabId, color: cfg.color });
}

function clearBadge(tabId) {
  chrome.action.setBadgeText({ tabId, text: "" });
}

// ── Notification ────────────────────────────────────────────
function showDangerNotification(url, result) {
  chrome.notifications.create(`phishguard-${Date.now()}`, {
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "⚠️ PhishGuard: Dangerous Site Detected",
    message: `${new URL(url).hostname} — ${result.reasons?.[0] || "Phishing site detected"}`,
    priority: 2,
  });
}

// ── Core Scan Logic ─────────────────────────────────────────
async function performScan(tabId, url) {
  if (shouldSkipUrl(url)) {
    clearBadge(tabId);
    return null;
  }

  // Return cached result if fresh
  const cached = getCachedResult(url);
  if (cached) {
    setBadge(tabId, resolveThreatLevel(cached));
    return cached;
  }

  // Show scanning badge
  setBadge(tabId, "scanning");

  // Step 1: Client-side pre-screening (instant)
  const prescreen = analyzeUrl(url);

  let finalResult;

  try {
    // Step 2: Full API scan
    const apiResult = await scanUrl(url);

    // Merge prescreen flags with API reasons
    const combinedReasons = [
      ...(apiResult.reasons || []),
      ...prescreen.flags.filter((f) => !(apiResult.reasons || []).includes(f)),
    ];

    finalResult = {
      ...apiResult,
      reasons: combinedReasons,
      prescreen_score: prescreen.score,
      prescreen_verdict: prescreen.quickVerdict,
      scanned_at: Date.now(),
      url,
    };
  } catch (err) {
    // Fallback to client-side only result
    console.warn("[PhishGuard] API scan failed, using client-side result:", err.message);

    finalResult = {
      threat_level: prescreen.quickVerdict,
      confidence: prescreen.score / 100,
      reasons: prescreen.flags,
      is_phishing: prescreen.quickVerdict === "dangerous",
      api_error: err.message,
      client_side_only: true,
      prescreen_score: prescreen.score,
      prescreen_verdict: prescreen.quickVerdict,
      scanned_at: Date.now(),
      url,
    };
  }

  // Update badge
  const tl = resolveThreatLevel(finalResult);
  setBadge(tabId, tl);

  // Save to cache + history
  setCachedResult(url, finalResult);
  await saveScanResult(url, finalResult);

  // Settings-gated side effects
  const settings = await getSettings();

  if (tl === "dangerous") {
    if (settings.showNotifications) {
      showDangerNotification(url, finalResult);
    }
    if (settings.showPageBanner) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: injectWarningBanner,
          args: [finalResult.reasons?.[0] || "Dangerous phishing site detected"],
        });
      } catch (_) { /* Tab may not support scripting */ }
    }
  }

  return finalResult;
}

function resolveThreatLevel(result) {
  if (!result) return "error";
  const tl = (result.threat_level || "").toLowerCase();
  if (["dangerous", "high", "critical"].includes(tl)) return "dangerous";
  if (["suspicious", "medium", "moderate"].includes(tl)) return "suspicious";
  if (["safe", "low", "clean"].includes(tl)) return "safe";
  // Fallback to is_phishing
  if (result.is_phishing) return "dangerous";
  return "safe";
}

// ── Warning Banner (injected into page context) ─────────────
function injectWarningBanner(reason) {
  if (document.getElementById("phishguard-warning-banner")) return;

  const banner = document.createElement("div");
  banner.id = "phishguard-warning-banner";
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 2147483647;
    background: linear-gradient(90deg, #8B0000, #FF3B3B);
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 20px rgba(255,59,59,0.6);
    animation: phishguardSlide 0.4s ease;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes phishguardSlide {
      from { transform: translateY(-100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
  `;
  document.head?.appendChild(style);

  const left = document.createElement("span");
  left.innerHTML = `<strong>⚠️ PhishGuard AI WARNING:</strong> ${reason}`;

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ Dismiss";
  closeBtn.style.cssText = `
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.4);
    color: #fff;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    margin-left: 12px;
    white-space: nowrap;
  `;
  closeBtn.onclick = () => banner.remove();

  banner.appendChild(left);
  banner.appendChild(closeBtn);
  document.documentElement.prepend(banner);
}

// ── Tab Event Listeners ─────────────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url || !tab.url.startsWith("http")) return;

  const settings = await getSettings();
  if (!settings.autoScan) return;

  performScan(tabId, tab.url);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !tab.url.startsWith("http")) return;

    const cached = getCachedResult(tab.url);
    if (cached) {
      setBadge(tabId, resolveThreatLevel(cached));
    } else {
      const settings = await getSettings();
      if (settings.autoScan) {
        performScan(tabId, tab.url);
      }
    }
  } catch (_) {}
});

// ── Message Handler (from popup & content scripts) ──────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SCAN_URL") {
    const { url, tabId } = msg;
    performScan(tabId, url)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async
  }

  if (msg.type === "GET_CACHED_RESULT") {
    const cached = getCachedResult(msg.url);
    sendResponse({ result: cached });
    return false;
  }

  if (msg.type === "GET_SCAN_HISTORY") {
    getScanHistory().then((history) => sendResponse({ history }));
    return true;
  }

  if (msg.type === "GET_SETTINGS") {
    getSettings().then((settings) => sendResponse({ settings }));
    return true;
  }

  if (msg.type === "SAVE_SETTINGS") {
    chrome.storage.local.set({ [SETTINGS_KEY]: msg.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (msg.type === "CLEAR_HISTORY") {
    chrome.storage.local.set({ [SCAN_HISTORY_KEY]: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (msg.type === "INJECT_BANNER") {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab?.id },
      func: injectWarningBanner,
      args: [msg.reason],
    }).catch(() => {});
    return false;
  }
});
