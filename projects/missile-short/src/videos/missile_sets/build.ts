// Sets for the missile short (owner: sets, with paint.ts). Every set is one THREE.Group built at the world origin
// in its own frame (story.ts SPOT anchors); world.ts shows only the active shot's set. All set meshes stay on camera
// layer 0, so the world ink pass outlines them. Shapes are chunky and bevelled (rbox = box with a 45-degree bevel
// ring and smooth normals, extruded planforms with bevels, lathes) and every material is two-tone (lam -> twoTone).
// CONTRACTS: buildSets(), SET_META, SetRig, buildMissile(), MissileRig, poseMissile() (read by world.ts / cast.ts).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as P from "./paint";
import { rng, ctex, rep } from "./paint";
import { twoTone } from "./shade";
import { SPOT, CART_MISSILE, SetName } from "./story";

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
const LEAF = ["#5aa83c", "#4c9a37", "#69b545", "#55a243", "#3f8f3c"];
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
// MISSILE SHORT: shape kit
// =================================================================================================================
type Mat = THREE.Material;
const UP = V(0, 1, 0);
/** matrix: position, yaw (y), then pitch (z) and roll (x) -> "YZX" like the missile rig */
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
/** sign texture material, sized ~256 px per metre of height (min 128 px tall) */
const signMat = (key: string, text: string, w: number, h: number, o: Parameters<typeof P.signTex>[4]) => {
  const ppm = Math.min(2048 / w, Math.max(256, 160 / h));
  return texM("sign" + key, () => P.signTex(key, text, Math.round(w * ppm), Math.round(h * ppm), o));
};
/** a sign on a 0.06 m bevelled board (front = local +z reads correctly), centre (x, y, z), yaw ry */
const signBoard = (b: Batch, key: string, text: string, w: number, h: number, x: number, y: number, z: number, ry: number, o: Parameters<typeof P.signTex>[4], d = 0.06) =>
  b.add(rbox(w, h, d, Math.min(0.03, h * 0.08)), signMat(key, text, w, h, o), M4(x, y, z, ry));
/** flat decal quad centred at c facing n (reads left-to-right for a viewer in front), w x h */
const decalGeo = (c: THREE.Vector3, n: THREE.Vector3, w: number, h: number, up = UP) => {
  const nn = n.clone().normalize(), right = up.clone().cross(nn).normalize(), u = nn.clone().cross(right).normalize();
  const p = (sx: number, sy: number) => c.clone().addScaledVector(right, (sx * w) / 2).addScaledVector(u, (sy * h) / 2);
  return quad(p(-1, -1), p(1, -1), p(1, 1), p(-1, 1));
};
/** transparent lettering decal (no depth write -> NOINK, so it never gets a rectangle outline) */
const decalMat = (key: string, text: string, w: number, h: number, fg: string, style: P.SignStyle = "slab") =>
  lam("decal" + key, () => ({ map: P.signTex(key, text, Math.round(Math.min(2048, (w / h) * 256)), 256, { bg: null, fg, style, border: null, cap: 0.7, stroke: "rgba(0,0,0,0)" }), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));

/** canvas mail sack: lathe body (round bottom, bulging belly, cinched neck, gathered ruffle on top), squashed to a
 *  pillow, soft wrinkles; a rope tie at the neck. Height ~1 m at s = 1, base at y = 0. */
const sackGeo = () => cached("sack2", () => {
  const prof: [number, number][] = [[0.0, 0.0], [0.17, 0.012], [0.27, 0.06], [0.32, 0.16], [0.335, 0.32], [0.325, 0.48], [0.29, 0.62], [0.21, 0.73], [0.11, 0.8], [0.075, 0.835], [0.08, 0.86], [0.13, 0.9], [0.165, 0.95], [0.14, 0.985], [0.05, 0.99], [0.0, 0.975]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), 28);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), r = Math.hypot(x, z);
    const ruffle = y > 0.85 ? 1 + 0.16 * Math.sin(a * 11) * Math.min(1, (y - 0.85) / 0.08) : 1;
    const wrinkle = 1 + 0.035 * Math.sin(a * 5 + y * 9) * Math.sin(Math.PI * Math.min(1, y / 0.8)) + 0.02 * Math.sin(a * 3 - y * 14);
    const sag = y < 0.5 ? 1 + 0.06 * (1 - y / 0.5) : 1; // slumps wider at the bottom
    const k = ruffle * wrinkle * sag;
    p.setXYZ(i, r * Math.sin(a) * k * 1.08, y * 0.98 - 0.02 * Math.cos(a * 2) * Math.max(0, 0.5 - y), r * Math.cos(a) * k * 0.74);
  }
  g.computeVertexNormals();
  return g;
});
const burlap = () => texM("canvasSack", () => P.burlapHD());
const ropeM = () => col("#8a6a3e");
/** a standing sack at (x, y, z), size s, yaw/roll; ry also turns the "U.S. MAIL" stencil */
const sack = (b: Batch, x: number, y: number, z: number, s = 1, ry = 0, rz = 0) => {
  const m = M4(x, y, z, ry, rz, 0, [s, s, s]);
  b.add(sackGeo(), burlap(), m);
  b.add(cached("sackTie", () => new THREE.TorusGeometry(0.085, 0.022, 6, 16).rotateX(Math.PI / 2).translate(0, 0.835, 0)), ropeM(), m);
};
/** a sack lying on its side (neck toward local -x), resting on y */
const sackLying = (b: Batch, x: number, y: number, z: number, s = 1, ry = 0) => {
  const m = M4(x, y + 0.24 * s, z, ry, Math.PI / 2 - 0.08, 0, [s, s * 0.95, s]);
  b.add(sackGeo(), burlap(), m.clone().multiply(M4(0, -0.45, 0)));
  b.add(cached("sackTie", () => new THREE.TorusGeometry(0.085, 0.022, 6, 16).rotateX(Math.PI / 2).translate(0, 0.835, 0)), ropeM(), m.clone().multiply(M4(0, -0.45, 0)));
};
/** a heap of sacks: n sacks, standing + lying, touching the ground and each other */
const sackPile = (b: Batch, x: number, z: number, n: number, seed: number, s = 0.85) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = i === 0 ? 0 : 0.35 + 0.35 * Math.sqrt(i) * s;
    if (i % 3 === 2) sackLying(b, x + Math.cos(a) * d, 0, z + Math.sin(a) * d, s * (0.85 + 0.2 * r()), r() * 6.28);
    else sack(b, x + Math.cos(a) * d, 0, z + Math.sin(a) * d, s * (0.85 + 0.25 * r()), r() * 6.28, (r() - 0.5) * 0.2);
  }
  if (n >= 4) sackLying(b, x + 0.1, 0.55 * s, z - 0.05, s * 0.9, r() * 6.28); // one on top, resting on the others
};

/** cartoon palm (world.md 3.4): bowed tapered ringed trunk, nut cluster + boot, 9 (q > 0: 6) arched, drooping,
 *  V-folded serrated fronds in one sage/mint green per tree */
const FROND = ["#6fae6a", "#7fbf74", "#5f9f63"];
const palm = (b: Batch, x: number, z: number, h: number, lean: number, dir: number, seed: number, q = 0) => {
  const r = rng(seed), bark = texM("palmBark", () => rep(P.palmBarkHD(), 1, 2)), fc = FROND[seed % 3];
  const leaf = col(fc, THREE.DoubleSide), leaf2 = col("#" + new THREE.Color(fc).offsetHSL(-0.02, 0, -0.06).getHexString(), THREE.DoubleSide);
  const bow = 0.05 * h, side = dir + 1.3;
  const at = (t: number) => V(x + Math.cos(dir) * lean * h * t * t + Math.cos(side) * bow * Math.sin(Math.PI * t), h * t, z + Math.sin(dir) * lean * h * t * t + Math.sin(side) * bow * Math.sin(Math.PI * t));
  const N = q ? 5 : 10, rad = (t: number) => h * (0.028 - 0.011 * t);
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N;
    b.add(rod(at(t0), at(t1), rad(t0) * 1.06, rad(t1) * 0.98, q ? 6 : 10), bark);
  }
  const top = at(1);
  b.add(new THREE.ConeGeometry(rad(1) * 1.5, 0.4, 10, 1, true).rotateX(Math.PI), col("#a8845c", THREE.DoubleSide), M4(top.x, top.y - 0.1, top.z));
  for (let k = 0; k < (q ? 3 : 6); k++) b.add(cached("nut", () => new THREE.SphereGeometry(0.11, 8, 6)), col("#8a5a3c"), M4(top.x + 0.16 * Math.cos(k * 1.1), top.y - 0.18 - 0.06 * (k % 2), top.z + 0.16 * Math.sin(k * 1.1), 0, 0, 0, [h / 10, h / 10, h / 10]));
  const F = q ? 6 : 9;
  for (let f = 0; f < F; f++) {
    const phi = (f / F) * Math.PI * 2 + (r() - 0.5) * 0.4, Lf = h * (0.32 + 0.08 * r()), droop = 0.75 + 0.35 * r(), up = f % 2 ? 0.6 : 0.3;
    const d = V(Math.cos(phi), 0, Math.sin(phi)), sd = V(-d.z, 0, d.x);
    const pos: number[] = [], idx: number[] = [], NS = q ? 6 : 16;
    for (let i = 0; i <= NS; i++) {
      const s = i / NS, notch = q ? 1 : i % 2 ? 1.15 : 0.7, w = Lf * 0.12 * Math.sin(Math.PI * Math.min(1, s ** 0.8 * 1.05 + 0.04)) * notch;
      const c = top.clone().addScaledVector(d, Lf * s).addScaledVector(UP, Lf * (up * s - droop * 0.9 * s * s));
      const cr = c.clone().addScaledVector(UP, w * 0.45);
      for (const qv of [c.clone().addScaledVector(sd, w), cr, c.clone().addScaledVector(sd, -w)]) pos.push(qv.x, qv.y, qv.z);
      if (i < NS) { const a0 = i * 3; idx.push(a0, a0 + 3, a0 + 1, a0 + 1, a0 + 3, a0 + 4, a0 + 1, a0 + 4, a0 + 2, a0 + 2, a0 + 4, a0 + 5); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    b.add(g, f % 2 ? leaf : leaf2);
  }
};
/** palms in a group of 2-4 (h, 0.8h, 0.65h), leaning apart, with a sandy skirt + coconuts on grass */
const palmGroup = (b: Batch, x: number, z: number, h: number, n: number, seed: number, q = 0, skirt = true) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = i === 0 ? 0 : 2 + 1.6 * r();
    palm(b, x + Math.cos(a) * d, z + Math.sin(a) * d, h * [1, 0.8, 0.65, 0.9][i % 4], 0.08 + 0.08 * r(), a + (r() - 0.5), seed * 7 + i, q);
  }
  if (skirt && !q) {
    b.add(new THREE.CircleGeometry(2.6, 20).rotateX(-Math.PI / 2), texM("sandG", () => rep(P.sandHD(), 0.4, 0.4)), M4(x, 0.035, z));
    for (let k = 0; k < 3; k++) b.add(cached("coco", () => new THREE.SphereGeometry(0.13, 8, 6)), col("#8a5a3c"), M4(x + 1.2 * Math.cos(k * 2 + seed), 0.11, z + 1.2 * Math.sin(k * 2 + seed)));
  }
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
const tufts = (b: Batch, cx: number, cz: number, r0: number, r1: number, n: number, seed: number, avoid?: (x: number, z: number) => boolean) => {
  const r = rng(seed), m1 = col("#5f9a46", THREE.DoubleSide), m2 = col("#86b85a", THREE.DoubleSide), m3 = col("#a9b35e", THREE.DoubleSide);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = r0 + (r1 - r0) * Math.sqrt(r()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (avoid?.(x, z)) continue;
    const s = 0.8 + 0.8 * r();
    b.add(tuftGeo(), [m1, m2, m3][i % 3], M4(x, 0, z, r() * 6.28, 0, 0, [s, s, s]));
    if (r() < 0.15) b.add(cached("flower", () => new THREE.SphereGeometry(0.05, 6, 4)), col(["#f2cf4a", "#f5f1e4", "#e98a2e"][i % 3]), M4(x + 0.1, 0.32 * s, z));
  }
};
/** Florida saw palmetto: fan leaves on short stalks */
const palmetto = (b: Batch, x: number, z: number, s: number, seed: number) => {
  const r = rng(seed), m = col("#6f9f6a", THREE.DoubleSide), m2 = col("#5d8e5a", THREE.DoubleSide);
  const fan = cached("fan", () => {
    const g = new THREE.CircleGeometry(0.5, 14, 0, Math.PI), p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 1; i < p.count; i++) { const k = i % 2 ? 1 : 0.72; p.setXY(i, p.getX(i) * k, p.getY(i) * k); }
    return g.rotateX(-Math.PI / 2 + 0.5);
  });
  const n = 7 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) b.add(fan, i % 2 ? m : m2, M4(x, 0.2 * s + 0.15 * r() * s, z, (i / n) * 6.28 + r() * 0.4, 0, (r() - 0.5) * 0.4, [s, s, s]));
};

/** oil drum: lathe with two rolling hoops + a lid rim, stencilled paint */
const drum = (b: Batch, x: number, z: number, c: string, text = "AV GAS", ry = 0, y = 0) => {
  const g = cached("drumBody", () => uvFrom(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 22, 1).translate(0, 0.44, 0), (px, py, pz) => [Math.atan2(px, pz) / (Math.PI * 2) + 0.5, py / 0.88]));
  b.add(g, texM("drum" + c + text, () => P.drumHD(c, text)), M4(x, y, z, ry));
  for (const hy of [0.29, 0.59]) b.add(cached("hoop", () => new THREE.TorusGeometry(0.295, 0.018, 6, 22).rotateX(Math.PI / 2)), col(c), M4(x, y + hy, z));
  b.add(cached("lid", () => new THREE.TorusGeometry(0.27, 0.025, 6, 22).rotateX(Math.PI / 2)), col("#8a8f96"), M4(x, y + 0.875, z));
};
/** wheel (tyre torus-ish cylinder + hubcap + red dot), axis along local z */
const wheel = (b: Batch, m: THREE.Matrix4, r: number, w: number, hub = "#e8e4da") => {
  b.add(cached("tyre" + r + w, () => lathe("tyreP" + r + w, [[r * 0.55, -w / 2], [r * 0.92, -w / 2], [r, -w * 0.32], [r, w * 0.32], [r * 0.92, w / 2], [r * 0.55, w / 2]], 22).clone().rotateX(Math.PI / 2)), col("#2b2d33"), m);
  b.add(cached("hub" + r, () => new THREE.SphereGeometry(r * 0.48, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 1).rotateX(Math.PI / 2)), col(hub), m.clone().multiply(M4(0, 0, w * 0.42)));
  b.add(cached("hubR" + r, () => new THREE.SphereGeometry(r * 0.48, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 1).rotateX(-Math.PI / 2)), col(hub), m.clone().multiply(M4(0, 0, -w * 0.42)));
};
/** 1950s rounded sedan: soft body, cabin with glass, chrome bumpers + grille, round lights, 4 fat wheels; nose +x */
const car = (b: Batch, x: number, z: number, ry: number, c: string, seed = 1) => {
  const m = M4(x, 0, z, ry), L = (g: THREE.BufferGeometry, mat: Mat, mm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(mm));
  const body = col(c), chrome = col("#c9d3dc"), glass = col("#7fb8d0");
  L(rbox(5.0, 0.75, 1.9, 0.3), body, M4(0, 0.72, 0));
  L(rbox(2.6, 0.62, 1.7, 0.28), col(seed % 2 ? "#f2efe6" : c), M4(-0.3, 1.38, 0));
  for (const s of [-1, 1]) L(rbox(2.2, 0.42, 0.04, 0.02), glass, M4(-0.3, 1.4, s * 0.86));
  for (const s of [-1, 1]) L(rbox(0.04, 0.42, 1.4, 0.02), glass, M4(s * 1.32 - 0.3, 1.4, 0));
  for (const sx of [-1, 1]) L(rbox(0.18, 0.2, 2.0, 0.08), chrome, M4(sx * 2.55, 0.5, 0));
  L(rbox(0.08, 0.3, 1.1, 0.03), chrome, M4(2.5, 0.78, 0));
  for (const s of [-1, 1]) { L(cached("hl", () => new THREE.SphereGeometry(0.12, 10, 8)), glow("#fff3c4", 1.1), M4(2.48, 0.86, s * 0.68)); L(cached("tl", () => new THREE.SphereGeometry(0.09, 8, 6)), col("#d8352f"), M4(-2.5, 0.9, s * 0.7)); }
  for (const [wx, s] of [[1.6, 1], [1.6, -1], [-1.6, 1], [-1.6, -1]] as const) wheel(b, m.clone().multiply(M4(wx, 0.4, s * 0.88)), 0.4, 0.26);
  L(rbox(4.6, 0.06, 0.03, 0.01), chrome, M4(0, 0.85, 0.96)); L(rbox(4.6, 0.06, 0.03, 0.01), chrome, M4(0, 0.85, -0.96));
};
/** tow tractor: low yellow body, fat wheels, steering wheel, seat */
const tractor = (b: Batch, x: number, z: number, ry: number) => {
  const m = M4(x, 0, z, ry), L = (g: THREE.BufferGeometry, mat: Mat, mm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(mm));
  L(rbox(2.4, 0.7, 1.5, 0.18), col("#e8b830"), M4(0, 0.75, 0));
  L(rbox(0.6, 0.5, 0.6, 0.1), col("#2e3440"), M4(-0.6, 1.3, 0));
  L(rod(V(0.2, 1.1, 0), V(0.0, 1.55, 0), 0.03), col("#2e3440"), new THREE.Matrix4());
  L(new THREE.TorusGeometry(0.2, 0.03, 6, 16).rotateZ(0.5), col("#2e3440"), M4(0.0, 1.58, 0, Math.PI / 2));
  for (const [wx, s] of [[0.8, 1], [0.8, -1], [-0.8, 1], [-0.8, -1]] as const) wheel(b, m.clone().multiply(M4(wx, 0.38, s * 0.8)), 0.38, 0.3, "#e8b830");
  L(rbox(0.3, 0.2, 1.3, 0.06), col("#2e3440"), M4(1.3, 0.5, 0));
};
/** fire-extinguisher cart: red cylinder on two wheels with a handle */
const extCart = (b: Batch, x: number, z: number, ry: number) => {
  const m = M4(x, 0, z, ry);
  b.add(lathe("ext", [[0, 0.2], [0.25, 0.22], [0.25, 1.05], [0.2, 1.15], [0.06, 1.2], [0, 1.2]], 18), col("#d8352f"), m);
  b.add(rod(V(-0.3, 0.6, 0), V(-0.6, 1.1, 0), 0.025), col("#2e3440"), m);
  for (const s of [-1, 1]) wheel(b, m.clone().multiply(M4(0, 0.22, s * 0.32)), 0.22, 0.1, "#2e3440");
};
/** folding chair (olive or grey), facing local +z */
const chair = (b: Batch, x: number, z: number, ry: number, c = "#6f7a4a") => {
  const m = M4(x, 0, z, ry), L = (g: THREE.BufferGeometry, mat: Mat, mm = new THREE.Matrix4()) => b.add(g, mat, m.clone().multiply(mm));
  L(rbox(0.44, 0.05, 0.42, 0.02), col(c), M4(0, 0.46, 0));
  L(rbox(0.44, 0.3, 0.04, 0.02), col(c), M4(0, 0.78, -0.22, 0, 0, -0.1));
  for (const [a, c2] of [[V(-0.2, 0, 0.22), V(-0.2, 0.95, -0.24)], [V(0.2, 0, 0.22), V(0.2, 0.95, -0.24)], [V(-0.2, 0, -0.2), V(-0.2, 0.46, 0.18)], [V(0.2, 0, -0.2), V(0.2, 0.46, 0.18)]] as const) L(rod(a, c2, 0.02), col("#4a4f55"));
};
/** street lamp: tapered post with base, curved arm, lantern */
const lamppost = (b: Batch, x: number, z: number, ry: number, h = 4.2) => {
  const m = M4(x, 0, z, ry), dark = col("#2f3a36");
  b.add(lathe("lampPost" + h, [[0.2, 0], [0.2, 0.35], [0.12, 0.5], [0.07, 0.6], [0.06, h - 0.2], [0.09, h - 0.1], [0.05, h]], 12), dark, m);
  b.add(rod(V(0, h - 0.3, 0), V(0.6, h - 0.05, 0), 0.04), dark, m);
  b.add(lathe("lampHead", [[0.0, -0.45], [0.18, -0.4], [0.22, -0.12], [0.3, 0.0], [0.05, 0.08], [0, 0.1]], 12), dark, m.clone().multiply(M4(0.75, h - 0.05, 0)));
  b.add(cached("lampGlass", () => new THREE.CylinderGeometry(0.15, 0.12, 0.28, 10)), glow("#f6e0a0", 1.15), m.clone().multiply(M4(0.75, h - 0.32, 0)));
};
/** fire hydrant */
const hydrant = (b: Batch, x: number, z: number) => {
  b.add(lathe("hydrant", [[0.16, 0], [0.16, 0.06], [0.11, 0.08], [0.11, 0.55], [0.15, 0.58], [0.15, 0.63], [0.1, 0.66], [0.08, 0.76], [0.03, 0.8], [0, 0.8]], 14), col("#d8352f"), M4(x, 0, z));
  for (const s of [-1, 1]) b.add(cached("hydNoz", () => new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10).rotateZ(Math.PI / 2)), col("#e8b830"), M4(x + s * 0.13, 0.45, z));
};
/** dented trash can with lid */
const trashCan = (b: Batch, x: number, z: number) => {
  b.add(lathe("can", [[0.0, 0], [0.24, 0], [0.26, 0.1], [0.26, 0.8], [0.0, 0.8]], 16), texM("drumCan", () => P.drumHD("#8d9298", "")), M4(x, 0, z));
  b.add(lathe("canLid", [[0.29, 0], [0.29, 0.04], [0.2, 0.09], [0.05, 0.12], [0.05, 0.16], [0, 0.17]], 16), col("#9aa0a8"), M4(x, 0.8, z, 0, 0.12));
};
/** park bench: 3 slats + cast ends */
const bench = (b: Batch, x: number, z: number, ry: number) => {
  const m = M4(x, 0, z, ry), L = (g: THREE.BufferGeometry, mat: Mat, mm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(mm));
  for (let k = 0; k < 3; k++) L(rbox(1.8, 0.05, 0.12, 0.02), col("#7a5a3c"), M4(0, 0.45, -0.15 + k * 0.15));
  for (let k = 0; k < 2; k++) L(rbox(1.8, 0.12, 0.05, 0.02), col("#7a5a3c"), M4(0, 0.65 + k * 0.17, -0.27, 0, 0, -0.15));
  for (const s of [-1, 1]) L(rbox(0.07, 0.9, 0.6, 0.03), col("#2f3a36"), M4(s * 0.8, 0.45, -0.05));
};
/** 1959 street collection box: navy body on 4 legs, red dome top, "U.S. MAIL" front, chute handle; front = +z */
const collectionBox = (b: Batch, x: number, z: number, ry: number) => {
  const m = M4(x, 0, z, ry), L = (g: THREE.BufferGeometry, mat: Mat, mm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(mm));
  const navy = col("#24407a");
  for (const [lx, lz] of [[-0.19, -0.2], [0.19, -0.2], [-0.19, 0.2], [0.19, 0.2]]) L(rbox(0.05, 0.38, 0.05, 0.015), navy, M4(lx, 0.19, lz));
  L(rbox(0.48, 0.92, 0.52, 0.06), navy, M4(0, 0.82, 0));
  L(cached("mbDome", () => new THREE.CylinderGeometry(0.24, 0.24, 0.52, 18, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2)), col("#d8352f"), M4(0, 1.27, 0));
  L(rbox(0.36, 0.2, 0.04, 0.015), signMat("mbUSMAIL", "U.S. MAIL", 0.36, 0.2, { bg: "#24407a", fg: "#f2efe6", style: "slab", border: null }), M4(0, 0.98, 0.27));
  L(rbox(0.3, 0.05, 0.06, 0.02), col("#c9d3dc"), M4(0, 1.15, 0.27));
  L(cached("eagleDisc", () => new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16).rotateX(Math.PI / 2)), col("#f2efe6"), M4(0, 0.68, 0.27));
  L(rbox(0.15, 0.1, 0.02, 0.005), col("#f2efe6"), M4(0, 0.52, 0.27));
};
/** yellow newspaper box with a window */
const newsBox = (b: Batch, x: number, z: number, ry: number) => {
  const m = M4(x, 0, z, ry);
  b.add(rbox(0.45, 0.9, 0.4, 0.05), col("#e8b830"), m.clone().multiply(M4(0, 0.6, 0)));
  b.add(rbox(0.35, 0.3, 0.03, 0.01), col("#cfe6ee"), m.clone().multiply(M4(0, 0.82, 0.2)));
  b.add(rbox(0.05, 0.15, 0.05, 0.01), col("#4a4f55"), m.clone().multiply(M4(0, 0.075, 0)));
};
/** wooden crate with plank seams + stencil */
const crate = (b: Batch, x: number, y: number, z: number, s: number, ry: number, label = "U.S. MAIL") => {
  b.add(rbox(s, s * 0.75, s * 0.8, s * 0.05), texM("crateW", () => P.panelHD("#b0703f")), M4(x, y + s * 0.375, z, ry));
  b.add(rbox(s * 0.7, s * 0.25, 0.02, 0.005), signMat("crate" + label, label, s * 0.7, s * 0.25, { bg: "#c8945a", fg: "#24407a", style: "stencil", border: null }), M4(x, y + s * 0.4, z, ry).multiply(M4(0, 0, s * 0.41)));
};
/** coiled mooring line: stacked tori */
const ropeCoil = (b: Batch, x: number, y: number, z: number, s = 1) => {
  for (let k = 0; k < 4; k++) b.add(cached("coil" + k, () => new THREE.TorusGeometry(0.32 - k * 0.04, 0.035, 6, 20).rotateX(Math.PI / 2)), col("#c9b48a"), M4(x, y + 0.035 + k * 0.06, z, k, 0, 0, [s, s, s]));
};
/** red life ring with 4 white bands, on a wall/rail facing local +z */
const lifeRing = (b: Batch, m: THREE.Matrix4) => {
  b.add(cached("lifeRing", () => new THREE.TorusGeometry(0.38, 0.07, 8, 24)), col("#d8352f"), m);
  for (let k = 0; k < 4; k++) b.add(cached("lifeBand", () => new THREE.TorusGeometry(0.38, 0.075, 8, 3, 0.22)), col("#f2efe6"), m.clone().multiply(M4(0, 0, 0, 0, (k * Math.PI) / 2 + 0.67)));
};
/** mooring cleat: plate + two horns */
const cleat = (b: Batch, x: number, y: number, z: number, ry: number) => {
  const m = M4(x, y, z, ry), dk = col("#6c7884");
  b.add(rbox(0.6, 0.06, 0.18, 0.02), dk, m.clone().multiply(M4(0, 0.03, 0)));
  b.add(rbox(0.12, 0.14, 0.12, 0.04), dk, m.clone().multiply(M4(0, 0.12, 0)));
  b.add(rbox(0.6, 0.08, 0.1, 0.035), dk, m.clone().multiply(M4(0, 0.21, 0)));
};
/** small V gull: white body, grey wing tips (billboard-free tiny 3D wings) */
const gull = (b: Batch, x: number, y: number, z: number, ry: number, flap: number, s = 1) => {
  const m = M4(x, y, z, ry, 0, 0, [s, s, s]);
  b.add(cached("gullBody", () => new THREE.SphereGeometry(0.1, 8, 6).scale(2.2, 0.8, 0.8)), col("#f4f2ec"), m);
  for (const sd of [-1, 1]) {
    const wing = cached("gullW" + sd + flap, () => { const t = tri(V(0.08, 0, 0), V(-0.12, 0, 0), V(-0.02, 0.18 * flap, sd * 0.38)); const t2 = tri(V(-0.02, 0.18 * flap, sd * 0.38), V(-0.12, 0, 0), V(-0.1, 0.05 * flap, sd * 0.62)); return mergeGeometries([t, t2], false); });
    b.add(wing, col("#e8e6e0", THREE.DoubleSide), m);
    b.add(cached("gullTip" + sd + flap, () => tri(V(-0.06, 0.12 * flap, sd * 0.5), V(-0.1, 0.05 * flap, sd * 0.62), V(-0.12, 0.1 * flap, sd * 0.52))), col("#9aa4ae", THREE.DoubleSide), m);
  }
};
/** red nun buoy with a white band and a "2" */
const buoy = (b: Batch, x: number, z: number, num = "2") => {
  const m = M4(x, -0.3, z);
  b.add(lathe("buoy", [[0, -0.3], [0.9, -0.2], [1.0, 0.3], [0.85, 0.7], [0.55, 1.5], [0.15, 2.4], [0, 2.45]], 18), col("#d8352f"), m);
  b.add(lathe("buoyBand", [[0.57, 1.36], [0.5, 1.66], [0.0, 1.66]], 18), col("#f2efe6"), m);
  b.add(decalGeo(V(0, 1.05, 0.83), V(0, 0.25, 1), 0.5, 0.5), decalMat("buoy" + num, num, 0.5, 0.5, "#f2efe6"), m);
  b.add(lathe("buoyRing", [[1.0, 0.25], [1.05, 0.35], [1.0, 0.45]], 18), col("#2e3440"), m);
};
/** Navy escort ship silhouette, ~110 m (scale s): grey hull, 3 stacked superstructure blocks, masts, funnel, hull no. */
const escortShip = (b: Batch, x: number, z: number, ry: number, s: number, num: string) => {
  const m = M4(x, 0, z, ry, 0, 0, [s, s, s]), L = (g: THREE.BufferGeometry, mat: Mat, mm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(mm));
  const grey = col("#7d8a96"), dk = col("#5c6874"), lt = col("#9aa6b2");
  L(slab([[55, 0], [40, 5], [-50, 5.2], [-55, 3.5], [-55, -3.5], [-50, -5.2], [40, -5], [55, 0]], -2, 7, 0.3), grey, new THREE.Matrix4());
  L(rbox(110, 0.8, 10.2, 0.2), dk, M4(0, -1.4, 0));
  L(rbox(26, 4, 8, 0.3), lt, M4(8, 7, 0)); L(rbox(16, 3.5, 6.5, 0.3), lt, M4(10, 10.5, 0)); L(rbox(8, 3, 5, 0.3), lt, M4(12, 13.5, 0));
  L(rbox(10, 3, 6.5, 0.3), lt, M4(-24, 6.5, 0));
  L(lathe("funnel", [[2.2, 0], [2.0, 6], [1.8, 6.5], [0, 6.5]], 14), dk, M4(-2, 8, 0));
  for (const [mx, mh] of [[13, 16], [-22, 11]]) { L(rod(V(mx, 10, 0), V(mx, 10 + mh, 0), 0.35, 0.2), dk, new THREE.Matrix4()); L(rbox(0.4, 0.4, 6, 0.1), dk, M4(mx, 7 + mh, 0)); }
  for (const [gx] of [[36], [-38]]) { L(rbox(5, 2, 5, 0.4), lt, M4(gx, 5.8, 0)); L(rod(V(gx, 6.5, 0), V(gx + Math.sign(gx) * 7, 7, 0), 0.25), dk, new THREE.Matrix4()); }
  for (const sd of [-1, 1]) L(decalGeo(V(42, 2.6, sd * 4.9), V(0, 0, sd), 7, 3.2), decalMat("hull" + num, num, 7, 3.2, "#f2efe6", "stencil"), new THREE.Matrix4());
};
/** red-brick lighthouse (St. Johns River style): tapering lathe tower, white gallery, black lantern + glass band */
const lighthouse = (b: Batch, x: number, z: number, s = 1) => {
  const m = M4(x, 0, z, 0, 0, 0, [s, s, s]);
  b.add(lathe("lhTower", [[3.4, 0], [3.2, 1], [2.3, 25], [2.6, 25.4], [0, 25.4]], 20), texM("brickLH", () => rep(P.brick(), 4, 8)), m);
  b.add(lathe("lhBase", [[4.4, 0], [4.4, 2.2], [3.6, 2.6], [0, 2.6]], 20), col("#e8e4da"), m);
  b.add(cached("lhGal", () => new THREE.CylinderGeometry(3.2, 3.0, 0.5, 20)), col("#f2efe6"), m.clone().multiply(M4(0, 25.6, 0)));
  b.add(cached("lhRail", () => new THREE.TorusGeometry(3.1, 0.08, 6, 24).rotateX(Math.PI / 2)), col("#2e3440"), m.clone().multiply(M4(0, 26.8, 0)));
  b.add(cached("lhLan", () => new THREE.CylinderGeometry(1.6, 1.6, 2.5, 12)), col("#2e3440"), m.clone().multiply(M4(0, 27.1, 0)));
  b.add(cached("lhGlass", () => new THREE.CylinderGeometry(1.65, 1.65, 1.2, 12)), glow("#f6e7a6", 1.2), m.clone().multiply(M4(0, 27.3, 0)));
  b.add(cached("lhCap", () => new THREE.ConeGeometry(2.0, 1.8, 12)), col("#2e3440"), m.clone().multiply(M4(0, 29.2, 0)));
  b.add(rbox(8, 4, 6, 0.2), col("#f2efe6"), m.clone().multiply(M4(7, 2, 3)));
  b.add(rbox(9, 0.5, 7, 0.2), col("#b8553a"), m.clone().multiply(M4(7, 4.2, 3)));
};
/** water tower: sphere on 4 legs */
const waterTower = (b: Batch, x: number, z: number) => {
  for (const [dx, dz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) b.add(rod(V(x + dx, 0, z + dz), V(x + dx * 0.6, 15, z + dz * 0.6), 0.3), col("#c9c4b6"));
  b.add(cached("wtTank", () => new THREE.SphereGeometry(4, 20, 14)), col("#e8e4da"), M4(x, 18, z));
  b.add(cached("wtBand", () => new THREE.CylinderGeometry(4.05, 4.05, 1.2, 20, 1, true)), col("#d8352f"), M4(x, 18, z));
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
/** R2 band: clumps of round trees and palm groups on an arc (a0..a1 rad) at radius r0..r1 */
const treeBand = (b: Batch, cx: number, cz: number, r0: number, r1: number, a0: number, a1: number, n: number, seed: number, palms = 0.4) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * r(), d = r0 + (r1 - r0) * r(), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (r() < palms) palmGroup(b, x, z, 9 + 5 * r(), 2 + Math.floor(r() * 2), seed * 31 + i, 2, false);
    else for (let k = 0; k < 3; k++) addVeg(b, r() < 0.7 ? "round" : "fat", x + (r() - 0.5) * 14, 0, z + (r() - 0.5) * 14, 8 + 7 * r(), seed * 17 + i * 3 + k, 2);
  }
};
/** R2 town: low pastel boxes with flat or gabled roofs on an arc */
const townBand = (b: Batch, cx: number, cz: number, r0: number, r1: number, a0: number, a1: number, n: number, seed: number) => {
  const r = rng(seed), roofs = ["#b8553a", "#8a4f43", "#5d6470", "#e8e4da"];
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * r(), d = r0 + (r1 - r0) * r(), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, w = 8 + 14 * r(), h = 5 + 12 * r() ** 2, dp = 8 + 8 * r();
    const yaw = -a + Math.PI / 2;
    b.add(rbox(w, h, dp, 0.15), texM("town" + (i % 6), () => rep(P.townHD(i % 6), Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 6)))), M4(x, h / 2, z, yaw));
    if (r() < 0.5) b.add(rbox(w + 0.8, 0.6, dp + 0.8, 0.15), col(roofs[i % 4]), M4(x, h + 0.3, z, yaw));
    else b.add(slab([[-w / 2 - 0.5, -dp / 2 - 0.5], [w / 2 + 0.5, -dp / 2 - 0.5], [w / 2 + 0.5, dp / 2 + 0.5], [-w / 2 - 0.5, dp / 2 + 0.5]], 0, 0.6, 0.1), col(roofs[i % 4]), M4(x, h, z, yaw));
    if (r() < 0.3) b.add(rod(V(0, h, 0), V(0, h + 4, 0), 0.15), col("#5c6874"), M4(x + w * 0.3, 0, z, yaw));
  }
};
/** shared sea backdrop: a bay of coastline around the action (dunes, scrub, palms, the lighthouse, water towers, a
 *  white town), escort ships, buoys and gulls near the flight line */
const seaBackdrop = (b: Batch, seed: number) => {
  const sand = texM("sand", () => rep(P.sandHD(), 1, 1)), scrub = texM("grass", () => P.grassHD());
  const coastArc = (cx: number, cz: number, R: number, a0: number, a1: number, n: number, k: number) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * (i + 0.5)) / n, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R, yaw = -a;
      b.add(slab(supEll(0, 0, 70, 46, 2.2, 28), -0.6, 3.2 + (i % 3), 1.0), sand, M4(x, 0, z, yaw));
      b.add(slab(supEll(14, 0, 54, 40, 2.2, 28), 2.0, 5 + ((i * 7) % 5), 2.0), scrub, M4(x, 0, z, yaw));
      if (i % 2 === 0) palmGroup(b, x + Math.cos(a) * 20, z + Math.sin(a) * 20, 11 + (i % 3) * 2, 3, seed + k * 50 + i, 2, false);
      else treeBand(b, x + Math.cos(a) * 30, z + Math.sin(a) * 30, 0, 12, 0, 6.28, 2, seed + k * 70 + i, 0.3);
    }
  };
  coastArc(0, 0, 950, -2.2, -0.2, 22, 1);       // behind (-z) and right ahead (+x)
  coastArc(0, 0, 1150, 0.4, 2.6, 12, 2);        // the far side
  coastArc(0, 0, 1150, 2.9, 3.9, 6, 3);
  townBand(b, 0, 0, 990, 1040, -1.75, -1.15, 26, seed + 3);
  townBand(b, 0, 0, 990, 1040, -0.55, -0.3, 10, seed + 4);
  lighthouse(b, Math.cos(-0.95) * 960, Math.sin(-0.95) * 960, 1.4);
  lighthouse(b, Math.cos(-0.25) * 965, Math.sin(-0.25) * 965, 1.2);
  waterTower(b, Math.cos(-1.4) * 1010, Math.sin(-1.4) * 1010);
  waterTower(b, Math.cos(-0.4) * 1010, Math.sin(-0.4) * 1010);
  hillRing(b, 0, 0, 1180, 18, 40, seed + 9, "#98b9a2");
  escortShip(b, -260, -520, 0.25, 1, "DD-859");
  escortShip(b, 380, -640, -0.2, 1, "DE-1006");
  escortShip(b, -620, 260, 1.3, 1, "DD-871");
  escortShip(b, 420, 380, 2.6, 0.8, "AO-98");
  for (const [x, z, n] of [[28, -34, "2"], [-48, -58, "4"], [95, -26, "6"], [-24, 46, "3"], [60, 60, "5"], [-110, -20, "8"]] as const) buoy(b, x, z, n);
};
/** gulls wheeling over a point (static poses, mixed flap) */
const gulls = (b: Batch, cx: number, cy: number, cz: number, n: number, spread: number, seed: number) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) gull(b, cx + (r() - 0.5) * spread, cy + (r() - 0.5) * spread * 0.3, cz + (r() - 0.5) * spread, r() * 6.28, [1, 0.3, -0.4][i % 3], 1.6 + r());
};

/** a 1950s ranch house: front wall at local z = +d/2, width w, clapboard walls, low gable roof, windows with
 *  shutters, red door with a hood + steps, brick chimney. (x, z) = centre on the ground, yaw about y. */
const ranch = (b: Batch, x: number, z: number, yaw: number, w: number, d: number, palette: number, opts: { hole?: [number, number] } = {}) => {
  const PAL = [
    { wall: "#f0dc9c", trim: "#fbf6ea", shutter: "#3f6f8f", roof: "#8a4f43", door: "#b8423a" },
    { wall: "#b9dcc8", trim: "#fbf6ea", shutter: "#2f5f4f", roof: "#5d6470", door: "#d8a23a" },
    { wall: "#f2c2a8", trim: "#fbf6ea", shutter: "#7a3f3a", roof: "#6a4a3c", door: "#2f5f8f" },
    { wall: "#c9d8ec", trim: "#fbf6ea", shutter: "#2f4f7f", roof: "#7a5040", door: "#b8423a" },
  ][palette % 4];
  const m = M4(x, 0, z, yaw), H = 3.0, hw = w / 2, hd = d / 2;
  const L = (geo: THREE.BufferGeometry, mat: Mat, mm = new THREE.Matrix4()) => b.add(geo, mat, m.clone().multiply(mm));
  const box = (mat: Mat, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 0.05, tile: number | [number, number] = 0) =>
    L(rbox(x1 - x0, y1 - y0, z1 - z0, r, tile), mat, M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  const siding = texM("siding" + PAL.wall, () => P.sidingHD(PAL.wall));
  box(texM("found", () => P.concreteHD("foundHD", "#b9b3a6"), {}), -hw - 0.08, hw + 0.08, 0, 0.45, -hd - 0.08, hd + 0.08, 0.04, 2);
  box(siding, -hw, hw, 0.45, H, -hd, hd, 0.05, 2);
  // roof: two thick bevelled slopes + gable triangles + ridge cap
  const rh = 1.5, ov = 0.6, slope = Math.atan2(rh, hd + ov), len = Math.hypot(hd + ov, rh);
  const roof = texM("roof" + PAL.roof, () => P.roofHD(PAL.roof), { side: THREE.DoubleSide });
  for (const s of [-1, 1]) L(rbox(w + 2 * ov, 0.2, len, 0.06, [2, 2]), roof, M4(0, H + rh / 2 - 0.05, (s * (hd + ov)) / 2, 0, 0, s * slope));
  L(rbox(w + 2 * ov + 0.1, 0.22, 0.34, 0.08), col("#4a3a34"), M4(0, H + rh + 0.02, 0));
  for (const s of [-1, 1]) L(tri(V(s * hw, H, s * hd), V(s * hw, H, -s * hd), V(s * hw, H + rh, 0)), siding);
  box(col(PAL.trim), -hw - 0.05, hw + 0.05, H - 0.18, H, hd, hd + 0.12, 0.03); // fascia
  // chimney
  box(texM("brick", () => rep(P.brick(), 1, 1)), hw * 0.5 - 0.45, hw * 0.5 + 0.45, H - 0.5, H + rh + 1.0, -0.6, 0.3, 0.05, 1.2);
  box(col("#6b5a50"), hw * 0.5 - 0.55, hw * 0.5 + 0.55, H + rh + 1.0, H + rh + 1.18, -0.7, 0.4, 0.04);
  // door with hood and steps (front, right of centre)
  const dx = Math.min(hw - 1.2, 1.0);
  box(col(PAL.trim), dx - 0.62, dx + 0.62, 0.45, 2.75, hd, hd + 0.08, 0.03);
  box(col(PAL.door), dx - 0.5, dx + 0.5, 0.5, 2.6, hd + 0.04, hd + 0.12, 0.04);
  L(new THREE.SphereGeometry(0.06, 8, 6), col("#d8b04a"), M4(dx + 0.34, 1.55, hd + 0.15));
  box(col(PAL.trim), dx - 0.9, dx + 0.9, 2.82, 2.98, hd, hd + 0.75, 0.05);
  for (let k = 0; k < 2; k++) box(texM("found", () => P.concreteHD("foundHD", "#b9b3a6")), dx - 0.8, dx + 0.8, 0, 0.3 + k * 0.15 - 0.15 * k, hd, hd + 0.9 - k * 0.4, 0.04, 2);
  // windows: trim frame, glass, cross mullion, shutters, sill
  const glass = glow("#cfe2ec", 0.95);
  const win = (cx: number, face: 1 | -1, wide: number) => {
    const z0 = face * hd, o = face;
    box(col(PAL.trim), cx - wide / 2 - 0.12, cx + wide / 2 + 0.12, 1.05, 2.45, Math.min(z0, z0 + o * 0.1), Math.max(z0, z0 + o * 0.1), 0.03);
    box(glass, cx - wide / 2, cx + wide / 2, 1.15, 2.35, Math.min(z0, z0 + o * 0.12), Math.max(z0, z0 + o * 0.12), 0.01);
    box(col(PAL.trim), cx - 0.04, cx + 0.04, 1.15, 2.35, Math.min(z0, z0 + o * 0.15), Math.max(z0, z0 + o * 0.15), 0.01);
    box(col(PAL.trim), cx - wide / 2, cx + wide / 2, 1.72, 1.8, Math.min(z0, z0 + o * 0.15), Math.max(z0, z0 + o * 0.15), 0.01);
    box(col(PAL.trim), cx - wide / 2 - 0.2, cx + wide / 2 + 0.2, 0.96, 1.06, Math.min(z0, z0 + o * 0.22), Math.max(z0, z0 + o * 0.22), 0.03);
    for (const s of [-1, 1]) box(col(PAL.shutter), cx + s * (wide / 2 + 0.14) - 0.22, cx + s * (wide / 2 + 0.14) + 0.22, 1.08, 2.42, Math.min(z0, z0 + o * 0.1), Math.max(z0, z0 + o * 0.1), 0.03);
  };
  for (const cx of [-hw + 1.6, ...(w > 11 ? [hw - 1.7] : [])]) win(cx, 1, 1.5);
  win(-hw / 3, -1, 1.2); win(hw / 3, -1, 1.2);
  if (opts.hole) { // scorched crack decal where the missile went in
    const [hx, hy] = opts.hole;
    L(quad(V(hx - 1.3, hy - 1.3, hd + 0.015), V(hx + 1.3, hy - 1.3, hd + 0.015), V(hx + 1.3, hy + 1.3, hd + 0.015), V(hx - 1.3, hy + 1.3, hd + 0.015)),
      lam("crack", () => ({ map: P.crackHD(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })));
    L(new THREE.CircleGeometry(0.72, 20), col("#2a2024"), M4(hx, hy, hd + 0.02));
  }
};

// =================================================================================================================
// THE MISSILE (Regulus I): nose along local +x, fin up. ~9 m long, 1.3 m body, 5.6 m span.
// =================================================================================================================
export type MissileRig = {
  root: THREE.Group;
  booster: THREE.Group; gear: THREE.Group;
  /** local points where flames come out: sustainer nozzle, booster nozzles */
  tail: THREE.Vector3; boosterTails: THREE.Vector3[];
};
export type MissilePoseLike = { visible: boolean; pos: [number, number, number]; yaw: number; pitch: number; roll: number; booster: boolean; gear: boolean };
/** the rig convention lives here: yaw about world y, then pitch (nose up, about local z), then roll (about the body axis) */
export const poseMissile = (rig: MissileRig, p: MissilePoseLike) => {
  rig.root.visible = p.visible;
  rig.root.position.set(...p.pos);
  rig.root.rotation.set(p.roll, p.yaw, p.pitch, "YZX");
  rig.booster.visible = p.booster; rig.gear.visible = p.gear;
  rig.root.updateMatrixWorld(true);
};
export const buildMissile = (): MissileRig => {
  const root = new THREE.Group(), body = new Batch(), boost = new Batch(), gear = new Batch();
  const skin = texM("missileSkin", () => P.missileSkinHD()), white = texM("wingSkin", () => rep(P.wingHD(), 0.5, 0.5));
  const red = col("#cf3330"), dark = col("#2b2b34"), metal = col("#9aa0a8");
  // fuselage lathe (tail -4.5 .. nose 4.5)
  const prof: [number, number][] = [[0.36, -4.5], [0.47, -4.3], [0.56, -3.7], [0.62, -2.8], [0.65, -1.5], [0.66, 0], [0.65, 1.5], [0.62, 2.6], [0.56, 3.5], [0.49, 4.15], [0.45, 4.45], [0.43, 4.52]];
  const lathe = new THREE.LatheGeometry(prof.map(([rr2, y]) => new THREE.Vector2(rr2, y)), 40);
  lathe.rotateZ(-Math.PI / 2); // axis y -> +x
  const lu = (lathe.attributes.uv as THREE.BufferAttribute).clone();
  uvFrom(lathe, (x, _y, _z, i) => [(x + 4.5) / 9.02, lu.getX(i)]);
  body.add(lathe, skin);
  // nose intake: lip ring, dark duct, small centre body
  body.add(new THREE.TorusGeometry(0.42, 0.07, 10, 36).rotateY(Math.PI / 2), red, M4(4.52, 0, 0));
  body.add(new THREE.CircleGeometry(0.4, 32).rotateY(Math.PI / 2), dark, M4(4.42, 0, 0));
  body.add(new THREE.ConeGeometry(0.16, 0.42, 16).rotateZ(-Math.PI / 2), metal, M4(4.5, 0, 0));
  // exhaust nozzle
  body.add(new THREE.CylinderGeometry(0.3, 0.34, 0.3, 24, 1, true).rotateZ(Math.PI / 2), dark, M4(-4.6, 0, 0));
  body.add(new THREE.TorusGeometry(0.32, 0.04, 8, 28).rotateY(Math.PI / 2), metal, M4(-4.74, 0, 0));
  // swept wings (bevelled slabs), red tips
  for (const s of [-1, 1]) {
    const wing: [number, number][] = [[1.1, 0.45 * s], [-1.05, 2.85 * s], [-1.8, 2.85 * s], [-1.75, 0.45 * s]];
    body.add(slab(s > 0 ? wing : wing.slice().reverse(), -0.16, 0.13, 0.04), white);
    const tip: [number, number][] = [[-0.82, 2.6 * s], [-1.05, 2.86 * s], [-1.82, 2.86 * s], [-1.8, 2.6 * s]];
    body.add(slab(s > 0 ? tip : tip.slice().reverse(), -0.17, 0.15, 0.04), red);
  }
  // swept fin with a red cap
  body.add(plate([[-2.5, 0.45], [-3.85, 2.15], [-4.45, 2.15], [-4.4, 0.4]], 0.12, 0.03), white);
  body.add(plate([[-3.55, 1.8], [-3.85, 2.17], [-4.47, 2.17], [-4.46, 1.8]], 0.14, 0.03), red);
  // jewellery: pitot probe, nav lights at the wing tips, antenna blade on the spine
  body.add(rod(V(4.55, 0.3, 0), V(5.15, 0.3, 0), 0.035), metal);
  body.add(new THREE.SphereGeometry(0.06, 8, 6), glow("#ff4a3a", 1.4), M4(-1.45, -0.09, -2.9));
  body.add(new THREE.SphereGeometry(0.06, 8, 6), glow("#3fe07a", 1.4), M4(-1.45, -0.09, 2.9));
  body.add(plate([[0.6, 0.6], [0.3, 0.95], [0.1, 0.95], [0.25, 0.6]], 0.04, 0.01), metal);
  body.build(root);
  // twin JATO boosters under the tail
  const booster = new THREE.Group(), boosterTails: THREE.Vector3[] = [];
  for (const s of [-1, 1]) {
    const z = 0.44 * s, y = -0.72;
    boost.add(new THREE.CylinderGeometry(0.27, 0.27, 3.0, 20).rotateZ(Math.PI / 2), col("#d9d6cf"), M4(-2.35, y, z));
    boost.add(new THREE.SphereGeometry(0.27, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2), red, M4(-0.85, y, z, 0, 0, 0, [1.6, 1, 1]));
    boost.add(new THREE.CylinderGeometry(0.2, 0.25, 0.3, 16, 1, true).rotateZ(Math.PI / 2), dark, M4(-4.0, y, z));
    boost.add(plate([[-3.2, 0], [-3.85, -0.45], [-4.05, -0.45], [-3.95, 0]], 0.06, 0.015), red, M4(0, y - 0.15, z));
    boosterTails.push(V(-4.15, y, z));
  }
  boost.build(booster); root.add(booster);
  // landing gear (runway + museum): nose leg + two mains under the wings
  const g = new THREE.Group();
  for (const [x, z] of [[2.7, 0], [-0.9, 0.95], [-0.9, -0.95]]) {
    gear.add(rod(V(x, -0.3, z), V(x, -1.15, z), 0.05), metal);
    gear.add(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 18).rotateX(Math.PI / 2), dark, M4(x, -1.15, z));
    gear.add(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 12).rotateX(Math.PI / 2), metal, M4(x, -1.15, z));
  }
  gear.build(g); root.add(g);
  root.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) { mm.matrixAutoUpdate = false; mm.castShadow = true; } });
  return { root, booster, gear: g, tail: V(-4.8, 0, 0), boosterTails };
};

// =================================================================================================================
// SETS
// =================================================================================================================
export type SetRig = { name: SetName; group: THREE.Group; tick?: (t: number, id: number) => void };
/** per-set world settings: sea level (null = no sea), optional fog override [near, far] in metres */
export const SET_META: Record<SetName, { water: number | null; fog?: [number, number] }> = {
  sea: { water: 0, fog: [90, 1700] },
  subdeck: { water: 0, fog: [60, 900] },
  runway: { water: -0.9, fog: [60, 700] },
  street: { water: null },
  road: { water: null },
  postoffice: { water: null, fog: [200, 2000] },
  museum: { water: null, fog: [200, 2000] },
};
const done = (name: SetName, ...batches: [Batch, boolean][]): SetRig => {
  const group = new THREE.Group(); group.name = name;
  for (const [b, cast] of batches) b.build(group, cast);
  return { name, group };
};

// ---- sea: open water (world.ts) + a bay of coastline, lighthouses, escort ships, buoys, gulls ----
const buildSea = (): SetRig => {
  const b = new Batch();
  seaBackdrop(b, 11);
  gulls(b, 10, 16, -18, 5, 30, 3);
  gulls(b, 60, 22, -60, 4, 40, 4);
  return done("sea", [b, true]);
};

// ---- subdeck: USS Barbero (Balao class, Regulus conversion): hull along x, bow +x ----
const buildSub = (): SetRig => {
  const b = new Batch();
  const hull = texM("hull", () => P.hullHD()), deck = texM("subDeck", () => P.subDeckHD()), slate = col("#4a5868"), dk = col("#5c6874"), steel = col("#8b97a3");
  const haze = col("#7d8a96"), casingM = texM("casing", () => P.casingHD()), rail = col("#c9d3dc"), yellow = col("#e8b830");
  const prof: [number, number][] = [[0.15, -23], [0.9, -21.5], [1.7, -18], [2.2, -12], [2.3, -4], [2.3, 8], [2.1, 14], [1.5, 19], [0.6, 22.3], [0.1, 23]];
  const lathe0 = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 36);
  lathe0.rotateZ(-Math.PI / 2); lathe0.scale(1, 0.82, 1); lathe0.translate(0, -0.2, 0);
  uvFrom(lathe0, (x, y, z) => [x / 4, (y + Math.abs(z)) / 4]);
  b.add(lathe0, hull);
  // red boot-top band at the waterline
  const wl: [number, number][] = [...prof.map(([r, y]) => [y, r * 1.008] as [number, number]), ...prof.slice().reverse().map(([r, y]) => [y, -r * 1.008] as [number, number])];
  b.add(slab(wl, -0.16, 0.3, 0.04), col("#b8553a"));
  // casing (slate with limber holes) + teak deck on top (pointed bow, rounded stern)
  const outline: [number, number][] = [[21.8, 0], [18, 1.15], [8, 1.75], [-14, 1.8], [-19, 1.45], [-20.6, 0.8], [-21, 0], [-20.6, -0.8], [-19, -1.45], [-14, -1.8], [8, -1.75], [18, -1.15]];
  const cas = slab(outline, 1.0, 0.98, 0.06);
  uvFrom(cas, (x, y, z) => [(x + (Math.abs(z) < 0.5 ? z : 0)) / 8, (y - 1.0) / 1.0]);
  b.add(cas, casingM);
  const top = slab(outline.map(([x, z]) => [x * 0.995, z * 0.96] as [number, number]), 1.92, 0.1, 0.03);
  uvFrom(top, (x, _y, z) => [x / 4, z / 4]);
  b.add(top, deck);
  b.add(slab(outline.map(([x, z]) => [x * 1.005, z * 1.08] as [number, number]), 0.85, 0.3, 0.06), slate); // casing lip
  // painted walkway + yellow safety lines around the launcher swing
  for (const s of [-1, 1]) b.add(ground(-17.5, -4.5, s * 1.25 - 0.05, s * 1.25 + 0.05, 2.03, 1), yellow);
  for (const x of [-17.5, -4.5]) b.add(ground(x - 0.05, x + 0.05, -1.25, 1.25, 2.03, 1), yellow);
  // sail (fairwater) with the bridge cap, periscope shears, radar dish, "317"
  const sail = slab(supEll(4.6, 0, 3.9, 1.35, 2.6, 48, 0.25), 2.0, 3.9, 0.15);
  uvFrom(sail, (x, y, z) => [(x + z) / 4, y / 4]);
  b.add(sail, texM("hullSail", () => P.hullHD(), { color: new THREE.Color("#c9d0d8") }));
  b.add(slab(supEll(4.6, 0, 3.95, 1.42, 2.6, 48, 0.25), 5.75, 0.3, 0.08), col("#6c7884"));
  b.add(slab(supEll(6.6, 0, 1.5, 0.95, 2.4, 32), 5.9, 0.9, 0.08), haze);
  for (const s of [-1, 1]) b.add(decalGeo(V(3.4, 4.3, s * 1.43), V(0, 0, s), 2.2, 1.3), decalMat("sail317", "317", 2.2, 1.3, "#f2efe6", "stencil"));
  for (const [x, h, r] of [[4.0, 9.4, 0.14], [5.0, 8.6, 0.12], [3.0, 8.0, 0.1]] as const) b.add(rod(V(x, 5.8, 0), V(x, h, 0), r, r * 0.8), dk);
  b.add(rbox(0.9, 0.3, 0.3, 0.05), steel, M4(4.0, 9.3, 0));
  b.add(lathe("dish", [[0, 0], [0.25, 0.04], [0.5, 0.18], [0.48, 0.2], [0, 0.06]], 16), rail, M4(5.0, 8.75, 0, 0, Math.PI / 2 - 0.3));
  for (const s of [-1, 1]) { // bridge rail on top of the sail
    for (let x = 1.6; x <= 7.2; x += 1.2) b.add(rod(V(x, 6.05, s * 1.1), V(x, 6.95, s * 1.1), 0.05), rail);
    b.add(rod(V(1.6, 6.95, s * 1.1), V(7.2, 6.95, s * 1.0), 0.05), rail);
  }
  lifeRing(b, M4(6.0, 3.9, 1.45, 0)); lifeRing(b, M4(6.0, 3.9, -1.45, Math.PI));
  b.add(rbox(0.5, 0.6, 0.2, 0.05), col("#6c7884"), M4(2.0, 3.6, 1.4)); // sound-powered phone box
  // Regulus hangar aft of the sail: ribs with rivet heads, dome door with a seam + hinges
  const hang = new THREE.CylinderGeometry(1.75, 1.75, 7.6, 36, 1, true).rotateZ(Math.PI / 2);
  uvFrom(hang, (x, y, z) => [x / 4, (y + z) / 4]);
  b.add(hang, texM("hullSail", () => P.hullHD(), { color: new THREE.Color("#c9d0d8") }), M4(-2.6, 2.3, 0));
  for (let k = 0; k < 5; k++) b.add(cached("hRib", () => new THREE.TorusGeometry(1.79, 0.05, 6, 40).rotateY(Math.PI / 2)), haze, M4(-5.8 + k * 1.6, 2.3, 0));
  b.add(new THREE.SphereGeometry(1.75, 32, 16, 0, Math.PI), haze, M4(-6.4, 2.3, 0, -Math.PI / 2, 0, 0, [1, 1, 0.45]));
  b.add(rbox(0.06, 3.4, 0.06, 0.02), dk, M4(-7.2, 2.3, 0));
  for (const y of [1.2, 3.4]) b.add(rbox(0.2, 0.3, 0.3, 0.06), dk, M4(-7.0, y, 1.3));
  b.add(cached("hDoorRing", () => new THREE.TorusGeometry(1.72, 0.08, 8, 36).rotateY(Math.PI / 2)), steel, M4(-6.42, 2.3, 0));
  // launcher: turntable with a yellow safety ring, rail of two I-beams in the missile's frame, struts
  const L = M4(SPOT.LAUNCH[0], SPOT.LAUNCH[1], SPOT.LAUNCH[2], Math.PI, SPOT.LAUNCH_PITCH);
  b.add(cached("turn", () => new THREE.CylinderGeometry(1.6, 1.6, 0.35, 32)), col("#6c7884"), M4(-10.6, 2.17, 0));
  b.add(cached("turnRing", () => new THREE.TorusGeometry(1.5, 0.07, 6, 32).rotateX(Math.PI / 2)), yellow, M4(-10.6, 2.36, 0));
  b.add(cached("ped", () => new THREE.CylinderGeometry(0.8, 0.9, 0.9, 20)), col("#6c7884"), M4(-10.6, 2.75, 0));
  for (const s of [-1, 1]) {
    b.add(rbox(7.6, 0.05, 0.24, 0.015), steel, L.clone().multiply(M4(-0.2, -0.82, s * 0.45)));
    b.add(rbox(7.6, 0.05, 0.24, 0.015), steel, L.clone().multiply(M4(-0.2, -1.16, s * 0.45)));
    b.add(rbox(7.6, 0.32, 0.05, 0.015), steel, L.clone().multiply(M4(-0.2, -0.99, s * 0.45)));
  }
  b.add(rbox(7.0, 0.12, 1.1, 0.04), dk, L.clone().multiply(M4(-0.2, -1.25, 0)));
  for (const lx of [-2.6, 2.4]) {
    const tp = V(lx, -1.25, 0).applyMatrix4(L);
    for (const s of [-1, 1]) b.add(rod(V(tp.x + 0.3 * s, 2.0, 0.55), tp, 0.08), steel), b.add(rod(V(tp.x + 0.3 * s, 2.0, -0.55), tp, 0.08), steel);
  }
  // deck railings: stanchions every 1.8 m with ball caps, two sagging lifelines
  for (const s of [-1, 1]) {
    const posts: number[] = [];
    for (let x = -18; x <= 16; x += 1.8) if (x < 0.8 || x > 9) posts.push(x);
    for (const x of posts) { b.add(rod(V(x, 2.0, s * 1.55), V(x, 3.0, s * 1.55), 0.035), rail); b.add(cached("ball", () => new THREE.SphereGeometry(0.06, 8, 6)), rail, M4(x, 3.02, s * 1.55)); }
    for (let i = 0; i + 1 < posts.length; i++) {
      if (posts[i + 1] - posts[i] > 2) continue;
      for (const y of [2.55, 2.95]) b.add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(posts[i], y, s * 1.55), V((posts[i] + posts[i + 1]) / 2, y - 0.06, s * 1.55), V(posts[i + 1], y, s * 1.55)), 4, 0.025, 5), col("#e8e4da"));
    }
  }
  // deck gun forward of the sail, capstan, cleats, bollards, hatches with red wheels
  b.add(new THREE.CylinderGeometry(0.6, 0.7, 0.5, 20), dk, M4(12.5, 2.25, 0));
  b.add(rbox(1.4, 0.9, 1.0, 0.15), haze, M4(12.6, 2.9, 0));
  b.add(rod(V(12.8, 3.0, 0), V(15.8, 3.3, 0), 0.11), dk);
  b.add(new THREE.CylinderGeometry(0.3, 0.35, 0.35, 16), steel, M4(17.5, 2.2, 0));
  for (const [x, s] of [[-19, 1], [-15.5, -1], [10, 1], [16, -1], [-2, 1]] as const) cleat(b, x, 2.02, s * 1.3, 0);
  for (const [x, s] of [[-18.2, -1], [14.5, 1]] as const) for (const dx of [-0.25, 0.25]) b.add(cached("boll", () => new THREE.CylinderGeometry(0.15, 0.17, 0.4, 12)), dk, M4(x + dx, 2.2, s * 1.2));
  for (const x of [-16.0, 11.0, 1.0]) {
    b.add(cached("hatch", () => new THREE.CylinderGeometry(0.45, 0.48, 0.1, 20)), haze, M4(x, 2.06, -0.6));
    b.add(cached("hWheel", () => new THREE.TorusGeometry(0.2, 0.03, 6, 16).rotateX(Math.PI / 2)), col("#d8352f"), M4(x, 2.16, -0.6));
    b.add(rbox(0.2, 0.12, 0.3, 0.03), dk, M4(x - 0.5, 2.08, -0.6));
  }
  // mail being loaded: sacks, canisters, a toolbox, coils of line
  for (const [x, z, ry] of [[-7.6, -1.05, 0.2], [-8.3, 1.15, 1.1]] as const) crate(b, x, 2.02, z, 0.8, ry);
  sack(b, -8.9, 2.02, -1.15, 0.7, 0.4); sackLying(b, -7.9, 2.02, 0.6, 0.7, 2.0); sack(b, -7.3, 2.02, 1.2, 0.68, 2.6);
  b.add(rbox(0.6, 0.3, 0.3, 0.06), col("#d8352f"), M4(-4.0, 2.17, 1.2));
  b.add(rbox(0.3, 0.06, 0.06, 0.02), col("#2e3440"), M4(-4.0, 2.36, 1.2));
  ropeCoil(b, -19.6, 2.02, -0.6, 1); ropeCoil(b, 15.0, 2.02, -0.8, 0.9); ropeCoil(b, -2.8, 2.02, -1.1, 0.8);
  // stern ensign staff with the 48-star flag
  b.add(rod(V(-20, 2.0, 0), V(-20, 5.0, 0), 0.05), steel);
  b.add(cached("flagWave", () => { const g = new THREE.PlaneGeometry(1.5, 0.8, 10, 1), p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setZ(i, 0.08 * Math.sin(p.getX(i) * 4)); g.computeVertexNormals(); return g; }), texM("flag48", () => P.flag48HD(), { side: THREE.DoubleSide }), M4(-20.78, 4.55, 0));
  seaBackdrop(b, 23);
  gulls(b, -6, 13, 4, 4, 18, 9);
  const r = done("subdeck", [b, true]);
  // waterline foam ring (soft, unlit, no depth write -> NOINK via noInkFallback)
  const pos: number[] = [], uv: number[] = [], idx: number[] = [], K = 72;
  for (let i = 0; i <= K; i++) {
    const a = (i / K) * Math.PI * 2;
    for (const [ax, az, v] of [[22.6, 1.9, 0], [25.5, 4.2, 1]] as const) { pos.push(ax * Math.cos(a), 0.04, az * Math.sin(a)); uv.push((i / K) * 14, v); }
    if (i < K) idx.push(i * 2, i * 2 + 1, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 2);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx);
  const foam = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: P.foamHD(), transparent: true, depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(0.85, 0.9, 0.95) }));
  foam.renderOrder = 1;
  r.group.add(foam);
  return r;
};

// ---- runway: NAAS Mayport, runway along x, hangars + tower behind (-z), beach + sea in front (+z far) ----
const buildRunway = (): SetRig => {
  const b = new Batch();
  const grass = texM("grass4", () => rep(P.grassHD(), 1, 1)), runway = texM("runwayC", () => P.runwayHD()), asph = texM("apronA", () => P.asphaltHD("apronA", "#7b7770"));
  const sand = texM("sand", () => P.sandHD()), white = col("#f4f1e8"), corr = texM("corr", () => P.corrugatedHD("#b9c0c6")), cream = col("#e8e4da"), navy = col("#24407a");
  b.add(ground(-1500, 1500, -1500, 62, 0, 4), grass);
  b.add(quad(V(-1500, 0, 62), V(1500, 0, 62), V(1500, -1.6, 95), V(-1500, -1.6, 95), 750, 9), sand); // beach to the sea
  b.add(ground(-450, 450, -16, 16, 0.03, 3.8), runway);
  for (const s of [-1, 1]) b.add(ground(-450, 450, s * 16.12 - 0.12, s * 16.12 + 0.12, 0.025, 1), col("#5f8a45")); // darker verge band
  b.add(ground(-80, 110, -58, -22, 0.025, 4), asph); // apron
  b.add(ground(-6, 6, -22, -16, 0.028, 4), asph);    // taxiway link
  b.add(ground(-0.15, 0.15, -58, -16, 0.04, 1), col("#e8b830"));
  b.add(ground(-80, 110, -22.15, -21.85, 0.04, 1), col("#e8b830"));
  // markings: centreline dashes 36 m / 24 m gaps, edge stripes, piano keys, touchdown bars, runway numbers
  for (let x = -440; x < 440; x += 60) b.add(ground(x, x + 36, -0.45, 0.45, 0.045, 1), white);
  for (const s of [-1, 1]) b.add(ground(-450, 450, s * 15.1 - 0.45, s * 15.1 + 0.45, 0.045, 1), white);
  for (const [x0, dir] of [[-430, 1], [400, -1]] as const) {
    for (let k = 0; k < 8; k++) for (const s of [-1, 1]) b.add(ground(x0, x0 + 30, s * (2.2 + k * 1.6), s * (2.2 + k * 1.6) + s * 1.0, 0.045, 1), white);
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) b.add(ground(x0 + dir * (150 + k * 60), x0 + dir * (150 + k * 60) + 22, s * 4, s * 7, 0.045, 1), white);
  }
  b.add(decalGeo(V(-380, 0.05, 0), V(0, 1, 0), 18, 12, V(1, 0, 0)), decalMat("rwy23", "23", 18, 12, "#f4f1e8", "slab"));
  b.add(decalGeo(V(352, 0.05, 0), V(0, 1, 0), 18, 12, V(-1, 0, 0)), decalMat("rwy05", "05", 18, 12, "#f4f1e8", "slab"));
  // edge lights every 30 m, 3 m outside the edge, on small rbox bases; distance signs
  for (let x = -435; x <= 435; x += 30) for (const s of [-1, 1]) {
    b.add(rbox(0.3, 0.12, 0.3, 0.04), col("#5c6874"), M4(x, 0.06, s * 19));
    b.add(rod(V(x, 0.1, s * 19), V(x, 0.45, s * 19), 0.07), col("#e8b830"));
    b.add(cached("edgeGlobe", () => new THREE.SphereGeometry(0.13, 10, 8)), glow("#fff2c0", 1.3), M4(x, 0.52, s * 19));
  }
  for (const [x, t] of [[-150, "5"], [-60, "4"], [60, "3"], [150, "2"]] as const) for (const s of [-1, 1]) {
    signBoard(b, "dist" + t, t, 1.5, 1.2, x, 0.85, s * 22, s > 0 ? 0 : Math.PI, { bg: "#22202a", fg: "#f4f1e8", style: "stencil", border: null });
    for (const dx of [-0.5, 0.5]) b.add(rbox(0.1, 0.3, 0.1, 0.02), col("#4a4f55"), M4(x + dx, 0.15, s * 22));
  }
  // two arched Navy hangars + a third smaller; corrugated roof, gable wall, 6-leaf door with window grid, letters
  for (const [hx, w, sign] of [[-50, 14, "U.S. NAVY"], [-14, 12, "MAYPORT"], [64, 13, "NAAS"]] as const) {
    const len = 30, zc = -74, ze = zc + len / 2;
    const arch = new THREE.CylinderGeometry(w, w, len, 32, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1, 0.75, 1);
    uvFrom(arch, (x, y, z) => [z / 2, Math.atan2(x, y) * w / 2]);
    b.add(arch, corr, M4(hx, 2.5, zc));
    for (const s of [-1, 1]) b.add(rbox(0.5, 2.5, len, 0.06), cream, M4(hx + s * (w - 0.2), 1.25, zc));
    const end = new THREE.CircleGeometry(w, 32, 0, Math.PI).scale(1, 0.75, 1);
    b.add(end, cream, M4(hx, 2.5, ze));
    b.add(rbox(w * 2, 2.5, 0.3, 0.05), cream, M4(hx, 1.25, ze));
    b.add(rbox(w * 1.5, 9, 0.35, 0.08), texM("hangarDoor", () => P.hangarDoorHD()), M4(hx, 4.5, ze + 0.12));
    b.add(rbox(w * 1.55, 0.35, 0.5, 0.06), col("#5c6874"), M4(hx, 9.15, ze + 0.2));
    signBoard(b, "hangar" + sign, sign, w * 1.1, 1.9, hx, 10.6, ze + 0.25, 0, { bg: "#f2efe6", fg: "#24407a", style: "slab", border: "#24407a" }, 0.15);
    for (let k = -1; k <= 1; k++) b.add(lathe("vent", [[0.2, 0], [0.2, 0.8], [0.65, 0.85], [0.6, 1.1], [0, 1.25]], 12), col("#9aa4ae"), M4(hx, 2.5 + w * 0.75 - 0.1, zc + k * 9));
    // side lean-to with framed windows and a door
    const lx = hx + w + 2.2;
    b.add(rbox(4.4, 3.6, 12, 0.06), cream, M4(lx, 1.8, zc + 6));
    b.add(rbox(4.8, 0.25, 12.4, 0.06), col("#c9c4b6"), M4(lx, 3.7, zc + 6));
    for (let k = 0; k < 3; k++) { b.add(rbox(0.12, 1.2, 1.4, 0.03), col("#2f5a45"), M4(lx + 2.22, 2.0, zc + 2 + k * 3)); b.add(rbox(0.06, 1.0, 1.2, 0.02), glow("#9fc6d8", 0.85), M4(lx + 2.26, 2.0, zc + 2 + k * 3)); b.add(rbox(0.22, 0.1, 1.6, 0.02), cream, M4(lx + 2.3, 1.35, zc + 2 + k * 3)); }
  }
  // windsock on the left hangar corner
  b.add(rod(V(-66, 0, -58), V(-66, 8, -58), 0.08), col("#d8d4cc"));
  for (let k = 0; k < 4; k++) b.add(new THREE.CylinderGeometry(0.45 - k * 0.07, 0.52 - k * 0.07, 0.65, 14, 1, true).rotateZ(Math.PI / 2 - 0.2), col(k % 2 ? "#f2efe6" : "#e8763a", THREE.DoubleSide), M4(-65.5 - k * 0.62, 7.8 - k * 0.13, -58));
  // control tower: crisp shaft with reveal bands + window strip, red/white check, octagonal cab, catwalk, navy roof
  const T = [42, -46];
  b.add(rbox(4.2, 18, 4.2, 0.08), texM("towerC", () => P.concreteHD("towerC", "#efe9dc")), M4(T[0], 9, T[1]));
  for (let k = 1; k <= 3; k++) b.add(rbox(4.3, 0.15, 4.3, 0.02), col("#c9c4b6"), M4(T[0], k * 4.5, T[1]));
  for (let k = 0; k < 5; k++) { b.add(rbox(0.95, 1.35, 0.12, 0.03), col("#2e3440"), M4(T[0], 2.5 + k * 3.0, T[1] + 2.12)); b.add(rbox(0.8, 1.2, 0.12, 0.02), glow("#9fc6d8", 0.85), M4(T[0], 2.5 + k * 3.0, T[1] + 2.15)); }
  b.add(rbox(4.24, 2, 4.24, 0.04), texM("check", () => rep(P.checkHD(), 2, 1)), M4(T[0], 17, T[1]));
  b.add(rbox(6, 3.5, 6, 0.08), cream, M4(T[0] + 3, 1.75, T[1] + 1));
  b.add(rbox(1.4, 2.2, 0.15, 0.03), col("#8a6a3a"), M4(T[0] + 3, 1.1, T[1] + 4.05));
  b.add(rbox(2.2, 0.12, 1.2, 0.04), col("#5c6874"), M4(T[0] + 3, 2.5, T[1] + 4.6));
  b.add(cached("catwalk", () => new THREE.CylinderGeometry(4.6, 4.6, 0.2, 24)), col("#c9d3dc"), M4(T[0], 18.1, T[1]));
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; b.add(rod(V(T[0] + 4.5 * Math.cos(a), 18.2, T[1] + 4.5 * Math.sin(a)), V(T[0] + 4.5 * Math.cos(a), 19.2, T[1] + 4.5 * Math.sin(a)), 0.04), col("#c9d3dc")); }
  b.add(cached("catRail", () => new THREE.TorusGeometry(4.5, 0.05, 6, 32).rotateX(Math.PI / 2)), col("#c9d3dc"), M4(T[0], 19.2, T[1]));
  b.add(cached("cabSill", () => new THREE.CylinderGeometry(3.4, 3.4, 0.6, 8)), col("#f2efe6"), M4(T[0], 18.5, T[1], Math.PI / 8));
  b.add(cached("cabGlass", () => new THREE.CylinderGeometry(3.8, 3.4, 3.0, 8, 1, true)), glow("#a8d2e2", 0.9), M4(T[0], 20.3, T[1], Math.PI / 8));
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; b.add(rod(V(T[0] + 3.42 * Math.cos(a), 18.8, T[1] + 3.42 * Math.sin(a)), V(T[0] + 3.82 * Math.cos(a), 21.8, T[1] + 3.82 * Math.sin(a)), 0.08), col("#2e3440")); }
  b.add(cached("cabRoof", () => new THREE.CylinderGeometry(4.2, 4.0, 0.4, 8)), navy, M4(T[0], 22.0, T[1], Math.PI / 8));
  b.add(lathe("beacon", [[0.0, 0], [0.4, 0], [0.4, 0.6], [0, 0.65]], 12), glow("#3fae6a", 1.3), M4(T[0], 22.2, T[1]));
  for (const [dx, h] of [[2.5, 4], [-2.5, 4], [0, 3]] as const) b.add(rod(V(T[0] + dx, 22.2, T[1]), V(T[0] + dx, 22.2 + h, T[1]), 0.05), col("#2e3440"));
  b.add(cached("obst", () => new THREE.SphereGeometry(0.2, 8, 6)), glow("#ff5040", 2), M4(T[0], 25.4, T[1]));
  // flagpole with the 48-star flag
  b.add(lathe("flagpole", [[0.18, 0], [0.12, 0.4], [0.08, 12], [0, 12]], 10), col("#e8e4da"), M4(20, 0, -22));
  b.add(cached("goldBall", () => new THREE.SphereGeometry(0.18, 10, 8)), col("#d9b45a"), M4(20, 12.1, -22));
  b.add(cached("bigFlag", () => { const g = new THREE.PlaneGeometry(3, 1.6, 14, 2), p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setZ(i, 0.18 * Math.sin(p.getX(i) * 2.2 + 0.5) * (p.getX(i) + 1.5) / 3); g.computeVertexNormals(); return g; }), texM("flag48", () => P.flag48HD(), { side: THREE.DoubleSide }), M4(21.55, 11.1, -22));
  // welcome board at the apron gate
  signBoard(b, "welcome", "WELCOME TO NAAS MAYPORT", 4.2, 1.4, -24, 2.3, -20, 0.35, { bg: "#24407a", fg: "#f2efe6", style: "slab", border: "#d9b45a", sub: "U.S. NAVAL AUXILIARY AIR STATION", subFg: "#d9b45a" }, 0.12);
  for (const dx of [-1.8, 1.8]) b.add(rbox(0.16, 2.4, 0.16, 0.03), col("#e8e4da"), M4(-24 + dx * Math.cos(0.35), 1.2, -20 - dx * Math.sin(0.35)));
  // palms: groups framing the tower, apron corners, the beach side
  palmGroup(b, 30, -36, 11, 3, 41); palmGroup(b, 54, -38, 10, 2, 43);
  palmGroup(b, -86, -20, 10, 3, 45); palmGroup(b, 116, -20, 12, 3, 47);
  for (const [x, z, h, n] of [[-60, 30, 11, 3], [-26, 34, 12, 2], [18, 36, 10, 3], [52, 30, 12, 2], [92, 33, 11, 3], [-120, 32, 10, 3], [140, 30, 11, 2]] as const) palmGroup(b, x, z, h, n, Math.round(x * 3 + z));
  for (const [x, z] of [[-40, 24], [-8, 28], [30, 25], [70, 26], [-30, -18.6], [26, -19], [60, -20]]) palmetto(b, x, z, 1.0, x * 5 + z);
  tufts(b, 6, 24, 3, 40, 260, 5, (x, z) => z < 17.5);
  tufts(b, 0, -26, 0, 120, 160, 6, (x, z) => z > -17.5 || (x > -82 && x < 112 && z > -60));
  // podium (lectern): tapered wood body with an inset panel, slanted top, gold seal, bunting fan, 2 chrome mics
  const [px, , pz] = SPOT.PODIUM;
  const wood = texM("podiumWood", () => P.panelHD("#b0703f"));
  b.add(rbox(0.72, 1.05, 0.55, 0.05, [1, 1]), wood, M4(px, 0.525, pz));
  b.add(rbox(0.86, 0.07, 0.68, 0.03), col("#8a5530"), M4(px, 1.1, pz - 0.02, 0, -0.26));
  b.add(rbox(0.5, 0.6, 0.04, 0.02), col("#8a5530"), M4(px, 0.55, pz + 0.285));
  b.add(cached("seal", () => new THREE.CylinderGeometry(0.16, 0.16, 0.03, 20).rotateX(Math.PI / 2)), col("#d9b45a"), M4(px, 0.82, pz + 0.3));
  for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + ((k + 0.5) / 9) * Math.PI; b.add(tri(V(px, 0.62, pz + 0.33), V(px + 0.36 * Math.sin(a - 0.17), 0.62 - 0.36 * Math.cos(a - 0.17), pz + 0.33 + (k % 2) * 0.03), V(px + 0.36 * Math.sin(a + 0.17), 0.62 - 0.36 * Math.cos(a + 0.17), pz + 0.33 + (k % 2) * 0.03)), col(["#24407a", "#f2efe6", "#d8352f"][k % 3], THREE.DoubleSide)); }
  for (const dx of [-0.16, 0.16]) {
    b.add(rod(V(px + dx, 1.12, pz + 0.05), V(px + dx * 0.8, 1.42, pz - 0.12), 0.015), col("#4a4f55"));
    b.add(lathe("mic", [[0, 0], [0.045, 0.01], [0.055, 0.06], [0.05, 0.12], [0, 0.13]], 12), col("#c9d3dc"), M4(px + dx * 0.8, 1.4, pz - 0.14));
  }
  for (const dx of [-2.2, 2.0]) {
    b.add(rod(V(px + dx, 0, pz - 0.6), V(px + dx, 3.2, pz - 0.6), 0.035), col("#d9b45a"));
    b.add(cached("standBase", () => new THREE.CylinderGeometry(0.3, 0.35, 0.08, 16)), col("#4a4f55"), M4(px + dx, 0.04, pz - 0.6));
    b.add(cached("smallFlag", () => { const g = new THREE.PlaneGeometry(1.1, 0.6, 8, 1), p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setZ(i, 0.06 * Math.sin(p.getX(i) * 6)); g.computeVertexNormals(); return g; }), texM("flag48", () => P.flag48HD(), { side: THREE.DoubleSide }), M4(px + dx + 0.57, 2.85, pz - 0.6));
  }
  signBoard(b, "podSign", "U.S. POST OFFICE DEPARTMENT", 3.6, 0.9, 8.2, 2.3, 6.4, -0.35, { bg: "#f2efe6", fg: "#24407a", style: "slab", border: "#d8352f", sub: "FIRST OFFICIAL MISSILE MAIL", subFg: "#d8352f" }, 0.1);
  for (const dx of [-1.6, 1.6]) b.add(rbox(0.12, 2.8, 0.12, 0.03), col("#e8e4da"), M4(8.2 + dx * Math.cos(0.35), 1.4, 6.4 + dx * Math.sin(0.35)));
  for (let row = 0; row < 2; row++) for (let k = 0; k < 5; k++) chair(b, 5.6 + k * 0.7, 11.4 + row * 1.0, Math.PI + 0.25, k % 3 ? "#6f7a4a" : "#8d9298");
  // mail sacks heaped by the parked missile (shot 10) + a mail cart with sacks
  const [sx, , sz] = SPOT.SACKS;
  sackPile(b, sx, sz, 7, 21, 0.9);
  b.add(rbox(1.8, 0.12, 1.1, 0.03), col("#5b6b84"), M4(sx - 2.4, 0.55, sz + 0.4));
  for (const s of [-1, 1]) b.add(rbox(1.8, 0.3, 0.05, 0.02), col("#5b6b84"), M4(sx - 2.4, 0.75, sz + 0.4 + s * 0.52));
  b.add(rod(V(sx - 1.5, 0.6, sz + 0.4), V(sx - 0.7, 0.9, sz + 0.4), 0.025), col("#2e3440"));
  for (const [dx, dz] of [[-0.7, -0.45], [0.7, -0.45], [-0.7, 0.45], [0.7, 0.45]]) wheel(b, M4(sx - 2.4 + dx, 0.18, sz + 0.4 + dz), 0.18, 0.08, "#2e3440");
  sackLying(b, sx - 2.7, 0.61, sz + 0.4, 0.7, 0.1); sack(b, sx - 2.0, 0.61, sz + 0.5, 0.62, 1.4);
  // ground crew gear: drums, tow tractor, extinguisher carts, chocks, a sawhorse, parked cars, crates
  const drumC = ["#d8352f", "#3a6ea8", "#e8b830"], labels = ["AV GAS", "JP-3", "OIL"];
  for (let k = 0; k < 6; k++) drum(b, -30 + (k % 3) * 0.66, -52 + Math.floor(k / 3) * 0.7, drumC[k % 3], labels[k % 3], k);
  for (let k = 0; k < 3; k++) drum(b, 12 + k * 0.62, -24.5, drumC[(k + 1) % 3], labels[(k + 1) % 3], k * 2);
  drum(b, -10.5, -19.5, "#d8352f", "AV GAS"); drum(b, -9.9, -19.2, "#3a6ea8", "JP-3");
  tractor(b, -14, -27, 0.4); tractor(b, 36, -30, -0.8);
  extCart(b, -6, -18.5, 0.3); extCart(b, 9, 13.5, -0.4); extCart(b, -40, -24, 0);
  for (let k = 0; k < 3; k++) b.add(rbox(0.5, 0.18, 0.25, 0.05), col("#e8b830"), M4(-4 + k * 0.1, 0.09 + k * 0.18, -21));
  for (const [x, z] of [[-2, 19], [12, 19]]) { b.add(rbox(1.6, 0.18, 0.06, 0.02), white, M4(x, 0.75, z)); b.add(rbox(1.6, 0.18, 0.06, 0.02), col("#d8352f"), M4(x, 0.55, z)); for (const s of [-1, 1]) b.add(rod(V(x + s * 0.7, 0, z + 0.2), V(x + s * 0.7, 0.85, z), 0.03), white), b.add(rod(V(x + s * 0.7, 0, z - 0.2), V(x + s * 0.7, 0.85, z), 0.03), white); }
  ["#f2efe6", "#e8e4da", "#3a6ea8", "#d8352f", "#f2efe6", "#6f7a4a"].forEach((c, k) => car(b, -76 + k * 6.5, -48, Math.PI / 2, c, k));
  for (const [x, z] of [[-24, -26], [-22.6, -26.4]]) crate(b, x, 0, z, 1.0, 0.3);
  // far ring: tree line, base buildings, hills
  townBand(b, 0, -60, 160, 260, -2.6, -0.5, 24, 61);
  treeBand(b, 0, 0, 300, 480, 0, Math.PI * 2, 46, 62, 0.5);
  hillRing(b, 0, 0, 820, 12, 30, 63, "#8fb08a");
  for (const [x, z, y] of [[-260, 420, 0.25], [300, 560, -0.3], [40, 900, 2.9]] as const) escortShip(b, x, z, y, 1, "DD-" + Math.abs(x));
  return done("runway", [b, true]);
};

/** suburban dressing along a street: lamp posts, hydrants, trash cans, power poles, parked cars, far ring */
const suburbRing = (b: Batch, seed: number) => {
  treeBand(b, 0, 0, 120, 260, 0, Math.PI * 2, 40, seed, 0.35);
  townBand(b, 0, 0, 90, 140, 0, Math.PI * 2, 40, seed + 1);
  hillRing(b, 0, 0, 700, 14, 26, seed + 2, "#8fb08a");
};
// ---- street: a ranch house, lawn, picket fence, mailbox, sidewalk, street ----
const buildStreet = (): SetRig => {
  const b = new Batch();
  const grass = texM("grass4", () => rep(P.grassHD(), 1, 1)), asph = texM("asphaltRoad", () => P.asphaltHD("asphaltRoad", "#6a6862")), conc = texM("concrete", () => P.concreteHD());
  b.add(ground(-400, 400, -400, 400, 0, 4), grass);
  b.add(ground(-400, 400, 12.6, 20, 0.03, 4), asph);
  for (let x = -396; x < 400; x += 6) b.add(ground(x, x + 3, 16.15, 16.45, 0.04, 1), col("#e9c84a"));
  b.add(ground(-400, 400, 10.6, 12.4, 0.06, 2), conc);
  b.add(ground(-400, 400, 20.3, 22.1, 0.06, 2), conc);
  for (const z of [12.5, 20.2]) b.add(rbox(800, 0.16, 0.25, 0.04), col("#cfcac0"), M4(0, 0.08, z));
  b.add(ground(0.35, 1.65, SPOT.HOUSE_Z, 10.6, 0.04, 2), conc); // walk
  b.add(ground(6.2, 9.0, SPOT.HOUSE_Z - 1, 10.6, 0.035, 2), conc); // drive
  const holeY = 2.28, holeX = -1.7;
  ranch(b, 0, SPOT.HOUSE_Z - 4, 0, 14, 8, 0, { hole: [holeX, holeY] });
  ranch(b, -21, 0, 0, 12, 8, 1); ranch(b, 21, -1, 0, 12, 8, 2); ranch(b, -40, 0.5, 0, 12, 8, 3); ranch(b, 40, 0, 0, 13, 8, 0);
  ranch(b, -6, 38, Math.PI, 13, 8, 3); ranch(b, 16, 38, Math.PI, 12, 8, 1); ranch(b, -26, 38, Math.PI, 12, 8, 2); ranch(b, 36, 38, Math.PI, 12, 8, 0);
  // picket fence along the front lawn (gap at the walk)
  const wood = col("#fbf6ea");
  for (let x = -9.2; x <= 9.2; x += 0.26) {
    if (x > -0.05 && x < 2.05) continue;
    b.add(rbox(0.1, 0.9, 0.05, 0.02), wood, M4(x, 0.45, 10.2));
    b.add(new THREE.ConeGeometry(0.07, 0.12, 4).rotateY(Math.PI / 4), wood, M4(x, 0.96, 10.2));
  }
  for (const y of [0.3, 0.72]) for (const [x0, x1] of [[-9.3, -0.05], [2.05, 9.3]]) b.add(rbox(x1 - x0, 0.07, 0.05, 0.02), wood, M4((x0 + x1) / 2, y, 10.15));
  // rural-style mailbox: post, rounded-top box, red flag (raised), "U.S. MAIL" lettering, house number
  const [mx, , mz] = SPOT.MAILBOX;
  b.add(rbox(0.12, 1.05, 0.12, 0.02), col("#7a5a3c"), M4(mx, 0.52, mz));
  b.add(rbox(0.36, 0.28, 0.62, 0.04), col("#24407a"), M4(mx, 1.18, mz));
  b.add(new THREE.CylinderGeometry(0.18, 0.18, 0.62, 18, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), col("#24407a"), M4(mx, 1.32, mz));
  b.add(decalGeo(V(mx + 0.185, 1.2, mz), V(1, 0, 0), 0.5, 0.14), decalMat("mbSide", "U.S. MAIL", 0.5, 0.14, "#f2efe6", "stencil"));
  b.add(rbox(0.04, 0.42, 0.06, 0.01), col("#d8352f"), M4(mx + 0.21, 1.42, mz - 0.1));
  b.add(rbox(0.04, 0.14, 0.2, 0.01), col("#d8352f"), M4(mx + 0.21, 1.58, mz - 0.02));
  // street furniture: lamps, hydrant, cans, bikes-free kerb clutter, power poles with wires, parked cars
  for (const x of [-30, -6, 18, 42]) lamppost(b, x, 11.0, -Math.PI / 2);
  for (const x of [-20, 6, 30]) lamppost(b, x, 21.6, Math.PI / 2);
  hydrant(b, 5.2, 11.3); hydrant(b, -16, 21.2);
  trashCan(b, 7.6, 11.0); trashCan(b, 8.2, 11.15); trashCan(b, -12.8, 11.0);
  newsBox(b, -3.2, 11.2, 0); bench(b, -9, 21.4, Math.PI);
  car(b, 12.5, 13.8, 0, "#3a6ea8", 1); car(b, -18, 18.9, Math.PI, "#d8352f", 2); car(b, 7.6, 7.5, Math.PI / 2, "#e8b830", 3);
  const poles = [-36, -12, 12, 36];
  for (const x of poles) { b.add(rod(V(x, 0, 22.4), V(x, 8.5, 22.4), 0.14, 0.11), col("#7a5a3c")); b.add(rbox(2.2, 0.14, 0.14, 0.03), col("#7a5a3c"), M4(x, 7.9, 22.4)); }
  for (let i = 0; i + 1 < poles.length; i++) for (const dz of [-0.9, 0, 0.9]) b.add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(poles[i], 8.0, 22.4 + dz), V((poles[i] + poles[i + 1]) / 2, 7.2, 22.4 + dz), V(poles[i + 1], 8.0, 22.4 + dz)), 10, 0.025, 4), col("#2e3440"));
  // garden: flower beds, a bird bath, a gnome, a tricycle, newspaper, trees, bushes
  for (const [x0, x1] of [[-8.8, -1.0], [2.6, 8.8]]) {
    b.add(ground(x0, x1, 4.4, 5.3, 0.05, 1), col("#7a5a3c"));
    for (let x = x0 + 0.3; x < x1; x += 0.45) b.add(cached("bloom", () => new THREE.SphereGeometry(0.11, 8, 6)), col(["#e98a2e", "#f2cf4a", "#e86a8a", "#f5f1e4"][Math.floor(x * 7) & 3]), M4(x, 0.28, 4.85 + 0.2 * Math.sin(x * 5)));
  }
  b.add(lathe("birdbath", [[0.25, 0], [0.12, 0.1], [0.08, 0.7], [0.35, 0.78], [0.38, 0.85], [0.0, 0.8]], 16), col("#cfcac0"), M4(-5.5, 0, 7.6));
  b.add(lathe("gnomeB", [[0, 0], [0.12, 0], [0.13, 0.2], [0.08, 0.3], [0, 0.3]], 10), col("#3a6ea8"), M4(4.5, 0, 7.0));
  b.add(cached("gnomeH", () => new THREE.SphereGeometry(0.08, 10, 8)), col("#fbf7f2"), M4(4.5, 0.36, 7.0));
  b.add(cached("gnomeC", () => new THREE.ConeGeometry(0.08, 0.2, 10)), col("#d8352f"), M4(4.5, 0.5, 7.0));
  b.add(rbox(0.32, 0.06, 0.1, 0.02), col("#f2efe6"), M4(-2.6, 0.04, 8.8, 0.6));
  for (const [k, x, z, h] of [["round", -10.5, -1, 7.5], ["fat", 10.6, 2.5, 6.5], ["round", -28, 6, 8], ["tall", 28, 7, 9], ["round", 4, 30, 8], ["cone", -16, 30, 7], ["round", -33, 26, 8], ["fat", 26, 27, 7]] as const) addVeg(b, k, x, 0, z, h, x * 13 + z);
  for (const [x, z] of [[-6, 4.7], [-3.7, 4.8], [4.8, 4.7], [6.0, 4.9], [-7.6, 3.0], [7.4, 2.8]]) addVeg(b, "bush", x, 0, z, 1.0, x * 7 + z);
  tufts(b, 0, 8, 0, 14, 120, 7, (x, z) => (x > 0.2 && x < 1.8) || (x > 6 && x < 9.2) || z > 10.0 || Math.abs(x) < 7.5 && z < 4.3);
  suburbRing(b, 71);
  return done("street", [b, true]);
};

// ---- road: suburban road, the mail truck, the launch cart for shot 13 ----
const truck = (b: Batch, x: number, z: number) => {
  const navy = col("#24407a"), white = col("#f2efe6"), red = col("#d8352f"), chrome = col("#c9d3dc"), dark = col("#2e3440"), glass = col("#7fb8d0");
  const M = (dx: number, dy: number, dz: number, ry = 0) => M4(x + dx, dy, z + dz, ry);
  b.add(rbox(6.4, 0.3, 1.6, 0.05), dark, M(0.4, 0.62, 0));                                    // chassis
  // cargo box: navy lower 0.9 m, white upper with the painted livery panels, red belt proud at the split, roof rim
  b.add(rbox(4.3, 0.9, 2.4, 0.16), navy, M(-1.0, 1.225, 0));
  b.add(rbox(4.3, 1.65, 2.4, 0.18), white, M(-1.0, 2.5, 0));
  b.add(rbox(4.36, 0.18, 2.46, 0.05), red, M(-1.0, 1.675, 0));
  b.add(rbox(4.42, 0.14, 2.5, 0.06), col("#e8e4da"), M(-1.0, 3.36, 0));
  const side = texM("truckLivery", () => P.truckHD());
  for (const s of [-1, 1]) b.add(decalGeo(V(x - 1.0, 2.05, z + s * 1.212), V(0, 0, s), 4.0, 2.4), side);
  // rear doors + step, tail lights
  b.add(rbox(0.06, 2.2, 2.0, 0.02), white, M(-3.17, 2.2, 0));
  b.add(rbox(0.07, 2.2, 0.04, 0.01), dark, M(-3.2, 2.2, 0));
  for (const s of [-1, 1]) { b.add(rbox(0.08, 0.3, 0.06, 0.02), chrome, M(-3.22, 2.1, s * 0.15)); b.add(cached("tail", () => new THREE.SphereGeometry(0.08, 8, 6)), red, M(-3.22, 1.0, s * 1.0)); }
  b.add(rbox(0.4, 0.06, 1.2, 0.02), chrome, M(-3.4, 0.55, 0));
  b.add(rbox(0.05, 0.25, 0.6, 0.01), signMat("plate", "U.S. GOVT", 0.6, 0.25, { bg: "#f2efe6", fg: "#24407a", style: "plate", border: null }), M(-3.36, 0.85, 0, Math.PI / 2));
  // cab: navy lower, white upper, rounded front; split windscreen + door windows framed; driver seat + wheel
  b.add(rbox(1.9, 0.95, 2.35, 0.24), navy, M(2.2, 1.225, 0));
  b.add(rbox(1.9, 1.05, 2.35, 0.3), white, M(2.2, 2.2, 0));
  b.add(rbox(1.96, 0.18, 2.41, 0.05), red, M(2.2, 1.675, 0));
  b.add(rbox(1.1, 0.95, 2.1, 0.32), navy, M(3.55, 1.2, 0));                                      // rounded nose / hood
  b.add(cached("nose", () => new THREE.CylinderGeometry(0.45, 0.45, 2.0, 20, 1, false, 0, Math.PI).rotateX(Math.PI / 2)), navy, M(3.65, 1.25, 0, -Math.PI / 2));
  for (const s of [-1, 1]) { b.add(rbox(0.1, 0.62, 0.92, 0.04), dark, M(3.12, 2.2, s * 0.53)); b.add(rbox(0.1, 0.55, 0.8, 0.03), glass, M(3.15, 2.2, s * 0.53)); }
  for (const s of [-1, 1]) { b.add(rbox(1.0, 0.62, 0.06, 0.03), dark, M(2.1, 2.2, s * 1.17)); b.add(rbox(0.86, 0.52, 0.06, 0.02), glass, M(2.1, 2.2, s * 1.19)); }
  for (const s of [-1, 1]) b.add(decalGeo(V(x + 2.15, 1.25, z + s * 1.19), V(0, 0, s), 0.7, 0.7), lam("eagleDecal", () => ({ map: P.signTex("eagleDoor", "U.S.", 256, 256, { bg: "#24407a", fg: "#f2efe6", style: "slab", border: "#f2efe6", cap: 0.35 }) })));
  b.add(rbox(0.12, 0.5, 1.1, 0.04), chrome, M(4.12, 1.15, 0));                                      // grille
  for (let k = 0; k < 9; k++) b.add(rbox(0.04, 0.025, 1.0, 0.005), dark, M(4.18, 0.95 + k * 0.05, 0));
  for (const s of [-1, 1]) {
    b.add(lathe("headRing", [[0.0, 0], [0.14, 0], [0.14, 0.06], [0, 0.06]], 16), chrome, M(4.0, 1.5, s * 0.75, 0).multiply(M4(0, 0, 0, 0, -Math.PI / 2)));
    b.add(cached("hlens", () => new THREE.SphereGeometry(0.11, 12, 8)), glow("#fff3c4", 1.2), M(4.07, 1.5, s * 0.75));
    b.add(cached("park", () => new THREE.SphereGeometry(0.05, 8, 6)), glow("#f6b040", 1.1), M(4.12, 1.0, s * 0.85));
    b.add(rod(V(x + 3.0, 2.3, z + s * 1.18), V(x + 3.0, 2.3, z + s * 1.5), 0.03), chrome);
    b.add(rbox(0.06, 0.3, 0.18, 0.03), chrome, M(3.0, 2.3, s * 1.55));
  }
  b.add(rbox(0.22, 0.2, 2.2, 0.08), chrome, M(4.25, 0.62, 0));                                    // bumpers
  b.add(rbox(0.22, 0.2, 2.2, 0.08), chrome, M(-3.3, 0.62, 0));
  for (const [wx, s] of [[2.95, 1], [2.95, -1], [-2.0, 1], [-2.0, -1]] as const) {
    wheel(b, M(wx, 0.46, s * 1.06), 0.46, 0.3);
    b.add(cached("fender", () => new THREE.TorusGeometry(0.58, 0.06, 6, 20, Math.PI)), navy, M(wx, 0.5, s * 1.2));
  }
  // overloaded: canvas sacks heaped on the roof rack (lying + standing, resting on each other), roped down
  for (const s of [-1, 1]) b.add(rod(V(x - 3.2, 3.55, z + s * 1.15), V(x + 1.1, 3.55, z + s * 1.15), 0.04), chrome);
  const roof: [number, number, number, boolean, number][] = [[-2.7, 0.45, 0.85, true, 0.2], [-2.6, -0.5, 0.8, false, 1.1], [-1.8, 0.4, 0.9, false, 2.3], [-1.7, -0.45, 0.85, true, 1.6], [-0.8, 0.45, 0.85, true, 0.6], [-0.8, -0.4, 0.9, false, 1.7],
    [0.2, 0.3, 0.85, false, 2.9], [0.4, -0.45, 0.8, true, 0.4], [-2.1, 0.0, 0.75, true, 1.4], [-1.1, 0.05, 0.75, false, 2.2], [-0.2, -0.05, 0.72, true, 1.9]];
  roof.forEach(([dx, dz, s, lying, ry], i) => { const y = 3.43 + (i >= 8 ? 0.55 : 0); if (lying) sackLying(b, x + dx, y, z + dz, s, ry); else sack(b, x + dx, y, z + dz, s, ry, 0.12 * Math.sin(i * 2.3)); });
  for (const dx of [-2.2, -0.6, 0.6]) b.add(rod(V(x + dx, 3.5, z - 1.2), V(x + dx + 0.1, 4.6, z), 0.025), ropeM()), b.add(rod(V(x + dx + 0.1, 4.6, z), V(x + dx, 3.5, z + 1.2), 0.025), ropeM());
  // sacks spilling out of the open back
  sack(b, x - 3.8, 0, z + 0.5, 0.85, 0.4, 0.15); sackLying(b, x - 4.0, 0, z - 0.6, 0.8, 1.9); sack(b, x - 4.6, 0, z + 0.1, 0.75, 2.5, -0.1);
};
const buildRoad = (): SetRig => {
  const b = new Batch();
  const grass = texM("grass4", () => rep(P.grassHD(), 1, 1)), asph = texM("asphaltRoad", () => P.asphaltHD("asphaltRoad", "#6a6862")), conc = texM("concrete", () => P.concreteHD());
  b.add(ground(-500, 500, -500, 500, 0, 4), grass);
  b.add(ground(-500, 500, -6.5, 3.5, 0.03, 4), asph);
  for (let x = -496; x < 500; x += 6) b.add(ground(x, x + 3, -1.65, -1.35, 0.04, 1), col("#e9c84a"));
  for (const [z0, z1] of [[3.7, 5.9], [-8.9, -6.7]]) b.add(ground(-500, 500, z0, z1, 0.06, 2), conc);
  for (const z of [3.6, -6.6]) b.add(rbox(1000, 0.16, 0.22, 0.04), col("#cfcac0"), M4(0, 0.08, z));
  [-34, -18, -2, 14, 30, 46, -50].forEach((x, i) => ranch(b, x, -18, 0, 12, 8, i));
  [-30, -12, 8, 26, 44, -48].forEach((x, i) => ranch(b, x, 22, Math.PI, 12, 8, i + 2));
  for (const [k, x, z, h] of [["round", -26, -12, 8], ["fat", -9, -11, 6.5], ["round", 7, -11.5, 7.5], ["tall", 22, -12, 9], ["round", -40, -11, 7], ["cone", 38, -12, 7], ["round", -20, 15, 8], ["fat", 17, 15, 7], ["round", 36, 15.5, 8], ["tall", -38, 15, 9]] as const) addVeg(b, k, x, 0, z, h, x * 13 + z);
  const poles = [-45, -25, 5, 35, 55];
  for (const x of poles) { b.add(rod(V(x, 0, -7.6), V(x, 8.5, -7.6), 0.14, 0.11), col("#7a5a3c")); b.add(rbox(2.2, 0.14, 0.14, 0.03), col("#7a5a3c"), M4(x, 7.9, -7.6)); }
  for (let i = 0; i + 1 < poles.length; i++) for (const dz of [-0.9, 0, 0.9]) b.add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(poles[i], 8.0, -7.6 + dz), V((poles[i] + poles[i + 1]) / 2, 7.1, -7.6 + dz), V(poles[i + 1], 8.0, -7.6 + dz)), 10, 0.025, 4), col("#2e3440"));
  for (const x of [-38, -14, 10, 34]) lamppost(b, x, 4.9, -Math.PI / 2);
  for (const x of [-26, -2, 22]) lamppost(b, x, -7.9, Math.PI / 2);
  collectionBox(b, 6.6, 4.7, -Math.PI / 2 + 0.3); collectionBox(b, -12.4, -7.6, Math.PI / 2);
  hydrant(b, 9.4, 4.4); hydrant(b, -20, -7.2); trashCan(b, 11, 4.9); trashCan(b, -16, -8.0); newsBox(b, 5.4, 5.2, -Math.PI / 2);
  bench(b, -6, 5.4, 0); bench(b, 16, -8.3, Math.PI);
  car(b, 14, 2.1, Math.PI, "#3a6ea8", 1); car(b, -24, -5.0, 0, "#f2efe6", 2); car(b, 26, -5.0, 0, "#d8352f", 3); car(b, -36, 2.1, Math.PI, "#6f7a4a", 4);
  // corner gas station for "a tank of fuel": island, two pumps with lit globes, a canopy, a sign
  const gx = 12, gz = -12;
  b.add(ground(gx - 9, gx + 9, gz - 9, gz + 2.5, 0.05, 4), conc);
  b.add(rbox(6, 0.25, 1.4, 0.06), col("#e8e4da"), M4(gx, 0.12, gz - 2));
  for (const dx of [-1.6, 1.6]) {
    b.add(rbox(0.7, 1.5, 0.5, 0.12), col("#d8352f"), M4(gx + dx, 1.0, gz - 2));
    b.add(rbox(0.5, 0.35, 0.04, 0.03), col("#f2efe6"), M4(gx + dx, 1.35, gz - 1.74));
    b.add(cached("pumpGlobe", () => new THREE.SphereGeometry(0.25, 12, 10)), glow("#f6e7c0", 1.1), M4(gx + dx, 1.95, gz - 2));
    b.add(rod(V(gx + dx + 0.38, 1.2, gz - 2), V(gx + dx + 0.5, 0.5, gz - 1.6), 0.03), col("#2e3440"));
  }
  for (const [dx, dz] of [[-2.9, -2.6], [2.9, -2.6], [-2.9, -1.4], [2.9, -1.4]]) b.add(rbox(0.2, 4.0, 0.2, 0.04), col("#e8e4da"), M4(gx + dx, 2.0, gz + dz));
  b.add(rbox(7.4, 0.5, 3.4, 0.12), col("#f2efe6"), M4(gx, 4.25, gz - 2));
  b.add(rbox(7.5, 0.22, 3.5, 0.06), col("#d8352f"), M4(gx, 4.0, gz - 2));
  b.add(rbox(6, 3.6, 5, 0.08), col("#e8e4da"), M4(gx + 1, 1.8, gz - 6.5));
  b.add(rbox(3.4, 2.2, 0.1, 0.04), glow("#cfe2ec", 0.9), M4(gx + 0.2, 1.6, gz - 3.96));
  signBoard(b, "gasSign", "GAS  -  SERVICE", 4.2, 0.8, gx + 1, 4.1, gz - 3.95, 0, { bg: "#d8352f", fg: "#f2efe6", style: "slab", border: "#f2efe6" }, 0.12);
  signBoard(b, "gasPrice", "REGULAR 25c", 1.6, 1.1, gx - 7, 2.7, gz + 1.8, 0.4, { bg: "#f2efe6", fg: "#24407a", style: "stencil", border: "#d8352f" });
  b.add(rbox(0.14, 2.2, 0.14, 0.03), col("#4a4f55"), M4(gx - 7, 1.1, gz + 1.8));
  for (let k = 0; k < 4; k++) drum(b, gx + 4.5 + (k % 2) * 0.62, gz - 3.6 - Math.floor(k / 2) * 0.62, ["#d8352f", "#3a6ea8", "#e8b830", "#6f7a4a"][k], "OIL");
  truck(b, SPOT.TRUCK[0], SPOT.TRUCK[2]);
  // launch cart (shot 13): two-wheel trailer with a ramp rail in the missile's frame
  const [cx, , cz] = SPOT.CART;
  b.add(rbox(4.6, 0.26, 1.5, 0.06), col("#5b6b54"), M4(cx, 0.75, cz, 0.42));
  for (const s of [-1, 1]) {
    const w = V(0, 0, s * 0.85).applyAxisAngle(UP, 0.42);
    wheel(b, M4(cx + w.x, 0.42, cz + w.z, 0.42), 0.42, 0.26);
  }
  const L = M4(CART_MISSILE[0], CART_MISSILE[1], CART_MISSILE[2], 0.42, 0.36);
  b.add(rbox(6.0, 0.22, 0.24, 0.05), col("#8d97a3"), L.clone().multiply(M4(-0.4, -0.8, 0)));
  const hi = V(2.2, -0.95, 0).applyMatrix4(L);
  b.add(rod(V(hi.x, 0.85, hi.z), hi, 0.08), col("#8d97a3"));
  crate(b, cx - 2.6, 0, cz + 1.2, 0.9, 0.2, "DANGER");
  suburbRing(b, 81);
  return done("road", [b, true]);
};

// ---- post office interior: crowded 1959 lobby + work floor ----
const room = (shell: Batch, x0: number, x1: number, z0: number, z1: number, h: number, wall: Mat, floor: Mat, ceil: Mat, wains?: Mat) => {
  shell.add(ground(x0, x1, z0, z1, 0, 2), floor);
  shell.add(quad(V(x0, h, z0), V(x1, h, z0), V(x1, h, z1), V(x0, h, z1), (x1 - x0) / 2, (z1 - z0) / 2), ceil);
  const t = 0.3;
  const H = h + 0.6; // walls run past the ceiling: a wall top flush with the ceiling inks as a dashed seam
  rb(shell, wall, x0 - t, x1 + t, 0, H, z0 - t, z0, 0.02, 2);
  rb(shell, wall, x0 - t, x1 + t, 0, H, z1, z1 + t, 0.02, 2);
  rb(shell, wall, x0 - t, x0, 0, H, z0, z1, 0.02, 2);
  rb(shell, wall, x1, x1 + t, 0, H, z0, z1, 0.02, 2);
  if (wains) for (const [a, c, d, e] of [[x0, x1, z0, z0 + 0.06], [x0, x0 + 0.06, z0, z1], [x1 - 0.06, x1, z0, z1]] as const) rb(shell, wains, a, c, 0, 1.15, d, e, 0.02, [2, 1]);
};
const pendant = (b: Batch, x: number, z: number, top: number, drop: number) => {
  b.add(rod(V(x, top, z), V(x, top - drop, z), 0.015), col("#2a2a30"));
  b.add(new THREE.ConeGeometry(0.42, 0.34, 20, 1, true), col("#2f5d4a", THREE.DoubleSide), M4(x, top - drop - 0.12, z));
  b.add(new THREE.SphereGeometry(0.13, 12, 10), glow("#fff2c8", 2.6), M4(x, top - drop - 0.28, z));
};
/** wheeled canvas mail hamper with sacks + letters spilling */
const hamper = (b: Batch, x: number, y: number, z: number, ry: number, seed: number) => {
  const m = M4(x, y, z, ry), L = (g: THREE.BufferGeometry, mat: Mat, mm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(mm));
  L(rbox(1.2, 0.75, 0.8, 0.08), texM("canvasSack", () => P.burlapHD()), M4(0, 0.6, 0));
  L(rbox(1.26, 0.06, 0.86, 0.02), col("#6e5a46"), M4(0, 0.98, 0));
  for (const [dx, dz] of [[-0.5, -0.32], [0.5, -0.32], [-0.5, 0.32], [0.5, 0.32]]) { L(rbox(0.05, 0.2, 0.05, 0.01), col("#4a4f55"), M4(dx, 0.15, dz)); L(cached("caster", () => new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10).rotateX(Math.PI / 2)), col("#2e3440"), M4(dx, 0.06, dz)); }
  const r = rng(seed);
  for (let k = 0; k < 3; k++) sack(b, x + (r() - 0.5) * 0.6, y + 0.65, z + (r() - 0.5) * 0.3, 0.5, r() * 6);
  for (let k = 0; k < 6; k++) b.add(rbox(0.24, 0.015, 0.12, 0.005), col(["#f4efe2", "#efe3c8", "#dfe8f2"][k % 3]), m.clone().multiply(M4((r() - 0.5) * 0.9, 1.0 + r() * 0.08, (r() - 0.5) * 0.5, r() * 3, 0.3 * (r() - 0.5))));
};
/** stack of brown-paper parcels tied with string */
const parcels = (b: Batch, x: number, y: number, z: number, n: number, seed: number) => {
  const r = rng(seed); let h = y;
  for (let k = 0; k < n; k++) {
    const w = 0.35 + 0.25 * r(), d = 0.25 + 0.2 * r(), t = 0.15 + 0.15 * r(), ry = (r() - 0.5) * 0.5;
    b.add(rbox(w, t, d, 0.02), col(["#c8945a", "#b98a52", "#d4a56a"][k % 3]), M4(x, h + t / 2, z, ry));
    b.add(rbox(w + 0.01, t + 0.01, 0.02, 0.004), col("#f2efe6"), M4(x, h + t / 2, z, ry));
    h += t;
  }
};
const buildPostOffice = (): SetRig => {
  const shell = new Batch(), b = new Batch();
  const wall = texM("poWall", () => P.plasterHD("#e8d9b8")), floor = texM("poFloor", () => P.tilesHD("#e9dcc0", "#8a5a3c")), ceil = texM("poCeil", () => P.plasterHD("#f2e8d4"));
  const wains = texM("poWains", () => P.panelHD("#6e4128")), brass = col("#c9a24e"), walnut = col("#4a2a18");
  room(shell, -7, 7, -5, 9, 4.4, wall, floor, ceil, wains);
  // dado rail + cornice on the walls
  rb(b, walnut, -7, 7, 1.15, 1.25, -5, -4.92, 0.02); rb(b, col("#d9c8a6"), -7, 7, 4.1, 4.4, -5, -4.85, 0.03);
  for (const s of [-1, 1]) { rb(b, walnut, s > 0 ? 6.92 : -7, s > 0 ? 7 : -6.92, 1.15, 1.25, -5, 9, 0.02); rb(b, col("#d9c8a6"), s > 0 ? 6.85 : -7, s > 0 ? 7 : -6.85, 4.1, 4.4, -5, 9, 0.03); }
  // counter (front face at COUNTER_Z), dark top, brass foot rail
  const cz = SPOT.COUNTER_Z;
  rb(b, texM("counterWood", () => P.panelHD("#7a4a2c")), -5.5, 5.5, 0, 0.95, cz - 1.0, cz, 0.05, [2, 1]);
  rb(b, col("#4a2a18"), -5.7, 5.7, 0.95, 1.03, cz - 1.15, cz + 0.12, 0.03);
  rb(b, texM("poFloorB", () => P.parquetHD("#8a5a34")), -5.5, 5.5, 0, SPOT.CLERK[1], cz - 3.2, cz - 1.0, 0.03, 2); // clerk's raised floor
  b.add(rod(V(-5.4, 0.18, cz + 0.22), V(5.4, 0.18, cz + 0.22), 0.035), brass);
  // brass grille panels with window signs over them, the "U.S. POST OFFICE" sign hung over the open window
  for (const [x0, x1, t] of [[-5.4, -1.9, "STAMPS"], [1.9, 5.4, "PARCEL POST"]] as const) {
    rb(b, brass, x0, x1, 2.05, 2.12, cz - 0.55, cz - 0.45, 0.02);
    for (let x = x0; x <= x1 + 1e-6; x += 0.18) b.add(rod(V(x, 1.03, cz - 0.5), V(x, 2.08, cz - 0.5), 0.012), brass);
    signBoard(b, "po" + t, t, 1.8, 0.34, (x0 + x1) / 2, 2.35, cz - 0.5, 0, { bg: "#24407a", fg: "#f2efe6", style: "slab", border: "#d9b45a" }, 0.05);
  }
  signBoard(b, "poMain", "U.S. POST OFFICE", 3.0, 0.5, 0, 2.9, cz - 0.5, 0, { bg: "#2f5a45", fg: "#f2e3b0", style: "slab", border: "#d9b45a" }, 0.07);
  for (const dx of [-1.3, 1.3]) b.add(rod(V(dx, 3.15, cz - 0.5), V(dx, 4.4, cz - 0.5), 0.012), brass);
  // on the counter: scale, letter stacks, stamp box, rubber-stamp rack, ink pad, banker's lamp, bell, ledger
  b.add(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 16), col("#3f4650"), M4(1.1, 1.12, cz - 0.4));
  b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 20), brass, M4(1.1, 1.26, cz - 0.4));
  for (let k = 0; k < 4; k++) rb(b, col(k % 2 ? "#efe3c8" : "#f7f4ea"), -1.6 + k * 0.04, -1.25 + k * 0.04, 1.03 + k * 0.04, 1.07 + k * 0.04, cz - 0.6, cz - 0.35, 0.01);
  rb(b, col("#2f5d9a"), 2.4, 2.75, 1.03, 1.15, cz - 0.7, cz - 0.45, 0.02);
  rb(b, walnut, -3.2, -2.6, 1.03, 1.08, cz - 0.75, cz - 0.55, 0.01);
  for (let k = 0; k < 5; k++) { b.add(rod(V(-3.15 + k * 0.12, 1.08, cz - 0.65), V(-3.15 + k * 0.12, 1.22, cz - 0.65), 0.012), walnut); b.add(cached("stampKnob", () => new THREE.SphereGeometry(0.025, 8, 6)), col("#d8352f"), M4(-3.15 + k * 0.12, 1.24, cz - 0.65)); }
  rb(b, col("#24407a"), -2.4, -2.15, 1.03, 1.06, cz - 0.7, cz - 0.55, 0.01);
  b.add(rod(V(3.6, 1.03, cz - 0.75), V(3.6, 1.38, cz - 0.75), 0.015), brass);
  b.add(cached("bankLamp", () => new THREE.CylinderGeometry(0.06, 0.06, 0.4, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2)), col("#2f6a4a", THREE.DoubleSide), M4(3.6, 1.4, cz - 0.7, Math.PI / 2));
  b.add(lathe("bell", [[0.08, 0], [0.08, 0.02], [0.05, 0.06], [0.0, 0.07]], 12), brass, M4(-0.6, 1.03, cz - 0.3));
  rb(b, col("#6e2a20"), 4.2, 4.65, 1.03, 1.09, cz - 0.6, cz - 0.3, 0.01);
  // behind the counter: pigeon-hole sorting cabinet, lock boxes, hampers, parcels, sacks, a clock, a calendar
  rb(b, col("#6e4128"), -3.4, 3.4, 0, 0.9, -4.95, -4.25, 0.04);
  rb(b, texM("slots", () => P.slotsHD()), -3.2, 3.2, 0.9, 3.3, -4.95, -4.45, 0.03, [2.4, 2.4]);
  rb(b, col("#5a341f"), -3.4, 3.4, 3.3, 3.45, -4.98, -4.35, 0.04);
  rb(b, texM("poBoxes", () => P.poBoxesHD()), -6.9, -3.7, 0.9, 3.3, -4.98, -4.82, 0.03, [2.4, 2.4]);
  rb(b, walnut, -7, -3.6, 0, 0.9, -4.98, -4.6, 0.03);
  rb(b, col("#8a6a3e"), 3.8, 6.6, 1.3, 2.7, -4.98, -4.9, 0.03); // bulletin board
  const r = rng(77);
  for (let k = 0; k < 9; k++) b.add(rbox(0.32 + r() * 0.2, 0.4 + r() * 0.2, 0.01, 0.003), col(["#f4efe2", "#f2e3b0", "#dfe8f2", "#f3d0c8"][k % 4]), M4(4.1 + (k % 3) * 0.85 + r() * 0.15, 1.65 + Math.floor(k / 3) * 0.42, -4.88, 0, (r() - 0.5) * 0.2));
  signBoard(b, "wanted", "WANTED", 0.6, 0.18, 4.4, 2.55, -4.86, 0, { bg: "#f2e3b0", fg: "#6e2a20", style: "slab", border: null }, 0.01);
  b.add(rbox(0.5, 0.7, 0.02, 0.005), texM("calendar", () => P.signTex("calendar", "JUNE 1959", 256, 360, { bg: "#f4efe2", fg: "#d8352f", style: "slab", border: "#24407a", cap: 0.12 })), M4(6.2, 3.3, -4.88));
  hamper(b, 2.6, SPOT.CLERK[1], -2.6, 0.3, 1); hamper(b, -3.6, SPOT.CLERK[1], -2.9, -0.2, 2);
  parcels(b, 4.6, SPOT.CLERK[1], -2.2, 4, 3); parcels(b, -4.9, SPOT.CLERK[1], -1.8, 3, 4); parcels(b, 5.1, SPOT.CLERK[1], -3.1, 5, 5);
  sack(b, -2.2, SPOT.CLERK[1], -3.7, 0.75, 0.4); sackLying(b, 1.5, SPOT.CLERK[1], -3.8, 0.7, 0.2); sack(b, 3.9, SPOT.CLERK[1], -3.9, 0.7, 2.2);
  b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 32).rotateX(Math.PI / 2), texM("clock", () => P.clockHD()), M4(0, 3.85, -4.9));
  // posters + flag on the side walls and the customer side
  const poster = (k: number, x: number, y: number, z: number, ry: number) => b.add(rbox(1.0, 1.4, 0.03, 0.01), texM("poster" + k, () => P.posterHD(k)), M4(x, y, z, ry));
  poster(0, -6.96, 2.3, 1.2, Math.PI / 2); poster(1, 6.96, 2.3, 0.6, -Math.PI / 2); poster(2, -6.96, 2.3, 5.6, Math.PI / 2); poster(0, 6.96, 2.3, 6.4, -Math.PI / 2);
  signBoard(b, "airmail", "AIR MAIL", 1.4, 0.4, 6.94, 3.35, 3.5, -Math.PI / 2, { bg: "#d8352f", fg: "#f2efe6", style: "slab", border: "#24407a" }, 0.04);
  b.add(rod(V(-5.6, 0, 0.6), V(-5.6, 2.6, 0.6), 0.03), brass);
  b.add(cached("standBase", () => new THREE.CylinderGeometry(0.3, 0.35, 0.08, 16)), col("#4a4f55"), M4(-5.6, 0.04, 0.6));
  b.add(cached("hangFlag", () => { const g = new THREE.PlaneGeometry(1.0, 0.55, 8, 4), p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.05 * Math.sin(x * 8)); p.setY(i, y - 0.1 * (x + 0.5) ** 2); } g.computeVertexNormals(); return g; }), texM("flag48", () => P.flag48HD(), { side: THREE.DoubleSide }), M4(-5.08, 2.2, 0.6));
  b.add(cached("eagleTop", () => new THREE.SphereGeometry(0.06, 8, 6)), col("#d9b45a"), M4(-5.6, 2.65, 0.6));
  // tall windows on the left wall (bright), customer desk on the right with forms, bench, water cooler, coat rack
  for (const z of [-1.5, 3.5]) { rb(b, col("#fbf6ea"), -7.02, -6.9, 1.0, 3.8, z - 0.9, z + 0.9, 0.03); rb(b, glow("#fff1d2", 1.05), -6.98, -6.86, 1.12, 3.68, z - 0.78, z + 0.78, 0.01); rb(b, col("#fbf6ea"), -6.97, -6.84, 2.38, 2.46, z - 0.78, z + 0.78, 0.01); rb(b, col("#fbf6ea"), -6.97, -6.84, 1.12, 3.68, z - 0.04, z + 0.04, 0.01); rb(b, col("#fbf6ea"), -7.05, -6.7, 0.92, 1.02, z - 1.0, z + 1.0, 0.02); }
  rb(b, col("#6e4128"), 4.4, 6.2, 0.95, 1.05, 1.2, 2.4, 0.03);
  for (const [x, z] of [[4.5, 1.3], [6.1, 1.3], [4.5, 2.3], [6.1, 2.3]]) rb(b, walnut, x - 0.05, x + 0.05, 0, 0.95, z - 0.05, z + 0.05, 0.01);
  for (let k = 0; k < 5; k++) b.add(rbox(0.22, 0.01, 0.3, 0.003), col(["#f4efe2", "#dfe8f2", "#f2e3b0"][k % 3]), M4(4.7 + k * 0.3, 1.06, 1.6 + (k % 2) * 0.4, k * 0.4));
  b.add(rod(V(5.3, 1.05, 2.2), V(5.4, 1.2, 2.25), 0.008), col("#2e3440"));
  pendant(b, -2.5, 0.5, 4.4, 0.9); pendant(b, 2.5, 0.5, 4.4, 0.9); pendant(b, 0, 4.5, 4.4, 0.9); pendant(b, -2.5, -3.0, 4.4, 0.7); pendant(b, 2.5, -3.0, 4.4, 0.7);
  b.add(rod(V(0, 4.4, 2.5), V(0, 3.9, 2.5), 0.03), col("#2e3440"));
  for (let k = 0; k < 4; k++) b.add(rbox(1.3, 0.03, 0.22, 0.01), col("#6e4128"), M4(Math.cos((k * Math.PI) / 2) * 0.7, 3.88, 2.5 + Math.sin((k * Math.PI) / 2) * 0.7, (-k * Math.PI) / 2));
  b.add(cached("fanHub", () => new THREE.CylinderGeometry(0.15, 0.12, 0.2, 12)), col("#c9a24e"), M4(0, 3.9, 2.5));
  b.add(new THREE.CylinderGeometry(0.22, 0.18, 0.5, 16, 1, true), col("#5a6a5a", THREE.DoubleSide), M4(-3.2, 0.25, 1.4));
  rb(b, col("#7a4a2c"), 3.6, 6.4, 0.45, 0.55, 6.4, 7.0, 0.04);
  for (const x of [3.8, 6.2]) rb(b, walnut, x - 0.05, x + 0.05, 0, 0.45, 6.45, 6.95, 0.01);
  b.add(rbox(0.45, 1.0, 0.45, 0.06), col("#e8e4da"), M4(-6.4, 0.5, 6.0));
  b.add(lathe("cooler", [[0, 0], [0.2, 0.02], [0.24, 0.2], [0.22, 0.45], [0.1, 0.5], [0, 0.5]], 16), glow("#bfe0ee", 0.9), M4(-6.4, 1.0, 6.0));
  b.add(rod(V(6.4, 0, 4.6), V(6.4, 1.9, 4.6), 0.03), walnut);
  for (let k = 0; k < 4; k++) b.add(rod(V(6.4, 1.8, 4.6), V(6.4 + 0.25 * Math.cos(k * 1.57), 1.95, 4.6 + 0.25 * Math.sin(k * 1.57)), 0.02), walnut);
  b.add(cached("hat", () => new THREE.CylinderGeometry(0.15, 0.17, 0.12, 14)), col("#3a3a46"), M4(6.6, 1.98, 4.6));
  // customer side clutter: sacks waiting by the door, parcels on the floor, a scale, a waste bin
  sack(b, -2.9, 0, 4.4, 0.8, 1.0); sackLying(b, -3.6, 0, 3.9, 0.75, 0.3); parcels(b, 2.8, 0, 4.6, 3, 9);
  b.add(rbox(0.5, 0.08, 0.5, 0.02), col("#3f4650"), M4(-1.6, 0.04, 6.5)); b.add(rbox(0.08, 1.1, 0.08, 0.02), col("#3f4650"), M4(-1.6, 0.6, 6.25)); b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20).rotateX(Math.PI / 2), texM("clock", () => P.clockHD()), M4(-1.6, 1.15, 6.3));
  return done("postoffice", [shell, false], [b, true]);
};

// ---- museum hall: stone walls, terrazzo, gallery, skylight, banners, the missile on its plinth + other exhibits ----
const buildMuseum = (rigForSupports: MissileRig): SetRig => {
  const shell = new Batch(), b = new Batch();
  const wall = texM("musWall", () => P.ashlarHD("mus", "#e6d3b0")), floor = texM("musFloor", () => rep(P.terrazzoHD(), 0.5, 0.5)), ceil = texM("musCeil", () => P.plasterHD("#f4ead8"));
  room(shell, -16, 16, -14, 24, 12, wall, floor, ceil);
  const trim = col("#d9c8a6"), dado = col("#b8a07a"), walnut = col("#6e4630"), brass = col("#d9b45a"), marble = texM("marble", () => P.marbleHD());
  // dado band, pilasters with capitals
  rb(b, dado, -16, 16, 0, 1.2, -14, -13.88, 0.03); for (const s of [-1, 1]) rb(b, dado, s > 0 ? 15.88 : -16, s > 0 ? 16 : -15.88, 0, 1.2, -14, 24, 0.03);
  for (let x = -12; x <= 12; x += 6) { rb(b, trim, x - 0.5, x + 0.5, 0, 11, -14, -13.6, 0.06); rb(b, trim, x - 0.65, x + 0.65, 11, 11.25, -14, -13.45, 0.05); rb(b, trim, x - 0.8, x + 0.8, 11.25, 11.5, -14, -13.3, 0.05); }
  for (const s of [-1, 1]) for (let z = -8; z <= 20; z += 7) { rb(b, trim, s > 0 ? 15.6 : -16, s > 0 ? 16 : -15.6, 0, 11, z - 0.5, z + 0.5, 0.06); rb(b, trim, s > 0 ? 15.4 : -16, s > 0 ? 16 : -15.4, 11, 11.4, z - 0.7, z + 0.7, 0.05); }
  // upper gallery along the back + side walls: slab, fascia with 2 trim bands, baluster rail
  const gal = (x0: number, x1: number, z0: number, z1: number, along: "x" | "z") => {
    rb(b, col("#efe3c8"), x0, x1, 5.5, 6.0, z0, z1, 0.04);
    const fx0 = along === "x" ? x0 : (x0 + x1) / 2, fz0 = along === "x" ? z1 : z0;
    if (along === "x") { rb(b, dado, x0, x1, 5.58, 5.68, z1, z1 + 0.06, 0.02); rb(b, dado, x0, x1, 5.82, 5.92, z1, z1 + 0.06, 0.02); }
    const n = Math.floor((along === "x" ? x1 - x0 : z1 - z0) / 0.32);
    const edge = along === "x" ? z1 - 0.2 : (x0 < 0 ? x1 - 0.2 : x0 + 0.2);
    for (let i = 0; i <= n; i++) {
      const t = (along === "x" ? x0 : z0) + i * 0.32;
      b.add(lathe("baluster", [[0.08, 0], [0.06, 0.08], [0.1, 0.3], [0.05, 0.6], [0.07, 0.72], [0.0, 0.75]], 10), col("#efe3c8"), along === "x" ? M4(t, 6.0, edge) : M4(edge, 6.0, t));
    }
    if (along === "x") rb(b, col("#8a6a3a"), x0, x1, 6.75, 6.9, edge - 0.1, edge + 0.1, 0.03); else rb(b, col("#8a6a3a"), edge - 0.1, edge + 0.1, 6.75, 6.9, z0, z1, 0.03);
    void fx0; void fz0;
  };
  gal(-16, 16, -14, -11.5, "x"); gal(-16, -13.5, -11.5, 18, "z"); gal(13.5, 16, -11.5, 18, "z");
  // coffered skylight: grid of glowing panes in frames
  for (let i = -3; i <= 3; i++) for (let j = -2; j <= 4; j++) {
    const x = i * 2.2, z = 2 + j * 2.2;
    rb(b, glow("#fff4d6", 1.25), x - 0.8, x + 0.8, 11.9, 11.95, z - 0.8, z + 0.8, 0.01);
  }
  for (let i = -3; i <= 4; i++) rb(b, col("#efe3c8"), i * 2.2 - 1.1 - 0.15, i * 2.2 - 1.1 + 0.15, 11.6, 12, -3.6, 12.0, 0.03);
  for (let j = -2; j <= 5; j++) rb(b, col("#efe3c8"), -7.9, 7.9, 11.6, 12, 2 + j * 2.2 - 1.1 - 0.15, 2 + j * 2.2 - 1.1 + 0.15, 0.03);
  // tall windows between the back pilasters (below the gallery: framed panels with photos instead)
  for (let x = -9; x <= 9; x += 6) {
    rb(b, col("#fbf6ea"), x - 1.5, x + 1.5, 7.2, 10.6, -14.02, -13.85, 0.04);
    rb(b, glow("#f4f0e2", 1.08), x - 1.3, x + 1.3, 7.4, 10.4, -13.98, -13.8, 0.02);
    rb(b, col("#fbf6ea"), x - 0.05, x + 0.05, 7.4, 10.4, -13.97, -13.78, 0.01);
    for (let k = 0; k < 2; k++) { rb(b, col("#8a6a3a"), x - 1.3 + k * 1.4, x - 0.1 + k * 1.4, 2.0, 3.3, -13.9, -13.82, 0.02); b.add(rbox(1.0, 1.1, 0.02, 0.005), texM("poster" + ((x + k) & 1 ? 1 : 2), () => P.posterHD((x + k) & 1 ? 1 : 2)), M4(x - 0.7 + k * 1.4, 2.65, -13.81)); }
  }
  signBoard(b, "musTitle", "NATIONAL POSTAL HISTORY HALL", 9, 0.9, 0, 6.6, -11.4, 0, { bg: "#24407a", fg: "#f2e3b0", style: "slab", border: "#d9b45a" }, 0.1);
  for (const [x, z, k] of [[-9, -6, 0], [9, -6, 1], [-9, 4, 2], [9, 4, 3]] as const) { // hanging banners
    b.add(rod(V(x - 0.9, 11.2, z), V(x + 0.9, 11.2, z), 0.04), brass);
    b.add(rbox(1.6, 4.8, 0.03, 0.01), texM("banner" + k, () => P.museumBannerHD(k)), M4(x, 8.7, z));
  }
  // the hero plinth: dark walnut with a brass edge, marble top step
  rb(b, walnut, -5.5, 5.5, 0, 0.6, -1.3, 1.3, 0.06, 2);
  rb(b, brass, -5.55, 5.55, 0.56, 0.64, -1.35, 1.35, 0.02);
  rb(b, marble, -4.6, 4.6, 0.64, 1.4, -1.0, 1.0, 0.08, 2);
  rb(b, brass, -4.65, 4.65, 1.36, 1.44, -1.05, 1.05, 0.03);
  poseMissile(rigForSupports, { visible: true, pos: SPOT.EXHIBIT, yaw: -0.38, pitch: 0.2, roll: 0, booster: false, gear: true });
  for (const [x, z] of [[2.7, 0], [-0.9, 0.95], [-0.9, -0.95]]) {
    const w = V(x, -1.37, z).applyMatrix4(rigForSupports.root.matrixWorld);
    if (w.y > 1.44) b.add(new THREE.CylinderGeometry(0.28, 0.34, w.y - 1.44, 16), col("#8d97a3"), M4(w.x, (w.y + 1.44) / 2, w.z));
  }
  // brass stanchions + red velvet rope around the plinth
  const posts: THREE.Vector3[] = [];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2; posts.push(V(6.6 * Math.cos(a), 0, 3.6 * Math.sin(a))); }
  for (const p of posts) b.add(lathe("stanchion", [[0.18, 0], [0.18, 0.04], [0.05, 0.08], [0.04, 0.92], [0.07, 0.95], [0.06, 1.02], [0, 1.03]], 12), brass, M4(p.x, 0, p.z));
  for (let k = 0; k < 8; k++) {
    if (k === 1) continue; // gap toward the plaque
    const a = posts[k], c = posts[(k + 1) % 8], curve = new THREE.QuadraticBezierCurve3(V(a.x, 0.9, a.z), V((a.x + c.x) / 2, 0.55, (a.z + c.z) / 2), V(c.x, 0.9, c.z));
    b.add(new THREE.TubeGeometry(curve, 12, 0.035, 6), col("#b8353a"));
  }
  // plaque on an angled reading stand facing the visitors (+z)
  const [qx, , qz] = SPOT.PLAQUE;
  b.add(rbox(0.5, 0.95, 0.4, 0.04), walnut, M4(qx, 0.475, qz));
  b.add(rbox(1.3, 0.72, 0.08, 0.02), walnut, M4(qx, 1.1, qz, 0, 0, -0.55));
  b.add(rbox(1.16, 0.58, 0.02, 0.005), texM("plaque", () => P.plaqueHD()), M4(qx, 1.1 + 0.04 * Math.sin(0.55), qz + 0.04 * Math.cos(0.55), 0, 0, -0.55));
  // other exhibits: a hanging biplane mail plane, a mail coach, a row of period mailboxes, display cases with stamps
  const plane = M4(-6, 8.3, 9, 0.6, 0.08);
  const PL = (g: THREE.BufferGeometry, mat: Mat, mm: THREE.Matrix4) => b.add(g, mat, plane.clone().multiply(mm));
  PL(lathe("biFus", [[0.1, -3.5], [0.4, -2.5], [0.55, 0], [0.6, 2.2], [0.5, 3.2], [0.0, 3.4]], 16).clone().rotateZ(-Math.PI / 2), col("#d8352f"), new THREE.Matrix4());
  for (const y of [-0.55, 0.85]) PL(rbox(1.4, 0.12, 9, 0.05), col("#f2e3c0"), M4(1.2, y, 0));
  for (const s of [-1, 1]) for (const zz of [1.5, 3.6]) PL(rod(V(1.2, -0.5, s * zz), V(1.2, 0.8, s * zz), 0.04), col("#6e4630"), new THREE.Matrix4());
  PL(rbox(0.9, 0.08, 3, 0.04), col("#f2e3c0"), M4(-3.2, 0.1, 0)); PL(rbox(0.9, 1.1, 0.08, 0.04), col("#d8352f"), M4(-3.3, 0.6, 0));
  PL(cached("prop", () => new THREE.BoxGeometry(0.1, 2.2, 0.18)), col("#6e4630"), M4(3.45, 0, 0));
  for (const s of [-1, 1]) wheel(b, plane.clone().multiply(M4(1.6, -1.25, s * 0.8)), 0.35, 0.14);
  for (const s of [-1, 1]) PL(rod(V(1.6, -0.55, s * 0.4), V(1.6, -1.2, s * 0.8), 0.03), col("#6e4630"), new THREE.Matrix4());
  PL(decalGeo(V(-1.2, 0.0, 0.58), V(0, 0, 1), 2.2, 0.5), decalMat("usMailPlane", "U.S. MAIL", 2.2, 0.5, "#f2efe6"), new THREE.Matrix4());
  for (const [dx, dz] of [[0, 0], [1.2, 3.5], [1.2, -3.5]]) { const p = V(dx, 0.9, dz).applyMatrix4(plane); b.add(rod(p, V(p.x, 12, p.z), 0.012), col("#2e3440")); }
  // mail coach
  const coach = M4(-10, 0, -5, 0.5), CL = (g: THREE.BufferGeometry, mat: Mat, mm: THREE.Matrix4) => b.add(g, mat, coach.clone().multiply(mm));
  CL(rbox(3.0, 1.6, 1.6, 0.25), col("#8c2b35"), M4(0, 1.9, 0)); CL(rbox(3.2, 0.12, 1.7, 0.05), col("#2e3440"), M4(0, 2.75, 0));
  for (const s of [-1, 1]) { CL(rbox(0.9, 0.7, 0.04, 0.03), col("#f2e3c0"), M4(0, 2.1, s * 0.81)); CL(decalGeo(V(0, 1.5, s * 0.82), V(0, 0, s), 2.2, 0.4), decalMat("usMailCoach", "U.S. MAIL", 2.2, 0.4, "#d9b45a"), new THREE.Matrix4()); }
  for (const [wx, s] of [[1.1, 1], [1.1, -1], [-1.1, 1], [-1.1, -1]] as const) {
    const wm = coach.clone().multiply(M4(wx, 0.7, s * 0.95));
    b.add(cached("coachRim", () => new THREE.TorusGeometry(0.66, 0.05, 6, 24)), col("#d9b45a"), wm);
    for (let k = 0; k < 12; k++) b.add(cached("spoke", () => new THREE.CylinderGeometry(0.025, 0.025, 1.3, 5)), col("#d9b45a"), wm.clone().multiply(M4(0, 0, 0, 0, (k * Math.PI) / 12)));
    b.add(cached("coachHub", () => new THREE.CylinderGeometry(0.12, 0.12, 0.16, 10).rotateX(Math.PI / 2)), col("#2e3440"), wm);
  }
  CL(rod(V(1.5, 0.9, 0), V(3.6, 0.6, 0), 0.05), col("#6e4630"), new THREE.Matrix4());
  // four period mailboxes along the left wall
  [["#6f7a4a", "#6f7a4a"], ["#24407a", "#d8352f"], ["#3a6ea8", "#3a6ea8"], ["#d8352f", "#d8352f"]].forEach(([bc, tc], k) => {
    const x = -14.2, z = 1 + k * 2.4;
    b.add(rbox(0.5, 0.9, 0.5, 0.06), col(bc), M4(x, 0.8, z, Math.PI / 2));
    b.add(cached("mbDome", () => new THREE.CylinderGeometry(0.24, 0.24, 0.52, 18, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2)), col(tc), M4(x, 1.25, z, Math.PI / 2));
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) b.add(rbox(0.05, 0.35, 0.05, 0.015), col(bc), M4(x + lx, 0.18, z + lz));
    b.add(rbox(1.2, 0.12, 1.0, 0.03), walnut, M4(x, 0.06, z));
  });
  // glass display cases with stamps + letters
  for (const [x, z] of [[9.5, 8.0], [9.5, 12.5], [-9.5, 14.0]] as const) {
    rb(b, walnut, x - 1.3, x + 1.3, 0, 0.9, z - 0.6, z + 0.6, 0.05);
    rb(b, texM("stamps", () => P.signTex("stampsBg", "", 512, 256, { bg: "#24407a", fg: "#fff", border: null })), x - 1.2, x + 1.2, 0.9, 0.93, z - 0.5, z + 0.5, 0.01);
    const rs = rng(Math.round(x * 10 + z));
    for (let k = 0; k < 14; k++) b.add(rbox(0.16, 0.012, 0.2, 0.003), col(["#d8352f", "#3a6ea8", "#6f7a4a", "#e8b830", "#f4efe2", "#8c2b35"][k % 6]), M4(x - 1.0 + (k % 7) * 0.33 + rs() * 0.05, 0.94, z - 0.25 + Math.floor(k / 7) * 0.45, rs() * 0.3));
    b.add(rbox(2.5, 0.55, 1.1, 0.02), lam("caseGlass", () => ({ color: "#dcecf2", transparent: true, opacity: 0.18, depthWrite: false })), M4(x, 1.2, z));
    for (const [dx, dz] of [[-1.25, -0.55], [1.25, -0.55], [-1.25, 0.55], [1.25, 0.55]]) rb(b, col("#8a6a3a"), x + dx - 0.03, x + dx + 0.03, 0.9, 1.48, z + dz - 0.03, z + dz + 0.03, 0.01);
    rb(b, col("#8a6a3a"), x - 1.28, x + 1.28, 1.46, 1.5, z - 0.58, z + 0.58, 0.01);
  }
  // a sack + letters display on a low plinth near the visitors
  rb(b, walnut, 6.4, 8.4, 0, 0.4, 3.6, 5.0, 0.05);
  sack(b, 7.0, 0.4, 4.3, 0.75, 0.5); sackLying(b, 7.8, 0.4, 4.2, 0.65, 2.0);
  signBoard(b, "sackLabel", "MISSILE MAIL SACK - 1959", 1.4, 0.3, 7.4, 0.3, 5.05, 0, { bg: "#f4efe2", fg: "#24407a", style: "slab", border: null }, 0.02);
  rb(b, col("#7a4a2c"), -3, 3, 0.45, 0.55, 12.5, 13.3, 0.04);
  for (const x of [-2.6, 2.6]) rb(b, col("#4a2a18"), x - 0.1, x + 0.1, 0, 0.45, 12.6, 13.2, 0.02);
  for (const [x, z] of [[-6, -2], [6, -2], [-6, 8], [6, 8], [0, 14]]) pendant(b, x, z, 12, 2.5);
  for (const [x, z] of [[-14.6, -12.6], [14.6, -12.6], [-14.6, 22], [14.6, 22]]) { b.add(lathe("urn", [[0.25, 0], [0.3, 0.1], [0.2, 0.3], [0.4, 0.7], [0.35, 0.9], [0, 0.9]], 14), col("#c9b48a"), M4(x, 0, z)); addVeg(b, "bush", x, 0.85, z, 1.0, x * 3 + z); }
  return done("museum", [shell, false], [b, true]);
};

/** every set of the film; world.ts adds the groups and toggles .visible per shot */
export const buildSets = (): Record<SetName, SetRig> => {
  const helper = buildMissile();
  return {
    sea: buildSea(), subdeck: buildSub(), runway: buildRunway(), street: buildStreet(), road: buildRoad(),
    postoffice: buildPostOffice(), museum: buildMuseum(helper),
  };
};
