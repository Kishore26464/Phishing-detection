import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'config/constants.dart';
import 'services/firebase_service.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/url_scanner_screen.dart';
import 'screens/sms_scanner_screen.dart';
import 'screens/qr_scanner_screen.dart';
import 'screens/history_screen.dart';
import 'screens/report_screen.dart';
import 'widgets/bottom_nav.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));

  // Initialize Firebase
  debugPrint('━━━ Firebase Initialization Start ━━━');
  try {
    debugPrint('📱 Device Firebase apps before init: ${Firebase.apps.length}');
    
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    
    debugPrint(' Firebase.initializeApp() succeeded');
    debugPrint(' Device Firebase apps after init: ${Firebase.apps.length}');
    
    // Initialize FirebaseService
    final firebaseService = FirebaseService();
    await firebaseService.initializeIfNeeded();
    
    // Try to initialize FCM
    try {
      await firebaseService.initFcm();
      debugPrint('✓ FCM initialized');
    } catch (fcmError) {
      debugPrint(' FCM init failed: $fcmError');
    }
  } catch (e, stack) {
    debugPrint(' Firebase init ERROR: $e');
    debugPrint('Stack trace: $stack');
    debugPrint('App will run in OFFLINE mode without Firebase features');
  }
  debugPrint('━━━ Firebase Initialization End ━━━\n');

  runApp(const PhishGuardApp());
}

class PhishGuardApp extends StatelessWidget {
  const PhishGuardApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppStrings.appName,
      debugShowCheckedModeBanner: false,
      theme: _theme(),
      initialRoute: '/splash',
      routes: {
        '/splash': (_) => const SplashScreen(),
        '/login':  (_) => const LoginScreen(),
        '/home':   (_) => const MainShell(),
        '/url':    (_) => const UrlScannerScreen(),
        '/sms':    (_) => const SmsScannerScreen(),
        '/qr':     (_) => const QrScannerScreen(),
        '/report': (_) => const ReportScreen(),
      },
    );
  }

  ThemeData _theme() => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: const ColorScheme.dark(
      primary: AppColors.primary,
      surface: AppColors.surface,
      error: AppColors.danger,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.background,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      titleTextStyle: AppTextStyles.heading2,
      iconTheme: IconThemeData(color: AppColors.textSecondary),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.black,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 0,
    ),
    fontFamily: 'Roboto',
  );
}

// ── Main shell with persistent bottom navigation ───────────────────────────
class MainShell extends StatefulWidget {
  const MainShell({super.key});
  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    // Build screen ONLY based on current index - never cache other screens
    Widget currentScreen;
    switch (_currentIndex) {
      case 0:
        currentScreen = const HomeScreen();
        break;
      case 1:
        currentScreen = const UrlScannerScreen();
        break;
      case 2:
        currentScreen = const SmsScannerScreen();
        break;
      case 3:
        currentScreen = const QrScannerScreen();
        break;
      case 4:
        currentScreen = const HistoryScreen();
        break;
      default:
        currentScreen = const HomeScreen();
    }

    return Scaffold(
      body: currentScreen,
      bottomNavigationBar: AppBottomNav(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
      ),
    );
  }
}
