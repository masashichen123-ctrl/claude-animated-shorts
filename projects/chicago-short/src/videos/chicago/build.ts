// Shape / material kit for "Chicago Lifts a Hotel" (owner: sets, with paint.ts): shared builders for sets.ts and hotel.ts.
// Every set is one THREE.Group built at the world origin in its own frame (story.ts SPOT anchors); world.ts shows only
// the active set. Set meshes stay on camera layer 0, so the world ink pass outlines them. Shapes are chunky and bevelled
// (rbox, lathes, extrusions) and every material is two-tone (lam -> twoTone).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as P from "./paint";
import { rng, rep, ctex } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";


export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------- materials (shared, cached) ----------------
export const mats = new Map<string, THREE.Material>();
/** cached two-tone Lambert material by key (make() runs once) */
export const lam = (key: string, make: () => THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(make())); mats.set(key, m); }
  return m;
};
const lamOf = new Map<string, THREE.MeshLambertMaterial>();
// the nature kit ships a teal palette; our Missouri summer wants storybook greens and browns
const GREENS = ["#62ae4c", "#56a447", "#72b853"];
const RECOLOR: Record<string, string> = { grass: "#6aab4f", leafsDark: "#4a9142", woodBark: "#8a5a3c", woodInner: "#e8cfa4", wood: "#a8724a",
  woodDark: "#7a4f33", dirt: "#8a6a4a", stone: "#b7b4ad" };
/** Kenney GLB materials -> Lambert, so the whole world shares one lighting model */
const toLambert = (m: THREE.Material) => {
  let l = lamOf.get(m.uuid);
  if (!l) {
    const s = m as THREE.MeshStandardMaterial;
    const col = m.name === "leafsGreen" ? GREENS[lamOf.size % 3] : RECOLOR[m.name];
    l = twoTone(new THREE.MeshLambertMaterial({ color: col ? new THREE.Color(col) : s.color?.clone() ?? new THREE.Color("#ffffff"), map: s.map ?? null, side: s.side, alphaTest: s.alphaTest }));
    lamOf.set(m.uuid, l);
  }
  return l;
};

// ---------------- geometry pieces ----------------
const f32 = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.Float32BufferAttribute(out, a.itemSize);
};
/** quad a,b,c,d counter-clockwise seen from its front; uv (u0,v0) at a, (u1,v1) at c */
export const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u1 = 1, v1 = 1, u0 = 0, v0 = 0) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2));
  return g;
};
export const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  return g;
};
/** axis box from min to max, texture tiled every `tile` metres (0 = one image per face) */
export const boxGeo = (min: THREE.Vector3, max: THREE.Vector3, tile = 0, bottom = false) => {
  const [x0, y0, z0] = [min.x, min.y, min.z], [x1, y1, z1] = [max.x, max.y, max.z];
  const t = (a: number) => (tile ? a / tile : 1);
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const faces = [
    quad(V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1), t(w), t(h)),
    quad(V(x1, y0, z0), V(x0, y0, z0), V(x0, y1, z0), V(x1, y1, z0), t(w), t(h)),
    quad(V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0), t(d), t(h)),
    quad(V(x1, y0, z1), V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1), t(d), t(h)),
    quad(V(x0, y1, z1), V(x1, y1, z1), V(x1, y1, z0), V(x0, y1, z0), t(w), t(d)),
  ];
  if (bottom) faces.push(quad(V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1), t(w), t(d)));
  return mergeGeometries(faces, false);
};

/** collects pieces by material and merges them into one static mesh per material */
export class Batch {
  private g = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const x = new THREE.BufferGeometry();
    x.setAttribute("position", f32(src.attributes.position));
    if (src.attributes.normal) x.setAttribute("normal", f32(src.attributes.normal)); else x.computeVertexNormals();
    x.setAttribute("uv", src.attributes.uv ? f32(src.attributes.uv) : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat);
    if (l) l.push(x); else this.g.set(mat, [x]);
  }
  addObject(o: THREE.Object3D, m: THREE.Matrix4) {
    o.updateMatrixWorld(true);
    o.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) return;
      this.add(mesh.geometry, toLambert(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material), new THREE.Matrix4().multiplyMatrices(m, mesh.matrixWorld));
    });
  }
  build(parent: THREE.Object3D, cast = true) {
    for (const [mat, list] of this.g) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.g.clear();
  }
}


// ---------------- cartoon vegetation (MAT pass) ----------------
// Kenney's faceted low-poly trees and box hedges -> rounded storybook shapes: clustered smooth spheres for canopies
// (the two-tone sun term gives each lobe a lit cap and a cool belly), tapered trunks, rounded-box hedges. Smooth
// normals mean the world ink draws clean silhouettes and lobe-to-lobe folds instead of a crease on every facet.
type VegKind = "round" | "fat" | "tall" | "cone" | "bush" | "hedge";
const VEG: Record<string, VegKind> = {
  tree_oak: "round", tree_default: "round", tree_detailed: "round", tree_fat: "fat", "tree-high-round": "tall", tree: "tall",
  tree_cone: "cone", plant_bushLarge: "bush", plant_bushDetailed: "bush", plant_bush: "bush", hedge: "hedge",
};
const LEAF = ["#559a3a", "#68a846", "#4a8a36", "#7aaa48", "#3a7038", "#f7b2b4", "#fde0d8"]; // Missouri summer greens; [4] = conifer; [5], [6] = Boston blossom
/** canopy paint (equal px per metre on a unit sphere: 256 around x 128 pole to pole): light crown, darker belly,
 *  soft leaf-clump dabs (kept low contrast: the two-tone sun term does the main modelling) */
const leafTex = (i: number) => ctex("leafHD" + i, 256, 128, (g, r) => {
  const base = new THREE.Color(LEAF[i]), top = base.clone().offsetHSL(0.012, 0.03, 0.08), bot = base.clone().offsetHSL(-0.015, 0.0, -0.08);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#" + top.getHexString()); gr.addColorStop(0.42, "#" + base.getHexString()); gr.addColorStop(1, "#" + bot.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  for (let k = 0; k < 46; k++) {
    const x = r() * 256, y = 10 + r() * 108, rad = 5 + r() * 9, light = y < 64 ? r() < 0.7 : r() < 0.25;
    for (const ox of [-256, 0, 256]) {
      g.strokeStyle = light ? "rgba(225,255,170,0.22)" : "rgba(20,70,30,0.2)"; g.lineWidth = 2.5; g.lineCap = "round";
      g.beginPath(); g.arc(x + ox, y + rad * 0.6, rad, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    }
  }
});
export const leafMat = (i: number) => lam("leafHD" + i, () => ({ map: leafTex(i) }));
export const barkMat = () => lam("barkHD", () => ({ color: "#8f5d3b" }));
const vegGeo = new Map<string, THREE.BufferGeometry>();
export const lobeGeo = (q: number) => {
  const k = "lobe" + q;
  let g = vegGeo.get(k);
  if (!g) { g = new THREE.SphereGeometry(1, [20, 14, 10][q], [14, 10, 7][q]); vegGeo.set(k, g); }
  return g;
};
export const trunkGeo = () => {
  let g = vegGeo.get("trunk");
  if (!g) { g = new THREE.CylinderGeometry(0.6, 1, 1, 10, 1, true).translate(0, 0.5, 0); vegGeo.set("trunk", g); }
  return g;
};
/** rounded box (exact: inner box + radius), unit size along x, smooth normals; used for hedges */
const hedgeGeo = () => {
  let g = vegGeo.get("hedge");
  if (!g) {
    g = new THREE.BoxGeometry(1, 1, 1, 18, 10, 10);
    const p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
    // per-axis rounding radii in unit space (~0.35 m at the ends, ~0.45 m on top / sides at 3.3 x 1.56 x 1.17 m);
    // flat bottom (it sits on the lawn)
    const R = [0.106, 0.29, 0.385], v = new THREE.Vector3(), e = new THREE.Vector3(), q = [0, 0, 0];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      for (let a = 0; a < 3; a++) {
        const c = v.getComponent(a), lim = a === 1 && c < 0 ? 0.5 : 0.5 - R[a];
        q[a] = THREE.MathUtils.clamp(c, -lim, lim); e.setComponent(a, (c - q[a]) / R[a]);
      }
      const L = e.length();
      if (L < 1e-6) continue;
      e.divideScalar(L);
      p.setXYZ(i, q[0] + e.x * R[0], q[1] + e.y * R[1], q[2] + e.z * R[2]);
      const nn = new THREE.Vector3(e.x / R[0], e.y / R[1], e.z / R[2]).normalize();
      n.setXYZ(i, nn.x, nn.y, nn.z);
    }
    g.translate(0, 0.5, 0);
    vegGeo.set("hedge", g);
  }
  return g;
};
export const yawQ = (a: number) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
/** add one cartoon plant to a batch: base at (x, y, z), height h, q = lobe detail (0 near .. 2 far) */
export const addVeg = (b: Batch, k: VegKind, x: number, y: number, z: number, h: number, seed: number, q = 0, leafI?: number) => {
  const r = rng(Math.abs(Math.floor(seed)) % 200000 + 7), U = (a: number, c: number) => a + (c - a) * r();
  const li = k === "cone" ? 4 : k === "hedge" ? 1 : Math.floor(r() * 4);
  const leaf = leafMat(leafI !== undefined ? (r() < 0.5 ? leafI : leafI + (leafI === 5 ? 1 : 0)) : li), lobe = lobeGeo(q), yaw = r() * 6.28;
  const put = (px: number, py: number, pz: number, rad: number, sy = 0.9) =>
    b.add(lobe, leaf, new THREE.Matrix4().compose(V(x + px, y + py, z + pz), yawQ(r() * 6.28), V(rad, rad * sy, rad)));
  const trunk = (th: number, tr: number) =>
    b.add(trunkGeo(), barkMat(), new THREE.Matrix4().compose(V(x, y - 0.15, z), yawQ(yaw), V(tr, th + 0.15, tr)));
  const ring = (n: number, dist: number, r0: number, r1: number, cy: number, dy: number) => {
    const a0 = r() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i * 6.28) / n + U(-0.35, 0.35), dd = dist * U(0.85, 1.12);
      put(Math.cos(a) * dd, cy + U(-dy, dy), Math.sin(a) * dd, U(r0, r1));
    }
  };
  if (k === "round" || k === "fat") {
    const f = k === "fat";
    trunk((f ? 0.4 : 0.48) * h, 0.055 * h);
    const cy = (f ? 0.58 : 0.64) * h;
    put(0, cy, 0, (f ? 0.29 : 0.26) * h);
    ring(f ? 5 : 4, (f ? 0.22 : 0.18) * h, (f ? 0.19 : 0.17) * h, (f ? 0.23 : 0.21) * h, cy - 0.05 * h, 0.04 * h);
    put(U(-0.05, 0.05) * h, cy + (f ? 0.15 : 0.17) * h, U(-0.05, 0.05) * h, (f ? 0.19 : 0.17) * h);
  } else if (k === "tall") {
    trunk(0.34 * h, 0.045 * h);
    put(0, 0.47 * h, 0, 0.17 * h, 1.3);
    put(U(-0.03, 0.03) * h, 0.65 * h, U(-0.03, 0.03) * h, 0.15 * h, 1.3);
    put(0, 0.82 * h, 0, 0.11 * h, 1.25);
    ring(3, 0.1 * h, 0.1 * h, 0.12 * h, 0.55 * h, 0.06 * h);
  } else if (k === "cone") {
    trunk(0.2 * h, 0.05 * h);
    put(0, 0.3 * h, 0, 0.26 * h, 0.62);
    put(0, 0.5 * h, 0, 0.2 * h, 0.66);
    put(0, 0.68 * h, 0, 0.14 * h, 0.75);
    put(0, 0.84 * h, 0, 0.08 * h, 1.0);
  } else if (k === "bush") {
    put(0, 0.46 * h, 0, 0.5 * h);
    ring(3, 0.42 * h, 0.32 * h, 0.38 * h, 0.32 * h, 0.04 * h);
  } else { // hedge segment, 3.3 m along local x
    b.add(hedgeGeo(), leaf, new THREE.Matrix4().compose(V(x, y - 0.06, z), new THREE.Quaternion(), V(3.3, h + 0.06, Math.max(0.9, h * 0.78))));
  }
};

// =================================================================================================================
// shape kit
// =================================================================================================================
export type Mat = THREE.Material;
export const UP = V(0, 1, 0);
/** matrix: position, yaw (y), then pitch (z) and roll (x) -> "YZX" like the truck rig */
export const M4 = (x: number, y: number, z: number, ry = 0, rz = 0, rx = 0, s: [number, number, number] = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YZX")), V(...s));
/** flat colour material (two-tone) */
export const col = (c: string, side: THREE.Side = THREE.FrontSide) => lam("col" + c + side, () => ({ color: c, side }));
/** textured material; uv in metres / tile is set by the geometry builders */
export const texM = (key: string, map: () => THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => lam(key, () => ({ map: map(), ...extra }));
/** unlit glowing material (windows, bulbs, lamps): colour > 1 feeds the bloom; still on layer 0, so it gets inked */
const glowCache = new Map<string, THREE.MeshBasicMaterial>();
export const glow = (c: string, k = 1) => {
  const key = c + k;
  let m = glowCache.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }); glowCache.set(key, m); }
  return m;
};

/** Rounded ("bevelled") box: a 4x4x4-segment box whose inner grid lines are moved r in from every edge, then the rim
 *  vertices are pulled onto a 45-degree bevel with smooth normals: chunky toy edges that catch the two-tone light, at
 *  ~150 vertices. tile = metres per texture repeat (number or [u, v]); 0 = one image per face. Centred on the origin. */
const rboxCache = new Map<string, THREE.BufferGeometry>();
export const rbox = (w: number, h: number, d: number, r = 0.06, tile: number | [number, number] = 0) => {
  const key = [w, h, d, r, tile].join("|");
  const hit = rboxCache.get(key);
  if (hit) return hit;
  const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4);
  const half = [w / 2, h / 2, d / 2], rr = Math.max(0.002, Math.min(r, w / 4, h / 4, d / 4) * 0.95);
  const p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  const [tu, tv] = Array.isArray(tile) ? tile : [tile, tile];
  const v = new THREE.Vector3(), q = [0, 0, 0], e = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    for (let a = 0; a < 3; a++) { const c = v.getComponent(a); if (Math.abs(Math.abs(c) - half[a] / 2) < 1e-6) v.setComponent(a, Math.sign(c) * (half[a] - rr)); }
    // planar uv from the face normal (before the bevel, so textures stay square)
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const [a, b, la, lb] = nx > 0.5 ? [v.z, v.y, d, h] : ny > 0.5 ? [v.x, v.z, w, d] : [v.x, v.y, w, h];
    uv.setXY(i, tu ? a / tu : a / la + 0.5, tv ? b / tv : b / lb + 0.5);
    for (let k = 0; k < 3; k++) { const c = v.getComponent(k), lim = half[k] - rr; q[k] = THREE.MathUtils.clamp(c, -lim, lim); e.setComponent(k, c - q[k]); }
    const L = e.length();
    if (L > 1e-6) {
      e.divideScalar(L);
      p.setXYZ(i, q[0] + e.x * rr, q[1] + e.y * rr, q[2] + e.z * rr);
      n.setXYZ(i, e.x, e.y, e.z);
    } else p.setXYZ(i, v.x, v.y, v.z);
  }
  rboxCache.set(key, g);
  return g;
};
/** add an rbox spanning [x0,x1] x [y0,y1] x [z0,z1] (optionally yawed about its centre) */
export const rb = (b: Batch, mat: Mat, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 0.06, tile: number | [number, number] = 0, ry = 0) =>
  b.add(rbox(x1 - x0, y1 - y0, z1 - z0, r, tile), mat, M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, ry));
/** horizontal ground quad (normal up) with uv = metres / tile */
export const ground = (x0: number, x1: number, z0: number, z1: number, y: number, tile: number) => {
  const g = quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), (x1 - x0) / tile, (z1 - z0) / tile);
  return g;
};
/** overwrite uvs from positions */
export const uvFrom = (g: THREE.BufferGeometry, fn: (x: number, y: number, z: number, i: number) => [number, number]) => {
  const p = g.attributes.position, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const [u, v] = fn(p.getX(i), p.getY(i), p.getZ(i), i); uv.setXY(i, u, v); }
  return g;
};
/** cylinder between two points (radius r0 at a, r1 at b) */
export const rod = (a: THREE.Vector3, b2: THREE.Vector3, r0: number, r1 = r0, seg = 10) => {
  const g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b2), seg, 1);
  return g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b2).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, b2.clone().sub(a).normalize()), V(1, 1, 1)));
};
/** extrude a planform drawn in (x, z) to a slab between y0 and y0 + h, bevelled */
export const slab = (pts: [number, number][], y0: number, h: number, bev = 0.06) => {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, h - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 16 });
  g.rotateX(-Math.PI / 2); // shape y (= -z) -> world z, depth -> +y
  g.translate(0, y0 + bev, 0);
  return g;
};
/** extrude a profile drawn in (x, y) through thickness t centred on z = 0, bevelled */
export const plate = (pts: [number, number][], t: number, bev = 0.03) => {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.005, t - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 12 });
  g.translate(0, 0, -t / 2 + bev);
  return g;
};
/** superellipse outline (x, z) for sails, rugs, plinths */
export const supEll = (cx: number, cz: number, a: number, c: number, n = 3, k = 40, taper = 0): [number, number][] =>
  Array.from({ length: k }, (_, i) => {
    const t = (i / k) * Math.PI * 2, co = Math.cos(t), si = Math.sin(t);
    const x = a * Math.sign(co) * Math.abs(co) ** (2 / n), z = c * Math.sign(si) * Math.abs(si) ** (2 / n) * (1 - taper * Math.max(0, x / a));
    return [cx + x, cz + z];
  });

// ---------------- props (sets look pass: world.md 3-4, composition.md 3.4) ----------------
const geoCache = new Map<string, THREE.BufferGeometry>();
export const cached = (k: string, make: () => THREE.BufferGeometry) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };
/** cached lathe from [r, y] points (bottom -> top), smooth normals */
export const lathe = (key: string, prof: [number, number][], seg = 24) => cached("lathe" + key + seg, () => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg));
/** flat decal quad centred at c facing n (reads left-to-right for a viewer in front), w x h */
export const decalGeo = (c: THREE.Vector3, n: THREE.Vector3, w: number, h: number, up = UP) => {
  const nn = n.clone().normalize(), right = up.clone().cross(nn).normalize(), u = nn.clone().cross(right).normalize();
  const p = (sx: number, sy: number) => c.clone().addScaledVector(right, (sx * w) / 2).addScaledVector(u, (sy * h) / 2);
  return quad(p(-1, -1), p(1, -1), p(1, 1), p(-1, 1));
};
/** grass tuft: 7 crossed tapering blades 0.25-0.4 m */
export const tuftGeo = () => cached("tuft", () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + i, h = 0.25 + 0.15 * ((i * 37) % 7) / 7, lean = 0.12 + 0.06 * (i % 3), w = 0.05;
    const dx = Math.cos(a), dz = Math.sin(a);
    parts.push(tri(V(-dz * w, 0, dx * w), V(dz * w, 0, -dx * w), V(dx * lean, h, dz * lean)));
  }
  return mergeGeometries(parts, false);
});
/** dry-grass clumps scattered in a ring (on the terrain hf when given), dune greens with straw tips */
export const tufts = (b: Batch, cx: number, cz: number, r0: number, r1: number, n: number, seed: number, avoid?: (x: number, z: number) => boolean, hf?: (x: number, z: number) => number, size = 1) => {
  const r = rng(seed), m1 = col("#7f9a3e", THREE.DoubleSide), m2 = col("#b8ae52", THREE.DoubleSide), m3 = col("#d8bc68", THREE.DoubleSide);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = r0 + (r1 - r0) * Math.sqrt(r()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (avoid?.(x, z)) continue;
    const s = (0.8 + 0.8 * r()) * size;
    b.add(tuftGeo(), [m1, m2, m3][i % 3], M4(x, hf ? hf(x, z) - 0.03 : 0, z, r() * 6.28, 0, 0, [s * 1.3, s * 1.9, s * 1.3]));
  }
};
/** far backdrop: a closed ring of soft hills (R3), flat albedo pre-mixed toward the haze */
export const hillRing = (b: Batch, cx: number, cz: number, R: number, hBase: number, amp: number, seed: number, c: string) => {
  const r = rng(seed), K = 120, ph = [r() * 6, r() * 6, r() * 6], pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= K; i++) {
    const a = (i / K) * Math.PI * 2, h = hBase + amp * (0.5 + 0.3 * Math.sin(a * 3 + ph[0]) + 0.15 * Math.sin(a * 8 + ph[1]) + 0.08 * Math.sin(a * 21 + ph[2]));
    const rr2 = R * (1 + 0.05 * Math.sin(a * 5 + ph[1]));
    pos.push(cx + Math.cos(a) * rr2, -3, cz + Math.sin(a) * rr2, cx + Math.cos(a) * (rr2 + h * 1.5), h, cz + Math.sin(a) * (rr2 + h * 1.5));
    if (i < K) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  b.add(g, col(c, THREE.DoubleSide));
};

/** shared clock for animated set pieces (flag, bubbles); world.ts sets uTime every frame */
export const CLOCK = { uTime: { value: 0 } };
const WARM = (k: number) => `mix( uShadeCol, vec3( dot( uShadeCol, vec3( 0.3333 ) ) ) * vec3( 1.32, 1.06, 0.62 ), ${k.toFixed(2)} )`;
export const warmShade = <T extends THREE.Material>(m: T, k: number, key: string): T => {
  if (m.userData.warm) return m;
  m.userData.warm = true;
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace("mix( uShadeCol, lit, sunTerm )", `mix( ${WARM(k)}, lit, sunTerm )`)
      .replace("uShadeLift * LIFT_K * ( 1.0 - sunTerm )", `uShadeLift * vec3( 1.0, 0.9, ${(1 - 0.6 * k).toFixed(2)} ) * LIFT_K * ( 1.0 - sunTerm )`);
  };
  m.customProgramCacheKey = () => prevKey() + "_warm" + key + k;
  return m;
};
/** cheap value noise for terrain bumps */
export const vn2 = (x: number, z: number, s: number) => {
  const h = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7 + s * 17.3) * 43758.5453; return v - Math.floor(v); };
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
  return (h(ix, iz) * (1 - u) + h(ix + 1, iz) * u) * (1 - w) + (h(ix, iz + 1) * (1 - u) + h(ix + 1, iz + 1) * u) * w;
};
/** build a batch of alpha cards onto the NOINK layer (never outlined by the world ink, still rendered) */
export const buildNoInk = (b: Batch, parent: THREE.Object3D) => {
  const g = new THREE.Group(); b.build(g, false);
  g.traverse((o) => { o.layers.set(NOINK); });
  parent.add(g);
  return g;
};

// ---- grounds ----
export const groundM = (key: string, make: () => THREE.Texture) => {
  const m = texM(key, make); m.userData.inkId = 1100; // one ink id for every ground patch: no lines where they meet
  return warmShade(m, 0.5, "g");
};
/** ground patch with uv in metres / tile and optional height function (soft rises) */
export const terrain = (b: Batch, mat: Mat, x0: number, x1: number, z0: number, z1: number, tile: number, hf?: (x: number, z: number) => number, cell = 4, y0 = 0) => {
  const nx = Math.max(1, Math.min(200, Math.round((x1 - x0) / cell))), nz = Math.max(1, Math.min(200, Math.round((z1 - z0) / cell)));
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, hf ? nx : 1, hf ? nz : 1).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y0, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (hf) p.setY(i, y0 + hf(x, z)); uv.setXY(i, x / tile, z / tile); }
  if (hf) g.computeVertexNormals();
  b.add(g, mat);
};
export const shiny = (c: string, sh = 70) => {
  const key = "shiny" + c + sh;
  let m = mats.get(key) as THREE.MeshPhongMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshPhongMaterial({ color: c, shininess: sh, specular: new THREE.Color("#8890a0") })); mats.set(key, m); }
  return m;
};
const BRASS = "#d9a83a";
export const woodM = (c = "#9a7a58") => texM("oldWood" + c, () => P.oldWoodHD(c));
/** unlit material with a painted map (flags, banners: never go grey in side light) */
export const unlit = (key: string, map: () => THREE.Texture, side: THREE.Side = THREE.DoubleSide) => {
  let m = mats.get(key) as THREE.MeshBasicMaterial | undefined;
  if (!m) { m = new THREE.MeshBasicMaterial({ map: map(), side, color: new THREE.Color(0.95, 0.95, 0.95) }); mats.set(key, m); }
  return m;
};

// ---- fences + poles ----
export const BRASS = "#d9a83a";
export const FAR = 900;
export const M = M4;
/** a sub-group built from its own batch (toggled / posed per frame by the set's tick) */
export const sub = (parent: THREE.Object3D, b: Batch, cast = true) => { const g = new THREE.Group(); b.build(g, cast); parent.add(g); return g; };
export type SetRig = { name: string; group: THREE.Group; tick?: (t: number, id: number) => void };
