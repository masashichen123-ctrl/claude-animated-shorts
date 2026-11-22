// The moonlit 1870s town street (set "street", owner: sets): cobbles, plank boardwalks, a row of shuttered shops with a few
// warm lit windows (the hero accent against the navy night), gas lamps, and the BANK on the right: a cut-stone front with
// barred arched windows, columns and a gold coin plaque. Through the window of the hook you see the bank hall and, on its
// back wall, the gigantic vault door lit by a warm lamp (a real modelled door: rivets, wheel, bolts).
import * as THREE from "three";
import * as P from "./paint";
import { rng } from "./paint";
import { Batch, M4, rbox, rb, col, texM, glow, rod, cached, V, groundM, terrain, woodM, SetRig, quad, ground } from "./build";
import { SPOT } from "./story";
import { buildDoor, poseDoor, steelD, goldM } from "./door";
import { brickM, plasterM, sidingM, blockM, cobbleM, wallPlate, surround, pane, bars, Hole, gasLamp, barrel, crate, column, plaque, awning, candlestick, CREAM } from "./setkit";
import { brassM } from "./door";

const WALLS = [sidingM("#6a7488"), brickM("#8a4a3e"), sidingM("#7a6a58"), plasterM("#9a9484"), brickM("#6e4c44"), sidingM("#5e6a7a")];
const WIN_LIT = "#ffb25a";
/** a shop / house front on the left of the street (faces +x): plate u runs toward -z from z0 */
const houseFront = (b: Batch, z0: number, w: number, h: number, mat: THREE.Material, seed: number, xf = -7.0) => {
  const r = rng(seed), place = M4(xf, 0, z0, Math.PI / 2), holes: Hole[] = [];
  const nW = Math.max(2, Math.floor(w / 2.7)), floors = h > 6 ? 2 : 1;
  const door: Hole = { u0: w / 2 - 0.65, u1: w / 2 + 0.65, v0: 0.18, v1: 2.5, arch: false };
  holes.push(door);
  const wins: Hole[] = [];
  for (let f = 0; f < floors + (h > 6 ? 0 : 1); f++) for (let k = 0; k < nW; k++) {
    const u = ((k + 0.5) * w) / nW, v0 = 1.2 + f * 3.1;
    if (f === 0 && Math.abs(u - w / 2) < 1.2) continue;
    if (v0 + 1.6 > h - 0.4) continue;
    wins.push({ u0: u - 0.6, u1: u + 0.6, v0, v1: v0 + 1.6 });
  }
  holes.push(...wins);
  wallPlate(b, mat, 0, w, 0, h, holes, 0.5, place, 2);
  // cream trim, glowing / dark panes, door
  for (const hh of wins) {
    surround(b, col(CREAM), hh, 0.11, 0.1, place);
    const lit = r() < 0.34; pane(b, hh, -0.2, lit ? WIN_LIT : "#1d2c5c", lit ? 1.9 : 0.85, place);
    bars(b, col("#2a2430"), hh, 1, 1, 0.025, -0.1, place);
    if (lit) b.add(new THREE.PlaneGeometry(0.5, 1.0).translate((hh.u0 + hh.u1) / 2 + 0.3, (hh.v0 + hh.v1) / 2, -0.15), col("#7a3a2a", THREE.DoubleSide), place);
  }
  surround(b, col(CREAM), door, 0.12, 0.12, place);
  b.add(new THREE.PlaneGeometry(1.3, 2.32).translate(w / 2, 1.34, -0.08), woodM("#4a3220"), place);
  rb(b, col("#6a625a"), xf - 0.05, xf + 1.2, 0, 0.18, z0 - w / 2 - 0.7, z0 - w / 2 + 0.7, 0.02);                        // door step
  rb(b, col("#4a4450"), xf - 0.3, xf + 0.08, h, h + 0.35, z0 - w - 0.1, z0 + 0.1, 0.04);                              // cornice
  if (r() < 0.5) rb(b, brickM("#6a4038"), xf - 3.4, xf - 2.6, h, h + 2.0, z0 - w * 0.3 - 0.4, z0 - w * 0.3 + 0.4, 0.03); // chimney
};
const houseFrontR = (b: Batch, z0: number, w: number, h: number, mat: THREE.Material, seed: number, xf = 7.2) => {
  // right side (faces -x), plate u runs toward +z from z0
  const r = rng(seed), place = M4(xf, 0, z0, -Math.PI / 2), holes: Hole[] = [];
  const nW = Math.max(2, Math.floor(w / 2.7)), door: Hole = { u0: w / 2 - 0.65, u1: w / 2 + 0.65, v0: 0.18, v1: 2.5 };
  holes.push(door);
  const wins: Hole[] = [];
  for (let f = 0; f < 2; f++) for (let k = 0; k < nW; k++) { const u = ((k + 0.5) * w) / nW, v0 = 1.2 + f * 3.1; if (f === 0 && Math.abs(u - w / 2) < 1.2) continue; if (v0 + 1.6 > h - 0.4) continue; wins.push({ u0: u - 0.6, u1: u + 0.6, v0, v1: v0 + 1.6 }); }
  holes.push(...wins);
  wallPlate(b, mat, 0, w, 0, h, holes, 0.5, place, 2);
  for (const hh of wins) { surround(b, col(CREAM), hh, 0.11, 0.1, place); const lit = r() < 0.3; pane(b, hh, -0.2, lit ? WIN_LIT : "#1d2c5c", lit ? 1.9 : 0.85, place); bars(b, col("#2a2430"), hh, 1, 1, 0.025, -0.1, place); }
  surround(b, col(CREAM), door, 0.12, 0.12, place);
  b.add(new THREE.PlaneGeometry(1.3, 2.32).translate(w / 2, 1.34, -0.08), woodM("#4a3220"), place);
  rb(b, col("#4a4450"), xf - 0.08, xf + 0.3, h, h + 0.35, z0 - 0.1, z0 + w + 0.1, 0.04);
};

export const buildStreet = (): SetRig & { door: ReturnType<typeof buildDoor> } => {
  const b = new Batch(), r = rng(31), group = new THREE.Group();
  // ---- ground: cobbles, raised plank boardwalks, dark earth beyond ----
  terrain(b, groundM("stEarth", () => P.dirtRoadHD()), -90, 90, -200, 80, 6, undefined, 4, -0.06);
  terrain(b, cobbleM(), -4.9, 4.9, -170, 60, 4, undefined, 4, 0.0);
  for (const s of [-1, 1]) {
    rb(b, woodM("#7a5c3e"), s > 0 ? 4.8 : -7.4, s > 0 ? 7.4 : -4.8, 0, 0.2, -170, 60, 0.03, 2);
    for (let z = -160; z < 50; z += 2.6) rb(b, woodM("#4a341e"), s * 4.78 - 0.06, s * 4.78 + 0.06, 0, 0.2, z, z + 0.12, 0.01);
  }
  // ---- the bank (right): a cut-stone front with barred arched windows, a door, columns, a plaque ----
  const BX = SPOT.BANK_X, WZ = SPOT.WIN, bplace = M4(BX, 0, 0, -Math.PI / 2);
  const win1: Hole = { u0: WZ - 1.6, u1: WZ + 1.6, v0: 0.9, v1: 4.2, arch: true }, win2: Hole = { u0: 3.0, u1: 6.2, v0: 0.9, v1: 4.2, arch: true };
  const door: Hole = { u0: -1.3, u1: 1.3, v0: 0.2, v1: 3.9, arch: true };
  const upper: Hole[] = [-7.4, -3.7, 0, 3.7, 7.4].map((u) => ({ u0: u - 0.6, u1: u + 0.6, v0: 5.0, v1: 6.8, arch: true }));
  const stone = blockM("#aaa392"), trim = blockM("#cfc9b6");
  wallPlate(b, stone, -9.5, 9.5, 0, 7.6, [win1, win2, door, ...upper], 0.6, bplace, 2);
  for (const h of [win1, win2, door, ...upper]) surround(b, trim, h, h === door ? 0.3 : 0.24, 0.2, bplace);
  // iron bars across the two big windows, glowing hall behind
  for (const h of [win1, win2]) { bars(b, col("#1c1a22"), h, 6, 0, 0.03, -0.12, bplace); }
  for (const h of upper) pane(b, h, -0.25, "#1c2a5c", 0.9, bplace);
  // the door: dark wood leaves and a brass handle, steps
  b.add(new THREE.PlaneGeometry(2.6, 3.6).translate(0, 1.9, -0.18), woodM("#3a2616"), bplace);
  for (const s of [-1, 1]) b.add(cached("bankHandle", () => new THREE.SphereGeometry(0.07, 8, 6)), brassM(), bplace.clone().multiply(new THREE.Matrix4().makeTranslation(s * 0.2, 1.4, 0.0)));
  for (let k = 0; k < 3; k++) rb(b, blockM("#bdb7a6"), BX - 1.4 + k * 0.0 - 0.4 * k, BX + 0.02, 0, 0.18 * (3 - k), -2.0 - 0.1 * k, 2.0 + 0.1 * k, 0.03, 2);
  // columns, pediment-less cornice, parapet
  for (const z of [-2.5, 2.5]) column(b, BX - 0.5, 0.0, z, 4.4, 0.26, blockM("#cfc9b6"));
  rb(b, blockM("#cfc9b6"), BX - 0.9, BX + 0.05, 4.4, 4.9, -3.4, 3.4, 0.04, 2);
  rb(b, blockM("#cfc9b6"), BX - 0.6, BX + 0.1, 7.55, 8.1, -9.8, 9.8, 0.05, 2);
  rb(b, blockM("#b8b2a0"), BX - 0.3, BX + 0.1, 8.1, 8.7, -9.4, 9.4, 0.04, 2);
  plaque(b, "coin", 0, 5.45, 0.05, 1.3, bplace);
  // the bank hall behind the windows: checker floor, plaster walls, a ceiling, hanging lamps, a counter
  const HX1 = 14.5, HY = 6.6;
  ground(BX + 0.1, HX1, -9.4, 9.4, 0.0, 2);
  b.add(ground(BX + 0.1, HX1, -9.4, 9.4, 0.02, 2), texM("hallChk", () => P.checkerHD("#cfc6b0", "#3a3a4a")));
  b.add(quad(V(BX + 0.1, HY, -9.4), V(HX1, HY, -9.4), V(HX1, HY, 9.4), V(BX + 0.1, HY, 9.4), 4, 4), plasterM("#8a7a64"));
  for (const zz of [-9.4, 9.4]) b.add(quad(V(BX + 0.1, 0, zz), V(HX1, 0, zz), V(HX1, HY, zz), V(BX + 0.1, HY, zz), 3, 3), plasterM("#8a7a64"));
  // back wall (x = HX1) with the vault door; a stone slab, plain (the door sits on it)
  wallPlate(b, blockM("#8a8372"), -9.4, 9.4, 0, HY, [], 0.5, M4(HX1, 0, 0, -Math.PI / 2), 2);
  // a counter with a brass grille + a desk + a ledger lamp, an arch of warm light
  rb(b, woodM("#5a3a22"), BX + 1.4, BX + 2.6, 0.02, 1.15, -8.6, -6.7, 0.04); rb(b, brassM(), BX + 1.4, BX + 2.6, 1.15, 1.2, -8.6, -6.7, 0.02);
  rb(b, woodM("#5a3a22"), BX + 1.2, BX + 2.2, 0.02, 0.8, 3.0, 5.4, 0.04);
  b.add(cached("hallLampG", () => new THREE.SphereGeometry(0.3, 12, 10)), glow("#ffd48a", 2.4), M4(11.0, 5.4, SPOT.WIN));
  b.add(rod(V(11.0, HY, SPOT.WIN), V(11.0, 5.7, SPOT.WIN), 0.03, 0.03, 5), col("#2a2230"));
  b.add(cached("hallLampG", () => new THREE.SphereGeometry(0.3, 12, 10)), glow("#ffd48a", 2.2), M4(10.6, 5.4, 3.0));
  b.add(rod(V(10.6, HY, 3.0), V(10.6, 5.7, 3.0), 0.03, 0.03, 5), col("#2a2230"));
  // a runner carpet toward the vault: the warm colour in the window
  b.add(quad(V(BX + 0.3, 0.03, SPOT.WIN - 1.1), V(HX1 - 0.4, 0.03, SPOT.WIN - 1.1), V(HX1 - 0.4, 0.03, SPOT.WIN + 1.1), V(BX + 0.3, 0.03, SPOT.WIN + 1.1), 4, 1), texM("hallCarpet", () => P.carpetHD("#8a2230", "#e0b050")));
  // ---- the shops of the left side and the rest of the right side ----
  let z = 58, i = 0;
  while (z > -165) { const w = 7 + 2.5 * ((i * 5) % 3); houseFront(b, z, w, 6.6 + 1.6 * ((i * 7) % 3), WALLS[i % 6], 100 + i); z -= w + 0.3; i++; }
  z = 60; i = 0;
  while (z > 9.9) { const w = 8 + 2 * ((i * 3) % 3); houseFrontR(b, Math.max(9.9, z - w), Math.min(w, z - 9.9), 6.6 + 1.5 * (i % 3), WALLS[(i + 2) % 6], 200 + i); z -= w + 0.3; i++; }
  z = -9.9; i = 0;
  while (z > -165) { const w = 8 + 2 * ((i * 5) % 3); houseFrontR(b, z - w, w, 6.6 + 1.5 * ((i + 1) % 3), WALLS[(i + 4) % 6], 300 + i); z -= w + 0.3; i++; }
  // street furniture: gas lamps, barrels, crates, a hitching post, a bench in front of the bank
  const lampZ = [4, -13, 20, -30, -48, 38, -66, -84, -102];
  for (const lz of lampZ) { gasLamp(b, 4.6, 0.2, lz); gasLamp(b, -4.6, 0.2, lz - 7); }
  barrel(b, 5.4, 0.2, -8.2); barrel(b, 5.9, 0.2, -8.7); crate(b, 5.6, 0.2, 7.6, 0.8, 0.7, 0.8, 0.3);
  rb(b, woodM("#6a4a2a"), 4.9, 5.1, 0.2, 1.0, 1.9, 4.1, 0.02); rb(b, woodM("#6a4a2a"), 4.9, 5.1, 0.2, 1.0, 5.6, 5.8, 0.02); rb(b, woodM("#6a4a2a"), 4.88, 5.12, 0.9, 0.98, 1.9, 5.8, 0.02);
  b.add(woodGeo("bankBench"), woodM("#6a4a2a"), M4(5.9, 0.2, 0.0));
  // far end: dark trees / a church spire silhouette against the horizon
  for (let k = 0; k < 8; k++) b.add(cached("farCone", () => new THREE.ConeGeometry(4, 14, 7)), col("#10203c"), M4(-30 + 9 * k, 7, -190 + 6 * (k % 3)));
  b.build(group, true);
  // ---- the vault door of the hook: closed, on the hall's back wall, facing -x ----
  const dr = buildDoor("old");
  dr.root.position.set(HX1, 2.1, SPOT.VDOOR_ST[2]); dr.root.rotation.y = -Math.PI / 2;
  group.add(dr.root);
  poseDoor(dr, 0, 0.3, 0, 0);
  return { name: "street", group, door: dr, tick: () => undefined };
};
const woodGeo = (k: string) => cached(k, () => new THREE.BoxGeometry(0.01, 0.01, 0.01));
void steelD; void goldM; void candlestick; void awning; void plaque;
