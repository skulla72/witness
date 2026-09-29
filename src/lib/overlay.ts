/** Text and stickers placed over a prayer video. Stored as JSON beside the post; the video file is never changed. */
export type OverlayStyle = "display" | "clean" | "strong";
export type OverlayColor = "paper" | "ink" | "brass" | "flame" | "hope";

export interface OverlayLayer {
  id: string;
  kind: "text" | "sticker";
  text: string;
  style: OverlayStyle;
  color: OverlayColor;
  highlight: boolean;
  /** Center position as a fraction (0–1) of the frame. */
  x: number;
  y: number;
  scale: number;
  rotation: number;
  /** Seconds. end = null means "until the end". */
  start: number;
  end: number | null;
  /** Lines fade in one at a time across the layer's time window. */
  breathe: boolean;
}

export interface VideoOverlay {
  v: 1;
  layers: OverlayLayer[];
}

export const EMPTY_OVERLAY: VideoOverlay = { v: 1, layers: [] };

export const OVERLAY_COLORS: Record<OverlayColor, string> = {
  paper: "var(--paper)",
  ink: "var(--ink)",
  brass: "var(--brass-light)",
  flame: "var(--flame)",
  hope: "var(--hope)",
};

export function newLayer(partial: Partial<OverlayLayer> = {}): OverlayLayer {
  return {
    id: Math.random().toString(36).slice(2, 10),
    kind: "text", text: "", style: "display", color: "paper", highlight: false,
    x: 0.5, y: 0.72, scale: 1, rotation: 0, start: 0, end: null, breathe: false,
    ...partial,
  };
}

export function parseOverlay(raw: unknown): VideoOverlay | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { layers?: unknown };
  if (!Array.isArray(o.layers)) return null;
  const layers = o.layers
    .filter((l): l is OverlayLayer => !!l && typeof l === "object" && typeof (l as OverlayLayer).text === "string")
    .map(l => ({ ...newLayer(), ...l }));
  return layers.length ? { v: 1, layers } : null;
}

export function hasOverlay(o: VideoOverlay | null | undefined): o is VideoOverlay {
  return !!o && o.layers.some(l => l.text.trim());
}

/** Plain-text version for screen readers. */
export function overlayText(o: VideoOverlay | null | undefined) {
  return (o?.layers ?? []).map(l => l.text.trim()).filter(Boolean).join(" · ");
}

export function daysBetween(a: string | Date, b: string | Date = new Date()) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}
