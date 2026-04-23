interface TempoGuideModalProps {
  onClose: () => void;
}

const GUIDE_SECTIONS = [
  {
    title: 'Focus session flow',
    body: 'Start a session, stay in the Timer view, and Tempo tracks your active focus window until break time.',
  },
  {
    title: 'Flow and distraction signals',
    body: 'Tempo reads activity rate, tab focus, and tab switches to estimate whether you are in flow or getting pulled away.',
  },
  {
    title: 'How to use nudges',
    body: 'When distractions pile up, Tempo shows a nudge. You can dismiss it or take an early break when needed.',
  },
];

export function TempoGuideModal({ onClose }: TempoGuideModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tempo-guide-title"
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-tempo-border/30 bg-tempo-bg/95 shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-tempo-violet/80 via-blue-500/80 to-cyan-400/70" />

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-tempo-muted">Tempo guide</p>
              <h2 id="tempo-guide-title" className="mt-2 text-2xl font-bold text-tempo-text sm:text-3xl">
                What Tempo does for your focus
              </h2>
              <p className="mt-2 text-sm text-tempo-muted sm:text-base">
                A quick walkthrough so you can start confidently and interpret what the app is telling you.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close guide"
              className="rounded-lg border border-tempo-border/30 px-3 py-1.5 text-sm text-tempo-muted hover:text-tempo-text"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            {GUIDE_SECTIONS.map((section) => (
              <article
                key={section.title}
                className="rounded-xl border border-tempo-border/25 bg-tempo-surface/70 p-4 sm:p-5"
              >
                <h3 className="text-base font-semibold text-tempo-text">{section.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-tempo-muted">{section.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)]"
              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
