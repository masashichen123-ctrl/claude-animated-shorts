// "The Leaning Tower Is Also Bent": shots, cameras, lens and sound cues, timed to the narration (timing.ts).
import { makeClock, makeTimeline, hold, holdZ, add, V3, Key, Dof, SoundEvent, clamp01, smooth } from "../kit/timeline";
import { SENT_MEASURED, SPOKEN_MEASURED } from "./timing";

export const CLOCK = makeClock(SENT_MEASURED, SPOKEN_MEASURED);
export const F = CLOCK.F;

export const TOWER: V3 = [0, 0, 0];
export const TABLE: V3 = [0, 0, -300];       // the wonky table with books
export const LEVELS = 8;                       // base, six arcades, belfry
/** how many storeys exist in shot id at frame f (construction progress) */
export const builtAt = (id: number, f: number) => {
  if (id === 2) return 1 + Math.floor(2 * clamp01((f - F(2)) / (F(3) - F(2))));
  if (id >= 3 && id <= 6) return 3;
  if (id === 7) return 3 + Math.floor(4 * clamp01((f - F(7, 0.2)) / (F(8) - F(7, 0.2))));
  if (id === 9 || id === 10) return 7;
  if (id === 11) return 7 + (f > F(11, 0.5) ? 1 : 0);
  return LEVELS;
};
/** lean of the base (degrees): sinks in shot 3, holds during the war, sinks more as building resumes */
export const leanAt = (id: number, f: number) => {
  if (id === 2) return 0;
  if (id === 3) return 3 * smooth((f - F(3, 0.3)) / (F(4) - F(3, 0.3)));
  if (id >= 4 && id <= 6) return 3.2;
  if (id === 7) return 3.6;
  if (id === 9) return 3.6 + 2.4 * smooth((f - F(9)) / (F(10) - F(9)));
  return 6.0;
};
/** each upper storey is tilted back toward vertical by this much relative to the one below (degrees) */
export const CORRECT = [0, 0, 0, -1.0, -1.1, -1.2, -1.2, -1.5];

const cams: Record<number, Key[]> = {
  1: [{ f: 0, s: holdZ(add(TOWER, -40, 8, -70), add(TOWER, 3, 28, 0), 0, 44, 0.0015) }],
  2: [{ f: F(2), s: hold(add(TOWER, -18, 4, -34), add(TOWER, 0, 4, 0), F(2), 44, 0.0018) }],
  3: [{ f: F(3), s: hold(add(TOWER, -16, 1.4, -28), add(TOWER, 0, 6, 0), F(3), 46, 0.0018, 0.03) }],
  4: [{ f: F(4), s: hold(add(TOWER, -22, 2.2, -36), add(TOWER, -2, 3, -6), F(4), 44, 0.0016) }],
  5: [{ f: F(5), s: hold(add(TOWER, -3.5, 1.0, -17.5), add(TOWER, -1.2, 1.0, -11.5), F(5), 42, 0.002) }],
  6: [{ f: F(6), s: hold(add(TOWER, -10, 1.7, -24), add(TOWER, -2, 2.2, -12), F(6), 42, 0.002) }],
  7: [{ f: F(7), s: holdZ(add(TOWER, -36, 12, -54), add(TOWER, 2, 24, 0), F(7), 44, 0.0014) }],
  8: [{ f: F(8), s: hold(add(TABLE, -0.9, 1.3, -2.1), add(TABLE, 0, 1.15, 0), F(8), 40, 0.0025) }],
  9: [{ f: F(9), s: hold(add(TOWER, -12, 0.8, -26), add(TOWER, 0, 4, 0), F(9), 44, 0.002) }],
  10: [{ f: F(10), s: holdZ(add(TOWER, -60, 28, -10), add(TOWER, 3, 28, 0), F(10), 40, 0.0014) }],
  11: [{ f: F(11), s: hold(add(TOWER, -14, 2, -30), add(TOWER, 0, 3, -10), F(11), 44, 0.002) }],
  12: [
    { f: F(12), s: hold(add(TOWER, -5.5, 1.6, -36), add(TOWER, -3.5, 1.7, -30), F(12), 40, 0.002) },
    { f: F(12, 0.5), dur: 44, s: holdZ(add(TOWER, -6.5, 1.4, -40), add(TOWER, 2, 28, 0), F(12, 0.5), 54, 0.0012) },
  ],
};
const dof: Dof[] = [
  { f: 0, cInf: 0 }, { f: F(2), cInf: 0 }, { f: F(4), cInf: 6 }, { f: F(5), cInf: 9 }, { f: F(6), cInf: 10 }, { f: F(7), cInf: 0 },
  { f: F(8), cInf: 13 }, { f: F(9), cInf: 0 }, { f: F(11), cInf: 8 }, { f: F(12), cInf: 10 }, { f: F(12, 0.5), dur: 44, cInf: 0 },
];
const events: SoundEvent[] = [
  { f: 6, kind: "boing", gain: 0.5 },
  { f: F(2, 0.2), kind: "stamp" }, { f: F(2, 0.6), kind: "stamp" },
  { f: F(3, 0.35), kind: "rumble", dur: 2.0 }, { f: F(3, 0.5), kind: "whoa", n: 3, gain: 0.5 },
  { f: F(4, 0.1), kind: "fanfare", gain: 0.5 }, { f: F(4, 0.4), kind: "clank", gain: 0.6 },
  { f: F(5, 0.3), kind: "drip" }, { f: F(5, 0.5), kind: "drip" },
  { f: F(7, 0.2), kind: "stamp" }, { f: F(7, 0.45), kind: "stamp" }, { f: F(7, 0.7), kind: "stamp" },
  { f: F(8, 0.6), kind: "click" }, { f: F(9, 0.2), kind: "rumble", dur: 1.6 }, { f: F(10, 0.3), kind: "boing", gain: 0.5 },
  { f: F(11, 0.5), kind: "bell", gain: 0.8 }, { f: F(12, 0.2), kind: "laugh", n: 3, gain: 0.5 },
];
export const TL = makeTimeline({
  clock: CLOCK,
  light: { 12: "golden", 4: "golden" }, sun: { 12: { az: 130, el: 20 }, 4: { az: 140, el: 14 } },
  amb: "field",
  xfade: { 2: 8, 4: 10, 5: 8, 8: 10, 9: 10, 11: 8, 12: 12 },
  flashes: [F(2)],
  cams, dof, kicks: [[F(3, 0.4), 0.6], [F(9, 0.3), 0.6]], events,
  musicStops: [[F(4), F(5)]],
  music: { mood: "grand", key: 2, tempo: 96 },
});
