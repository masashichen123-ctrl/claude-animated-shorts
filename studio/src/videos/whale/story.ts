// Timeline of "A Whale of a Deal": 16 sentences, one shot each. Every frame number is derived from SENT (sentence
// start times in seconds), so swapping the estimated starts for the real voice timings retimes the whole film.
export const FPS = 30;
export type V3 = [number, number, number];
export const D0 = 0; // ground height (build.ts reads it)

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- narration timing ----------------
/** words per sentence of SCRIPT.md */
const WORDS = [17, 16, 21, 17, 19, 6, 14, 16, 4, 13, 11, 11, 23, 4, 10, 15];
/** pause after each sentence (s) */
const GAP = [0.3, 0.3, 0.3, 0.3, 0.35, 0.45, 0.3, 0.35, 0.3, 0.35, 0.3, 0.35, 0.35, 0.45, 0.3, 1.0];
const RATE = 3.7; // words per second (estimate until the voice is recorded)
/** sentence start times (s); index 16 = end of film. REPLACE with the measured starts once voice.wav exists. */
export const SENT: number[] = (() => {
  const out = [0];
  WORDS.forEach((w, i) => out.push(out[i] + w / RATE + GAP[i]));
  return out;
})();
/** frame at fraction u (0..1) of the SPOKEN part of sentence n (1-based) */
export const F = (n: number, u = 0) => Math.round((SENT[n - 1] + u * (WORDS[n - 1] / RATE)) * FPS);
export const TOTAL = Math.round(SENT[16] * FPS);
const T = (f: number) => f / FPS;

// ---------------- places ----------------
export const WHALE: V3 = [0, 0, 6];          // whale centre, long axis along x, head at +x, sea at z > 16
export const PLUNGER: V3 = [-3, 0, -9];      // detonator box (hook)
export const CRATES: V3 = [1.5, 0, 3.4];     // dynamite stack against the land side of the whale
export const TRUCK_STOP: V3 = [17, 0, -9];
export const SIGN: V3 = [9, 0, -5];          // road sign stuck in the sand
export const LOG: V3 = [-14, 0, -12];        // driftwood log with the waiting gulls
export const CROWD: V3 = [-80, 0, -40];      // where everyone backs up to
export const TVCAM: V3 = [-74, 0, -35];
export const CAR: V3 = [-95, 0, -52];
export const TABLE: V3 = [-200, 0, -200];    // picnic table with the jelly
export const LOT: V3 = [300, 0, -300];       // car dealer

// ---------------- story events (frames) ----------------
export const PUSH = F(1, 0.9);               // hook: the plunger goes down
export const TRUCK_IN = F(3, 0.0), TRUCK_HALT = F(3, 0.42);
export const BLAST = F(8, 0.1);              // the whale goes up
export const RAIN = F(8, 0.62);              // "raining blubber" at the crowd
export const CRUSH = F(10, 0.58);            // the big chunk lands on the car
export const SLAP = F(13, 0.5);              // the hand hits the jelly

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
const LIGHT_OF: Record<number, Light> = { 16: "golden" };
export const SHOTS: ShotDef[] = WORDS.map((_, i) => ({ id: i + 1, a: F(i + 1), b: i === 15 ? TOTAL : F(i + 2), light: LIGHT_OF[i + 1] ?? "day" }));
SHOTS[15].sunAz = 140; SHOTS[15].sunEl = 24;
/** crossfades (frames) at place/time changes; a white flash after the hook and at the blast */
export const XFADE: Record<number, number> = { 3: 8, 7: 8, 11: 8, 12: 8, 13: 10, 14: 10, 15: 8, 16: 10 };
export const FLASH_AT = F(2);
export const FLASHES = [F(2), BLAST];

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
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
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const add = (a: V3, x: number, y: number, z: number): V3 => [a[0] + x, a[1] + y, a[2] + z];
/** a held framing with a creeping push-in from frame f0 */
const hold = (pos: V3, look: V3, f0: number, fov = 40, rate = 0.002, roll = 0) => (f: number) => dolly(pos, look, pushK(f, f0, rate), { fov, roll });
const holdZ = (pos: V3, look: V3, f0: number, fov = 40, rate = 0.002, roll = 0) => (f: number) => zoom(pos, look, fov, pushK(f, f0, rate), { roll });

/** truck position along the beach (shot 3): drives in from x = 46 and stops */
export const truckX = (f: number) => TRUCK_STOP[0] + 29 * (1 - easeOut((f - TRUCK_IN) / Math.max(1, TRUCK_HALT - TRUCK_IN)));

const CAMS: Record<number, Key[]> = {
  // 1 hook: low wide of the whale + crates with the engineer at the plunger -> his grin -> the plunger
  1: [
    { f: 0, s: hold([-6.2, 1.3, -15.5], [-1.0, 1.7, 1.5], 0, 46, 0.0022) },
    { f: F(1, 0.34), dur: 30, s: hold([-4.6, 1.55, -12.4], add(PLUNGER, 0.1, 1.55, 0), F(1, 0.34), 38, 0.002, -0.04) },
    { f: F(1, 0.72), dur: 26, s: hold([-3.9, 0.75, -11.2], add(PLUNGER, 0.35, 0.6, 0), F(1, 0.72), 36, 0.003, 0.04) },
  ],
  // 2 the beach: aerial of the whale and the town holding its nose -> faces
  2: [
    { f: F(2), s: holdZ([17, 10, -27], [0, 1.0, 1], F(2), 44, 0.0018) },
    { f: F(2, 0.62), cut: true, s: hold([-8.0, 1.5, -14.3], [-5.6, 1.45, -7.6], F(2, 0.62), 38, 0.0025, 0.035) },
  ],
  // 3 the highway truck rolls up; "the beach was a road": the road sign in the sand
  3: [
    { f: F(3), s: (f) => dolly([26, 1.7, -19.5], [truckX(f) - 1.5, 1.5, -9], pushK(f, F(3), 0.0012), { fov: 44 }) },
    { f: F(3, 0.45), dur: 28, s: hold([19.5, 1.55, -14.2], [13.2, 1.5, -9.6], F(3, 0.45), 38, 0.002) },
    { f: F(3, 0.68), cut: true, s: hold([5.2, 1.0, -11.5], add(SIGN, 0.4, 1.7, 0), F(3, 0.68), 40, 0.003, -0.04) },
  ],
  // 4 the plan: smug engineer; "the seagulls would eat them": the gulls waiting on a log
  4: [
    { f: F(4), s: hold([1.2, 1.5, -11.2], [3.0, 1.55, -7], F(4), 38, 0.0022) },
    { f: F(4, 0.4), dur: 22, s: hold([2.0, 1.55, -10.2], [3.0, 1.6, -7], F(4, 0.4), 36, 0.002, 0.04) },
    { f: F(4, 0.7), cut: true, s: hold([-12.4, 0.9, -18.6], add(LOG, 0, 0.8, 0), F(4, 0.7), 36, 0.0028) },
  ],
  // 5 the veteran: "twenty sticks would do it" -> the little bundle
  5: [
    { f: F(5), s: hold([-6.4, 1.55, -12.9], [-5.0, 1.55, -9], F(5), 38, 0.0022) },
    { f: F(5, 0.45), dur: 22, s: hold([-5.9, 1.6, -11.6], [-5.0, 1.6, -9], F(5, 0.45), 36, 0.002, -0.035) },
    { f: F(5, 0.72), cut: true, s: hold([-3.3, 0.9, -9.4], [-3.6, 0.62, -7.6], F(5, 0.72), 34, 0.003) },
  ],
  // 6 "twenty cases": tilt up the wall of crates
  6: [
    { f: F(6), s: (f) => { const u = glide((f - F(6)) / (F(7) - F(6) + 6)); return { pos: [1.2, 0.6 + 2.6 * u, -1.6 - 5.4 * u] as V3, look: [1.5, 0.7 + 1.5 * u, 3.4] as V3, fov: 42, roll: 0.04 * (1 - u) }; } },
  ],
  // 7 everyone backs up: over the crowd toward the far whale -> the TV crew
  7: [
    { f: F(7), s: holdZ([-93, 4.4, -46], [-40, 1.0, -17], F(7), 34, 0.0015) },
    { f: F(7, 0.6), cut: true, s: hold([-77.6, 1.6, -30.6], add(TVCAM, 0.4, 1.45, 0), F(7, 0.6), 40, 0.0025, 0.03) },
  ],
  // 8 the blast -> blubber raining on the crowd
  8: [
    { f: F(8), s: holdZ([-34, 2.6, -24], [0, 7, 5], F(8), 46, 0.001) },
    { f: BLAST + 22, dur: 40, s: holdZ([-38, 2.6, -27], [0, 15, 5], BLAST + 22, 52, 0.0008) },
    { f: RAIN, cut: true, s: hold([-76.2, 1.5, -44.6], add(CROWD, 0.6, 1.75, 0), RAIN, 44, 0.0018, -0.03) },
  ],
  // 9 "luckily": closer on the crowd
  9: [{ f: F(9), s: hold([-78.4, 1.6, -43.6], add(CROWD, 0.2, 1.6, 0), F(9), 38, 0.0025, 0.03) }],
  // 10 "unluckily": the parked car
  10: [
    { f: F(10), s: hold([-100.5, 1.7, -58.5], add(CAR, 0, 0.9, 0), F(10), 40, 0.002) },
    { f: CRUSH + 16, dur: 24, s: hold([-99.2, 1.3, -56.6], add(CAR, 0, 0.7, 0), CRUSH + 16, 38, 0.002, 0.04) },
  ],
  // 11 the gulls leave
  11: [{ f: F(11), s: holdZ([-10, 1.6, -14], [24, 13, 70], F(11), 40, 0.0016) }],
  // 12 the whale, still there
  12: [
    { f: F(12), s: holdZ([18, 7, -26], [0, 1.3, 5], F(12), 42, 0.0018) },
    { f: F(12, 0.55), cut: true, s: hold([-6.6, 1.3, -6.8], [-4.6, 1.2, -3.4], F(12, 0.55), 40, 0.0025, -0.03) },
  ],
  // 13 the jelly
  13: [
    { f: F(13), s: hold(add(TABLE, 1.6, 1.75, -5.6), add(TABLE, 0, 1.05, 0), F(13), 38, 0.0012) },
    { f: SLAP - 34, dur: 26, s: hold(add(TABLE, 0.5, 1.35, -3.3), add(TABLE, 0, 1.02, 0), SLAP - 34, 36, 0.0015, 0.03) },
  ],
  // 14 buried
  14: [{ f: F(14), s: holdZ([13, 3.2, -19], [0, 1.4, 5], F(14), 40, 0.003) }],
  // 15 the owner of the car
  15: [{ f: F(15), s: hold([-99.6, 1.55, -57.2], [-96.6, 1.45, -52.6], F(15), 38, 0.003, -0.03) }],
  // 16 the dealer's lot: the proud owner -> up to the banner
  16: [
    { f: F(16), s: hold(add(LOT, -2.2, 1.5, -7.2), add(LOT, 0, 1.3, 0), F(16), 40, 0.0018) },
    { f: F(16, 0.55), dur: 46, s: holdZ(add(LOT, -0.5, 1.35, -10.5), add(LOT, 0.2, 4.35, 2.4), F(16, 0.55), 34, 0.0012) },
  ],
};

// impact kicks: the image offset flips sign every frame and decays to 0 in 7 f
const KICKS: [number, number][] = [[PUSH, 0.5], [BLAST, 2.2], [BLAST + 5, 1.4], [CRUSH, 1.8], [SLAP, 0.8]];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) { const n = f - f0; if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** index of the camera key in force at frame f (cast.ts stages people per key) */
export const keyAt = (id: number, f: number) => { let k = 0; CAMS[id].forEach((key, i) => { if (f >= key.f) k = i; }); return k; };

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: F(1, 0.34), dur: 30, cInf: 13 },
  { f: F(2), cInf: 0 },
  { f: F(2, 0.62), cInf: 12, focus: () => [-6.0, 1.5, -7.5] },
  { f: F(3), cInf: 0 },
  { f: F(3, 0.45), dur: 28, cInf: 10 },
  { f: F(3, 0.68), cInf: 10 },
  { f: F(4), cInf: 12 },
  { f: F(4, 0.7), cInf: 13 },
  { f: F(5), cInf: 12 },
  { f: F(5, 0.72), cInf: 14 },
  { f: F(6), cInf: 0 },
  { f: F(7, 0.6), cInf: 10 },
  { f: F(8), cInf: 0 },
  { f: RAIN, cInf: 9 },
  { f: F(9), cInf: 12 },
  { f: F(10), cInf: 8 },
  { f: F(11), cInf: 0 },
  { f: F(12, 0.55), cInf: 10 },
  { f: F(13), cInf: 9 },
  { f: F(14), cInf: 0 },
  { f: F(15), cInf: 11, focus: () => [-97.4, 1.55, -53.2] },
  { f: F(16), cInf: 9 },
  { f: F(16, 0.55), dur: 46, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export { T };
