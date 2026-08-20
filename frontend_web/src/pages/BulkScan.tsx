import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PulseCard } from '../components/PulseCard';
import { ThreatPip } from '../components/ThreatBadge';
import { useAuth } from '../context/AuthContext';
import { scanUrl } from '../lib/api';
import type { ScanRecord } from '../lib/types';
import { formatPercent, formatTime, THREAT_LABEL, truncate } from '../lib/format';
import { urlResponseToRecord } from '../lib/convert';

interface RowState {
  url: string;
  status: 'pending' | 'scanning' | 'done' | 'error';
  record?: ScanRecord;
  errorMessage?: string;
}

const CONCURRENCY = 4;

export function BulkScan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<RowState[]>([]);
  const [running, setRunning] = useState(false);

  const lineCount = useMemo(() => {
    const t = text.trim();
    return t === '' ? 0 : t.split('\n').filter((l) => l.trim()).length;
  }, [text]);

  const completed = rows.filter((r) => r.status === 'done' || r.status === 'error').length;

  async function runScan() {
    const urls = Array.from(new Set(text.split('\n').map((l) => l.trim()).filter(Boolean)));
    if (urls.length === 0) return;

    const initial: RowState[] = urls.map((url) => ({ url, status: 'pending' }));
    setRows(initial);
    setRunning(true);

    let cursor = 0;
    async function worker() {
      while (cursor < urls.length) {
        const index = cursor++;
        setRows((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], status: 'scanning' };
          return next;
        });
        try {
          const response = await scanUrl(urls[index], user?.uid);
          const record = urlResponseToRecord(response);
          setRows((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], status: 'done', record };
            return next;
          });
        } catch (err) {
          setRows((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], status: 'error', errorMessage: err instanceof Error ? err.message : 'Failed' };
            return next;
          });
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker()));
    setRunning(false);
  }

  return (
    <Layout title="Bulk Scan">
      <div className="border-b border-outline-variant/30 pb-3">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">Bulk Vector Sweep</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Analyze a batch of URLs in one pass — one target per line.
        </p>
      </div>

      <PulseCard pulseColor="primary" className="p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-label-sm uppercase tracking-widest text-on-surface-variant">Target List</label>
            <span className="font-mono text-label-sm text-on-surface-variant">
              {lineCount} Vector{lineCount !== 1 ? 's' : ''}
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={'https://example.com\nhttps://another-site.net\nbit.ly/suspicious-link'}
            className="input-glow w-full resize-none rounded border border-outline-variant bg-surface-dim px-4 py-3 font-mono text-data-mono text-on-surface placeholder:text-outline-variant"
          />
          <button
            onClick={runScan}
            disabled={running || lineCount === 0}
            className="glow-hover flex items-center justify-center gap-2 rounded bg-primary px-6 py-3 text-label-md font-bold uppercase tracking-wide text-on-primary transition-all disabled:opacity-50"
          >
            {running ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Scanning {completed}/{rows.length}…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">layers</span>
                Run Bulk Scan
              </>
            )}
          </button>
        </div>
      </PulseCard>

      {rows.length > 0 && (
        <PulseCard pulseColor="muted" className="flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-data-mono">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
                  <th className="p-2 pl-4 font-normal">Target</th>
                  <th className="p-2 font-normal">Status</th>
                  <th className="p-2 font-normal">Confidence</th>
                  <th className="p-2 pr-4 text-right font-normal">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={`${row.url}-${i}`}
                    onClick={() => row.record && navigate('/result', { state: { record: row.record } })}
                    className="border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low/60"
                  >
                    <td className="max-w-[240px] truncate p-2 pl-4 text-primary" title={row.url}>
                      <span
                        className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${
                          row.status === 'pending'
                            ? 'bg-outline-variant'
                            : row.status === 'scanning'
                              ? 'animate-pulse bg-primary'
                              : row.status === 'error'
                                ? 'bg-error'
                                : ''
                        }`}
                      />
                      {row.record ? <ThreatPip level={row.record.threatLevel} className="mr-2" /> : null}
                      {truncate(row.url, 44)}
                    </td>
                    <td className="p-2">
                      {row.status === 'pending' && <span className="text-on-surface-variant/50">Pending</span>}
                      {row.status === 'scanning' && <span className="text-primary">Scanning…</span>}
                      {row.status === 'error' && <span className="text-error">{row.errorMessage ?? 'Error'}</span>}
                      {row.status === 'done' && row.record && (
                        <span
                          className={
                            row.record.threatLevel === 'dangerous'
                              ? 'text-error'
                              : row.record.threatLevel === 'suspicious'
                                ? 'text-tertiary'
                                : 'text-secondary'
                          }
                        >
                          {THREAT_LABEL[row.record.threatLevel]}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-on-surface-variant">
                      {row.record ? formatPercent(row.record.confidence, 1) : '--'}
                    </td>
                    <td className="p-2 pr-4 text-right text-on-surface-variant">
                      {row.record ? formatTime(row.record.scanTimeMs ?? 0) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-outline-variant/20 bg-surface-container-lowest p-2 text-center font-mono text-[11px] text-on-surface-variant/60">
            {running ? `SCANNING… (${completed}/${rows.length})` : `COMPLETE — ${completed}/${rows.length} vectors processed`}
          </div>
        </PulseCard>
      )}
    </Layout>
  );
}
