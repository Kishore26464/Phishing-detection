# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# API KEYS SETUP GUIDE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. VirusTotal API Key (FREE)

### Get Your API Key:
1. Go to: https://www.virustotal.com/gui/
2. Click "Sign Up" (top right)
3. Create account with email
4. Verify email
5. Go to: https://www.virustotal.com/gui/my-apikey
6. Copy your API key (long string starting with "xxxxxxxx")

### What it does:
- Scans URLs against 70+ antivirus engines
- Returns malware detection votes
- Shows security categories (phishing, malware, trojan, etc.)
- Free tier: 4 requests/minute, 500/day

### Add to .env:
```
VIRUSTOTAL_API_KEY=your_actual_api_key_here
```

---

## 2. Google Safe Browsing API (FREE)

### Get Your API Key:
1. Go to: https://console.cloud.google.com/
2. Create new project or select existing
3. Go to: APIs & Services → Library
4. Search for: "Safe Browsing API"
5. Click it → Click "ENABLE"
6. Go to: APIs & Services → Credentials
7. Click "Create Credentials" → "API Key"
8. Copy the key

### What it does:
- Checks URLs against Google's blocklists
- Detects phishing, malware, unwanted software
- Returns detailed threat info
- Free tier: 10,000 requests/day

### Add to .env:
```
GOOGLE_SAFE_BROWSING_KEY=your_actual_api_key_here
```

---

## 3. Firebase (Already Configured!)

You already have Firebase configured via:
```
FIREBASE_CREDENTIALS_PATH=backend/phishguard-38c10-firebase-adminsdk-fbsvc-a3ca72c671.json
```

This JSON file contains your Firebase credentials. **NEVER commit to Git!** It's already in .gitignore.

---

## Complete .env File Template:

Create `backend/.env` with:

```
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Threat Intelligence API Keys
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VIRUSTOTAL_API_KEY=your_virustotal_key_here
GOOGLE_SAFE_BROWSING_KEY=your_google_key_here

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Firebase Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIREBASE_CREDENTIALS_PATH=backend/phishguard-38c10-firebase-adminsdk-fbsvc-a3ca72c671.json

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CORS & Frontend URLs
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Development: allow all origins
# Production: use comma-separated list like: https://app.com,https://api.app.com
ALLOWED_ORIGINS=*

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Optional: Render Deployment
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Set in Render dashboard — NOT here
# LOG_LEVEL=info
# PYTHONUNBUFFERED=1
```

---

## How to Add Keys to Render (After Deploying):

1. Go to: https://dashboard.render.com
2. Select your service: "phishing-detection-api"
3. Go to: **Environment** tab
4. Add these as **Secret** environment variables:
   - Key: `VIRUSTOTAL_API_KEY`  → Value: `your_key`
   - Key: `GOOGLE_SAFE_BROWSING_KEY` → Value: `your_key`
5. Click "Save" (automatic redeploy)

---

## Test Your API Keys:

Run this to verify everything works:

```bash
python backend/test_api.py
```

See `docs/API_DOCS.md` for detailed endpoint documentation.
