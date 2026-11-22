// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Look values from the missile / bridge / emu / bat look passes (look_reports/lighting.md, grade.md, depth.md): warm lit
// side, low-chroma cool shade, albedo floor, sun cookie, corner AO, exponential key-tinted haze, painted sky with sun glow.
// The marathon short (lead's rule: real colour separation, deep blue sky top -> pale horizon, white clouds):
//   1-14 "day": St. Louis, 30 Aug 1904, a HOT 90-degree day: warm key from behind the lens' shoulder, warm dusty haze
//   15   "spring": Boston 1905, a fresh spring day, a touch cooler and greener
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
  bloomI: number; bloomR: number; // bloom intensity / radius (Marathon.tsx reads them per shot)
  bloomT?: number;   // bloom MAX-channel threshold for this mood (Marathon.tsx default 1.45)
  softM: number;     // shadow penumbra in world metres (world.ts sizes the PCF-soft shadow map from it)
  haze: Haze;        // exponential, height-pooled, saturation-keeping haze (replaces the linear fog in shade.ts)
  glowCol: string; glowK: number; // sky glow toward the sun (painted sky, world.ts)
  moon?: number;     // > 0: the sun disc is a moon of this angular radius (deg) and stars come out (unused here)
  cardGain?: number; // character card brightness (cardshade.ts uGain; 1 = faces ~.93)
  cardRim?: C3;      // rim colour on the cards' sun-facing edge (default warm, golden / dusk)
  cardRimK?: number; // force the card rim on (night: a cool moon rim)
  bg?: string;       // interiors: background colour behind the room shell
};
const H = (col: string, start: number, len: number, h: number, max: number, sat = 0.6): Haze => ({ col, start, len, h, max, sat });
export const LIGHTS: Record<LightName, LightPreset> = {
  day: {
    // warm key (lit neutrals hue 60-85 deg), low-chroma blue-violet shade, from behind the camera's right shoulder
    az: 122, el: 50,
    lit: [1.46, 1.27, 0.96], shade: [0.3, 0.29, 0.37], lift: [0.04, 0.045, 0.075], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.95, 0.88], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.6], actorShadow: false,
    top: "#3e7fd2", hor: "#dfe8ee", skyCurve: [0.0, 0.5, 0.6], fog: "#d9e4ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#c9a070", hemiI: 0.4,
    bias: -0.00025, normalBias: 0.015,
    albFloor: [0.03, 0.03, 0.042], gobo: 0.45, goboScale: 6, rim: [0, 0, 0], ao: 0.1, aoR: 0.7, prac: 1, pracCol: "#ffb048",
    bloomI: 0.7, bloomR: 0.65, softM: 0.16,
    haze: H("#e8e2d2", 40, 230, 60, 0.6), glowCol: "#fff2d0", glowK: 0.26,
  },
  spring: {
    // warm key (lit neutrals hue 60-85 deg), low-chroma blue-violet shade, from behind the camera's right shoulder
    az: 120, el: 50,
    lit: [1.5, 1.3, 1.0], shade: [0.3, 0.29, 0.37], lift: [0.04, 0.045, 0.075], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.95, 0.88], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.6], actorShadow: false,
    top: "#3e7fd2", hor: "#dfe8ee", skyCurve: [0.0, 0.5, 0.6], fog: "#d9e4ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#c9a070", hemiI: 0.4,
    bias: -0.00025, normalBias: 0.015,
    albFloor: [0.03, 0.03, 0.042], gobo: 0.45, goboScale: 6, rim: [0, 0, 0], ao: 0.1, aoR: 0.7, prac: 1, pracCol: "#ffb048",
    bloomI: 0.7, bloomR: 0.65, softM: 0.16,
    haze: H("#dfe6ec", 40, 230, 60, 0.65), glowCol: "#fff6e0", glowK: 0.22,
  },
};

/** which preset each shot uses (story.ts SHOTS[].light is the source; this table may refine it) */
export const SHOT_LIGHT: Record<number, LightName> = {};
/** per-shot sun (camera-relative az / el, degrees): a warm key from behind the lens' shoulder; the wides side-lit */
export const SHOT_SUN: Record<number, { az: number; el: number }> = {
  1: { az: 130, el: 44 }, 2: { az: 125, el: 46 }, 3: { az: 115, el: 40 }, 4: { az: 125, el: 46 }, 5: { az: 120, el: 48 },
  6: { az: 125, el: 46 }, 7: { az: 125, el: 46 }, 8: { az: 128, el: 44 }, 9: { az: 125, el: 48 }, 10: { az: 118, el: 44 },
  11: { az: 130, el: 44 }, 12: { az: 128, el: 46 }, 13: { az: 122, el: 46 }, 14: { az: 120, el: 44 }, 15: { az: 124, el: 48 },
};
/** a second, later sun for a shot: from frame [0] on (a cut to another set / a reverse angle) the sun is re-frozen
 *  camera-relative */
export const SHOT_SUN_FROM: Record<number, [number, { az: number; el: number }]> = {
  3: [262, { az: 135, el: 40 }], 7: [752, { az: 125, el: 46 }], 9: [947, { az: 125, el: 46 }],
};
/** absolute world direction TOWARD the sun for a shot (overrides SHOT_SUN) */
export const SHOT_SUN_DIR: Record<number, [number, number, number]> = {};
/** per-shot sky stops overriding LOOK[light].sky */
export const SHOT_SKY: Record<number, { c: string[]; e: number[] }> = {};
/** the shot world.ts posed last (read by grade.ts gradeFor, which is called right after world.update for the same layer) */
export const CUR = { id: 0 };
export const lightOf = (id: number): LightName => SHOT_LIGHT[id] ?? SHOTS[id - 1].light;

/** world-only look per light (sky stops by elevation in degrees, cloud palette). All colours are
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
    // hot hazy horizon (warm cream) -> deep blue top
    sky: { c: ["#f2ead8", "#cfe0ee", "#86b3e4", "#4f8cdc", "#3274d0"], e: [0, 3, 9, 18, 40] },
    cloud: { lit: "#fffcf4", mid: "#e6e9f3", shade: "#bcc6ea" },
    bounce: [0.04, 0.022, 0],
    sat: 1.04,
    skyTex: 0.05,
  },
  spring: {
    sky: { c: ["#eef2ec", "#c6dcef", "#82b0e6", "#5592de", "#3a7bd4"], e: [0, 3, 9, 18, 40] },
    cloud: { lit: "#fffaf0", mid: "#e6eaf4", shade: "#bcc8ee" },
    bounce: [0.04, 0.025, 0],
    sat: 1.05,
    skyTex: 0.05,
  },
};
