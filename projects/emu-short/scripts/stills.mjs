// Render many stills of a composition with ONE bundle (vs ~60 s per `npx remotion still`).
// usage: node scripts/stills.mjs <outPrefix> <frames: 60,150,...|"shots"> [scale=0.5] [comp=EmuShort]
//   e.g. node scripts/stills.mjs out/emu/s_ shots        -> one still per shot (mid-frame), out/emu/s_<frame>.png
// env: STILLS_ENTRY (default src/index.tsx), STILLS_PROPS (JSON inputProps, default {"post":{"dpr":<scale>}})
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const tmp = path.join(root, ".rtmp");
fs.mkdirSync(tmp, { recursive: true });
process.env.REMOTION_TMP = tmp; process.env.TMPDIR = tmp;

const [prefix = "out/emu/s_", framesArg = "shots", scaleArg = "0.5", comp = "EmuShort"] = process.argv.slice(2);
const scale = Number(scaleArg);
// mid-frame of each shot (story.ts SHOTS / SHOTS.md)
const SHOT_RANGES = [[0, 121], [121, 157], [157, 305], [305, 389], [389, 450], [450, 602], [602, 695], [695, 825], [825, 937], [937, 1135],
  [1135, 1201], [1201, 1270], [1270, 1382], [1382, 1504], [1504, 1656], [1656, 1694], [1694, 1770]];
const frames = framesArg === "shots" ? SHOT_RANGES.map(([a, b]) => Math.floor((a + b) / 2)) : framesArg.split(",").map(Number);
const inputProps = process.env.STILLS_PROPS ? JSON.parse(process.env.STILLS_PROPS) : { post: { dpr: scale } };
const browserExecutable = process.env.STILLS_BROWSER ?? "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.join(root, process.env.STILLS_ENTRY ?? "src/index.tsx"), outDir: path.join(tmp, "bundle_" + (process.env.STILLS_ENTRY ?? "main").replace(/[^a-z0-9]/gi, "_")) });
console.log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const chromiumOptions = { gl: "swiftshader" };
const composition = await selectComposition({ serveUrl, id: comp, inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds: 240000 });
for (const frame of frames) {
  const t = Date.now(), output = path.join(root, `${prefix}${frame}.png`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await renderStill({ composition, serveUrl, output, frame, scale, inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds: 240000, overwrite: true });
  console.log(`${output} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
}
