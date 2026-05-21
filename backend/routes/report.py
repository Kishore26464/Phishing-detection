"""
routes/report.py
POST /report-threat — user-submitted threat reports
"""

import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from backend.models.schemas import (
    ReportThreatRequest, ReportThreatResponse,
    ThreatHistoryEntry,
)
from backend.store import threat_store

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/report-threat",
    response_model=ReportThreatResponse,
    summary="Submit a user threat report",
    tags=["Reporting"],
)
async def report_threat(request: ReportThreatRequest):
    """
    Accepts a manually reported threat from the mobile app or extension.
    Stores it in the threat history and returns a report ID.

    **Request body example:**
    ```json
    {
      "scan_type": "url",
      "input_data": "http://definitely-phishing.com",
      "threat_level": "dangerous",
      "user_comment": "Received this link in a WhatsApp message",
      "reporter_email": "user@example.com"
    }
    ```
    """
    if not request.input_data or not request.input_data.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="input_data cannot be empty",
        )

    if request.scan_type not in ("url", "sms", "qr", "app"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="scan_type must be one of: url, sms, qr, app",
        )

    report_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    reasons = ["User-submitted report"]
    if request.user_comment:
        reasons.append(f"Comment: {request.user_comment}")

    entry = ThreatHistoryEntry(
        id=report_id,
        scan_type=request.scan_type,
        input_data=request.input_data.strip(),
        threat_level=request.threat_level,
        confidence=1.0,   # user reports are treated as high confidence
        timestamp=timestamp,
        reasons=reasons,
    )

    threat_store.add(entry)
    logger.info(f"Threat report saved: {report_id} | {request.scan_type} | {request.threat_level}")

    return ReportThreatResponse(
        report_id=report_id,
        status="accepted",
        message=f"Threat report accepted and stored with ID {report_id}",
    )