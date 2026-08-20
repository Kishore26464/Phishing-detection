import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { PulseCard } from '../components/PulseCard';
import { useAuth } from '../context/AuthContext';
import { checkHealth, API_BASE_URL } from '../lib/api';
import { clearScanHistory } from '../lib/firestoreScans';

export function Settings() {
  const { user, signOutUser } = useAuth();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    checkHealth().then(setHealthy);
  }, []);

  async function handleClearHistory() {
    if (!user) return;
    setClearing(true);
    setClearMessage(null);
    try {
      const count = await clearScanHistory(user.uid);
      setClearMessage(`Purged ${count} record${count === 1 ? '' : 's'} from telemetry history.`);
    } catch (err) {
      setClearMessage(err instanceof Error ? err.message : 'Failed to clear history');
    } finally {
      setClearing(false);
      setConfirmOpen(false);
    }
  }

  return (
    <Layout title="Settings">
      <div className="border-b border-outline-variant/30 pb-3">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">Settings</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">Account, connection, and telemetry controls.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PulseCard pulseColor="primary" className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-headline-md text-on-surface">
            <span className="material-symbols-outlined text-primary">account_circle</span>
            Analyst Profile
          </h3>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full border border-outline-variant" />
            ) : (
              <span className="material-symbols-outlined text-5xl text-on-surface-variant">account_circle</span>
            )}
            <div>
              <p className="text-body-lg text-on-surface">{user?.displayName ?? 'Analyst'}</p>
              <p className="font-mono text-data-mono text-on-surface-variant">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOutUser()}
            className="mt-5 flex items-center gap-2 rounded border border-error/40 px-4 py-2 text-label-md text-error transition-colors hover:bg-error/10"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign out
          </button>
        </PulseCard>

        <PulseCard pulseColor="secondary" className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-headline-md text-on-surface">
            <span className="material-symbols-outlined text-primary">dns</span>
            Backend Connection
          </h3>
          <div className="flex flex-col gap-3 font-mono text-data-mono">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <span className="text-on-surface-variant">API Endpoint</span>
              <span className="max-w-[220px] truncate text-on-surface" title={API_BASE_URL}>
                {API_BASE_URL}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Status</span>
              <span className={`flex items-center gap-1.5 ${healthy === null ? 'text-on-surface-variant' : healthy ? 'text-secondary' : 'text-error'}`}>
                <span
                  className={`h-2 w-2 rounded-full ${
                    healthy === null ? 'bg-outline' : healthy ? 'bg-secondary shadow-[0_0_6px_#4de082]' : 'bg-error'
                  }`}
                />
                {healthy === null ? 'Checking…' : healthy ? 'Online' : 'Unreachable'}
              </span>
            </div>
          </div>
        </PulseCard>

        <PulseCard pulseColor="error" className="p-5 lg:col-span-2">
          <h3 className="mb-2 flex items-center gap-2 text-headline-md text-error">
            <span className="material-symbols-outlined">warning</span>
            Danger Zone
          </h3>
          <p className="mb-4 text-body-md text-on-surface-variant">
            Destructive actions cannot be reversed. This deletes every scan you've recorded from Firestore.
          </p>
          <div className="flex items-center justify-between rounded border border-error/20 bg-surface-dim p-3">
            <span className="font-mono text-data-mono text-on-surface">Purge Telemetry History</span>
            {!confirmOpen ? (
              <button
                onClick={() => setConfirmOpen(true)}
                className="rounded border border-error px-4 py-2 text-label-md text-error transition-colors hover:bg-error hover:text-on-error"
              >
                Clear History
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="rounded border border-outline-variant px-3 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearHistory}
                  disabled={clearing}
                  className="rounded bg-error px-4 py-2 text-label-md font-bold text-on-error transition-colors disabled:opacity-60"
                >
                  {clearing ? 'Purging…' : 'Confirm Delete'}
                </button>
              </div>
            )}
          </div>
          {clearMessage && <p className="mt-3 text-label-sm text-on-surface-variant">{clearMessage}</p>}
        </PulseCard>
      </div>
    </Layout>
  );
}
