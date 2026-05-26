// ============================================================
// content.js — PhishGuard AI Content Script
// Injected into every http/https page.
// Detects: fake login forms, suspicious password fields,
//          credential harvesting patterns.
// ============================================================

(function () {
  "use strict";

  // Don't run in iframes to avoid noise
  if (window.self !== window.top) return;

  const hostname = window.location.hostname.toLowerCase();
  const fullUrl = window.location.href.toLowerCase();

  // ── Fake Login Form Detection ──────────────────────────────
  const BRAND_DOMAINS = {
    paypal: "paypal.com",
    amazon: "amazon.com",
    google: "google.com",
    apple: "apple.com",
    microsoft: ["microsoft.com", "live.com", "hotmail.com", "outlook.com"],
    netflix: "netflix.com",
    facebook: "facebook.com",
    instagram: "instagram.com",
    twitter: ["twitter.com", "x.com"],
    linkedin: "linkedin.com",
    sbi: "onlinesbi.sbi",
    hdfc: "hdfcbank.com",
    icici: "icicibank.com",
    paytm: "paytm.com",
    phonepe: "phonepe.com",
  };

  function isDomainLegitFor(brand) {
    const legit = BRAND_DOMAINS[brand];
    if (!legit) return false;
    const domains = Array.isArray(legit) ? legit : [legit];
    return domains.some(
      (d) => hostname === d || hostname === `www.${d}` || hostname.endsWith(`.${d}`)
    );
  }

  function detectFakeLoginForm() {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    if (passwordInputs.length === 0) return;

    const pageText = document.body.innerText.toLowerCase();
    const title = document.title.toLowerCase();

    const detectedBrands = [];
    for (const brand of Object.keys(BRAND_DOMAINS)) {
      if (
        (pageText.includes(brand) || title.includes(brand) || fullUrl.includes(brand)) &&
        !isDomainLegitFor(brand)
      ) {
        detectedBrands.push(brand);
      }
    }

    const suspiciousPatterns = [
      /verify.*account/i,
      /confirm.*identity/i,
      /unusual.*activity/i,
      /account.*suspended/i,
      /update.*payment/i,
      /enter.*otp/i,
      /re-?enter.*password/i,
    ];
    const hasSuspiciousText = suspiciousPatterns.some((p) => p.test(pageText));

    // Flag if: fake brand detected OR suspicious text with password field on non-HTTPS
    const isHttp = window.location.protocol === "http:";
    const isSuspicious =
      detectedBrands.length > 0 ||
      (hasSuspiciousText && isHttp) ||
      (passwordInputs.length > 0 && isHttp && hostname.split(".").length > 4);

    if (isSuspicious) {
      const reasons = [];
      if (detectedBrands.length > 0)
        reasons.push(`Page impersonates: ${detectedBrands.join(", ")}`);
      if (isHttp) reasons.push("Password form on insecure HTTP connection");
      if (hasSuspiciousText) reasons.push("Suspicious credential-harvesting language detected");

      // Notify background
      chrome.runtime.sendMessage({
        type: "INJECT_BANNER",
        reason: reasons[0] || "Suspicious login form detected",
      });

      // Highlight suspicious password fields
      passwordInputs.forEach((input) => {
        input.style.outline = "2px solid #FF3B3B";
        input.style.boxShadow = "0 0 8px rgba(255,59,59,0.5)";
        input.title = "⚠️ PhishGuard: This form may be harvesting your credentials!";
      });

      return { detected: true, brands: detectedBrands, reasons };
    }

    return { detected: false };
  }

  // ── Run detection on load ──────────────────────────────────
  function runDetection() {
    // Small delay to let dynamic content load
    setTimeout(() => {
      try {
        detectFakeLoginForm();
      } catch (e) {
        // Silently ignore errors in content scripts
      }
    }, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runDetection);
  } else {
    runDetection();
  }

  // ── Watch for dynamically injected forms (SPAs) ────────────
  const observer = new MutationObserver((mutations) => {
    const hasNewInputs = mutations.some((m) =>
      [...m.addedNodes].some(
        (n) =>
          n.nodeType === 1 &&
          (n.querySelector?.('input[type="password"]') || n.tagName === "INPUT")
      )
    );
    if (hasNewInputs) {
      setTimeout(() => {
        try { detectFakeLoginForm(); } catch (_) {}
      }, 500);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
