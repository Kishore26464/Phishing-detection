export function LoadingScreen() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-void">
      <div className="h-8 w-full max-w-[220px]">
        <div className="relative h-px w-full overflow-hidden bg-outline-variant">
          <div className="pulse-line absolute inset-0" />
        </div>
      </div>
      <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Establishing signal…</p>
    </div>
  );
}
