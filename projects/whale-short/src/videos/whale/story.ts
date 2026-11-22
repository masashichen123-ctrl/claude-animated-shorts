// Timeline of "The Exploding Whale" (Florence, Oregon, 1970): 16 shots locked to the voice (voice/words.json, SHOTS.md),
// the event frames the sound is timed to, the set anchors shared by sets / cast / cameras, the props that move or grow
// (dynamite, crates, the highway truck, the plunger, the bulldozer, the sand mound, the falling blubber), the camera
// grammar of the template (continuous slow push-ins; symmetric smootherstep glides 18-40 f; big reframes are cuts;
// impacts are 7-frame flip kicks; no hand-held float) and the per-shot depth of field.
//
// CONTRACTS (other owners import these; change them only together with the readers):
//   SetName, Light, ShotDef, SHOTS, XFADE, FLASH_AT, layersAt          -> Whale.tsx, world.ts, cast.ts, build.ts
//   SPOT (set anchors in each set's own local frame; every set sits at the world origin, only one is visible)
//   beachY / lotY / parkY (ground heights), EV (event frames), prop timelines (sticksK, cratesN, truckAt, ...)
//   camAt, keyEnd, kickAt, dofAt, focusAt, FOREGROUND                  -> world.ts, Whale.tsx, build.ts
export const FPS = 30;
export const TOTAL = 1590;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** reference camera ease: symmetric smootherstep (attack = release) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---------------- shots ----------------
/** one THREE.Group per set in build.ts (buildSets); only the active shot's set is visible */
export type SetName = "beach" | "lot" | "park";
/** light presets (lights.ts LIGHTS / LOOK, grade.ts GRADES): bright Oregon-coast day (blue sky, white clouds) for the
 *  1970 story, a warmer full-sun "sunny" for the present-day park */
export type Light = "day" | "sunny";
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: Light };
// frame ranges from SHOTS.md (b = exclusive end)
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 136, set: "beach", light: "day" },      // HOOK: the whale, the Engineer, the plunger, dynamite
  { id: 2, a: 136, b: 198, set: "beach", light: "day" },    // after: the whale still there, the sooty Engineer
  { id: 3, a: 198, b: 334, set: "beach", light: "day" },    // establishing: the coast, crane down to the whale
  { id: 4, a: 334, b: 422, set: "beach", light: "day" },    // the rope snaps; the smell
  { id: 5, a: 422, b: 496, set: "beach", light: "day" },    // the highway truck in the car park
  { id: 6, a: 496, b: 648, set: "beach", light: "day" },    // the boulder idea; stacking the dynamite
  { id: 7, a: 648, b: 768, set: "beach", light: "day" },    // the easel plan; the seagulls in bibs
  { id: 8, a: 768, b: 890, set: "beach", light: "day" },    // the crowd on the dunes; the TV crew
  { id: 9, a: 890, b: 938, set: "beach", light: "day" },    // the plunger
  { id: 10, a: 938, b: 988, set: "beach", light: "day" },   // BOOM
  { id: 11, a: 988, b: 1062, set: "beach", light: "day" },  // it comes down on everyone
  { id: 12, a: 1062, b: 1140, set: "beach", light: "day" }, // the deadpan reporter
  { id: 13, a: 1140, b: 1228, set: "lot", light: "day" },   // the car a quarter mile away
  { id: 14, a: 1228, b: 1322, set: "beach", light: "day" }, // most of the whale is still there
  { id: 15, a: 1322, b: 1458, set: "beach", light: "day" }, // they buried it
  { id: 16, a: 1458, b: TOTAL, set: "park", light: "sunny" }, // today: the park, the wink
];
/** 5-frame anchored dissolves (place / time changes); a white flash after the hook */
export const XFADE: Record<number, number> = { 3: 5, 16: 5 };
export const FLASH_AT = 134;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** layers to draw at frame f: base shot, plus the next shot fading in during a crossfade */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- event frames (SHOTS.md, locked: the sound is timed to them) ----------------
export const EV = {
  DYN1: 114,        // "dynamite": the sticks pop up along the whale's back, fuses sparkle
  PLOP2: 169,       // a blubber chunk plops onto the Engineer's hat
  KICK2: 171,
  PEOPLE3: 260,     // "whale": the crane lands on the whale with the tiny people
  SNAP4: 366,       // the rope snaps, the locals tumble
  SMELL4: 403,      // stink lines, pinched noses, the gull faints
  TRUCK5: 440,      // the orange truck pulls up
  CONF5: 466,       // "department": the Engineer steps forward
  BUBBLE6: 558,     // the thought bubble: whale -> boulder
  CUT6: 580,        // the crates of dynamite
  CRATES6: 625,     // 20 crates by "dynamite"
  CUT7: 744,        // the seagulls in bibs
  TV8: 845,         // the reporter + cameraman
  HOLD9: 898,       // the breath-held insert 898-910
  INSERT9: [900, 911] as [number, number],
  PUSH9: 914,       // the plunger goes down
  BOOM10: 960,
  DOWN11: 1020,     // blubber coming DOWN
  SCATTER11: 1034,
  SPLAT12: [1090, 1105] as number[],
  HEAD12: 1118,
  CRUSH13: 1158,
  KICK13: 1160,
  FLEE14: 1255,
  BLINK14: 1300,
  PALM15: 1406,
  CUT15: 1424,
  MOUND15: 1444,
  LAND16: 1547,
  WINK16: 1556,
};

// ---------------- set anchors (each set's local frame = world frame) ----------------
// beach: the shore runs along x; the Pacific is toward -z (waterline z ~ -13), the dunes rise toward +z (crest z ~ 44),
// spruce hills behind them; the rocky headland with the white lighthouse sits up the coast at -x. The whale lies on the
// sand at the origin along x, head toward +x. The beach car park is at +x where the dunes fall away.
export const SPOT = {
  WHALE: [0, 0, 0] as V3, WHALE_L: 14.5, HEAD_H: 4.3,
  PLUNGER: [2.3, 0, 5.4] as V3,             // the plunger box (hook + shot 9)
  ENG1: [3.3, 0, 5.9] as V3,                // the Engineer beside it
  ROPE_TAIL: [-7.9, 2.0, 0.3] as V3,        // where the rope is tied (the tail stock, curled up)
  POST4: [-15.2, 0, 2.6] as V3,             // the post the gull faints off
  TRUCK5: [60, 0, 19] as V3,                // where the truck stops (nose toward -x)
  ENG6: [-0.6, 0, 6.6] as V3,               // the Engineer studying the whale
  CRATES: [-0.6, 0, 2.6] as V3,             // centre of the crate pile against the whale's belly
  EASEL: [5.2, 0, 7.4] as V3, ENG7: [3.85, 0, 7.75] as V3,
  LOG7: [-4.5, 0, 12.5] as V3,              // driftwood log with the seagulls in bibs
  CROWD: [-6, 0, 41] as V3,                 // centre of the crowd on the dune crest (y from beachY)
  REPORTER: [14, 0, 40.5] as V3, CAMERAMAN: [12.0, 0, 38.6] as V3,
  LIGHTHOUSE: [-125, 0, -38] as V3,
  // lot: the distant parking lot, the sedan nose toward +x, the coast + the smoke cloud far off toward -z
  CAR: [0, 0, 0] as V3,
  // park: the pictogram sign, a picnic table, the family
  SIGN: [0.75, 0, 0] as V3, TABLE16: [-3.6, 0, 0.6] as V3, KID16: [-0.3, 0, 2.9] as V3, PARENT16: [-0.95, 0, 2.0] as V3,
};

// ---------------- ground heights shared by build.ts (the terrain) and cast.ts ----------------
const wv = (x: number) => Math.sin(x / 9.1) * 1.1 + Math.sin(x / 4.3 + 1.7) * 0.55 + Math.sin(x / 17 + 0.4) * 0.9;
/** the beach: flat sand (y .3) from z -7 up to the dune foot, sloping under the sea below; dune ridge to y ~7 at z ~44,
 *  falling away at x > 40 for the car park, lower back dunes behind */
export const beachY = (x: number, z: number) => {
  let y = z > -7 ? 0.3 : 0.3 - 0.055 * (-7 - z);
  const ridge = smooth((z - 22) / 20) * (1 - 0.55 * smooth((z - 52) / 14)), keep = 1 - smooth((x - 34) / 12);
  y += ridge * keep * (6.2 + wv(x)) * (0.6 + 0.4 * smooth((z - 22) / 22));
  y += 0.12 * Math.sin(x * 0.7 + z * 0.4) * smooth((z - 4) / 10);  // wind ripples on the upper beach
  return y;
};
/** top of the crowd's dune crest at x (people stand at z ~ 39-43) */
export const crestY = (x: number, z = 41) => beachY(x, z);
export const lotY = (_x: number, _z: number) => 0;
export const parkY = (_x: number, _z: number) => 0;

/** shot 4: the rope runs from the tail toward the lens-left, the locals strung along it in depth */
export const ROPE_DIR: V3 = [-0.42, 0, 0.91];
export const ropeAt = (d: number): V3 => [SPOT.ROPE_TAIL[0] + ROPE_DIR[0] * d, 0, SPOT.ROPE_TAIL[2] + ROPE_DIR[2] * d];
// ---------------- prop timelines ----------------
/** dynamite sticks on the whale's back (hook): 0 hidden .. 1 up (staggered pops from DYN1) */
export const sticksK = (f: number, k: number) => easeOut((f - EV.DYN1 + 2 - k * 1.2) / 5);
/** how many crates stand against the whale at frame f (shot 6 stacking: 20 by CRATES6; 20 from then until the blast) */
export const cratesN = (id: number, f: number) => {
  if (id === 6) return f < EV.CUT6 ? 0 : Math.min(20, 3 + Math.floor((f - EV.CUT6) / ((EV.CRATES6 - EV.CUT6) / 17)));
  if (id === 1) return 6;
  return id >= 7 && id <= 10 ? 20 : 0;
};
/** the highway truck (shot 5): x of its centre, nose toward -x, stops at SPOT.TRUCK5 at TRUCK5 */
export const truckX = (f: number) => SPOT.TRUCK5[0] + 26 * (1 - easeOut((f - 410) / 30)) ** 1.6;
/** the plunger's T-handle: 0 up .. 1 pushed down */
export const plungerK = (id: number, f: number) => (id === 9 ? easeOut((f - EV.PUSH9 + 2) / 4) : id === 10 ? 1 : 0);
/** whale state per shot: intact, bitten (after the blast), buried */
export const whaleState = (id: number, f: number) => (id === 2 || (id === 10 && f >= EV.BOOM10) || id >= 14 ? "bitten" : "intact");
/** the sand mound (shot 15): 0 .. 1 grown over the whale by MOUND15 */
export const moundK = (id: number, f: number) => (id === 15 ? smooth((f - EV.CUT15 - 2) / (EV.MOUND15 - EV.CUT15 - 2)) : 0);
/** the bulldozer (shot 15) pushing sand at the whale from +z: its centre */
export const dozerAt = (f: number): V3 => { const u = smooth((f - EV.CUT15) / 30); return [3.6, 0.3, lerp(11.5, 6.0, u) + 0.4 * Math.sin(f * 0.4) * (1 - u)]; };
/** the sedan (shot 13) flattened from CRUSH13; the falling chunk's height above the roof */
export const carFlat = (f: number) => (f >= EV.CRUSH13 ? 1 : 0);
export const chunk13Y = (f: number) => (f < EV.CRUSH13 ? 1.2 + 44 * ((EV.CRUSH13 - f) / 14) ** 1.7 : 1.05 - 0.15 * Math.exp(-(f - EV.CRUSH13) / 3) * Math.cos((f - EV.CRUSH13) * 1.3));

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
/** push-in factor since f0: the subject grows ~rate per frame; `punch` raises it (8 f soft edges) for the first n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** dolly push: camera slides toward the look point by factor k */
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** zoom push (camera stays put, for long lenses): tan(fov/2) shrinks by k */
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
/** push a shot in from frame f0 at `rate` (punch as in pushK, starting at punchAt) */
const P = (s: Shot, f: number, f0: number, rate = 0.0025, punch = 0, n = 35, punchAt = f0): Shot =>
  dolly(s.pos, s.look, pushK(f, f0, rate) * (punch ? pushK(f, punchAt, 0, punch, n) : 1), { fov: s.fov, roll: s.roll });
const gl = (f: number, f0: number, dur: number) => glide((f - f0) / dur);
/** shot between two camera setups, blended by u (pos / look / fov / roll) */
const between = (a: Cam, b: Cam, u: number): Shot => mix(a, b, u);
const C = (pos: V3, look: V3, fov: number, roll = 0): Cam => ({ pos, look, fov, roll });

/** card heights (cast.ts design: an adult's head top stands ~1.75 m, the head blob is ~0.48 m) */
export const HEAD_TOP = 1.75, HEAD_H = 0.48;
/** eye point of a card standing at p (DOF focus) */
export const eyes = (p: V3, s = 1): V3 => [p[0], p[1] + 1.52 * s, p[2]];
/** ground point on the beach */
export const onB = (x: number, z: number): V3 => [x, beachY(x, z), z];
const by = (x: number, z: number, h: number) => beachY(x, z) + h;

// ---- per-shot cameras ----
// 1 (0-135): low on the sand off the whale's head: the carcass fills the frame, the Engineer + plunger box in front;
// slow push, a punch on "dynamite" as the sticks pop up
const S1 = (f: number): Shot => {
  const a = C([8.2, 1.25, 13.0], [-1.4, 3.0, -0.6], 54, 0.03), b = C([7.6, 1.2, 12.0], [-1.2, 3.0, -0.6], 52, -0.02);
  return P(between(a, b, gl(f, 0, 110)), f, 0, 0.0016, 0.006, 16, EV.DYN1 - 2);
};
// 2 (136-197): after: the sooty Engineer in MS, the smoking whale behind; push on the plop
const S2 = (f: number): Shot => P({ pos: [5.4, by(5.4, 10.6, 1.5), 10.6], look: [2.9, by(2.9, 5.5, 1.55), 5.2], fov: 42, roll: -0.025 }, f, 136, 0.0024, 0.007, 12, EV.PLOP2);
// 3 (198-333): establishing wide down the coast to the headland + lighthouse; crane down onto the whale by "whale"
const S3 = (f: number): Shot => {
  const a = C([48, 24, 40], [-70, 6, -30], 52, 0.02), b = C([16, 4.2, 19], [-1.5, 1.6, -1.5], 46, -0.02);
  return P(between(a, b, gl(f, 210, 48)), f, 198, 0.0024, 0, 16);
};
// 4 (334-421): the tug of war at the tail; the snap; the smell
const S4 = (f: number): Shot => {
  const a = C([-16.2, 1.55, 13.8], [-10.4, 1.15, 4.8], 50, 0.02), b = C([-15.8, 1.5, 13.0], [-10.4, 1.1, 5.0], 50, -0.02);
  return P(between(a, b, gl(f, 380, 24)), f, 334, 0.0018, 0.007, 14, EV.SNAP4 - 2);
};
// 5 (422-495): the car park: the orange truck pulls up, the crew + the Engineer
const S5 = (f: number): Shot => {
  const T = SPOT.TRUCK5, a = C([T[0] - 11, 1.7, T[2] + 11.5], [T[0] - 1.5, 1.7, T[2] - 1], 48, -0.02), b = C([T[0] - 9.5, 1.6, T[2] + 9.0], [T[0] - 3.2, 1.55, T[2] + 0.5], 44, 0.02);
  return P(between(a, b, gl(f, 446, 26)), f, 422, 0.0018, 0.007, 12, EV.CONF5 - 2);
};
// 6a (496-579): over the Engineer's shoulder at the whale, the thought bubble; 6b (580-647): the crates stack up
const S6a = (f: number): Shot => {
  const E = SPOT.ENG6;
  return P({ pos: [E[0] + 2.4, by(E[0] + 2.4, E[2] + 4.6, 1.75), E[2] + 4.6], look: [E[0] - 0.3, by(E[0], E[2], 2.05), E[2] - 1.2], fov: 46, roll: 0.02 }, f, 496, 0.0018, 0.006, 14, EV.BUBBLE6 - 2);
};
const S6b = (f: number): Shot => {
  const Cr = SPOT.CRATES;
  return P({ pos: [Cr[0] + 4.2, 2.3, Cr[2] + 8.4], look: [Cr[0] - 0.2, 1.5, Cr[2] - 0.6], fov: 46, roll: -0.02 }, f, EV.CUT6, 0.0022, 0.006, 12, EV.CRATES6 - 2);
};
// 7a (648-743): the easel presentation; 7b (744-767): the seagulls on the log in bibs
const S7a = (f: number): Shot => {
  const E = SPOT.EASEL, a = C([E[0] - 0.2, 1.6, E[2] + 7.4], [E[0] - 0.75, 1.45, E[2] - 0.2], 46, 0.02), b = C([E[0] - 0.3, 1.6, E[2] + 6.4], [E[0] - 0.7, 1.5, E[2] - 0.2], 46, -0.02);
  return P(between(a, b, gl(f, 690, 30)), f, 648, 0.0018, 0.006, 14, 708);
};
const S7b = (f: number): Shot => {
  const L = SPOT.LOG7, y = beachY(L[0], L[2]);
  return P({ pos: [L[0] + 0.3, y + 0.75, L[2] + 2.9], look: [L[0], y + 0.72, L[2]], fov: 44, roll: 0.02 }, f, EV.CUT7, 0.003);
};
// 8 (768-889): the crowd on the dune crest, from the seaward slope (sky behind them); glide right to the TV crew
const S8 = (f: number): Shot => {
  const Cw = SPOT.CROWD, R = SPOT.REPORTER;
  const a = C([Cw[0] + 13, by(Cw[0] + 13, 37.4, 1.7), 37.4], [Cw[0] - 3, by(Cw[0] - 3, 41.5, 1.3), 41.5], 50, 0.02);
  const b = C([R[0] - 1.4, by(R[0] - 1.4, 34.2, 1.6), 34.2], [R[0] - 1.0, by(R[0] - 1, 39.6, 1.1), 39.6], 50, -0.02);
  return P(between(a, b, gl(f, EV.TV8 - 22, 20)), f, 768, 0.0018, 0.006, 14, 868);
};
// 9 (890-937): the plunger close-up; an insert of the crowd holding its breath; the push
const S9 = (f: number): Shot => {
  const Pl = SPOT.PLUNGER, y = beachY(Pl[0], Pl[2]);
  return P({ pos: [Pl[0] + 1.0, y + 1.25, Pl[2] + 2.3], look: [Pl[0] + 0.2, y + 0.85, Pl[2]], fov: 42, roll: 0.03 }, f, 890, 0.003, 0.009, 10, EV.PUSH9 - 2);
};
const S9i = (f: number): Shot => {
  const Cw = SPOT.CROWD;
  return P({ pos: [Cw[0] + 7.5, by(Cw[0] + 7.5, 38.2, 1.65), 38.2], look: [Cw[0] - 2, by(Cw[0] - 2, 40.6, 1.5), 40.6], fov: 40, roll: -0.02 }, f, EV.INSERT9[0], 0.004);
};
// 10 (938-987): the beach wide from the dune slope; BOOM: the column goes up the frame
const S10 = (f: number): Shot => P({ pos: [9.5, 3.2, 21], look: [-0.5, 9.0, -1], fov: 60, roll: 0.02 }, f, 938, 0.0025, 0.006, 14, EV.BOOM10);
// 11 (988-1061): the crowd from below on the seaward slope, the sky above them where the chunks come down
const S11 = (f: number): Shot => {
  const Cw = SPOT.CROWD, a = C([Cw[0] + 15, by(Cw[0] + 15, 38.0, 1.4), 38.0], [Cw[0] - 2, by(Cw[0] - 2, 41.4, 3.2), 41.4], 54, -0.02);
  const b = C([Cw[0] + 14, by(Cw[0] + 14, 38.2, 1.5), 38.2], [Cw[0] - 2, by(Cw[0] - 2, 41.4, 1.8), 41.4], 52, 0.02);
  return P(between(a, b, gl(f, 1026, 18)), f, 988, 0.0018, 0.006, 12, EV.SCATTER11 - 2);
};
// 12 (1062-1139): the reporter to camera, chunks thudding all round him
const S12 = (f: number): Shot => {
  const R = SPOT.REPORTER;
  return P({ pos: [R[0] + 0.5, by(R[0] + 0.5, R[2] - 4.6, 1.5), R[2] - 4.6], look: [R[0] - 0.2, by(R[0], R[2], 1.25), R[2]], fov: 44, roll: -0.02 }, f, 1062, 0.002, 0.006, 12, EV.HEAD12 - 2);
};
// 13 (1140-1227): the lonely sedan in the distant lot, the smoke cloud small on the horizon; the chunk; KICK
const S13 = (f: number): Shot => P({ pos: [7.4, 1.6, 9.6], look: [-0.4, 2.2, -1.2], fov: 50, roll: 0.025 }, f, 1140, 0.0018, 0.007, 12, EV.CRUSH13 - 1);
// 14 (1228-1321): the smoke clears off the whale; the sooty Engineer blinks in the foreground
const S14 = (f: number): Shot => {
  const a = C([9.4, 2.0, 15.6], [-0.6, 2.6, 0], 52, 0.02), b = C([8.6, 1.8, 14.0], [-0.4, 2.4, 0.5], 50, -0.02);
  return P(between(a, b, gl(f, 1236, 40)), f, 1228, 0.0018, 0.006, 12, EV.BLINK14 - 2);
};
// 15a (1322-1423): the crew sigh, the Engineer face-palms; 15b (1424-1457): bulldozer + shovels bury it
const S15a = (f: number): Shot => P({ pos: [5.8, 1.6, 13.4], look: [2.0, 1.5, 7.0], fov: 46, roll: 0.02 }, f, 1322, 0.0018, 0.007, 12, EV.PALM15 - 2);
const S15b = (f: number): Shot => P({ pos: [14, 4.6, 20], look: [0.5, 1.6, 1.5], fov: 48, roll: -0.02 }, f, EV.CUT15, 0.0025, 0.007, 10, EV.MOUND15 - 2);
// 16 (1458-1589): the sunny park; creeping push-in to the sign and the winking gull
const S16 = (f: number): Shot => {
  const a = C([0.7, 1.5, 10.0], [0.1, 1.45, 0.4], 52, 0.02), b = C([0.75, 1.55, 8.6], [0.25, 1.65, 0.0], 50, -0.015);
  // creep in, then glide onto the gull on the sign for its wink (it lands at the sign's top-right)
  const c = C([1.55, 2.55, 4.6], [1.2, 2.55, 0.1], 42, 0.0);
  return P(between(mix(a, b, gl(f, 1470, 60)), c, gl(f, EV.LAND16 - 14, 22)), f, 1458, 0.0022);
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }],
  2: [{ f: 136, s: S2 }],
  3: [{ f: 198, s: S3 }],
  4: [{ f: 334, s: S4 }],
  5: [{ f: 422, s: S5 }],
  6: [{ f: 496, s: S6a }, { f: EV.CUT6, cut: true, s: S6b }],
  7: [{ f: 648, s: S7a }, { f: EV.CUT7, cut: true, s: S7b }],
  8: [{ f: 768, s: S8 }],
  9: [{ f: 890, s: S9 }, { f: EV.INSERT9[0], cut: true, s: S9i }, { f: EV.INSERT9[1], cut: true, s: S9 }],
  10: [{ f: 938, s: S10 }],
  11: [{ f: 988, s: S11 }],
  12: [{ f: 1062, s: S12 }],
  13: [{ f: 1140, s: S13 }],
  14: [{ f: 1228, s: S14 }],
  15: [{ f: 1322, s: S15a }, { f: EV.CUT15, cut: true, s: S15b }],
  16: [{ f: 1458, s: S16 }],
};

// impact kicks: the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in 7 f, roll +-0.23 deg
// per unit; they start on the first frame at/after the event. No hand-held float.
export const KICKS: [number, number][] = [[EV.KICK2 / FPS, 1.0], [EV.PUSH9 / FPS, 0.4], [EV.BOOM10 / FPS, 1.6], [EV.SCATTER11 / FPS, 0.5],
  [EV.HEAD12 / FPS, 0.6], [EV.KICK13 / FPS, 1.3], [EV.MOUND15 / FPS, 0.4]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a; // metres at the look distance for 3 px x a
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** frame at which the current key's move has finished (for picking billboard views per key, not per frame) */
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- foreground layer (composition.md 3.3, depth.md 3.5.4) ----------------
/** Near framing props, cut by a frame edge and blurred by the shot's DOF. space "cam": pos is in camera space (x right,
 *  y up, z forward, metres); "world": a world position. Drawn by build.ts fgUpdate from these kit names.
 *  Kits: grass (a beach-grass clump), driftwood, crate. */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number; space?: "world" | "cam"; tilt?: number };
export const FOREGROUND: Fg[] = [
  { a: 768, b: 890, kit: "grass", pos: [-3.6, 0, 34.2], yaw: 0.2, s: 1.2 },
  { a: 1062, b: 1140, kit: "grass", pos: [15.6, 0, 37.0], yaw: -0.3, s: 1.0 },
];

// ---------------- lens: depth of field ----------------
/** Lens blur per beat (thin lens). cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp.
 *  CU 12-16, MS 10-12, wides / aerials 0. Entries switch on cuts (no dur) or ramp with the camera move they share
 *  f / dur with. focus = world point (else the camera look point). */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const at = (p: V3, h: number): V3 => [p[0], beachY(p[0], p[2]) + h, p[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 6, focus: () => at(SPOT.ENG1, 1.5) },
  { f: 136, cInf: 11, focus: () => at(SPOT.ENG1, 1.5) },
  { f: 198, cInf: 0 },
  { f: 334, cInf: 5, focus: () => at(ropeAt(5.5), 1.3) },
  { f: 422, cInf: 7, focus: () => [SPOT.TRUCK5[0] - 3, 1.5, SPOT.TRUCK5[2] + 1.5] },
  { f: 496, cInf: 9, focus: () => at(SPOT.ENG6, 1.6) },
  { f: EV.CUT6, cInf: 6, focus: () => [SPOT.CRATES[0], 1.2, SPOT.CRATES[2] + 0.6] },
  { f: 648, cInf: 9, focus: () => at(SPOT.EASEL, 1.5) },
  { f: EV.CUT7, cInf: 13, focus: () => at(SPOT.LOG7, 0.75) },
  { f: 768, cInf: 8, focus: () => at([SPOT.CROWD[0] + 4, 0, 40.5], 1.5) },
  { f: EV.TV8 - 16, dur: 22, cInf: 10, focus: () => at(SPOT.REPORTER, 1.5) },
  { f: 890, cInf: 13, focus: () => at(SPOT.PLUNGER, 0.9) },
  { f: EV.INSERT9[0], cInf: 12, focus: () => at([SPOT.CROWD[0] + 3.5, 0, 40.2], 1.5) },
  { f: EV.INSERT9[1], cInf: 13, focus: () => at(SPOT.PLUNGER, 0.9) },
  { f: 938, cInf: 0 },
  { f: 988, cInf: 6, focus: () => at([SPOT.CROWD[0] + 5, 0, 41], 1.6) },
  { f: 1062, cInf: 11, focus: () => at(SPOT.REPORTER, 1.5) },
  { f: 1140, cInf: 5, focus: () => [0, 1.2, 0] },
  { f: 1228, cInf: 2.5, focus: () => at([6.4, 0, 9.2], 1.5) },
  { f: 1322, cInf: 9, focus: () => [2.0, 1.5, 7.0] },
  { f: EV.CUT15, cInf: 0 },
  { f: 1458, cInf: 6, focus: () => [0.2, 1.5, 1.6] },
  { f: EV.LAND16 - 14, dur: 22, cInf: 9, focus: () => [SPOT.SIGN[0] + 0.5, 2.65, 0.1] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
/** what the lens focuses on (DOF): the DOF table's focus point, else the camera look point */
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
