// Shared props: small helpers (mesh, colour material, unlit painted card, ellipsoid) and common set pieces (a boxy car,
// office/street buildings with painted windows, lamp posts, traffic cones, trees, signs).
import * as THREE from "three";
import { boxGeo, V, lam } from "./build";
import { ctex } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";
import { hh } from "./timeline";

export const col = (key: string, c: string, extra: THREE.MeshLambertMaterialParameters = {}) => lam(key, () => ({ color: c, ...extra }));
export const shiny = (c: string, spec = "#9a9a9a", sh = 50) => twoTone(new THREE.MeshPhongMaterial({ color: c, specular: spec, shininess: sh }), 0.2);
export const unlit = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, tint = 0xe9e9e9) => {
  const m = new THREE.MeshBasicMaterial({ map: ctex(key, w, h, draw), color: tint, alphaTest: 0.5 });
  m.map!.wrapS = m.map!.wrapT = THREE.ClampToEdgeWrapping;
  return m;
};
export const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
};
export const ell = (rx: number, ry: number, rz: number, seg = 24) => { const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.6)); g.scale(rx, ry, rz); return g; };
/** a painted sign/board facing -z (towards a camera at negative z), unlit so it stays readable */
export const board = (parent: THREE.Object3D, key: string, cw: number, ch: number, draw: (g: CanvasRenderingContext2D) => void, w: number, h: number, x: number, y: number, z: number, yaw = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), unlit(key, cw, ch, draw));
  m.position.set(x, y, z); m.rotation.y = Math.PI + yaw; m.layers.set(NOINK); parent.add(m); return m;
};
export const text = (g: CanvasRenderingContext2D, s: string, x: number, y: number, px: number, fill: string, stroke?: string, lw = 0) => {
  g.font = `900 ${px}px "Arial Black", "DejaVu Sans", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  if (stroke) { g.lineJoin = "round"; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
};

/** a boxy saloon car, length along x (nose at +x); returns parts that films deform */
export const makeCar = (parent: THREE.Object3D, body: string, key: string, sporty = false) => {
  const g = new THREE.Group();
  const paint = shiny(body);
  const glass = col("carGlass", "#bfe0ee"), tyre = col("tyre", "#2a2a30"), chrome = shiny("#c9ccd2", "#ffffff", 80);
  const L = sporty ? 2.4 : 2.2, H = sporty ? 0.86 : 0.98;
  const bodyM = mesh(boxGeo(V(-L, 0.32, -0.9), V(L, H, 0.9)), paint, g);
  const cabin = new THREE.Group(); cabin.position.y = H; g.add(cabin);
  mesh(boxGeo(V(-1.15, 0, -0.8), V(sporty ? 0.85 : 1.05, sporty ? 0.48 : 0.56, 0.8)), glass, cabin);
  mesh(boxGeo(V(-1.22, sporty ? 0.48 : 0.56, -0.86), V(sporty ? 0.92 : 1.12, sporty ? 0.6 : 0.68, 0.86)), paint, cabin);
  for (const x of [-1.15, -0.1, 0.95]) for (const z of [-0.8, 0.8]) mesh(boxGeo(V(x - 0.06, 0, z - 0.05), V(x + 0.06, sporty ? 0.48 : 0.56, z + 0.05)), paint, cabin);
  for (const x of [-L + 0.85, L - 0.8]) for (const z of [-0.92, 0.92]) {
    const w = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 16); w.rotateX(Math.PI / 2); mesh(w, tyre, g, x, 0.36, z);
    const hub = new THREE.CylinderGeometry(0.17, 0.17, 0.28, 12); hub.rotateX(Math.PI / 2); mesh(hub, chrome, g, x, 0.36, z);
  }
  mesh(boxGeo(V(-L - 0.1, 0.3, -0.94), V(-L + 0.02, 0.48, 0.94)), chrome, g); mesh(boxGeo(V(L - 0.02, 0.3, -0.94), V(L + 0.1, 0.48, 0.94)), chrome, g);
  for (const z of [-0.6, 0.6]) mesh(new THREE.SphereGeometry(0.13, 10, 8), col("lamp" + key, "#fff3c2"), g, L + 0.01, 0.72, z);
  // wing mirrors (one per side) and a bonnet badge, as separate meshes so they can melt
  const mirrors = [-1, 1].map((s) => { const m = mesh(boxGeo(V(-0.08, -0.08, -0.1), V(0.08, 0.08, 0.1)), paint, g, 0.95, H + 0.12, s * 1.0); return m; });
  const badge = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 14), chrome, g, L - 0.15, H + 0.01, 0);
  parent.add(g);
  return { g, cabin, body: bodyM, mirrors, badge, paint };
};

/** a window-grid facade texture (offices / flats) */
export const facadeTex = (key: string, wall: string, glass: string, cols = 6, rows = 8, frame = "#2b2a33") => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = wall; g.fillRect(0, 0, 512, 512);
  const cw = 512 / cols, rh = 512 / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * cw + cw * 0.18, y = j * rh + rh * 0.2, w = cw * 0.64, h = rh * 0.6;
    g.fillStyle = frame; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    g.fillStyle = r() < 0.15 ? "#f6e7a8" : glass; g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x + 3, y + 3, w * 0.25, h - 6);
  }
});
/** a plain city block: box with a facade texture on all four sides and a darker roof */
export const block = (parent: THREE.Object3D, x: number, z: number, w: number, d: number, h: number, wall: string, i: number) => {
  const tex = facadeTex(`fac${wall}${i % 3}`, wall, ["#7fa9c9", "#8fb4c9", "#6f97b8"][i % 3], 4 + (i % 3), 6 + (i % 2) * 2);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const m = lam(`blk${wall}${i % 3}`, () => ({ map: tex }));
  const o = mesh(boxGeo(V(x - w / 2, 0, z - d / 2), V(x + w / 2, h, z + d / 2), 12), m, parent);
  mesh(boxGeo(V(x - w / 2 - 0.2, h, z - d / 2 - 0.2), V(x + w / 2 + 0.2, h + 0.5, z + d / 2 + 0.2)), col("roofC", "#55535d"), parent);
  return o;
};
export const lampPost = (parent: THREE.Object3D, x: number, z: number) => {
  mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.2, 8).translate(0, 2.1, 0), col("lampPost", "#2f3440"), parent, x, 0, z);
  mesh(boxGeo(V(-0.18, 4.1, -0.18), V(0.18, 4.5, 0.18)), col("lampHead", "#2f3440"), parent, x, 0, z);
};
export const cone = (parent: THREE.Object3D, x: number, z: number) => {
  mesh(new THREE.ConeGeometry(0.22, 0.7, 12).translate(0, 0.35, 0), col("cone", "#f26b1d"), parent, x, 0, z);
  mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 12).translate(0, 0.38, 0), col("coneBand", "#f4f4f0"), parent, x, 0, z);
  mesh(boxGeo(V(-0.28, 0, -0.28), V(0.28, 0.05, 0.28)), col("coneBase", "#f26b1d"), parent, x, 0, z);
};
export const tree = (parent: THREE.Object3D, x: number, z: number, h = 6, i = 0) => {
  mesh(new THREE.CylinderGeometry(0.18, 0.26, h * 0.4, 7).translate(0, h * 0.2, 0), col("trunkK", "#7a5238"), parent, x, 0, z);
  for (let k = 0; k < 3; k++) mesh(ell(h * 0.22, h * 0.2, h * 0.22, 12), col("leafK" + (i % 2), i % 2 ? "#5d9a4a" : "#6aa955"), parent, x + (hh(i, k) - 0.5) * h * 0.2, h * (0.55 + 0.12 * k), z + (hh(i, k + 3) - 0.5) * h * 0.2);
};
export const pine = (parent: THREE.Object3D, x: number, z: number, h = 8, i = 0) => {
  mesh(new THREE.CylinderGeometry(0.2, 0.3, h * 0.35, 6).translate(0, h * 0.175, 0), col("trunkK", "#7a5238"), parent, x, 0, z);
  mesh(new THREE.ConeGeometry(h * 0.26, h * 0.6, 8).translate(0, h * 0.55, 0), col("pineK" + (i % 2), i % 2 ? "#3f8a4f" : "#35784a"), parent, x, 0, z);
  mesh(new THREE.ConeGeometry(h * 0.19, h * 0.45, 8).translate(0, h * 0.82, 0), col("pineK" + (i % 2), i % 2 ? "#3f8a4f" : "#35784a"), parent, x, 0, z);
};
