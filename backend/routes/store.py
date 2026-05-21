"""
store.py
Simple in-memory store for threat history.
Replace with Firestore integration in production.
"""

from typing import List
from backend.models.schemas import ThreatHistoryEntry


class ThreatStore:
    def __init__(self):
        self._entries: List[ThreatHistoryEntry] = []

    def add(self, entry: ThreatHistoryEntry) -> None:
        self._entries.append(entry)

    def get_all(self) -> List[ThreatHistoryEntry]:
        return list(self._entries)

    def clear(self) -> None:
        self._entries.clear()


threat_store = ThreatStore()