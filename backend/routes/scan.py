"""
routes/scan.py
POST /scan-url  — ML + VirusTotal + Safe Browsing
POST /scan-sms  — ML NLP model
POST /scan-qr   — QR decoded URL → delegates to scan-url logic
"""

import time
import logging
import asyncio
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status

from backend.ml_engine    import ml_engine
from backend.threat_intel import scan_url_virustotal, check_safe_browsing, combine_threat_signals
from backend.firebase_service import firebase_service
from backend.models.schemas import (
    URLScanRequest, URLScanResponse, MLURLResult, VirusTotalResult,
    SMSScanRequest, SMSScanResponse,
    QRScanRequest, QRScanResponse,
    ThreatLevel,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ─── Helper: map combined risk to ThreatLevel ─────────────────────────────────

def _threat_level_from_ml(is_phishing: bool, confidence: float) -> ThreatLevel:
    """Map ML prediction + confidence to threat level.
    
    Thresholds adjusted for both URL and SMS models:
    - DANGEROUS: is_phishing=True AND confidence >= 0.80 (very confident)
    - SUSPICIOUS: is_phishing=True AND confidence >= 0.65 (moderately confident)
    - SAFE: is_phishing=False (legitimate)
    - UNKNOWN: edge cases or inconclusive predictions
    """
    if not is_phishing:
        return ThreatLevel.SAFE
    if confidence >= 0.80:
        return ThreatLevel.DANGEROUS
    if confidence >= 0.65:
        return ThreatLevel.SUSPICIOUS
    return ThreatLevel.UNKNOWN


# ─── POST /scan-url ───────────────────────────────────────────────────────────

@router.post(
    "/scan-url",
    response_model=URLScanResponse,
    summary="Scan a URL for phishing / malware",
    tags=["Scanning"],
)
async def scan_url(request: URLScanRequest):
    """
    Accepts a URL along with its pre-extracted feature vector.

    **Request body example:**
    ```json
    {
      "url": "http://suspicious-login.com/verify",
      "features": {
        "UsingIP": 0, "LongURL": 1, "ShortURL": 0, "Symbol@": 0,
        "Redirecting//": 0, "PrefixSuffix-": 1, "SubDomains": 1,
        "HTTPS": 1, "DomainRegLen": 1, "Favicon": 0, "NonStdPort": 0,
        "HTTPSDomainURL": 0, "RequestURL": 1, "AnchorURL": 1,
        "LinksInScriptTags": 1, "ServerFormHandler": 1, "InfoEmail": 0,
        "AbnormalURL": 1, "WebsiteForwarding": 1, "StatusBarCust": 0,
        "DisableRightClick": 1, "UsingPopupWindow": 0, "IframeRedirection": 0,
        "AgeofDomain": 1, "DNSRecording": 1, "WebsiteTraffic": 1,
        "PageRank": 1, "GoogleIndex": 1, "LinksPointingToPage": 1,
        "StatsReport": 0
      }
    }
    ```
    """
    t0 = time.monotonic()

    # ── 1. ML prediction ──────────────────────────────────────────────────────
    features: Dict[str, Any] = getattr(request, "features", {}) or {}

    try:
        ml_result = ml_engine.predict_url(features)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.exception("ML URL prediction failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"ML prediction error: {e}")

    reasons = ml_engine.build_url_reasons(ml_result, features)

    # ── 2. External threat intelligence (parallel) ────────────────────────────
    vt_raw, sb_raw = await asyncio.gather(
        scan_url_virustotal(request.url),
        check_safe_browsing(request.url),
        return_exceptions=True,
    )

    # Gracefully handle if one of the async calls raised an exception
    if isinstance(vt_raw, Exception):
        logger.warning(f"VT call raised: {vt_raw}")
        vt_raw = {"available": False, "error": str(vt_raw),
                  "malicious_votes": 0, "suspicious_votes": 0,
                  "total_engines": 0, "categories": [], "permalink": None}

    if isinstance(sb_raw, Exception):
        logger.warning(f"SB call raised: {sb_raw}")
        sb_raw = {"available": False, "flagged": False, "threats": [], "error": str(sb_raw)}

    # ── 3. Combine signals ────────────────────────────────────────────────────
    combined = combine_threat_signals(
        ml_is_phishing=ml_result["is_phishing"],
        ml_confidence=ml_result["confidence"],
        vt_result=vt_raw,
        sb_result=sb_raw,
    )

    # Merge reasons
    for r in combined["extra_reasons"]:
        if r not in reasons:
            reasons.append(r)

    if not reasons:
        reasons.append("No specific threats detected")

    # ── 4. Build response objects ─────────────────────────────────────────────
    ml_response = MLURLResult(
        prediction=ml_result["prediction"],
        confidence=ml_result["confidence"],
        top_features=ml_result["top_features"],
    )

    vt_response = VirusTotalResult(
        malicious_votes=vt_raw.get("malicious_votes", 0),
        suspicious_votes=vt_raw.get("suspicious_votes", 0),
        total_engines=vt_raw.get("total_engines", 0),
        categories=vt_raw.get("categories", []),
        permalink=vt_raw.get("permalink"),
        error=vt_raw.get("error"),
    ) if vt_raw.get("available") else None

    elapsed_ms = (time.monotonic() - t0) * 1000

    response = URLScanResponse(
        url=request.url,
        threat_level=combined["threat_level"],
        confidence=combined["combined_confidence"],
        is_phishing=ml_result["is_phishing"],
        reasons=reasons,
        ml_result=ml_response,
        virustotal=vt_response,
        safe_browsing_flagged=bool(sb_raw.get("flagged", False)),
        scan_time_ms=round(elapsed_ms, 2),
    )

    # Save to Firestore if user_id provided.
    # We write BOTH camelCase (read by the web) and snake_case (read by Flutter)
    # so that scans appear in history on every platform.
    if request.user_id:
        vt_data = {
            "malicious_votes": vt_raw.get("malicious_votes", 0),
            "suspicious_votes": vt_raw.get("suspicious_votes", 0),
            "total_engines": vt_raw.get("total_engines", 0),
            "categories": vt_raw.get("categories", []),
        } if vt_raw.get("available") else None
        ml_data = {
            "prediction": ml_result["prediction"],
            "confidence": ml_result["confidence"],
        }
        scan_data = {
            # ── camelCase fields (web / firestoreScans.ts) ──
            "type": "url",
            "input": request.url,
            "threatLevel": combined["threat_level"].value,
            "confidence": combined["combined_confidence"],
            "isPhishing": ml_result["is_phishing"],
            "reasons": reasons,
            "mlResult": ml_data,
            "virusTotalResult": vt_data,
            "safeBrowsingFlagged": bool(sb_raw.get("flagged", False)),
            "scanTimeMs": round(elapsed_ms, 2),
            # ── snake_case aliases (Flutter / ThreatHistoryItem.fromFirestore) ──
            "scan_type": "url",
            "threat_level": combined["threat_level"].value,
            "is_phishing": ml_result["is_phishing"],
            "ml_result": ml_data,
            "virustotal": vt_data,
            "safe_browsing_flagged": bool(sb_raw.get("flagged", False)),
            "scan_time_ms": round(elapsed_ms, 2),
        }
        firebase_service.save_scan_result(request.user_id, scan_data)

    return response


# ─── POST /scan-sms ───────────────────────────────────────────────────────────

@router.post(
    "/scan-sms",
    response_model=SMSScanResponse,
    summary="Scan an SMS message for phishing",
    tags=["Scanning"],
)
async def scan_sms(request: SMSScanRequest):
    """
    Analyses raw SMS text using TF-IDF + Logistic Regression NLP model.
    Returns threat level, confidence, triggered keywords, and human-readable reasons.
    """
    t0 = time.monotonic()

    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty",
        )

    try:
        result = ml_engine.predict_sms(request.message.strip())
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.exception("SMS prediction failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"SMS prediction error: {e}")

    threat_level = _threat_level_from_ml(result["is_phishing"], result["confidence"])
    elapsed_ms   = (time.monotonic() - t0) * 1000

    response = SMSScanResponse(
        message=request.message,
        threat_level=threat_level,
        confidence=result["confidence"],
        is_phishing=result["is_phishing"],
        reasons=result["reasons"],
        triggered_keywords=result["triggered_keywords"],
        scan_time_ms=round(elapsed_ms, 2),
    )

    # Save to Firestore if user_id provided.
    # Write both camelCase (web) and snake_case (Flutter) field names.
    if request.user_id:
        scan_data = {
            # ── camelCase fields (web) ──
            "type": "sms",
            "input": request.message,
            "threatLevel": threat_level.value,
            "confidence": result["confidence"],
            "isPhishing": result["is_phishing"],
            "reasons": result["reasons"],
            "triggeredKeywords": result["triggered_keywords"],
            "scanTimeMs": round(elapsed_ms, 2),
            # ── snake_case aliases (Flutter) ──
            "scan_type": "sms",
            "threat_level": threat_level.value,
            "is_phishing": result["is_phishing"],
            "triggered_keywords": result["triggered_keywords"],
            "scan_time_ms": round(elapsed_ms, 2),
        }
        firebase_service.save_scan_result(request.user_id, scan_data)

    return response


# ─── POST /scan-qr ────────────────────────────────────────────────────────────

@router.post(
    "/scan-qr",
    response_model=QRScanResponse,
    summary="Scan a QR code decoded URL",
    tags=["Scanning"],
)
async def scan_qr(request: QRScanRequest):
    """
    Takes the URL decoded from a QR code and runs the full URL scan pipeline
    (ML + VirusTotal + Safe Browsing) on it.
    """
    t0 = time.monotonic()

    # Reuse URL scan logic
    url_request = URLScanRequest(url=request.decoded_url, features={}, user_id=request.user_id)

    try:
        url_scan_result = await scan_url(url_request)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("QR scan failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"QR scan error: {e}")

    elapsed_ms = (time.monotonic() - t0) * 1000

    qr_reasons = [f"[QR Code] {r}" for r in url_scan_result.reasons]

    response = QRScanResponse(
        decoded_url=request.decoded_url,
        threat_level=url_scan_result.threat_level,
        confidence=url_scan_result.confidence,
        is_phishing=url_scan_result.is_phishing,
        reasons=qr_reasons,
        url_scan=url_scan_result,
        scan_time_ms=round(elapsed_ms, 2),
    )

    # Save a QR-specific Firestore record.
    # NOTE: scan_url() already saved a record with type="url" above (because it
    # received user_id via url_request). We save an additional QR record here so
    # the history correctly reflects the QR scan type. Both camelCase (web) and
    # snake_case (Flutter) field names are written for cross-platform visibility.
    if request.user_id:
        try:
            vt_raw_qr = url_scan_result.virustotal
            vt_data_qr = {
                "malicious_votes": vt_raw_qr.malicious_votes,
                "suspicious_votes": vt_raw_qr.suspicious_votes,
                "total_engines": vt_raw_qr.total_engines,
                "categories": vt_raw_qr.categories,
            } if vt_raw_qr else None
            ml_data_qr = {
                "prediction": url_scan_result.ml_result.prediction,
                "confidence": url_scan_result.ml_result.confidence,
            } if url_scan_result.ml_result else None
            qr_scan_data = {
                # ── camelCase fields (web) ──
                "type": "qr",
                "input": request.decoded_url,
                "threatLevel": url_scan_result.threat_level.value,
                "confidence": url_scan_result.confidence,
                "isPhishing": url_scan_result.is_phishing,
                "reasons": qr_reasons,
                "mlResult": ml_data_qr,
                "virusTotalResult": vt_data_qr,
                "safeBrowsingFlagged": url_scan_result.safe_browsing_flagged,
                "scanTimeMs": round(elapsed_ms, 2),
                # ── snake_case aliases (Flutter) ──
                "scan_type": "qr",
                "threat_level": url_scan_result.threat_level.value,
                "is_phishing": url_scan_result.is_phishing,
                "ml_result": ml_data_qr,
                "virustotal": vt_data_qr,
                "safe_browsing_flagged": url_scan_result.safe_browsing_flagged,
                "scan_time_ms": round(elapsed_ms, 2),
            }
            firebase_service.save_scan_result(request.user_id, qr_scan_data)
        except Exception as e:
            logger.error(f"Failed to save QR scan to Firestore: {e}")

    return response