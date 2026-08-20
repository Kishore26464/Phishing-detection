import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { PulseCard } from '../components/PulseCard';
import { ThreatPip } from '../components/ThreatBadge';
import { useAuth } from '../context/AuthContext';
import { fetchScanPage } from '../lib/firestoreScans';
import type { ScanRecord, ScanType } from '../lib/types';
import { formatDateTime, formatPercent, THREAT_LABEL, truncate } from '../lib/format';

const PAGE_SIZE = 20;
const FILTERS: Array<{ label: string; value: ScanType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'URL', value: 'url' },
  { label: 'SMS', value: 'sms' },
  { label: 'QR', value: 'qr' },
  { label: 'App', value: 'app' },
];

export function ScanHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ScanType | 'all'>('all');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    fetchScanPage(user.uid, PAGE_SIZE, null).then((page) => {
      if (cancelled) return;
      setRecords(page.records);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function loadMore() {
    if (!user || !cursor) return;
    setLoading(true);
    const page = await fetchScanPage(user.uid, PAGE_SIZE, cursor);
    setRecords((prev) => [...prev, ...page.records]);
    setCursor(page.cursor);
    setHasMore(page.hasMore);
    setLoading(false);
  }

  const filtered = filter === 'all' ? records : records.filter((r) => r.type === filter);

  return (
    <Layout title="Scan History">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-outline-variant/30 pb-3">
        <div>
          <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">Telemetry Archive</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">Full chronological log of every scan you've run.</p>
        </div>
        <div className="flex gap-1 rounded-DEFAULT border border-outline-variant/40 bg-surface-container p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded px-3 py-1.5 text-label-sm uppercase transition-colors ${
                filter === f.value ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <PulseCard pulseColor="muted" className="flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-data-mono">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
                <th className="p-2 pl-4 font-normal">Timestamp</th>
                <th className="p-2 font-normal">Vector</th>
                <th className="p-2 font-normal">Target</th>
                <th className="p-2 font-normal">Status</th>
                <th className="p-2 pr-4 text-right font-normal">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant/60">
                    No scans recorded yet.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate('/result', { state: { record: r } })}
                  className="cursor-pointer border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low/60"
                >
                  <td className="p-2 pl-4 text-on-surface-variant">{formatDateTime(r.timestamp)}</td>
                  <td className="p-2 uppercase text-primary">{r.type}</td>
                  <td className="max-w-[260px] truncate p-2 text-on-surface" title={r.input}>
                    {truncate(r.input, 48)}
                  </td>
                  <td className="p-2">
                    <span className="inline-flex items-center gap-1.5">
                      <ThreatPip level={r.threatLevel} />
                      <span
                        className={
                          r.threatLevel === 'dangerous'
                            ? 'text-error'
                            : r.threatLevel === 'suspicious'
                              ? 'text-tertiary'
                              : r.threatLevel === 'safe'
                                ? 'text-secondary'
                                : 'text-on-surface-variant'
                        }
                      >
                        {THREAT_LABEL[r.threatLevel]}
                      </span>
                    </span>
                  </td>
                  <td className="p-2 pr-4 text-right text-on-surface-variant">{formatPercent(r.confidence, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center border-t border-outline-variant/20 p-3">
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="rounded border border-outline-variant px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
          {!hasMore && records.length > 0 && (
            <span className="font-mono text-[11px] uppercase text-on-surface-variant/50">End of archive</span>
          )}
        </div>
      </PulseCard>
    </Layout>
  );
}
