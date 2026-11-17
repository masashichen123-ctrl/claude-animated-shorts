// Sets for "The 125 Million Dollar Mix-Up": deep space with Mars and the orbiter (planned vs actual path), a Colorado
// workshop (pounds), a California control room (newtons), a balance scale, a pile of money, and a kitchen.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../kit/build";
import { ctex } from "../kit/paint";
import { NOINK } from "../kit/ink";
import { Env, quadUp } from "../kit/world";
import { col, shiny, mesh, ell, board, text } from "../kit/props";
import { clamp01, easeOut, V3, add } from "../kit/timeline";
import { F, SPACE, MARS, MARS_R, LAB, CTRL, KITCHEN, probeAt, heatAt, LOST } from "./timeline";

const SPACE_SHOTS = new Set([1, 2, 6, 7, 8, 14, 15]);
const starTex = () => ctex("stars", 1024, 512, (g, r) => {
  g.fillStyle = "#070a1c"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 900; i++) { const s = r() < 0.92 ? 1 : 2; g.fillStyle = `rgba(255,255,${200 + Math.floor(r() * 55)},${0.4 + 0.6 * r()})`; g.fillRect(r() * 1024, r() * 512, s, s); }
});
const marsTex = () => ctex("marsSurface", 1024, 512, (g, r) => {
  g.fillStyle = "#c8643f"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? "rgba(140,62,38,0.45)" : "rgba(222,140,92,0.4)"; g.beginPath(); g.ellipse(r() * 1024, r() * 512, 20 + r() * 120, 10 + r() * 50, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 40; i++) { const x = r() * 1024, y = r() * 512, s = 4 + r() * 16; g.strokeStyle = "rgba(90,40,26,0.6)"; g.lineWidth = 3; g.beginPath(); g.arc(x, y, s, 0, 7); g.stroke(); }
  g.fillStyle = "#f4ece4"; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 486, 1024, 26);
});
const screenTex = () => ctex("ctrlScreen", 1024, 512, (g) => {
  g.fillStyle = "#0d1a2e"; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#c8643f"; g.beginPath(); g.arc(760, 300, 150, 0, 7); g.fill();
  g.setLineDash([18, 14]); g.strokeStyle = "#7fe08a"; g.lineWidth = 8; g.beginPath(); g.moveTo(60, 120); g.quadraticCurveTo(560, 80, 760, 120); g.stroke();
  g.setLineDash([]); g.strokeStyle = "#7fd0f0"; g.lineWidth = 3; for (let x = 0; x < 1024; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
});
const monTex = () => ctex("monitor", 256, 192, (g) => { g.fillStyle = "#12233a"; g.fillRect(0, 0, 256, 192); g.strokeStyle = "#7fe08a"; g.lineWidth = 5; g.beginPath(); g.moveTo(10, 150); for (let x = 10; x < 250; x += 20) g.lineTo(x, 100 + 40 * Math.sin(x / 30)); g.stroke(); });
const cashTex = () => ctex("cash", 256, 128, (g) => { g.fillStyle = "#8fbf7a"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#3f6a3a"; g.lineWidth = 8; g.strokeRect(8, 8, 240, 112); g.fillStyle = "#3f6a3a"; g.beginPath(); g.arc(128, 64, 30, 0, 7); g.fill(); g.fillStyle = "#e6d27a"; g.fillRect(110, 0, 36, 128); });
const glowTex = () => ctex("heatGlow", 256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(0.35, "rgba(255,150,60,0.8)"); gr.addColorStop(1, "rgba(255,80,20,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });

/** a simple roofless room: floor, back wall (z = +3) and two side walls, at origin o */
const room = (b: Batch, o: V3, wall: string, floor: string) => {
  const m = new THREE.Matrix4().makeTranslation(...o);
  b.add(quadUp(-9, 9, -9, 3, 4, 3, 0), col("floor" + floor, floor), m);
  b.add(boxGeo(V(-9, 0, 3), V(9, 4.6, 3.3)), col("wall" + wall, wall), m);
  for (const x of [-9.3, 9]) b.add(boxGeo(V(x, 0, -9), V(x + 0.3, 4.6, 3.3)), col("wall" + wall, wall), m);
};

export type Handles = ReturnType<typeof build>;
export const build = (root: THREE.Group, _env: Env) => {
  // ---- space ----
  const stars = new THREE.Mesh(new THREE.SphereGeometry(1050, 32, 16), new THREE.MeshBasicMaterial({ map: starTex(), side: THREE.BackSide, depthWrite: false, fog: false }));
  stars.renderOrder = -0.9; stars.frustumCulled = false; stars.layers.set(NOINK); root.add(stars);
  const mars = mesh(new THREE.SphereGeometry(MARS_R, 48, 32), lam("marsM", () => ({ map: marsTex() })), root, ...MARS);
  mars.rotation.set(0.3, 0.8, 0.1); mars.castShadow = false;
  const atm = new THREE.Mesh(new THREE.SphereGeometry(MARS_R * 1.05, 48, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.55, 0.35), transparent: true, opacity: 0.25, side: THREE.BackSide, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  atm.position.set(...MARS); atm.layers.set(NOINK); root.add(atm);
  const probe = new THREE.Group(); root.add(probe);
  const gold = shiny("#d9a63a", "#fff3c0", 70);
  mesh(boxGeo(V(-0.7, -0.7, -0.7), V(0.7, 0.9, 0.7)), gold, probe);
  const panelM = lam("solar", () => ({ map: ctex("solarTex", 256, 64, (g) => { g.fillStyle = "#24407a"; g.fillRect(0, 0, 256, 64); g.strokeStyle = "#9fb8e0"; g.lineWidth = 2; for (let x = 0; x < 256; x += 21) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); } }) }));
  mesh(boxGeo(V(0.7, 0, -0.6), V(5.5, 0.06, 0.6)), panelM, probe);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9).rotateZ(Math.PI / 2), col("strut", "#9aa0aa"), probe, 0.9, 0.03, 0);
  const dish = mesh(new THREE.ConeGeometry(0.7, 0.35, 20, 1, true), col("dish", "#f1efe6"), probe, 0, 1.25, 0); dish.rotation.x = Math.PI; (dish.material as THREE.Material).side = THREE.DoubleSide;
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) mesh(new THREE.ConeGeometry(0.12, 0.3, 10), col("nozzle", "#55535d"), probe, x, -0.85, z).rotation.x = Math.PI;
  const glowM = new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(2.0, 1.4, 0.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const glow = new THREE.Sprite(glowM); glow.layers.set(NOINK); probe.add(glow);
  // planned (dashed green) and actual (red) paths
  const tube = (pts: V3[], c: THREE.Color) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V(...p))), 60, 0.35, 6), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); m.layers.set(NOINK); root.add(m); return m; };
  const planned = tube([add(SPACE, 0, 0, 0), add(SPACE, 0, 6, 80), add(SPACE, 0, 30, 180), add(SPACE, 0, 90, 300)], new THREE.Color(0.4, 1.4, 0.5));
  const actual = tube([add(SPACE, 0, 0, 0), add(SPACE, 0, -14, 40), add(SPACE, 0, -60, 160), add(SPACE, 0, -180, 310)], new THREE.Color(1.6, 0.3, 0.25));

  // ---- Colorado workshop ----
  const b = new Batch();
  room(b, LAB, "#e8dcc4", "#b9b3a8");
  room(b, CTRL, "#cfd8e4", "#5d6b7f");
  b.add(boxGeo(V(-0.9, 0, 0.4), V(0.9, 0.9, 1.6)), col("bench", "#8a5a3c"), new THREE.Matrix4().makeTranslation(...LAB));
  b.add(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 16).translate(0, 1.55, 1.0), col("tank", "#d7dae0"), new THREE.Matrix4().makeTranslation(...LAB));
  b.add(new THREE.ConeGeometry(0.35, 0.6, 16, 1, true).translate(0, 0.6, 1.0), col("nozzle", "#55535d"), new THREE.Matrix4().makeTranslation(LAB[0], LAB[1] + 0.3, LAB[2]));
  b.add(boxGeo(V(4.6, 0, -0.6), V(7.4, 0.95, 1.2)), col("table", "#a8724a"), new THREE.Matrix4().makeTranslation(...LAB));
  // control room desks + monitors
  for (const x of [-4.5, -1.5, 1.5]) {
    const m = new THREE.Matrix4().makeTranslation(CTRL[0] + x, 0, CTRL[2] - 0.8);
    b.add(boxGeo(V(-1.2, 0, -0.5), V(1.2, 0.85, 0.5)), col("desk", "#9aa0aa"), m);
    b.add(boxGeo(V(-0.45, 0.85, 0.1), V(0.45, 1.5, 0.2)), col("monBack", "#2c2f38"), m);
  }
  b.add(boxGeo(V(3.5, 0, -2.2), V(6.1, 0.2, -0.8)), col("pallet", "#a8724a"), new THREE.Matrix4().makeTranslation(...CTRL));
  // kitchen
  const km = new THREE.Matrix4().makeTranslation(...KITCHEN);
  b.add(quadUp(-6, 6, -8, 3, 3, 3, 0), col("kFloor", "#e6d6b8"), km);
  b.add(boxGeo(V(-6, 0, 2.2), V(6, 3.4, 2.5)), col("kWall", "#cfe3d6"), km);
  b.add(boxGeo(V(-2.2, 0, -0.6), V(2.2, 0.9, 0.9)), col("counter", "#f1efe6"), km);
  b.add(boxGeo(V(-2.3, 0.9, -0.7), V(2.3, 0.98, 1.0)), col("counterTop", "#8a5a3c"), km);
  b.build(root);
  board(root, "coloradoSign", 800, 200, (g) => { g.fillStyle = "#2f5f6a"; g.fillRect(0, 0, 800, 200); text(g, "COLORADO", 400, 104, 120, "#f6e7c4"); }, 4.2, 1.05, LAB[0], 3.6, LAB[2] + 2.98, Math.PI);
  board(root, "poundsSign", 600, 200, (g) => { g.fillStyle = "#c8443a"; g.fillRect(0, 0, 600, 200); text(g, "POUNDS", 300, 104, 120, "#ffffff"); }, 3.0, 1.0, LAB[0] - 4.0, 2.4, LAB[2] + 2.98, Math.PI);
  board(root, "calSign", 800, 200, (g) => { g.fillStyle = "#3f6fb5"; g.fillRect(0, 0, 800, 200); text(g, "CALIFORNIA", 400, 104, 110, "#f6e7c4"); }, 4.2, 1.05, CTRL[0] - 4.2, 3.9, CTRL[2] + 2.98, Math.PI);
  board(root, "newtonsSign", 600, 200, (g) => { g.fillStyle = "#2f8f8a"; g.fillRect(0, 0, 600, 200); text(g, "NEWTONS", 300, 104, 110, "#ffffff"); }, 3.0, 1.0, CTRL[0] + 4.2, 3.9, CTRL[2] + 2.98, Math.PI);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: screenTex(), color: 0xdddddd })); scr.position.set(CTRL[0], 2.3, CTRL[2] + 2.95); scr.rotation.y = Math.PI; scr.layers.set(NOINK); root.add(scr);
  for (const x of [-4.5, -1.5, 1.5]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.58), new THREE.MeshBasicMaterial({ map: monTex(), color: 0xdddddd })); m.position.set(CTRL[0] + x, 1.18, CTRL[2] - 0.71); m.rotation.y = Math.PI; m.layers.set(NOINK); root.add(m); }
  board(root, "chalk2", 600, 400, (g) => { g.fillStyle = "#2f3b32"; g.fillRect(0, 0, 600, 400); g.strokeStyle = "#8a5a3c"; g.lineWidth = 24; g.strokeRect(12, 12, 576, 376); text(g, "2 ?", 300, 210, 200, "#f4f4ee"); }, 3.2, 2.1, LAB[0] - 4.6, 2.2, LAB[2] + 2.97, Math.PI);
  // balance scale: one 1 lb block vs 4.5 small newton blocks
  const scale = new THREE.Group(); scale.position.set(LAB[0] + 6, 0.95, LAB[2] + 0.3); root.add(scale);
  mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.7).translate(0, 0.35, 0), col("brass", "#c9a24a"), scale);
  const beam = new THREE.Group(); beam.position.y = 0.72; scale.add(beam);
  mesh(boxGeo(V(-0.9, -0.03, -0.04), V(0.9, 0.03, 0.04)), col("brass", "#c9a24a"), beam);
  const pans = [-0.85, 0.85].map((x) => { const p = new THREE.Group(); p.position.set(x, -0.25, 0); beam.add(p); mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.04, 20), col("brass", "#c9a24a"), p); return p; });
  const lb = new THREE.Group(); pans[0].add(lb);
  mesh(boxGeo(V(-0.17, 0.02, -0.12), V(0.17, 0.24, 0.12)), col("lbBlock", "#55535d"), lb);
  board(lb, "lbLabel", 200, 120, (g) => { g.fillStyle = "#f6c62e"; g.fillRect(0, 0, 200, 120); text(g, "1 lb", 100, 62, 70, "#1c1a22"); }, 0.3, 0.18, 0, 0.13, -0.13);
  const nBlocks = Array.from({ length: 5 }, (_, i) => { const g = new THREE.Group(); g.position.set(-0.12 + 0.12 * (i % 3), 0.02 + 0.09 * Math.floor(i / 3), -0.05 + 0.1 * (i % 2)); pans[1].add(g); mesh(boxGeo(V(-0.05, 0, -0.05), V(i === 4 ? 0.0 : 0.05, 0.085, 0.05)), col("nBlock", "#2f8f8a"), g); return g; });
  // money
  const cash = new THREE.Group(); cash.position.set(CTRL[0] + 4.8, 0.2, CTRL[2] - 1.5); root.add(cash);
  const cashM = lam("cashM", () => ({ map: cashTex() }));
  for (let i = 0; i < 24; i++) mesh(boxGeo(V(-0.32, 0, -0.16), V(0.32, 0.14, 0.16)), cashM, cash, -0.9 + (i % 4) * 0.62, Math.floor(i / 8) * 0.15, -0.35 + Math.floor((i % 8) / 4) * 0.36);
  // kitchen props
  const bowl = mesh(new THREE.LatheGeometry([[0, 0], [0.25, 0.02], [0.32, 0.18], [0.3, 0.2]].map(([r, y]) => new THREE.Vector2(r, y)), 20), col("bowlK", "#d8453c"), root, KITCHEN[0], 0.98, KITCHEN[2] + 0.2);
  (bowl.material as THREE.Material).side = THREE.DoubleSide;
  const spoons = new THREE.Group(); root.add(spoons);
  for (const x of [-0.7, -0.5]) { mesh(boxGeo(V(-0.02, 0, -0.18), V(0.02, 0.02, 0.1)), col("spoon", "#c9ccd2"), spoons, KITCHEN[0] + x, 0.99, KITCHEN[2] - 0.2); mesh(ell(0.05, 0.015, 0.07, 10), col("spoon", "#c9ccd2"), spoons, KITCHEN[0] + x, 1.0, KITCHEN[2] - 0.3); }
  const buckets = [-1, 1].map((s) => { const g = new THREE.Group(); g.position.set(KITCHEN[0] + s * 0.75, 1.4, KITCHEN[2] + 0.2); root.add(g); mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 16), col("bucket", "#9aa0aa"), g); mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 16).translate(0, 0.24, 0), col("flour", "#f8f6ee"), g); return g; });
  board(root, "recipe", 400, 520, (g) => { g.fillStyle = "#fffbe8"; g.fillRect(0, 0, 400, 520); g.strokeStyle = "#c8443a"; g.lineWidth = 12; g.strokeRect(6, 6, 388, 508); text(g, "RECIPE", 200, 90, 64, "#c8443a"); text(g, "ADD 2", 200, 280, 110, "#1c1a22"); }, 0.6, 0.78, KITCHEN[0] + 1.5, 1.38, KITCHEN[2] + 0.6, 0.3);
  // unit labels stuck on things (shot 13)
  const labels = new THREE.Group(); root.add(labels);
  for (const [s, x, y, z] of [["lb", -0.4, 1.6, 0.52], ["N", 0.5, 1.0, 0.25], ["lb", 1.2, 0.6, 0.38]] as const) board(labels, "label" + s + x, 160, 110, (g) => { g.fillStyle = "#f6c62e"; g.fillRect(0, 0, 160, 110); text(g, s, 80, 58, 76, "#1c1a22"); }, 0.4, 0.28, LAB[0] + x, y, LAB[2] + z);
  return { stars, mars, atm, probe, glow, planned, actual, beam, nBlocks, cash, spoons, buckets, labels };
};

export const pose = (h: Handles, id: number, f: number, cam: THREE.PerspectiveCamera) => {
  const space = SPACE_SHOTS.has(id);
  h.stars.visible = space; h.stars.position.copy(cam.position);
  h.mars.visible = h.atm.visible = space;
  h.probe.visible = space && !(id === 8 && f >= LOST);
  h.probe.position.set(...probeAt(id, f));
  h.probe.rotation.set(0.2, 0.6 + 0.002 * f, 0.1);
  const heat = heatAt(id, f);
  h.glow.visible = heat > 0.02; h.glow.scale.setScalar(1 + 5 * heat); (h.glow.material as THREE.SpriteMaterial).opacity = heat;
  h.planned.visible = h.actual.visible = id === 7;
  // balance: pound block drops in, newton blocks pile up, beam levels
  const u5 = id === 5 ? clamp01((f - F(5, 0.2)) / 10) : id > 5 ? 1 : 0;
  const nb = id === 5 ? Math.floor(clamp01((f - F(5, 0.45)) / (F(5, 0.9) - F(5, 0.45))) * 5.01) : 5;
  h.nBlocks.forEach((g, i) => (g.visible = i < nb));
  h.beam.rotation.z = 0.3 * easeOut(u5) * (1 - nb / 5) * (nb < 5 ? 1 : 0);
  // money vanishes
  const u10 = id === 10 ? clamp01((f - F(10, 0.25)) / (F(11) - F(10, 0.25))) : 0;
  h.cash.children.forEach((c, i) => (c.visible = i / h.cash.children.length >= u10));
  // kitchen: spoons first, then two buckets tip over the bowl
  h.spoons.visible = id === 12;
  const tip = id === 12 ? easeOut((f - F(12, 0.62)) / 10) : 0;
  h.buckets.forEach((g, i) => { g.visible = id === 12 && f >= F(12, 0.6); g.rotation.z = (i ? -1 : 1) * 2.0 * tip; g.position.y = 1.4 + 0.3 * tip; });
  h.labels.visible = id === 13;
};
