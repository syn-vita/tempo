let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedAudioContext) return sharedAudioContext;

  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    sharedAudioContext = new Ctor();
  } catch {
    return null;
  }

  return sharedAudioContext;
}

function scheduleTone(context: AudioContext, startAt: number, frequency: number, duration: number, gain: GainNode): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);

  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(1, startAt + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(envelope);
  envelope.connect(gain);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

export function primeTimerEndSound(): void {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') {
    void context.resume().catch(() => {});
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function playTimerEndSound(options: { volume?: number } = {}): void {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === 'suspended') {
    void context.resume().catch(() => {});
  }

  const requestedVolume = options.volume ?? 0.6;
  const normalizedVolume = clamp(requestedVolume, 0, 1);
  if (normalizedVolume <= 0) return;

  const startAt = context.currentTime + 0.01;
  const masterGain = context.createGain();
  masterGain.gain.setValueAtTime(0.08 * normalizedVolume, startAt);
  masterGain.connect(context.destination);

  const notes: Array<{ frequency: number; duration: number }> = [
    { frequency: 880, duration: 0.1 },
    { frequency: 988, duration: 0.1 },
    { frequency: 1318, duration: 0.16 },
  ];

  let cursor = startAt;
  for (const note of notes) {
    scheduleTone(context, cursor, note.frequency, note.duration, masterGain);
    cursor += note.duration + 0.03;
  }
}
