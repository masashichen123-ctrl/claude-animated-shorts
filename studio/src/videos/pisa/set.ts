// Sets for "The Leaning Tower Is Also Bent": the piazza (lawn, cathedral, baptistery), the tower as a chain of storeys
// each tilted relative to the one below (lean + corrections = the bend), scaffolding, a mud patch, and a wonky table
// with a corrected stack of books.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../kit/build";
import { ctex } from "../kit/paint";
import { Env, quadUp } from "../kit/world";
import { col, mesh, ell } from "../kit/props";
import { hh, clamp01, easeOut } from "../kit/timeline";
import { F, TOWER, TABLE, LEVELS, CORRECT, builtAt, leanAt } from "./timeline";

const HEIGHTS = [11, 6.3, 6.3, 6.3, 6.3, 6.3, 6.3, 7];
const RADII = [7.8, 7.6, 7.6, 7.6, 7.6, 7.6, 7.6, 5.4];
const rad = (d: number) => (d * Math.PI) / 180;
const arcade = (key: string, n: number) => { const t = ctex(key, 1024, 256, (g) => {
  g.fillStyle = "#f2ece0"; g.fillRect(0, 0, 1024, 256);
  const w = 1024 / n;
  for (let i = 0; i < n; i++) { const x = i * w; g.fillStyle = "#d8cfbd"; g.beginPath(); g.moveTo(x + w * 0.18, 230); g.lineTo(x + w * 0.18, 100); g.arc(x + w / 2, 100, w * 0.32, Math.PI, 0); g.lineTo(x + w * 0.82, 230); g.closePath(); g.fill();
    g.fillStyle = "#b9ae99"; g.fillRect(x + w * 0.04, 40, w * 0.08, 200); }
  g.fillStyle = "#e6dccb"; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 236, 1024, 20);
}); t.wrapS = THREE.RepeatWrapping; return t; };
const stripeTex = () => { const t = ctex("duomoStripes", 256, 256, (g) => { for (let y = 0; y < 256; y += 32) { g.fillStyle = "#f2ece0"; g.fillRect(0, y, 256, 24); g.fillStyle = "#9aa0aa"; g.fillRect(0, y + 24, 256, 8); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

export type Handles = ReturnType<typeof build>;
export const build = (root: THREE.Group, env: Env) => {
  const b = new Batch();
  b.add(quadUp(-500, 500, -500, 500, 120, 120, 0), env.grass());
  b.add(quadUp(-60, 60, -50, -36, 20, 3, 0.02), col("path", "#d8cfbd"));
  b.build(root);
  // cathedral and baptistery behind (to the -x side)
  const stripes = lam("duomoM", () => ({ map: stripeTex() }));
  mesh(boxGeo(V(-90, 0, 10), V(-30, 22, 40), 6), stripes, root);
  mesh(boxGeo(V(-96, 0, 18), V(-90, 30, 32), 6), stripes, root);
  mesh(ell(9, 10, 9, 20), col("dome", "#c8643f"), root, -58, 22, 25);
  mesh(new THREE.CylinderGeometry(16, 16, 20, 24).translate(0, 10, 0), stripes, root, -140, 0, 30);
  mesh(ell(16, 12, 16, 24), col("baptDome", "#c8643f"), root, -140, 20, 30);
  // mud under the tower
  const mud = mesh(new THREE.CircleGeometry(14, 28).rotateX(-Math.PI / 2), col("towerMud", "#6e5338"), root, TOWER[0] + 2, 0.03, TOWER[2]); mud.scale.set(1.3, 1, 1);
  const puddle = mesh(new THREE.CircleGeometry(2.4, 20).rotateX(-Math.PI / 2), col("puddleP", "#5d7a90"), root, TOWER[0] + 9, 0.05, TOWER[2] - 9);
  // the tower: a chain of storeys
  const levels: THREE.Group[] = [];
  let parent: THREE.Object3D = root;
  for (let i = 0; i < LEVELS; i++) {
    const g = new THREE.Group(); parent.add(g);
    if (i === 0) g.position.set(...TOWER); else g.position.y = HEIGHTS[i - 1];
    const m = lam("arc" + (i === 0 ? 0 : i === 7 ? 7 : 1), () => ({ map: arcade("arcTex" + (i === 0 ? 0 : i === 7 ? 7 : 1), i === 0 ? 10 : i === 7 ? 8 : 14) }));
    mesh(new THREE.CylinderGeometry(RADII[i], RADII[Math.max(0, i - 1)] * (i === 0 ? 1 : 1), HEIGHTS[i], 32, 1, true).translate(0, HEIGHTS[i] / 2, 0), m, g);
    mesh(new THREE.CylinderGeometry(RADII[i] + 0.5, RADII[i] + 0.5, 0.45, 32).translate(0, HEIGHTS[i] - 0.2, 0), col("ledge", "#e6dccb"), g);
    if (i === 7) mesh(new THREE.CylinderGeometry(RADII[i] + 0.3, RADII[i] + 0.3, 0.4, 32).translate(0, HEIGHTS[i], 0), col("ledge", "#e6dccb"), g);
    levels.push(g); parent = g;
  }
  // scaffold (rides on the top built storey)
  const scaffold = new THREE.Group(); root.add(scaffold);
  const wood = col("scaffold", "#a8724a");
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; mesh(new THREE.CylinderGeometry(0.1, 0.1, 7).translate(0, 3.5, 0), wood, scaffold, 9 * Math.cos(a), 0, 9 * Math.sin(a)); }
  for (const y of [2.5, 5.5]) mesh(new THREE.TorusGeometry(9, 0.08, 4, 40).rotateX(Math.PI / 2), wood, scaffold, 0, y, 0);
  // wonky table + books
  const tg = new THREE.Group(); tg.position.set(...TABLE); root.add(tg);
  mesh(quadUp(-10, 10, -10, 10, 3, 3, 0), col("floorT", "#8a5a3c"), tg);
  mesh(boxGeo(V(-6, 0, 2), V(6, 4, 2.3)), col("wallT", "#e8dcc4"), tg);
  const top = new THREE.Group(); top.position.y = 0.95; top.rotation.z = -0.07; tg.add(top);
  mesh(boxGeo(V(-0.8, -0.04, -0.45), V(0.8, 0.04, 0.45)), col("tableTop", "#a8724a"), top);
  for (const [x, z, h] of [[-0.7, -0.38, 0.95], [-0.7, 0.38, 0.95], [0.7, -0.38, 0.84], [0.7, 0.38, 0.84]] as const) mesh(boxGeo(V(-0.04, 0, -0.04), V(0.04, h, 0.04)), col("tableLeg", "#8a5a3c"), tg, x, 0, z);
  const books: THREE.Group[] = []; let bp: THREE.Object3D = top;
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(); g.position.y = i === 0 ? 0.04 : 0.09; bp.add(g);
    mesh(boxGeo(V(-0.22, 0, -0.16), V(0.22, 0.09, 0.16)), col("book" + (i % 4), ["#c8443a", "#3f6fb5", "#2f8f8a", "#e2b93c"][i % 4]), g);
    books.push(g); bp = g;
  }
  const wedge = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 3).rotateZ(Math.PI / 2), col("wedge", "#f1efe6"), top, 0.18, 0.06, 0);
  void hh;
  return { levels, scaffold, books, wedge, mud, puddle };
};

export const pose = (h: Handles, id: number, f: number) => {
  const n = builtAt(id, f), lean = leanAt(id, f);
  h.levels.forEach((g, i) => {
    g.visible = i < n;
    g.rotation.z = -rad(i === 0 ? lean : CORRECT[i]);
  });
  // scaffold sits on top of the highest built storey during construction shots
  const building = id === 2 || id === 7 || id === 11;
  h.scaffold.visible = building;
  if (building) { const top = h.levels[Math.max(0, n - 1)]; top.updateWorldMatrix(true, false); const p = new THREE.Vector3(0, 0, 0).applyMatrix4(top.matrixWorld); h.scaffold.position.copy(p); h.scaffold.rotation.copy(top.getWorldQuaternion(new THREE.Quaternion()).equals(new THREE.Quaternion()) ? new THREE.Euler() : new THREE.Euler().setFromQuaternion(top.getWorldQuaternion(new THREE.Quaternion()))); }
  // books: a wedge goes under, then each book corrects a little, like the storeys
  const u = id === 8 ? clamp01((f - F(8, 0.35)) / 20) : 0;
  h.wedge.visible = id === 8 && f > F(8, 0.35);
  h.books.forEach((g, i) => (g.rotation.z = i === 0 ? 0 : 0.016 * easeOut(u) * (i > 1 ? 1 : 0)));
  h.puddle.visible = id <= 5;
};
