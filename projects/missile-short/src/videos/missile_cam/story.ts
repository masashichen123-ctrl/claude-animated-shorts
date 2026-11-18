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
export type Light = "day" | "golden" | "dusk" | "interior" | "morning" | "gallery";
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: Light; sunAz?: number; sunEl?: number };
// frame ranges from SHOTS.md (b = exclusive end)
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 121, set: "sea", light: "morning", sunAz: 135, sunEl: 10 },    // hook: missile over the sunrise sea, letters streaming
  { id: 2, a: 121, b: 176, set: "postoffice", light: "interior" },              // impatient postmaster general + clerk
  { id: 3, a: 176, b: 249, set: "subdeck", light: "morning", sunAz: 125, sunEl: 12 }, // USS Barbero at dawn, missile on the launcher
  { id: 4, a: 249, b: 374, set: "subdeck", light: "morning" },                      // sailor on deck beside the missile
  { id: 5, a: 374, b: 463, set: "subdeck", light: "morning" },                      // sailor stuffing letters into the nose
  { id: 6, a: 463, b: 497, set: "subdeck", light: "morning" },                      // launch: booster flame, smoke
  { id: 7, a: 497, b: 574, set: "sea", light: "day" },                          // 100 miles over the sea toward the coast
  { id: 8, a: 574, b: 659, set: "runway", light: "day" },                       // landing at NAS Mayport
  { id: 9, a: 659, b: 785, set: "runway", light: "day" },                       // postmaster general at the podium
  { id: 10, a: 785, b: 848, set: "runway", light: "day" },                      // mail sacks unloaded
  { id: 11, a: 848, b: 931, set: "street", light: "day" },                      // missile in a house, kid at the mailbox
  { id: 12, a: 931, b: 1058, set: "road", light: "golden", sunAz: 70, sunEl: 14 }, // overloaded mail truck + postman
  { id: 13, a: 1058, b: 1189, set: "road", light: "dusk", sunAz: 35, sunEl: 4 },   // missile "delivery van": one trip, puff
  { id: 14, a: 1189, b: 1267, set: "museum", light: "gallery" },               // museum hall, 1959 plaque
  { id: 15, a: 1267, b: TOTAL, set: "museum", light: "gallery" },              // visitor under the museum missile
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
// Grammar (look_reports/motion.md + composition.md): every key pushes in 0.2-0.35 %/f; every shot of >= 2 s carries one
// glide (truck, arc, crane or a follow of the missile) of 24-45 f with a 7-12 px/f peak at 720p; rolls of 1-3 deg
// alternate sign between keys; reframes bigger than about half a frame are cuts; impacts are 7-frame flip kicks.
// Framing (composition.md FRAMING): exteriors look 18-40 deg down so the horizon sits <= 28 % from the top; character
// shots size the head to ~15 % of frame height (MCU 14-18 %, CU 18-24 %); keys are authored with framed() as composition
// (subject size, head-top line, thirds position) instead of raw positions. Moving subjects (missile) are framed in the
// subject's frame: framings add the subject position every frame.
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
/** orbit: camera at distance d from `look`, azimuth az (deg, 0 = camera looks toward +z, 90 = toward +x), pitch (deg, + = looking down) */
const orbit = (look: V3, d: number, az: number, pitch: number, rest: Partial<Cam> = {}): Shot => {
  const a = (az * Math.PI) / 180, p = (pitch * Math.PI) / 180;
  return { pos: [look[0] - Math.sin(a) * Math.cos(p) * d, look[1] + Math.sin(p) * d, look[2] - Math.cos(a) * Math.cos(p) * d], look, ...rest };
};

/** composition targets measured on the reference shorts (composition.md 3.1); head = 0.48 m adult card head */
export const FRAMING = {
  CU: { head: [0.18, 0.24], headTop: [0.22, 0.34], fov: [38, 45] },
  MCU: { head: [0.14, 0.18], headTop: [0.28, 0.42], fov: [40, 48] },
  MS: { body: [0.40, 0.62], headTop: [0.25, 0.40], fov: [42, 52] },
  FS: { body: [0.25, 0.40], headTop: [0.30, 0.50], fov: [50, 62] },
  WIDE: { body: [0.06, 0.20], horizonMaxFromTop: 0.28, fov: [58, 70], pitchDeg: [15, 40] },
  INSERT: { objectFill: [0.45, 0.75], fov: [34, 42] },
} as const;
/** card heights (cast.ts design: an adult's head top stands ~1.75 m, the head blob is ~0.48 m; kids x0.78) */
export const HEAD_TOP = 1.75, HEAD_H = 0.48;
export type Framing = { q: number; top: number; xs?: number; az: number; pitch: number; fov: number; roll?: number };
/** camera that puts a subject (base point, height h) at q of frame height with its top at `top` (0 = frame top) and its
 *  centre at xs (-1 left edge .. +1 right edge), seen from azimuth az (deg, 0 = looking toward +z), pitch (deg, + = down) */
export const framed = (base: V3, h: number, o: Framing): Shot => {
  const t = Math.tan((o.fov * Math.PI) / 360), tx = t * (9 / 16), d = h / (o.q * 2 * t);
  const az = (o.az * Math.PI) / 180, pt = (o.pitch * Math.PI) / 180;
  const c: V3 = [base[0], base[1] + h / 2, base[2]];
  const fw: V3 = [Math.sin(az) * Math.cos(pt), -Math.sin(pt), Math.cos(az) * Math.cos(pt)];
  const r: V3 = [-Math.cos(az), 0, Math.sin(az)];                                   // camera right (fw x up)
  const u: V3 = [r[1] * fw[2] - r[2] * fw[1], r[2] * fw[0] - r[0] * fw[2], r[0] * fw[1] - r[1] * fw[0]]; // camera up
  const yc = 1 - 2 * (o.top + o.q / 2), xs = o.xs ?? 0;
  const pos: V3 = [c[0] - fw[0] * d, c[1] - fw[1] * d, c[2] - fw[2] * d];
  const look = [0, 1, 2].map((i) => c[i] - r[i] * xs * tx * d - u[i] * yc * t * d) as V3;
  return { pos, look, fov: o.fov, roll: o.roll ?? 0 };
};
/** a framed character: `head` = [x, feet y, z] of the card; frames the head blob (q = head share of frame height) */
const headOf = (p: V3, s = 1): V3 => [p[0], p[1] + (HEAD_TOP - HEAD_H) * s, p[2]];
/** eye point of a card (DOF focus) */
export const eyes = (p: V3, s = 1): V3 => [p[0], p[1] + 1.52 * s, p[2]];
const onHead = (p: V3, o: Framing, s = 1) => framed(headOf(p, s), HEAD_H * s, o);
/** full-body framing (q = body share of frame height) */
const onBody = (p: V3, o: Framing, s = 1) => framed(p, HEAD_TOP * s, o);
/** push a framed shot in from frame f0 at `rate` (punch as in pushK) */
const P = (s: Shot, f: number, f0: number, rate = 0.0025, punch = 0, n = 35, punchAt = f0): Shot =>
  dolly(s.pos, s.look, pushK(f, f0, rate) * (punch ? pushK(f, punchAt, 0, punch, n) : 1), s);
/** blend two framings with the reference glide inside one key (arcs/cranes that must stay on a curve, not a chord) */
const lerpF = (a: Framing, b: Framing, k: number): Framing => ({
  q: lerp(a.q, b.q, k), top: lerp(a.top, b.top, k), xs: lerp(a.xs ?? 0, b.xs ?? 0, k), az: lerp(a.az, b.az, k),
  pitch: lerp(a.pitch, b.pitch, k), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k),
});
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const gl = (f: number, f0: number, dur: number) => glide((f - f0) / dur);
/** lag a moving point: where it was `lag` frames ago, blended to its lead `lead` frames ahead (follow cams) */
const follow = (fn: (f: number) => V3, f: number, lag: number, lead: number): V3 => {
  const a = fn(f - lag), b = fn(f + lead);
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
};

// ---- framings (f -> camera) ----
// shot 1 (hook, 0-120): high chase from behind-right: the missile runs lower-left -> upper-right through the frame, its
// letter stream blowing at the lens, the sunrise coast + lighthouse on the top edge; the camera arcs 14 deg round it.
// Cut on "delivered" to a side truck along the letter stream, cut on "cruise missile" to a 3/4-front punch.
const S1a = (f: number): Shot => {
  const m = SEA1(f), a = lerp(38, 24, gl(f, 4, 44)), d = 17.5, p = 23;
  return P(orbit(add(m, [0.2, 2.2, -1.0]), d, 90 + a, p, { fov: 54, roll: 0.03 }), f, 0, 0.003);
};
const S1b = (f: number): Shot => {
  const m = SEA1(f), u = gl(f, 58, 26);
  return P(rel(m, [lerp(-5.5, -1.5, u), 3.6, 11.5], [lerp(-3.6, -0.6, u), -0.7, 0], 1, { fov: 44, roll: -0.035 }), f, 56, 0.0025);
};
const S1c = (f: number): Shot => P(rel(SEA1(f), [11, 3.2, 8.5], [2.0, -0.3, 0], 1, { fov: 44, roll: 0.045 }), f, 84, 0.0025, 0.006, 30);

// shot 2 (121-175): MCU of the impatient postmaster general (right third), the clerk behind the counter on the left;
// arcs 10 deg and punches on "faster"
const F2a: Framing = { q: 0.155, top: 0.30, xs: 0.32, az: 186, pitch: 4, fov: 44, roll: -0.03 };
const F2b: Framing = { q: 0.17, top: 0.29, xs: 0.30, az: 176, pitch: 2, fov: 44, roll: 0.035 };
const S2a = (f: number) => P(onHead(SPOT.PMG2, lerpF(F2a, F2b, gl(f, 136, 36))), f, 118, 0.0025, 0.006, 30, 144);

// shot 3 (176-248): establishing, high off the bow quarter (pitch 26 deg, fov 60: the horizon sits on the top edge);
// a crane-in toward the launcher on "with a missile on it"
const S3a = (f: number) => {
  const u = gl(f, 203, 42);
  return P(orbit(lerp3([-4, 1.6, 0], [-10, 3.0, 0], u), lerp(50, 26, u), lerp(236, 222, u), lerp(25, 21, u), { fov: lerp(60, 54, u), roll: lerp(0.02, -0.025, u) }), f, 173, 0.0025);
};

// shot 4 (249-373): the sailor beside the missile on the launcher. a) full shot from over the water, arcing toward the
// stern; b) cut on "the submarine Barbero" to a MS low on the deck line (sailor left third, missile across the right)
const F4a: Framing = { q: 0.30, top: 0.46, xs: -0.30, az: 206, pitch: 34, fov: 52, roll: 0.025 };
const F4a2: Framing = { ...F4a, az: 192, pitch: 30, q: 0.33 };
const S4a = (f: number) => P(onBody(SPOT.SAILOR4, lerpF(F4a, F4a2, gl(f, 262, 45))), f, 246, 0.0025);
const F4b: Framing = { q: 0.52, top: 0.27, xs: 0.33, az: 132, pitch: -9, fov: 46, roll: -0.03 };
const F4b2: Framing = { ...F4b, az: 120, xs: 0.35 };
const S4b = (f: number) => P(onBody(SPOT.SAILOR4, lerpF(F4b, F4b2, gl(f, 330, 40))), f, 316, 0.0025);

// shot 5 (374-462): a) insert: letters hopping into the nose intake (camera over the intake from the far side, the
// sailor soft behind); b) cut on "it carried" to his MCU from the stern, missile rising across the left, the sail
// behind; punch on "3,000"
const NOSE5: V3 = [SPOT.LAUNCH[0] - 4.48, SPOT.LAUNCH[1] + 0.45, 0];
const S5a = (f: number) => {
  const u = gl(f, 378, 30);
  return P(orbit([-15.9, 3.85, 0.6], 3.4, lerp(32, 20, u), 28, { fov: 44, roll: 0.03 }), f, 371, 0.0028);
};
const F5b: Framing = { q: 0.17, top: 0.28, xs: 0.30, az: 100, pitch: -12, fov: 44, roll: -0.035 };
const S5b = (f: number) => P(onHead(SPOT.SAILOR5, F5b), f, 406, 0.0022, 0.006, 32, 414);

// shot 6 (463-496): launch, low from the water off the port side; the lens follows the missile up and out at the right
const S6a = (f: number): Shot => {
  const m = launchPos(Math.max(f, LAUNCH_F)), u = gl(f, LAUNCH_F + 2, 26);
  const look = lerp3([-11.5, 4.3, 0], [m[0] * 0.8 - 2.6, m[1] * 0.8 + 0.9, 0], u);
  return P({ pos: [-7.8, 2.6, -14.5], look, fov: 56, roll: lerp(0.03, -0.02, u) }, f, 460, 0.003);
};

// shot 7 (497-573): chase over the sea from above-behind (pitch 24 deg: the coast + lighthouse on the top edge), the
// offset arcs 16 deg; on "and 22 minutes later" the camera lets the missile fly on toward the coast
const S7a = (f: number): Shot => {
  const a = lerp(146, 130, gl(f, 500, 45));
  return P(orbit(add(follow(SEA7, f, 3, 3), [-0.2, -0.6, -0.4]), 18, 90 + a - 180, 22, { fov: 54, roll: -0.03 }), f, 494, 0.0025);
};
const S7b = (f: number): Shot => {
  const s = S7a(Math.min(f, 547)), m = SEA7(f);
  return { ...s, look: [lerp(s.look[0], m[0] + 4, 0.6), lerp(s.look[1], m[1] - 1.2, 0.6), s.look[2]], roll: 0.02 };
};

// shot 8 (574-658): NAS Mayport from 9 m up behind the beach palms: the lens follows the missile in, over the touchdown
// and the roll-out to the park spot (missile kept on the centre-left third, big); palm crowns cut the top-right corner
const S8a = (f: number): Shot => {
  const m = follow((g) => landPos(Math.min(g, 650)), f, 3, 6);
  const look: V3 = [m[0] + 0.6, 0.55 * m[1] + 0.7, 0];
  const pos: V3 = [lerp(-34, 0, gl(f, 572, 80)), 7.5, 26];
  return P({ pos, look, fov: 50, roll: lerp(-0.03, 0.02, gl(f, 576, 72)) }, f, 571, 0.0022);
};

// shot 9 (659-784): a) two-shot MS (postmaster general + saluting sailor) with the missile behind; b) cut on "historic"
// to a low MCU over the lectern (FG), punch; c) arc back out to the two-shot on "the entire world"
const PS9: V3 = [(SPOT.PMG9[0] + SPOT.SAILOR9[0]) / 2, 0, (SPOT.PMG9[2] + SPOT.SAILOR9[2]) / 2];
const F9a: Framing = { q: 0.40, top: 0.29, xs: 0.02, az: 218, pitch: 7, fov: 46, roll: 0.025 };
const S9a = (f: number) => P(onBody(PS9, lerpF(F9a, { ...F9a, az: 206 }, gl(f, 664, 40))), f, 656, 0.0025);
const F9b: Framing = { q: 0.18, top: 0.25, xs: -0.12, az: 174, pitch: -7, fov: 42, roll: -0.03 };
const S9b = (f: number) => P(onHead(SPOT.PMG9, F9b), f, 703, 0.0018, 0.006, 32, 705);
const F9c: Framing = { q: 0.42, top: 0.27, xs: 0.0, az: 194, pitch: 3, fov: 46, roll: 0.03 };
const S9c = (f: number) => P(onBody(PS9, F9c), f, 738, 0.0022);

// shot 10 (785-847): MS of the postman by the sack pile, the sailor bringing a sack from the missile behind; a truck left
// on "every letter arrived"
const POSTMAN10: V3 = [SPOT.SACKS[0] + 1.6, 0, SPOT.SACKS[2] + 1.0];
const F10: Framing = { q: 0.50, top: 0.30, xs: 0.30, az: 204, pitch: 9, fov: 48, roll: -0.025 };
const S10a = (f: number) => P(onBody(POSTMAN10, lerpF(F10, { ...F10, az: 214, xs: 0.36, roll: 0.02 }, gl(f, 796, 40))), f, 782, 0.0028);

// shot 11 (848-930): the missile goes into the house (kick) seen low from the street over the kid (right third); glide in
// to a comic low MS of the kid on "every delivery", punch on "missile"
const F11a: Framing = { q: 0.30, top: 0.55, xs: 0.40, az: 197, pitch: -6, fov: 54, roll: 0.03 };
const F11b: Framing = { q: 0.50, top: 0.31, xs: 0.34, az: 191, pitch: -4, fov: 48, roll: -0.035 };
const S11a = (f: number) => P(onBody(SPOT.KID, F11a, 0.78), f, 845, 0.0025);
const S11b = (f: number) => P(onBody(SPOT.KID, F11b, 0.78), f, 845, 0.0022, 0.006, 35, 893);

// shot 12 (931-1054): low 3/4 front of the overloaded truck, the postman MS on the right third; crane up to the sacks on
// "thousands of letters"; back down to his MCU on "a tank of fuel"
const F12a: Framing = { q: 0.46, top: 0.31, xs: 0.33, az: 232, pitch: -3, fov: 52, roll: 0.025 };
const S12a = (f: number) => P(onBody(SPOT.POSTMAN12, F12a), f, 928, 0.0025);
const S12b = (f: number) => P(orbit([-0.4, 4.3, 0.2], 9.5, 238, 8, { fov: 54, roll: -0.03 }), f, 978, 0.0025);
const F12c: Framing = { q: 0.155, top: 0.32, xs: 0.30, az: 238, pitch: -2, fov: 46, roll: 0.03 };
const S12c = (f: number) => P(onHead(SPOT.POSTMAN12, F12c), f, 1014, 0.0025);

// shot 13 (1058-1188): two-shot MS, the postman (right third) beside the missile on its cart (left, cropped by the
// edge); on "fast" cut low behind him on the flight line: the missile leaves past the lens at the left and climbs away,
// the lens tilts after it with his head kept on the bottom edge; the puff
const F13a: Framing = { q: 0.42, top: 0.33, xs: 0.36, az: 197, pitch: 13, fov: 50, roll: -0.025 };
const S13a = (f: number) => P(onBody(SPOT.POSTMAN13, lerpF(F13a, { ...F13a, az: 207, roll: 0.02 }, gl(f, 1060, 26))), f, 1055, 0.0025);
const POS13: V3 = [SPOT.POSTMAN13[0] - 4.1, 0.95, SPOT.POSTMAN13[2] + 2.55];
const S13b = (f: number): Shot => {
  const m = missileAt(13, Math.min(f, BOOM_F - 1)).pos, u = gl(f, GO_F + 4, 40);
  const look0: V3 = [SPOT.POSTMAN13[0] + 2.2, 2.6, SPOT.POSTMAN13[2] - 1.0];
  const look: V3 = lerp3(look0, [lerp(look0[0], m[0], 0.75), lerp(look0[1], m[1], 0.6), lerp(look0[2], m[2], 0.75)], u);
  return P({ pos: POS13, look, fov: lerp(52, 60, u), roll: lerp(0.03, -0.02, u) }, f, GO_F - 4, 0.0015);
};
const S13c = (f: number): Shot => {
  const s = S13b(BOOM_F - 6);
  return zoom(s.pos, s.look, s.fov ?? 60, pushK(f, BOOM_F - 6, 0.0025, 0.005, 24), { roll: -0.02 });
};

// shot 14 (1189-1266): the museum hall from 4.5 m up (pitch 18 deg, fov 58): the missile on its pedestal in the centre
// third, ropes, the plaque and three visitors in front; arcs 12 deg, punch on "exactly one flight"
const L14: V3 = [1.2, 1.5, 5.0];
const S14a = (f: number) => P(orbit(L14, 9.5, lerp(178, 166, gl(f, 1192, 45)), 17, { fov: 56, roll: lerp(0.025, -0.02, gl(f, 1192, 45)) }), f, 1186, 0.0022, 0.005, 30, 1221);

// shot 15 (1267-1352, ending): low MCU of the visitor looking up, the museum missile's nose overhead at the top right;
// on "America's" crane out on a curve to a high wide of the whole hall, push still running
const F15: Framing = { q: 0.17, top: 0.40, xs: -0.30, az: 172, pitch: -6, fov: 44, roll: -0.03 };
const S15a = (f: number): Shot => {
  const u = gl(f, 1284, 64), a = onHead(SPOT.VISITOR15, F15), b = orbit([0.6, 2.2, 2.0], 13.5, 194, 25, { fov: 58 });
  const k = u * u * (1.6 - 0.6 * u); // the pull-back leads, the crane catches up (curved path)
  const pos: V3 = [lerp(a.pos[0], b.pos[0], u), lerp(a.pos[1], b.pos[1], k), lerp(a.pos[2], b.pos[2], u)];
  return P({ pos, look: lerp3(a.look, b.look, u), fov: lerp(44, 58, u), roll: lerp(-0.03, 0.02, u) }, f, 1264, 0.0025);
};

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: S1a },
    { f: 56, cut: true, s: S1b },        // cut on "delivered the mail": truck along the letter stream
    { f: 84, cut: true, s: S1c },        // cut on "cruise missile": 3/4 front, punch
  ],
  2: [{ f: 118, s: S2a }],
  3: [{ f: 173, s: S3a }],
  4: [{ f: 246, s: S4a }, { f: 316, cut: true, s: S4b }],
  5: [{ f: 371, s: S5a }, { f: 406, cut: true, s: S5b }],
  6: [{ f: 460, s: S6a }],
  7: [{ f: 494, s: S7a }, { f: 547, dur: 22, s: S7b }],
  8: [{ f: 571, s: S8a }],
  9: [{ f: 656, s: S9a }, { f: 703, cut: true, s: S9b }, { f: 736, dur: 46, s: S9c }],
  10: [{ f: 782, s: S10a }],
  11: [{ f: 845, s: S11a }, { f: 864, dur: 42, s: S11b }],
  12: [{ f: 928, s: S12a }, { f: 978, dur: 36, s: S12b }, { f: 1014, dur: 32, s: S12c }],
  13: [{ f: 1055, s: S13a }, { f: GO_F - 4, cut: true, s: S13b }, { f: BOOM_F - 6, dur: 18, s: S13c }],
  14: [{ f: 1186, s: S14a }],
  15: [{ f: 1264, s: S15a }],
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

// ---------------- foreground layer (composition.md 3.3, depth.md 3.5.4) ----------------
/** Near framing props, cut by a frame edge and blurred by the shot's DOF (cInf >= 8). space "cam": pos is in camera space
 *  (x right, y up, z forward, metres) so the prop stays framed through the push-ins; "world": a world position.
 *  NOT YET DRAWN: world.ts needs a FOREGROUND loop (bridge template world.ts ~l.320) and build.ts a fgProp(kit) builder
 *  for these kit names (simple shapes: burlap sack pile from sack(), a letter bundle box, a mailbox on a post, a brass
 *  stanchion + red rope, three white pickets). Shots that frame through real set pieces instead (lectern in 9b, the
 *  launch cart + missile in 13b, deck stanchions in 4b) need no entry. */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number; space?: "world" | "cam"; tilt?: number };
export const FOREGROUND: Fg[] = [
  { a: 122, b: 176, kit: "letter_bundle", pos: [-0.62, -0.78, 1.5], yaw: 0.5, space: "cam" },   // post office MCU: bottom-left corner
  { a: 786, b: 848, kit: "mail_sack", pos: [-0.75, -0.95, 2.0], yaw: 0.8, space: "cam" },      // shot 10 MS: sack pile bottom-left, ~22 % of frame
  { a: 849, b: 931, kit: "fence", pos: [0.62, -0.62, 1.6], yaw: 0.2, space: "cam" },           // shot 11 low MS: pickets bottom-right
  { a: 932, b: 978, kit: "mailbox_post", pos: [-0.78, -0.35, 2.2], yaw: 0.6, space: "cam" },  // shot 12a: mailbox at the left edge
  { a: 1190, b: 1267, kit: "velvet_rope", pos: [0.9, -1.1, 2.8], yaw: -0.4, space: "cam" },    // museum wide: stanchion + rope bottom-right
];

// ---------------- lens: depth of field ----------------
/** Lens blur per beat (thin lens). cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp.
 *  Bridge reference: CU 12-16, MS 10-12, wides/aerials 0. Entries switch on cuts (no dur) or ramp with the camera glide
 *  they share f/dur with. focus = world point (else the camera look point). */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const onMissile = (id: number) => (f: number): V3 => missileAt(id, f).pos;
export const DOF: Dof[] = [
  // depth.md: CU/inserts 10-12, MS 8-10, FS 0 (or 5-6), wides 0; never on a sky-only background; focus on the eyes
  { f: 0, cInf: 0 },                                 // hook: high chase, sea + coast behind: sharp wide
  { f: 56, cInf: 8, focus: (f) => add(SEA1(f), [-2.0, 0.1, 0]) }, // side MS of the letter stream (sea behind)
  { f: 84, cInf: 8, focus: onMissile(1) },           // 3/4 front punch, sea behind
  { f: 121, cInf: 11, focus: () => eyes(SPOT.PMG2) }, // post office MCU: postmaster's eyes, clerk + slots soft
  { f: 176, cInf: 0 },                               // sub establishing
  { f: 249, cInf: 0 },                               // sailor full shot from over the water
  { f: 316, cInf: 9, focus: () => eyes(SPOT.SAILOR4) }, // MS on the deck line, sail + hangar behind
  { f: 374, cInf: 11, focus: () => NOSE5 },          // insert: the nose intake, the sailor soft
  { f: 406, cInf: 11, focus: () => eyes(SPOT.SAILOR5) }, // MCU, missile + sail behind
  { f: 463, cInf: 0 },                               // launch
  { f: 497, cInf: 0 },                               // chase over the sea (wide)
  { f: 574, cInf: 0 },                               // landing wide
  { f: 659, cInf: 8, focus: () => eyes(SPOT.PMG9) }, // two-shot MS, missile + hangars behind
  { f: 703, cInf: 11, focus: () => eyes(SPOT.PMG9) }, // low MCU over the lectern
  { f: 738, dur: 40, cInf: 8, focus: () => eyes(SPOT.PMG9) },
  { f: 785, cInf: 8, focus: () => eyes(POSTMAN10) }, // MS by the sacks
  { f: 848, cInf: 0 },                               // the hit: house wide
  { f: 866, dur: 34, cInf: 9, focus: () => eyes(SPOT.KID, 0.78) }, // kid MS
  { f: 931, cInf: 8, focus: () => eyes(SPOT.POSTMAN12) },
  { f: 978, dur: 36, cInf: 0 },                      // crane up to the roof sacks
  { f: 1014, dur: 32, cInf: 10, focus: () => eyes(SPOT.POSTMAN12) }, // MCU
  { f: 1058, cInf: 8, focus: () => eyes(SPOT.POSTMAN13) }, // two-shot MS
  { f: GO_F - 4, cInf: 0 },                          // tilt up after the missile, the puff
  { f: 1189, cInf: 0 },                              // museum wide
  { f: 1267, cInf: 11, focus: () => eyes(SPOT.VISITOR15) }, // visitor MCU
  { f: 1284, dur: 64, cInf: 0, focus: () => eyes(SPOT.VISITOR15) },                     // crane out to the wide
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
