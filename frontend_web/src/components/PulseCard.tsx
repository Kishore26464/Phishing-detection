import clsx from 'clsx';
import type { ReactNode } from 'react';

interface PulseCardProps {
  children: ReactNode;
  className?: string;
  pulseColor?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'muted';
  glow?: boolean;
}

const PULSE_COLOR: Record<NonNullable<PulseCardProps['pulseColor']>, string> = {
  primary: 'via-primary',
  secondary: 'via-secondary',
  tertiary: 'via-tertiary',
  error: 'via-error',
  muted: 'via-outline',
};

/** Signature "Signal Forensics" card: Ink surface, Steel border, and a
 *  1px animated waveform pulse along the top edge. */
export function PulseCard({ children, className, pulseColor = 'muted', glow = true }: PulseCardProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-DEFAULT border border-outline-variant/40 bg-surface-container',
        glow && 'glow-hover transition-all duration-200',
        className,
      )}
    >
      <div className={clsx('absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent to-transparent animate-pulse', PULSE_COLOR[pulseColor])} />
      {children}
    </div>
  );
}
