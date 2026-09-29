import type { PointerEvent as ReactPointerEvent } from "react";
import { OVERLAY_COLORS, type OverlayLayer, type VideoOverlay } from "@/lib/overlay";

const STYLE_CLASS: Record<OverlayLayer["style"], string> = {
  display: "font-serif font-semibold tracking-tight",
  clean: "font-sans font-medium",
  strong: "font-sans font-extrabold uppercase tracking-wide",
};

/** Opacity for a layer at time t (seconds), with soft half-second fades. */
function layerAlpha(l: OverlayLayer, t: number, duration: number) {
  const end = l.end ?? (duration || Infinity);
  if (t < l.start || t > end) return 0;
  const fade = 0.4;
  return Math.min(1, (t - l.start) / fade + (l.start === 0 ? 1 : 0), (end - t) / fade + (l.end === null ? 1 : 0));
}

function lineAlpha(l: OverlayLayer, i: number, count: number, t: number, duration: number) {
  if (!l.breathe || count <= 1) return 1;
  const end = l.end ?? (duration || l.start + count * 2);
  const span = Math.max(0.5, (end - l.start) * 0.8);
  const at = l.start + (span / count) * i;
  return Math.max(0, Math.min(1, (t - at) / 0.8));
}

/**
 * Draws overlay text on top of a video at the current time.
 * In edit mode, every layer shows and can be dragged.
 */
export function OverlayLayers({
  overlay, time, duration, editing = false, selectedId, onSelect, onDragStart,
}: {
  overlay: VideoOverlay | null | undefined;
  time: number;
  duration: number;
  editing?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onDragStart?: (id: string, e: ReactPointerEvent) => void;
}) {
  if (!overlay) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden={!editing}>
      {overlay.layers.map(l => {
        if (!l.text.trim() && !editing) return null;
        const alpha = editing ? (layerAlpha(l, time, duration) > 0 ? 1 : 0.35) : layerAlpha(l, time, duration);
        if (alpha <= 0) return null;
        const lines = (l.text || "Your words").split("\n");
        const color = OVERLAY_COLORS[l.color];
        const dark = l.color === "ink";
        return (
          <div
            key={l.id}
            onPointerDown={editing ? e => { onSelect?.(l.id); onDragStart?.(l.id, e); } : undefined}
            className={`absolute max-w-[88%] text-center leading-tight ${editing ? "pointer-events-auto cursor-grab touch-none select-none" : ""} ${STYLE_CLASS[l.style]}`}
            style={{
              left: `${l.x * 100}%`, top: `${l.y * 100}%`, opacity: alpha,
              transform: `translate(-50%, -50%) rotate(${l.rotation}deg) scale(${l.scale})`,
              fontSize: l.kind === "sticker" ? "clamp(11px, 3.4vw, 14px)" : "clamp(18px, 6vw, 26px)",
              color: l.highlight ? (dark ? "var(--paper)" : "var(--ink)") : color,
              textShadow: l.highlight ? "none" : dark ? "0 1px 8px color-mix(in oklab, var(--paper) 70%, transparent)" : "0 2px 12px color-mix(in oklab, var(--ink) 75%, transparent)",
              transition: "opacity 200ms linear",
            }}
          >
            {lines.map((line, i) => (
              <span key={i} className="block" style={{ opacity: editing ? 1 : lineAlpha(l, i, lines.length, time, duration), transition: "opacity 400ms ease" }}>
                <span
                  className={l.highlight || l.kind === "sticker" ? "box-decoration-clone rounded-md px-2 py-0.5" : ""}
                  style={l.highlight || l.kind === "sticker" ? { background: l.highlight ? color : "color-mix(in oklab, var(--ink) 55%, transparent)" } : undefined}
                >
                  {line || "\u00a0"}
                </span>
              </span>
            ))}
            {editing && selectedId === l.id && <span className="pointer-events-none absolute -inset-2 rounded-lg border border-dashed border-brass-light" />}
          </div>
        );
      })}
    </div>
  );
}
