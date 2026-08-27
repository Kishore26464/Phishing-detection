"""
firebase_service.py

Firebase integration for saving scan results to Firestore.
Provides methods to save user scans, reports, and sync with Firestore.

Install: pip install firebase-admin
"""

import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Any

import firebase_admin
from firebase_admin import credentials, firestore, messaging

logger = logging.getLogger(__name__)


class FirebaseService:
    """Singleton Firebase service for Firestore and Cloud Messaging integration."""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize Firebase service (only once)."""
        if FirebaseService._initialized:
            return

        try:
            # ── Priority 1: inline JSON string (Hugging Face Spaces / cloud envs) ──
            # Set secret FIREBASE_CREDENTIALS_JSON to the full contents of the
            # service-account JSON file. This avoids having to upload the file.
            cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")

            # ── Priority 2: local file path (development) ──────────────────────────
            cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")

            if cred_json:
                import json as _json
                logger.info("🔑 Loading Firebase credentials from FIREBASE_CREDENTIALS_JSON env var")
                cred_dict = _json.loads(cred_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
            elif cred_path and os.path.exists(cred_path):
                logger.info(f"🔑 Loading Firebase credentials from file: {cred_path}")
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                logger.warning(
                    "⚠️  Firebase credentials not found. Firebase will not be initialized.\n"
                    "  • For Hugging Face Spaces: add a Secret named FIREBASE_CREDENTIALS_JSON "
                    "containing the full service-account JSON.\n"
                    "  • For local dev: set FIREBASE_CREDENTIALS_PATH to the JSON file path."
                )
                self.db = None
                return

            self.db = firestore.client()
            # messaging module is available after firebase_admin.initialize_app()
            # No need to create a separate client object
            
            logger.info("✅ Firebase service initialized successfully")
            FirebaseService._initialized = True

        except Exception as e:
            logger.error(f"❌ Failed to initialize Firebase: {e}")
            self.db = None


    def is_initialized(self) -> bool:
        """Check if Firebase is properly initialized."""
        return self.db is not None

    # ─── Firestore Operations ──────────────────────────────────────────────

    def save_scan_result(
        self,
        user_id: str,
        scan_data: Dict[str, Any],
    ) -> bool:
        """
        Save a scan result to Firestore under users/{user_id}/scans/{scanId}.

        Args:
            user_id: Firebase User ID (UID)
            scan_data: Scan result dictionary containing:
                - type: 'url' | 'sms' | 'qr' | 'app'
                - input: The URL/SMS/QR code that was scanned
                - threatLevel: 'safe' | 'suspicious' | 'dangerous'
                - confidence: Float 0-1
                - isPhishing: Boolean
                - reasons: List of detection reasons
                - virusTotalResult: Optional dict with VT results
                - mlResult: Optional dict with ML model predictions

        Returns:
            True if saved successfully, False otherwise
        """
        if not self.is_initialized():
            logger.warning("⚠️  Firebase not initialized - scan result not saved")
            return False

        try:
            # Write both timestamp variants so every platform can find and sort records:
            #   - `timestamp`  — ordered by the web (firestoreScans.ts query)
            #   - `scannedAt`  — camelCase alias kept for legacy compatibility
            #   - `scanned_at` — ordered by Flutter (getScanHistory query)
            now = datetime.utcnow()
            scan_data_with_time = {
                **scan_data,
                "timestamp": now,
                "scannedAt": now,
                "scanned_at": now,
            }

            # Save to users/{uid}/scans/{docId}
            doc_ref = self.db.collection("users").document(user_id).collection("scans").add(
                scan_data_with_time
            )

            logger.info(f"✅ Scan result saved to Firestore: {doc_ref[1].id}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to save scan result: {e}")
            return False

    def save_report(
        self,
        report_id: str,
        scan_type: str,
        input_data: str,
        threat_level: str,
        user_id: Optional[str] = None,
        user_comment: Optional[str] = None,
        reporter_email: Optional[str] = None,
    ) -> bool:
        """
        Save a user-submitted threat report to Firestore under reports/{report_id}.

        Using the caller-generated report_id as the document id (rather than
        an auto-id) keeps the id returned to the client meaningful for any
        future lookup, and makes this call idempotent on retry.

        Args:
            report_id: Caller-generated unique id for this report
            scan_type: 'url' | 'sms' | 'qr' | 'app'
            input_data: The reported URL / SMS text / decoded QR payload
            threat_level: 'safe' | 'suspicious' | 'dangerous' | 'unknown'
            user_id: Firebase UID of the reporting user, if signed in
            user_comment: Optional free-text context from the reporter
            reporter_email: Optional email for follow-up

        Returns:
            True if saved successfully, False otherwise
        """
        if not self.is_initialized():
            logger.warning("⚠️  Firebase not initialized - report not saved")
            return False

        try:
            report_data = {
                "reportId": report_id,
                "userId": user_id,
                "scanType": scan_type,
                "inputData": input_data,
                "threatLevel": threat_level,
                "userComment": user_comment,
                "reporterEmail": reporter_email,
                "status": "pending",
                "timestamp": datetime.utcnow(),
                "createdAt": datetime.utcnow(),
            }

            self.db.collection("reports").document(report_id).set(report_data)
            logger.info(f"✅ Report saved to Firestore: {report_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to save report: {e}")
            return False

    def get_user_reports(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get reports submitted by a specific user, newest first.

        Sorts in Python rather than via Firestore `order_by` so this doesn't
        require a composite index on (userId, timestamp) to be created in
        the Firestore console first.

        Args:
            user_id: Firebase User ID
            limit: Maximum number of reports to return

        Returns:
            List of report documents, newest first
        """
        if not self.is_initialized():
            logger.warning("⚠️  Firebase not initialized - returning empty report list")
            return []

        try:
            docs = (
                self.db.collection("reports")
                .where("userId", "==", user_id)
                .limit(max(limit * 4, limit))
                .stream()
            )

            reports = []
            for doc in docs:
                r = doc.to_dict()
                r["id"] = doc.id
                reports.append(r)

            reports.sort(key=lambda r: r.get("timestamp") or datetime.min, reverse=True)
            return reports[:limit]

        except Exception as e:
            logger.error(f"❌ Failed to get user reports: {e}")
            return []

    def get_user_stats(self, user_id: str) -> Dict[str, int]:
        """
        Get scan statistics for a user from Firestore.

        Returns:
            Dictionary with keys: total, safe, suspicious, dangerous
        """
        if not self.is_initialized():
            logger.warning("⚠️  Firebase not initialized - returning empty stats")
            return {"total": 0, "safe": 0, "suspicious": 0, "dangerous": 0}

        try:
            docs = (
                self.db.collection("users")
                .document(user_id)
                .collection("scans")
                .stream()
            )

            stats = {"total": 0, "safe": 0, "suspicious": 0, "dangerous": 0}

            for doc in docs:
                stats["total"] += 1
                threat_level = doc.get("threatLevel") or doc.get("threat_level")
                if threat_level == "safe":
                    stats["safe"] += 1
                elif threat_level == "suspicious":
                    stats["suspicious"] += 1
                elif threat_level == "dangerous":
                    stats["dangerous"] += 1

            logger.info(f"✅ User stats retrieved: {stats}")
            return stats

        except Exception as e:
            logger.error(f"❌ Failed to get user stats: {e}")
            return {"total": 0, "safe": 0, "suspicious": 0, "dangerous": 0}

    def get_recent_scans(
        self, user_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent scans for a user.

        Args:
            user_id: Firebase User ID
            limit: Maximum number of scans to retrieve

        Returns:
            List of scan documents
        """
        if not self.is_initialized():
            logger.warning("⚠️  Firebase not initialized - returning empty list")
            return []

        try:
            docs = (
                self.db.collection("users")
                .document(user_id)
                .collection("scans")
                .order_by("timestamp", direction=firestore.Query.DESCENDING)
                .limit(limit)
                .stream()
            )

            scans = []
            for doc in docs:
                scan = doc.to_dict()
                scan["id"] = doc.id
                scans.append(scan)

            logger.info(f"✅ Retrieved {len(scans)} recent scans")
            return scans

        except Exception as e:
            logger.error(f"❌ Failed to get recent scans: {e}")
            return []

    # ─── Cloud Messaging (FCM) ─────────────────────────────────────────────

    def send_threat_notification(
        self,
        user_id: str,
        fcm_token: str,
        title: str,
        body: str,
        threat_level: str = "suspicious",
    ) -> bool:
        """
        Send a push notification to a device via FCM.

        Args:
            user_id: Firebase User ID (for logging)
            fcm_token: Device FCM token
            title: Notification title
            body: Notification body
            threat_level: 'safe' | 'suspicious' | 'dangerous'

        Returns:
            True if sent successfully, False otherwise
        """
        if not self.is_initialized():
            logger.warning("⚠️  Firebase not initialized - notification not sent")
            return False

        try:
            from firebase_admin import messaging

            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={
                    "threat_level": threat_level,
                    "user_id": user_id,
                },
                token=fcm_token,
            )

            response = messaging.send(message)
            logger.info(f"✅ Notification sent: {response}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send notification: {e}")
            return False

    def send_bulk_notifications(
        self,
        notifications: List[Dict[str, str]],
    ) -> int:
        """
        Send multiple notifications.

        Args:
            notifications: List of dicts with keys: fcm_token, title, body, threat_level

        Returns:
            Number of notifications sent successfully
        """
        if not self.is_initialized():
            logger.warning("⚠️  Firebase not initialized - notifications not sent")
            return 0

        sent_count = 0
        for notif in notifications:
            try:
                self.send_threat_notification(
                    user_id="batch_send",
                    fcm_token=notif["fcm_token"],
                    title=notif.get("title", "PhishGuard Alert"),
                    body=notif.get("body", "New threat detected"),
                    threat_level=notif.get("threat_level", "suspicious"),
                )
                sent_count += 1
            except Exception as e:
                logger.error(f"❌ Failed to send notification: {e}")

        logger.info(f"✅ Sent {sent_count}/{len(notifications)} notifications")
        return sent_count


# Singleton instance
firebase_service = FirebaseService()
