import narration from "./narration.json";

export const FPS = 30;
/** silence before the line starts, so the scene establishes first */
export const LEAD = 0.85;
/** breathing room after the line ends */
export const TAIL = 1.5;
/** cross-fade length between beats */
export const TRANSITION = 10;

const secs: Record<string, number> = Object.fromEntries(
  (narration as { id: string; seconds: number }[]).map((n) => [n.id, n.seconds])
);

export const narrationSeconds = (id: string) => secs[id] ?? 6;

/** frames a beat runs: lead-in + spoken line + tail */
export const beatFrames = (id: string) =>
  Math.round((LEAD + narrationSeconds(id) + TAIL) * FPS);

/** absolute frame each beat starts at, accounting for transition overlap */
export function beatStarts(ids: string[]) {
  const out: number[] = [];
  let cursor = 0;
  ids.forEach((id, i) => {
    out.push(cursor);
    cursor += beatFrames(id) - (i < ids.length - 1 ? TRANSITION : 0);
  });
  return out;
}

export function totalFrames(ids: string[]) {
  return ids.reduce((acc, id) => acc + beatFrames(id), 0) - TRANSITION * (ids.length - 1);
}

/** absolute seconds each narration clip should be mixed in at */
export function narrationOffsets(ids: string[]) {
  const starts = beatStarts(ids);
  return ids.map((id, i) => ({ id, at: starts[i]! / FPS + LEAD }));
}
