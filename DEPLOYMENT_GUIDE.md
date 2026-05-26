# Deployment to HuggingFace Spaces

## Pre-Deployment Checklist

```bash
# 1. Verify models load correctly locally
cd phishing-detection
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
python -c "from backend.ml_engine import ml_engine; ml_engine.load_models(); print(ml_engine.status())"

# Expected output:
# {'loaded': True, 'url_model': 'RandomForestClassifier', 'sms_model': 'Pipeline', 'url_features': 30}

# 2. Test endpoint locally
uvicorn backend.main:app --host 127.0.0.1 --port 8000
# In another terminal:
# curl -X POST "http://localhost:8000/api/v1/scan-url" \
#   -H "Content-Type: application/json" \
#   -d '{"url":"https://google.com","features":{}}'

# 3. Check all models exist
ls -la ml_models/*.pkl
# Should have:
# - url_best_model.pkl
# - url_rf_model.pkl
# - url_xgb_model.pkl
# - url_feature_cols.pkl
# - sms_model.pkl
```

## HuggingFace Spaces Setup

### Step 1: Create Space
- Go to https://huggingface.co/spaces
- Click "Create new Space"
- **Space name**: `phishing-detection-api`
- **Select license**: Apache 2.0
- **Space SDK**: Docker
- Create space

### Step 2: Docker Configuration
The existing `Dockerfile` should work. Verify it contains:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY ml_models ./ml_models

EXPOSE 7860

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
```

**Key points:**
- Port must be **7860** (HuggingFace Spaces default)
- All model files must be copied
- Requirements must include all ML packages

### Step 3: Deploy
```bash
# Clone the space repo
git clone https://huggingface.co/spaces/YOUR_USERNAME/phishing-detection-api
cd phishing-detection-api

# Copy all files
cp -r ../phishing-detection/backend .
cp -r ../phishing-detection/ml_models .
cp ../phishing-detection/Dockerfile .

# Push to HF
git add .
git commit -m "Initial deployment: phishing detection API with fixed models"
git push
```

**Build will take 5-10 minutes** while HF builds and deploys the Docker image.

### Step 4: Test Deployment
Once deployed, test the live API:

```bash
API_URL="https://YOUR_USERNAME-phishing-detection-api.hf.space"

# Test URL scan
curl -X POST "$API_URL/api/v1/scan-url" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://suspicious-banking-verify.com/account",
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
  }'

# Expected response (200 OK):
# {
#   "url": "http://suspicious-banking-verify.com/account",
#   "threat_level": "dangerous",
#   "confidence": 0.xxxx,
#   "is_phishing": true,
#   "reasons": [...],
#   "ml_result": {...},
#   "virustotal": null,
#   "safe_browsing_flagged": false,
#   "scan_time_ms": xx.xx
# }
```

### Step 5: Access API Documentation
- **Swagger UI**: `https://YOUR_USERNAME-phishing-detection-api.hf.space/docs`
- **ReDoc**: `https://YOUR_USERNAME-phishing-detection-api.hf.space/redoc`

## Environment Variables (if needed)

Create a `.env` file locally (not in git):
```
ALLOWED_ORIGINS=*,https://your-frontend-domain.com
VIRUSTOTAL_API_KEY=your_key_here
SAFE_BROWSING_API_KEY=your_key_here
```

For HF Spaces, add as **Space Secrets**:
1. Go to Space Settings → Secrets
2. Add each environment variable

## API Endpoints Reference

### POST /api/v1/scan-url
**Request:**
```json
{
  "url": "string",
  "features": {
    "UsingIP": 0, "LongURL": 1, ...  // 30 binary features (optional)
  }
}
```

**Response (200):**
```json
{
  "url": "string",
  "threat_level": "safe|suspicious|dangerous",
  "confidence": 0.0-1.0,
  "is_phishing": true|false,
  "reasons": ["string"],
  "ml_result": {...},
  "virustotal": null|{...},
  "safe_browsing_flagged": false,
  "scan_time_ms": number
}
```

### POST /api/v1/scan-sms
**Request:**
```json
{
  "message": "string"
}
```

**Response (200):**
```json
{
  "message": "string",
  "threat_level": "safe|suspicious|dangerous",
  "confidence": 0.0-1.0,
  "is_phishing": true|false,
  "reasons": ["string"],
  "triggered_keywords": ["string"],
  "scan_time_ms": number
}
```

### POST /api/v1/scan-qr
**Request:**
```json
{
  "decoded_url": "string"
}
```

**Response (200):**
```json
{
  "decoded_url": "string",
  "threat_level": "safe|suspicious|dangerous",
  "confidence": 0.0-1.0,
  "is_phishing": true|false,
  "reasons": ["string"],
  "url_scan": {...},
  "scan_time_ms": number
}
```

## Troubleshooting HF Spaces

### Build fails with "Module not found"
- → Check `backend/requirements.txt` has all imports
- → Verify all files are copied in Dockerfile

### API returns 503 "Models not loaded"
- → Check model files exist: `docker exec container ls -la /app/ml_models/`
- → Check logs: HF Spaces dashboard → Logs tab
- → Verify path: should be `/app/ml_models/` in container

### Timeout on first request
- → Normal for first request (models load ~2-3s)
- → Subsequent requests are faster
- → Increase timeout if < 10s

### Memory issues (403)
- → Models are large (~200-300 MB loaded)
- → HF Spaces free tier has 8 GB
- → Should be sufficient, but monitor logs

## Continuous Deployment

To auto-update when models change:

```bash
# Whenever you retrain models locally:
cd ml_models
python train_url_classifier.py
python train_sms_classifier.py

# Commit and push to HF
cd ..
git add ml_models/*.pkl
git commit -m "Updated URL and SMS models"
git push

# HF will automatically rebuild and redeploy
```

## Performance Notes

- **Cold start**: 2-3 seconds (first request)
- **Warm inference**: 100-200ms per request
- **Model load time**: ~2 seconds
- **Typical response time**: 150-200ms

---

**Status**: Ready for production deployment ✅
