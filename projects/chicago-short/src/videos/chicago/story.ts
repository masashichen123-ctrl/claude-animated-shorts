// Timeline of "Chicago Lifts a Hotel" (the raising of the Tremont House, 1861): 14 shots locked to the voice
// (voice/words.json, SHOTS.md), the event frames the sound is timed to, the set anchors shared by sets / cast / cameras,
// the props that move (the hotel's rise, the jackscrew turns, the measuring-board flag, the raised street, the coin),
// the camera grammar of the template (continuous slow push-ins; symmetric smootherstep glides 18-40 f; big reframes are
// cuts; impacts are 7-frame flip kicks; no hand-held float) and the per-shot depth of field.
//
// CONTRACTS (other owners import these; change them only together with the readers):
//   SetName, Light, ShotDef, SHOTS, XFADE, FLASH_AT, layersAt, setOf    -> Chicago.tsx, world.ts, cast.ts, build.ts
//   SPOT, EV, riseAt / hotelY / screwTurn / fillAt / boardK ...             -> sets + cast
//   camAt, keyEnd, kickAt, dofAt, focusAt, FOREGROUND                       -> world.ts, Chicago.tsx, build.ts
export const FPS = 30;
export const TOTAL = 1770;
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
/** one THREE.Group per set (build.ts buildSets); only the active set is visible.
 *  town: the swamp-edge muddy street (mud, cattails, the lake, plank sidewalks, the clinic porch); hall: the council
 *  hall; pit: the raised street over the old buildings; street: the Tremont House on its jackscrews (the hero set);
 *  office: the contractors' office; cutaway: the hotel as a dollhouse (lobby / dining room / bedroom);
 *  platform: the golden-dusk station with the steam train; sleeper: the Pullman car interior */
export type SetName = "town" | "hall" | "pit" | "street" | "office" | "cutaway" | "platform" | "sleeper";
/** light presets (lights.ts LIGHTS / LOOK, grade.ts GRADES) */
export type Light = "day" | "overcast" | "interior" | "warm" | "golden";
/** alt: a cut inside the shot to another set from frame alt[0] */
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: Light; alt?: [number, SetName] };
// frame ranges from SHOTS.md (b = exclusive end)
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 198, set: "street", light: "day" },                       // HOOK: the hotel rising on the jackscrew forest
  { id: 2, a: 198, b: 300, set: "town", light: "overcast" },                  // swamp-edge town, the street of mud
  { id: 3, a: 300, b: 389, set: "town", light: "overcast" },                  // the burping puddle
  { id: 4, a: 389, b: 469, set: "town", light: "overcast" },                  // cholera: green faces on the clinic porch
  { id: 5, a: 469, b: 618, set: "hall", light: "interior" },                  // the council hall + the easel
  { id: 6, a: 618, b: 715, set: "pit", light: "day" },                        // the street goes up, the buildings sit in a pit
  { id: 7, a: 715, b: 817, set: "street", light: "day" },                     // the Tremont House on the ground
  { id: 8, a: 817, b: 937, set: "office", light: "interior" },                // Pullman and his partners
  { id: 9, a: 937, b: 1072, set: "street", light: "day" },                   // under the hotel: the jackscrew
  { id: 10, a: 1072, b: 1223, set: "street", light: "day" },                 // the signal, three turns
  { id: 11, a: 1223, b: 1301, set: "street", light: "day" },                 // inch by inch, six feet
  { id: 12, a: 1301, b: 1489, set: "cutaway", light: "warm" },               // the hotel never closed
  { id: 13, a: 1489, b: 1570, set: "street", light: "day" },                 // not a single window broke
  { id: 14, a: 1570, b: 1770, set: "platform", light: "golden", alt: [1619, "sleeper"] }, // Pullman rich; the sleeping car
];
/** 5-frame anchored dissolves (place / time changes); a white flash after the hook */
export const XFADE: Record<number, number> = { 5: 5, 7: 5, 14: 5 };
export const FLASH_AT = 196;

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
  WAVE1: 168, SLEEP1: 172, SPOON1: 176, RISE1: 100,                   // hook: guests wave from the windows
  FROG2: 250, MUD2: 280, SCHLORP2: 296, CUT2: 268,                    // the frog, the river of mud, the boot
  BUBBLE3: 328, FLOW3: 343, STINK3: 358,                              // burp, the circling flow, the dog holds his nose
  COUGH4: 398, SHAKE4: 427,                                           // sneezes, the doctor shakes his head
  WILD5: 473, GAVEL5: 496, CUTIN5: 505, ARROW5: 541, PIPE5: 574, GASP5: 548,
  SHOVEL6: 623, DUMP6: 650, PULL6: 660, BONK6: 685,
  CREST7: 740, ROOF7: 788,
  PLAN8: 823, SMILE8: 859, HANDS8: 890, CHAIN8: 906,
  SCREW9: 974, PULLBACK9: 1000, MARCH9: 1033,
  FLAG10: 1079, WHISTLE10: 1088, TURN10: 1142, TURN10B: 1168, TURN10C: 1194,
  MARK11: 1234, MARK11B: 1248, MARK11C: 1261, MARK11D: 1276,
  OPEN12: 1309, DINER12: 1360, SLEEPER12: 1385, CLERK12: 1409, PULLOUT12: 1442,
  TAP13: 1526, DRY13: 1535, WINK13: 1550,
  BEAM14: 1588, COIN14: 1596, CUT14: 1619, PUSH14: 1676, WINDOW14: 1698,
};

// ---------------- set anchors (each set's local frame = world frame) ----------------
// street: the Tremont House stands with its front face on the plane z = 0 (x -9..9), the body running back to z = -22;
//   the plaza opens toward +z; the jackscrew field is a grid under the footprint. The hotel's group is lifted by
//   hotelY(id, f); the timber grillage under it by 0.5 m.
export const HOTEL = { W: 18, D: 24, FH: [0, 4.4, 8.0, 11.6, 15.2, 18.8, 22.4] as number[], TOP: 22.4, BAYS: [-7.2, -3.6, 0, 3.6, 7.2] as number[], SILL: 0.85 };
export const SCREWS = { COLS: 12, ROWS: 20, DX: 1.5, DZ: 1.2 };
export const screwX = (i: number) => -8.25 + SCREWS.DX * i;
export const screwZ = (j: number) => -0.9 - SCREWS.DZ * j;
export const SPOT = {
  HERO_SCREW: [0.75, 0, -0.9] as V3,      // the screw of the CU in shot 9 (a front-row screw)
  FOREMAN: [-2.4, 0, 4.6] as V3,         // the foreman's crate
  BOARD: [-11.8, 0, 6.5] as V3,          // the measuring board
  WINDOW13: [-3.6, 0, 0] as V3,          // x of the bay of the window in shot 13 (floor 2)
  // town
  CLINIC: [-8, 0, -20] as V3,
  // cutaway: x centre / room floor heights relative to the building base
  CUT_W: 12, CUT_D: 6, ROOM_H: [0, 4.2, 8.0] as number[], CUT_TOP: 11.8,
  // hall
  EASEL: [3.6, 0, -1.2] as V3, MAYOR: [0, 0, -8.6] as V3,
  // pit
  PIT_STAIR_X: 6, SLAB_H: 2.6,
  // office
  TABLE: [0, 0.82, -0.2] as V3,
  // platform
  STATION: [0, 0, 0] as V3,
};
export const groundY = (_x: number, _z: number) => 0;

// ---------------- prop / actor timelines ----------------
const step = (f: number, f0: number, dur = 8) => glide((f - f0) / dur);
/** the hotel's height above its resting place, per shot (see hotelY) */
export const riseAt = (id: number, f: number): number => {
  switch (id) {
    case 1: return 1.5 * glide((f - EV.RISE1) / 98);
    case 10: return 0.18 * (step(f, EV.TURN10, 10) + step(f, EV.TURN10B, 10) + step(f, EV.TURN10C, 10));
  case 11: return 0.54 + 0.4 * (step(f, EV.MARK11) + step(f, EV.MARK11B) + step(f, EV.MARK11C) + step(f, 1268) + step(f, 1272) + step(f, EV.MARK11D));
    case 12: return 2.94 + 1.4 * glide((f - 1301) / 188);
    case 13: return 4.34 + 0.8 * smooth((f - 1489) / 81);
  }
  return 0;
};
/** height of the hotel's underside above the ground */
export const hotelY = (id: number, f: number): number => {
  if (id === 7) return 0.55;                // before the lift: the hotel stands on its plinth
  if (id === 1) return 3.4 + riseAt(1, f);
  if (id === 9) return 2.6;
  return 2.6 + riseAt(id, f);
};
/** the cutaway house's base height in shot 12 (the dollhouse sits on its own jackscrews) */
export const cutY = (f: number) => 3.0 + riseAt(12, f);
/** shot 11 measuring-board flag: marks 0..6 */
export const boardK = (f: number) => (riseAt(11, f) - 0.54) / 0.4;
/** quarter-turns of a worker's crossbar since the start (radians): a ripple moves back one row every 0.55 f */
const TURNS = [1130, 1156, 1182, 1225, 1239, 1252, 1259, 1263, 1267];
export const screwTurn = (f: number, row: number) => {
  let a = 0;
  for (const t0 of TURNS) a += (Math.PI / 2) * glide((f - t0 - 0.55 * row) / 14);
  return a;
};
/** 0..1 lean pulse of a worker while his bar is turning (for the acting) */
export const turnPulse = (f: number, row: number) => {
  let m = 0;
  for (const t0 of TURNS) { const u = (f - t0 - 0.55 * row) / 14; if (u > 0 && u < 1) m = Math.max(m, Math.sin(Math.PI * u)); }
  return m;
};
/** shot 9: the march of the workers into their rows (z of a worker whose row z is zt, starting behind) */
export const marchZ = (f: number, zt: number, k: number) => {
  const arrive = 1018 + 1.5 * (-zt) + (k % 5) * 3;
  return zt + Math.max(0, (arrive - f) * 0.11);
};
/** the raised street (shot 6): the fill height */
export const fillAt = (f: number) => SPOT.SLAB_H * smooth((f - 628) / 40);
/** shot 12 cutaway lobby clock hands etc. are time-based in the set tick */

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
/** zoom push (camera stays put): tan(fov/2) shrinks by k */
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
/** push a shot in from frame f0 at `rate` (punch as in pushK, starting at punchAt) */
const P = (s: Shot, f: number, f0: number, rate = 0.0025, punch = 0, n = 35, punchAt = f0): Shot =>
  dolly(s.pos, s.look, pushK(f, f0, rate) * (punch ? pushK(f, punchAt, 0, punch, n) : 1), { fov: s.fov, roll: s.roll });
/** zoom version of P */
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
// 1 (0-197): HOOK. Low on the plaza, the whole six-story hotel filling the frame on its forest of jackscrews with a gap
// of daylight beneath it; it rises; push-in; the camera tilts up with the roof.
const S1 = (f: number): Shot => {
  const H = hotelY(1, f);
  return P({ pos: [1.6, 1.3, 70], look: [0, 12.8 + 0.5 * H, 0], fov: 40, roll: 0.012 - 0.0002 * f }, f, 0, 0.0012, 0);
};
// 2a (198-267): the lake edge: cattails, frogs, mist, the puddle. 2b (268-299): the river of mud
const S2a = (f: number): Shot => P({ pos: [2.2, 0.75, 33.5], look: [-0.6, 0.55, 18], fov: 44, roll: 0.02 }, f, 198, 0.0035, 0.007, 12, EV.FROG2 - 3);
const S2b = (f: number): Shot => P({ pos: [5.0, 1.6, 28.0], look: [0.0, 1.2, 10.0], fov: 46, roll: -0.02 }, f, EV.CUT2, 0.002, 0.006, 12, EV.SCHLORP2 - 3);
// 3 (300-388): low over the puddle that is the whole street; bubbles, the circling flow, the stink; the dog
const S3 = (f: number): Shot => {
  const a = C([1.8, 0.55, -2.0], [0.0, 0.3, -12.5], 46, 0.025), b = C([-1.0, 0.8, -3.0], [0.9, 0.9, -12], 44, -0.02);
  return P(between(a, b, gl(f, EV.STINK3 - 20, 26)), f, 300, 0.0022, 0.006, 12, EV.BUBBLE3 - 3);
};
// 4 (389-468): the clinic porch: a bench of green-faced townsfolk, the doctor with his bag
const S4 = (f: number): Shot => {
  const C0 = SPOT.CLINIC, a = C([C0[0] + 9.0, 1.55, C0[2] + 4.2], [C0[0] + 0.4, 1.3, C0[2] - 1.0], 42, 0.02);
  const b = C([C0[0] + 6.6, 1.5, C0[2] + 2.8], [C0[0] + 0.3, 1.35, C0[2] - 1.2], 40, -0.02);
  return P(between(a, b, gl(f, 420, 30)), f, 389, 0.0016, 0.006, 12, EV.SHAKE4 - 3);
};
// 5a (469-504): down the council table to the mayor in front of the arched windows; 5b (505-617): the easel
const S5a = (f: number): Shot => P({ pos: [0.1, 1.35, -0.8], look: [0, 1.75, -9.4], fov: 42, roll: 0.02 }, f, 469, 0.003, 0.007, 12, EV.GAVEL5 - 3);
const S5b = (f: number): Shot => {
  const E = SPOT.EASEL, a = C([E[0] - 4.0, 1.8, E[2] + 6.0], [E[0] - 0.2, 1.9, E[2] - 0.2], 44, 0.02), b = C([E[0] - 2.8, 1.8, E[2] + 4.2], [E[0] - 0.2, 1.9, E[2] - 0.2], 42, -0.015);
  return P(between(a, b, gl(f, EV.PIPE5 - 14, 26)), f, EV.CUTIN5, 0.0018, 0.006, 10, EV.GASP5 - 3);
};
// 6a (618-659): MS on the fill, the shovellers and the dumping wagon; 6b (660+): pulls back and up: the buildings in the pit
const S6 = (f: number): Shot => {
  const a = C([-15.0, 2.9, 4.6], [-5.5, 2.2, 0.0], 46, 0.02), b = C([-27.0, 10.5, 18.0], [5.0, 1.0, -4.0], 46, -0.015);
  return P(between(a, b, gl(f, EV.PULL6 - 8, 36)), f, 618, 0.0014, 0.006, 12, EV.BONK6 - 3);
};
// 7 (715-816): low hero crane up the front of the hotel to the roof flag
const S7 = (f: number): Shot => {
  const a = C([3.2, 1.0, 37], [0.0, 3.2, 0], 40, 0.02), b = C([1.5, 9.5, 36], [0, 19.5, 0], 42, -0.018);
  return P(between(a, b, gl(f, 732, 62)), f, 715, 0.0012, 0, 12);
};
// 8 (817-936): the office: the blueprint, the partners, the handshake chain
const S8 = (f: number): Shot => {
  const a = C([-1.9, 1.55, 4.3], [0.3, 1.25, -0.4], 44, 0.02), b = C([0.3, 1.55, 3.4], [0.4, 1.35, -0.5], 44, -0.02);
  return P(between(a, b, gl(f, 880, 28)), f, 817, 0.0018, 0.006, 12, EV.SMILE8 - 3);
};
// 9a (937-999): CU of the iron jackscrew under the timber beam; 9b (1000-1071): pull back: the forest, the march
const S9 = (f: number): Shot => {
  const H = SPOT.HERO_SCREW;
  const a = C([H[0] + 1.05, 1.3, H[2] + 3.0], [H[0] - 0.3, 1.4, H[2]], 40, 0.03), b = C([0.0, 1.35, 6.0], [0.0, 1.9, -16], 48, -0.02);
  const c = C([-9.0, 2.4, 24], [1.0, 3.0, -6], 46, 0.0);
  const u1 = gl(f, EV.PULLBACK9 - 6, 34), u2 = gl(f, 1048, 22);
  return P(between(between(a, b, u1) as Cam, c, u2), f, 937, 0.0014, 0.007, 12, EV.SCREW9 - 3);
};
// 10a (1072-1117): the foreman raises the flag and blows the whistle; 10b (1118+): low down the line of workers
const S10 = (f: number): Shot => {
  const F = SPOT.FOREMAN;
  const a = C([F[0] + 1.6, 1.45, F[2] + 5.4], [F[0] + 0.3, 2.0, F[2]], 44, 0.02), b = C([1.85, 1.3, 7.4], [1.5, 1.5, -16], 48, -0.025);
  return P(between(a, b, gl(f, 1100, 26)), f, 1072, 0.0016, 0.006, 12, EV.TURN10 - 3);
};
// 11 (1223-1300): the hotel wide from the right with the measuring board; slow push
const S11 = (f: number): Shot => {
  const H = hotelY(11, f);
  return P({ pos: [-7, 1.7, 56], look: [-3.8, 11.0 + 0.35 * H, 0], fov: 42, roll: 0.012 }, f, 1223, 0.0016, 0.004, 12, EV.MARK11 - 3);
};
// 12 (1301-1488): the cutaway: lobby, diner, sleeper, clerk, then all three rising
const CZ = 7.2; // the camera plane
const S12a = (f: number): Shot => { const y = cutY(f); return P({ pos: [-1.0, y + 3.2, 13.5], look: [-1.5, y + 2.0, -1.5], fov: 40, roll: 0.02 }, f, 1301, 0.0018, 0.005, 12, EV.OPEN12 - 3); };
const S12b = (f: number): Shot => { const y = cutY(f); return P({ pos: [-0.9, y + EV_ROOM(1) + 1.6, 8.8], look: [-1.0, y + EV_ROOM(1) + 1.35, -3.3], fov: 28, roll: -0.025 }, f, EV.DINER12 - 4, 0.0024, 0.006, 12, EV.DINER12 - 3); };
const S12c = (f: number): Shot => { const y = cutY(f); return P({ pos: [-2.0, y + EV_ROOM(2) + 2.0, 9.6], look: [-2.5, y + EV_ROOM(2) + 1.2, -3.8], fov: 34, roll: 0.02 }, f, EV.SLEEPER12 - 4, 0.0024, 0.006, 12, EV.SLEEPER12 - 3); };
const S12d = (f: number): Shot => { const y = cutY(f); return P({ pos: [-0.8, y + 2.3, 11.0], look: [-0.7, y + 2.0, -3.0], fov: 40, roll: -0.02 }, f, EV.CLERK12 - 4, 0.0022, 0.006, 12, EV.CLERK12 - 3); };
const S12e = (f: number): Shot => P({ pos: [0.5, 9.0, 38], look: [0, 9.6, -2], fov: 42, roll: 0.01 }, f, EV.PULLOUT12, 0.0012, 0, 12);
function EV_ROOM(i: number) { return SPOT.ROOM_H[i]; }
// 13 (1489-1569): the window CU: the sill, the flower pot, the water glass; the inspector taps the glass
const S13 = (f: number): Shot => {
  const y = hotelY(13, f) + HOTEL.FH[1] + 1.35, x = SPOT.WINDOW13[0];
  const a = C([x + 1.0, y + 0.3, 8.2], [x - 0.9, y + 0.5, 0], 40, 0.02), b = C([x + 0.7, y + 0.35, 6.4], [x - 0.8, y + 0.5, 0], 38, -0.02);
  return P(between(a, b, gl(f, EV.TAP13 - 10, 28)), f, 1489, 0.0018, 0.006, 12, EV.TAP13 - 3);
};
// 14a (1570-1618): the golden platform, Pullman beaming; 14b (1619-1769): inside the sleeping car; push in; the window
const S14a = (f: number): Shot => P({ pos: [-7.6, 1.45, 8.4], look: [-5.0, 2.5, 0.2], fov: 42, roll: 0.02 }, f, 1570, 0.002, 0.006, 12, EV.BEAM14 - 3);
const S14b = (f: number): Shot => {
  const a = C([0.2, 1.4, 5.4], [0.0, 1.3, -1.4], 50, 0.02), b = C([0.1, 1.35, 3.6], [0.0, 1.3, -1.3], 44, -0.02), c = C([0.0, 1.45, 3.4], [0.0, 1.7, -1.5], 46, 0.015);
  return P(between(between(a, b, gl(f, EV.PUSH14 - 6, 34)) as Cam, c, gl(f, EV.WINDOW14 - 8, 30)), f, EV.CUT14, 0.0012, 0.004, 12, EV.PUSH14 - 3);
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }],
  2: [{ f: 198, s: S2a }, { f: EV.CUT2, cut: true, s: S2b }],
  3: [{ f: 300, s: S3 }],
  4: [{ f: 389, s: S4 }],
  5: [{ f: 469, s: S5a }, { f: EV.CUTIN5, cut: true, s: S5b }],
  6: [{ f: 618, s: S6 }],
  7: [{ f: 715, s: S7 }],
  8: [{ f: 817, s: S8 }],
  9: [{ f: 937, s: S9 }],
  10: [{ f: 1072, s: S10 }],
  11: [{ f: 1223, s: S11 }],
  12: [{ f: 1301, s: S12a }, { f: EV.DINER12 - 4, cut: true, s: S12b }, { f: EV.SLEEPER12 - 4, cut: true, s: S12c }, { f: EV.CLERK12 - 4, cut: true, s: S12d }, { f: EV.PULLOUT12 - 2, cut: true, s: S12e }],
  13: [{ f: 1489, s: S13 }],
  14: [{ f: 1570, s: S14a }, { f: EV.CUT14, cut: true, s: S14b }],
};

// impact kicks: the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in 7 f, roll +-0.23 deg
// per unit; they start on the first frame at/after the event. No hand-held float.
export const KICKS: [number, number][] = [[EV.FROG2 / FPS, 0.3], [EV.SCHLORP2 / FPS, 0.4], [EV.BUBBLE3 / FPS, 0.4], [EV.SHAKE4 / FPS, 0.3],
  [EV.GAVEL5 / FPS, 0.8], [EV.GASP5 / FPS, 0.3], [EV.DUMP6 / FPS, 0.5], [EV.BONK6 / FPS, 0.6], [EV.CREST7 / FPS, 0.3], [EV.SCREW9 / FPS, 0.9],
  [EV.WHISTLE10 / FPS, 0.4], [EV.TURN10 / FPS, 0.5], [EV.TURN10B / FPS, 0.5], [EV.TURN10C / FPS, 0.5], [EV.MARK11 / FPS, 0.25], [EV.MARK11B / FPS, 0.25],
  [EV.MARK11C / FPS, 0.25], [EV.CLERK12 / FPS, 0.3], [EV.TAP13 / FPS, 0.4], [EV.COIN14 / FPS, 0.3]];
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
 *  Kits: cattail (a clump of cattails), crib (a stack of timber cribbing). */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number; space?: "world" | "cam"; tilt?: number };
export const FOREGROUND: Fg[] = [
  { a: 198, b: 268, kit: "cattail", pos: [1.45, -0.55, 3.4], space: "cam", yaw: 0.2, s: 1.0 },
  { a: 198, b: 268, kit: "cattail", pos: [-1.6, -0.5, 4.2], space: "cam", yaw: -0.3, s: 1.1 },
  { a: 300, b: 389, kit: "cattail", pos: [1.5, -0.35, 2.4], space: "cam", yaw: 0.2, s: 0.9 },
];

// ---------------- lens: depth of field ----------------
/** Lens blur per beat (thin lens). cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp.
 *  CU 12-16, MS 10-12, wides / aerials 0. Entries switch on cuts (no dur) or ramp with the camera move they share
 *  f / dur with. focus = world point (else the camera look point). */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 198, cInf: 12, focus: () => [-0.2, 0.55, 16.5] },
  { f: EV.CUT2, cInf: 8, focus: () => [0.2, 1.1, 10.5] },
  { f: 300, cInf: 10, focus: () => [0.3, 0.4, -9] },
  { f: 389, cInf: 8, focus: () => [SPOT.CLINIC[0] + 2.2, 1.3, SPOT.CLINIC[2]] },
  { f: 469, cInf: 6, focus: () => [0, 1.6, -7.2] },
  { f: EV.CUTIN5, cInf: 10, focus: () => [SPOT.EASEL[0] + 0.1, 1.9, SPOT.EASEL[2]] },
  { f: 618, cInf: 6, focus: () => [0.5, 2.4, 3.5] },
  { f: EV.PULL6 - 8, dur: 36, cInf: 0 },
  { f: 715, cInf: 0 },
  { f: 817, cInf: 8, focus: () => [0.2, 1.3, -0.4] },
  { f: 937, cInf: 14, focus: () => [SPOT.HERO_SCREW[0], 1.3, SPOT.HERO_SCREW[2]] },
  { f: EV.PULLBACK9 - 6, dur: 34, cInf: 4, focus: () => [0, 1.6, -8] },
  { f: 1072, cInf: 11, focus: () => [SPOT.FOREMAN[0], 1.6, SPOT.FOREMAN[2]] },
  { f: 1100, dur: 26, cInf: 5, focus: () => [1.5, 1.4, -6] },
  { f: 1223, cInf: 0 },
  { f: 1301, cInf: 3, focus: () => [-2.2, 3.6, -2] },
  { f: EV.DINER12 - 4, cInf: 12, focus: (f) => [-1.0, cutY(f) + SPOT.ROOM_H[1] + 1.4, -3.4] },
  { f: EV.SLEEPER12 - 4, cInf: 12, focus: (f) => [-2.6, cutY(f) + SPOT.ROOM_H[2] + 1.0, -3.8] },
  { f: EV.CLERK12 - 4, cInf: 11, focus: (f) => [0.0, cutY(f) + 1.7, -3.2] },
  { f: EV.PULLOUT12 - 2, cInf: 0 },
  { f: 1489, cInf: 11, focus: (f) => [SPOT.WINDOW13[0] - 0.1, hotelY(13, f) + HOTEL.FH[1] + 1.4, 0] },
  { f: 1570, cInf: 7, focus: () => [0, 1.6, 0.2] },
  { f: EV.CUT14, cInf: 7, focus: () => [0, 1.3, -1.4] },
  { f: EV.PUSH14 - 6, dur: 34, cInf: 12, focus: () => [-0.2, 1.1, -1.4] },
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
