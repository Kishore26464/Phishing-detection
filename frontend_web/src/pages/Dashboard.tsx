import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/StatCard';
import { PulseCard } from '../components/PulseCard';
import { ThreatPip } from '../components/ThreatBadge';
import { useAuth } from '../context/AuthContext';
import { fetchScansAndStats, type ScanStats } from '../lib/firestoreScans';
import type { ScanRecord } from '../lib/types';
import { formatPercent, formatTimestamp, truncate } from '../lib/format';

const QUICK_ACTIONS = [
  { label: 'SCAN_URL', icon: 'link', path: '/scan/url' },
  { label: 'SCAN_SMS', icon: 'sms', path: '/scan/sms' },
  { label: 'SCAN_QR', icon: 'qr_code', path: '/scan/qr' },
  { label: 'GEN_REPORT', icon: 'description', path: '/report' },
];

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [recent, setRecent] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    fetchScansAndStats(user.uid)
      .then(({ records, stats }) => {
        if (cancelled) return;
        setStats(stats);
        setRecent(records.slice(0, 8));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const total = stats?.total ?? 0;
  const pct = (n: number) => (total > 0 ? formatPercent(n / total, 1) : '0.0%');

  return (
    <Layout title="Signal Forensics">
      <div className="flex items-end justify-between border-b border-outline-variant/30 pb-2">
        <div>
          <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Welcome back, {user?.displayName?.split(' ')[0] ?? 'Analyst'}.
          </h2>
          <p className="mt-1 font-mono text-data-mono text-on-surface-variant">
            System Status: <span className="text-secondary">Nominal</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Scans" value={loading ? '—' : total.toLocaleString()} sub={<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">network_intelligence</span>All vectors</span>} />
        <StatCard
          label="Safe"
          value={loading ? '—' : (stats?.safe ?? 0).toLocaleString()}
          sub={`${pct(stats?.safe ?? 0)} of total`}
          tone="secondary"
        />
        <StatCard
          label="Suspicious"
          value={loading ? '—' : (stats?.suspicious ?? 0).toLocaleString()}
          sub="Awaiting review"
          tone="tertiary"
        />
        <StatCard
          label="Dangerous"
          value={loading ? '—' : (stats?.dangerous ?? 0).toLocaleString()}
          sub={(stats?.dangerous ?? 0) > 0 ? 'Action required' : 'No active threats'}
          tone="error"
          dotPulse={(stats?.dangerous ?? 0) > 0}
        />
      </div>

      <div>
        <h3 className="mb-3 text-label-sm uppercase tracking-widest text-on-surface-variant">Initialize Protocol</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="group flex flex-col items-center justify-center gap-3 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-6 transition-colors hover:border-primary"
            >
              <span className="material-symbols-outlined text-4xl text-on-surface-variant transition-colors group-hover:text-primary">
                {a.icon}
              </span>
              <span className="font-mono text-data-mono text-on-surface group-hover:text-primary">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PulseCard className="flex flex-col lg:col-span-2" pulseColor="muted">
          <div className="flex items-center justify-between border-b border-outline-variant/30 p-4">
            <h3 className="text-label-sm uppercase tracking-widest text-on-surface-variant">Live Signal Feed</h3>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-secondary" />
            </span>
          </div>
          <div className="flex-grow overflow-x-auto">
            <table className="w-full text-left font-mono text-data-mono">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low">
                  <th className="p-2 pl-4 font-normal text-on-surface-variant">TIME</th>
                  <th className="p-2 font-normal text-on-surface-variant">VECTOR</th>
                  <th className="p-2 font-normal text-on-surface-variant">TARGET</th>
                  <th className="p-2 pr-4 font-normal text-on-surface-variant">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-on-surface-variant/60">
                      No scans yet. Run your first analysis above.
                    </td>
                  </tr>
                )}
                {recent.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate('/result', { state: { record: r } })}
                    className="cursor-pointer border-b border-outline-variant/10 transition-colors hover:bg-surface-container-highest"
                  >
                    <td className="p-2 pl-4 text-on-surface">{formatTimestamp(r.timestamp)}</td>
                    <td className="p-2 uppercase text-primary">{r.type}</td>
                    <td className="max-w-[220px] truncate p-2 text-on-surface">{truncate(r.input, 40)}</td>
                    <td className="p-2 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        <ThreatPip level={r.threatLevel} />
                        <span
                          className={
                            r.threatLevel === 'dangerous'
                              ? 'text-error'
                              : r.threatLevel === 'suspicious'
                                ? 'text-tertiary'
                                : r.threatLevel === 'safe'
                                  ? 'text-secondary'
                                  : 'text-on-surface-variant'
                          }
                        >
                          {r.threatLevel.toUpperCase()}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PulseCard>

        <PulseCard className="flex flex-col p-4" pulseColor="muted">
          <h3 className="mb-4 text-label-sm uppercase tracking-widest text-on-surface-variant">Vector Analysis</h3>
          <div className="flex flex-grow flex-col justify-center gap-4 font-mono text-data-mono">
            <VectorBar label="URL" value={stats?.byType.url ?? 0} total={total} colorClass="bg-primary" />
            <VectorBar label="SMS" value={stats?.byType.sms ?? 0} total={total} colorClass="bg-tertiary" />
            <VectorBar label="QR" value={stats?.byType.qr ?? 0} total={total} colorClass="bg-secondary" />
          </div>
        </PulseCard>
      </div>
    </Layout>
  );
}

function VectorBar({ label, value, total, colorClass }: { label: string; value: number; total: number; colorClass: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-on-surface">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-dim">
        <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
