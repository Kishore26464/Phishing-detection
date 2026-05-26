import 'package:flutter/material.dart';

// ─── API ───────────────────────────────────────────────────────────────────
class AppConfig {
  // Hugging Face Space deployment - includes /api/v1 in base URL
  static const String baseUrl = 'https://rohanv56-phishing-api.hf.space/api/v1';

  static const Duration requestTimeout = Duration(seconds: 30);
}

// ─── Colors ────────────────────────────────────────────────────────────────
class AppColors {
  // Core palette
  static const Color background    = Color(0xFF0A0A0F);
  static const Color surface       = Color(0xFF12121A);
  static const Color surfaceLight  = Color(0xFF1A1A26);
  static const Color border        = Color(0xFF252535);

  // Accent
  static const Color primary       = Color(0xFF00B4D8);
  static const Color primaryDark   = Color(0xFF0090AF);
  static const Color primaryGlow   = Color(0x3300B4D8);

  // Status
  static const Color safe          = Color(0xFF00C853);
  static const Color safeGlow      = Color(0x2200C853);
  static const Color warning       = Color(0xFFFFAB00);
  static const Color warningGlow   = Color(0x22FFAB00);
  static const Color danger        = Color(0xFFFF4444);
  static const Color dangerGlow    = Color(0x22FF4444);

  // Text
  static const Color textPrimary   = Color(0xFFEEEEFF);
  static const Color textSecondary = Color(0xFF8888AA);
  static const Color textMuted     = Color(0xFF44445A);
}

// ─── Text Styles ───────────────────────────────────────────────────────────
class AppTextStyles {
  static const TextStyle heading1 = TextStyle(
    fontSize: 26,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
  );

  static const TextStyle heading2 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    letterSpacing: -0.3,
  );

  static const TextStyle body = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
    height: 1.5,
  );

  static const TextStyle label = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: AppColors.textMuted,
    letterSpacing: 0.8,
  );

  static const TextStyle mono = TextStyle(
    fontSize: 13,
    fontFamily: 'monospace',
    color: AppColors.primary,
  );
}

// ─── Strings ───────────────────────────────────────────────────────────────
class AppStrings {
  static const String appName      = 'PhishGuard';
  static const String appTagline   = 'AI-Powered Threat Detection';

  // Nav labels
  static const String navHome      = 'Dashboard';
  static const String navUrl       = 'URL Scan';
  static const String navSms       = 'SMS Scan';
  static const String navQr        = 'QR Scan';
  static const String navHistory   = 'History';

  // Threat levels
  static const String safe         = 'SAFE';
  static const String suspicious   = 'SUSPICIOUS';
  static const String dangerous    = 'DANGEROUS';
}
