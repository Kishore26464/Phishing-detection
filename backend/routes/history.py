"""
routes/history.py
GET /threat-history — paginated scan history (in-memory store, swap with Firestore later)
"""

import logging
from typing import List
from fastapi import APIRouter, Query

from backend.models.schemas import ThreatHistoryResponse, ThreatHistoryEntry

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory store shared with report.py and scan routes.
# In production, replace this with a Firestore query.
from backend.store import threat_store


@router.get(
    "/threat-history",
    response_model=ThreatHistoryResponse,
    summary="Retrieve paginated threat scan history",
    tags=["History"],
)
async def get_threat_history(
    page: int      = Query(default=1,  ge=1,  description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Results per page"),
    scan_type: str = Query(default="", description="Filter by type: url | sms | qr | app"),
):
    """
    Returns the history of all threat scans performed in this session.
    Filter by `scan_type` to narrow results.

    > **Note:** This is an in-memory store. Integrate Firestore for persistence.
    """
    all_entries: List[ThreatHistoryEntry] = threat_store.get_all()

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