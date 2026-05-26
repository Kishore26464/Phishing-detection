# API Documentation — PhishGuard Backend

**Base URL:** `http://localhost:8000/api/v1` (local) or `https://your-render-url.onrender.com/api/v1` (production)

**Authentication:** None required (public API)

**Response Format:** JSON

---

## 📋 Table of Contents

1. [Health Check](#health-check)
2. [URL Scanning](#url-scanning)
3. [SMS Scanning](#sms-scanning)
4. [QR Code Scanning](#qr-code-scanning)
5. [Threat History](#threat-history)
6. [App Analysis](#app-analysis)
7. [Report Generation](#report-generation)
8. [Data Models](#data-models)

---

## Health Check

### GET `/health`

Check if the API is running and models are loaded.

**Request:**
```bash
curl -X GET "http://localhost:8000/health"
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "models": {
    "url_model": "loaded",
    "sms_model": "loaded"
  },
  "firebase": "connected"
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "models": {
    "url_model": "failed",
    "sms_model": "loaded"
  },
  "firebase": "not_initialized"
}
```

---

## URL Scanning

### POST `/scan-url`

Scan a URL for phishing/malware using ML models and threat intelligence APIs.

**Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/scan-url" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://google.com",
    "features": {
      "UsingIP": 0, "LongURL": 0, "ShortURL": 0, "Symbol@": 0,
      "Redirecting//": 0, "PrefixSuffix-": 0, "SubDomains": 0,
      "HTTPS": 0, "DomainRegLen": 0, "Favicon": 0, "NonStdPort": 0,
      "HTTPSDomainURL": 0, "RequestURL": 0, "AnchorURL": 0,
      "LinksInScriptTags": 0, "ServerFormHandler": 0, "InfoEmail": 0,
      "AbnormalURL": 0, "WebsiteForwarding": 0, "StatusBarCust": 0,
      "DisableRightClick": 0, "UsingPopupWindow": 0, "IframeRedirection": 0,
      "AgeofDomain": 0, "DNSRecording": 1, "WebsiteTraffic": 1,
      "PageRank": 1, "GoogleIndex": 1, "LinksPointingToPage": 1,
      "StatsReport": 0
    }
  }'
```

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| `url` | string | URL to scan (required) |
| `features` | object | 30-feature vector (see below) |

**Feature Vector (30 features):**
```json
{
  "UsingIP": 0,                // IP-based URL (1=risky, 0=safe)
  "LongURL": 0,                // Abnormally long URL
  "ShortURL": 0,               // URL shortener used
  "Symbol@": 0,                // @ symbol in URL
  "Redirecting//": 0,          // // redirects
  "PrefixSuffix-": 0,          // - in domain name
  "SubDomains": 0,             // Multiple subdomains
  "HTTPS": 0,                  // HTTPS present (0=yes, 1=no)
  "DomainRegLen": 0,           // Domain registration length
  "Favicon": 0,                // Favicon loaded from external source
  "NonStdPort": 0,             // Non-standard port used
  "HTTPSDomainURL": 0,         // HTTPS in request URL
  "RequestURL": 0,             // URL in request body
  "AnchorURL": 0,              // Suspicious anchors
  "LinksInScriptTags": 0,      // Links in script tags
  "ServerFormHandler": 0,      // Form submission to different server
  "InfoEmail": 0,              // Email submission form
  "AbnormalURL": 0,            // Abnormal URL structure
  "WebsiteForwarding": 0,      // Meta refresh forwarding
  "StatusBarCust": 0,          // Custom status bar
  "DisableRightClick": 0,      // Right-click disabled
  "UsingPopupWindow": 0,       // Popup windows used
  "IframeRedirection": 0,      // Iframe redirection
  "AgeofDomain": 0,            // Domain age < 6 months
  "DNSRecording": 0,           // DNS record exists
  "WebsiteTraffic": 0,         // Website traffic (Alexa rank)
  "PageRank": 0,               // Google PageRank
  "GoogleIndex": 0,            // Indexed by Google
  "LinksPointingToPage": 0,    // Links pointing to page
  "StatsReport": 0             // WHOIS info available
}
```

**Response (200 OK) - Phishing URL:**
```json
{
  "url": "http://suspicious-banking.com/verify",
  "threat_level": "dangerous",
  "confidence": 0.94,
  "ml_result": {
    "is_phishing": true,
    "confidence": 0.94,
    "model": "ensemble"
  },
  "virustotal": {
    "available": true,
    "malicious_votes": 42,
    "suspicious_votes": 8,
    "total_engines": 70,
    "categories": ["phishing", "malware"],
    "permalink": "https://virustotal.com/gui/url/..."
  },
  "safe_browsing": {
    "available": true,
    "is_safe": false,
    "threats": ["MALWARE", "PHISHING"]
  },
  "timestamp": "2026-05-26T10:30:45.123456Z",
  "recommendation": "DO NOT VISIT this website. Confirmed phishing attempt targeting banking credentials.",
  "reasons": [
    "ML model detected phishing pattern (94% confidence)",
    "VirusTotal: 42 engines detected malware",
    "Google Safe Browsing: PHISHING threat",
    "Domain registered 3 days ago (high risk)",
    "Suspicious form submission detected"
  ]
}
```

**Response (200 OK) - Legitimate URL:**
```json
{
  "url": "https://www.google.com",
  "threat_level": "safe",
  "confidence": 0.99,
  "ml_result": {
    "is_phishing": false,
    "confidence": 0.99,
    "model": "ensemble"
  },
  "virustotal": {
    "available": true,
    "malicious_votes": 0,
    "suspicious_votes": 0,
    "total_engines": 70,
    "categories": ["legitimate"],
    "permalink": "https://virustotal.com/gui/url/..."
  },
  "safe_browsing": {
    "available": true,
    "is_safe": true,
    "threats": []
  },
  "timestamp": "2026-05-26T10:30:45.123456Z",
  "recommendation": "This website appears to be safe.",
  "reasons": [
    "ML model: Legitimate (99% confidence)",
    "VirusTotal: Clean across all engines",
    "Google Safe Browsing: No threats found",
    "HTTPS enabled",
    "Domain age: 20+ years",
    "High PageRank"
  ]
}
```

**Threat Levels:**
- `safe` — Low risk, website is legitimate
- `suspicious` — Moderate risk, further verification recommended
- `dangerous` — High risk, confirmed phishing/malware
- `unknown` — Inconclusive, exercise caution

---

## SMS Scanning

### POST `/scan-sms`

Analyze SMS/text messages for phishing indicators using NLP model.

**Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/scan-sms" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Your bank account has been locked. Click here: https://verify-account-now.com to unlock it."
  }'
```

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| `message` | string | SMS/text message to analyze (required) |

**Response (200 OK) - Phishing SMS:**
```json
{
  "message": "Your bank account has been locked. Click here: https://verify-account-now.com to unlock it.",
  "threat_level": "dangerous",
  "confidence": 0.96,
  "ml_result": {
    "is_phishing": true,
    "confidence": 0.96,
    "model": "tfidf_lr"
  },
  "timestamp": "2026-05-26T10:35:22.456789Z",
  "recommendation": "DO NOT click any links. This is a phishing attempt. Your bank will not ask for verification via SMS.",
  "reasons": [
    "Urgency language detected: 'locked', 'immediately'",
    "Suspicious URL embedded in message",
    "Request for account verification (common phishing tactic)",
    "Generic greeting (no personalization)"
  ],
  "indicators": {
    "urgency": true,
    "credentials_theft": true,
    "url_embedded": true,
    "generic_greeting": true,
    "misspellings": false
  }
}
```

**Response (200 OK) - Legitimate SMS:**
```json
{
  "message": "Your order #12345 has been confirmed. Delivery expected Monday. Track it here: shop.com/track",
  "threat_level": "safe",
  "confidence": 0.98,
  "ml_result": {
    "is_phishing": false,
    "confidence": 0.98,
    "model": "tfidf_lr"
  },
  "timestamp": "2026-05-26T10:35:22.456789Z",
  "recommendation": "This appears to be a legitimate order confirmation. You can safely click the tracking link.",
  "reasons": [
    "No urgency language detected",
    "Generic promotional content",
    "Personalized order reference",
    "Known legitimate domain"
  ],
  "indicators": {
    "urgency": false,
    "credentials_theft": false,
    "url_embedded": true,
    "generic_greeting": false,
    "misspellings": false
  }
}
```

---

## QR Code Scanning

### POST `/scan-qr`

Decode QR code and scan the extracted URL.

**Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/scan-qr" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_data": "https://phishing-site.com/fake-login",
    "features": { /* same 30-feature vector as URL scan */ }
  }'
```

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| `qr_data` | string | Decoded QR code content (URL) |
| `features` | object | 30-feature vector (same as URL scan) |

**Response:**
Same as URL scanning response (delegates to `/scan-url` logic).

---

## Threat History

### GET `/threat-history`

Retrieve paginated history of all scans performed in the current session.

**Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/threat-history?page=1&page_size=20&scan_type=url"
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (≥1) |
| `page_size` | integer | 20 | Results per page (1-100) |
| `scan_type` | string | "" | Filter: "url", "sms", "qr", "app" (empty = all) |

**Response (200 OK):**
```json
{
  "page": 1,
  "page_size": 20,
  "total": 47,
  "total_pages": 3,
  "history": [
    {
      "id": "scan_1234567890",
      "scan_type": "url",
      "target": "https://suspicious-site.com",
      "threat_level": "dangerous",
      "confidence": 0.94,
      "timestamp": "2026-05-26T10:35:22.456789Z"
    },
    {
      "id": "scan_1234567889",
      "scan_type": "sms",
      "target": "Your bank account has been...",
      "threat_level": "dangerous",
      "confidence": 0.96,
      "timestamp": "2026-05-26T10:30:15.123456Z"
    },
    {
      "id": "scan_1234567888",
      "scan_type": "url",
      "target": "https://www.google.com",
      "threat_level": "safe",
      "confidence": 0.99,
      "timestamp": "2026-05-26T10:25:00.000000Z"
    }
  ]
}
```

---

## App Analysis

### POST `/analyze-app`

Analyze Android app permissions to assess security risks.

**Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/analyze-app" \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "MyApp",
    "permissions": [
      "android.permission.INTERNET",
      "android.permission.CAMERA",
      "android.permission.READ_SMS",
      "android.permission.SEND_SMS"
    ]
  }'
```

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| `app_name` | string | App name for reference |
| `permissions` | array | Array of Android permission strings |

**Response (200 OK):**
```json
{
  "app_name": "MyApp",
  "threat_level": "suspicious",
  "risk_score": 45,
  "total_permissions": 4,
  "high_risk_count": 1,
  "medium_risk_count": 0,
  "low_risk_count": 3,
  "dangerous_permissions": [
    {
      "permission": "android.permission.READ_SMS",
      "risk_level": "high",
      "reason": "Can silently read all your SMS messages including OTPs"
    },
    {
      "permission": "android.permission.SEND_SMS",
      "risk_level": "high",
      "reason": "Can send SMS without your knowledge — can run up charges"
    }
  ],
  "recommendation": "This app requests HIGH RISK permissions. Review carefully before installing.",
  "timestamp": "2026-05-26T10:40:30.789012Z"
}
```

**Risk Score Calculation:**
- Each HIGH-risk permission = 15 points
- Each MEDIUM-risk permission = 5 points
- Maximum score = 100

---

## Report Generation

### POST `/generate-report`

Generate a detailed security report for a URL.

**Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/generate-report" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://suspicious-site.com",
    "include_virustotal": true,
    "include_whois": false
  }'
```

**Request Body:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | string | required | URL to analyze |
| `include_virustotal` | boolean | true | Include VirusTotal details |
| `include_whois` | boolean | false | Include WHOIS info |

**Response (200 OK):**
```json
{
  "url": "https://suspicious-site.com",
  "report_id": "report_9876543210",
  "generated_at": "2026-05-26T10:45:00.000000Z",
  "summary": {
    "threat_level": "dangerous",
    "confidence": 0.94,
    "overall_assessment": "CONFIRMED PHISHING ATTACK"
  },
  "ml_analysis": {
    "model_1_rf": { "prediction": "phishing", "confidence": 0.95 },
    "model_2_xgb": { "prediction": "phishing", "confidence": 0.93 },
    "ensemble": { "prediction": "phishing", "confidence": 0.94 }
  },
  "threat_intelligence": {
    "virustotal": { "engines_detected": 42, "categories": ["phishing", "malware"] },
    "google_safe_browsing": { "is_safe": false, "threats": ["PHISHING", "MALWARE"] }
  },
  "url_features": {
    "https_enabled": false,
    "domain_age_days": 3,
    "has_suspicious_redirects": true,
    "uses_shortened_url": false,
    "contains_ip_address": false
  },
  "recommendations": [
    "Do not visit this website",
    "Do not enter any credentials",
    "Report to phishing authorities",
    "Block the domain in browser"
  ]
}
```

---

## Data Models

### URL Scan Response
```json
{
  "url": "string",
  "threat_level": "safe|suspicious|dangerous|unknown",
  "confidence": 0.0-1.0,
  "ml_result": {
    "is_phishing": boolean,
    "confidence": 0.0-1.0,
    "model": "string"
  },
  "virustotal": {
    "available": boolean,
    "malicious_votes": integer,
    "suspicious_votes": integer,
    "total_engines": integer,
    "categories": ["string"],
    "permalink": "string|null"
  },
  "safe_browsing": {
    "available": boolean,
    "is_safe": boolean,
    "threats": ["string"]
  },
  "timestamp": "ISO8601",
  "recommendation": "string",
  "reasons": ["string"]
}
```

### SMS Scan Response
```json
{
  "message": "string",
  "threat_level": "safe|suspicious|dangerous|unknown",
  "confidence": 0.0-1.0,
  "ml_result": {
    "is_phishing": boolean,
    "confidence": 0.0-1.0,
    "model": "string"
  },
  "timestamp": "ISO8601",
  "recommendation": "string",
  "reasons": ["string"],
  "indicators": {
    "urgency": boolean,
    "credentials_theft": boolean,
    "url_embedded": boolean,
    "generic_greeting": boolean,
    "misspellings": boolean
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid feature vector: missing required features"
}
```

### 503 Service Unavailable
```json
{
  "detail": "ML models not loaded. Please try again later."
}
```

### 429 Too Many Requests
```json
{
  "detail": "Rate limit exceeded. Max 100 requests/minute."
}
```

---

## Rate Limiting

- **Free Tier:** 100 requests/minute per IP
- **Production:** 1000 requests/minute per API key

---

## Examples

### Python
```python
import requests

API_URL = "http://localhost:8000/api/v1"

# Scan URL
response = requests.post(
    f"{API_URL}/scan-url",
    json={
        "url": "https://example.com",
        "features": { /* 30-feature vector */ }
    }
)
print(response.json())

# Scan SMS
response = requests.post(
    f"{API_URL}/scan-sms",
    json={"message": "Click here for free money: https://sketchy.com"}
)
print(response.json())
```

### JavaScript
```javascript
const API_URL = "http://localhost:8000/api/v1";

// Scan URL
fetch(`${API_URL}/scan-url`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: "https://example.com",
    features: { /* 30-feature vector */ }
  })
}).then(r => r.json()).then(data => console.log(data));

// Scan SMS
fetch(`${API_URL}/scan-sms`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Verify your account: https://fake-bank.com"
  })
}).then(r => r.json()).then(data => console.log(data));
```

### cURL
```bash
# Health check
curl http://localhost:8000/health

# Scan URL
curl -X POST http://localhost:8000/api/v1/scan-url \
  -H "Content-Type: application/json" \
  -d @request.json

# Scan SMS
curl -X POST http://localhost:8000/api/v1/scan-sms \
  -H "Content-Type: application/json" \
  -d '{"message":"Your bank..."}'

# Get history
curl "http://localhost:8000/api/v1/threat-history?page=1&page_size=10"
```

---

## Interactive Documentation

Access interactive API docs:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

Last Updated: May 2026
