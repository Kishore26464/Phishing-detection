import { useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { PulseCard } from '../components/PulseCard';
import { ResultPanel } from '../components/ResultPanel';
import { useAuth } from '../context/AuthContext';
import { scanUrl } from '../lib/api';
import { urlResponseToRecord } from '../lib/convert';
import type { ScanRecord } from '../lib/types';

export function UrlScanner() {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanRecord | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await scanUrl(url.trim(), user?.uid);
      setResult(urlResponseToRecord(response));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Scan URL">
      <div className="border-b border-outline-variant/30 pb-3">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">URL Signal Scan</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Submit a link for ML classification, VirusTotal aggregation, and Google Safe Browsing checks.
        </p>
      </div>

      <PulseCard pulseColor="primary" className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="block text-label-sm uppercase tracking-widest text-on-surface-variant">
            Target URL
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              link
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://suspicious-login.example.com/verify"
              className="input-glow w-full rounded border border-outline-variant bg-surface-dim py-3 pl-11 pr-4 font-mono text-data-mono text-on-surface placeholder:text-outline-variant"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="glow-hover flex items-center justify-center gap-2 rounded bg-primary px-6 py-3 text-label-md font-bold uppercase tracking-wide text-on-primary transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Scanning…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">radar</span>
                Initiate Scan
              </>
            )}
          </button>
          {error && <p className="text-label-sm text-error">{error}</p>}
        </form>
      </PulseCard>

      {result && <ResultPanel record={result} />}
    </Layout>
  );
}
