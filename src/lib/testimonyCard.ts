/**
 * Draws a shareable testimony image on a canvas — the ask, the answer (or the
 * "N people prayed" milestone), and the Witness mark — sized for Instagram /
 * Facebook. Runs entirely in the browser; nothing leaves the phone until the
 * person taps Share.
 */
import { BRAND } from "@/config/brand";

export type CardFormat = "post" | "story";
export type CardReason = "answered" | "milestone";

export interface TestimonyCardInput {
  reason: CardReason;
  ask: string;
  answer?: string | null;
  statusLabel?: string;
  count: number;
  name: string | null;
  category: string;
  askDate: string;
  answerDate?: string | null;
  host: string;
  format: CardFormat;
}

export const MILESTONES = [50, 100, 250, 500, 1000, 5000];

export function reachedMilestone(count: number): number | null {
  let hit: number | null = null;
  for (const m of MILESTONES) if (count >= m) hit = m;
  return hit;
}

function token(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else { lines.push(line); line = w; }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    const used = lines.join(" ").split(" ").length;
    if (used < words.length) {
      let last = lines[maxLines - 1];
      while (ctx.measureText(`${last}…`).width > maxWidth && last.includes(" ")) last = last.slice(0, last.lastIndexOf(" "));
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

/** Shrinks the font until the text fits in `maxLines`. Returns the size used. */
function fitText(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, start: number, min: number, maxWidth: number, maxLines: number) {
  let size = start;
  for (;;) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrap(ctx, text, maxWidth, maxLines + 1);
    if (lines.length <= maxLines || size <= min) return { size, lines: wrap(ctx, text, maxWidth, maxLines) };
    size -= 4;
  }
}

function drawWitnessMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, gold: string) {
  ctx.save();
  ctx.strokeStyle = gold;
  ctx.lineWidth = Math.max(3, r * 0.18);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2);
  ctx.stroke();

  const flame = new Path2D();
  flame.moveTo(cx, cy - r);
  flame.bezierCurveTo(cx - r * 0.2, cy - r * 0.4, cx - r * 0.82, cy + r * 0.05, cx - r * 0.55, cy + r * 0.72);
  flame.bezierCurveTo(cx - r * 0.4, cy + r, cx - r * 0.12, cy + r * 1.08, cx - r * 0.08, cy + r * 1.08);
  flame.lineTo(cx - r * 0.08, cy + r * 0.6);
  flame.bezierCurveTo(cx - r * 0.45, cy + r * 0.25, cx, cy - r * 0.05, cx, cy - r * 0.48);
  flame.bezierCurveTo(cx + r * 0.02, cy - r * 0.1, cx + r * 0.48, cy + r * 0.2, cx + r * 0.48, cy + r * 0.58);
  flame.bezierCurveTo(cx + r * 0.48, cy + r * 0.84, cx + r * 0.2, cy + r, cx + r * 0.08, cy + r * 1.08);
  flame.lineTo(cx + r * 0.08, cy + r * 0.62);
  flame.bezierCurveTo(cx + r * 0.72, cy + r * 0.3, cx + r * 0.55, cy - r * 0.18, cx, cy - r);
  flame.closePath();
  ctx.fillStyle = gold;
  ctx.fill(flame);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderTestimonyCard(input: TestimonyCardInput): Promise<Blob> {
  const W = 1080;
  const H = input.format === "story" ? 1920 : 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load("600 60px Sora"), document.fonts.load("400 60px Sora"),
      document.fonts.load("500 30px Manrope"), document.fonts.load("600 30px Manrope"),
    ]).catch(() => {});
  }

  const ink = token("--ink", "#262c3a");
  const paper = token("--paper", "#fcfaf5");
  const paperWarm = token("--paper-warm", "#f3eee2");
  const brass = token("--brass", "#c9a45b");
  const brassDeep = token("--brass-deep", "#9a7a3a");
  const flame = token("--flame", "#e39a3a");
  const inkSoft = token("--ink-soft", "#5a6273");
  const display = "Sora, system-ui, sans-serif";
  const body = "Manrope, system-ui, sans-serif";

  // Ground: warm paper with a soft navy vignette at the edges.
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H * 0.4, H * 0.2, W / 2, H * 0.5, H * 0.85);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(38,44,58,0.10)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  const pad = 96;
  const inner = W - pad * 2;
  const top = input.format === "story" ? 260 : 120;

  // Header: mark + wordmark.
  drawWitnessMark(ctx, pad + 32, top + 42, 22, brass);
  ctx.fillStyle = ink;
  ctx.font = `600 34px ${display}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(BRAND.name, pad + 78, top + 54);
  ctx.fillStyle = inkSoft;
  ctx.font = `500 22px ${body}`;
  const dateLine = input.answerDate ? `${input.askDate} → ${input.answerDate}` : input.askDate;
  ctx.textAlign = "right";
  ctx.fillText(dateLine, W - pad, top + 52);
  ctx.textAlign = "left";

  // Card.
  const cardY = top + 130;
  const cardH = H - cardY - (input.format === "story" ? 300 : 180);
  ctx.save();
  ctx.shadowColor = "rgba(38,44,58,0.14)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, pad, cardY, inner, cardH, 40);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = paperWarm;
  roundRect(ctx, pad, cardY, inner, cardH, 40);
  ctx.fill();
  ctx.strokeStyle = "rgba(154,122,58,0.28)";
  ctx.lineWidth = 2;
  roundRect(ctx, pad + 1, cardY + 1, inner - 2, cardH - 2, 39);
  ctx.stroke();

  const cx = pad + 64;
  const cw = inner - 128;
  let y = cardY + 84;

  // Eyebrow.
  ctx.font = `600 22px ${body}`;
  ctx.fillStyle = brassDeep;
  const eyebrow = input.reason === "answered" ? "THE ASK" : "STILL BEING CARRIED";
  ctx.fillText(eyebrow.split("").join(String.fromCharCode(8202)), cx, y);
  y += 56;

  // The ask.
  const askFit = fitText(ctx, `“${input.ask}”`, display, 400, input.reason === "answered" ? 54 : 62, 34, cw, input.reason === "answered" ? 5 : 7);
  ctx.fillStyle = ink;
  ctx.font = `400 ${askFit.size}px ${display}`;
  for (const line of askFit.lines) { ctx.fillText(line, cx, y + askFit.size); y += askFit.size * 1.28; }
  y += 48;

  if (input.reason === "answered") {
    // Divider with the answer label.
    ctx.strokeStyle = "rgba(154,122,58,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke();
    y += 58;
    ctx.fillStyle = flame;
    ctx.font = `600 22px ${body}`;
    ctx.fillText((input.statusLabel ?? "ANSWERED").toUpperCase().split("").join(String.fromCharCode(8202)), cx, y);
    // Small flame dot.
    ctx.beginPath(); ctx.arc(cx + cw - 10, y - 8, 8, 0, Math.PI * 2); ctx.fillStyle = flame; ctx.fill();
    y += 54;

    const answerText = (input.answer ?? "").trim() || "He answered.";
    const remaining = cardY + cardH - y - 170;
    const maxLines = Math.max(3, Math.floor(remaining / 78));
    const ansFit = fitText(ctx, `“${answerText}”`, display, 600, 60, 36, cw, maxLines);
    ctx.fillStyle = ink;
    ctx.font = `600 ${ansFit.size}px ${display}`;
    for (const line of ansFit.lines) { ctx.fillText(line, cx, y + ansFit.size); y += ansFit.size * 1.26; }
  } else {
    // Milestone number.
    const m = reachedMilestone(input.count) ?? input.count;
    ctx.fillStyle = brassDeep;
    ctx.font = `600 150px ${display}`;
    ctx.fillText(String(m), cx, y + 150);
    ctx.fillStyle = ink;
    ctx.font = `500 34px ${body}`;
    ctx.fillText("people have prayed for this.", cx, y + 210);
    y += 260;
  }

  // Card footer: count + name.
  const fy = cardY + cardH - 76;
  ctx.fillStyle = inkSoft;
  ctx.font = `500 26px ${body}`;
  const who = input.name ? input.name : "A Witness member";
  const countLine = input.reason === "answered" ? `${input.count} ${input.count === 1 ? "person" : "people"} prayed · ${input.category}` : input.category;
  ctx.fillText(countLine, cx, fy);
  ctx.textAlign = "right";
  ctx.fillStyle = ink;
  ctx.font = `600 26px ${body}`;
  ctx.fillText(who, cx + cw, fy);
  ctx.textAlign = "left";

  // Page footer.
  ctx.fillStyle = inkSoft;
  ctx.font = `500 24px ${body}`;
  ctx.textAlign = "center";
  const footY = input.format === "story" ? H - 200 : H - 84;
  ctx.fillText(`${BRAND.tagline}  ·  ${input.host}`, W / 2, footY);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Could not render image"))), "image/png");
  });
}
