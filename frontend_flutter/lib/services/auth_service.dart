import 'package:firebase_auth/firebase_auth.dart';
import 'firebase_service.dart';

/// AuthService - Convenience wrapper around FirebaseService for authentication
class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final _firebase = FirebaseService();

  /// Get the currently authenticated user
  User? get currentUser => _firebase.currentUser;

  /// Listen to authentication state changes
  Stream<User?> get authStateStream => _firebase.authStateChanges;

  /// Check if user is authenticated
  bool get isAuthenticated => currentUser != null;

  /// Get current user's email
  String? get userEmail => currentUser?.email;

  /// Get current user's display name
  String? get displayName => currentUser?.displayName;

  /// Get current user's UID
  String? get uid => currentUser?.uid;

  /// Sign in with Google
  /// Returns the signed-in user or null if failed/cancelled
  Future<User?> signInWithGoogle() async {
    return await _firebase.signInWithGoogle();
  }

  /// Sign out the current user
  /// Signs out from both Firebase and Google
  Future<void> signOut() async {
    await _firebase.signOut();
  }

  /// Initialize Firebase (called once on app startup)
  Future<void> initialize() async {
    await _firebase.initializeIfNeeded();
    await _firebase.initFcm();
    await _firebase.saveFcmToken();
  }
}
