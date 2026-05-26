// ============================================================
// utils/api.js — PhishGuard AI Backend API Client
// ============================================================

const BACKEND_URL = "https://rohanv56-phishing-detection-api.hf.space"; // ← Hugging Face Space

const API_TIMEOUT_MS = 12000; // 12 seconds (Render cold starts can be slow)

/**
 * Generic fetch with timeout + error handling
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
    if (err.name === "AbortError") {
      throw new Error("Request timed out — backend may be waking up, try again.");
    }
    throw err;
  }
}

/**
 * POST /scan-url
 * @param {string} url - URL to scan
 * @returns {Promise<{threat_level: string, confidence: number, reasons: string[], is_phishing: boolean, virustotal_count?: number}>}
 */
export async function scanUrl(url) {
  return fetchWithTimeout(`${BACKEND_URL}/api/v1/scan-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

/**
 * POST /scan-sms
 * @param {string} text - SMS/message text
 * @returns {Promise<{threat_level: string, confidence: number, reasons: string[], is_phishing: boolean}>}
 */
export async function scanSms(text) {
  return fetchWithTimeout(`${BACKEND_URL}/api/v1/scan-sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

/**
 * POST /report-threat
 * @param {string} url - URL to report
 * @param {string} type - threat type description
 */
export async function reportThreat(url, type = "phishing") {
  return fetchWithTimeout(`${BACKEND_URL}/api/v1/report-threat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, type, source: "chrome_extension" }),
  });
}

/**
 * GET /threat-history
 * @returns {Promise<Array>}
 */
export async function getThreatHistory() {
  return fetchWithTimeout(`${BACKEND_URL}/api/v1/threat-history`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

export { BACKEND_URL };
