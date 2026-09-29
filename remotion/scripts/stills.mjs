/** Renders a few frames as PNGs for visual QA: bun scripts/stills.mjs 600 780 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const frames = process.argv.slice(2).map(Number);

const bundled = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), webpackOverride: (c) => c });
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-gpu-compositing",
      "--disable-software-rasterizer",
      "--disable-partial-raster",
      "--disable-dev-shm-usage",
      "--force-color-profile=srgb",
    ],
  },
  chromeMode: "chrome-for-testing",
});
const composition = await selectComposition({ serveUrl: bundled, id: "main", puppeteerInstance: browser });

for (const frame of frames) {
  await renderStill({
    composition,
    serveUrl: bundled,
    frame,
    output: `/tmp/vq/s${frame}.png`,
    puppeteerInstance: browser,
    overwrite: true,
  });
  console.log("frame", frame);
}
await browser.close({ silent: false });
