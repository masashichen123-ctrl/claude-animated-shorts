// Sets for "The 1904 Olympic Marathon" (owner: sets, with paint.ts). Every set is one THREE.Group built at the world
// origin in its own frame (story.ts SPOT anchors); world.ts shows only the active set. Set meshes stay on camera layer 0,
// so the world ink pass outlines them. Shapes are chunky and bevelled (rbox, lathes, extrusions) and every material is
// two-tone (lam -> twoTone). Sets: the COUNTRY course (the ochre dirt road, patchwork fields of pasture / stubble / corn,
// hay stooks, rail fences, telegraph poles, hedgerow trees, the apple orchard, the stone well with its bucket, the
// cornfield lane + the spinning sign, the creek + plank bridge, a red barn and farmhouse, the hay wagon, the distant
// stadium), the 1904 STADIUM (cinder track, the flag-and-bunting grandstand, the end stand, the finish posts + tape) and
// the 1905 BOSTON street (cobbles, red-brick rows with awnings, blossom trees, gas lamps, the finish banner + tape).
// The 1904 cars (open tourers, brass lamps, spoked wheels) are rigs posed by the set ticks from story.ts carsAt.
// CONTRACTS: buildSets(), SET_META, SetRig, fgUpdate(), CLOCK (read by world.ts).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as P from "./paint";
import { rng, rep, ctex } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";
import { SPOT, SetName, FOREGROUND, smooth, carsAt, tapeBreak, bucketK, signSpin, wagonZ, V3, CarPose } from "./story";

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------- materials (shared, cached) ----------------
const mats = new Map<string, THREE.Material>();
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
const leafMat = (i: number) => lam("leafHD" + i, () => ({ map: leafTex(i) }));
const barkMat = () => lam("barkHD", () => ({ color: "#8f5d3b" }));
const vegGeo = new Map<string, THREE.BufferGeometry>();
const lobeGeo = (q: number) => {
  const k = "lobe" + q;
  let g = vegGeo.get(k);
  if (!g) { g = new THREE.SphereGeometry(1, [20, 14, 10][q], [14, 10, 7][q]); vegGeo.set(k, g); }
  return g;
};
const trunkGeo = () => {
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
const yawQ = (a: number) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
/** add one cartoon plant to a batch: base at (x, y, z), height h, q = lobe detail (0 near .. 2 far) */
const addVeg = (b: Batch, k: VegKind, x: number, y: number, z: number, h: number, seed: number, q = 0, leafI?: number) => {
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
type Mat = THREE.Material;
const UP = V(0, 1, 0);
/** matrix: position, yaw (y), then pitch (z) and roll (x) -> "YZX" like the truck rig */
export const M4 = (x: number, y: number, z: number, ry = 0, rz = 0, rx = 0, s: [number, number, number] = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YZX")), V(...s));
/** flat colour material (two-tone) */
const col = (c: string, side: THREE.Side = THREE.FrontSide) => lam("col" + c + side, () => ({ color: c, side }));
/** textured material; uv in metres / tile is set by the geometry builders */
const texM = (key: string, map: () => THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => lam(key, () => ({ map: map(), ...extra }));
/** unlit glowing material (windows, bulbs, lamps): colour > 1 feeds the bloom; still on layer 0, so it gets inked */
const glowCache = new Map<string, THREE.MeshBasicMaterial>();
const glow = (c: string, k = 1) => {
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
const rb = (b: Batch, mat: Mat, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 0.06, tile: number | [number, number] = 0, ry = 0) =>
  b.add(rbox(x1 - x0, y1 - y0, z1 - z0, r, tile), mat, M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, ry));
/** horizontal ground quad (normal up) with uv = metres / tile */
const ground = (x0: number, x1: number, z0: number, z1: number, y: number, tile: number) => {
  const g = quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), (x1 - x0) / tile, (z1 - z0) / tile);
  return g;
};
/** overwrite uvs from positions */
const uvFrom = (g: THREE.BufferGeometry, fn: (x: number, y: number, z: number, i: number) => [number, number]) => {
  const p = g.attributes.position, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const [u, v] = fn(p.getX(i), p.getY(i), p.getZ(i), i); uv.setXY(i, u, v); }
  return g;
};
/** cylinder between two points (radius r0 at a, r1 at b) */
const rod = (a: THREE.Vector3, b2: THREE.Vector3, r0: number, r1 = r0, seg = 10) => {
  const g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b2), seg, 1);
  return g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b2).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, b2.clone().sub(a).normalize()), V(1, 1, 1)));
};
/** extrude a planform drawn in (x, z) to a slab between y0 and y0 + h, bevelled */
const slab = (pts: [number, number][], y0: number, h: number, bev = 0.06) => {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, h - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 16 });
  g.rotateX(-Math.PI / 2); // shape y (= -z) -> world z, depth -> +y
  g.translate(0, y0 + bev, 0);
  return g;
};
/** extrude a profile drawn in (x, y) through thickness t centred on z = 0, bevelled */
const plate = (pts: [number, number][], t: number, bev = 0.03) => {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.005, t - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 12 });
  g.translate(0, 0, -t / 2 + bev);
  return g;
};
/** superellipse outline (x, z) for sails, rugs, plinths */
const supEll = (cx: number, cz: number, a: number, c: number, n = 3, k = 40, taper = 0): [number, number][] =>
  Array.from({ length: k }, (_, i) => {
    const t = (i / k) * Math.PI * 2, co = Math.cos(t), si = Math.sin(t);
    const x = a * Math.sign(co) * Math.abs(co) ** (2 / n), z = c * Math.sign(si) * Math.abs(si) ** (2 / n) * (1 - taper * Math.max(0, x / a));
    return [cx + x, cz + z];
  });

// ---------------- props (sets look pass: world.md 3-4, composition.md 3.4) ----------------
const geoCache = new Map<string, THREE.BufferGeometry>();
const cached = (k: string, make: () => THREE.BufferGeometry) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };
/** cached lathe from [r, y] points (bottom -> top), smooth normals */
const lathe = (key: string, prof: [number, number][], seg = 24) => cached("lathe" + key + seg, () => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg));
/** flat decal quad centred at c facing n (reads left-to-right for a viewer in front), w x h */
const decalGeo = (c: THREE.Vector3, n: THREE.Vector3, w: number, h: number, up = UP) => {
  const nn = n.clone().normalize(), right = up.clone().cross(nn).normalize(), u = nn.clone().cross(right).normalize();
  const p = (sx: number, sy: number) => c.clone().addScaledVector(right, (sx * w) / 2).addScaledVector(u, (sy * h) / 2);
  return quad(p(-1, -1), p(1, -1), p(1, 1), p(-1, 1));
};
/** grass tuft: 7 crossed tapering blades 0.25-0.4 m */
const tuftGeo = () => cached("tuft", () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + i, h = 0.25 + 0.15 * ((i * 37) % 7) / 7, lean = 0.12 + 0.06 * (i % 3), w = 0.05;
    const dx = Math.cos(a), dz = Math.sin(a);
    parts.push(tri(V(-dz * w, 0, dx * w), V(dz * w, 0, -dx * w), V(dx * lean, h, dz * lean)));
  }
  return mergeGeometries(parts, false);
});
/** dry-grass clumps scattered in a ring (on the terrain hf when given), dune greens with straw tips */
const tufts = (b: Batch, cx: number, cz: number, r0: number, r1: number, n: number, seed: number, avoid?: (x: number, z: number) => boolean, hf?: (x: number, z: number) => number, size = 1) => {
  const r = rng(seed), m1 = col("#7f9a3e", THREE.DoubleSide), m2 = col("#b8ae52", THREE.DoubleSide), m3 = col("#d8bc68", THREE.DoubleSide);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = r0 + (r1 - r0) * Math.sqrt(r()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (avoid?.(x, z)) continue;
    const s = (0.8 + 0.8 * r()) * size;
    b.add(tuftGeo(), [m1, m2, m3][i % 3], M4(x, hf ? hf(x, z) - 0.03 : 0, z, r() * 6.28, 0, 0, [s * 1.3, s * 1.9, s * 1.3]));
  }
};
/** far backdrop: a closed ring of soft hills (R3), flat albedo pre-mixed toward the haze */
const hillRing = (b: Batch, cx: number, cz: number, R: number, hBase: number, amp: number, seed: number, c: string) => {
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
const warmShade = <T extends THREE.Material>(m: T, k: number, key: string): T => {
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
const vn2 = (x: number, z: number, s: number) => {
  const h = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7 + s * 17.3) * 43758.5453; return v - Math.floor(v); };
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
  return (h(ix, iz) * (1 - u) + h(ix + 1, iz) * u) * (1 - w) + (h(ix, iz + 1) * (1 - u) + h(ix + 1, iz + 1) * u) * w;
};
/** build a batch of alpha cards onto the NOINK layer (never outlined by the world ink, still rendered) */
const buildNoInk = (b: Batch, parent: THREE.Object3D) => {
  const g = new THREE.Group(); b.build(g, false);
  g.traverse((o) => { o.layers.set(NOINK); });
  parent.add(g);
  return g;
};

// ---- grounds ----
const groundM = (key: string, make: () => THREE.Texture) => {
  const m = texM(key, make); m.userData.inkId = 1100; // one ink id for every ground patch: no lines where they meet
  return warmShade(m, 0.5, "g");
};
/** ground patch with uv in metres / tile and optional height function (soft rises) */
const terrain = (b: Batch, mat: Mat, x0: number, x1: number, z0: number, z1: number, tile: number, hf?: (x: number, z: number) => number, cell = 4, y0 = 0) => {
  const nx = Math.max(1, Math.min(200, Math.round((x1 - x0) / cell))), nz = Math.max(1, Math.min(200, Math.round((z1 - z0) / cell)));
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, hf ? nx : 1, hf ? nz : 1).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y0, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (hf) p.setY(i, y0 + hf(x, z)); uv.setXY(i, x / tile, z / tile); }
  if (hf) g.computeVertexNormals();
  b.add(g, mat);
};
const shiny = (c: string, sh = 70) => {
  const key = "shiny" + c + sh;
  let m = mats.get(key) as THREE.MeshPhongMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshPhongMaterial({ color: c, shininess: sh, specular: new THREE.Color("#8890a0") })); mats.set(key, m); }
  return m;
};
const BRASS = "#d9a83a";
const woodM = (c = "#9a7a58") => texM("oldWood" + c, () => P.oldWoodHD(c));
/** unlit material with a painted map (flags, banners: never go grey in side light) */
const unlit = (key: string, map: () => THREE.Texture, side: THREE.Side = THREE.DoubleSide) => {
  let m = mats.get(key) as THREE.MeshBasicMaterial | undefined;
  if (!m) { m = new THREE.MeshBasicMaterial({ map: map(), side, color: new THREE.Color(0.95, 0.95, 0.95) }); mats.set(key, m); }
  return m;
};

// ---- fences + poles ----
/** post-and-rail farm fence from a to b: weathered posts every ~2.4 m, two split rails */
const railFence = (b: Batch, ax: number, az: number, bx: number, bz: number, seed: number, step = 2.4) => {
  const r = rng(seed), L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step)), ang = Math.atan2(bx - ax, bz - az);
  for (let i = 0; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n, h = 1.15 + 0.08 * r();
    b.add(rbox(0.14, h, 0.14, 0.03), woodM("#8a6c4c"), M4(x, h / 2 - 0.05, z, r() * 0.5, (r() - 0.5) * 0.06));
  }
  for (const y of [0.55, 0.98]) for (let i = 0; i < n; i++) {
    const x0 = ax + ((bx - ax) * i) / n, z0 = az + ((bz - az) * i) / n, x1 = ax + ((bx - ax) * (i + 1)) / n, z1 = az + ((bz - az) * (i + 1)) / n;
    b.add(rbox(0.09, 0.11, Math.hypot(x1 - x0, z1 - z0) + 0.1, 0.03), woodM("#a08060"), M4((x0 + x1) / 2, y + 0.04 * (r() - 0.5), (z0 + z1) / 2, ang, (r() - 0.5) * 0.04));
  }
};
/** telegraph pole with a crossbar and two insulators */
const telePole = (b: Batch, x: number, z: number) => {
  b.add(rod(V(x, -0.2, z), V(x, 7.2, z), 0.12, 0.1, 8), woodM("#7a5a3c"));
  b.add(rbox(1.5, 0.12, 0.12, 0.03), woodM("#7a5a3c"), M4(x, 6.6, z));
  for (const s of [-0.6, 0.6]) b.add(cached("insul", () => new THREE.CylinderGeometry(0.05, 0.06, 0.14, 8)), col("#3a7a6a"), M4(x + s, 6.75, z));
};
// ---- crops ----
const cornM = () => lam("cornWall", () => ({ map: P.cornWallHD() }));
/** a cornfield block (x0..x1, z0..z1), 2.3 m tall: a textured mass (rows read from the side and from above) */
const cornBlock = (b: Batch, x0: number, x1: number, z0: number, z1: number, h = 2.3) =>
  b.add(rbox(x1 - x0, h, z1 - z0, 0.25, [4, 2.3]), cornM(), M4((x0 + x1) / 2, h / 2 - 0.05, (z0 + z1) / 2));
/** one corn plant: stalk, four long leaves, a tassel and a cob */
const stalkGeo = () => cached("stalk", () => {
  const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.018, 0.03, 2.4, 6).translate(0, 1.2, 0)];
  for (let k = 0; k < 5; k++) {
    const y = 0.55 + k * 0.38, a = k * 2.4, dx = Math.cos(a), dz = Math.sin(a), L = 0.55 - k * 0.05;
    parts.push(tri(V(-dz * 0.04, y, dx * 0.04), V(dz * 0.04, y, -dx * 0.04), V(dx * L, y + 0.18, dz * L)));
    parts.push(tri(V(dz * 0.04, y, -dx * 0.04), V(-dz * 0.04, y, dx * 0.04), V(dx * L, y + 0.18, dz * L)));
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => { g.deleteAttribute("uv"); return g; }), false);
});
const tasselGeo = () => cached("tassel", () => { const parts: THREE.BufferGeometry[] = []; for (let k = 0; k < 5; k++) { const a = k * 1.26, dx = Math.cos(a) * 0.16, dz = Math.sin(a) * 0.16; parts.push(tri(V(-0.012, 2.36, 0), V(0.012, 2.36, 0), V(dx, 2.62 - 0.05 * (k % 2), dz)), tri(V(0, 2.36, -0.012), V(0, 2.36, 0.012), V(dx, 2.62 - 0.05 * (k % 2), dz))); } return mergeGeometries(parts, false); });
const cobGeo = () => cached("cob", () => new THREE.SphereGeometry(0.06, 8, 6).scale(1, 2.4, 1).translate(0.06, 1.3, 0));
const cornRow = (b: Batch, ax: number, az: number, bx: number, bz: number, seed: number, step = 0.42) => {
  const r = rng(seed), L = Math.hypot(bx - ax, bz - az), n = Math.round(L / step);
  for (let i = 0; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n + (r() - 0.5) * 0.15, z = az + ((bz - az) * i) / n + (r() - 0.5) * 0.15, s = 0.9 + 0.2 * r(), m = M4(x, 0, z, r() * 6.28, (r() - 0.5) * 0.08, 0, [s, s, s]);
    b.add(stalkGeo(), col(r() > 0.5 ? "#5c9a3a" : "#4a8a30", THREE.DoubleSide), m);
    b.add(tasselGeo(), col("#d8b860", THREE.DoubleSide), m);
    if (r() > 0.5) b.add(cobGeo(), col("#9ab84a"), m);
  }
};
/** golden hay stook (a shock of sheaves) on a stubble field */
const stook = (b: Batch, x: number, z: number, s: number, ry: number) => {
  b.add(cached("stook", () => uvFrom(new THREE.ConeGeometry(0.62, 1.5, 9, 1).translate(0, 0.72, 0), (px, py, pz) => [(Math.atan2(pz, px) / 6.28) * 2, py])), texM("hay", () => P.hayHD()), M4(x, 0, z, ry, 0, 0, [s, s, s]));
  b.add(cached("stookTop", () => new THREE.ConeGeometry(0.3, 0.42, 7).translate(0, 1.55, 0)), texM("hay", () => P.hayHD()), M4(x, 0, z, ry + 1, 0.1, 0, [s, s, s]));
};
/** an apple tree: round canopy with red apples dotted on its skin */
const appleTree = (b: Batch, x: number, z: number, h: number, seed: number, n = 22) => {
  addVeg(b, "fat", x, 0, z, h, seed, 0);
  const r = rng(seed + 99), cy = 0.58 * h, R = 0.4 * h;
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, e = -0.5 + 1.1 * r(), d = R * (0.86 + 0.1 * r());
    b.add(cached("apple", () => new THREE.SphereGeometry(0.1, 10, 8)), shiny("#e0261e", 60), M4(x + Math.cos(a) * Math.cos(e) * d, cy + Math.sin(e) * d * 0.85, z + Math.sin(a) * Math.cos(e) * d));
  }
};
// ---- buildings ----
/** gabled building: walls (w along x, d along z), pitched roof, door, windows with white frames */
const gabled = (b: Batch, x: number, z: number, w: number, d: number, h: number, wall: Mat, roof: Mat, ry = 0, trim = "#f4efe2") => {
  const m = M4(x, 0, z, ry), put = (g: THREE.BufferGeometry, mat: Mat, lm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(lm));
  put(rbox(w, h, d, 0.08), wall, M4(0, h / 2, 0));
  const rh = 0.42 * d;
  put(plate([[-d / 2, 0], [d / 2, 0], [0, rh]], w - 0.02, 0.03).rotateY(Math.PI / 2), wall, M4(0, h, 0));
  for (const s of [-1, 1]) put(rbox(w + 0.5, 0.18, Math.hypot(d / 2, rh) + 0.35, 0.05), roof, M4(0, h + rh / 2 + 0.05, (s * d) / 4).multiply(new THREE.Matrix4().makeRotationX(s * Math.atan2(rh, d / 2))));
  put(rbox(1.2, 2.2, 0.1, 0.03), col(trim), M4(0, 1.1, d / 2 + 0.03));
  put(rbox(0.9, 1.95, 0.1, 0.02), col("#5a3a2a"), M4(0, 1.0, d / 2 + 0.06));
  for (const s of [-1, 1]) { put(rbox(1.0, 1.2, 0.1, 0.02), col(trim), M4(s * w * 0.3, h * 0.55, d / 2 + 0.03)); put(rbox(0.75, 0.95, 0.1, 0.02), col("#34465a"), M4(s * w * 0.3, h * 0.55, d / 2 + 0.06)); }
};
// ---- the 1904 automobile ----
/** spoked wooden wheel (axis along local x): tyre, painted rim, 12 spokes, brass hub */
const spokeWheel = (b: Batch, m: THREE.Matrix4, R: number, spokeC = "#efe2b8") => {
  b.add(cached("tyre" + R, () => new THREE.TorusGeometry(R - 0.035, 0.045, 8, 28).rotateY(Math.PI / 2)), col("#2a2a2e"), m);
  b.add(cached("rim" + R, () => new THREE.TorusGeometry(R - 0.09, 0.022, 6, 28).rotateY(Math.PI / 2)), col(spokeC), m);
  b.add(cached("spokes" + R, () => { const parts: THREE.BufferGeometry[] = []; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; parts.push(rod(V(0, 0, 0), V(0, Math.sin(a) * (R - 0.09), Math.cos(a) * (R - 0.09)), 0.022, 0.016, 6).toNonIndexed()); } return mergeGeometries(parts, false); }), col(spokeC), m);
  b.add(cached("hub", () => new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12).rotateZ(Math.PI / 2)), shiny(BRASS, 90), m);
};
const WHEEL_R = { front: 0.4, rear: 0.45 };
const WHEEL_POS: [number, number, number, number][] = [[-0.66, 0.4, 1.0, 0.4], [0.66, 0.4, 1.0, 0.4], [-0.68, 0.45, -1.05, 0.45], [0.68, 0.45, -1.05, 0.45]];
/** open-top 1904 touring car body (nose +z): tub with a tall rear tonneau, leather seats, bonnet, brass radiator +
 *  headlamps + horn, black mudguards + running boards, raked steering column. Wheels are separate rigs. */
const autoBody = (b: Batch, paint: string) => {
  const P0 = shiny(paint, 70), dark = col("#2a2628"), leather = col("#5a2e24"), brass = shiny(BRASS, 90);
  rb(b, dark, -0.5, 0.5, 0.42, 0.56, -1.6, 1.5, 0.04);                                    // chassis
  rb(b, P0, -0.62, 0.62, 0.55, 1.08, -0.35, 0.5, 0.1);                                    // front tub
  rb(b, P0, -0.66, 0.66, 0.55, 1.22, -1.65, -0.35, 0.16);                                 // rear tonneau
  rb(b, shiny(paint === "#26262c" ? "#3a3a44" : "#f2e6c8", 60), -0.67, 0.67, 1.0, 1.06, -1.6, 0.48, 0.02); // pin-stripe band
  rb(b, leather, -0.55, 0.55, 0.85, 0.95, -0.25, 0.4, 0.06);                              // front cushion
  rb(b, leather, -0.55, 0.55, 0.9, 1.45, -0.42, -0.25, 0.08);                             // front backrest
  rb(b, leather, -0.58, 0.58, 0.95, 1.06, -1.45, -0.75, 0.06);                            // rear cushion
  rb(b, leather, -0.6, 0.6, 1.0, 1.58, -1.62, -1.42, 0.1);                                // rear backrest
  rb(b, P0, -0.44, 0.44, 0.6, 1.05, 0.5, 1.42, 0.12);                                     // bonnet
  rb(b, brass, -0.42, 0.42, 0.55, 1.12, 1.42, 1.54, 0.04);                                // brass radiator
  rb(b, dark, -0.34, 0.34, 0.62, 1.04, 1.53, 1.56, 0.01);                                 // radiator grille
  for (const s of [-1, 1]) {
    b.add(cached("lamp", () => new THREE.CylinderGeometry(0.12, 0.1, 0.24, 14).rotateX(Math.PI / 2)), brass, M4(s * 0.55, 1.0, 1.42));
    b.add(cached("lampGlass", () => new THREE.CircleGeometry(0.1, 14)), glow("#fff2c8", 1.05), M4(s * 0.55, 1.0, 1.545));
    b.add(rod(V(s * 0.55, 0.88, 1.38), V(s * 0.5, 0.6, 1.3), 0.02), brass);
    // mudguards: a curved black strip over each wheel + the running board between
    for (const [wz, R] of [[1.0, 0.4], [-1.05, 0.45]] as number[][]) {
      const pts: THREE.Vector3[] = []; for (let k = 0; k <= 8; k++) { const a = Math.PI * (0.05 + 0.75 * (k / 8)) * (wz > 0 ? 1 : 1); pts.push(V(s * 0.72, R + 0.02 + Math.sin(a) * (R + 0.06), wz + Math.cos(a) * (R + 0.08) * (wz > 0 ? 1 : -1))); }
      b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.035, 5).scale(1, 1, 1), dark);
      for (let k = 0; k < 8; k++) b.add(rbox(0.2, 0.03, (R + 0.08) * 0.32, 0.01), dark, M4(s * 0.72, pts[k].y * 0.5 + pts[k + 1].y * 0.5, (pts[k].z + pts[k + 1].z) / 2, 0, 0, Math.atan2(pts[k + 1].y - pts[k].y, pts[k + 1].z - pts[k].z)));
    }
    rb(b, dark, s * 0.62, s * 0.86, 0.38, 0.42, -0.55, 0.55, 0.01);                       // running board
  }
  b.add(rod(V(-0.3, 0.6, 0.55), V(-0.3, 1.32, 0.18), 0.03), dark);                          // steering column (right-hand? left)
  b.add(cached("stWheel", () => new THREE.TorusGeometry(0.19, 0.022, 6, 20)), col("#4a2a1a"), M4(-0.3, 1.36, 0.15, 0, 0, 0).multiply(new THREE.Matrix4().makeRotationX(-1.0)));
  b.add(rod(V(0.66, 1.05, 0.35), V(0.72, 1.25, 1.1), 0.02), brass);                         // bulb horn
  b.add(cached("hornBell", () => new THREE.ConeGeometry(0.1, 0.24, 12, 1, true).rotateX(Math.PI / 2)), brass, M4(0.72, 1.25, 1.18));
  b.add(cached("hornBulb", () => new THREE.SphereGeometry(0.07, 10, 8)), col("#2a2226"), M4(0.66, 1.06, 0.3));
  rb(b, glass("#a8c8d8"), -0.55, 0.55, 1.1, 1.5, 0.52, 0.56, 0.01);                       // upright windscreen
  rb(b, brass, -0.58, 0.58, 1.48, 1.52, 0.5, 0.58, 0.01);
};
const glass = (c: string) => { let m = mats.get("glass" + c) as THREE.MeshLambertMaterial | undefined; if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: 0.35, depthWrite: false })); mats.set("glass" + c, m); } return m; };
export const CAR_PAINT = ["#2f6a4a", "#d6a42a", "#26262c", "#7a2a32"];
type CarRig = { root: THREE.Group; wheels: THREE.Group[] };
const makeCar = (parent: THREE.Object3D, paint: string): CarRig => {
  const root = new THREE.Group(), bb = new Batch(); autoBody(bb, paint); bb.build(root, true);
  const wheels = WHEEL_POS.map(([x, y, z, R]) => { const wb = new Batch(); spokeWheel(wb, new THREE.Matrix4(), R); const g = new THREE.Group(); wb.build(g, true); g.position.set(x, y, z); root.add(g); return g; });
  root.visible = false; parent.add(root);
  return { root, wheels };
};
const poseCars = (rigs: CarRig[], id: number, f: number) => {
  const ps = carsAt(id, f), live = new Set<number>();
  for (const c of ps) {
    const r = rigs[c.k]; if (!r) continue; live.add(c.k);
    r.root.visible = true; r.root.position.set(c.x, c.bob, c.z); r.root.rotation.set(0, c.yaw, 0);
    const d = c.x * Math.sin(c.yaw) + c.z * Math.cos(c.yaw);
    r.wheels.forEach((w, i) => { w.rotation.x = d / WHEEL_POS[i][3]; });
  }
  rigs.forEach((r, k) => { if (!live.has(k)) r.root.visible = false; });
};
// ---- the finish tape: intact between two posts, or broken into two halves fluttering from the posts ----
type TapeRig = { whole: THREE.Group; halves: THREE.Group[] };
const finishTape = (parent: THREE.Object3D, x: number, z0: number, z1: number, y: number, c = "#fbfaf2"): TapeRig => {
  const L = z1 - z0, wb = new Batch(); wb.add(rbox(0.03, 0.07, L, 0.01), col(c)); const whole = new THREE.Group(); wb.build(whole, false); whole.position.set(x, y, (z0 + z1) / 2); parent.add(whole);
  const halves = [z0, z1].map((zz, k) => { const hb = new Batch(); hb.add(rbox(0.03, 0.07, L * 0.5, 0.01), col(c), M4(0, 0, (k ? -1 : 1) * L * 0.25)); const g = new THREE.Group(); hb.build(g, false); g.position.set(x, y, zz); g.visible = false; parent.add(g); return g; });
  return { whole, halves };
};
const poseTape = (t: TapeRig, br: number, f: number) => {
  t.whole.visible = br < 0;
  t.halves.forEach((h, k) => {
    h.visible = br >= 0; if (br < 0) return;
    const u = Math.min(1, br / 8), sw = 0.25 * Math.sin(f * 0.7 + k) * Math.exp(-br / 20);
    h.rotation.set((k ? -1 : 1) * (1.25 * u + sw), 0, 0.5 * u * (k ? 1 : -1)); // swing down from the post
  });
};

// =================================================================================================================
// SETS
// =================================================================================================================
export type SetRig = { name: SetName; group: THREE.Group; tick?: (t: number, id: number) => void };
/** per-set world settings: haze reach multiplier (the open prairie sees far) */
export const SET_META: Record<SetName, { hazeK: number; indoor?: boolean; ceil?: number }> = {
  country: { hazeK: 2.8 }, stadium: { hazeK: 2.2 }, boston: { hazeK: 1.8 },
};
const done = (name: SetName, b: Batch, cards?: Batch): SetRig => {
  const group = new THREE.Group(); group.name = name;
  b.build(group, true);
  if (cards) buildNoInk(cards, group);
  return { name, group };
};
const FAR = 900;
/** a sub-group built from its own batch (toggled / posed per frame by the set's tick) */
const sub = (parent: THREE.Object3D, b: Batch, cast = true) => { const g = new THREE.Group(); b.build(g, cast); parent.add(g); return g; };
const roadM = () => groundM("dirtRoad", () => P.dirtRoadHD());
const stubbleM = () => groundM("stubble", () => P.stubbleHD());
const vergeM = () => groundM("verge", () => P.stubbleHD("vergeHD", "#c4a85a"));
const pastureM = () => groundM("pasture", () => P.pastureHD());
const pasture2M = () => groundM("pasture2", () => P.pastureHD("pasture2HD", "#7ab24e"));
const plowM = () => groundM("plow", () => P.stubbleHD("plowHD", "#a8784a"));
/** the dirt road strip along z (x -2.6..2.6), uv offset so the ruts sit in the wheel tracks */
const roadStrip = (b: Batch, z0: number, z1: number, w = SPOT.ROAD_W) => {
  const g = new THREE.PlaneGeometry(w, z1 - z0, 1, Math.max(1, Math.round((z1 - z0) / 20))).rotateX(-Math.PI / 2).translate(0, 0.015, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 3) / 6, p.getZ(i) / 6);
  b.add(g, roadM());
};
/** a crowd stand: n tiers rising toward `back` (unit direction), each tier a bench box; returns nothing (cards added in cast.ts) */
const tiers = (b: Batch, x0: number, x1: number, zFront: number, n: number, depth: number, rise: number, dir: 1 | -1, wood: Mat, paint: Mat) => {
  for (let k = 0; k < n; k++) {
    const za = zFront + dir * k * depth, zb = za + dir * depth, y = 0.6 + k * rise;
    rb(b, wood, x0, x1, 0, y, Math.min(za, zb), Math.max(za, zb), 0.04, [2, 1]);
    rb(b, paint, x0, x1, y - 0.08, y + 0.02, Math.min(za, zb) - 0.01, Math.min(za, zb) + 0.12, 0.02);
  }
};
/** a string of bunting triangles hung from a to b, sagging, red / white / blue */
const bunting = (b: Batch, a: THREE.Vector3, c: THREE.Vector3, n: number, sag = 0.35) => {
  const C3 = ["#c8282e", "#fbfaf2", "#2f4a9a"];
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 0.85) / n, um = (u0 + u1) / 2;
    const p = (u: number) => a.clone().lerp(c, u).add(V(0, -sag * 4 * u * (1 - u), 0));
    const p0 = p(u0), p1 = p(u1), pm = p(um).add(V(0, -0.38, 0));
    b.add(tri(p0, p1, pm), col(C3[i % 3], THREE.DoubleSide));
  }
  b.add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, a.clone().lerp(c, 0.5).add(V(0, -sag * 2, 0)), c), 12, 0.012, 3), col("#3a3a3a"));
};
/** a flagpole with the 1904 flag (unlit, gently bent) */
const flagPole = (b: Batch, x: number, y: number, z: number, h: number, ry: number) => {
  b.add(rod(V(x, y, z), V(x, y + h, z), 0.05, 0.035, 8), col("#f2efe6"));
  b.add(cached("finial", () => new THREE.SphereGeometry(0.09, 10, 8)), shiny(BRASS), M4(x, y + h + 0.06, z));
  const fg = cached("flagGeo", () => { const g = new THREE.PlaneGeometry(2.1, 1.4, 12, 1); const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + 1.05) / 2.1; p.setZ(i, 0.16 * Math.sin(u * 7) * u); } g.translate(1.05, 0, 0); return g; });
  b.add(fg, unlit("flag1904", () => P.flagHD()), M4(x, y + h - 0.75, z, ry));
};

// ---- the country course ----
const buildCountry = (): SetRig => {
  const b = new Batch(), R = SPOT.ROAD_W / 2;
  // ground: dry verge everywhere, patchwork fields either side of the road, the road strip
  terrain(b, vergeM(), -FAR, FAR, -FAR, FAR, 4, undefined, 4, -0.01);
  const fields: [number, number, number, number, () => Mat][] = [];
  const r = rng(11);
  for (let side = -1; side <= 1; side += 2) for (let z = -700; z < 560; z += 0) {
    const L = 50 + 60 * r(), kind = Math.floor(r() * 3);
    fields.push([side < 0 ? -260 : 5.5, side < 0 ? -5.5 : 260, z, z + L, [pastureM, stubbleM, pasture2M, plowM][kind === 2 && r() > 0.5 ? 3 : kind]]);
    z += L + 3;
  }
  for (const [x0, x1, z0, z1, m] of fields) terrain(b, m(), x0, x1, z0, z1, 4, undefined, 4, 0.0);
  roadStrip(b, -FAR, 600);
  // hay stooks on the stubble fields, in rows
  for (const [x0, x1, z0, z1, m] of fields) if (m === stubbleM) {
    const rr = rng(Math.round(z0 * 7 + x0));
    for (let z = z0 + 6; z < z1 - 4; z += 9) for (let x = (x0 > 0 ? x0 + 8 : x1 - 8); x0 > 0 ? x < Math.min(x1, x0 + 90) : x > Math.max(x0, x1 - 90); x += x0 > 0 ? 9 : -9) stook(b, x + rr() * 2, z + rr() * 2, 0.9 + 0.3 * rr(), rr() * 6);
  }
  // corn: the chase lane (z = LANE_Z, along -x) with corn walls on both sides + the far side of the road; more corn blocks
  const LZ = SPOT.LANE_Z;
  cornBlock(b, -140, -4.2, LZ - 70, LZ - 2.2); cornBlock(b, -140, -4.2, LZ + 8.0, LZ + 60);
  cornBlock(b, 4.6, 120, LZ - 70, LZ + 60);
  cornBlock(b, -120, -4.4, -110, -32); cornBlock(b, 4.6, 70, 180, 300); cornBlock(b, -90, -4.4, 200, 320); cornBlock(b, -160, -4.4, -600, -440);
  cornRow(b, -4.0, LZ - 2.0, -130, LZ - 2.0, 5); cornRow(b, -4.3, LZ - 2.6, -130, LZ - 2.6, 6);
  cornRow(b, -4.0, LZ + 7.6, -130, LZ + 7.6, 7);
  cornRow(b, -4.3, -110, -4.3, -32, 8); cornRow(b, 4.4, LZ - 70, 4.4, LZ + 60, 9);
  // the lane itself: a dirt track
  { const g = new THREE.PlaneGeometry(140, 5.2).rotateX(-Math.PI / 2).translate(-72, 0.014, LZ + 0.5); const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getZ(i) - LZ + 2.5) / 6, p.getX(i) / 6); b.add(g, roadM()); }
  railFence(b, -4.2, LZ + 6.8, -130, LZ + 6.8, 21);
  // the sign at the lane junction (arrow is a rig)
  b.add(rod(V(SPOT.SIGN10[0], 0, SPOT.SIGN10[2]), V(SPOT.SIGN10[0], 2.7, SPOT.SIGN10[2]), 0.07, 0.06, 8), woodM("#7a5a3c"));
  // fences along the road (gaps at the well, the orchard gate, the lane, the creek)
  const gaps: [number, number, number][] = [[1, -126, -114], [1, -236, -220], [-1, LZ - 3, LZ + 8], [1, 104, 116], [-1, 104, 116], [1, -96, -60]];
  for (const side of [-1, 1]) {
    let z0 = -460;
    const gs = gaps.filter((g) => g[0] === side).sort((a, c) => a[1] - c[1]);
    for (const [, ga, gb] of gs) { if (ga > z0) railFence(b, side * (R + 1.5), z0, side * (R + 1.5), ga, Math.round(z0 * 3 + side)); z0 = gb; }
    railFence(b, side * (R + 1.5), z0, side * (R + 1.5), 300, Math.round(z0 * 3 + side));
  }
  for (let z = -440; z < 520; z += 38) telePole(b, -(R + 3.2), z);
  // tufts along the verges
  for (let z = -440; z < 300; z += 14) { tufts(b, -(R + 0.9), z, 0, 2.2, 10, 3000 + z, undefined, undefined, 1.0); tufts(b, R + 0.9, z, 0, 2.2, 10, 4000 + z, undefined, undefined, 1.0); }
  // hedgerow trees along field edges + big shade trees by the road
  for (const [x0, x1, z0] of fields) { const rr = rng(Math.round(z0 * 3 + x0 + 5)); const xe = x0 > 0 ? x0 + 40 + 40 * rr() : x1 - 40 - 40 * rr(); for (let k = 0; k < 4; k++) addVeg(b, rr() > 0.3 ? "round" : "tall", xe + (rr() - 0.5) * 10, 0, z0 + rr() * 6, 6 + 4 * rr(), Math.round(z0 * 11 + k + x0), 1); }
  for (const [x, z, h] of [[9, 30, 8], [-10, 60, 9], [8.5, -20, 7.5], [-9, -150, 8], [10, -60, 8.5], [-12, 140, 8], [11, 90, 7], [-8.5, 20, 7]] as number[][]) addVeg(b, "fat", x, 0, z, h, x * 13 + z, 0);
  // the orchard: rows of apple trees east of the road, the hero tree
  for (let x = 10.5; x < 46; x += 5.6) for (let z = -262; z < -196; z += 5.6) { if (Math.hypot(x - SPOT.TREE8[0], z - SPOT.TREE8[2]) < 4) continue; appleTree(b, x + 0.6 * Math.sin(z), z, 4 + 0.8 * Math.sin(x * z), Math.round(x * 31 + z)); }
  terrain(b, pastureM(), 5.5, 50, -268, -192, 4, undefined, 4, 0.006);
  appleTree(b, SPOT.TREE8[0], SPOT.TREE8[2], 5.0, 77, 30);
  for (let i = 0; i < 6; i++) { const rr = rng(500 + i); b.add(cached("apple", () => new THREE.SphereGeometry(0.1, 10, 8)), shiny("#c8301e", 50), M4(SPOT.TREE8[0] + 0.4 + 1.6 * rr(), 0.09, SPOT.TREE8[2] - 1.8 - 1.2 * rr(), 0, 0, 0, [0.7, 0.7, 0.7])); }
  // the well (bucket + rope are a rig)
  const W = SPOT.WELL;
  b.add(lathe("wellRing", [[0.5, 0], [0.78, 0], [0.82, 0.86], [0.78, 0.92], [0.52, 0.92], [0.5, 0.5]], 28), texM("stone", () => P.stoneHD()), M4(W[0], 0, W[2]));
  b.add(cached("wellHole", () => new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2)), col("#1e1a1c"), M4(W[0], 0.62, W[2]));
  for (const s of [-1, 1]) b.add(rbox(0.14, 2.3, 0.14, 0.03), woodM("#7a5a3c"), M4(W[0] + s * 0.72, 1.15, W[2]));
  b.add(rod(V(W[0] - 0.85, 1.55, W[2]), V(W[0] + 0.85, 1.55, W[2]), 0.09, 0.09, 12), woodM("#9a7a58"));
  b.add(rod(V(W[0] + 0.86, 1.55, W[2]), V(W[0] + 0.86, 1.3, W[2] + 0.25), 0.03), col("#3a3a40"));
  for (const s of [-1, 1]) b.add(rbox(2.1, 0.08, 1.15, 0.03), woodM("#8a5a3a"), M4(W[0], 2.55, W[2] + s * 0.48).multiply(new THREE.Matrix4().makeRotationX(s * 0.62)));
  // the creek across the course + a plank bridge for the road; stones on the banks
  const CZ = SPOT.CREEK_Z;
  b.add(new THREE.PlaneGeometry(400, 4.2).rotateX(-Math.PI / 2).translate(0, 0.03, CZ), lam("creek", () => ({ color: "#3f9ad8" })));
  for (let i = 0; i < 120; i++) { const rr = rng(700 + i), x = -120 + 240 * rr(); if (Math.abs(x) < 3.2) continue; b.add(cached("pebble", () => new THREE.SphereGeometry(0.3, 8, 6).scale(1, 0.5, 0.8)), col(rr() > 0.5 ? "#9a948a" : "#b8b0a2"), M4(x, 0.05, CZ + (rr() > 0.5 ? 2.2 : -2.2) + (rr() - 0.5), rr() * 3, 0, 0, [0.6 + rr(), 0.6 + rr(), 0.6 + rr()])); }
  for (let k = 0; k < 9; k++) rb(b, woodM("#9a7a58"), -2.8, 2.8, 0.05, 0.2, CZ - 2.6 + k * 0.58, CZ - 2.1 + k * 0.58, 0.03, [2, 1]);
  for (const s of [-1, 1]) rb(b, woodM("#7a5a3c"), s * 2.7 - 0.08, s * 2.7 + 0.08, 0, 0.9, CZ - 2.6, CZ + 2.6, 0.03);
  // farms for colour: a red barn + silo, a white farmhouse; another barn down the road
  gabled(b, 46, -60, 14, 10, 6, col("#b8322a"), col("#5a4a44"), 0.2, "#f8f4ea"); b.add(lathe("silo", [[0, 0], [2.4, 0], [2.4, 11], [1.8, 12.2], [0, 12.6]], 20), col("#d8d2c4"), M4(56, 0, -54));
  gabled(b, -40, -95, 9, 8, 5, col("#f2ede0"), col("#4a5a6a"), -0.3, "#2f5a3a");
  gabled(b, 38, 110, 12, 9, 5.5, col("#a83026"), col("#5a4a44"), -0.4);
  gabled(b, -46, 230, 9, 8, 5, col("#f2ede0"), col("#7a3a2a"), 0.5);
  gabled(b, 60, -330, 14, 10, 6, col("#b8322a"), col("#5a4a44"), 1.2, "#f8f4ea");
  // the distant stadium at the end of the road: an oval of stands with flags
  const SF = SPOT.STADIUM_FAR;
  b.add(lathe("farStand", [[52, 0], [64, 0], [64, 9], [60, 10], [52, 3]], 40), col("#d8c8a8"), M4(SF[0], 0, SF[2], 0, 0, 0, [1, 1, 0.7]));
  b.add(lathe("farRoof", [[58, 9.8], [65, 11], [65, 11.4], [58, 10.2]], 40), col("#b8322a"), M4(SF[0], 0, SF[2], 0, 0, 0, [1, 1, 0.7]));
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; flagPole(b, SF[0] + Math.cos(a) * 64, 11, SF[2] + Math.sin(a) * 64 * 0.7, 4, a); }
  // far backdrop: low prairie hills, scattered woods
  for (let i = 0; i < 160; i++) { const rr = rng(900 + i), a = rr() * 6.28, d = 280 + 300 * rr(); addVeg(b, rr() > 0.4 ? "round" : "tall", Math.cos(a) * d, 0, Math.sin(a) * d, 9 + 7 * rr(), 900 + i, 2); }
  hillRing(b, 0, 0, 820, 14, 40, 8, "#5a7a5a");
  const rig = done("country", b), G = rig.group;
  // ---- rigs: cars, the well bucket, the sign arrow, the hay wagon + horse ----
  const cars = CAR_PAINT.map((c) => makeCar(G, c));
  const bk = new Batch();
  bk.add(lathe("bucket", [[0.0, 0], [0.17, 0], [0.21, 0.32], [0.19, 0.32], [0.15, 0.03], [0, 0.03]], 16), woodM("#8a5a34"));
  for (const y of [0.06, 0.26]) bk.add(cached("band" + y, () => new THREE.TorusGeometry(0.16 + 0.12 * y, 0.012, 4, 20).rotateX(Math.PI / 2)), col("#4a4a50"), M4(0, y, 0));
  bk.add(new THREE.TorusGeometry(0.2, 0.012, 4, 16, Math.PI), col("#4a4a50"), M4(0, 0.32, 0));
  const gBucket = sub(G, bk);
  const rp = new Batch(); rp.add(rod(V(0, 0, 0), V(0, 1, 0), 0.015, 0.015, 5), col("#c8a46a")); const gRope = sub(G, rp, false);
  const ab = new Batch();
  ab.add(plate([[-0.75, -0.13], [0.35, -0.13], [0.35, -0.28], [0.8, 0], [0.35, 0.28], [0.35, 0.13], [-0.75, 0.13]], 0.06, 0.015), col("#f4ecd4"));
  ab.add(plate([[-0.6, -0.05], [0.4, -0.05], [0.4, -0.13], [0.62, 0], [0.4, 0.13], [0.4, 0.05], [-0.6, 0.05]], 0.07, 0.01), col("#c0352e"));
  const gArrow = sub(G, ab); gArrow.position.set(SPOT.SIGN10[0], 2.5, SPOT.SIGN10[2]);
  const wg = new Batch();
  rb(wg, woodM("#9a6a42"), -0.9, 0.9, 0.75, 0.9, -1.8, 1.8, 0.04);
  for (const s of [-1, 1]) rb(wg, woodM("#8a5a3a"), s * 0.9 - 0.05, s * 0.9 + 0.05, 0.9, 1.4, -1.8, 1.8, 0.03);
  wg.add(cached("hayMound", () => { const g = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); return uvFrom(g, (x, y, z) => [x + z, y]); }), texM("hay", () => P.hayHD()), M4(0, 0.9, 0, 0, 0, 0, [1.0, 0.9, 1.9]));
  for (const [x, z, R] of [[-1.0, 1.2, 0.45], [1.0, 1.2, 0.45], [-1.0, -1.2, 0.55], [1.0, -1.2, 0.55]] as number[][]) spokeWheel(wg, M4(x, R, z), R, "#9a6a42");
  wg.add(rod(V(0, 0.75, 1.8), V(0, 0.65, 3.2), 0.05), woodM("#8a5a3a"));
  // the horse: a chunky brown body, neck, head, legs, tail, a dark mane
  const hc = col("#8a5a34"), hd = col("#3a2a20");
  wg.add(cached("hBody", () => new THREE.SphereGeometry(1, 16, 12)), hc, M4(0, 1.45, 4.2, 0, 0, 0, [0.42, 0.45, 0.95]));
  wg.add(rbox(0.32, 0.95, 0.4, 0.14), hc, M4(0, 2.0, 4.95).multiply(new THREE.Matrix4().makeRotationX(0.55)));
  wg.add(rbox(0.3, 0.32, 0.7, 0.14), hc, M4(0, 2.38, 5.4).multiply(new THREE.Matrix4().makeRotationX(0.35)));
  wg.add(rbox(0.08, 0.6, 0.34, 0.03), hd, M4(0, 2.25, 4.85).multiply(new THREE.Matrix4().makeRotationX(0.55)));
  for (const s of [-1, 1]) wg.add(cached("ear", () => new THREE.ConeGeometry(0.06, 0.18, 6)), hc, M4(s * 0.09, 2.62, 5.15));
  for (const [x, z] of [[-0.2, 3.6], [0.2, 3.6], [-0.2, 4.8], [0.2, 4.8]]) wg.add(rod(V(x, 0, z), V(x, 1.3, z), 0.07, 0.09, 6), hc);
  wg.add(rod(V(0, 1.55, 3.3), V(0, 0.8, 3.0), 0.06, 0.1, 6), hd);
  const gWagon = sub(G, wg);
  rig.tick = (t, id) => {
    const f = Math.round(t * 30);
    poseCars(cars, id, f);
    const W2 = SPOT.WELL, k = bucketK(f), by = id === 5 ? 0.4 + 0.95 * k : 0.8;
    gBucket.visible = gRope.visible = id === 5 || id === 14 || id === 1;
    gBucket.position.set(W2[0] + 0.05, by, W2[2]); gBucket.rotation.z = id === 5 ? 0.06 * Math.sin(f * 0.5) * k : 0;
    gRope.position.set(W2[0] + 0.05, by + 0.34, W2[2]); gRope.scale.set(1, Math.max(0.05, 1.5 - by - 0.34), 1);
    gArrow.rotation.y = id === 10 ? signSpin(f) * 2.2 : 0.4;
    gWagon.visible = id === 14; gWagon.position.set(1.0, 0, wagonZ(f));
  };
  return rig;
};

// ---- the 1904 stadium ----
const buildStadium = (): SetRig => {
  const b = new Batch();
  terrain(b, pastureM(), -FAR, FAR, -FAR, FAR, 4, undefined, 4, -0.01);
  terrain(b, groundM("cinder", () => P.cinderHD()), -160, 160, -4.2, 4.2, 4, undefined, 4, 0.01);
  for (const z of [-4.2, 4.2]) rb(b, col("#fbfaf2"), -160, 160, 0.0, 0.03, z - 0.06, z + 0.06, 0.01);
  rb(b, col("#fbfaf2"), -0.09, 0.09, 0.0, 0.03, -4.2, 4.2, 0.01);                                    // the finish line
  rb(b, col("#fbfaf2"), SPOT.START_X - 0.09, SPOT.START_X + 0.09, 0.0, 0.03, -4.2, 4.2, 0.01);          // the start line
  // the grandstand along -z: 9 tiers, a white front rail with bunting, roof on posts, flags on the roof
  const wood = woodM("#a8845a"), white = col("#f4efe2"), red = col("#b8322a");
  tiers(b, -60, 60, -6.6, 9, 1.05, 0.52, -1, wood, white);
  rb(b, white, -60, 60, 0, 1.1, -6.6, -6.4, 0.03);
  rb(b, col("#8a6a4a"), -60.2, 60.2, 0, 9.4, -16.5, -16.2, 0.04);
  for (let x = -60; x <= 60; x += 7.5) { b.add(rod(V(x, 1.1, -6.55), V(x, 8.2, -6.55), 0.11, 0.09, 8), white); b.add(rod(V(x, 4.6, -16.3), V(x, 9.4, -16.3), 0.12, 0.1, 8), white); }
  b.add(rbox(121, 0.25, 11.2, 0.06), col("#3d6b4a"), M4(0, 8.8, -11.4).multiply(new THREE.Matrix4().makeRotationX(-0.1)));
  rb(b, white, -60.6, 60.6, 7.9, 8.35, -6.1, -5.7, 0.04);
  for (let x = -60; x < 60; x += 7.5) bunting(b, V(x, 7.9, -5.75), V(x + 7.5, 7.9, -5.75), 9, 0.5);
  for (let x = -60; x < 60; x += 7.5) bunting(b, V(x, 1.15, -6.3), V(x + 7.5, 1.15, -6.3), 9, 0.15);
  for (let x = -54; x <= 54; x += 12) flagPole(b, x, 9.2, -6.2, 3.4, -0.3);
  // the end stand across the far (-x) end: tiers rising toward -x, a roof, bunting
  tiers(b, -60, 60, -46, 8, 1.05, 0.55, -1, wood, white);
  // (tiers() runs along z; rotate the end stand by building it separately)
  // the end stand proper (along z at x ~ -50)
  for (let k = 0; k < 8; k++) { const x0 = -48 - k * 1.05, y = 0.6 + k * 0.55; rb(b, wood, x0 - 1.05, x0, 0, y, -34, 30, 0.04, [2, 1]); rb(b, white, x0 - 0.12, x0 + 0.01, y - 0.08, y + 0.02, -34, 30, 0.02); }
  rb(b, white, -48.1, -47.9, 0, 1.1, -34, 30, 0.03);
  for (let z = -34; z < 30; z += 8) bunting(b, V(-47.8, 1.15, z), V(-47.8, 1.15, z + 8), 9, 0.15);
  rb(b, col("#8a6a4a"), -57.4, -57.0, 0, 7.6, -34, 30, 0.04);
  b.add(rbox(10.4, 0.25, 64.4, 0.06), col("#2f4a8a"), M4(-52.2, 7.4, -2).multiply(new THREE.Matrix4().makeRotationZ(0.12)));
  for (let z = -30; z <= 26; z += 8) { b.add(rod(V(-47.6, 1.1, z), V(-47.6, 7.0, z), 0.1, 0.08, 8), white); flagPole(b, -47.6, 7.0, z, 3, 1.4); }
  // the finish posts (+ tape rig), a judges' table with bunting on the infield side
  for (const z of [-4.5, 4.5]) { b.add(rbox(0.16, 1.7, 0.16, 0.04), white, M4(0, 0.85, z)); b.add(cached("postKnob", () => new THREE.SphereGeometry(0.12, 10, 8)), red, M4(0, 1.76, z)); }
  rb(b, wood, 2.5, 6.5, 0, 0.9, 6.2, 7.2, 0.05);
  bunting(b, V(2.5, 0.88, 7.25), V(6.5, 0.88, 7.25), 6, 0.1);
  // trees beyond the stands and the infield; far city haze
  for (let i = 0; i < 90; i++) { const rr = rng(1200 + i), x = -150 + 300 * rr(), z = -24 - 50 * rr(); addVeg(b, "round", x, 0, z, 9 + 6 * rr(), 1200 + i, 1); }
  for (let i = 0; i < 40; i++) { const rr = rng(1400 + i), x = -150 + 300 * rr(), z = 40 + 80 * rr(); addVeg(b, "round", x, 0, z, 8 + 6 * rr(), 1400 + i, 1); }
  for (let i = 0; i < 30; i++) { const rr = rng(1500 + i), z = -60 + 120 * rr(); addVeg(b, "round", -70 - 30 * rr(), 0, z, 9 + 6 * rr(), 1500 + i, 1); }
  hillRing(b, 0, 0, 800, 10, 30, 9, "#5a7a5a");
  const rig = done("stadium", b), G = rig.group;
  const tape = finishTape(G, 0, -4.4, 4.4, 1.22);
  rig.tick = (t, id) => { const f = Math.round(t * 30); poseTape(tape, tapeBreak(id, f), f); tape.whole.visible = tape.whole.visible && id !== 9 && id !== 3 && id !== 7; if (id === 9 || id === 3 || id === 7) tape.halves.forEach((h) => (h.visible = false)); };
  return rig;
};

// ---- Boston, spring 1905 ----
const brickM = (c: string) => texM("brick" + c, () => P.brickHD(c));
/** a 3-4 storey brick row building facing the street (+z side faces -z if face = -1) */
const rowHouse = (b: Batch, x0: number, x1: number, zf: number, face: 1 | -1, h: number, brick: string, awning: string, seed: number) => {
  const r = rng(seed), d = 10, zb = zf + -face * d, w = x1 - x0;
  rb(b, brickM(brick), x0, x1, 0, h, Math.min(zf, zb), Math.max(zf, zb), 0.06, 2);
  rb(b, col("#efe6d2"), x0 - 0.15, x1 + 0.15, h, h + 0.5, Math.min(zf, zb) - 0.2 * face, Math.max(zf, zb) + 0.2 * -face, 0.06); // cornice
  rb(b, col("#efe6d2"), x0, x1, 3.6, 3.8, Math.min(zf, zf + face * 0.25), Math.max(zf, zf + face * 0.25), 0.03);                  // string course
  const nw = Math.max(2, Math.floor(w / 2.4)), floors = Math.floor((h - 4.2) / 3.1);
  for (let fl = 0; fl < floors; fl++) for (let k = 0; k < nw; k++) {
    const x = x0 + (w * (k + 0.5)) / nw, y = 4.6 + fl * 3.1;
    rb(b, col("#f2ece0"), x - 0.62, x + 0.62, y, y + 1.9, zf + face * 0.02 - 0.06, zf + face * 0.12 + 0.06, 0.03);
    rb(b, col(r() > 0.3 ? "#3a4a5e" : "#e8d8a8"), x - 0.48, x + 0.48, y + 0.12, y + 1.78, zf + face * 0.1 - 0.05, zf + face * 0.16 + 0.05, 0.01);
    rb(b, col("#f2ece0"), x - 0.7, x + 0.7, y - 0.12, y, zf + face * 0.2 - 0.12, zf + face * 0.2 + 0.12, 0.02);
  }
  // shop front: dark window + door, a striped awning sloping out over the sidewalk
  rb(b, col("#2f4a3a"), x0 + 0.4, x1 - 0.4, 0, 3.2, zf + face * 0.05 - 0.08, zf + face * 0.05 + 0.08, 0.03);
  rb(b, col("#4a6a8a"), x0 + 0.8, x1 - 2.2, 0.8, 2.9, zf + face * 0.15 - 0.03, zf + face * 0.15 + 0.03, 0.01);
  const aw = cached("awn" + w, () => { const g = new THREE.PlaneGeometry(w - 0.6, 1.8, 8, 1); return uvFrom(g, (x) => [(x + w / 2) / 1.2, 0]); });
  const stripes = texM("awning" + awning, () => P.ctex("awnTex" + awning, 128, 16, (g) => { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? "#fbf6ea" : awning; g.fillRect(i * 32, 0, 32, 16); } }));
  b.add(aw, stripes, M4((x0 + x1) / 2, 3.5, zf + face * 0.85, face > 0 ? 0 : Math.PI).multiply(new THREE.Matrix4().makeRotationX(-0.95)));
};
const buildBoston = (): SetRig => {
  const b = new Batch();
  terrain(b, groundM("cobble", () => P.cobbleHD()), -FAR, FAR, -FAR, FAR, 4, undefined, 4, -0.01);
  for (const s of [-1, 1]) rb(b, col("#cfc6b4"), -200, 200, 0, 0.16, s > 0 ? 5.2 : -8.8, s > 0 ? 8.8 : -5.2, 0.03, 2);
  // brick rows both sides
  const BR = ["#b4513a", "#9a4a36", "#c26a4a", "#a8442e", "#d8b890"], AW = ["#2f7a4a", "#c0352e", "#2f5ab8", "#d8a02a"];
  for (const face of [1, -1] as const) { let x = -120, i = 0; while (x < 80) { const w = 9 + 5 * ((i * 7 + (face > 0 ? 3 : 0)) % 4) / 3; rowHouse(b, x, x + w - 0.2, face > 0 ? 9 : -9, face > 0 ? -1 : 1, 11 + 4 * ((i * 5 + (face > 0 ? 1 : 2)) % 3), BR[(i + (face > 0 ? 0 : 2)) % 5], AW[(i + (face > 0 ? 1 : 0)) % 4], i * 13 + face); x += w; i++; } }
  // blossom trees + gas lamps along the sidewalks
  for (const s of [-1, 1]) for (let x = -110; x < 70; x += 9) { addVeg(b, "round", x + (s > 0 ? 0 : 4.5), 0.16, s * 6.9, 6.0 + Math.sin(x) * 0.8, Math.round(x * 3 + s), 0, 5); }
  for (const s of [-1, 1]) for (let x = -105; x < 70; x += 18) { b.add(rod(V(x, 0, s * 5.6), V(x, 3.6, s * 5.6), 0.07, 0.05, 8), col("#2a3a32")); b.add(rbox(0.36, 0.5, 0.36, 0.05), glow("#fff2c0", 1.0), M4(x, 3.85, s * 5.6)); b.add(cached("lampCap", () => new THREE.ConeGeometry(0.3, 0.3, 4)), col("#2a3a32"), M4(x, 4.25, s * 5.6, 0.78)); }
  // the finish banner: two poles, a blue banner with gold stripes and stars (no words), bunting, the tape rig
  for (const s of [-1, 1]) { b.add(rod(V(0, 0, s * 5.4), V(0, 6.8, s * 5.4), 0.1, 0.08, 8), col("#f2efe6")); b.add(cached("finial", () => new THREE.SphereGeometry(0.09, 10, 8)), shiny(BRASS), M4(0, 6.86, s * 5.4)); }
  b.add(new THREE.PlaneGeometry(10.4, 1.3).rotateY(Math.PI / 2), unlit("bostonBanner", () => P.ctex("bannerTex", 1024, 128, (g) => {
    g.fillStyle = "#2a3f8a"; g.fillRect(0, 0, 1024, 128); g.fillStyle = "#f2c23a"; g.fillRect(0, 10, 1024, 12); g.fillRect(0, 106, 1024, 12);
    for (let i = 0; i < 9; i++) { const cx = 60 + i * 113, cy = 64; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr2 = k % 2 ? 12 : 30; g.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } g.closePath(); g.fillStyle = "#fbfaf2"; g.fill(); }
  })), M4(0, 5.6, 0));
  bunting(b, V(0, 4.85, -5.4), V(0, 4.85, 5.4), 14, 0.4);
  for (const s of [-1, 1]) flagPole(b, s > 0 ? 6 : -6, 9.0, s * 9.2, 3, s > 0 ? -1.6 : 1.6);
  hillRing(b, 0, 0, 800, 10, 30, 10, "#6a8a7a");
  const rig = done("boston", b), G = rig.group;
  const tape = finishTape(G, 0, -5.3, 5.3, 1.25);
  const cars = CAR_PAINT.map((c) => makeCar(G, c));
  rig.tick = (t, id) => { const f = Math.round(t * 30); poseTape(tape, tapeBreak(id, f), f); poseCars(cars, id, f); };
  return rig;
};

/** every set of the film; world.ts adds the groups and toggles .visible per shot */
export const buildSets = (): Record<SetName, SetRig> => ({ country: buildCountry(), stadium: buildStadium(), boston: buildBoston() });

// =================================================================================================================
// FOREGROUND framing props (story.ts FOREGROUND, composition.md 3.3). world.ts calls fgUpdate(group, id, f, cam) every
// frame; the kits are built once into `group` (cached by kit name) and placed in camera space ("cam") or world space.
// Kit front = local +z (faces the lens). The shot's DOF blurs them.
// =================================================================================================================
const fgKit = (kit: string): THREE.Group => {
  const g = new THREE.Group(), b = new Batch();
  switch (kit) {
    case "grass": tufts(b, 0, 0, 0, 0.9, 26, 7, undefined, undefined, 1.6); break;
    case "corn": cornRow(b, -0.6, 0, 0.6, 0.2, 41, 0.35); break;
    case "fence": railFence(b, -2, 0, 2, 0, 43); break;
    default: break;
  }
  b.build(g, false);
  g.name = "fg_" + kit;
  return g;
};
const _fv = new THREE.Vector3(), _fr = new THREE.Vector3(), _fu = new THREE.Vector3();
/** pose the FOREGROUND prop(s) of frame f (entries are matched by frame range; several may share a kit) */
export const fgUpdate = (group: THREE.Group, id: number, f: number, cam: THREE.PerspectiveCamera) => {
  void id;
  const live = new Set<string>(), count = new Map<string, number>();
  for (const e of FOREGROUND) {
    if (f < e.a || f >= e.b) continue;
    const n = count.get(e.kit) ?? 0; count.set(e.kit, n + 1);
    const name = "fg_" + e.kit + "_" + n;
    let o = group.getObjectByName(name) as THREE.Group | undefined;
    if (!o) { o = fgKit(e.kit); o.name = name; group.add(o); }
    live.add(name);
    o.visible = true;
    o.scale.setScalar(e.s ?? 1);
    if (e.space === "cam") {
      cam.updateMatrixWorld();
      cam.getWorldDirection(_fv);
      _fr.setFromMatrixColumn(cam.matrixWorld, 0); _fu.setFromMatrixColumn(cam.matrixWorld, 1);
      o.position.copy(cam.position).addScaledVector(_fr, e.pos[0]).addScaledVector(_fu, e.pos[1]).addScaledVector(_fv, e.pos[2]);
      o.rotation.set(e.tilt ?? 0, Math.atan2(-_fv.x, -_fv.z) + (e.yaw ?? 0), 0, "YXZ");
    } else {
      o.position.set(...e.pos);
      o.rotation.set(e.tilt ?? 0, e.yaw ?? 0, 0, "YXZ");
    }
    o.updateMatrixWorld(true);
  }
  for (const c of group.children) if (c.name.startsWith("fg_") && !live.has(c.name)) c.visible = false;
};
void smooth;
