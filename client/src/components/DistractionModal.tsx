interface Props {
  switchCount: number;
  onTakeBreak: () => void;
  onKeepFocusing: () => void;
}

export function DistractionModal({ switchCount, onTakeBreak, onKeepFocusing }: Props) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-6"
      style={{ background: 'rgba(2,6,23,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Distraction check"
        className="w-full max-w-md rounded-3xl border border-tempo-border/25 bg-tempo-surface px-6 py-7 shadow-[0_18px_60px_rgba(2,6,23,0.45)]"
      >
        <div className="mb-5 flex items-start gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(245,158,11,0.14)' }}
            aria-hidden="true"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-tempo-text">Need a quick reset?</h2>
            <p className="mt-1 text-sm leading-snug text-tempo-muted">
              We noticed {switchCount} recent tab switches. Taking a short break can help recover focus.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onTakeBreak}
            aria-label="Take a break now"
            className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
            }}
          >
            Take break
          </button>
          <button
            onClick={onKeepFocusing}
            aria-label="Keep focusing"
            className="flex-1 rounded-2xl border border-tempo-border/30 bg-transparent py-3 text-sm font-medium text-tempo-muted transition-colors hover:text-tempo-text"
          >
            Keep focusing
          </button>
        </div>
      </div>
    </div>
  );
}
