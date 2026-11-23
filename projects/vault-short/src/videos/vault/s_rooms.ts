// The two small interiors (owner: sets).
// BEDROOM (night, moonlit window + a candle on the nightstand): a big carved bed with a patchwork quilt and a bedpost, a
//   nightstand, a wardrobe, a chair with the banker's clothes, rug, curtains, framed pictures.
// WORKSHOP (warm window key + lamps): James Sargent's cluttered workshop: a long bench under shelves of padlocks, clocks, jars
//   and keys, a tool rack, cogs everywhere, a drafting table, a grindstone, and ON THE BENCH the two brass kitchen clocks that
//   come apart (the dial pops, gears and a coil spring spill) and fit together into THE MECHANISM (shot 7).
import * as THREE from "three";
import * as P from "./paint";
import { rng } from "./paint";
import { Batch, M4, rbox, rb, col, texM, glow, rod, cached, lathe, V, SetRig, quad, ground, woodM, shiny } from "./build";
import { SPOT, glide, clamp01, EV, pushAt, lerp } from "./story";
import { brassM, steelL, steelD, goldM, dialM } from "./door";
import { cog, buildKClock, buildMech, poseMech, KClock, MechRig } from "./mech";
import { plasterM, panelM, brickM, blockM, wallPlate, surround, pane, bars, Hole, candlestick, curtain, barrel, crate, chair, cogPile, CREAM, gloss } from "./setkit";

const wallpaper = (key: string, base: string, stripe: string) => texM("wp" + key, () => P.wallpaperHD(key, base, stripe));
const floorM = (c: string) => texM("floor" + c, () => P.oldWoodHD(c));

// =================================================================================================================
// BEDROOM
// =================================================================================================================
export const buildBedroom = (): SetRig => {
  const group = new THREE.Group(), b = new Batch();
  const X0 = -3.6, X1 = 3.6, Z0 = -3.5, Z1 = 5.5, H = 3.2, wp = wallpaper("bed", "#8a5a56", "#e2cfa0");
  b.add(ground(X0, X1, Z0, Z1, 0, 2), floorM("#7a5634"));
  b.add(quad(V(X0, H, Z0), V(X1, H, Z0), V(X1, H, Z1), V(X0, H, Z1), 3, 3), plasterM("#6a5a50"));
  b.add(quad(V(X0, 0, Z0), V(X1, 0, Z0), V(X1, H, Z0), V(X0, H, Z0), 3, 2), wp);                        // back wall
  b.add(quad(V(X1, 0, Z1), V(X0, 0, Z1), V(X0, H, Z1), V(X1, H, Z1), 3, 2), wp);                        // front wall (behind the lens)
  // left wall with the tall moon window, right wall plain with a door
  const L = M4(X0, 0, Z1, Math.PI / 2), Rr = M4(X1, 0, Z0, -Math.PI / 2);
  const win: Hole = { u0: Z1 - 0.8 - 1.0, u1: Z1 - 0.8 + 1.0, v0: 0.7, v1: 3.0, arch: true };
  wallPlate(b, wp, 0, Z1 - Z0, 0, H, [win], 0.5, L, 2);
  surround(b, col(CREAM), win, 0.14, 0.14, L); pane(b, win, -0.3, "#2e4c9c", 1.6, L); bars(b, col(CREAM), win, 1, 2, 0.028, -0.12, L);
  b.add(new THREE.CircleGeometry(0.3, 24).translate(win.u0 + 0.5, 2.5, -0.34), glow("#ffe9b0", 3.0), L);
  wallPlate(b, wp, 0, Z1 - Z0, 0, H, [], 0.5, Rr, 2);
  curtain(b, X0 + 0.14, 0.35, 0.8 + 1.15, 0.7, 2.5, "#3a5a8a", Math.PI / 2); curtain(b, X0 + 0.14, 0.35, 0.8 - 1.15, 0.7, 2.5, "#3a5a8a", Math.PI / 2);
  // wainscot + skirting
  for (const [x0, x1, z0, z1] of [[X0, X0 + 0.1, Z0, Z1], [X1 - 0.1, X1, Z0, Z1], [X0, X1, Z0, Z0 + 0.1]]) rb(b, panelM("#4a2e1c"), x0, x1, 0, 1.0, z0, z1, 0.02, 2);
  // the bed (head at the left, x = -1.95; foot at x = 0.55): posts with gold finials, a tall headboard, a low footboard
  const bx0 = -1.95, bx1 = 0.55, bz0 = -2.3, bz1 = -0.5, dark = woodM("#4a2a18");
  rb(b, dark, bx0 - 0.08, bx0 + 0.08, 0.1, 1.75, bz0, bz1, 0.04); rb(b, dark, bx1 - 0.05, bx1 + 0.05, 0.1, 0.85, bz0, bz1, 0.04);
  rb(b, dark, bx0, bx1, 0.3, 0.45, bz0 - 0.04, bz0 + 0.04, 0.02); rb(b, dark, bx0, bx1, 0.3, 0.45, bz1 - 0.04, bz1 + 0.04, 0.02);
  for (const [x, z, h] of [[bx0, bz0, 1.95], [bx0, bz1, 1.95], [bx1, bz0, 1.5], [bx1, bz1, 1.5]] as [number, number, number][]) {
    b.add(rod(V(x, 0, z), V(x, h, z), 0.065, 0.055, 8), dark);
    b.add(cached("bedBall", () => new THREE.SphereGeometry(0.1, 10, 8)), goldM(), M4(x, h + 0.08, z));
  }
  b.add(rbox(2.45, 0.3, 1.78, 0.08), col("#e8e0d0"), M4((bx0 + bx1) / 2, 0.58, (bz0 + bz1) / 2));             // mattress
  b.add(rbox(1.6, 0.2, 1.82, 0.07), texM("quilt", () => P.quiltHD()), M4(-0.35, 0.82, (bz0 + bz1) / 2));            // the quilt
  b.add(rbox(0.55, 0.17, 0.85, 0.07), col("#f6f0e6"), M4(-1.62, 0.84, (bz0 + bz1) / 2));                          // the pillow
  // nightstand with the candle, a book; wardrobe; chair with the banker's clothes; rug; framed pictures
  rb(b, dark, -3.2, -2.5, 0.02, 0.72, -1.8, -1.0, 0.03); rb(b, brassM(), -3.0, -2.95, 0.5, 0.58, -1.48, -1.32, 0.01);
  candlestick(b, -2.85, 0.72, -1.4, 1.1); rb(b, col("#3a5a8a"), -3.1, -2.75, 0.72, 0.78, -1.1, -0.85, 0.01);
  rb(b, dark, 2.5, 3.5, 0.0, 2.4, -3.45, -2.5, 0.05); rb(b, woodM("#6a4a2a"), 2.45, 3.55, 2.4, 2.5, -3.5, -2.45, 0.03);
  b.add(rod(V(3.0, 0.2, -2.49), V(3.0, 2.2, -2.49), 0.012, 0.012, 4), col("#1c1a22"));
  chair(b, 2.8, 0, 1.6, -Math.PI / 2); b.add(rbox(0.5, 0.06, 0.4, 0.02), col("#2e6a4a"), M4(2.8, 0.58, 1.6));                    // the waistcoat on the seat
  b.add(quad(V(-1.4, 0.03, 0.6), V(1.8, 0.03, 0.6), V(1.8, 0.03, 3.4), V(-1.4, 0.03, 3.4), 2, 2), texM("bedRug", () => P.carpetHD("#2a4a7a", "#e0b050")));
  for (const [x, c] of [[-0.2, "#c8a050"], [1.1, "#7aa0c0"], [2.0, "#d08a60"]] as [number, string][]) { rb(b, brassM(), x - 0.26, x + 0.26, 1.9, 2.42, Z0 + 0.01, Z0 + 0.05, 0.01); b.add(new THREE.PlaneGeometry(0.42, 0.38).translate(x, 2.16, Z0 + 0.07), col(c)); }
  b.build(group, true);
  return { name: "bedroom", group };
};

// =================================================================================================================
// WORKSHOP
// =================================================================================================================
const BENCH_Y = 1.0;
type ShopRig = SetRig & { clocks: KClock[]; mech: MechRig; mechRoot: THREE.Group; parts: THREE.Object3D[]; clockRoot: THREE.Group[] };
export const buildWorkshop = (): ShopRig => {
  const group = new THREE.Group(), b = new Batch(), r = rng(77);
  const X0 = -4.5, X1 = 4.5, Z0 = -3.6, Z1 = 6.5, H = 3.8, walnut = woodM("#5a3a22");
  b.add(ground(X0, X1, Z0, Z1, 0, 2), floorM("#6e4a2c"));
  b.add(quad(V(X0, H, Z0), V(X1, H, Z0), V(X1, H, Z1), V(X0, H, Z1), 3, 3), plasterM("#7a6a58"));
  for (let x = X0 + 0.6; x < X1; x += 1.5) rb(b, woodM("#3a2616"), x - 0.15, x + 0.15, H - 0.3, H, Z0, Z1, 0.02);
  // walls: a warm brick back wall, plaster side walls, the big window on the right
  b.add(quad(V(X0, 0, Z0), V(X1, 0, Z0), V(X1, H, Z0), V(X0, H, Z0), 4, 2), brickM("#a85a44"));
  b.add(quad(V(X1, 0, Z1), V(X0, 0, Z1), V(X0, H, Z1), V(X1, H, Z1), 4, 2), plasterM("#c8a878"));
  const Lm = M4(X0, 0, Z1, Math.PI / 2), Rm = M4(X1, 0, Z0, -Math.PI / 2);
  wallPlate(b, plasterM("#c8a878"), 0, Z1 - Z0, 0, H, [], 0.5, Lm, 2);
  const win: Hole = { u0: 3.2, u1: 6.6, v0: 1.0, v1: 3.3 };
  wallPlate(b, plasterM("#c8a878"), 0, Z1 - Z0, 0, H, [win], 0.5, Rm, 2);
  surround(b, col(CREAM), win, 0.14, 0.14, Rm); pane(b, win, -0.3, "#ffc070", 1.5, Rm); bars(b, col(CREAM), win, 2, 1, 0.03, -0.1, Rm);
  // ---- the bench ----
  rb(b, walnut, -3.4, 3.4, 0.0, BENCH_Y - 0.12, Z0 + 0.1, Z0 + 1.5, 0.04);
  rb(b, woodM("#7a5230"), -3.5, 3.5, BENCH_Y - 0.12, BENCH_Y, Z0 + 0.05, Z0 + 1.6, 0.03);
  for (let k = 0; k < 6; k++) { rb(b, woodM("#4a2e1a"), -3.3 + k * 1.1, -2.3 + k * 1.1, 0.12, 0.85, Z0 + 1.46, Z0 + 1.52, 0.015); b.add(cached("drawKnob", () => new THREE.SphereGeometry(0.04, 8, 6)), brassM(), M4(-2.8 + k * 1.1, 0.5, Z0 + 1.55)); }
  // vise on the left edge, tools lying on the bench, an oil lamp
  rb(b, steelD(), -3.3, -2.9, BENCH_Y, BENCH_Y + 0.3, Z0 + 1.0, Z0 + 1.5, 0.03); rb(b, steelD(), -3.5, -3.1, BENCH_Y + 0.1, BENCH_Y + 0.26, Z0 + 1.1, Z0 + 1.3, 0.02);
  cogPile(b, -3.3, -1.6, BENCH_Y + 0.02, Z0 + 0.3, Z0 + 1.2, 14, 11); cogPile(b, 1.9, 3.3, BENCH_Y + 0.02, Z0 + 0.3, Z0 + 1.2, 12, 12);
  for (let k = 0; k < 5; k++) { const x = 1.7 + k * 0.32; rb(b, woodM("#8a5a34"), x - 0.025, x + 0.025, BENCH_Y + 0.0, BENCH_Y + 0.03, Z0 + 1.2, Z0 + 1.55, 0.01); rb(b, steelL(), x - 0.04, x + 0.04, BENCH_Y + 0.0, BENCH_Y + 0.06, Z0 + 1.0, Z0 + 1.22, 0.01); }
  b.add(lathe("oilLamp", [[0, 0], [0.12, 0], [0.13, 0.04], [0.06, 0.12], [0.05, 0.22], [0.12, 0.3], [0.13, 0.42], [0.1, 0.5], [0, 0.5]], 14), brassM(), M4(-1.9, BENCH_Y, Z0 + 0.75));
  b.add(cached("oilGlobe", () => new THREE.SphereGeometry(0.17, 12, 10).scale(1, 1.2, 1)), glow("#ffd68a", 2.6), M4(-1.9, BENCH_Y + 0.55, Z0 + 0.75));
  // ---- shelves of padlocks, clocks, jars and keys over the bench ----
  for (const y of [1.95, 2.6, 3.25]) rb(b, walnut, X0 + 0.2, X1 - 0.2, y, y + 0.06, Z0 + 0.02, Z0 + 0.5, 0.02);
  for (let k = 0; k < 11; k++) { // padlocks: a rounded body + a shackle, on the first shelf
    const x = -4.0 + k * 0.72 + 0.2 * r();
    rb(b, brassM(), x - 0.1, x + 0.1, 2.01, 2.2, Z0 + 0.15, Z0 + 0.32, 0.04);
    b.add(cached("shackle", () => new THREE.TorusGeometry(0.07, 0.016, 6, 12, Math.PI).rotateZ(0)), steelL(), M4(x, 2.2, Z0 + 0.235));
  }
  for (let k = 0; k < 9; k++) { // small clocks and tin boxes on the second shelf
    const x = -3.9 + k * 0.9, kk = k % 3;
    if (kk === 0) { b.add(cached("shClock", () => new THREE.CylinderGeometry(0.2, 0.2, 0.1, 22).rotateX(Math.PI / 2)), brassM(), M4(x, 2.82, Z0 + 0.25)); b.add(cached("shClockD", () => new THREE.CircleGeometry(0.17, 22)), dialM(false), M4(x, 2.82, Z0 + 0.31)); }
    else if (kk === 1) rb(b, col(["#c0352e", "#3a6ab0", "#e0a820"][k % 3]), x - 0.2, x + 0.2, 2.66, 2.92, Z0 + 0.1, Z0 + 0.42, 0.03);
    else b.add(cached("jar", () => new THREE.CylinderGeometry(0.13, 0.13, 0.34, 12)), col(["#7ab8a0", "#c88a50", "#a0a8d0"][k % 3]), M4(x, 2.83, Z0 + 0.25));
  }
  cogPile(b, -4.0, 4.0, 3.28, Z0 + 0.1, Z0 + 0.42, 14, 31, false);
  for (let k = 0; k < 14; k++) { const x = -3.8 + k * 0.58; b.add(rod(V(x, 1.78, Z0 + 0.04), V(x, 1.36 - 0.1 * (k % 3), Z0 + 0.04), 0.012, 0.012, 4), col("#e8d8a0")); b.add(cached("keyRing", () => new THREE.TorusGeometry(0.05, 0.014, 6, 12)), brassM(), M4(x, 1.3 - 0.1 * (k % 3), Z0 + 0.05)); }
  // a big wall cog and a wall clock (no digits)
  const big = cog(0.7, 18, 0.1, brassM()); b.add(big.geometry, brassM(), M4(-3.3, 2.9, Z0 + 0.15, 0, 0, 0));
  b.add(cached("wallClk", () => new THREE.CylinderGeometry(0.46, 0.46, 0.12, 30).rotateX(Math.PI / 2)), brassM(), M4(3.3, 2.9, Z0 + 0.1)); b.add(cached("wallClkD", () => new THREE.CircleGeometry(0.4, 30)), dialM(false), M4(3.3, 2.9, Z0 + 0.17));
  // left wall: a tool rack (pegboard + hammers, pliers, saws)
  rb(b, woodM("#8a6a44"), X0 + 0.02, X0 + 0.1, 1.2, 3.0, 0.5, 5.4, 0.02);
  for (let k = 0; k < 8; k++) { const z = 0.8 + k * 0.55, kind = k % 4; const x = X0 + 0.12;
    if (kind === 0) { b.add(rod(V(x, 2.4, z), V(x, 1.7, z), 0.025, 0.025, 5), woodM("#8a5a34")); rb(b, steelL(), x - 0.04, x + 0.08, 2.4, 2.55, z - 0.14, z + 0.14, 0.02); }
    else if (kind === 1) { rb(b, steelL(), x - 0.01, x + 0.03, 1.6, 2.5, z - 0.025, z + 0.025, 0.01); rb(b, col("#c0352e"), x - 0.02, x + 0.05, 1.6, 1.95, z - 0.04, z + 0.04, 0.02); }
    else if (kind === 2) rb(b, steelL(), x - 0.01, x + 0.02, 1.8, 2.6, z - 0.12, z + 0.12, 0.01);
    else b.add(cached("hangCog", () => new THREE.TorusGeometry(0.16, 0.035, 6, 14)), brassM(), M4(x + 0.04, 2.2, z, Math.PI / 2));
  }
  // the drafting table (a slanted board on legs) + a stool; crates, barrels, a grindstone, a big cog on the floor
  const T = SPOT.TABLE;
  for (const sx of [-0.8, 0.8]) for (const sz of [-0.4, 0.4]) rb(b, walnut, T[0] + sx - 0.05, T[0] + sx + 0.05, 0, 0.98, T[2] + sz - 0.05, T[2] + sz + 0.05, 0.015);
  b.add(rbox(1.9, 0.07, 1.3, 0.02), woodM("#9a7448"), M4(T[0], 1.0, T[2], 0, 0, -0.22));
  rb(b, col("#1c1a22"), T[0] + 0.7, T[0] + 0.85, 1.12, 1.2, T[2] - 0.3, T[2] - 0.15, 0.02);
  b.add(cached("stoolTop", () => new THREE.CylinderGeometry(0.22, 0.22, 0.06, 14)), woodM("#8a5a34"), M4(-0.9, 0.62, 1.3));
  for (const k of [0, 1, 2]) { const a = k * 2.1; b.add(rod(V(-0.9 + 0.16 * Math.cos(a), 0, 1.3 + 0.16 * Math.sin(a)), V(-0.9 + 0.13 * Math.cos(a), 0.62, 1.3 + 0.13 * Math.sin(a)), 0.025, 0.022, 5), woodM("#8a5a34")); }
  barrel(b, 3.8, 0, 1.0); barrel(b, 3.9, 0, 2.1, 0.8); crate(b, 3.6, 0, 3.6, 0.9, 0.8, 0.9, 0.3); crate(b, 3.7, 0.8, 3.5, 0.6, 0.5, 0.6, 0.1, "#a87a48"); crate(b, -3.8, 0, 2.4, 0.9, 0.7, 0.9, 0.2);
  b.add(cached("grind", () => new THREE.CylinderGeometry(0.5, 0.5, 0.14, 22).rotateZ(Math.PI / 2)), col("#8a8c94"), M4(-3.7, 0.8, 4.6)); rb(b, walnut, -3.95, -3.45, 0, 0.5, 4.3, 4.9, 0.02);
  b.add(cog(0.8, 20, 0.12, brassM()).geometry, brassM(), M4(-3.5, 0.82, 5.5, 0, 0, 0.05)); // a huge cog leaning on the front wall
  cogPile(b, -2.6, 2.6, 0.01, 2.4, 5.6, 12, 91);
  // the ceiling lamp: an iron ring with a glowing lamp, a chain
  b.add(rod(V(0.2, H, 0.4), V(0.2, 3.1, 0.4), 0.02, 0.02, 4), col("#2a2230")); b.add(cached("ceilLamp", () => new THREE.SphereGeometry(0.2, 12, 10)), glow("#ffd68a", 2.4), M4(0.2, 2.98, 0.4));
  b.add(cached("ceilCap", () => new THREE.ConeGeometry(0.28, 0.22, 10)), col("#2a2230"), M4(0.2, 3.2, 0.4));
  b.build(group, true);
  // ---- moving rigs: the kitchen clocks, the flying parts, the mechanism ----
  const clocks = [buildKClock(), buildKClock()], clockRoot: THREE.Group[] = [];
  clocks.forEach((c, i) => { const g = new THREE.Group(); g.position.set(i ? 0.42 : -0.42, BENCH_Y + 0.68, Z0 + 1.05); g.add(c.group); group.add(g); clockRoot.push(g); });
  const parts: THREE.Object3D[] = [];
  for (let k = 0; k < 6; k++) {
    const m = k < 4 ? cog(0.1 + 0.03 * (k % 3), 9 + k, 0.05, k % 2 ? goldM() : brassM()) : new THREE.Mesh(cached("flySpring", () => new THREE.TorusKnotGeometry(0.05, 0.012, 60, 6, 3, 5)), steelL());
    if (k >= 4) m.scale.setScalar(1.6);
    m.visible = false; group.add(m); parts.push(m);
  }
  const mech = buildMech(), mechRoot = new THREE.Group(); mechRoot.add(mech.group); group.add(mechRoot);
  mechRoot.position.set(SPOT.MECH[0] - 0.124, SPOT.MECH[1], SPOT.MECH[2]); mechRoot.scale.setScalar(0.001);
  // per-part spill: start at the open clock head, land on the bench, then fly to the mechanism
  const start = V(-0.42, BENCH_Y + 0.9, Z0 + 1.15), mc = V(SPOT.MECH[0], SPOT.MECH[1], SPOT.MECH[2]);
  const land = (k: number) => V(-1.15 + 0.38 * k + 0.1 * Math.sin(k * 3), BENCH_Y + 0.04, Z0 + 1.0 + 0.26 * ((k * 5) % 3) - 0.1);
  const tmp = V(0, 0, 0);
  return {
    name: "workshop", group, clocks, mech, mechRoot, parts, clockRoot,
    tick: (t, id, f) => {
      const showClocks = id === 5 || (id === 6 && f < EV.FIT6 + 8), showMech = id === 7 || (id === 6 && f >= EV.MECH6);
      clockRoot.forEach((g, i) => {
        g.visible = showClocks;
        const sc = id === 6 ? 1 - glide((f - EV.FIT6) / 8) : 1;
        g.scale.setScalar(Math.max(0.001, sc)); g.position.x = lerp(i ? 0.42 : -0.42, 0, id === 6 ? glide((f - EV.FIT6) / 8) : 0);
        const c = clocks[i];
        c.pend.rotation.z = 0.32 * Math.sin(t * 5.2 + i);
        c.hands.forEach((h, j) => { h.rotation.z = -(t * (j ? 0.15 : 1.1) + i); });
        c.door.rotation.y = i === 0 && id === 6 ? -1.95 * glide((f - EV.SCREW6) / 9) : 0;
      });
      parts.forEach((m, k) => {
        const t0 = EV.SCREW6 + 1 + k * 1.2, u = (f - t0) / 15, fly = id === 6 && f >= t0 && f < EV.MECH6;
        m.visible = fly;
        if (!fly) return;
        const L = land(k);
        if (f < EV.FIT6) {   // a hop out of the clock to the bench: parabola + a bounce
          const s = clamp01(u); tmp.lerpVectors(start, L, s); tmp.y += 0.55 * Math.sin(Math.PI * s) + (s > 0.98 ? 0 : 0) + 0.06 * Math.abs(Math.sin(Math.PI * clamp01((f - t0 - 15) / 8)));
          m.position.copy(tmp); m.rotation.set(k < 4 ? Math.PI / 2 : 0.3, 0, 0); m.rotation.z = (f - t0) * 0.5 * (k % 2 ? -1 : 1);
        } else {             // gathering into the mechanism
          const s = glide((f - EV.FIT6) / (EV.MECH6 - EV.FIT6)); tmp.lerpVectors(L, mc, s); tmp.y += 0.3 * Math.sin(Math.PI * s);
          m.position.copy(tmp); m.scale.setScalar((k < 4 ? 1 : 1.6) * (1 - 0.5 * s)); m.rotation.z += 0.4;
        }
      });
      mechRoot.visible = showMech;
      if (showMech) {
        const pop = id === 6 ? clamp01((f - EV.MECH6) / 12) : 1, over = 1 + 0.18 * Math.sin(Math.PI * pop) * (1 - pop);
        mechRoot.scale.setScalar(0.62 * (id === 6 ? glide(pop) * over : 1) + 0.0001);
        poseMech(mech, t, id === 7 ? pushAt(f) : 0);
      }
    },
  };
};
