// Light presets per time of day / place. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Look pass r1 (look_reports/lighting.md, grade.md, depth.md): warm lit side, low-chroma cool shade, albedo floor (dark
// materials never crush to black), practical lights kept by shade.ts, sun cookie (cloud dapple), backlight rim, corner
// AO, exponential low-lying key-tinted haze, painted sky with sun glow, and a deliberate mood arc over the 15 shots:
//   1-6   sunrise "morning" at sea (warm low sun, peach haze; the launch flame is the first practical)
//   7-11  clear "day" (Florida noon: warm key from behind the camera so the heroes face the light)
//   12    "golden" afternoon on the road, 13 "dusk" (the puff glows against a violet sky)
//   2     "interior" (post office: window key + pendant-lamp pools),
//   14-15 "gallery" (museum epilogue: dim violet hall, warm spot pools on the exhibit, strong falloff)
import type { Light } from "./story";
import { SHOTS } from "./story";
type C3 = [number, number, number];
/** every preset name (story.ts `Light` plus the ones this file adds; see SHOT_LIGHT) */
export type LightName = Light | "morning" | "gallery";
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
  bloomI: number; bloomR: number; // suggested bloom intensity / radius (Missile.tsx owns the effect)
  softM: number;     // shadow penumbra in world metres (world.ts sizes the PCF-soft shadow map from it)
  haze: Haze;        // exponential, height-pooled, saturation-keeping haze (replaces the linear fog in shade.ts)
  glowCol: string; glowK: number; // sky glow toward the sun (painted sky, world.ts)
};
const H = (col: string, start: number, len: number, h: number, max: number, sat = 0.6): Haze => ({ col, start, len, h, max, sat });
export const LIGHTS: Record<LightName, LightPreset> = {
  day: {
    // warm key (lit neutrals hue 60-85 deg), low-chroma blue-violet shade, from behind the camera's right shoulder
    az: 122, el: 46,
    lit: [1.6, 1.43, 1.14], shade: [0.33, 0.31, 0.36], lift: [0.04, 0.045, 0.07], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.95, 0.88], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.6], actorShadow: false,
    top: "#3576d0", hor: "#bfe3fb", skyCurve: [0.0, 0.5, 0.6], fog: "#a9cdf0", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
    albFloor: [0.03, 0.03, 0.042], gobo: 0.6, goboScale: 5, rim: [0, 0, 0], ao: 0.1, aoR: 0.7, prac: 1, pracCol: "#fff2c8",
    bloomI: 0.6, bloomR: 0.6, softM: 0.16,
    haze: H("#a9cdf0", 30, 175, 60, 0.85), glowCol: "#f2f8ff", glowK: 0.25,
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
    haze: H("#f2c4a2", 30, 160, 50, 0.8), glowCol: "#fff0c0", glowK: 0.38,
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
    albFloor: [0.035, 0.03, 0.055], gobo: 0, goboScale: 9, rim: [1.1, 0.6, 0.42], ao: 0.08, aoR: 0.7, prac: 1.6, pracCol: "#ffb070",
    bloomI: 0.9, bloomR: 0.75, softM: 0.26,
    haze: H("#b98290", 20, 140, 40, 0.78), glowCol: "#ffb080", glowK: 0.6,
  },
  interior: {
    // post office: warm window key from upper screen-right, pendant-lamp pools, soft warm shade, gentle falloff
    az: 70, el: 38,
    lit: [1.42, 1.26, 1.0], shade: [0.38, 0.33, 0.36], lift: [0.06, 0.05, 0.05], lambert: 0.35, sideK: 0.84, term: 0.25,
    charTint: [1.0, 0.93, 0.84], charShade: 0.88, charGrad: 0.08, bodyGrad: 0.2, sideTint: [0.94, 0.9, 0.94],
    blob: [0.6, 0.55, 0.55], actorShadow: false,
    top: "#e8d2b0", hor: "#e8d2b0", skyCurve: [0, 0.5, 0.6], fog: "#e8d2b0", fogNear: 80, fogFar: 900, sunDisc: "#000000",
    sunCol: "#fff0d6", sunI: 2.6, sky: "#ffe8cc", ground: "#8a6a50", hemiI: 0.55,
    bias: -0.0003, normalBias: 0.012,
    albFloor: [0.03, 0.028, 0.03], gobo: 0, goboScale: 9, rim: [0, 0, 0], ao: 0.12, aoR: 0.8, prac: 1.5, pracCol: "#ffd9a0",
    bloomI: 0.8, bloomR: 0.7, softM: 0.12,
    haze: H("#e8d2b0", 200, 900, 1000, 0.0), glowCol: "#ffffff", glowK: 0,
  },
  gallery: {
    // museum epilogue: no sun in frame; the directional key is a high skylight / spot, warm spot pools on the exhibit,
    // the hall falls off to violet (border/inner L* ~.6)
    az: 90, el: 78,
    lit: [0.86, 0.75, 0.6], shade: [0.27, 0.25, 0.4], lift: [0.03, 0.03, 0.07], lambert: 0.6, sideK: 0.8, term: 0.4,
    charTint: [1.0, 0.9, 0.8], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.22, sideTint: [0.88, 0.86, 0.96],
    blob: [0.55, 0.52, 0.6], actorShadow: false,
    top: "#2a2433", hor: "#3b3140", skyCurve: [0, 0, 0], fog: "#2e2836", fogNear: 200, fogFar: 2000, sunDisc: "#000000",
    sunCol: "#ffe2bc", sunI: 2.4, sky: "#6a6080", ground: "#4a3a34", hemiI: 0.3,
    bias: -0.0003, normalBias: 0.015,
    albFloor: [0.025, 0.025, 0.035], gobo: 0, goboScale: 9, rim: [0, 0, 0], ao: 0.16, aoR: 1.6, prac: 2.0, pracCol: "#ffdcb0",
    bloomI: 0.9, bloomR: 0.75, softM: 0.12,
    haze: H("#3a3046", 14, 60, 1000, 0.35, 0.2), glowCol: "#ffffff", glowK: 0,
  },
};

/** The lighting arc: which preset each shot uses. story.ts SHOTS[].light still names the old four (cast.ts keys its
 *  contact colours by them); world.ts and grade.ts read lightOf(id), which prefers this table. */
export const SHOT_LIGHT: Record<number, LightName> = {
  1: "morning", 2: "interior", 3: "morning", 4: "morning", 5: "morning", 6: "morning",
  7: "day", 8: "day", 9: "day", 10: "day", 11: "day",
  12: "golden", 13: "dusk", 14: "gallery", 15: "gallery",
};
/** per-shot sun (camera-relative az / el, degrees): overrides story.ts sunAz/sunEl. Heroes face the key except where a
 *  backlit rim is the point (3: the sub against the sunrise, 13: the puff against the dusk sun). */
export const SHOT_SUN: Record<number, { az: number; el: number }> = {
  1: { az: 130, el: 13 },  // missile's cream side lit warm, long shadow
  3: { az: 9, el: 6 },     // backlit sub: sun disc in frame + warm rim on the hull and missile
  4: { az: 118, el: 20 }, 5: { az: 128, el: 22 }, 6: { az: 105, el: 18 },
  7: { az: 115, el: 40 }, 8: { az: 125, el: 44 }, 9: { az: 128, el: 45 }, 10: { az: 125, el: 45 }, 11: { az: 120, el: 44 },
  12: { az: 115, el: 13 },  // the truck's camera side lit amber (was 70: box side in shade)
  13: { az: 35, el: 4 },
};
/** the shot world.ts posed last (read by grade.ts gradeFor, which is called right after world.update for the same layer) */
export const CUR = { id: 0 };
export const lightOf = (id: number): LightName => SHOT_LIGHT[id] ?? SHOTS[id - 1].light;

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
  skyTex: number;                                             // painted sky noise amplitude (depth.md 3.3)
};
// sea (textures.md 1.2): light cyan at the horizon -> deep teal-blue toward the camera, dL* ~ -28
const SEA_DAY = { near: "#0b5f7c", mid: "#14869c", far: "#3aaab6", crest: "#8fd6da", trough: "#08435e", glint: "#ffffff", shade: [0.5, 0.56, 0.72] as C3 };
export const LOOK: Record<LightName, WorldLook> = {
  day: {
    // depth.md 3.3: horizon cyan-ward #bfe3fb -> top #3576d0
    sky: { c: ["#bfe3fb", "#a3d3f7", "#78b6ee", "#5398e2", "#3576d0"], e: [0, 3, 9, 18, 40] },
    water: SEA_DAY,
    cloud: { lit: "#fbf8f1", mid: "#e1e7f3", shade: "#b9c6ee" },
    bounce: [0.02, 0.012, 0],
    sat: 1.0,
    skyTex: 0.05,
  },
  morning: {
    // sunrise: peach horizon, rose through ~10 deg, soft blue overhead
    sky: { c: ["#ffd6a6", "#f8c4a2", "#dcb4b8", "#9fb0d6", "#5f88c6"], e: [0, 4, 11, 22, 45] },
    water: { near: "#0c5674", mid: "#2a7f98", far: "#e2bea4", crest: "#ffd8b8", trough: "#093e58", glint: "#fff2d6", shade: [0.46, 0.5, 0.72] },
    cloud: { lit: "#ffe0c0", mid: "#f0b6a8", shade: "#a99ac8" },
    bounce: [0.04, 0.025, 0.0],
    sat: 1.0,
    skyTex: 0.06,
  },
  golden: {
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.02,
    skyTex: 0.07,
  },
  dusk: {
    sky: { c: ["#ffa874", "#f48c80", "#c87c98", "#7e6caa", "#45428a"], e: [0, 3, 10, 22, 50] },
    water: { near: "#1a2350", mid: "#2c3570", far: "#d9806e", crest: "#c97a80", trough: "#10173a", glint: "#ffc08a", shade: [0.4, 0.42, 0.7] },
    cloud: { lit: "#ffb08a", mid: "#c47a8c", shade: "#5a4f84" },
    bounce: [0.05, 0.02, 0.02],
    sat: 1.04,
    skyTex: 0.08,
  },
  interior: {
    // never seen indoors (the rooms are closed); kept warm so a stray gap reads as a lit wall, not sky
    sky: { c: ["#e8d2b0", "#e8d2b0", "#e2c8a2", "#dcc09a", "#d6b892"], e: [0, 3, 8, 16, 40] },
    water: SEA_DAY,
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0.03, 0.02, 0.0],
    sat: 1.0,
    skyTex: 0,
  },
  gallery: {
    sky: { c: ["#3b3140", "#3b3140", "#332a3a", "#2e2836", "#2a2433"], e: [0, 3, 8, 16, 40] },
    water: SEA_DAY,
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0.02, 0.012, 0.0],
    sat: 0.95,
    skyTex: 0,
  },
};
