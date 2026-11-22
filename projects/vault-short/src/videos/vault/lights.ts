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
    albFloor: [0.03, 0.03, 0.042], gobo: 0.3, goboScale: 6, rim: [0, 0, 0], ao: 0.1, aoR: 0.7, prac: 1, pracCol: "#ffb048",
    bloomI: 0.7, bloomR: 0.65, softM: 0.16,
    haze: H("#e4e4dc", 60, 260, 60, 0.55), glowCol: "#fff2d0", glowK: 0.26,
  },
  overcast: {
    // the swamp town: soft grey-blue overcast with blue breaks; low contrast, cool lit side, cool shade
    az: 122, el: 56,
    lit: [1.26, 1.2, 1.08], shade: [0.42, 0.42, 0.5], lift: [0.05, 0.055, 0.085], lambert: 0.3, sideK: 0.88, term: 0.3,
    charTint: [0.98, 0.96, 0.94], charShade: 0.9, charGrad: 0.05, bodyGrad: 0.16, sideTint: [0.92, 0.92, 0.98],
    blob: [0.66, 0.64, 0.7], actorShadow: false,
    top: "#4a7cc0", hor: "#cfd8de", skyCurve: [0.0, 0.5, 0.6], fog: "#c9d3d8", fogNear: 20, fogFar: 260, sunDisc: "#000000",
    sunCol: "#f0f2f4", sunI: 2.2, sky: "#d4e0ee", ground: "#8a7a5a", hemiI: 0.5,
    bias: -0.00025, normalBias: 0.015,
    albFloor: [0.035, 0.035, 0.045], gobo: 0.5, goboScale: 7, rim: [0, 0, 0], ao: 0.12, aoR: 0.8, prac: 1, pracCol: "#ffb048",
    bloomI: 0.6, bloomR: 0.65, softM: 0.3,
    haze: H("#cfd8da", 25, 150, 40, 0.7), glowCol: "#eef2f4", glowK: 0.12,
  },
  interior: {
    // warm hall / office: a sunny window key from screen right, lamps, warm walls, cool-grey shade (not brown)
    az: 118, el: 38,
    lit: [1.5, 1.24, 0.9], shade: [0.27, 0.25, 0.33], lift: [0.04, 0.04, 0.07], lambert: 0.4, sideK: 0.86, term: 0.25,
    charTint: [1.0, 0.92, 0.82], charShade: 0.88, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.88, 0.88, 0.98],
    blob: [0.6, 0.58, 0.64], actorShadow: true,
    top: "#3a2a24", hor: "#3a2a24", skyCurve: [0, 0.5, 0.6], fog: "#4a3a34", fogNear: 40, fogFar: 300, sunDisc: "#000000",
    sunCol: "#ffe2b8", sunI: 2.6, sky: "#f0d8b8", ground: "#6a4a3a", hemiI: 0.5,
    bias: -0.0004, normalBias: 0.012,
    albFloor: [0.035, 0.03, 0.035], gobo: 0, goboScale: 4, rim: [0, 0, 0], ao: 0.22, aoR: 0.8, prac: 1.6, pracCol: "#ffc878",
    bloomI: 0.75, bloomR: 0.65, softM: 0.06,
    haze: H("#5a4438", 30, 200, 40, 0), glowCol: "#ffe0b0", glowK: 0, bg: "#2e221e",
  },
  warm: {
    // the cutaway dollhouse in the street: a bright warm key from the front (the rooms are open to the lens), blue sky
    az: 128, el: 44,
    lit: [1.5, 1.3, 0.98], shade: [0.34, 0.32, 0.4], lift: [0.05, 0.05, 0.08], lambert: 0.3, sideK: 0.86, term: 0.22,
    charTint: [1.0, 0.94, 0.84], charShade: 0.88, charGrad: 0.06, bodyGrad: 0.18, sideTint: [0.92, 0.9, 0.98],
    blob: [0.64, 0.6, 0.62], actorShadow: false,
    top: "#3e7fd2", hor: "#dfe8ee", skyCurve: [0.0, 0.5, 0.6], fog: "#d9e4ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#c9a070", hemiI: 0.45,
    bias: -0.00025, normalBias: 0.015,
    albFloor: [0.04, 0.035, 0.045], gobo: 0, goboScale: 6, rim: [0, 0, 0], ao: 0.14, aoR: 0.7, prac: 1.4, pracCol: "#ffc070",
    bloomI: 0.75, bloomR: 0.65, softM: 0.16,
    haze: H("#e4e4dc", 60, 260, 60, 0.5), glowCol: "#fff2d0", glowK: 0.2,
  },
  golden: {
    // golden dusk: low amber key from behind the train, peach haze, BLUE shade (no rose), warm rim on the cards
    az: 30, el: 9,
    lit: [1.7, 1.2, 0.68], shade: [0.2, 0.25, 0.42], lift: [0.03, 0.06, 0.12], lambert: 0.35, sideK: 0.82, term: 0.08,
    charTint: [1.0, 0.84, 0.66], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.8, 0.84, 1.0],
    blob: [0.7, 0.74, 0.92], actorShadow: true,
    top: "#3d5ca0", hor: "#ffc46e", skyCurve: [0.05, 0.6, 1.0], fog: "#f2b882", fogNear: 40, fogFar: 380, sunDisc: "#ffd49a",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#a8b4d0", ground: "#7a6050", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
    albFloor: [0.03, 0.03, 0.05], gobo: 0, goboScale: 9, rim: [1.0, 0.62, 0.32], ao: 0.12, aoR: 0.8, prac: 1.8, pracCol: "#ffa040",
    bloomI: 0.85, bloomR: 0.7, softM: 0.26,
    haze: H("#f0b886", 40, 220, 40, 0.45), glowCol: "#ffd890", glowK: 0.45, bg: "#3a2630",
  },
};

/** which preset each shot uses (story.ts SHOTS[].light is the source; this table may refine it) */
export const SHOT_LIGHT: Record<number, LightName> = {};
/** per-shot sun (camera-relative az / el, degrees): a warm key from behind the lens' shoulder; the wides side-lit */
export const SHOT_SUN: Record<number, { az: number; el: number }> = {
  1: { az: 128, el: 46 }, 2: { az: 125, el: 52 }, 3: { az: 130, el: 54 }, 4: { az: 125, el: 52 }, 5: { az: 120, el: 40 },
  6: { az: 125, el: 46 }, 7: { az: 128, el: 44 }, 8: { az: 125, el: 38 }, 9: { az: 140, el: 50 }, 10: { az: 135, el: 48 },
  11: { az: 135, el: 46 }, 12: { az: 128, el: 44 }, 13: { az: 125, el: 44 }, 14: { az: 150, el: 12 },
};
/** a second, later sun for a shot: from frame [0] on (a cut to another set / a reverse angle) the sun is re-frozen
 *  camera-relative */
export const SHOT_SUN_FROM: Record<number, [number, { az: number; el: number }]> = {
  14: [1619, { az: 110, el: 16 }],
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
    // warm cream horizon -> deep blue top
    sky: { c: ["#f2ead8", "#cfe0ee", "#86b3e4", "#4f8cdc", "#2f6fd0"], e: [0, 3, 9, 18, 40] },
    cloud: { lit: "#fffcf4", mid: "#e6e9f3", shade: "#bcc6ea" },
    bounce: [0.04, 0.022, 0],
    sat: 1.06,
    skyTex: 0.05,
  },
  overcast: {
    sky: { c: ["#d6dde0", "#bcccdc", "#7ea6d6", "#5a8ccc", "#4278c4"], e: [0, 3, 9, 18, 40] },
    cloud: { lit: "#eef0f2", mid: "#c3ccd8", shade: "#97a4bc" },
    bounce: [0.03, 0.025, 0.01],
    sat: 1.1,
    skyTex: 0.07,
  },
  interior: { sky: { c: ["#3a2a24", "#3a2a24", "#3a2a24", "#3a2a24", "#3a2a24"], e: [0, 3, 9, 18, 40] }, cloud: { lit: "#ffffff", mid: "#ffffff", shade: "#ffffff" }, bounce: [0.04, 0.025, 0.01], sat: 1.06, skyTex: 0 },
  warm: {
    sky: { c: ["#f2ead8", "#cfe0ee", "#86b3e4", "#4f8cdc", "#2f6fd0"], e: [0, 3, 9, 18, 40] },
    cloud: { lit: "#fffcf4", mid: "#e6e9f3", shade: "#bcc6ea" },
    bounce: [0.05, 0.03, 0],
    sat: 1.06,
    skyTex: 0.05,
  },
  golden: {
    // amber horizon, peach band, then straight into clean blue (no rose / lilac stop)
    sky: { c: ["#ffc27c", "#f4a878", "#a88ab8", "#4a5aa0", "#1f2f78"], e: [0, 5, 14, 28, 55] },
    cloud: { lit: "#ffd49a", mid: "#e8a874", shade: "#6f7eae" },
    bounce: [0.05, 0.025, 0.0],
    sat: 1.06,
    skyTex: 0.07,
  },
};
