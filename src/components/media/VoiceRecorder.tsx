import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Upload } from "lucide-react";

export const VOICE_MAX_SECONDS = 30;
const BARS = 36;

export type VoiceTake = { file: File; seconds: number };

function pickMime(): { mime: string; ext: string } {
  const options: Array<[string, string]> = [
    ["audio/webm;codecs=opus", "webm"], ["audio/webm", "webm"], ["audio/mp4", "m4a"], ["audio/ogg;codecs=opus", "ogg"],
  ];
  for (const [mime, ext] of options) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  return { mime: "", ext: "webm" };
}

export function fmtSeconds(s: number) {
  const whole = Math.max(0, Math.floor(s));
  return `0:${String(whole).padStart(2, "0")}`;
}

/**
 * Records a short voice note in the browser: live level bars, a countdown,
 * an automatic stop at `maxSeconds`, and a playback preview before you commit.
 * Falls back to the phone's own recorder when the microphone can't be opened.
 */
export function VoiceRecorder({
  take, onTake, maxSeconds = VOICE_MAX_SECONDS, hint = "About 20 seconds is plenty.", light = false,
}: { take: VoiceTake | null; onTake: (t: VoiceTake | null) => void; maxSeconds?: number; hint?: string; light?: boolean }) {
  const [phase, setPhase] = useState<"idle" | "recording" | "done">(take ? "done" : "idle");
  const [elapsed, setElapsed] = useState(take?.seconds ?? 0);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.08));
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const startedAt = useRef(0);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);

  const fg = light ? "text-ink" : "text-paper";
  const soft = light ? "text-ink/60" : "text-paper/60";
  const shell = light ? "bg-ink/5 border-ink/15" : "bg-paper/5 border-paper/15";

  useEffect(() => () => cleanup(), []);
  useEffect(() => { if (!take && phase === "done") { setPhase("idle"); setElapsed(0); } }, [take, phase]);

  const cleanup = () => {
    cancelAnimationFrame(rafRef.current);
    window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  };

  const start = async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setUnsupported(true); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const { mime, ext } = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        const seconds = Math.min(maxSeconds, Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
        const type = mime || chunks.current[0]?.type || "audio/webm";
        const blob = new Blob(chunks.current, { type });
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type });
        cleanup();
        if (blob.size < 1024) { setError("That recording was empty — try again."); setPhase("idle"); setElapsed(0); return; }
        setPhase("done");
        setElapsed(seconds);
        onTake({ file, seconds });
      };
      recRef.current = rec;

      // Live level meter.
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let frame = 0;
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        if (frame++ % 3 !== 0) return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        setLevels(prev => [...prev.slice(1), Math.min(1, 0.08 + rms * 3.2)]);
      };
      tick();

      startedAt.current = Date.now();
      setElapsed(0);
      setPhase("recording");
      rec.start(250);
      timerRef.current = window.setInterval(() => {
        const s = (Date.now() - startedAt.current) / 1000;
        setElapsed(s);
        if (s >= maxSeconds) stop();
      }, 100);
    } catch {
      cleanup();
      setUnsupported(true);
    }
  };

  const stop = () => {
    window.clearInterval(timerRef.current);
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  };

  const redo = () => { onTake(null); setPhase("idle"); setElapsed(0); setLevels(Array(BARS).fill(0.08)); };

  if (unsupported) {
    return (
      <label className={`block rounded-2xl border ${shell} p-5 text-center cursor-pointer`}>
        <Upload className={`mx-auto mb-2 h-5 w-5 ${fg}`} />
        <p className={`font-serif text-[16px] ${fg}`}>{take ? take.file.name : "Record with your phone's recorder"}</p>
        <p className={`mt-1 text-[11.5px] ${soft}`}>The microphone couldn't be opened here, so use your device's own recorder and pick the file.</p>
        <input type="file" accept="audio/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhase("done"); onTake({ file: f, seconds: 0 }); } }} />
      </label>
    );
  }

  return (
    <div className={`rounded-2xl border ${shell} p-4`}>
      <div className="flex items-end justify-center gap-[3px] h-14" aria-hidden>
        {levels.map((l, i) => (
          <span
            key={i}
            className={`w-[4px] rounded-full transition-[height] duration-100 ${phase === "recording" ? "bg-brass" : light ? "bg-ink/25" : "bg-paper/30"}`}
            style={{ height: `${Math.round(l * 100)}%` }}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className={`text-[12px] tabular-nums ${phase === "recording" ? "text-brass" : soft}`}>
          {phase === "recording" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.62_0.2_25)] animate-pulse mr-1.5 align-middle" />}
          {fmtSeconds(elapsed)} / {fmtSeconds(maxSeconds)}
        </span>
        {phase === "done" && take ? <PreviewPlayer file={take.file} light={light} /> : <span className={`text-[11px] ${soft}`}>{hint}</span>}
      </div>

      <div className="mt-4 flex items-center justify-center gap-6">
        {phase === "done" ? (
          <button type="button" onClick={redo} className={`h-10 px-4 rounded-full border ${shell} ${fg} text-[12px] inline-flex items-center gap-1.5`}>
            <RotateCcw className="h-3.5 w-3.5" /> Record again
          </button>
        ) : phase === "recording" ? (
          <button type="button" onClick={stop} aria-label="Stop recording" className="h-16 w-16 rounded-full bg-paper grid place-items-center shadow-lift ring-4 ring-brass/40 active:scale-95 transition-transform">
            <Square className="h-6 w-6 text-[oklch(0.55_0.2_25)] fill-current" />
          </button>
        ) : (
          <button type="button" onClick={() => void start()} aria-label="Start recording" className="h-16 w-16 rounded-full bg-paper grid place-items-center shadow-lift ring-4 ring-paper/20 active:scale-95 transition-transform">
            <Mic className="h-6 w-6 text-ink" />
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-center text-[11.5px] text-[oklch(0.62_0.18_25)]">{error}</p>}
      {phase === "idle" && !error && <p className={`mt-3 text-center text-[11px] ${soft}`}>Tap to speak. Stops on its own at {maxSeconds}s.</p>}
    </div>
  );
}

function PreviewPlayer({ file, light }: { file: File; light: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) { void a.play(); } else { a.pause(); }
  };
  return (
    <span className="inline-flex items-center gap-2">
      {url && <audio ref={ref} src={url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />}
      <button type="button" onClick={toggle} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] ${light ? "bg-ink text-paper" : "bg-paper text-ink"}`}>
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />} {playing ? "Pause" : "Listen back"}
      </button>
    </span>
  );
}
