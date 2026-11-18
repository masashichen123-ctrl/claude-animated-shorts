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

// ---------------- props ----------------
/** a mail sack: squashed burlap ball, pinched tied neck, a little tuft */
const sackGeo = (() => {
  let g: THREE.BufferGeometry | null = null;
  return () => {
    if (g) return g;
    g = new THREE.SphereGeometry(0.5, 18, 14);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const u = (y + 0.5); // 0 bottom .. 1 top
      const pinch = u > 0.8 ? 1 - 0.45 * Math.min(1, (u - 0.8) / 0.15) : 1 + 0.12 * Math.sin(u * Math.PI);
      x *= 0.9 * pinch; z *= 0.66 * pinch; y = y * 0.95;
      if (y < -0.42) y = -0.42 - (y + 0.42) * 0.2; // flat bottom
      p.setXYZ(i, x, y + 0.46, z);
    }
    g.computeVertexNormals();
    return g;
  };
})();
const burlap = () => texM("burlap", () => rep(P.burlapHD(), 1, 1));
/** a sack at (x, y, z), size s, yaw/roll for stacking */
const sack = (b: Batch, x: number, y: number, z: number, s = 1, ry = 0, rz = 0) => b.add(sackGeo(), burlap(), M4(x, y, z, ry, rz, 0, [s, s, s]));

/** cartoon palm: curved ringed trunk + arched serrated fronds + coconuts */
const palm = (b: Batch, x: number, z: number, h: number, lean: number, dir: number, seed: number) => {
  const r = rng(seed), bark = texM("palmBark", () => rep(P.palmBarkHD(), 1, 2)), leaf = col("#3f9a3c", THREE.DoubleSide), leaf2 = col("#57ad45", THREE.DoubleSide);
  const at = (t: number) => V(x + Math.cos(dir) * lean * h * t * t, h * t, z + Math.sin(dir) * lean * h * t * t);
  const N = 7;
  for (let i = 0; i < N; i++) b.add(rod(at(i / N), at((i + 1) / N), 0.3 - 0.12 * (i / N), 0.3 - 0.12 * ((i + 1) / N), 10), bark);
  const top = at(1);
  b.add(new THREE.SphereGeometry(0.32, 12, 10), col("#7a5a34"), M4(top.x, top.y, top.z));
  for (let k = 0; k < 3; k++) b.add(new THREE.SphereGeometry(0.17, 10, 8), col("#6b4a26"), M4(top.x + 0.22 * Math.cos(k * 2.1), top.y - 0.25, top.z + 0.22 * Math.sin(k * 2.1)));
  const F = 9;
  for (let f = 0; f < F; f++) {
    const phi = (f / F) * Math.PI * 2 + r() * 0.5, Lf = h * (0.4 + 0.08 * r()), droop = 0.7 + 0.3 * r();
    const d = V(Math.cos(phi), 0, Math.sin(phi)), side = V(-d.z, 0, d.x);
    const pos: number[] = [], idx: number[] = [], NS = 14;
    for (let i = 0; i <= NS; i++) {
      const s = i / NS, w = Lf * 0.14 * Math.sin(Math.PI * Math.min(1, s * 1.1 + 0.05)) * (i % 2 ? 1.25 : 0.85);
      const c = top.clone().addScaledVector(d, Lf * s).addScaledVector(UP, Lf * (0.32 * s - droop * 0.8 * s * s));
      const cr = c.clone().addScaledVector(UP, w * 0.3);
      for (const q of [c.clone().addScaledVector(side, w), cr, c.clone().addScaledVector(side, -w)]) pos.push(q.x, q.y, q.z);
      if (i < NS) { const a0 = i * 3; idx.push(a0, a0 + 3, a0 + 1, a0 + 1, a0 + 3, a0 + 4, a0 + 1, a0 + 4, a0 + 2, a0 + 2, a0 + 4, a0 + 5); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    b.add(g, f % 2 ? leaf : leaf2);
  }
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

// ---- sea: open water (world.ts) + a low far coastline with a lighthouse ahead of the flights (+x) ----
const buildSea = (): SetRig => {
  const b = new Batch(), sand = texM("sand", () => P.sandHD()), grass = texM("grass", () => P.grassHD());
  for (let k = 0; k < 9; k++) {
    const z0 = -900 + k * 200;
    b.add(slab(supEll(820 + (k % 3) * 30, z0 + 100, 90, 120, 2.2, 32), -0.5, 3.5, 1.0), sand);
    b.add(slab(supEll(860 + (k % 3) * 30, z0 + 100, 70, 105, 2.2, 32), 2.5, 7 + (k % 2) * 5, 2.0), grass);
  }
  b.add(rod(V(790, 0, 60), V(790, 34, 60), 4.2, 3.0, 16), col("#f2efe6"));
  b.add(rod(V(790, 12, 60), V(790, 18, 60), 4.1, 3.7, 16), col("#cf3330"));
  b.add(new THREE.ConeGeometry(3.6, 4, 16), col("#3a3f4a"), M4(790, 36, 60));
  return done("sea", [b, true]);
};

// ---- subdeck: USS Barbero (Balao class, Regulus conversion): hull along x, bow +x ----
const buildSub = (): SetRig => {
  const b = new Batch();
  const hull = texM("hull", () => P.hullHD()), deck = texM("subDeck", () => rep(P.subDeckHD(), 0.5, 0.5)), slate = col("#4a5868"), dk = col("#2e3640"), steel = col("#8d97a3");
  const prof: [number, number][] = [[0.15, -23], [0.9, -21.5], [1.7, -18], [2.2, -12], [2.3, -4], [2.3, 8], [2.1, 14], [1.5, 19], [0.6, 22.3], [0.1, 23]];
  const lathe = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 36);
  lathe.rotateZ(-Math.PI / 2); lathe.scale(1, 0.82, 1); lathe.translate(0, -0.2, 0);
  uvFrom(lathe, (x, y, z) => [x / 4, (y + Math.abs(z)) / 4]);
  b.add(lathe, hull);
  // superstructure + deck (pointed bow, rounded stern)
  const outline: [number, number][] = [[21.8, 0], [18, 1.15], [8, 1.75], [-14, 1.8], [-19, 1.45], [-20.6, 0.8], [-21, 0], [-20.6, -0.8], [-19, -1.45], [-14, -1.8], [8, -1.75], [18, -1.15]];
  const sup = slab(outline, 1.2, 0.8, 0.08);
  uvFrom(sup, (x, y, z) => [x / 2, (Math.abs(y - 2) < 0.02 ? z : y + z) / 2]);
  b.add(sup, deck);
  b.add(slab(outline.map(([x, z]) => [x * 1.005, z * 1.08] as [number, number]), 0.9, 0.42, 0.06), slate); // casing lip
  // sail / conning tower (streamlined, bevelled) with the bridge cap, periscopes, radar mast
  const sail = slab(supEll(4.6, 0, 3.9, 1.35, 2.6, 48, 0.25), 2.0, 3.9, 0.15);
  uvFrom(sail, (x, y, z) => [(x + z) / 4, y / 4]);
  b.add(sail, hull);
  b.add(slab(supEll(4.6, 0, 3.95, 1.42, 2.6, 48, 0.25), 5.75, 0.3, 0.08), dk);
  b.add(slab(supEll(6.6, 0, 1.5, 0.95, 2.4, 32), 5.9, 0.9, 0.08), slate);
  for (const [x, h, r] of [[4.0, 9.4, 0.14], [5.0, 8.6, 0.12], [3.0, 8.0, 0.1]] as const) b.add(rod(V(x, 5.8, 0), V(x, h, 0), r, r * 0.8), steel);
  b.add(rbox(0.9, 0.3, 0.3, 0.05), steel, M4(4.0, 9.3, 0));
  // Regulus hangar: a big cylinder aft of the sail, domed door at its aft end
  const hang = new THREE.CylinderGeometry(1.75, 1.75, 7.6, 36, 1, true).rotateZ(Math.PI / 2);
  uvFrom(hang, (x, y, z) => [x / 4, (y + z) / 4]);
  b.add(hang, hull, M4(-2.6, 2.3, 0));
  b.add(new THREE.SphereGeometry(1.75, 32, 16, 0, Math.PI), slate, M4(-6.4, 2.3, 0, -Math.PI / 2, 0, 0, [1, 1, 0.35]));
  b.add(new THREE.TorusGeometry(1.45, 0.08, 8, 36).rotateY(Math.PI / 2), steel, M4(-6.95, 2.3, 0));
  b.add(rbox(0.12, 1.6, 0.25, 0.04), steel, M4(-7.0, 2.4, 0));
  // launcher: rail in the missile's frame + two stands down to the deck
  const L = M4(SPOT.LAUNCH[0], SPOT.LAUNCH[1], SPOT.LAUNCH[2], Math.PI, SPOT.LAUNCH_PITCH);
  b.add(rbox(7.6, 0.24, 0.26, 0.05), steel, L.clone().multiply(M4(-0.2, -0.79, 0)));
  b.add(rbox(7.0, 0.14, 0.9, 0.04), dk, L.clone().multiply(M4(-0.2, -0.95, 0)));
  for (const lx of [-2.6, 2.4]) {
    const top = V(lx, -1.0, 0).applyMatrix4(L);
    for (const s of [-1, 1]) b.add(rod(V(top.x + 0.3 * s, 2.0, 0.55), top, 0.07), steel), b.add(rod(V(top.x + 0.3 * s, 2.0, -0.55), top, 0.07), steel);
  }
  // deck railings (stanchions + top rail) along the after deck, and the bow
  const rail = col("#c9ced6");
  for (const s of [-1, 1]) {
    for (let x = -18; x <= 16; x += 2.4) if (x < 1 || x > 9) b.add(rod(V(x, 2.0, s * 1.55), V(x, 2.85, s * 1.55), 0.03), rail);
    b.add(rod(V(-18, 2.85, s * 1.55), V(0.8, 2.85, s * 1.55), 0.025), rail);
    b.add(rod(V(9.2, 2.85, s * 1.55), V(16, 2.85, s * 1.45), 0.025), rail);
  }
  // deck gun (5"/25) forward of the sail + a capstan, for scale
  b.add(new THREE.CylinderGeometry(0.6, 0.7, 0.5, 20), dk, M4(12.5, 2.25, 0));
  b.add(rod(V(12.5, 2.65, 0), V(15.6, 3.0, 0), 0.11), dk);
  b.add(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16), steel, M4(17.5, 2.15, 0));
  // stern ensign staff with a little flag block
  b.add(rod(V(-20, 2.0, 0), V(-20, 4.6, 0), 0.04), steel);
  b.add(rbox(0.9, 0.55, 0.04, 0.01), texM("flagUS", () => P.buntingHD()), M4(-20.48, 4.3, 0));
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

// ---- runway: NAS Mayport, runway along x, hangars + tower behind (-z), beach + sea in front (+z far) ----
const buildRunway = (): SetRig => {
  const b = new Batch();
  const grass = texM("grass4", () => rep(P.grassHD(), 1, 1)), asph = texM("asphalt", () => P.asphaltHD()), conc = texM("concrete", () => P.concreteHD());
  const sand = texM("sand", () => P.sandHD()), white = col("#f2f0e8"), corr = texM("corr", () => P.corrugatedHD()), rust = col("#b4553a");
  b.add(ground(-1500, 1500, -1500, 62, 0, 4), grass);
  b.add(quad(V(-1500, 0, 62), V(1500, 0, 62), V(1500, -1.6, 95), V(-1500, -1.6, 95), 750, 9), sand); // beach to the sea
  b.add(ground(-400, 400, -16, 16, 0.03, 4), asph);
  b.add(ground(-80, 110, -58, -22, 0.025, 4), conc); // apron
  b.add(ground(-6, 6, -22, -16, 0.028, 4), conc);    // taxiway link
  for (let x = -396; x < 400; x += 12) b.add(ground(x, x + 6, -0.25, 0.25, 0.045, 1), white);
  for (const s of [-1, 1]) b.add(ground(-400, 400, s * 14.6 - 0.2, s * 14.6 + 0.2, 0.045, 1), white);
  for (const x0 of [-380, 360]) for (let k = 0; k < 8; k++) b.add(ground(x0, x0 + 18, -12 + k * 3.2, -12 + k * 3.2 + 1.8, 0.045, 1), white);
  // quonset hangars, open ends toward the runway
  for (const [hx, w] of [[-48, 11], [-18, 9], [62, 12]] as const) {
    const len = 26, zc = -70;
    const arch = new THREE.CylinderGeometry(w, w, len, 32, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2);
    uvFrom(arch, (x, y, z) => [z / 2, Math.atan2(x, y) * w / 2]);
    b.add(arch, corr, M4(hx, 0, zc));
    const end = new THREE.CircleGeometry(w, 32, 0, Math.PI);
    b.add(end, col("#c9c4b6"), M4(hx, 0, zc + len / 2));
    b.add(rbox(w * 1.1, w * 0.62, 0.3, 0.08), col("#5b6470"), M4(hx, w * 0.31, zc + len / 2 + 0.1)); // big door
    for (const s of [-1, 1]) b.add(rbox(1.6, 1.1, 0.2, 0.05), glow("#cfe2ec", 0.9), M4(hx + s * w * 0.62, w * 0.62, zc + len / 2 + 0.1));
    b.add(rbox(0.5, 0.5, len + 0.6, 0.15), col("#8d9298"), M4(hx, w - 0.1, zc));
  }
  // control tower: concrete shaft, glazed cab, roof slab, catwalk, beacon
  const T = [42, -42];
  b.add(rbox(5, 11, 5, 0.12, 2), conc, M4(T[0], 5.5, T[1]));
  b.add(rbox(6.6, 0.4, 6.6, 0.1), col("#e9e4d8"), M4(T[0], 11.2, T[1]));
  b.add(rbox(6.0, 2.6, 6.0, 0.08), glow("#bfe0ee", 0.95), M4(T[0], 12.7, T[1]));
  for (const s of [-1, 1]) for (const k of [-1, 0, 1]) {
    b.add(rbox(0.16, 2.6, 0.16, 0.03), col("#e9e4d8"), M4(T[0] + s * 3.0, 12.7, T[1] + k * 2.9));
    b.add(rbox(0.16, 2.6, 0.16, 0.03), col("#e9e4d8"), M4(T[0] + k * 2.9, 12.7, T[1] + s * 3.0));
  }
  b.add(rbox(7.6, 0.45, 7.6, 0.12), col("#e9e4d8"), M4(T[0], 14.2, T[1]));
  b.add(rod(V(T[0], 14.4, T[1]), V(T[0], 18.5, T[1]), 0.1), col("#d8d4cc"));
  b.add(new THREE.SphereGeometry(0.35, 12, 10), glow("#ff5040", 2.2), M4(T[0], 18.7, T[1]));
  for (let k = 0; k < 5; k++) b.add(rbox(1.2, 0.5, 0.3, 0.06), col(k % 2 ? "#cf3330" : "#f2f0e8"), M4(T[0], 2 + k * 1.8, T[1] + 2.55)); // painted stripes
  // windsock
  b.add(rod(V(-30, 0, 24), V(-30, 6, 24), 0.08), col("#d8d4cc"));
  for (let k = 0; k < 4; k++) b.add(new THREE.CylinderGeometry(0.45 - k * 0.08, 0.53 - k * 0.08, 0.7, 14, 1, true).rotateZ(Math.PI / 2 - 0.25), col(k % 2 ? "#f2f0e8" : "#e8742e", THREE.DoubleSide), M4(-29.5 - k * 0.7, 5.8 - k * 0.17, 24));
  // palms along the beach side and by the tower
  const palms: [number, number, number][] = [[-58, 26, 10], [-36, 31, 12], [-12, 27, 9.5], [12, 33, 11.5], [26, 24, 9], [44, 30, 12], [70, 27, 10], [96, 31, 11], [30, -34, 9], [54, -36, 10.5], [-70, -40, 9]];
  palms.forEach(([x, z, h], i) => palm(b, x, z, h, 0.18 + 0.08 * (i % 3), 0.8 + i * 1.7, 31 + i * 7));
  // podium (lectern) with bunting, microphone; low stage under it
  const [px, , pz] = SPOT.PODIUM;
  b.add(rbox(1.0, 0.95, 0.62, 0.07, [1, 1]), texM("podiumWood", () => P.panelHD("#6e4128")), M4(px, 0.475, pz));
  b.add(rbox(1.15, 0.08, 0.8, 0.03), col("#4a2c1a"), M4(px, 0.97, pz - 0.02, 0, -0.18));
  b.add(rbox(0.92, 0.6, 0.04, 0.01), texM("bunting", () => P.buntingHD()), M4(px, 0.55, pz + 0.33));
  b.add(rod(V(px - 0.25, 0.97, pz + 0.1), V(px - 0.22, 1.42, pz - 0.15), 0.015), col("#2a2a30"));
  b.add(new THREE.SphereGeometry(0.06, 12, 10), col("#2a2a30"), M4(px - 0.22, 1.46, pz - 0.17));
  for (const dx of [-2.2]) { b.add(rod(V(px + dx, 0, pz - 0.6), V(px + dx, 3.6, pz - 0.6), 0.04), col("#d8d4cc")); b.add(rbox(1.0, 0.62, 0.03, 0.01), texM("flagUS", () => P.buntingHD()), M4(px + dx + 0.52, 3.25, pz - 0.6)); }
  // mail sacks: a pile by the parked missile (shot 10) + mail cart
  const [sx, , sz] = SPOT.SACKS;
  const pile: [number, number, number, number, number][] = [[0, 0, 0, 1, 0.3], [0.7, 0, 0.25, 0.95, -0.4], [-0.65, 0, 0.15, 0.9, 1.2], [0.25, 0, -0.6, 1, 2], [0.35, 0.72, -0.05, 0.85, 0.7], [-0.3, 0.68, -0.2, 0.8, 2.6]];
  for (const [dx, dy, dz, s, ry] of pile) sack(b, sx + dx, dy, sz + dz, s, ry, (dx - dz) * 0.15);
  b.add(rbox(1.8, 0.12, 1.1, 0.03), col("#5b6b84"), M4(sx - 2.4, 0.55, sz + 0.4));
  for (const [dx, dz] of [[-0.7, -0.45], [0.7, -0.45], [-0.7, 0.45], [0.7, 0.45]]) b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 14).rotateX(Math.PI / 2), col("#2b2b34"), M4(sx - 2.4 + dx, 0.15, sz + 0.4 + dz));
  for (const [dx, dz] of [[-0.45, 0], [0.4, 0.1]]) sack(b, sx - 2.4 + dx, 0.6, sz + 0.4 + dz, 0.85, dx);
  // fuel drums by the hangar
  for (let k = 0; k < 5; k++) b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16), col(k % 2 ? "#3f6f8f" : "#b8423a"), M4(-30 + k * 0.7, 0.45, -50 + (k % 2) * 0.6));
  return done("runway", [b, true]);
};

// ---- street: a ranch house, lawn, picket fence, mailbox, sidewalk, street ----
const buildStreet = (): SetRig => {
  const b = new Batch();
  const grass = texM("grass4", () => rep(P.grassHD(), 1, 1)), asph = texM("asphaltRoad", () => P.asphaltHD("asphaltRoad", "#56585e")), conc = texM("concrete", () => P.concreteHD());
  b.add(ground(-400, 400, -400, 400, 0, 4), grass);
  b.add(ground(-400, 400, 12.6, 20, 0.03, 4), asph);
  b.add(ground(-400, 400, 10.6, 12.4, 0.06, 2), conc);
  b.add(rbox(800, 0.16, 0.25, 0.04), col("#cfcac0"), M4(0, 0.08, 12.5));
  b.add(ground(0.35, 1.65, SPOT.HOUSE_Z, 10.6, 0.04, 2), conc); // walk
  b.add(ground(6.2, 9.0, SPOT.HOUSE_Z - 1, 10.6, 0.035, 2), conc); // drive
  const holeY = 2.28, holeX = -1.7;
  ranch(b, 0, SPOT.HOUSE_Z - 4, 0, 14, 8, 0, { hole: [holeX, holeY] });
  ranch(b, -21, 0, 0, 12, 8, 1); ranch(b, 21, -1, 0, 12, 8, 2);
  ranch(b, -6, 38, Math.PI, 13, 8, 3); ranch(b, 16, 38, Math.PI, 12, 8, 1);
  // picket fence along the front lawn (gap at the walk)
  const wood = col("#fbf6ea");
  for (let x = -9.2; x <= 9.2; x += 0.26) {
    if (x > -0.05 && x < 2.05) continue;
    b.add(rbox(0.1, 0.9, 0.05, 0.02), wood, M4(x, 0.45, 10.2));
    b.add(new THREE.ConeGeometry(0.07, 0.12, 4).rotateY(Math.PI / 4), wood, M4(x, 0.96, 10.2));
  }
  for (const y of [0.3, 0.72]) for (const [x0, x1] of [[-9.3, -0.05], [2.05, 9.3]]) b.add(rbox(x1 - x0, 0.07, 0.05, 0.02), wood, M4((x0 + x1) / 2, y, 10.15));
  // mailbox: post, rounded-top box, red flag (raised)
  const [mx, , mz] = SPOT.MAILBOX;
  b.add(rbox(0.12, 1.05, 0.12, 0.02), col("#7a5a3c"), M4(mx, 0.52, mz));
  b.add(rbox(0.36, 0.28, 0.62, 0.04), col("#5a6a7a"), M4(mx, 1.18, mz));
  b.add(new THREE.CylinderGeometry(0.18, 0.18, 0.62, 18, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), col("#5a6a7a"), M4(mx, 1.32, mz));
  b.add(rbox(0.04, 0.42, 0.06, 0.01), col("#cf3330"), M4(mx + 0.21, 1.42, mz - 0.1));
  b.add(rbox(0.04, 0.14, 0.2, 0.01), col("#cf3330"), M4(mx + 0.21, 1.58, mz - 0.02));
  // trees and bushes
  for (const [k, x, z, h] of [["round", -10.5, -1, 7.5], ["fat", 10.6, 2.5, 6.5], ["round", -28, 6, 8], ["tall", 28, 7, 9], ["round", 4, 30, 8], ["cone", -16, 30, 7]] as const) addVeg(b, k, x, 0, z, h, x * 13 + z);
  for (const [x, z] of [[-6, 4.7], [-3.7, 4.8], [4.8, 4.7], [6.0, 4.9]]) addVeg(b, "bush", x, 0, z, 1.0, x * 7 + z);
  return done("street", [b, true]);
};

// ---- road: suburban road, the mail truck, the launch cart for shot 13 ----
const truck = (b: Batch, x: number, z: number) => {
  const navy = col("#2f4f8f"), chrome = col("#d4d7dc"), tire = col("#26262c"), dark = col("#202028");
  const M = (dx: number, dy: number, dz: number) => M4(x + dx, dy, z + dz);
  b.add(rbox(6.4, 0.3, 1.6, 0.05), dark, M(0.4, 0.62, 0));                                     // chassis
  b.add(rbox(4.3, 2.55, 2.4, 0.12), texM("truckLivery", () => P.truckHD()), M(-1.0, 2.05, 0)); // box body
  b.add(rbox(4.4, 0.16, 2.5, 0.06), col("#d9d4c6"), M(-1.0, 3.38, 0));                         // roof rim
  b.add(rbox(1.9, 1.95, 2.35, 0.22), navy, M(2.2, 1.73, 0));                                   // cab
  b.add(rbox(1.0, 1.0, 2.0, 0.2), navy, M(3.55, 1.2, 0));                                      // hood
  b.add(rbox(0.12, 0.7, 1.9, 0.03), glow("#b6d4e2", 0.8), M(3.12, 2.15, 0));                   // windscreen
  for (const s of [-1, 1]) b.add(rbox(1.0, 0.65, 0.06, 0.02), glow("#b6d4e2", 0.8), M(2.2, 2.15, s * 1.18)); // side windows
  b.add(rbox(0.1, 0.7, 1.3, 0.03), chrome, M(4.08, 1.15, 0));                                  // grille
  for (let k = -2; k <= 2; k++) b.add(rbox(0.04, 0.6, 0.04, 0.01), dark, M(4.14, 1.15, k * 0.22));
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.17, 14, 10), glow("#fff3c8", 1.3), M(4.0, 1.5, s * 0.78));
  b.add(rbox(0.25, 0.22, 2.5, 0.08), chrome, M(4.2, 0.62, 0));                                // bumper
  b.add(rbox(0.25, 0.22, 2.5, 0.08), chrome, M(-3.25, 0.62, 0));
  for (const [wx, s] of [[2.95, 1], [2.95, -1], [-2.0, 1], [-2.0, -1]] as const) {
    b.add(new THREE.CylinderGeometry(0.48, 0.48, 0.34, 24).rotateX(Math.PI / 2), tire, M(wx, 0.48, s * 1.06));
    b.add(new THREE.CylinderGeometry(0.26, 0.26, 0.36, 18).rotateX(Math.PI / 2), chrome, M(wx, 0.48, s * 1.06));
    b.add(new THREE.CylinderGeometry(0.62, 0.62, 0.4, 20, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), navy, M(wx, 0.62, s * 1.04)); // fender
  }
  // overloaded: sacks piled on the roof, tied down
  const roofSacks: [number, number, number, number][] = [[-2.6, 0.5, 1.0, 0.2], [-1.7, -0.5, 0.95, 1.1], [-0.8, 0.45, 1.05, 2.3], [0.1, -0.4, 0.95, 0.6], [0.8, 0.5, 0.9, 1.7],
    [-2.2, -0.2, 0.9, 2.9], [-1.2, 0.1, 0.95, 0.4], [-0.2, 0.15, 0.9, 1.4], [0.6, -0.1, 0.85, 2.2], [-1.7, 0.3, 0.85, 0.9], [-0.7, -0.2, 0.85, 1.9], [-1.2, 0.1, 0.8, 2.7]];
  roofSacks.forEach(([dx, dz, s, ry], i) => sack(b, x + dx, 3.42 + (i >= 5 ? 0.78 : 0) + (i >= 9 ? 0.7 : 0), z + dz, s, ry, 0.15 * Math.sin(i * 2.3)));
  for (const dx of [-2.2, -0.6, 0.9]) b.add(rod(V(x + dx, 3.4, z - 1.25), V(x + dx + 0.1, 5.2, z), 0.03), col("#7a5a3c")), b.add(rod(V(x + dx + 0.1, 5.2, z), V(x + dx, 3.4, z + 1.25), 0.03), col("#7a5a3c"));
  // a couple of sacks spilling at the back door
  sack(b, x - 3.7, 0, z + 0.5, 0.9, 0.4, 0.2); sack(b, x - 3.9, 0, z - 0.6, 0.85, 1.9, -0.2);
};
const buildRoad = (): SetRig => {
  const b = new Batch();
  const grass = texM("grass4", () => rep(P.grassHD(), 1, 1)), asph = texM("asphaltRoad", () => P.asphaltHD("asphaltRoad", "#56585e")), conc = texM("concrete", () => P.concreteHD());
  b.add(ground(-500, 500, -500, 500, 0, 4), grass);
  b.add(ground(-500, 500, -6.5, 3.5, 0.03, 4), asph);
  for (let x = -496; x < 500; x += 6) b.add(ground(x, x + 3, -1.65, -1.35, 0.04, 1), col("#e9c84a"));
  for (const [z0, z1] of [[3.7, 5.9], [-8.9, -6.7]]) b.add(ground(-500, 500, z0, z1, 0.06, 2), conc);
  for (const z of [3.6, -6.6]) b.add(rbox(1000, 0.16, 0.22, 0.04), col("#cfcac0"), M4(0, 0.08, z));
  [-34, -18, -2, 14, 30].forEach((x, i) => ranch(b, x, -18, 0, 12, 8, i));
  [-30, -12, 8, 26].forEach((x, i) => ranch(b, x, 22, Math.PI, 12, 8, i + 2));
  for (const [k, x, z, h] of [["round", -26, -12, 8], ["fat", -9, -11, 6.5], ["round", 7, -11.5, 7.5], ["tall", 22, -12, 9], ["round", -40, -11, 7], ["cone", 38, -12, 7], ["round", -20, 15, 8], ["fat", 17, 15, 7]] as const) addVeg(b, k, x, 0, z, h, x * 13 + z);
  for (const x of [-25, 5, 35]) { // telephone poles
    b.add(rod(V(x, 0, -7.6), V(x, 8.5, -7.6), 0.14, 0.11), col("#7a5a3c"));
    b.add(rbox(2.2, 0.14, 0.14, 0.03), col("#7a5a3c"), M4(x, 7.9, -7.6));
  }
  truck(b, SPOT.TRUCK[0], SPOT.TRUCK[2]);
  // launch cart (shot 13): two-wheel trailer with a ramp rail in the missile's frame
  const [cx, , cz] = SPOT.CART;
  b.add(rbox(4.6, 0.26, 1.5, 0.06), col("#5b6b54"), M4(cx, 0.75, cz, 0.42));
  for (const s of [-1, 1]) {
    const w = V(0, 0, s * 0.85).applyAxisAngle(UP, 0.42);
    b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 20).rotateX(Math.PI / 2), col("#26262c"), M4(cx + w.x, 0.42, cz + w.z, 0.42));
  }
  const L = M4(CART_MISSILE[0], CART_MISSILE[1], CART_MISSILE[2], 0.42, 0.36);
  b.add(rbox(6.0, 0.22, 0.24, 0.05), col("#8d97a3"), L.clone().multiply(M4(-0.4, -0.8, 0)));
  const hi = V(2.2, -0.95, 0).applyMatrix4(L);
  b.add(rod(V(hi.x, 0.85, hi.z), hi, 0.08), col("#8d97a3"));
  return done("road", [b, true]);
};

// ---- post office interior: tiled floor, panelled counter, pigeon-hole wall, posters, clock, pendant lamps ----
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
const buildPostOffice = (): SetRig => {
  const shell = new Batch(), b = new Batch();
  const wall = texM("poWall", () => P.plasterHD("#e8d9b8")), floor = texM("poFloor", () => P.tilesHD("#e9dcc0", "#8a5a3c")), ceil = texM("poCeil", () => P.plasterHD("#f2e8d4"));
  const wains = texM("poWains", () => P.panelHD("#6e4128"));
  room(shell, -7, 7, -5, 9, 4.4, wall, floor, ceil, wains);
  // counter (front face at COUNTER_Z), dark top, brass foot rail
  const cz = SPOT.COUNTER_Z;
  rb(b, texM("counterWood", () => P.panelHD("#7a4a2c")), -5.5, 5.5, 0, 0.95, cz - 1.0, cz, 0.05, [2, 1]);
  rb(b, col("#4a2a18"), -5.7, 5.7, 0.95, 1.03, cz - 1.15, cz + 0.12, 0.03);
  rb(b, texM("poFloorB", () => P.parquetHD("#8a5a34")), -5.5, 5.5, 0, SPOT.CLERK[1], cz - 3.2, cz - 1.0, 0.03, 2); // clerk's raised floor
  b.add(rod(V(-5.4, 0.18, cz + 0.22), V(5.4, 0.18, cz + 0.22), 0.035), col("#c9a24e"));
  // brass grille panels (left and right of the open window)
  for (const [x0, x1] of [[-5.4, -1.9], [1.9, 5.4]]) {
    rb(b, col("#c9a24e"), x0, x1, 2.05, 2.12, cz - 0.55, cz - 0.45, 0.02);
    for (let x = x0; x <= x1 + 1e-6; x += 0.18) b.add(rod(V(x, 1.03, cz - 0.5), V(x, 2.08, cz - 0.5), 0.012), col("#c9a24e"));
  }
  // on the counter: a postal scale, letter stacks, a stamp box
  b.add(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 16), col("#3f4650"), M4(1.1, 1.12, cz - 0.4));
  b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 20), col("#c9a24e"), M4(1.1, 1.26, cz - 0.4));
  for (let k = 0; k < 3; k++) rb(b, col(k % 2 ? "#efe3c8" : "#f7f4ea"), -1.6 + k * 0.05, -1.25 + k * 0.05, 1.03 + k * 0.04, 1.07 + k * 0.04, cz - 0.6, cz - 0.35, 0.01);
  rb(b, col("#2f5d9a"), 2.4, 2.75, 1.03, 1.15, cz - 0.7, cz - 0.45, 0.02);
  // sorting cabinet with pigeon holes on the back wall
  rb(b, col("#6e4128"), -3.4, 3.4, 0, 0.9, -4.95, -4.25, 0.04);
  rb(b, texM("slots", () => P.slotsHD()), -3.2, 3.2, 0.9, 3.3, -4.95, -4.45, 0.03, [2.4, 2.4]);
  rb(b, col("#5a341f"), -3.4, 3.4, 3.3, 3.45, -4.98, -4.35, 0.04);
  // posters + clock
  const poster = (k: number, x: number, y: number, z: number, ry: number) => b.add(rbox(1.0, 1.4, 0.03, 0.01), texM("poster" + k, () => P.posterHD(k)), M4(x, y, z, ry));
  poster(0, -4.9, 2.2, -4.94, 0); poster(1, 4.9, 2.2, -4.94, 0); poster(2, -6.96, 2.2, 1.5, Math.PI / 2); poster(0, 6.96, 2.2, 3.5, -Math.PI / 2);
  b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 32).rotateX(Math.PI / 2), texM("clock", () => P.clockHD()), M4(0, 3.85, -4.9));
  // tall windows on the left wall (bright), customer desk on the right
  for (const z of [-1.5, 3.5]) { rb(b, col("#fbf6ea"), -7.02, -6.9, 1.0, 3.8, z - 0.9, z + 0.9, 0.03); rb(b, glow("#fff1d2", 1.05), -6.98, -6.86, 1.12, 3.68, z - 0.78, z + 0.78, 0.01); rb(b, col("#fbf6ea"), -6.97, -6.84, 2.38, 2.46, z - 0.78, z + 0.78, 0.01); }
  rb(b, col("#6e4128"), 4.4, 6.2, 0.95, 1.05, 1.2, 2.4, 0.03);
  for (const [x, z] of [[4.5, 1.3], [6.1, 1.3], [4.5, 2.3], [6.1, 2.3]]) rb(b, col("#4a2a18"), x - 0.05, x + 0.05, 0, 0.95, z - 0.05, z + 0.05, 0.01);
  pendant(b, -2.5, 0.5, 4.4, 0.9); pendant(b, 2.5, 0.5, 4.4, 0.9); pendant(b, 0, 4.5, 4.4, 0.9);
  // a wastebasket and a bench for the customer side
  b.add(new THREE.CylinderGeometry(0.22, 0.18, 0.5, 16, 1, true), col("#5a6a5a", THREE.DoubleSide), M4(-3.2, 0.25, 1.4));
  rb(b, col("#7a4a2c"), 3.6, 6.4, 0.45, 0.55, 6.4, 7.0, 0.04);
  return done("postoffice", [shell, false], [b, true]);
};

// ---- museum hall: parquet floor, pilasters, tall windows, banners, the missile on a marble pedestal, 1959 plaque ----
const buildMuseum = (rigForSupports: MissileRig): SetRig => {
  const shell = new Batch(), b = new Batch();
  const wall = texM("musWall", () => P.plasterHD("#eee0c4")), floor = texM("musFloor", () => P.parquetHD("#a8703f")), ceil = texM("musCeil", () => P.plasterHD("#f4ead8"));
  room(shell, -16, 16, -14, 24, 12, wall, floor, ceil);
  const trim = col("#d9c8a6"), marble = texM("marble", () => P.marbleHD());
  for (let x = -12; x <= 12; x += 6) rb(b, trim, x - 0.5, x + 0.5, 0, 12, -14, -13.6, 0.08); // pilasters, back wall
  for (const s of [-1, 1]) for (let z = -8; z <= 20; z += 7) rb(b, trim, s > 0 ? 15.6 : -16, s > 0 ? 16 : -15.6, 0, 12, z - 0.5, z + 0.5, 0.08);
  for (let x = -9; x <= 9; x += 6) { // tall windows between the pilasters
    rb(b, col("#fbf6ea"), x - 1.5, x + 1.5, 3, 10, -14.02, -13.85, 0.04);
    rb(b, glow("#f4f0e2", 1.08), x - 1.3, x + 1.3, 3.2, 9.8, -13.98, -13.8, 0.02);
    for (const yy of [5.4, 7.6]) rb(b, col("#fbf6ea"), x - 1.3, x + 1.3, yy, yy + 0.1, -13.97, -13.78, 0.01);
    rb(b, col("#fbf6ea"), x - 0.05, x + 0.05, 3.2, 9.8, -13.97, -13.78, 0.01);
  }
  rb(b, trim, -16, 16, 0, 0.35, -13.9, -13.6, 0.04); // skirting
  for (let z = -10; z <= 20; z += 6) rb(b, col("#8a6a4a"), -16, 16, 11.2, 12, z - 0.35, z + 0.35, 0.08); // ceiling beams
  for (const [x, z, k] of [[-9, -6, 0], [9, -6, 1], [-9, 4, 1], [9, 4, 0]] as const) { // hanging banners
    b.add(rod(V(x - 0.9, 11.2, z), V(x + 0.9, 11.2, z), 0.04), col("#c9a24e"));
    b.add(rbox(1.6, 4.8, 0.03, 0.01), texM("banner" + k, () => P.museumBannerHD(k)), M4(x, 8.7, z));
  }
  // pedestal: two marble steps, brass trim
  rb(b, marble, -5.2, 5.2, 0, 0.7, -2.2, 2.2, 0.1, 2);
  rb(b, marble, -4.2, 4.2, 0.7, 1.4, -1.5, 1.5, 0.1, 2);
  rb(b, col("#c9a24e"), -4.25, 4.25, 1.36, 1.44, -1.55, 1.55, 0.03);
  // supports from the top step to the missile's wheels (posed like the exhibit)
  poseMissile(rigForSupports, { visible: true, pos: SPOT.EXHIBIT, yaw: -0.38, pitch: 0.2, roll: 0, booster: false, gear: true });
  for (const [x, z] of [[2.7, 0], [-0.9, 0.95], [-0.9, -0.95]]) {
    const w = V(x, -1.37, z).applyMatrix4(rigForSupports.root.matrixWorld);
    if (w.y > 1.44) b.add(new THREE.CylinderGeometry(0.28, 0.34, w.y - 1.44, 16), col("#8d97a3"), M4(w.x, (w.y + 1.44) / 2, w.z));
  }
  // brass stanchions + red rope around the pedestal
  const posts: THREE.Vector3[] = [];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2; posts.push(V(6.6 * Math.cos(a), 0, 3.6 * Math.sin(a))); }
  for (const p of posts) { b.add(rod(p, V(p.x, 0.95, p.z), 0.04), col("#c9a24e")); b.add(new THREE.SphereGeometry(0.08, 10, 8), col("#c9a24e"), M4(p.x, 1.0, p.z)); b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), col("#c9a24e"), M4(p.x, 0.03, p.z)); }
  for (let k = 0; k < 8; k++) {
    if (k === 1) continue; // gap toward the plaque
    const a = posts[k], c = posts[(k + 1) % 8], curve = new THREE.QuadraticBezierCurve3(V(a.x, 0.9, a.z), V((a.x + c.x) / 2, 0.55, (a.z + c.z) / 2), V(c.x, 0.9, c.z));
    b.add(new THREE.TubeGeometry(curve, 12, 0.035, 6), col("#a8262c"));
  }
  // plaque on an angled stand facing the visitors (+z)
  const [qx, , qz] = SPOT.PLAQUE;
  b.add(rod(V(qx, 0, qz), V(qx, 1.0, qz), 0.06), col("#3a2a1e"));
  b.add(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 18), col("#3a2a1e"), M4(qx, 0.03, qz));
  b.add(rbox(1.3, 0.72, 0.08, 0.02), col("#3a2a1e"), M4(qx, 1.1, qz, 0, 0, -0.55));
  b.add(rbox(1.16, 0.58, 0.02, 0.005), texM("plaque", () => P.plaqueHD()), M4(qx, 1.1 + 0.04 * Math.sin(0.55), qz + 0.04 * Math.cos(0.55), 0, 0, -0.55));
  // side exhibits: a period blue mailbox and a glass case with letters; a bench
  rb(b, col("#2f4f8f"), -9.4, -8.6, 0, 1.15, 6.6, 7.2, 0.06);
  b.add(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 20, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), col("#2f4f8f"), M4(-9.0, 1.15, 6.9));
  rb(b, col("#6e4128"), 7.6, 10.2, 0, 0.9, 7.2, 8.4, 0.05);
  rb(b, glow("#dcecf2", 0.75), 7.7, 10.1, 0.9, 1.6, 7.3, 8.3, 0.03);
  rb(b, col("#7a4a2c"), -3, 3, 0.45, 0.55, 12.5, 13.3, 0.04);
  for (const x of [-2.6, 2.6]) rb(b, col("#4a2a18"), x - 0.1, x + 0.1, 0, 0.45, 12.6, 13.2, 0.02);
  for (const [x, z] of [[-6, -2], [6, -2], [-6, 8], [6, 8], [0, 14]]) pendant(b, x, z, 12, 2.5);
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
