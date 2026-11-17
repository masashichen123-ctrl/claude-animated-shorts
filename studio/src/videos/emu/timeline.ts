// "The War Australia Lost to Birds": shots, cameras, lens and sound cues, timed to the narration (timing.ts).
import { makeClock, makeTimeline, hold, holdZ, track, add, V3, Key, Dof, SoundEvent, clamp01 } from "../kit/timeline";
import { SENT_MEASURED, SPOKEN_MEASURED } from "./timing";

export const CLOCK = makeClock(SENT_MEASURED, SPOKEN_MEASURED);
export const F = CLOCK.F;

// ---------------- places ----------------
export const CAMP: V3 = [-10, 0, -10];      // soldiers' camp and the gun
export const GUN: V3 = [-8, 0, -6];
export const FARM: V3 = [-34, 0, 22];      // farmhouse
export const BOARD: V3 = [-14, 0, -12];    // the tally board
export const SIGN50: V3 = [20, 0, -20];    // speed sign by the road (road along x at z = -20)
export const PLAQUE: V3 = [0, 0, -300];    // the coat-of-arms plaque (separate little stage)

// ---------------- the truck chase (shot 5) ----------------
export const truckAt = (id: number, f: number): V3 => {
  if (id === 3) { const u = clamp01((f - F(3)) / (F(3, 0.6) - F(3))); return [-60 + 46 * (1 - (1 - u) ** 3), 0, -20]; }
  if (id === 5) { const u = clamp01((f - F(5)) / (F(6) - F(5))); return [-20 + 40 * u, 0, 18]; }
  if (id === 11) { const u = clamp01((f - F(11)) / (F(12) - F(11))); return [-14 - 40 * u * u, 0, -20]; }
  return [-14, 0, -20];
};

const cams: Record<number, Key[]> = {
  1: [
    { f: 0, s: hold(add(GUN, -3.2, 1.3, -3.0), add(GUN, 1.5, 1.0, 8), 0, 44, 0.0018) },
    { f: F(1, 0.72), cut: true, s: hold([3.5, 0.5, 9.5], [4.5, 1.6, 14], F(1, 0.72), 40, 0.003, 0.05) },
  ],
  2: [
    { f: F(2), s: holdZ([-70, 26, -50], [-10, 0, 25], F(2), 44, 0.0014) },
    { f: F(2, 0.6), cut: true, s: hold(add(FARM, 4, 1.7, -9), add(FARM, 1, 1.6, -3), F(2, 0.6), 40, 0.002) },
  ],
  3: [{ f: F(3), s: hold([-20, 1.8, -32], [-16, 1.4, -21], F(3), 44, 0.0016) }],
  4: [{ f: F(4), s: holdZ([-6, 14, -14], [6, 0, 26], F(4), 50, 0.0014) }],
  5: [
    { f: F(5), s: (f: number) => { const p = truckAt(5, f); return { pos: add(p, -9, 2.2, -10), look: add(p, 4, 1.0, 4), fov: 46, roll: 0.03 * Math.sin(f * 0.6) }; } },
    { f: F(5, 0.55), cut: true, s: (f: number) => { const p = truckAt(5, f); return { pos: add(p, 16, 1.0, 10), look: add(p, 4, 1.2, 1), fov: 44, roll: 0 }; } },
  ],
  6: [{ f: F(6), s: hold(add(BOARD, -1.2, 1.7, -4.4), add(BOARD, 0, 1.8, 0), F(6), 40, 0.0022) }],
  7: [{ f: F(7), s: hold(add(CAMP, -1, 1.5, -6.5), add(CAMP, 0.5, 1.2, 0), F(7), 40, 0.002) }],
  8: [{ f: F(8), s: hold(add(CAMP, 4.0, 1.4, -2.5), add(CAMP, 4.6, 1.5, 1.5), F(8), 38, 0.0025, -0.04) }],
  9: [{ f: F(9), s: track({ pos: add(SIGN50, -12, 1.4, -6), look: add(SIGN50, -6, 1.2, 0), fov: 40 }, { pos: add(SIGN50, 6, 1.4, -6), look: add(SIGN50, 12, 1.2, 0), fov: 40 }, F(9), F(10)) }],
  10: [
    { f: F(10), s: hold([0, 0.8, 4], [0, 1.4, 20], F(10), 46, 0.002) },
    { f: F(10, 0.6), cut: true, s: hold(add(CAMP, 0.5, 1.75, -4.0), add(CAMP, 0.5, 1.7, 0), F(10, 0.6), 36, 0.0025) },
  ],
  11: [{ f: F(11), s: hold([-8, 1.5, -10], [-24, 1.5, -20], F(11), 44, 0.0016) }],
  12: [{ f: F(12), s: hold(add(BOARD, -1.6, 1.7, -4.8), add(BOARD, 0, 1.8, 0), F(12), 40, 0.0018) }],
  13: [{ f: F(13), s: hold(add(CAMP, 6.5, 0.5, 2.6), add(CAMP, 9, 0.6, 6.5), F(13), 40, 0.0025) }],
  14: [{ f: F(14), s: hold(add(PLAQUE, 0, 2.2, -8), add(PLAQUE, 0, 2.6, 0), F(14), 40, 0.0018) }],
};

const dof: Dof[] = [
  { f: 0, cInf: 10 }, { f: F(1, 0.72), cInf: 14 }, { f: F(2), cInf: 0 }, { f: F(2, 0.6), cInf: 9 }, { f: F(3), cInf: 6 },
  { f: F(4), cInf: 0 }, { f: F(5), cInf: 0 }, { f: F(6), cInf: 11 }, { f: F(7), cInf: 9 }, { f: F(8), cInf: 13 }, { f: F(9), cInf: 6 },
  { f: F(10), cInf: 8 }, { f: F(10, 0.6), cInf: 13 }, { f: F(11), cInf: 6 }, { f: F(12), cInf: 11 }, { f: F(13), cInf: 14 }, { f: F(14), cInf: 8 },
];

const events: SoundEvent[] = [
  { f: 6, kind: "gunburst", n: 8 }, { f: 30, kind: "gunburst", n: 6 }, { f: 52, kind: "gunburst", n: 7 },
  { f: F(1, 0.72), kind: "squawk", gain: 1.2 },
  { f: F(2, 0.3), kind: "squawk", gain: 0.6 }, { f: F(2, 0.7), kind: "murmur", dur: 1.5 },
  { f: F(3), kind: "engine", dur: 2.5 }, { f: F(3, 0.6) - 4, kind: "brake" }, { f: F(3, 0.75), kind: "clank" },
  { f: F(4, 0.1), kind: "squawk" }, { f: F(4, 0.4), kind: "squawk", gain: 0.7 },
  { f: F(5), kind: "engine", dur: 4.0 }, { f: F(5, 0.25), kind: "gunburst", n: 6 }, { f: F(5, 0.6), kind: "gunburst", n: 5 },
  { f: F(6, 0.2), kind: "stamp" }, { f: F(6, 0.6), kind: "stamp" },
  { f: F(7, 0.2), kind: "laugh", n: 3, gain: 0.6 }, { f: F(8, 0.2), kind: "squawk" }, { f: F(8, 0.4), kind: "oof", n: 1 },
  { f: F(9), kind: "whistle_down", dur: 0.5, gain: 0.4 }, { f: F(9, 0.4), kind: "wind_gust", dur: 1.0 },
  { f: F(10), kind: "rumble", dur: 2.5 },
  { f: F(11), kind: "engine", dur: 3.0 }, { f: F(11, 0.5), kind: "squawk", gain: 0.8 },
  { f: F(12, 0.3), kind: "stamp" }, { f: F(13, 0.4), kind: "pop" }, { f: F(14), kind: "fanfare", gain: 0.7 },
];

export const TL = makeTimeline({
  clock: CLOCK,
  light: { 14: "golden" }, sun: { 14: { az: 130, el: 22 } },
  amb: { 1: "field", 2: "field", 3: "field", 4: "field", 5: "field", 6: "field", 7: "field", 8: "field", 9: "field", 10: "field", 11: "field", 12: "field", 13: "field", 14: "none" },
  xfade: { 2: 8, 6: 8, 9: 8, 12: 8, 14: 12 },
  flashes: [F(2)],
  cams, dof,
  kicks: [[2, 0.6], [26, 0.5], [F(5, 0.25), 0.5]],
  events,
  musicStops: [[F(6), F(6, 0.6)]],
  music: { mood: "march", key: 0, tempo: 118 },
});
