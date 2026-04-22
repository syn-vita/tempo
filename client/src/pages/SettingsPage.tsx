import { useSettings } from '../hooks/useSettings';

function msToMin(ms: number) { return Math.round(ms / 60_000); }
function minToMs(min: number) { return min * 60_000; }

export function SettingsPage() {
  const { settings, loading, update } = useSettings();

  if (loading) return <p style={{ textAlign: 'center', color: '#94a3b8', paddingTop: '3rem' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h2 style={{ marginBottom: '2rem', color: '#e2e8f0' }}>Settings</h2>

      <SliderRow
        label="Work duration"
        value={msToMin(settings.workDuration)}
        min={10} max={60}
        unit="min"
        onChange={v => update({ workDuration: minToMs(v) })}
      />
      <SliderRow
        label="Short break"
        value={msToMin(settings.shortBreak)}
        min={1} max={15}
        unit="min"
        onChange={v => update({ shortBreak: minToMs(v) })}
      />
      <SliderRow
        label="Long break"
        value={msToMin(settings.longBreak)}
        min={10} max={30}
        unit="min"
        onChange={v => update({ longBreak: minToMs(v) })}
      />
      <SliderRow
        label="Long break every"
        value={settings.longBreakInterval}
        min={2} max={6}
        unit="sessions"
        onChange={v => update({ longBreakInterval: v })}
      />
      <SliderRow
        label="Flow sensitivity"
        value={Math.round(settings.flowThreshold * 10)}
        min={1} max={10}
        unit="/ 10"
        onChange={v => update({ flowThreshold: v / 10 })}
      />
      <SliderRow
        label="Distraction sensitivity"
        value={settings.distractionThreshold}
        min={1} max={10}
        unit="tab switches/min"
        onChange={v => update({ distractionThreshold: v })}
      />
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, unit, onChange }: SliderRowProps) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <label style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{label}</label>
        <span style={{ color: '#7c3aed', fontWeight: 600, fontSize: '0.9rem' }}>
          {value} {unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#7c3aed' }}
      />
    </div>
  );
}
