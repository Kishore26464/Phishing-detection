import clsx from 'clsx';
import type { ThreatLevel } from '../lib/types';
import { THREAT_LABEL } from '../lib/format';

const STYLES: Record<ThreatLevel, { text: string; bg: string; border: string; dot: string }> = {
  safe: { text: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/40', dot: 'bg-secondary' },
  suspicious: { text: 'text-tertiary', bg: 'bg-tertiary/10', border: 'border-tertiary/40', dot: 'bg-tertiary' },
  dangerous: { text: 'text-error', bg: 'bg-error/10', border: 'border-error/50', dot: 'bg-error' },
  unknown: {
    text: 'text-on-surface-variant',
    bg: 'bg-surface-container-high',
    border: 'border-outline-variant',
    dot: 'bg-outline',
  },
};

export function ThreatPip({ level, className }: { level: ThreatLevel; className?: string }) {
  const s = STYLES[level];
  return (
    <span
      className={clsx(
        'inline-block h-1.5 w-1.5 rounded-full bioluminescent-pip',
        s.dot,
        level === 'dangerous' && 'animate-pulse',
        className,
      )}
    />
  );
}

export function ThreatBadge({ level, className }: { level: ThreatLevel; className?: string }) {
  const s = STYLES[level];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-label-sm uppercase tracking-widest font-bold',
        s.text,
        s.bg,
        s.border,
        className,
      )}
    >
      <ThreatPip level={level} />
      {THREAT_LABEL[level]}
    </span>
  );
}

export function threatTextClass(level: ThreatLevel): string {
  return STYLES[level].text;
}
