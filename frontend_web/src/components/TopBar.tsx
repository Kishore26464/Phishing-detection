import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function useUtcClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now.toUTCString().slice(17, 25);
}

export function TopBar({ title = 'Signal Forensics' }: { title?: string }) {
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();
  const time = useUtcClock();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant/20 bg-surface-dim/95 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-3">
        <span className="text-label-md uppercase tracking-widest text-primary lg:hidden">PhishGuard</span>
        <span className="hidden text-label-md uppercase tracking-widest text-primary lg:inline">{title}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden font-mono text-data-mono text-on-surface-variant md:inline">
          SYS_TIME: {time} UTC
        </span>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded p-1 text-on-surface-variant transition-colors hover:text-primary"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full border border-outline-variant" />
            ) : (
              <span className="material-symbols-outlined">account_circle</span>
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-DEFAULT border border-outline-variant/40 bg-surface-container-high p-2 shadow-2xl">
                <div className="border-b border-outline-variant/30 px-2 pb-2">
                  <p className="truncate text-body-md text-on-surface">{user?.displayName ?? 'Analyst'}</p>
                  <p className="truncate text-label-sm text-on-surface-variant">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="mt-2 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-label-md text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  Settings
                </button>
                <button
                  onClick={() => signOutUser()}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-label-md text-error hover:bg-error/10"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
