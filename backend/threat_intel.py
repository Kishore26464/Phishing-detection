"""
threat_intel.py
Async wrappers for external threat intelligence APIs:
  - VirusTotal v3
  - Google Safe Browsing v4
"""

import os
import base64
import hashlib
import logging
import asyncio
from typing import Dict, Any, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

VIRUSTOTAL_API_KEY    = os.getenv("VIRUSTOTAL_API_KEY", "")
SAFE_BROWSING_API_KEY = os.getenv("SAFE_BROWSING_API_KEY", "")

VT_BASE      = "https://www.virustotal.com/api/v3"
SB_BASE      = "https://safebrowsing.googleapis.com/v4"
REQUEST_TIMEOUT = 10  # seconds


# ─── VirusTotal ───────────────────────────────────────────────────────────────

def _vt_url_id(url: str) -> str:
    """VirusTotal v3 uses base64url-encoded URL (no padding) as the resource ID."""
    return base64.urlsafe_b64encode(url.encode()).rstrip(b"=").decode()


async def scan_url_virustotal(url: str) -> Dict[str, Any]:
    """
    Submit URL to VirusTotal and return structured result.
    Falls back gracefully if API key is missing or request fails.
    """
    if not VIRUSTOTAL_API_KEY:
        return {
            "available": False,
            "error": "VirusTotal API key not configured",
            "malicious_votes": 0,
            "suspicious_votes": 0,
            "total_engines": 0,
            "categories": [],
            "permalink": None,
        }

    headers = {"x-apikey": VIRUSTOTAL_API_KEY}
    url_id  = _vt_url_id(url)

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        # 1. Try fetching existing report first (avoids quota usage)
        try:
            resp = await client.get(f"{VT_BASE}/urls/{url_id}", headers=headers)

            if resp.status_code == 200:
                return _parse_vt_response(resp.json(), url)

            # 404 means not previously scanned — submit now
            if resp.status_code == 404:
                submit_resp = await client.post(
                    f"{VT_BASE}/urls",
                    headers=headers,
                    data={"url": url},
                )
                if submit_resp.status_code not in (200, 201):
                    return _vt_error(f"Submit failed: HTTP {submit_resp.status_code}")

                # Give VT a moment to process
                await asyncio.sleep(2)

                # Fetch the analysis result
                analysis_id = submit_resp.json().get("data", {}).get("id", "")
                if analysis_id:
                    analysis_resp = await client.get(
                        f"{VT_BASE}/analyses/{analysis_id}",
                        headers=headers,
                    )
                    if analysis_resp.status_code == 200:
                        return _parse_vt_analysis(analysis_resp.json(), url)

                return _vt_error("Could not retrieve VT analysis after submission")

            return _vt_error(f"Unexpected VT status: HTTP {resp.status_code}")

        except httpx.TimeoutException:
            return _vt_error("VirusTotal request timed out")
        except httpx.RequestError as e:
            return _vt_error(f"VirusTotal network error: {e}")
        except Exception as e:
            logger.exception("Unexpected VT error")
            return _vt_error(str(e))


def _parse_vt_response(data: Dict, url: str) -> Dict[str, Any]:
    """Parse a full URL report from VT v3."""
    try:
        attrs   = data.get("data", {}).get("attributes", {})
        stats   = attrs.get("last_analysis_stats", {})
        cats    = attrs.get("categories", {})

        malicious   = int(stats.get("malicious", 0))
        suspicious  = int(stats.get("suspicious", 0))
        harmless    = int(stats.get("harmless", 0))
        undetected  = int(stats.get("undetected", 0))
        total       = malicious + suspicious + harmless + undetected

        categories  = list(set(cats.values())) if cats else []
        permalink   = f"https://www.virustotal.com/gui/url/{_vt_url_id(url)}/detection"

        return {
            "available":       True,
            "malicious_votes": malicious,
            "suspicious_votes": suspicious,
            "total_engines":   total,
            "categories":      categories,
            "permalink":       permalink,
            "error":           None,
        }
    except Exception as e:
        return _vt_error(f"Failed to parse VT response: {e}")


def _parse_vt_analysis(data: Dict, url: str) -> Dict[str, Any]:
    """Parse a fresh analysis result (just submitted URL)."""
    try:
        attrs  = data.get("data", {}).get("attributes", {})
        stats  = attrs.get("stats", {})

        malicious  = int(stats.get("malicious", 0))
        suspicious = int(stats.get("suspicious", 0))
        harmless   = int(stats.get("harmless", 0))
        undetected = int(stats.get("undetected", 0))
        total      = malicious + suspicious + harmless + undetected

        permalink  = f"https://www.virustotal.com/gui/url/{_vt_url_id(url)}/detection"

        return {
            "available":        True,
            "malicious_votes":  malicious,
            "suspicious_votes": suspicious,
            "total_engines":    total,
            "categories":       [],
            "permalink":        permalink,
            "error":            None,
        }
    except Exception as e:
        return _vt_error(f"Failed to parse VT analysis: {e}")


def _vt_error(msg: str) -> Dict[str, Any]:
    logger.warning(f"VirusTotal: {msg}")
    return {
        "available":        False,
        "malicious_votes":  0,
        "suspicious_votes": 0,
        "total_engines":    0,
        "categories":       [],
        "permalink":        None,
        "error":            msg,
    }


# ─── Google Safe Browsing ─────────────────────────────────────────────────────

async def check_safe_browsing(url: str) -> Dict[str, Any]:
    """
    Check a URL against Google Safe Browsing v4 Lookup API.
    Returns flagged=True if the URL matches any threat list.
    """
    if not SAFE_BROWSING_API_KEY:
        return {
            "available": False,
            "flagged":   False,
            "threats":   [],
            "error":     "Google Safe Browsing API key not configured",
        }

    endpoint = f"{SB_BASE}/threatMatches:find?key={SAFE_BROWSING_API_KEY}"
    payload  = {
        "client": {
            "clientId":      "phishing-detection-app",
            "clientVersion": "1.0.0",
        },
        "threatInfo": {
            "threatTypes":      [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            "platformTypes":    ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries":    [{"url": url}],
        },
    }

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        try:
            resp = await client.post(endpoint, json=payload)

            if resp.status_code != 200:
                return {
                    "available": False,
                    "flagged":   False,
                    "threats":   [],
                    "error":     f"Safe Browsing returned HTTP {resp.status_code}",
                }

            body    = resp.json()
            matches = body.get("matches", [])

            threats = [
                {
                    "type":     m.get("threatType", "UNKNOWN"),
                    "platform": m.get("platformType", "ANY_PLATFORM"),
                }
                for m in matches
            ]

            return {
                "available": True,
                "flagged":   len(matches) > 0,
                "threats":   threats,
                "error":     None,
            }

        except httpx.TimeoutException:
            return {"available": False, "flagged": False, "threats": [], "error": "Safe Browsing timed out"}
        except httpx.RequestError as e:
            return {"available": False, "flagged": False, "threats": [], "error": str(e)}
        except Exception as e:
            logger.exception("Unexpected Safe Browsing error")
            return {"available": False, "flagged": False, "threats": [], "error": str(e)}


# ─── Combined threat score helper ─────────────────────────────────────────────

def combine_threat_signals(
    ml_is_phishing: bool,
    ml_confidence: float,
    vt_result: Dict[str, Any],
    sb_result: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Merge ML prediction + VirusTotal + Safe Browsing into a single
    threat_level and combined_confidence.
    """
    from backend.models.schemas import ThreatLevel  # local import to avoid circular

    reasons: list = []
    score   = 0.0   # 0–100 internal risk score

    # ML contribution (weight: 60%)
    ml_score = ml_confidence * 60 if ml_is_phishing else (1 - ml_confidence) * 10
    score   += ml_score
    if ml_is_phishing:
        reasons.append(f"ML model flagged as phishing ({ml_confidence*100:.1f}% confidence)")

    # VirusTotal contribution (weight: 30%)
    if vt_result.get("available") and vt_result.get("total_engines", 0) > 0:
        vt_ratio = vt_result["malicious_votes"] / vt_result["total_engines"]
        vt_score = vt_ratio * 30
        score   += vt_score
        if vt_result["malicious_votes"] > 0:
            reasons.append(
                f"VirusTotal: {vt_result['malicious_votes']}/{vt_result['total_engines']} "
                f"engines flagged as malicious"
            )
        if vt_result["suspicious_votes"] > 0:
            reasons.append(
                f"VirusTotal: {vt_result['suspicious_votes']} engines flagged as suspicious"
            )

    # Safe Browsing contribution (weight: 10% — binary flag)
    if sb_result.get("flagged"):
        score += 10
        threat_types = [t["type"] for t in sb_result.get("threats", [])]
        reasons.append(f"Google Safe Browsing flagged this URL: {', '.join(threat_types)}")

    # Map score → ThreatLevel
    if score >= 50:
        level = ThreatLevel.DANGEROUS
    elif score >= 20:
        level = ThreatLevel.SUSPICIOUS
    elif score > 0 or (not ml_is_phishing and vt_result.get("available")):
        level = ThreatLevel.SAFE
    else:
        level = ThreatLevel.UNKNOWN

    combined_confidence = min(score / 100.0, 1.0)

    return {
        "threat_level":         level,
        "combined_confidence":  round(combined_confidence, 4),
        "risk_score":           round(score, 2),
        "extra_reasons":        reasons,
    }