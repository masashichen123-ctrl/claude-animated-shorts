// Shared timing + camera grammar for every short (no three.js here, so the sound exporter can import it).
// A film's timeline.ts calls makeClock() with its measured narration timings, then makeTimeline() with its shots,
// camera keys, lens table, kicks and sound events.
export const FPS = 30;
export const D0 = 0;
export type V3 = [number, number, number];
export type Light = "day" | "golden";

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const add = (a: V3, x: number, y: number, z: number): V3 => [a[0] + x, a[1] + y, a[2] + z];
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- narration clock ----------------
/** F(n, u): frame at fraction u (0..1) of the spoken part of sentence n (1-based). SENT has one extra entry: the end. */
export const makeClock = (SENT: number[], SPOKEN: number[]) => {
  if (SENT.length !== SPOKEN.length + 1) throw new Error("timing.ts: SENT must have one more entry than SPOKEN");
  const F = (n: number, u = 0) => Math.round((SENT[n - 1] + u * SPOKEN[n - 1]) * FPS);
  return { F, N: SPOKEN.length, TOTAL: Math.round(SENT[SENT.length - 1] * FPS), SENT, SPOKEN };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Shot = Partial<Cam> & { pos: V3; look: V3 };
export type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
export const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
export const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
export const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
/** held framing that creeps in (dolly) from frame f0 */
export const hold = (pos: V3, look: V3, f0: number, fov = 40, rate = 0.002, roll = 0) => (f: number) => dolly(pos, look, pushK(f, f0, rate), { fov, roll });
/** held framing that creeps in by zooming (camera stays put: next to walls) */
export const holdZ = (pos: V3, look: V3, f0: number, fov = 40, rate = 0.002, roll = 0) => (f: number) => zoom(pos, look, fov, pushK(f, f0, rate), { roll });
/** a move from framing a to framing b between frames f0 and f1 (smootherstep), for tracking shots inside one key */
export const track = (a: Shot, b: Shot, f0: number, f1: number) => (f: number): Shot => {
  const u = glide((f - f0) / Math.max(1, f1 - f0)), A = full(a), B = full(b);
  return mixCam(A, B, u);
};
const runKeys = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixCam(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};

// ---------------- sound events ----------------
/** kinds understood by shorts/sound_kit.py */
export type SoundKind =
  | "boom" | "thud" | "crunch" | "splat" | "click" | "ding" | "honk" | "whoa" | "oof" | "laugh" | "gull" | "pop" | "splash" | "glass"
  | "clank" | "bell" | "whistle_down" | "sizzle" | "engine" | "brake" | "murmur" | "applause" | "rumble" | "squawk" | "croak" | "zap"
  | "jet" | "beep" | "gunburst" | "drip" | "flush" | "fanfare" | "boing" | "ratchet" | "cheer" | "wind_gust" | "stamp";
export type SoundEvent = { f: number; kind: SoundKind; gain?: number; pan?: number; dur?: number; n?: number };
export type Ambience = "beach" | "city" | "field" | "room" | "space" | "river" | "street" | "night" | "none";

// ---------------- shots ----------------
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; amb: Ambience };
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export type FilmTimeline = {
  TOTAL: number; SHOTS: ShotDef[]; FLASHES: number[];
  layersAt: (f: number) => { id: number; alpha: number }[];
  camAt: (id: number, f: number) => Cam; keyAt: (id: number, f: number) => number;
  dofAt: (f: number) => { cInf: number; focus?: (f: number) => V3 };
  sound: { events: SoundEvent[]; cuts: number[]; glides: number[]; musicStops: [number, number][]; music: MusicSpec };
};
export type MusicSpec = { key?: number; tempo?: number; mood?: "sneaky" | "march" | "bouncy" | "grand"; vel?: number };

export const makeTimeline = (o: {
  clock: ReturnType<typeof makeClock>;
  light?: Record<number, Light>; sun?: Record<number, { az?: number; el?: number }>; amb: Record<number, Ambience> | Ambience;
  xfade?: Record<number, number>; flashes?: number[]; cams: Record<number, Key[]>; dof: Dof[]; kicks?: [number, number][];
  events?: SoundEvent[]; musicStops?: [number, number][]; music?: MusicSpec;
}): FilmTimeline => {
  const { F, N, TOTAL } = o.clock;
  const SHOTS: ShotDef[] = Array.from({ length: N }, (_, i) => ({
    id: i + 1, a: F(i + 1), b: i === N - 1 ? TOTAL : F(i + 2), light: o.light?.[i + 1] ?? "day",
    sunAz: o.sun?.[i + 1]?.az, sunEl: o.sun?.[i + 1]?.el, amb: typeof o.amb === "string" ? o.amb : o.amb[i + 1] ?? "none",
  }));
  const XF = o.xfade ?? {};
  const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
  const layersAt = (f: number) => {
    for (const s of SHOTS) {
      const x = XF[s.id];
      if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
    }
    return [{ id: shotAt(f).id, alpha: 1 }];
  };
  for (let i = 1; i <= N; i++) if (!o.cams[i]) throw new Error(`no camera for shot ${i}`);
  const kicks = o.kicks ?? [];
  const kickAt = (f: number) => {
    let a = 0;
    for (const [f0, g] of kicks) { const n = f - f0; if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
    return a;
  };
  const camAt = (id: number, f: number): Cam => {
    const c = runKeys(o.cams[id], f), a = kickAt(f);
    if (!a) return c;
    const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
    const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
    const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
    return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
  };
  const keyAt = (id: number, f: number) => { let k = 0; o.cams[id].forEach((key, i) => { if (f >= key.f) k = i; }); return k; };
  const DOF = o.dof;
  const dofAt = (f: number) => {
    let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
    const d = DOF[i], p = DOF[Math.max(0, i - 1)];
    const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
    return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
  };
  // whooshes: hard cuts inside shots, and the middle of every glide; shot changes without a crossfade are cuts too
  const cuts: number[] = [], glides: number[] = [];
  for (let i = 1; i <= N; i++) {
    if (i > 1 && !XF[i]) cuts.push(SHOTS[i - 1].a);
    o.cams[i].forEach((k, j) => { if (j === 0) return; if (k.cut) cuts.push(k.f); else glides.push(k.f + (k.dur ?? 24) / 2); });
  }
  return {
    TOTAL, SHOTS, FLASHES: o.flashes ?? [], layersAt, camAt, keyAt, dofAt,
    sound: { events: o.events ?? [], cuts, glides, musicStops: o.musicStops ?? [], music: o.music ?? {} },
  };
};
