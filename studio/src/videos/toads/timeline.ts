// "The Toads That Ate Everything Except Beetles": shots, cameras, lens and sound cues (timing.ts).
import { makeClock, makeTimeline, hold, holdZ, track, add, V3, Key, Dof, SoundEvent, Light } from "../kit/timeline";
import { SENT_MEASURED, SPOKEN_MEASURED } from "./timing";

export const CLOCK = makeClock(SENT_MEASURED, SPOKEN_MEASURED);
export const F = CLOCK.F;

export const FIELD: V3 = [0, 0, 0];          // the cane field (rows along x, from z = 4 onwards); a dirt track at z < 4
export const DOCK: V3 = [-200, 0, 0];        // a steamship from Hawaii, sea from z = 10
export const COURT: V3 = [200, 0, 0];        // a basketball court
export const OUTBACK: V3 = [0, 0, -300];     // red ground the toads spread across

const cams: Record<number, Key[]> = {
  1: [
    { f: 0, s: hold(add(FIELD, -2.0, 0.5, -0.4), add(FIELD, 0.5, 0.35, 2.4), 0, 40, 0.002) },
    { f: F(1, 0.55), cut: true, s: hold(add(FIELD, 1.4, 1.0, 1.0), add(FIELD, 1.0, 2.6, 5), F(1, 0.55), 44, 0.002, 0.04) },
  ],
  2: [
    { f: F(2), s: holdZ(add(FIELD, -30, 14, -26), add(FIELD, 0, 1, 20), F(2), 44, 0.0015) },
    { f: F(2, 0.55), cut: true, s: hold(add(FIELD, -3.5, 1.7, -3.5), add(FIELD, -1.5, 1.6, 0.5), F(2, 0.55), 40, 0.002) },
  ],
  3: [{ f: F(3), s: hold(add(DOCK, -8, 3, -10), add(DOCK, 0, 3, 14), F(3), 44, 0.0018) }],
  4: [{ f: F(4), s: holdZ(add(FIELD, -10, 3.5, -8), add(FIELD, 2, 0, 6), F(4), 46, 0.0016) }],
  5: [{ f: F(5), s: track({ pos: add(FIELD, -1.5, 0.35, 2.2), look: add(FIELD, 0, 0.3, 5), fov: 44 }, { pos: add(FIELD, -1.5, 0.6, 2.2), look: add(FIELD, 0, 3.0, 5), fov: 44 }, F(5, 0.3), F(5, 0.8)) }],
  6: [
    { f: F(6), s: hold(add(FIELD, -1.6, 0.5, 1.6), add(FIELD, 0, 0.3, 4.4), F(6), 40, 0.0025) },
    { f: F(6, 0.5), cut: true, s: hold(add(FIELD, -1.5, 2.6, 1.8), add(FIELD, 0, 2.8, 5.2), F(6, 0.5), 40, 0.0025) },
  ],
  7: [{ f: F(7), s: hold(add(FIELD, -2.4, 0.7, -1.6), add(FIELD, 0, 0.3, 1.2), F(7), 40, 0.0025) }],
  8: [{ f: F(8), s: hold(add(FIELD, -3, 1.4, -3), add(FIELD, 0, 0.2, 1.5), F(8), 44, 0.002) }],
  9: [{ f: F(9), s: holdZ(add(FIELD, -10, 6, -9), add(FIELD, 0, 0, 2), F(9), 50, 0.0018) }],
  10: [{ f: F(10), s: hold(add(FIELD, -1.4, 0.4, 2.0), add(FIELD, 0, 1.6, 5.2), F(10), 46, 0.0022) }],
  11: [{ f: F(11), s: hold(add(COURT, -6, 2.2, -9), add(COURT, 0, 2.6, 0), F(11), 44, 0.002) }],
  12: [{ f: F(12), s: track({ pos: add(OUTBACK, -60, 40, -50), look: add(OUTBACK, 0, 0, 10), fov: 46 }, { pos: add(OUTBACK, -90, 40, -50), look: add(OUTBACK, -30, 0, 10), fov: 46 }, F(12), F(13)) }],
  13: [{ f: F(13), s: hold(add(DOCK, -2.2, 1.5, -2.6), add(DOCK, 0, 0.9, 0.5), F(13), 40, 0.002) }],
};
const dof: Dof[] = [
  { f: 0, cInf: 14 }, { f: F(1, 0.55), cInf: 10 }, { f: F(2), cInf: 0 }, { f: F(2, 0.55), cInf: 9 }, { f: F(3), cInf: 0 }, { f: F(4), cInf: 0 },
  { f: F(5), cInf: 12 }, { f: F(6), cInf: 13 }, { f: F(7), cInf: 13 }, { f: F(8), cInf: 10 }, { f: F(9), cInf: 0 }, { f: F(10), cInf: 12 },
  { f: F(11), cInf: 6 }, { f: F(12), cInf: 0 }, { f: F(13), cInf: 11 },
];
const events: SoundEvent[] = [
  { f: 4, kind: "croak" }, { f: 24, kind: "croak", gain: 0.7 }, { f: F(1, 0.55), kind: "boing", gain: 0.5 },
  { f: F(2, 0.6), kind: "ding", gain: 0.5 },
  { f: F(3), kind: "bell", gain: 0.7 }, { f: F(3, 0.4), kind: "croak", gain: 0.8 }, { f: F(3, 0.6), kind: "croak", gain: 0.6 },
  { f: F(4, 0.4), kind: "croak" }, { f: F(4, 0.5), kind: "croak", gain: 0.7 }, { f: F(4, 0.6), kind: "croak", gain: 0.8 },
  { f: F(5, 0.5), kind: "whistle_down", dur: 0.6, gain: 0.3 },
  { f: F(6, 0.5), kind: "zap", gain: 0.4 },
  { f: F(7, 0.2), kind: "pop" }, { f: F(7, 0.5), kind: "pop" }, { f: F(7, 0.7), kind: "pop" },
  { f: F(8, 0.3), kind: "croak" }, { f: F(9, 0.1), kind: "croak", gain: 1.2 }, { f: F(9, 0.3), kind: "croak", gain: 1.2 }, { f: F(9, 0.5), kind: "croak", gain: 1.2 },
  { f: F(11, 0.4), kind: "boing" }, { f: F(11, 0.6), kind: "cheer", n: 4, gain: 0.5 },
  { f: F(12), kind: "rumble", dur: 3.0, gain: 0.6 }, { f: F(13, 0.3), kind: "croak" },
];
const light: Record<number, Light> = { 6: "golden", 13: "golden" };
export const TL = makeTimeline({
  clock: CLOCK, light, sun: { 6: { az: 150, el: 8 }, 13: { az: 130, el: 18 } },
  amb: { 1: "field", 2: "field", 3: "beach", 4: "field", 5: "field", 6: "night", 7: "field", 8: "field", 9: "field", 10: "field", 11: "room", 12: "field", 13: "beach" },
  xfade: { 2: 8, 3: 10, 4: 10, 11: 10, 12: 10, 13: 12 },
  flashes: [F(2)],
  cams, dof, kicks: [[F(9, 0.1), 0.4]], events,
  musicStops: [[F(9), F(9, 0.5)]],
  music: { mood: "bouncy", key: 4, tempo: 116 },
});
