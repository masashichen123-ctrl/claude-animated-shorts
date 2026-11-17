// "The Smell That Fixed London": shots, cameras, lens and sound cues, timed to the narration (timing.ts).
import { makeClock, makeTimeline, hold, holdZ, track, add, V3, Key, Dof, SoundEvent, Light } from "../kit/timeline";
import { SENT_MEASURED, SPOKEN_MEASURED } from "./timing";

export const CLOCK = makeClock(SENT_MEASURED, SPOKEN_MEASURED);
export const F = CLOCK.F;

// river from z = -80 to 8, embankment at z = 8..10, Parliament from z = 12
export const RIVER: V3 = [0, 0, 0];
export const PARL: V3 = [0, 0, 12];
export const CHAMBER: V3 = [300, 0, 0];
export const STREET: V3 = [-300, 0, 0];
export const OFFICE: V3 = [-300, 0, -200];
export const TUNNEL: V3 = [0, 0, -300];
export const BATH: V3 = [300, 0, -300];

const cams: Record<number, Key[]> = {
  1: [{ f: 0, s: holdZ(add(PARL, -50, 6, -60), add(PARL, 0, 14, 10), 0, 44, 0.0015) }],
  2: [{ f: F(2), s: hold(add(RIVER, -40, 3, -14), add(RIVER, -40, 2, 8), F(2), 44, 0.0018) }],
  3: [{ f: F(3), s: holdZ(add(RIVER, 10, 6, -40), add(RIVER, 0, 0, -10), F(3), 44, 0.0016) }],
  4: [{ f: F(4), s: holdZ(add(PARL, 40, 4, -50), add(PARL, 0, 14, 12), F(4), 40, 0.0016) }],
  5: [{ f: F(5), s: hold(add(CHAMBER, -3, 1.8, -5), add(CHAMBER, 0, 1.8, 2.4), F(5), 42, 0.002) }],
  6: [{ f: F(6), s: hold(add(CHAMBER, 1.5, 1.7, -2.4), add(CHAMBER, 1.0, 1.7, 0.5), F(6), 36, 0.004, 0.04) }],
  7: [{ f: F(7), s: hold(add(CHAMBER, 0, 4.2, -15), add(CHAMBER, 0, 1.0, -1.5), F(7), 48, 0.0018) }],
  8: [{ f: F(8), s: hold(add(CHAMBER, 0.1, 1.7, -3.4), add(CHAMBER, 0.1, 1.4, 1.2), F(8), 40, 0.0025) }],
  9: [{ f: F(9), s: hold(add(CHAMBER, -1.4, 1.75, -4.2), add(CHAMBER, -0.6, 1.7, -0.6), F(9), 40, 0.0025) }],
  10: [{ f: F(10), s: track({ pos: add(STREET, -12, 2.4, -10), look: add(STREET, -4, 1.4, 2), fov: 44 }, { pos: add(STREET, 4, 2.4, -10), look: add(STREET, 12, 1.4, 2), fov: 44 }, F(10), F(11)) }],
  11: [{ f: F(11), s: hold(add(STREET, -6, 1.8, -8), add(STREET, 0, 1.5, 0), F(11), 44, 0.0018) }],
  12: [{ f: F(12), s: hold(add(OFFICE, -2.5, 1.8, -6), add(OFFICE, 0, 1.6, 0.5), F(12), 44, 0.002) }],
  13: [{ f: F(13), s: track({ pos: add(TUNNEL, 0, 2.2, -20), look: add(TUNNEL, 0, 2.2, 10), fov: 50 }, { pos: add(TUNNEL, 0, 2.2, -4), look: add(TUNNEL, 0, 2.0, 20), fov: 50 }, F(13), F(14)) }],
  14: [
    { f: F(14), s: hold(add(BATH, -1.6, 1.4, -3), add(BATH, 0, 0.8, 0.4), F(14), 40, 0.0025) },
    { f: F(14, 0.5), dur: 30, s: hold(add(TUNNEL, 1.5, 1.6, 6), add(TUNNEL, 0, 1.8, 20), F(14, 0.5), 46, 0.0015) },
  ],
};
const dof: Dof[] = [
  { f: 0, cInf: 0 }, { f: F(2), cInf: 4 }, { f: F(3), cInf: 0 }, { f: F(5), cInf: 9 }, { f: F(6), cInf: 13 }, { f: F(7), cInf: 4 },
  { f: F(8), cInf: 12 }, { f: F(9), cInf: 12 }, { f: F(10), cInf: 4 }, { f: F(11), cInf: 7 }, { f: F(12), cInf: 9 }, { f: F(13), cInf: 0 },
  { f: F(14), cInf: 11 }, { f: F(14, 0.5), dur: 30, cInf: 0 },
];
const events: SoundEvent[] = [
  { f: 6, kind: "bell", gain: 0.7 }, { f: 30, kind: "murmur", dur: 2.0 },
  { f: F(2, 0.3), kind: "flush" }, { f: F(2, 0.6), kind: "drip" },
  { f: F(3, 0.3), kind: "sizzle", dur: 2.0, gain: 0.4 },
  { f: F(4, 0.4), kind: "bell", gain: 0.6 },
  { f: F(5, 0.3), kind: "splash", gain: 0.4 }, { f: F(5, 0.6), kind: "drip" },
  { f: F(6, 0.1), kind: "oof", n: 3, gain: 0.7 },
  { f: F(7, 0.1), kind: "murmur", dur: 2.0, gain: 1.2 },
  { f: F(8, 0.3), kind: "stamp", gain: 1.2 }, { f: F(8, 0.6), kind: "cheer", n: 4, gain: 0.6 },
  { f: F(9, 0.4), kind: "oof", n: 1 }, { f: F(10, 0.3), kind: "murmur", dur: 2.0 },
  { f: F(11, 0.4), kind: "oof", n: 3, gain: 0.5 }, { f: F(12, 0.3), kind: "whoa", n: 1 }, { f: F(12, 0.5), kind: "ratchet", n: 6 },
  { f: F(13, 0.2), kind: "clank" }, { f: F(13, 0.6), kind: "clank", gain: 0.7 },
  { f: F(14, 0.2), kind: "flush", gain: 1.2 },
];
const light: Record<number, Light> = { 3: "golden", 14: "golden" };
export const TL = makeTimeline({
  clock: CLOCK, light, sun: { 3: { az: 140, el: 30 }, 14: { az: 120, el: 20 } },
  amb: { 1: "river", 2: "river", 3: "river", 4: "river", 5: "room", 6: "room", 7: "room", 8: "room", 9: "room", 10: "street", 11: "street", 12: "room", 13: "room", 14: "room" },
  xfade: { 2: 8, 5: 10, 10: 10, 12: 8, 13: 10, 14: 10 },
  flashes: [F(2)],
  cams, dof, kicks: [[F(8, 0.3), 0.7]], events,
  musicStops: [[F(6), F(7)]],
  music: { mood: "sneaky", key: 5, tempo: 100 },
});
