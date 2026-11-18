// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
// Missile short: four presets for the story arc (story.ts SHOTS[].light): golden sunrise hook, bright day for the launch
// and Mayport, golden + dusk on the road, warm "interior" for the post office and the museum (there the "sun" is the
// window key light; build.ts makes room shells non-shadow-casting so it reaches inside).
import type { Light } from "./story";
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
export const LIGHTS: Record<Light, LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  dusk: {
    // sun just under a band of orange cloud, cool violet world, warm rim; the explosion puff and flame glow over it
    az: 10, el: 4,
    lit: [1.25, 0.62, 0.38], shade: [0.13, 0.13, 0.27], lift: [0.05, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.08,
    charTint: [0.95, 0.76, 0.66], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.82, 0.78, 0.95],
    blob: [0.72, 0.7, 0.9], actorShadow: true,
    top: "#2a2f6a", hor: "#ff9a6a", skyCurve: [0.05, 0.6, 1.0], fog: "#c98377", fogNear: 40, fogFar: 380, sunDisc: "#ff9a62",
    sunCol: "#ff9a5a", sunI: 4.5, sky: "#9a88b8", ground: "#5a4a60", hemiI: 0.45,
    bias: -0.0006, normalBias: 0.03,
  },
  interior: {
    // warm practical / window key from upper screen-right, soft warm shade (no blue sky fill indoors)
    az: 70, el: 38,
    lit: [1.42, 1.28, 1.05], shade: [0.42, 0.36, 0.38], lift: [0.08, 0.06, 0.05], lambert: 0.3, sideK: 0.86, term: 0.25,
    charTint: [1.0, 0.94, 0.86], charShade: 0.88, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.94, 0.9, 0.92],
    blob: [0.6, 0.55, 0.55], actorShadow: false,
    top: "#e8d2b0", hor: "#e8d2b0", skyCurve: [0, 0.5, 0.6], fog: "#e8d2b0", fogNear: 80, fogFar: 900, sunDisc: "#000000",
    sunCol: "#fff0d6", sunI: 2.6, sky: "#ffe8cc", ground: "#8a6a50", hemiI: 0.55,
    bias: -0.0003, normalBias: 0.012,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<Light, WorldLook> = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
  dusk: {
    sky: { c: ["#ff9a6a", "#e9787a", "#a8648a", "#55508e", "#22285e"], e: [0, 3, 9, 20, 45] },
    water: { near: "#1a2350", mid: "#2c3570", far: "#d9806e", crest: "#c97a80", trough: "#10173a", glint: "#ffc08a", shade: [0.4, 0.42, 0.7] },
    cloud: { lit: "#ffb08a", mid: "#c47a8c", shade: "#5a4f84" },
    bounce: [0.05, 0.02, 0.02],
    sat: 1.08,
  },
  interior: {
    // never seen indoors (the rooms are closed); kept warm so a stray gap reads as a lit wall, not sky
    sky: { c: ["#e8d2b0", "#e8d2b0", "#e2c8a2", "#dcc09a", "#d6b892"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0.03, 0.02, 0.0],
    sat: 1.05,
  },
};
