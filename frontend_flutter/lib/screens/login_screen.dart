import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../services/firebase_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _firebase = FirebaseService();
  bool _loading = false;
  String? _error;

  Future<void> _signInWithGoogle() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final user = await _firebase.signInWithGoogle();
      if (user != null && mounted) {
        await _firebase.saveFcmToken();
        if (mounted) {
          Navigator.pushReplacementNamed(context, '/home');
        }
      } else if (mounted) {
        setState(() => _error = 'Google Sign-In failed. Please try again.');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceAll('Exception: ', ''));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 60),
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.surface,
                  border: Border.all(color: AppColors.primary, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.4),
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
              const SizedBox(height: 28),
              Text(
                'PhishGuard',
                style: AppTextStyles.heading1.copyWith(fontSize: 32),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'AI-Powered Phishing Detection',
                style: AppTextStyles.body.copyWith(
                  color: AppColors.textMuted,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              Text(
                'Secure your digital presence with advanced threat detection powered by machine learning.',
                style: AppTextStyles.body.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 60),
              if (_error != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.dangerGlow,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppColors.danger.withValues(alpha: 0.4),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: AppColors.danger,
                        size: 16,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _error!,
                          style: AppTextStyles.body.copyWith(
                            color: AppColors.danger,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              if (_error != null) const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: _loading ? null : _signInWithGoogle,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                    disabledBackgroundColor: AppColors.primary.withValues(
                      alpha: 0.5,
                    ),
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation(Colors.black),
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.login_rounded, size: 20),
                            const SizedBox(width: 10),
                            const Text(
                              'Sign in with Google',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                '🔒 Secure login with Google\nYour data is encrypted and protected',
                style: AppTextStyles.body.copyWith(
                  color: AppColors.textMuted,
                  fontSize: 11,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 60),
            ],
          ),
        ),
      ),
    );
  }
}
