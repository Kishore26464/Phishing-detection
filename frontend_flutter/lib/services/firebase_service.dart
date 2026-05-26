import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../models/scan_result.dart';
import '../models/threat_history.dart';

class FirebaseService {
  static final FirebaseService _instance = FirebaseService._internal();
  factory FirebaseService() => _instance;
  FirebaseService._internal();

  static bool _firebaseInitialized = false;
  
  late final FirebaseAuth _auth;
  late final FirebaseFirestore _firestore;
  late final FirebaseMessaging _fcm;
  late final GoogleSignIn _googleSignIn;
  final _localNotif = FlutterLocalNotificationsPlugin();

  Future<void> initializeIfNeeded() async {
    if (_firebaseInitialized) return;
    try {
      _auth = FirebaseAuth.instance;
      _firestore = FirebaseFirestore.instance;
      _fcm = FirebaseMessaging.instance;
      _googleSignIn = GoogleSignIn();
      _firebaseInitialized = true;
      debugPrint('✓ FirebaseService initialized');
    } catch (e) {
      debugPrint('✗ FirebaseService init failed: $e');
      _firebaseInitialized = false;
    }
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────
  User? get currentUser {
    try {
      return _firebaseInitialized ? _auth.currentUser : null;
    } catch (_) {
      return null;
    }
  }

  Stream<User?> get authStateChanges {
    try {
      return _firebaseInitialized 
          ? _auth.authStateChanges() 
          : Stream.value(null);
    } catch (_) {
      return Stream.value(null);
    }
  }

  // ─── Auth — Google Sign-In Only ───────────────────────────────────────────
  Future<User?> signInWithGoogle() async {
    if (!_firebaseInitialized) {
      debugPrint('⚠ Firebase not initialized');
      return null;
    }
    try {
      debugPrint('🔐 Starting Google Sign-In...');
      
      final googleSignInAccount = await _googleSignIn.signIn();
      if (googleSignInAccount == null) {
        debugPrint('⚠ Google Sign-In cancelled by user');
        return null;
      }

      final googleAuth = await googleSignInAccount.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final userCredential = await _auth.signInWithCredential(credential);
      debugPrint('✓ Google Sign-In successful: ${userCredential.user?.email}');
      
      // Save user data to Firestore
      if (userCredential.user != null) {
        await _saveUserData(userCredential.user!);
      }
      
      return userCredential.user;
    } catch (e) {
      debugPrint('❌ Google Sign-In failed: $e');
      return null;
    }
  }

  // Save user data to Firestore
  Future<void> _saveUserData(User user) async {
    try {
      await _firestore.collection('users').doc(user.uid).set({
        'email': user.email,
        'name': user.displayName ?? 'User',
        'photoUrl': user.photoURL,
        'uid': user.uid,
        'createdAt': FieldValue.serverTimestamp(),
        'lastLogin': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
      debugPrint('✓ User data saved to Firestore');
    } catch (e) {
      debugPrint('✗ Failed to save user data: $e');
    }
  }

  // Sign out from both Firebase and Google
  Future<void> signOut() async {
    if (!_firebaseInitialized) return;
    try {
      await Future.wait([
        _auth.signOut(),
        _googleSignIn.signOut(),
      ]);
      debugPrint('✓ Signed out successfully');
    } catch (e) {
      debugPrint('✗ Sign out failed: $e');
    }
  }

  // ─── Firestore — Save Scan ────────────────────────────────────────────────
  Future<void> saveScanResult(ScanResult result) async {
    if (!_firebaseInitialized) {
      debugPrint('⚠ Firestore not available - scan not saved');
      return;
    }
    try {
      final uid = currentUser?.uid;
      if (uid == null) return;

      await _firestore
          .collection('users')
          .doc(uid)
          .collection('scans')
          .add({
            ...result.toJson(),
            'scanned_at': FieldValue.serverTimestamp(),
          });
      debugPrint('✓ Scan result saved to Firestore');
    } catch (e) {
      debugPrint('✗ Failed to save scan: $e');
    }
  }

  // ─── Firestore — Get History ──────────────────────────────────────────────
  Future<List<ThreatHistoryItem>> getScanHistory({int limit = 50}) async {
    if (!_firebaseInitialized) {
      debugPrint('⚠ Firestore not available - returning empty history');
      return [];
    }
    try {
      final uid = currentUser?.uid;
      if (uid == null) return [];

      final snap = await _firestore
          .collection('users')
          .doc(uid)
          .collection('scans')
          .orderBy('scanned_at', descending: true)
          .limit(limit)
          .get();

      return snap.docs
          .map((doc) => ThreatHistoryItem.fromFirestore(
                doc.data(),
                doc.id,
              ))
          .toList();
    } catch (e) {
      debugPrint('✗ Failed to get history: $e');
      return [];
    }
  }

  // ─── Firestore — Stats ────────────────────────────────────────────────────
  Future<Map<String, int>> getUserStats() async {
    if (!_firebaseInitialized) {
      debugPrint('⚠ Firestore not available - returning empty stats');
      return {};
    }
    try {
      final uid = currentUser?.uid;
      if (uid == null) return {};

      final snap = await _firestore
          .collection('users')
          .doc(uid)
          .collection('scans')
          .get();

      int safe = 0, suspicious = 0, dangerous = 0;
      for (final doc in snap.docs) {
        switch (doc['threat_level'] as String?) {
          case 'safe':       safe++;       break;
          case 'suspicious': suspicious++; break;
          case 'dangerous':  dangerous++;  break;
        }
      }

      return {
        'total':      snap.size,
        'safe':       safe,
        'suspicious': suspicious,
        'dangerous':  dangerous,
      };
    } catch (e) {
      debugPrint('✗ Failed to get stats: $e');
      return {};
    }
  }

  // ─── Firestore — Report ───────────────────────────────────────────────────
  Future<void> saveReport({
    required String url,
    required String reason,
    String? details,
  }) async {
    if (!_firebaseInitialized) {
      debugPrint('⚠ Firestore not available - report not saved');
      return;
    }
    try {
      await _firestore.collection('reports').add({
        'url':        url,
        'reason':     reason,
        'details':    details ?? '',
        'uid':        currentUser?.uid ?? 'anonymous',
        'created_at': FieldValue.serverTimestamp(),
      });
      debugPrint('✓ Report saved to Firestore');
    } catch (e) {
      debugPrint('✗ Failed to save report: $e');
    }
  }

  // ─── FCM ─────────────────────────────────────────────────────────────────
  Future<void> initFcm() async {
    if (!_firebaseInitialized) {
      debugPrint('⚠ Firebase not initialized - skipping FCM setup');
      return;
    }
    try {
      await _fcm.requestPermission(alert: true, badge: true, sound: true);

      const androidChannel = AndroidNotificationChannel(
        'phishguard_alerts',
        'PhishGuard Alerts',
        description: 'Threat detection notifications',
        importance: Importance.high,
      );

      await _localNotif
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(androidChannel);

      const initSettings = InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      );
      await _localNotif.initialize(initSettings);

      FirebaseMessaging.onMessage.listen((message) {
        final notification = message.notification;
        if (notification != null) {
          _localNotif.show(
            0,
            notification.title ?? 'PhishGuard Alert',
            notification.body ?? 'New threat detected',
            const NotificationDetails(
              android: AndroidNotificationDetails(
                'phishguard_alerts',
                'PhishGuard Alerts',
                importance: Importance.high,
                priority: Priority.high,
              ),
            ),
          );
        }
      });
      debugPrint('✓ FCM setup complete');
    } catch (e) {
      debugPrint('✗ FCM setup failed: $e');
    }
  }

  // ─── FCM Token ────────────────────────────────────────────────────────────
  Future<void> saveFcmToken() async {
    if (!_firebaseInitialized) {
      debugPrint('⚠ Firebase not initialized - skipping FCM token save');
      return;
    }
    try {
      final token = await _fcm.getToken();
      if (token != null && currentUser != null) {
        await _firestore
            .collection('users')
            .doc(currentUser!.uid)
            .set({'fcm_token': token}, SetOptions(merge: true));
        debugPrint('✓ FCM token saved');
      }
    } catch (e) {
      debugPrint('✗ Failed to save FCM token: $e');
    }
  }
}
