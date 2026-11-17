// "The Letter That Came by Missile": shots, cameras, lens and sound cues, timed to the narration (timing.ts).
import { makeClock, makeTimeline, hold, holdZ, add, V3, Key, Dof, SoundEvent, clamp01, easeOut } from "../kit/timeline";
import { SENT_MEASURED, SPOKEN_MEASURED } from "./timing";

export const CLOCK = makeClock(SENT_MEASURED, SPOKEN_MEASURED);
export const F = CLOCK.F;

// ---------------- places (sea everywhere from z = -100; land is built above it) ----------------
export const SUB: V3 = [0, 0, 60];
export const RUNWAY: V3 = [0, 0, -140];      // Mayport air station, coast at z = -100
export const POST: V3 = [300, 0, -300];      // a post office
export const ROAD: V3 = [-300, 0, -300];     // a road for the mail truck and the delivery missile
export const HOUSE: V3 = [0, 0, -500];       // a house with a mailbox
export const MUSEUM: V3 = [300, 0, -600];

// ---------------- the flight (shot 5, and the hook) ----------------
export const LAUNCH = F(5, 0.08), LAND = F(5, 0.85);
/** missile position: on its launcher until LAUNCH, then out over the sea and down onto the runway */
export const missileAt = (id: number, f: number): { p: V3; pitch: number } => {
  if (id === 1) { const u = (f / 30) * 0.08; return { p: [-20 + 60 * u, 30, 0], pitch: 0 }; }
  if (id !== 5 || f < LAUNCH) return { p: add(SUB, 0, 3.1, -1), pitch: 0.18 };
  const u = clamp01((f - LAUNCH) / (LAND - LAUNCH));
  const z = SUB[2] - 1 + (RUNWAY[2] - SUB[2] + 1) * u, y = 3.1 + 40 * Math.sin(Math.PI * Math.min(1, u * 1.05)) * (u < 0.9 ? 1 : (1 - u) * 10) * 0.9;
  return { p: [0, Math.max(0.6, y), z], pitch: u < 0.2 ? 0.4 : u > 0.8 ? -0.12 : 0 };
};
export const truckX = (f: number) => -40 + 60 * clamp01((f - F(9)) / (F(10) - F(9)));
export const vanAt = (f: number) => easeOut((f - F(10, 0.35)) / 26);

const chase = (dx: number, dy: number, dz: number, fov = 46) => (f: number) => { const m = missileAt(5, f).p; return { pos: add(m, dx, dy, dz), look: add(m, 0, 0, -6), fov }; };
const cams: Record<number, Key[]> = {
  1: [{ f: 0, s: (f: number) => { const m = missileAt(1, f).p; return { pos: add(m, -7, 2, -10), look: add(m, 2, 0, 0), fov: 44, roll: 0.05 }; } }],
  2: [
    { f: F(2), s: hold(add(POST, -3.2, 1.7, -6.4), add(POST, 0, 1.6, 0.6), F(2), 42, 0.002) },
    { f: F(2, 0.5), cut: true, s: holdZ(add(SUB, -24, 6, -26), add(SUB, 0, 2, 0), F(2, 0.5), 40, 0.0016) },
  ],
  3: [{ f: F(3), s: hold(add(SUB, -7, 4.2, -9), add(SUB, 0, 3.2, -1), F(3), 42, 0.002) }],
  4: [{ f: F(4), s: hold(add(SUB, 4.2, 4.4, -8.8), add(SUB, 0.6, 3.3, -4.6), F(4), 40, 0.0025) }],
  5: [
    { f: F(5), s: hold(add(SUB, -14, 3, -16), add(SUB, 0, 5, -3), F(5), 46, 0.0012) },
    { f: LAUNCH + 20, cut: true, s: chase(-8, 3, 12) },
    { f: F(5, 0.6), cut: true, s: holdZ(add(RUNWAY, -30, 4, -24), add(RUNWAY, 0, 3, 10), F(5, 0.6), 40, 0.0012) },
  ],
  6: [{ f: F(6), s: hold(add(RUNWAY, -4, 1.8, -12), add(RUNWAY, -1.5, 1.8, -6), F(6), 40, 0.0022) }],
  7: [{ f: F(7), s: hold(add(RUNWAY, 6, 1.6, -9), add(RUNWAY, 2, 1.2, -2), F(7), 42, 0.002) }],
  8: [{ f: F(8), s: hold(add(HOUSE, 3.5, 2.4, -14), add(HOUSE, 0.6, 1.8, 0), F(8), 40, 0.002, 0.03) }],
  9: [{ f: F(9), s: (f: number) => ({ pos: add(ROAD, truckX(f) - 6, 2.4, -9), look: add(ROAD, truckX(f) + 2, 1.5, 0), fov: 44, roll: 0 }) }],
  10: [{ f: F(10), s: hold(add(ROAD, 30, 2.5, -14), add(ROAD, 34, 7, 10), F(10), 48, 0.0018) }],
  11: [{ f: F(11), s: hold(add(MUSEUM, -6, 2, -9), add(MUSEUM, 0, 2.2, 0), F(11), 42, 0.002) }],
  12: [{ f: F(12), s: hold(add(MUSEUM, 1.6, 1.8, -7.5), add(MUSEUM, 1.2, 1.7, 0), F(12), 40, 0.0022) }],
};
const dof: Dof[] = [
  { f: 0, cInf: 0 }, { f: F(2), cInf: 9 }, { f: F(2, 0.5), cInf: 0 }, { f: F(3), cInf: 6 }, { f: F(4), cInf: 12 }, { f: F(5), cInf: 0 },
  { f: F(6), cInf: 10 }, { f: F(7), cInf: 7 }, { f: F(8), cInf: 8 }, { f: F(9), cInf: 0 }, { f: F(11), cInf: 9 }, { f: F(12), cInf: 13 },
];
const events: SoundEvent[] = [
  { f: 0, kind: "jet", dur: 3.0, gain: 0.8 },
  { f: F(2, 0.15), kind: "stamp" }, { f: F(2, 0.3), kind: "stamp" }, { f: F(2, 0.55), kind: "bell", gain: 0.5 },
  { f: F(3, 0.3), kind: "clank" }, { f: F(3, 0.6), kind: "ratchet", n: 10 },
  { f: F(4, 0.2), kind: "pop" }, { f: F(4, 0.5), kind: "pop" }, { f: F(4, 0.8), kind: "clank", gain: 0.7 },
  { f: F(5, 0.02), kind: "beep" }, { f: LAUNCH, kind: "boom", gain: 0.8 }, { f: LAUNCH + 4, kind: "jet", dur: 4.0 },
  { f: LAND, kind: "thud", gain: 1.4 }, { f: LAND + 4, kind: "brake" },
  { f: F(6, 0.2), kind: "fanfare", gain: 0.7 }, { f: F(6, 0.6), kind: "applause", dur: 2.0 },
  { f: F(7, 0.3), kind: "cheer", n: 4, gain: 0.6 }, { f: F(8, 0.3), kind: "whistle_down", dur: 0.7, gain: 0.4 }, { f: F(8, 0.7), kind: "thud" },
  { f: F(9), kind: "engine", dur: 3.5 }, { f: F(10, 0.35), kind: "jet", dur: 1.4 }, { f: F(10, 0.65), kind: "boom", gain: 0.5 },
  { f: F(11, 0.3), kind: "ding", gain: 0.6 }, { f: F(12, 0.4), kind: "bell", gain: 0.5 },
];
export const TL = makeTimeline({
  clock: CLOCK,
  light: { 11: "golden", 12: "golden" }, sun: { 11: { az: 120, el: 20 }, 12: { az: 120, el: 20 } },
  amb: { 1: "beach", 2: "room", 3: "beach", 4: "beach", 5: "beach", 6: "beach", 7: "beach", 8: "street", 9: "street", 10: "field", 11: "room", 12: "room" },
  xfade: { 2: 8, 3: 8, 6: 8, 8: 10, 9: 8, 11: 12 },
  flashes: [F(2)],
  cams, dof, kicks: [[LAUNCH, 1.6], [LAND, 1.2], [F(10, 0.65), 0.8]], events,
  musicStops: [[F(5, 0.05), F(5, 0.2)]],
  music: { mood: "march", key: 3, tempo: 112 },
});
