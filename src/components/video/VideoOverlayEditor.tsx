import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Eye, Pause, Play, Plus, Redo2, RotateCcw, Trash2, Undo2, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { OverlayLayers } from "./OverlayLayers";
import { EMPTY_OVERLAY, newLayer, type OverlayColor, type OverlayLayer, type OverlayStyle, type VideoOverlay } from "@/lib/overlay";

const STYLES: Array<{ id: OverlayStyle; label: string }> = [
  { id: "display", label: "Display" }, { id: "clean", label: "Clean" }, { id: "strong", label: "Strong" },
];
const COLORS: OverlayColor[] = ["paper", "ink", "brass", "flame", "hope"];
const COLOR_VAR: Record<OverlayColor, string> = { paper: "var(--paper)", ink: "var(--ink)", brass: "var(--brass-light)", flame: "var(--flame)", hope: "var(--hope)" };

export interface StickerOption { label: string; text: string }

/** Full-screen editor: the video keeps playing while words are placed over it. */
export function VideoOverlayEditor({
  file, initial, stickers = [], onDone, onCancel,
}: {
  file: File;
  initial: VideoOverlay | null;
  stickers?: StickerOption[];
  onDone: (overlay: VideoOverlay | null) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [preview, setPreview] = useState(false);

  const [history, setHistory] = useState<VideoOverlay[]>([initial ?? EMPTY_OVERLAY]);
  const [index, setIndex] = useState(0);
  const overlay = history[index];
  const [selectedId, setSelectedId] = useState<string | null>(initial?.layers[0]?.id ?? null);
  const selected = overlay.layers.find(l => l.id === selectedId) ?? null;

  const commit = (next: VideoOverlay) => {
    setHistory(h => [...h.slice(Math.max(0, index - 38), index + 1), next]);
    setIndex(i => Math.min(i + 1, 39));
  };
  /** Live edits (typing, dragging) replace the current step instead of piling up history. */
  const replace = (next: VideoOverlay) => setHistory(h => h.map((o, i) => (i === index ? next : o)));
  const patch = (id: string, p: Partial<OverlayLayer>, live = false) => {
    const next = { ...overlay, layers: overlay.layers.map(l => (l.id === id ? { ...l, ...p } : l)) };
    live ? replace(next) : commit(next);
  };
  const add = (p: Partial<OverlayLayer> = {}) => {
    const l = newLayer({ y: 0.3 + (overlay.layers.length % 4) * 0.14, start: 0, ...p });
    commit({ ...overlay, layers: [...overlay.layers, l] });
    setSelectedId(l.id);
  };
  const remove = (id: string) => {
    commit({ ...overlay, layers: overlay.layers.filter(l => l.id !== id) });
    setSelectedId(null);
  };

  // Drag and two-finger pinch on the frame.
  const drag = useRef<{ id: string; pointers: Map<number, { x: number; y: number }>; startDist: number; startScale: number; moved: boolean } | null>(null);
  const onDragStart = (id: string, e: ReactPointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const layer = overlay.layers.find(l => l.id === id);
    const cur = drag.current?.id === id ? drag.current : { id, pointers: new Map(), startDist: 0, startScale: layer?.scale ?? 1, moved: false };
    cur.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (cur.pointers.size === 2) {
      const [a, b] = [...cur.pointers.values()];
      cur.startDist = Math.hypot(a.x - b.x, a.y - b.y);
      cur.startScale = layer?.scale ?? 1;
    }
    drag.current = cur;
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current; const box = frameRef.current?.getBoundingClientRect();
      if (!d || !box || !d.pointers.has(e.pointerId)) return;
      d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      d.moved = true;
      if (d.pointers.size >= 2) {
        const [a, b] = [...d.pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (d.startDist) patch(d.id, { scale: clamp(d.startScale * (dist / d.startDist), 0.5, 2.6) }, true);
        return;
      }
      patch(d.id, { x: clamp((e.clientX - box.left) / box.width, 0.08, 0.92), y: clamp((e.clientY - box.top) / box.height, 0.06, 0.94) }, true);
    };
    const up = (e: PointerEvent) => {
      const d = drag.current; if (!d) return;
      d.pointers.delete(e.pointerId);
      if (d.pointers.size === 0) {
        if (d.moved) commit(overlay);
        drag.current = null;
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  });

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { void v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  const finish = () => {
    const layers = overlay.layers.filter(l => l.text.trim());
    onDone(layers.length ? { v: 1, layers } : null);
  };

  const end = duration || 90;

  return (
    <div role="dialog" aria-modal="true" aria-label="Add words to your video" className="fixed inset-0 z-[80] flex flex-col bg-ink text-paper">
      <header className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onCancel} aria-label="Cancel" className="p-1 text-paper/80"><X className="h-5 w-5" /></button>
        <div className="flex items-center gap-1">
          <button onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0} aria-label="Undo" className="p-2 text-paper/80 disabled:opacity-30"><Undo2 className="h-4 w-4" /></button>
          <button onClick={() => setIndex(i => Math.min(history.length - 1, i + 1))} disabled={index >= history.length - 1} aria-label="Redo" className="p-2 text-paper/80 disabled:opacity-30"><Redo2 className="h-4 w-4" /></button>
          <button onClick={() => { commit(EMPTY_OVERLAY); setSelectedId(null); }} aria-label="Start over" className="p-2 text-paper/80"><RotateCcw className="h-4 w-4" /></button>
          <button onClick={() => setPreview(p => !p)} aria-pressed={preview} aria-label="Preview" className={`p-2 ${preview ? "text-brass-light" : "text-paper/80"}`}><Eye className="h-4 w-4" /></button>
        </div>
        <button onClick={finish} className="inline-flex items-center gap-1 rounded-full bg-brass px-3 py-1.5 text-[13px] font-medium text-ink"><Check className="h-4 w-4" /> Done</button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 justify-center px-4">
          <div ref={frameRef} className="relative aspect-[9/14] max-h-[46dvh] w-auto overflow-hidden rounded-2xl bg-ink shadow-lift" style={{ height: "46dvh" }}>
            {url && (
              <video
                ref={videoRef} src={url} autoPlay loop playsInline muted={!preview}
                onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
                onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)}
                onClick={togglePlay}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <OverlayLayers overlay={overlay} time={time} duration={duration} editing={!preview} selectedId={selectedId} onSelect={setSelectedId} onDragStart={onDragStart} />
            <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="absolute bottom-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-ink/60 text-paper">
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <span className="absolute bottom-3 right-3 rounded bg-ink/60 px-1.5 py-0.5 text-[10px] tabular-nums text-paper/80">{fmt(time)} / {fmt(end)}</span>
          </div>
        </div>
        <p className="mt-2 shrink-0 text-center text-[11px] text-paper/55">{preview ? "This is how others will see it. The sound stays yours — no music added." : "Drag words to move them. Pinch to resize."}</p>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => add()} className="inline-flex items-center gap-1.5 rounded-full border border-paper/20 bg-paper/10 px-3 py-1.5 text-[12px]"><Plus className="h-3.5 w-3.5" /> Add text</button>
            {stickers.map(s => (
              <button key={s.label} onClick={() => add({ kind: "sticker", text: s.text, style: "clean", y: 0.1, scale: 1 })} className="rounded-full border border-brass/40 bg-brass/10 px-3 py-1.5 text-[12px] text-brass-light">{s.label}</button>
            ))}
          </div>

          {overlay.layers.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {overlay.layers.map((l, i) => (
                <button key={l.id} onClick={() => setSelectedId(l.id)} aria-pressed={selectedId === l.id} className={`max-w-[140px] shrink-0 truncate rounded-lg border px-2.5 py-1 text-[11px] ${selectedId === l.id ? "border-brass/60 bg-brass/20" : "border-paper/15 bg-paper/5 text-paper/70"}`}>
                  {l.text.trim() || `Text ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {selected ? (
            <div className="mt-4 space-y-4">
              <textarea
                autoFocus={selected.kind === "text" && !selected.text}
                value={selected.text}
                onChange={e => patch(selected.id, { text: e.target.value.slice(0, 160) }, true)}
                onBlur={() => commit(overlay)}
                rows={2}
                aria-label="Words on the video"
                placeholder="Type — your words appear on the video as you go"
                className="w-full resize-none rounded-xl border border-paper/15 bg-paper/5 px-3 py-2.5 text-[14px] text-paper placeholder:text-paper/35 focus:border-brass/60 focus:outline-none"
              />
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => patch(selected.id, { style: s.id })} aria-pressed={selected.style === s.id} className={`rounded-xl border py-2 text-[12px] ${selected.style === s.id ? "border-brass/60 bg-brass/20" : "border-paper/15 bg-paper/5 text-paper/70"}`}>{s.label}</button>
                ))}
              </div>
              <div className="flex items-center gap-2.5">
                {COLORS.map(c => (
                  <button key={c} onClick={() => patch(selected.id, { color: c })} aria-label={`Color ${c}`} aria-pressed={selected.color === c} className={`h-7 w-7 rounded-full border-2 ${selected.color === c ? "border-paper" : "border-paper/25"}`} style={{ background: COLOR_VAR[c] }} />
                ))}
                <button onClick={() => patch(selected.id, { highlight: !selected.highlight })} aria-pressed={selected.highlight} className={`ml-auto rounded-full border px-3 py-1 text-[12px] ${selected.highlight ? "border-brass/60 bg-brass/20" : "border-paper/15 text-paper/70"}`}>Highlight</button>
              </div>

              <Field label={`Size · ${Math.round(selected.scale * 100)}%`}>
                <Slider min={50} max={260} step={5} value={[selected.scale * 100]} onValueChange={([v]) => patch(selected.id, { scale: v / 100 }, true)} onValueCommit={() => commit(overlay)} />
              </Field>
              <Field label={`Tilt · ${selected.rotation}°`}>
                <Slider min={-30} max={30} step={1} value={[selected.rotation]} onValueChange={([v]) => patch(selected.id, { rotation: v }, true)} onValueCommit={() => commit(overlay)} />
              </Field>
              <Field label={`Shows ${fmt(selected.start)} – ${selected.end === null ? "end" : fmt(selected.end)}`}>
                <Slider
                  min={0} max={Math.max(1, Math.ceil(end))} step={0.5}
                  value={[selected.start, selected.end ?? Math.ceil(end)]}
                  onValueChange={([s, e]) => patch(selected.id, { start: s, end: e >= Math.ceil(end) ? null : e }, true)}
                  onValueCommit={() => commit(overlay)}
                  aria-label="When the words show"
                />
              </Field>
              <button onClick={() => patch(selected.id, { breathe: !selected.breathe })} aria-pressed={selected.breathe} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${selected.breathe ? "border-brass/60 bg-brass/15" : "border-paper/15 bg-paper/5"}`}>
                <span>
                  <span className="block text-[13px]">Let it breathe</span>
                  <span className="block text-[11px] text-paper/55">Each line fades in as the video plays. Use Enter for new lines.</span>
                </span>
                <span className={`relative h-5 w-9 rounded-full ${selected.breathe ? "bg-brass" : "bg-paper/20"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper transition-all ${selected.breathe ? "left-4" : "left-0.5"}`} /></span>
              </button>
              <button onClick={() => remove(selected.id)} className="inline-flex items-center gap-1.5 text-[12px] text-paper/60"><Trash2 className="h-3.5 w-3.5" /> Remove this text</button>
            </div>
          ) : (
            <p className="mt-6 text-center text-[13px] text-paper/55">Add a line of text, or tap words on the video to edit them.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-paper/55">{label}</p>{children}</div>;
}
function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)); }
function fmt(s: number) { const t = Math.max(0, Math.round(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; }
