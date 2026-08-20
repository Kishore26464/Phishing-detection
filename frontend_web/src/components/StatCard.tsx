import clsx from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'secondary' | 'tertiary' | 'error';
  dotPulse?: boolean;
}

const TONE_TEXT: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-on-surface',
  secondary: 'text-secondary',
  tertiary: 'text-tertiary',
  error: 'text-error',
};

const TONE_DOT: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-primary',
  secondary: 'bg-secondary shadow-[0_0_8px_#4de082]',
  tertiary: 'bg-tertiary shadow-[0_0_8px_#e8a33d]',
  error: 'bg-error shadow-[0_0_8px_#ff5c72]',
};

export function StatCard({ label, value, sub, tone = 'default', dotPulse }: StatCardProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-DEFAULT border p-4 glow-hover transition-all',
        tone === 'error' ? 'border-error-container/60 bg-surface-container' : 'border-outline-variant/30 bg-surface-container',
      )}
    >
      <div className={clsx('pulse-line absolute left-0 top-0')} />
      <div
        className={clsx(
          'mb-2 flex items-center justify-between text-label-sm uppercase tracking-widest',
          tone === 'error' ? 'text-error' : 'text-on-surface-variant',
        )}
      >
        {label}
        {tone !== 'default' && <span className={clsx('h-2 w-2 rounded-full', TONE_DOT[tone], dotPulse && 'animate-pulse')} />}
      </div>
      <div className={clsx('text-display-lg', TONE_TEXT[tone])}>{value}</div>
      {sub && (
        <div className={clsx('mt-2 font-mono text-data-mono', tone === 'error' ? 'font-bold text-error' : 'text-on-surface-variant')}>
          {sub}
        </div>
      )}
    </div>
  );
}
