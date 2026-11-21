// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Look values from the missile / bridge / emu look passes (look_reports/lighting.md, grade.md, depth.md): warm lit side,
// low-chroma cool shade, albedo floor, practical lights kept by shade.ts, sun cookie, backlight rim, corner AO,
// exponential key-tinted haze, painted sky with sun glow. The bat short's mood arc over the 15 shots:
//   1, 15  "night": moonlit, deep blue sky, a big pale moon + stars, cool moon key, cool rim on the cards
//   2, 3   "dusk": desert sunset, amber / peach key and sky, BLUE shadows (never pink)
//   8-13   "day": bright desert day (deep blue top, pale horizon, warm key)
//   4-6    "interior": warm workshop / office lamplight with a window key; 7 "lab": cool; 14 "office": grey, dusk window
import type { Light } from "./story";
import { SHOTS, SPOT } from "./story";
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
  bloomI: number; bloomR: number; // bloom intensity / radius (Bat.tsx reads them per shot)
  bloomT?: number;   // bloom MAX-channel threshold for this mood (Bat.tsx default 1.45)
  softM: number;     // shadow penumbra in world metres (world.ts sizes the PCF-soft shadow map from it)
  haze: Haze;        // exponential, height-pooled, saturation-keeping haze (replaces the linear fog in shade.ts)
  glowCol: string; glowK: number; // sky glow toward the sun (painted sky, world.ts)
  // ---- bat short ----
  moon?: number;     // > 0: the sun disc is a big pale moon of this angular radius (deg); stars come out
  cardGain?: number; // character card brightness (cardshade.ts uGain; 1 = faces ~.93)
  cardRim?: C3;      // rim colour on the cards' sun-facing edge (default warm, golden / dusk)
  cardRimK?: number; // force the card rim on (night: a cool moon rim)
  bg?: string;       // interiors: background colour behind the room shell
};
const H = (col: string, start: number, len: number, h: number, max: number, sat = 0.6): Haze => ({ col, start, len, h, max, sat });
export const LIGHTS: Record<LightName, LightPreset> = {
  day: {
    // warm key (lit neutrals hue 60-85 deg), low-chroma blue-violet shade, from behind the camera's right shoulder
    az: 122, el: 46,
    lit: [1.42, 1.26, 1.0], shade: [0.3, 0.29, 0.37], lift: [0.04, 0.045, 0.075], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.95, 0.88], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.6], actorShadow: false,
    top: "#3e7fd2", hor: "#dfe8ee", skyCurve: [0.0, 0.5, 0.6], fog: "#d9e4ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#c9a070", hemiI: 0.4,
    bias: -0.00025, normalBias: 0.015,
    albFloor: [0.03, 0.03, 0.042], gobo: 0.45, goboScale: 6, rim: [0, 0, 0], ao: 0.1, aoR: 0.7, prac: 1, pracCol: "#ffb048",
    bloomI: 0.7, bloomR: 0.65, softM: 0.16,
    haze: H("#dfe6ec", 40, 230, 60, 0.65), glowCol: "#fff6e0", glowK: 0.22,
  },
  dusk: {
    // desert sunset: low amber key from the side / behind, peach haze, BLUE shade (no rose), warm rim on the cards
    az: 30, el: 7,
    lit: [1.66, 1.14, 0.64], shade: [0.15, 0.2, 0.38], lift: [0.03, 0.05, 0.13], lambert: 0.35, sideK: 0.82, term: 0.08,
    charTint: [1.0, 0.84, 0.66], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.8, 0.84, 1.0],
    blob: [0.7, 0.74, 0.92], actorShadow: true,
    top: "#3d5ca0", hor: "#ffc46e", skyCurve: [0.05, 0.6, 1.0], fog: "#f2b882", fogNear: 40, fogFar: 380, sunDisc: "#ffd49a",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#a8b4d0", ground: "#7a6050", hemiI: 0.45,
    bias: -0.0006, normalBias: 0.03,
    albFloor: [0.03, 0.03, 0.05], gobo: 0, goboScale: 9, rim: [1.0, 0.62, 0.32], ao: 0.08, aoR: 0.7, prac: 1.8, pracCol: "#ffa040",
    bloomI: 0.85, bloomR: 0.7, softM: 0.26,
    haze: H("#f0b886", 40, 220, 40, 0.45), glowCol: "#ffd890", glowK: 0.6,
  },
  night: {
    // moonlight: cool silver-blue key from the moon (usually ahead: a cool rim), deep blue shade, a cool card rim
    az: -12, el: 26,
    lit: [0.72, 0.86, 1.22], shade: [0.1, 0.13, 0.27], lift: [0.02, 0.03, 0.09], lambert: 0.35, sideK: 0.84, term: 0.12,
    charTint: [0.74, 0.84, 1.0], charShade: 0.82, charGrad: 0.1, bodyGrad: 0.26, sideTint: [0.8, 0.86, 1.0],
    blob: [0.6, 0.66, 0.86], actorShadow: false,
    top: "#0c1a44", hor: "#3a5890", skyCurve: [0.05, 0.6, 1.0], fog: "#2c4478", fogNear: 40, fogFar: 380, sunDisc: "#f6f0d6",
    sunCol: "#c8dcff", sunI: 2.2, sky: "#4a6aa8", ground: "#2a2a44", hemiI: 0.35,
    bias: -0.0005, normalBias: 0.03,
    albFloor: [0.025, 0.03, 0.06], gobo: 0, goboScale: 9, rim: [0.45, 0.62, 1.1], ao: 0.08, aoR: 0.7, prac: 2.0, pracCol: "#ffb060",
    bloomI: 0.9, bloomR: 0.7, softM: 0.3,
    haze: H("#2f4a82", 40, 260, 50, 0.55), glowCol: "#9ab8f0", glowK: 0.4,
    moon: 4.2, cardGain: 0.86, cardRim: [0.42, 0.62, 1.15], cardRimK: 1,
  },
  interior: {
    // warm workshop / office: a sunny window key from screen right, lamps, warm walls, cool-grey shade (not brown)
    az: 118, el: 38,
    lit: [1.5, 1.24, 0.9], shade: [0.27, 0.25, 0.33], lift: [0.04, 0.04, 0.07], lambert: 0.4, sideK: 0.86, term: 0.25,
    charTint: [1.0, 0.92, 0.82], charShade: 0.88, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.88, 0.88, 0.98],
    blob: [0.6, 0.58, 0.64], actorShadow: true,
    top: "#3a2a24", hor: "#3a2a24", skyCurve: [0, 0.5, 0.6], fog: "#4a3a34", fogNear: 40, fogFar: 300, sunDisc: "#000000",
    sunCol: "#ffe2b8", sunI: 2.6, sky: "#f0d8b8", ground: "#6a4a3a", hemiI: 0.4,
    bias: -0.0004, normalBias: 0.012,
    albFloor: [0.035, 0.03, 0.035], gobo: 0, goboScale: 4, rim: [0, 0, 0], ao: 0.22, aoR: 0.8, prac: 1.6, pracCol: "#ffc878",
    bloomI: 0.75, bloomR: 0.65, softM: 0.06,
    haze: H("#5a4438", 30, 200, 40, 0), glowCol: "#ffe0b0", glowK: 0, bg: "#2e221e",
  },
  lab: {
    // cool lab: daylight from tall windows, teal-white tiles, the glowing flasks are the hero colour
    az: 112, el: 44,
    lit: [1.16, 1.3, 1.42], shade: [0.18, 0.25, 0.34], lift: [0.03, 0.05, 0.08], lambert: 0.4, sideK: 0.86, term: 0.25,
    charTint: [0.92, 0.98, 1.0], charShade: 0.88, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.86, 0.92, 1.0],
    blob: [0.58, 0.62, 0.68], actorShadow: true,
    top: "#1e2a30", hor: "#1e2a30", skyCurve: [0, 0.5, 0.6], fog: "#2a3a40", fogNear: 40, fogFar: 300, sunDisc: "#000000",
    sunCol: "#e8f4ff", sunI: 2.6, sky: "#cfe6f0", ground: "#3a4a4a", hemiI: 0.4,
    bias: -0.0004, normalBias: 0.012,
    albFloor: [0.03, 0.035, 0.04], gobo: 0, goboScale: 4, rim: [0, 0, 0], ao: 0.2, aoR: 0.8, prac: 1.6, pracCol: "#b8ffcc",
    bloomI: 0.85, bloomR: 0.65, softM: 0.06,
    haze: H("#2a3a40", 30, 200, 40, 0), glowCol: "#ffffff", glowK: 0, bg: "#1a2428",
  },
  office: {
    // grey War Department office at dusk: a low amber window key from behind-left, grey-blue shade, a desk lamp
    az: 62, el: 16,
    lit: [1.56, 1.12, 0.74], shade: [0.2, 0.23, 0.32], lift: [0.03, 0.04, 0.08], lambert: 0.4, sideK: 0.86, term: 0.2,
    charTint: [1.0, 0.9, 0.8], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.24, sideTint: [0.84, 0.86, 0.98],
    blob: [0.6, 0.6, 0.68], actorShadow: true,
    top: "#2a2c34", hor: "#2a2c34", skyCurve: [0, 0.5, 0.6], fog: "#34363e", fogNear: 40, fogFar: 300, sunDisc: "#000000",
    sunCol: "#ffc890", sunI: 3.2, sky: "#b8b8c8", ground: "#4a4a50", hemiI: 0.4,
    bias: -0.0004, normalBias: 0.012,
    albFloor: [0.035, 0.035, 0.04], gobo: 0, goboScale: 4, rim: [0.8, 0.5, 0.3], ao: 0.22, aoR: 0.8, prac: 1.5, pracCol: "#ffd090",
    bloomI: 0.8, bloomR: 0.65, softM: 0.08,
    haze: H("#34363e", 30, 200, 40, 0), glowCol: "#ffffff", glowK: 0, bg: "#24262c",
    cardRim: [0.95, 0.55, 0.22],
  },
};

/** which preset each shot uses (story.ts SHOTS[].light is the source; this table may refine it) */
export const SHOT_LIGHT: Record<number, LightName> = {};
/** per-shot sun (camera-relative az / el, degrees). Day heroes face a warm key from behind the lens' shoulder; dusk
 *  and night shots are backlit (rim + sun / moon in frame where the lens faces it). */
export const SHOT_SUN: Record<number, { az: number; el: number }> = {
  1: { az: -8, el: 24 }, 2: { az: 22, el: 7 }, 3: { az: -18, el: 6 },
  4: { az: 120, el: 38 }, 5: { az: 105, el: 42 }, 6: { az: 128, el: 36 }, 7: { az: 115, el: 44 },
  8: { az: 125, el: 48 }, 9: { az: 120, el: 50 }, 10: { az: 125, el: 60 }, 11: { az: 132, el: 46 }, 12: { az: 125, el: 45 }, 13: { az: 128, el: 45 },
  14: { az: 58, el: 16 },
};
/** a second, later sun for a shot: from frame [0] on (a reverse-angle key) the sun is re-frozen camera-relative */
export const SHOT_SUN_FROM: Record<number, [number, { az: number; el: number }]> = { 4: [430, { az: 115, el: 42 }], 13: [1365, { az: 125, el: 42 }] };
/** absolute world direction TOWARD the sun / moon for a shot (overrides SHOT_SUN): shot 15's moon sits behind the medal
 *  bat on the dolly line from the cave, a little lower so the bat hangs over its top edge */
export const SHOT_SUN_DIR: Record<number, [number, number, number]> = (() => {
  const L = SPOT.LIP15, c = SPOT.CAM15, d = [L[0] - c[0], L[1] - 0.22 - c[1] - 1.1, L[2] - c[2]], n = Math.hypot(d[0], d[1], d[2]);
  return { 15: [d[0] / n, d[1] / n, d[2] / n] };
})();
/** per-shot sky stops overriding LOOK[light].sky */
export const SHOT_SKY: Record<number, { c: string[]; e: number[] }> = {
  13: { c: ["#c9b8a0", "#b8b4b0", "#9aa8bc", "#6e8cbc", "#4a74b8"], e: [0, 4, 11, 22, 45] }, // smoke-dimmed day
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
    sky: { c: ["#eae6dc", "#c4d8ec", "#86b3e4", "#5a95dc", "#3e7fd2"], e: [0, 3, 9, 18, 40] }, // desert sky: pale warm horizon -> deep blue
    cloud: { lit: "#fbf8f1", mid: "#e1e7f3", shade: "#b9c6ee" },
    bounce: [0.03, 0.018, 0],
    sat: 1.0,
    skyTex: 0.05,
  },
  dusk: {
    // amber horizon, peach band, then straight into clean blue (no rose / lilac stop)
    sky: { c: ["#ffbe62", "#ffb26c", "#f6be8a", "#8ea6cc", "#3d5ca0"], e: [0, 3, 8, 20, 46] },
    cloud: { lit: "#ffd49a", mid: "#e8a874", shade: "#6f7eae" },
    bounce: [0.05, 0.025, 0.0],
    sat: 1.04,
    skyTex: 0.07,
  },
  night: {
    sky: { c: ["#3a5890", "#2c4a86", "#1f3a74", "#152a5c", "#0c1a44"], e: [0, 4, 12, 26, 55] },
    cloud: { lit: "#8fa2cc", mid: "#5a6ca0", shade: "#2e3a6a" },
    bounce: [0.0, 0.01, 0.03],
    sat: 1.02,
    skyTex: 0.06,
  },
  interior: { sky: { c: ["#3a2a24", "#3a2a24", "#3a2a24", "#3a2a24", "#3a2a24"], e: [0, 3, 9, 18, 40] }, cloud: { lit: "#ffffff", mid: "#ffffff", shade: "#ffffff" }, bounce: [0.04, 0.025, 0.01], sat: 1.04, skyTex: 0 },
  lab: { sky: { c: ["#1e2a30", "#1e2a30", "#1e2a30", "#1e2a30", "#1e2a30"], e: [0, 3, 9, 18, 40] }, cloud: { lit: "#ffffff", mid: "#ffffff", shade: "#ffffff" }, bounce: [0.0, 0.02, 0.03], sat: 1.04, skyTex: 0 },
  office: { sky: { c: ["#2a2c34", "#2a2c34", "#2a2c34", "#2a2c34", "#2a2c34"], e: [0, 3, 9, 18, 40] }, cloud: { lit: "#ffffff", mid: "#ffffff", shade: "#ffffff" }, bounce: [0.03, 0.02, 0.01], sat: 0.98, skyTex: 0 },
};
