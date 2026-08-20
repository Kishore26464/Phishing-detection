import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ThreatPip } from '../components/ThreatBadge';
import type { ScanRecord } from '../lib/types';
import { formatDateTime, formatPercent, formatTime, THREAT_VERDICT } from '../lib/format';

const TONE: Record<string, string> = {
  safe: 'text-secondary',
  suspicious: 'text-tertiary',
  dangerous: 'text-error',
  unknown: 'text-on-surface-variant',
};

export function ResultDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const record = (location.state as { record?: ScanRecord } | null)?.record;

  if (!record) {
    return (
      <Layout title="Result Detail">
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant">search_off</span>
          <p className="text-body-md text-on-surface-variant">No scan record was passed to this view.</p>
          <button
            onClick={() => navigate('/history')}
            className="rounded border border-outline-variant px-4 py-2 text-label-md text-on-surface hover:border-primary hover:text-primary"
          >
            Go to History
          </button>
        </div>
      </Layout>
    );
  }

  const tone = TONE[record.threatLevel];
  const vt = record.virusTotalResult;
  const ml = record.mlResult;

  return (
    <Layout title="Result Detail">
      <section
        className={`flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between ${
          record.threatLevel === 'dangerous' ? 'border-error/40' : 'border-outline-variant/30'
        }`}
      >
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ThreatPip level={record.threatLevel} className="h-2.5 w-2.5" />
            <span className={`text-label-md uppercase tracking-widest ${tone}`}>{THREAT_VERDICT[record.threatLevel]}</span>
          </div>
          <h1 className={`text-headline-lg-mobile md:text-display-lg break-all ${record.threatLevel === 'dangerous' ? 'text-on-surface' : 'text-on-surface'}`}>
            {record.input}
          </h1>
          <p className="mt-2 flex items-center gap-2 font-mono text-data-mono text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">schedule</span>
            Scanned: {formatDateTime(record.timestamp)}
            <span className="text-outline-variant">•</span>
            {formatTime(record.scanTimeMs ?? 0)}
            <span className="text-outline-variant">•</span>
            <span className="uppercase text-primary">{record.type}</span>
          </p>
        </div>
        <div className="rounded-lg border border-outline-variant/40 bg-surface-container p-4 md:min-w-[200px]">
          <span className="block text-label-sm uppercase text-on-surface-variant">Confidence Score</span>
          <div className="flex items-end gap-2">
            <span className={`text-display-lg leading-none ${tone}`}>{Math.round(record.confidence * 100)}</span>
            <span className="mb-1 font-mono text-data-mono text-on-surface-variant">/100</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="flex flex-col gap-6 md:col-span-8">
          <div className="relative overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container">
            <div className="pulse-line absolute left-0 top-0" />
            <div className="flex flex-col gap-4 p-5">
              <h2 className="flex items-center gap-2 text-headline-md text-primary">
                <span className="material-symbols-outlined">network_node</span>
                ML Feature Analysis
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FeatureRow label="Prediction" value={ml?.prediction ?? (record.isPhishing ? 'phishing' : 'legitimate')} highlight={record.isPhishing} />
                <FeatureRow label="ML Confidence" value={formatPercent(ml?.confidence ?? record.confidence, 2)} highlight={record.isPhishing} />
                {Array.isArray(ml?.top_features) &&
                  (ml!.top_features as Array<Record<string, unknown>>).slice(0, 8).map((f, i) => (
                    <FeatureRow
                      key={i}
                      label={String(f.feature ?? `feature_${i}`)}
                      value={String(f.value ?? f.risk_contribution ?? '—')}
                    />
                  ))}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container">
            <div className="absolute left-0 top-0 h-1 w-full bg-surface-container-high" />
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
                <h2 className="flex items-center gap-2 text-headline-md text-primary">
                  <span className="material-symbols-outlined">bug_report</span>
                  VirusTotal Aggregate
                </h2>
                {vt && (
                  <span className="rounded bg-error-container px-2 py-1 font-mono text-data-mono text-on-error-container">
                    {vt.malicious_votes ?? 0}/{vt.total_engines ?? 0} Flags
                  </span>
                )}
              </div>
              {!vt && <p className="text-body-md text-on-surface-variant">VirusTotal data unavailable for this scan.</p>}
              {vt && (
                <div className="flex flex-col gap-2">
                  <FeatureRow label="Malicious votes" value={String(vt.malicious_votes ?? 0)} highlight={(vt.malicious_votes ?? 0) > 0} />
                  <FeatureRow label="Suspicious votes" value={String(vt.suspicious_votes ?? 0)} />
                  <FeatureRow label="Total engines" value={String(vt.total_engines ?? 0)} />
                  {vt.categories && vt.categories.length > 0 && (
                    <FeatureRow label="Categories" value={vt.categories.join(', ')} highlight />
                  )}
                  {vt.permalink && (
                    <a
                      href={vt.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 flex items-center gap-1 text-label-md text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      View full VirusTotal report
                    </a>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 border-t border-outline-variant/20 pt-3">
                <span className="text-label-sm uppercase text-on-surface-variant">Safe Browsing:</span>
                <span className={record.safeBrowsingFlagged ? 'text-error' : 'text-secondary'}>
                  {record.safeBrowsingFlagged ? 'Flagged' : 'Not flagged'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 md:col-span-4">
          <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-4">
            <h3 className="mb-4 border-b border-outline-variant/30 pb-2 text-label-sm uppercase tracking-widest text-on-surface-variant">
              Forensic Heuristics
            </h3>
            <ul className="space-y-2 font-mono text-[13px] text-on-surface">
              {record.reasons.length === 0 && <li className="text-on-surface-variant">No specific signals reported.</li>}
              {record.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={record.threatLevel === 'dangerous' ? 'text-error' : 'text-secondary'}>
                    {record.threatLevel === 'dangerous' ? '[!]' : '[OK]'}
                  </span>
                  <span className="text-on-surface-variant">{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {record.triggeredKeywords && record.triggeredKeywords.length > 0 && (
            <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-4">
              <h3 className="mb-4 border-b border-outline-variant/30 pb-2 text-label-sm uppercase tracking-widest text-on-surface-variant">
                Triggered Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {record.triggeredKeywords.map((kw) => (
                  <span key={kw} className="rounded-xl border border-error/40 bg-error/10 px-2 py-1 font-mono text-[12px] text-error">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(record, null, 2))}
            className="rounded border border-outline-variant px-4 py-2 text-label-md uppercase text-on-surface transition-colors hover:border-primary hover:text-primary"
          >
            Export JSON
          </button>
        </div>
      </section>
    </Layout>
  );
}

function FeatureRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between border-b border-outline-variant/30 pb-2">
      <span className="font-mono text-data-mono text-primary">{label}</span>
      <span className={`font-mono text-data-mono ${highlight ? 'font-bold text-error' : 'text-on-surface'}`}>{value}</span>
    </div>
  );
}
