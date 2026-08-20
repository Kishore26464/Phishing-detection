import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { PulseCard } from '../components/PulseCard';
import { ThreatBadge } from '../components/ThreatBadge';
import { useAuth } from '../context/AuthContext';
import { getReportHistory, reportThreat } from '../lib/api';
import type { ScanType, ThreatHistoryEntry, ThreatLevel } from '../lib/types';
import { formatDateTime, truncate } from '../lib/format';

export function Report() {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [scanType, setScanType] = useState<ScanType>('url');
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>('dangerous');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const [reports, setReports] = useState<ThreatHistoryEntry[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  const loadReports = useCallback(async () => {
    if (!user) {
      setReportsLoading(false);
      return;
    }
    setReportsLoading(true);
    try {
      const res = await getReportHistory(user.uid);
      setReports(res.entries);
    } finally {
      setReportsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await reportThreat({
        scan_type: scanType,
        input_data: input.trim(),
        threat_level: threatLevel,
        user_comment: comment.trim() || undefined,
        reporter_email: user?.email ?? undefined,
        user_id: user?.uid,
      });
      setStatus({ ok: res.persisted, message: res.message });
      setInput('');
      setComment('');
      if (res.persisted) loadReports();
    } catch (err) {
      setStatus({ ok: false, message: err instanceof Error ? err.message : 'Failed to submit report' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="Report">
      <div className="border-b border-outline-variant/30 pb-3">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">Manual Threat Report</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Inject an untrusted artifact for manual review when automated scans miss it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <PulseCard pulseColor="tertiary" className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-1 block text-label-sm uppercase tracking-widest text-on-surface-variant">
              Suspicious Vector (URL / SMS / decoded QR)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">link</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://…"
                className="input-glow w-full rounded border border-outline-variant bg-surface-dim py-3 pl-11 pr-4 font-mono text-data-mono text-on-surface placeholder:text-outline-variant"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-label-sm uppercase tracking-widest text-on-surface-variant">Vector Type</label>
              <select
                value={scanType}
                onChange={(e) => setScanType(e.target.value as ScanType)}
                className="input-glow w-full rounded border border-outline-variant bg-surface-dim px-3 py-3 font-mono text-data-mono text-on-surface"
              >
                <option value="url">URL</option>
                <option value="sms">SMS</option>
                <option value="qr">QR Code</option>
                <option value="app">App / APK</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-label-sm uppercase tracking-widest text-on-surface-variant">
                Classification
              </label>
              <select
                value={threatLevel}
                onChange={(e) => setThreatLevel(e.target.value as ThreatLevel)}
                className="input-glow w-full rounded border border-outline-variant bg-surface-dim px-3 py-3 font-mono text-data-mono text-on-surface"
              >
                <option value="dangerous">Dangerous</option>
                <option value="suspicious">Suspicious</option>
                <option value="safe">Safe (false positive)</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-label-sm uppercase tracking-widest text-on-surface-variant">
              Contextual Notes
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              placeholder="Provide context, where you received this, or secondary indicators…"
              className="input-glow w-full resize-none rounded border border-outline-variant bg-surface-dim px-4 py-3 font-mono text-data-mono text-on-surface placeholder:text-outline-variant"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !input.trim()}
            className="glow-hover flex items-center justify-center gap-2 rounded bg-tertiary px-6 py-3 text-label-md font-bold uppercase tracking-wide text-on-tertiary transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            {submitting ? 'Submitting…' : 'Submit for Analysis'}
          </button>

          {status && (
            <p className={`text-label-sm ${status.ok ? 'text-secondary' : 'text-error'}`}>{status.message}</p>
          )}
          <p className="text-center font-mono text-label-sm text-outline">Data is transmitted over TLS.</p>
        </form>
      </PulseCard>

      <PulseCard pulseColor="muted" className="flex flex-col p-6">
        <div className="mb-4 flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <h3 className="text-headline-md text-on-surface">Your Reports</h3>
          <button
            onClick={loadReports}
            disabled={reportsLoading}
            className="flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-primary disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh
          </button>
        </div>

        {reportsLoading && reports.length === 0 && (
          <p className="text-body-md text-on-surface-variant">Loading your reports…</p>
        )}
        {!reportsLoading && reports.length === 0 && (
          <p className="text-body-md text-on-surface-variant">
            Nothing reported yet. Submitted reports are saved to Firestore and will show up here — even
            across sessions.
          </p>
        )}

        <ul className="flex flex-col gap-3 overflow-y-auto">
          {reports.map((r) => (
            <li key={r.id} className="rounded border border-outline-variant/30 bg-surface-dim p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <ThreatBadge level={r.threat_level} />
                <span className="font-mono text-label-sm text-on-surface-variant">{formatDateTime(r.timestamp ? Date.parse(r.timestamp) : null)}</span>
              </div>
              <p className="break-all font-mono text-data-mono text-on-surface" title={r.input_data}>
                {truncate(r.input_data, 60)}
              </p>
              <p className="mt-1 text-label-sm uppercase tracking-widest text-on-surface-variant">{r.scan_type}</p>
            </li>
          ))}
        </ul>
      </PulseCard>
      </div>
    </Layout>
  );
}
