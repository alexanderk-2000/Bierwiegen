"use client";

/**
 * Lightweight WebAudio Sound-Engine ohne externe Dateien.
 * Synthetisiert kurze, charakterstarke Effekte (Klick, Münze, Volltreffer,
 * Boo, Schluck, Glocke, Tap-Hahn). Ist in der Spielseite eingebunden und
 * kann global per `setSoundEnabled` (de)aktiviert werden – persistiert in
 * localStorage.
 */

const STORAGE_KEY = "bw-sound-enabled";

type SoundName =
  | "tap"
  | "click"
  | "coin"
  | "hit"
  | "boo"
  | "swallow"
  | "bell"
  | "pour"
  | "win"
  | "phase"
  | "warn";

let _ctx: AudioContext | null = null;
let _enabled: boolean | null = null;

function isEnabled(): boolean {
  if (_enabled !== null) return _enabled;
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    _enabled = stored === null ? true : stored === "1";
  } catch {
    _enabled = true;
  }
  return _enabled;
}

export function setSoundEnabled(enabled: boolean) {
  _enabled = enabled;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

export function getSoundEnabled() {
  return isEnabled();
}

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  try {
    const w = window as unknown as {
      AudioContext?: new () => AudioContext;
      webkitAudioContext?: new () => AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    _ctx = new Ctor();
  } catch {
    return null;
  }
  return _ctx;
}

function envelope(
  audio: AudioContext,
  gain: GainNode,
  attack: number,
  decay: number,
  peak = 0.3,
  end = 0.0001
) {
  const t = audio.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(end, t + attack + decay);
}

function tone(
  type: OscillatorType,
  freq: number,
  attack: number,
  decay: number,
  peak = 0.25,
  freqEnd?: number,
  delay = 0
) {
  const audio = ctx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime + delay);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(freqEnd, 1),
      audio.currentTime + delay + attack + decay
    );
  }
  osc.connect(gain);
  gain.connect(audio.destination);
  envelope(audio, gain, attack, decay, peak);
  osc.start(audio.currentTime + delay);
  osc.stop(audio.currentTime + delay + attack + decay + 0.05);
}

function noiseBurst(duration: number, peak = 0.25, filterFreq = 1200) {
  const audio = ctx();
  if (!audio) return;
  const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  const gain = audio.createGain();
  envelope(audio, gain, 0.01, duration, peak);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  src.start();
  src.stop(audio.currentTime + duration + 0.05);
}

export function play(name: SoundName) {
  if (!isEnabled()) return;
  const audio = ctx();
  if (!audio) return;
  if (audio.state === "suspended") {
    audio.resume().catch(() => undefined);
  }
  switch (name) {
    case "tap":
      tone("triangle", 740, 0.005, 0.06, 0.18, 420);
      break;
    case "click":
      tone("square", 920, 0.003, 0.04, 0.12, 600);
      break;
    case "coin":
      tone("triangle", 880, 0.005, 0.08, 0.22, 1320);
      tone("triangle", 1320, 0.005, 0.12, 0.18, 1760, 0.06);
      break;
    case "hit":
      // Helle Glocke – Volltreffer
      tone("sine", 660, 0.004, 0.18, 0.3, 990);
      tone("sine", 990, 0.005, 0.32, 0.22, 1320, 0.05);
      tone("triangle", 1760, 0.005, 0.5, 0.14, 1980, 0.1);
      break;
    case "boo":
      // Tiefer Verlust-Sound
      tone("sawtooth", 220, 0.02, 0.5, 0.22, 90);
      tone("sawtooth", 165, 0.02, 0.6, 0.18, 70, 0.08);
      break;
    case "swallow":
      // Schluck (kurzer Filterwobble)
      noiseBurst(0.18, 0.25, 600);
      tone("sine", 240, 0.01, 0.3, 0.18, 110, 0.04);
      break;
    case "bell":
      tone("sine", 880, 0.005, 0.45, 0.25, 760);
      tone("sine", 1320, 0.005, 0.5, 0.18, 1100, 0.04);
      break;
    case "pour":
      noiseBurst(0.5, 0.18, 1800);
      break;
    case "win":
      tone("triangle", 523.25, 0.005, 0.2, 0.28, 523.25);
      tone("triangle", 659.25, 0.005, 0.2, 0.28, 659.25, 0.18);
      tone("triangle", 783.99, 0.005, 0.4, 0.32, 783.99, 0.36);
      tone("triangle", 1046.5, 0.005, 0.6, 0.34, 1046.5, 0.54);
      break;
    case "phase":
      tone("sine", 440, 0.01, 0.16, 0.18, 880);
      break;
    case "warn":
      tone("square", 320, 0.01, 0.18, 0.22, 220);
      tone("square", 220, 0.01, 0.22, 0.22, 160, 0.18);
      break;
  }
}

export function playSequence(names: SoundName[], gapMs = 100) {
  if (!isEnabled()) return;
  names.forEach((name, index) => {
    setTimeout(() => play(name), index * gapMs);
  });
}

export type { SoundName };
