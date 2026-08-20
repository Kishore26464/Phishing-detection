"""
routes/history.py
GET /threat-history — paginated history of user-submitted reports.

Reads from Firestore (reports/{reportId}, filtered to the caller's user_id)
when a user_id is supplied and Firebase is initialized, so results persist
across backend restarts. Falls back to the in-memory store — shared with
report.py — for anonymous callers or when Firebase isn't configured.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query

from backend.models.schemas import ThreatHistoryResponse, ThreatHistoryEntry
from backend.store import threat_store
from backend.firebase_service import firebase_service

router = APIRouter()
logger = logging.getLogger(__name__)


def _report_to_entry(report: Dict[str, Any]) -> ThreatHistoryEntry:
    ts = report.get("timestamp") or report.get("createdAt")
    reasons = ["User-submitted report"]
    if report.get("userComment"):
        reasons.append(f"Comment: {report['userComment']}")

    return ThreatHistoryEntry(
        id=report.get("id") or report.get("reportId", ""),
        scan_type=report.get("scanType", "url"),
        input_data=report.get("inputData", ""),
        threat_level=report.get("threatLevel", "unknown"),
        confidence=1.0,
        timestamp=ts.isoformat() if hasattr(ts, "isoformat") else str(ts or ""),
        reasons=reasons,
    )


@router.get(
    "/threat-history",
    response_model=ThreatHistoryResponse,
    summary="Retrieve paginated history of user-submitted reports",
    tags=["History"],
)
async def get_threat_history(
    page: int                = Query(default=1,  ge=1,  description="Page number"),
    page_size: int            = Query(default=20, ge=1, le=100, description="Results per page"),
    scan_type: str            = Query(default="", description="Filter by type: url | sms | qr | app"),
    user_id: Optional[str]    = Query(default=None, description="Firebase UID — returns that user's persisted reports from Firestore"),
):
    """
    Returns the history of manually-submitted threat reports (see
    POST /report-threat). Filter by `scan_type` to narrow results.

    Pass `user_id` to read a signed-in user's own reports from Firestore
    (durable across restarts). Without it, this falls back to the
    in-memory store for the current backend process only.
    """
    if user_id and firebase_service.is_initialized():
        raw_reports = firebase_service.get_user_reports(user_id, limit=page * page_size)
        all_entries: List[ThreatHistoryEntry] = [_report_to_entry(r) for r in raw_reports]
    else:
        all_entries = threat_store.get_all()

    # Optional filter
    if scan_type:
        all_entries = [e for e in all_entries if e.scan_type == scan_type]

    # Sort newest first
    all_entries.sort(key=lambda e: e.timestamp, reverse=True)

    total  = len(all_entries)
    start  = (page - 1) * page_size
    end    = start + page_size
    paged  = all_entries[start:end]

    return ThreatHistoryResponse(
        entries=paged,
        total=total,
        page=page,
        page_size=page_size,
    )