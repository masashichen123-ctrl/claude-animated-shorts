// The two bright-day sets (owner: sets).
// PRAIRIE: Morrison, Illinois, 1874: a wide dirt main street, plank boardwalks, false-front wooden shops, farm fields to the
//   horizon, a windmill, and the small brick BANK with an arched doorway and a flag; the vault door rides in on a cart (shot 8b)
//   and is then installed in the arch; a ribbon across the entrance is snipped (shot 8c).
// BANKROW: a street of banks: nine identical cut-stone bank fronts, each with the clock-lock vault door in its arch; on the
//   left, Sargent's shop (a gear and a clock on the sign, a gear turning on the roof) with the queue of bankers in front.
import * as THREE from "three";
import * as P from "./paint";
import { rng } from "./paint";
import { Batch, M4, rbox, rb, col, texM, glow, rod, cached, V, SetRig, quad, ground, woodM, groundM, terrain, unlit, addVeg, hillRing, FAR } from "./build";
import { SPOT, EV, cartZ, glide, clamp01 } from "./story";
import { buildDoor, poseDoor, brassM, steelD, steelL, dialM, goldM } from "./door";
import { brickM, plasterM, sidingM, blockM, wallPlate, surround, pane, bars, Hole, barrel, crate, column, plaque, awning, cart, CREAM, gloss } from "./setkit";
import { cog } from "./mech";

const GLASS = "#8fbce0";
/** a wooden false-front shop (day): siding, a taller front with a cornice, shop windows, a door, a striped awning, a plaque */
const shopFront = (b: Batch, place: THREE.Matrix4, w: number, h: number, wall: THREE.Material, seed: number, awn: string, kind: "coin" | "gear" | "clock") => {
  const door: Hole = { u0: w / 2 - 0.7, u1: w / 2 + 0.7, v0: 0.25, v1: 2.6 };
  const wl: Hole = { u0: 0.7, u1: w / 2 - 1.1, v0: 0.9, v1: 2.6 }, wr: Hole = { u0: w / 2 + 1.1, u1: w - 0.7, v0: 0.9, v1: 2.6 };
  const up: Hole[] = [0.25, 0.75].map((k) => ({ u0: w * k - 0.55, u1: w * k + 0.55, v0: 3.7, v1: 5.2 })).filter(() => h > 6.6);
  wallPlate(b, wall, 0, w, 0, h, [door, wl, wr, ...up], 0.5, place, 2);
  for (const hh of [wl, wr, ...up]) { surround(b, col(CREAM), hh, 0.12, 0.1, place); pane(b, hh, -0.2, GLASS, 1.0, place); bars(b, col(CREAM), hh, 1, 1, 0.025, -0.1, place); }
  surround(b, col(CREAM), door, 0.14, 0.12, place);
  b.add(new THREE.PlaneGeometry(1.4, 2.35).translate(w / 2, 1.42, -0.1), woodM("#5a3a22"), place);
  rb(b, col(CREAM), -0.12, w + 0.12, h, h + 0.4, -0.3, 0.1, 0.03);
  awning(b, w / 2, 3.1, 0.0, w - 0.6, 1.3, awn, place);
  plaque(b, kind, w / 2, 4.2 + (h > 6.6 ? 1.9 : 0.4), 0.03, 1.0, place);
  void seed;
};
const SHOP_C = ["#e8d8a0", "#f4efe0", "#b8d0b0", "#a8c0d8", "#e8b8a0", "#d8c8e0"];
const AWN_C = ["#c8282e", "#2f7a4a", "#3a6ab0", "#e0a820", "#8a4a9a"];

// =================================================================================================================
export type PrairieRig = SetRig & { cart: THREE.Group; wheels: THREE.Group[]; cartDoor: ReturnType<typeof buildDoor>; bankDoor: ReturnType<typeof buildDoor>; ribbons: THREE.Group[]; flag: THREE.Mesh; mill: THREE.Group };
export const buildPrairie = (): PrairieRig => {
  const group = new THREE.Group(), b = new Batch(), r = rng(8);
  const BX = SPOT.PR_BANK_X;
  // ground: road, grass, fields to the horizon, hills
  const road = groundM("prRoad", () => P.dirtRoadHD());
  terrain(b, groundM("prGrass", () => P.pastureHD("pastureMorrison", "#74ac4a")), -FAR, FAR, -FAR, FAR, 4, undefined, 4, -0.08);
  terrain(b, road, -6.3, 6.3, -260, 260, 6, undefined, 4, 0.0);
  terrain(b, groundM("prFieldL", () => P.stubbleHD("stubbleMorrison", "#d8b858")), -140, -30, -250, 250, 4, undefined, 4, -0.04);
  terrain(b, groundM("prFieldR", () => P.pastureHD("cornMorrison", "#5f9a3e")), 30, 140, -250, 250, 4, undefined, 4, -0.04);
  hillRing(b, 0, 0, 380, 3, 22, 4, "#8aa8b8");
  for (const s of [-1, 1]) {
    rb(b, woodM("#a8845c"), s > 0 ? 6.2 : -8.7, s > 0 ? 8.7 : -6.2, 0, 0.25, -260, 260, 0.03, 2);
    for (let z = -250; z < 250; z += 2.6) rb(b, woodM("#6a4a2a"), s * 6.2 - 0.05, s * 6.2 + 0.05, 0, 0.25, z, z + 0.12, 0.01);
  }
  // the brick bank (left, faces +x): arch door, arch windows, a cornice with dentils, a parapet, steps, a lamp
  const bp = M4(BX, 0, 0, Math.PI / 2);     // plate u runs toward -z; the facade is symmetric around z = 0 so use u in [-6, 6]
  const arch: Hole = { u0: -1.9, u1: 1.9, v0: 0.25, v1: 5.3, arch: true };
  const wins: Hole[] = [-4.4, 4.4].map((u) => ({ u0: u - 0.9, u1: u + 0.9, v0: 1.2, v1: 4.6, arch: true }));
  const upw: Hole[] = [-4.4, -1.5, 1.5, 4.4].map((u) => ({ u0: u - 0.55, u1: u + 0.55, v0: 6.4, v1: 8.0, arch: true }));
  const brick = brickM("#a84a38"), trim = blockM("#d4cdb8");
  wallPlate(b, brick, -6, 6, 0, 9.2, [arch, ...wins, ...upw], 0.7, bp, 2);
  for (const h of [arch, ...wins, ...upw]) surround(b, trim, h, h === arch ? 0.34 : 0.22, 0.2, bp);
  for (const h of wins) { pane(b, h, -0.3, GLASS, 1.0, bp); bars(b, col("#f4efe0"), h, 1, 2, 0.03, -0.12, bp); }
  for (const h of upw) pane(b, h, -0.3, GLASS, 1.0, bp);
  rb(b, trim, BX - 0.3, BX + 0.1, 5.8, 6.1, -6.3, 6.3, 0.04, 2);   // belt course
  for (let k = -12; k <= 12; k++) rb(b, trim, BX - 0.32, BX + 0.1, 9.2 - 0.26, 9.2, k * 0.5 - 0.12, k * 0.5 + 0.12, 0.02, 2); // dentils
  rb(b, trim, BX - 0.4, BX + 0.1, 9.2, 9.7, -6.4, 6.4, 0.04, 2); rb(b, trim, BX - 0.2, BX + 0.1, 9.7, 10.4, -6.2, 6.2, 0.03, 2);
  plaque(b, "coin", 0, 7.1, 0.02, 1.5, bp);
  for (let k = 0; k < 4; k++) rb(b, trim, BX + 0.1, BX + 1.7 - 0.4 * k, 0.0, 0.2 * (4 - k) + 0.0, -2.6 - 0.1 * k, 2.6 + 0.1 * k, 0.03, 2);
  // the vestibule behind the arch: a dark warm hall so the installed door reads against it
  b.add(quad(V(BX - 0.3, 0, -3), V(BX - 0.3, 0, 3), V(BX - 0.3, 6, 3), V(BX - 0.3, 6, -3), 1, 1), col("#1c1612"));
  b.add(new THREE.PlaneGeometry(3.6, 5).rotateY(Math.PI / 2).translate(BX - 0.25, 3, 0), glow("#7a4a22", 0.9));
  // a flag on a roof staff
  b.add(rod(V(BX + 1.0, 9.7, 3.4), V(BX + 1.0, 14.4, 3.4), 0.07, 0.05, 6), col("#e8e2d4")); b.add(cached("flagBall", () => new THREE.SphereGeometry(0.14, 8, 6)), goldM(), M4(BX + 1.0, 14.5, 3.4));
  // shops: left of the bank and right side, colourful false fronts
  let z = -6.6, i = 0;
  while (z > -230) { const w = 7 + 2.5 * ((i * 5) % 3); shopFront(b, M4(BX, 0, z, Math.PI / 2), w, 6.4 + 1.5 * ((i * 3) % 3), sidingM(SHOP_C[i % 6]), i, AWN_C[i % 5], (["coin", "gear", "clock"] as const)[i % 3]); z -= w + 0.4; i++; }
  z = 6.6; i = 3;
  while (z < 230) { const w = 7 + 2.5 * ((i * 5) % 3); shopFront(b, M4(BX, 0, z + w, Math.PI / 2), w, 6.4 + 1.5 * ((i * 3) % 3), sidingM(SHOP_C[i % 6]), i, AWN_C[i % 5], (["coin", "gear", "clock"] as const)[i % 3]); z += w + 0.4; i++; }
  z = -230; i = 1;
  while (z < 230) { const w = 7.5 + 2.5 * ((i * 7) % 3); shopFront(b, M4(8.7, 0, z, -Math.PI / 2), w, 6.4 + 1.6 * ((i * 5) % 3), sidingM(SHOP_C[(i + 2) % 6]), i + 9, AWN_C[(i + 1) % 5], (["gear", "coin", "clock"] as const)[i % 3]); z += w + 0.5; i++; }
  // street furniture: hitching rails, troughs, barrels, crates, hay bales, lamps, trees, fences; farm buildings in the fields
  for (let k = 0; k < 14; k++) { const zz = -40 + 7.5 * k; rb(b, woodM("#6a4a2a"), 6.5, 6.6, 0.25, 1.1, zz, zz + 0.1, 0.01); rb(b, woodM("#6a4a2a"), 6.5, 6.6, 0.25, 1.1, zz + 2, zz + 2.1, 0.01); rb(b, woodM("#6a4a2a"), 6.45, 6.65, 0.95, 1.05, zz, zz + 2.1, 0.01); }
  for (const [x, zz] of [[-6.8, 9], [7.2, 3], [-7.4, -12], [7.4, 14], [-6.9, 22]] as [number, number][]) barrel(b, x, 0.25, zz, 0.95);
  for (const [x, zz] of [[7.3, -4], [-7.5, 14]] as [number, number][]) crate(b, x, 0.25, zz, 0.9, 0.8, 0.9, 0.3);
  for (let k = 0; k < 6; k++) b.add(cached("hayBale", () => new THREE.CylinderGeometry(0.5, 0.5, 0.9, 14).rotateZ(Math.PI / 2)), texM("hay", () => P.hayHD()), M4(34 + 3 * (k % 3), 0.5, -20 + 5 * k));
  for (let k = 0; k < 24; k++) { const side = k % 2 ? 1 : -1; addVeg(b, "round", side * (16 + 22 * r()), 0, -90 + 8 * k + 4 * r(), 8 + 3 * r(), k * 13, 1); }
  for (let k = 0; k < 40; k++) { const zz = -100 + 5 * k; rb(b, woodM("#7a5a3a"), 20.0, 20.1, 0.0, 1.0, zz, zz + 0.1, 0.01); rb(b, woodM("#7a5a3a"), 20.0, 20.1, 0.5, 0.58, zz, zz + 5, 0.01); rb(b, woodM("#7a5a3a"), 20.0, 20.1, 0.85, 0.93, zz, zz + 5, 0.01); }
  // a red barn and a silo out in the fields; a windmill tower on the left
  rb(b, brickM("#b23a2e"), -52, -40, 0, 8, -70, -52, 0.05, 2); b.add(cached("silo", () => new THREE.CylinderGeometry(3, 3, 16, 14)), col("#c8c4b8"), M4(-37, 8, -64)); b.add(cached("siloTop", () => new THREE.SphereGeometry(3, 12, 8, 0, 6.3, 0, 1.57)), col("#6a7a8a"), M4(-37, 16, -64));
  const mill = new THREE.Group(); mill.position.set(-26, 0, -34); group.add(mill);
  {
    const mb = new Batch(); for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) mb.add(rod(V(dx, 0, dz), V(dx * 0.4, 14, dz * 0.4), 0.14, 0.1, 6), woodM("#8a6a44"));
    mb.add(rbox(1.0, 0.8, 1.6, 0.05), col("#d8d0c0"), M4(0, 14.4, 0)); mb.build(mill, true);
    const rotor = new THREE.Group(); rotor.position.set(0.9, 14.4, 0); mill.add(rotor); mill.userData.rotor = rotor;
    const rb2 = new Batch(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; rb2.add(rbox(0.05, 3.0, 1.0, 0.02), col("#e8e2d4"), M4(0, 2.2 * Math.cos(a), 2.2 * Math.sin(a), 0, 0, 0).multiply(new THREE.Matrix4().makeRotationX(a + Math.PI / 2))); } rb2.build(rotor, true);
  }
  b.build(group, true);
  // ---- doors: the installed one (in the arch) and the cart's ----
  const bankDoor = buildDoor("clock"); bankDoor.root.position.set(BX + 0.35, 2.4, 0); bankDoor.root.rotation.y = Math.PI / 2; bankDoor.root.scale.setScalar(0.8); group.add(bankDoor.root);
  poseDoor(bankDoor, 0, 0.5, 0, 0);
  // the cart: a bed on two spinning wheels, the door standing upright on it with rope straps
  const cg = new THREE.Group(); group.add(cg);
  { const cb = new Batch(); cart(cb, 0, 0, 0, Math.PI, "#8a5a34", false); cb.build(cg, true); }
  const wheels: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const wg = new THREE.Group(), wb = new Batch(); wg.position.set(s * 0.92, 0.62, 0); cg.add(wg);
    wb.add(cached("cartTyre", () => new THREE.TorusGeometry(0.6, 0.05, 6, 24).rotateY(Math.PI / 2)), col("#2a2a2e")); wb.add(cached("cartRim", () => new THREE.TorusGeometry(0.52, 0.03, 5, 20).rotateY(Math.PI / 2)), col("#d9b878"));
    for (let k = 0; k < 6; k++) wb.add(cached("cartSpoke", () => new THREE.CylinderGeometry(0.022, 0.022, 1.05, 5).rotateZ(Math.PI / 2)), col("#d9b878"), new THREE.Matrix4().makeRotationX((k * Math.PI) / 6));
    wb.add(cached("cartHub", () => new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8).rotateZ(Math.PI / 2)), col("#6a4a2a")); wb.build(wg, true); wheels.push(wg);
  }
  const cartDoor = buildDoor("clock"); cartDoor.root.children[0].visible = false;
  cartDoor.root.position.set(0, 2.28, 0); cartDoor.root.rotation.y = Math.PI / 2; cartDoor.root.scale.setScalar(0.62); cg.add(cartDoor.root);
  poseDoor(cartDoor, 0, 0.2, 0, 0);
  { const sb = new Batch(); for (const dy of [0.7, -0.3]) sb.add(rbox(0.12, 0.14, 2.6, 0.03), col("#7a5a30"), M4(0.55, 2.28 + dy, 0)); sb.build(cg, false); }
  // the ribbon across the entrance: two halves on stanchions, cut at RIBBON8
  const ribbons: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(BX + 1.6, 1.25, s * 2.3); group.add(g); ribbons.push(g);
    const rb3 = new Batch(); rb3.add(rbox(0.05, 0.22, 2.3, 0.02), col("#d8282e"), M4(0, 0, -s * 1.15)); rb3.build(g, false);
    const bow = new Batch(); bow.add(cached("bowK", () => new THREE.SphereGeometry(0.16, 8, 6)), col("#d8282e"), M4(0, 0, 0)); bow.build(g, false);
  }
  { const pb = new Batch(); for (const s of [-1, 1]) { rb(pb, woodM("#7a5a30"), BX + 1.5, BX + 1.7, 0.25, 1.45, s * 2.3 - 0.1, s * 2.3 + 0.1, 0.02); pb.add(cached("postBall", () => new THREE.SphereGeometry(0.13, 8, 6)), goldM(), M4(BX + 1.6, 1.55, s * 2.3)); } pb.build(group, true); }
  // the flag: a waving plane on the roof staff
  const flagG = new THREE.PlaneGeometry(3.2, 2.0, 14, 1), flag = new THREE.Mesh(flagG, unlit("flagM", () => P.flagHD())); flag.position.set(BX + 1.0 + 1.6, 13.4, 3.4); flag.rotation.y = Math.PI / 2; flag.userData.base = (flagG.attributes.position as THREE.BufferAttribute).array.slice(0); group.add(flag);
  return {
    name: "prairie", group, cart: cg, wheels, cartDoor, bankDoor, ribbons, flag, mill,
    tick: (t, id, f) => {
      const cz = cartZ(f);
      cg.visible = f < EV.BOLT8 + 8 && id === 8; cg.position.set(-5.2, 0, cz);
      wheels.forEach((w) => { w.rotation.x = -(cz - 16) / 0.6 * -1; });
      bankDoor.root.visible = f >= EV.BOLT8 + 8 || id !== 8;
      poseDoor(bankDoor, 0, 0.5, 0, t);
      const cut = clamp01((f - EV.RIBBON8) / 14), fall = glide(cut) * 1.35;
      ribbons.forEach((g, k) => { g.visible = id === 8 && f >= EV.CUT8 - 2; g.rotation.x = (k ? -1 : 1) * fall * 1.0; });
      const pos = flagG.attributes.position as THREE.BufferAttribute, base = flag.userData.base as Float32Array;
      for (let i2 = 0; i2 < pos.count; i2++) { const x = base[i2 * 3] + 1.6, k = x / 3.2; pos.setZ(i2, 0.18 * k * Math.sin(x * 2.4 - t * 7)); pos.setY(i2, base[i2 * 3 + 1] + 0.05 * k * Math.sin(x * 3 - t * 6)); }
      pos.needsUpdate = true;
      (mill.userData.rotor as THREE.Group).rotation.x = t * 0.9;
    },
  };
};

// =================================================================================================================
const miniDoor = (b: Batch, place: THREE.Matrix4, u: number, v: number) => {
  const m = (x: number, y: number, z: number, s: number[] = [1, 1, 1], rz = 0) => place.clone().multiply(M4(u + x, v + y, z, 0, rz, 0, s as [number, number, number]));
  b.add(cached("mdRing", () => new THREE.TorusGeometry(1.08, 0.13, 8, 30)), steelD(), m(0, 0, 0.0));
  b.add(cached("mdDisc", () => new THREE.CylinderGeometry(1.0, 1.0, 0.24, 28).rotateX(Math.PI / 2)), steelL(), m(0, 0, -0.04));
  b.add(cached("mdRing2", () => new THREE.TorusGeometry(0.7, 0.05, 6, 24)), steelD(), m(0, 0, 0.1));
  b.add(cached("mdWheel", () => new THREE.TorusGeometry(0.42, 0.04, 6, 20)), brassM(), m(0, -0.12, 0.2));
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; b.add(cached("mdSpoke", () => new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5)), brassM(), m(0, -0.12, 0.2, [1, 1, 1], a)); }
  b.add(rbox(1.0, 0.4, 0.14, 0.03), brassM(), m(0, 0.58, 0.12));
  for (const sx of [-0.25, 0.25]) b.add(cached("mdDial", () => new THREE.CircleGeometry(0.14, 18)), dialM(false), m(sx, 0.58, 0.2));
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; b.add(cached("mdRiv", () => new THREE.SphereGeometry(0.04, 6, 4)), steelL(), m(0.88 * Math.cos(a), 0.88 * Math.sin(a), 0.12)); }
};
export type BankRowRig = SetRig & { gearA: THREE.Mesh; gearB: THREE.Mesh };
export const buildBankRow = (): BankRowRig => {
  const group = new THREE.Group(), b = new Batch(), r = rng(12);
  terrain(b, groundM("brEarth", () => P.dirtRoadHD()), -120, 120, -300, 80, 6, undefined, 4, -0.08);
  terrain(b, texM("brCobble", () => P.cobbleHD()), -6.6, 6.6, -300, 80, 4, undefined, 4, 0.0);
  hillRing(b, 0, -100, 420, 3, 26, 5, "#9ab0c4");
  for (const s of [-1, 1]) rb(b, blockM("#c8c2b0"), s > 0 ? 6.6 : -9.0, s > 0 ? 9.0 : -6.6, 0, 0.22, -300, 80, 0.03, 2);
  // the right side: nine identical bank fronts (alternating stone / brick tints), each with the clock-lock door in its arch
  const PAL = [blockM("#d9cfb4"), brickM("#b8644c"), blockM("#c4ccd6"), brickM("#c0905c"), blockM("#d6c8b8")];
  const BXR = 9.0;
  for (let k = 0; k < 10; k++) {
    const zs = -1 - k * 9.6 - 8.8, place = M4(BXR, 0, zs, -Math.PI / 2), w = 8.8, mat = PAL[k % 5], trim = blockM("#ece6d4");
    const arch: Hole = { u0: w / 2 - 1.3, u1: w / 2 + 1.3, v0: 0.22, v1: 4.6, arch: true };
    const wins: Hole[] = [1.2, w - 1.2].map((u) => ({ u0: u - 0.55, u1: u + 0.55, v0: 1.3, v1: 4.2, arch: true }));
    wallPlate(b, mat, 0, w, 0, 8.8, [arch, ...wins], 0.6, place, 2);
    for (const h of [arch, ...wins]) surround(b, trim, h, h === arch ? 0.28 : 0.2, 0.2, place);
    for (const h of wins) pane(b, h, -0.3, GLASS, 1.0, place);
    b.add(quad(V(0, 0, -0.35), V(w, 0, -0.35), V(w, 7, -0.35), V(0, 7, -0.35), 1, 1), col("#201a16"), place);
    miniDoor(b, place, w / 2, 2.35 - 0.0);
    for (const dz of [0.0, w]) column(b, BXR - 0.5, 0.22, zs + (dz === 0 ? 0.1 : w - 0.1) - (dz === 0 ? 0 : 0), 4.8, 0.2, trim);
    rb(b, trim, BXR - 0.8, BXR + 0.1, 5.0, 5.4, zs - 0.2, zs + w + 0.2, 0.03, 2);
    const ped = new THREE.Shape([new THREE.Vector2(-0.1, 0), new THREE.Vector2(w + 0.1, 0), new THREE.Vector2(w / 2, 1.5)]);
    b.add(new THREE.ExtrudeGeometry(ped, { depth: 0.4, bevelEnabled: false }), trim, place.clone().multiply(M4(0, 5.4, -0.2)).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.0)));
    rb(b, trim, BXR - 0.3, BXR + 0.1, 8.8, 9.3, zs - 0.1, zs + w + 0.1, 0.03, 2);
    plaque(b, "coin", w / 2, 6.6, 0.02, 1.2, place);
    b.add(rod(V(BXR - 0.4, 9.3, zs + w / 2), V(BXR - 0.4, 12.0, zs + w / 2), 0.05, 0.04, 5), col("#e8e2d4"));
    b.add(new THREE.PlaneGeometry(0.02, 0.02), col("#fff"));
  }
  // the right side again: Sargent's shop at z 0..8 (blue-grey siding, a big sign with a gear and a clock, a striped awning, a
  // glowing open door); the left side is plain shops
  const sz0 = 0, sw = 8, sp = M4(BXR, 0, sz0, -Math.PI / 2);
  const sdoor: Hole = { u0: sw / 2 - 0.8, u1: sw / 2 + 0.8, v0: 0.22, v1: 2.8 }, swin: Hole = { u0: 0.7, u1: sw / 2 - 1.2, v0: 0.9, v1: 2.7 }, swin2: Hole = { u0: sw / 2 + 1.2, u1: sw - 0.7, v0: 0.9, v1: 2.7 };
  wallPlate(b, sidingM("#7a98b0"), 0, sw, 0, 6.2, [sdoor, swin, swin2], 0.5, sp, 2);
  for (const h of [swin, swin2]) { surround(b, col(CREAM), h, 0.14, 0.12, sp); pane(b, h, -0.25, GLASS, 1.0, sp); }
  surround(b, col(CREAM), sdoor, 0.14, 0.12, sp);
  b.add(new THREE.PlaneGeometry(1.6, 2.58).translate(sw / 2, 1.5, -0.2), glow("#e8a850", 1.2), sp);
  plaque(b, "gear", sw / 2 - 1.7, 4.6, 0.03, 1.7, sp); plaque(b, "clock", sw / 2 + 1.7, 4.6, 0.03, 1.7, sp);
  awning(b, sw / 2, 3.45, 0.0, sw - 0.5, 1.4, "#c8282e", sp);
  rb(b, col(CREAM), BXR - 0.3, BXR + 0.1, 6.2, 6.6, sz0 - 0.1, sz0 + sw + 0.1, 0.03);
  let z = 80, i = 0;
  while (z > -300) { const w = 7 + 2.5 * ((i * 5) % 3); shopFront(b, M4(-9.0, 0, z, Math.PI / 2), w, 6.4 + 1.4 * ((i * 3) % 3), sidingM(SHOP_C[(i + 2) % 6]), i, AWN_C[i % 5], (["coin", "gear", "clock"] as const)[i % 3]); z -= w + 0.4; i++; }
  z = 8.6; i = 4;
  while (z < 80) { const w = 7 + 2.5 * ((i * 5) % 3); shopFront(b, M4(BXR, 0, z, -Math.PI / 2), w, 6.4 + 1.4 * ((i * 3) % 3), sidingM(SHOP_C[(i + 4) % 6]), i, AWN_C[(i + 2) % 5], (["coin", "gear", "clock"] as const)[i % 3]); z += w + 0.4; i++; }
  for (let k = 0; k < 14; k++) { const zz = 4 - 11 * k; b.add(rod(V(6.8, 0.22, zz), V(6.8, 4.4, zz), 0.07, 0.05, 6), col("#25302a")); b.add(cached("brLampG", () => new THREE.SphereGeometry(0.24, 10, 8)), glow("#fff2c8", 1.2), M4(6.8, 4.7, zz)); b.add(cached("lampCap2", () => new THREE.ConeGeometry(0.32, 0.28, 6)), col("#25302a"), M4(6.8, 5.05, zz)); }
  barrel(b, 8.2, 0.22, 10.5); crate(b, 8.0, 0.22, 12.4, 0.8, 0.7, 0.8, 0.2);
  void r;
  b.build(group, true);
  // the big gears turning on Sargent's roof
  const gearA = cog(1.1, 16, 0.18, goldM()), gearB = cog(0.7, 12, 0.18, brassM());
  gearA.position.set(BXR - 0.6, 7.7, sz0 + 2.2); gearB.position.set(BXR - 0.6, 7.3, sz0 + 3.9); gearA.rotation.y = Math.PI / 2; gearB.rotation.y = Math.PI / 2;
  group.add(gearA, gearB);
  return { name: "bankrow", group, gearA, gearB, tick: (t) => { gearA.rotation.x = t * 0.7; gearB.rotation.x = -t * 1.1; } };
};
void ground; void gloss;
