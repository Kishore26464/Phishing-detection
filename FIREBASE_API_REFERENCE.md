╔══════════════════════════════════════════════════════════════════════════════╗
║                     FIREBASE INTEGRATION - QUICK API REFERENCE                ║
║                          (For Developers)                                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BACKEND API ENDPOINTS (Updated):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. POST /api/v1/scan-url
   ────────────────────────────────────────────────────────────────────────────
   Scan a URL and save result to Firestore
   
   Request:
   {
     "url": "https://example.com",
     "user_id": "firebase_uid_here",  ← NEW (optional)
     "features": { ... }  ← 30 binary features
   }
   
   Response:
   {
     "url": "https://example.com",
     "threat_level": "safe",
     "confidence": 0.98,
     "is_phishing": false,
     "reasons": ["Uses HTTPS", "Known safe domain"],
     "ml_result": {...},
     "virustotal": {...},
     "safe_browsing_flagged": false,
     "scan_time_ms": 234.5
   }
   
   Firestore Result (if user_id provided):
   users/{user_id}/scans/{scanId}
   {
     "type": "url",
     "input": "https://example.com",
     "threatLevel": "safe",
     "confidence": 0.98,
     "isPhishing": false,
     "reasons": [...],
     "timestamp": <server_timestamp>,
     "scannedAt": <server_timestamp>
   }

2. POST /api/v1/scan-sms
   ────────────────────────────────────────────────────────────────────────────
   Scan SMS message and save to Firestore
   
   Request:
   {
     "message": "Click here to win $1000: bit.ly/win",
     "user_id": "firebase_uid_here"  ← NEW (optional)
   }
   
   Response:
   {
     "message": "Click here to win $1000: bit.ly/win",
     "threat_level": "dangerous",
     "confidence": 0.92,
     "is_phishing": true,
     "reasons": ["Phishing keywords detected"],
     "triggered_keywords": ["win", "click", "link"],
     "scan_time_ms": 45.2
   }
   
   Firestore Result:
   users/{user_id}/scans/{scanId}
   {
     "type": "sms",
     "input": "Click here to win $1000: bit.ly/win",
     "threatLevel": "dangerous",
     "confidence": 0.92,
     "isPhishing": true,
     "reasons": [...],
     "triggeredKeywords": [...],
     "timestamp": <server_timestamp>
   }

3. POST /api/v1/scan-qr
   ────────────────────────────────────────────────────────────────────────────
   Scan QR code and save to Firestore
   
   Request:
   {
     "decoded_url": "https://phishing-site.com",
     "user_id": "firebase_uid_here"  ← NEW (optional)
   }
   
   Response:
   {
     "decoded_url": "https://phishing-site.com",
     "threat_level": "dangerous",
     "confidence": 0.85,
     "is_phishing": true,
     "reasons": ["[QR Code] Suspicious domain", ...],
     "url_scan": {...},
     "scan_time_ms": 312.1
   }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIREBASE SERVICE (backend/firebase_service.py):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Firestore Operations:
─────────────────────────────────────────────────────────────────────────────

1. firebase_service.save_scan_result(user_id: str, scan_data: dict) -> bool
   
   Save a scan result to Firestore.
   
   Example:
   ```python
   from backend.firebase_service import firebase_service
   
   scan_data = {
       "type": "url",
       "input": "https://suspicious.com",
       "threatLevel": "dangerous",
       "confidence": 0.95,
       "isPhishing": True,
       "reasons": ["Blacklisted URL"],
   }
   
   success = firebase_service.save_scan_result("user_123", scan_data)
   if success:
       print("✅ Scan saved to Firestore")
   ```
   
   Firestore Path: users/{user_id}/scans/{auto_generated_id}

2. firebase_service.save_report(
     user_id: str,
     url: str,
     description: str,
     details: str = None
   ) -> bool
   
   Save a threat report.
   
   Example:
   ```python
   firebase_service.save_report(
       user_id="user_123",
       url="https://phishing-site.com",
       description="This site is stealing credentials",
       details="Pretends to be a bank login"
   )
   ```
   
   Firestore Path: reports/{auto_generated_id}

3. firebase_service.get_user_stats(user_id: str) -> dict
   
   Get scan statistics for a user.
   
   Example:
   ```python
   stats = firebase_service.get_user_stats("user_123")
   # Returns: {"total": 45, "safe": 40, "suspicious": 4, "dangerous": 1}
   ```

4. firebase_service.get_recent_scans(
     user_id: str,
     limit: int = 10
   ) -> List[dict]
   
   Get recent scans for a user.
   
   Example:
   ```python
   scans = firebase_service.get_recent_scans("user_123", limit=5)
   for scan in scans:
       print(f"{scan['type']}: {scan['threatLevel']}")
   ```

Cloud Messaging (FCM) Operations:
─────────────────────────────────────────────────────────────────────────────

5. firebase_service.send_threat_notification(
     user_id: str,
     fcm_token: str,
     title: str,
     body: str,
     threat_level: str = "suspicious"
   ) -> bool
   
   Send push notification to a device.
   
   Example:
   ```python
   firebase_service.send_threat_notification(
       user_id="user_123",
       fcm_token="device_token_from_firestore",
       title="🚨 Malware Detected!",
       body="URL: phishing-site.com",
       threat_level="dangerous"
   )
   ```

6. firebase_service.send_bulk_notifications(
     notifications: List[dict]
   ) -> int
   
   Send notifications to multiple devices.
   
   Example:
   ```python
   notifications = [
       {
           "fcm_token": "token1",
           "title": "⚠️ Phishing Alert",
           "body": "Suspicious URL detected",
           "threat_level": "dangerous"
       },
       {
           "fcm_token": "token2",
           "title": "⚠️ SMS Phishing",
           "body": "Malicious message detected",
           "threat_level": "suspicious"
       },
   ]
   
   sent = firebase_service.send_bulk_notifications(notifications)
   print(f"Sent {sent} notifications")
   ```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FLUTTER SERVICES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Authentication (lib/services/auth_service.dart):
─────────────────────────────────────────────────────────────────────────────

```dart
import 'services/auth_service.dart';

final authService = AuthService();

// Initialize on app startup
await authService.initialize();

// Sign in with Google
final user = await authService.signInWithGoogle();

// Get current user info
print(authService.uid);           // Firebase UID
print(authService.userEmail);     // User email
print(authService.displayName);   // User name

// Listen to auth changes
authService.authStateStream.listen((user) {
  if (user != null) {
    print("Logged in as: ${user.email}");
  } else {
    print("Logged out");
  }
});

// Sign out
await authService.signOut();
```

Firestore Operations (lib/services/firebase_service.dart):
─────────────────────────────────────────────────────────────────────────────

```dart
import 'services/firebase_service.dart';
import 'models/scan_result.dart';

final firebaseService = FirebaseService();

// Save scan result (automatically called from backend response)
await firebaseService.saveScanResult(scanResult);

// Get scan history
List<ThreatHistoryItem> history = 
  await firebaseService.getScanHistory(limit: 50);

// Get stats
Map<String, int> stats = await firebaseService.getUserStats();
print("Total scans: ${stats['total']}");
print("Safe: ${stats['safe']}");
print("Dangerous: ${stats['dangerous']}");

// Save report
await firebaseService.saveReport(
  url: 'https://phishing-site.com',
  reason: 'Credential stealing attempt',
  details: 'Fake bank login form'
);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTEGRATION IN FLUTTER SCAN SCREENS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Example: Scanning a URL with Firebase persistence

```dart
import 'services/api_service.dart';
import 'services/auth_service.dart';

class URLScannerScreen extends StatefulWidget {
  @override
  State<URLScannerScreen> createState() => _URLScannerScreenState();
}

class _URLScannerScreenState extends State<URLScannerScreen> {
  final apiService = ApiService();
  final authService = AuthService();

  Future<void> scanURL(String url) async {
    try {
      // Get user ID
      final userId = authService.uid;
      
      // Call backend with user_id
      final response = await apiService.scanUrl(
        url: url,
        userId: userId,  // ← Include this
        features: extractedFeatures,
      );
      
      // Result is now in Firestore automatically!
      // Firebase backend saved it to: users/{userId}/scans/
      
      setState(() {
        scanResult = response;
      });
    } catch (e) {
      print("Error: $e");
    }
  }
}
```

When backend receives this request, it:
1. Processes the scan
2. Saves result to Firestore under users/{userId}/scans/
3. Returns response to Flutter
4. Firebase real-time listeners update UI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENVIRONMENT VARIABLES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

backend/.env must contain:

```
# Firebase
FIREBASE_CREDENTIALS_PATH=backend/phishing-detection-firebase.json
FIREBASE_SERVER_API_KEY=AIzaSyD...  # From Firebase Project Settings

# API
PUBLIC_API_URL=http://localhost:8000

# CORS
ALLOWED_ORIGINS=*
```

Get values from:
- FIREBASE_SERVER_API_KEY: Firebase Console → Project Settings → Cloud Messaging tab
- FIREBASE_CREDENTIALS_PATH: Download from Project Settings → Service Accounts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIRESTORE SECURITY RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ users/{uid}
   - Only UID can read/write their own document

✅ users/{uid}/scans/{scanId}
   - Only UID can read/write their own scans
   - Automatically created on first scan save

✅ reports/{reportId}
   - Authenticated users can CREATE
   - Can only READ their own reports
   - Can only UPDATE/DELETE their own reports

✅ All other paths: DENY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TESTING CURL COMMANDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Test URL Scan (saves to Firestore):
   ───────────────────────────────────────────────────────────────────────────
   
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

2. Test SMS Scan (saves to Firestore):
   ───────────────────────────────────────────────────────────────────────────
   
   curl -X POST "http://localhost:8000/api/v1/scan-sms" \
     -H "Content-Type: application/json" \
     -d '{
       "message": "Congratulations! You won $1000. Click: bit.ly/win",
       "user_id": "test_user_123"
     }'

After these requests, check Firestore:
- users/test_user_123/scans → Should see the saved scans!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TROUBLESHOOTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Firebase not initialized"
   → Set FIREBASE_CREDENTIALS_PATH in .env
   → Check file exists: backend/phishing-detection-firebase.json
   → Ensure .json file is valid (download from Firebase Console)

❌ "Firestore not available"
   → Check Firebase Console → Firestore Database is created
   → Check security rules are published
   → Verify Firebase credentials are valid

❌ "Failed to send notification"
   → Get FCM token: Firebase Console → Cloud Messaging → Server API Key
   → Add to .env: FIREBASE_SERVER_API_KEY=...
   → Verify device has valid FCM token saved in Firestore

❌ Scans not appearing in Firestore
   → Include user_id in request
   → Check backend logs: "✅ Scan result saved to Firestore"
   → Check Firestore Console for collections
   → Verify security rules allow read/write for that UID

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For more details, see:
  - FIREBASE_SETUP_GUIDE.md (700+ lines)
  - FIREBASE_CHECKLIST.md (quick reference)
  - FILES_MODIFIED_SUMMARY.md (what changed)
