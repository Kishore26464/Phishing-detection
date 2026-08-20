from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List, Dict, Any
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class ThreatLevel(str, Enum):
    SAFE = "safe"
    SUSPICIOUS = "suspicious"
    DANGEROUS = "dangerous"
    UNKNOWN = "unknown"


# ─── URL Scan ─────────────────────────────────────────────────────────────────

class URLScanRequest(BaseModel):
    url: str = Field(..., description="The URL to scan", example="http://example.com/login")
    features: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Pre-extracted URL features (30 binary features). If not provided, defaults to empty dict.")
    user_id: Optional[str] = Field(default=None, description="Optional Firebase UID for tracking scans in Firestore")

class MLURLResult(BaseModel):
    prediction: str          # "phishing" | "legitimate"
    confidence: float        # 0.0 – 1.0
    top_features: List[Dict[str, Any]]  # [{feature, value, risk_contribution}]

class VirusTotalResult(BaseModel):
    malicious_votes: int
    suspicious_votes: int
    total_engines: int
    categories: List[str]
    permalink: Optional[str] = None
    error: Optional[str] = None

class URLScanResponse(BaseModel):
    url: str
    threat_level: ThreatLevel
    confidence: float
    is_phishing: bool
    reasons: List[str]
    ml_result: MLURLResult
    virustotal: Optional[VirusTotalResult] = None
    safe_browsing_flagged: bool = False
    scan_time_ms: float


# ─── SMS Scan ─────────────────────────────────────────────────────────────────

class SMSScanRequest(BaseModel):
    message: str = Field(..., description="SMS text to analyse", example="Congratulations! You won a prize. Click here: bit.ly/win")
    user_id: Optional[str] = Field(default=None, description="Optional Firebase UID for tracking scans in Firestore")

class SMSScanResponse(BaseModel):
    message: str
    threat_level: ThreatLevel
    confidence: float
    is_phishing: bool
    reasons: List[str]
    triggered_keywords: List[str]
    scan_time_ms: float


# ─── QR Code Scan ─────────────────────────────────────────────────────────────

class QRScanRequest(BaseModel):
    decoded_url: str = Field(..., description="URL decoded from QR code")
    user_id: Optional[str] = Field(default=None, description="Optional Firebase UID for tracking scans in Firestore")

class QRScanResponse(BaseModel):
    decoded_url: str
    threat_level: ThreatLevel
    confidence: float
    is_phishing: bool
    reasons: List[str]
    url_scan: URLScanResponse
    scan_time_ms: float


# ─── APK / App Analysis ───────────────────────────────────────────────────────

class AppAnalysisRequest(BaseModel):
    app_name: str = Field(..., example="com.example.banking")
    permissions: List[str] = Field(..., example=["android.permission.READ_SMS", "android.permission.CAMERA"])
    package_name: Optional[str] = None
    version: Optional[str] = None

class PermissionRisk(BaseModel):
    permission: str
    risk_level: str          # "high" | "medium" | "low"
    reason: str

class AppAnalysisResponse(BaseModel):
    app_name: str
    threat_level: ThreatLevel
    confidence: float
    risk_score: float        # 0–100
    dangerous_permissions: List[PermissionRisk]
    reasons: List[str]
    recommendation: str
    scan_time_ms: float


# ─── Threat History ───────────────────────────────────────────────────────────

class ThreatHistoryEntry(BaseModel):
    id: str
    scan_type: str           # "url" | "sms" | "qr" | "app"
    input_data: str
    threat_level: ThreatLevel
    confidence: float
    timestamp: str
    reasons: List[str]

class ThreatHistoryResponse(BaseModel):
    entries: List[ThreatHistoryEntry]
    total: int
    page: int
    page_size: int


# ─── Report Threat ────────────────────────────────────────────────────────────

class ReportThreatRequest(BaseModel):
    scan_type: str = Field(..., example="url")
    input_data: str = Field(..., example="http://phishing-site.com")
    threat_level: ThreatLevel
    user_comment: Optional[str] = None
    reporter_email: Optional[str] = None
    user_id: Optional[str] = Field(default=None, description="Optional Firebase UID so the report is durably saved to Firestore and attributable to the reporting user")

class ReportThreatResponse(BaseModel):
    report_id: str
    status: str
    message: str
    persisted: bool = Field(default=False, description="True if the report was written to Firestore. False means it only lives in the backend's in-memory store and will be lost on restart.")


# ─── Health Check ─────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    ml_models_loaded: bool
    url_model: str
    sms_model: str
    version: str