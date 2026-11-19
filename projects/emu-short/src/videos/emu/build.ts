// Sets for "The Great Emu War" (owner: sets, with paint.ts): the Western Australian wheat belt, 1932. Every set is one
// THREE.Group built at the world origin in its own frame (story.ts SPOT anchors); world.ts shows only the active shot's
// set. Set meshes stay on camera layer 0, so the world ink pass outlines them; the wheat clump cards (alpha cut-outs)
// live on NOINK. Shapes are chunky and bevelled (rbox, lathes, extrusions) and every material is two-tone (lam ->
// twoTone). CONTRACTS: buildSets(), SET_META, SetRig, buildRigs() (truck, Lewis guns, loose crates) + pose helpers,
// fgUpdate(), WHEAT (sway clock) (read by world.ts).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as P from "./paint";
import { rng, rep, ctex } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";
import { SPOT, SetName, FOREGROUND, TRIPOD_H, CRATE, TruckPose, GunPose, CratePose, farmHill, paddockRise, DAM_PROFILE } from "./story";

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
// the nature kit ships a teal palette; our valley wants storybook greens and browns
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
const LEAF = ["#7f9a6c", "#8aa274", "#738f66", "#93a87a", "#6c8560"]; // grey-green Australian scrub
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
const addVeg = (b: Batch, k: VegKind, x: number, y: number, z: number, h: number, seed: number, q = 0) => {
  const r = rng(Math.abs(Math.floor(seed)) % 200000 + 7), U = (a: number, c: number) => a + (c - a) * r();
  const leaf = leafMat(k === "cone" ? 4 : k === "hedge" ? 1 : Math.floor(r() * 4)), lobe = lobeGeo(q), yaw = r() * 6.28;
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
/** transparent lettering decal (no depth write -> NOINK, so it never gets a rectangle outline) */
const decalMat = (key: string, text: string, w: number, h: number, fg: string, style: P.SignStyle = "slab") =>
  lam("decal" + key, () => ({ map: P.signTex(key, text, Math.round(Math.min(2048, (w / h) * 256)), 256, { bg: null, fg, style, border: null, cap: 0.7, stroke: "rgba(0,0,0,0)" }), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
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
const tufts = (b: Batch, cx: number, cz: number, r0: number, r1: number, n: number, seed: number, avoid?: (x: number, z: number) => boolean) => {
  const r = rng(seed), m1 = col("#a99a52", THREE.DoubleSide), m2 = col("#c2ad62", THREE.DoubleSide), m3 = col("#8f9454", THREE.DoubleSide);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = r0 + (r1 - r0) * Math.sqrt(r()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (avoid?.(x, z)) continue;
    const s = 0.8 + 0.8 * r();
    b.add(tuftGeo(), [m1, m2, m3][i % 3], M4(x, 0, z, r() * 6.28, 0, 0, [s, s, s]));
  }
};
/** wheel (tyre torus-ish cylinder + hubcap + red dot), axis along local z */
const wheel = (b: Batch, m: THREE.Matrix4, r: number, w: number, hub = "#e8e4da") => {
  b.add(cached("tyre" + r + w, () => lathe("tyreP" + r + w, [[r * 0.55, -w / 2], [r * 0.92, -w / 2], [r, -w * 0.32], [r, w * 0.32], [r * 0.92, w / 2], [r * 0.55, w / 2]], 22).clone().rotateX(Math.PI / 2)), col("#2b2d33"), m);
  b.add(cached("hub" + r, () => new THREE.SphereGeometry(r * 0.48, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 1).rotateX(Math.PI / 2)), col(hub), m.clone().multiply(M4(0, 0, w * 0.42)));
  b.add(cached("hubR" + r, () => new THREE.SphereGeometry(r * 0.48, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 1).rotateX(-Math.PI / 2)), col(hub), m.clone().multiply(M4(0, 0, -w * 0.42)));
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

// =================================================================================================================
// WHEAT BELT KIT
// =================================================================================================================
/** shared sway clock for wheat clumps + canopy ripple (world.ts sets uTime every frame) */
export const WHEAT = { uTime: { value: 0 } };
/** add a wind-sway vertex patch to a two-tone material (k = metres of sway at the top of a card, by uv.y) */
const sway = <T extends THREE.Material>(m: T, mode: "card" | "canopy", key: string): T => {
  if (m.userData.sway) return m;
  m.userData.sway = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    sh.uniforms.uWT = WHEAT.uTime;
    const body = mode === "card"
      ? "float swk = clamp(uv.y, 0.0, 1.0); swk *= swk; transformed.x += swk * 0.09 * sin(uWT * 2.3 + position.x * 0.45 + position.z * 0.31); transformed.z += swk * 0.06 * sin(uWT * 1.9 + position.z * 0.5 + position.x * 0.2);"
      : "transformed.y += 0.035 * sin(uWT * 2.0 + position.x * 0.35 + position.z * 0.22) + 0.02 * sin(uWT * 3.1 - position.z * 0.6);";
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWT;").replace("#include <begin_vertex>", "#include <begin_vertex>\n" + body);
  };
  m.customProgramCacheKey = () => "sway_" + key;
  return m;
};
const wheatTopM = () => sway(texM("wheatTop", () => P.wheatTopHD()), "canopy", "top");
const wheatSideM = () => texM("wheatSide", () => P.wheatSideHD());
const wheatCardM = (k: number) => sway(lam("wheatCard" + k, () => ({ map: P.wheatCardTex(k), alphaTest: 0.5, side: THREE.DoubleSide })), "card", "card" + k);
const WHEAT_H = 0.95;
/** cheap value noise for terrain bumps */
const vn2 = (x: number, z: number, s: number) => {
  const h = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7 + s * 17.3) * 43758.5453; return v - Math.floor(v); };
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
  return (h(ix, iz) * (1 - u) + h(ix + 1, iz) * u) * (1 - w) + (h(ix, iz + 1) * (1 - u) + h(ix + 1, iz + 1) * u) * w;
};
/** a wheat block: undulating canopy top at ~0.95 m (tile 3 m), stalk walls on its four sides */
const wheatBlock = (b: Batch, x0: number, x1: number, z0: number, z1: number, h = WHEAT_H, seed = 1) => {
  const w = x1 - x0, d = z1 - z0, nx = Math.max(2, Math.min(160, Math.round(w / 2.2))), nz = Math.max(2, Math.min(160, Math.round(d / 2.2)));
  const g = new THREE.PlaneGeometry(w, d, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), edge = Math.min(x - x0, x1 - x, z - z0, z1 - z);
    const y = h * (0.88 + 0.12 * Math.min(1, edge / 1.5)) + 0.16 * (vn2(x / 7, z / 7, seed) - 0.5) + 0.06 * (vn2(x / 2.2, z / 2.2, seed + 3) - 0.5);
    p.setY(i, y); uv.setXY(i, x / 3, z / 3);
  }
  g.computeVertexNormals();
  b.add(g, wheatTopM());
  const side = (ax: number, az: number, bx: number, bz: number) => {
    const L = Math.hypot(bx - ax, bz - az);
    b.add(quad(V(ax, 0, az), V(bx, 0, bz), V(bx, h * 0.92, bz), V(ax, h * 0.92, az), L / 3, (h * 0.92) / 1.5), wheatSideM());
  };
  side(x0, z1, x1, z1); side(x1, z0, x0, z0); side(x0, z0, x0, z1); side(x1, z1, x1, z0);
};
/** one clump: 3 crossed alpha cards (0.55 m wide, height h), normals up so they shade like the canopy */
const clumpGeo = () => cached("clump", () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3, c = Math.cos(a) * 0.3, s2 = Math.sin(a) * 0.3;
    const q = quad(V(-c, 0, -s2), V(c, 0, s2), V(c, 1, s2), V(-c, 1, -s2));
    const n = q.attributes.normal as THREE.BufferAttribute;
    for (let k = 0; k < n.count; k++) n.setXYZ(k, 0, 1, 0);
    parts.push(q);
  }
  return mergeGeometries(parts, false);
});
/** scatter clumps over a rect (base on the ground; ears poke 0.15-0.45 m above the canopy) */
const clumps = (b: Batch, x0: number, x1: number, z0: number, z1: number, n: number, seed: number, hk = 1) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * r(), z = z0 + (z1 - z0) * r(), h = (WHEAT_H + 0.18 + 0.32 * r()) * hk;
    b.add(clumpGeo(), wheatCardM(i % 3), M4(x, 0, z, r() * 6.28, 0, 0, [0.9 + 0.4 * r(), h, 0.9 + 0.4 * r()]));
  }
};
/** clumps along a field edge (from a to b), a ragged fringe that breaks the straight canopy line */
const fringe = (b: Batch, ax: number, az: number, bx: number, bz: number, seed: number, depth = 1.2, per = 2.2) => {
  const r = rng(seed), L = Math.hypot(bx - ax, bz - az), n = Math.round(L * per), tx = (bx - ax) / L, tz = (bz - az) / L;
  for (let i = 0; i < n; i++) {
    const s = r() * L, o = (r() - 0.35) * depth, x = ax + tx * s - tz * o, z = az + tz * s + tx * o, h = WHEAT_H + 0.1 + 0.35 * r();
    b.add(clumpGeo(), wheatCardM(i % 3), M4(x, 0, z, r() * 6.28, 0, 0, [1 + 0.4 * r(), h, 1 + 0.4 * r()]));
  }
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
  return m;
};
const stubbleM = () => groundM("stubble", () => P.stubbleHD());
const dirtM = () => groundM("dirt", () => P.dirtHD());
const paddockM = () => groundM("paddock", () => P.paddockHD());
const paradeM = () => groundM("parade", () => P.paradeHD());
/** ground patch with uv in metres / tile and optional height function (soft rises) */
const terrain = (b: Batch, mat: Mat, x0: number, x1: number, z0: number, z1: number, tile: number, hf?: (x: number, z: number) => number, cell = 4, y0 = 0) => {
  const nx = Math.max(1, Math.min(200, Math.round((x1 - x0) / cell))), nz = Math.max(1, Math.min(200, Math.round((z1 - z0) / cell)));
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, hf ? nx : 1, hf ? nz : 1).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y0, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (hf) p.setY(i, y0 + hf(x, z)); uv.setXY(i, x / tile, z / tile); }
  if (hf) g.computeVertexNormals();
  b.add(g, mat);
};
/** red dirt track along x (z0..z1) with two darker wheel ruts and a grassy crown */
const track = (b: Batch, x0: number, x1: number, z0: number, z1: number, y = 0.02) => {
  terrain(b, groundM("track", () => P.dirtHD("trackHD", "#c4602e")), x0, x1, z0, z1, 4, undefined, 4, y);
  const w = z1 - z0;
  for (const k of [0.27, 0.73]) terrain(b, groundM("rut", () => P.dirtHD("rutHD", "#9a4424")), x0, x1, z0 + w * k - 0.22, z0 + w * k + 0.22, 3, undefined, 4, y + 0.008);
};

// ---- eucalyptus (gum trees) ----
const barkM = () => texM("gumBark", () => P.gumBarkHD());
const gumLeafM = (k: number) => lam("gumLeaf" + k, () => ({ map: P.gumLeafHD(k) }));
/** gum tree: pale crooked trunk forking into 2-4 limbs, each ending in a clumpy grey-green crown with sky gaps */
const gum = (b: Batch, x: number, z: number, h: number, seed: number, q = 0) => {
  const r = rng(seed * 7 + 3), lean = (r() - 0.5) * 0.25, la = r() * 6.28;
  const base = V(x, -0.2, z), fork = V(x + Math.cos(la) * lean * h * 0.4, h * (0.32 + 0.12 * r()), z + Math.sin(la) * lean * h * 0.4);
  const R0 = 0.035 * h;
  b.add(rod(base, fork, R0 * 1.25, R0 * 0.8, q ? 7 : 10), barkM());
  b.add(cached("gumFoot", () => new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), barkM(), M4(x, -0.05, z, 0, 0, 0, [R0 * 2.1, R0 * 2.2, R0 * 2.1]));
  const n = 2 + Math.floor(r() * 3), lobe = lobeGeo(q);
  for (let i = 0; i < n; i++) {
    const a = la + (i / n) * 6.28 + (r() - 0.5) * 0.8, out = h * (0.16 + 0.14 * r()), up = h * (0.32 + 0.22 * r());
    const tip = V(fork.x + Math.cos(a) * out, fork.y + up, fork.z + Math.sin(a) * out);
    const mid = V((fork.x + tip.x) / 2 + Math.cos(a) * 0.15 * out, (fork.y + tip.y) / 2, (fork.z + tip.z) / 2 + Math.sin(a) * 0.15 * out);
    b.add(rod(fork, mid, R0 * 0.75, R0 * 0.55, 7), barkM()); b.add(rod(mid, tip, R0 * 0.55, R0 * 0.3, 6), barkM());
    const leaf = gumLeafM(Math.floor(r() * 3)), cr = h * (0.12 + 0.06 * r());
    for (let k = 0; k < 4; k++) { // a clump = a few flattened lobes
      const ox = (r() - 0.5) * cr * 1.6, oz = (r() - 0.5) * cr * 1.6, oy = (r() - 0.3) * cr * 0.6, rr2 = cr * (0.55 + 0.45 * r());
      b.add(lobe, leaf, new THREE.Matrix4().compose(V(tip.x + ox, tip.y + oy, tip.z + oz), yawQ(r() * 6.28), V(rr2 * 1.15, rr2 * 0.62, rr2 * 1.15)));
    }
  }
};
/** a scatter of gums in a ring band (far dressing) */
const gumBand = (b: Batch, cx: number, cz: number, r0: number, r1: number, a0: number, a1: number, n: number, seed: number, avoid?: (x: number, z: number) => boolean) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * r(), d = r0 + (r1 - r0) * r(), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (avoid?.(x, z)) continue;
    gum(b, x, z, 9 + 9 * r(), seed * 31 + i, d > 120 ? 2 : 1);
  }
};
/** grey saltbush / scrub clumps */
const scrub = (b: Batch, cx: number, cz: number, r0: number, r1: number, n: number, seed: number, avoid?: (x: number, z: number) => boolean) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = r0 + (r1 - r0) * Math.sqrt(r()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (avoid?.(x, z)) continue;
    addVeg(b, "bush", x, 0, z, 0.6 + 0.7 * r(), seed * 13 + i, d > 60 ? 2 : 1);
  }
};

// ---- fence: weathered posts + four sagging wires ----
const postM = () => col("#8a6c4c");
const wireM = () => col("#5a5650");
const fence = (b: Batch, ax: number, az: number, bx: number, bz: number, seed: number, step = 3.6) => {
  const r = rng(seed), L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n, hgt = 1.2 + 0.08 * r();
    b.add(rbox(0.13, hgt, 0.13, 0.03), postM(), M4(x, hgt / 2 - 0.02, z, r() * 0.6, (r() - 0.5) * 0.06, (r() - 0.5) * 0.06));
    pts.push(V(x, 0, z));
  }
  for (const y of [0.32, 0.58, 0.84, 1.1]) for (let i = 0; i < n; i++) {
    const a = pts[i].clone().setY(y), c = pts[i + 1].clone().setY(y), m = a.clone().lerp(c, 0.5); m.y -= 0.05;
    b.add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, c), 4, 0.011, 3), wireM());
  }
};

// ---- far backdrop: soft hills + a gum line on the horizon ----
const horizon = (b: Batch, seed: number, avoid?: (x: number, z: number) => boolean) => {
  hillRing(b, 0, 0, 900, 10, 34, seed, "#b9a98c");
  hillRing(b, 0, 0, 1300, 22, 60, seed + 1, "#a9a8a4");
  gumBand(b, 0, 0, 170, 320, 0, Math.PI * 2, 46, seed + 2, avoid);
};

// ---- farmhouse: weatherboard walls on stumps, corrugated-iron hip roof, bullnose verandah, water tank ----
const ironM = () => texM("ironRoof", () => P.corrugatedHD("#a8acaa"));
const ironRedM = () => texM("ironRed", () => P.corrugatedHD("#b0503a"));
const trimM = () => col("#3f6a4a");
const farmhouse = (b: Batch) => {
  const [hx, , hz] = SPOT.HOUSE, W = 11, D = 8, F = SPOT.FLOOR, WH = 2.85, fz = SPOT.HOUSE_Z, vd = SPOT.VERANDA_D;
  const x0 = hx - W / 2, x1 = hx + W / 2, z0 = hz - D / 2;
  // stumps + floor + verandah boards
  for (let x = x0 + 0.3; x <= x1; x += 1.6) for (const z of [z0 + 0.3, fz - 0.3, fz + vd - 0.25]) b.add(rbox(0.18, F, 0.18, 0.03), col("#6a5440"), M4(x, F / 2, z));
  b.add(rbox(W + 0.2, 0.12, vd + 0.1, 0.03), texM("veranda", () => rep(P.planksHD(), 3, 1)), M4(hx, F - 0.06, fz + vd / 2));
  b.add(rbox(W, 0.14, D, 0.02), col("#7a6450"), M4(hx, F - 0.07, hz));
  // walls (weatherboards)
  const wall = texM("weatherboard", () => P.sidingHD("#efe2c4"));
  rb(b, wall, x0, x1, F, F + WH, z0, fz, 0.04, 2);
  // corner boards + window / door trim on the front wall
  for (const x of [x0, x1]) rb(b, col("#f6efe0"), x - 0.06, x + 0.06, F, F + WH, fz - 0.06, fz + 0.06, 0.02);
  const fw = fz + 0.02;
  const door = (x: number) => { rb(b, col("#f6efe0"), x - 0.55, x + 0.55, F, F + 2.2, fw, fw + 0.06, 0.02); rb(b, col("#4f7a5a"), x - 0.45, x + 0.45, F, F + 2.1, fw + 0.04, fw + 0.09, 0.02); b.add(cached("knob", () => new THREE.SphereGeometry(0.05, 8, 6)), col("#e2c45a"), M4(x + 0.32, F + 1.05, fw + 0.12)); };
  const win = (x: number) => {
    rb(b, col("#f6efe0"), x - 0.62, x + 0.62, F + 0.8, F + 2.3, fw, fw + 0.07, 0.02);
    rb(b, col("#2f3c4a"), x - 0.5, x + 0.5, F + 0.9, F + 2.2, fw + 0.05, fw + 0.09, 0.01);
    rb(b, col("#f6efe0"), x - 0.52, x + 0.52, F + 1.52, F + 1.6, fw + 0.06, fw + 0.12, 0.01);
    rb(b, col("#f6efe0"), x - 0.04, x + 0.04, F + 0.9, F + 2.2, fw + 0.06, fw + 0.12, 0.01);
    rb(b, col("#3f6a4a"), x - 0.95, x - 0.66, F + 0.8, F + 2.3, fw, fw + 0.06, 0.02); rb(b, col("#3f6a4a"), x + 0.66, x + 0.95, F + 0.8, F + 2.3, fw, fw + 0.06, 0.02);
  };
  door(hx - 1.4); win(hx - 3.9); win(hx + 1.6);
  // hip roof: 4 corrugated faces (ribs run down the slope) + ridge cap
  const rx0 = x0 - 0.45, rx1 = x1 + 0.45, rz0 = z0 - 0.45, rz1 = fz + 0.35, ry0 = F + WH, ry1 = ry0 + 2.6, rmid = (rz0 + rz1) / 2, inset = (rz1 - rz0) / 2;
  const r0 = V(rx0 + inset, ry1, rmid), r1 = V(rx1 - inset, ry1, rmid);
  const face = (a: THREE.Vector3, c: THREE.Vector3, top0: THREE.Vector3, top1: THREE.Vector3) => {
    const g = mergeGeometries([tri(a, c, top1), tri(a, top1, top0)].map((x) => x), false);
    uvFrom(g, (x, y, z) => [(x + z) / 2, y / 2]);
    b.add(g, ironM());
  };
  face(V(rx0, ry0, rz1), V(rx1, ry0, rz1), r0, r1);         // front
  face(V(rx1, ry0, rz0), V(rx0, ry0, rz0), r1, r0);         // back
  b.add(tri(V(rx1, ry0, rz1), V(rx1, ry0, rz0), r1), ironM()); // hips
  b.add(tri(V(rx0, ry0, rz0), V(rx0, ry0, rz1), r0), ironM());
  b.add(rod(r0, r1, 0.09), col("#8d918f"));
  // fascia + gutter
  rb(b, col("#f6efe0"), rx0, rx1, ry0 - 0.22, ry0, rz1 - 0.06, rz1 + 0.02, 0.02);
  // brick chimney
  rb(b, col("#a5503a"), hx + 3.2, hx + 4.0, ry0 - 0.4, ry1 + 0.9, hz - 0.6, hz + 0.2, 0.04);
  rb(b, col("#8a3f2e"), hx + 3.1, hx + 4.1, ry1 + 0.9, ry1 + 1.05, hz - 0.7, hz + 0.3, 0.03);
  // bullnose verandah roof: a quarter-round sweep of red-painted iron from the wall to the front beam
  const prof: [number, number][] = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * (Math.PI / 2); prof.push([fz + 0.1 + (vd - 0.1) * Math.sin(a) * 1.0 + 0.02, F + 2.62 + 0.55 * Math.cos(a)]); }
  const verts: number[] = [], uvs: number[] = [], idx: number[] = [];
  prof.forEach(([z, y], i) => { for (const [k, x] of [[0, x0 - 0.2], [1, x1 + 0.2]] as const) { verts.push(x, y, z); uvs.push((x - x0) / 2, i / 3); } if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
  const vg = new THREE.BufferGeometry(); vg.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3)); vg.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); vg.setIndex(idx); vg.computeVertexNormals();
  b.add(vg, lam("bullnose", () => ({ map: P.corrugatedHD("#b0503a"), side: THREE.DoubleSide })));
  rb(b, col("#f6efe0"), x0 - 0.2, x1 + 0.2, F + 2.45, F + 2.62, fz + vd - 0.1, fz + vd + 0.04, 0.02);
  for (let x = x0; x <= x1 + 0.01; x += W / 4) {
    rb(b, col("#f6efe0"), x - 0.06, x + 0.06, F, F + 2.5, fz + vd - 0.09, fz + vd + 0.03, 0.02);
    for (const s of [-1, 1]) if ((s < 0 && x > x0) || (s > 0 && x < x1)) b.add(tri(V(x, F + 2.45, fz + vd - 0.03), V(x + s * 0.4, F + 2.45, fz + vd - 0.03), V(x, F + 2.05, fz + vd - 0.03)), col("#f6efe0", THREE.DoubleSide));
  }
  // steps
  for (let k = 0; k < 2; k++) rb(b, col("#9a7a58"), hx - 2.1, hx - 0.7, 0, F - 0.22 * (k + 1) + 0.22, fz + vd + 0.3 * k, fz + vd + 0.3 * (k + 1), 0.03);
  // corrugated rainwater tank on a stand at the side, a trough
  const tx = x1 + 1.8, tz = hz + 1.5;
  for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) b.add(rbox(0.16, 1.4, 0.16, 0.03), col("#6a5440"), M4(tx + dx, 0.7, tz + dz));
  b.add(rbox(2.3, 0.14, 2.3, 0.03), col("#6a5440"), M4(tx, 1.42, tz));
  const tank = cached("tank", () => uvFrom(new THREE.CylinderGeometry(1.2, 1.2, 2.0, 24, 1, false), (x, y, z) => [y / 2 + 0.5, (Math.atan2(x, z) / Math.PI) * 2]));
  b.add(tank, texM("tankIron", () => P.corrugatedHD("#b4b8b6")), M4(tx, 2.5, tz));
  b.add(cached("tankLid", () => new THREE.ConeGeometry(1.24, 0.35, 24)), ironM(), M4(tx, 3.67, tz));
  b.add(rod(V(tx - 1.1, 3.0, tz - 0.4), V(x1 + 0.1, 3.3, tz - 0.4), 0.05), col("#8d918f"));
  // wall telephone: wooden box, two bells, crank, mouthpiece horn, earpiece hook (the earpiece itself is in the farmer's hand)
  const [px, py, pz] = SPOT.PHONE, wood = col("#7a4a28");
  rb(b, wood, px - 0.17, px + 0.17, py - 0.36, py + 0.36, pz, pz + 0.16, 0.025);
  rb(b, col("#6a3e20"), px - 0.2, px + 0.2, py - 0.52, py - 0.36, pz, pz + 0.22, 0.03); // writing shelf
  for (const s of [-1, 1]) b.add(cached("bell", () => new THREE.SphereGeometry(0.075, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2)), col("#d8b04a"), M4(px + s * 0.08, py + 0.2, pz + 0.17));
  b.add(lathe("horn", [[0.02, 0], [0.025, 0.08], [0.07, 0.16], [0.075, 0.17], [0, 0.17]], 14), col("#2a2224"), M4(px, py - 0.02, pz + 0.16, 0, 0, Math.PI / 2));
  b.add(rod(V(px + 0.17, py - 0.05, pz + 0.08), V(px + 0.27, py - 0.05, pz + 0.08), 0.015), col("#2a2224"));
  b.add(rod(V(px + 0.27, py - 0.05, pz + 0.08), V(px + 0.27, py - 0.15, pz + 0.12), 0.015), col("#2a2224"));
  b.add(rod(V(px - 0.17, py + 0.05, pz + 0.08), V(px - 0.25, py + 0.05, pz + 0.08), 0.012), col("#2a2224"));
};

// ---- water-pump windmill (lattice tower, galvanised wheel, tail vane, trough) ----
const galvM = () => col("#b9bfc4");
const millWheel = (): THREE.Group => {
  const b = new Batch(), g = new THREE.Group();
  b.add(cached("hubM", () => new THREE.CylinderGeometry(0.22, 0.22, 0.3, 14).rotateX(Math.PI / 2)), col("#8d9297"));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    b.add(rbox(0.36, 1.7, 0.03, 0.01), galvM(), new THREE.Matrix4().compose(V(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.45, a - Math.PI / 2, "ZYX")), V(1, 1, 1)));
  }
  for (const r of [0.45, 2.1]) b.add(new THREE.TorusGeometry(r, 0.03, 5, 36), col("#8d9297"));
  b.build(g, true);
  return g;
};
const windmill = (b: Batch) => {
  const [mx, , mz] = SPOT.MILL, H = 9.6, Bw = 1.4, Tw = 0.28;
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [sx, sz] of legs) b.add(rod(V(mx + sx * Bw, 0, mz + sz * Bw), V(mx + sx * Tw, H, mz + sz * Tw), 0.06), galvM());
  for (const yk of [0.18, 0.42, 0.66, 0.86]) {
    const y = H * yk, w = Bw + (Tw - Bw) * yk, y2 = H * Math.min(1, yk + 0.2), w2 = Bw + (Tw - Bw) * Math.min(1, yk + 0.2);
    for (let i = 0; i < 4; i++) {
      const [ax, az] = legs[i], [bx, bz] = legs[(i + 1) % 4];
      b.add(rod(V(mx + ax * w, y, mz + az * w), V(mx + bx * w, y, mz + bz * w), 0.035), galvM());
      if (yk < 0.86) b.add(rod(V(mx + ax * w, y, mz + az * w), V(mx + bx * w2, y2, mz + bz * w2), 0.025), galvM());
    }
  }
  b.add(rbox(0.7, 0.5, 0.6, 0.08), col("#8d9297"), M4(mx, H + 0.25, mz));
  b.add(rod(V(mx, H + 0.4, mz - 0.1), V(mx, H + 0.4, mz - 2.8), 0.05), galvM());
  b.add(plate([[0, 0], [1.6, 0.4], [1.6, 1.4], [0, 1.0]], 0.04, 0.01), galvM(), M4(mx, H - 0.1, mz - 2.0, Math.PI / 2));
  b.add(rod(V(mx, 0, mz), V(mx, H, mz), 0.03), col("#6a6e72"));
  // trough + little header tank at the base
  b.add(lathe("trough", [[0, 0], [1.1, 0], [1.15, 0.55], [1.05, 0.55], [1.0, 0.1], [0, 0.1]], 24), texM("troughIron", () => P.corrugatedHD("#9fa4a6")), M4(mx + 2.3, 0, mz + 1.4, 0, 0, 0, [1.3, 1, 0.6]));
  b.add(cached("troughWater", () => new THREE.CircleGeometry(1.0, 24).rotateX(-Math.PI / 2)), col("#6d7c74"), M4(mx + 2.3, 0.45, mz + 1.4, 0, 0, 0, [1.3, 1, 0.6]));
};

/** brown dam water: unlit (it reads as water, not as shaded ground), never in the bloom (max channel < 1) */
const damWaterM = () => { let m = mats.get("damWaterB"); if (!m) { m = new THREE.MeshBasicMaterial({ map: P.damWaterHD(), color: new THREE.Color(0.92, 0.9, 0.86) }); m.userData.bloom = false; mats.set("damWaterB", m); } return m; };
// ---- dam: brown water disc in an earthen bank ring (mud inside, dry outside) ----
const dam = (b: Batch) => {
  const R = SPOT.DAM_R, C = SPOT.BANK_R, Hb = SPOT.BANK_H;
  b.add(cached("damWater", () => uvFrom(new THREE.CircleGeometry(R + 0.4, 48).rotateX(-Math.PI / 2), (x, _y, z) => [x / 8, z / 8])), damWaterM(), M4(0, -0.25, 0));
  const inner = DAM_PROFILE.slice(0, 6), outer = DAM_PROFILE.slice(5); void C; void Hb;
  const ring = (key: string, prof: [number, number][], mat: Mat) => {
    const g = cached(key, () => { const l = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 96); return uvFrom(l, (x, _y, z) => [x / 4, z / 4]); });
    b.add(g, mat);
  };
  ring("damIn", inner, texM("mud", () => P.mudHD()));
  ring("damOut", outer, paddockM());
};

// ---- army camp: bell tents with a lamp-lit door, field desk, tally board on an easel, the mountain of brass ----
const canvasM = () => texM("tentCanvas", () => P.canvasHD());
const bellTent = (b: Batch, x: number, z: number, ry: number, lit: boolean, s = 1) => {
  const m = M4(x, 0, z, ry, 0, 0, [s, s, s]);
  b.add(lathe("bellTent", [[2.1, 0], [2.1, 1.05], [1.6, 1.5], [0.9, 2.25], [0.25, 3.0], [0.04, 3.12], [0, 3.13]], 32), canvasM(), m);
  b.add(rod(V(0, 3.0, 0), V(0, 3.45, 0), 0.04), col("#6a4a2c"), m);
  // door: a glowing (or dark) opening on the +z side, flaps tied back
  const glowM = lit ? glow("#ffbf62", 1.7) : col("#4a3a2e");
  const door: [number, number][] = [[-0.55, 0], [0.55, 0], [0.32, 1.25], [0, 1.75], [-0.32, 1.25]];
  b.add(plate(door, 0.02, 0.005), glowM, m.clone().multiply(M4(0, 0, 2.11)));
  for (const sd of [-1, 1]) b.add(plate([[0, 0], [0.38 * sd, 0], [0.12 * sd, 1.7]], 0.04, 0.01), canvasM(), m.clone().multiply(M4(sd * 0.55, 0, 2.08, -0.25 * sd)));
  for (let i = 0; i < 8; i++) { // guy ropes to pegs
    const a = (i / 8) * Math.PI * 2 + 0.2, top = V(Math.sin(a) * 1.75, 1.42, Math.cos(a) * 1.75).applyMatrix4(m), peg = V(Math.sin(a) * 3.6, 0, Math.cos(a) * 3.6).applyMatrix4(m);
    if (Math.abs(Math.sin(a)) < 0.35 && Math.cos(a) > 0) continue; // keep the door clear
    b.add(rod(top, peg, 0.012), col("#d8c8a0"));
    b.add(rbox(0.05, 0.25, 0.05, 0.01), col("#6a4a2c"), M4(peg.x, 0.08, peg.z));
  }
};
const fieldDesk = (b: Batch) => {
  const [dx, , dz] = SPOT.DESK, wood = col("#8a5a32");
  rb(b, wood, dx - 0.65, dx + 0.65, 0.72, 0.78, dz - 0.36, dz + 0.36, 0.02);
  for (const s of [-1, 1]) { b.add(rod(V(dx + s * 0.55, 0, dz - 0.3), V(dx + s * 0.55, 0.72, dz + 0.3), 0.025), wood); b.add(rod(V(dx + s * 0.55, 0, dz + 0.3), V(dx + s * 0.55, 0.72, dz - 0.3), 0.025), wood); }
  rb(b, col("#f6f0e0"), dx - 0.32, dx + 0.12, 0.78, 0.79, dz - 0.05, dz + 0.24, 0.002); // report
  rb(b, col("#ece2c8"), dx - 0.52, dx - 0.18, 0.78, 0.8, dz - 0.25, dz + 0.0, 0.002);
  b.add(lathe("inkpot", [[0, 0], [0.05, 0], [0.05, 0.06], [0.02, 0.08], [0, 0.08]], 12), col("#1f2a44"), M4(dx + 0.3, 0.78, dz + 0.1));
  // oil lamp on the desk: brass base, glass chimney (glowing)
  b.add(lathe("lampBase", [[0, 0], [0.09, 0], [0.1, 0.05], [0.06, 0.12], [0.03, 0.14], [0, 0.14]], 14), col("#c99a3a"), M4(dx + 0.45, 0.78, dz - 0.18));
  b.add(lathe("lampGlass", [[0.03, 0], [0.07, 0.07], [0.04, 0.2], [0.035, 0.26], [0, 0.26]], 14), glow("#ffd27a", 2.4), M4(dx + 0.45, 0.92, dz - 0.18));
};
const tallyBoard = (b: Batch) => {
  const [tx, , tz] = SPOT.TALLY, ry = 0.35;
  const m = M4(tx, 0, tz, ry);
  b.add(rbox(1.3, 0.85, 0.05, 0.02), lam("tallyFace", () => ({ map: P.tallyHD() })), m.clone().multiply(M4(0, 1.45, 0)));
  for (const [x0, z0, x1, z1] of [[-0.45, 0.05, -0.55, 0.35], [0.45, 0.05, 0.55, 0.35], [0, -0.05, 0, -0.65]]) {
    const a = V(x0 * 0.6, 1.9, z0 * 0.2).applyMatrix4(m), c = V(x1, 0, z1).applyMatrix4(m);
    b.add(rod(a, c, 0.03), col("#7a5a3a"));
  }
  rb(b, col("#7a5a3a"), -0.68, 0.68, 0.98, 1.04, -0.05, 0.08, 0.01, 0, 0);
};
const brassMound = (b: Batch) => {
  const [bx, , bz] = SPOT.BRASS;
  const g = cached("brassHeap", () => {
    const l = new THREE.LatheGeometry([[11, -0.2], [9.5, 0.6], [7.2, 2.4], [5.0, 4.6], [3.0, 6.2], [1.4, 7.3], [0.4, 7.7], [0, 7.75]].map(([r, y]) => new THREE.Vector2(r, y)), 56, 0, Math.PI * 2);
    const p = l.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + 0.07 * (vn2(x / 2.5, z / 2.5 + y, 5) - 0.5) * 2; p.setXYZ(i, x * n, y * (1 + 0.04 * (vn2(x / 3, z / 3, 9) - 0.5)), z * n); }
    l.computeVertexNormals();
    return uvFrom(l, (x, y, z) => [(x + z * 0.3) / 2, (y + z) / 2]);
  });
  // brass keeps a warm self-glow (lamp + dusk sky bounce) so it reads golden even on the shaded side, and a hot specular
  const brass = mats.get("brassPhong") ?? (() => { const m = twoTone(new THREE.MeshPhongMaterial({ map: P.brassHD(), shininess: 30, specular: new THREE.Color("#ffe0a0"), emissive: new THREE.Color("#7a5214"), emissiveMap: P.brassHD() })); mats.set("brassPhong", m); return m; })();
  b.add(g, brass, M4(bx, 0, bz));
  const r = rng(77);
  for (let i = 0; i < 140; i++) { // spilled casings around the foot
    const a = r() * 6.28, d = 10.8 + r() * 3.5;
    b.add(cached("casing", () => new THREE.CylinderGeometry(0.03, 0.035, 0.18, 8)), brass, M4(bx + Math.cos(a) * d, 0.035, bz + Math.sin(a) * d, r() * 6.28, Math.PI / 2, 0));
  }
};

// ---- ammunition crates, sandbags ----
const crateM = () => lam("crate303", () => ({ map: P.crateHD() }));
/** one .303 box: bottom centre at (x, y, z), yaw ry */
export const crateGeo = () => rbox(CRATE.L, CRATE.H, CRATE.D, 0.03);
const crate = (b: Batch, x: number, y: number, z: number, ry: number) => {
  b.add(crateGeo(), crateM(), M4(x, y + CRATE.H / 2, z, ry));
  for (const s of [-1, 1]) b.add(cached("crHandle", () => new THREE.TorusGeometry(0.06, 0.012, 4, 10, Math.PI).rotateY(Math.PI / 2)), col("#c9b07a"), M4(x, y + CRATE.H * 0.62, z, ry).multiply(M4(s * (CRATE.L / 2 + 0.005), 0, 0)));
};
/** a wall / stack of crates: nx wide x ny high x nz deep, slightly jittered, starting at (x, z) */
const crateStack = (b: Batch, x: number, z: number, nx: number, ny: number, nz: number, ry: number, seed: number, missing = 0) => {
  const r = rng(seed), c = Math.cos(ry), s = Math.sin(ry);
  for (let k = 0; k < ny; k++) for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (k === ny - 1 && r() < missing) continue;
    const lx = (i - (nx - 1) / 2) * (CRATE.L + 0.03) + (r() - 0.5) * 0.06 + (k % 2) * 0.1, lz = (j - (nz - 1) / 2) * (CRATE.D + 0.03) + (r() - 0.5) * 0.05;
    crate(b, x + lx * c + lz * s, k * CRATE.H, z - lx * s + lz * c, ry + (r() - 0.5) * 0.06);
  }
};
const sandbagGeo = () => cached("sandbag", () => {
  const g = rbox(0.62, 0.2, 0.34, 0.09);
  const p = g.attributes.position as THREE.BufferAttribute, out = g.clone(), q = out.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 - 0.25 * (x / 0.31) ** 2; q.setXYZ(i, x, y * (0.75 + 0.25 * k) + (y > 0 ? 0.02 * k : 0), z * (0.85 + 0.15 * k)); }
  out.computeVertexNormals();
  return out;
});
const sandbagRing = (b: Batch, cx: number, cz: number, R: number, a0: number, a1: number, rows: number, seed: number) => {
  const r = rng(seed), m = texM("hessian", () => P.hessianHD());
  for (let k = 0; k < rows; k++) {
    const n = Math.round(((a1 - a0) * R) / 0.6);
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * (i + (k % 2) * 0.5)) / n;
      if (a > a1) continue;
      b.add(sandbagGeo(), m, M4(cx + Math.sin(a) * R, 0.1 + k * 0.19, cz + Math.cos(a) * R, a + Math.PI / 2 + (r() - 0.5) * 0.1, (r() - 0.5) * 0.05));
    }
  }
};

// =================================================================================================================
// RIGS: the 1930s army truck, Lewis guns (tripod or truck pintle), loose ammo crates. Built once, posed per frame.
// =================================================================================================================
const gunMetal = () => col("#3d4246"), gunDark = () => col("#2a2e31"), stockWood = () => col("#8a5a34");
export const MUZZLE_X = 1.0;
export type GunRig = { root: THREE.Group; tripod: THREE.Group; body: THREE.Group };
const buildGun = (): GunRig => {
  const root = new THREE.Group(), tripod = new THREE.Group(), body = new THREE.Group(), b = new Batch(), t = new Batch();
  // fat finned cooling shroud along +x, the receiver, the flat pan drum on top, wooden butt + grip
  b.add(lathe("shroud", [[0.05, 0], [0.082, 0.03], [0.082, 0.64], [0.07, 0.68], [0.04, 0.76], [0.03, 0.78], [0, 0.78]], 18), gunMetal(), M4(0.08, 0, 0, 0, -Math.PI / 2));
  for (let k = 0; k < 6; k++) b.add(cached("fin", () => new THREE.TorusGeometry(0.083, 0.009, 4, 18).rotateY(Math.PI / 2)), gunDark(), M4(0.18 + k * 0.1, 0, 0));
  b.add(rod(V(0.86, 0, 0), V(MUZZLE_X, 0, 0), 0.017), gunDark());
  b.add(rbox(0.08, 0.05, 0.03, 0.01), gunDark(), M4(0.8, 0.07, 0)); // fore sight
  b.add(rbox(0.38, 0.13, 0.1, 0.03), gunMetal(), M4(-0.07, 0, 0));
  b.add(cached("drum", () => new THREE.CylinderGeometry(0.17, 0.17, 0.06, 28)), col("#4a5056"), M4(-0.02, 0.1, 0));
  b.add(cached("drumHub", () => new THREE.CylinderGeometry(0.045, 0.045, 0.09, 12)), gunDark(), M4(-0.02, 0.11, 0));
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; b.add(rbox(0.11, 0.012, 0.018, 0.004), gunDark(), M4(-0.02 + Math.cos(a) * 0.1, 0.135, Math.sin(a) * 0.1, -a)); }
  b.add(plate([[0, 0.035], [-0.46, -0.03], [-0.48, -0.16], [-0.42, -0.17], [-0.05, -0.07]], 0.05, 0.012), stockWood(), M4(-0.24, 0, 0));
  b.add(rbox(0.05, 0.14, 0.04, 0.012), stockWood(), M4(-0.17, -0.1, 0, 0, 0.3));
  b.add(rbox(0.12, 0.025, 0.04, 0.008), gunDark(), M4(-0.04, -0.07, 0));
  b.build(body, true);
  // tripod: head block + three splayed legs to the ground (TRIPOD_H below the pivot)
  t.add(rbox(0.12, 0.1, 0.12, 0.02), gunDark(), M4(0, -0.08, 0));
  for (const a of [0, 2.2, -2.2]) t.add(rod(V(0, -0.1, 0), V(-Math.cos(a) * 0.62, -TRIPOD_H, Math.sin(a) * 0.62), 0.024), col("#4a4f54"));
  for (const a of [0, 2.2, -2.2]) t.add(rbox(0.1, 0.03, 0.06, 0.01), col("#4a4f54"), M4(-Math.cos(a) * 0.62, -TRIPOD_H + 0.015, Math.sin(a) * 0.62, a));
  t.build(tripod, true);
  root.add(tripod, body);
  return { root, tripod, body };
};
const buildTruck = (): THREE.Group => {
  const g = new THREE.Group(), b = new Batch(), kh = texM("khaki", () => P.khakiHD()), dk = col("#2e3028"), glass = col("#3a4652");
  for (const [x, s] of [[1.55, 1], [1.55, -1], [-1.5, 1], [-1.5, -1]] as const) wheel(b, M4(x, 0.42, s * 0.8), 0.42, 0.22, "#8a8456");
  for (const s of [-1, 1]) rb(b, dk, -2.65, 2.35, 0.55, 0.72, s * 0.4 - 0.06, s * 0.4 + 0.06, 0.02);
  // round front mudguards + running boards; rear guards
  for (const s of [-1, 1]) {
    b.add(cached("fenderF", () => new THREE.CylinderGeometry(0.58, 0.58, 0.36, 22, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2)), lam("khakiD", () => ({ map: P.khakiHD(), side: THREE.DoubleSide })), M4(1.55, 0.48, s * 0.83));
    rb(b, kh, 0.7, 1.08, 0.5, 0.58, s * 0.66, s * 1.0, 0.02);
    rb(b, dk, -0.55, 0.95, 0.46, 0.52, s * 0.66, s * 1.0, 0.01);
    b.add(cached("fenderR", () => new THREE.CylinderGeometry(0.56, 0.56, 0.3, 18, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2)), lam("khakiD", () => ({ map: P.khakiHD(), side: THREE.DoubleSide })), M4(-1.5, 0.5, s * 0.85));
  }
  // bonnet with louvres, radiator + grille, round headlamps on the guards
  rb(b, kh, 0.95, 2.28, 0.72, 1.42, -0.55, 0.55, 0.13);
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) rb(b, dk, 1.25 + k * 0.17, 1.33 + k * 0.17, 1.0, 1.22, s * 0.555 - 0.01, s * 0.555 + 0.01, 0.005);
  rb(b, kh, 2.24, 2.4, 0.62, 1.52, -0.52, 0.52, 0.06);
  for (let k = 0; k < 7; k++) rb(b, dk, 2.38, 2.42, 0.72 + k * 0.11, 0.76 + k * 0.11, -0.42, 0.42, 0.01);
  b.add(cached("radCap", () => new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10)), col("#b9a464"), M4(2.3, 1.56, 0));
  for (const s of [-1, 1]) {
    b.add(lathe("headlamp", [[0, 0], [0.13, 0.0], [0.15, 0.1], [0.12, 0.16], [0, 0.16]], 16), kh, M4(2.2, 1.05, s * 0.78, 0, -Math.PI / 2));
    b.add(cached("hlLens", () => new THREE.CircleGeometry(0.115, 16).rotateY(Math.PI / 2)), col("#f2e6b0"), M4(2.37, 1.05, s * 0.78));
  }
  rb(b, dk, 2.4, 2.55, 0.55, 0.68, -0.95, 0.95, 0.04); // bumper
  // cab: rounded roof, windscreen, side windows, door seam
  rb(b, kh, -0.5, 0.95, 0.72, 1.55, -0.78, 0.78, 0.08);
  rb(b, kh, -0.5, 0.75, 1.55, 2.2, -0.78, 0.78, 0.06);
  rb(b, kh, -0.58, 0.82, 2.18, 2.3, -0.84, 0.84, 0.08);
  rb(b, glass, 0.72, 0.78, 1.62, 2.12, -0.66, 0.66, 0.02);
  b.add(rod(V(0.79, 1.6, 0), V(0.79, 2.15, 0), 0.025), kh);
  for (const s of [-1, 1]) { rb(b, glass, -0.3, 0.55, 1.65, 2.08, s * 0.775 - 0.02, s * 0.775 + 0.02, 0.02); rb(b, dk, 0.62, 0.66, 0.8, 1.6, s * 0.78 - 0.015, s * 0.78 + 0.015, 0.005); rb(b, col("#c9b07a"), 0.35, 0.47, 1.35, 1.39, s * 0.79 - 0.02, s * 0.79 + 0.02, 0.01); }
  // tray: floor + wooden drop sides + tailboard, a few boxes and a rolled tarp
  const plank = texM("trayWood", () => rep(P.planksHD(), 2, 1));
  rb(b, dk, -2.7, -0.55, 0.9, 1.02, -0.92, 0.92, 0.02);
  for (const s of [-1, 1]) rb(b, plank, -2.7, -0.55, 1.02, 1.42, s * 0.92 - 0.04, s * 0.92 + 0.04, 0.02);
  rb(b, plank, -2.74, -2.66, 1.02, 1.42, -0.92, 0.92, 0.02);
  rb(b, plank, -0.6, -0.52, 1.02, 1.5, -0.92, 0.92, 0.02);
  crate(b, -2.2, 1.02, -0.45, 0.1); crate(b, -2.2, 1.02 + CRATE.H, -0.42, -0.05); crate(b, -1.75, 1.02, 0.5, 1.4);
  b.add(cached("tarpRoll", () => new THREE.CylinderGeometry(0.16, 0.16, 1.5, 12).rotateX(Math.PI / 2)), canvasM(), M4(-0.8, 1.18, 0));
  // pintle post for the bolted-on gun (story.ts gunsAt: pivot at (-1.0, 1.85, 0))
  b.add(rod(V(-1.0, 1.02, 0), V(-1.0, 1.78, 0), 0.04), dk);
  b.build(g, true);
  return g;
};
export type Rigs = { truck: THREE.Group; guns: GunRig[]; crates: THREE.Mesh[] };
export const buildRigs = (): Rigs => {
  const crates: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(crateGeo(), crateM()); m.castShadow = true; m.receiveShadow = true; crates.push(m); }
  return { truck: buildTruck(), guns: [buildGun(), buildGun(), buildGun()], crates };
};
export const poseTruck = (g: THREE.Group, p: TruckPose) => {
  g.visible = p.visible;
  g.position.set(...p.pos); g.rotation.set(p.roll, p.yaw, p.pitch, "YZX"); g.updateMatrixWorld(true);
};
/** poses each gun; returns the world muzzle point + direction of each (for flash / smoke cards) */
export const poseGuns = (rigs: Rigs, poses: GunPose[], scene: THREE.Object3D) => {
  const out: { muzzle: THREE.Vector3; dir: THREE.Vector3; breech: THREE.Vector3 }[] = [];
  rigs.guns.forEach((r, i) => {
    const p = poses[i];
    r.root.visible = !!p;
    if (!p) return;
    const parent = p.onTruck ? rigs.truck : scene;
    if (r.root.parent !== parent) parent.add(r.root);
    r.root.position.set(...p.pos);
    r.root.rotation.set(p.tip, p.yaw, 0, "YXZ");
    r.tripod.visible = p.tripod;
    r.body.rotation.set(0, 0, p.pitch);
    r.root.updateMatrixWorld(true);
    out.push({ muzzle: r.body.localToWorld(V(MUZZLE_X + 0.04, 0, 0)), dir: r.body.localToWorld(V(MUZZLE_X + 1, 0, 0)).sub(r.body.localToWorld(V(MUZZLE_X, 0, 0))).normalize(), breech: r.body.localToWorld(V(-0.05, 0.08, 0)) });
  });
  return out;
};
export const poseCrates = (rigs: Rigs, poses: CratePose[], scene: THREE.Object3D) => {
  rigs.crates.forEach((m, i) => {
    const p = poses[i];
    if (m.parent !== scene) scene.add(m);
    m.visible = !!p;
    if (!p) return;
    m.position.set(p.pos[0], p.pos[1] + CRATE.H / 2, p.pos[2]); m.rotation.set(p.roll ?? 0, p.yaw, 0, "YXZ");
  });
};

// =================================================================================================================
// SETS
// =================================================================================================================
export type SetRig = { name: SetName; group: THREE.Group; tick?: (t: number, id: number) => void };
/** per-set world settings (haze reach multiplier: the open wheat belt sees far) */
export const SET_META: Record<SetName, { hazeK: number }> = {
  field: { hazeK: 1.6 }, farm: { hazeK: 1.6 }, road: { hazeK: 1.6 }, paddock: { hazeK: 1.6 }, dam: { hazeK: 1.4 },
  camp: { hazeK: 1.2 }, dump: { hazeK: 1.4 }, parade: { hazeK: 1.5 },
};
const done = (name: SetName, b: Batch, cards?: Batch): SetRig => {
  const group = new THREE.Group(); group.name = name;
  b.build(group, true);
  if (cards) buildNoInk(cards, group);
  return { name, group };
};
const FAR = 600;

// ---- field: stubble in front, standing wheat from WHEAT_Z to the horizon (hook, punchline, ending) ----
const buildField = (): SetRig => {
  const b = new Batch(), c = new Batch(), WZ = SPOT.WHEAT_Z;
  terrain(b, stubbleM(), -FAR, FAR, WZ - 0.5, FAR, 4);
  wheatBlock(b, -FAR, FAR, -420, WZ, WHEAT_H, 3);
  terrain(b, paddockM(), -FAR, FAR, -FAR, -420, 4);
  fringe(c, -40, WZ, 40, WZ, 11, 1.4, 3.2);
  clumps(c, -10, 8, -13, WZ, 520, 12);
  const [cx, , cz] = SPOT.CAM17;
  const r = rng(13);
  for (let i = 0; i < 1900; i++) { // the ending: the lens sits low inside the wheat
    const x = cx - 12 + 26 * r(), z = cz - 26 + 25 * r();
    if (Math.hypot(x - cx, z - cz) < 3.6 || (z > cz - 6 && Math.abs(x - cx) < 1.2 + (cz - z) * 0.5)) continue; // keep the lens' sight line open
    const h = WHEAT_H + 0.15 + 0.35 * r();
    c.add(clumpGeo(), wheatCardM(i % 3), M4(x, 0, z, r() * 6.28, 0, 0, [0.9 + 0.4 * r(), h, 0.9 + 0.4 * r()]));
  }
  tufts(b, 0, 0, 0.5, 9, 150, 14, (x, z) => z < WZ + 0.4 || Math.hypot(x - 0.4, z + 1.2) < 1.6);
  for (const [x, z, h] of [[-26, -70, 15], [-14, -110, 17], [18, -85, 14], [40, -60, 16], [-55, -48, 13], [62, -130, 18], [28, 30, 14], [-34, 22, 12]]) gum(b, x, z, h, x * 7 + z, 1);
  horizon(b, 21);
  return done("field", b, c);
};

// ---- farm: track + fence, the yard with the farmhouse and windmill on the left, wheat to the hill ----
const buildFarm = (): SetRig => {
  const b = new Batch(), c = new Batch(), e = new Batch(), ec = new Batch();
  const [[ex0, ex1], [ez0, ez1]] = SPOT.EAT;
  terrain(b, paddockM(), -FAR, FAR, -126, FAR, 4);
  terrain(b, paddockM(), -FAR, FAR, -FAR, -126, 5, farmHill, 5);
  track(b, -FAR, FAR, 1.0, 4.0);
  terrain(b, groundM("yard", () => P.dirtHD("yardHD", "#c08a5a")), -24, 0, -30, -0.6, 4, undefined, 4, 0.01);
  wheatBlock(b, -FAR, -24, -126, -0.6, WHEAT_H, 4);
  wheatBlock(b, 0, FAR, -126, ez0, WHEAT_H, 5);
  wheatBlock(b, ex1, FAR, ez0, -0.6, WHEAT_H, 6);
  wheatBlock(b, -24, 0, -126, -30, WHEAT_H, 7);
  wheatBlock(e, ex0, ex1, ez0, ez1, WHEAT_H, 8); // the patch the herd eats (scaled down in tick)
  clumps(ec, ex0 + 0.3, ex1 - 0.3, ez0 + 0.3, ez1 - 0.2, 420, 9);
  clumps(c, ex1, 26, -34, -0.6, 900, 10);
  clumps(c, 0, ex1, -34, ez0, 500, 15);
  fringe(c, 0, -0.6, 60, -0.6, 16, 1.0, 2.6);
  fringe(c, 0, -30, 0, -0.6, 17, 1.0, 2.2);
  fringe(c, -60, -0.6, -24, -0.6, 18, 1.0, 1.6);
  fence(b, -70, -0.15, 90, -0.15, 19);
  fence(b, -24.3, -0.3, -24.3, -30, 20);
  farmhouse(b); windmill(b);
  // a small iron shed in the yard
  rb(b, texM("shedIron", () => P.corrugatedHD("#9ea3a4")), -21.5, -17.5, 0, 2.6, -8, -4.5, 0.04, 2);
  b.add(slab([[-21.8, -8.3], [-17.2, -8.3], [-17.2, -4.2], [-21.8, -4.2]], 2.6, 0.12, 0.03), ironRedM(), M4(0, 0, 0, 0, 0, 0.05));
  for (const [x, z, h] of [[-21, -24, 16], [-7, -27, 14], [-19.5, -2.5, 11], [-13, 9.5, 15], [10, 10.5, 17], [24, 8, 13], [-35, 12, 14], [45, 9, 16], [-48, -2, 15]]) gum(b, x, z, h, x * 5 + z * 3, 1);
  scrub(b, -12, -4, 2, 6, 6, 21);
  tufts(b, 4, 2.5, 0, 22, 260, 22, (x, z) => z < 0.1 || (z > 1.2 && z < 3.8 && Math.abs(x) < 30));
  horizon(b, 31, (x, z) => z < -100 && z > -260 && Math.abs(x) < 300);
  const rig = done("farm", b, c);
  const eat = new THREE.Group(); e.build(eat, true); buildNoInk(ec, eat); rig.group.add(eat);
  const wheel = millWheel(); wheel.position.set(SPOT.MILL[0], 10.4, SPOT.MILL[2] + 0.45); rig.group.add(wheel);
  rig.tick = (t, id) => {
    wheel.rotation.z = -t * 2.2;
    const f = t * 30, k = id < 4 ? 0 : id > 4 ? 1 : Math.min(1, Math.max(0, (f - 338) / 32));
    eat.scale.y = 1 - 0.86 * k * k * (3 - 2 * k);
  };
  return rig;
};

// ---- road: red road along x, fence + wheat on -z, paddock on +z, the crate stack ----
const buildRoad = (): SetRig => {
  const b = new Batch(), c = new Batch();
  terrain(b, paddockM(), -FAR * 2, FAR * 2, -5.2, FAR, 4);
  track(b, -FAR * 2, FAR * 2, -3.2, 3.2);
  wheatBlock(b, -FAR * 2, FAR * 2, -300, -5.2, WHEAT_H, 9);
  terrain(b, paddockM(), -FAR * 2, FAR * 2, -FAR, -300, 4);
  fringe(c, -45, -5.2, 45, -5.2, 23, 1.0, 2.6);
  clumps(c, -16, 16, -14, -5.2, 650, 24);
  fence(b, -300, -4.6, 300, -4.6, 25);
  const [sx, , sz] = SPOT.STACK6;
  crateStack(b, sx, sz, 3, 6, 2, 0.05, 26);
  crateStack(b, sx + 2.6, sz + 0.6, 2, 2, 1, -0.3, 27);
  for (let x = -300; x <= 600; x += 45) { // telegraph poles along the road
    b.add(rod(V(x, 0, 6.5), V(x, 6.8, 6.5), 0.12, 0.09), col("#7a5e44"));
    rb(b, col("#7a5e44"), x - 0.06, x + 0.06, 6.2, 6.32, 5.8, 7.2, 0.02);
  }
  for (const z of [5.85, 7.15]) for (let x = -300; x < 600; x += 45) b.add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(x, 6.32, z), V(x + 22.5, 5.9, z), V(x + 45, 6.32, z)), 6, 0.012, 3), wireM());
  for (const [x, z, h] of [[-24, 11, 15], [14, 13, 17], [-50, 9, 13], [40, 10, 16], [80, -14, 15], [130, 11, 17], [-80, -16, 14], [200, -15, 16], [260, 12, 15]]) gum(b, x, z, h, x * 3 + z, 1);
  scrub(b, 0, 12, 6, 30, 30, 28);
  tufts(b, 0, 6, 3.5, 16, 220, 29, (x, z) => z < 3.6);
  horizon(b, 41);
  return done("road", b, c);
};

// ---- paddock: open dry paddock with a low rise, a track, scattered gums and scrub ----
const buildPaddock = (): SetRig => {
  const b = new Batch();
  terrain(b, paddockM(), -FAR, FAR, -FAR, 40, 4, paddockRise, 4);
  terrain(b, paddockM(), -FAR, FAR, 40, FAR, 4);
  track(b, -FAR, FAR, 4.6, 7.4, 0.03);
  for (const [x, z, h] of [[-18, -26, 14], [26, -42, 16], [62, -12, 15], [-44, -58, 13], [12, -125, 15], [-70, -20, 17], [90, -60, 14], [-25, 30, 15], [35, 24, 13]]) gum(b, x, z, h, x * 11 + z, 1);
  // a dead grey tree
  b.add(rod(V(-9, 0, -18), V(-8.6, 5.5, -18.3), 0.32, 0.15), col("#b9b3a8"));
  for (const [dx, dy, dz] of [[1.8, 2.2, 0.4], [-1.5, 1.8, -0.6], [0.6, 2.6, 1.2]]) b.add(rod(V(-8.7, 4.2, -18.2), V(-8.7 + dx, 4.2 + dy, -18.2 + dz), 0.1, 0.03), col("#b9b3a8"));
  scrub(b, 0, -20, 8, 90, 70, 51, (x, z) => (z > 3 && z < 9) || Math.hypot(x, z) < 6);
  tufts(b, 0, 0, 1.5, 22, 320, 52, (x, z) => (z > 4.4 && z < 7.6) || Math.hypot(x, z) < 1.4);
  fence(b, -400, 18, 400, 18, 53, 4);
  fence(b, -32, 18, -32, -300, 54, 4);
  horizon(b, 61);
  return done("paddock", b);
};

// ---- dam ----
const buildDam = (): SetRig => {
  const b = new Batch();
  // ground with a hole for the dam (the outer bank meets it at BANK_R + 4.2)
  b.add(cached("damGround", () => { const g = new THREE.RingGeometry(SPOT.BANK_R + 4.0, FAR, 96, 6).rotateX(-Math.PI / 2); return uvFrom(g, (x, _y, z) => [x / 4, z / 4]); }), paddockM());
  dam(b);
  for (const [x, z, h] of [[-24, -10, 16], [21, -18, 15], [-17, 25, 14], [28, 9, 17], [-6, -30, 15], [40, -35, 14]]) gum(b, x, z, h, x * 9 + z, 1);
  scrub(b, 0, 0, 20, 70, 50, 71);
  tufts(b, 0, 16, 0, 9, 160, 72, (x, z) => Math.hypot(x, z) < SPOT.BANK_R + 0.5);
  fence(b, -200, -48, 200, -48, 73, 4);
  horizon(b, 81);
  return done("dam", b);
};

// ---- camp ----
const buildCamp = (): SetRig => {
  const b = new Batch();
  terrain(b, paddockM(), -FAR, FAR, -FAR, FAR, 4);
  terrain(b, groundM("campDirt", () => P.dirtHD("campHD", "#b87048")), -14, 14, -6, 9, 4, undefined, 4, 0.01);
  bellTent(b, SPOT.TENT[0], SPOT.TENT[2], 0, true);
  bellTent(b, -7.5, -4.5, 0.4, true, 0.95); bellTent(b, 8.5, -5.5, -0.5, false, 0.95); bellTent(b, -14, -9, 0.2, false, 0.9);
  fieldDesk(b); tallyBoard(b);
  crateStack(b, -3.6, 1.2, 2, 2, 1, 0.3, 91);
  brassMound(b);
  // lantern pole by the desk
  const lx = SPOT.DESK[0] + 1.35, lz = SPOT.DESK[2] - 0.9;
  b.add(rod(V(lx + 0.35, 0, lz), V(lx + 0.35, 2.35, lz), 0.035), col("#5a4030"));
  b.add(rod(V(lx + 0.35, 2.3, lz), V(lx, 2.3, lz), 0.025), col("#5a4030"));
  b.add(lathe("lantern", [[0, 0], [0.09, 0], [0.09, 0.03], [0.06, 0.06], [0.07, 0.2], [0.04, 0.26], [0, 0.27]], 12), glow("#ffc46a", 2.2), M4(lx, 1.98, lz));
  for (const [x, z, h] of [[-20, -16, 16], [18, -22, 15], [-28, 8, 14], [26, 6, 17], [6, -34, 15]]) gum(b, x, z, h, x * 13 + z, 1);
  scrub(b, 0, 0, 16, 60, 30, 92);
  horizon(b, 93);
  return done("camp", b);
};

// ---- supply dump: the house-tall wall of ammunition boxes ----
const buildDump = (): SetRig => {
  const b = new Batch();
  terrain(b, paddockM(), -FAR, FAR, -FAR, FAR, 4);
  terrain(b, groundM("dumpDirt", () => P.dirtHD("dumpHD", "#c07a4c")), -16, 16, -6, 8, 4, undefined, 4, 0.01);
  const r = rng(95);
  for (let k = 0; k < 14; k++) for (let i = 0; i < 20; i++) for (let j = 0; j < 2; j++) { // no handles on the big wall (polycount)
    const lx = (i - 9.5) * (CRATE.L + 0.03) + (k % 2) * 0.12 + (r() - 0.5) * 0.06, lz = SPOT.WALL_Z - j * (CRATE.D + 0.03) + (r() - 0.5) * 0.05;
    if (k === 13 && (i < 2 || i > 17 || r() < 0.15)) continue;
    b.add(crateGeo(), crateM(), M4(lx, k * CRATE.H + CRATE.H / 2, lz, (r() - 0.5) * 0.05));
  }
  crateStack(b, -5.4, 1.4, 2, 3, 1, 0.4, 96); crateStack(b, 6.5, 1.0, 2, 2, 1, -0.3, 97);
  crate(b, 2.6, 0, 1.2, 0.7);
  // ladder against the wall
  for (const s of [-0.28, 0.28]) b.add(rod(V(-3.2 + s, 0, 0.6), V(-3.2 + s, 5.2, SPOT.WALL_Z + 0.2), 0.035), col("#9a7a52"));
  for (let k = 1; k < 13; k++) { const u = k / 13; b.add(rod(V(-3.48, 5.2 * u, 0.6 + (SPOT.WALL_Z + 0.2 - 0.6) * u), V(-2.92, 5.2 * u, 0.6 + (SPOT.WALL_Z + 0.2 - 0.6) * u), 0.025), col("#9a7a52")); }
  for (const [x, z, h] of [[-18, -10, 16], [17, -8, 15], [-24, 10, 14], [24, 12, 16]]) gum(b, x, z, h, x * 17 + z, 1);
  horizon(b, 98);
  return done("dump", b);
};

// ---- parade ground: packed earth, whitewashed stones, a sandbagged gun pit, tents far off ----
const buildParade = (): SetRig => {
  const b = new Batch();
  terrain(b, paddockM(), -FAR, FAR, -FAR, FAR, 4);
  terrain(b, paradeM(), -45, 45, -60, 14, 4, undefined, 4, 0.01);
  const r = rng(99);
  for (let x = -44; x <= 44; x += 1.6) for (const z of [-59.5, 13.5]) b.add(cached("wstone", () => new THREE.SphereGeometry(0.2, 8, 6).scale(1, 0.6, 1)), col("#f2eee4"), M4(x + (r() - 0.5) * 0.2, 0.08, z));
  for (let z = -58; z <= 12; z += 1.6) for (const x of [-44.5, 44.5]) b.add(cached("wstone", () => new THREE.SphereGeometry(0.2, 8, 6).scale(1, 0.6, 1)), col("#f2eee4"), M4(x, 0.08, z + (r() - 0.5) * 0.2));
  sandbagRing(b, SPOT.GUN13[0], SPOT.GUN13[2], 1.25, Math.PI - 1.9, Math.PI + 1.9, 3, 100);
  for (let i = 0; i < 7; i++) bellTent(b, -36 + i * 12, -72 - (i % 2) * 3, 0.1 * i, false, 0.9);
  b.add(rod(V(30, 0, -50), V(30, 11, -50), 0.09, 0.06), col("#f2eee4"));
  for (const [x, z, h] of [[-58, -30, 16], [60, -20, 15], [-52, 20, 14], [56, 26, 17], [-20, -95, 15], [25, -100, 16]]) gum(b, x, z, h, x * 19 + z, 1);
  horizon(b, 101);
  return done("parade", b);
};

/** every set of the film; world.ts adds the groups and toggles .visible per shot */
export const buildSets = (): Record<SetName, SetRig> => ({
  field: buildField(), farm: buildFarm(), road: buildRoad(), paddock: buildPaddock(), dam: buildDam(), camp: buildCamp(), dump: buildDump(), parade: buildParade(),
});

// =================================================================================================================
// FOREGROUND framing props (story.ts FOREGROUND, composition.md 3.3). world.ts calls fgUpdate(group, id, f, cam) every
// frame; the kits are built once into `group` (cached by kit name) and placed in camera space ("cam") or world space.
// Kit front = local +z (faces the lens). Layer 0 (the wheat cards: NOINK), the shot's DOF blurs them.
// =================================================================================================================
const fgKit = (kit: string): THREE.Group => {
  const g = new THREE.Group(), b = new Batch(), c = new Batch();
  switch (kit) {
    case "wheat": { const r = rng(5); for (let i = 0; i < 9; i++) c.add(clumpGeo(), wheatCardM(i % 3), M4((r() - 0.5) * 0.7, -0.2, (r() - 0.5) * 0.4, r() * 6.28, 0, 0, [0.8, 0.9 + 0.5 * r(), 0.8])); break; }
    case "fence_post": b.add(rbox(0.14, 1.3, 0.14, 0.03), postM(), M4(0, 0.65, 0, 0.3)); for (const y of [0.58, 0.84, 1.1]) b.add(rod(V(0, y, 0), V(-2.5, y - 0.05, -1.5), 0.012), wireM()); break;
    case "sandbags": sandbagRing(b, 0, 0, 0.9, -0.8, 0.8, 2, 7); break;
    default: crate(b, 0, 0, 0, 0.2);
  }
  b.build(g, false);
  buildNoInk(c, g);
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
