// Sets for "The Day Pepsi Got Warships": a Moscow square with a cola kiosk, a border barrier, a harbour with vodka
// crates and the fleet (17 submarines, cruiser, frigate, destroyer), a boardroom, a scrapyard, the White House and an
// office, the one shop (a destroyer through its back wall), and a winner's podium. Generic cola cans, no logos.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../kit/build";
import { ctex } from "../kit/paint";
import { Env, quadUp } from "../kit/world";
import { col, shiny, mesh, ell, board, text, tree } from "../kit/props";
import { hh, clamp01, easeOut, V3, add } from "../kit/timeline";
import { F, SQUARE, BORDER, DOCK, BOARDRM, SCRAP, WHITE, OFFICE, SHOP, PODIUM } from "./timeline";

const subM = () => shiny("#2a2d36", "#666", 30);
const greyM = () => shiny("#8a919c", "#bbb", 30);
const sub = (parent: THREE.Object3D, at: V3, s = 1, rotY = 0) => {
  const g = new THREE.Group(); g.position.set(...at); g.scale.setScalar(s); g.rotation.y = rotY; parent.add(g);
  mesh(new THREE.CapsuleGeometry(1.6, 14, 8, 16).rotateZ(Math.PI / 2), subM(), g, 0, 0.3, 0);
  mesh(boxGeo(V(-1.6, 1.2, -0.45), V(1.6, 3.6, 0.45)), subM(), g, 1.5, 0, 0);
  mesh(boxGeo(V(-0.1, 2.6, -1.6), V(0.1, 2.8, 1.6)), subM(), g, 1.5, 0, 0);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2).translate(0, 4.2, 0), col("mast", "#55535d"), g, 1.0, 0, 0);
  return g;
};
const warship = (parent: THREE.Object3D, at: V3, L: number, rotY = 0) => {
  const g = new THREE.Group(); g.position.set(...at); g.rotation.y = rotY; parent.add(g);
  const hull = greyM(), W = L * 0.12;
  const shape = new THREE.Shape(); shape.moveTo(-L / 2, -W / 2); shape.lineTo(L * 0.3, -W / 2); shape.lineTo(L / 2, 0); shape.lineTo(L * 0.3, W / 2); shape.lineTo(-L / 2, W / 2); shape.closePath();
  const hg = new THREE.ExtrudeGeometry(shape, { depth: L * 0.07, bevelEnabled: false }); hg.rotateX(-Math.PI / 2); hg.translate(0, -L * 0.02, 0);
  mesh(hg, hull, g);
  mesh(boxGeo(V(-L * 0.12, L * 0.05, -W * 0.3), V(L * 0.08, L * 0.12, W * 0.3)), hull, g);
  mesh(boxGeo(V(-L * 0.06, L * 0.12, -W * 0.18), V(L * 0.04, L * 0.17, W * 0.18)), hull, g);
  mesh(new THREE.CylinderGeometry(0.15, 0.2, L * 0.16).translate(0, L * 0.2, 0), col("mast", "#55535d"), g, -L * 0.02, 0, 0);
  for (const x of [L * 0.22, -L * 0.3]) { mesh(new THREE.CylinderGeometry(W * 0.22, W * 0.25, L * 0.03, 12).translate(0, L * 0.065, 0), hull, g, x, 0, 0); mesh(new THREE.CylinderGeometry(0.12, 0.12, L * 0.09).rotateZ(Math.PI / 2).translate(L * 0.045 * Math.sign(x), L * 0.075, 0), col("barrel", "#55535d"), g, x, 0, 0); }
  return g;
};
const can = (parent: THREE.Object3D, x: number, y: number, z: number, s = 1) => {
  mesh(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.12 * s, 14).translate(0, 0.06 * s, 0), shiny("#d02a2a", "#fff", 60), parent, x, y, z);
  mesh(new THREE.CylinderGeometry(0.036 * s, 0.036 * s, 0.03 * s, 14).translate(0, 0.07 * s, 0), col("canBand", "#f4f4ee"), parent, x, y, z);
};
const roomAt = (b: Batch, o: V3, wall: string, floor: string, w = 9) => {
  const m = new THREE.Matrix4().makeTranslation(...o);
  b.add(quadUp(-w, w, -w, 3, 4, 3, 0), col("pf" + floor, floor), m);
  b.add(boxGeo(V(-w, 0, 3), V(w, 4.6, 3.3)), col("pw" + wall, wall), m);
  for (const x of [-w - 0.3, w]) b.add(boxGeo(V(x, 0, -w), V(x + 0.3, 4.6, 3.3)), col("pw" + wall, wall), m);
};

export type Handles = ReturnType<typeof build>;
export const build = (root: THREE.Group, env: Env) => {
  const b = new Batch();
  const stone = col("plaza", "#c9c3b8"), grassM = env.grass();
  // Moscow square + onion domes + kiosk
  b.add(quadUp(-60, 60, -60, 60, 15, 15, 0), stone, new THREE.Matrix4().makeTranslation(...SQUARE));
  b.build(root);
  const domeCols = ["#d8453c", "#2f8f8a", "#e2b93c", "#3f6fb5", "#7b4a8c"];
  for (let i = 0; i < 5; i++) {
    const x = SQUARE[0] - 12 + i * 6, z = SQUARE[2] + 30 + (i % 2) * 4, h = 10 + 6 * (i === 2 ? 1 : hh(i, 1));
    mesh(new THREE.CylinderGeometry(2.0, 2.4, h, 12).translate(0, h / 2, 0), col("church", "#efe3c8"), root, x, 0, z);
    mesh(ell(2.8, 3.2, 2.8, 16), lam("dome" + i, () => ({ color: domeCols[i] })), root, x, h + 2.2, z);
    mesh(new THREE.ConeGeometry(0.5, 2.4, 10).translate(0, h + 6.2, 0), col("domeTip", "#e8c45a"), root, x, 0, z);
  }
  for (const x of [-20, 20]) { mesh(new THREE.CylinderGeometry(0.08, 0.08, 9).translate(0, 4.5, 0), col("pole", "#d7dae0"), root, SQUARE[0] + x, 0, SQUARE[2] + 14); board(root, "redFlag", 300, 200, (g) => { g.fillStyle = "#c8202a"; g.fillRect(0, 0, 300, 200); }, 3, 2, SQUARE[0] + x + 1.5, 7.8, SQUARE[2] + 14); }
  const kiosk = new THREE.Group(); kiosk.position.set(SQUARE[0] - 2.5, 0, SQUARE[2] + 4); root.add(kiosk);
  mesh(boxGeo(V(-1.6, 0, -1), V(1.6, 2.4, 1)), col("kiosk", "#f1efe6"), kiosk);
  mesh(boxGeo(V(-1.8, 2.4, -1.3), V(1.8, 2.6, 1.1)), col("awnRed", "#d02a2a"), kiosk);
  mesh(boxGeo(V(-1.5, 0.9, -1.15), V(1.5, 1.0, -1.0)), col("counterK", "#8a5a3c"), kiosk);
  for (let i = 0; i < 9; i++) can(kiosk, -1.2 + i * 0.3, 1.0, -1.08, 1.6);
  board(kiosk, "colaSign", 600, 160, (g) => { g.fillStyle = "#d02a2a"; g.fillRect(0, 0, 600, 160); text(g, "COLA", 300, 84, 110, "#ffffff"); }, 2.6, 0.7, 0, 2.95, -1.32);
  // border barrier
  const bg = new THREE.Group(); bg.position.set(...BORDER); root.add(bg);
  mesh(quadUp(-40, 40, -40, 40, 10, 10, 0), col("road", "#7a7d86"), bg);
  for (const x of [-3, 3]) mesh(boxGeo(V(-0.2, 0, -0.2), V(0.2, 1.3, 0.2)), col("barrierPost", "#55535d"), bg, x, 0, 0);
  const stripes = ctex("barStripes", 256, 32, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#f4f4ee" : "#d02a2a"; g.fillRect(k * 32, 0, 32, 32); } });
  mesh(boxGeo(V(-3, 1.1, -0.08), V(3, 1.3, 0.08)), lam("barM", () => ({ map: stripes })), bg);
  mesh(boxGeo(V(4, 0, -1), V(6, 2.6, 1)), col("booth", "#5d7a3a"), bg);
  const rub = new THREE.Group(); bg.add(rub);
  for (let i = 0; i < 12; i++) mesh(boxGeo(V(-0.25, 0, -0.12), V(0.25, 0.1, 0.12)), col("rouble", "#e8a0b4"), rub, -1 + (i % 3) * 0.55, 0.1 * Math.floor(i / 3), -0.6);
  // harbour: dock, vodka crates, the fleet
  const dg = new THREE.Group(); dg.position.set(...DOCK); root.add(dg);
  mesh(boxGeo(V(-60, -1, -40), V(60, 0, 12)), col("dockStone", "#9f9585"), dg);
  env.sea(DOCK[2] + 12);
  const vodka = new THREE.Group(); dg.add(vodka);
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Group(); c.position.set(-2 + (i % 4) * 1.1, 0.5 * Math.floor(i / 4), 2 + 0.1 * (i % 2)); vodka.add(c);
    mesh(boxGeo(V(-0.5, 0, -0.35), V(0.5, 0.5, 0.35)), col("crate", "#a8724a"), c);
    for (let j = 0; j < 4; j++) mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.36, 10).translate(0, 0.62, 0), shiny("#dfeef4", "#fff", 90), c, -0.3 + j * 0.2, 0, 0);
  }
  const fleet = new THREE.Group(); dg.add(fleet);
  for (let i = 0; i < 17; i++) sub(fleet, [-40 + i * 5, -0.6, 24 + (i % 3) * 7], 0.55, Math.PI / 2 + 0.1 * (hh(i, 1) - 0.5));
  warship(fleet, [-20, 0, 52], 40, 0.05); warship(fleet, [10, 0, 50], 30, -0.04); warship(fleet, [36, 0, 54], 26, 0.02);
  const tower = sub(dg, [0, -0.6, 32], 1.0, Math.PI / 2); // the one the executive tries to sail
  // boardroom
  const r = new Batch(); roomAt(r, BOARDRM, "#d8cdbb", "#6e4b33"); roomAt(r, OFFICE, "#e9e4d6", "#3f6fb5"); roomAt(r, SHOP, "#e8dcc4", "#b9b3a8");
  r.add(boxGeo(V(-2.4, 0, -0.6), V(2.4, 0.8, 1.2)), col("table", "#7a4a26"), new THREE.Matrix4().makeTranslation(...BOARDRM));
  r.add(boxGeo(V(-1.4, 0, -0.5), V(1.4, 0.8, 0.5)), col("desk", "#7a4a26"), new THREE.Matrix4().makeTranslation(OFFICE[0], 0, OFFICE[2] + 0.8));
  r.add(boxGeo(V(-3, 0, -0.5), V(3, 1.0, 0.4)), col("shopCounter", "#8a5a3c"), new THREE.Matrix4().makeTranslation(...SHOP));
  for (let k = 0; k < 3; k++) r.add(boxGeo(V(-4, 1.0 + k * 0.8, 2.4), V(4, 1.08 + k * 0.8, 3.0)), col("shelf", "#a8724a"), new THREE.Matrix4().makeTranslation(...SHOP));
  r.build(root);
  sub(root, add(BOARDRM, 0, 0.95, 0.3), 0.08, 0.3);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 12; i++) mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.38, 10).translate(0, 0.19, 0), shiny(i % 3 ? "#dfeef4" : "#8fbf7a", "#fff", 90), root, SHOP[0] - 3.6 + i * 0.65, 1.08 + k * 0.8, SHOP[2] + 2.7);
  const bottle = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.38, 10).translate(0, 0.19, 0), shiny("#dfeef4", "#fff", 90), root, SHOP[0] + 0.6, 1.0, SHOP[2] - 0.1);
  const destroyer = warship(root, add(SHOP, 1.5, -0.5, 24), 34, Math.PI / 2 + 0.2);
  // scrapyard
  const sg = new THREE.Group(); sg.position.set(...SCRAP); root.add(sg);
  mesh(quadUp(-50, 50, -50, 50, 12, 12, 0), col("yard", "#8f8b82"), sg);
  for (let i = 0; i < 40; i++) { const m = mesh(boxGeo(V(-0.6, 0, -0.4), V(0.6, 0.5, 0.4)), col("rust" + (i % 3), ["#8a5a3c", "#6e4b33", "#a06a45"][i % 3]), sg, 4 + 6 * (hh(i, 1) - 0.5), 0.5 * hh(i, 2) * 3, 4 + 5 * (hh(i, 3) - 0.5)); m.rotation.set(hh(i, 4), hh(i, 5) * 3, hh(i, 6)); }
  mesh(boxGeo(V(-0.4, 0, -0.4), V(0.4, 12, 0.4)), col("crane", "#e2b93c"), sg, -6, 0, 6);
  mesh(boxGeo(V(-6.4, 11.4, -0.3), V(6, 12, 0.3)), col("crane", "#e2b93c"), sg, 0, 0, 6);
  const magnet = new THREE.Group(); magnet.position.set(4, 7, 6); sg.add(magnet);
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.8).translate(0, 2.4, 0), col("cable", "#2a2a30"), magnet);
  mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.4, 20), col("magnet", "#3d414c"), magnet);
  const half = sub(magnet, [0, -1.6, 0], 0.4, 0.4);
  // White House exterior
  const wg = new THREE.Group(); wg.position.set(...WHITE); root.add(wg);
  mesh(quadUp(-80, 80, -80, 60, 20, 20, 0), grassM, wg);
  mesh(boxGeo(V(-22, 0, 0), V(22, 11, 14)), col("whiteHouse", "#f4f2ea"), wg);
  mesh(boxGeo(V(-23, 11, -1), V(23, 12, 15)), col("whiteHouse", "#f4f2ea"), wg);
  for (let i = 0; i < 6; i++) mesh(new THREE.CylinderGeometry(0.45, 0.5, 9.5, 12).translate(0, 4.75, 0), col("whiteHouse", "#f4f2ea"), wg, -6 + i * 2.4, 0, -2.5);
  const ped = new THREE.Shape(); ped.moveTo(-8, 0); ped.lineTo(8, 0); ped.lineTo(0, 3); ped.closePath();
  mesh(new THREE.ExtrudeGeometry(ped, { depth: 3.5, bevelEnabled: false }).translate(0, 9.5, -3.5), col("whiteHouse", "#f4f2ea"), wg);
  for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) if (Math.abs(i - 4) > 1) mesh(boxGeo(V(-0.5, 0, -0.05), V(0.5, 1.9, 0.02)), col("whWin", "#5f7fa0"), wg, -19 + i * 4.75, 2 + j * 4.5, -0.04);
  for (let i = 0; i < 6; i++) tree(root, WHITE[0] - 40 + i * 16, WHITE[2] - 30 - 6 * (i % 2), 7, i);
  // podium
  const pg = new THREE.Group(); pg.position.set(...PODIUM); root.add(pg);
  mesh(quadUp(-40, 40, -40, 40, 10, 10, 0), col("stageFloor", "#4a3f6b"), pg);
  for (const [x, h] of [[-1.6, 0.9], [0, 1.4], [1.6, 0.6]] as const) mesh(boxGeo(V(-0.75, 0, -0.6), V(0.75, h, 0.6)), col("podium" + h, ["#c9a24a", "#e8c45a", "#b07a4a"][[1.4, 0.9, 0.6].indexOf(h)]), pg, x, 0, 0);
  can(pg, 0, 1.4, 0, 14);
  board(pg, "num1", 200, 200, (g) => { g.fillStyle = "#e8c45a"; g.fillRect(0, 0, 200, 200); text(g, "1", 100, 108, 150, "#1c1a22"); }, 0.6, 0.6, 0, 0.7, -0.61);
  mesh(boxGeo(V(-6, 0, 2), V(6, 6, 2.4)), col("velvet", "#7a2e3a"), pg);
  void clamp01; void easeOut; void F;
  return { fleet, tower, vodka, rub, bottle, destroyer, magnet, half, wg };
};

export const pose = (h: Handles, id: number, f: number) => {
  h.fleet.visible = id === 1 || id === 5 || id === 7;
  h.tower.visible = id === 8;
  h.tower.rotation.z = id === 8 ? 0.08 * Math.sin(f * 0.15) : 0;
  h.vodka.visible = id === 3;
  h.rub.position.z = id === 2 ? -0.6 + 0.4 * Math.abs(Math.sin(f * 0.25)) : 0;
  h.bottle.visible = id === 13;
  h.destroyer.visible = id === 14;
  h.wg.visible = id === 10;
  const u = id === 14 ? easeOut((f - F(14)) / 8) : 1;
  h.destroyer.position.z = SHOP[2] + 24 - 13 * u;
  h.magnet.position.y = id === 9 ? 7 + 2.5 * clamp01((f - F(9, 0.3)) / 40) : 7;
  h.half.rotation.z = id === 9 ? 0.15 * Math.sin(f * 0.1) : 0;
};
