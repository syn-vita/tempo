import { useSettingsContext } from '../hooks/useSettingsContext';

function msToMin(ms: number) { return Math.round(ms / 60_000); }
function minToMs(min: number) { return min * 60_000; }

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  hint?: string;
  last?: boolean;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, unit, hint, last, onChange }: SliderRowProps) {
  return (
    <div className={last ? '' : 'mb-7'}>
      <div className="flex justify-between items-baseline mb-2.5">
        <label className="text-[0.875rem] font-medium text-tempo-text">{label}</label>
        <span className="text-[0.875rem] font-bold text-tempo-violet" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value} <span className="text-tempo-faint font-normal text-[0.8rem]">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={`${label}: ${value} ${unit}`}
      />
      {hint && <p className="text-tempo-faint text-xs mt-1.5">{hint}</p>}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-[0.875rem] font-medium text-tempo-text">{label}</p>
        <p className="text-xs text-tempo-faint mt-1">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-6 w-11 rounded-full border transition-colors',
          checked
            ? 'border-tempo-violet/50 bg-tempo-violet/40'
            : 'border-tempo-border/30 bg-tempo-border/10',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { settings, loading, update } = useSettingsContext();
  const pipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-tempo-faint text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-8">

      {/* Header */}
      <div className="mb-7">
        <h2 className="text-[1.375rem] font-bold text-tempo-text mb-1">Settings</h2>
        <p className="text-tempo-faint text-sm">Configure timer and behavior detection</p>
      </div>

      {/* Timer section */}
      <section className="bg-tempo-surface/70 border border-tempo-border/20 rounded-2xl p-6 mb-3">
        <p className="text-[0.7rem] font-semibold text-tempo-muted uppercase tracking-widest mb-6">
          Timer Durations
        </p>
        <SliderRow
          label="Work duration"
          value={msToMin(settings.workDuration)}
          min={10} max={60} unit="min"
          onChange={v => update({ workDuration: minToMs(v) })}
        />
        <SliderRow
          label="Short break"
          value={msToMin(settings.shortBreak)}
          min={1} max={15} unit="min"
          onChange={v => update({ shortBreak: minToMs(v) })}
        />
        <SliderRow
          label="Long break"
          value={msToMin(settings.longBreak)}
          min={10} max={30} unit="min"
          onChange={v => update({ longBreak: minToMs(v) })}
        />
        <SliderRow
          label="Long break every"
          value={settings.longBreakInterval}
          min={2} max={6} unit="sessions"
          onChange={v => update({ longBreakInterval: v })}
          last
        />
      </section>

      {/* Behavior section */}
      <section className="bg-tempo-surface/70 border border-tempo-border/20 rounded-2xl p-6 mb-3">
        <p className="text-[0.7rem] font-semibold text-tempo-muted uppercase tracking-widest mb-6">
          Behavior Detection
        </p>
        <SliderRow
          label="Flow sensitivity"
          value={Math.round(settings.flowThreshold * 10)}
          min={1} max={10} unit="/ 10"
          hint="Higher = more activity needed to enter flow"
          onChange={v => update({ flowThreshold: v / 10 })}
        />
        <SliderRow
          label="Distraction threshold"
          value={settings.distractionThreshold}
          min={1} max={10} unit="switches"
          hint="Tab switches per 60s before alert triggers"
          onChange={v => update({ distractionThreshold: v })}
        />
        <div className="mt-2 border-t border-tempo-border/15 pt-2">
          <ToggleRow
            label="Floating distraction overlay"
            description={
              pipSupported
                ? 'Show a Picture-in-Picture mini window when distraction is detected while Tempo is in the background.'
                : 'Picture-in-Picture overlay is not supported in this browser. Notifications are used as fallback.'
            }
            checked={settings.distractionOverlayEnabled}
            onChange={v => update({ distractionOverlayEnabled: v })}
          />
          <ToggleRow
            label="Ask notification permission on startup"
            description="Prompt for browser notification permission when Tempo loads, so fallback alerts can appear immediately."
            checked={settings.promptNotificationPermissionOnLoad}
            onChange={v => update({ promptNotificationPermissionOnLoad: v })}
          />
        </div>
      </section>

      {/* Theme section */}
      <section className="bg-tempo-surface/70 border border-tempo-border/20 rounded-2xl p-6">
        <p className="text-[0.7rem] font-semibold text-tempo-muted uppercase tracking-widest mb-4">
          Appearance
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update({ theme: t })}
              className={[
                'rounded-xl border px-4 py-3 text-sm font-medium transition-colors capitalize',
                settings.theme === t
                  ? 'bg-tempo-violet/15 border-tempo-violet/35 text-tempo-text'
                  : 'bg-transparent border-tempo-border/20 text-tempo-muted hover:text-tempo-text',
              ].join(' ')}
              aria-pressed={settings.theme === t}
            >
              {t === 'dark' ? 'Dark' : t === 'light' ? 'Light' : 'System'}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
