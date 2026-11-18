// Render many stills of a composition with ONE bundle (vs ~60 s per `npx remotion still`).
// usage: node scripts/stills.mjs <outPrefix> <frames: 60,150,...|"shots"> [scale=0.5] [comp=MissileShort]
//   e.g. node scripts/stills.mjs out/missile/s_ shots        -> one still per shot (mid-frame), out/missile/s_<frame>.png
// env: STILLS_ENTRY (default src/index.tsx), STILLS_PROPS (JSON inputProps, default {"post":{"dpr":<scale>}})
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const tmp = path.join(root, ".rtmp");
fs.mkdirSync(tmp, { recursive: true });
process.env.REMOTION_TMP = tmp; process.env.TMPDIR = tmp;

const [prefix = "out/missile/s_", framesArg = "shots", scaleArg = "0.5", comp = "MissileShort"] = process.argv.slice(2);
const scale = Number(scaleArg);
// mid-frame of each shot (story.ts SHOTS / SHOTS.md)
const SHOT_RANGES = [[0, 121], [121, 176], [176, 249], [249, 374], [374, 463], [463, 497], [497, 574], [574, 659], [659, 785], [785, 848],
  [848, 931], [931, 1055], [1055, 1189], [1189, 1267], [1267, 1352]];
const frames = framesArg === "shots" ? SHOT_RANGES.map(([a, b]) => Math.floor((a + b) / 2)) : framesArg.split(",").map(Number);
const inputProps = process.env.STILLS_PROPS ? JSON.parse(process.env.STILLS_PROPS) : { post: { dpr: scale } };
const browserExecutable = process.env.STILLS_BROWSER ?? "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.join(root, process.env.STILLS_ENTRY ?? "src/index.tsx"), outDir: path.join(tmp, "bundle") });
console.log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const chromiumOptions = { gl: "swiftshader" };
const composition = await selectComposition({ serveUrl, id: comp, inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds: 240000 });
for (const frame of frames) {
  const t = Date.now(), output = path.join(root, `${prefix}${frame}.png`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await renderStill({ composition, serveUrl, output, frame, scale, inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds: 240000, overwrite: true });
  console.log(`${output} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
}
