// The bank hall at night (set "bank", owner: sets): a stone hall with a checker floor and a red runner, tall arched windows
// letting silver-blue moonlight in (real shadows: blue pools on the floor), a counter with a brass grille, a wall clock, two
// columns, and on the back wall THE VAULT DOOR: the old door (shots 3-4, swings open on cue, golden light pours out of the
// chamber behind it) and the new time-locked door (shots 9-10: the same door plus the clock-lock box with two dials).
import * as THREE from "three";
import * as P from "./paint";
import { Batch, M4, rbox, rb, col, texM, glow, rod, cached, V, SetRig, quad, ground, woodM } from "./build";
import { SPOT, doorOpen, wheelTurn, boltsBack, lapse } from "./story";
import { buildDoor, poseDoor, buildChamber, wallWithHole, steelD, goldM, brassM, dialM } from "./door";
import { blockM, plasterM, panelM, wallPlate, surround, pane, bars, Hole, column, chair, candlestick, crate, barrel, CREAM } from "./setkit";

export type BankRig = SetRig & { old: ReturnType<typeof buildDoor>; fresh: ReturnType<typeof buildDoor>; chamber: THREE.Group };
export const buildBank = (): BankRig => {
  const group = new THREE.Group(), b = new Batch();
  const VD = SPOT.VD, X0 = -7.5, X1 = 7.5, Z0 = VD[2], Z1 = 9.0, H = 6.2;
  // floor: dark slate / cream checker + a red runner with a gold border
  b.add(ground(X0, X1, Z0, Z1, 0, 2), texM("bankChk", () => P.checkerHD("#cdbf9e", "#2c3042")));
  b.add(quad(V(-1.35, 0.025, Z0 + 0.3), V(1.35, 0.025, Z0 + 0.3), V(1.35, 0.025, Z1), V(-1.35, 0.025, Z1), 1.4, 8), texM("bankRug", () => P.carpetHD("#8a1f2c", "#e8b850")));
  // ceiling with beams
  b.add(quad(V(X0, H, Z0), V(X1, H, Z0), V(X1, H, Z1), V(X0, H, Z1), 4, 4), plasterM("#6a5e50"));
  for (let z = Z0 + 1; z < Z1; z += 3) rb(b, woodM("#3a2616"), X0, X1, H - 0.35, H, z - 0.2, z + 0.2, 0.03);
  // the vault wall: stone with a round hole for the door + chamber
  wallWithHole(b, VD[0], VD[1], Z0, X1 - X0, H, 1.92, 0.8, X0, 0, undefined, blockM("#9a9482"));
  // the front wall (behind the lens) + side walls: left with three arched moon windows, right with the wall clock
  const L = M4(X0, 0, Z1, Math.PI / 2), Rr = M4(X1, 0, Z0, -Math.PI / 2);   // left plate u = Z1 - z; right plate u = z - Z0
  const wins: Hole[] = [-3.6, 0.8, 5.2].map((z) => ({ u0: Z1 - z - 0.85, u1: Z1 - z + 0.85, v0: 1.1, v1: 5.2, arch: true }));
  wallPlate(b, plasterM("#9a8e78"), 0, Z1 - Z0, 0, H, wins, 0.5, L, 2);
  for (const w of wins) { surround(b, blockM("#c8c2b0"), w, 0.26, 0.2, L); pane(b, w, -0.3, "#2c4c9a", 1.5, L); bars(b, col("#1c1a22"), w, 1, 2, 0.028, -0.12, L); }
  // a moon in the middle window (a warm disc, blooms)
  b.add(new THREE.CircleGeometry(0.34, 24).translate(wins[1].u0 + 1.15, 3.7, -0.34), glow("#ffe9b0", 3.0), L);
  wallPlate(b, plasterM("#9a8e78"), 0, Z1 - Z0, 0, H, [], 0.5, Rr, 2);
  wallPlate(b, plasterM("#9a8e78"), X0, X1, 0, H, [], 0.5, M4(0, 0, Z1, 0), 2);
  // wainscot panels low on the side walls
  for (const sx of [-1, 1]) rb(b, panelM("#5a3a24"), sx > 0 ? X1 - 0.12 : X0, sx > 0 ? X1 : X0 + 0.12, 0, 1.3, Z0, Z1, 0.02, 2);
  // columns + the counter with a brass grille
  column(b, -4.3, 0, -1.2, H, 0.42, blockM("#b8b2a0")); column(b, 4.3, 0, -1.2, H, 0.42, blockM("#b8b2a0"));
  rb(b, woodM("#4a2e1a"), 4.9, 6.6, 0.02, 1.25, -3.2, 6.0, 0.04); rb(b, woodM("#6a4a2a"), 4.8, 6.7, 1.25, 1.35, -3.3, 6.1, 0.03);
  for (let z = -3.0; z <= 6.0; z += 0.3) b.add(rod(V(5.0, 1.35, z), V(5.0, 3.0, z), 0.022, 0.022, 5), brassM());
  rb(b, brassM(), 4.95, 5.1, 3.0, 3.1, -3.2, 6.1, 0.02); rb(b, brassM(), 4.95, 5.1, 1.32, 1.4, -3.2, 6.1, 0.02);
  // wall clock (no digits) on the right wall + pendulum
  b.add(cached("hallClockR", () => new THREE.TorusGeometry(0.62, 0.07, 8, 36)), brassM(), M4(7.4, 4.3, 2.8, -Math.PI / 2));
  b.add(cached("hallClockD", () => new THREE.CircleGeometry(0.58, 32)), dialM(false), M4(7.36, 4.3, 2.8, -Math.PI / 2));
  b.add(rod(V(7.36, 3.7, 2.8), V(7.36, 2.9, 2.8), 0.015, 0.015, 5), brassM()); b.add(cached("hallPend", () => new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16).rotateZ(Math.PI / 2)), goldM(), M4(7.36, 2.8, 2.8));
  // furniture: a desk with an inkwell + a ledger, a chair, a bench, money bags and crates by the walls
  rb(b, woodM("#4a2e1a"), -6.4, -4.4, 0.02, 0.95, 0.4, 2.8, 0.04); rb(b, woodM("#6a4a2a"), -6.5, -4.3, 0.95, 1.02, 0.3, 2.9, 0.03);
  rb(b, col("#2a2a3a"), -5.9, -5.2, 1.02, 1.1, 1.0, 1.7, 0.02); rb(b, col("#f1e4c4"), -5.85, -5.25, 1.1, 1.13, 1.05, 1.65, 0.01);
  chair(b, -3.8, 0, 1.6, Math.PI / 2 * 1.0);
  b.add(cached("deskInk", () => new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10)), col("#1c1a22"), M4(-6.0, 1.07, 2.3));
  candlestick(b, -5.5, 1.02, 2.2, 0.9); candlestick(b, -0.9, 0, VD[2] + 3.6, 1.4);
  for (const [x, z] of [[-6.4, -6.2], [-5.7, -6.8], [6.3, -6.5]] as [number, number][]) b.add(cached("bagSack", () => new THREE.SphereGeometry(0.4, 12, 10).scale(1, 1.1, 1)), col("#c9a96a"), M4(x, 0.42, z));
  barrel(b, 6.2, 0, -5.4); crate(b, -6.2, 0, -4.4, 0.9, 0.8, 0.9, 0.2);
  // a stone door surround and a heavy lintel plate above the door ring
  rb(b, blockM("#b8b2a0"), -2.9, 2.9, 4.65, 5.1, Z0 - 0.05, Z0 + 0.35, 0.04, 2);
  b.build(group, true);
  // props of shot 10 only: the chair, the crates and the card table
  const p10 = new THREE.Group(), pb = new Batch();
  chair(pb, 0.1, 0, VD[2] + 3.6, 0); candlestick(pb, 0.4, 0, VD[2] + 4.5, 1.4);
  crate(pb, -1.45, 0, VD[2] + 3.8, 0.8, 0.45, 0.8, 0.1); crate(pb, 0.95, 0, VD[2] + 3.5, 0.8, 0.45, 0.8, 0.2); crate(pb, 2.05, 0, VD[2] + 3.75, 0.8, 0.45, 0.8, -0.1); crate(pb, 1.5, 0, VD[2] + 3.0, 0.6, 0.7, 0.6, 0.0, "#a87a48");
  pb.build(p10, true); group.add(p10);
  // ---- the door(s) and the chamber behind ----
  const chamber = buildChamber(); chamber.position.set(VD[0], VD[1], Z0); group.add(chamber);
  const old = buildDoor("old"), fresh = buildDoor("clock");
  for (const d of [old, fresh]) { d.root.position.set(VD[0], VD[1], Z0); group.add(d.root); }
  return {
    name: "bank", group, old, fresh, chamber,
    tick: (t, id, f) => {
      old.root.visible = id <= 4; fresh.root.visible = id >= 9; p10.visible = id === 10;
      poseDoor(old, doorOpen(id, f), wheelTurn(id, f), boltsBack(id, f), t);
      poseDoor(fresh, 0, wheelTurn(id, f), 0, t + (id === 10 ? 80 * lapse(f) ** 2 : 0));
    },
  };
};
void steelD; void CREAM;
