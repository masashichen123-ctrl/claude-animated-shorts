// Timeline of "The 1904 Olympic Marathon" (St. Louis, 30 Aug 1904): 15 shots locked to the voice (voice/words.json,
// SHOTS.md), the event frames the sound is timed to, the set anchors shared by sets / cast / cameras, the props that move
// (the 1904 cars, the finish tapes, the well bucket, the spinning sign arrow, the hay wagon), the camera grammar of the
// template (continuous slow push-ins; symmetric smootherstep glides 18-40 f; big reframes are cuts; impacts are 7-frame
// flip kicks; no hand-held float) and the per-shot depth of field.
//
// CONTRACTS (other owners import these; change them only together with the readers):
//   SetName, Light, ShotDef, SHOTS, XFADE, FLASH_AT, layersAt, setOf    -> Marathon.tsx, world.ts, cast.ts, build.ts
//   SPOT (set anchors in each set's own local frame; every set sits at the world origin, only one is visible)
//   EV (event frames), prop timelines (carsAt, tapeK, bucketK, signSpin, wagonZ, runner paths)
//   camAt, keyEnd, kickAt, dofAt, focusAt, FOREGROUND                  -> world.ts, Marathon.tsx, build.ts
export const FPS = 30;
export const TOTAL = 1680;
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
/** one THREE.Group per set in build.ts (buildSets); only the active set is visible.
 *  country: the dusty course (dirt road along z, runners heading +z, fields, cornfields, the orchard, the well, the creek,
 *  the distant stadium); stadium: the 1904 stadium finish; boston: the 1905 Boston spring street */
export type SetName = "country" | "stadium" | "boston";
/** light presets (lights.ts LIGHTS / LOOK, grade.ts GRADES): the hot St. Louis day, Boston spring */
export type Light = "day" | "spring";
/** alt: a cut inside the shot to another set from frame alt[0] (SHOTS.md 3 / 7 / 9) */
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: Light; alt?: [number, SetName] };
// frame ranges from SHOTS.md (b = exclusive end)
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 133, set: "country", light: "day" },                              // HOOK: Hicks, the poison bottle
  { id: 2, a: 133, b: 204, set: "country", light: "day" },                            // Lorz waves from the car
  { id: 3, a: 204, b: 340, set: "stadium", light: "day", alt: [262, "country"] },     // the start; the sun + the road
  { id: 4, a: 340, b: 449, set: "country", light: "day" },                            // cars + the dust clouds
  { id: 5, a: 449, b: 553, set: "country", light: "day" },                            // the well
  { id: 6, a: 553, b: 686, set: "stadium", light: "day" },                            // Lorz breaks the tape
  { id: 7, a: 686, b: 768, set: "country", light: "day", alt: [752, "stadium"] },     // flashback: Lorz in the car
  { id: 8, a: 768, b: 886, set: "country", light: "day" },                            // the orchard: the rotten apple
  { id: 9, a: 886, b: 988, set: "country", light: "day", alt: [947, "stadium"] },     // the nap; fourth
  { id: 10, a: 988, b: 1078, set: "country", light: "day" },                          // chased by dogs
  { id: 11, a: 1078, b: 1273, set: "country", light: "day" },                         // Hicks and his trainers
  { id: 12, a: 1273, b: 1331, set: "stadium", light: "day" },                         // the long lens at the finish
  { id: 13, a: 1331, b: 1415, set: "stadium", light: "day" },                         // the carry
  { id: 14, a: 1415, b: 1507, set: "country", light: "day" },                         // 32 -> 14
  { id: 15, a: 1507, b: TOTAL, set: "boston", light: "spring" },                      // Boston 1905, on foot
];
/** 5-frame anchored dissolves (place / time changes); a white flash after the hook */
export const XFADE: Record<number, number> = { 3: 5, 15: 5 };
export const FLASH_AT = 131;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** the set a shot shows at frame f */
export const setOf = (id: number, f: number): SetName => { const s = SHOTS[id - 1]; return s.alt && f >= s.alt[0] ? s.alt[1] : s.set; };
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
  BOTTLE1: 99,      // the trainer holds up the skull bottle
  GULP1: 110,       // Hicks gulps it, eyes go swirly
  WAVE2: 162,       // Lorz waves from the back seat
  DOUBLE2: 176,     // a runner's double take
  PISTOL3: 210,     // the starter's pistol puff
  CUT3: 262,        // cut to the blazing sun over the road
  HEAT3: 269,       // runners already sweating
  ROAD3: 308,       // the road stretching to the horizon
  CARS4: 344,       // the two cars drive ahead
  DUST4: 398,       // the dust clouds roll back over the runners
  DUSTPEAK4: 427,
  TWO5: 466, PANT5: 495, DROP5: 529,
  FINISH6: 593, TAPE6: 607, LORZ6: 627, CHEER6: 661,
  FOUND7: 692, PASS7: 740, CAR7: 750, CUT7: 752,
  CUBA8: 790, PICK8: 822, BITE8: 830, ROT8: 867,
  NAP9: 926, CUT9: 947, FOUR9: 965,
  CHASE10: 1013, MILE10: 1028, DOGS10: 1055,
  HICKS11: 1112, ALIVE11: 1140, EGG11: 1204, BRANDY11: 1235, POISON11: 1246,
  FINISH12: 1304,
  LIFT13: 1378, CARRY13: 1381, TAPE13: 1399, MEDAL13: 1409, // medal plonk @1409 = audio/cues.md 46.97 s
  COUGH4: 379, SWIRL1: 125, SPLASH14: 1497, // audio/cues.md cue frames (picture free in SHOTS.md)
  N32_14: 1427, DROPS14: 1440, N14_14: 1465, DONE14: 1477,
  CAR15: 1543, BOSTON15: 1600, TAPE15: 1604, FEET15: 1637, HONK15: 1650, WINK15: 1660,
};

// ---------------- set anchors (each set's local frame = world frame) ----------------
// country: the dirt road runs along z at x = 0 (5.2 m wide), the runners head toward +z; the stadium stands far up the
// road at z ~ 520. Down the road (-z): the well (z -120), the orchard (x > 5, z -260..-200), the cornfield lane (z -360)
// and fields to the horizon. The creek crosses at z 110.
// stadium: the cinder track runs along x (runners toward +x), the finish line at x = 0, the grandstand along -z, the end
// stand at -x. boston: the street runs along x (runners toward +x), the finish banner at x = 0, brick rows at z = +-10.
export const SPOT = {
  ROAD_W: 5.2,
  WELL: [4.3, 0, -120] as V3,
  TREE8: [6.4, 0, -229.5] as V3,            // the apple tree the Cuban picks from and naps under
  CUBAN8: [4.85, 0, -227.6] as V3,          // where he stands to pick
  NAP9: [6.0, 0, -228.4] as V3,             // where he lies (head toward the tree)
  LANE_Z: -360,                             // the cornfield lane (runs along -x from the road)
  SIGN10: [-3.4, 0, -356.4] as V3,          // the road sign at the lane junction
  CREEK_Z: 110,
  STADIUM_FAR: [0, 0, 520] as V3,
  // stadium
  TAPE_X: 0, START_X: -24, STARTER: [-19.5, 0, 4.9] as V3,
  // boston
  BANNER_X: 0,
};
export const groundY = (_x: number, _z: number) => 0;

// ---------------- prop / actor timelines ----------------
/** Hicks' shuffle in the hook (toward +z) */
export const hicks1Z = (f: number) => -4.2 + 0.03 * f;
/** shot 11: Hicks shuffling with the trainers' car crawling beside him */
export const hicks11Z = (f: number) => 150 + 0.032 * (f - 1078);
/** shot 10: the runner sprinting down the cornfield lane (toward -x); before CHASE10 he jogs up the main road */
export const chaser10 = (f: number): V3 => {
  if (f < 1003) return [0.6 - 1.0 * smooth((f - 990) / 13), 0, SPOT.LANE_Z + 0.4 - 0.06 * (1003 - f)];
  return [-0.4 - 0.25 * (f - 1003) - 0.0012 * (f - 1003) ** 2, 0, SPOT.LANE_Z + 0.4];
};
/** stadium runner positions along the track (x) */
export const lorz6X = (f: number) => (f < EV.TAPE6 ? -0.24 * (EV.TAPE6 - f) : 2.6 * easeOut((f - EV.TAPE6) / 22));
export const cuban9X = (f: number) => -0.2 * (960 - f);
export const hicks12X = (f: number) => -9.6 + 0.12 * (f - 1273);
/** shot 13: Hicks' x (shuffling, then carried through the tape at TAPE13) and lift height */
export const hicks13X = (f: number) => (f < EV.LIFT13 ? -3.6 + 0.032 * (f - 1331) : -2.1 + 2.1 * ((f - EV.LIFT13) / (EV.TAPE13 - EV.LIFT13)) + 0.02 * Math.max(0, f - EV.TAPE13));
export const hicks13Lift = (f: number) => 0.38 * easeOut((f - EV.LIFT13 + 2) / 6);
/** Boston: Lorz's x (runs in, breaks the tape at TAPE15, slows to a stop) */
export const lorz15X = (f: number) => (f < EV.TAPE15 ? -0.3 * (EV.TAPE15 - f) : 1.7 * easeOut((f - EV.TAPE15) / 16));
/** finish tape state per shot: 0 intact .. >0 frames since it broke */
export const tapeBreak = (id: number, f: number) => {
  const t = id === 6 ? EV.TAPE6 : id === 13 ? EV.TAPE13 : id === 15 ? EV.TAPE15 : id === 12 ? Infinity : -Infinity;
  return f >= t ? f - t : -1;
};
/** the well bucket: height above the well lip 0 (down the shaft) .. 1 (up at the windlass) */
export const bucketK = (f: number) => smooth((f - 500) / 26);
/** the road sign arrow's yaw (shot 10: it spins round, then points the wrong way) */
export const signSpin = (f: number) => (f < 996 ? 0 : f < 1024 ? (f - 996) * 0.45 * (1 - (f - 996) / 56) : 28 * 0.45 * 0.5) + 0;
/** the hay wagon (shot 14): its z on the road */
export const wagonZ = (f: number) => 58 + 0.05 * (f - 1415);

export type CarPose = { k: number; x: number; z: number; yaw: number; bob: number };
/** the 1904 cars: k = which car (0 Lorz's red tourer, 1 the officials' green car, 2 the black car, 3 the trainers' maroon
 *  car), centre position on the ground, yaw (0 = nose toward +z), putter bob. Pure function of shot + frame. */
export const carsAt = (id: number, f: number): CarPose[] => {
  const bob = (k: number) => 0.012 * Math.sin(f * 2.3 + k) + 0.006 * Math.sin(f * 5.1 + k * 2);
  switch (id) {
    case 1: return [{ k: 3, x: -1.4, z: hicks1Z(f) - 15, yaw: 0, bob: bob(3) }];
    case 2: return [{ k: 0, x: -0.9, z: -40 + 0.2 * (f - 133), yaw: 0, bob: bob(0) }];
    case 4: return [{ k: 1, x: -0.9, z: 40 + 0.46 * (f - 344), yaw: 0, bob: bob(1) }, { k: 2, x: 0.7, z: 33 + 0.46 * (f - 344), yaw: 0, bob: bob(2) }];
    case 7: return f < EV.CUT7 ? [{ k: 0, x: -0.9, z: -84 + 0.2 * (f - 686), yaw: 0, bob: bob(0) }] : [];
    case 11: return [{ k: 3, x: -1.35, z: hicks11Z(f) - 0.4, yaw: 0, bob: bob(3) }];
    case 15: return [{ k: 2, x: -7.5 + 0.05 * (f - 1600) * (f > 1600 ? 1 : 0), z: -2.4, yaw: Math.PI / 2, bob: bob(2) }];
  }
  return [];
};
/** car layout shared by build.ts (meshes) and cast.ts (riders): seat centres in the car frame (x right, z forward) */
export const CAR_SEAT = { frontL: [-0.34, 1.0, 0.05] as V3, frontR: [0.34, 1.0, 0.05] as V3, rearL: [-0.36, 1.12, -0.95] as V3, rearR: [0.36, 1.12, -0.95] as V3 };
/** world position of a car-frame point */
export const carPt = (c: CarPose, p: V3): V3 => {
  const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw);
  return [c.x + p[0] * cs + p[2] * sn, p[1] + c.bob, c.z - p[0] * sn + p[2] * cs];
};

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
/** zoom push (camera stays put, for long lenses / moving subjects): tan(fov/2) shrinks by k */
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
/** push a shot in from frame f0 at `rate` (punch as in pushK, starting at punchAt) */
const P = (s: Shot, f: number, f0: number, rate = 0.0025, punch = 0, n = 35, punchAt = f0): Shot =>
  dolly(s.pos, s.look, pushK(f, f0, rate) * (punch ? pushK(f, punchAt, 0, punch, n) : 1), { fov: s.fov, roll: s.roll });
/** zoom version of P (the lens stays put: never dollies past a foreground subject) */
const Z = (s: Shot, f: number, f0: number, rate = 0.0025, punches: [number, number, number][] = []): Shot => {
  let k = pushK(f, f0, rate);
  for (const [at, rt, n] of punches) k *= pushK(f, at, 0, rt, n);
  return zoom(s.pos, s.look, s.fov ?? 40, k, { roll: s.roll });
};
const gl = (f: number, f0: number, dur: number) => glide((f - f0) / dur);
const between = (a: Cam, b: Cam, u: number): Shot => mix(a, b, u);
const C = (pos: V3, look: V3, fov: number, roll = 0): Cam => ({ pos, look, fov, roll });

/** card heights (cast.ts design: an adult's head top stands ~1.75 m, the head blob is ~0.48 m) */
export const HEAD_TOP = 1.75, HEAD_H = 0.48;
/** eye point of a card standing at p (DOF focus) */
export const eyes = (p: V3, s = 1): V3 => [p[0], p[1] + 1.52 * s, p[2]];

// ---- per-shot cameras ----
// 1 (0-132): low on the road ahead of Hicks, looking back down the road: he shuffles toward us, ~40 % of the frame;
// the lens stays ahead of him (tracks at his pace), zoom-push, punches on the bottle and the gulp
const S1 = (f: number): Shot => {
  const z = hicks1Z(f);
  return Z({ pos: [1.05, 1.22, z + 5.7], look: [0.0, 1.12, z - 0.6], fov: 42, roll: 0.025 - 0.0003 * f }, f, 0, 0.0016, [[EV.BOTTLE1 - 3, 0.006, 10], [EV.GULP1 - 2, 0.007, 12]]);
};
// 2 (133-203): side-on beside the road, crawling with the putt-putting car: Lorz waves from the back seat
const S2 = (f: number): Shot => {
  const cz = -25.5 + 0.03 * (f - 133);
  return Z({ pos: [2.7, 1.55, cz], look: [-1.1, 1.35, cz - 10], fov: 44, roll: -0.02 }, f, 133, 0.0018, [[EV.WAVE2 - 3, 0.005, 10], [EV.DOUBLE2 - 2, 0.006, 10]]);
};
// 3a (204-261): high wide on the stadium: the field at the start line, the starter, the full stand
const S3a = (f: number): Shot => P({ pos: [-12.5, 3.4, 8.2], look: [-25.5, 1.3, -0.8], fov: 50, roll: 0.02 }, f, 204, 0.0022, 0.005, 12, EV.PISTOL3 - 2);
// 3b (262-339): low on the road: the blazing sun over sweating runners; crane up + back to the road to the horizon
const S3b = (f: number): Shot => {
  const a = C([0.9, 0.95, 47], [-0.2, 3.4, 30], 50, 0.02), b = C([1.6, 4.6, 52], [0, 1.0, -60], 48, -0.01);
  return P(between(a, b, gl(f, EV.ROAD3 - 20, 30)), f, EV.CUT3, 0.0018);
};
// 4 (340-448): ahead of the cars, off the road's edge: the cars come at us, the dust wall rolls over everything
const S4 = (f: number): Shot => {
  const a = C([2.9, 1.45, 64], [-0.5, 1.7, 42], 48, 0.02), b = C([1.5, 1.5, 49.5], [-0.4, 1.4, 36], 46, -0.02);
  return P(between(a, b, gl(f, 410, 30)), f, 340, 0.0016, 0.006, 12, EV.DUST4 - 2);
};
// 5 (449-552): the lone well: the queue of panting runners along the road; the bucket comes up with a single drop
const S5 = (f: number): Shot => {
  const W = SPOT.WELL, a = C([W[0] + 4.6, 1.75, W[2] + 7.6], [W[0] - 1.2, 1.25, W[2] - 4.5], 46, 0.02);
  const b = C([W[0] + 2.9, 1.45, W[2] + 4.2], [W[0] - 0.1, 1.55, W[2] - 0.2], 42, -0.02);
  return P(between(a, b, gl(f, 506, 26)), f, 449, 0.0018, 0.006, 10, EV.DROP5 - 2);
};
// 6 (553-685): the stadium finish from just past the line: Lorz breaks the tape, the crowd leaps, boaters fly
const S6 = (f: number): Shot => {
  const a = C([8.6, 1.5, 1.8], [-4.0, 1.6, -0.9], 46, 0.02), b = C([9.0, 1.6, 2.2], [-1.0, 2.2, -1.3], 50, -0.02);
  return P(between(a, b, gl(f, EV.CHEER6 - 14, 24)), f, 553, 0.0018, 0.006, 12, EV.TAPE6 - 2);
};
// 7a (686-751): flashback, tracking side-on with the car: Lorz lounging, waving at the runners it overtakes
const S7a = (f: number): Shot => {
  const cz = -84 + 0.2 * (f - 686) - 0.2;
  return Z({ pos: [6.2, 1.7, cz + 3.4], look: [-0.7, 1.35, cz - 0.7], fov: 44, roll: 0.02 }, f, 686, 0.0018, [[EV.PASS7 - 2, 0.005, 12]]);
};
// 7b (752-767): insert: the crowd in the stand, jaws dropped, boaters frozen mid-air
const S7b = (f: number): Shot => P({ pos: [-1.6, 3.1, -3.0], look: [-3.0, 3.6, -9.6], fov: 46, roll: -0.03 }, f, EV.CUT7, 0.004);
// 8 (768-885): the orchard: the Cuban jogs up, grins, picks, bites; push to a close-up for the rotten apple
const S8 = (f: number): Shot => {
  const Cb = SPOT.CUBAN8, a = C([Cb[0] - 2.3, 1.55, Cb[2] + 4.3], [Cb[0] + 0.5, 1.5, Cb[2] - 0.8], 44, 0.02);
  const b = C([Cb[0] - 1.05, 1.6, Cb[2] + 2.45], [Cb[0] + 0.05, 1.42, Cb[2] + 0.05], 47, -0.02);
  return P(between(a, b, gl(f, EV.ROT8 - 26, 24)), f, 768, 0.0016, 0.007, 12, EV.ROT8 - 2);
};
// 9a (886-946): napping under the tree, Z bubbles; 9b (947-987): he jogs over the finish line, four fingers up
const S9a = (f: number): Shot => {
  const N = SPOT.NAP9;
  return P({ pos: [N[0] - 3.6, 1.9, N[2] + 3.4], look: [N[0] - 0.2, 0.55, N[2] - 0.2], fov: 46, roll: 0.02 }, f, 886, 0.0022, 0.006, 12, EV.NAP9 - 2);
};
const S9b = (f: number): Shot => P({ pos: [6.6, 1.45, 1.4], look: [-2.0, 1.45, -0.3], fov: 44, roll: -0.02 }, f, EV.CUT9, 0.0024, 0.007, 12, EV.FOUR9 - 2);
// 10 (988-1077): the cornfield lane: tracking ahead of the runner, three-quarter, dogs at his heels; the spinning sign
const S10 = (f: number): Shot => {
  const r = chaser10(Math.max(f, 1003)), L = SPOT.LANE_Z;
  const a = C([-9.2, 1.7, L + 5.6], [-3.0, 1.8, L + 2.2], 48, 0.02);
  const b = C([r[0] - 4.0, 1.3, L + 3.9], [r[0] + 1.1, 0.95, L - 0.3], 46, -0.02);
  return Z(between(a, b, gl(f, 1004, 18)), f, 988, 0.0016, [[EV.CHASE10 - 2, 0.005, 10], [EV.DOGS10 - 2, 0.006, 12]]);
};
// 11 (1078-1272): ahead of Hicks and the trainers' car crawling beside him; punches on each hand-off
const S11 = (f: number): Shot => {
  const z = hicks11Z(f);
  return Z({ pos: [2.55, 1.6, z + 5.0], look: [-0.25, 1.3, z - 0.4], fov: 46, roll: 0.02 - 0.0002 * (f - 1078) }, f, 1078, 0.0012,
    [[EV.HICKS11 - 2, 0.004, 10], [EV.EGG11 - 3, 0.005, 10], [EV.BRANDY11 - 3, 0.005, 8], [EV.POISON11 - 2, 0.006, 10]]);
};
// 12 (1273-1330): long lens down the track: Hicks weaves toward the tape on jelly legs, the crowd behind holds its breath
const S12 = (f: number): Shot => Z({ pos: [36, 1.75, 1.2], look: [-3.0, 1.4, -0.6], fov: 7.2, roll: 0.0 }, f, 1273, 0.0024, [[EV.FINISH12 - 2, 0.004, 12]]);
// 13 (1331-1414): the carry: two trainers lift him, legs still running, through the tape, the medal plonks
const S13 = (f: number): Shot => {
  const a = C([2.0, 1.55, 1.4], [-3.8, 1.5, -0.2], 44, 0.02), b = C([3.7, 1.6, 1.35], [-0.6, 1.8, -0.2], 44, -0.02);
  return P(between(a, b, gl(f, EV.LIFT13 - 6, 26)), f, 1331, 0.0018, 0.007, 12, EV.CARRY13 - 2);
};
// 14 (1415-1506): high three-quarter view of the course: the column, the drop-outs, the stadium far ahead
const S14 = (f: number): Shot => P({ pos: [-6, 11, 20], look: [2.0, 0, 50], fov: 48, roll: 0.0 }, f, 1415, 0.0016, 0.004, 14, EV.DROPS14);
// 15 (1507-1679): Boston spring street: Lorz breaks the tape, looks down at his feet, the car honks, the wink; creeping push
const S15 = (f: number): Shot => {
  const lx = Math.min(lorz15X(f), -2.2), a = C([lx + 8.4, 1.6, 1.7], [lx - 1.5, 1.85, -0.5], 46, 0.02), b = C([6.4, 1.6, 1.5], [0.6, 1.65, -0.1], 44, -0.015);
  const c = C([5.7, 1.62, 1.25], [1.5, 1.6, -0.05], 40, -0.01);
  return P(between(mix(a, b, gl(f, EV.TAPE15 - 8, 30)), c, gl(f, EV.FEET15 - 4, 24)), f, 1507, 0.002, 0.005, 10, EV.WINK15 - 2);
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }],
  2: [{ f: 133, s: S2 }],
  3: [{ f: 204, s: S3a }, { f: EV.CUT3, cut: true, s: S3b }],
  4: [{ f: 340, s: S4 }],
  5: [{ f: 449, s: S5 }],
  6: [{ f: 553, s: S6 }],
  7: [{ f: 686, s: S7a }, { f: EV.CUT7, cut: true, s: S7b }],
  8: [{ f: 768, s: S8 }],
  9: [{ f: 886, s: S9a }, { f: EV.CUT9, cut: true, s: S9b }],
  10: [{ f: 988, s: S10 }],
  11: [{ f: 1078, s: S11 }],
  12: [{ f: 1273, s: S12 }],
  13: [{ f: 1331, s: S13 }],
  14: [{ f: 1415, s: S14 }],
  15: [{ f: 1507, s: S15 }],
};

// impact kicks: the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in 7 f, roll +-0.23 deg
// per unit; they start on the first frame at/after the event. No hand-held float.
export const KICKS: [number, number][] = [[EV.GULP1 / FPS, 0.6], [EV.PISTOL3 / FPS, 0.7], [EV.DUST4 / FPS, 0.8], [EV.TAPE6 / FPS, 0.5],
  [EV.CHEER6 / FPS, 0.5], [EV.ROT8 / FPS, 0.7], [EV.CAR7 / FPS, 0.3], [EV.POISON11 / FPS, 0.5], [EV.TAPE13 / FPS, 0.6], [EV.MEDAL13 / FPS, 0.4],
  [EV.TAPE15 / FPS, 0.5], [EV.HONK15 / FPS, 0.4]];
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
 *  Kits: grass (a dry-grass clump), corn (a few corn stalks), fence (a rail-fence section). */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number; space?: "world" | "cam"; tilt?: number };
export const FOREGROUND: Fg[] = [
  { a: 449, b: 553, kit: "grass", pos: [7.6, 0, -111.0], yaw: 0.2, s: 1.3 },
  { a: 1004, b: 1078, kit: "corn", pos: [-1.35, -1.6, 3.4], space: "cam", yaw: 0.3, s: 0.6 },
  { a: 1415, b: 1507, kit: "none", pos: [0, 0, 0] },
];

// ---------------- lens: depth of field ----------------
/** Lens blur per beat (thin lens). cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp.
 *  CU 12-16, MS 10-12, wides / aerials 0. Entries switch on cuts (no dur) or ramp with the camera move they share
 *  f / dur with. focus = world point (else the camera look point). */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 12, focus: (f) => [0.35, 1.5, hicks1Z(f)] },
  { f: 133, cInf: 8, focus: (f) => [-0.9, 1.6, -40 + 0.2 * (f - 133) - 0.95] },
  { f: 204, cInf: 4, focus: () => [SPOT.START_X - 1, 1.5, 0] },
  { f: EV.CUT3, cInf: 6, focus: () => [0.2, 1.5, 38] },
  { f: EV.ROAD3 - 20, dur: 30, cInf: 0 },
  { f: 340, cInf: 5, focus: (f) => [-0.9, 1.4, Math.min(56, 40 + 0.46 * (f - 344))] },
  { f: 449, cInf: 9, focus: () => [SPOT.WELL[0] - 0.4, 1.5, SPOT.WELL[2] - 0.6] },
  { f: 553, cInf: 10, focus: (f) => [lorz6X(f), 1.5, 0.3] },
  { f: 686, cInf: 8, focus: (f) => [-1.25, 1.6, -84 + 0.2 * (f - 686) - 0.95] },
  { f: EV.CUT7, cInf: 10, focus: () => [-3.0, 3.8, -9.0] },
  { f: 768, cInf: 9, focus: () => eyes(SPOT.CUBAN8) },
  { f: EV.ROT8 - 26, dur: 24, cInf: 14, focus: () => eyes(SPOT.CUBAN8) },
  { f: 886, cInf: 11, focus: () => [SPOT.NAP9[0], 0.5, SPOT.NAP9[2]] },
  { f: EV.CUT9, cInf: 10, focus: (f) => [cuban9X(Math.min(f, 975)), 1.5, 0.3] },
  { f: 988, cInf: 8, focus: (f) => { const r = chaser10(f); return [r[0], 1.3, r[2]]; } },
  { f: 1078, cInf: 11, focus: (f) => [0.7, 1.5, hicks11Z(f)] },
  { f: 1273, cInf: 7, focus: (f) => [hicks12X(f), 1.5, 0.3] },
  { f: 1331, cInf: 10, focus: (f) => [hicks13X(f), 1.7, 0.3] },
  { f: 1415, cInf: 0 },
  { f: 1507, cInf: 6, focus: (f) => [Math.min(lorz15X(f), 1.7), 1.5, 0.0] },
  { f: EV.TAPE15, dur: 30, cInf: 11, focus: (f) => [lorz15X(f), 1.5, 0.0] },
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
