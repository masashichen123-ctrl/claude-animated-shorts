// Sets for "The War Australia Lost to Birds": a Western Australian wheat farm (field, red dirt road, fence, farmhouse,
// gum trees), the army camp (tent, Lewis gun, ammunition boxes, tally boards), a truck with a gun on the back, a 50 sign,
// a row of ten shells, and the coat-of-arms plaque.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../kit/build";
import { ctex } from "../kit/paint";
import { Env, quadUp } from "../kit/world";
import { col, shiny, mesh, ell, board, text, block, tree } from "../kit/props";
import { hh } from "../kit/timeline";
import { F, CAMP, GUN, FARM, BOARD, SIGN50, PLAQUE, truckAt } from "./timeline";

const wheatTex = () => { const t = ctex("wheat", 512, 512, (g, r) => {
  g.fillStyle = "#d9b45a"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 16) { g.fillStyle = y % 32 ? "#c9a34c" : "#e4c46e"; g.fillRect(0, y, 512, 8); }
  for (let i = 0; i < 1400; i++) { g.strokeStyle = r() < 0.5 ? "rgba(150,112,40,0.6)" : "rgba(250,224,140,0.7)"; g.lineWidth = 2; const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 8); g.stroke(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const dirtTex = () => { const t = ctex("redDirt", 512, 512, (g, r) => {
  g.fillStyle = "#b8643f"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? "rgba(150,74,44,0.5)" : "rgba(214,140,96,0.5)"; g.fillRect(r() * 512, r() * 512, 2 + r() * 6, 2 + r() * 4); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const tally = (g: CanvasRenderingContext2D, b: string, e: string) => {
  g.fillStyle = "#6e4b33"; g.fillRect(0, 0, 800, 560); g.fillStyle = "#2f3b32"; g.fillRect(28, 28, 744, 504);
  text(g, "BULLETS", 400, 120, 90, "#f4f4ee"); text(g, b, 400, 220, 110, "#f6c62e");
  text(g, "EMUS", 400, 340, 90, "#f4f4ee"); text(g, e, 400, 444, 110, "#f6c62e");
};

export type Handles = ReturnType<typeof build>;
export const build = (root: THREE.Group, env: Env) => {
  const b = new Batch();
  const wheat = lam("wheatM", () => ({ map: wheatTex() })), dirt = lam("dirtM", () => ({ map: dirtTex() }));
  b.add(quadUp(-600, 600, -16, 600, 150, 150, 0), wheat);
  b.add(quadUp(-600, 600, -600, -24, 150, 150, 0), dirt);
  b.add(quadUp(-600, 600, -24, -16, 120, 2, 0.01), dirt);
  for (let x = -120; x <= 120; x += 4) b.add(boxGeo(V(x - 0.06, 0, -16.6), V(x + 0.06, 1.2, -16.48)), col("post", "#7a5a3c"));
  for (const y of [0.55, 1.0]) b.add(boxGeo(V(-120, y, -16.56), V(120, y + 0.02, -16.53)), col("wire", "#8a8d94"));
  // camp: tent, ammunition boxes, a table
  const cm = new THREE.Matrix4().makeTranslation(...CAMP);
  b.add(new THREE.ConeGeometry(2.6, 2.8, 4).rotateY(Math.PI / 4).translate(-5, 1.4, -3), col("tent", "#9a8f6a"), cm);
  for (let i = 0; i < 10; i++) b.add(boxGeo(V(-0.4, 0, -0.25), V(0.4, 0.35, 0.25)), col("ammo", "#55603a"), new THREE.Matrix4().makeTranslation(CAMP[0] + 2.2 + (i % 4) * 0.85, 0.36 * Math.floor(i / 4), CAMP[2] - 2.5));
  b.build(root);
  for (let i = 0; i < 18; i++) { const a = hh(i, 3) * Math.PI * 2, d = 50 + 90 * hh(i, 4); tree(root, Math.cos(a) * d, Math.sin(a) * d + 30, 8 + 4 * hh(i, 5), i); }
  block(root, FARM[0], FARM[2], 9, 7, 3.4, "#e6d6b8", 0);
  mesh(new THREE.CylinderGeometry(0.01, 6.6, 2.2, 4).rotateY(Math.PI / 4).translate(0, 4.5, 0), col("tin", "#a9b1b8"), root, FARM[0], 0, FARM[2]).scale.set(1, 1, 0.78);
  // the Lewis gun on its tripod
  const gun = new THREE.Group(); gun.position.set(...GUN); root.add(gun);
  const steel = shiny("#3d414c", "#888", 40);
  for (let k = 0; k < 3; k++) { const a = (k * 2 * Math.PI) / 3; const leg = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1).translate(0, 0.5, 0), steel, gun, 0.3 * Math.cos(a), 0, 0.3 * Math.sin(a)); leg.rotation.set(-0.3 * Math.sin(a), 0, 0.3 * Math.cos(a)); }
  const gunTop = new THREE.Group(); gunTop.position.y = 1.0; gun.add(gunTop);
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0).rotateX(Math.PI / 2).translate(0, 0, 0.3), steel, gunTop);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6).rotateX(Math.PI / 2).translate(0, 0, 1.0), steel, gunTop);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16).translate(0, 0.12, 0.2), steel, gunTop);
  // truck with a gun on the back
  const truck = new THREE.Group(); root.add(truck);
  const green = col("truckGreen", "#5d6b3a"), tyre = col("tyre", "#2a2a30");
  mesh(boxGeo(V(-2.6, 0.6, -1.0), V(0.4, 0.9, 1.0)), green, truck);
  mesh(boxGeo(V(0.4, 0.6, -0.95), V(2.0, 2.1, 0.95)), green, truck);
  mesh(boxGeo(V(1.0, 1.4, -0.97), V(2.02, 2.0, 0.97)), col("carGlass", "#bfe0ee"), truck);
  mesh(boxGeo(V(2.0, 0.6, -0.8), V(2.9, 1.3, 0.8)), green, truck);
  for (const x of [-1.8, 2.2]) for (const z of [-1.0, 1.0]) mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 14).rotateX(Math.PI / 2), tyre, truck, x, 0.45, z);
  const tgun = gunTop.clone(); tgun.position.set(-1.2, 1.6, 0); tgun.rotation.y = Math.PI / 2; truck.add(tgun);
  // tally boards
  const tal1 = board(root, "tally1", 800, 560, (g) => tally(g, "2,500", "50"), 2.2, 1.55, BOARD[0], 1.9, BOARD[2], 0);
  const tal2 = board(root, "tally2", 800, 560, (g) => tally(g, "9,860", "986"), 2.2, 1.55, BOARD[0], 1.9, BOARD[2], 0);
  for (const s of [-1, 1]) mesh(boxGeo(V(-0.05, 0, -0.05), V(0.05, 2.7, 0.05)), col("post", "#7a5a3c"), root, BOARD[0] + s * 1.05, 0, BOARD[2] + 0.05);
  // speed sign
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4).translate(0, 1.2, 0), col("pole", "#d7dae0"), root, SIGN50[0], 0, SIGN50[2] + 2.5);
  board(root, "sign50", 400, 400, (g) => { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(200, 200, 196, 0, 7); g.fill(); g.strokeStyle = "#d02a2a"; g.lineWidth = 46; g.beginPath(); g.arc(200, 200, 168, 0, 7); g.stroke(); text(g, "50", 200, 210, 180, "#1c1a22"); }, 0.9, 0.9, SIGN50[0], 2.3, SIGN50[2] + 2.45);
  // ten shells in a row
  const shells = new THREE.Group(); root.add(shells);
  const brass = shiny("#d9a63a", "#fff3c0", 70);
  for (let i = 0; i < 10; i++) mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10).translate(0, 0.11, 0), brass, shells, CAMP[0] + 7.6 + i * 0.18, 0, CAMP[2] + 6.0);
  // the plaque stage
  const pg = new THREE.Group(); pg.position.set(...PLAQUE); root.add(pg);
  mesh(quadUp(-30, 30, -30, 30, 8, 8, 0), col("stageFloor", "#4a3f6b"), pg);
  mesh(boxGeo(V(-4, 0, 1.0), V(4, 6, 1.4)), col("velvet", "#7a2e3a"), pg);
  board(pg, "crest", 700, 800, (g) => {
    g.fillStyle = "#e8b43a"; g.strokeStyle = "#1c1a22"; g.lineWidth = 18;
    g.beginPath(); g.moveTo(150, 120); g.lineTo(550, 120); g.lineTo(550, 470); g.quadraticCurveTo(540, 680, 350, 760); g.quadraticCurveTo(160, 680, 150, 470); g.closePath(); g.fill(); g.stroke();
    for (const [x, y] of [[250, 250], [450, 250], [350, 420], [260, 560], [440, 560]]) { g.fillStyle = "#ffffff"; g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5 - Math.PI / 2, rr = k % 2 ? 18 : 42; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } g.closePath(); g.fill(); }
  }, 2.6, 3.0, 0, 3.1, 0.95);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.9, 16).translate(0, 0.45, 0), col("plinth", "#c9bfae"), pg, s * 2.5, 0, -0.4);
  void env; void ell; void F;
  return { truck, tal1, tal2, shells, gunTop };
};

export const pose = (h: Handles, id: number, f: number) => {
  const p = truckAt(id, f);
  h.truck.visible = id === 3 || id === 5 || id === 11;
  h.truck.position.set(p[0], id === 5 ? 0.12 * Math.abs(Math.sin(f * 0.7)) : 0, p[2]);
  h.truck.rotation.set(id === 5 ? 0.04 * Math.sin(f * 0.9) : 0, id === 11 ? Math.PI : 0, id === 5 ? 0.05 * Math.sin(f * 0.53) : 0);
  h.tal1.visible = id === 6; h.tal2.visible = id === 12;
  h.shells.visible = id === 13;
  h.gunTop.rotation.y = id === 1 ? 0.25 * Math.sin(f * 0.11) : 0;
};
