# PhishGuard — Full-Stack AI Phishing & Malware Detection System

![Project Status](https://img.shields.io/badge/status-complete-brightgreen) ![Python](https://img.shields.io/badge/Python-3.11-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.111-brightgreen) ![Flutter](https://img.shields.io/badge/Flutter-3.0+-blue)

##  Project Overview

PhishGuard is a comprehensive AI-powered security solution for detecting phishing URLs, malware, and threat-level analysis across multiple platforms.

**Architecture:**
-  **Backend:** FastAPI + ML (Random Forest, XGBoost, TF-IDF)
-  **Mobile:** Flutter (Android/iOS)
-  **Chrome Extension:** Real-time URL scanning
-  **APIs:** VirusTotal, Google Safe Browsing, Firebase Firestore
-  **Deployment:** Render, HuggingFace Spaces

---

##  Key Features

### URL Scanning
- **ML-based detection:** Random Forest (97.11% accuracy) + XGBoost (96.79%)
- **Multi-engine scanning:** VirusTotal (70+ engines)
- **Google Safe Browsing:** Real-time blocklist checking
- **Feature extraction:** 30 advanced URL characteristics

### SMS/Text Analysis
- **NLP-based detection:** TF-IDF + Logistic Regression (97.58% accuracy)
- **Phishing pattern recognition:** Urgency, credentials theft, link embedding
- **Language analysis:** Legitimate vs. suspicious messaging patterns

### Mobile App (Flutter)
-  Live URL scanning with camera QR code reading
-  Device security scanning (APK permission analysis)
-  Threat history & detailed reports
-  Real-time Firebase sync

### Chrome Extension
-  Automatic URL scanning on every page load
-  Instant visual feedback (safe/risky badge)
-  Scan history
-  One-click manual scan

---

## 📊 Model Performance

| Model | Task | Accuracy | Precision | Recall | F1-Score |
|-------|------|----------|-----------|--------|----------|
| **Random Forest** | URL | 97.11% | 0.959 | 0.976 | 0.967 |
| **XGBoost** | URL | 96.79% | 0.952 | 0.973 | 0.962 |
| **TF-IDF + LR** | SMS | 97.58% | 0.971 | 0.973 | 0.972 |

---

##  Quick Start

### Prerequisites
- Python 3.11+
- Node.js 16+ (for Chrome extension)
- Flutter SDK (for mobile app)
- Git

### 1. Clone Repository
```bash
git clone https://github.com/thegitguy-56/phishing-detection.git
cd phishing-detection
```

### 2. Setup Backend
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend/requirements.txt

# Create .env file (see API_KEYS_SETUP.md)
echo "VIRUSTOTAL_API_KEY=your_key" > backend/.env
echo "GOOGLE_SAFE_BROWSING_KEY=your_key" >> backend/.env
echo "FIREBASE_CREDENTIALS_PATH=backend/phishguard-***" >> backend/.env

# Start local server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Run Tests
```bash
# From project root
python backend/test_api.py
```

### 4. Deploy to Render (see DEPLOYMENT_GUIDE.md)

### 5. Build Flutter APK

---

## 📁 Project Structure

```
phishing-detection/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── ml_engine.py            # ML model loading & prediction
│   ├── threat_intel.py         # VirusTotal & Safe Browsing integration
│   ├── firebase_service.py     # Firebase Firestore service
│   ├── routes/
│   │   ├── scan.py             # URL/SMS/QR scanning endpoints
│   │   ├── analyze.py          # APK permission analysis
│   │   ├── history.py          # Threat history retrieval
│   │   └── report.py           # Threat report generation
│   ├── models/
│   │   └── schemas.py          # Pydantic request/response models
│   ├── test_api.py             # End-to-end testing script
│   └── requirements.txt        # Python dependencies
│
├── ml_models/
│   ├── url_best_model.pkl      # Ensemble URL classifier
│   ├── url_rf_model.pkl        # Random Forest (97.11%)
│   ├── url_xgb_model.pkl       # XGBoost (96.79%)
│   ├── sms_model.pkl           # TF-IDF + LR (97.58%)
│   └── url_feature_cols.pkl    # Feature column names
│
├── frontend_flutter/
│   ├── lib/
│   │   ├── main.dart           # App entry point
│   │   ├── screens/            # UI screens
│   │   ├── models/             # Data models
│   │   ├── services/           # API & Firebase services
│   │   └── config/             # App configuration
│   ├── pubspec.yaml            # Flutter dependencies
│   └── android/                # Android-specific config
│
├── frontend_web/
│   ├── src/
│   │   ├── pages/              # Dashboard, scanners, history, analytics, settings…
│   │   ├── components/         # Layout, nav, PulseCard, ThreatBadge, ResultPanel…
│   │   ├── lib/                # api.ts, firebase.ts, firestoreScans.ts, urlFeatures.ts
│   │   └── context/            # AuthContext (Firebase Google Sign-In)
│   ├── package.json            # React + Vite + Tailwind v4 dependencies
│   └── README.md               # Web app-specific docs
│
├── chrome_extension/
│   ├── manifest.json           # Extension manifest
│   ├── background.js           # Service worker
│   ├── content.js              # Page injection script
│   ├── popup.html/css/js       # Extension popup UI
│   └── icons/                  # Extension icons
│
├── docs/
│   ├── README.md               # This file
│   ├── API_DOCS.md             # Complete API documentation
│   ├── SETUP_GUIDE.md          # Detailed setup instructions
│   ├── DEPLOYMENT_GUIDE.md     # Render/HuggingFace deployment
│   └── FLUTTER_BUILD_GUIDE.md  # Mobile build instructions
│
├── datasets/
│   ├── phishing.csv            # Training data (5,000 URLs)
│   └── sms.tsv                 # SMS training data (1,000 messages)
│
├── Procfile                    # Render deployment config
├── runtime.txt                 # Python version (3.11.9)
├── render.yaml                 # Render service definition
├── .env                        # Environment variables (local)
├── .gitignore                  # Git ignore rules
└── API_KEYS_SETUP.md           # Getting API keys guide

```

---

##  API Endpoints

### URL Scanning
```
POST /api/v1/scan-url
Request: { url: string, features: object }
Response: { threat_level: string, confidence: number, ... }
```

### SMS Scanning
```
POST /api/v1/scan-sms
Request: { message: string }
Response: { threat_level: string, confidence: number, ... }
```

### History
```
GET /api/v1/threat-history?page=1&page_size=20
Response: { history: array, total: number, page: number }
```

### App Analysis
```
POST /api/v1/analyze-app
Request: { app_name: string, permissions: string[] }
Response: { threat_level: string, risk_score: number, ... }
```

See [API_DOCS.md](API_DOCS.md) for complete documentation with examples.

---

## 🛠 Tech Stack

### Backend
- **Framework:** FastAPI 0.111.0
- **Server:** Uvicorn 0.30.0
- **ML Libraries:** scikit-learn, XGBoost, TensorFlow
- **Data:** Pandas, NumPy
- **External APIs:** VirusTotal v3, Google Safe Browsing v4
- **Database:** Firebase Firestore
- **Auth:** Firebase Admin SDK

### Frontend (Mobile)
- **Framework:** Flutter 3.0+
- **State Management:** Provider
- **Database:** Firebase Firestore, Shared Preferences
- **Auth:** Firebase Authentication
- **QR Scanning:** mobile_scanner package

### Frontend (Chrome Extension)
- **Manifest:** V3
- **APIs:** Chrome Storage, Tabs, Runtime
- **HTTP:** Fetch API

### Deployment
- **Render:** Docker container (free tier)
- **HuggingFace Spaces:** Docker deployment
- **Database:** Firebase (Spark plan - free)

---

## 🔐 Security Considerations

 **API Keys securely stored** in environment variables (never committed to Git)
 **Firebase credentials** in `.gitignore` — not exposed
 **CORS enabled** for Flutter mobile & extension only
 **HTTPS enforcement** for external APIs
 **Rate limiting** ready (via Render middleware)
 **Input validation** on all endpoints (Pydantic schemas)

---

## 📈 Performance Metrics

- **API Response Time:** < 2 seconds (URL scan)
- **SMS Scan Time:** < 500ms
- **ML Model Load Time:** ~2 seconds (startup)
- **Concurrent Requests:** 100+ (with Render free tier)
- **Firebase Sync:** Real-time
- **Uptime:** 99.5% (Render SLA)

---

## Deployment Status

| Component | Status | URL |
|-----------|--------|-----|
| Backend API | ✅ Live | [Render URL] |
| Web App | ✅ Live (GitHub Pages) | https://kishore26464.github.io/Phishing-detection/ |
| Flutter APK | ✅ Testable | Android 8.0+ |
| Chrome Extension | ✅ Ready | Load unpacked from repo |
| Firebase | ✅ Connected | Real-time Firestore |

---

## Testing

Run the comprehensive test suite:

```bash
python backend/test_api.py
```

**Tests Included:**
-  Health check
-  Phishing URL detection
-  Legitimate URL classification
-  Phishing SMS detection
-  Legitimate SMS classification
-  Threat history retrieval
-  APK permission analysis

---

## 📚 Documentation

- **[API Documentation](API_DOCS.md)** — Complete endpoint reference
- **[Setup Guide](SETUP_GUIDE.md)** — Detailed setup instructions
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** — Render & HuggingFace setup
- **[API Keys Setup](../API_KEYS_SETUP.md)** — Getting VirusTotal & Google Safe Browsing keys
- **[Flutter Build](FLUTTER_BUILD_GUIDE.md)** — Building APK for mobile

---

##  Development

### Local Backend Development
```bash
# Activate venv
source venv/bin/activate  # Windows: .\venv\Scripts\Activate.ps1

# Start with hot-reload
uvicorn backend.main:app --reload

# Access docs
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```

### Add New Endpoint
1. Create route in `backend/routes/`
2. Define schema in `backend/models/schemas.py`
3. Add to router in `backend/main.py`
4. Test with `backend/test_api.py`

### Update ML Models
```bash
# Retrain models
python ml_models/train_url_classifier.py
python ml_models/train_sms_classifier.py

# Restart backend to load new models
```

---

##  Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📝 License

This project is licensed under the **Apache License 2.0**. See `LICENSE` file for details.

---

##  Support

- 🐛 Found a bug? Open an issue on GitHub
- 💡 Have a feature request? Discuss in Discussions

---

##  Screenshots

### Mobile App
- **Home Screen:** URL/SMS input, quick scan button
- **Results:** Threat level badge, confidence percentage, detailed analysis
- **History:** Paginated scan history with filters
- **App Analysis:** Permission risk assessment for APK files

### Chrome Extension
- **Popup:** Current page threat status, manual scan option
- **Badge:** Color-coded safety indicator (green/red)
- **History:** Scan log in extension popup

### API Dashboard
- **Swagger UI:** Interactive API documentation at `/docs`
- **ReDoc:** Beautiful API reference at `/redoc`
- **Health Check:** System status at `/health`

---

##  Project Status

**Phase 1-2:** ✅ ML Models (97%+ accuracy)
**Phase 3:** ✅ FastAPI Backend (Complete)
**Phase 4:** ✅ Flutter Mobile App (Complete)
**Phase 5:** ✅ Chrome Extension (Complete)
**Phase 6:** ✅ Firebase Integration (Complete)
**Phase 7:** ✅ Testing & Deployment (Complete)
**Phase 8:** ✅ Documentation (Complete)

---

**Built with ❤️ for cybersecurity**

