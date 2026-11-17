// "The Morning Sweden Switched Sides": shots, cameras, lens and sound cues, timed to the narration (timing.ts).
import { makeClock, makeTimeline, hold, holdZ, track, add, V3, Key, Dof, SoundEvent, clamp01, smooth, Light } from "../kit/timeline";
import { SENT_MEASURED, SPOKEN_MEASURED } from "./timing";

export const CLOCK = makeClock(SENT_MEASURED, SPOKEN_MEASURED);
export const F = CLOCK.F;

// ---------------- places ----------------
export const TOWN: V3 = [0, 0, 0];           // a Swedish main street along x; lanes at z = -1.75 / +1.75
export const BORDER: V3 = [200, 0, 0];       // the border: a Swedish car meets a neighbour's car
export const OFFICE: V3 = [-200, 0, 0];      // insurance office
export const ICE: V3 = [0, 0, 400];          // Iceland, a year later
export const LANE = 1.75;

// ---------------- traffic ----------------
/** 0 = everyone on the left, 1 = everyone on the right */
export const sideAt = (id: number, f: number) => (id < 5 || id === 2 ? 0 : id === 5 ? smooth((f - F(5, 0.35)) / (F(5, 0.95) - F(5, 0.35))) : 1);
/** cars move only before the ban and after the switch */
export const flowAt = (id: number, f: number) => (id === 4 ? 0 : id === 5 ? clamp01((f - F(5, 0.9)) / 20) * 0.35 : id === 10 || id === 11 ? 0.45 : 1);

const cams: Record<number, Key[]> = {
  1: [{ f: 0, s: holdZ(add(TOWN, -24, 26, -26), add(TOWN, 0, 0, 0), 0, 44, 0.0016) }],
  2: [{ f: F(2), s: hold(add(BORDER, -10, 1.8, -8), add(BORDER, 0, 1.0, 0), F(2), 44, 0.0018) }],
  3: [{ f: F(3), s: hold(add(TOWN, 8, 2.4, -LANE - 6.5), add(TOWN, 3.6, 1.3, -LANE), F(3), 38, 0.0025) }],
  4: [
    { f: F(4), s: holdZ(add(TOWN, -18, 3, -10), add(TOWN, 0, 1, 0), F(4), 44, 0.0016) },
    { f: F(4, 0.55), cut: true, s: hold(add(TOWN, 4.2, 3.0, -7.5), add(TOWN, 4.2, 3.4, -9.5), F(4, 0.55), 36, 0.002) },
  ],
  5: [
    { f: F(5), s: hold(add(TOWN, -2, 1.3, -5.6), add(TOWN, -1.2, 1.2, -9.2), F(5), 34, 0.003) },
    { f: F(5, 0.3), cut: true, s: holdZ(add(TOWN, -4, 16, -18), add(TOWN, 4, 0, 4), F(5, 0.3), 46, 0.0012) },
  ],
  6: [{ f: F(6), s: hold(add(TOWN, -2, 1.7, -9.5), add(TOWN, 0, 1.7, -6.4), F(6), 40, 0.0025) }],
  7: [{ f: F(7), s: hold(add(TOWN, -12, 2.2, -10), add(TOWN, 0, 1.2, 0), F(7), 42, 0.0018) }],
  8: [{ f: F(8), s: hold(add(TOWN, 8, 1.7, -9.5), add(TOWN, 9, 1.7, -6.0), F(8), 38, 0.0022) }],
  9: [{ f: F(9), s: hold(add(OFFICE, -1.5, 1.8, -5.2), add(OFFICE, 0, 2.2, 2.6), F(9), 40, 0.002) }],
  10: [{ f: F(10), s: hold(add(TOWN, 5.4, 2.4, LANE - 6.4), add(TOWN, 1.8, 1.3, LANE), F(10), 38, 0.003) }],
  11: [{ f: F(11), s: hold(add(TOWN, -22, 2.2, -4.5), add(TOWN, 8, 1.0, 0.5), F(11), 40, 0.0018) }],
  12: [{ f: F(12), s: holdZ(add(ICE, -14, 5, -18), add(ICE, 0, 3, 10), F(12), 44, 0.0015) }],
};

const dof: Dof[] = [
  { f: 0, cInf: 0 }, { f: F(2), cInf: 6 }, { f: F(3), cInf: 12 }, { f: F(4), cInf: 0 }, { f: F(4, 0.55), cInf: 11 },
  { f: F(5), cInf: 13 }, { f: F(5, 0.3), cInf: 0 }, { f: F(6), cInf: 11 }, { f: F(7), cInf: 4 }, { f: F(8), cInf: 11 },
  { f: F(9), cInf: 9 }, { f: F(10), cInf: 13 }, { f: F(11), cInf: 4 }, { f: F(12), cInf: 0 },
];

const events: SoundEvent[] = [
  { f: 4, kind: "engine", dur: 4.0, gain: 0.5 },
  { f: F(2, 0.3), kind: "honk", gain: 1.4 }, { f: F(2, 0.45), kind: "brake" }, { f: F(2, 0.5), kind: "honk", gain: 1.2 },
  { f: F(3, 0.2), kind: "engine", dur: 2.4, gain: 0.5 },
  { f: F(4, 0.6), kind: "bell", gain: 0.7 },
  { f: F(5, 0.02), kind: "beep" }, { f: F(5, 0.1), kind: "beep" }, { f: F(5, 0.18), kind: "beep" }, { f: F(5, 0.26), kind: "ding", gain: 0.9 },
  { f: F(5, 0.4), kind: "engine", dur: 3.0, gain: 0.7 },
  { f: F(6, 0.1), kind: "whoa", n: 3, gain: 0.5 },
  { f: F(7, 0.3), kind: "cheer", n: 4, gain: 0.7 }, { f: F(8, 0.4), kind: "boing", gain: 0.5 },
  { f: F(9, 0.2), kind: "whistle_down", dur: 0.8, gain: 0.5 }, { f: F(9, 0.6), kind: "ding" },
  { f: F(10, 0.3), kind: "engine", dur: 2.4, gain: 0.4 }, { f: F(12, 0.2), kind: "wind_gust", dur: 1.6 }, { f: F(12, 0.5), kind: "honk" },
];

const light: Record<number, Light> = { 4: "golden", 5: "golden", 6: "golden", 12: "golden" };
export const TL = makeTimeline({
  clock: CLOCK, light,
  sun: { 4: { az: 150, el: 6 }, 5: { az: 150, el: 9 }, 6: { az: 150, el: 10 }, 12: { az: 130, el: 18 } },
  amb: { 1: "street", 2: "field", 3: "street", 4: "night", 5: "street", 6: "street", 7: "street", 8: "street", 9: "room", 10: "street", 11: "street", 12: "field" },
  xfade: { 2: 8, 4: 10, 7: 10, 9: 8, 12: 12 },
  flashes: [F(2)],
  cams, dof,
  kicks: [[F(2, 0.45), 0.8]],
  events,
  musicStops: [[F(5), F(5, 0.3)]],
  music: { mood: "bouncy", key: 7, tempo: 108 },
});
