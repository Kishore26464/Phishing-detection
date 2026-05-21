"""
routes/analyze.py
POST /analyze-app — APK permission risk analysis
"""

import time
import logging
from typing import Dict, List, Tuple

from fastapi import APIRouter, HTTPException, status

from backend.models.schemas import (
    AppAnalysisRequest, AppAnalysisResponse,
    PermissionRisk, ThreatLevel,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ─── Permission risk database ─────────────────────────────────────────────────
# (permission_name, risk_level, reason)
PERMISSION_RISK_DB: Dict[str, Tuple[str, str]] = {
    # HIGH risk
    "android.permission.READ_SMS":                   ("high",   "Can silently read all your SMS messages including OTPs"),
    "android.permission.RECEIVE_SMS":                ("high",   "Can intercept incoming SMS messages including bank OTPs"),
    "android.permission.SEND_SMS":                   ("high",   "Can send SMS without your knowledge — can run up charges"),
    "android.permission.READ_CALL_LOG":              ("high",   "Can access your full call history"),
    "android.permission.PROCESS_OUTGOING_CALLS":     ("high",   "Can intercept and redirect your outgoing calls"),
    "android.permission.READ_CONTACTS":              ("high",   "Can harvest your entire contacts list"),
    "android.permission.WRITE_CONTACTS":             ("high",   "Can modify or delete your contacts"),
    "android.permission.GET_ACCOUNTS":               ("high",   "Can enumerate all accounts (Google, bank apps) on device"),
    "android.permission.USE_CREDENTIALS":            ("high",   "Can access authentication credentials for other accounts"),
    "android.permission.RECORD_AUDIO":               ("high",   "Can secretly record microphone audio"),
    "android.permission.CAMERA":                     ("high",   "Can activate camera silently"),
    "android.permission.ACCESS_FINE_LOCATION":       ("high",   "Tracks precise GPS location continuously"),
    "android.permission.READ_EXTERNAL_STORAGE":      ("high",   "Can access all files on device storage"),
    "android.permission.WRITE_EXTERNAL_STORAGE":     ("high",   "Can write/delete files on device storage"),
    "android.permission.INSTALL_PACKAGES":           ("high",   "Can silently install other apps without user consent"),
    "android.permission.DELETE_PACKAGES":            ("high",   "Can uninstall apps without user consent"),
    "android.permission.BIND_ACCESSIBILITY_SERVICE": ("high",   "Can read screen content and simulate taps — keylogger risk"),
    "android.permission.BIND_DEVICE_ADMIN":          ("high",   "Requests device administrator privileges"),
    "android.permission.SYSTEM_ALERT_WINDOW":        ("high",   "Can draw overlays on top of other apps (overlay attack)"),
    "android.permission.READ_PHONE_STATE":           ("high",   "Can access device IMEI and active call information"),
    "android.permission.CALL_PHONE":                 ("high",   "Can make phone calls without user interaction"),
    "android.permission.CHANGE_NETWORK_STATE":       ("high",   "Can switch network connections unexpectedly"),
    "android.permission.DISABLE_KEYGUARD":           ("high",   "Can bypass lock screen"),

    # MEDIUM risk
    "android.permission.ACCESS_COARSE_LOCATION":     ("medium", "Tracks approximate location via Wi-Fi/cell towers"),
    "android.permission.ACCESS_WIFI_STATE":          ("medium", "Can enumerate nearby Wi-Fi networks"),
    "android.permission.CHANGE_WIFI_STATE":          ("medium", "Can modify Wi-Fi configuration"),
    "android.permission.BLUETOOTH":                  ("medium", "Can scan and pair with nearby Bluetooth devices"),
    "android.permission.NFC":                        ("medium", "Can read/write NFC tags"),
    "android.permission.VIBRATE":                    ("low",    "Standard notification vibration — low risk"),
    "android.permission.RECEIVE_BOOT_COMPLETED":     ("medium", "App runs automatically on every device boot"),
    "android.permission.FOREGROUND_SERVICE":         ("medium", "App runs persistent background service"),
    "android.permission.REQUEST_INSTALL_PACKAGES":   ("medium", "Can prompt user to install APKs from unknown sources"),
    "android.permission.READ_CALENDAR":              ("medium", "Can read calendar events and meeting details"),
    "android.permission.WRITE_CALENDAR":             ("medium", "Can create or modify calendar events"),
    "android.permission.BODY_SENSORS":               ("medium", "Can access health sensor data"),

    # LOW risk
    "android.permission.INTERNET":                   ("low",    "Standard internet access — required by most apps"),
    "android.permission.ACCESS_NETWORK_STATE":       ("low",    "Can check if device is connected to internet"),
    "android.permission.WAKE_LOCK":                  ("low",    "Prevents device from sleeping — normal for media apps"),
    "android.permission.USE_BIOMETRIC":              ("low",    "Standard biometric authentication"),
    "android.permission.USE_FINGERPRINT":            ("low",    "Standard fingerprint authentication"),
    "android.permission.FLASHLIGHT":                 ("low",    "Torch / flashlight control"),
}

HIGH_RISK_COUNT_THRESHOLD   = 3   # ≥3 HIGH → DANGEROUS
MEDIUM_RISK_COUNT_THRESHOLD = 5   # ≥5 MEDIUM (no high) → SUSPICIOUS


def _analyse_permissions(permissions: List[str]) -> Tuple[List[PermissionRisk], float, List[str]]:
    """
    Returns (dangerous_permissions, risk_score_0_to_100, reasons).
    """
    dangerous: List[PermissionRisk] = []
    high_count   = 0
    medium_count = 0

    for perm in permissions:
        normalised = perm.strip()
        if normalised in PERMISSION_RISK_DB:
            level, reason = PERMISSION_RISK_DB[normalised]
            if level in ("high", "medium"):
                dangerous.append(PermissionRisk(
                    permission=normalised,
                    risk_level=level,
                    reason=reason,
                ))
                if level == "high":
                    high_count += 1
                else:
                    medium_count += 1

    # Risk score: each HIGH = 15 pts, each MEDIUM = 5 pts, cap at 100
    raw_score  = (high_count * 15) + (medium_count * 5)
    risk_score = min(float(raw_score), 100.0)

    # Human-readable reasons
    reasons: List[str] = []
    if high_count:
        reasons.append(f"App requests {high_count} HIGH-risk permission(s)")
        for dp in dangerous:
            if dp.risk_level == "high":
                reasons.append(f"⚠ {dp.permission}: {dp.reason}")
    if medium_count:
        reasons.append(f"App requests {medium_count} MEDIUM-risk permission(s)")
        for dp in dangerous:
            if dp.risk_level == "medium":
                reasons.append(f"⚡ {dp.permission}: {dp.reason}")
    if not reasons:
        reasons.append("No dangerous permissions detected")

    return dangerous, risk_score, reasons


def _risk_score_to_threat_level(score: float, high_count: int) -> ThreatLevel:
    if high_count >= HIGH_RISK_COUNT_THRESHOLD or score >= 50:
        return ThreatLevel.DANGEROUS
    if score >= 20:
        return ThreatLevel.SUSPICIOUS
    if score > 0:
        return ThreatLevel.SUSPICIOUS
    return ThreatLevel.SAFE


def _build_recommendation(threat_level: ThreatLevel, app_name: str) -> str:
    if threat_level == ThreatLevel.DANGEROUS:
        return (
            f"Do NOT install '{app_name}'. "
            "It requests dangerous permissions that are not typical for its stated purpose. "
            "These permissions could be used to steal credentials, intercept OTPs, or monitor your activity."
        )
    if threat_level == ThreatLevel.SUSPICIOUS:
        return (
            f"Install '{app_name}' with caution. "
            "Some permissions seem beyond what the app requires. "
            "Review each permission carefully before granting access."
        )
    return (
        f"'{app_name}' appears safe based on its requested permissions. "
        "Standard good practice: only grant permissions the app actively needs."
    )


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post(
    "/analyze-app",
    response_model=AppAnalysisResponse,
    summary="Analyse Android app permissions for malware risk",
    tags=["Analysis"],
)
async def analyze_app(request: AppAnalysisRequest):
    """
    Analyses a list of Android permissions against a risk database of 35+ known
    dangerous permissions. Returns a risk score, threat level, and per-permission
    explanations.

    **Request body example:**
    ```json
    {
      "app_name": "com.fake.banking",
      "permissions": [
        "android.permission.READ_SMS",
        "android.permission.BIND_ACCESSIBILITY_SERVICE",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.INTERNET"
      ]
    }
    ```
    """
    t0 = time.monotonic()

    if not request.permissions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Permissions list cannot be empty",
        )

    try:
        dangerous, risk_score, reasons = _analyse_permissions(request.permissions)
    except Exception as e:
        logger.exception("Permission analysis failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis error: {e}",
        )

    high_count   = sum(1 for d in dangerous if d.risk_level == "high")
    threat_level = _risk_score_to_threat_level(risk_score, high_count)
    confidence   = min(risk_score / 100.0, 1.0)
    recommendation = _build_recommendation(threat_level, request.app_name)

    elapsed_ms = (time.monotonic() - t0) * 1000

    return AppAnalysisResponse(
        app_name=request.app_name,
        threat_level=threat_level,
        confidence=round(confidence, 4),
        risk_score=round(risk_score, 2),
        dangerous_permissions=dangerous,
        reasons=reasons,
        recommendation=recommendation,
        scan_time_ms=round(elapsed_ms, 2),
    )