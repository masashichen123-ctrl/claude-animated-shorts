// Sets for "The Letter That Came by Missile": the sea, the submarine with its winged missile, the Mayport air station
// (runway, hangar, palm trees, a podium), a post office, a road with a mail truck and a "delivery" missile, a house with
// a mailbox, and a museum.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../kit/build";
import { ctex } from "../kit/paint";
import { Env, quadUp } from "../kit/world";
import { col, shiny, mesh, ell, board, text, block, tree } from "../kit/props";
import { hh, V3, add } from "../kit/timeline";
import { F, SUB, RUNWAY, POST, ROAD, HOUSE, MUSEUM, LAUNCH, missileAt, truckX, vanAt } from "./timeline";

const makeMissile = (parent: THREE.Object3D) => {
  const g = new THREE.Group(); parent.add(g);
  const silver = shiny("#c9ccd2", "#ffffff", 70);
  mesh(new THREE.CapsuleGeometry(0.55, 7.5, 8, 16).rotateX(Math.PI / 2), silver, g);
  mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 16), col("intake", "#3d414c"), g, 0, 0, -4.2);
  const wing = new THREE.Shape(); wing.moveTo(0, -1.2); wing.lineTo(3.6, 1.4); wing.lineTo(3.6, 2.2); wing.lineTo(0, 1.4); wing.closePath();
  for (const s of [-1, 1]) { const w = mesh(new THREE.ExtrudeGeometry(wing, { depth: 0.08, bevelEnabled: false }).rotateX(Math.PI / 2), silver, g, 0, 0.04, 0); w.scale.x = s; }
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(1.4, 2.0); fin.lineTo(2.2, 2.0); fin.lineTo(2.2, 0); fin.closePath();
  mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.08, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(0.04, 0.3, 2.0), silver, g);
  mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.4, 10).rotateX(Math.PI / 2), col("redBand", "#c8202a"), g, 0, 0, -2.5).scale.set(4.2, 4.2, 1);
  return g;
};
const sack = (parent: THREE.Object3D, x: number, y: number, z: number, s = 1) => { const m = mesh(ell(0.35 * s, 0.45 * s, 0.3 * s, 10), col("sack", "#cbb48a"), parent, x, y + 0.4 * s, z); m.rotation.z = (hh(x * 10 + z, 1) - 0.5) * 0.6; return m; };
const palm = (parent: THREE.Object3D, x: number, z: number, i: number) => {
  mesh(new THREE.CylinderGeometry(0.18, 0.28, 8, 7).translate(0, 4, 0), col("palmTrunk", "#8a6a4a"), parent, x, 0, z).rotation.z = (hh(i, 1) - 0.5) * 0.2;
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const fr = mesh(ell(2.4, 0.15, 0.6, 8), col("frond", "#4f9a46"), parent, x + 1.6 * Math.cos(a), 8, z + 1.6 * Math.sin(a)); fr.rotation.set(0, -a, -0.35); }
};

export type Handles = ReturnType<typeof build>;
export const build = (root: THREE.Group, env: Env) => {
  env.sea(-100);
  const b = new Batch();
  b.add(boxGeo(V(-700, -1, -1500), V(700, 0.3, -100)), col("land", "#d9c896"));
  b.add(quadUp(-700, 700, -1500, -104, 140, 280, 0.31), env.grass());
  b.add(quadUp(RUNWAY[0] - 7, RUNWAY[0] + 7, RUNWAY[2] - 160, RUNWAY[2] + 36, 1, 1, 0.33), col("runway", "#6c6f78"));
  for (let z = RUNWAY[2] - 150; z < RUNWAY[2] + 30; z += 10) b.add(quadUp(-0.2, 0.2, z, z + 5, 1, 1, 0.34), col("lineW", "#f1efe6"));
  b.add(quadUp(ROAD[0] - 200, ROAD[0] + 200, ROAD[2] - 4, ROAD[2] + 4, 1, 1, 0.33), col("road", "#6c6f78"));
  b.build(root);
  // air station
  block(root, RUNWAY[0] + 26, RUNWAY[2] - 20, 24, 18, 9, "#d8dade", 0);
  block(root, RUNWAY[0] - 22, RUNWAY[2] - 40, 6, 6, 14, "#f1efe6", 1);
  for (let i = 0; i < 10; i++) palm(root, RUNWAY[0] + (i % 2 ? 14 : -14), RUNWAY[2] - 6 - i * 9, i);
  const podium = new THREE.Group(); podium.position.set(RUNWAY[0] - 1.5, 0.33, RUNWAY[2] - 6.8); root.add(podium);
  mesh(boxGeo(V(-0.5, 0, -0.35), V(0.5, 1.1, 0.35)), col("podiumW", "#7a4a26"), podium);
  mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4).translate(0, 1.3, -0.2), col("mic", "#2a2a30"), podium);
  board(podium, "bunting", 600, 200, (g) => { for (let k = 0; k < 6; k++) { g.fillStyle = ["#c8202a", "#f4f4ee", "#2f5f9a"][k % 3]; g.fillRect(k * 100, 0, 100, 200); } }, 0.95, 0.32, 0, 0.75, -0.36);
  // submarine with launcher and the missile
  const sg = new THREE.Group(); sg.position.set(...SUB); root.add(sg);
  const hull = shiny("#2a2d36", "#666", 30);
  mesh(new THREE.CapsuleGeometry(2.4, 40, 8, 16).rotateX(Math.PI / 2), hull, sg, 0, 0.4, 6);
  mesh(boxGeo(V(-1, 2.4, 10), V(1, 6.5, 15)), hull, sg);
  mesh(new THREE.CylinderGeometry(2.0, 2.0, 7, 16, 1, false).rotateX(Math.PI / 2), hull, sg, 0, 2.6, 3.5);
  mesh(boxGeo(V(-0.6, 2.4, -6), V(0.6, 2.7, 1)), col("rail", "#55535d"), sg);
  board(sg, "barbero", 600, 140, (g) => { g.fillStyle = "#2a2d36"; g.fillRect(0, 0, 600, 140); text(g, "317", 300, 74, 100, "#f4f4ee"); }, 2.0, 0.5, -1.02, 4.8, 12.5, -Math.PI / 2);
  const missile = makeMissile(root);
  const sacks = new THREE.Group(); root.add(sacks);
  for (let i = 0; i < 8; i++) sack(sacks, SUB[0] + 1.6 + (i % 4) * 0.6, 2.4 + 0.5 * Math.floor(i / 4), SUB[2] - 4 + (i % 2) * 0.5, 0.8);
  // landed sacks at the runway
  const landed = new THREE.Group(); root.add(landed);
  for (let i = 0; i < 12; i++) sack(landed, RUNWAY[0] + 2 + (i % 4) * 0.7, 0.33 + 0.5 * Math.floor(i / 4) * 0.8, RUNWAY[2] - 0.8 + (i % 3) * 0.4, 0.8);
  // post office
  const pg = new THREE.Group(); pg.position.set(...POST); root.add(pg);
  mesh(quadUp(-9, 9, -9, 3, 3, 3, 0.35), col("poFloor", "#b9b3a8"), pg);
  mesh(boxGeo(V(-9, 0.3, 3), V(9, 4.8, 3.3)), col("poWall", "#d8e0c8"), pg);
  mesh(boxGeo(V(-3, 0.3, 0.6), V(3, 1.4, 1.2)), col("poCounter", "#7a4a26"), pg);
  board(pg, "poSign", 700, 180, (g) => { g.fillStyle = "#2f5f9a"; g.fillRect(0, 0, 700, 180); text(g, "POST OFFICE", 350, 94, 96, "#f4f4ee"); }, 3.8, 1.0, 0, 3.8, 2.97);
  for (let i = 0; i < 10; i++) sack(pg, -6 + (i % 5) * 0.8, 0.3 + 0.6 * Math.floor(i / 5), 2.0, 0.9);
  // road: mail truck and a "delivery" missile
  const truck = new THREE.Group(); root.add(truck);
  mesh(boxGeo(V(-2.6, 0.6, -1.1), V(1.6, 2.8, 1.1)), col("mailTruck", "#f1efe6"), truck);
  mesh(boxGeo(V(1.6, 0.6, -1.05), V(3.0, 2.2, 1.05)), col("mailTruckCab", "#2f5f9a"), truck);
  mesh(boxGeo(V(2.2, 1.4, -1.07), V(3.02, 2.0, 1.07)), col("carGlass", "#bfe0ee"), truck);
  for (const x of [-1.6, 2.2]) for (const z of [-1.1, 1.1]) mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 14).rotateX(Math.PI / 2), col("tyre", "#2a2a30"), truck, x, 0.45, z);
  for (let i = 0; i < 14; i++) sack(truck, -2.2 + (i % 5) * 0.85, 2.6 + 0.55 * Math.floor(i / 5), -0.6 + (i % 2) * 0.9, 0.9);
  const van = makeMissile(root);
  const vanLabel = board(van, "delivery", 700, 160, (g) => { g.fillStyle = "#f6c62e"; g.fillRect(0, 0, 700, 160); text(g, "DELIVERY", 350, 84, 100, "#1c1a22"); }, 3.2, 0.7, -0.6, 0, 0.5, -Math.PI / 2);
  // house with a mailbox (a missile lands beside it)
  block(root, HOUSE[0] - 1, HOUSE[2] + 9, 9, 7, 5, "#e8d9b0", 3);
  for (let i = 0; i < 4; i++) tree(root, HOUSE[0] - 12 + i * 8, HOUSE[2] + 16, 6, i);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1).translate(0, 0.55, 0), col("mbPost", "#6e4b33"), root, HOUSE[0] + 1, 0.33, HOUSE[2]);
  mesh(boxGeo(V(-0.25, 1.1, -0.15), V(0.25, 1.4, 0.2)), col("mailbox", "#2f5f9a"), root, HOUSE[0] + 1, 0.33, HOUSE[2]);
  const stuck = makeMissile(root); stuck.position.set(HOUSE[0] - 1.5, 2.2, HOUSE[2] + 0.5); stuck.rotation.set(-1.1, 0.3, 0);
  // museum
  const mg = new THREE.Group(); mg.position.set(...MUSEUM); root.add(mg);
  mesh(quadUp(-12, 12, -12, 4, 3, 3, 0.35), col("museumFloor", "#6e4b33"), mg);
  mesh(boxGeo(V(-12, 0.3, 4), V(12, 7, 4.4)), col("museumWall", "#efe6d2"), mg);
  mesh(boxGeo(V(-5, 0.3, -1), V(5, 0.8, 2)), col("plinthM", "#c9bfae"), mg);
  const exhibit = makeMissile(mg); exhibit.position.set(0, 2.0, 0.5); exhibit.rotation.y = Math.PI / 2;
  board(mg, "letterFrame", 500, 360, (g) => { g.fillStyle = "#c9a24a"; g.fillRect(0, 0, 500, 360); g.fillStyle = "#fbf6e6"; g.fillRect(30, 30, 440, 300); g.strokeStyle = "#8a8d94"; g.lineWidth = 4; g.beginPath(); g.moveTo(30, 30); g.lineTo(250, 190); g.lineTo(470, 30); g.stroke(); g.fillStyle = "#c8202a"; g.fillRect(380, 50, 60, 70); text(g, "MISSILE MAIL", 250, 270, 40, "#1c1a22"); }, 1.4, 1.0, 2.4, 1.7, 3.95);
  board(mg, "plaque1959", 400, 200, (g) => { g.fillStyle = "#3a2a22"; g.fillRect(0, 0, 400, 200); text(g, "1959", 200, 104, 110, "#e8c45a"); }, 1.0, 0.5, 0, 0.62, -1.02);
  return { missile, sacks, landed, truck, van, vanLabel, stuck };
};

export const pose = (h: Handles, id: number, f: number) => {
  const m = missileAt(id, f);
  h.missile.visible = id === 1 || (id >= 3 && id <= 7);
  h.missile.position.set(...m.p); h.missile.rotation.set(m.pitch, 0, id === 1 ? 0.12 : 0);
  if (id === 6 || id === 7) { h.missile.position.set(...add(RUNWAY, 0.5, 0.95, -2)); h.missile.rotation.set(0, 0.2, 0); }
  h.sacks.visible = id === 4;
  h.landed.visible = id === 7;
  h.truck.visible = id === 9; h.truck.position.set(ROAD[0] + truckX(f), 0.33, ROAD[2]);
  const u = id === 10 ? vanAt(f) : 0;
  h.van.visible = id === 10 && f < F(10, 0.65);
  h.van.position.set(ROAD[0] + 34, 2.0 + 30 * u * u, ROAD[2] + 1 - 20 * u); h.van.rotation.set(0.6 * u, 0, 0);
  h.stuck.visible = id === 8 && f >= F(8, 0.65);
  void LAUNCH;
};
