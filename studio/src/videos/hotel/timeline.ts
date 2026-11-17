// "The Hotel That Went Up": shots, cameras, lens and sound cues, timed to the narration (timing.ts).
import { makeClock, makeTimeline, hold, holdZ, add, V3, Key, Dof, SoundEvent, clamp01, smooth } from "../kit/timeline";
import { SENT_MEASURED, SPOKEN_MEASURED } from "./timing";

export const CLOCK = makeClock(SENT_MEASURED, SPOKEN_MEASURED);
export const F = CLOCK.F;

// ---------------- places ----------------
export const HOTEL = { x0: -20, x1: 20, z0: -12, z1: 12, floors: 6, fh: 3.6 };
export const WALK_Y = 0.25;                 // plank sidewalk height
export const DOOR_Y = 1.0;                  // ground-floor threshold above the street (before lifting)
export const RAISE = 1.83;                  // six feet
export const JACKS: V3 = [300, 0, 0];      // the car-jack demo stage
export const TRAIN: V3 = [-300, 0, 0];     // the sleeping car

// ---------------- the lift (metres) ----------------
const turns = [F(6, 0.22), F(6, 0.6), F(6, 0.86)];
export const liftAt = (id: number, f: number) => {
  if (id === 1) return 1.1;
  if (id <= 5) return 0;
  if (id === 6) return turns.reduce((a, t) => a + 0.025 * smooth((f - t) / 8), 0);
  if (id === 7) return 0.075 + 0.8 * clamp01((f - F(7)) / (F(8) - F(7)));
  if (id === 8) return 0.9 + 0.1 * clamp01((f - F(8)) / (F(9) - F(8)));
  if (id === 9) return 1.0 + 0.2 * clamp01((f - F(9)) / (F(10) - F(9)));
  if (id === 11) return 1.3 + 0.4 * clamp01((f - F(11)) / (F(12) - F(11)));
  return RAISE;
};
/** the street is filled in up to the new level by the end */
export const streetAt = (id: number) => (id >= 12 ? RAISE : 0);
export const TURNS = turns;

const cams: Record<number, Key[]> = {
  1: [
    { f: 0, s: holdZ([-15, 1.3, -36], [0, 8, -12], 0, 50, 0.0016) },
    { f: F(1, 0.55), dur: 34, s: hold([5.2, 10.6, -18.5], [6.2, 10.2, -12.3], F(1, 0.55), 36, 0.0022, 0.03) },
  ],
  2: [{ f: F(2), s: hold([-78, 2.4, -40], [-66, 0.4, -23], F(2), 42, 0.0018, -0.03) }],
  3: [{ f: F(3), s: holdZ([-6, 30, -72], [0, 10, -12], F(3), 40, 0.0016) }],
  4: [
    { f: F(4), s: hold([-4, 1.75, -21.5], [-2.2, 1.55, -14.6], F(4), 40, 0.002) },
    { f: F(4, 0.5), dur: 24, s: hold([-3.2, 1.8, -18.4], [-2.8, 1.7, -14.6], F(4, 0.5), 36, 0.0022, 0.035) },
  ],
  5: [
    { f: F(5), s: hold([-9, 0.7, -18.5], [0, 0.45, -12.4], F(5), 40, 0.002) },
    { f: F(5, 0.5), dur: 30, s: hold([-17, 1.6, -26], [-2, 0.9, -13], F(5, 0.5), 42, 0.0015) },
  ],
  6: [
    { f: F(6), s: hold([4.3, 1.75, -18.6], [5.2, 1.7, -14.4], F(6), 34, 0.0025) },
    { f: F(6, 0.18), cut: true, s: hold([-10, 1.3, -20.5], [0, 0.6, -12.6], F(6, 0.18), 40, 0.0018, 0.03) },
  ],
  7: [{ f: F(7), s: holdZ([-10, 1.5, -40], [0, 7, -12], F(7), 46, 0.0016) }],
  8: [{ f: F(8), s: hold([3.5, 9.6, -25], [3.5, 10.6, -12.4], F(8), 48, 0.002) }],
  9: [{ f: F(9), s: hold([-4.2, 1.3, -18.4], [0, 1.6, -12.5], F(9), 40, 0.0022, -0.03) }],
  10: [{ f: F(10), s: hold(add(JACKS, -4.6, 1.1, -5.6), add(JACKS, 0, 0.6, -0.4), F(10), 40, 0.0022) }],
  11: [{ f: F(11), s: holdZ([-27, 2.6, -36], [0, 2.4, -12], F(11), 40, 0.0016) }],
  12: [{ f: F(12), s: hold([-12, 4.0, -30], [0, 4.6, -12], F(12), 44, 0.0018) }],
  13: [{ f: F(13), s: hold([-2.4, 3.95, -18.7], [-2.2, 3.85, -14.6], F(13), 36, 0.0025) }],
  14: [
    { f: F(14), s: holdZ(add(TRAIN, -14, 3, -22), add(TRAIN, 0, 2.2, 0), F(14), 40, 0.0016) },
    { f: F(14, 0.45), dur: 36, s: hold(add(TRAIN, 1.5, 2.6, -5.5), add(TRAIN, 2.2, 2.5, -1.6), F(14, 0.45), 36, 0.002) },
  ],
};

const dof: Dof[] = [
  { f: 0, cInf: 0 }, { f: F(1, 0.55), dur: 34, cInf: 12 },
  { f: F(2), cInf: 0 }, { f: F(3), cInf: 0 },
  { f: F(4), cInf: 10 }, { f: F(5), cInf: 8 }, { f: F(5, 0.5), dur: 30, cInf: 0 },
  { f: F(6), cInf: 13 }, { f: F(6, 0.18), cInf: 6 },
  { f: F(7), cInf: 0 }, { f: F(8), cInf: 8 }, { f: F(9), cInf: 10 }, { f: F(10), cInf: 10 },
  { f: F(11), cInf: 0 }, { f: F(12), cInf: 6 }, { f: F(13), cInf: 13 }, { f: F(14), cInf: 0 }, { f: F(14, 0.45), dur: 36, cInf: 10 },
];

const events: SoundEvent[] = [
  { f: 4, kind: "rumble", dur: 4.0, gain: 0.5 },
  { f: F(2, 0.3), kind: "splat", gain: 0.8 }, { f: F(2, 0.5), kind: "splat", gain: 0.6 },
  { f: F(4, 0.55), kind: "ding", gain: 0.5 },
  { f: F(5, 0.2), kind: "clank" }, { f: F(5, 0.45), kind: "clank", gain: 0.7 },
  { f: F(6, 0.05), kind: "beep", gain: 2.0 },
  ...turns.map((f) => ({ f, kind: "ratchet" as const, n: 8 })),
  { f: F(7), kind: "rumble", dur: 2.4 },
  { f: F(9, 0.4), kind: "boing", gain: 0.6 },
  { f: F(10, 0.15), kind: "ratchet", n: 14 },
  { f: F(11), kind: "rumble", dur: 4.0, gain: 0.7 },
  { f: F(12, 0.45), kind: "cheer", n: 6 },
  { f: F(12, 0.75), kind: "ding", gain: 0.7 },
  { f: F(14), kind: "bell", gain: 0.7 }, { f: F(14, 0.2), kind: "clank", gain: 0.5 },
];

export const TL = makeTimeline({
  clock: CLOCK,
  light: { 14: "golden" }, sun: { 14: { az: 120, el: 18 }, 10: { az: 60, el: 50 } },
  amb: { 1: "street", 2: "field", 3: "street", 4: "street", 5: "street", 6: "street", 7: "street", 8: "street", 9: "street", 10: "room", 11: "street", 12: "street", 13: "street", 14: "field" },
  xfade: { 2: 8, 3: 8, 10: 10, 11: 10, 14: 12 },
  flashes: [F(2)],
  cams, dof,
  kicks: [[F(12, 0.0), 0.5]],
  events,
  music: { mood: "bouncy", key: 0, tempo: 112 },
});
