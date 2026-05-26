╔════════════════════════════════════════════════════════════════════════════╗
║                     FIREBASE INTEGRATION COMPLETE                            ║
║               Phase 6: Full-Stack Firebase Setup Guide                       ║
╚════════════════════════════════════════════════════════════════════════════╝

━━ PART A: FIREBASE PROJECT SETUP (MANUAL STEPS) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ STEP 1: Create Firebase Project
────────────────────────────────────────────────────────────────────────────

1. Go to https://console.firebase.google.com
2. Click "Create a project"
3. Enter project name: phishing-detection
4. Accept Firebase terms and click "Continue"
5. Enable/Disable Analytics (recommended: Enable)
6. Click "Create project"
7. Wait 2-3 minutes for initialization to complete

────────────────────────────────────────────────────────────────────────────

✅ STEP 2: Enable Authentication
────────────────────────────────────────────────────────────────────────────

1. In Firebase Console left menu → Click "Authentication"
2. Click "Get started"
3. Under "Sign-in method" tab:
   
   a) EMAIL/PASSWORD:
      - Click "Email/Password"
      - Toggle ON → "Enable"
      - Click "Save"
   
   b) GOOGLE SIGN-IN:
      - Click "Google"
      - Toggle ON → "Enable"
      - Fill in "Project public-facing name": PhishGuard
      - Under "Project support email" select your email
      - Click "Save"

────────────────────────────────────────────────────────────────────────────

✅ STEP 3: Create Firestore Database
────────────────────────────────────────────────────────────────────────────

1. Left menu → Click "Firestore Database"
2. Click "Create database"
3. **Location**: Select region (e.g., us-central1)
4. **Mode**: Select "Production mode"
   (We'll add security rules, so this is safe)
5. Click "Create"
6. Wait for database to initialize (~1-2 minutes)

────────────────────────────────────────────────────────────────────────────

✅ STEP 4: Add Firestore Security Rules
────────────────────────────────────────────────────────────────────────────

1. Firestore Database → Click "Rules" tab
2. Replace ALL content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ─── Users Collection ────────────────────────────────────────────────
    // Users can only read/write their own document
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      
      // Sub-collection: scans
      // Users can read/write their own scans
      match /scans/{scanId} {
        allow read, write: if request.auth.uid == uid;
      }
    }
    
    // ─── Reports Collection ──────────────────────────────────────────────
    // Authenticated users can create reports (write-only for them)
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // ─── Default: Deny all ──────────────────────────────────────────────
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click "Publish"
4. Confirm when prompted

────────────────────────────────────────────────────────────────────────────

✅ STEP 5: Enable Cloud Messaging (FCM)
────────────────────────────────────────────────────────────────────────────

1. Left menu → "Cloud Messaging"
2. Check if enabled (should be auto-enabled)
3. Go to "Project Settings" (gear icon, top right)
4. Click "Cloud Messaging" tab
5. Copy your "Server API Key" (save for backend .env)
6. The key looks like: AIzaSyD...

────────────────────────────────────────────────────────────────────────────

✅ STEP 6: Get google-services.json for Flutter
────────────────────────────────────────────────────────────────────────────

1. Go to "Project Settings" (gear icon, top right)
2. Under "Your apps" section:
   - You should see an Android app icon (📱)
   
   If NOT listed, click "Add app":
   a) Select "Android"
   b) Android Package Name: **com.example.frontend_flutter**
   c) App nickname: phishing-detection-android (optional)
   d) SHA-1 fingerprint: (leave blank for development)
   e) Click "Register app"

3. Click "Download google-services.json"
4. Move the file to: **frontend_flutter/android/app/google-services.json**

   Verify structure:
   ```
   frontend_flutter/
   └── android/
       └── app/
           ├── google-services.json  ✅ HERE
           ├── build.gradle.kts
           └── src/
   ```

────────────────────────────────────────────────────────────────────────────

✅ STEP 7: Get Service Account JSON for Backend
────────────────────────────────────────────────────────────────────────────

1. Go to "Project Settings" (gear icon, top right)
2. Click "Service Accounts" tab
3. Click "Generate new private key"
4. JSON file downloads (e.g., phishing-detection-xxxxx.json)
5. Move to backend root:
   ```
   backend/
   └── phishing-detection-firebase.json  ✅ HERE
   ```

6. In backend/.env, add:
   ```
   FIREBASE_CREDENTIALS_PATH=backend/phishing-detection-firebase.json
   ```

⚠️  IMPORTANT: Add to .gitignore:
   ```
   # Don't commit Firebase credentials!
   backend/phishing-detection-firebase.json
   *.json
   ```

────────────────────────────────────────────────────────────────────────────

━━ PART B: FIRESTORE DATA STRUCTURE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Collections will be AUTO-CREATED when data is first written. Structure:

📦 users/{uid}
  ├─ uid: string
  ├─ email: string
  ├─ displayName: string (optional)
  ├─ photoUrl: string (optional)
  ├─ createdAt: timestamp
  ├─ lastLogin: timestamp
  ├─ fcm_token: string (device token for notifications)
  ├─ totalScans: number
  └─ threatsFound: number

  📂 scans/{scanId} (sub-collection)
    ├─ type: string ("url" | "sms" | "qr")
    ├─ input: string
    ├─ threatLevel: string ("safe" | "suspicious" | "dangerous")
    ├─ confidence: number (0-1)
    ├─ isPhishing: boolean
    ├─ reasons: array of strings
    ├─ mlResult: {prediction, confidence, topFeatures}
    ├─ virusTotalResult: {malicious_votes, suspicious_votes, ...}
    ├─ safeBrowsingFlagged: boolean
    ├─ timestamp: timestamp
    └─ scannedAt: timestamp

📦 reports/{reportId}
  ├─ userId: string
  ├─ url: string
  ├─ description: string
  ├─ details: string
  ├─ status: string ("pending" | "reviewed" | "resolved")
  ├─ timestamp: timestamp
  └─ createdAt: timestamp

────────────────────────────────────────────────────────────────────────────

━━ PART C: FLUTTER CODE CHANGES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ALREADY UPDATED FILES:

1. lib/services/firebase_service.dart
   ✅ Complete Firestore CRUD operations
   ✅ FCM initialization and notifications
   ✅ User data persistence
   ✅ Scan history retrieval

2. lib/services/auth_service.dart
   ✅ NEW FILE - Convenience wrapper for auth
   ✅ Google Sign-In
   ✅ Firebase initialization

3. lib/screens/login_screen.dart
   ✅ Already uses FirebaseService.signInWithGoogle()
   ✅ Saves FCM token on login

4. lib/screens/home_screen.dart
   ✅ Already loads stats from Firestore
   ✅ Already displays user email

5. lib/screens/history_screen.dart
   ✅ Already loads real scan history from Firestore
   ✅ Already has filtering UI

────────────────────────────────────────────────────────────────────────────

✅ TO INTEGRATE IN FLUTTER APP:

In any screen where you save a scan result, do this:

```dart
import 'services/firebase_service.dart';
import 'models/scan_result.dart';

final _firebase = FirebaseService();

// After getting scan result from backend:
await _firebase.saveScanResult(scanResult);

// Or save to reports:
await _firebase.saveReport(
  url: 'https://phishing-site.com',
  reason: 'Suspicious login form',
  details: 'Tried to steal credentials',
);
```

────────────────────────────────────────────────────────────────────────────

━━ PART D: BACKEND CODE CHANGES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ALREADY CREATED/UPDATED:

1. backend/firebase_service.py
   ✅ NEW FILE - Complete Firebase integration
   - save_scan_result() - Save to Firestore
   - save_report() - Save threat reports
   - get_user_stats() - Retrieve user statistics
   - get_recent_scans() - Get scan history
   - send_threat_notification() - Send FCM notifications
   - send_bulk_notifications() - Batch send notifications

2. backend/main.py
   ✅ UPDATED - Firebase initialization in lifespan
   - Imports firebase_service
   - Initializes Firebase on startup
   - Logs Firebase status

3. backend/routes/scan.py
   ✅ UPDATED - All endpoints save to Firestore
   - scan_url() - Saves URL scan results
   - scan_sms() - Saves SMS scan results
   - scan_qr() - Saves QR scan results
   - Optional user_id parameter for each

4. backend/models/schemas.py
   ✅ UPDATED - Added user_id fields to requests
   - URLScanRequest.user_id
   - SMSScanRequest.user_id
   - QRScanRequest.user_id

5. backend/requirements.txt
   ✅ UPDATED - Added firebase-admin==6.4.0

────────────────────────────────────────────────────────────────────────────

✅ BACKEND SETUP:

1. Install Firebase admin SDK:
   ```bash
   pip install firebase-admin==6.4.0
   # or
   pip install -r requirements.txt
   ```

2. Create backend/.env with:
   ```
   FIREBASE_CREDENTIALS_PATH=backend/phishing-detection-firebase.json
   FIREBASE_SERVER_API_KEY=AIzaSyD...  # From Cloud Messaging settings
   ```

3. Place your Firebase service account JSON:
   ```
   cp ~/Downloads/phishing-detection-xxxxx.json backend/phishing-detection-firebase.json
   ```

4. Add to .gitignore:
   ```
   backend/phishing-detection-firebase.json
   ```

5. Run backend:
   ```bash
   uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```

   You should see:
   ```
   ✅ Firebase service initialized successfully
   ✅ Firebase initialized and ready for Firestore operations
   ```

────────────────────────────────────────────────────────────────────────────

━━ PART E: TESTING FIREBASE INTEGRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ TEST 1: Verify Backend Firebase
────────────────────────────────────────────────────────────────────────────

Check backend logs on startup:
```
✅ Firebase service initialized successfully
✅ Firebase initialized and ready for Firestore operations
```

✅ TEST 2: Check Firestore Console
────────────────────────────────────────────────────────────────────────────

1. Go to Firebase Console → Firestore Database
2. Make a test scan from Flutter app
3. You should see new collections auto-create:
   - users/{uid}
   - users/{uid}/scans
   - reports

✅ TEST 3: Test URL Scan with user_id
────────────────────────────────────────────────────────────────────────────

```bash
curl -X POST "http://localhost:8000/api/v1/scan-url" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://google.com",
    "user_id": "test_user_123",
    "features": {
      "UsingIP": 0, "LongURL": 0, "ShortURL": 0, "Symbol@": 0,
      "Redirecting//": 0, "PrefixSuffix-": 0, "SubDomains": 0,
      "HTTPS": 0, "DomainRegLen": 0, "Favicon": 0, "NonStdPort": 0,
      "HTTPSDomainURL": 0, "RequestURL": 0, "AnchorURL": 0,
      "LinksInScriptTags": 0, "ServerFormHandler": 0, "InfoEmail": 0,
      "AbnormalURL": 0, "WebsiteForwarding": 0, "StatusBarCust": 0,
      "DisableRightClick": 0, "UsingPopupWindow": 0, "IframeRedirection": 0,
      "AgeofDomain": 0, "DNSRecording": 0, "WebsiteTraffic": 0,
      "PageRank": 0, "GoogleIndex": 0, "LinksPointingToPage": 0,
      "StatsReport": 0
    }
  }'
```

Check Firestore → users/test_user_123/scans → Should see new document

✅ TEST 4: Test SMS Scan
────────────────────────────────────────────────────────────────────────────

```bash
curl -X POST "http://localhost:8000/api/v1/scan-sms" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Congratulations! You won $1000. Click here: bit.ly/win",
    "user_id": "test_user_123"
  }'
```

Check Firestore → users/test_user_123/scans → Should see SMS scan

────────────────────────────────────────────────────────────────────────────

━━ PART F: FLUTTER TO BACKEND INTEGRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When Flutter app calls backend, include user_id in request:

Example: In lib/services/api_service.dart or scan screens:

```dart
// Get user UID from Firebase
final authService = AuthService();
final userId = authService.uid;

// When calling backend, include user_id:
final response = await http.post(
  Uri.parse('$backendUrl/api/v1/scan-url'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'url': urlToScan,
    'user_id': userId,  // ✅ ADD THIS
    'features': extractedFeatures,
  }),
);
```

This ensures every scan is saved to Firestore automatically.

────────────────────────────────────────────────────────────────────────────

━━ PART G: CLOUD MESSAGING (FCM) - PUSH NOTIFICATIONS ━━━━━━━━━━━━━━━━━━

✅ FLUTTER SIDE (Already Done):

- lib/services/firebase_service.dart::initFcm()
  ✅ Requests notification permission
  ✅ Sets up notification channel
  ✅ Listens to FCM messages
  ✅ Shows local notifications

- lib/services/firebase_service.dart::saveFcmToken()
  ✅ Gets device token
  ✅ Saves to Firestore users/{uid}.fcm_token

- lib/screens/login_screen.dart
  ✅ Calls saveFcmToken() after successful login

✅ BACKEND SIDE (Ready to Use):

Send notifications from backend:

```python
from backend.firebase_service import firebase_service

# Send to single user
firebase_service.send_threat_notification(
    user_id="user_123",
    fcm_token="device_token_here",
    title="⚠️ Phishing Alert",
    body="Suspicious URL detected: Click Safe Browsing",
    threat_level="dangerous"
)

# Batch send
notifications = [
    {
        "fcm_token": "token1",
        "title": "🚨 High Risk Detected",
        "body": "Malware URL blocked",
        "threat_level": "dangerous"
    },
    {
        "fcm_token": "token2",
        "title": "⚠️ Suspicious Activity",
        "body": "Check your scan history",
        "threat_level": "suspicious"
    },
]
firebase_service.send_bulk_notifications(notifications)
```

────────────────────────────────────────────────────────────────────────────

━━ PART H: ENVIRONMENT VARIABLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

backend/.env should contain:

```
# ─── Firebase ─────────────────────────────────────────────────
FIREBASE_CREDENTIALS_PATH=backend/phishing-detection-firebase.json
FIREBASE_SERVER_API_KEY=AIzaSyD...  # Get from Cloud Messaging settings

# ─── API ──────────────────────────────────────────────────────
PUBLIC_API_URL=http://localhost:8000  # Or your deployed URL

# ─── CORS ─────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost,http://localhost:8100,*

# ─── Threat Intel ─────────────────────────────────────────────
VIRUSTOTAL_API_KEY=your_vt_key_here
GOOGLE_SAFE_BROWSING_KEY=your_gsb_key_here
```

────────────────────────────────────────────────────────────────────────────

━━ SUMMARY OF CHANGES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Files Created:
  - backend/firebase_service.py (complete Firebase integration)
  - frontend_flutter/lib/services/auth_service.dart (auth wrapper)

✅ Files Updated:
  - backend/main.py (Firebase initialization)
  - backend/routes/scan.py (save results to Firestore)
  - backend/models/schemas.py (added user_id fields)
  - backend/requirements.txt (added firebase-admin)

✅ Already Complete:
  - frontend_flutter/lib/services/firebase_service.dart
  - frontend_flutter/lib/screens/login_screen.dart
  - frontend_flutter/lib/screens/home_screen.dart
  - frontend_flutter/lib/screens/history_screen.dart
  - pubspec.yaml (all Firebase dependencies)
  - main.dart (Firebase initialization)
  - Firestore security rules

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PHASE 6 COMPLETE! Your phishing detection system is now fully integrated
   with Firebase for:
   
   ✓ User authentication (Google Sign-In)
   ✓ Scan history persistence (Firestore)
   ✓ Real-time push notifications (FCM)
   ✓ User analytics (Firebase Analytics ready)
   ✓ Cross-device sync
   ✓ Secure data storage

Ready for Phase 7: Deployment! 🚀
