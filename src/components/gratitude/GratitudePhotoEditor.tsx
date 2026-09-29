import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Copy,
  Eye,
  FlipHorizontal2,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tone = { brightness: number; contrast: number; saturation: number; warmth: number; fade: number; vignette: number };
type TextColor = "paper" | "ink" | "brass";
type TextStyle = "display" | "clean" | "strong";
type TextAlign = "left" | "center" | "right";
type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: TextColor;
  style: TextStyle;
  align: TextAlign;
  backdrop: boolean;
};
type EditorState = {
  zoom: number;
  x: number;
  y: number;
  quarter: number;
  tilt: number;
  flip: boolean;
  tone: Tone;
  preset: string;
  layers: TextLayer[];
  selectedId: string | null;
};

const NEUTRAL: Tone = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, fade: 0, vignette: 0 };
const INITIAL: EditorState = { zoom: 1, x: 0, y: 0, quarter: 0, tilt: 0, flip: false, tone: NEUTRAL, preset: "original", layers: [], selectedId: null };
const PRESETS = [
  { id: "original", label: "Original", tone: NEUTRAL },
  { id: "candle", label: "Candle", tone: { ...NEUTRAL, warmth: 28, brightness: 5, contrast: 7 } },
  { id: "soft", label: "Soft", tone: { ...NEUTRAL, brightness: 10, contrast: -9, fade: 18 } },
  { id: "clear", label: "Clear", tone: { ...NEUTRAL, contrast: 18, saturation: 12 } },
  { id: "quiet", label: "Quiet", tone: { ...NEUTRAL, saturation: -48, contrast: 8, vignette: 17 } },
  { id: "mono", label: "B&W", tone: { ...NEUTRAL, saturation: -100, contrast: 14 } },
];
const SIZE = 640;
const EXPORT_SIZE = 1080;

export function GratitudePhotoEditor({ file, open, caption, onOpenChange, onDone }: {
  file: File;
  open: boolean;
  caption: string;
  onOpenChange: (open: boolean) => void;
  onDone: (file: File) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [state, setState] = useState<EditorState>(INITIAL);
  const [history, setHistory] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);
  const [tab, setTab] = useState<"frame" | "looks" | "adjust" | "text">("frame");
  const [preview, setPreview] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ kind: "photo" | "text"; startX: number; startY: number; x: number; y: number } | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const gestureStartRef = useRef<EditorState | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const next = new Image();
    next.onload = () => { setImage(next); URL.revokeObjectURL(url); };
    next.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const commit = useCallback((change: (current: EditorState) => EditorState) => {
    setState(current => {
      const next = change(current);
      if (next === current) return current;
      setHistory(items => [...items.slice(-39), current]);
      setFuture([]);
      return next;
    });
  }, []);

  const selected = state.layers.find(layer => layer.id === state.selectedId) ?? null;
  const paint = useCallback((canvas: HTMLCanvasElement, size: number, editor: EditorState, showSelection: boolean) => {
    if (!image) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scaleOut = size / SIZE;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = resolveToken("--ink");
    ctx.fillRect(0, 0, size, size);
    const turned = editor.quarter % 2 === 1;
    const iw = turned ? image.height : image.width;
    const ih = turned ? image.width : image.height;
    const cover = Math.max(size / iw, size / ih);
    const tiltRad = (editor.tilt * Math.PI) / 180;
    const overscan = Math.abs(Math.cos(tiltRad)) + Math.abs(Math.sin(tiltRad));
    const imageScale = cover * editor.zoom * overscan;
    ctx.save();
    ctx.translate(size / 2 + editor.x * size, size / 2 + editor.y * size);
    ctx.rotate(((editor.quarter * 90 + editor.tilt) * Math.PI) / 180);
    ctx.scale(editor.flip ? -imageScale : imageScale, imageScale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
    applyTone(ctx, size, editor.tone);

    for (const layer of editor.layers) {
      const fontSize = layer.size * scaleOut;
      const font = layer.style === "display" ? `600 ${fontSize}px Sora, sans-serif` : layer.style === "strong" ? `700 ${fontSize}px Manrope, sans-serif` : `500 ${fontSize}px Manrope, sans-serif`;
      ctx.font = font;
      ctx.textAlign = layer.align;
      ctx.textBaseline = "middle";
      const maxWidth = size * 0.82;
      const lines = wrapLines(ctx, layer.text, maxWidth);
      const lineHeight = fontSize * 1.16;
      const textWidth = Math.min(maxWidth, Math.max(...lines.map(line => ctx.measureText(line).width), fontSize));
      const blockHeight = lines.length * lineHeight;
      const cx = layer.x * size;
      const cy = layer.y * size;
      const anchorX = layer.align === "left" ? cx - textWidth / 2 : layer.align === "right" ? cx + textWidth / 2 : cx;
      if (layer.backdrop) {
        ctx.save();
        ctx.globalAlpha = 0.68;
        ctx.fillStyle = resolveToken("--ink");
        roundRect(ctx, cx - textWidth / 2 - 14 * scaleOut, cy - blockHeight / 2 - 9 * scaleOut, textWidth + 28 * scaleOut, blockHeight + 18 * scaleOut, 10 * scaleOut);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = resolveToken(`--${layer.color}`);
      ctx.shadowColor = resolveToken("--ink");
      ctx.shadowBlur = layer.backdrop ? 0 : 8 * scaleOut;
      lines.forEach((line, index) => ctx.fillText(line, anchorX, cy - blockHeight / 2 + lineHeight * (index + 0.5), maxWidth));
      ctx.shadowBlur = 0;
      if (showSelection && layer.id === editor.selectedId) {
        ctx.strokeStyle = resolveToken("--brass");
        ctx.lineWidth = 2 * scaleOut;
        ctx.setLineDash([7 * scaleOut, 5 * scaleOut]);
        ctx.strokeRect(cx - textWidth / 2 - 9 * scaleOut, cy - blockHeight / 2 - 7 * scaleOut, textWidth + 18 * scaleOut, blockHeight + 14 * scaleOut);
        ctx.setLineDash([]);
      }
    }
  }, [image]);

  useEffect(() => {
    if (canvasRef.current) paint(canvasRef.current, SIZE, state, !preview);
  }, [paint, preview, state]);

  if (!open) return null;

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * SIZE, y: ((event.clientY - rect.top) / rect.height) * SIZE };
  };
  const beginDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureStartRef.current = state;
    const point = pointerPosition(event);
    const hit = [...state.layers].reverse().find(layer => Math.hypot(point.x - layer.x * SIZE, point.y - layer.y * SIZE) < Math.max(60, layer.size * 2.5));
    if (hit) {
      setState(current => ({ ...current, selectedId: hit.id }));
      dragRef.current = { kind: "text", startX: point.x, startY: point.y, x: hit.x, y: hit.y };
    } else {
      dragRef.current = { kind: "photo", startX: point.x, startY: point.y, x: state.x, y: state.y };
    }
  };
  const moveDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointerPosition(event);
    const dx = (point.x - drag.startX) / SIZE;
    const dy = (point.y - drag.startY) / SIZE;
    setState(current => drag.kind === "photo"
      ? { ...current, x: clamp(drag.x + dx, -0.5, 0.5), y: clamp(drag.y + dy, -0.5, 0.5) }
      : { ...current, layers: current.layers.map(layer => layer.id === current.selectedId ? { ...layer, x: clamp(drag.x + dx, 0.12, 0.88), y: clamp(drag.y + dy, 0.1, 0.9) } : layer) });
  };
  const endDrag = () => {
    if ((dragRef.current || pinchRef.current) && gestureStartRef.current) {
      setHistory(items => [...items.slice(-39), gestureStartRef.current as EditorState]);
      setFuture([]);
    }
    dragRef.current = null;
    gestureStartRef.current = null;
  };
  const onTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.touches.length !== 2) return;
    const distance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
    if (!pinchRef.current) {
      pinchRef.current = { distance, zoom: state.zoom };
      gestureStartRef.current = state;
    }
    else setState(current => ({ ...current, zoom: clamp((pinchRef.current?.zoom ?? 1) * distance / (pinchRef.current?.distance ?? distance), 1, 4) }));
  };
  const addText = () => {
    const text = caption.trim() || "Thankful for…";
    const layer: TextLayer = { id: crypto.randomUUID(), text, x: 0.5, y: 0.5, size: 42, color: "paper", style: "display", align: "center", backdrop: false };
    commit(current => ({ ...current, layers: [...current.layers, layer], selectedId: layer.id }));
    setTab("text");
  };
  const changeSelected = (values: Partial<TextLayer>) => commit(current => ({ ...current, layers: current.layers.map(layer => layer.id === current.selectedId ? { ...layer, ...values } : layer) }));
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture(items => [state, ...items]);
    setState(previous);
    setHistory(items => items.slice(0, -1));
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory(items => [...items, state]);
    setState(next);
    setFuture(items => items.slice(1));
  };
  const save = () => {
    const canvas = document.createElement("canvas");
    paint(canvas, EXPORT_SIZE, state, false);
    canvas.toBlob(blob => {
      if (!blob) return;
      onDone(new File([blob], `witness-gratitude-${Date.now()}.jpg`, { type: "image/jpeg" }));
      onOpenChange(false);
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-ink text-paper" role="dialog" aria-modal="true" aria-label="Edit gratitude photo">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-paper/10 px-3">
        <Button type="button" variant="ghost" size="icon" className="text-paper hover:bg-paper/10 hover:text-paper" onClick={() => onOpenChange(false)} aria-label="Close editor"><X /></Button>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="text-paper/75 hover:bg-paper/10 hover:text-paper" disabled={!history.length} onClick={undo} aria-label="Undo"><Undo2 /></Button>
          <Button type="button" variant="ghost" size="icon" className="text-paper/75 hover:bg-paper/10 hover:text-paper" disabled={!future.length} onClick={redo} aria-label="Redo"><Redo2 /></Button>
          <Button type="button" variant="ghost" size="icon" className="text-paper/75 hover:bg-paper/10 hover:text-paper" onClick={() => setPreview(value => !value)} aria-label={preview ? "Show editing controls" : "Preview finished photo"}><Eye /></Button>
        </div>
        <Button type="button" size="sm" className="rounded-full bg-brass text-ink hover:bg-brass/90" onClick={save}><Check /> Done</Button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center overflow-hidden px-3 py-3">
        <div className="flex min-h-0 w-full shrink items-center justify-center">
          <canvas
            ref={canvasRef}
            className="aspect-square max-h-[42dvh] w-auto max-w-full shrink touch-none select-none rounded-lg bg-ink shadow-lift"
            onPointerDown={preview ? undefined : beginDrag}
            onPointerMove={preview ? undefined : moveDrag}
            onPointerUp={preview ? undefined : endDrag}
            onPointerCancel={preview ? undefined : endDrag}
            onTouchMove={preview ? undefined : onTouchMove}
            onTouchEnd={() => { pinchRef.current = null; endDrag(); }}
            aria-label="Selected photo with text preview"
          />
        </div>
        {!preview && <p className="mt-1.5 shrink-0 text-[11px] text-paper/50">Your text appears on the photo as you type</p>}

        {!preview && (
          <div className="mt-2 flex min-h-0 w-full max-w-xl flex-1 flex-col">
            <div className="grid shrink-0 grid-cols-4 border-b border-paper/10" role="tablist" aria-label="Photo editing tools">
              {(["frame", "looks", "adjust", "text"] as const).map(item => (
                <Button key={item} type="button" variant="ghost" className={`h-10 rounded-none capitalize hover:bg-paper/5 hover:text-paper ${tab === item ? "border-b-2 border-brass text-paper" : "text-paper/55"}`} onClick={() => setTab(item)}>{item}</Button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3">
              {tab === "frame" && <div className="space-y-4"><Range label="Zoom" value={state.zoom} min={1} max={4} step={0.01} onChange={zoom => setState(current => ({ ...current, zoom }))} onStart={() => { gestureStartRef.current = state; }} onCommit={() => saveGestureHistory(gestureStartRef, setHistory, setFuture)} /><Range label="Straighten" value={state.tilt} min={-20} max={20} step={0.5} onChange={tilt => setState(current => ({ ...current, tilt }))} onStart={() => { gestureStartRef.current = state; }} onCommit={() => saveGestureHistory(gestureStartRef, setHistory, setFuture)} /><div className="grid grid-cols-4 gap-2"><Tool label="Rotate left" Icon={RotateCcw} onClick={() => commit(current => ({ ...current, quarter: (current.quarter + 3) % 4 }))} /><Tool label="Rotate right" Icon={RotateCw} onClick={() => commit(current => ({ ...current, quarter: (current.quarter + 1) % 4 }))} /><Tool label="Mirror" Icon={FlipHorizontal2} active={state.flip} onClick={() => commit(current => ({ ...current, flip: !current.flip }))} /><Tool label="Reset" Icon={X} onClick={() => commit(current => ({ ...INITIAL, layers: current.layers, selectedId: current.selectedId }))} /></div></div>}
              {tab === "looks" && <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{PRESETS.map(item => <Button key={item.id} type="button" variant="outline" className={`h-12 border-paper/15 bg-paper/5 text-paper hover:bg-paper/10 hover:text-paper ${state.preset === item.id ? "border-brass bg-brass/15" : ""}`} onClick={() => commit(current => ({ ...current, preset: item.id, tone: item.tone }))}>{item.label}</Button>)}</div>}
              {tab === "adjust" && <div className="grid gap-3 sm:grid-cols-2">{(["brightness", "contrast", "saturation", "warmth", "fade", "vignette"] as const).map(key => <Range key={key} label={key === "saturation" ? "Color" : key === "vignette" ? "Edge shade" : capitalize(key)} value={state.tone[key]} min={key === "fade" || key === "vignette" ? 0 : -100} max={100} step={1} onChange={value => setState(current => ({ ...current, preset: "custom", tone: { ...current.tone, [key]: value } }))} onStart={() => { gestureStartRef.current = state; }} onCommit={() => saveGestureHistory(gestureStartRef, setHistory, setFuture)} />)}</div>}
              {tab === "text" && <div>
                {!selected ? <div className="grid place-items-center gap-3 py-4"><Button type="button" className="rounded-full bg-brass text-ink hover:bg-brass/90" onClick={addText}><Plus /> Add text</Button><p className="text-[11px] text-paper/45">Add another line whenever you need it.</p></div> : <div className="space-y-3">
                  <textarea value={selected.text} maxLength={180} rows={2} onChange={event => changeSelected({ text: event.target.value })} className="w-full resize-none rounded-md border border-paper/15 bg-paper/5 px-3 py-2 text-[14px] text-paper outline-none focus:border-brass" aria-label="Text on photo" />
                  <div className="grid grid-cols-3 gap-2">{(["display", "clean", "strong"] as const).map(style => <Button key={style} type="button" variant="outline" className={`border-paper/15 bg-paper/5 text-paper hover:bg-paper/10 hover:text-paper ${selected.style === style ? "border-brass bg-brass/15" : ""} ${style === "display" ? "font-serif" : style === "strong" ? "font-bold" : ""}`} onClick={() => changeSelected({ style })}>{capitalize(style)}</Button>)}</div>
                  <Range label="Text size" value={selected.size} min={22} max={84} step={1} onChange={size => setState(current => ({ ...current, layers: current.layers.map(layer => layer.id === current.selectedId ? { ...layer, size } : layer) }))} onStart={() => { gestureStartRef.current = state; }} onCommit={() => saveGestureHistory(gestureStartRef, setHistory, setFuture)} />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1">{(["paper", "ink", "brass"] as const).map(color => <Button key={color} type="button" variant="ghost" size="icon" className={`rounded-full border ${selected.color === color ? "border-brass" : "border-paper/15"}`} onClick={() => changeSelected({ color })} aria-label={`${capitalize(color)} text`}><span className={`h-5 w-5 rounded-full ${color === "paper" ? "bg-paper" : color === "ink" ? "bg-ink ring-1 ring-paper/30" : "bg-brass"}`} /></Button>)}</div>
                    <div className="flex gap-1">{([AlignLeft, AlignCenter, AlignRight] as const).map((Icon, index) => { const align = (["left", "center", "right"] as const)[index]; return <Button key={align} type="button" variant="ghost" size="icon" className={selected.align === align ? "bg-paper/10 text-brass" : "text-paper/60"} onClick={() => changeSelected({ align })} aria-label={`${capitalize(align)} align`}><Icon /></Button>; })}</div>
                    <Button type="button" variant="outline" className={`border-paper/15 text-paper hover:bg-paper/10 hover:text-paper ${selected.backdrop ? "border-brass bg-brass/15" : "bg-paper/5"}`} onClick={() => changeSelected({ backdrop: !selected.backdrop })}>Highlight</Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2"><Tool label="Duplicate" Icon={Copy} onClick={() => { const copy = { ...selected, id: crypto.randomUUID(), x: clamp(selected.x + 0.04, 0.12, 0.88), y: clamp(selected.y + 0.06, 0.1, 0.9) }; commit(current => ({ ...current, layers: [...current.layers, copy], selectedId: copy.id })); }} /><Tool label="Add text" Icon={Type} onClick={addText} /><Tool label="Delete" Icon={Trash2} onClick={() => commit(current => ({ ...current, layers: current.layers.filter(layer => layer.id !== current.selectedId), selectedId: null }))} /></div>
                </div>}
              </div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Tool({ label, Icon, onClick, active = false }: { label: string; Icon: typeof Type; onClick: () => void; active?: boolean }) {
  return <Button type="button" variant="outline" className={`h-14 min-w-0 flex-col gap-1 border-paper/15 bg-paper/5 px-1 text-[10px] text-paper hover:bg-paper/10 hover:text-paper ${active ? "border-brass bg-brass/15" : ""}`} onClick={onClick}><Icon />{label}</Button>;
}

function Range({ label, value, min, max, step, onChange, onStart, onCommit }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; onStart: () => void; onCommit: () => void }) {
  return <label className="block text-[11px] text-paper/65"><span className="mb-1 flex justify-between"><span>{label}</span><span>{Number(value).toFixed(step < 1 ? 1 : 0)}</span></span><input type="range" value={value} min={min} max={max} step={step} onChange={event => onChange(Number(event.target.value))} onPointerDown={onStart} onKeyDown={onStart} onPointerUp={onCommit} onKeyUp={onCommit} className="h-1.5 w-full appearance-none rounded-full bg-paper/20 accent-brass" /></label>;
}

function saveGestureHistory(ref: React.MutableRefObject<EditorState | null>, setHistory: React.Dispatch<React.SetStateAction<EditorState[]>>, setFuture: React.Dispatch<React.SetStateAction<EditorState[]>>) {
  const start = ref.current;
  if (!start) return;
  setHistory(items => [...items.slice(-39), start]);
  setFuture([]);
  ref.current = null;
}

function resolveToken(name: string) {
  if (typeof window === "undefined") return "currentColor";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "currentColor";
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(""); continue; }
    let line = words[0];
    for (const word of words.slice(1)) {
      const next = `${line} ${word}`;
      if (ctx.measureText(next).width <= maxWidth) line = next;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines.slice(0, 6);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function applyTone(ctx: CanvasRenderingContext2D, size: number, tone: Tone) {
  const { brightness, contrast, saturation, warmth, fade, vignette } = tone;
  if (brightness || contrast || saturation || warmth || fade) {
    const frame = ctx.getImageData(0, 0, size, size);
    const data = frame.data;
    const bright = (brightness / 100) * 70;
    const contrastScale = 1 + contrast / 100;
    const colorScale = 1 + saturation / 100;
    const warm = (warmth / 100) * 32;
    const fadeScale = fade / 100;
    for (let index = 0; index < data.length; index += 4) {
      let red = data[index] + bright + warm;
      let green = data[index + 1] + bright + warm * 0.25;
      let blue = data[index + 2] + bright - warm;
      red = (red - 128) * contrastScale + 128;
      green = (green - 128) * contrastScale + 128;
      blue = (blue - 128) * contrastScale + 128;
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      red = luminance + (red - luminance) * colorScale;
      green = luminance + (green - luminance) * colorScale;
      blue = luminance + (blue - luminance) * colorScale;
      if (fadeScale) {
        red = red * (1 - fadeScale * 0.55) + 236 * fadeScale * 0.55;
        green = green * (1 - fadeScale * 0.55) + 232 * fadeScale * 0.55;
        blue = blue * (1 - fadeScale * 0.55) + 224 * fadeScale * 0.55;
      }
      data[index] = clamp(red, 0, 255);
      data[index + 1] = clamp(green, 0, 255);
      data[index + 2] = clamp(blue, 0, 255);
    }
    ctx.putImageData(frame, 0, 0);
  }
  if (vignette > 0) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size * 0.72);
    const ink = resolveToken("--ink");
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(1, ink);
    ctx.save();
    ctx.globalAlpha = (vignette / 100) * 0.75;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }