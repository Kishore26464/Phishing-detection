# Complete Setup Guide — PhishGuard Project

**For:** Complete beginners, full-stack developers, or anyone setting up the project from scratch.

**Time Required:** ~30 minutes (with API keys), ~45 minutes with Flutter APK build

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Python 3.11+** → [Download](https://www.python.org/downloads/)
- **Git** → [Download](https://git-scm.com/downloads)
- **Flutter SDK** (optional, for mobile app) → [Install](https://flutter.dev/docs/get-started/install)
- **Android Studio** (optional, for Flutter) → [Download](https://developer.android.com/studio)
- **Node.js 16+** (optional, for Chrome extension) → [Download](https://nodejs.org/)

**Verify installations:**
```bash
python --version          # Should be 3.11+
git --version             # Any recent version
flutter --version         # Optional
```

---

## 🎯 Step 1: Clone the Repository

```bash
# Clone the repo
git clone https://github.com/thegitguy-56/phishing-detection.git
cd phishing-detection

# Verify structure
ls -la                    # View directory contents
```

**Expected output:**
```
backend/           (FastAPI code)
ml_models/         (Trained ML models)
frontend_flutter/  (Flutter mobile app)
chrome_extension/  (Chrome extension)
docs/              (This guide + API docs)
datasets/          (Training data)
requirements.txt   (Python dependencies)
Procfile          (Render deployment)
runtime.txt       (Python version)
render.yaml       (Render config)
```

---

## 🐍 Step 2: Setup Python Backend

### 2.1 Create Virtual Environment

```bash
# Windows
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

**Verify activation:**
```bash
# You should see (venv) at the start of terminal prompt
# Python path should show venv directory
which python          # macOS/Linux
where python          # Windows PowerShell
```

### 2.2 Install Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install all backend dependencies
pip install -r backend/requirements.txt
```

**Expected packages:**
- ✅ fastapi (0.111.0)
- ✅ uvicorn (0.30.0)
- ✅ scikit-learn, xgboost (ML models)
- ✅ firebase-admin (Firestore)
- ✅ requests (HTTP client)
- ✅ python-dotenv (Environment variables)

**Verify installation:**
```bash
python -c "import fastapi; print('FastAPI:', fastapi.__version__)"
python -c "import sklearn; print('Scikit-learn:', sklearn.__version__)"
```

### 2.3 Setup Environment Variables

Create `backend/.env` file:

```bash
# Windows
echo VIRUSTOTAL_API_KEY=your_key > backend\.env
echo GOOGLE_SAFE_BROWSING_KEY=your_key >> backend\.env
echo FIREBASE_CREDENTIALS_PATH=backend/phishguard-38c10-firebase-adminsdk-fbsvc-a3ca72c671.json >> backend\.env

# macOS / Linux
echo "VIRUSTOTAL_API_KEY=your_key" > backend/.env
echo "GOOGLE_SAFE_BROWSING_KEY=your_key" >> backend/.env
echo "FIREBASE_CREDENTIALS_PATH=backend/phishguard-38c10-firebase-adminsdk-fbsvc-a3ca72c671.json" >> backend/.env
```

Or manually create `backend/.env`:
```
VIRUSTOTAL_API_KEY=your_virustotal_key_here
GOOGLE_SAFE_BROWSING_KEY=your_google_key_here
FIREBASE_CREDENTIALS_PATH=backend/phishguard-38c10-firebase-adminsdk-fbsvc-a3ca72c671.json
ALLOWED_ORIGINS=*
```

**Get API keys:**
See [API_KEYS_SETUP.md](../API_KEYS_SETUP.md) for step-by-step instructions.

### 2.4 Start Local Backend Server

```bash
# Make sure you're in project root with venv activated
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
✅ Models loaded — URL: RandomForestClassifier | SMS: Pipeline | Features: 30
```

**Access in browser:**
- 🔷 Swagger UI: http://localhost:8000/docs
- 📘 ReDoc: http://localhost:8000/redoc
- 💚 Health: http://localhost:8000/health

---

## 🧪 Step 3: Test Backend API

### 3.1 Run Comprehensive Test Suite

In a **new terminal** (keep backend running in the first one):

```bash
# Activate venv first (if not already)
# Windows: .\venv\Scripts\Activate.ps1
# macOS/Linux: source venv/bin/activate

# Run tests
python backend/test_api.py
```

**Expected output:**
```
========================================================================
🔒 PHISHING & MALWARE DETECTION API - COMPREHENSIVE TEST SUITE
========================================================================

▶ Health Check
  ✓ PASS

▶ Scan Phishing URL
  ℹ Threat Level: DANGEROUS
  ✓ PASS

▶ Scan Legitimate URL
  ℹ Threat Level: SAFE
  ✓ PASS

▶ Scan Phishing SMS
  ℹ Threat Level: DANGEROUS
  ✓ PASS

▶ Scan Legitimate SMS
  ℹ Threat Level: SAFE
  ✓ PASS

▶ Get Threat History
  ✓ PASS

▶ Analyze App Permissions
  ✓ PASS

========================================================================
TEST SUMMARY
========================================================================

✓ ALL TESTS PASSED!
```

### 3.2 Manual API Testing

**Test URL Scanning (using Python):**
```python
import requests

response = requests.post(
    "http://localhost:8000/api/v1/scan-url",
    json={
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
    }
)

print(response.json())
```

**Or using cURL:**
```bash
curl -X POST "http://localhost:8000/api/v1/scan-sms" \
  -H "Content-Type: application/json" \
  -d '{"message":"Your bank account has been locked. Click: https://fake-bank.com"}'
```

---

## 📱 Step 4: Setup Flutter Mobile App (Optional)

### 4.1 Install Flutter SDK

```bash
# Check if Flutter is installed
flutter --version

# If not, download from: https://flutter.dev/docs/get-started/install
```

### 4.2 Get Dependencies

```bash
cd frontend_flutter
flutter pub get
cd ..
```

### 4.3 Run on Android Emulator

```bash
# Start emulator (if not running)
flutter emulators --launch pixel_5  # or your emulator name

# Run app
cd frontend_flutter
flutter run
cd ..
```

### 4.4 Build APK (Release)

```bash
cd frontend_flutter

# Build release APK
flutter build apk --release

# Find APK at: build/app/outputs/flutter-apk/app-release.apk
cd ..
```

**Install on phone:**
```bash
# Transfer APK to phone and tap to install
# Or use ADB
adb install frontend_flutter/build/app/outputs/flutter-apk/app-release.apk
```

---

## 🔗 Step 5: Setup Chrome Extension (Optional)

### 5.1 Load Extension in Chrome

1. Open Chrome → **Manage Extensions** (chrome://extensions)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Navigate to: `phishing-detection/chrome_extension/`
5. Select the folder and click **Open**

**Verify installation:**
- You should see PhishGuard icon in extension bar
- Click icon to see popup with current URL status

### 5.2 Test Extension

1. Visit a URL (e.g., https://google.com)
2. Check extension badge (should show green for safe)
3. Click extension icon to see full details
4. Test with phishing URLs to see red badge

---

## 🚀 Step 6: Deploy to Render (Production)

### 6.1 Prepare GitHub Repository

```bash
# Initialize Git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial project setup"

# Add remote (replace with your GitHub repo)
git remote add origin https://github.com/yourusername/phishing-detection.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 6.2 Deploy on Render

1. Go to **[Render Dashboard](https://dashboard.render.com)**
2. Click **New** → **Web Service**
3. Select **GitHub** and choose your repo
4. Fill in details:
   - **Name:** `phishing-detection-api`
   - **Runtime:** Python
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

5. Add **Environment Variables** (Secret):
   - Key: `VIRUSTOTAL_API_KEY` → Value: `your_key`
   - Key: `GOOGLE_SAFE_BROWSING_KEY` → Value: `your_key`
   - Key: `FIREBASE_CREDENTIALS_PATH` → Value: `backend/phishguard-38c10-firebase-adminsdk-fbsvc-a3ca72c671.json`

6. Click **Create Web Service**

**Build time:** 5-10 minutes

**Access deployed API:**
```bash
https://your-service-name.onrender.com/docs
```

### 6.3 Update Flutter App

Update the API URL in Flutter:

1. Open `frontend_flutter/lib/config/api_config.dart`
2. Change:
   ```dart
   // From:
   static const String API_BASE_URL = 'http://localhost:8000';
   
   // To:
   static const String API_BASE_URL = 'https://your-service-name.onrender.com';
   ```

3. Rebuild and redeploy APK

---

## 📊 Step 7: Verify Complete Setup

Run this checklist:

- [ ] Backend running locally (http://localhost:8000/docs accessible)
- [ ] All tests pass (`python backend/test_api.py`)
- [ ] Firebase credentials file exists (`backend/phishguard-38c10-firebase-adminsdk-fbsvc-a3ca72c671.json`)
- [ ] `.env` file has API keys configured
- [ ] Chrome extension loads and shows badge
- [ ] Flutter app connects to API (if built)
- [ ] Render deployment successful (if deployed)

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version          # Must be 3.11+

# Reinstall dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt

# Check if port 8000 is in use
# Windows: netstat -ano | findstr :8000
# macOS/Linux: lsof -i :8000
```

### ML models not loading
```bash
# Check if model files exist
ls -la ml_models/

# Should have:
# - url_best_model.pkl
# - url_rf_model.pkl
# - url_xgb_model.pkl
# - sms_model.pkl
# - url_feature_cols.pkl

# If missing, retrain models
python ml_models/train_url_classifier.py
python ml_models/train_sms_classifier.py
```

### API keys not working
- [ ] Check `.env` file has correct paths
- [ ] Verify `.env` is in `backend/` directory (not root)
- [ ] Restart backend after editing `.env`
- [ ] Check keys are correct at virustotal.com and console.cloud.google.com

### Firebase connection failed
- [ ] Verify Firebase credentials file path in `.env`
- [ ] Check JSON file is valid (no missing quotes)
- [ ] Ensure Firebase project has Firestore enabled

### Flutter app can't connect to API
- [ ] Check backend is running (`http://localhost:8000/health`)
- [ ] Verify network connection on phone
- [ ] Update API URL in `lib/config/api_config.dart`
- [ ] On Android emulator, use `http://10.0.2.2:8000` instead of `localhost`

---

## 📚 Next Steps

1. **Read:** [API_DOCS.md](API_DOCS.md) — Complete endpoint documentation
2. **Read:** [API_KEYS_SETUP.md](../API_KEYS_SETUP.md) — Getting API keys
3. **Deploy:** Follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for production
4. **Build:** See [FLUTTER_BUILD_GUIDE.md](FLUTTER_BUILD_GUIDE.md) for APK

---

## 💡 Common Commands

```bash
# Backend
uvicorn backend.main:app --reload              # Start dev server
python backend/test_api.py                      # Run tests
python -c "from backend.ml_engine import ml_engine; ml_engine.load_models(); print(ml_engine.status())"

# Flutter
flutter pub get                                 # Get packages
flutter run                                     # Run on device/emulator
flutter build apk --release                     # Build release APK

# Git
git status                                      # Check changes
git add .                                       # Stage all
git commit -m "message"                         # Commit
git push origin main                            # Push to GitHub
```

---

## ❓ Questions?

- 🐛 Report bugs: [GitHub Issues](https://github.com/thegitguy-56/phishing-detection/issues)
- 💬 Discuss: [GitHub Discussions](https://github.com/thegitguy-56/phishing-detection/discussions)
- 📧 Email: contact@phishguard.com

---

**Last Updated:** May 2026
**Version:** 1.0.0
