// Timeline of "The Time Lock" (bank vault time locks, 1870s): 12 shots locked to the voice (voice/words.json, SHOTS.md),
// the event frames the sound is timed to, the set anchors shared by sets / cast / cameras, the props that move (the vault
// door swing and wheel, the clock-lock, the cart, the ribbon, the time-lapse), the camera grammar of the template
// (continuous slow push-ins; symmetric smootherstep glides 18-40 f; big reframes are cuts; impacts are 7-frame flip kicks;
// no hand-held float) and the per-shot depth of field.
//
// CONTRACTS (other owners import these; change them only together with the readers):
//   SetName, Light, ShotDef, SHOTS, XFADE, FLASH_AT, layersAt, setOf, lightAt  -> Vault.tsx, world.ts, cast.ts, sets.ts
//   SPOT, EV, doorOpen / wheelTurn / ...                                         -> sets + stage
//   camAt, keyEnd, kickAt, dofAt, focusAt, FOREGROUND                            -> world.ts, Vault.tsx, sets.ts
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
/** one THREE.Group per set (sets.ts buildSets); only the active set is visible.
 *  street: the moonlit 1870s town street with the bank front (and, through its window, the vault); bedroom: the banker's
 *  night room; bank: the bank hall at night with the great vault door; workshop: Sargent's cluttered workshop (also the
 *  bench with the clocks and the time-lock mechanism); prairie: Morrison, Illinois, bright day; bankrow: a street of banks;
 *  modern: the gleaming modern vault */
export type SetName = "street" | "bedroom" | "bank" | "workshop" | "prairie" | "bankrow" | "modern";
/** light presets (lights.ts LIGHTS / LOOK, grade.ts GRADES) */
export type Light = "day" | "night" | "candle" | "interior" | "modern";
/** alt: a cut inside the shot to another set from frame alt[0] (with its own light) */
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: Light; alt?: [number, SetName, Light] };
// frame ranges from SHOTS.md (b = exclusive end)
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 183, set: "street", light: "night", alt: [150, "bedroom", "candle"] },   // HOOK: the vault through the window, the bedroom
  { id: 2, a: 183, b: 330, set: "bedroom", light: "candle", alt: [275, "street", "night"] }, // the plan, the grab, the moonlit march
  { id: 3, a: 330, b: 455, set: "bank", light: "candle" },                                   // the great door, the tiny banker with the key
  { id: 4, a: 455, b: 522, set: "bank", light: "candle" },                                   // the sweating face, the wheel, the door swings open
  { id: 5, a: 522, b: 695, set: "workshop", light: "interior" },                             // Sargent's workshop, the idea, the blueprint
  { id: 6, a: 695, b: 775, set: "workshop", light: "interior" },                             // two kitchen clocks -> one mechanism
  { id: 7, a: 775, b: 935, set: "workshop", light: "interior" },                             // the time-lock mechanism close-up
  { id: 8, a: 935, b: 1114, set: "prairie", light: "day" },                                  // Morrison, Illinois, 1874
  { id: 9, a: 1114, b: 1241, set: "bank", light: "candle" },                                 // the new door, the robbers fail
  { id: 10, a: 1241, b: 1373, set: "bank", light: "candle" },                                // tied to a chair, time passes, the clock does not care
  { id: 11, a: 1373, b: 1430, set: "bankrow", light: "day" },                                // every bank wanted one
  { id: 12, a: 1430, b: 1590, set: "modern", light: "modern" },                              // the modern vault, the guard clock
];
/** 5-frame anchored dissolves (place / time changes); a white flash after the hook */
export const XFADE: Record<number, number> = { 5: 5, 8: 5, 12: 5 };
export const FLASH_AT = 183;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** the set a shot shows at frame f */
export const setOf = (id: number, f: number): SetName => { const s = SHOTS[id - 1]; return s.alt && f >= s.alt[0] ? s.alt[1] : s.set; };
/** the light a shot has at frame f */
export const lightAt = (id: number, f: number): Light => { const s = SHOTS[id - 1]; return s.alt && f >= s.alt[0] ? s.alt[2] : s.light; };
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
  STARE1: 100, TOSS1: 126, TIPTOE1: 134, CUT1: 150, GRIN1: 157, EYES1: 172,              // hook: the crowbar toss, the bedroom, eyes pop
  PLAN2: 205, PLAN2B: 230, GRAB2: 239, CUT2: 275, ARRIVE2: 330,                          // the plan, the scoop, the march, the door
  STEEL3: 365, VAULT3: 374, PULL3: 400, KEY3: 422, SHADOW3: 438,                         // the door looms, the banker with the key
  SCARED4: 462, WHEEL4: 484, OPEN4: 493,                                                 // knees knock, the wheel, the door swings
  LOCK5: 531, SARG5: 563, IDEA5: 594, SCRIBBLE5: 625, KEYHOLE5: 658, CROSS5: 676,        // workshop
  BUILD6: 700, SCREW6: 722, FIT6: 742, MECH6: 750,                                       // the clocks come apart and together
  CLOCK7: 781, BOLT7: 798, PUSH7: 840, SET7: 864, PUSH7B: 887, FACE7: 910,               // the mechanism
  YEAR8: 938, CART8: 1004, BOLT8: 1034, CUT8: 1055, RIBBON8: 1087,                       // Morrison
  MARCH9: 1126, TURN9: 1172, SHRUG9: 1193, PALM9: 1210, THUMB9: 1220,                    // the robbers fail
  FIST10: 1260, TIE10: 1283, WAIT10: 1303, SMUG10: 1325, CARE10: 1342,                   // threaten, tie, wait, the clock
  QUEUE11: 1382, WAVE11: 1403,                                                           // every bank
  CUT12: 1504, STARE12: 1516, WINK12: 1551,                                              // the guard clock
};

// ---------------- set anchors (each set's local frame = world frame) ----------------
export const SPOT = {
  // street: the bank facade on the plane x = BANK_X (faces -x), the window of the hook at z = WIN, the door at z = 0
  BANK_X: 7.2, WIN: -4.6, VDOOR_ST: [14.0, 2.1, -4.6] as V3,
  // bedroom
  BED: [-0.7, 0, -1.5] as V3, PLAN: [0.55, 1.5, -2.35] as V3,
  // bank hall: the vault wall is the plane z = VD[2]; the door faces +z
  VD: [0, 2.05, -7.5] as V3, DOOR_R: 1.9, HINGE_X: -2.25,
  // workshop
  BENCH: [0, 1.0, -2.7] as V3, MECH: [0.0, 1.62, -2.35] as V3, TABLE: [0.9, 0.95, 0.5] as V3,
  // prairie: the brick bank on the plane x = PR_BANK_X (faces +x)
  PR_BANK_X: -8.5,
  // bankrow
  SHOP: [-7.2, 0, 4] as V3,
  // modern vault (door on the plane z = MD[2])
  MD: [0, 2.1, -7.2] as V3,
};
export const groundY = (_x: number, _z: number) => 0;

// ---------------- prop / actor timelines ----------------
const step = (f: number, f0: number, dur = 8) => glide((f - f0) / dur);
/** the great door's swing angle (rad) in shots 3-4 (the old door: opens at OPEN4) */
export const doorOpen = (id: number, f: number): number => (id === 4 ? 1.72 * glide((f - EV.OPEN4) / 30) : 0);
/** the wheel's turn (rad) of the great door: shot 4 the banker spins it; shot 9 it jams after a quarter turn */
export const wheelTurn = (id: number, f: number): number => {
  if (id === 4) return 3.4 * glide((f - EV.WHEEL4) / 13);
  if (id === 9) { const u = clamp01((f - EV.TURN9) / 7); return 0.5 * Math.sin(u * Math.PI) * (u < 1 ? 1 : 0) + 0.02 * Math.sin((f - EV.TURN9) * 1.7) * (f > EV.TURN9 + 7 && f < EV.TURN9 + 16 ? 1 : 0); }
  return 0;
};
/** how far the locking bolts are drawn back (0..1): shot 4 only */
export const boltsBack = (id: number, f: number): number => (id === 4 ? glide((f - (EV.WHEEL4 + 6)) / 9) : 0);
/** shot 7: the hand pushes the mechanism's wheel (0..1 per push, blocked: it springs back) */
export const pushAt = (f: number): number => {
  let m = 0;
  for (const t0 of [EV.PUSH7, EV.PUSH7B]) { const u = (f - t0) / 14; if (u > 0 && u < 1) m = Math.max(m, Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 1.3); }
  return m;
};
/** shot 8: the cart with the door rolls along the street (z of the cart) */
export const cartZ = (f: number): number => lerp(16, 0.2, glide((f - 960) / 74));
/** shot 10: how far the time-lapse has run (0..1) from WAIT10 to SMUG10 */
export const lapse = (f: number): number => clamp01((f - EV.WAIT10) / (EV.SMUG10 - EV.WAIT10));

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
/** push a shot in from frame f0 at `rate` (punch as in pushK, starting at punchAt) */
const P = (s: Shot, f: number, f0: number, rate = 0.0025, punch = 0, n = 35, punchAt = f0): Shot =>
  dolly(s.pos, s.look, pushK(f, f0, rate) * (punch ? pushK(f, punchAt, 0, punch, n) : 1), { fov: s.fov, roll: s.roll });
const gl = (f: number, f0: number, dur: number) => glide((f - f0) / dur);
const between = (a: Cam, b: Cam, u: number): Shot => mix(a, b, u);
const C = (pos: V3, look: V3, fov: number, roll = 0): Cam => ({ pos, look, fov, roll });

/** card heights (cast.ts design: an adult's head top stands ~1.75 m, the head blob is ~0.48 m) */
export const HEAD_TOP = 1.75, HEAD_H = 0.48;
/** eye point of a card standing at p (DOF focus) */
export const eyes = (p: V3, s = 1): V3 => [p[0], p[1] + 1.52 * s, p[2]];

// ---- per-shot cameras ----
const WZ = SPOT.WIN, VD = SPOT.VD, MD = SPOT.MD, MECH = SPOT.MECH;
// 1a (0-149): the moonlit street, the bank window with the vault door behind it, the robber with the crowbar; 1b: the bedroom
const S1a = (f: number): Shot => P({ pos: [1.6, 1.55, 3.2], look: [6.0, 2.05, WZ + 0.2], fov: 40, roll: 0.015 }, f, 0, 0.0016, 0.006, 12, EV.TOSS1 - 3);
const S1b = (f: number): Shot => P({ pos: [-0.2, 1.5, 3.1], look: [-0.5, 1.25, -1.9], fov: 38, roll: -0.02 }, f, EV.CUT1, 0.0022);
// 2a (183-274): the plan on the bedpost, the scoop; 2b (275-329): the moonlit march, the camera backs down the street
const S2a = (f: number): Shot => {
  const a = C([1.6, 1.55, 2.2], [0.45, 1.5, -2.2], 38, 0.02), b = C([0.4, 1.45, 2.6], [-0.2, 1.3, -1.9], 40, -0.015);
  return P(between(a, b, gl(f, EV.GRAB2 - 14, 26)), f, 183, 0.0018, 0.006, 12, EV.GRAB2 - 3);
};
/** where the marchers are at frame f in shot 2b (z; they walk toward -z at 2.5 m/s and stop at the bank door at z = 0) */
export const marchZ2 = (f: number) => (f >= EV.ARRIVE2 ? 0 : (EV.ARRIVE2 - f) * 0.085);
const S2b = (f: number): Shot => { const z = marchZ2(f); return P({ pos: [1.2, 1.25, z - 5.1], look: [-0.2, 1.35, z + 1.0], fov: 42, roll: 0.02 }, f, EV.CUT2, 0.001); };
// 3 (330-454): the great door from the floor, up the door; pulls back to the tiny banker with his key
const S3 = (f: number): Shot => {
  const a = C([-1.4, 0.45, VD[2] + 3.4], [0.2, 1.5, VD[2]], 50, 0.03), b = C([0.6, 1.3, VD[2] + 3.9], [0.1, 2.0, VD[2]], 42, -0.02), c = C([0.2, 1.15, VD[2] + 8.6], [0.0, 1.55, VD[2] + 1.0], 40, 0.015);
  return P(between(between(a, b, gl(f, EV.STEEL3 - 6, 40)) as Cam, c, gl(f, EV.PULL3, 34)), f, 330, 0.0012, 0.005, 12, EV.KEY3 - 3);
};
// 4a (455-483): the sweating face (CU); 4b (484-521): the wheel and the door, the golden light
const S4a = (f: number): Shot => P({ pos: [0.5, 1.5, VD[2] + 3.3], look: [0.0, 1.55, VD[2] + 5.4], fov: 36, roll: 0.02 }, f, 455, 0.0035, 0.007, 12, EV.SCARED4 - 3);
const S4b = (f: number): Shot => P({ pos: [-0.2, 1.65, VD[2] + 6.4], look: [0.1, 1.85, VD[2] + 0.6], fov: 40, roll: -0.02 }, f, EV.WHEEL4, 0.0022);
// 5a (522-594): the workshop, Sargent at the bench; 5b: push to the blueprint table
const S5 = (f: number): Shot => {
  const a = C([-0.8, 1.55, 5.4], [0.0, 1.5, -1.8], 46, 0.02), b = C([0.55, 1.45, 4.0], [0.55, 1.35, 0.4], 40, -0.015);
  return P(between(a, b, gl(f, EV.IDEA5 - 4, 40)), f, 522, 0.0016, 0.006, 12, EV.IDEA5 - 3);
};
// 6 (695-774): the bench: two clocks, the screwdriver, gears, one mechanism
const S6 = (f: number): Shot => P({ pos: [0.2, 1.75, 1.2], look: [0.0, 1.45, MECH[2]], fov: 40, roll: 0.02 }, f, 695, 0.0018, 0.006, 12, EV.SCREW6 - 3);
// 7 (775-934): the mechanism close-up, slow push, a pull for the banker's face
const S7 = (f: number): Shot => {
  const a = C([0.3, 1.78, MECH[2] + 2.6], [0.05, 1.6, MECH[2]], 38, 0.02), b = C([0.15, 1.7, MECH[2] + 1.85], [0.1, 1.58, MECH[2]], 36, -0.02), c = C([-0.1, 1.78, MECH[2] + 2.5], [0.1, 1.7, MECH[2]], 38, 0.015);
  return P(between(between(a, b, gl(f, EV.PUSH7 - 20, 36)) as Cam, c, gl(f, EV.FACE7 - 8, 24)), f, 775, 0.0014, 0.005, 12, EV.PUSH7 - 3);
};
// 8: Morrison. 8a (935-1003) the town; 8b (1004-1054) the cart at the bank, Sargent; 8c (1055-1113) the bank front, the ribbon
const S8a = (f: number): Shot => P(between(C([8.5, 3.4, 22], [-2.0, 2.6, 2], 44, 0.02), C([6.5, 2.6, 17], [-3.5, 2.2, 3.5], 42, -0.015), gl(f, 960, 40)), f, 935, 0.0012);
const S8b = (f: number): Shot => P({ pos: [-1.0, 1.65, 7.0], look: [-5.0, 1.85, 1.0], fov: 42, roll: -0.02 }, f, EV.CART8, 0.002, 0.006, 12, EV.BOLT8 - 3);
const S8c = (f: number): Shot => P(between(C([1.5, 1.45, 5.8], [-8.5, 2.0, 0.5], 42, 0.02), C([-0.8, 1.45, 3.9], [-8.5, 2.0, 0.3], 40, -0.015), gl(f, EV.RIBBON8 - 14, 30)), f, EV.CUT8, 0.0018, 0.006, 12, EV.RIBBON8 - 3);
// 9 (1114-1240): the robbers march the banker in, he fails the wheel, the shrug, the face-palms
const S9 = (f: number): Shot => {
  const a = C([1.6, 1.5, VD[2] + 6.6], [0.0, 1.8, VD[2] + 1.0], 44, 0.02), b = C([0.7, 1.55, VD[2] + 5.0], [-0.1, 1.75, VD[2] + 0.8], 40, -0.015);
  const c = C([0.3, 1.5, VD[2] + 5.5], [-0.1, 1.55, VD[2] + 1.4], 40, 0.01);
  return P(between(between(a, b, gl(f, EV.TURN9 - 24, 30)) as Cam, c, gl(f, EV.SHRUG9 - 8, 30)), f, 1114, 0.0014, 0.006, 12, EV.TURN9 - 3);
};
// 10 (1241-1372): the chair, the waiting; 10b pushes in on the clock-lock
const S10 = (f: number): Shot => {
  const a = C([0.4, 1.35, VD[2] + 7.2], [0.0, 1.35, VD[2] + 1.4], 42, 0.02), b = C([0.1, 1.9, VD[2] + 2.7], [0.0, 2.35, VD[2]], 30, -0.02);
  return P(between(a, b, gl(f, EV.SMUG10 - 10, 40)), f, 1241, 0.0012, 0.006, 12, EV.FIST10 - 3);
};
// 11 (1373-1429): the street of banks, the queue; slow push toward Sargent's shop
const S11 = (f: number): Shot => P({ pos: [-1.2, 1.55, 11.5], look: [-1.6, 2.1, -4.0], fov: 46, roll: 0.02 }, f, 1373, 0.0022, 0.006, 12, EV.QUEUE11 - 3);
// 12a (1430-1503): the modern vault; 12b (1504-1589): the guard clock, creeping push-in
const S12a = (f: number): Shot => P({ pos: [1.3, 1.6, MD[2] + 7.6], look: [0.0, 2.0, MD[2]], fov: 42, roll: -0.02 }, f, 1430, 0.0018);
const S12b = (f: number): Shot => P({ pos: [0.5, 1.25, MD[2] + 4.9], look: [0.0, 1.4, MD[2] + 3.0], fov: 34, roll: 0.02 }, f, EV.CUT12, 0.0024, 0.006, 12, EV.WINK12 - 3);

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: EV.CUT1, cut: true, s: S1b }],
  2: [{ f: 183, s: S2a }, { f: EV.CUT2, cut: true, s: S2b }],
  3: [{ f: 330, s: S3 }],
  4: [{ f: 455, s: S4a }, { f: EV.WHEEL4, cut: true, s: S4b }],
  5: [{ f: 522, s: S5 }],
  6: [{ f: 695, s: S6 }],
  7: [{ f: 775, s: S7 }],
  8: [{ f: 935, s: S8a }, { f: EV.CART8, cut: true, s: S8b }, { f: EV.CUT8, cut: true, s: S8c }],
  9: [{ f: 1114, s: S9 }],
  10: [{ f: 1241, s: S10 }],
  11: [{ f: 1373, s: S11 }],
  12: [{ f: 1430, s: S12a }, { f: EV.CUT12, cut: true, s: S12b }],
};

// impact kicks: the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in 7 f, roll +-0.23 deg
// per unit; they start on the first frame at/after the event. No hand-held float.
export const KICKS: [number, number][] = [[EV.TOSS1 / FPS, 0.3], [EV.GRAB2 / FPS, 0.4], [EV.KEY3 / FPS, 0.3], [EV.OPEN4 / FPS, 0.9],
  [EV.SCREW6 / FPS, 0.4], [EV.MECH6 / FPS, 0.5], [EV.PUSH7 / FPS, 0.5], [EV.PUSH7B / FPS, 0.5], [EV.BOLT8 / FPS, 0.5], [EV.RIBBON8 / FPS, 0.4],
  [EV.TURN9 / FPS, 0.5], [EV.PALM9 / FPS, 0.4], [EV.TIE10 / FPS, 0.3]];
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
 *  y up, z forward, metres); "world": a world position. Drawn by sets.ts fgUpdate from these kit names.
 *  Kits: lamp (a gas-lamp post), cogs (a pair of brass gears), chair (a chair back). */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number; space?: "world" | "cam"; tilt?: number };
export const FOREGROUND: Fg[] = [
  { a: 195, b: 275, kit: "bedpost", pos: [-0.95, -0.7, 2.3], space: "cam", yaw: 0.0, s: 1.0 },
  { a: 695, b: 775, kit: "cogs", pos: [0.62, -0.62, 1.7], space: "cam", yaw: 0.3, s: 1.0 },
  { a: 522, b: 590, kit: "cogs", pos: [-0.75, -0.72, 2.2], space: "cam", yaw: -0.2, s: 1.2 },
];

// ---------------- lens: depth of field ----------------
/** Lens blur per beat (thin lens). cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp.
 *  CU 12-16, MS 10-12, wides / aerials 0. Entries switch on cuts (no dur) or ramp with the camera move they share
 *  f / dur with. focus = world point (else the camera look point). */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 6, focus: () => [5.6, 1.5, WZ + 0.3] },
  { f: EV.CUT1, cInf: 6, focus: () => [-0.5, 1.2, -1.9] },
  { f: 183, cInf: 7, focus: () => [0.3, 1.5, -2.3] },
  { f: EV.CUT2, cInf: 4, focus: (f) => [0, 1.3, marchZ2(f)] },
  { f: 330, cInf: 5, focus: () => [0.2, 1.7, VD[2]] },
  { f: EV.PULL3, dur: 34, cInf: 6, focus: () => [0.0, 1.1, VD[2] + 5.2] },
  { f: 455, cInf: 10, focus: () => [0.0, 1.55, VD[2] + 5.4] },
  { f: EV.WHEEL4, cInf: 6, focus: () => [0.2, 1.8, VD[2] + 1.8] },
  { f: 522, cInf: 6, focus: () => [0.0, 1.5, -1.8] },
  { f: EV.IDEA5 - 4, dur: 40, cInf: 9, focus: () => [0.55, 1.4, 0.4] },
  { f: 695, cInf: 10, focus: () => [0.0, 1.45, MECH[2]] },
  { f: 775, cInf: 12, focus: () => [0.05, 1.6, MECH[2] + 0.2] },
  { f: EV.FACE7 - 8, dur: 24, cInf: 8, focus: () => [0.1, 1.6, MECH[2] + 0.6] },
  { f: 935, cInf: 3, focus: () => [-2, 2, 6] },
  { f: EV.CART8, cInf: 7, focus: () => [-4.6, 1.5, cartZ(EV.CART8 + 20)] },
  { f: EV.CUT8, cInf: 6, focus: () => [-8.4, 1.6, 0.3] },
  { f: 1114, cInf: 5, focus: () => [0.0, 1.5, VD[2] + 2.0] },
  { f: 1241, cInf: 5, focus: () => [0.0, 1.2, VD[2] + 1.6] },
  { f: EV.SMUG10 - 10, dur: 40, cInf: 12, focus: () => [0.0, 2.35, VD[2] + 0.1] },
  { f: 1373, cInf: 4, focus: () => [-1.6, 1.4, -1.0] },
  { f: 1430, cInf: 3, focus: () => [0.0, 2.0, MD[2]] },
  { f: EV.CUT12, cInf: 7, focus: () => [0.0, 1.3, MD[2] + 3.0] },
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
