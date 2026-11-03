// The cats' purr, made in the browser (no sound file): a soft, low rumble pulsed about 25 times a second, over two
// breaths (a lighter one in, a fuller one out). Only ever started by a real click on a cat.

export const PURR_SECONDS = 2.2;

/** The purr's samples (mono, peak 0.5). Pure, so the tests can measure it. */
export function purrSamples(rate: number, random: () => number = Math.random): Float32Array {
  const out = new Float32Array(Math.round(rate * PURR_SECONDS));
  let rumble = 0;
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    const exhale = t >= 1.05;
    // each breath swells and fades: in 0.05-0.95 s, out 1.05-2.15 s
    const [from, to, level] = exhale ? [1.05, 2.15, 1] : [0.05, 0.95, 0.6];
    const x = (t - from) / (to - from);
    const breath = x > 0 && x < 1 ? Math.sin(Math.PI * x) ** 0.6 * level : 0;
    // the flutter: ~23 pulses a second breathing in, ~26 out
    phase += (exhale ? 26 : 23) / rate;
    const pulse = Math.max(0, Math.sin(2 * Math.PI * phase)) ** 3;
    rumble = (rumble + 0.02 * (random() * 2 - 1)) / 1.02; // brown noise: low and soft
    out[i] = rumble * pulse * breath;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < out.length; i++) out[i] *= 0.5 / peak;
  return out;
}

let context: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;

/** Plays the purr (from the start again if it's already going). Returns how long it lasts in ms, 0 without sound. */
export function purr(): number {
  if (typeof window === "undefined") return 0;
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return 0;
  try {
    context ??= new Context();
    void context.resume();
    current?.stop();
    const buffer = context.createBuffer(1, Math.round(context.sampleRate * PURR_SECONDS), context.sampleRate);
    buffer.getChannelData(0).set(purrSamples(context.sampleRate));
    const source = context.createBufferSource();
    source.buffer = buffer;
    const soft = context.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = 600;
    const volume = context.createGain();
    volume.gain.value = 0.6;
    source.connect(soft).connect(volume).connect(context.destination);
    source.onended = () => {
      if (current === source) current = null;
    };
    source.start();
    current = source;
    return PURR_SECONDS * 1000;
  } catch {
    return 0;
  }
}
