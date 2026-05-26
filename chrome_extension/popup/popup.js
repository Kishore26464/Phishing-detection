// ============================================================
// popup.js — PhishGuard AI Popup Logic
// ============================================================

// ── DOM refs ─────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const currentUrlEl  = $("currentUrl");
const resultCard    = $("resultCard");
const loadingState  = $("loadingState");
const resultState   = $("resultState");
const errorState    = $("errorState");
const verdictIcon   = $("verdictIcon");
const verdictLabel  = $("verdictLabel");
const verdictSub    = $("verdictSub");
const confCircle    = $("confCircle");
const confText      = $("confText");
const metricsHttps  = $("metricsHttps");
const metricsVt     = $("metricsVt");
const metricsAi     = $("metricsAi");
const reasonsSection= $("reasonsSection");
const reasonsList   = $("reasonsList");
const clientNote    = $("clientNote");
const reportBtn     = $("reportBtn");
const scanNowBtn    = $("scanNowBtn");
const errorMsg      = $("errorMsg");
const historyList   = $("historyList");
const clearHistBtn  = $("clearHistoryBtn");
const settingsToggle= $("settingsToggle");
const mainPanel     = $("mainPanel");
const settingsPanel = $("settingsPanel");

// Settings elements
const setAutoScan     = $("setAutoScan");
const setNotifications= $("setNotifications");
const setPageBanner   = $("setPageBanner");
const backendUrlInput = $("backendUrlInput");
const saveBackendBtn  = $("saveBackendBtn");

// ── State ────────────────────────────────────────────────────
let currentTab = null;
let lastResult = null;

// ── Color helpers ────────────────────────────────────────────
function resolveThreatLevel(result) {
  if (!result) return "error";
  const tl = (result.threat_level || "").toLowerCase();
  if (["dangerous", "high", "critical"].includes(tl)) return "dangerous";
  if (["suspicious", "medium", "moderate"].includes(tl)) return "suspicious";
  if (["safe", "low", "clean"].includes(tl)) return "safe";
  if (result.is_phishing) return "dangerous";
  return "safe";
}

const COLORS = {
  safe:       { accent: "#00E676", label: "SAFE",       sub: "No threats detected",        icon: "✓" },
  suspicious: { accent: "#FFB300", label: "SUSPICIOUS", sub: "Proceed with caution",        icon: "⚠" },
  dangerous:  { accent: "#FF3B3B", label: "DANGEROUS",  sub: "Phishing/malware detected",   icon: "✕" },
  error:      { accent: "#888888", label: "ERROR",      sub: "Scan could not complete",     icon: "?" },
};

// ── Show states ──────────────────────────────────────────────
function showLoading() {
  loadingState.classList.remove("hidden");
  resultState.classList.add("hidden");
  errorState.classList.add("hidden");
  resultCard.className = "result-card";
}

function showError(msg) {
  loadingState.classList.add("hidden");
  resultState.classList.add("hidden");
  errorState.classList.remove("hidden");
  errorMsg.textContent = msg || "Unknown error";
  resultCard.className = "result-card";
}

function showResult(result) {
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");
  resultState.classList.remove("hidden");

  const tl = resolveThreatLevel(result);
  const cfg = COLORS[tl] || COLORS.error;

  // Card border class
  resultCard.className = `result-card state-${tl}`;

  // Verdict
  verdictIcon.textContent = cfg.icon;
  verdictIcon.style.color = cfg.accent;
  verdictLabel.textContent = cfg.label;
  verdictLabel.style.color = cfg.accent;
  verdictSub.textContent = cfg.sub;

  // Confidence ring
  const confidence = typeof result.confidence === "number" ? result.confidence : 0;
  const pct = Math.round(confidence * 100);
  const circumference = 113; // 2 * π * 18
  const offset = circumference - (circumference * confidence);

  confCircle.style.strokeDashoffset = offset;
  confCircle.style.stroke = cfg.accent;
  confText.textContent = `${pct}%`;
  confText.style.color = cfg.accent;

  // Metrics
  try {
    const parsed = new URL(result.url || currentTab?.url || "");
    metricsHttps.textContent = parsed.protocol === "https:" ? "✓ Yes" : "✗ No";
    metricsHttps.style.color = parsed.protocol === "https:" ? "#00E676" : "#FF3B3B";
  } catch {
    metricsHttps.textContent = "—";
  }

  const vtCount = result.virustotal_count ?? result.vt_detections;
  metricsVt.textContent = vtCount != null ? `${vtCount} hits` : "—";
  metricsVt.style.color = vtCount > 0 ? "#FF3B3B" : vtCount === 0 ? "#00E676" : "#6B6B8A";

  const aiScore = result.prescreen_score != null
    ? `${result.prescreen_score}/100`
    : result.confidence != null
    ? `${pct}%`
    : "—";
  metricsAi.textContent = aiScore;
  metricsAi.style.color = cfg.accent;

  // Reasons list
  const reasons = result.reasons || [];
  if (reasons.length > 0) {
    reasonsSection.style.display = "block";
    reasonsList.innerHTML = "";
    reasons.slice(0, 6).forEach((r) => {
      const li = document.createElement("li");
      li.textContent = r;
      reasonsList.appendChild(li);
    });
  } else {
    reasonsSection.style.display = "none";
  }

  // Client-side only note
  if (result.client_side_only) {
    clientNote.classList.remove("hidden");
  } else {
    clientNote.classList.add("hidden");
  }

  // Show report button for suspicious/dangerous
  reportBtn.style.display = ["suspicious", "dangerous"].includes(tl) ? "inline-flex" : "none";
}

// ── Format relative time ─────────────────────────────────────
function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ── Render history ────────────────────────────────────────────
function renderHistory(history) {
  if (!history || history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No scans yet — browse to get started</div>';
    return;
  }

  historyList.innerHTML = "";
  history.forEach((entry) => {
    const tl = resolveThreatLevel(entry.result);
    const cfg = COLORS[tl] || COLORS.error;

    const item = document.createElement("div");
    item.className = "history-item";
    item.title = entry.url;

    const dot = document.createElement("div");
    dot.className = "history-dot";
    dot.style.background = cfg.accent;
    dot.style.boxShadow = `0 0 5px ${cfg.accent}`;

    const domain = document.createElement("div");
    domain.className = "history-domain";
    domain.textContent = entry.domain || entry.url;

    const time = document.createElement("div");
    time.className = "history-time";
    time.textContent = timeAgo(entry.timestamp);

    const level = document.createElement("div");
    level.className = `history-level lvl-${tl}`;
    level.textContent = (COLORS[tl]?.label || tl).slice(0, 4);

    item.append(dot, domain, time, level);
    historyList.appendChild(item);
  });
}

// ── Load settings into UI ────────────────────────────────────
function applySettingsToUI(settings) {
  setAutoScan.checked      = settings.autoScan      !== false;
  setNotifications.checked = settings.showNotifications !== false;
  setPageBanner.checked    = settings.showPageBanner !== false;
  if (settings.backendUrl) backendUrlInput.value = settings.backendUrl;
}

// ── Save settings from UI ────────────────────────────────────
function collectSettings() {
  return {
    autoScan:          setAutoScan.checked,
    showNotifications: setNotifications.checked,
    showPageBanner:    setPageBanner.checked,
  };
}

// ── Scan current tab ─────────────────────────────────────────
async function scanCurrentTab(forceRescan = false) {
  if (!currentTab?.url) return;

  showLoading();

  // Check cache first (unless forced)
  if (!forceRescan) {
    const cached = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "GET_CACHED_RESULT", url: currentTab.url },
        (resp) => resolve(resp?.result || null)
      );
    });
    if (cached) {
      lastResult = cached;
      showResult(cached);
      return;
    }
  }

  chrome.runtime.sendMessage(
    { type: "SCAN_URL", url: currentTab.url, tabId: currentTab.id },
    (resp) => {
      if (chrome.runtime.lastError) {
        showError(chrome.runtime.lastError.message);
        return;
      }
      if (resp?.success) {
        lastResult = resp.result;
        showResult(resp.result);
      } else {
        showError(resp?.error || "Scan failed");
      }
    }
  );
}

// ── Init ─────────────────────────────────────────────────────
async function init() {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (tab?.url) {
    try {
      const parsed = new URL(tab.url);
      currentUrlEl.textContent = parsed.hostname + parsed.pathname.slice(0, 30);
    } catch {
      currentUrlEl.textContent = tab.url.slice(0, 50);
    }
  } else {
    currentUrlEl.textContent = "— not a web page —";
  }

  // Load scan history
  chrome.runtime.sendMessage({ type: "GET_SCAN_HISTORY" }, (resp) => {
    renderHistory(resp?.history || []);
  });

  // Load settings
  chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (resp) => {
    if (resp?.settings) applySettingsToUI(resp.settings);
  });

  // Scan
  if (tab?.url?.startsWith("http")) {
    scanCurrentTab(false);
  } else {
    showError("Not a scannable page (chrome:// or about: URLs are skipped)");
    currentUrlEl.textContent = "— system page —";
  }
}

// ── Event Listeners ──────────────────────────────────────────
scanNowBtn.addEventListener("click", () => scanCurrentTab(true));

reportBtn.addEventListener("click", () => {
  if (!currentTab?.url) return;
  chrome.runtime.sendMessage(
    { type: "REPORT_THREAT", url: currentTab.url, threatType: "phishing" },
    () => {
      reportBtn.textContent = "✓ Reported";
      reportBtn.disabled = true;
      setTimeout(() => {
        reportBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Report Threat`;
        reportBtn.disabled = false;
      }, 3000);
    }
  );
});

clearHistBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" }, () => {
    renderHistory([]);
  });
});

settingsToggle.addEventListener("click", () => {
  const isHidden = settingsPanel.classList.toggle("hidden");
  mainPanel.style.display = isHidden ? "block" : "none";
});

// Auto-save settings on toggle change
[setAutoScan, setNotifications, setPageBanner].forEach((el) => {
  el.addEventListener("change", () => {
    chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: collectSettings() });
  });
});

saveBackendBtn.addEventListener("click", () => {
  const url = backendUrlInput.value.trim();
  if (!url) return;
  const settings = { ...collectSettings(), backendUrl: url };
  chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings }, () => {
    saveBackendBtn.textContent = "✓ Saved";
    setTimeout(() => (saveBackendBtn.textContent = "Save"), 2000);
  });
});

// ── Boot ─────────────────────────────────────────────────────
init();
