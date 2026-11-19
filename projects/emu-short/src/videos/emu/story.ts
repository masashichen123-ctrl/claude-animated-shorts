// Timeline of "The Great Emu War" (1932): 17 shots locked to the voice (voice/words.json, SHOTS.md), the props that
// move (the army truck, the Lewis guns, loose ammo crates; one rig each, posed per frame), set anchors shared by sets /
// cast / cameras, the camera grammar of the template (continuous slow push-ins; symmetric smootherstep glides 18-40 f;
// big reframes are cuts; impacts are 7-frame flip kicks; no hand-held float) and the per-shot depth of field.
//
// CONTRACTS (other owners import these; change them only together with the readers):
//   SetName, Light, ShotDef, SHOTS, XFADE, FLASH_AT, layersAt          -> Emu.tsx, world.ts, cast.ts, build.ts
//   SPOT (set anchors in each set's own local frame; every set sits at the world origin, only one is visible)
//   truckAt / gunsAt / cratesAt (rig poses), truckPt (truck-local -> world)  -> world.ts poses the rigs, cast.ts rides them
//   camAt, keyEnd, kickAt, dofAt, focusAt, FOREGROUND                  -> world.ts, Emu.tsx, build.ts
export const FPS = 30;
export const TOTAL = 1770;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** reference camera ease: symmetric smootherstep (attack = release) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- shots ----------------
/** one THREE.Group per set in build.ts (buildSets); only the active shot's set is visible */
export type SetName = "field" | "farm" | "road" | "paddock" | "dam" | "camp" | "dump" | "parade";
/** light presets (lights.ts LIGHTS / LOOK, grade.ts GRADES): morning hook -> hot day -> golden dam -> lamp-lit dusk camp
 *  -> day explainers -> golden ending */
export type Light = "day" | "golden" | "dusk" | "morning";
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: Light };
// frame ranges from SHOTS.md (b = exclusive end)
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 121, set: "field", light: "morning" },     // hook: gunner vs ONE emu
  { id: 2, a: 121, b: 157, set: "field", light: "morning" },   // "And lost." emu on the crate, gun tipped over
  { id: 3, a: 157, b: 305, set: "farm", light: "day" },        // farm establishing, the veteran farmer
  { id: 4, a: 305, b: 389, set: "farm", light: "day" },        // 20,000 emus pour over the hill and eat the wheat
  { id: 5, a: 389, b: 450, set: "farm", light: "day" },        // verandah telephone
  { id: 6, a: 450, b: 602, set: "road", light: "day" },        // the army arrives: truck, Meredith, soldiers, guns, crates
  { id: 7, a: 602, b: 695, set: "paddock", light: "day" },     // first day: out of range
  { id: 8, a: 695, b: 825, set: "dam", light: "golden" },      // the dam ambush, the gun jams
  { id: 9, a: 825, b: 937, set: "paddock", light: "day" },     // gun bolted onto the truck, the emus outrun it
  { id: 10, a: 937, b: 1135, set: "camp", light: "dusk" },     // the report, the tally board, the mountain of brass
  { id: 11, a: 1135, b: 1201, set: "dump", light: "day" },     // plenty of bullets
  { id: 12, a: 1201, b: 1270, set: "paddock", light: "day" },  // every emu took ten
  { id: 13, a: 1270, b: 1382, set: "parade", light: "day" },   // explainer: an enemy that marches in a line
  { id: 14, a: 1382, b: 1504, set: "paddock", light: "day" },  // explainer: every direction at once
  { id: 15, a: 1504, b: 1656, set: "parade", light: "golden" }, // the emu army at attention
  { id: 16, a: 1656, b: 1694, set: "road", light: "golden" },  // the army went home
  { id: 17, a: 1694, b: TOTAL, set: "field", light: "golden" }, // the emus are still there
];
/** 5-frame anchored dissolves (place / time changes); a white flash after the hook */
export const XFADE: Record<number, number> = { 3: 5, 8: 5, 10: 5, 15: 5 };
export const FLASH_AT = 119;

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
  EMU1_OUT: 14,     // shot 1: the emu steps out of the wheat
  EMU1_LEAN: 96,    // "emus"@98: head forward
  KICK2: 126,       // shot 2 kick
  STOP6: 456,       // truck skid stop
  SALUTE6: 500,     // "soldiers"@502
  GUNS6: [533, 540] as number[], // the two tripods thump down (533-543)
  CRATE6: 582,      // the last crate lands on the stack
  FIRE7: 612,       // shot 7 bursts from here
  JAM8: 801,        // the drum spring pops, KICK
  CLACK8: 799,      // "clack" + puff
  HAMMER9: [837, 841, 845, 849] as number[], // hammer strikes
  CUT9: 875,
  FLOURISH10: 961,  // pen flourish ("claimed"@963)
  PUFF12: 1205,     // 10 dust puffs every 4 f
  CUT14: 1450,
  DIZZY14: 1476,    // swirl eyes by "once"@1479
};

// ---------------- set anchors (each set's local frame = world frame; ground y = 0) ----------------
export const SPOT = {
  // field: stubble for z > WHEAT_Z, standing wheat beyond
  WHEAT_Z: -7.2,
  GUN1: [-0.15, 0, -0.85] as V3,     // shot 1 tripod gun, muzzle toward -z
  GUNNER1: [0.22, 0, -0.15] as V3,     // crouched behind it
  EMU1: [-3.0, 0, -5.8] as V3,       // where the emu stops, at the wheat edge
  CRATE2: [-0.55, 0, -2.6] as V3,    // the ammo crate the emu stands on
  GUNNER2: [0.4, 0, -1.0] as V3,
  GUN2: [0.15, 0, -1.7] as V3,
  CAM17: [1.7, 1.4, -13.4] as V3,   // shot 17 lens, inside the wheat
  EMU17: [0.45, 0, -18.7] as V3,      // the foreground emu that turns to the lens
  // farm: track along x (z 1..4), fence on z = 0, wheat beyond, the yard + house on the left
  FARMER3: [3.9, 0, 1.25] as V3,
  HOUSE: [-7.8, 0, -19] as V3,         // farmhouse centre; front wall at HOUSE_Z
  HOUSE_Z: -15,
  VERANDA_D: 2.6,                     // verandah depth (front edge at HOUSE_Z + VERANDA_D)
  FLOOR: 0.45,                        // verandah floor height
  PHONE: [-4.4, 2.05, -14.92] as V3,  // the wall telephone (box centre) on the front wall
  FARMER5: [-3.95, 0.45, -14.3] as V3,
  MILL: [-1.6, 0, -9.5] as V3,        // windmill tower base
  HILL_Z: -150,                       // crest line of the low hill the herd pours over
  EAT: [[1, 11], [-15, -1.2]] as [[number, number], [number, number]], // x0,x1 / z0,z1 of the patch that gets eaten
  // road: red road along x (z -3..3), wheat + fence on -z, paddock on +z
  TRUCK6: [0, 0, 0] as V3,
  MAJOR6: [2.6, 0, 2.2] as V3,
  SOLDIERS6: [[0.5, 0, 2.7], [-0.6, 0, 2.5]] as V3[],
  TRIPODS6: [[5.0, 0, 4.6], [6.6, 0, 3.9]] as V3[],
  STACK6: [-7.0, 0, 4.6] as V3,       // ammo crate stack centre (bottom)
  STACKER6: [-6.0, 0, 5.7] as V3,
  // paddock
  GUN7: [0, 0, 0] as V3,
  GUNNER7: [0.55, 0, 0.75] as V3,
  RISE_Z: -78,                        // the rise the emus trot over
  TRUCK9: [0, 0, 6] as V3,            // parked, hammering
  GUN12: [0, 0, 0] as V3,
  GUNNER14: [0, 0, 0] as V3,
  // dam: water centred on the origin, bank ring, the soldiers hidden behind the south bank
  DAM_R: 10.5,
  BANK_R: 14.2,                       // crest radius
  BANK_H: 1.5,
  GUN8: [0.2, 1.32, 14.35] as V3,
  GUNNER8: [0.75, 0.72, 15.4] as V3,
  SARGE8: [-0.6, 0.55, 15.6] as V3,
  // camp
  TENT: [0, 0, 0] as V3,
  DESK: [0.75, 0, 3.35] as V3,
  MAJOR10: [0.75, 0, 2.8] as V3,
  TALLY: [-0.6, 0, 4.35] as V3,
  BRASS: [0.5, 0, -15] as V3,         // the mountain of casings
  // dump
  WALL_Z: -1.2,
  SOLDIER11: [0.9, 0, 0.0] as V3,
  // parade
  GUN13: [0, 0, 0] as V3,
  MAJOR15: [0, 0, -26] as V3,
};

// ---------------- terrain heights shared by build.ts (the ground) and cast.ts (feet on it) ----------------
/** farm: the low hill the herd pours over (z < -126) */
export const farmHill = (x: number, z: number) => z > -126 ? 0 : 9.5 * Math.exp(-(((z + 150) / 24) ** 2)) * (0.75 + 0.25 * Math.sin(x / 37)) + 2 * Math.exp(-(((z + 220) / 40) ** 2));
/** paddock: the rise the emus trot over */
export const paddockRise = (x: number, z: number) => z > 40 ? 0 : 3.4 * Math.exp(-(((z - SPOT.RISE_Z) / 18) ** 2)) * (0.8 + 0.2 * Math.sin(x / 23)) + (z < SPOT.RISE_Z ? 1.2 * (1 - Math.exp((z - SPOT.RISE_Z) / 30)) : 0);
/** dam: ground height at radius r (inner mud slope up to the crest, outer slope down) */
export const DAM_PROFILE: [number, number][] = [[SPOT.DAM_R - 2, -1.2], [SPOT.DAM_R - 0.5, -0.4], [SPOT.DAM_R + 0.6, 0.05], [SPOT.DAM_R + 2, 0.55], [SPOT.BANK_R - 0.9, SPOT.BANK_H * 0.92], [SPOT.BANK_R, SPOT.BANK_H],
  [SPOT.BANK_R + 0.9, SPOT.BANK_H * 0.9], [SPOT.BANK_R + 2.4, SPOT.BANK_H * 0.4], [SPOT.BANK_R + 4.2, 0.05], [SPOT.BANK_R + 5, -0.05]];
export const damY = (r: number) => {
  const P = DAM_PROFILE;
  if (r <= P[0][0]) return P[0][1];
  for (let i = 1; i < P.length; i++) if (r <= P[i][0]) { const k = (r - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k; }
  return 0;
};

// ---------------- moving props: truck, guns, loose crates ----------------
/** truck: pos = ground point under the chassis centre, yaw about y (local +x = forward), pitch nose-up, roll */
export type TruckPose = { visible: boolean; pos: V3; yaw: number; pitch: number; roll: number; gun: boolean; sag: number; dust: number; speed: number };
const TRUCK_HIDE: TruckPose = { visible: false, pos: [0, -50, 0], yaw: 0, pitch: 0, roll: 0, gun: false, sag: 0, dust: 0, speed: 0 };
/** local truck point -> world (yaw about y: +x -> (cos, 0, -sin); pitch about the truck's z axis; roll ignored) */
export const truckPt = (p: TruckPose, l: V3): V3 => {
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  const x = l[0] * cp - l[1] * sp, y = l[0] * sp + l[1] * cp, z = l[2] + l[1] * Math.sin(p.roll);
  const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
  return [p.pos[0] + x * cy + z * sy, p.pos[1] + y, p.pos[2] - x * sy + z * cy];
};
/** shot 6: skids in along +x, stops at STOP6 with a forward pitch dip */
const truck6X = (f: number) => { const s = (EV.STOP6 - f) / FPS; return s <= 0 ? 0 : -(9 * s + 6 * s * s); };
/** shot 9b: drives along +x across the paddock at ~9 m/s from CUT9 */
export const truck9X = (f: number) => -6 + 9.2 * (f - EV.CUT9) / FPS;
/** shot 16: drives away along +x into the sunset */
const truck16X = (f: number) => { const s = Math.max(0, (f - 1656) / FPS); return 4 + 4 * s + 2.2 * s * s; };
const bump = (f: number, k: number) => k * (0.6 * Math.sin(f * 1.9) + 0.4 * Math.sin(f * 3.7 + 1));
export const truckAt = (id: number, f: number): TruckPose => {
  switch (id) {
    case 6: {
      const x = truck6X(f), dip = f >= EV.STOP6 && f < EV.STOP6 + 10 ? -0.05 * Math.sin(Math.PI * (f - EV.STOP6) / 10) : 0;
      const moving = f < EV.STOP6;
      return { ...TRUCK_HIDE, visible: true, pos: [x, moving ? Math.abs(bump(f, 0.02)) : 0, 0], yaw: 0, pitch: dip + (moving ? bump(f + 3, 0.01) : 0), roll: 0, dust: moving ? 1 : 0, speed: moving ? 9 : 0 };
    }
    case 9: {
      if (f < EV.CUT9) return { ...TRUCK_HIDE, visible: true, pos: SPOT.TRUCK9, yaw: 0, pitch: 0, roll: 0, gun: true };
      const x = truck9X(f);
      return { ...TRUCK_HIDE, visible: true, pos: [x, Math.abs(bump(f, 0.13)), SPOT.TRUCK9[2]], yaw: 0, pitch: bump(f + 2, 0.06), roll: bump(f + 5, 0.05), gun: true, dust: 1, speed: 9.2 };
    }
    case 16: return { ...TRUCK_HIDE, visible: true, pos: [truck16X(f), Math.abs(bump(f, 0.04)), 0], yaw: 0, pitch: bump(f + 2, 0.02), roll: 0, gun: true, sag: 1, dust: 1, speed: 6 };
  }
  return TRUCK_HIDE;
};
/** Lewis gun: pivot at the receiver; local +x = muzzle. yaw about y (+x -> (cos, 0, -sin)), pitch = elevation,
 *  tip = roll over onto its side (tipped-over gun), tripod drawn below the pivot unless onTruck. fire 0/1 = muzzle flash
 *  this frame. jam = seconds since the jam (spring + smoke), -1 none. onTruck: pos is truck-local (world.ts parents it). */
export type GunPose = { pos: V3; yaw: number; pitch: number; tip: number; tripod: boolean; onTruck?: boolean; fire: number; jam: number };
export const TRIPOD_H = 0.62;
const gp = (p: Partial<GunPose> & { pos: V3 }): GunPose => ({ yaw: Math.PI / 2, pitch: 0.04, tip: 0, tripod: true, fire: 0, jam: -1, ...p });
/** yaw that points a gun's muzzle (+x local) from a to b */
const aim = (a: V3, b: V3) => Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
/** burst pattern: on for 2 frames of every 3 inside [a, b) */
const burst = (f: number, a: number, b: number) => (f >= a && f < b && f % 3 !== 2 ? 1 : 0);
export const gunsAt = (id: number, f: number): GunPose[] => {
  const S = SPOT;
  switch (id) {
    case 1: return [gp({ pos: [S.GUN1[0], TRIPOD_H, S.GUN1[2]], yaw: aim(S.GUN1, S.EMU1) + 0.012 * Math.sin(f * 1.7), pitch: 0.05 })];
    case 2: return [gp({ pos: [S.GUN2[0], 0.17, S.GUN2[2]], yaw: 2.2, tip: 1.35, pitch: 0.1 })];
    case 6: {
      const drop = (f0: number) => { const s = (f - f0) / FPS; return s < 0 ? 9 : s < 0.12 ? 0.35 * (1 - s / 0.12) : 0; };
      return S.TRIPODS6.map((p, i) => gp({ pos: [p[0], TRIPOD_H + drop(EV.GUNS6[i]), p[2]], yaw: Math.PI / 2 + 0.6 - i * 0.25, pitch: 0.18 }));
    }
    case 7: return [gp({ pos: [S.GUN7[0], TRIPOD_H, S.GUN7[2]], yaw: Math.PI / 2 + 0.04 + 0.01 * Math.sin(f * 0.9), pitch: 0.07, fire: burst(f, EV.FIRE7, 640) || burst(f, 650, 676) })];
    case 8: return [gp({ pos: S.GUN8, yaw: Math.PI / 2 - 0.06, pitch: 0.05, tripod: false, fire: burst(f, 784, EV.CLACK8 - 1), jam: f >= EV.CLACK8 ? (f - EV.CLACK8) / FPS : -1 })];
    case 9: return [gp({ pos: [-1.0, 1.85, 0], yaw: f < EV.CUT9 ? 0.25 : 0.15 * Math.sin(f * 0.5), pitch: f < EV.CUT9 ? 0 : 0.08 * Math.sin(f * 1.3), tripod: false, onTruck: true, fire: f >= EV.CUT9 ? burst(f, 884, 930) : 0 })];
    case 12: return [gp({ pos: [S.GUN12[0], TRIPOD_H, S.GUN12[2]], yaw: aim(S.GUN12, emu12At(f + 3)), pitch: 0.06, fire: burst(f, 1203, 1243) })];
    case 13: { // the barrel sweeps along the marching line
      const u = (f - 1270) / 112;
      return [gp({ pos: [S.GUN13[0], 0.82, S.GUN13[2]], yaw: Math.PI / 2 + 0.42 * Math.sin(u * Math.PI * 2.2 - 1.2), pitch: 0.05, tripod: false })];
    }
    case 16: return [gp({ pos: [-1.0, 1.85, 0], yaw: 0, pitch: -0.42, tripod: false, onTruck: true })];
  }
  return [];
};
/** loose ammo crates: pos = bottom centre, yaw */
export type CratePose = { pos: V3; yaw: number; roll?: number };
export const CRATE = { L: 0.78, H: 0.42, D: 0.46 };
export const STACK_N = 6; // crates high in the shot-6 stack
export const cratesAt = (id: number, f: number): CratePose[] => {
  const S = SPOT;
  switch (id) {
    case 1: return [{ pos: [S.GUN1[0] + 0.85, 0, S.GUN1[2] + 0.45], yaw: 0.3 }];
    case 2: return [{ pos: S.CRATE2, yaw: 0.25 }];
    case 6: { // the last crate: carried overhead from 556, set on the top of the stack at CRATE6
      const top: V3 = [S.STACK6[0] + 0.1, STACK_N * CRATE.H, S.STACK6[2] + 0.05];
      const hand: V3 = [S.STACKER6[0] - 0.25, 2.12, S.STACKER6[2] - 0.1];
      const u = smooth((f - (EV.CRATE6 - 12)) / 12);
      const p: V3 = [lerp(hand[0], top[0], u), lerp(hand[1], top[1], u) + 0.25 * Math.sin(Math.PI * u), lerp(hand[2], top[2], u)];
      return [{ pos: p, yaw: lerp(0.5, 0.05, u) }];
    }
    case 7: return [{ pos: [S.GUN7[0] + 0.9, 0, S.GUN7[2] + 0.2], yaw: -0.4 }];
    case 12: return [{ pos: [S.GUN12[0] - 0.95, 0, S.GUN12[2] + 0.35], yaw: 0.5 }];
  }
  return [];
};
/** nose / muzzle direction for yaw / pitch */
export const noseDir = (yaw: number, pitch: number): V3 => [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw)];

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
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const gl = (f: number, f0: number, dur: number) => glide((f - f0) / dur);
/** shot between two camera setups, blended by u (pos / look / fov / roll) */
const between = (a: Cam, b: Cam, u: number): Shot => mix(a, b, u);
const C = (pos: V3, look: V3, fov: number, roll = 0): Cam => ({ pos, look, fov, roll });

/** card heights (cast.ts design: an adult's head top stands ~1.75 m, the head blob is ~0.48 m) */
export const HEAD_TOP = 1.75, HEAD_H = 0.48;
/** eye point of a card (DOF focus) */
export const eyes = (p: V3, s = 1): V3 => [p[0], p[1] + 1.52 * s, p[2]];
/** emu eye point (standing emu head ~1.62 m) */
export const emuEye = (p: V3, s = 1): V3 => [p[0], p[1] + 1.6 * s, p[2]];

// ---- per-shot cameras ----
// 1 (0-120): low over the crouched gunner's right shoulder toward the wheat edge; the emu steps out and stops 10 m
// ahead; slow push, a punch on "emus"
const S1 = (f: number): Shot => {
  const a = C([1.1, 1.45, 6.6], [-2.2, 1.0, -8.0], 34, 0.025), b = C([1.05, 1.4, 5.8], [-2.15, 1.05, -8.0], 32, -0.01);
  const c = between(a, b, gl(f, 0, 110));
  return zoom(c.pos, c.look, c.fov!, pushK(f, 0, 0.0012) * pushK(f, 92, 0, 0.005, 22), { roll: c.roll });
};
// 2 (121-156): the punchline two-shot: emu up on the crate (left of centre), the dazed gunner on the right, the gun
// tipped in the stubble between them
const S2 = (f: number): Shot => P({ pos: [0.15, 1.5, 5.0], look: [-0.1, 1.12, -1.9], fov: 38, roll: -0.03 }, f, 121, 0.0025, 0.008, 12, 124);
// 3 (157-304): crane down from the windmill head and glide to the farmer by "farms"; holds with a push
const MILL_HEAD: V3 = [SPOT.MILL[0], 10.4, SPOT.MILL[2]];
const S3 = (f: number): Shot => {
  const a = C([4.5, 11.6, 3.5], add(MILL_HEAD, [0.6, -0.8, 0]), 44, -0.03);
  const b = C([5.0, 1.75, 10.0], [0.6, 3.0, -10.0], 52, 0.02);
  const u = gl(f, 162, 64), k = u * u * (1.6 - 0.6 * u); // crane drops first, the truck catches up
  const sh = mix(a, b, u); sh.pos = [lerp(a.pos[0], b.pos[0], u), lerp(a.pos[1], b.pos[1], k), lerp(a.pos[2], b.pos[2], u)];
  return P(sh, f, 226, 0.0016);
};
// 4 (305-388): high wide over the fence toward the hill, the herd pouring down into the wheat; cut on "and" (358) to
// the farmer's MCU, jaw drop, hat lifting
const S4a = (f: number): Shot => zoom([6.0, 2.3, 4.6], [3.8, 1.4, -40], 46, pushK(f, 305, 0.0022), { roll: 0.02 });
const S4b = (f: number): Shot => P({ pos: [SPOT.FARMER3[0] + 0.55, 1.62, SPOT.FARMER3[2] + 2.55], look: [SPOT.FARMER3[0] - 0.15, 1.55, SPOT.FARMER3[2]], fov: 40, roll: -0.03 }, f, 358, 0.003, 0.008, 18, 368);
// 5 (389-449): on the verandah: the farmer at the wall telephone (right), the yard and pecking emus through the posts
const S5 = (f: number): Shot => P({ pos: [-12.4, 1.8, -14.55], look: [3.0, 1.4, -12.5], fov: 40, roll: 0.025 }, f, 389, 0.0025, 0.008, 24, 418);
// 6 (450-601): low front 3/4 as the truck skids in; glide past Meredith to the saluting soldiers; cut to the tripods;
// cut to the crate stack
const S6a = (f: number): Shot => {
  const a = C([7.6, 1.3, 10.8], [-0.6, 1.2, 0.0], 46, 0.02), b = C([6.9, 1.6, 7.4], [-0.6, 1.4, 0.5], 44, -0.02);
  return P(between(a, b, gl(f, 470, 40)), f, 450, 0.0022);
};
const S6b = (f: number): Shot => P({ pos: [2.8, 1.1, 8.7], look: [5.7, 0.6, 4.3], fov: 42, roll: 0.03 }, f, 527, 0.003, 0.007, 14, 531);
const S6c = (f: number): Shot => P({ pos: [-5.6, 1.3, 11.4], look: [-6.9, 1.8, 4.6], fov: 50, roll: -0.025 }, f, 556, 0.0025, 0.006, 14, 578);
// 7 (602-694): long lens, low over the gunner's shoulder: the emus trot over the rise and away
const S7 = (f: number): Shot => zoom([0.1, 1.45, 5.4], [1.0, 1.0, -50], 28, pushK(f, 602, 0.0018));
// 8 (695-824): behind the hidden soldiers on the outer bank; crane up over the crest to reveal the crowded dam by
// "emus"; cut on "gun" (797) to the CU of the gun and gunner
const S8a = (f: number): Shot => {
  const a = C([0.3, 1.35, 20.5], [0.0, 1.35, 13.5], 44, 0.02), b = C([0.5, 7.2, 22.0], [0.0, 0.0, -1.5], 46, -0.02);
  return P(between(a, b, gl(f, 700, 38)), f, 738, 0.002);
};
const S8b = (f: number): Shot => P({ pos: [-2.0, 1.75, 11.5], look: [0.5, 1.3, 15.0], fov: 38, roll: -0.03 }, f, 797, 0.003, 0.01, 12, 800);
// 9 (825-936): MS of Meredith on the tray hammering; cut (875) to a side-on track along the bouncing truck
const S9a = (f: number): Shot => P({ pos: [2.2, 2.3, 11.6], look: [-0.9, 1.95, 6.0], fov: 42, roll: 0.025 }, f, 825, 0.0025);
const S9b = (f: number): Shot => {
  const x = truck9X(f), u = gl(f, 880, 40);
  return { pos: [x - lerp(10, 12, u), 2.5, SPOT.TRUCK9[2] + lerp(4.5, 2.8, u)], look: [x + 8, 1.25, SPOT.TRUCK9[2] - 0.5], fov: 56, roll: -0.02 };
};
// 10 (937-1134): Meredith at the field desk outside the lit tent, the tally board on the left; flourish; pull back and
// crane up (1040-1087) to reveal the mountain of brass behind the tent
const S10 = (f: number): Shot => {
  const a = C([0.05, 1.5, 8.2], [0.05, 1.2, 2.6], 44, -0.02), b = C([4.0, 6.8, 17.5], [0.2, 3.6, -9.0], 52, 0.02);
  const u = gl(f, 1040, 47);
  return P(between(a, b, u), f, 937, u > 0 ? 0.001 : 0.0022);
};
// 11 (1135-1200): low, looking up at the house-tall wall of crates, the soldier patting it; push
const S11 = (f: number): Shot => P({ pos: [-1.9, 0.95, 5.6], look: [0.6, 2.6, -1.0], fov: 52, roll: 0.03 }, f, 1135, 0.003, 0.007, 20, 1170);
// 12 (1201-1269): behind the gun, the emu strolls left -> right, puffs popping at its feet
const S12 = (f: number): Shot => P({ pos: [1.3, 2.0, 3.6], look: [-0.45, 0.85, -5.0], fov: 52, roll: -0.02 }, f, 1201, 0.0025, 0.006, 16, 1244);
// 13 (1270-1381): high 3/4 behind the sandbagged gun, the grey line marching in step toward it
const S13 = (f: number): Shot => {
  const a = C([2.2, 6.8, 9.8], [-0.2, 0.4, -7.5], 52, 0.02), b = C([1.6, 6.2, 9.0], [-0.3, 0.4, -7.5], 50, -0.01);
  return P(between(a, b, gl(f, 1276, 90)), f, 1300, 0.0015, 0.005, 16, 1365);
};
// 14a (1382-1449): top-down aerial over the starburst; 14b (1450-1503): low angle on the spinning gunner
const S14a = (f: number): Shot => {
  const r = lerp(0.0, 0.25, gl(f, 1382, 60));
  return { pos: [0.05, lerp(26, 33, gl(f, 1382, 66)), 0.3], look: [0, 0, 0], fov: 52, roll: r };
};
const S14b = (f: number): Shot => P({ pos: [0.6, 0.55, 3.6], look: [0.05, 1.55, -0.2], fov: 48, roll: 0.04 }, f, EV.CUT14, 0.003, 0.008, 18, 1474);
// 15 (1504-1655): Meredith at the salute, the helmeted emu ranks behind; slow crane up over the ranks to the horizon
const S15 = (f: number): Shot => {
  const M = SPOT.MAJOR15, a = C(add(M, [0.55, 1.45, 4.4]), add(M, [0.0, 1.45, 0.0]), 44, 0.02), b = C(add(M, [0.0, 9.5, 1.5]), add(M, [0.0, 2.0, -45]), 50, -0.01);
  const u = gl(f, 1560, 75);
  return P(between(a, b, u), f, 1504, 0.0018);
};
// 16 (1656-1693): low on the red road behind the truck, driving off into the sunset
const S16 = (f: number): Shot => P({ pos: [-9.5, 1.15, 1.2], look: [20, 1.6, -0.8], fov: 44, roll: -0.02 }, f, 1656, 0.002);
// 17 (1694-1769): low in the wheat, the foreground emu turns its head to the lens and blinks; creeping push to the end
const S17 = (f: number): Shot => P({ pos: SPOT.CAM17, look: [SPOT.EMU17[0] - 0.3, 1.25, SPOT.EMU17[2]], fov: 40, roll: 0.02 }, f, 1694, 0.0022);

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }],
  2: [{ f: 121, s: S2 }],
  3: [{ f: 157, s: S3 }],
  4: [{ f: 305, s: S4a }, { f: 358, cut: true, s: S4b }],
  5: [{ f: 389, s: S5 }],
  6: [{ f: 450, s: S6a }, { f: 527, cut: true, s: S6b }, { f: 556, cut: true, s: S6c }],
  7: [{ f: 602, s: S7 }],
  8: [{ f: 695, s: S8a }, { f: 797, cut: true, s: S8b }],
  9: [{ f: 825, s: S9a }, { f: EV.CUT9, cut: true, s: S9b }],
  10: [{ f: 937, s: S10 }],
  11: [{ f: 1135, s: S11 }],
  12: [{ f: 1201, s: S12 }],
  13: [{ f: 1270, s: S13 }],
  14: [{ f: 1382, s: S14a }, { f: EV.CUT14, cut: true, s: S14b }],
  15: [{ f: 1504, s: S15 }],
  16: [{ f: 1656, s: S16 }],
  17: [{ f: 1694, s: S17 }],
};

// impact kicks: the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in 7 f, roll +-0.23 deg
// per unit; they start on the first frame at/after the event. No hand-held float. Truck bounce in 9b is its own shake.
export const KICKS: [number, number][] = [[EV.KICK2 / FPS, 1.0], [EV.STOP6 / FPS, 0.45], [EV.JAM8 / FPS, 1.2]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
/** 9b: the camera rides with the bouncing truck (vertical shake, not a kick) */
const shake = (id: number, f: number) => (id === 9 && f >= EV.CUT9 ? 0.05 * Math.sin(f * 2.3) + 0.03 * Math.sin(f * 4.1) : 0);
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f)), sh = shake(id, f);
  if (sh) { c.pos = [c.pos[0], c.pos[1] + sh, c.pos[2]]; c.look = [c.look[0], c.look[1] + sh * 0.6, c.look[2]]; }
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
 *  fgUpdate from these kit names. Kits: wheat (a clump of stalks), fence_post, sandbags, crate. */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number; space?: "world" | "cam"; tilt?: number };
export const FOREGROUND: Fg[] = [
  { a: 0, b: 121, kit: "wheat", pos: [-0.55, -0.85, 2.0], yaw: 0.3, space: "cam", s: 0.8 },          // hook: stubble tuft bottom-left
  { a: 305, b: 358, kit: "fence_post", pos: [-0.95, -1.6, 3.2], yaw: 0.2, space: "cam" },    // herd wide: post at the left edge
  { a: 1694, b: TOTAL, kit: "wheat", pos: [0.6, -1.15, 1.7], yaw: -0.4, space: "cam", s: 1.0 }, // ending: wheat across the bottom corners
  { a: 1694, b: TOTAL, kit: "wheat", pos: [-0.75, -1.15, 2.0], yaw: 0.9, space: "cam" },
];

// ---------------- lens: depth of field ----------------
/** Lens blur per beat (thin lens). cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp.
 *  CU 12-16, MS 10-12, wides / aerials 0. Entries switch on cuts (no dur) or ramp with the camera move they share
 *  f / dur with. focus = world point (else the camera look point). */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 9, focus: (f) => lerp3(eyes(SPOT.GUNNER1, 0.62), emuEye(SPOT.EMU1), smooth((f - 70) / 22)) }, // rack gunner -> emu
  { f: 121, cInf: 10, focus: () => emuEye([SPOT.CRATE2[0], 0.42, SPOT.CRATE2[2]]) },
  { f: 157, cInf: 0 },                                                       // farm establishing
  { f: 230, dur: 40, cInf: 5, focus: () => eyes(SPOT.FARMER3) },
  { f: 305, cInf: 0 },                                                       // herd wide
  { f: 358, cInf: 13, focus: () => eyes(SPOT.FARMER3) },                     // farmer MCU
  { f: 389, cInf: 10, focus: () => eyes(SPOT.FARMER5) },                     // verandah
  { f: 450, cInf: 4, focus: () => [1.2, 1.4, 0.8] },                         // truck arrives
  { f: 490, dur: 30, cInf: 7, focus: () => eyes(SPOT.SOLDIERS6[0]) },
  { f: 527, cInf: 10, focus: () => [SPOT.TRIPODS6[1][0], 0.7, SPOT.TRIPODS6[1][2]] }, // tripods insert
  { f: 556, cInf: 8, focus: () => [SPOT.STACKER6[0], 1.9, SPOT.STACKER6[2]] }, // crate stack
  { f: 602, cInf: 7, focus: () => [-1.5, 1.2, -45] },                        // long lens: the gun soft, the emus sharp
  { f: 695, cInf: 6, focus: () => eyes(SPOT.SARGE8, 0.6) },                  // behind the bank
  { f: 700, dur: 38, cInf: 0 },                                              // the dam reveal
  { f: 797, cInf: 13, focus: () => [SPOT.GUN8[0] + 0.2, SPOT.GUN8[1] + 0.1, SPOT.GUN8[2]] }, // gun CU
  { f: 825, cInf: 10, focus: () => [-0.9, 2.2, 6.0] },                       // hammering MS
  { f: EV.CUT9, cInf: 0 },                                                   // tracking
  { f: 937, cInf: 11, focus: () => eyes(SPOT.MAJOR10, 0.8) },                // desk MS
  { f: 1040, dur: 47, cInf: 0 },                                             // pull back to the brass mountain
  { f: 1135, cInf: 8, focus: () => eyes(SPOT.SOLDIER11) },
  { f: 1201, cInf: 7, focus: (f) => emuEye(emu12At(f)) },
  { f: 1270, cInf: 0 },                                                      // explainer high 3/4
  { f: 1382, cInf: 0 },                                                      // aerial
  { f: EV.CUT14, cInf: 10, focus: () => eyes(SPOT.GUNNER14) },
  { f: 1504, cInf: 10, focus: () => eyes(SPOT.MAJOR15) },
  { f: 1560, dur: 75, cInf: 0, focus: () => eyes(SPOT.MAJOR15) },
  { f: 1656, cInf: 0 },                                                      // the truck into the sunset
  { f: 1694, cInf: 7, focus: () => emuEye(SPOT.EMU17, 1.12) },
];
/** shot 12's strolling emu (feet), shared with cast.ts */
export const emu12At = (f: number): V3 => [-1.7 + 3.4 * clamp01((f - 1199) / 74), 0, -5.2];
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
