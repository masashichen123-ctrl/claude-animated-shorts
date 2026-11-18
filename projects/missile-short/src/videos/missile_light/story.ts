// Timeline of the missile short ("Missile Mail", 1959): 15 shots timed to the original voice + music mix
// (voice/words.json, SHOTS.md), the missile's choreography (one rig shared by every set, posed per frame), set anchors
// shared by sets / cast / cameras, the camera grammar of the bridge template (continuous slow push-ins; symmetric
// smootherstep glides 18-40 f; big reframes are cuts; impacts are 7-frame flip kicks; no hand-held float) and the
// per-shot depth of field.
//
// CONTRACTS (other owners import these; change them only together with the readers):
//   SetName, Light, ShotDef, SHOTS, XFADE, FLASH_AT, layersAt      -> Missile.tsx, world.ts, cast.ts, build.ts
//   SPOT (set anchors in each set's own local frame; every set sits at the world origin, only one is visible)
//                                                                  -> build.ts places pieces there, cast.ts stands actors there
//   missileAt(id, f): MissilePose                                  -> world.ts poses the rig, cast.ts hangs fx on it
//   camAt, keyEnd, kickAt, dofAt, focusAt                          -> world.ts, Missile.tsx
export const FPS = 30;
export const TOTAL = 1352;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** reference camera ease: symmetric smootherstep (attack = release) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];

// ---------------- shots ----------------
/** one THREE.Group per set in build.ts (buildSets); only the active shot's set is visible */
export type SetName = "sea" | "subdeck" | "postoffice" | "runway" | "museum" | "street" | "road";
/** light presets (lights.ts LIGHTS / LOOK, grade.ts GRADES): story arc sunrise -> bright day -> golden -> dusk, warm interiors */
export type Light = "day" | "golden" | "dusk" | "interior";
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: Light; sunAz?: number; sunEl?: number };
// frame ranges from SHOTS.md (b = exclusive end)
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 121, set: "sea", light: "golden", sunAz: 135, sunEl: 10 },    // hook: missile over the sunrise sea, letters streaming
  { id: 2, a: 121, b: 176, set: "postoffice", light: "interior" },              // impatient postmaster general + clerk
  { id: 3, a: 176, b: 249, set: "subdeck", light: "golden", sunAz: 125, sunEl: 12 }, // USS Barbero at dawn, missile on the launcher
  { id: 4, a: 249, b: 374, set: "subdeck", light: "day" },                      // sailor on deck beside the missile
  { id: 5, a: 374, b: 463, set: "subdeck", light: "day" },                      // sailor stuffing letters into the nose
  { id: 6, a: 463, b: 497, set: "subdeck", light: "day" },                      // launch: booster flame, smoke
  { id: 7, a: 497, b: 574, set: "sea", light: "day" },                          // 100 miles over the sea toward the coast
  { id: 8, a: 574, b: 659, set: "runway", light: "day" },                       // landing at NAS Mayport
  { id: 9, a: 659, b: 785, set: "runway", light: "day" },                       // postmaster general at the podium
  { id: 10, a: 785, b: 848, set: "runway", light: "day" },                      // mail sacks unloaded
  { id: 11, a: 848, b: 931, set: "street", light: "day" },                      // missile in a house, kid at the mailbox
  { id: 12, a: 931, b: 1055, set: "road", light: "golden", sunAz: 70, sunEl: 14 }, // overloaded mail truck + postman
  { id: 13, a: 1055, b: 1189, set: "road", light: "dusk", sunAz: 35, sunEl: 4 },   // missile "delivery van": one trip, puff
  { id: 14, a: 1189, b: 1267, set: "museum", light: "interior" },               // museum hall, 1959 plaque
  { id: 15, a: 1267, b: TOTAL, set: "museum", light: "interior" },              // visitor under the museum missile
];
/** 5-frame dissolves at every place change (and at the golden -> dusk time change on the road); a white flash after the hook */
export const XFADE: Record<number, number> = { 2: 5, 3: 5, 7: 5, 8: 5, 11: 5, 12: 5, 13: 5, 14: 5 };
export const FLASH_AT = 117;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** layers to draw at frame f: base shot, plus the next shot fading in during a crossfade */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- set anchors (each set's local frame = world frame; ground y = 0, sea level y = 0) ----------------
export const SPOT = {
  // subdeck: hull along x, bow at +x, deck top at y = DECK
  DECK: 2.0,
  LAUNCH: [-11, 3.3, 0] as V3,        // missile centre on the launcher rail (nose aft, toward -x)
  LAUNCH_PITCH: 0.1,                  // rad, nose up on the rail
  SAILOR4: [-14.2, 2.0, 1.75] as V3,  // shot 4: beside the forward fuselage
  SAILOR5: [-16.6, 2.0, 1.25] as V3,  // shot 5: at the nose intake
  // post office: counter along x at z = COUNTER_Z (front face), top at 1.1 m
  COUNTER_Z: -0.5,
  CLERK: [-0.7, 0.3, -1.6] as V3,     // on the raised floor behind the counter
  PMG2: [0.55, 0, 0.75] as V3,
  // runway: runway along x (z -15..15), missile parks at the origin facing +x
  PARK: [0, 1.35, 0] as V3,           // missile centre standing on its landing gear
  PODIUM: [2.6, 0, 9.0] as V3,        // lectern base centre (front faces +z)
  PMG9: [2.6, 0, 8.45] as V3,
  SAILOR9: [4.25, 0, 8.2] as V3,
  SACKS: [3.6, 0, 4.2] as V3,         // pile of mail sacks (shot 10)
  // street: ranch house centred at the origin, front wall at z = HOUSE_Z
  HOUSE_Z: 4,
  MAILBOX: [3.1, 0, 10.8] as V3,      // at the kerb side of the fence
  KID: [2.25, 0, 11.45] as V3,
  // road: mail truck centred at the origin, cab toward +x; the launch cart of shot 13 parked behind it
  TRUCK: [0, 0, 0] as V3,
  POSTMAN12: [3.9, 0, 2.5] as V3,
  CART: [-8.6, 0, 1.4] as V3,
  POSTMAN13: [-5.6, 0, 3.6] as V3,
  // museum: pedestal at the origin, plaque stand in front-right
  PEDESTAL: [0, 0, 0] as V3,
  EXHIBIT: [0, 3.3, 0] as V3,         // missile centre on display
  PLAQUE: [3.4, 0, 3.4] as V3,
  VISITOR15: [1.9, 0, 4.1] as V3,     // just outside the rope ring
};

// ---------------- the missile (Regulus I): one rig, posed per shot ----------------
/** rig frame: nose along local +x, fin up (+y); yaw about world y (three: +x -> (cos, 0, -sin)), pitch nose-up about local z */
export type MissilePose = {
  visible: boolean; pos: V3; yaw: number; pitch: number; roll: number;
  booster: boolean;  // twin JATO boosters under the tail (until they burn out after launch)
  gear: boolean;     // landing gear down (runway, museum)
  flame: number;     // 0..1 exhaust flame (booster + sustainer)
  trail: number;     // 0..1 letters fluttering out behind it (hook)
  boom: number;      // >= 0: seconds since it blew up (shot 13); -1 = intact
};
const HIDE: MissilePose = { visible: false, pos: [0, -50, 0], yaw: 0, pitch: 0, roll: 0, booster: false, gear: false, flame: 0, trail: 0, boom: -1 };
const pose = (p: Partial<MissilePose> & { pos: V3 }): MissilePose => ({ ...HIDE, visible: true, ...p });
/** nose direction for yaw / pitch */
export const noseDir = (yaw: number, pitch: number): V3 => [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw)];

/** sea flights (shots 1 and 7): straight and level along +x, a little porpoise */
const SEA1 = (f: number): V3 => [-60 + (28 * f) / FPS, 5.2 + 0.25 * Math.sin(f * 0.07), 0];
const SEA7 = (f: number): V3 => [-40 + (34 * (f - 497)) / FPS, 7.5 + 0.2 * Math.sin(f * 0.06), 0];
// launch (shot 6): rides the rail aft and climbs away
export const LAUNCH_F = 469;
const launchPos = (f: number): V3 => {
  const s = Math.max(0, (f - LAUNCH_F) / FPS), d = 0.5 * 55 * s * s;
  const n = noseDir(Math.PI, SPOT.LAUNCH_PITCH + 0.35 * smooth(s / 0.6));
  return add(SPOT.LAUNCH, scl(n, d));
};
// landing (shot 8): flare in along +x, touch down, roll out to the park spot
export const TOUCH_F = 591;
const V_TD = 60, ROLL = 52; // touchdown speed (m/s), roll-out length (m)
const landPos = (f: number): V3 => {
  const x0 = SPOT.PARK[0] - ROLL, s = (f - TOUCH_F) / FPS;
  if (s < 0) return [x0 + V_TD * s, SPOT.PARK[1] + 16 * Math.min(1, (-s / 0.6)) ** 1.6, 0];
  const dec = (V_TD * V_TD) / (2 * ROLL), st = Math.min(s, V_TD / dec);
  return [x0 + V_TD * st - 0.5 * dec * st * st, SPOT.PARK[1], 0];
};
// house (shot 11): nose down into the front wall of the house
export const HIT_F = 852;
const HOUSE_DIR = noseDir(Math.PI / 2, -0.35);
const HOUSE_C: V3 = [-1.7, 2.95, SPOT.HOUSE_Z + 1.95];
// shot 13: off a little launch cart beside the postman, up into the dusk sky, then one big puff
export const GO_F = 1088, BOOM_F = 1160;
const CART_YAW = 0.42, CART_PITCH = 0.36;
export const CART_MISSILE: V3 = [SPOT.CART[0], 1.55, SPOT.CART[2]];
const flyOff = (f: number): V3 => {
  const s = Math.max(0, (f - GO_F) / FPS), d = 0.5 * 26 * s * s;
  return add(CART_MISSILE, scl(noseDir(CART_YAW, CART_PITCH + 0.3 * smooth(s / 1.2)), d));
};
export const BOOM_AT: V3 = flyOff(BOOM_F);

export const missileAt = (id: number, f: number): MissilePose => {
  const t = f / FPS;
  switch (id) {
    case 1: return pose({ pos: SEA1(f), yaw: 0, pitch: 0.02, roll: 0.06 * Math.sin(t * 1.3), flame: 0.55, trail: 1 });
    case 2: return HIDE;
    case 3: case 4: case 5:
      return pose({ pos: SPOT.LAUNCH, yaw: Math.PI, pitch: SPOT.LAUNCH_PITCH, booster: true });
    case 6: {
      const s = (f - LAUNCH_F) / FPS;
      return pose({ pos: launchPos(f), yaw: Math.PI, pitch: SPOT.LAUNCH_PITCH + 0.35 * smooth(s / 0.6), booster: true, flame: f < LAUNCH_F - 2 ? 0 : 1 });
    }
    case 7: return pose({ pos: SEA7(f), yaw: 0, pitch: 0.0, roll: 0.05 * Math.sin(t * 1.1), flame: 0.5 });
    case 8: {
      const s = (f - TOUCH_F) / FPS;
      return pose({ pos: landPos(f), yaw: 0, pitch: s < 0 ? 0.09 : 0.09 * Math.max(0, 1 - s / 0.25), gear: true, flame: s < 0.6 ? 0.35 : 0 });
    }
    case 9: case 10: return pose({ pos: SPOT.PARK, yaw: 0, pitch: 0, gear: true });
    case 11: {
      const d = Math.max(0, (HIT_F - f) / FPS) * 70; // 70 m/s on the way in
      return pose({ pos: add(HOUSE_C, scl(HOUSE_DIR, -d)), yaw: Math.PI / 2, pitch: -0.35, flame: f < HIT_F ? 1 : 0 });
    }
    case 12: return HIDE;
    case 13: {
      if (f >= BOOM_F) return { ...HIDE, boom: (f - BOOM_F) / FPS, pos: BOOM_AT };
      const s = Math.max(0, (f - GO_F) / FPS);
      return pose({ pos: flyOff(f), yaw: CART_YAW, pitch: CART_PITCH + 0.3 * smooth(s / 1.2), flame: f >= GO_F - 2 ? 1 : 0 });
    }
    case 14: case 15: return pose({ pos: SPOT.EXHIBIT, yaw: -0.38, pitch: 0.2, gear: true });
  }
  return HIDE;
};

// ---------------- camera ----------------
// Grammar (motion.md of the bridge template): every move is a symmetric smootherstep glide of 18-40 f; a reframe bigger
// than about half a frame width or 40 % zoom is a hard cut. Holds push in (dolly toward the look point or a fov zoom):
// 0.15-0.35 %/f, ~0.6 %/f for ~35 f on the punch words. Rolls of 4-5 deg over >= 18 f on emphasis beats.
// Moving subjects (missile) are framed in the subject's frame: framings add the subject position every frame.
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
/** zoom push (camera stays put, for lenses next to walls): tan(fov/2) shrinks by k */
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
/** framing relative to a moving point P */
const rel = (P: V3, dp: V3, dl: V3, k: number, rest: Partial<Cam> = {}): Shot => dolly(add(P, dp), add(P, dl), k, rest);

// ---- framings (f -> camera); each pushes in from the frame its key starts ----
// shot 1 (hook): the missile comes at the lens 3/4 front over the sunrise sea, then a side MS of the letter stream
const S1a = (f: number) => rel(SEA1(f), [12.5, 3.6, 7.5], [0.2, -0.3, 0], pushK(f, 0, 0.0025), { fov: 40 });
const S1b = (f: number) => rel(SEA1(f), [-4.5, 3.0, 13.5], [-3.2, -0.6, 0], pushK(f, 56, 0.002), { fov: 40, roll: -0.04 });
const S1c = (f: number) => rel(SEA1(f), [7.5, -1.6, 6.2], [0.6, 0.6, 0], pushK(f, 86, 0.004), { fov: 40, roll: 0.04 });
// shot 2: post office counter, postmaster general in front, clerk behind
const S2a = (f: number) => dolly([-0.6, 1.62, 6.4], [0.15, 1.3, -0.6], pushK(f, 118, 0.0025), { fov: 40 });
const S2b = (f: number) => dolly([0.4, 1.62, 3.9], [0.85, 1.5, 0.4], pushK(f, 145, 0.002, 0.005, 30), { fov: 40, roll: 0.035 }); // "faster mail"
// shot 3: the sub on the dawn sea, 3/4 from the bow
const S3a = (f: number) => zoom([46, 12.5, 24], [-4, 1.8, 0], 40, pushK(f, 173, 0.002));
const S3b = (f: number) => zoom([46, 12.5, 24], [-9, 2.6, 0], 26, pushK(f, 214, 0.003)); // "with a missile on it"
// shot 4: sailor on deck beside the missile on its launcher
const S4a = (f: number) => dolly([-8.8, 5.6, 11.5], [-13.2, 3.0, 0.8], pushK(f, 246, 0.0022), { fov: 42 });
const S4b = (f: number) => dolly([-10.2, 3.1, 7.6], [-13.9, 3.25, 1.2], pushK(f, 316, 0.0025), { fov: 40, roll: -0.035 }); // "the submarine Barbero"
// shot 5: at the nose: letters into the intake ("3,000 letters" punch)
const S5a = (f: number) => dolly([-13.1, 3.3, 6.6], [-16.4, 3.55, 0.8], pushK(f, 374, 0.002), { fov: 40 });
const S5b = (f: number) => dolly([-14.3, 3.6, 4.6], [-16.5, 3.75, 0.5], pushK(f, 416, 0.0018, 0.006, 30), { fov: 40, roll: 0.035 });
// shot 6: launch, wide from abeam the stern, then the lens tilts after the climbing missile
const S6a = (f: number): Shot => {
  const m = launchPos(Math.max(f, LAUNCH_F)), u = smooth((f - LAUNCH_F) / 22);
  return { pos: [-5.5, 7.0, 22], look: [lerp(-12.5, m[0] * 0.55 - 6, u), lerp(4.2, m[1] * 0.75 + 1.2, u), 0], fov: 46 };
};
// shot 7: chase from behind and abeam toward the coast, then the missile pulls away ("22 minutes later")
const S7a = (f: number) => rel(SEA7(f), [-13.5, 3.2, 7.5], [6, -2.0, 0], pushK(f, 494, 0.002), { fov: 40 });
const S7b = (f: number) => { const P = SEA7(Math.min(f, 545)); return rel(P, [-13.5, 3.2, 7.5], [6, -2.0, 0], 1, { fov: 40 }); }; // camera stops, missile flies on
const S7look = (f: number): Shot => { const s = S7b(f), m = SEA7(f); return { ...s, look: [lerp(s.look[0], m[0] + 6, 0.55), s.look[1], s.look[2]] }; };
// shot 8: the runway from beside the palms; the lens pans with the landing missile
const S8a = (f: number): Shot => {
  const m = landPos(f), k = pushK(f, 571, 0.0015);
  return dolly([9, 2.8, 19], [Math.max(-34, m[0]) * 0.9 + 2.5, 0.7 + (m[1] - SPOT.PARK[1]) * 0.6, 0], k, { fov: 40 });
};
// shot 9: the postmaster general at the podium, the sailor beside him, the missile behind
const S9a = (f: number) => dolly([3.1, 1.9, 15.8], [3.0, 2.0, 6.0], pushK(f, 656, 0.0018), { fov: 40 });
const S9b = (f: number) => dolly([2.75, 1.8, 12.0], [2.7, 1.85, 8.0], pushK(f, 706, 0.0015, 0.006, 32), { fov: 40, roll: -0.035 }); // "historic"
// shot 10: unloading the sacks beside the missile
const S10a = (f: number) => dolly([8.5, 2.6, 12.5], [2.2, 1.5, 2.6], pushK(f, 782, 0.0025), { fov: 42 });
// shot 11: the missile in the house, the kid at the mailbox (kick on the hit)
const S11a = (f: number) => dolly([5.4, 1.7, 18.5], [0.6, 2.2, 6.5], pushK(f, 845, 0.0022), { fov: 42 });
const S11b = (f: number) => dolly([3.6, 1.2, 16.0], [1.8, 1.4, 10.0], pushK(f, 900, 0.0018), { fov: 40, roll: 0.035 }); // "needed a missile"
// shot 12: the overloaded truck, postman in front; glide up to the sacks on "thousands of letters"
const S12a = (f: number) => dolly([7.4, 1.6, 11.2], [1.6, 2.0, 0.8], pushK(f, 928, 0.0022), { fov: 42 });
const S12b = (f: number) => dolly([6.0, 3.6, 10.0], [0.2, 3.6, 0], pushK(f, 985, 0.0018), { fov: 42 });
// shot 13: missile on its cart beside the postman; tilt up after it; the puff
const S13a = (f: number) => dolly([-3.4, 1.65, 12.6], [-6.7, 1.9, 2.0], pushK(f, 1052, 0.002), { fov: 42 });
const S13b = (f: number): Shot => {
  const m = missileAt(13, Math.min(f, BOOM_F - 1)).pos, u = smooth((f - GO_F) / 30);
  const look: V3 = [lerp(-6.7, m[0], u), lerp(1.9, m[1], u), lerp(2.0, m[2], u)];
  return { pos: [-2.6, 1.5, 14.2], look, fov: lerp(42, 54, smooth((f - GO_F) / 50)) };
};
const S13c = (f: number) => zoom([-2.6, 1.5, 14.2], BOOM_AT, 54, pushK(f, BOOM_F - 6, 0.002, 0.004, 24));
// shot 14: the museum hall, the missile on its pedestal
const S14a = (f: number) => dolly([6.8, 2.2, 15.5], [1.0, 2.7, 1.5], pushK(f, 1186, 0.002), { fov: 42 });
// shot 15: close on a visitor looking up at the missile overhead
const S15a = (f: number) => dolly([2.7, 1.25, 8.0], [1.55, 2.4, 3.3], pushK(f, 1264, 0.0022), { fov: 44 });
const S15b = (f: number) => dolly([2.7, 1.25, 8.0], [1.5, 2.6, 3.3], pushK(f, 1300, 0.0015, 0.005, 30), { fov: 44, roll: -0.035 }); // "America's mail"

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: S1a },
    { f: 56, cut: true, s: S1b },        // cut on "delivered the mail": side MS of the letter stream
    { f: 84, cut: true, s: S1c },        // cut on "cruise missile": low hero angle, punch
  ],
  2: [{ f: 118, s: S2a }, { f: 143, dur: 22, s: S2b }],
  3: [{ f: 173, s: S3a }, { f: 210, dur: 26, s: S3b }],
  4: [{ f: 246, s: S4a }, { f: 316, cut: true, s: S4b }],
  5: [{ f: 371, s: S5a }, { f: 416, dur: 22, s: S5b }],
  6: [{ f: 460, s: S6a }],
  7: [{ f: 494, s: S7a }, { f: 545, dur: 20, s: S7look }],
  8: [{ f: 571, s: S8a }],
  9: [{ f: 656, s: S9a }, { f: 705, cut: true, s: S9b }],
  10: [{ f: 782, s: S10a }],
  11: [{ f: 845, s: S11a }, { f: 899, cut: true, s: S11b }],
  12: [{ f: 928, s: S12a }, { f: 984, dur: 30, s: S12b }],
  13: [{ f: 1052, s: S13a }, { f: GO_F - 4, cut: true, s: S13b }, { f: BOOM_F - 6, dur: 18, s: S13c }],
  14: [{ f: 1186, s: S14a }],
  15: [{ f: 1264, s: S15a }, { f: 1300, dur: 24, s: S15b }],
};

// impact kicks: the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in 7 f,
// roll +-0.23 deg per unit; they start on the first frame at/after the event. No hand-held float.
export const KICKS: [number, number][] = [[(LAUNCH_F + 1) / FPS, 1.0], [TOUCH_F / FPS, 0.6], [HIT_F / FPS, 1.4], [BOOM_F / FPS, 0.9]];
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

// ---------------- lens: depth of field ----------------
/** Lens blur per beat (thin lens). cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp.
 *  Bridge reference: CU 12-16, MS 10-12, wides/aerials 0. Entries switch on cuts (no dur) or ramp with the camera glide
 *  they share f/dur with. focus = world point (else the camera look point). */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const onMissile = (id: number) => (f: number): V3 => missileAt(id, f).pos;
export const DOF: Dof[] = [
  { f: 0, cInf: 9, focus: onMissile(1) },            // hook: missile sharp, horizon soft
  { f: 56, cInf: 12, focus: (f) => add(SEA1(f), [-3.2, 0.1, 0]) }, // side MS of the letter stream
  { f: 84, cInf: 10, focus: onMissile(1) },
  { f: 121, cInf: 10, focus: () => [SPOT.PMG2[0], 1.55, SPOT.PMG2[2]] }, // post office: postmaster's eyes, slots soft
  { f: 176, cInf: 0 },                               // sub establishing
  { f: 249, cInf: 7, focus: () => [SPOT.SAILOR4[0], 3.6, SPOT.SAILOR4[2]] },
  { f: 316, cInf: 11, focus: () => [SPOT.SAILOR4[0], 3.6, SPOT.SAILOR4[2]] },
  { f: 374, cInf: 12, focus: () => [SPOT.SAILOR5[0], 3.6, SPOT.SAILOR5[2]] }, // letters into the nose
  { f: 463, cInf: 0 },                               // launch wide
  { f: 497, cInf: 6, focus: onMissile(7) },          // chase over the sea
  { f: 574, cInf: 0 },                               // landing wide
  { f: 659, cInf: 9, focus: () => [SPOT.PMG9[0], 1.6, SPOT.PMG9[2]] }, // podium
  { f: 705, cInf: 12, focus: () => [SPOT.PMG9[0], 1.6, SPOT.PMG9[2]] },
  { f: 785, cInf: 6, focus: () => [SPOT.SACKS[0], 1.2, SPOT.SACKS[2]] },
  { f: 848, cInf: 0 },                               // house wide
  { f: 899, cInf: 9, focus: () => [SPOT.KID[0], 1.0, SPOT.KID[2]] },
  { f: 931, cInf: 7, focus: () => [SPOT.POSTMAN12[0], 1.55, SPOT.POSTMAN12[2]] },
  { f: 984, dur: 30, cInf: 0 },
  { f: 1055, cInf: 7, focus: () => [SPOT.POSTMAN13[0], 1.55, SPOT.POSTMAN13[2]] },
  { f: GO_F - 4, cInf: 0 },                          // tilt up after the missile, the puff
  { f: 1189, cInf: 0 },                              // museum wide
  { f: 1267, cInf: 12, focus: () => [SPOT.VISITOR15[0], 1.55, SPOT.VISITOR15[2]] }, // visitor CU
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
