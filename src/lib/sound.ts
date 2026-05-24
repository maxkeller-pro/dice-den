import { useEffect, useState } from "react";

const STORAGE_KEY = "perudo:muted";

let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  _ctx = new AC();
  return _ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setMuted(v: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  window.dispatchEvent(new CustomEvent("perudo:muted-change", { detail: v }));
}

export function useMuted(): [boolean, (v: boolean) => void] {
  const [muted, setM] = useState<boolean>(() => isMuted());
  useEffect(() => {
    const h = (e: Event) => setM((e as CustomEvent).detail as boolean);
    window.addEventListener("perudo:muted-change", h);
    return () => window.removeEventListener("perudo:muted-change", h);
  }, []);
  return [muted, (v: boolean) => setMuted(v)];
}

/** Synthesised dice-clatter using filtered noise + a few short clicks. */
export function playDiceRoll() {
  if (isMuted()) return;
  const ac = ctx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});

  const now = ac.currentTime;
  const duration = 0.55;

  // Noise buffer
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    // bursty envelope: cluster of grains to mimic dice tumbling
    const grain =
      Math.sin(t * Math.PI * 28) * 0.6 +
      Math.sin(t * Math.PI * 11) * 0.4;
    const env = Math.pow(1 - t, 1.4) * (0.55 + 0.45 * Math.abs(grain));
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const src = ac.createBufferSource();
  src.buffer = buf;

  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 600;

  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2200;
  bp.Q.value = 0.9;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  src.connect(hp).connect(bp).connect(gain).connect(ac.destination);
  src.start(now);
  src.stop(now + duration);

  // A couple of sharp "click" transients for the dice hitting each other
  for (let i = 0; i < 3; i++) {
    const t = now + 0.04 + Math.random() * 0.32;
    const osc = ac.createOscillator();
    const og = ac.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1800 + Math.random() * 1400, t);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.18, t + 0.003);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(og).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }
}