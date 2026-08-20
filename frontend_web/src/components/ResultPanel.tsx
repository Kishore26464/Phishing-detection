import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { ScanRecord } from '../lib/types';
import { formatPercent, formatTime, THREAT_VERDICT } from '../lib/format';

const HEADER_STYLE: Record<string, string> = {
  safe: 'text-secondary',
  suspicious: 'text-tertiary',
  dangerous: 'text-error',
  unknown: 'text-on-surface-variant',
};

const ICON: Record<string, string> = {
  safe: 'check_circle',
  suspicious: 'warning',
  dangerous: 'gpp_bad',
  unknown: 'help',
};

export function ResultPanel({ record }: { record: ScanRecord }) {
  const navigate = useNavigate();
  const tone = HEADER_STYLE[record.threatLevel];

  return (
    <div className="relative overflow-hidden rounded-DEFAULT border border-outline-variant/40 bg-surface-container">
      <div className={clsx('absolute left-0 top-0 h-1 w-full', record.threatLevel === 'dangerous' ? 'bg-error' : 'bg-transparent')} />

      <div className="flex flex-col gap-1 border-b border-outline-variant/30 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className={clsx('flex items-center gap-2 text-headline-lg-mobile md:text-headline-lg', tone)}>
            <span className="material-symbols-outlined text-[28px]">{ICON[record.threatLevel]}</span>
            {THREAT_VERDICT[record.threatLevel]}
          </h3>
          <p className="mt-1 text-label-sm uppercase tracking-widest text-on-surface-variant">
            Analysis complete • {formatTime(record.scanTimeMs ?? 0)}
          </p>
        </div>
        <div className={clsx('self-start rounded border px-3 py-1 font-mono text-[12px] md:self-auto', tone, 'border-current/40 bg-current/10')}>
          SCORE: {formatPercent(record.confidence, 1)}
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="rounded border border-outline-variant/20 bg-surface-dim p-3">
          <span className="mb-1 block text-label-sm text-on-surface-variant">TARGET</span>
          <span className="block break-all font-mono text-data-mono text-on-surface">{record.input}</span>
        </div>

        {record.triggeredKeywords && record.triggeredKeywords.length > 0 && (
          <div>
            <span className="mb-1 block text-label-sm text-on-surface-variant">TRIGGERED KEYWORDS</span>
            <div className="flex flex-wrap gap-2">
              {record.triggeredKeywords.map((kw) => (
                <span key={kw} className="rounded-xl border border-error/40 bg-error/10 px-2 py-0.5 font-mono text-[12px] text-error">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded border border-outline-variant/20 bg-surface-dim p-3">
          <span className="mb-2 block border-b border-outline-variant/20 pb-1 text-label-sm text-on-surface-variant">
            Forensic Heuristics
          </span>
          <ul className="space-y-1.5 font-mono text-[13px] text-on-surface">
            {record.reasons.slice(0, 6).map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={record.threatLevel === 'dangerous' ? 'text-error' : 'text-secondary'}>
                  {record.threatLevel === 'dangerous' ? '[!]' : '[OK]'}
                </span>
                <span className="text-on-surface-variant">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-outline-variant/30 p-4">
        <button
          onClick={() => navigator.clipboard?.writeText(record.input)}
          className="rounded border border-outline-variant px-4 py-2 text-label-md uppercase text-on-surface transition-colors hover:bg-surface-container-low"
        >
          Copy target
        </button>
        <button
          onClick={() => navigate('/result', { state: { record } })}
          className="rounded border border-transparent bg-surface-bright px-4 py-2 text-label-md uppercase text-on-surface transition-colors hover:border-primary/50 hover:bg-primary/20 hover:text-primary"
        >
          View full forensics
        </button>
      </div>
    </div>
  );
}
