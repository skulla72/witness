/**
 * Renders the walkthrough (video only), then mixes the narration clips in at
 * the exact frame each beat's line starts, and muxes them into the final MP4.
 *
 * Usage: cd remotion && bun scripts/build-walkthrough.mjs
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SILENT = "/tmp/witness-walkthrough-silent.mp4";
const OUT = "/mnt/documents/witness-walkthrough.mp4";

const { BEAT_IDS } = await import(path.join(ROOT, "src/Walkthrough.tsx"));
const { narrationOffsets } = await import(path.join(ROOT, "src/timing.ts"));
const offsets = narrationOffsets(BEAT_IDS);

const bundled = await bundle({
  entryPoint: path.join(ROOT, "src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-gpu-compositing", "--disable-software-rasterizer", "--disable-partial-raster", "--disable-dev-shm-usage", "--force-color-profile=srgb"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({ serveUrl: bundled, id: "main", puppeteerInstance: browser });
console.log("frames:", composition.durationInFrames);

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: SILENT,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
  timeoutInMilliseconds: 180000,
  onProgress: ({ progress }) => {
    if (Math.round(progress * 100) % 10 === 0) console.log(`render ${Math.round(progress * 100)}%`);
  },
});
await browser.close({ silent: false });

// --- narration mix -------------------------------------------------------
const args = ["-y", "-i", SILENT];
offsets.forEach((o) => args.push("-i", path.join(ROOT, "public/audio", `${o.id}.mp3`)));

const filters = offsets
  .map((o, i) => `[${i + 1}:a]adelay=${Math.round(o.at * 1000)}:all=1[a${i}]`)
  .join(";");
const mix =
  offsets.map((_, i) => `[a${i}]`).join("") +
  `amix=inputs=${offsets.length}:normalize=0:dropout_transition=0[vo]`;

args.push(
  "-filter_complex",
  `${filters};${mix}`,
  "-map",
  "0:v",
  "-map",
  "[vo]",
  "-c:v",
  "copy",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-shortest",
  OUT
);

execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
console.log("done ->", OUT);
