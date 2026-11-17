// "The Building That Melted a Car": shots, cameras, lens and sound cues, timed to the narration (timing.ts).
import { makeClock, makeTimeline, hold, holdZ, track, add, V3, Key, Dof, SoundEvent } from "../kit/timeline";
import { SENT_MEASURED, SPOKEN_MEASURED } from "./timing";

export const CLOCK = makeClock(SENT_MEASURED, SPOKEN_MEASURED);
export const F = CLOCK.F;

// ---------------- places ----------------
export const TOWER_H = 150;
export const CAR_AT: V3 = [0, 0, -42.5];          // Martin's car, in the parking bay the beam hits
export const SPOT: V3 = [0, 0.03, -42.5];          // centre of the hot spot
export const SHOP: V3 = [-9, 0, -56];               // shop front (faces +z)
export const EGG: V3 = [0.7, 0.15, -45.2];
export const DIAG: V3 = [400, 0, 0];               // the light-ray diagram stage
export const PODIUM: V3 = [-1.5, 0.12, -47.5];

// ---------------- story events ----------------
export const ARRIVE0 = F(3, 0.0), ARRIVE1 = F(3, 0.45);   // car drives in
export const LEAVE = F(3, 0.75);                          // Martin walks off
export const CAR2_0 = F(8, 0.0), CAR2_1 = F(8, 0.6);      // second car parks in the spot
export const FOCUS_HIT = F(10, 0.55);                     // the curved panel's rays meet on the toy car
export const FINS = F(12, 0.45);                          // sunshade appears
/** car x while driving in from the left (shot 3) and the second car (shot 8) */
export const driveX = (f: number, f0: number, f1: number) => { const u = Math.max(0, Math.min(1, (f - f0) / Math.max(1, f1 - f0))); return -26 * (1 - (1 - (1 - u) ** 3)); };

const cams: Record<number, Key[]> = {
  1: [
    { f: 0, s: holdZ([-3.5, 1.1, -51], [0, 5.5, -30], 0, 56, 0.0015) },
    { f: F(1, 0.55), dur: 34, s: hold([-1.2, 1.35, -46.4], [0.95, 1.12, -43.5], F(1, 0.55), 34, 0.0025, 0.04) },
  ],
  2: [
    { f: F(2), s: holdZ([70, 45, -130], [0, 72, -14], F(2), 40, 0.0016) },
    { f: F(2, 0.55), cut: true, s: hold([6, 1.5, -36], [0, 60, -16], F(2, 0.55), 62, 0.0012, -0.04) },
  ],
  3: [{ f: F(3), s: hold([-12, 1.6, -52], [-3, 1.1, -42.5], F(3), 40, 0.0018) }],
  4: [
    { f: F(4), s: hold([-3, 1.5, -51], [0, 1.2, -43], F(4), 40, 0.002) },
    { f: F(4, 0.3), cut: true, s: hold([0.15, 1.38, -45.6], [0.95, 1.05, -43.5], F(4, 0.3), 30, 0.003) },
    { f: F(4, 0.52), cut: true, s: hold([3.9, 1.55, -44.6], [2.05, 0.95, -42.5], F(4, 0.52), 30, 0.003, 0.04) },
    { f: F(4, 0.74), cut: true, s: hold([-1.6, 1.15, -48.4], [-0.2, 0.75, -43.4], F(4, 0.74), 38, 0.0025, -0.03) },
  ],
  5: [{ f: F(5), s: hold([-6.0, 2.2, -44.0], [-9, 3.0, -56], F(5), 48, 0.0022) }],
  6: [
    { f: F(6), s: hold([0.4, 1.7, -38.6], [1.6, 1.1, -45.8], F(6), 40, 0.0018) },
    { f: F(6, 0.55), cut: true, s: hold([0.2, 1.05, -43.5], EGG, F(6, 0.55), 32, 0.003) },
  ],
  7: [{ f: F(7), s: holdZ([-22, 9, -27], [0, 0, -43], F(7), 40, 0.0016) }],
  8: [{ f: F(8), s: hold([-13, 1.7, -51.5], [-2, 1.0, -42.5], F(8), 40, 0.002, 0.03) }],
  9: [{ f: F(9), s: hold(add(DIAG, 21, 5, -15), add(DIAG, 0, 4.0, -7.5), F(9), 44, 0.0012) }],
  10: [
    { f: F(10), s: hold(add(DIAG, 20, 4.5, 21), add(DIAG, 0, 3.2, 31), F(10), 44, 0.0012) },
    { f: FOCUS_HIT - 10, dur: 22, s: hold(add(DIAG, 6, 2.0, 22.5), add(DIAG, 0, 0.6, 26.5), FOCUS_HIT, 36, 0.002, 0.04) },
  ],
  11: [
    { f: F(11), s: hold([-2.5, 23.6, -25], [0, 23.4, -12.5], F(11), 38, 0.0022) },
    { f: F(11, 0.55), dur: 30, s: holdZ([-30, 3, -95], [0, 40, -15], F(11, 0.55), 44, 0.0012) },
  ],
  12: [
    { f: F(12), s: hold([-8.5, 1.6, -51.5], [0, 2.5, -40], F(12), 42, 0.0018) },
    { f: F(12, 0.45), dur: 40, s: holdZ([-8.5, 1.6, -51.5], [0, 34, -18], F(12, 0.45), 46, 0.0012) },
  ],
  13: [
    { f: F(13), s: hold([-6.5, 1.5, -54], [-1.2, 1.5, -46.2], F(13), 40, 0.0018) },
    { f: F(13, 0.5), dur: 44, s: track({ pos: [-6.5, 1.5, -54], look: [-1.2, 1.5, -46.2], fov: 40 }, { pos: [-8.5, 2.2, -54.5], look: [0, 30, -20], fov: 54 }, F(13, 0.5), F(13, 1.0)) },
  ],
};

const dof: Dof[] = [
  { f: 0, cInf: 8 }, { f: F(1, 0.55), dur: 34, cInf: 13 },
  { f: F(2), cInf: 0 },
  { f: F(3), cInf: 6 },
  { f: F(4), cInf: 8 }, { f: F(4, 0.3), cInf: 14 },
  { f: F(5), cInf: 10 },
  { f: F(6), cInf: 9 }, { f: F(6, 0.55), cInf: 14 },
  { f: F(7), cInf: 0 },
  { f: F(8), cInf: 6 },
  { f: F(9), cInf: 0 },
  { f: F(11), cInf: 9 }, { f: F(11, 0.55), dur: 30, cInf: 0 },
  { f: F(12), cInf: 8 }, { f: F(12, 0.45), dur: 40, cInf: 0 },
  { f: F(13), cInf: 10 }, { f: F(13, 0.5), dur: 44, cInf: 0 },
];

const events: SoundEvent[] = [
  { f: 2, kind: "sizzle", dur: 4.0, gain: 0.8 },
  { f: F(2, 0.55), kind: "whistle_down", dur: 0.5, gain: 0.3 },
  { f: ARRIVE0, kind: "engine", dur: (ARRIVE1 - ARRIVE0) / 30 + 0.4 },
  { f: ARRIVE1 - 6, kind: "brake" },
  { f: ARRIVE1 + 20, kind: "click", gain: 0.8 },
  { f: F(4, 0.18), kind: "whoa", n: 1 },
  { f: F(4, 0.3), kind: "drip" }, { f: F(4, 0.4), kind: "drip" }, { f: F(4, 0.52), kind: "drip" }, { f: F(4, 0.74), kind: "sizzle", dur: 1.4 },
  { f: F(5), kind: "sizzle", dur: 3.5, gain: 0.6 },
  { f: F(6, 0.55), kind: "sizzle", dur: 2.6, gain: 1.2 },
  { f: F(6, 0.2), kind: "click", gain: 0.6 },
  { f: CAR2_0, kind: "engine", dur: (CAR2_1 - CAR2_0) / 30 + 0.4 },
  { f: CAR2_1 - 6, kind: "brake" }, { f: CAR2_1 + 12, kind: "sizzle", dur: 1.5 },
  { f: FOCUS_HIT, kind: "zap" }, { f: FOCUS_HIT + 3, kind: "pop" },
  { f: F(12, 0.1), kind: "clank", gain: 0.6 }, { f: F(12, 0.55), kind: "ratchet", n: 12 },
  { f: F(13, 0.05), kind: "fanfare", gain: 0.6 }, { f: F(13, 0.4), kind: "murmur", dur: 2.0 },
];

export const TL = makeTimeline({
  clock: CLOCK,
  light: { 13: "golden" }, sun: { 13: { az: 140, el: 22 }, 9: { az: 60, el: 55 }, 10: { az: 60, el: 55 } },
  amb: { 1: "city", 2: "city", 3: "city", 4: "street", 5: "street", 6: "street", 7: "city", 8: "street", 9: "field", 10: "field", 11: "city", 12: "street", 13: "street" },
  xfade: { 2: 8, 5: 8, 9: 10, 11: 10, 13: 10 },
  flashes: [F(2)],
  cams, dof,
  kicks: [[F(10, 0.55), 0.9]],
  events,
  musicStops: [[F(4, 0.28), F(4, 0.9)]],
  music: { mood: "sneaky", key: 2, tempo: 108 },
});
