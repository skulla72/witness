import { useCallback, useEffect, useRef, useState } from "react";

export type AmbientKind = "off" | "piano" | "rain" | "fire";
const KEY = "witness.ambient.v1";
const LEVEL = 0.16;
const DUCKED = 0.025;

/**
 * Soft, optional prayer-room sound, made on the device (no music files, no licensing).
 * Starts only on tap, fades in/out, and ducks whenever any video or voice plays.
 */
export function useAmbientSound() {
  const [kind, setKindState] = useState<AmbientKind>("off");
  const [saved, setSaved] = useState<AmbientKind>("piano");
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const playingMedia = useRef(new Set<EventTarget>());

  useEffect(() => {
    try { const v = localStorage.getItem(KEY) as AmbientKind | null; if (v && v !== "off") setSaved(v); } catch { /* ignore */ }
  }, []);

  const target = () => (playingMedia.current.size ? DUCKED : LEVEL);

  // Duck for any <video>/<audio> on the page.
  useEffect(() => {
    const on = (e: Event) => { playingMedia.current.add(e.target!); ramp(); };
    const off = (e: Event) => { playingMedia.current.delete(e.target!); ramp(); };
    const ramp = () => {
      const ctx = ctxRef.current, g = masterRef.current;
      if (!ctx || !g || !stopRef.current) return;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setTargetAtTime(target(), ctx.currentTime, 0.35);
    };
    document.addEventListener("play", on, true);
    document.addEventListener("pause", off, true);
    document.addEventListener("ended", off, true);
    return () => {
      document.removeEventListener("play", on, true);
      document.removeEventListener("pause", off, true);
      document.removeEventListener("ended", off, true);
    };
  }, []);

  const stop = useCallback(() => {
    const ctx = ctxRef.current, g = masterRef.current, s = stopRef.current;
    stopRef.current = null;
    if (!ctx || !g || !s) return;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    setTimeout(s, 1800);
  }, []);

  const start = useCallback((k: Exclude<AmbientKind, "off">) => {
    stop();
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    void ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    masterRef.current = master;
    stopRef.current = k === "piano" ? pianoPad(ctx, master) : k === "rain" ? rain(ctx, master) : fire(ctx, master);
    master.gain.setTargetAtTime(target(), ctx.currentTime, 1.2);
  }, [stop]);

  const setKind = useCallback((k: AmbientKind) => {
    setKindState(k);
    if (k === "off") stop();
    else { start(k); setSaved(k); try { localStorage.setItem(KEY, k); } catch { /* ignore */ } }
  }, [start, stop]);

  useEffect(() => () => { stopRef.current?.(); void ctxRef.current?.close(); }, []);

  return { kind, saved, setKind };
}

function noiseBuffer(ctx: AudioContext, brown = false) {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c); let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
  }
  return buf;
}

function loopNoise(ctx: AudioContext, brown: boolean) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, brown); src.loop = true; src.start();
  return src;
}

/** Slow, warm chords that swell and fade — no melody, nothing to follow. */
function pianoPad(ctx: AudioContext, out: GainNode) {
  const chords = [[220, 277.18, 329.63, 440], [196, 246.94, 293.66, 392], [174.61, 220, 261.63, 349.23], [196, 246.94, 329.63, 392]];
  const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 1400; filter.connect(out);
  let i = 0; let alive = true;
  const play = () => {
    if (!alive) return;
    const t = ctx.currentTime;
    chords[i++ % chords.length].forEach((f, n) => {
      [1, 2].forEach(h => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = h === 1 ? "sine" : "triangle"; o.frequency.value = f * h; o.detune.value = (n - 1.5) * 3;
        g.gain.setValueAtTime(0, t + n * 0.18);
        g.gain.linearRampToValueAtTime(h === 1 ? 0.22 : 0.05, t + n * 0.18 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 7.5);
        o.connect(g).connect(filter); o.start(t + n * 0.18); o.stop(t + 8);
      });
    });
  };
  play();
  const id = setInterval(play, 6000);
  return () => { alive = false; clearInterval(id); filter.disconnect(); out.disconnect(); };
}

function rain(ctx: AudioContext, out: GainNode) {
  const src = loopNoise(ctx, false);
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 500;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 5200;
  const g = ctx.createGain(); g.gain.value = 0.55;
  src.connect(hp).connect(lp).connect(g).connect(out);
  const lfo = ctx.createOscillator(); const lg = ctx.createGain();
  lfo.frequency.value = 0.07; lg.gain.value = 0.12; lfo.connect(lg).connect(g.gain); lfo.start();
  return () => { src.stop(); lfo.stop(); out.disconnect(); };
}

function fire(ctx: AudioContext, out: GainNode) {
  const src = loopNoise(ctx, true);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
  const g = ctx.createGain(); g.gain.value = 0.9;
  src.connect(lp).connect(g).connect(out);
  let alive = true;
  const crackBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
  crackBuf.getChannelData(0).forEach((_, i, d) => { d[i] = Math.random() * 2 - 1; });
  const crackle = () => {
    if (!alive) return;
    const t = ctx.currentTime;
    const o = ctx.createBufferSource(); o.buffer = crackBuf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800 + Math.random() * 2500; bp.Q.value = 3;
    const cg = ctx.createGain(); cg.gain.setValueAtTime(0.35 * Math.random() + 0.1, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(bp).connect(cg).connect(out); o.start(t); o.stop(t + 0.06);
    setTimeout(crackle, 80 + Math.random() * 700);
  };
  crackle();
  return () => { alive = false; src.stop(); out.disconnect(); };
}
