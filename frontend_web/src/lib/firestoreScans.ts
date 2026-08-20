import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  Timestamp,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ScanRecord, ScanType, ThreatLevel } from './types';

function scansRef(uid: string) {
  return collection(db, 'users', uid, 'scans');
}

function toMillis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return null;
}

/** Normalizes a Firestore scan doc — tolerant of both the backend's camelCase
 *  writes (threatLevel/timestamp) and any legacy snake_case client writes
 *  (threat_level/scanned_at) the mobile app may have produced historically. */
function toScanRecord(snap: QueryDocumentSnapshot<DocumentData>): ScanRecord {
  const d = snap.data();
  const threatLevel = (d.threatLevel ?? d.threat_level ?? 'unknown') as ThreatLevel;
  const type = (d.type ?? d.scan_type ?? 'url') as ScanType;
  const input = (d.input ?? d.url ?? d.message ?? d.decoded_url ?? '') as string;

  return {
    id: snap.id,
    type,
    input,
    threatLevel,
    confidence: Number(d.confidence ?? 0),
    isPhishing: Boolean(d.isPhishing ?? d.is_phishing ?? false),
    reasons: (d.reasons as string[]) ?? [],
    triggeredKeywords: (d.triggeredKeywords ?? d.triggered_keywords) as string[] | undefined,
    mlResult: d.mlResult ?? d.ml_result,
    virusTotalResult: d.virusTotalResult ?? d.virustotal ?? null,
    safeBrowsingFlagged: Boolean(d.safeBrowsingFlagged ?? d.safe_browsing_flagged ?? false),
    scanTimeMs: Number(d.scanTimeMs ?? d.scan_time_ms ?? 0),
    timestamp: toMillis(d.timestamp) ?? toMillis(d.scannedAt) ?? toMillis(d.scanned_at) ?? toMillis(d.created_at),
  };
}

export interface ScanStats {
  total: number;
  safe: number;
  suspicious: number;
  dangerous: number;
  unknown: number;
  byType: Record<ScanType, number>;
}

function emptyStats(): ScanStats {
  return { total: 0, safe: 0, suspicious: 0, dangerous: 0, unknown: 0, byType: { url: 0, sms: 0, qr: 0, app: 0 } };
}

/** Fetches recent scans (bounded) and derives both the stat rollup and the
 *  recent list from a single read — avoids double-fetching on the dashboard. */
export async function fetchScansAndStats(
  uid: string,
  sampleSize = 500,
): Promise<{ records: ScanRecord[]; stats: ScanStats }> {
  const q = query(scansRef(uid), orderBy('timestamp', 'desc'), fsLimit(sampleSize));
  const snap = await getDocs(q);
  const records = snap.docs.map(toScanRecord);

  const stats = emptyStats();
  for (const r of records) {
    stats.total += 1;
    if (r.threatLevel === 'safe') stats.safe += 1;
    else if (r.threatLevel === 'suspicious') stats.suspicious += 1;
    else if (r.threatLevel === 'dangerous') stats.dangerous += 1;
    else stats.unknown += 1;
    if (r.type in stats.byType) stats.byType[r.type] += 1;
  }

  return { records, stats };
}

export interface ScanPage {
  records: ScanRecord[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function fetchScanPage(
  uid: string,
  pageSize: number,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
): Promise<ScanPage> {
  const constraints = [orderBy('timestamp', 'desc'), fsLimit(pageSize + 1)];
  const q = cursor
    ? query(scansRef(uid), ...constraints, startAfter(cursor))
    : query(scansRef(uid), ...constraints);

  const snap = await getDocs(q);
  const docs = snap.docs.slice(0, pageSize);
  const hasMore = snap.docs.length > pageSize;

  return {
    records: docs.map(toScanRecord),
    cursor: docs.length ? docs[docs.length - 1] : null,
    hasMore,
  };
}

export async function clearScanHistory(uid: string): Promise<number> {
  const snap = await getDocs(scansRef(uid));
  const chunks: QueryDocumentSnapshot<DocumentData>[][] = [];
  for (let i = 0; i < snap.docs.length; i += 450) {
    chunks.push(snap.docs.slice(i, i + 450));
  }
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(doc(db, 'users', uid, 'scans', d.id)));
    await batch.commit();
  }
  return snap.docs.length;
}

export async function deleteScan(uid: string, scanId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'scans', scanId));
}
