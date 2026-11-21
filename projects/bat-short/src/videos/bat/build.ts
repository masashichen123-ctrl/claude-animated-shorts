// Sets for "The Bat Bomb" (owner: sets, with paint.ts): New Mexico, 1943. Every set is one THREE.Group built at the
// world origin in its own frame (story.ts SPOT anchors); world.ts shows only the active shot's set. Set meshes stay on
// camera layer 0, so the world ink pass outlines them. Shapes are chunky and bevelled (rbox, lathes, extrusions,
// displaced rock lumps) and every material is two-tone (lam -> twoTone). Sets: the night desert, the army air base
// (hangar with the white star, control tower, water tower, barracks, the silver fuel tank on legs, the General's shiny
// car, the flag; burnt variants swapped in by tick), the cave mouth with the tourist overlook, Adams' workshop with the
// planning model, the cutaway model house, the President's office, the chemistry lab, the War Department office.
// CONTRACTS: buildSets(), SET_META, SetRig, buildRigs() (bomb casing, bat crate) + poseBomb / poseCrate, fgUpdate(),
// CLOCK (read by world.ts).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as P from "./paint";
import { rng, rep, ctex } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";
import { SPOT, SetName, FOREGROUND, BombPose, CratePose, caveGround, smooth } from "./story";

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
const LEAF = ["#8f9a6c", "#9aa274", "#7f8f66", "#a3a87a", "#7c8560"]; // grey-green desert sage / creosote
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
// DESERT KIT
// =================================================================================================================
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

// ---- desert dressing ----
const sandM = () => groundM("sand", () => P.sandHD());
const sandDarkM = () => groundM("sandDark", () => P.sandHD("sandDarkHD", "#c49058"));
const apronM = () => groundM("apron", () => P.concreteHD());
const rockM = (k = 0) => texM("rock" + k, () => P.rockHD("rockHD" + k, ["#c98a58", "#b97a50", "#d39a66"][k % 3]));
const lumpGeo = (seed: number) => cached("lump" + seed, () => {
  const g = new THREE.IcosahedronGeometry(1, 4), p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = vn2(v.x * 1.6 + seed, v.z * 1.6 - seed, seed) * 0.55 + vn2(v.x * 3.4 - v.y * 2.1, v.z * 3.4 + seed, seed + 1) * 0.3;
    const strata = 0.04 * Math.sin(v.y * 9 + seed);                                   // ledges
    v.multiplyScalar(0.84 + 0.3 * n + strata);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return uvFrom(g, (x, y, z) => [(x + z) * 0.6, y * 0.6]);
});
/** a lumpy sandstone rock: centre, radii, seed; uv tiles ~8 m (the strata texture) */
const lump = (b: Batch, x: number, y: number, z: number, sx: number, sy: number, sz: number, seed: number, ry = 0, k = 0) => {
  const g = lumpGeo(seed % 7), m = M4(x, y, z, ry, 0, 0, [sx, sy, sz]);
  const gg = g.clone(); uvFrom(gg, (px, py, pz) => [(px * sx + pz * sz) / 8, (py * sy) / 8]);
  b.add(gg, rockM(k), m);
};
/** flat-topped mesa (far backdrop): an extruded irregular plan with strata */
const mesa = (b: Batch, cx: number, cz: number, w: number, d: number, h: number, seed: number) => {
  const r = rng(seed), pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, k = 0.8 + 0.3 * r(); pts.push([cx + Math.cos(a) * w * k, cz + Math.sin(a) * d * k]); }
  const g = slab(pts, -2, h + 2, 0.6);
  uvFrom(g, (x, y, z) => [(x + z) / 14, y / 14]);
  b.add(g, rockM(seed % 3));
  // talus skirt
  for (let i = 0; i < 6; i++) { const a = r() * 6.28; lump(b, cx + Math.cos(a) * w * 0.95, 0, cz + Math.sin(a) * d * 0.95, w * 0.3, h * 0.35, d * 0.3, seed + i, a, (seed + 1) % 3); }
};
/** yucca: a short trunk with a spiky ball of blades, often a flower stalk */
const yuccaBladeGeo = () => cached("yuccaBlades", () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 26; i++) {
    const a = (i * 2.4) % 6.28, e = 0.25 + 1.15 * ((i * 37) % 26) / 26, l = 0.75, w = 0.045;
    const d = V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)), side = V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(w);
    parts.push(tri(side.clone(), side.clone().negate(), d.clone().multiplyScalar(l)));
    parts.push(tri(side.clone().negate(), side.clone(), d.clone().multiplyScalar(l)));
  }
  return mergeGeometries(parts, false);
});
const yucca = (b: Batch, x: number, z: number, h: number, seed: number, y = 0) => {
  const r = rng(seed);
  b.add(rod(V(x, y - 0.1, z), V(x + (r() - 0.5) * 0.2, y + h * 0.55, z), 0.07 * h, 0.05 * h, 7), col("#7a6248"));
  b.add(yuccaBladeGeo(), col("#7f9a5a", THREE.DoubleSide), M4(x, y + h * 0.55, z, r() * 6.28, 0, 0, [h * 0.7, h * 0.7, h * 0.7]));
  if (r() < 0.6) { b.add(rod(V(x, y + h * 0.8, z), V(x, y + h * 1.6, z), 0.02 * h, 0.012 * h, 5), col("#8a7a52")); b.add(lobeGeo(1), col("#efe6c6"), M4(x, y + h * 1.5, z, 0, 0, 0, [0.09 * h, 0.2 * h, 0.09 * h])); }
};
const sage = (b: Batch, cx: number, cz: number, r0: number, r1: number, n: number, seed: number, avoid?: (x: number, z: number) => boolean, hf?: (x: number, z: number) => number) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = r0 + (r1 - r0) * Math.sqrt(r()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (avoid?.(x, z)) continue;
    addVeg(b, "bush", x, hf ? hf(x, z) : 0, z, 0.45 + 0.6 * r(), seed * 13 + i, d > 60 ? 2 : 1);
  }
};
/** far backdrop: desert hills + a ring of mesas */
const desertHorizon = (b: Batch, seed: number, night = false, far = true) => {
  hillRing(b, 0, 0, 700, 8, 30, seed, night ? "#4a4e72" : "#c9a27a");
  if (far) hillRing(b, 0, 0, 1100, 30, 90, seed + 1, night ? "#3a4068" : "#a99ab0");
  const r = rng(seed + 2);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28 + r() * 0.5, d = 260 + 160 * r(); mesa(b, Math.cos(a) * d, Math.sin(a) * d, 30 + 40 * r(), 18 + 20 * r(), 18 + 22 * r(), seed * 7 + i); }
};
const shiny = (c: string, sh = 70) => {
  const key = "shiny" + c + sh;
  let m = mats.get(key) as THREE.MeshPhongMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshPhongMaterial({ color: c, shininess: sh, specular: new THREE.Color("#8890a0") })); mats.set(key, m); }
  return m;
};
const charM = () => col("#2e2a28");
const emberM = () => glow("#ff7a2a", 1.9);

// =================================================================================================================
// SETS
// =================================================================================================================
export type SetRig = { name: SetName; group: THREE.Group; tick?: (t: number, id: number) => void };
/** per-set world settings: haze reach multiplier; indoor sets hide the sky and use the light's background colour;
 *  ceil = ceiling height for the corner AO */
export const SET_META: Record<SetName, { hazeK: number; indoor?: boolean; ceil?: number }> = {
  desert: { hazeK: 1.8 }, base: { hazeK: 1.5 }, cave: { hazeK: 1.3 },
  workshop: { hazeK: 1, indoor: true, ceil: 3.1 }, attic: { hazeK: 1, indoor: true, ceil: 3.4 }, oval: { hazeK: 1, indoor: true, ceil: 3.6 },
  lab: { hazeK: 1, indoor: true, ceil: 3.2 }, office: { hazeK: 1, indoor: true, ceil: 3.0 },
};
const done = (name: SetName, b: Batch, cards?: Batch): SetRig => {
  const group = new THREE.Group(); group.name = name;
  b.build(group, true);
  if (cards) buildNoInk(cards, group);
  return { name, group };
};
const FAR = 600;

// ---- desert: the night sky over the desert (the hook) ----
const buildDesert = (): SetRig => {
  const b = new Batch();
  terrain(b, sandDarkM(), -FAR, FAR, -FAR, FAR, 5, (x, z) => 2.5 * (vn2(x / 40, z / 40, 3) - 0.5) + 1.2 * (vn2(x / 13, z / 13, 4) - 0.5), 8);
  for (const [x, z, w, d, h] of [[-90, -160, 45, 25, 34], [70, -210, 60, 30, 42], [160, -120, 40, 22, 28], [-200, -90, 50, 26, 30], [10, -330, 70, 30, 50]]) mesa(b, x, z, w, d, h, x + z);
  sage(b, 0, -60, 10, 160, 260, 5);
  for (let i = 0; i < 30; i++) { const r = rng(40 + i); yucca(b, (r() - 0.5) * 140, -20 - 140 * r(), 1.4 + r(), 50 + i); }
  desertHorizon(b, 11, true);
  return done("desert", b);
};

// ---- the army air base ----
const sidingM = (c: string) => texM("siding" + c, () => P.sidingHD(c));
const silverM = () => texM("hangarIron", () => P.corrugatedHD("#b8bcbc"));
const roofIronM = () => texM("roofIron", () => P.corrugatedHD("#8c9a86"));
const tarM = () => col("#5a6358");
const winM = () => col("#33475a");
const frameM = () => col("#f4f0e4");
/** gable building (barracks / tower base): centre (x, z), yaw, w along local x, d, wall height h; door + steps on +z */
const barracks = (b: Batch, x: number, z: number, ry: number, burnt: boolean) => {
  const w = 14, d = 5, h = 3.0, pier = 0.5, m = M4(x, 0, z, ry);
  const put = (geo: THREE.BufferGeometry, mat: Mat, lm: THREE.Matrix4) => b.add(geo, mat, m.clone().multiply(lm));
  for (let px = -w / 2 + 0.4; px <= w / 2; px += 2.2) for (const pz of [-d / 2 + 0.3, d / 2 - 0.3]) put(rbox(0.25, pier, 0.25, 0.03), col("#7a6a5a"), M4(px, pier / 2, pz));
  const wall = burnt ? charM() : sidingM("#efe6d2");
  put(rbox(w, h, d, 0.05, 2), wall, M4(0, pier + h / 2, 0));
  // gable roof (two slabs) + ridge
  const rise = 1.5, sl = Math.hypot(d / 2 + 0.4, rise);
  for (const s of [-1, 1]) put(rbox(w + 0.6, 0.12, sl, 0.03), burnt ? charM() : tarM(), M4(0, pier + h + rise / 2, s * (d / 4 + 0.1), 0, 0, s * Math.atan2(rise, d / 2 + 0.4)));
  for (const s of [-1, 1]) put(cached("gable" + d, () => { const g = plate([[-d / 2, 0], [d / 2, 0], [0, rise]], 0.1, 0.02); return g; }), wall, M4(s * (w / 2 - 0.05), pier + h, 0, Math.PI / 2));
  if (!burnt) {
    for (let k = -2; k <= 2; k++) { if (k === -1) continue; const wx = k * 2.6; put(rbox(1.1, 1.0, 0.08, 0.02), frameM(), M4(wx, pier + 1.7, d / 2 + 0.02)); put(rbox(0.9, 0.8, 0.06, 0.01), winM(), M4(wx, pier + 1.7, d / 2 + 0.05)); put(rbox(0.06, 0.8, 0.1, 0.01), frameM(), M4(wx, pier + 1.7, d / 2 + 0.06)); }
    put(rbox(1.1, 2.2, 0.08, 0.02), frameM(), M4(-2, pier + 1.1, d / 2 + 0.02)); put(rbox(0.9, 2.05, 0.06, 0.02), col("#5d7a5a"), M4(-2, pier + 1.05, d / 2 + 0.05));
  } else for (let k = 0; k < 6; k++) put(rbox(0.12, 0.12, 0.12, 0.03), emberM(), M4(-5 + 2 * k, pier + h + 0.2, 0.5 * (k % 2)));
  // steps (open underneath: the bat peeks into the dark gap)
  for (let k = 0; k < 2; k++) put(rbox(1.5, 0.08, 0.36, 0.02), col("#9a7a58"), M4(-2, 0.18 + 0.2 * k, d / 2 + 0.75 - 0.32 * k));
  for (const s of [-1, 1]) put(plate([[0, 0], [0.75, 0], [0.75, 0.5], [0.62, 0.5]], 0.06, 0.01), col("#8a6a4a"), M4(-2 + s * 0.72, 0, d / 2 + 0.95, Math.PI / 2));
};
const hangar = (b: Batch, burnt: boolean) => {
  const [hx, , hz] = SPOT.HANGAR, W = SPOT.HANGAR_W, D = SPOT.HANGAR_D, H = SPOT.HANGAR_H, rise = 4.6, front = hz + D / 2;
  const arch = (u: number) => H + rise * Math.sqrt(Math.max(0, 1 - u * u)); // u -1..1 across
  if (burnt) {
    // the charred steel frame: arched ribs, the front portal, posts, smouldering debris
    for (let z = hz - D / 2; z <= front + 0.01; z += D / 5) {
      for (let i = 0; i < 12; i++) { const u0 = -1 + (2 * i) / 12, u1 = -1 + (2 * (i + 1)) / 12; b.add(rod(V(hx + u0 * W / 2, arch(u0), z), V(hx + u1 * W / 2, arch(u1), z), 0.14), charM()); }
      for (const s of [-1, 1]) b.add(rod(V(hx + s * W / 2, 0, z), V(hx + s * W / 2, H, z), 0.16), charM());
    }
    for (const s of [-1, 1]) b.add(rod(V(hx + s * W / 2, H, hz - D / 2), V(hx + s * W / 2, H, front), 0.12), charM());
    const r = rng(77);
    for (let i = 0; i < 26; i++) lump(b, hx + (r() - 0.5) * W * 0.9, 0, hz + (r() - 0.5) * D * 0.9, 0.8 + 1.4 * r(), 0.3 + 0.6 * r(), 0.8 + 1.2 * r(), i, r() * 6, 0);
    for (let i = 0; i < 14; i++) b.add(rbox(0.3, 0.15, 0.3, 0.05), emberM(), M4(hx + (r() - 0.5) * W * 0.8, 0.3, hz + (r() - 0.5) * D * 0.8, r() * 3));
    return;
  }
  // corrugated walls, a barrel roof, the gable end with the big sliding doors and the star
  rb(b, silverM(), hx - W / 2, hx - W / 2 + 0.2, 0, H, hz - D / 2, front, 0.05, 2);
  rb(b, silverM(), hx + W / 2 - 0.2, hx + W / 2, 0, H, hz - D / 2, front, 0.05, 2);
  rb(b, silverM(), hx - W / 2, hx + W / 2, 0, H, hz - D / 2, hz - D / 2 + 0.2, 0.05, 2);
  const roof = cached("hangarRoof", () => { const g = new THREE.CylinderGeometry(1, 1, D + 0.8, 40, 1, true, -Math.PI / 2, Math.PI); g.rotateX(-Math.PI / 2); return uvFrom(g, (x, y, z) => [Math.atan2(y, x) * 4, z / 2]); });
  b.add(roof, lam("hangarRoofM", () => ({ map: P.corrugatedHD("#8c9a86"), side: THREE.DoubleSide })), M4(hx, H, hz, 0, 0, 0, [W / 2 + 0.3, rise, 1]));
  const gpts: [number, number][] = []; for (let i = 0; i <= 24; i++) { const u = -1 + (2 * i) / 24; gpts.push([u * W / 2, arch(u) - H]); }
  b.add(plate([[-W / 2, 0], ...gpts, [W / 2, 0]], 0.2, 0.03), sidingM("#e8e0cc"), M4(hx, H, front));
  rb(b, col("#e8e0cc"), hx - W / 2, hx - W / 2 + 2.2, 0, H, front - 0.2, front + 0.05, 0.04);
  rb(b, col("#e8e0cc"), hx + W / 2 - 2.2, hx + W / 2, 0, H, front - 0.2, front + 0.05, 0.04);
  rb(b, col("#2a2a30"), hx - W / 2 + 2.2, hx + W / 2 - 2.2, 0, H - 0.3, front - 0.5, front - 0.3, 0.02);   // the dark inside behind the open gap
  rb(b, silverM(), hx - W / 2 + 2.2, hx - 0.8, 0, H - 0.25, front + 0.02, front + 0.22, 0.04, 2);         // two sliding doors, a gap open
  rb(b, silverM(), hx + 1.6, hx + W / 2 - 2.2, 0, H - 0.25, front + 0.22, front + 0.42, 0.04, 2);
  rb(b, col("#c9b07a"), hx - W / 2, hx + W / 2, H - 0.3, H + 0.05, front + 0.0, front + 0.46, 0.03);       // door track header
  b.add(decalGeo(V(hx, H + 2.2, front + 0.13), V(0, 0, 1), 3.6, 3.6), lam("starDecal", () => ({ map: P.starHD(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })));
  b.add(decalGeo(V(hx - W / 4 - 0.6, 3.2, front + 0.235), V(0, 0, 1), 2.6, 2.6), lam("starDecal", () => ({ map: P.starHD(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })));
  // wind sock on a mast at the corner
  b.add(rod(V(hx + W / 2 + 1, 0, front), V(hx + W / 2 + 1, 9, front), 0.06), col("#e8e4da"));
  b.add(lathe("sock", [[0.35, 0], [0.3, 0.5], [0.22, 1.4], [0.18, 2.0], [0, 2.0]], 14), col("#f08a2c"), M4(hx + W / 2 + 1.1, 8.7, front, 0.4, -Math.PI / 2 + 0.25));
};
const controlTower = (b: Batch) => {
  const [tx, , tz] = SPOT.TOWER;
  rb(b, sidingM("#efe6d2"), tx - 2, tx + 2, 0, 7.4, tz - 2, tz + 2, 0.05, 2);
  for (let k = 0; k < 3; k++) { rb(b, frameM(), tx - 0.5, tx + 0.5, 1.6 + 2.2 * k, 2.6 + 2.2 * k, tz + 2, tz + 2.06, 0.02); rb(b, winM(), tx - 0.4, tx + 0.4, 1.7 + 2.2 * k, 2.5 + 2.2 * k, tz + 2.04, tz + 2.09, 0.01); }
  rb(b, col("#efe6d2"), tx - 2.6, tx + 2.6, 7.4, 7.7, tz - 2.6, tz + 2.6, 0.04);                       // cab floor
  rb(b, col("#9fc4d8"), tx - 2.2, tx + 2.2, 7.7, 9.9, tz - 2.2, tz + 2.2, 0.02);                        // glazing
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rb(b, frameM(), tx + sx * 2.2 - 0.1, tx + sx * 2.2 + 0.1, 7.7, 9.9, tz + sz * 2.2 - 0.1, tz + sz * 2.2 + 0.1, 0.02);
  for (const s of [-1, 1]) rb(b, frameM(), tx - 0.06 + s * 0.8, tx + 0.06 + s * 0.8, 7.7, 9.9, tz + 2.18, tz + 2.26, 0.01);
  rb(b, col("#5a6358"), tx - 2.9, tx + 2.9, 9.9, 10.25, tz - 2.9, tz + 2.9, 0.06);                      // roof
  b.add(lathe("beacon", [[0, 0], [0.25, 0], [0.25, 0.35], [0.12, 0.5], [0, 0.5]], 12), glow("#ff5a3a", 1.4), M4(tx, 10.25, tz));
  for (let x = -2.6; x <= 2.61; x += 0.65) b.add(rod(V(tx + x, 7.7, tz + 2.6), V(tx + x, 8.6, tz + 2.6), 0.03), col("#e8e4da"));
  b.add(rod(V(tx - 2.6, 8.6, tz + 2.6), V(tx + 2.6, 8.6, tz + 2.6), 0.035), col("#e8e4da"));
};
const waterTower = (b: Batch) => {
  const [wx, , wz] = SPOT.WTOWER, H = 10;
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [sx, sz] of legs) b.add(rod(V(wx + sx * 2.6, 0, wz + sz * 2.6), V(wx + sx * 1.9, H, wz + sz * 1.9), 0.13), col("#9a8a74"));
  for (const yk of [0.3, 0.65]) for (let i = 0; i < 4; i++) { const [ax, az] = legs[i], [bx, bz] = legs[(i + 1) % 4], w = 2.6 - 0.7 * yk; b.add(rod(V(wx + ax * w, H * yk, wz + az * w), V(wx + bx * w, H * yk, wz + bz * w), 0.06), col("#9a8a74")); }
  b.add(cached("wtTank", () => uvFrom(new THREE.CylinderGeometry(3, 3, 4.2, 32, 1, false), (x, y, z) => [Math.atan2(x, z) * 3, y / 2])), texM("wtIron", () => P.corrugatedHD("#d8d4c8")), M4(wx, H + 2.1, wz));
  b.add(cached("wtRoof", () => new THREE.ConeGeometry(3.25, 1.7, 32)), col("#a24a3a"), M4(wx, H + 5.05, wz));
  b.add(rbox(6.6, 0.15, 6.6, 0.03), col("#9a8a74"), M4(wx, H, wz));
};
const fuelTank = (b: Batch, burnt: boolean) => {
  const [cx, , cz] = SPOT.TANK, R = SPOT.TANK_R, L = SPOT.TANK_L, Y = SPOT.TANK_Y;
  const shell = burnt ? charM() : shiny("#d4d8dc", 50);
  b.add(cached("tankBody", () => new THREE.CylinderGeometry(R, R, L, 40, 1, true).rotateZ(Math.PI / 2)), shell, M4(cx, Y, cz));
  for (const s of [-1, 1]) b.add(cached("tankCap", () => new THREE.SphereGeometry(R, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.35, 1).rotateZ(-Math.PI / 2)), shell, M4(cx + s * L / 2, Y, cz, s > 0 ? 0 : Math.PI));
  for (const x of [-L / 2 + 0.4, L / 2 - 0.4]) b.add(cached("tankBand", () => new THREE.TorusGeometry(R + 0.03, 0.06, 6, 40).rotateY(Math.PI / 2)), burnt ? charM() : col("#9aa0a6"), M4(cx + x, Y, cz));
  // saddle legs: three frames of steel posts + cross beams
  for (const dx of [-3.4, 0, 3.4]) {
    for (const s of [-1, 1]) b.add(rod(V(cx + dx, 0, cz + s * 1.9), V(cx + dx, Y - R * 0.55, cz + s * 1.45), 0.12), col("#5a5e62"));
    b.add(rod(V(cx + dx, 1.2, cz - 1.75), V(cx + dx, 1.2, cz + 1.75), 0.07), col("#5a5e62"));
    b.add(rbox(0.3, 0.25, 3.4, 0.04), col("#5a5e62"), M4(cx + dx, Y - R * 0.62, cz));
    for (const s of [-1, 1]) b.add(rbox(0.5, 0.06, 0.5, 0.02), col("#8a8a88"), M4(cx + dx, 0.03, cz + s * 1.9));
  }
  // the pipe underneath that the bats hang from, a valve wheel, the ladder and the catwalk
  b.add(rod(V(cx - 4.6, 2.12, cz + 1.05), V(cx + 4.2, 2.12, cz + 1.05), 0.06), col("#6a6e72"));
  b.add(rod(V(cx + 4.2, 2.12, cz + 1.05), V(cx + 4.2, 0, cz + 1.05), 0.06), col("#6a6e72"));
  b.add(new THREE.TorusGeometry(0.22, 0.035, 6, 18), col("#c8323a"), M4(cx + 4.2, 1.0, cz + 1.3));
  for (const s of [-0.25, 0.25]) b.add(rod(V(cx + L / 2 + 0.4 + s, 0, cz + 0.8), V(cx + L / 2 + 0.4 + s, Y + R + 0.3, cz + 0.8), 0.03), col("#5a5e62"));
  for (let y = 0.4; y < Y + R; y += 0.4) b.add(rod(V(cx + L / 2 + 0.15, y, cz + 0.8), V(cx + L / 2 + 0.65, y, cz + 0.8), 0.022), col("#5a5e62"));
  if (burnt) { const r = rng(9); for (let i = 0; i < 10; i++) b.add(rbox(0.25, 0.12, 0.25, 0.04), emberM(), M4(cx + (r() - 0.5) * L, 0.1, cz + (r() - 0.5) * 3)); }
};
/** the General's shiny black 1940s sedan (nose +x); charred = burnt-out shell on flat tyres */
const generalCar = (b: Batch, burnt: boolean) => {
  const [x0, , z0] = SPOT.CAR, m = M4(x0, 0, z0, 0);
  const put = (g: THREE.BufferGeometry, mat: Mat, lm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(lm));
  const paint = burnt ? col("#2b2624") : shiny("#16161c", 90), chrome = burnt ? col("#3a3432") : shiny("#d8dde4", 110);
  const tyreY = burnt ? 0.27 : 0.38;
  put(rbox(4.5, 0.62, 1.72, 0.22), paint, M4(0, tyreY + 0.42, 0));                          // body
  put(rbox(2.3, 0.62, 1.52, 0.26), paint, M4(-0.45, tyreY + 1.0, 0));                       // cabin
  put(rbox(2.0, 0.5, 1.56, 0.04), burnt ? col("#1a1616") : col("#4a5a6e"), M4(-0.45, tyreY + 1.02, 0));  // windows band
  put(rbox(1.9, 0.62, 1.4, 0.3), paint, M4(1.3, tyreY + 0.62, 0));                          // long hood
  for (const sx of [-1.35, 1.35]) for (const sz of [-1, 1]) put(cached("fender", () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), paint, M4(sx, tyreY + 0.15, sz * 0.78, 0, 0, 0, [0.72, 0.55, 0.3]));
  for (const sx of [-1.35, 1.35]) for (const sz of [-1, 1]) wheel(b, m.clone().multiply(M4(sx, tyreY, sz * 0.84, 0, 0, 0, burnt ? [1, 0.72, 1] : [1, 1, 1])), 0.38, 0.24, burnt ? "#3a3432" : "#f4f1ea");
  if (!burnt) {
    for (let k = -3; k <= 3; k++) put(rbox(0.05, 0.42, 0.05, 0.01), chrome, M4(2.27, tyreY + 0.55, k * 0.09));   // grille bars
    for (const s of [-1, 1]) put(cached("headlamp", () => new THREE.SphereGeometry(0.13, 14, 10)), chrome, M4(2.0, tyreY + 0.78, s * 0.62));
    for (const sx of [-2.3, 2.3]) put(rbox(0.12, 0.12, 1.8, 0.05), chrome, M4(sx, tyreY + 0.18, 0));
    put(rbox(0.2, 0.08, 0.05, 0.02), chrome, M4(2.15, tyreY + 0.98, 0));                       // hood ornament
    for (const s of [-1, 1]) put(rbox(0.4, 0.05, 0.04, 0.01), chrome, M4(-0.2, tyreY + 0.62, s * 0.88));   // door handles
    put(rbox(0.18, 0.12, 0.05, 0.02), col("#c8323a"), M4(2.2, tyreY + 1.05, 0.62));            // a little general's pennant on the fender
  } else {
    const r = rng(5); for (let i = 0; i < 8; i++) put(rbox(0.16, 0.08, 0.16, 0.03), emberM(), M4((r() - 0.5) * 3.6, tyreY + 0.8 + r() * 0.5, (r() - 0.5) * 1.2));
  }
};
/** the US flag on a pole; the cloth is rippled every frame by the set's tick */
const flagMesh = () => {
  const g = new THREE.PlaneGeometry(3.0, 1.6, 20, 6);
  const mat = lam("flagCloth", () => ({ map: P.flagHD(), side: THREE.DoubleSide }));
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  const base = (g.attributes.position as THREE.BufferAttribute).array.slice();
  const tick = (t: number) => {
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = base[i * 3] + 1.5, y = base[i * 3 + 1]; p.setZ(i, 0.16 * x * Math.sin(x * 2.2 - t * 6) + 0.05 * Math.sin(y * 3 + t * 4) * x); p.setY(i, y - 0.04 * x * x); }
    p.needsUpdate = true; g.computeVertexNormals();
  };
  return { m, tick };
};
const buildBase = (): SetRig => {
  const b = new Batch(), intact = new Batch(), burnt = new Batch(), tank = new Batch(), tankB = new Batch(), car = new Batch(), carB = new Batch();
  terrain(b, sandM(), -FAR, FAR, -FAR, FAR, 4, (x, z) => (Math.hypot(x, z) > 70 ? 1.6 * (vn2(x / 30, z / 30, 2) - 0.5) * smooth((Math.hypot(x, z) - 70) / 60) : 0), 6);
  terrain(b, apronM(), -32, 12, -14, 12, 6, undefined, 4, 0.02);
  terrain(b, groundM("runway", () => P.concreteHD()), -FAR, FAR, -62, -50, 6, undefined, 4, 0.02);
  for (let x = -200; x < 200; x += 9) rb(b, col("#f4f0e4"), x, x + 4, 0.025, 0.04, -56.3, -55.7, 0.01);
  hangar(intact, false); hangar(burnt, true);
  controlTower(b); waterTower(b);
  for (const [x, z, ry] of SPOT.BARRACKS.map((q) => [q[0], q[2], q[3]])) { barracks(intact, x, z, ry, false); barracks(burnt, x, z, ry, true); }
  fuelTank(tank, false); fuelTank(tankB, true);
  generalCar(car, false); generalCar(carB, true);
  // flag pole
  const [fx, , fz] = SPOT.FLAG;
  b.add(rod(V(fx, 0, fz), V(fx, 10, fz), 0.08, 0.05), col("#f4f0e4"));
  b.add(cached("finial", () => new THREE.SphereGeometry(0.14, 12, 8)), col("#e2c45a"), M4(fx, 10.1, fz));
  b.add(slab([[fx - 1, fz - 1], [fx + 1, fz - 1], [fx + 1, fz + 1], [fx - 1, fz + 1]], 0, 0.3, 0.05), col("#e8e0cc"));
  // crates (the bat looks behind the stack), oil drums, sandbags, a jeep-free apron, fences, scrub, mesas
  const [cx9, , cz9] = SPOT.CRATES9;
  for (const [dx, dy, dz, ry] of [[0, 0, 0, 0.1], [0.85, 0, 0.1, -0.05], [0.4, 0.62, 0.05, 0.2], [-0.2, 0, 0.75, 0.3]]) b.add(rbox(0.8, 0.6, 0.6, 0.03), lam("batCrate", () => ({ map: P.batCrateHD() })), M4(cx9 + dx, dy + 0.3, cz9 + dz, ry));
  for (const [x, z] of [[-7.5, 9], [-6.6, 9.4], [-7.0, 10.3], [3.8, 9.5]]) b.add(cached("drum", () => new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16)), col("#a83a2e"), M4(x, 0.45, z));
  sandbagRing(b, 18, 6, 2.2, -1.2, 1.4, 3, 3);
  fence(b, -120, 46, 120, 46, 4, 4); fence(b, 60, 46, 60, -120, 5, 4);
  sage(b, 0, 0, 40, 160, 220, 6, (x, z) => z > -66 && z < 30 && Math.abs(x) < 50);
  for (let i = 0; i < 22; i++) { const r = rng(80 + i), a = r() * 6.28, d = 45 + 90 * r(); yucca(b, Math.cos(a) * d, Math.sin(a) * d * 0.7 + 10, 1.3 + r(), 90 + i); }
  desertHorizon(b, 31);
  const rig = done("base", b);
  const gI = new THREE.Group(), gB = new THREE.Group(), gT = new THREE.Group(), gTB = new THREE.Group(), gC = new THREE.Group(), gCB = new THREE.Group();
  intact.build(gI, true); burnt.build(gB, true); tank.build(gT, true); tankB.build(gTB, true); car.build(gC, true); carB.build(gCB, true);
  rig.group.add(gI, gB, gT, gTB, gC, gCB);
  const flag = flagMesh(); flag.m.position.set(fx + 1.55, 9.0, fz); rig.group.add(flag.m);
  rig.tick = (t, id) => {
    const f = t * 30;
    const burntAll = id === 13, tankGone = (id === 11 && f >= 1188) || id >= 12;
    gI.visible = !burntAll; gB.visible = burntAll;
    gT.visible = !tankGone && id !== 2; gTB.visible = tankGone;
    const charred = id === 13 && f >= 1394;
    gC.visible = !charred; gCB.visible = charred;
    flag.tick(t);
  };
  return rig;
};

// ---- the cave: overlook platform with a rail, the bowl, the huge mouth in a sandstone hill ----
const buildCave = (): SetRig => {
  const b = new Batch(), M = SPOT.MOUTH, hw = SPOT.MOUTH_W / 2, FY = SPOT.FLOOR_Y;
  const notMouth = (x: number, z: number) => !(Math.abs(x) < hw + 1 && z < -28 && z > -52);
  const hf = (x: number, z: number) => (notMouth(x, z) ? caveGround(x, z) : FY);
  terrain(b, sandM(), -50, 50, -80, 30, 4, hf, 0.8);
  terrain(b, sandM(), -FAR, -50, -FAR, FAR, 4, hf, 8); terrain(b, sandM(), 50, FAR, -FAR, FAR, 4, hf, 8);
  terrain(b, sandM(), -50, 50, -FAR, -80, 4, hf, 8); terrain(b, sandM(), -50, 50, 30, FAR, 4, hf, 8);
  // the hill: buttresses either side of the mouth, a lintel lip over it, the big mass behind, rocks along the rim
  // the cliff: one extruded sandstone butte whose arch-shaped hole IS the cave mouth (the hole's walls are the tunnel)
  const cliff = cached("cliff", () => {
    const sh = new THREE.Shape(), r = rng(71), top: [number, number][] = [];
    for (let i = 0; i <= 24; i++) { const x = -46 + (92 * i) / 24, k = 1 - (Math.abs(x) / 46) ** 2.4; top.push([x, FY + 3 + (17 + 4 * Math.sin(i * 1.3) + 2 * r()) * k]); }
    sh.moveTo(-46, FY - 3); for (const [x, y] of top) sh.lineTo(x, y); sh.lineTo(46, FY - 3); sh.closePath();
    const hole = new THREE.Path(); hole.moveTo(-hw, FY - 1); hole.lineTo(hw, FY - 1);
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI; hole.lineTo(hw * Math.cos(a) * (1 + 0.04 * Math.sin(i * 2.1)), FY + 5 + 5.5 * Math.sin(a) + 0.25 * Math.sin(i * 3.3)); }
    hole.closePath(); sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 20, bevelEnabled: false, curveSegments: 8 });
    g.translate(0, 0, M[2] - 20);
    return uvFrom(g, (x, y, z) => [(x + z) / 10, y / 10]);
  });
  b.add(cliff, rockM(0));
  for (const [x, y, z, sx, sy, sz, sd] of [[-hw - 6, FY, M[2] + 0.6, 5, 7, 3, 1], [hw + 7, FY, M[2] + 0.8, 6, 6, 3, 2], [-22, FY, M[2] + 0.5, 9, 9, 4, 3], [24, FY, M[2] + 0.4, 9, 11, 4, 4]] as number[][]) lump(b, x, y, z, sx, sy, sz, sd, 0.2 * sd, sd % 3);
  lump(b, SPOT.LIP15[0], SPOT.LIP15[1] + 0.6, SPOT.LIP15[2] + 0.2, 1.3, 0.5, 1.0, 6, 0.4, 2);    // the ledge the medal bat hangs from
  // the back of the tunnel: a dark unlit wall, so the mouth reads as a deep black hole
  b.add(quad(V(-hw - 1, FY - 1, M[2] - 19), V(hw + 1, FY - 1, M[2] - 19), V(hw + 1, FY + 12, M[2] - 19), V(-hw - 1, FY + 12, M[2] - 19)), (() => { let m = mats.get("caveBack"); if (!m) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.012, 0.01, 0.014), fog: false }); mats.set("caveBack", m); } return m; })());
  terrain(b, groundM("caveFloor", () => P.sandHD("caveFloorHD", "#a07850")), -hw - 1, hw + 1, M[2] - 26, M[2] + 2, 4, undefined, 4, FY + 0.02);
  for (let i = 0; i < 18; i++) { const r = rng(300 + i); lump(b, (r() - 0.5) * 30, caveGround((r() - 0.5) * 30, -10 - 14 * r()) - 0.3, -10 - 14 * r(), 0.8 + 1.6 * r(), 0.6 + r(), 0.8 + 1.4 * r(), i, r() * 6, i % 3); }
  // the overlook: flagstone platform, a two-pipe rail on posts, a coin telescope, a bench
  b.add(slab([[-1, -4.9], [13, -4.9], [13, 3], [-1, 3]], -0.3, 0.32, 0.05), texM("flagstone", () => P.concreteHD()));
  const RZ = SPOT.RAIL_Z, railM = col("#41604a");
  for (let x = -0.6; x <= 12.7; x += 1.6) b.add(rod(V(x, 0.1, RZ), V(x, 1.08, RZ), 0.045), railM);
  for (const y of [0.58, 1.05]) b.add(rod(V(-0.6, y, RZ), V(12.6, y, RZ), 0.04), railM);
  b.add(rod(V(10.6, 0.1, RZ + 0.5), V(10.6, 1.15, RZ + 0.5), 0.06), col("#3a3a40"));
  b.add(rbox(0.36, 0.28, 0.55, 0.08), col("#4a6a8a"), M4(10.6, 1.3, RZ + 0.5, 0, 0.25));
  for (const s of [-1, 1]) b.add(cached("scopeEye", () => new THREE.CylinderGeometry(0.07, 0.07, 0.14, 12).rotateX(Math.PI / 2)), col("#2a2a30"), M4(10.6 + s * 0.1, 1.34, RZ + 0.8, 0, 0.25));
  rb(b, col("#8a6a4a"), 1.0, 3.0, 0.42, 0.5, 1.4, 1.85, 0.03); for (const x of [1.2, 2.8]) rb(b, col("#5a4a3a"), x - 0.05, x + 0.05, 0.1, 0.42, 1.45, 1.8, 0.02);
  for (let i = 0; i < 12; i++) { const r = rng(400 + i); yucca(b, -6 + 26 * r(), 4 + 12 * r(), 1.2 + 0.8 * r(), 410 + i); }
  sage(b, 6, 6, 3, 30, 60, 7, (x, z) => z < 4 && x > -2 && x < 14);
  sage(b, 0, -20, 8, 40, 60, 8, (x, z) => Math.abs(x) < hw + 3 && z < -18, caveGround);
  desertHorizon(b, 51, false, false);
  return done("cave", b);
};

// ---- interiors ----
/** a room shell: floor, four walls, ceiling (no shadows cast, so the window key gets in); walls inward */
const room = (sh: Batch, x0: number, x1: number, z0: number, z1: number, H: number, floor: Mat, wall: Mat, ceil: Mat, wallFront?: Mat) => {
  sh.add(ground(x0, x1, z0, z1, 0, 1), floor);
  sh.add(quad(V(x0, 0, z0), V(x1, 0, z0), V(x1, H, z0), V(x0, H, z0), (x1 - x0) / 1, H / 1), wall);   // back (faces +z)
  sh.add(quad(V(x1, 0, z1), V(x0, 0, z1), V(x0, H, z1), V(x1, H, z1), (x1 - x0) / 1, H / 1), wallFront ?? wall);
  sh.add(quad(V(x0, 0, z1), V(x0, 0, z0), V(x0, H, z0), V(x0, H, z1), (z1 - z0) / 1, H / 1), wall);   // left (faces +x)
  sh.add(quad(V(x1, 0, z0), V(x1, 0, z1), V(x1, H, z1), V(x1, H, z0), (z1 - z0) / 1, H / 1), wall);
  sh.add(quad(V(x0, H, z0), V(x1, H, z0), V(x1, H, z1), V(x0, H, z1), (x1 - x0) / 2, (z1 - z0) / 2), ceil);
};
const floorM = () => texM("floorPlanks", () => rep(P.planksHD(), 1, 1));
const woodM = (c = "#9a6a42") => col(c);
const jar = (b: Batch, x: number, y: number, z: number, h: number, c: string, lidC = "#c9a24a") => {
  b.add(lathe("jar", [[0, 0], [0.5, 0], [0.55, 0.12], [0.55, 0.82], [0.42, 0.92], [0.42, 1], [0, 1]], 16), col(c), M4(x, y, z, 0, 0, 0, [h * 0.6, h, h * 0.6]));
  b.add(cached("jarLid", () => new THREE.CylinderGeometry(0.46, 0.46, 0.14, 16)), col(lidC), M4(x, y + h, z, 0, 0, 0, [h * 0.6, h, h * 0.6]));
};
const deskLamp = (b: Batch, x: number, y: number, z: number, shade = "#2f6a4a", ry = 0) => {
  b.add(lathe("lampFoot", [[0, 0], [0.12, 0], [0.12, 0.03], [0.03, 0.05], [0, 0.05]], 14), col("#3a3a40"), M4(x, y, z));
  b.add(rod(V(x, y + 0.04, z), V(x + 0.06 * Math.cos(ry), y + 0.36, z - 0.06 * Math.sin(ry)), 0.014), col("#3a3a40"));
  b.add(lathe("lampShade", [[0.03, 0.12], [0.08, 0.1], [0.15, 0.0], [0.155, -0.01], [0, -0.01]], 16), col(shade), M4(x + 0.1 * Math.cos(ry), y + 0.42, z - 0.1 * Math.sin(ry), ry, 0.5));
  b.add(cached("bulb", () => new THREE.SphereGeometry(0.045, 10, 8)), glow("#ffe0a0", 2.6), M4(x + 0.12 * Math.cos(ry), y + 0.36, z - 0.12 * Math.sin(ry)));
};
const windowGlow = (b: Batch, x0: number, x1: number, y0: number, y1: number, z: number, c = "#fff0cc", k = 1.5, frame = "#f4f0e4") => {
  b.add(quad(V(x0, y0, z), V(x1, y0, z), V(x1, y1, z), V(x0, y1, z)), glow(c, k));
  for (const x of [x0, (x0 + x1) / 2, x1]) rb(b, col(frame), x - 0.04, x + 0.04, y0, y1, z, z + 0.06, 0.01);
  for (const y of [y0, (y0 + y1) / 2, y1]) rb(b, col(frame), x0, x1, y - 0.04, y + 0.04, z, z + 0.06, 0.01);
  rb(b, col(frame), x0 - 0.1, x1 + 0.1, y0 - 0.12, y0 - 0.02, z, z + 0.16, 0.02);
};

// workshop: the dentist-inventor's bench, shelves of jars, a pegboard, the planning table with the model town
const modelHouse = (b: Batch, x: number, y: number, z: number, s: number, ry: number) => {
  const m = M4(x, y, z, ry, 0, 0, [s, s, s]);
  const put = (g: THREE.BufferGeometry, mat: Mat, lm = new THREE.Matrix4()) => b.add(g, mat, m.clone().multiply(lm));
  put(rbox(1, 0.62, 0.8, 0.03), texM("shoji", () => P.shojiHD()), M4(0, 0.31, 0));
  put(rbox(1.08, 0.06, 0.88, 0.02), woodM("#6a4a32"), M4(0, 0.03, 0));
  for (const sx of [-0.5, 0.5]) for (const sz of [-0.4, 0.4]) put(rbox(0.07, 0.62, 0.07, 0.01), woodM("#5a3a24"), M4(sx, 0.31, sz));
  for (const sd of [-1, 1]) put(rbox(1.3, 0.05, 0.62, 0.02), texM("roofTile", () => P.roofTileHD()), M4(0, 0.78, sd * 0.24, 0, 0, sd * 0.62));
  put(rbox(1.34, 0.08, 0.08, 0.03), col("#3a3e48"), M4(0, 0.97, 0));
};
const buildWorkshop = (): SetRig => {
  const b = new Batch(), sh = new Batch();
  const wallM = texM("wallWorkshop", () => P.wallpaperHD("ws", "#a9bca2", "#9db096"));
  room(sh, -3.6, 7.6, -3.0, 5.2, 3.1, floorM(), wallM, col("#e6dcc8"));
  rb(b, woodM("#7a5236"), -3.6, 7.6, 0, 0.9, -3.0, -2.96, 0.01);   // wainscot
  windowGlow(b, -1.6, 0.6, 1.15, 2.45, -2.94, "#fff2cc", 1.55);
  // the bench (free-standing): thick top, legs, a shelf, a vice, a lamp, jars, a spool, a row of tiny capsules
  const [bx, , bz] = SPOT.BENCH, by = SPOT.BENCH_Y;
  rb(b, woodM("#b07a48"), bx - 1.3, bx + 1.3, by - 0.08, by, bz - 0.42, bz + 0.42, 0.03, 0.8);
  for (const sx of [-1.2, 1.2]) for (const sz of [-0.34, 0.34]) rb(b, woodM("#8a5a34"), bx + sx - 0.05, bx + sx + 0.05, 0, by - 0.08, bz + sz - 0.05, bz + sz + 0.05, 0.02);
  rb(b, woodM("#8a5a34"), bx - 1.25, bx + 1.25, 0.25, 0.3, bz - 0.36, bz + 0.36, 0.02);
  rb(b, col("#3a5a7a"), bx + 0.9, bx + 1.15, by, by + 0.14, bz - 0.3, bz - 0.12, 0.02);   // vice
  rb(b, col("#3a5a7a"), bx + 0.92, bx + 1.13, by + 0.14, by + 0.2, bz - 0.36, bz - 0.06, 0.02);
  deskLamp(b, bx + 0.62, by, bz - 0.26, "#2f6a4a", 2.4);
  jar(b, bx - 1.0, by, bz - 0.25, 0.16, "#c9e0d8"); jar(b, bx - 0.82, by, bz - 0.28, 0.12, "#e8c47a"); jar(b, bx - 0.9, by, bz - 0.08, 0.1, "#d0a8a0");
  b.add(cached("spool", () => new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12)), col("#c0353a"), M4(bx + 0.3, by + 0.03, bz + 0.2));
  for (let k = 0; k < 4; k++) b.add(cached("capsuleS", () => new THREE.CapsuleGeometry(0.012, 0.035, 4, 8).rotateZ(Math.PI / 2)), col("#6e7d3c"), M4(bx + 0.18 + k * 0.05, by + 0.012, bz + 0.3));
  rb(b, col("#f6f0e0"), bx + 0.25, bx + 0.6, by, by + 0.004, bz - 0.05, bz + 0.18, 0.001);
  // back wall: shelves with jars + boxes, a pegboard with tool silhouettes, a framed tooth chart (no words)
  for (const y of [1.4, 1.85, 2.3]) { rb(b, woodM("#8a5a34"), 1.2, 3.4, y, y + 0.04, -3.0, -2.74, 0.01); for (let k = 0; k < 6; k++) jar(b, 1.35 + k * 0.36, y + 0.04, -2.86, 0.14 + 0.06 * ((k * 7 + y * 10) % 3), ["#c9e0d8", "#e8c47a", "#d8b0a0", "#b8c8e8"][k % 4]); }
  rb(b, col("#c9a878"), -3.4, -2.0, 1.1, 2.3, -2.98, -2.94, 0.01);
  for (let k = 0; k < 5; k++) rb(b, col("#4a4a52"), -3.25 + k * 0.26, -3.18 + k * 0.26, 1.4 + 0.1 * (k % 2), 2.0, -2.94, -2.9, 0.01);
  rb(b, col("#f4f0e4"), 4.2, 5.4, 1.3, 2.3, -2.98, -2.94, 0.01); rb(b, col("#c0353a"), 4.15, 5.45, 1.25, 1.3, -2.98, -2.93, 0.005);
  // a dentist's chair in the corner (cream + red)
  rb(b, col("#c0353a"), 5.9, 6.7, 0.45, 0.6, -2.4, -1.6, 0.06); rb(b, col("#c0353a"), 5.9, 6.7, 0.6, 1.5, -2.5, -2.32, 0.06);
  b.add(rod(V(6.3, 0, -2.0), V(6.3, 0.45, -2.0), 0.08), col("#e8e4da"));
  // the planning table with the model town (a felt base board, a river, paths, two little trees)
  const [tx, , tz] = SPOT.TABLE, ty = SPOT.TABLE_Y;
  rb(b, woodM("#7a5236"), tx - 1.05, tx + 1.05, ty - 0.06, ty, tz - 0.75, tz + 0.75, 0.03);
  for (const sx of [-0.95, 0.95]) for (const sz of [-0.65, 0.65]) rb(b, woodM("#6a4a2c"), tx + sx - 0.05, tx + sx + 0.05, 0, ty - 0.06, tz + sz - 0.05, tz + sz + 0.05, 0.02);
  rb(b, col("#8fa86a"), tx - 0.95, tx + 0.95, ty, ty + 0.02, tz - 0.65, tz + 0.65, 0.01);
  b.add(slab([[tx - 0.95, tz + 0.3], [tx + 0.95, tz + 0.15], [tx + 0.95, tz + 0.27], [tx - 0.95, tz + 0.42]], ty + 0.02, 0.006, 0.002), col("#5a9ac8"));
  const r = rng(61);
  for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) {
    if (k === 3 && i % 2) continue;
    modelHouse(b, tx - 0.78 + i * 0.3 + (r() - 0.5) * 0.04, ty + 0.02, tz - 0.5 + k * 0.28 + (k > 1 ? 0.18 : 0) + (r() - 0.5) * 0.04, 0.16 + 0.03 * r(), (r() - 0.5) * 0.3);
  }
  for (const [x, z] of [[tx + 0.8, tz - 0.5], [tx - 0.85, tz + 0.55]]) { b.add(lobeGeo(1), col("#6a8a4a"), M4(x, ty + 0.1, z, 0, 0, 0, [0.06, 0.07, 0.06])); b.add(rod(V(x, ty, z), V(x, ty + 0.06, z), 0.008), col("#6a4a32")); }
  const rig = done("workshop", b);
  const shell = new THREE.Group(); sh.build(shell, false); rig.group.add(shell);
  return rig;
};

// attic: the cutaway model house on a low plinth in a dark room, front open
const buildAttic = (): SetRig => {
  const b = new Batch(), sh = new Batch();
  room(sh, -4, 4, -3, 4, 3.4, floorM(), texM("wallAttic", () => P.wallpaperHD("at", "#6a7488", "#626c80")), col("#3a3a44"));
  rb(b, col("#4a3a34"), -1.0, 1.0, 0, 0.12, -0.7, 0.7, 0.03);
  const W = 0.42, D = 0.4, wood = woodM("#8a5a34"), paper = texM("shojiBig", () => P.shojiHD()), dark = col("#5a3c2a"), cut = col("#e8d8b8");
  const y0 = 0.12;
  // back + side walls (paper screens in a wooden frame), floors, the cut edges in pale wood
  rb(b, paper, -W, W, y0, y0 + 0.92, -D - 0.03, -D, 0.005);
  for (const s of [-1, 1]) rb(b, paper, s * W - 0.015, s * W + 0.015, y0, y0 + 0.92, -D, D, 0.005);
  for (const y of [y0, y0 + 0.46, y0 + 0.92]) rb(b, cut, -W - 0.02, W + 0.02, y - 0.03, y, -D - 0.03, D + 0.01, 0.005);
  for (const x of [-W, W]) rb(b, cut, x - 0.025, x + 0.025, y0, y0 + 0.92, D - 0.02, D + 0.02, 0.005);
  // rooms: a low table + cushions downstairs, a futon upstairs, a lantern
  rb(b, wood, -0.14, 0.14, y0, y0 + 0.08, -0.12, 0.12, 0.01); rb(b, col("#c0353a"), -0.32, -0.2, y0, y0 + 0.03, -0.08, 0.08, 0.01); rb(b, col("#3a6ea8"), 0.2, 0.32, y0, y0 + 0.03, -0.08, 0.08, 0.01);
  rb(b, col("#f4efe2"), -0.36, 0.0, y0 + 0.46, y0 + 0.5, -0.3, 0.05, 0.01); rb(b, col("#c9a24a"), -0.36, 0.0, y0 + 0.5, y0 + 0.52, -0.3, -0.1, 0.01);
  b.add(cached("lanternS", () => new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12)), glow("#ffd08a", 1.6), M4(0.25, y0 + 0.54, -0.22));
  // attic: rafters, the ridge beam (the bat hangs from it), roof slabs (front cut), dark wood inside
  const ry0 = y0 + 0.92, rh = SPOT.RIDGE5[1] + 0.06 - ry0;
  for (const s of [-1]) { // cutaway: only the back slope of the roof
    const len = Math.hypot(D + 0.08, rh), a = Math.atan2(rh, D + 0.08);
    b.add(rbox(2 * W + 0.24, 0.06, len, 0.01), texM("roofTileM", () => P.roofTileHD()), M4(0, ry0 + rh / 2 + 0.03, s * (D + 0.08) / 2 - 0.0, 0, 0, 0).multiply(new THREE.Matrix4().makeRotationX(s * a)));
    b.add(rbox(2 * W, 0.02, len - 0.04, 0.005), dark, M4(0, ry0 + rh / 2 - 0.02, s * (D + 0.08) / 2, 0, 0, 0).multiply(new THREE.Matrix4().makeRotationX(s * a)));
    for (let x = -W + 0.05; x <= W; x += 0.27) b.add(rbox(0.03, 0.04, len, 0.005), wood, M4(x, ry0 + rh / 2 - 0.05, s * (D + 0.08) / 2 - s * 0.01, 0, 0, 0).multiply(new THREE.Matrix4().makeRotationX(s * a)));
  }
  b.add(plate([[-D, 0], [D, 0], [0, rh]], 0.03, 0.005), dark, M4(-W, ry0, 0, Math.PI / 2)); b.add(plate([[-D, 0], [D, 0], [0, rh]], 0.03, 0.005), dark, M4(W, ry0, 0, Math.PI / 2));
  rb(b, wood, -W - 0.05, W + 0.05, SPOT.RIDGE5[1] - 0.02, SPOT.RIDGE5[1] + 0.04, -0.025, 0.025, 0.006);
  rb(b, cut, -W - 0.02, W + 0.02, ry0 - 0.03, ry0 + 0.005, D - 0.02, D + 0.03, 0.005);
  // the workshop around it, dim: a shelf, a stool
  rb(b, woodM("#6a4a2c"), -3.5, -1.8, 1.2, 1.25, -2.98, -2.7, 0.01); rb(b, woodM("#6a4a2c"), 2.0, 2.5, 0, 0.5, -1.2, -0.7, 0.03);
  const rig = done("attic", b);
  const shell = new THREE.Group(); sh.build(shell, false); rig.group.add(shell);
  return rig;
};

// the President's office: curved cream wall, tall windows with gold drapes, two flags, the big desk on an oval rug
const buildOval = (): SetRig => {
  const b = new Batch(), sh = new Batch();
  room(sh, -5, 5, -4.8, 4.5, 3.6, floorM(), texM("wallOval", () => P.wallpaperHD("ov", "#efe4c8", "#e8dcbc")), col("#f4eedf"));
  const curve = cached("ovalWall", () => { const g = new THREE.CylinderGeometry(4.2, 4.2, 3.6, 40, 1, true, Math.PI * 0.62, Math.PI * 0.76); return uvFrom(g, (x, y, z) => [Math.atan2(x, z) * 4, y]); });
  b.add(curve, lam("ovalCurve", () => ({ map: P.wallpaperHD("ov", "#efe4c8", "#e8dcbc"), side: THREE.BackSide })), M4(0, 1.8, -0.2));
  for (const a of [-0.55, 0.55]) {
    const x = Math.sin(Math.PI + a) * 4.05, z = -0.2 + Math.cos(Math.PI + a) * 4.05;
    b.add(quad(V(-0.55, 0.9, 0), V(0.55, 0.9, 0), V(0.55, 2.9, 0), V(-0.55, 2.9, 0)), glow("#fff4dc", 1.45), M4(x, 0, z, a));
    for (const s of [-1, 1]) b.add(rbox(0.38, 2.9, 0.12, 0.06), col("#c9a24a"), M4(x + Math.cos(a) * s * 0.75, 1.65, z - Math.sin(a) * s * 0.75 + 0.05, a));
    b.add(rbox(1.9, 0.22, 0.16, 0.04), col("#b8903a"), M4(x, 3.1, z + 0.06, a));
  }
  rb(b, col("#f6f1e4"), -5, 5, 3.4, 3.6, -4.2, 4.5, 0.02);
  // flags on poles behind the desk
  for (const [x, z, tex] of [[-1.3, -3.4, 0], [1.3, -3.4, 1]] as [number, number, number][]) {
    b.add(rod(V(x, 0, z), V(x, 2.7, z), 0.03), col("#c9a24a"));
    b.add(cached("eagle", () => new THREE.SphereGeometry(0.06, 10, 8)), col("#e2c45a"), M4(x, 2.74, z));
    const drape = cached("flagDrape", () => { const g = new THREE.PlaneGeometry(0.62, 1.1, 8, 8); const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setZ(i, 0.06 * Math.sin(p.getY(i) * 7 + p.getX(i) * 3)); g.computeVertexNormals(); return g; });
    b.add(drape, tex ? col("#24376a", THREE.DoubleSide) : lam("flagCloth2", () => ({ map: P.flagHD(), side: THREE.DoubleSide })), M4(x + 0.33, 2.05, z, 0, -0.15));
  }
  // the rug, the desk (dark wood, green leather top), a lamp, a phone, a pen set, the drawing
  b.add(cached("rug", () => new THREE.PlaneGeometry(5.2, 3.3).rotateX(-Math.PI / 2)), lam("rugM", () => ({ map: P.rugHD(), transparent: true, alphaTest: 0.5 })), M4(0, 0.012, -0.3));
  const [dx, , dz] = SPOT.DESK6, dy = SPOT.DESK_Y, dw = col("#5a3420");
  rb(b, dw, dx - 1.05, dx + 1.05, dy - 0.07, dy, dz - 0.48, dz + 0.48, 0.03);
  rb(b, col("#3a6a4a"), dx - 0.9, dx + 0.9, dy, dy + 0.005, dz - 0.38, dz + 0.36, 0.003);
  rb(b, dw, dx - 1.0, dx + 1.0, 0, dy - 0.07, dz + 0.36, dz + 0.44, 0.03);                       // modesty panel (hides the legs)
  for (const s of [-1, 1]) rb(b, dw, dx + s * 0.72 - 0.26, dx + s * 0.72 + 0.26, 0, dy - 0.07, dz - 0.44, dz + 0.4, 0.03);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) rb(b, col("#7a4a2c"), dx + s * 0.72 - 0.2, dx + s * 0.72 + 0.2, 0.12 + k * 0.2, 0.28 + k * 0.2, dz + 0.4, dz + 0.43, 0.01);
  rb(b, col("#c9a24a"), dx - 0.5, dx + 0.5, 0.36, 0.42, dz + 0.44, dz + 0.46, 0.005);
  deskLamp(b, dx - 0.78, dy, dz - 0.25, "#2f6a4a", 0.4);
  rb(b, col("#2a2a30"), dx + 0.6, dx + 0.82, dy, dy + 0.06, dz - 0.25, dz - 0.1, 0.02); b.add(rod(V(dx + 0.6, dy + 0.1, dz - 0.18), V(dx + 0.82, dy + 0.1, dz - 0.18), 0.025), col("#2a2a30"));
  b.add(cached("penset", () => new THREE.CylinderGeometry(0.05, 0.06, 0.04, 12)), col("#c9a24a"), M4(dx + 0.3, dy + 0.02, dz - 0.3));
  const [px, py, pz] = SPOT.PAPER6;
  b.add(cached("paper6", () => new THREE.PlaneGeometry(0.42, 0.3).rotateX(-Math.PI / 2)), lam("drawingM", () => ({ map: P.drawingHD() })), M4(px, py, pz, 0.12));
  // a bookcase + a fireplace mantel at the sides
  const rig = done("oval", b);
  const shell = new THREE.Group(); sh.build(shell, false); rig.group.add(shell);
  return rig;
};

// the chemistry lab: teal-white tiles, a black-topped bench, glowing flasks, a burner, bubbles (tick)
const flask = (b: Batch, x: number, y: number, z: number, s: number, liquid: string, k: number, kind = 0) => {
  const glass = lam("glass", () => ({ color: "#cfe8ec", transparent: true, opacity: 0.45, depthWrite: false }));
  const prof: [number, number][] = kind === 0 ? [[0, 0], [0.25, 0.02], [0.45, 0.2], [0.5, 0.42], [0.42, 0.62], [0.13, 0.78], [0.12, 1.05], [0.14, 1.08]]
    : kind === 1 ? [[0, 0], [0.5, 0], [0.5, 0.04], [0.16, 0.72], [0.16, 1.0], [0.18, 1.03]] : [[0, 0], [0.12, 0], [0.12, 1.0], [0.14, 1.02]];
  b.add(lathe("flask" + kind, prof, 18), glass, M4(x, y, z, 0, 0, 0, [s, s, s]));
  const lp: [number, number][] = kind === 0 ? [[0, 0], [0.24, 0.02], [0.43, 0.2], [0.48, 0.42], [0.43, 0.56], [0, 0.56]] : kind === 1 ? [[0, 0], [0.47, 0], [0.47, 0.04], [0.33, 0.36], [0, 0.36]] : [[0, 0], [0.11, 0], [0.11, 0.55], [0, 0.55]];
  b.add(lathe("liquid" + kind, lp, 18), glow(liquid, k), M4(x, y + 0.004, z, 0, 0, 0, [s * 0.98, s, s * 0.98]));
};
const buildLab = (): SetRig => {
  const b = new Batch(), sh = new Batch();
  room(sh, -4, 4, -2.8, 4.2, 3.2, texM("labFloor", () => P.concreteHD()), texM("labTile", () => rep(P.tileHD("#dbece6"), 1, 1)), col("#e4ece8"));
  windowGlow(b, -3.2, -1.6, 1.0, 2.8, -2.76, "#e8f6ff", 1.5, "#dfe8e4"); windowGlow(b, 1.8, 3.4, 1.0, 2.8, -2.76, "#e8f6ff", 1.5, "#dfe8e4");
  const [lx, , lz] = SPOT.LABBENCH, ly = SPOT.LAB_Y;
  rb(b, col("#24262c"), lx - 1.3, lx + 1.3, ly - 0.05, ly, lz - 0.42, lz + 0.42, 0.02);
  rb(b, col("#e8ece6"), lx - 1.25, lx + 1.25, 0, ly - 0.05, lz - 0.38, lz + 0.38, 0.03);
  for (let k = 0; k < 4; k++) { rb(b, col("#f4f6f2"), lx - 1.2 + k * 0.62, lx - 0.66 + k * 0.62, 0.08, ly - 0.12, lz + 0.38, lz + 0.41, 0.02); b.add(cached("knobL", () => new THREE.SphereGeometry(0.025, 8, 6)), col("#3a3a40"), M4(lx - 0.93 + k * 0.62, ly - 0.25, lz + 0.43)); }
  // glassware on the bench: the hero green, an orange, a blue burner flame, a rack of test tubes, a retort stand + coil
  flask(b, lx + 0.85, ly, lz - 0.15, 0.3, "#5aff8a", 1.7, 0); flask(b, lx + 0.45, ly, lz - 0.22, 0.24, "#ffa02a", 1.6, 1); flask(b, lx - 0.95, ly, lz - 0.2, 0.26, "#5aff8a", 1.6, 1);
  rb(b, woodM("#9a6a42"), lx + 0.05, lx + 0.35, ly, ly + 0.05, lz - 0.3, lz - 0.2, 0.01);
  for (let k = 0; k < 5; k++) flask(b, lx + 0.08 + k * 0.06, ly + 0.01, lz - 0.25, 0.14, ["#5aff8a", "#ffa02a", "#8ac8ff", "#ff6a5a", "#5aff8a"][k], 1.5, 2);
  b.add(lathe("burner", [[0, 0], [0.04, 0], [0.04, 0.01], [0.012, 0.02], [0.012, 0.12], [0, 0.12]], 12), col("#8a929a"), M4(lx + 0.85, ly, lz + 0.12));
  b.add(lathe("bflame", [[0, 0], [0.018, 0.02], [0.012, 0.06], [0, 0.09]], 10), glow("#6ab0ff", 2.2), M4(lx + 0.85, ly + 0.12, lz + 0.12));
  b.add(rod(V(lx - 0.5, ly, lz - 0.3), V(lx - 0.5, ly + 0.7, lz - 0.3), 0.012), col("#8a929a"));
  b.add(new THREE.TorusGeometry(0.06, 0.012, 6, 16).rotateX(Math.PI / 2), col("#8a929a"), M4(lx - 0.42, ly + 0.45, lz - 0.3));
  b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 30 }, (_, i) => V(lx - 0.2 + 0.05 * Math.cos(i * 1.2), ly + 0.18 + i * 0.012, lz - 0.3 + 0.05 * Math.sin(i * 1.2)))), 60, 0.008, 5), lam("glass2", () => ({ color: "#bfe6ee" })));
  // shelves of bottles on the back wall, a fume hood, a periodic-ish chart of coloured squares (no letters)
  for (const y of [1.3, 1.75, 2.2]) { rb(b, col("#c9d2ce"), -1.2, 1.4, y, y + 0.03, -2.8, -2.55, 0.01); for (let k = 0; k < 8; k++) jar(b, -1.08 + k * 0.32, y + 0.03, -2.68, 0.15 + 0.07 * ((k * 3) % 2), ["#8a5a34", "#3a6a4a", "#c9e0d8", "#4a3a6a"][k % 4], "#2a2a30"); }
  for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) rb(b, col(["#e8c47a", "#8ac8e8", "#e88a7a", "#9ad89a"][(i + k) % 4]), 2.0 + i * 0.2, 2.17 + i * 0.2, 1.1 + k * 0.2, 1.27 + k * 0.2, -2.79, -2.77, 0.005);
  rb(b, col("#c9d2ce"), -3.9, -2.6, 0, 2.6, -2.8, -2.0, 0.04);
  // bubbles rising in the big green flask (posed in tick)
  const rig = done("lab", b);
  const shell = new THREE.Group(); sh.build(shell, false); rig.group.add(shell);
  const bub: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(cached("bub", () => new THREE.SphereGeometry(1, 8, 6)), glow("#c8ffd6", 1.8)); bub.push(m); rig.group.add(m); }
  rig.tick = (t) => bub.forEach((m, i) => {
    const u = (t * 0.9 + i / 6) % 1, big = i < 3;
    const [fx, fz, s] = big ? [lx + 0.85, lz - 0.15, 0.3] : [lx - 0.95, lz - 0.2, 0.26];
    m.position.set(fx + 0.04 * Math.sin(i * 2 + t * 5), ly + 0.03 + u * 0.15 * s / 0.3, fz + 0.03 * Math.cos(i * 3)); m.scale.setScalar(0.008 + 0.01 * u);
  });
  return rig;
};

// the War Department office: grey walls, filing cabinets, the desk, the money bags, the wastebasket, the dusk window
const moneyBag = (b: Batch, x: number, y: number, z: number, s: number, ry: number) => {
  b.add(lathe("bag", [[0, 0], [0.38, 0.03], [0.5, 0.25], [0.46, 0.55], [0.26, 0.78], [0.12, 0.86], [0.16, 0.95], [0.2, 1.02], [0.1, 1.04], [0, 1.0]], 18), texM("bagCloth", () => P.hessianHD()), M4(x, y, z, ry, 0, 0, [s, s, s]));
  b.add(cached("bagTie", () => new THREE.TorusGeometry(0.13, 0.03, 6, 14).rotateX(Math.PI / 2)), col("#8a5a34"), M4(x, y + 0.86 * s, z, 0, 0, 0, [s, s, s]));
  b.add(cached("bagPatch", () => new THREE.CircleGeometry(0.1, 16)), col("#c0353a"), M4(x + Math.sin(ry) * 0.47 * s, y + 0.38 * s, z + Math.cos(ry) * 0.47 * s, ry));
};
const buildOffice = (): SetRig => {
  const b = new Batch(), sh = new Batch();
  room(sh, -3.5, 3.5, -3.0, 3.6, 3.0, texM("officeFloor", () => rep(P.planksHD(), 1, 1)), texM("wallOffice", () => P.wallpaperHD("of", "#9a9e96", "#929690")), col("#c9cbc4"));
  rb(b, col("#6a6e66"), -3.5, 3.5, 0, 0.95, -3.0, -2.96, 0.01);
  b.add(quad(V(-1.9, 1.0, -2.95), V(-0.3, 1.0, -2.95), V(-0.3, 2.6, -2.95), V(-1.9, 2.6, -2.95)), (() => { const m = new THREE.MeshBasicMaterial({ map: P.duskWindowHD(), color: new THREE.Color(1.35, 1.3, 1.25) }); return m; })());
  rb(b, col("#d8d4c8"), -2.0, -0.2, 0.9, 1.0, -2.96, -2.8, 0.02); for (const x of [-1.95, -0.25]) rb(b, col("#d8d4c8"), x - 0.05, x + 0.05, 1.0, 2.6, -2.96, -2.9, 0.01);
  // filing cabinets, a coat stand, a wall clock without numerals, a framed map of coloured blobs
  for (const x of [1.6, 2.2, 2.8]) { rb(b, col("#7a7f74"), x - 0.28, x + 0.28, 0, 1.35, -2.95, -2.35, 0.03); for (let k = 0; k < 4; k++) { rb(b, col("#868b80"), x - 0.24, x + 0.24, 0.08 + k * 0.32, 0.36 + k * 0.32, -2.36, -2.33, 0.01); rb(b, col("#c9c4b0"), x - 0.06, x + 0.06, 0.28 + k * 0.32, 0.31 + k * 0.32, -2.33, -2.3, 0.005); } }
  b.add(cached("clock", () => new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24).rotateX(Math.PI / 2)), col("#f4f0e4"), M4(0.6, 2.35, -2.95));
  b.add(rbox(0.02, 0.15, 0.01, 0.003), col("#2a2a30"), M4(0.6, 2.4, -2.92)); b.add(rbox(0.11, 0.02, 0.01, 0.003), col("#2a2a30"), M4(0.65, 2.35, -2.92));
  rb(b, col("#c9b48a"), 0.0, 1.2, 1.2, 1.95, -2.98, -2.95, 0.01);
  for (const [x, y, c] of [[0.3, 1.5, "#8aa86a"], [0.7, 1.7, "#d8a86a"], [0.9, 1.4, "#8ab8d8"]] as [number, number, string][]) b.add(cached("blob", () => new THREE.CircleGeometry(0.15, 10)), col(c), M4(x, y, -2.94));
  // the desk: steel grey with a dark green top, the money bags, the filing tray, a lamp, the wastebasket on the floor
  const [dx, , dz] = SPOT.ODESK, dy = SPOT.ODESK_Y;
  rb(b, col("#3d5a46"), dx - 0.95, dx + 0.95, dy - 0.05, dy, dz - 0.45, dz + 0.45, 0.02);
  rb(b, col("#6f7570"), dx - 0.92, dx + 0.92, 0, dy - 0.05, dz + 0.32, dz + 0.42, 0.02);
  for (const s of [-1, 1]) rb(b, col("#6f7570"), dx + s * 0.65 - 0.25, dx + s * 0.65 + 0.25, 0, dy - 0.05, dz - 0.42, dz + 0.4, 0.02);
  const [bgx, bgy, bgz] = SPOT.BAGS14;
  moneyBag(b, bgx - 0.1, bgy, bgz, 0.36, 0.3); moneyBag(b, bgx + 0.22, bgy, bgz - 0.05, 0.32, -0.4); moneyBag(b, bgx + 0.05, bgy, bgz + 0.24, 0.3, 0.9); moneyBag(b, bgx + 0.06, bgy + 0.3, bgz + 0.06, 0.28, 0.1);
  moneyBag(b, -2.4, 0, -2.4, 0.5, 0.4); moneyBag(b, -2.0, 0, -2.6, 0.44, -0.3); moneyBag(b, -2.25, 0.38, -2.5, 0.4, 1.1);
  const [tx, ty, tz] = SPOT.TRAY14;
  rb(b, col("#8a9088"), tx - 0.2, tx + 0.2, ty, ty + 0.015, tz - 0.15, tz + 0.15, 0.005);
  for (const s of [-1, 1]) rb(b, col("#8a9088"), tx + s * 0.2 - 0.01, tx + s * 0.2 + 0.01, ty, ty + 0.07, tz - 0.15, tz + 0.15, 0.003);
  rb(b, col("#8a9088"), tx - 0.2, tx + 0.2, ty, ty + 0.07, tz - 0.16, tz - 0.14, 0.003);
  deskLamp(b, dx - 0.7, dy, dz - 0.3, "#2f6a4a", 0.6);
  rb(b, col("#f6f0e0"), dx - 0.2, dx + 0.2, dy, dy + 0.01, dz - 0.1, dz + 0.18, 0.002);
  const [wx, , wz] = SPOT.BASKET14;
  b.add(lathe("basket", [[0, 0], [0.17, 0], [0.17, 0.01], [0.21, 0.38], [0.2, 0.39], [0.155, 0.02], [0, 0.02]], 20), col("#4f5a4a"), M4(wx, 0, wz));
  for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28; b.add(rod(V(wx + Math.cos(a) * 0.17, 0, wz + Math.sin(a) * 0.17), V(wx + Math.cos(a) * 0.21, 0.38, wz + Math.sin(a) * 0.21), 0.006), col("#2f362c")); }
  b.add(cached("rimB", () => new THREE.TorusGeometry(0.21, 0.012, 6, 24).rotateX(Math.PI / 2)), col("#2f362c"), M4(wx, 0.385, wz));
  const rig = done("office", b);
  const shell = new THREE.Group(); sh.build(shell, false); rig.group.add(shell);
  return rig;
};

/** every set of the film; world.ts adds the groups and toggles .visible per shot */
export const buildSets = (): Record<SetName, SetRig> => ({
  desert: buildDesert(), base: buildBase(), cave: buildCave(), workshop: buildWorkshop(), attic: buildAttic(), oval: buildOval(), lab: buildLab(), office: buildOffice(),
});

// =================================================================================================================
// RIGS: the hook's bomb casing (panels hinge open), the bat crate of shot 8 (lid). Built once, posed per frame.
// =================================================================================================================
export type BombRig = { root: THREE.Group; panels: THREE.Group[] };
const buildBomb = (): BombRig => {
  const root = new THREE.Group(), b = new Batch(), olive = texM("oliveBomb", () => P.oliveHD());
  // vertical, nose down: nose cone below, the panel section (4 quarter shells), the tail cone + 4 fins + a box ring above
  b.add(lathe("bombNose", [[0.0, -1.55], [0.18, -1.5], [0.38, -1.36], [0.52, -1.12], [0.58, -0.86], [0.58, -0.8], [0.0, -0.8]], 28), olive);
  b.add(cached("bombBand", () => new THREE.CylinderGeometry(0.595, 0.595, 0.12, 28)), col("#e2c040"), M4(0, -0.95, 0));
  b.add(lathe("bombTail", [[0.0, 0.85], [0.58, 0.85], [0.56, 1.05], [0.42, 1.4], [0.24, 1.62], [0.0, 1.66]], 28), olive);
  for (let k = 0; k < 4; k++) b.add(plate([[0, 0], [0.62, 0.15], [0.62, 0.92], [0.1, 0.8]], 0.05, 0.015), col("#5f6a34"), M4(0, 1.0, 0, (k * Math.PI) / 2, 0, 0).multiply(M4(0.2, 0, 0)));
  b.add(cached("finRing", () => new THREE.CylinderGeometry(0.86, 0.86, 0.3, 32, 1, true)), lam("finRingM", () => ({ color: "#5f6a34", side: THREE.DoubleSide })), M4(0, 1.75, 0));
  b.add(cached("bombCore", () => new THREE.CylinderGeometry(0.42, 0.42, 1.7, 20)), col("#2e2a2a"), M4(0, 0.02, 0));
  for (let k = 0; k < 4; k++) b.add(cached("tray", () => new THREE.CylinderGeometry(0.5, 0.5, 0.04, 20)), col("#8a7a5a"), M4(0, -0.6 + k * 0.42, 0));
  b.build(root, true);
  const panels: THREE.Group[] = [];
  for (let k = 0; k < 4; k++) {
    const hinge = new THREE.Group(), pb = new Batch();
    const shell = cached("bombPanel", () => { const g = new THREE.CylinderGeometry(0.6, 0.6, 1.66, 10, 1, true, -Math.PI / 4 + 0.03, Math.PI / 2 - 0.06); g.translate(0, -0.83, 0); return uvFrom(g, (x, y, z) => [Math.atan2(x, z), y]); });
    pb.add(shell, lam("bombPanelM", () => ({ map: P.oliveHD(), side: THREE.DoubleSide })));
    pb.add(cached("panelRivets", () => { const parts: THREE.BufferGeometry[] = []; for (let i = 0; i < 5; i++) parts.push(new THREE.SphereGeometry(0.025, 6, 4).translate(0, -0.2 - i * 0.3, 0.6)); return mergeGeometries(parts, false); }), col("#3a4020"));
    pb.build(hinge, true);
    hinge.position.set(0, 0.84, 0); hinge.rotation.y = (k * Math.PI) / 2;
    const pivot = new THREE.Group(); pivot.add(hinge); root.add(pivot); panels.push(hinge);
  }
  return { root, panels };
};
export type CrateRig = { root: THREE.Group; lid: THREE.Group };
const buildCrate = (): CrateRig => {
  const root = new THREE.Group(), lid = new THREE.Group(), b = new Batch(), l = new Batch(), m = lam("batCrate", () => ({ map: P.batCrateHD() }));
  b.add(rbox(0.9, 0.56, 0.62, 0.03), m, M4(0, 0, 0));
  for (const s of [-1, 1]) b.add(rbox(0.06, 0.06, 0.3, 0.02), col("#6a4a2c"), M4(s * 0.48, 0.12, 0));
  l.add(rbox(0.94, 0.06, 0.66, 0.02), m, M4(0, 0.03, 0.33));
  b.build(root, true); l.build(lid, true);
  lid.position.set(0, 0.28, -0.33); root.add(lid);
  return { root, lid };
};
export type Rigs = { bomb: BombRig; crate: CrateRig };
export const buildRigs = (): Rigs => ({ bomb: buildBomb(), crate: buildCrate() });
export const poseBomb = (r: BombRig, p: BombPose) => {
  r.root.visible = p.visible;
  if (!p.visible) return;
  r.root.position.set(...p.pos); r.root.rotation.set(p.tilt * 0.6, p.spin, p.tilt, "YXZ");
  r.panels.forEach((h, k) => h.rotation.set(-1.9 * p.open, (k * Math.PI) / 2, 0, "YXZ"));
  r.root.updateMatrixWorld(true);
};
export const poseCrate = (r: CrateRig, p: CratePose) => {
  r.root.visible = p.visible;
  if (!p.visible) return;
  r.root.position.set(p.pos[0], p.pos[1], p.pos[2]); r.root.rotation.set(0, p.yaw, p.jolt, "YXZ");
  r.lid.rotation.x = -p.lid;
  r.root.updateMatrixWorld(true);
};

// =================================================================================================================
// FOREGROUND framing props (story.ts FOREGROUND, composition.md 3.3). world.ts calls fgUpdate(group, id, f, cam) every
// frame; the kits are built once into `group` (cached by kit name) and placed in camera space ("cam") or world space.
// Kit front = local +z (faces the lens). The shot's DOF blurs them.
// =================================================================================================================
const fgKit = (kit: string): THREE.Group => {
  const g = new THREE.Group(), b = new Batch();
  switch (kit) {
    case "yucca": yucca(b, 0, 0, 1.6, 7); addVeg(b, "bush", 0.8, 0, 0.4, 0.7, 3, 0); break;
    case "sandbags": sandbagRing(b, 0, 0, 1.2, -0.9, 0.9, 3, 7); break;
    default: for (const [dx, dy, ry] of [[0, 0, 0.1], [0.82, 0, -0.1], [0.4, 0.6, 0.25]]) b.add(rbox(0.8, 0.6, 0.6, 0.03), lam("batCrate", () => ({ map: P.batCrateHD() })), M4(dx, dy + 0.3, 0, ry));
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
