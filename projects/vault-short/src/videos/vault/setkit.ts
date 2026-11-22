// Shared set-building pieces for "The Time Lock" (owner: sets): wall plates with rectangular / arched openings, windows with
// mullions and bars, stone columns, gas lamps, a cart, barrels, crates, a chair, candlesticks, curtains, pictogram plaques
// (a coin, a gear, a clock: pictures only), striped awnings. Everything builds into a Batch (merged per material).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as P from "./paint";
import { ctex } from "./paint";
import { Batch, M4, rbox, rb, col, texM, glow, rod, cached, lathe, V, woodM, shiny, BRASS, mats, quad } from "./build";
import { twoTone } from "./shade";
import { brassM, steelL, steelD, goldM, chromeM, dialM } from "./door";
import { cog } from "./mech";

export const brickM = (c = "#b4513a") => texM("brick" + c, () => P.brickHD(c));
export const plasterM = (c = "#ecdcb6") => texM("plaster" + c, () => P.plasterHD(c));
export const sidingM = (c: string) => texM("siding" + c, () => P.sidingHD(c));
export const blockM = (c = "#a9a291") => texM("blk" + c, () => P.stoneBlockHD(c));
export const panelM = (c = "#6a4228") => texM("panel" + c, () => P.panelHD(c));
export const cobbleM = () => { const m = texM("stCobble", () => P.cobbleHD()); m.userData.inkId = 1100; return m; };
export const CREAM = "#efe4c8";
/** two-tone Phong (specular kept): shiny floors, steel, glass-like things; optional map */
export const gloss = (key: string, make: () => THREE.MeshPhongMaterialParameters) => {
  let m = mats.get(key) as THREE.MeshPhongMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshPhongMaterial(make())); mats.set(key, m); }
  return m;
};

// ---------------- wall plates with openings ----------------
/** an opening in a plate (plate-local u, v in metres): a rectangle, or a rectangle with a semicircular head (arch) */
export type Hole = { u0: number; u1: number; v0: number; v1: number; arch?: boolean };
const holePath = (h: Hole) => {
  const p = new THREE.Path();
  if (!h.arch) { p.moveTo(h.u0, h.v0); p.lineTo(h.u0, h.v1); p.lineTo(h.u1, h.v1); p.lineTo(h.u1, h.v0); p.closePath(); return p; }
  const hw = (h.u1 - h.u0) / 2, cx = (h.u0 + h.u1) / 2, yb = h.v1 - hw;
  p.moveTo(h.u0, h.v0); p.lineTo(h.u0, yb); p.absarc(cx, yb, hw, Math.PI, 0, true); p.lineTo(h.u1, h.v0); p.closePath();
  return p;
};
/** a wall plate in the (u, v) plane, front face at w = 0 facing +w, extruded back to w = -depth, with openings; `place` moves the
 *  plate into the world (position + yaw). texture uv = metres / tile */
export const wallPlate = (b: Batch, mat: THREE.Material, u0: number, u1: number, v0: number, v1: number, holes: Hole[], depth: number, place: THREE.Matrix4, tile = 2) => {
  const s = new THREE.Shape([new THREE.Vector2(u0, v0), new THREE.Vector2(u1, v0), new THREE.Vector2(u1, v1), new THREE.Vector2(u0, v1)]);
  for (const h of holes) s.holes.push(holePath(h));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 14 });
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const nz = Math.abs(n.getZ(i)), nx = Math.abs(n.getX(i));
    uv.setXY(i, (nz > 0.5 ? p.getX(i) : nx > 0.5 ? p.getZ(i) : p.getX(i)) / tile, (nz > 0.5 ? p.getY(i) : p.getY(i)) / tile + (nz > 0.5 ? 0 : p.getZ(i) / tile));
  }
  g.translate(0, 0, -depth);
  b.add(g, mat, place);
};
/** frame ring around an opening (stone surround): four bars / an arched head, in the plate's frame */
export const surround = (b: Batch, mat: THREE.Material, h: Hole, t: number, d: number, place: THREE.Matrix4) => {
  const put = (g: THREE.BufferGeometry) => b.add(g, mat, place);
  const w = h.u1 - h.u0, cx = (h.u0 + h.u1) / 2;
  put(rbox(t, h.v1 - h.v0 - (h.arch ? w / 2 : 0) + t, d, 0.02).translate(h.u0 - t / 2, (h.v0 + h.v1 - (h.arch ? w / 2 : 0)) / 2, d / 2 - 0.02));
  put(rbox(t, h.v1 - h.v0 - (h.arch ? w / 2 : 0) + t, d, 0.02).translate(h.u1 + t / 2, (h.v0 + h.v1 - (h.arch ? w / 2 : 0)) / 2, d / 2 - 0.02));
  if (!h.arch) put(rbox(w + 2 * t, t, d, 0.02).translate(cx, h.v1 + t / 2, d / 2 - 0.02));
  else {
    const yb = h.v1 - w / 2, hw = w / 2;
    const s = new THREE.Shape(); s.absarc(cx, yb, hw + t, 0, Math.PI, false); const hp = new THREE.Path(); hp.absarc(cx, yb, hw, Math.PI, 0, true); s.holes.push(hp);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, -0.02);
    put(g);
  }
  put(rbox(w + 2 * t + 0.1, t * 0.8, d + 0.08, 0.02).translate(cx, h.v0 - t * 0.4, d / 2));   // sill
};
/** glass pane with a glow (a lit or moonlit window): a quad in the plate's frame at depth w (negative = behind the front face) */
export const pane = (b: Batch, h: Hole, w: number, c: string, k: number, place: THREE.Matrix4) => {
  const cx = (h.u0 + h.u1) / 2, ww = h.u1 - h.u0, hh = h.v1 - h.v0;
  b.add(new THREE.PlaneGeometry(ww + 0.1, hh + 0.1).translate(cx, (h.v0 + h.v1) / 2, w), glow(c, k), place);
};
/** mullions / bars across an opening */
export const bars = (b: Batch, mat: THREE.Material, h: Hole, nv: number, nh: number, r: number, w: number, place: THREE.Matrix4) => {
  const hh = h.v1 - h.v0;
  for (let i = 1; i <= nv; i++) { const u = h.u0 + ((h.u1 - h.u0) * i) / (nv + 1); b.add(rod(V(u, h.v0, w), V(u, h.v1, w), r, r, 5), mat, place); }
  for (let j = 1; j <= nh; j++) { const v = h.v0 + (hh * j) / (nh + 1); b.add(rod(V(h.u0, v, w), V(h.u1, v, w), r, r, 5), mat, place); }
};

// ---------------- props ----------------
export const gasLamp = (b: Batch, x: number, y: number, z: number, h = 3.6, gk = 2.2) => {
  const dk = col("#1f2a2c");
  b.add(rod(V(x, y, z), V(x, y + h, z), 0.07, 0.05, 8), dk);
  rb(b, dk, x - 0.16, x + 0.16, y, y + 0.5, z - 0.16, z + 0.16, 0.03);
  b.add(cached("lampArm", () => new THREE.TorusGeometry(0.22, 0.025, 5, 12, Math.PI)), dk, M4(x, y + h - 0.05, z, 0, 0, 0));
  b.add(cached("lampGlobe", () => new THREE.SphereGeometry(0.26, 12, 10)), glow("#ffe6a8", gk), M4(x, y + h + 0.3, z));
  b.add(cached("lampCap", () => new THREE.ConeGeometry(0.34, 0.3, 6)), dk, M4(x, y + h + 0.68, z));
  b.add(cached("lampBase", () => new THREE.CylinderGeometry(0.2, 0.3, 0.2, 8)), dk, M4(x, y + h + 0.02, z));
};
export const barrel = (b: Batch, x: number, y: number, z: number, s = 1) => {
  b.add(lathe("barrel", [[0, 0], [0.34, 0], [0.4, 0.2], [0.42, 0.5], [0.4, 0.8], [0.34, 1.0], [0, 1.0]], 14), woodM("#8a5a34"), M4(x, y, z, 0, 0, 0, [s, s, s]));
  for (const hy of [0.18, 0.5, 0.82]) b.add(cached("barrelHoop" + hy, () => new THREE.TorusGeometry(hy === 0.5 ? 0.42 : 0.38, 0.018, 5, 18).rotateX(Math.PI / 2)), col("#3a3a40"), M4(x, y + hy * s, z, 0, 0, 0, [s, s, s]));
};
export const crate = (b: Batch, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0, c = "#b88a58") => b.add(rbox(w, h, d, 0.03), woodM(c), M4(x, y + h / 2, z, ry));
/** a farm / dray cart: bed, shafts, two spoked wheels (axis along x), the front at +z */
export const cart = (b: Batch, x: number, y: number, z: number, ry: number, c = "#8a5a34", wheels = true) => {
  const m = M4(x, y, z, ry), put = (g: THREE.BufferGeometry, mat: THREE.Material, lm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(lm));
  put(rbox(1.5, 0.12, 2.6, 0.03), woodM(c), M4(0, 0.95, 0));
  for (const s of [-1, 1]) put(rbox(0.08, 0.5, 2.6, 0.02), woodM(c), M4(s * 0.71, 1.28, 0));
  put(rbox(1.5, 0.5, 0.08, 0.02), woodM(c), M4(0, 1.28, -1.26)); put(rbox(1.5, 0.5, 0.08, 0.02), woodM(c), M4(0, 1.28, 1.26));
  put(rod(V(-0.35, 0.95, 1.2), V(-0.4, 0.8, 3.6), 0.05), woodM(c), new THREE.Matrix4()); put(rod(V(0.35, 0.95, 1.2), V(0.4, 0.8, 3.6), 0.05), woodM(c), new THREE.Matrix4());
  put(rod(V(-0.9, 0.62, 0), V(0.9, 0.62, 0), 0.05), col("#3a3a40"), new THREE.Matrix4());
  if (wheels) for (const s of [-1, 1]) {
    const wm = M4(s * 0.92, 0.62, 0);
    put(cached("cartTyre", () => new THREE.TorusGeometry(0.6, 0.05, 6, 24).rotateY(Math.PI / 2)), col("#2a2a2e"), wm);
    put(cached("cartRim", () => new THREE.TorusGeometry(0.52, 0.03, 5, 20).rotateY(Math.PI / 2)), col("#d9b878"), wm);
    for (let k = 0; k < 6; k++) put(cached("cartSpoke", () => new THREE.CylinderGeometry(0.022, 0.022, 1.05, 5).rotateZ(Math.PI / 2)), col("#d9b878"), wm.clone().multiply(new THREE.Matrix4().makeRotationX((k * Math.PI) / 6)));
    put(cached("cartHub", () => new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8).rotateZ(Math.PI / 2)), col("#6a4a2a"), wm);
  }
};
/** a chair (seat 0.5 m), facing +z, optional rungs; ry yaw */
export const chair = (b: Batch, x: number, y: number, z: number, ry = 0, c = "#5a3a22") => {
  const m = M4(x, y, z, ry), put = (g: THREE.BufferGeometry, mat: THREE.Material, lm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(lm));
  put(rbox(0.52, 0.06, 0.5, 0.02), woodM(c), M4(0, 0.5, 0));
  for (const sx of [-0.22, 0.22]) for (const sz of [-0.2, 0.2]) put(rod(V(sx, 0, sz), V(sx, 0.5, sz), 0.03, 0.026, 6), woodM(c), new THREE.Matrix4());
  for (const sx of [-0.22, 0.22]) put(rod(V(sx, 0.5, -0.2), V(sx, 1.1, -0.22), 0.026, 0.024, 6), woodM(c), new THREE.Matrix4());
  put(rbox(0.5, 0.08, 0.04, 0.015), woodM(c), M4(0, 1.08, -0.22)); put(rbox(0.46, 0.07, 0.03, 0.015), woodM(c), M4(0, 0.88, -0.22)); put(rbox(0.46, 0.07, 0.03, 0.015), woodM(c), M4(0, 0.7, -0.22));
};
/** a brass candlestick with a tall candle (the flame is a glow sphere you place) */
export const candlestick = (b: Batch, x: number, y: number, z: number, s = 1) => {
  b.add(lathe("candleStick", [[0, 0], [0.09, 0], [0.1, 0.03], [0.04, 0.08], [0.035, 0.18], [0.06, 0.22], [0.07, 0.25], [0, 0.25]], 14), brassM(), M4(x, y, z, 0, 0, 0, [s, s, s]));
  b.add(cached("candleW", () => new THREE.CylinderGeometry(0.03, 0.03, 0.2, 10)), col("#f6efd8"), M4(x, y + 0.35 * s, z, 0, 0, 0, [s, s, s]));
  b.add(cached("candleFl", () => new THREE.SphereGeometry(0.03, 8, 6).scale(1, 1.8, 1)), glow("#ffd070", 3.2), M4(x, y + 0.505 * s, z, 0, 0, 0, [s, s, s]));
};
/** a stone column with a base and a capital */
export const column = (b: Batch, x: number, y0: number, z: number, h: number, r = 0.3, mat: THREE.Material = blockM()) => {
  b.add(cached(`colShaft${r}_${h}`, () => new THREE.CylinderGeometry(r * 0.88, r, h, 16)), mat, M4(x, y0 + h / 2, z));
  rb(b, mat, x - r * 1.3, x + r * 1.3, y0, y0 + 0.22, z - r * 1.3, z + r * 1.3, 0.03, 2);
  rb(b, mat, x - r * 1.35, x + r * 1.35, y0 + h - 0.22, y0 + h, z - r * 1.35, z + r * 1.35, 0.03, 2);
  rb(b, mat, x - r * 1.5, x + r * 1.5, y0 + h, y0 + h + 0.12, z - r * 1.5, z + r * 1.5, 0.02, 2);
};
/** a curtain: a soft rounded slab with fold ridges */
export const curtain = (b: Batch, x: number, y: number, z: number, w: number, h: number, c: string, ry = 0) => {
  const m = M4(x, y, z, ry);
  for (let k = 0; k < 5; k++) b.add(new THREE.CylinderGeometry(w / 10, w / 10, h, 8).translate((k - 2) * (w / 5), h / 2, 0.02 * (k % 2)), col(c), m);
  b.add(rod(V(-w / 2 - 0.1, h + 0.05, 0), V(w / 2 + 0.1, h + 0.05, 0), 0.03, 0.03, 6), brassM(), m);
};
/** pictogram plaques (coin / gear / clock) on a 256 square, painted: pictures only */
export const plaqueTex = (kind: "coin" | "gear" | "clock") => texM("plaque" + kind, () => ctex("plaqueTex" + kind, 256, 256, (g) => {
  g.fillStyle = "#2a3a5a"; g.fillRect(0, 0, 256, 256); g.lineWidth = 10; g.strokeStyle = "#e2b830"; g.strokeRect(8, 8, 240, 240);
  g.fillStyle = "#f2c23a"; g.strokeStyle = "#f2c23a";
  if (kind === "coin") { g.beginPath(); g.arc(128, 128, 78, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = "#2a3a5a"; g.beginPath(); g.arc(128, 128, 54, 0, 7); g.stroke(); g.fillStyle = "#2a3a5a"; g.fillRect(118, 92, 20, 72); }
  else if (kind === "gear") { g.beginPath(); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, r = k % 2 ? 66 : 88; g.lineTo(128 + r * Math.cos(a), 128 + r * Math.sin(a)); } g.closePath(); g.fill(); g.fillStyle = "#2a3a5a"; g.beginPath(); g.arc(128, 128, 30, 0, 7); g.fill(); }
  else { g.beginPath(); g.arc(128, 128, 84, 0, 7); g.fill(); g.fillStyle = "#fbf6e6"; g.beginPath(); g.arc(128, 128, 68, 0, 7); g.fill(); g.strokeStyle = "#2a3a5a"; g.lineWidth = 10; g.lineCap = "round"; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 78); g.moveTo(128, 128); g.lineTo(166, 146); g.stroke(); for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.lineWidth = 5; g.beginPath(); g.moveTo(128 + 56 * Math.cos(a), 128 + 56 * Math.sin(a)); g.lineTo(128 + 64 * Math.cos(a), 128 + 64 * Math.sin(a)); g.stroke(); } }
}));
export const plaque = (b: Batch, kind: "coin" | "gear" | "clock", x: number, y: number, z: number, w: number, place: THREE.Matrix4) => {
  b.add(new THREE.PlaneGeometry(w, w).translate(x, y, z), plaqueTex(kind), place);
};
/** a striped awning (slopes down away from the wall), plate frame: width w (u), projection d (w axis) */
const awnTex = (c: string, c2 = "#fbf6ea") => texM("awning" + c + c2, () => ctex("awnTex" + c + c2, 128, 16, (g) => { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? c2 : c; g.fillRect(i * 32, 0, 32, 16); } }));
export const awning = (b: Batch, u: number, v: number, w: number, wid: number, d: number, c: string, place: THREE.Matrix4, c2 = "#fbf6ea") => {
  const g = new THREE.PlaneGeometry(wid, d, 8, 1); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i));
  g.rotateX(-1.1); g.translate(u, v, w + d / 2 * 0.6);
  b.add(g, awnTex(c, c2), place);
  b.add(new THREE.PlaneGeometry(wid, 0.26).translate(u, v - d * 0.46 - 0.06, w + d * 0.9 * 0.7), awnTex(c, c2), place);
};
/** scatter brass / steel cogs on a surface (workshop clutter): n cogs in a box region */
export const cogPile = (b: Batch, x0: number, x1: number, y: number, z0: number, z1: number, n: number, seed: number, flat = true) => {
  const r = P.rng(seed);
  for (let i = 0; i < n; i++) {
    const rad = 0.08 + 0.16 * r(), teeth = 8 + Math.floor(r() * 8), m = cog(rad, teeth, 0.045, i % 3 ? brassM() : i % 2 ? steelD() : goldM());
    const x = x0 + (x1 - x0) * r(), z = z0 + (z1 - z0) * r(), tilt = flat ? Math.PI / 2 + 0.2 * (r() - 0.5) : Math.PI * r();
    b.add(m.geometry, m.material as THREE.Material, M4(x, y + 0.03 + 0.05 * (i % 3), z, r() * 6, 0, tilt));
  }
};
/** an arch-topped shape helper for plaster mouldings: re-exported pieces other sets use */
export const archPts = (x: number, y0: number, y1: number, hw: number, n = 12) => {
  const pts: THREE.Vector2[] = [new THREE.Vector2(x - hw, y0), new THREE.Vector2(x + hw, y0)];
  for (let i = 0; i <= n; i++) { const a = (Math.PI * i) / n; pts.push(new THREE.Vector2(x + hw * Math.cos(a), y1 + hw * Math.sin(a))); }
  return pts;
};
export { mergeGeometries, quad, shiny, BRASS, steelL, chromeM, dialM };
