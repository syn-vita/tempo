interface WelcomeModalProps {
  onShowMeAround: () => void;
  onSkip: () => void;
}

export function WelcomeModal({ onShowMeAround, onSkip }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        className="relative w-full max-w-xl rounded-2xl border border-tempo-border/30 bg-tempo-bg/95 p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-tempo-violet/20 blur-3xl" />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.18em] text-tempo-muted">Welcome to Tempo</p>
          <h2 id="welcome-modal-title" className="mt-2 text-2xl font-bold text-tempo-text sm:text-3xl">
            Focus with smarter timing
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-tempo-muted sm:text-base">
            Tempo watches your flow and distraction signals to gently adapt breaks so your focus rhythm
            stays intact.
          </p>

          <div className="mt-6 grid gap-2 rounded-xl border border-tempo-border/25 bg-tempo-surface/70 p-4 text-sm text-tempo-muted">
            <p>1. Start a focus session and work as usual.</p>
            <p>2. Tempo detects flow and distraction patterns in-browser.</p>
            <p>3. You get timely nudges without losing control.</p>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onSkip}
              className="rounded-xl border border-tempo-border/30 px-4 py-2.5 text-sm font-medium text-tempo-muted hover:text-tempo-text"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={onShowMeAround}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,58,237,0.4)]"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' }}
            >
              Show me around
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
