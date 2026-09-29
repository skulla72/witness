import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw, FlipHorizontal2, Check, X, Loader2 } from "lucide-react";

/**
 * A profile-picture editor with more room to fiddle than Instagram gives you:
 * drag to reposition, pinch or slide to zoom, quarter turns, straightening,
 * a mirror, presets, and tone sliders. Exports one square JPEG.
 */

type Tone = {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  warmth: number; // -100..100
  fade: number; // 0..100
  vignette: number; // 0..100
};

const NEUTRAL: Tone = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, fade: 0, vignette: 0 };

const PRESETS: { id: string; label: string; tone: Tone }[] = [
  { id: "none", label: "Original", tone: NEUTRAL },
  { id: "warm", label: "Candle", tone: { ...NEUTRAL, warmth: 28, brightness: 6, contrast: 6 } },
  { id: "soft", label: "Soft light", tone: { ...NEUTRAL, brightness: 10, contrast: -8, fade: 22 } },
  { id: "clear", label: "Clear", tone: { ...NEUTRAL, contrast: 18, saturation: 12 } },
  { id: "quiet", label: "Quiet", tone: { ...NEUTRAL, saturation: -55, contrast: 10, vignette: 18 } },
  { id: "mono", label: "Black & white", tone: { ...NEUTRAL, saturation: -100, contrast: 14 } },
];

const OUT = 1024;
const VIEW = 288;

export function PhotoStudio({
  file,
  onCancel,
  onDone,
  busy = false,
}: {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
  busy?: boolean;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [quarter, setQuarter] = useState(0); // 0..3
  const [tilt, setTilt] = useState(0); // -20..20 degrees
  const [flip, setFlip] = useState(false);
  const [tone, setTone] = useState<Tone>(NEUTRAL);
  const [preset, setPreset] = useState("none");
  const [tab, setTab] = useState<"crop" | "filters" | "tone">("crop");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (alive) setImage(img);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    return () => {
      alive = false;
    };
  }, [file]);

  /** Paint the square crop at any size — the preview and the export share this. */
  const paint = useCallback(
    (canvas: HTMLCanvasElement, size: number) => {
      if (!image) return;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = "#0f1729";
      ctx.fillRect(0, 0, size, size);

      const turned = quarter % 2 === 1;
      const w = turned ? image.height : image.width;
      const h = turned ? image.width : image.height;
      // Cover the square, then honour the zoom and any tilt overscan.
      const cover = Math.max(size / w, size / h);
      const radians = ((quarter * 90 + tilt) * Math.PI) / 180;
      const overscan = Math.abs(Math.cos((tilt * Math.PI) / 180)) + Math.abs(Math.sin((tilt * Math.PI) / 180));
      const scale = cover * zoom * overscan;

      ctx.save();
      ctx.translate(size / 2 + offset.x * size, size / 2 + offset.y * size);
      ctx.rotate(radians);
      ctx.scale(flip ? -scale : scale, scale);
      ctx.drawImage(image, -image.width / 2, -image.height / 2, image.width, image.height);
      ctx.restore();

      applyTone(ctx, size, tone);

      if (tone.vignette > 0) {
        const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.72);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, `rgba(0,0,0,${(tone.vignette / 100) * 0.75})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      }
    },
    [image, zoom, offset, quarter, tilt, flip, tone],
  );

  useEffect(() => {
    if (canvasRef.current) paint(canvasRef.current, VIEW * 2);
  }, [paint]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({
      x: clamp(d.ox + (e.clientX - d.x) / VIEW, -0.5, 0.5),
      y: clamp(d.oy + (e.clientY - d.y) / VIEW, -0.5, 0.5),
    });
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
    if (!pinchRef.current) {
      pinchRef.current = { dist, zoom };
      return;
    }
    setZoom(clamp((pinchRef.current.zoom * dist) / pinchRef.current.dist, 1, 4));
  };

  const applyPreset = (id: string) => {
    setPreset(id);
    const found = PRESETS.find(p => p.id === id);
    if (found) setTone(found.tone);
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setQuarter(0);
    setTilt(0);
    setFlip(false);
    setTone(NEUTRAL);
    setPreset("none");
  };

  const save = () => {
    const out = document.createElement("canvas");
    paint(out, OUT);
    out.toBlob(blob => blob && onDone(blob), "image/jpeg", 0.92);
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-ink/95 backdrop-blur-sm">
      <header className="flex items-center justify-between px-4 py-3">
        <button onClick={onCancel} aria-label="Cancel" className="text-paper/70 hover:text-paper">
          <X className="h-5 w-5" />
        </button>
        <p className="text-[11px] uppercase tracking-[0.2em] text-paper/70">Adjust your picture</p>
        <button
          onClick={save}
          disabled={!image || busy}
          className="flex items-center gap-1.5 rounded-full bg-brass px-3.5 py-1.5 text-[12.5px] text-ink disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 pb-6">
        <div
          className="relative touch-none select-none"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onTouchMove={onTouchMove}
          onTouchEnd={() => (pinchRef.current = null)}
        >
          <canvas
            ref={canvasRef}
            style={{ width: VIEW, height: VIEW }}
            className="rounded-2xl"
            aria-label="Profile picture preview"
          />
          {/* The circle people will actually see, with the square kept visible around it. */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-paper/20" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div
              className="rounded-full border border-paper/60"
              style={{ width: VIEW - 8, height: VIEW - 8, boxShadow: "0 0 0 9999px rgba(15,23,41,0.55)" }}
            />
          </div>
        </div>
        <p className="mt-2 text-[11px] text-paper/50">Drag to move · pinch or slide to zoom</p>

        <div className="mt-4 flex w-full max-w-sm gap-1.5 rounded-full bg-paper/10 p-1">
          {(["crop", "filters", "tone"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-1.5 text-[12px] capitalize ${
                tab === t ? "bg-paper text-ink" : "text-paper/70"
              }`}
            >
              {t === "crop" ? "Frame" : t === "filters" ? "Looks" : "Adjust"}
            </button>
          ))}
        </div>

        <div className="mt-4 w-full max-w-sm">
          {tab === "crop" && (
            <div className="space-y-4">
              <Range label="Zoom" value={zoom} min={1} max={4} step={0.01} onChange={setZoom} format={v => `${v.toFixed(2)}×`} />
              <Range label="Straighten" value={tilt} min={-20} max={20} step={0.5} onChange={setTilt} format={v => `${v.toFixed(1)}°`} />
              <div className="flex gap-2">
                <IconAction label="Rotate left" onClick={() => setQuarter((quarter + 3) % 4)} Icon={RotateCcw} />
                <IconAction label="Rotate right" onClick={() => setQuarter((quarter + 1) % 4)} Icon={RotateCw} />
                <IconAction label="Mirror" onClick={() => setFlip(!flip)} Icon={FlipHorizontal2} active={flip} />
              </div>
            </div>
          )}

          {tab === "filters" && (
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`rounded-xl border px-2 py-2.5 text-[12px] ${
                    preset === p.id ? "border-brass bg-brass/15 text-paper" : "border-paper/15 text-paper/75"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {tab === "tone" && (
            <div className="space-y-3.5">
              <Range label="Brightness" value={tone.brightness} min={-100} max={100} step={1} onChange={v => setTone({ ...tone, brightness: v })} />
              <Range label="Contrast" value={tone.contrast} min={-100} max={100} step={1} onChange={v => setTone({ ...tone, contrast: v })} />
              <Range label="Colour" value={tone.saturation} min={-100} max={100} step={1} onChange={v => setTone({ ...tone, saturation: v })} />
              <Range label="Warmth" value={tone.warmth} min={-100} max={100} step={1} onChange={v => setTone({ ...tone, warmth: v })} />
              <Range label="Fade" value={tone.fade} min={0} max={100} step={1} onChange={v => setTone({ ...tone, fade: v })} />
              <Range label="Edge shade" value={tone.vignette} min={0} max={100} step={1} onChange={v => setTone({ ...tone, vignette: v })} />
            </div>
          )}
        </div>

        <button onClick={reset} className="mt-5 text-[11.5px] text-paper/60 underline-offset-2 hover:underline">
          Start over
        </button>
      </div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  Icon,
  active = false,
}: {
  label: string;
  onClick: () => void;
  Icon: typeof RotateCw;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-[12px] ${
        active ? "border-brass bg-brass/15 text-paper" : "border-paper/15 text-paper/75"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[11.5px] text-paper/70">
        {label}
        <span className="text-paper/45">{format ? format(value) : Math.round(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-1.5 h-1.5 w-full appearance-none rounded-full bg-paper/20 accent-brass"
      />
    </label>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Tone work done on pixels, so it looks the same in every browser. */
function applyTone(ctx: CanvasRenderingContext2D, size: number, tone: Tone) {
  const { brightness, contrast, saturation, warmth, fade } = tone;
  if (!brightness && !contrast && !saturation && !warmth && !fade) return;
  const frame = ctx.getImageData(0, 0, size, size);
  const d = frame.data;
  const b = (brightness / 100) * 70;
  const c = 1 + contrast / 100;
  const s = 1 + saturation / 100;
  const w = (warmth / 100) * 32;
  const f = fade / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] + b + w;
    let g = d[i + 1] + b + w * 0.25;
    let bl = d[i + 2] + b - w;
    r = (r - 128) * c + 128;
    g = (g - 128) * c + 128;
    bl = (bl - 128) * c + 128;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    r = lum + (r - lum) * s;
    g = lum + (g - lum) * s;
    bl = lum + (bl - lum) * s;
    if (f) {
      r = r * (1 - f) + 236 * f * 0.55 + r * f * 0.45;
      g = g * (1 - f) + 232 * f * 0.55 + g * f * 0.45;
      bl = bl * (1 - f) + 224 * f * 0.55 + bl * f * 0.45;
    }
    d[i] = clamp(r, 0, 255);
    d[i + 1] = clamp(g, 0, 255);
    d[i + 2] = clamp(bl, 0, 255);
  }
  ctx.putImageData(frame, 0, 0);
}
