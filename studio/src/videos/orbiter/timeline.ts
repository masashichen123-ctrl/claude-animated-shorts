// "The 125 Million Dollar Mix-Up": shots, cameras, lens and sound cues, timed to the narration (timing.ts).
import { makeClock, makeTimeline, hold, holdZ, track, add, V3, Key, Dof, SoundEvent, clamp01 } from "../kit/timeline";
import { SENT_MEASURED, SPOKEN_MEASURED } from "./timing";

export const CLOCK = makeClock(SENT_MEASURED, SPOKEN_MEASURED);
export const F = CLOCK.F;

// ---------------- places ----------------
export const SPACE: V3 = [5000, 0, 0];        // far from the sky's clouds
export const MARS: V3 = add(SPACE, 0, -40, 420);
export const MARS_R = 230;
export const LAB: V3 = [200, 0, 0];           // Colorado workshop (pounds)
export const CTRL: V3 = [-200, 0, 0];         // California control room (newtons)
export const KITCHEN: V3 = [0, 0, 300];

// ---------------- the orbiter's flight ----------------
/** orbiter position in space for shot id at frame f */
export const probeAt = (id: number, f: number): V3 => {
  if (id === 2) return add(SPACE, 0, 0, -60 + 60 * clamp01((f - F(2)) / (F(3) - F(2))));
  if (id === 6 || id === 7) { const u = clamp01((f - F(6)) / (F(8) - F(6))); return add(SPACE, 0, -14 * u * u, 40 * u); }
  if (id === 8 || id === 15 || id === 1) {
    // skim down toward the limb in Mars-centred polar coordinates (never inside the planet)
    const f0 = id === 8 ? F(8) : id === 15 ? F(15) : 0, f1 = id === 8 ? F(9) : id === 15 ? CLOCK.TOTAL : F(2);
    const u = clamp01((f - f0) / (f1 - f0)), r = (id === 8 ? 300 : 252) - (id === 8 ? 62 : 14) * u, a = 0.05 + 0.25 * u;
    return [MARS[0], MARS[1] + r * Math.sin(a), MARS[2] - r * Math.cos(a)];
  }
  if (id === 14) return add(SPACE, 0, -8, 130);
  return SPACE;
};
/** 0..1 how hot the orbiter is (re-entry glow) */
export const heatAt = (id: number, f: number) => (id === 1 ? 0.8 : id === 15 ? 0.6 + 0.4 * clamp01((f - F(15)) / 30) : id === 8 ? clamp01((f - F(8, 0.45)) / 30) : 0);
export const LOST = F(8, 0.8);

const follow = (id: number, dx: number, dy: number, dz: number, ly = 0, fov = 40, roll = 0) => (f: number) => {
  const p = probeAt(id, f);
  return { pos: add(p, dx, dy, dz), look: add(p, 0, ly, 6), fov, roll };
};

const cams: Record<number, Key[]> = {
  1: [{ f: 0, s: follow(1, -7, 2.5, -9, 0, 46, 0.05) }],
  2: [{ f: F(2), s: follow(2, 9, 3, -14, 0, 40) }],
  3: [
    { f: F(3), s: hold(add(LAB, -5, 1.9, -9.5), add(LAB, -0.5, 2.3, 0), F(3), 46, 0.0018) },
    { f: F(3, 0.52), cut: true, s: hold(add(CTRL, -5, 1.9, -9.5), add(CTRL, 0, 2.3, 0), F(3, 0.52), 46, 0.0018) },
  ],
  4: [
    { f: F(4), s: hold(add(LAB, -2.4, 1.7, -6), add(LAB, -1, 1.7, -1), F(4), 38, 0.0022) },
    { f: F(4, 0.5), cut: true, s: hold(add(CTRL, 2.6, 1.7, -6), add(CTRL, 1, 1.8, -1), F(4, 0.5), 38, 0.0022) },
  ],
  5: [{ f: F(5), s: hold(add(LAB, 6, 1.8, -3.0), add(LAB, 6, 1.5, 0.3), F(5), 40, 0.002) }],
  6: [{ f: F(6), s: follow(6, 6, 3, -12, -2, 44) }],
  7: [{ f: F(7), s: (f: number) => { const p = probeAt(7, f); return { pos: add(SPACE, 40, 40, -60), look: add(p, 0, -20, 60), fov: 44, roll: 0 }; } }],
  8: [
    { f: F(8), s: follow(8, -10, 4, -14, -2, 44) },
    { f: F(8, 0.45), dur: 30, s: follow(8, -5, 2, -8, -2, 40, 0.06) },
  ],
  9: [{ f: F(9), s: hold(add(CTRL, -3, 1.75, -6.5), add(CTRL, -0.5, 1.7, -1.5), F(9), 40, 0.0025) }],
  10: [{ f: F(10), s: hold(add(CTRL, 4.5, 2.4, -7), add(CTRL, 4.8, 0.9, -1.5), F(10), 40, 0.002) }],
  11: [{ f: F(11), s: hold(add(LAB, -4.6, 2.2, -2.2), add(LAB, -4.6, 2.2, 3.0), F(11), 40, 0.0025) }],
  12: [
    { f: F(12), s: hold(add(KITCHEN, -1, 1.55, -3.4), add(KITCHEN, 0, 1.0, 0.2), F(12), 38, 0.002) },
    { f: F(12, 0.62), cut: true, s: hold(add(KITCHEN, -2.6, 2.0, -5.6), add(KITCHEN, 0, 1.4, 0), F(12, 0.62), 44, 0.0015, 0.04) },
  ],
  13: [{ f: F(13), s: hold(add(LAB, -1.4, 1.75, -6.5), add(LAB, 0.5, 1.4, -0.5), F(13), 42, 0.0022) }],
  14: [{ f: F(14), s: track({ pos: add(SPACE, -16, 6, 100), look: add(SPACE, 0, -8, 135), fov: 44 }, { pos: add(SPACE, -9, 2, 116), look: add(SPACE, 0, -14, 160), fov: 40 }, F(14), F(15)) }],
  15: [{ f: F(15), s: follow(15, -5, 1.5, -7, -1, 38, -0.06) }],
};

const dof: Dof[] = [
  { f: 0, cInf: 0 }, { f: F(3), cInf: 8 }, { f: F(4), cInf: 11 }, { f: F(5), cInf: 12 },
  { f: F(6), cInf: 0 }, { f: F(9), cInf: 10 }, { f: F(10), cInf: 9 }, { f: F(11), cInf: 12 }, { f: F(12), cInf: 10 }, { f: F(12, 0.62), cInf: 6 },
  { f: F(13), cInf: 9 }, { f: F(14), cInf: 0 },
];

const events: SoundEvent[] = [
  { f: 0, kind: "rumble", dur: 4.5, gain: 0.8 }, { f: 10, kind: "sizzle", dur: 4.0, gain: 0.6 },
  { f: F(2), kind: "jet", dur: 2.5, gain: 0.5 },
  { f: F(3, 0.1), kind: "clank", gain: 0.6 }, { f: F(3, 0.6), kind: "beep" }, { f: F(3, 0.75), kind: "beep" },
  { f: F(4, 0.2), kind: "stamp" }, { f: F(4, 0.7), kind: "stamp" },
  { f: F(5, 0.25), kind: "thud" }, { f: F(5, 0.5), kind: "click" }, { f: F(5, 0.6), kind: "click" }, { f: F(5, 0.7), kind: "click" }, { f: F(5, 0.8), kind: "click" },
  ...[0.15, 0.4, 0.7].map((u) => ({ f: F(6, u), kind: "pop" as const, gain: 0.7 })),
  ...[0.1, 0.4, 0.7].map((u) => ({ f: F(7, u), kind: "pop" as const, gain: 0.5 })),
  { f: F(8, 0.45), kind: "rumble", dur: 2.0 }, { f: F(8, 0.45), kind: "sizzle", dur: 1.6 }, { f: LOST, kind: "zap" },
  { f: F(9, 0.3), kind: "whoa", n: 3, gain: 0.6 },
  { f: F(10, 0.3), kind: "ratchet", n: 16, gain: 0.6 }, { f: F(10, 0.6), kind: "oof", n: 3 },
  { f: F(11, 0.3), kind: "boing", gain: 0.6 },
  { f: F(12, 0.3), kind: "ding", gain: 0.5 }, { f: F(12, 0.66), kind: "thud", gain: 1.2 }, { f: F(12, 0.68), kind: "wind_gust", dur: 1.2 },
  { f: F(13, 0.3), kind: "stamp" }, { f: F(13, 0.6), kind: "stamp" },
  { f: F(14, 0.2), kind: "beep" }, { f: F(15), kind: "rumble", dur: 2.0 }, { f: F(15), kind: "sizzle", dur: 2.0 },
];

export const TL = makeTimeline({
  clock: CLOCK,
  sun: { 1: { az: 100, el: 20 }, 2: { az: 100, el: 20 }, 6: { az: 100, el: 20 }, 7: { az: 100, el: 20 }, 8: { az: 100, el: 20 }, 14: { az: 100, el: 20 }, 15: { az: 100, el: 20 } },
  amb: { 1: "space", 2: "space", 3: "room", 4: "room", 5: "room", 6: "space", 7: "space", 8: "space", 9: "room", 10: "room", 11: "room", 12: "room", 13: "room", 14: "space", 15: "space" },
  xfade: { 3: 10, 6: 10, 9: 8, 12: 8, 13: 8, 14: 10 },
  flashes: [F(2), LOST],
  cams, dof,
  kicks: [[F(5, 0.25), 0.6], [F(12, 0.66), 1.2]],
  events,
  musicStops: [[F(8, 0.5), F(9)]],
  music: { mood: "sneaky", key: 3, tempo: 100 },
});
