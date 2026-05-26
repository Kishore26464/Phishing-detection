import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import '../config/constants.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _logoCtrl;
  late AnimationController _ringCtrl;
  late Animation<double> _logoScale;
  late Animation<double> _logoFade;
  late Animation<double> _ringScale;
  late Animation<double> _ringOpacity;

  @override
  void initState() {
    super.initState();

    _logoCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900));
    _ringCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1500));

    _logoScale = Tween<double>(begin: 0.5, end: 1.0).animate(
        CurvedAnimation(parent: _logoCtrl, curve: Curves.elasticOut));
    _logoFade = Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(parent: _logoCtrl, curve: Curves.easeIn));

    _ringScale = Tween<double>(begin: 0.6, end: 1.4).animate(
        CurvedAnimation(parent: _ringCtrl, curve: Curves.easeOut));
    _ringOpacity = Tween<double>(begin: 0.6, end: 0.0).animate(
        CurvedAnimation(parent: _ringCtrl, curve: Curves.easeOut));

    _logoCtrl.forward().then((_) {
      _ringCtrl.repeat();
      _navigate();
    });
  }

  Future<void> _navigate() async {
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;

    // ── Safe Firebase auth check ──────────────────────────────────────────
    bool isLoggedIn = false;
    try {
      debugPrint('Checking Firebase availability...');
      debugPrint('Firebase.apps.length: ${Firebase.apps.length}');
      
      if (Firebase.apps.isNotEmpty) {
        debugPrint('✓ Firebase is available, checking auth...');
        try {
          final user = FirebaseAuth.instance.currentUser;
          isLoggedIn = user != null;
          debugPrint('Auth check complete - logged in: $isLoggedIn');
        } catch (authError) {
          debugPrint('❌ FirebaseAuth access failed: $authError');
          isLoggedIn = false;
        }
      } else {
        debugPrint('⚠ Firebase not initialized - skipping auth check');
        isLoggedIn = false;
      }
    } catch (e) {
      debugPrint('❌ Auth check exception: $e');
      isLoggedIn = false;
    }

    if (!mounted) return;
    debugPrint('Navigating to: ${isLoggedIn ? '/home' : '/login'}');
    Navigator.pushReplacementNamed(
      context,
      isLoggedIn ? '/home' : '/login',
    );
  }

  @override
  void dispose() {
    _logoCtrl.dispose();
    _ringCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // ── Animated logo + pulse ring ──
            AnimatedBuilder(
              animation: Listenable.merge([_logoCtrl, _ringCtrl]),
              builder: (_, __) => SizedBox(
                width: 160,
                height: 160,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Opacity(
                      opacity: _ringOpacity.value,
                      child: Transform.scale(
                        scale: _ringScale.value,
                        child: Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: AppColors.primary, width: 2),
                          ),
                        ),
                      ),
                    ),
                    FadeTransition(
                      opacity: _logoFade,
                      child: ScaleTransition(
                        scale: _logoScale,
                        child: Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.surface,
                            border: Border.all(
                                color: AppColors.primary, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withOpacity(0.4),
                                blurRadius: 30,
                                spreadRadius: 5,
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.security_rounded,
                            color: AppColors.primary,
                            size: 48,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),
            FadeTransition(
              opacity: _logoFade,
              child: const Text(
                AppStrings.appName,
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 2,
                ),
              ),
            ),
            const SizedBox(height: 8),
            FadeTransition(
              opacity: _logoFade,
              child: Text(
                AppStrings.appTagline,
                style: AppTextStyles.body.copyWith(
                  color: AppColors.primary.withOpacity(0.8),
                  letterSpacing: 1,
                ),
              ),
            ),
            const SizedBox(height: 60),
            FadeTransition(
              opacity: _logoFade,
              child: SizedBox(
                width: 120,
                child: LinearProgressIndicator(
                  backgroundColor: AppColors.border,
                  valueColor:
                      const AlwaysStoppedAnimation(AppColors.primary),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}