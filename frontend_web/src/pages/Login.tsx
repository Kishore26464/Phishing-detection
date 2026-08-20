import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { user, loading, signIn } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void p-4 md:p-8">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{
        backgroundImage:
          'radial-gradient(circle at 50% 0%, rgba(123,110,246,0.18), transparent 60%), radial-gradient(circle at 20% 90%, rgba(77,224,130,0.08), transparent 55%)',
      }} />

      <main className="ink-card relative z-10 flex w-full max-w-[28rem] flex-col items-center p-12 shadow-2xl">
        <div className="pulse-line absolute left-0 top-0" />

        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="text-display-lg mb-2 tracking-tighter text-primary">PhishGuard</h1>
          <div className="relative mb-6 h-8 w-full max-w-[200px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-px w-full overflow-hidden bg-outline-variant">
                <div className="pulse-line absolute inset-0" />
              </div>
            </div>
          </div>
          <h2 className="text-headline-md mb-4 text-on-surface">Signal Forensics for the Modern Web.</h2>
          <p className="text-body-md max-w-[20rem] text-on-surface-variant">
            Detect phishing, malware, and credential theft with real-time signal analysis.
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="glow-hover group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded border border-outline-variant bg-surface-container-high px-6 py-3 text-label-md text-on-surface transition-all duration-300 disabled:opacity-60"
          >
            {signingIn ? (
              <span className="material-symbols-outlined animate-spin text-on-surface-variant">progress_activity</span>
            ) : (
              <GoogleIcon />
            )}
            <span>{signingIn ? 'Establishing session…' : 'Sign in with Google'}</span>
            <div className="absolute bottom-0 left-0 h-px w-full -translate-x-full bg-primary transition-transform duration-500 group-hover:translate-x-0" />
          </button>

          {error && <p className="text-center text-label-sm text-error">{error}</p>}

          <div className="mt-2 flex items-center justify-center gap-2 opacity-60 transition-opacity hover:opacity-100">
            <span className="material-symbols-outlined text-[16px] text-primary">security</span>
            <span className="font-mono text-label-sm text-on-surface-variant">SECURE CONNECTION ESTABLISHED</span>
          </div>
        </div>

        <div className="pulse-line absolute bottom-0 left-0 opacity-50" />
      </main>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
