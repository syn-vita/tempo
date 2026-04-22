interface Props {
  switchCount: number;
  onTakeBreak: () => void;
  onDismiss: () => void;
}

export function NudgeOverlay({ switchCount, onTakeBreak, onDismiss }: Props) {
  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem',
      background: '#1a1a2e', color: '#fff', borderRadius: '12px',
      padding: '1.25rem 1.5rem', maxWidth: '320px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 100,
    }}>
      <p style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>
        You've switched away {switchCount} times. Losing focus?
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onTakeBreak} style={{
          background: '#7c3aed', color: '#fff', border: 'none',
          borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer',
        }}>
          Take a break
        </button>
        <button onClick={onDismiss} style={{
          background: 'transparent', color: '#aaa', border: '1px solid #444',
          borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer',
        }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
