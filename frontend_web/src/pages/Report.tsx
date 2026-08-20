import { useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { PulseCard } from '../components/PulseCard';
import { useAuth } from '../context/AuthContext';
import { reportThreat } from '../lib/api';
import type { ScanType, ThreatLevel } from '../lib/types';

export function Report() {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [scanType, setScanType] = useState<ScanType>('url');
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>('dangerous');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

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
      });
      setStatus({ ok: true, message: res.message });
      setInput('');
      setComment('');
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

      <PulseCard pulseColor="tertiary" className="max-w-2xl p-6">
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
    </Layout>
  );
}
