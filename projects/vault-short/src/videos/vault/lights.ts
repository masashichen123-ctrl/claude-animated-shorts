// Light presets of "The Time Lock". The key (sun / moon) is CAMERA-RELATIVE and frozen per shot or per sun key (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Look values from the missile / bridge / emu / bat look passes (look_reports/lighting.md, grade.md, depth.md): warm lit
// side, low-chroma cool shade, albedo floor, sun cookie, corner AO, exponential key-tinted haze, painted sky with sun glow.
// The vault short's mood arc (lead's rules: real colour separation, deep navy night with a warm moon, warm candle / lamp
// glow as the hero accent, cool rim on the cards; day scenes with a deep blue sky):
//   night    the moonlit 1870s street: silver-blue key, navy sky, cream moon + stars, warm lamp windows, cool card rim
//   candle   night interiors (bedroom, the bank hall): moonlight through tall windows, warm candle practicals as the hero
//   interior Sargent's workshop: warm window key + lamps
//   day      Morrison, Illinois (1874) and the street of banks: bright, deep blue sky, warm key
//   modern   the gleaming modern vault: bright cool-white light, chrome
import type { Light } from "./story";
import { SHOTS, lightAt } from "./story";
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
    az: 122, el: 48,
    lit: [1.46, 1.27, 0.96], shade: [0.3, 0.29, 0.38], lift: [0.04, 0.045, 0.08], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.95, 0.88], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.6], actorShadow: false,
    top: "#3e7fd2", hor: "#dfe8ee", skyCurve: [0.0, 0.5, 0.6], fog: "#d9e4ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#c9a070", hemiI: 0.4,
    bias: -0.00025, normalBias: 0.015,
    albFloor: [0.03, 0.03, 0.042], gobo: 0.3, goboScale: 6, rim: [0, 0, 0], ao: 0.1, aoR: 0.7, prac: 1, pracCol: "#ffb048",
    bloomI: 0.7, bloomR: 0.65, softM: 0.16,
    haze: H("#e4e4dc", 60, 260, 60, 0.55), glowCol: "#fff2d0", glowK: 0.26,
  },
  night: {
    // moonlight: cool silver-blue key, deep blue shade (coloured, never black), a cool card rim; the moon is a warm cream disc
    az: 125, el: 34,
    lit: [0.86, 0.92, 1.08], shade: [0.1, 0.13, 0.28], lift: [0.03, 0.045, 0.12], lambert: 0.35, sideK: 0.86, term: 0.14,
    charTint: [0.8, 0.88, 1.0], charShade: 0.84, charGrad: 0.1, bodyGrad: 0.26, sideTint: [0.8, 0.86, 1.0],
    blob: [0.55, 0.62, 0.82], actorShadow: true,
    top: "#0a1640", hor: "#34508c", skyCurve: [0.05, 0.6, 1.0], fog: "#243a70", fogNear: 40, fogFar: 380, sunDisc: "#f6ecc8",
    sunCol: "#bcd4ff", sunI: 2.6, sky: "#4a6aa8", ground: "#2a2c4c", hemiI: 0.45,
    bias: -0.0005, normalBias: 0.03,
    albFloor: [0.04, 0.05, 0.09], gobo: 0, goboScale: 9, rim: [0.16, 0.22, 0.42], ao: 0.08, aoR: 0.7, prac: 2.4, pracCol: "#ffb060",
    bloomI: 0.95, bloomR: 0.7, softM: 0.3,
    haze: H("#1e3064", 40, 240, 50, 0.5), glowCol: "#8a9ac8", glowK: 0.3,
    moon: 4.2, cardGain: 0.9, cardRim: [0.42, 0.62, 1.15], cardRimK: 1,
  },
  candle: {
    // a night interior: cool moonlight through tall windows (blue pools on the floor), deep indigo shade, warm candle practicals
    az: 118, el: 40,
    lit: [0.78, 0.9, 1.15], shade: [0.11, 0.13, 0.27], lift: [0.04, 0.05, 0.12], lambert: 0.4, sideK: 0.88, term: 0.16,
    charTint: [0.86, 0.9, 1.0], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.24, sideTint: [0.82, 0.86, 1.0],
    blob: [0.56, 0.6, 0.78], actorShadow: true,
    top: "#10163a", hor: "#10163a", skyCurve: [0, 0.5, 0.6], fog: "#1a2048", fogNear: 40, fogFar: 300, sunDisc: "#000000",
    sunCol: "#b8d0ff", sunI: 2.9, sky: "#5a6aa8", ground: "#2e2848", hemiI: 0.42,
    bias: -0.0004, normalBias: 0.02,
    albFloor: [0.045, 0.05, 0.095], gobo: 0, goboScale: 4, rim: [0.12, 0.16, 0.34], ao: 0.2, aoR: 0.8, prac: 3.0, pracCol: "#ffb860",
    bloomI: 0.95, bloomR: 0.7, softM: 0.08,
    haze: H("#1a2048", 30, 200, 40, 0), glowCol: "#8a9ac8", glowK: 0, bg: "#10163a",
    cardGain: 0.92, cardRim: [0.5, 0.64, 1.1], cardRimK: 1,
  },
  interior: {
    // warm workshop: a golden window key from screen right, lamps, warm walls, cool blue-violet shade (not brown)
    az: 118, el: 38,
    lit: [1.5, 1.24, 0.9], shade: [0.26, 0.26, 0.38], lift: [0.04, 0.045, 0.085], lambert: 0.4, sideK: 0.86, term: 0.25,
    charTint: [1.0, 0.92, 0.82], charShade: 0.88, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.88, 0.88, 0.98],
    blob: [0.6, 0.58, 0.64], actorShadow: true,
    top: "#3a2a24", hor: "#3a2a24", skyCurve: [0, 0.5, 0.6], fog: "#4a3a34", fogNear: 40, fogFar: 300, sunDisc: "#000000",
    sunCol: "#ffd9a0", sunI: 2.7, sky: "#f0d8b8", ground: "#6a4a3a", hemiI: 0.45,
    bias: -0.0004, normalBias: 0.012,
    albFloor: [0.035, 0.03, 0.04], gobo: 0, goboScale: 4, rim: [0, 0, 0], ao: 0.22, aoR: 0.8, prac: 1.8, pracCol: "#ffc070",
    bloomI: 0.8, bloomR: 0.65, softM: 0.06,
    haze: H("#5a4438", 30, 200, 40, 0), glowCol: "#ffe0b0", glowK: 0, bg: "#2e221e",
  },
  modern: {
    // the gleaming modern vault: bright cool-white light, soft blue shade, crisp
    az: 110, el: 50,
    lit: [1.3, 1.34, 1.42], shade: [0.34, 0.4, 0.58], lift: [0.05, 0.06, 0.1], lambert: 0.4, sideK: 0.9, term: 0.25,
    charTint: [0.96, 0.98, 1.0], charShade: 0.9, charGrad: 0.08, bodyGrad: 0.2, sideTint: [0.88, 0.92, 1.0],
    blob: [0.6, 0.64, 0.74], actorShadow: true,
    top: "#2a3a4a", hor: "#2a3a4a", skyCurve: [0, 0.5, 0.6], fog: "#c8d6e4", fogNear: 40, fogFar: 300, sunDisc: "#000000",
    sunCol: "#f4f8ff", sunI: 2.8, sky: "#dce8f8", ground: "#b8c4d4", hemiI: 0.6,
    bias: -0.0004, normalBias: 0.012,
    albFloor: [0.05, 0.055, 0.07], gobo: 0, goboScale: 4, rim: [0, 0, 0], ao: 0.18, aoR: 0.8, prac: 1.4, pracCol: "#d8f0ff",
    bloomI: 0.9, bloomR: 0.65, softM: 0.08,
    haze: H("#c8d6e4", 30, 200, 40, 0), glowCol: "#ffffff", glowK: 0, bg: "#c8d6e4",
  },
};

/** which preset each shot uses (story.ts lightAt is the source; this table may refine it) */
export const SHOT_LIGHT: Record<number, LightName> = {};
/** the key (sun / moon) of a shot, from a frame on. az / el are CAMERA-RELATIVE degrees (az 0 = straight ahead = backlight,
 *  +90 = screen right, 180 = behind the lens), or `dir` = an absolute world direction TOWARD the light. The last key whose
 *  `from` <= f is used; each key is frozen over its range. */
export type SunKey = { from: number; az?: number; el?: number; dir?: [number, number, number] };
export const SUN_KEYS: Record<number, SunKey[]> = {
  1: [{ from: 0, dir: [-0.62, 0.52, 0.5] }, { from: 150, dir: [-0.7, 0.5, 0.55] }],         // street: moon behind-left of the lens; bedroom: window moon
  2: [{ from: 183, dir: [-0.7, 0.5, 0.55] }, { from: 275, dir: [0.2, 0.4, 0.9] }],         // the march: the moon ahead, backlit
  3: [{ from: 330, dir: [-0.62, 0.52, 0.55] }],
  4: [{ from: 455, dir: [-0.62, 0.52, 0.55] }],
  5: [{ from: 522, dir: [0.75, 0.42, 0.5] }],
  6: [{ from: 695, dir: [0.7, 0.5, 0.6] }],
  7: [{ from: 775, dir: [0.7, 0.55, 0.55] }],
  8: [{ from: 935, az: 125, el: 46 }, { from: 1004, az: 118, el: 48 }, { from: 1055, az: 120, el: 44 }],
  9: [{ from: 1114, dir: [-0.62, 0.52, 0.55] }],
  10: [{ from: 1241, dir: [-0.62, 0.52, 0.55] }],
  11: [{ from: 1373, az: 128, el: 46 }],
  12: [{ from: 1430, dir: [-0.35, 0.75, 0.55] }],
};
/** per-shot sky stops overriding LOOK[light].sky */
export const SHOT_SKY: Record<number, { c: string[]; e: number[] }> = {};
/** the shot / frame world.ts posed last (read by grade.ts gradeFor, which is called right after world.update for the same layer) */
export const CUR = { id: 0, f: 0 };
export const lightOf = (id: number, f?: number): LightName => SHOT_LIGHT[id] ?? lightAt(id, f ?? SHOTS[id - 1].a);

/** world-only look per light (sky stops by elevation in degrees, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
  skyTex: number;                                             // painted sky noise amplitude (depth.md 3.3)
};
const IND = { sky: { c: ["#3a2a24", "#3a2a24", "#3a2a24", "#3a2a24", "#3a2a24"], e: [0, 3, 9, 18, 40] }, cloud: { lit: "#ffffff", mid: "#ffffff", shade: "#ffffff" }, skyTex: 0 };
export const LOOK: Record<LightName, WorldLook> = {
  day: {
    // warm cream horizon -> deep blue top
    sky: { c: ["#f2ead8", "#cfe0ee", "#86b3e4", "#4f8cdc", "#2f6fd0"], e: [0, 3, 9, 18, 40] },
    cloud: { lit: "#fffcf4", mid: "#e6e9f3", shade: "#bcc6ea" },
    bounce: [0.04, 0.022, 0],
    sat: 1.08,
    skyTex: 0.05,
  },
  night: {
    sky: { c: ["#34508c", "#223a78", "#162a60", "#0e1c4c", "#08123a"], e: [0, 4, 10, 22, 48] },
    cloud: { lit: "#6a78a8", mid: "#44507e", shade: "#262e58" },
    bounce: [0.0, 0.012, 0.035],
    sat: 1.06,
    skyTex: 0.06,
  },
  candle: { ...IND, bounce: [0.0, 0.01, 0.03], sat: 1.06 },
  interior: { ...IND, bounce: [0.04, 0.025, 0.01], sat: 1.06 },
  modern: { ...IND, bounce: [0.02, 0.03, 0.05], sat: 1.0 },
};
