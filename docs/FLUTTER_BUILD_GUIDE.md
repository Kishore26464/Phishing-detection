# Flutter APK Build Guide — PhishGuard Mobile App

**Build both Debug and Release APKs to install on Android devices.**

---

## 📋 Prerequisites

- Flutter SDK installed: https://flutter.dev/docs/get-started/install
- Android SDK with build tools (installed with Android Studio)
- Android device or emulator (API 21+)

**Verify installation:**
```bash
flutter --version
flutter doctor     # Should show green checkmarks for everything
```

---

## 🔧 Step 1: Install Dependencies

```bash
cd frontend_flutter
flutter pub get
flutter pub upgrade
cd ..
```

---

## 📱 Step 2: Review AndroidManifest.xml

Permissions already configured correctly:

**File:** `frontend_flutter/android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

✅ **INTERNET** — API calls to backend
✅ **CAMERA** — QR code scanning
✅ **VIBRATE** — Haptic feedback
✅ **POST_NOTIFICATIONS** — Alerts

---

## 🏗 Step 3: Configure Build Signing

### Option A: Use Default Debug Key (Fastest)

```bash
cd frontend_flutter
flutter build apk --debug
cd ..

# APK location: frontend_flutter/build/app/outputs/flutter-apk/app-debug.apk
```

No additional setup needed. Debug APK uses default Flutter debug key.

### Option B: Create Release Signing Key (Recommended for Production)

```bash
# Navigate to Android directory
cd frontend_flutter/android

# Generate keystore (one-time only)
keytool -genkey -v -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload

# Follow prompts:
# Enter keystore password: (create a strong password)
# Re-enter password: (confirm)
# First and last name: (Your name or company)
# Organizational unit: (e.g., Development)
# Organization: (e.g., Your Company)
# City: (Your city)
# State: (Your state)
# Country: (Your country code, e.g., US)
# Confirm all: yes

cd ../..
```

**Store this keystore safely!** You'll need it for future updates.

---

## 🔨 Step 4: Build Debug APK

**Build without signing key (for testing):**

```bash
cd frontend_flutter
flutter build apk --debug
cd ..
```

**Output:**
```
✓ Built build/app/outputs/flutter-apk/app-debug.apk (XX.X MB)
```

**Location:** `frontend_flutter/build/app/outputs/flutter-apk/app-debug.apk`

---

## 📦 Step 5: Build Release APK (Production)

### Step 5A: Create key.properties

Create `frontend_flutter/android/key.properties`:

```properties
storePassword=your_keystore_password_here
keyPassword=your_key_password_here
keyAlias=upload
storeFile=release.keystore
```

⚠️ **SECURITY:** Add to `.gitignore` so it's never committed:
```bash
echo "key.properties" >> frontend_flutter/android/.gitignore
```

### Step 5B: Build Release APK

```bash
cd frontend_flutter
flutter build apk --release
cd ..
```

**Output:**
```
✓ Built build/app/outputs/flutter-apk/app-release.apk (XX.X MB)
```

**Location:** `frontend_flutter/build/app/outputs/flutter-apk/app-release.apk`

---

## 📲 Step 6: Install on Android Device

### Option A: Using USB (Recommended)

1. **Enable Developer Mode on phone:**
   - Settings → About Phone → Tap "Build Number" 7 times
   - Go back → Developer Options → Enable USB Debugging

2. **Connect phone via USB** to computer

3. **Install APK:**
   ```bash
   # List connected devices
   flutter devices

   # Install debug APK
   adb install frontend_flutter/build/app/outputs/flutter-apk/app-debug.apk

   # Or install release APK
   adb install frontend_flutter/build/app/outputs/flutter-apk/app-release.apk
   ```

### Option B: Using Android Emulator

```bash
# List available emulators
flutter emulators

# Start emulator
flutter emulators --launch pixel_5

# Install APK
adb install frontend_flutter/build/app/outputs/flutter-apk/app-debug.apk
```

### Option C: Direct Installation (Manual)

1. Transfer APK file to phone (via USB, email, etc.)
2. Open file manager on phone
3. Locate APK file
4. Tap to install (allow installation from unknown sources if prompted)

---

## ✅ Verify Installation

```bash
# Launch app
flutter run --release

# Or open app directly on phone after installation
```

**First launch checklist:**
- [ ] App opens without crashes
- [ ] Permissions dialog appears and accepts
- [ ] Home screen loads with URL/SMS input
- [ ] Can enter a URL and tap "Scan"
- [ ] Results display with threat level

---

## 🎯 Build Options

### Build Debug (Faster, Larger Size)
```bash
flutter build apk --debug
# Size: ~50-70 MB
# Build time: ~1-2 minutes
# Performance: Full debug info
```

### Build Release (Optimized, Smaller Size)
```bash
flutter build apk --release
# Size: ~20-30 MB
# Build time: ~2-3 minutes
# Performance: Optimized, no debug info
```

### Build AAB (Google Play Store)
```bash
flutter build appbundle --release
# Location: build/app/outputs/bundle/release/app-release.aab
# Use this for Google Play Store submission
```

### Build Multiple Architectures
```bash
# ARM64 (most phones)
flutter build apk --release --target-platform android-arm64

# ARMv7 (older phones)
flutter build apk --release --target-platform android-arm

# x86 (emulator)
flutter build apk --release --target-platform android-x86_64
```

---

## 🔑 Update API Backend URL

Before building release APK, update the backend API URL:

**File:** `frontend_flutter/lib/config/api_config.dart`

```dart
// Development (local)
static const String API_BASE_URL = 'http://localhost:8000';

// Production (Render)
static const String API_BASE_URL = 'https://your-service-name.onrender.com';
```

Then rebuild:
```bash
cd frontend_flutter
flutter build apk --release
cd ..
```

---

## 📊 Build Size Optimization

To reduce APK size:

```bash
# Build with split ABIs (smaller per-architecture APK)
flutter build apk --release --split-per-abi

# Outputs:
# - app-armeabi-v7a-release.apk (~15-20 MB)
# - app-arm64-v8a-release.apk (~18-25 MB)
```

---

## 🐛 Troubleshooting

### Error: "No connected devices"
```bash
# Check connected devices
flutter devices

# If none shown, verify USB debugging is enabled
# and device is connected
```

### Error: "Gradle build failed"
```bash
# Clean and rebuild
cd frontend_flutter
flutter clean
flutter pub get
flutter build apk --release
cd ..
```

### Error: "Keystore not found"
- Verify `key.properties` path is correct
- Check `release.keystore` is in `frontend_flutter/android/`
- Verify paths in `key.properties` are correct

### App crashes on launch
- Check logs: `flutter logs`
- Verify API_BASE_URL is correct in `api_config.dart`
- Check backend is running/accessible
- Verify permissions are granted

### App very large (>100 MB)
```bash
# Build with optimization
flutter build apk --release --split-per-abi

# Or analyze size
flutter build apk --release --analyze-size
```

### Can't install: "App not installed"
- Device may not support architecture
- Try split APK for specific architecture
- Check Android version (requires API 21+)

---

## 📦 Distribution

### For Testing
Send `app-debug.apk` to testers (allows easier debugging).

### For Production Release
1. Use `app-release.apk` (fully optimized)
2. Sign with release key (see Step 5A)
3. Test on multiple devices
4. For Google Play: Use `app-release.aab`

### Upload to Google Play Store
1. Build AAB:
   ```bash
   flutter build appbundle --release
   ```

2. Go to [Google Play Console](https://play.google.com/console)
3. Create new app → PhishGuard
4. Upload AAB to Internal Testing → Closed Testing → Production
5. Add app details, screenshots, description
6. Submit for review

---

## 🚀 CI/CD Automation

Automate APK builds with GitHub Actions:

**File:** `.github/workflows/build-apk.yml`

```yaml
name: Build Flutter APK

on:
  push:
    branches: [main, release]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.0.0'
      
      - name: Get dependencies
        run: cd frontend_flutter && flutter pub get && cd ..
      
      - name: Build APK
        run: cd frontend_flutter && flutter build apk --release && cd ..
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-release.apk
          path: frontend_flutter/build/app/outputs/flutter-apk/app-release.apk
```

---

## 📋 APK Build Checklist

- [ ] Flutter SDK installed and verified (`flutter doctor`)
- [ ] Dependencies installed (`flutter pub get`)
- [ ] AndroidManifest.xml has required permissions
- [ ] API_BASE_URL updated in `api_config.dart`
- [ ] Backend API is running (or deployed)
- [ ] No console errors in `flutter analyze`
- [ ] Release signing key created (if building release)
- [ ] `key.properties` configured (if building release)
- [ ] APK successfully built without errors
- [ ] APK installed and tested on device/emulator
- [ ] App permissions working (INTERNET, CAMERA)
- [ ] API calls successful
- [ ] Threat scanning works correctly

---

## 📚 Additional Resources

- [Flutter APK Build Docs](https://flutter.dev/docs/deployment/android)
- [Android Signing Guide](https://developer.android.com/studio/publish/app-signing)
- [Google Play Console](https://play.google.com/console)
- [Flutter Performance Guide](https://flutter.dev/docs/perf)

---

## 📲 APK Details

| Property | Debug | Release |
|----------|-------|---------|
| Size | ~50-70 MB | ~20-30 MB |
| Build Time | ~1-2 min | ~2-3 min |
| Optimization | None | Full |
| Debug Info | Yes | No |
| Signing | Auto (debug key) | Manual (release key) |
| Performance | Slower | Fast |
| Use Case | Development | Production |

---

**Last Updated:** May 2026
**Flutter Version:** 3.0+
**Android Minimum:** API 21 (Android 5.0)
