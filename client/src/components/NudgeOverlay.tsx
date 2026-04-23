interface Props {
  switchCount: number;
  onTakeBreak: () => void;
  onDismiss: () => void;
}

export function NudgeOverlay({ switchCount, onTakeBreak, onDismiss }: Props) {
  return (
    <div
      role="alertdialog"
      aria-label="Focus nudge"
      className="fixed bottom-6 right-6 max-w-[300px] rounded-2xl p-5 z-[100]"
      style={{
        background: 'rgb(var(--tempo-elevated) / 0.96)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(245,158,11,0.22)',
        boxShadow: '0 8px 40px rgba(15,23,42,0.25)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Warning icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.12)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-tempo-text mb-0.5">Losing focus?</p>
          <p className="text-xs text-tempo-muted leading-snug">
            You've switched away {switchCount} {switchCount === 1 ? 'time' : 'times'}.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onTakeBreak}
          aria-label="Take a break now"
          className="flex-1 text-[0.8rem] font-semibold rounded-xl py-2 px-3 transition-opacity hover:opacity-90"
          style={{
            background: 'rgba(59,130,246,0.14)',
            color: '#60A5FA',
            border: '1px solid rgba(59,130,246,0.28)',
          }}
        >
          Take a break
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss nudge"
          className="text-[0.8rem] text-tempo-faint rounded-xl py-2 px-3 bg-transparent border border-tempo-border/20 hover:text-tempo-muted transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
