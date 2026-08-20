import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PulseCard } from '../components/PulseCard';
import { StatCard } from '../components/StatCard';
import { ThreatPip } from '../components/ThreatBadge';
import { useAuth } from '../context/AuthContext';
import { fetchScansAndStats, type ScanStats } from '../lib/firestoreScans';
import type { ScanRecord } from '../lib/types';
import { formatDateTime, formatPercent, THREAT_LABEL, truncate } from '../lib/format';

export function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchScansAndStats(user.uid, 500).then(({ records, stats }) => {
      if (cancelled) return;
      setRecords(records);
      setStats(stats);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const total = stats?.total ?? 0;
  const severeEvents = records.filter((r) => r.threatLevel === 'dangerous' || r.threatLevel === 'suspicious').slice(0, 10);
  const detectionRate = total > 0 ? ((stats!.suspicious + stats!.dangerous) / total) : 0;

  return (
    <Layout title="Analytics">
      <div className="border-b border-outline-variant/30 pb-3">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">Threat Analytics</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">Aggregate telemetry across every signal vector you've scanned.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Vectors" value={loading ? '—' : total.toLocaleString()} />
        <StatCard
          label="Detection Rate"
          value={loading ? '—' : formatPercent(detectionRate, 1)}
          tone={detectionRate > 0.15 ? 'error' : 'tertiary'}
          sub="Suspicious + Dangerous / Total"
        />
        <StatCard
          label="Clean Signals"
          value={loading ? '—' : formatPercent(total > 0 ? (stats!.safe / total) : 0, 1)}
          tone="secondary"
          sub={`${stats?.safe ?? 0} verified safe`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <PulseCard pulseColor="primary" className="p-5 lg:col-span-6">
          <h3 className="mb-4 text-headline-md text-on-surface">Vector Distribution</h3>
          <div className="flex flex-col gap-4">
            <DistBar label="URL" value={stats?.byType.url ?? 0} total={total} colorClass="bg-primary" />
            <DistBar label="SMS" value={stats?.byType.sms ?? 0} total={total} colorClass="bg-tertiary" />
            <DistBar label="QR" value={stats?.byType.qr ?? 0} total={total} colorClass="bg-secondary" />
            <DistBar label="App" value={stats?.byType.app ?? 0} total={total} colorClass="bg-error" />
          </div>
        </PulseCard>

        <PulseCard pulseColor="muted" className="flex min-h-[300px] flex-col p-5 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-headline-md text-on-surface">Recent High-Severity Events</h3>
            <button onClick={() => navigate('/history')} className="text-label-md text-primary hover:underline">
              View All
            </button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant/30 text-label-sm uppercase tracking-wider text-on-surface-variant">
                  <th className="py-2 pr-4 font-normal">Timestamp</th>
                  <th className="py-2 pr-4 font-normal">Vector</th>
                  <th className="py-2 pr-4 font-normal">Target</th>
                  <th className="py-2 text-right font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm text-data-mono">
                {severeEvents.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-on-surface-variant/60">
                      No elevated-risk events recorded.
                    </td>
                  </tr>
                )}
                {severeEvents.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate('/result', { state: { record: r } })}
                    className="cursor-pointer border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low"
                  >
                    <td className="py-3 pr-4 text-primary">{formatDateTime(r.timestamp)}</td>
                    <td className="py-3 pr-4 uppercase text-on-surface">{r.type}</td>
                    <td className="max-w-[160px] truncate py-3 pr-4 text-on-surface-variant">{truncate(r.input, 28)}</td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          r.threatLevel === 'dangerous' ? 'text-error' : 'text-tertiary'
                        }`}
                      >
                        <ThreatPip level={r.threatLevel} />
                        {THREAT_LABEL[r.threatLevel]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PulseCard>
      </div>
    </Layout>
  );
}

function DistBar({ label, value, total, colorClass }: { label: string; value: number; total: number; colorClass: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-data-mono text-xs">
        <span className="text-on-surface-variant">{label}</span>
        <span className="text-on-surface">{value} · {pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-surface-container-low">
        <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
