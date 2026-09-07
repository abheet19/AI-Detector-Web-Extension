// record-demo.mjs — captures the frames for docs/demo/ai-detector-demo.gif.
//
// Drives the *live* demo page (https://abheet19.github.io/AI-Detector-Web-Extension/)
// with Playwright and writes numbered PNG frames to a scratch directory. Every
// score and explanation in the resulting GIF is whatever the real, unmodified
// detector.js returns for the two paragraphs below — nothing is staged.
//
// Usage:
//   mkdir /tmp/rec && cd /tmp/rec
//   npm i playwright && npx playwright install chromium
//   node /path/to/repo/tools/record-demo.mjs ./frames
//   python tools/build-gif.py [outDir] docs/demo/ai-detector-demo.gif
//
// Playwright is a recording-time tool only; it is deliberately NOT a runtime
// dependency of the extension (which has zero dependencies).

import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

// Resolve Playwright from the *current working directory* rather than from this
// file, so the script also runs when Playwright is installed in a scratch dir
// (keeping it out of the extension repo, which ships zero dependencies).
const require = createRequire(join(process.cwd(), "noop.js"));
const { chromium } = require("playwright");

const URL = "https://abheet19.github.io/AI-Detector-Web-Extension/";
const OUT = process.argv[2] || "frames";

// Two real paragraphs. The first leans on the tells detector.js looks for
// (stock phrases, formal transitions, very even sentence lengths); the second
// is ordinary casual writing.
const AI_TEXT =
  "In today's digital age, remote work has become increasingly important for modern " +
  "organizations. It is important to note that flexible schedules can significantly " +
  "improve overall employee satisfaction. Furthermore, distributed teams often report " +
  "higher levels of daily productivity. Moreover, companies can reduce their operational " +
  "costs by shrinking office space. In conclusion, remote work plays a crucial role in " +
  "the future of employment.";

const HUMAN_TEXT =
  "Honestly? I switched to remote work because my commute was eating two hours a day. " +
  "Some days it's great. Other days I miss the office chatter, the bad coffee, someone " +
  "yelling about a deploy. My cat sits on the keyboard during standups — nobody has " +
  "complained yet. It's fine. Mostly.";

// Capture window: the page column is max-width 560px, so we frame it tightly at
// 2x device scale and downscale in build-gif.py to keep the text crisp.
const CLIP = { x: 56, y: 24, width: 608, height: 612 };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let n = 0;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 720, height: 800 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});

async function shot(count = 1) {
  const path = join(OUT, `f${String(n).padStart(4, "0")}.png`);
  await page.screenshot({ path, clip: CLIP });
  n++;
  // Repeat an identical frame to hold on screen without re-screenshotting.
  for (let i = 1; i < count; i++) {
    const dup = join(OUT, `f${String(n).padStart(4, "0")}.png`);
    await page.screenshot({ path: dup, clip: CLIP });
    n++;
  }
}

// Reveal text in word-sized chunks — Playwright's native typing is far too fast
// to follow at 8fps, and per-character frames would blow the frame budget.
async function typeInChunks(text, chunks = 22) {
  const size = Math.ceil(text.length / chunks);
  for (let i = size; i < text.length; i += size) {
    // Break chunks on a space so words never appear mid-split.
    let end = text.indexOf(" ", i);
    if (end === -1) end = text.length;
    await page.fill("#inputText", text.slice(0, end));
    await shot();
  }
  await page.fill("#inputText", text);
  await shot(2);
}

async function detect() {
  await page.click("#detectBtn");
  await page.waitForTimeout(150);
  return await page.evaluate(() => ({
    score: document.getElementById("score").textContent,
    explain: document.getElementById("explain").textContent,
  }));
}

async function clear() {
  await page.fill("#inputText", "");
  await shot(2);
}

await page.goto(URL, { waitUntil: "networkidle" });
// Blur the textarea so no caret blinks between otherwise identical frames.
await page.evaluate(() => document.activeElement?.blur?.());

// Frame 0 must stand alone as a still (GitHub shows it before play) and the
// clip must loop, so we open AND close on the high-score result.
await page.fill("#inputText", AI_TEXT);
const first = await detect();
await shot(11); // opening hold (~1.4s at 8fps) — this is the thumbnail

await clear();
await typeInChunks(HUMAN_TEXT);
const human = await detect();
await shot(11); // capped hold — long enough to read score + explanation, not frozen

await clear();
await typeInChunks(AI_TEXT);
const ai = await detect();
await shot(11);

await browser.close();

console.log(`frames: ${n} -> ${OUT}`);
console.log(`AI    : ${ai.score}\n        ${ai.explain}`);
console.log(`HUMAN : ${human.score}\n        ${human.explain}`);
if (first.score !== ai.score) console.warn("WARNING: opening and closing scores differ — loop will jump.");
