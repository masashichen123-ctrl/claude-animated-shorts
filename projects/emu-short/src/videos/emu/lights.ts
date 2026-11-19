// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Look values from the missile / bridge look passes (look_reports/lighting.md, grade.md, depth.md): warm lit side,
// low-chroma cool shade, albedo floor, practical lights kept by shade.ts, sun cookie, backlight rim, corner AO,
// exponential key-tinted haze, painted sky with sun glow. The emu short's mood arc over the 17 shots:
//   1-2   "morning": low warm sun over the stubble (the hook)
//   3-7, 9, 11-14 "day": the hot Western Australian day (deep blue top, pale warm horizon, warm key)
//   8, 15-17 "golden": the dam, the emu army, the road home and the ending in the wheat
//   10    "dusk": the tent camp, lamp-lit and warm against a violet sky
import type { Light } from "./story";
import { SHOTS } from "./story";
type C3 = [number, number, number];
/** every preset name (story.ts `Light` plus the ones this file adds; see SHOT_LIGHT) */
export type LightName = Light;
export type Haze = { col: string; start: number; len: number; h: number; max: number; sat: number };
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
  // ---- look pass r1 (lighting.md 3.1, depth.md 3.2/3.3) ----
  albFloor: C3;      // linear albedo floor in shade.ts (navy hull etc. never go black)
  gobo: number;      // 0..1 sun cookie strength (drifting cloud dapple on the ground), shade.ts
  goboScale: number; // world metres per cookie cell
  rim: C3;           // backlight rim colour x strength (0 = off)
  ao: number; aoR: number; // corner AO depth (fraction) and reach (m) near floor / ceiling lines
  prac: number;      // multiplier on point / spot "practical" lights inside the two-tone shader
  pracCol: string;   // colour of the practical lamps world.ts adds for this mood
  bloomI: number; bloomR: number; // bloom intensity / radius (Emu.tsx reads them per shot)
  bloomT?: number;   // bloom MAX-channel threshold for this mood (Emu.tsx default 1.45)
  softM: number;     // shadow penumbra in world metres (world.ts sizes the PCF-soft shadow map from it)
  haze: Haze;        // exponential, height-pooled, saturation-keeping haze (replaces the linear fog in shade.ts)
  glowCol: string; glowK: number; // sky glow toward the sun (painted sky, world.ts)
};
const H = (col: string, start: number, len: number, h: number, max: number, sat = 0.6): Haze => ({ col, start, len, h, max, sat });
export const LIGHTS: Record<LightName, LightPreset> = {
  day: {
    // warm key (lit neutrals hue 60-85 deg), low-chroma blue-violet shade, from behind the camera's right shoulder
    az: 122, el: 46,
    lit: [1.38, 1.24, 1.0], shade: [0.31, 0.29, 0.35], lift: [0.04, 0.045, 0.07], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.95, 0.88], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.6], actorShadow: false,
    top: "#2a63c4", hor: "#efe2c2", skyCurve: [0.0, 0.5, 0.6], fog: "#e6d8b8", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.4,
    bias: -0.00025, normalBias: 0.015,
    albFloor: [0.03, 0.03, 0.042], gobo: 0.6, goboScale: 5, rim: [0, 0, 0], ao: 0.1, aoR: 0.7, prac: 1, pracCol: "#fff2c8",
    bloomI: 0.6, bloomR: 0.6, softM: 0.16,
    haze: H("#e8dab8", 35, 190, 60, 0.8), glowCol: "#fff6e0", glowK: 0.25,
  },
  morning: {
    // sunrise at sea: low warm sun, peach haze, cool violet shade, warm rim when backlit; the flame blooms
    az: 125, el: 14,
    lit: [1.7, 1.26, 0.84], shade: [0.24, 0.24, 0.36], lift: [0.04, 0.05, 0.11], lambert: 0.35, sideK: 0.84, term: 0.1,
    charTint: [1.0, 0.88, 0.76], charShade: 0.88, charGrad: 0.09, bodyGrad: 0.24, sideTint: [0.88, 0.84, 0.96],
    blob: [0.7, 0.68, 0.84], actorShadow: true,
    top: "#5a86c8", hor: "#ffd9a8", skyCurve: [0.03, 0.55, 0.8], fog: "#f2c6a6", fogNear: 40, fogFar: 360, sunDisc: "#fff0d0",
    sunCol: "#ffc890", sunI: 4, sky: "#d9c6c8", ground: "#8a7a70", hemiI: 0.5,
    bias: -0.0005, normalBias: 0.025,
    albFloor: [0.03, 0.03, 0.045], gobo: 0, goboScale: 9, rim: [1.25, 0.85, 0.62], ao: 0.08, aoR: 0.7, prac: 1.2, pracCol: "#ffb060",
    bloomI: 0.8, bloomR: 0.7, softM: 0.22,
    haze: H("#f2c4a2", 30, 220, 50, 0.5), glowCol: "#fff0c0", glowK: 0.38,
  },
  golden: {
    // late afternoon on the road: amber key low from the side, violet shade
    az: 110, el: 14,
    lit: [1.62, 1.02, 0.52], shade: [0.2, 0.2, 0.33], lift: [0.04, 0.05, 0.13], lambert: 0.35, sideK: 0.82, term: 0.08,
    charTint: [1.0, 0.82, 0.62], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#f6bf8c", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
    albFloor: [0.03, 0.028, 0.045], gobo: 0.25, goboScale: 11, rim: [0.9, 0.55, 0.3], ao: 0.08, aoR: 0.7, prac: 1, pracCol: "#ffd08a",
    bloomI: 0.7, bloomR: 0.65, softM: 0.24,
    haze: H("#f6bf8c", 25, 150, 50, 0.8), glowCol: "#fff0c0", glowK: 0.55,
  },
  dusk: {
    // sun just under a band of orange cloud, cool violet world, warm rim; the explosion puff and flame glow over it
    az: 10, el: 4,
    lit: [1.3, 0.68, 0.42], shade: [0.15, 0.15, 0.29], lift: [0.05, 0.05, 0.15], lambert: 0.35, sideK: 0.82, term: 0.08,
    charTint: [0.95, 0.78, 0.7], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.82, 0.78, 0.95],
    blob: [0.72, 0.7, 0.9], actorShadow: true,
    top: "#2a2f6a", hor: "#ff9a6a", skyCurve: [0.05, 0.6, 1.0], fog: "#c98377", fogNear: 40, fogFar: 380, sunDisc: "#ff9a62",
    sunCol: "#ff9a5a", sunI: 4.5, sky: "#9a88b8", ground: "#5a4a60", hemiI: 0.45,
    bias: -0.0006, normalBias: 0.03,
    albFloor: [0.035, 0.03, 0.055], gobo: 0, goboScale: 9, rim: [1.1, 0.6, 0.42], ao: 0.08, aoR: 0.7, prac: 2.2, pracCol: "#ffb060",
    bloomI: 0.9, bloomR: 0.75, softM: 0.26,
    haze: H("#b98290", 20, 140, 40, 0.78), glowCol: "#ffb080", glowK: 0.6,
  },
};

/** which preset each shot uses (story.ts SHOTS[].light is the source; this table may refine it) */
export const SHOT_LIGHT: Record<number, LightName> = {};
/** per-shot sun (camera-relative az / el, degrees). Heroes face a warm key from behind the lens' shoulder; the golden
 *  shots are backlit (rim + sun disc in frame where the lens faces it). */
export const SHOT_SUN: Record<number, { az: number; el: number }> = {
  1: { az: 128, el: 14 }, 2: { az: 125, el: 16 },
  3: { az: 125, el: 50 }, 4: { az: 120, el: 46 }, 5: { az: 140, el: 48 }, 6: { az: 125, el: 48 }, 7: { az: 118, el: 50 },
  8: { az: 30, el: 9 },
  9: { az: 128, el: 50 }, 10: { az: 25, el: 3 }, 11: { az: 120, el: 46 }, 12: { az: 125, el: 48 }, 13: { az: 130, el: 50 }, 14: { az: 120, el: 55 },
  15: { az: 18, el: 9 }, 16: { az: 3, el: 5 }, 17: { az: 22, el: 8 },
};
/** per-shot sky stops overriding LOOK[light].sky */
export const SHOT_SKY: Record<number, { c: string[]; e: number[] }> = {
  16: { c: ["#ffc070", "#ff9a5e", "#e07a72", "#8e6e9a", "#4d5a9a"], e: [0, 3, 8, 18, 42] }, // sunset down the road
};
/** the shot world.ts posed last (read by grade.ts gradeFor, which is called right after world.update for the same layer) */
export const CUR = { id: 0 };
export const lightOf = (id: number): LightName => SHOT_LIGHT[id] ?? SHOTS[id - 1].light;

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
  skyTex: number;                                             // painted sky noise amplitude (depth.md 3.3)
};
export const LOOK: Record<LightName, WorldLook> = {
  day: {
    sky: { c: ["#f1e4c4", "#c9dcec", "#86b5e6", "#4d87d6", "#2a63c4"], e: [0, 3, 9, 18, 40] }, // hot sky: pale warm horizon -> deep blue
    cloud: { lit: "#fbf8f1", mid: "#e1e7f3", shade: "#b9c6ee" },
    bounce: [0.02, 0.012, 0],
    sat: 1.2,
    skyTex: 0.05,
  },
  morning: {
    // sunrise: peach horizon, rose through ~10 deg, soft blue overhead
    sky: { c: ["#ffd6a6", "#f8c4a2", "#dcb4b8", "#9fb0d6", "#5f88c6"], e: [0, 4, 11, 22, 45] },
    cloud: { lit: "#ffe0c0", mid: "#f0b6a8", shade: "#a99ac8" },
    bounce: [0.04, 0.025, 0.0],
    sat: 1.04,
    skyTex: 0.09,
  },
  golden: {
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.02,
    skyTex: 0.07,
  },
  dusk: {
    sky: { c: ["#ffa874", "#f48c80", "#c87c98", "#7e6caa", "#45428a"], e: [0, 3, 10, 22, 50] },
    cloud: { lit: "#ffb08a", mid: "#c47a8c", shade: "#5a4f84" },
    bounce: [0.05, 0.02, 0.02],
    sat: 1.04,
    skyTex: 0.08,
  },
};
