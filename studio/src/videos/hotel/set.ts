// Sets for "The Hotel That Went Up": 1861 Chicago. A muddy street with plank sidewalks, the six-storey Tremont House
// (one group, lifted on jackscrews), its entrance steps (they stay put), neighbours, a swamp corner with a stuck wagon
// and sewer pipes, the street filled in to the new level, a car-jack demo and a Pullman sleeping car.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, quad } from "../kit/build";
import { ctex } from "../kit/paint";
import { Env, quadUp } from "../kit/world";
import { col, mesh, ell, board, text, makeCar, block } from "../kit/props";
import { hh, clamp01 } from "../kit/timeline";
import { F, HOTEL, WALK_Y, DOOR_Y, JACKS, TRAIN, RAISE, liftAt, streetAt } from "./timeline";

const bayTex = () => {
  const t = ctex("tremontBay", 256, 256, (g, r) => {
    g.fillStyle = "#b8664a"; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < 256; x += 32) { g.fillStyle = r() < 0.5 ? "#a95a40" : "#c2714f"; g.fillRect(x + 1, y + 1, 30, 14); }
    g.fillStyle = "#efe3c8"; g.fillRect(70, 40, 116, 16); g.fillRect(76, 196, 104, 12);
    g.fillStyle = "#2b2a33"; g.fillRect(84, 60, 88, 132);
    g.fillStyle = "#8fb4c9"; g.fillRect(90, 66, 34, 58); g.fillRect(132, 66, 34, 58); g.fillRect(90, 130, 34, 58); g.fillRect(132, 130, 34, 58);
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(94, 70, 8, 50); g.fillRect(136, 70, 8, 50);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
const mudTex = () => {
  const t = ctex("mud", 512, 512, (g, r) => {
    g.fillStyle = "#7a5a3c"; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(96,70,46,0.6)" : "rgba(140,108,74,0.5)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 22, 3 + r() * 10, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = "rgba(60,42,28,0.55)"; g.lineWidth = 4;
    for (let i = 0; i < 14; i++) { const y = r() * 512; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + 20, 340, y - 20, 512, y + 6); g.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
const planksTex = () => {
  const t = ctex("walkPlanks", 256, 256, (g, r) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = ["#b08455", "#a07548", "#bb8f5e"][i % 3]; g.fillRect(0, i * 32, 256, 30); g.fillStyle = "#4a3426"; g.fillRect(0, i * 32 + 30, 256, 2); g.fillRect(40 + r() * 160, i * 32, 2, 30); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
const carriageTex = () => ctex("pullmanSide", 1024, 256, (g) => {
  g.fillStyle = "#2f5f3a"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#c9a24a"; g.fillRect(0, 30, 1024, 6); g.fillRect(0, 214, 1024, 6);
  for (let i = 0; i < 9; i++) { const x = 40 + i * 108; g.fillStyle = "#1f2a24"; g.fillRect(x - 4, 76, 72, 96); g.fillStyle = "#f6dc9a"; g.fillRect(x, 80, 64, 88); g.fillStyle = "#c9a24a"; g.fillRect(x - 4, 72, 72, 4); }
});

export type Handles = ReturnType<typeof build>;
export const build = (root: THREE.Group, env: Env) => {
  const b = new Batch();
  const mud = lam("mudM", () => ({ map: mudTex() })), walk = lam("walkM", () => ({ map: planksTex() }));
  const { x0, x1, z0, z1, floors, fh } = HOTEL, H = floors * fh + DOOR_Y;
  // street: mud everywhere, plank sidewalks on both sides
  b.add(quadUp(-500, 500, -500, 500, 120, 120, 0), mud);
  for (const [za, zb] of [[-14, -12], [-32, -30]] as const) {
    b.add(boxGeo(V(-80, 0, za), V(80, WALK_Y, zb)), walk);
  }
  // entrance steps (they do not lift)
  for (let k = 0; k < 3; k++) b.add(boxGeo(V(-1.8, 0, -14 - 0.0 + k * 0.5), V(1.8, WALK_Y + (k + 1) * ((DOOR_Y - WALK_Y) / 3), -12 + 0.0)), col("stepStone", "#c9bfae"));
  // neighbours
  let si = 0;
  for (const x of [-32, 32]) block(root, x, 0, 20, 22, 11 + 4 * hh(si, 1), ["#c47a5c", "#d8c29a"][si % 2], si++);
  for (const x of [-52, 52]) block(root, x, 0, 18, 22, 8, ["#d8a95f", "#b8664a"][si % 2], si++);
  for (const x of [-40, -24, 24, 40]) block(root, x, -46, 14, 8, 7 + 3 * hh(si, 2), ["#c9b79c", "#b8664a", "#d8c29a"][si % 3], si++);
  // swamp corner: stuck wagon, sewer pipes, puddles
  const wg = new THREE.Group(); wg.position.set(-66, -0.35, -22); wg.rotation.set(0.06, 0.4, -0.08); root.add(wg);
  mesh(boxGeo(V(-1.6, 0.6, -0.8), V(1.6, 1.3, 0.8)), col("wagon", "#8a5a3c"), wg);
  for (const [x, z] of [[-1.1, -0.85], [1.1, -0.85], [-1.1, 0.85], [1.1, 0.85]]) mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 14).rotateX(Math.PI / 2), col("wheelW", "#5a3b2a"), wg, x, 0.5, z);
  for (let k = 0; k < 4; k++) mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.6, 16, 1, true).rotateZ(Math.PI / 2), col("pipe", "#b06a45"), root, -60 + k * 2.9, 0.62, -26.5 + (k % 2) * 1.6).material = col("pipe", "#b06a45");
  for (let k = 0; k < 6; k++) { const p = mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), col("puddle", "#4f4136"), root, -74 + k * 4 + 3 * hh(k, 7), 0.02, -20 - 4 * hh(k, 8)); p.scale.set(1.4 + hh(k, 9), 1, 0.8 + 0.5 * hh(k, 10)); }
  b.build(root);

  // the hotel: one group, lifted as a whole
  const hotel = new THREE.Group(); root.add(hotel);
  const bay = lam("bayM", () => ({ map: bayTex(), side: THREE.DoubleSide }));
  const hb = new Batch(), w = x1 - x0, d = z1 - z0;
  hb.add(quad(V(x0, DOOR_Y, z0), V(x1, DOOR_Y, z0), V(x1, H, z0), V(x0, H, z0), w / 4, (H - DOOR_Y) / fh), bay);
  hb.add(quad(V(x1, DOOR_Y, z1), V(x0, DOOR_Y, z1), V(x0, H, z1), V(x1, H, z1), w / 4, (H - DOOR_Y) / fh), bay);
  hb.add(quad(V(x0, DOOR_Y, z1), V(x0, DOOR_Y, z0), V(x0, H, z0), V(x0, H, z1), d / 4, (H - DOOR_Y) / fh), bay);
  hb.add(quad(V(x1, DOOR_Y, z0), V(x1, DOOR_Y, z1), V(x1, H, z1), V(x1, H, z0), d / 4, (H - DOOR_Y) / fh), bay);
  hb.add(boxGeo(V(x0, 0, z0), V(x1, DOOR_Y, z1), 2), col("plinthT", "#9f9585"));
  hb.add(boxGeo(V(x0 - 0.5, H, z0 - 0.5), V(x1 + 0.5, H + 0.8, z1 + 0.5)), col("cornice", "#efe3c8"));
  hb.add(boxGeo(V(x0, H + 0.8, z0), V(x1, H + 1.0, z1)), col("roofT", "#55535d"));
  for (let k = 1; k < floors; k++) hb.add(boxGeo(V(x0 - 0.12, DOOR_Y + k * fh - 0.12, z0 - 0.12), V(x1 + 0.12, DOOR_Y + k * fh + 0.08, z0)), col("band", "#efe3c8"));
  hb.add(boxGeo(V(-1.6, DOOR_Y, z0 - 0.08), V(1.6, DOOR_Y + 2.8, z0 + 0.02)), col("doorT", "#3f2a20"));
  hb.add(boxGeo(V(-2.4, DOOR_Y + 2.8, z0 - 1.6), V(2.4, DOOR_Y + 3.0, z0)), col("canopy", "#2f3a4a"));
  hb.build(hotel);
  board(hotel, "tremontSign", 900, 160, (g) => { g.fillStyle = "#1f2a3a"; g.fillRect(0, 0, 900, 160); g.strokeStyle = "#c9a24a"; g.lineWidth = 10; g.strokeRect(5, 5, 890, 150); text(g, "TREMONT HOUSE", 450, 84, 96, "#f1d68a"); }, 9, 1.6, 0, DOOR_Y + fh + 0.9, z0 - 0.15);
  // jackscrews along the front (they grow as the hotel rises)
  const jackM = col("jackIron", "#3d414c"), jacks: THREE.Mesh[] = [];
  for (let x = x0 + 1; x <= x1 - 1; x += 2.4) { const j = mesh(new THREE.CylinderGeometry(0.12, 0.16, 1, 10).translate(0, 0.5, 0), jackM, root, x, 0, z0 - 0.35); jacks.push(j); mesh(boxGeo(V(-0.45, 0.0, -0.03), V(0.45, 0.06, 0.03)), jackM, j, 0, 0.75, 0); }
  // the filled-in street (shot 12 on)
  const fill = new THREE.Group(); root.add(fill);
  mesh(boxGeo(V(-80, 0, -40), V(80, RAISE, -14)), mud, fill); mesh(boxGeo(V(-80, RAISE, -14), V(80, RAISE + WALK_Y, -12.4)), walk, fill);
  // the car-jack demo
  const jg = new THREE.Group(); jg.position.set(...JACKS); root.add(jg);
  mesh(quadUp(-20, 20, -20, 20, 5, 5, 0.01), col("pad", "#b9b3a8"), jg);
  const car = makeCar(jg, "#3f76b8", "jk"); car.g.rotation.y = 0.0;
  const jack = mesh(new THREE.CylinderGeometry(0.06, 0.12, 1, 8).translate(0, 0.5, 0), jackM, jg, 0.2, 0, -1.0);
  // the sleeping car
  const tg = new THREE.Group(); tg.position.set(...TRAIN); root.add(tg);
  const gb = new Batch();
  gb.add(quadUp(-200, 200, -200, 200, 50, 50, 0.005), env.grass());
  gb.add(boxGeo(V(-200, 0, -1.6), V(200, 0.25, 1.6)), col("ballast", "#9b9387"));
  for (const z of [-0.72, 0.72]) gb.add(boxGeo(V(-200, 0.25, z - 0.05), V(200, 0.38, z + 0.05)), col("rail", "#5f636d"));
  for (let x = -60; x < 60; x += 1.2) gb.add(boxGeo(V(x - 0.15, 0.2, -1.2), V(x + 0.15, 0.3, 1.2)), col("sleeper", "#6e4b33"));
  gb.build(tg);
  const side = lam("pullmanSideM", () => ({ map: carriageTex() }));
  const cg = new THREE.Group(); tg.add(cg);
  mesh(boxGeo(V(-10, 1.0, -1.5), V(10, 4.0, 1.5)), col("carBody", "#2f5f3a"), cg);
  const sideFace = new THREE.Mesh(new THREE.PlaneGeometry(20, 3), side); sideFace.position.set(0, 2.5, -1.51); sideFace.rotation.y = Math.PI; cg.add(sideFace);
  mesh(boxGeo(V(-10.2, 4.0, -1.7), V(10.2, 4.3, 1.7)), col("carRoof", "#3a3438"), cg);
  mesh(boxGeo(V(-8, 4.3, -0.8), V(8, 4.8, 0.8)), col("carRoof", "#3a3438"), cg);
  for (const x of [-7, -5.6, 5.6, 7]) for (const z of [-0.72, 0.72]) mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 14).rotateX(Math.PI / 2), col("tyre", "#2a2a30"), cg, x, 0.75, z);
  board(cg, "pullmanName", 800, 120, (g) => { g.fillStyle = "#2f5f3a"; g.fillRect(0, 0, 800, 120); text(g, "PULLMAN", 400, 64, 92, "#e8c45a"); }, 5, 0.75, 0, 3.55, -1.53);
  void clamp01; void ell; void F;
  return { hotel, jacks, fill, car, jack };
};

export const pose = (h: Handles, id: number, f: number) => {
  const lift = liftAt(id, f);
  h.hotel.position.y = lift;
  for (const j of h.jacks) { j.scale.y = Math.max(0.35, lift + 0.35); j.visible = id >= 5 && id !== 12 && id !== 13; }
  h.fill.visible = streetAt(id) > 0;
  // car jack demo: the near side rises up to ~0.4 m
  const u = id === 10 ? clamp01((f - F(10, 0.15)) / (F(11) - F(10, 0.15))) : 0;
  h.car.g.position.y = 0.18 * u; h.car.g.rotation.x = -0.12 * u;
  h.jack.scale.y = 0.3 + 0.45 * u;
};
