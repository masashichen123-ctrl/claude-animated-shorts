// Timeline of "The Bat Bomb" (USA, 1943): 15 shots locked to the voice (voice/words.json, SHOTS.md), the props that
// move (the bomb casing of the hook, the bat crate of the test, the bats' flight paths), set anchors shared by sets /
// cast / cameras, the camera grammar of the template (continuous slow push-ins; symmetric smootherstep glides 18-40 f;
// big reframes are cuts; impacts are 7-frame flip kicks; no hand-held float) and the per-shot depth of field.
//
// CONTRACTS (other owners import these; change them only together with the readers):
//   SetName, Light, ShotDef, SHOTS, XFADE, FLASH_AT, layersAt          -> Bat.tsx, world.ts, cast.ts, build.ts
//   SPOT (set anchors in each set's own local frame; every set sits at the world origin, only one is visible)
//   bombAt / crateAt (rig poses), bat9At / ribbonAt (flight paths)     -> world.ts poses the rigs, cast.ts flies the bats
//   camAt, keyEnd, kickAt, dofAt, focusAt, FOREGROUND                  -> world.ts, Bat.tsx, build.ts
export const FPS = 30;
export const TOTAL = 1650;
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
export type SetName = "desert" | "base" | "cave" | "workshop" | "attic" | "oval" | "lab" | "office";
/** light presets (lights.ts LIGHTS / LOOK, grade.ts GRADES): moonlit hook -> desert sunset -> warm interiors / cool lab
 *  -> bright desert day (the test and the fire) -> grey dusk office -> moonlit ending */
export type Light = "night" | "dusk" | "day" | "interior" | "lab" | "office";
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: Light };
// frame ranges from SHOTS.md (b = exclusive end)
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 114, set: "desert", light: "night" },       // hook: the bomb opens, the bats burst out
  { id: 2, a: 114, b: 171, set: "base", light: "dusk" },        // "Then the bats bombed America."
  { id: 3, a: 171, b: 328, set: "cave", light: "dusk" },        // Adams at the cave, the column of bats
  { id: 4, a: 328, b: 547, set: "workshop", light: "interior" }, // the idea, the capsule, the tabletop model
  { id: 5, a: 547, b: 653, set: "attic", light: "interior" },   // cutaway model house: the attic, the timer, POOF
  { id: 6, a: 653, b: 733, set: "oval", light: "interior" },    // the President says yes
  { id: 7, a: 733, b: 853, set: "lab", light: "lab" },          // the chemist, the tiny bomb, the flexing bat
  { id: 8, a: 853, b: 968, set: "base", light: "day" },         // the test base, the crate, the escape
  { id: 9, a: 968, b: 1110, set: "base", light: "day" },        // one bat looking for a dark place
  { id: 10, a: 1110, b: 1150, set: "base", light: "day" },      // under the fuel tank
  { id: 11, a: 1150, b: 1215, set: "base", light: "day" },      // WHOOMP
  { id: 12, a: 1215, b: 1302, set: "base", light: "day" },      // the base burns, the bucket line
  { id: 13, a: 1302, b: 1418, set: "base", light: "day" },      // burnt hangar; the General's car
  { id: 14, a: 1418, b: 1515, set: "office", light: "office" }, // the project is cancelled
  { id: 15, a: 1515, b: TOTAL, set: "cave", light: "night" },   // the medal, the wink
];
/** 5-frame anchored dissolves (place / time changes); a white flash after the hook */
export const XFADE: Record<number, number> = { 3: 5, 8: 5, 14: 5, 15: 5 };
export const FLASH_AT = 112;

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
  POP1: 80,         // the casing's panels pop open, the bats burst out
  GRIN1: 95,        // "bats"@95: the hero bat grins in the lens
  DIVE2: 121,       // "bats"@121: the swarm dives in
  FIRES2: [128, 131, 134, 137, 139] as number[], // little roof fires pop ("bombed"@128 .. "America"@139)
  KICK2: 139,       // the soldier's cap flies off, jaw drop, KICK
  COLUMN3: 290,     // the column of bats spirals out of the cave
  TURN3: 308,       // "bats"@308: Adams turns to the lens, big eyes
  BULB4: 331,       // the light bulb pops on
  CU4: 367,         // "strap": the bench close-up
  STRAP4: 392,      // the capsule is on
  MEH4: 413,        // "bat": the bat looks at it, unimpressed
  CUT4: 430,        // the tabletop planning model
  FLUTTER5: 553,    // the bat flutters into the attic
  HANG5: 565,       // "hide": hangs upside down, cosy
  TICK5: 607,       // "timers": push in on the ticking timer
  POOF5: 628,       // "off": POOF, the bat's eyes pop, KICK
  STAMP6: 711,      // the stamp slams down ("yes"@713 KICK)
  YES6: 713,
  TWEEZ7: 800,      // the chemist holds up the capsule
  FIT7: 828,        // the bat has tried one on
  FLEX7: 845,       // flexes a tiny bicep, thumbs-up wing
  CRATE8: 880,      // soldiers carry the crate of bats
  LID8: 940,        // the lid pops
  ESCAPE8: 947,     // the bats flutter out
  TANK11: 1186,     // WHOOMP, KICK
  CRANE12: 1274,    // the whole base burning
  CUT13: 1365,      // the General polishing his car
  CHAR13: 1394,     // puff: the car is a charred shell
  KICK13: 1397,
  WEIGH14: [1430, 1450] as [number, number],
  DROP14: 1489,     // folder into the wastebasket (thunk)
  TURN15: 1600,     // the medal bat turns to the lens, smug
  WINK15: 1610,
};

// ---------------- set anchors (each set's local frame = world frame) ----------------
export const SPOT = {
  // desert (shot 1): the camera hangs in the night sky, the desert floor 30 m below
  CAM1: [0, 30, 8] as V3,
  BOMB1: [0.25, 32.9, -4.0] as V3,          // where the casing pops
  // base: hangar (doors on +z), control tower, water tower, barracks, the big fuel tank on legs, the General's car
  HANGAR: [-18, 0, -24] as V3, HANGAR_W: 20, HANGAR_D: 20, HANGAR_H: 7.2,
  TOWER: [6, 0, -32] as V3,
  WTOWER: [22, 0, -40] as V3,
  FLAG: [-3, 0, -11] as V3,
  BARRACKS: [[10, 0, -10, 0], [27, 0, -13, 0.12], [13, 0, -24, 0]] as [number, number, number, number][], // centre + yaw; 14 x 5 m, door + steps on +z
  STEP: [8.0, 0, -7.1] as V3,               // shot 9: the step the bat peeks under
  TANK: [-3, 0, 4] as V3, TANK_R: 2.3, TANK_L: 10, TANK_Y: 4.7,       // axis along x at TANK_Y; underside at TANK_Y - TANK_R
  CAR: [-12, 0, -5] as V3,                   // the General's car, nose toward +x
  CRATES9: [1.5, 0, -5.0] as V3,             // the crate stack the bat looks behind
  SOLDIER2: [14.7, 0, 13.8] as V3,
  // cave: overlook platform at y 0, the bowl falls to the cave floor at y -8, the mouth on z = -30 (x -7..7, up to y 3)
  ADAMS3: [6.6, 0, -3.0] as V3,
  RAIL_Z: -4.4,
  MOUTH: [0, -8, -30] as V3, MOUTH_W: 14, MOUTH_H: 11,
  FLOOR_Y: -8,
  LIP15: [1.2, 1.8, -30.4] as V3,           // shot 15: the medal bat hangs from the cave lip (feet at the rock)
  CAM15: [0.0, -5.2, -40] as V3,
  // workshop: bench centre, the planning table with the model town
  BENCH: [0, 0, 0] as V3, BENCH_Y: 0.92,
  ADAMS4: [0.05, 0, -0.95] as V3,
  BAT4: [-0.12, 0.92, 0.12] as V3,
  TABLE: [4.2, 0, 1.2] as V3, TABLE_Y: 0.84,
  ADAMS4C: [4.15, 0, 0.05] as V3,
  // attic: the cutaway model house (front open), ridge beam of the attic
  HOUSE5: [0, 0, 0] as V3, RIDGE5: [0, 1.44, 0] as V3,
  // oval office: the desk, the President behind it, Adams in front
  DESK6: [0, 0, -1.4] as V3, DESK_Y: 0.8,
  PRES6: [0.05, -0.2, -1.93] as V3,
  ADAMS6: [-0.35, 0, -0.65] as V3,
  PAPER6: [0.3, 0.805, -1.68] as V3,
  // lab
  LABBENCH: [0, 0, 0] as V3, LAB_Y: 0.92,
  CHEM7: [0.42, 0, -0.85] as V3,
  BAT7: [-0.34, 0.92, 0.08] as V3,
  // office
  ODESK: [0, 0, -1.1] as V3, ODESK_Y: 0.78,
  OFFICER14: [0.15, 0, -1.8] as V3,
  BAGS14: [-0.38, 0.78, -1.08] as V3,
  BASKET14: [0.6, 0, -0.38] as V3,
  TRAY14: [0.6, 0.78, -0.95] as V3,
};

// ---------------- terrain heights shared by build.ts (the ground) and cast.ts ----------------
/** cave set: overlook ground at 0, the bowl in front of the mouth down to FLOOR_Y */
export const caveGround = (x: number, z: number) => {
  const zb = smooth((-z - 7) / 10);                         // 0 at z = -7 .. 1 at z = -17
  const side = smooth((Math.abs(x) - 16) / 14);             // the bowl's side walls
  return SPOT.FLOOR_Y * zb * (1 - side) + 4 * side * smooth((-z + 2) / 20);
};

// ---------------- moving props ----------------
/** the hook's bomb casing: pos = centre, pitch = tilt off vertical (rad), open = panel opening 0..1, spin about its axis */
export type BombPose = { visible: boolean; pos: V3; tilt: number; open: number; spin: number };
export const bombAt = (id: number, f: number): BombPose => {
  if (id !== 1) return { visible: false, pos: [0, -99, 0], tilt: 0, open: 0, spin: 0 };
  const B = SPOT.BOMB1, u = clamp01(f / EV.POP1);
  // drops in fast from above the frame and settles into a slow fall at the centre (cartoon hang), then sinks away
  const y = f < EV.POP1 ? B[1] + 7.5 * (1 - u) ** 1.6 : B[1] - 0.9 * ((f - EV.POP1) / FPS) - 3.2 * ((f - EV.POP1) / FPS) ** 2;
  const x = B[0] + 0.9 * (1 - u) ** 2;
  const open = f < EV.POP1 ? 0 : easeOut((f - EV.POP1) / 7);
  return { visible: true, pos: [x, y, B[2]], tilt: 0.16 * Math.sin(f * 0.07) + 0.12 * (1 - u), open, spin: f * 0.015 };
};
/** shot 8: the crate of bats carried in by two soldiers; lid 0..1 (pops open at LID8) */
export type CratePose = { visible: boolean; pos: V3; yaw: number; lid: number; jolt: number };
export const crate8X = (f: number) => 12.6 - 3.2 * glide((f - 853) / 80) - 0.6 * glide((f - 925) / 30);
export const crateAt = (id: number, f: number): CratePose => {
  if (id !== 8) return { visible: false, pos: [0, -99, 0], yaw: 0, lid: 0, jolt: 0 };
  const walk = f < 930, bob = walk ? 0.03 * Math.abs(Math.sin(f * 0.42)) : 0;
  const jolt = f >= EV.LID8 - 4 && f < EV.LID8 ? 0.05 * Math.sin((f - EV.LID8 + 4) * 2.2) : 0;
  return { visible: true, pos: [crate8X(f), 0.78 + bob + jolt, 12.4], yaw: 0.05, lid: f < EV.LID8 ? 0 : easeOut((f - EV.LID8) / 5) * 1.9, jolt };
};

// ---------------- flight paths ----------------
/** a smooth path through keyed points (smootherstep between keys) */
const keyed = (keys: [number, V3][], f: number): V3 => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (f < keys[i][0]) return lerp3(keys[i - 1][1], keys[i][1], glide((f - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  return keys[keys.length - 1][1];
};
/** shot 9: one bat cruising the base: under the barracks step, behind the crate stack, on toward the fuel tank */
export const BAT9_KEYS: [number, V3][] = [
  [968, [11.2, 2.6, 2.4]], [996, [8.6, 0.85, -5.4]], [1004, [8.25, 0.42, -6.25]], [1030, [8.2, 0.42, -6.3]],
  [1046, [3.6, 1.6, -3.4]], [1056, [2.05, 0.75, -4.2]], [1078, [2.0, 0.75, -4.25]], [1110, [-0.4, 2.2, 1.6]],
];
export const bat9At = (f: number): V3 => {
  const p = keyed(BAT9_KEYS, f);
  return [p[0], p[1] + 0.05 * Math.sin(f * 0.5), p[2]];
};
/** the cave's bat column / ribbon: point on the centre line at s (0 deep in the cave .. 1 high in the sky) */
const bez = (a: V3, b: V3, c: V3, d: V3, t: number): V3 => {
  const s = 1 - t, A = s * s * s, B = 3 * s * s * t, C = 3 * s * t * t, D = t * t * t;
  return [A * a[0] + B * b[0] + C * c[0] + D * d[0], A * a[1] + B * b[1] + C * c[1] + D * d[1], A * a[2] + B * b[2] + C * c[2] + D * d[2]];
};
export const ribbonAt = (id: number, s: number): V3 => id === 15
  ? bez([0, -5.6, -46], [0, -4.6, -28], [1.5, 6, -16], [8, 36, 4], s)
  : bez([0, -6.5, -38], [0, -5, -26], [-1, 12, -30], [-10, 46, -36], s);

// ---------------- camera ----------------
// Grammar (look_reports/motion.md + composition.md): every key pushes in 0.2-0.35 %/f; every shot of >= 2 s carries one
// glide (truck, arc, crane) of 24-45 f; rolls of 1-3 deg alternate sign between keys; reframes bigger than about half a
// frame are cuts; impacts are 7-frame flip kicks.
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
/** eye point of a card (DOF focus) */
export const eyes = (p: V3, s = 1): V3 => [p[0], p[1] + 1.52 * s, p[2]];

// ---- per-shot cameras ----
// 1 (0-113): in the night sky, the bomb drops into the frame centre, pops; the hero bat flies into the lens
const S1 = (f: number): Shot => {
  const a = C([0.2, 30.4, 8.4], [0.1, 33.2, -10], 52, 0.03), b = C([0.0, 30.0, 7.9], [0.15, 32.4, -10], 50, -0.02);
  const c = between(a, b, gl(f, 0, 100));
  return zoom(c.pos, c.look, c.fov!, pushK(f, 0, 0.001) * pushK(f, EV.POP1, 0, 0.006, 14), { roll: c.roll });
};
// 2 (114-170): the base at dusk past the soldier's shoulder (right third); the swarm dives in from the top left
const S2 = (f: number): Shot => zoom([16.2, 1.55, 17.2], [-4, 4.4, -16], 48, pushK(f, 114, 0.0016) * pushK(f, 137, 0, 0.007, 14), { roll: -0.025 });
// 3 (171-327): establishing wide over the overlook toward the cave mouth, glide down to Adams at the rail by "Adams";
// tilt up with the column at 290, punch in on Adams' turn at 308
const S3 = (f: number): Shot => {
  const a = C([10.5, 6.8, 8.5], [-0.5, -2.5, -30], 50, 0.03), b = C([7.0, 1.95, 0.4], [-0.4, -1.8, -30], 46, -0.02);
  const c2 = C([7.0, 1.9, 0.4], [-0.6, 4.5, -30], 50, 0.02);
  const u = gl(f, 176, 52), v = gl(f, 284, 26);
  const s = mix(mix(a, b, u), c2, v);
  return zoom(s.pos, s.look, s.fov!, pushK(f, 228, 0.0016) * pushK(f, 305, 0, 0.007, 16), { roll: s.roll });
};
// 4a (328-366): Adams behind his bench, the bulb pops; 4b (367-429): bench close-up; 4c (430-546): the planning model
const S4a = (f: number): Shot => P({ pos: [0.75, 1.56, 2.35], look: [0.02, 1.5, -0.9], fov: 42, roll: 0.02 }, f, 328, 0.0028, 0.008, 12, 330);
const S4b = (f: number): Shot => {
  const B = SPOT.BAT4, a = C([0.32, 1.22, 1.02], [B[0] - 0.02, 1.08, B[2] - 0.12], 40, -0.02), b = C([0.2, 1.16, 0.78], [B[0], 1.06, B[2] - 0.08], 38, 0.015);
  return P(between(a, b, gl(f, 395, 26)), f, 367, 0.0022, 0.006, 14, 411);
};
const S4c = (f: number): Shot => {
  const Tb = SPOT.TABLE, a = C([Tb[0] + 1.6, 2.55, Tb[2] + 2.6], [Tb[0] - 0.1, 0.95, Tb[2] - 0.3], 46, 0.03), b = C([Tb[0] + 0.8, 2.35, Tb[2] + 2.3], [Tb[0] - 0.05, 1.0, Tb[2] - 0.35], 44, -0.02);
  return P(between(a, b, gl(f, 436, 60)), f, 430, 0.0018, 0.006, 16, 512);
};
// 5 (547-652): the cutaway model house; push into the attic, then onto the timer; POOF
const S5 = (f: number): Shot => {
  const R = SPOT.RIDGE5;
  const a = C([0.35, 1.0, 3.6], [0.0, 0.85, 0.0], 40, 0.02), b = C([0.22, 1.32, 2.3], [R[0], R[1] - 0.3, 0.0], 38, -0.02);
  const c = C([0.08, 1.26, 0.95], [R[0], R[1] - 0.12, 0.0], 36, 0.01);
  const s = mix(mix(a, b, gl(f, 553, 40)), c, gl(f, 600, 28));
  return P(s, f, 547, 0.0016, 0.009, 12, 626);
};
// 6 (653-732): the President's desk from the front-left, Adams on the right; push on the stamp
const S6 = (f: number): Shot => {
  const a = C([1.35, 1.55, 2.6], [-0.1, 1.05, -1.4], 46, 0.025), b = C([1.15, 1.5, 2.15], [-0.1, 1.02, -1.4], 46, -0.02);
  return P(between(a, b, gl(f, 662, 40)), f, 653, 0.002, 0.008, 14, 709);
};
// 7 (733-852): the lab two-shot; glide toward the bat on the bench for the flex
const S7 = (f: number): Shot => {
  const B = SPOT.BAT7, a = C([0.1, 1.48, 2.3], [0.0, 1.25, -0.4], 42, -0.02), b = C([-0.2, 1.22, 1.05], [B[0] + 0.08, 1.12, B[2] - 0.2], 40, 0.02);
  return P(between(a, b, gl(f, 812, 28)), f, 733, 0.0018, 0.006, 14, 843);
};
// 8 (853-967): the test base on a bright day; glide in to the soldiers carrying the crate; the lid pops
const S8 = (f: number): Shot => {
  const a = C([20, 4.4, 26], [-2, 3.2, -8], 52, 0.02), b = C([13.6, 1.9, 19.0], [8.6, 1.35, 10.0], 46, -0.02);
  return P(between(a, b, gl(f, 858, 46)), f, 853, 0.0016, 0.006, 14, 938);
};
// 9 (968-1109): follow the bat: the lens trails it low, beside and behind
const S9 = (f: number): Shot => {
  const p = bat9At(f), q = bat9At(f + 10), d: V3 = [q[0] - p[0], 0, q[2] - p[2]], l = Math.hypot(d[0], d[2]) || 1;
  const back: V3 = [-d[0] / l, 0, -d[2] / l], side: V3 = [-back[2], 0, back[0]];
  const off = (k: number, s: number, h: number): V3 => [back[0] * k + side[0] * s, h, back[2] * k + side[2] * s];
  const o = lerp3(off(1.4, 0.9, 0.35), off(1.6, 1.2, 0.55), smooth((f - 1080) / 30));
  return { pos: add(p, o), look: [p[0], p[1] - 0.05, p[2]], fov: 46, roll: 0.02 * Math.sin(f * 0.05) };
};
// smoothed follow (the raw path turns at the keys; low-pass the camera by averaging a few frames)
const S9s = (f: number): Shot => {
  let pos: V3 = [0, 0, 0], look: V3 = [0, 0, 0];
  for (let k = -6; k <= 6; k += 2) { const s = S9(f + k); pos = add(pos, s.pos); look = add(look, s.look); }
  return { pos: pos.map((v) => v / 7) as V3, look: look.map((v) => v / 7) as V3, fov: 46, roll: 0.02 * Math.sin(f * 0.05) };
};
// 10 (1110-1149): low under the fuel tank, looking up along the pipe at the row of hanging bats
const S10 = (f: number): Shot => zoom([0.9, 0.85, 8.2], [-1.5, 1.95, 5.05], 36, pushK(f, 1110, 0.0025) * pushK(f, 1124, 0, 0.006, 14), { roll: -0.04 });
// 11 (1150-1214): wide on the tank; WHOOMP
const S11 = (f: number): Shot => P({ pos: [15, 4.2, 25], look: [-2, 4.6, 3], fov: 50, roll: 0.02 }, f, 1150, 0.0018, 0.006, 10, 1186);
// 12 (1215-1301): the bucket line in the foreground, crane up to the whole base burning by 1274
const S12 = (f: number): Shot => {
  const a = C([13.5, 1.75, 19.5], [4, 2.2, 6], 48, -0.02), b = C([22, 19, 36], [-2, 1.5, -10], 52, 0.02);
  return P(between(a, b, gl(f, 1232, 42)), f, 1215, 0.0012);
};
// 13a (1302-1364): smoky glide past the burnt hangar frame; 13b (1365-1417): the General polishes his car
const S13a = (f: number): Shot => {
  const a = C([2.5, 3.2, -6.5], [-15, 4.6, -24], 48, 0.02), b = C([-4.0, 2.8, -9.5], [-18, 4.5, -24], 46, -0.02);
  return between(a, b, gl(f, 1302, 62));
};
const S13b = (f: number): Shot => {
  const Cr = SPOT.CAR;
  return P({ pos: [Cr[0] + 1.35, 1.52, Cr[2] + 4.3], look: [Cr[0] + 0.1, 1.2, Cr[2] + 0.6], fov: 44, roll: -0.025 }, f, EV.CUT13, 0.0022, 0.008, 12, 1392);
};
// 14 (1418-1514): the grey office, the officer, the money bags, the wastebasket; push on the drop
const S14 = (f: number): Shot => {
  const a = C([-0.4, 1.5, 2.6], [0.15, 1.05, -0.9], 54, 0.02), b = C([-0.2, 1.45, 2.3], [0.15, 1.0, -0.9], 52, -0.02);
  return P(between(a, b, gl(f, 1458, 36)), f, 1418, 0.0018, 0.006, 14, 1487);
};
// 15 (1515-1649): from inside the cave, out through the mouth at the moon; dolly along the line onto the medal bat on
// the lip (it stays in front of the moon), then creep to the end
const S15 = (f: number): Shot => {
  const L = SPOT.LIP15, B: V3 = [L[0], L[1] - 0.22, L[2]], c0 = SPOT.CAM15, dir: V3 = [B[0] - c0[0], B[1] - c0[1], B[2] - c0[2]];
  const len = Math.hypot(...dir), u = gl(f, 1528, 66), d = lerp(len, 1.25, u) * pushK(f, 1594, 0.0024);
  const n: V3 = [dir[0] / len, dir[1] / len, dir[2] / len];
  return { pos: [B[0] - n[0] * d, B[1] - n[1] * d, B[2] - n[2] * d], look: [B[0] + n[0] * 3, B[1] + n[1] * 3 - 0.09 * (d + 3), B[2] + n[2] * 3], fov: lerp(50, 42, u), roll: lerp(0.02, -0.03, u) };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }],
  2: [{ f: 114, s: S2 }],
  3: [{ f: 171, s: S3 }],
  4: [{ f: 328, s: S4a }, { f: EV.CU4, cut: true, s: S4b }, { f: EV.CUT4, cut: true, s: S4c }],
  5: [{ f: 547, s: S5 }],
  6: [{ f: 653, s: S6 }],
  7: [{ f: 733, s: S7 }],
  8: [{ f: 853, s: S8 }],
  9: [{ f: 968, s: S9s }],
  10: [{ f: 1110, s: S10 }],
  11: [{ f: 1150, s: S11 }],
  12: [{ f: 1215, s: S12 }],
  13: [{ f: 1302, s: S13a }, { f: EV.CUT13, cut: true, s: S13b }],
  14: [{ f: 1418, s: S14 }],
  15: [{ f: 1515, s: S15 }],
};

// impact kicks: the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in 7 f, roll +-0.23 deg
// per unit; they start on the first frame at/after the event. No hand-held float.
export const KICKS: [number, number][] = [[EV.KICK2 / FPS, 1.0], [EV.POOF5 / FPS, 0.8], [EV.YES6 / FPS, 0.9], [EV.TANK11 / FPS, 1.5], [EV.KICK13 / FPS, 1.0], [EV.DROP14 / FPS, 0.4]];
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
 *  y up, z forward, metres) so the prop stays framed through the push-ins; "world": a world position. Drawn by build.ts
 *  fgUpdate from these kit names. Kits: yucca, jars, flask, sandbags, crate. */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number; space?: "world" | "cam"; tilt?: number };
export const FOREGROUND: Fg[] = [
  { a: 171, b: 328, kit: "yucca", pos: [8.6, 0, -1.6], yaw: 0.4, s: 1.0 },             // cave overlook: a yucca on the left
  { a: 853, b: 968, kit: "sandbags", pos: [15.2, 0, 16.2], yaw: -0.6, s: 1.0 },         // test base: sandbags bottom right
  { a: 1215, b: 1302, kit: "crate", pos: [12.2, 0, 16.6], yaw: 0.5, s: 1.0 },
];

// ---------------- lens: depth of field ----------------
/** Lens blur per beat (thin lens). cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp.
 *  CU 12-16, MS 10-12, wides / aerials 0. Entries switch on cuts (no dur) or ramp with the camera move they share
 *  f / dur with. focus = world point (else the camera look point). */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
/** hero bat of the hook (cast.ts flies it; the lens focuses on it) */
export const hero1At = (f: number): V3 => {
  const B = SPOT.BOMB1, c = camAt(1, Math.min(f, 112));
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], l = Math.hypot(...d);
  const end: V3 = [c.pos[0] + (d[0] / l) * 1.45, c.pos[1] + (d[1] / l) * 1.45 - 0.12, c.pos[2] + (d[2] / l) * 1.45];
  const u = easeOut((f - EV.POP1) / 15);
  const p = lerp3([B[0], B[1], B[2]], end, u);
  return [p[0] + 0.25 * Math.sin(u * Math.PI) , p[1] + 0.03 * Math.sin(f * 0.6), p[2]];
};
export const DOF: Dof[] = [
  { f: 0, cInf: 6, focus: (f) => lerp3(bombAt(1, f).pos, hero1At(f), smooth((f - 82) / 12)) }, // bomb, then rack to the hero bat
  { f: 114, cInf: 9, focus: () => eyes(SPOT.SOLDIER2) },
  { f: 171, cInf: 0 },                                                       // cave establishing
  { f: 200, dur: 40, cInf: 8, focus: () => eyes(SPOT.ADAMS3) },
  { f: 328, cInf: 10, focus: () => eyes(SPOT.ADAMS4) },
  { f: EV.CU4, cInf: 13, focus: () => [SPOT.BAT4[0], SPOT.BAT4[1] + 0.12, SPOT.BAT4[2]] },
  { f: EV.CUT4, cInf: 6, focus: () => [SPOT.TABLE[0], SPOT.TABLE_Y + 0.3, SPOT.TABLE[2] - 0.2] },
  { f: 547, cInf: 9, focus: () => [0, 1.2, 0] },
  { f: 600, dur: 28, cInf: 13, focus: () => [SPOT.RIDGE5[0], SPOT.RIDGE5[1] - 0.25, 0] },
  { f: 653, cInf: 9, focus: () => [0.6, 1.3, -1.0] },
  { f: 733, cInf: 9, focus: () => eyes(SPOT.CHEM7) },
  { f: 812, dur: 28, cInf: 12, focus: () => [SPOT.BAT7[0], SPOT.BAT7[1] + 0.14, SPOT.BAT7[2]] },
  { f: 853, cInf: 0 },
  { f: 858, dur: 46, cInf: 7, focus: () => [9.6, 1.4, 12.4] },
  { f: 968, cInf: 10, focus: (f) => bat9At(f) },
  { f: 1110, cInf: 11, focus: () => [-0.9, 1.95, 5.05] },
  { f: 1150, cInf: 0 },
  { f: 1215, cInf: 7, focus: () => [9, 1.4, 13] },
  { f: 1232, dur: 42, cInf: 0 },
  { f: 1302, cInf: 3, focus: () => [-16, 4, -14] },
  { f: EV.CUT13, cInf: 11, focus: () => eyes([SPOT.CAR[0] + 0.2, 0, SPOT.CAR[2] + 1.7]) },
  { f: 1418, cInf: 9, focus: () => eyes(SPOT.OFFICER14) },
  { f: 1515, cInf: 5, focus: () => SPOT.LIP15 },
  { f: 1530, dur: 60, cInf: 12, focus: () => [SPOT.LIP15[0], SPOT.LIP15[1] - 0.22, SPOT.LIP15[2]] },
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
