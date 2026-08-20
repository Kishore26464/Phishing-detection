import type { ThreatLevel } from './types';

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatTime(ms: number): string {
  return `${ms.toFixed(ms < 10 ? 2 : 0)}ms`;
}

export function formatTimestamp(ms: number | null | undefined): string {
  if (!ms) return '--:--:--';
  return new Date(ms).toLocaleTimeString('en-US', { hour12: false });
}

export function formatDateTime(ms: number | null | undefined): string {
  if (!ms) return 'Unknown time';
  return new Date(ms).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const THREAT_LABEL: Record<ThreatLevel, string> = {
  safe: 'CLEAR',
  suspicious: 'STATIC',
  dangerous: 'BREACH',
  unknown: 'UNKNOWN',
};

export const THREAT_VERDICT: Record<ThreatLevel, string> = {
  safe: 'Signal Clear',
  suspicious: 'Static Detected',
  dangerous: 'Breach Detected',
  unknown: 'Inconclusive',
};

export function truncate(value: string, max = 42): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
