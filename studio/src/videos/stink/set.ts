// Sets for "The Smell That Fixed London": a brown Thames with sewage outfalls, the embankment and the Houses of
// Parliament with its clock tower, the chamber (benches, soaked curtains, a lime tub, the new law), a street, a
// boss's office, Bazalgette's brick sewer tunnel and a modern bathroom.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../kit/build";
import { ctex } from "../kit/paint";
import { Env, quadUp } from "../kit/world";
import { col, shiny, mesh, ell, board, text, block } from "../kit/props";
import { hh } from "../kit/timeline";
import { F, RIVER, PARL, CHAMBER, STREET, OFFICE, TUNNEL, BATH } from "./timeline";

const riverTex = () => { const t = ctex("thames", 512, 512, (g, r) => { g.fillStyle = "#6e6a3c"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 70; i++) { g.strokeStyle = r() < 0.5 ? "rgba(140,132,80,0.6)" : "rgba(80,74,40,0.6)"; g.lineWidth = 3; const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 30, y - 6, x + 60, y); g.stroke(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const gothic = () => { const t = ctex("gothicFacade", 512, 512, (g) => { g.fillStyle = "#d8c49a"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 8; i++) { const x = i * 64 + 16; g.fillStyle = "#4f5f74"; g.fillRect(x, 120, 32, 110); g.beginPath(); g.moveTo(x, 120); g.lineTo(x + 16, 90); g.lineTo(x + 32, 120); g.fill(); g.fillRect(x, 320, 32, 110); g.beginPath(); g.moveTo(x, 320); g.lineTo(x + 16, 290); g.lineTo(x + 32, 320); g.fill(); g.fillStyle = "#b9a57c"; g.fillRect(i * 64, 0, 6, 512); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const brickTex = () => { const t = ctex("sewerBrick", 512, 512, (g, r) => { g.fillStyle = "#7a4a32"; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 24) for (let x = (y / 24) % 2 ? -24 : 0; x < 512; x += 48) { g.fillStyle = r() < 0.5 ? "#9a5a3c" : "#8a5236"; g.fillRect(x + 2, y + 2, 44, 20); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const tileTex = () => { const t = ctex("bathTile", 256, 256, (g) => { g.fillStyle = "#e8f2f4"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#b9ccd2"; g.lineWidth = 4; for (let k = 0; k <= 256; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(256, k); g.stroke(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const roomAt = (b: Batch, o: [number, number, number], wall: THREE.Material, floor: THREE.Material, w = 9) => {
  const m = new THREE.Matrix4().makeTranslation(...o);
  b.add(quadUp(-w, w, -w, 3, 4, 3, 0.01), floor, m);
  b.add(boxGeo(V(-w, 0, 3), V(w, 4.8, 3.3), 3), wall, m);
  for (const x of [-w - 0.3, w]) b.add(boxGeo(V(x, 0, -w), V(x + 0.3, 4.8, 3.3), 3), wall, m);
};

export type Handles = ReturnType<typeof build>;
export const build = (root: THREE.Group, env: Env) => {
  const b = new Batch();
  const stone = col("embank", "#a59d8e");
  b.add(quadUp(-500, 500, 10, 500, 100, 100, 0.0), env.grass());
  b.add(quadUp(-500, 500, -500, -80, 100, 100, 0.0), env.grass());
  b.add(boxGeo(V(-500, -3, -84), V(500, 0.6, -80)), stone);
  b.add(boxGeo(V(-500, -3, 8), V(500, 0.6, 12)), stone);
  b.build(root);
  const river = mesh(quadUp(-500, 500, -80, 8, 50, 9, -1.2), lam("thamesM", () => ({ map: riverTex() })), root);
  // outfall pipes in the embankment
  for (let i = 0; i < 5; i++) mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.2, 14, 1, true).rotateX(Math.PI / 2), col("pipeS", "#55535d"), root, RIVER[0] - 60 + i * 9, -0.4, 7.6);
  // Parliament: long gothic facade, towers, clock tower
  const facade = lam("gothicM", () => ({ map: gothic() }));
  mesh(boxGeo(V(-60, 0.6, 0), V(60, 18, 22), 18), facade, root, PARL[0], 0, PARL[2]);
  for (let i = 0; i < 13; i++) mesh(new THREE.ConeGeometry(0.8, 3.5, 4).translate(0, 19.7, 0), col("spire", "#b9a57c"), root, PARL[0] - 58 + i * 9.6, 0, PARL[2] + 0.5);
  mesh(boxGeo(V(-4, 0.6, -4), V(4, 52, 4), 18), facade, root, PARL[0] + 70, 0, PARL[2] + 10);
  mesh(new THREE.ConeGeometry(5.5, 14, 4).rotateY(Math.PI / 4).translate(0, 59, 0), col("spireDark", "#4f5f74"), root, PARL[0] + 70, 0, PARL[2] + 10);
  board(root, "clockFace", 256, 256, (g) => { g.fillStyle = "#f6ecc4"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = "#1c1a22"; g.lineWidth = 10; g.stroke(); g.lineCap = "round"; g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 60); g.stroke(); g.beginPath(); g.moveTo(128, 128); g.lineTo(180, 128); g.stroke(); }, 6, 6, PARL[0] + 70, 44, PARL[2] + 5.9);
  mesh(boxGeo(V(-6, 0.6, -6), V(6, 40, 6), 18), facade, root, PARL[0] - 70, 0, PARL[2] + 12);
  // chamber
  const r = new Batch();
  roomAt(r, CHAMBER, lam("chWall", () => ({ color: "#8a6a4a" })), lam("chFloor", () => ({ color: "#4a3a2a" })));
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) r.add(boxGeo(V(s * (2.2 + k * 1.1) - 0.5, 0, -6), V(s * (2.2 + k * 1.1) + 0.5, 0.5 + k * 0.4, 1.5)), col("bench", "#2f6a43"), new THREE.Matrix4().makeTranslation(...CHAMBER));
  r.add(boxGeo(V(-0.9, 0, 1.6), V(0.9, 0.9, 2.4)), col("despatch", "#7a4a26"), new THREE.Matrix4().makeTranslation(...CHAMBER));
  roomAt(r, OFFICE, lam("offWall", () => ({ color: "#d8cdbb" })), lam("offFloor", () => ({ color: "#6e4b33" })));
  r.add(boxGeo(V(-1.4, 0, -0.4), V(1.4, 0.8, 0.5)), col("desk", "#7a4a26"), new THREE.Matrix4().makeTranslation(...OFFICE));
  roomAt(r, BATH, lam("bathWall", () => ({ map: tileTex() })), lam("bathFloor", () => ({ color: "#c9d6dc" })), 5);
  r.build(root);
  // curtains (soaked, dripping)
  const curtains: THREE.Mesh[] = [];
  for (const x of [-5, -1.8, 1.8, 5]) { const c = mesh(boxGeo(V(-1.0, 0.6, -0.05), V(1.0, 4.2, 0.05)), lam("curtain", () => ({ color: "#b8343a" })), root, CHAMBER[0] + x, 0, CHAMBER[2] + 2.9); curtains.push(c); }
  const tub = new THREE.Group(); tub.position.set(CHAMBER[0] + 1.0, 0, CHAMBER[2] + 0.8); root.add(tub);
  mesh(new THREE.CylinderGeometry(0.6, 0.5, 0.6, 18).translate(0, 0.3, 0), col("tub", "#8a5a3c"), tub);
  mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.02, 18).translate(0, 0.55, 0), col("lime", "#eef0e6"), tub);
  board(tub, "limeLabel", 600, 160, (g) => { g.fillStyle = "#f4f0e0"; g.fillRect(0, 0, 600, 160); text(g, "CHLORIDE OF LIME", 300, 84, 54, "#1c1a22"); }, 1.0, 0.27, 0, 0.32, -0.56);
  const scroll = new THREE.Group(); scroll.position.set(CHAMBER[0], 0.92, CHAMBER[2] + 1.9); root.add(scroll);
  board(scroll, "sewerAct", 500, 600, (g) => { g.fillStyle = "#f4ecd2"; g.fillRect(0, 0, 500, 600); text(g, "SEWER ACT", 250, 110, 64, "#1c1a22"); text(g, "1858", 250, 200, 56, "#8a2a2a"); for (let k = 0; k < 6; k++) { g.fillStyle = "#8a8d94"; g.fillRect(60, 270 + k * 40, 380, 10); } g.strokeStyle = "#2f3b6a"; g.lineWidth = 6; g.beginPath(); g.moveTo(80, 540); g.bezierCurveTo(160, 500, 220, 580, 320, 520); g.stroke(); }, 0.75, 0.9, 0, 0.0, 0, 0).rotation.set(-Math.PI / 2 + 0.2, Math.PI, 0);
  const days = board(root, "days18", 400, 300, (g) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#c8202a"; g.fillRect(0, 0, 400, 80); text(g, "DAYS", 200, 44, 56, "#ffffff"); text(g, "18", 200, 190, 150, "#1c1a22"); }, 1.0, 0.75, CHAMBER[0] + 2.4, 2.6, CHAMBER[2] + 2.9);
  // street
  for (let i = 0; i < 8; i++) block(root, STREET[0] - 28 + i * 8, STREET[2] + 8, 7, 6, 8 + 3 * hh(i, 1), ["#b8664a", "#c9b79c", "#8a6a5a"][i % 3], i);
  mesh(quadUp(-40, 40, -6, 5, 10, 3, 0.01), col("cobbles", "#8f8b82"), root, ...STREET);
  // sewer tunnel: brick cylinder seen from inside, a shallow stream
  const tunnel = mesh(new THREE.CylinderGeometry(3.2, 3.2, 80, 24, 1, true).rotateX(Math.PI / 2), lam("brickT", () => ({ map: brickTex(), side: THREE.BackSide })), root, TUNNEL[0], 3.0, TUNNEL[2] + 10);
  (tunnel.material as THREE.MeshLambertMaterial).map!.repeat.set(6, 20);
  mesh(quadUp(-1.6, 1.6, -30, 50, 1, 10, 0.25), col("sewerWater", "#5d6a4a"), root, TUNNEL[0], 0, TUNNEL[2]);
  for (let k = 0; k < 6; k++) { const lamp = mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.0, 1.2) }), root, TUNNEL[0] + 2.4, 3.6, TUNNEL[2] - 20 + k * 12); lamp.castShadow = false; }
  // bathroom: toilet
  const tg = new THREE.Group(); tg.position.set(BATH[0], 0, BATH[2] + 1.6); root.add(tg);
  const porcelain = shiny("#f8f8f4", "#ffffff", 80);
  mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.42, 16).translate(0, 0.21, 0), porcelain, tg);
  mesh(ell(0.26, 0.08, 0.32, 16), porcelain, tg, 0, 0.45, -0.05);
  mesh(boxGeo(V(-0.25, 0.4, 0.15), V(0.25, 0.95, 0.35)), porcelain, tg);
  mesh(boxGeo(V(0.18, 0.85, 0.12), V(0.28, 0.88, 0.16)), col("handle", "#c9ccd2"), tg);
  void F;
  return { river, curtains, tub, scroll, days };
};

export const pose = (h: Handles, id: number, f: number) => {
  const wet = id >= 5 && id <= 9;
  h.curtains.forEach((c, i) => { c.scale.y = wet ? 1 - 0.06 * Math.abs(Math.sin(f * 0.05 + i)) : 1; c.position.y = wet ? 0.1 : 0; });
  h.tub.visible = id === 5;
  h.scroll.visible = id === 8; h.days.visible = id === 8;
  (h.river.material as THREE.MeshLambertMaterial).map!.offset.x = f * 0.0006;
};
