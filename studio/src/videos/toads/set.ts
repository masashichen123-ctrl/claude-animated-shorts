// Sets for "The Toads That Ate Everything Except Beetles": a sugar cane field (instanced stalks over red soil rows), a
// farm track, a steamship at a dock with toad crates, a basketball court, and red outback ground.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../kit/build";
import { ctex } from "../kit/paint";
import { Env, quadUp } from "../kit/world";
import { col, shiny, mesh, board, text, tree } from "../kit/props";
import { hh } from "../kit/timeline";
import { FIELD, DOCK, COURT, OUTBACK } from "./timeline";

const soilTex = () => { const t = ctex("caneSoil", 256, 256, (g, r) => { g.fillStyle = "#9c4f2e"; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) { g.fillStyle = "#7f3e24"; g.fillRect(0, y, 256, 10); } for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,60,34,0.6)" : "rgba(190,110,70,0.5)"; g.fillRect(r() * 256, r() * 256, 3, 2); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const courtTex = () => ctex("court", 1024, 512, (g) => {
  g.fillStyle = "#d9a65f"; g.fillRect(0, 0, 1024, 512); g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.strokeRect(20, 20, 984, 472);
  g.beginPath(); g.moveTo(512, 20); g.lineTo(512, 492); g.stroke(); g.beginPath(); g.arc(512, 256, 70, 0, 7); g.stroke();
  for (const x of [20, 1004]) { g.strokeRect(x === 20 ? 20 : 844, 176, 160, 160); g.beginPath(); g.arc(x === 20 ? 180 : 844, 256, 80, 0, 7); g.stroke(); }
});

export type Handles = ReturnType<typeof build>;
export const build = (root: THREE.Group, env: Env) => {
  const b = new Batch();
  b.add(quadUp(-400, 400, -400, 400, 100, 100, 0), env.grass());
  b.add(quadUp(-120, 120, 3, 120, 60, 60, 0.01), lam("soilM", () => ({ map: soilTex() })), new THREE.Matrix4().makeTranslation(...FIELD));
  b.add(quadUp(-120, 120, -3, 3, 40, 1, 0.012), col("track", "#b8865a"), new THREE.Matrix4().makeTranslation(...FIELD));
  b.build(root);
  // sugar cane: instanced stalks + leaf tufts
  const N = 2600, stalk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.045, 1, 6).translate(0, 0.5, 0), col("cane", "#9bb84a"), N);
  const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.35, 0.9, 6).rotateX(Math.PI), col("caneLeaf", "#5d9a3a"), N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < N; i++) {
    const row = i % 40, x = FIELD[0] - 60 + (Math.floor(i / 40) * 120) / (N / 40) + (hh(i, 1) - 0.5) * 1.2, z = FIELD[2] + 4.5 + row * 1.1 + (hh(i, 2) - 0.5) * 0.3, h = 2.8 + 1.4 * hh(i, 3);
    e.set((hh(i, 4) - 0.5) * 0.12, 0, (hh(i, 5) - 0.5) * 0.12); q.setFromEuler(e);
    stalk.setMatrixAt(i, m.compose(V(x, 0, z), q, V(1, h, 1)));
    tuft.setMatrixAt(i, m.compose(V(x, h + 0.2, z), q, V(1, 1, 1)));
  }
  stalk.castShadow = tuft.castShadow = true; stalk.receiveShadow = tuft.receiveShadow = true;
  root.add(stalk, tuft);
  for (let i = 0; i < 10; i++) tree(root, FIELD[0] - 80 + i * 18, FIELD[2] - 30 - 10 * hh(i, 7), 9, i);
  // dock + steamship + crates of toads
  const dg = new THREE.Group(); dg.position.set(...DOCK); root.add(dg);
  mesh(boxGeo(V(-40, -1, -30), V(40, 0, 10)), col("dockStone", "#9f9585"), dg);
  env.sea(DOCK[2] + 10);
  const hull = shiny("#2a2d36", "#666", 30);
  mesh(boxGeo(V(-18, -2, 13), V(18, 3, 21)), hull, dg);
  mesh(boxGeo(V(-18, 3, 13), V(18, 3.4, 21)), col("deck", "#a8724a"), dg);
  mesh(boxGeo(V(-6, 3.4, 14.5), V(6, 7, 19.5)), col("cabin", "#f1efe6"), dg);
  mesh(new THREE.CylinderGeometry(1.2, 1.2, 6).translate(0, 10, 0), col("funnel", "#c8443a"), dg, 0, 0, 17);
  mesh(new THREE.CylinderGeometry(1.25, 1.25, 1).translate(0, 12.6, 0), col("funnelTop", "#1c1a22"), dg, 0, 0, 17);
  const crateTex = ctex("toadCrate", 256, 200, (g) => { g.fillStyle = "#c98f4e"; g.fillRect(0, 0, 256, 200); g.strokeStyle = "#6e4b33"; g.lineWidth = 12; g.strokeRect(6, 6, 244, 188); for (let x = 20; x < 256; x += 40) { g.fillStyle = "#3a2a22"; g.fillRect(x, 80, 18, 40); } text(g, "HAWAII", 128, 50, 44, "#3a2a22"); text(g, "LIVE TOADS", 128, 160, 34, "#c8202a"); });
  const crateM = lam("toadCrateM", () => ({ map: crateTex }));
  for (let i = 0; i < 6; i++) mesh(boxGeo(V(-0.45, 0, -0.35), V(0.45, 0.7, 0.35)), crateM, dg, -1.5 + (i % 3) * 1.0, 0.7 * Math.floor(i / 3), 1.2);
  // basketball court with a hoop
  const cg = new THREE.Group(); cg.position.set(...COURT); root.add(cg);
  mesh(quadUp(-14, 14, -8, 8, 1, 1, 0.01), lam("courtM", () => ({ map: courtTex() })), cg);
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4).translate(0, 1.7, 0), col("hoopPole", "#55535d"), cg, 0, 0, 3.4);
  mesh(boxGeo(V(-0.9, 2.9, 3.2), V(0.9, 4.0, 3.28)), col("backboard", "#f4f4ee"), cg);
  mesh(new THREE.TorusGeometry(0.23, 0.025, 6, 20).rotateX(Math.PI / 2), col("rim", "#e8641d"), cg, 0, 3.05, 2.9);
  const ball = mesh(new THREE.SphereGeometry(0.12, 14, 10), col("ball", "#e8641d"), cg, 0, 3.6, 2.9);
  // outback
  const og = new THREE.Group(); og.position.set(...OUTBACK); root.add(og);
  mesh(quadUp(-200, 200, -200, 200, 40, 40, 0.02), col("outback", "#b8643f"), og);
  board(og, "westSign", 500, 300, (g) => { g.fillStyle = "#f6c62e"; g.fillRect(0, 0, 500, 300); g.strokeStyle = "#1c1a22"; g.lineWidth = 14; g.strokeRect(7, 7, 486, 286); text(g, "WEST", 230, 150, 120, "#1c1a22"); g.fillStyle = "#1c1a22"; g.beginPath(); g.moveTo(400, 100); g.lineTo(470, 150); g.lineTo(400, 200); g.closePath(); g.fill(); }, 6, 3.6, -20, 3, 0, Math.PI * 0.0);
  return { ball, dg };
};

export const pose = (h: Handles, id: number, f: number) => {
  // the ball drops through the hoop over the goalkeeper's head (shot 11)
  const u = id === 11 ? ((f % 50) / 50) : 0;
  h.ball.position.set(-1.5 + 1.5 * Math.min(1, u * 1.5), 3.6 + 1.2 * Math.sin(Math.min(1, u * 1.5) * Math.PI) - (u > 0.66 ? (u - 0.66) * 8 : 0), 2.9);
};
