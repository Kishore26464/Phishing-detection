import { useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { PulseCard } from '../components/PulseCard';
import { ResultPanel } from '../components/ResultPanel';
import { useAuth } from '../context/AuthContext';
import { scanSms } from '../lib/api';
import { smsResponseToRecord } from '../lib/convert';
import type { ScanRecord } from '../lib/types';

export function SmsScanner() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanRecord | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await scanSms(message.trim(), user?.uid);
      setResult(smsResponseToRecord(response));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Scan SMS">
      <div className="border-b border-outline-variant/30 pb-3">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">SMS Payload Analysis</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Paste a suspicious text message for NLP-based smishing detection.
        </p>
      </div>

      <PulseCard pulseColor="tertiary" className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="block text-label-sm uppercase tracking-widest text-on-surface-variant">
            Message Content
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Congratulations! You won $1000. Click here to claim: bit.ly/win"
            rows={5}
            className="input-glow w-full resize-none rounded border border-outline-variant bg-surface-dim px-4 py-3 font-mono text-data-mono text-on-surface placeholder:text-outline-variant"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="glow-hover flex items-center justify-center gap-2 rounded bg-tertiary px-6 py-3 text-label-md font-bold uppercase tracking-wide text-on-tertiary transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Analyzing…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">psychology</span>
                Analyze Message
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
