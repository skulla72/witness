/**
 * Generates the spoken narration for the walkthrough with the Lovable AI
 * Gateway text-to-speech endpoint, then writes the measured clip lengths to
 * src/narration.json so the video's scene durations match the voiceover.
 *
 * Usage: cd remotion && bun scripts/narrate.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "audio");
const SCRIPT = path.join(ROOT, "narration", "script.json");

const key = process.env.LOVABLE_API_KEY;
if (!key) throw new Error("LOVABLE_API_KEY is not set");

mkdirSync(OUT_DIR, { recursive: true });
const lines = JSON.parse(await Bun.file(SCRIPT).text());

const results = [];
for (const line of lines) {
  const file = path.join(OUT_DIR, `${line.id}.mp3`);
  if (!existsSync(file) || statSync(file).size < 4000) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        voice: line.voice ?? "onyx",
        input: line.text,
        response_format: "mp3",
        instructions:
          "Warm, calm documentary narrator. Unhurried and sincere, never salesy. Gentle pauses at the periods.",
      }),
    });
    if (!res.ok) {
      throw new Error(`TTS failed for ${line.id}: ${res.status} ${await res.text()}`);
    }
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`voiced ${line.id}`);
  } else {
    console.log(`cached ${line.id}`);
  }

  const seconds = Number(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      file,
    ])
      .toString()
      .trim()
  );
  results.push({ id: line.id, seconds: Number(seconds.toFixed(3)) });
}

writeFileSync(
  path.join(ROOT, "src", "narration.json"),
  JSON.stringify(results, null, 2) + "\n"
);
console.log(results);
