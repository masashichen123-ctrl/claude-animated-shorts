// "The Day Pepsi Got Warships": shots, cameras, lens and sound cues, timed to the narration (timing.ts).
import { makeClock, makeTimeline, hold, holdZ, track, add, V3, Key, Dof, SoundEvent } from "../kit/timeline";
import { SENT_MEASURED, SPOKEN_MEASURED } from "./timing";

export const CLOCK = makeClock(SENT_MEASURED, SPOKEN_MEASURED);
export const F = CLOCK.F;

// ---------------- places ----------------
export const SQUARE: V3 = [0, 0, 0];        // a Moscow square with a cola kiosk
export const BORDER: V3 = [120, 0, 0];      // a border barrier
export const DOCK: V3 = [-120, 0, 0];       // a harbour: vodka crates, then the fleet (sea from z = 12)
export const BOARDRM: V3 = [0, 0, -200];    // a company boardroom
export const SCRAP: V3 = [250, 0, 0];       // the scrapyard
export const WHITE: V3 = [0, 0, 220];       // the White House lawn
export const OFFICE: V3 = [-250, 0, 0];     // an office inside
export const SHOP: V3 = [0, 0, -350];       // the one shop
export const PODIUM: V3 = [0, 0, 400];      // the winner's podium

const cams: Record<number, Key[]> = {
  1: [{ f: 0, s: holdZ(add(DOCK, -10, 2.5, -4), add(DOCK, 0, 1.5, 34), 0, 46, 0.0016) }],
  2: [
    { f: F(2), s: hold(add(SQUARE, -5, 1.8, -10), add(SQUARE, -2.5, 1.8, 4), F(2), 44, 0.0018) },
    { f: F(2, 0.55), cut: true, s: hold(add(BORDER, -3.5, 1.5, -6), add(BORDER, 0, 1.0, 0), F(2, 0.55), 40, 0.002) },
  ],
  3: [{ f: F(3), s: hold(add(DOCK, -4, 1.7, -5), add(DOCK, 0, 1.2, 2), F(3), 40, 0.002) }],
  4: [{ f: F(4), s: hold(add(BOARDRM, -3.6, 1.8, -5.5), add(BOARDRM, 0, 1.3, 0.5), F(4), 40, 0.0025) }],
  5: [{ f: F(5), s: track({ pos: add(DOCK, -30, 8, 2), look: add(DOCK, -10, 1, 40), fov: 50 }, { pos: add(DOCK, 20, 8, 2), look: add(DOCK, 30, 1, 40), fov: 50 }, F(5), F(6)) }],
  6: [{ f: F(6), s: hold(add(BOARDRM, -2, 1.7, -4.4), add(BOARDRM, 0, 1.1, 0.4), F(6), 38, 0.0025) }],
  7: [{ f: F(7), s: holdZ(add(DOCK, 6, 2.0, 8), add(DOCK, 0, 1, 40), F(7), 40, 0.002) }],
  8: [{ f: F(8), s: hold(add(DOCK, -2.8, 3.2, 26), add(DOCK, 0, 3.4, 32), F(8), 38, 0.0025, 0.05) }],
  9: [{ f: F(9), s: hold(add(SCRAP, -9, 3, -12), add(SCRAP, 0, 3.5, 0), F(9), 44, 0.0018) }],
  10: [
    { f: F(10), s: holdZ(add(WHITE, 0, 2.5, -40), add(WHITE, 0, 7, 0), F(10), 40, 0.0016) },
    { f: F(10, 0.55), cut: true, s: hold(add(OFFICE, -1.5, 1.7, -5.5), add(OFFICE, 0, 1.6, 0), F(10, 0.55), 40, 0.002) },
  ],
  11: [{ f: F(11), s: hold(add(OFFICE, -1.4, 1.75, -3.6), add(OFFICE, -1.2, 1.7, 0), F(11), 36, 0.003) }],
  12: [{ f: F(12), s: hold(add(SHOP, -2.5, 1.8, -6), add(SHOP, 0, 1.6, 0.5), F(12), 42, 0.0018) }],
  13: [{ f: F(13), s: hold(add(SHOP, 0.6, 1.4, -2.6), add(SHOP, 0.6, 1.15, 0.3), F(13), 34, 0.003) }],
  14: [{ f: F(14), s: hold(add(SHOP, -7, 3.0, -10), add(SHOP, 0, 3.5, 4), F(14), 48, 0.002) }],
  15: [{ f: F(15), s: hold(add(PODIUM, -1.5, 2.2, -8), add(PODIUM, 0, 2.2, 0), F(15), 40, 0.0018) }],
};

const dof: Dof[] = [
  { f: 0, cInf: 0 }, { f: F(2), cInf: 8 }, { f: F(3), cInf: 10 }, { f: F(4), cInf: 10 }, { f: F(5), cInf: 0 }, { f: F(6), cInf: 12 },
  { f: F(7), cInf: 0 }, { f: F(8), cInf: 12 }, { f: F(9), cInf: 6 }, { f: F(10), cInf: 0 }, { f: F(10, 0.55), cInf: 10 }, { f: F(11), cInf: 13 },
  { f: F(12), cInf: 9 }, { f: F(13), cInf: 14 }, { f: F(14), cInf: 4 }, { f: F(15), cInf: 9 },
];

const events: SoundEvent[] = [
  { f: 6, kind: "bell", gain: 0.6 }, { f: 20, kind: "rumble", dur: 2.0, gain: 0.6 },
  { f: F(2, 0.15), kind: "pop" }, { f: F(2, 0.6), kind: "thud" }, { f: F(2, 0.75), kind: "boing", gain: 0.5 },
  { f: F(3, 0.3), kind: "clank", gain: 0.5 }, { f: F(3, 0.55), kind: "glass", gain: 0.5 },
  { f: F(4, 0.2), kind: "ding" }, { f: F(5), kind: "rumble", dur: 2.6 }, { f: F(5, 0.5), kind: "honk", gain: 1.5 },
  { f: F(6, 0.3), kind: "whoa", n: 3, gain: 0.6 }, { f: F(8, 0.2), kind: "boing" }, { f: F(8, 0.5), kind: "oof", n: 1 },
  { f: F(9, 0.2), kind: "crunch" }, { f: F(9, 0.5), kind: "clank" }, { f: F(9, 0.7), kind: "crunch", gain: 0.7 },
  { f: F(11, 0.1), kind: "ding", gain: 0.6 }, { f: F(11, 0.6), kind: "whoa", n: 1, gain: 0.6 },
  { f: F(12, 0.3), kind: "bell", gain: 0.5 }, { f: F(13, 0.3), kind: "glass", gain: 0.4 }, { f: F(14), kind: "thud", gain: 1.5 }, { f: F(14, 0.1), kind: "honk", gain: 1.5 },
  { f: F(15, 0.1), kind: "fanfare", gain: 0.7 }, { f: F(15, 0.4), kind: "cheer", n: 5 },
];

export const TL = makeTimeline({
  clock: CLOCK,
  light: { 15: "golden" }, sun: { 15: { az: 130, el: 22 } },
  amb: { 1: "beach", 2: "city", 3: "beach", 4: "room", 5: "beach", 6: "room", 7: "beach", 8: "beach", 9: "city", 10: "city", 11: "room", 12: "room", 13: "room", 14: "room", 15: "none" },
  xfade: { 2: 8, 4: 8, 5: 8, 9: 8, 10: 10, 12: 10, 15: 12 },
  flashes: [F(2)],
  cams, dof,
  kicks: [[F(14), 1.4], [F(9, 0.2), 0.6]],
  events,
  music: { mood: "march", key: 5, tempo: 112 },
});
