// Sets for "The Morning Sweden Switched Sides": a Swedish main street (red wooden houses, birches, "H" signs, a street
// clock, a café table with a radio) with traffic that changes sides, a border road, an insurance office, and Iceland.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../kit/build";
import { ctex } from "../kit/paint";
import { Env, quadUp } from "../kit/world";
import { col, mesh, ell, board, text, makeCar, block } from "../kit/props";
import { hh, lerp, V3, add } from "../kit/timeline";
import { F, TOWN, BORDER, OFFICE, ICE, LANE, sideAt, flowAt } from "./timeline";

const hSign = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#f6c62e"; g.fillRect(0, 0, 300, 300); g.strokeStyle = "#1c1a22"; g.lineWidth = 16; g.strokeRect(8, 8, 284, 284);
  g.fillStyle = "#1c1a22"; g.fillRect(70, 60, 40, 180); g.fillRect(190, 60, 40, 180); g.fillRect(100, 130, 110, 36);
  g.beginPath(); g.moveTo(230, 40); g.lineTo(280, 90); g.lineTo(230, 140); g.closePath(); g.fill();
};
const clockFace = (h: number, m: number) => (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#f8f6ee"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = "#1c1a22"; g.lineWidth = 12; g.stroke();
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillRect(128 + 100 * Math.sin(a) - 4, 128 - 100 * Math.cos(a) - 4, 8, 8); }
  const ha = ((h % 12) + m / 60) / 12 * Math.PI * 2, ma = (m / 60) * Math.PI * 2;
  g.lineCap = "round"; g.lineWidth = 14; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 55 * Math.sin(ha), 128 - 55 * Math.cos(ha)); g.stroke();
  g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 90 * Math.sin(ma), 128 - 90 * Math.cos(ma)); g.stroke();
};
const chart = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 800, 560); g.strokeStyle = "#1c1a22"; g.lineWidth = 10; g.strokeRect(5, 5, 790, 550);
  text(g, "INSURANCE CLAIMS", 400, 70, 60, "#1c1a22");
  g.lineWidth = 6; g.beginPath(); g.moveTo(80, 120); g.lineTo(80, 500); g.lineTo(760, 500); g.stroke();
  g.strokeStyle = "#d02a2a"; g.lineWidth = 16; g.beginPath(); g.moveTo(100, 180); g.lineTo(300, 200); g.lineTo(420, 210); g.lineTo(500, 370); g.lineTo(740, 390); g.stroke();
  text(g, "-40%", 620, 300, 90, "#2f8f4a");
};
const road = (b: Batch, o: V3, len = 200) => {
  const m = new THREE.Matrix4().makeTranslation(...o);
  b.add(quadUp(-len, len, -4, 4, 1, 1, 0.01), col("asphaltSw", "#6c6f78"), m);
  for (let x = -len; x < len; x += 5) b.add(quadUp(x, x + 2.5, -0.08, 0.08, 1, 1, 0.02), col("lineW", "#f1efe6"), m);
  for (const z of [-3.9, 3.9]) b.add(quadUp(-len, len, z - 0.06, z + 0.06, 1, 1, 0.02), col("lineW", "#f1efe6"), m);
};
const birch = (parent: THREE.Object3D, x: number, z: number, h: number, i: number) => {
  mesh(new THREE.CylinderGeometry(0.12, 0.16, h * 0.6, 7).translate(0, h * 0.3, 0), col("birch", "#ece8de"), parent, x, 0, z);
  for (let k = 0; k < 3; k++) mesh(ell(h * 0.17, h * 0.22, h * 0.17, 10), col("birchLeaf" + (i % 2), i % 2 ? "#8cbf5a" : "#7ab04c"), parent, x + (hh(i, k) - 0.5) * h * 0.25, h * (0.62 + 0.12 * k), z + (hh(i, k + 4) - 0.5) * h * 0.25);
};
/** 8 cars on the main street: x position wraps, lane from direction + side (0 = left, 1 = right) */
const CARS = Array.from({ length: 8 }, (_, i) => ({ x0: -60 + i * 15 + 4 * hh(i, 1), dir: i % 2 ? -1 : 1, col: ["#d8453c", "#3f76b8", "#e2b93c", "#5c9a56", "#f1efe6", "#7b4a8c", "#2f8f8a", "#d0683a"][i] }));

export type Handles = ReturnType<typeof build>;
export const build = (root: THREE.Group, env: Env) => {
  const b = new Batch();
  const grass = env.grass();
  b.add(quadUp(-400, 400, -300, 300, 100, 75, 0), grass);
  road(b, TOWN); road(b, BORDER, 120); road(b, ICE, 200);
  for (const z of [-6.5, 6.5]) b.add(quadUp(-120, 120, z - 2.4, z + 2.4, 1, 1, 0.1), col("paveSw", "#c9c3b8"), new THREE.Matrix4().makeTranslation(...TOWN));
  b.build(root);
  for (let i = 0; i < 14; i++) { const s = i % 2 ? 1 : -1, x = -60 + Math.floor(i / 2) * 18; block(root, TOWN[0] + x, TOWN[2] + s * 15, 12, 9, 6 + 3 * hh(i, 2), ["#9c2f2a", "#a63a2e", "#e8d9b0", "#9c2f2a"][i % 4], i); }
  for (let i = 0; i < 16; i++) birch(root, TOWN[0] - 70 + i * 9, TOWN[2] + (i % 2 ? 9.5 : -9.5), 6 + 2 * hh(i, 3), i);
  for (const x of [-30, 10, 40]) { mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6).translate(0, 1.3, 0), col("pole", "#d7dae0"), root, TOWN[0] + x, 0, TOWN[2] - 4.6); board(root, "hSign", 300, 300, hSign, 0.9, 0.9, TOWN[0] + x, 2.4, TOWN[2] - 4.65); }
  // street clock + café table with a radio
  mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.2).translate(0, 1.6, 0), col("lampPost", "#2f3440"), root, TOWN[0] + 4.2, 0, TOWN[2] - 9.6);
  const c1 = board(root, "clock100", 256, 256, clockFace(1, 0), 0.8, 0.8, TOWN[0] + 4.2, 3.4, TOWN[2] - 9.5, Math.PI);
  const c5 = board(root, "clock459", 256, 256, clockFace(4, 59), 0.8, 0.8, TOWN[0] + 4.2, 3.4, TOWN[2] - 9.5, Math.PI);
  mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 16).translate(0, 0.9, 0), col("cafeTable", "#f1efe6"), root, TOWN[0] - 1.2, 0, TOWN[2] - 9.4);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9).translate(0, 0.45, 0), col("lampPost", "#2f3440"), root, TOWN[0] - 1.2, 0, TOWN[2] - 9.4);
  const radio = new THREE.Group(); radio.position.set(TOWN[0] - 1.2, 0.93, TOWN[2] - 9.3); root.add(radio);
  mesh(boxGeo(V(-0.25, 0, -0.1), V(0.25, 0.3, 0.1)), col("radio", "#8a5a3c"), radio);
  board(radio, "radioFace", 300, 180, (g) => { g.fillStyle = "#e8d9b0"; g.fillRect(0, 0, 300, 180); g.fillStyle = "#3a2a22"; for (let k = 0; k < 6; k++) g.fillRect(20, 20 + k * 24, 140, 10); g.beginPath(); g.arc(225, 90, 50, 0, 7); g.fill(); g.fillStyle = "#f6c62e"; g.beginPath(); g.arc(225, 90, 20, 0, 7); g.fill(); }, 0.44, 0.26, 0, 0.15, 0.105, Math.PI);
  // police barrier (the ban)
  const barrier = new THREE.Group(); barrier.position.set(TOWN[0] + 2, 0, TOWN[2]); root.add(barrier);
  const stripes = ctex("barStripesSw", 256, 32, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#f4f4ee" : "#d02a2a"; g.fillRect(k * 32, 0, 32, 32); } });
  mesh(boxGeo(V(-0.1, 0.9, -4), V(0.1, 1.1, 4)), lam("barSw", () => ({ map: stripes })), barrier);
  for (const z of [-4, 4]) mesh(boxGeo(V(-0.15, 0, -0.15), V(0.15, 1.1, 0.15)), col("barrierPost", "#55535d"), barrier, 0, 0, z);
  // traffic
  const cars = CARS.map((c, i) => makeCar(root, c.col, "sw" + i));
  // border: sign + a second car head-on
  board(root, "norge", 600, 200, (g) => { g.fillStyle = "#2f5f9a"; g.fillRect(0, 0, 600, 200); g.strokeStyle = "#ffffff"; g.lineWidth = 10; g.strokeRect(10, 10, 580, 180); text(g, "NORGE", 300, 104, 110, "#ffffff"); }, 2.4, 0.8, BORDER[0] + 4, 2.6, BORDER[2] - 4.8);
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4).translate(0, 1.2, 0), col("pole", "#d7dae0"), root, BORDER[0] + 4, 0, BORDER[2] - 4.75);
  const bA = makeCar(root, "#3f76b8", "bA"); bA.g.position.set(BORDER[0] - 3.2, 0, BORDER[2] - LANE);
  const bB = makeCar(root, "#d8453c", "bB"); bB.g.position.set(BORDER[0] + 3.2, 0, BORDER[2] - LANE); bB.g.rotation.y = Math.PI;
  // insurance office
  const ob = new Batch(), om = new THREE.Matrix4().makeTranslation(...OFFICE);
  ob.add(quadUp(-8, 8, -8, 3, 4, 3, 0), col("officeFloor", "#6e4b33"), om);
  ob.add(boxGeo(V(-8, 0, 3), V(8, 4.4, 3.3)), col("officeWall", "#e9e4d6"), om);
  ob.add(boxGeo(V(-1.4, 0, -0.4), V(1.4, 0.8, 0.5)), col("desk", "#7a4a26"), om);
  ob.build(root);
  board(root, "claimsChart", 800, 560, chart, 3.2, 2.24, OFFICE[0], 2.4, OFFICE[2] + 2.95);
  // doom-sayer's calendar + sign
  const months = ["SEPT", "OCT", "NOV", "DEC"].map((m, i) => board(root, "month" + m, 300, 360, (g) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 300, 360); g.fillStyle = "#d02a2a"; g.fillRect(0, 0, 300, 90); text(g, m, 150, 50, 64, "#ffffff"); text(g, "1967", 150, 230, 80, "#1c1a22"); }, 1.0, 1.2, TOWN[0] + 9 + i * 0.001, 2.1, TOWN[2] - 4.9 - i * 0.002));
  // Iceland: mountains with snow
  for (let i = 0; i < 6; i++) { const x = ICE[0] - 120 + i * 48, z = ICE[2] + 120 + 30 * hh(i, 1), h = 40 + 30 * hh(i, 2); mesh(new THREE.ConeGeometry(h * 0.9, h, 7).translate(0, h / 2, 0), col("mtn", "#6f7a6a"), root, x, 0, z); mesh(new THREE.ConeGeometry(h * 0.28, h * 0.31, 7).translate(0, h * 0.86, 0), col("snow", "#f4f4ee"), root, x, 0, z); }
  const ice = [0, 1, 2].map((i) => { const c = makeCar(root, ["#f1efe6", "#3f76b8", "#e2b93c"][i], "ic" + i); c.g.position.set(ICE[0] - 8 + i * 9, 0, ICE[2] + (i % 2 ? -LANE : LANE)); c.g.rotation.y = i % 2 ? Math.PI : 0; return c; });
  board(root, "hSignIce", 300, 300, hSign, 1.0, 1.0, ICE[0] + 4, 2.4, ICE[2] - 4.65);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6).translate(0, 1.3, 0), col("pole", "#d7dae0"), root, ICE[0] + 4, 0, ICE[2] - 4.6);
  return { cars, c1, c5, radio, barrier, bA, bB, months, ice };
};

/** where car i is in shot id at frame f (cast.ts seats drivers and hangs learner plates from this) */
export const carPose = (i: number, id: number, f: number) => {
  const side = sideAt(id, f), flow = flowAt(id, f), t = f / 30, d = CARS[i], v = 9 * flow;
  let x = d.x0 + d.dir * v * (id === 5 ? (f - F(5, 0.9)) / 30 : t);
  x = ((x + 70) % 140 + 140) % 140 - 70;
  if (i === 0 && id === 3) x = 3.2 + 0.6 * (t - F(3) / 30);
  if (i === 0 && id === 10) x = 1.5 + 0.25 * (t - F(10) / 30);
  const z = d.dir > 0 ? lerp(-LANE, LANE, side) : lerp(LANE, -LANE, side);
  return { x: TOWN[0] + x, z: TOWN[2] + z, dir: d.dir };
};

export const pose = (h: Handles, id: number, f: number) => {
  h.cars.forEach((c, i) => {
    const p = carPose(i, id, f);
    c.g.position.set(p.x, 0, p.z);
    c.g.rotation.y = p.dir > 0 ? 0 : Math.PI;
    c.g.visible = id !== 2 && id !== 9 && id !== 12;
    c.cabin.visible = !(i === 0 && (id === 3 || id === 10));
  });
  h.c1.visible = id === 4; h.c5.visible = id === 5 || id === 6;
  h.barrier.visible = id === 4;
  h.months.forEach((m, i) => (m.visible = id === 8 && i === Math.min(3, Math.floor(((f - F(8)) / Math.max(1, F(9) - F(8))) * 4))));
  void add; void h.radio; void h.bA; void h.bB; void h.ice;
};
