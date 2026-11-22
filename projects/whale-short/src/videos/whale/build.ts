// Sets for "The Exploding Whale" (owner: sets, with paint.ts): Florence, Oregon, 1970. Every set is one THREE.Group
// built at the world origin in its own frame (story.ts SPOT anchors); world.ts shows only the active shot's set. Set
// meshes stay on camera layer 0, so the world ink pass outlines them. Shapes are chunky and bevelled (rbox, lathes,
// lofts, extrusions, displaced lumps) and every material is two-tone (lam -> twoTone). Sets: the beach (sand, wet sand,
// surf foam, dunes with beach grass and a sand fence, spruce hills, the basalt headland with the white lighthouse,
// driftwood, the car park; the WHALE intact / bitten, dynamite bundles, 20 crates, the plunger box, the rope, the
// easel, the orange highway truck, the bulldozer, the sand mound + flag, posed by the set's tick from story.ts
// timelines), the distant parking lot (the lime sedan, intact / flattened, and the falling chunk), the present-day park.
// CONTRACTS: buildSets(), SET_META, SetRig, fgUpdate(), CLOCK (read by world.ts).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as P from "./paint";
import { rng, rep, ctex } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";
import { SPOT, SetName, FOREGROUND, EV, beachY, ropeAt, smooth, clamp01, sticksK, cratesN, truckX, plungerK, whaleState, moundK, dozerAt, carFlat, chunk13Y, easeOut, V3 } from "./story";

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
const LEAF = ["#5f8a4a", "#6c9450", "#557f46", "#7a9a58", "#2f5c40"]; // coastal salal / shore pine greens; [4] = Sitka spruce
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
/** beach-grass clumps scattered in a ring (on the terrain hf when given), dune greens with straw tips */
const tufts = (b: Batch, cx: number, cz: number, r0: number, r1: number, n: number, seed: number, avoid?: (x: number, z: number) => boolean, hf?: (x: number, z: number) => number, size = 1) => {
  const r = rng(seed), m1 = col("#7f9a4e", THREE.DoubleSide), m2 = col("#a7b264", THREE.DoubleSide), m3 = col("#c9b878", THREE.DoubleSide);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = r0 + (r1 - r0) * Math.sqrt(r()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (avoid?.(x, z)) continue;
    const s = (0.8 + 0.8 * r()) * size;
    b.add(tuftGeo(), [m1, m2, m3][i % 3], M4(x, hf ? hf(x, z) - 0.03 : 0, z, r() * 6.28, 0, 0, [s * 1.3, s * 1.9, s * 1.3]));
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
const shiny = (c: string, sh = 70) => {
  const key = "shiny" + c + sh;
  let m = mats.get(key) as THREE.MeshPhongMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshPhongMaterial({ color: c, shininess: sh, specular: new THREE.Color("#8890a0") })); mats.set(key, m); }
  return m;
};
const charM = () => col("#3c3633");
const rockM = (k = 0) => texM("basalt" + k, () => P.rockHD("basaltHD" + k, ["#6f6762", "#7a716a", "#625c58"][k % 3]));

// =================================================================================================================
// SETS
// =================================================================================================================
export type SetRig = { name: SetName; group: THREE.Group; tick?: (t: number, id: number) => void };
/** per-set world settings: haze reach multiplier; sea level (null = no sea) */
export const SET_META: Record<SetName, { hazeK: number; indoor?: boolean; ceil?: number; water: number | null }> = {
  beach: { hazeK: 2.6, water: 0 }, lot: { hazeK: 2.4, water: -0.6 }, park: { hazeK: 2.6, water: -0.4 },
};
const done = (name: SetName, b: Batch, cards?: Batch): SetRig => {
  const group = new THREE.Group(); group.name = name;
  b.build(group, true);
  if (cards) buildNoInk(cards, group);
  return { name, group };
};
const FAR = 700;
const sandM = () => groundM("sand", () => P.sandHD());
const wetSandM = () => groundM("wetSand", () => P.sandHD("wetSandHD", "#b9a986"));
const asphaltM = () => groundM("asphalt", () => P.asphaltHD());
const lawnM = () => groundM("lawn", () => P.lawnHD());
const woodM = (c = "#9a6a42") => col(c);
const driftM = () => texM("drift", () => P.driftHD());
/** a sub-group built from its own batch (toggled / posed per frame by the set's tick) */
const sub = (parent: THREE.Object3D, b: Batch, cast = true) => { const g = new THREE.Group(); b.build(g, cast); parent.add(g); return g; };

// ---- coast dressing ----
/** Sitka spruce: a dark stacked cone with a trunk */
const spruce = (b: Batch, x: number, y: number, z: number, h: number, seed: number, q = 1) => addVeg(b, "cone", x, y, z, h, seed, q);
/** driftwood log: a bleached tapered trunk with a stub branch, lying on the sand */
const driftLog = (b: Batch, x: number, y: number, z: number, L: number, R: number, ry: number, seed: number) => {
  const r = rng(seed), m = M4(x, y + R * 0.7, z, ry);
  const g = cached("driftLog", () => uvFrom(new THREE.CylinderGeometry(0.8, 1, 1, 12, 1).rotateZ(Math.PI / 2), (px, py, pz) => [px * 0.5 + 0.5, Math.atan2(py, pz) / 6.28 + 0.5]));
  b.add(g, driftM(), m.clone().multiply(M4(0, 0, 0, 0, 0, 0, [L, R, R])));
  b.add(rod(V(L * 0.2, 0, 0), V(L * 0.32, R * 2.2, R * (r() - 0.5) * 3), R * 0.35, R * 0.18, 8), driftM(), m);
  b.add(cached("logEnd", () => new THREE.CircleGeometry(1, 12).rotateY(Math.PI / 2)), col("#d8cbb4"), m.clone().multiply(M4(L / 2 + 0.002, 0, 0, 0, 0, 0, [1, R, R])));
};
/** the white lighthouse on the headland: tapered tower, gallery, black lantern with a warm glass, red cap; a keeper's house */
const lighthouse = (b: Batch, x: number, y: number, z: number) => {
  b.add(lathe("lhTower", [[0, 0], [2.0, 0], [2.0, 0.6], [1.55, 9.5], [1.9, 9.6], [1.9, 9.9], [0, 9.9]], 24), col("#f6f3ea"), M4(x, y, z));
  b.add(cached("lhGallery", () => new THREE.CylinderGeometry(2.2, 2.2, 0.25, 24)), col("#2a2a30"), M4(x, y + 10.0, z));
  b.add(cached("lhLantern", () => new THREE.CylinderGeometry(1.1, 1.1, 1.6, 16)), glow("#fff0c0", 1.3), M4(x, y + 10.9, z));
  for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28; b.add(rod(V(x + 1.12 * Math.cos(a), y + 10.1, z + 1.12 * Math.sin(a)), V(x + 1.12 * Math.cos(a), y + 11.7, z + 1.12 * Math.sin(a)), 0.07), col("#2a2a30")); }
  b.add(cached("lhCap", () => new THREE.ConeGeometry(1.45, 1.4, 16)), col("#c8323a"), M4(x, y + 12.4, z));
  b.add(cached("lhBall", () => new THREE.SphereGeometry(0.25, 10, 8)), col("#2a2a30"), M4(x, y + 13.2, z));
  for (const yy of [6.4, 3.4]) b.add(rbox(0.5, 0.8, 0.12, 0.04), col("#2a2a30"), M4(x + 0.2, y + yy, z + 1.75, 0.1));
  // keeper's house: white walls, red roof
  rb(b, col("#f6f3ea"), x + 4, x + 10, y, y + 3.2, z - 2.5, z + 2.5, 0.08);
  for (const s of [-1, 1]) b.add(rbox(6.8, 0.25, 3.3, 0.05), col("#b83a34"), M4(x + 7, y + 4.0, z + s * 1.4, 0, 0, s * 0.6).multiply(new THREE.Matrix4().makeRotationX(s * 0.62)));
  rb(b, col("#3a4a5a"), x + 5, x + 6, y + 1.2, y + 2.2, z + 2.48, z + 2.56, 0.02); rb(b, col("#3a4a5a"), x + 8, x + 9, y + 1.2, y + 2.2, z + 2.48, z + 2.56, 0.02);
};
/** 1970s sedan (nose +x), long hood + trunk, a white vinyl roof, chrome bumpers; flat = crushed by the blubber */
const sedan = (b: Batch, m: THREE.Matrix4, paint: string, flat = false) => {
  const put = (g: THREE.BufferGeometry, mat: Mat, lm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(lm));
  const P0 = shiny(paint, 90), chrome = shiny("#e0e4ea", 110), roofC = col("#f4f1e8"), glass = col("#40566e");
  const ty = flat ? 0.3 : 0.4, sq = flat ? 0.45 : 1;
  put(rbox(5.0, 0.62, 1.95, 0.2), P0, M4(0, ty + 0.36, 0, 0, flat ? 0.04 : 0, 0, [1, flat ? 0.75 : 1, flat ? 1.08 : 1]));   // body
  put(rbox(2.5, 0.62 * sq, 1.7, 0.18), P0, M4(-0.35, ty + 0.36 + 0.31 + 0.31 * sq, 0));       // cabin
  put(rbox(2.3, 0.5 * sq, 1.74, 0.04), glass, M4(-0.35, ty + 0.36 + 0.33 + 0.28 * sq, 0));     // windows band
  put(rbox(2.2, 0.12, 1.66, 0.06), roofC, M4(-0.4, ty + 0.36 + 0.31 + 0.62 * sq, 0));        // vinyl roof
  for (const sx of [-2.55, 2.55]) put(rbox(0.16, 0.18, 2.0, 0.06), chrome, M4(sx, ty + 0.2, 0));   // bumpers
  put(rbox(0.06, 0.32, 1.3, 0.02), chrome, M4(2.5, ty + 0.42, 0));                            // grille
  for (const s of [-1, 1]) put(cached("headlamp", () => new THREE.SphereGeometry(0.13, 14, 10)), chrome, M4(2.48, ty + 0.44, s * 0.66));
  for (const s of [-1, 1]) put(rbox(0.12, 0.12, 0.3, 0.03), glow("#ff4a3a", 1.0), M4(-2.52, ty + 0.44, s * 0.7));
  put(rbox(4.6, 0.06, 0.02, 0.01), chrome, M4(0, ty + 0.5, 0.99)); put(rbox(4.6, 0.06, 0.02, 0.01), chrome, M4(0, ty + 0.5, -0.99));
  for (const sx of [-1.6, 1.6]) for (const sz of [-1, 1]) {
    const wm = m.clone().multiply(M4(sx, ty, sz * (flat ? 1.08 : 0.92))).multiply(new THREE.Matrix4().makeRotationX(flat ? sz * 0.75 : 0));
    wheel(b, wm, 0.4, 0.26, "#e8e4da");
  }
  if (flat) { const r = rng(9); for (let i = 0; i < 5; i++) put(rbox(0.5, 0.05, 0.3, 0.02), glass, M4((r() - 0.5) * 4, 0.04, (r() - 0.5) * 3.2, r() * 3)); }
};
/** the orange 1970s highway dump truck (nose -x): cab, dump bed, black chassis, chrome grille, amber beacon */
const ORANGE = "#f07a1e";
const truck = (b: Batch) => {
  const paint = shiny(ORANGE, 60), dark = col("#2a2a2e"), glass = col("#40566e"), chrome = shiny("#e0e4ea", 110);
  rb(b, dark, -3.6, 3.4, 0.55, 0.95, -0.9, 0.9, 0.05);                                       // chassis
  rb(b, paint, -3.7, -1.5, 0.9, 2.9, -1.2, 1.2, 0.22);                                       // cab
  rb(b, glass, -3.76, -2.9, 1.95, 2.65, -1.05, 1.05, 0.05);                                   // windscreen
  rb(b, glass, -3.3, -1.9, 1.95, 2.65, -1.24, 1.24, 0.04);                                    // side windows
  rb(b, paint, -4.4, -3.6, 0.8, 1.9, -1.15, 1.15, 0.2);                                       // nose / hood
  rb(b, chrome, -4.48, -4.38, 0.95, 1.75, -0.8, 0.8, 0.03);                                   // grille
  for (const s of [-1, 1]) b.add(cached("headlamp", () => new THREE.SphereGeometry(0.13, 14, 10)), chrome, M4(-4.45, 1.45, s * 0.92));
  rb(b, chrome, -4.6, -4.4, 0.55, 0.78, -1.25, 1.25, 0.05);                                    // bumper
  rb(b, paint, -1.3, 3.6, 1.0, 2.7, -1.25, 1.25, 0.12);                                       // dump bed
  rb(b, col("#c85e14"), -1.25, 3.55, 2.55, 2.75, -1.3, 1.3, 0.04);                             // bed rim
  for (let k = 0; k < 4; k++) rb(b, col("#c85e14"), -0.6 + k * 1.1, -0.45 + k * 1.1, 1.05, 2.6, 1.24, 1.3, 0.02);
  rb(b, col("#f6f0c8"), -3.65, -1.55, 1.25, 1.42, 1.18, 1.24, 0.02);                           // white stripe (no words)
  b.add(cached("beacon", () => new THREE.CylinderGeometry(0.18, 0.2, 0.3, 12)), glow("#ffb020", 1.6), M4(-2.6, 3.05, 0));
  for (const [x, z] of [[-3.0, -1.1], [-3.0, 1.1], [1.6, -1.1], [1.6, 1.1], [2.8, -1.1], [2.8, 1.1]]) wheel(b, M4(x, 0.55, z), 0.55, 0.36, "#d8d2c4");
};
/** the yellow bulldozer (blade toward -z) */
const dozer = (b: Batch) => {
  const y = shiny("#f2b82a", 50), dark = col("#2a2a2e");
  for (const s of [-1, 1]) { rb(b, dark, s * 1.0 - 0.32, s * 1.0 + 0.32, 0, 0.8, -1.6, 1.6, 0.3); for (let k = 0; k < 5; k++) b.add(cached("dzWheel", () => new THREE.CylinderGeometry(0.28, 0.28, 0.66, 12).rotateZ(Math.PI / 2)), col("#6a6a70"), M4(s * 1.0, 0.38, -1.2 + k * 0.6)); }
  rb(b, y, -0.75, 0.75, 0.7, 1.7, -1.4, 1.4, 0.15);                                           // engine body
  rb(b, y, -0.8, 0.8, 1.7, 1.85, -0.2, 1.4, 0.05);                                            // cab floor
  for (const [x, z] of [[-0.75, -0.15], [0.75, -0.15], [-0.75, 1.35], [0.75, 1.35]]) b.add(rod(V(x, 1.8, z), V(x, 3.0, z), 0.05), dark);
  rb(b, y, -0.85, 0.85, 3.0, 3.12, -0.25, 1.45, 0.04);                                         // canopy
  b.add(rod(V(0.4, 1.7, -1.0), V(0.4, 2.6, -1.0), 0.08), dark);                                 // exhaust
  b.add(plate([[-1.6, 0], [1.6, 0], [1.6, 1.2], [-1.6, 1.2]], 0.14, 0.04), y, M4(0, 0.05, -2.3));  // blade
  rb(b, col("#c9cdd2"), -1.6, 1.6, 0.0, 0.16, -2.45, -2.25, 0.03);                             // blade edge
  for (const s of [-1, 1]) b.add(rod(V(s * 1.0, 0.7, -1.2), V(s * 1.1, 0.6, -2.2), 0.1), y);
};

// ---- the whale ----
/** loft: rings of (centre x, centre y, radius y, radius z) along x; uv = (around, along); bite = carve the top in [x0, x1] */
const loft = (rings: [number, number, number, number][], seg = 28, bite?: { x0: number; x1: number; d: number }) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  rings.forEach(([x, cy, ry, rz], i) => {
    for (let k = 0; k <= seg; k++) {
      const a = (k / seg) * Math.PI * 2, ny = Math.cos(a), nz = Math.sin(a);
      let y = cy + ry * ny;
      const z = rz * nz;
      if (bite && x > bite.x0 && x < bite.x1 && ny > -0.1) {
        const u = (x - bite.x0) / (bite.x1 - bite.x0), prof = Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) * (1 - 0.18 * Math.abs(Math.sin(u * Math.PI * 4)));
        y -= bite.d * prof * Math.max(0, ny + 0.1) / 1.1;
      }
      pos.push(x, y, z); uv.push(k / seg, i / (rings.length - 1));
    }
  });
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < seg; k++) {
    const a = i * (seg + 1) + k, c = a + seg + 1;
    idx.push(a, c, a + 1, a + 1, c, c + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};
/** the cartoon sperm whale lying on the sand at (x, y, z) along x, head toward +x: a blocky bevelled head with the
 *  X-eye on the lens side, a lofted body tapering to the tail stock, knuckles on the back, one flipper up in the air
 *  (it lies tipped on its side), the flukes on edge. bitten = the after-blast carcass (a bite-shaped chunk missing,
 *  soot smudges) */
const whale = (b: Batch, x0: number, y0: number, z0: number, bitten: boolean) => {
  const skin = texM("whaleSkin", () => P.whaleSkinHD()), headSkin = texM("whaleHead", () => rep(P.whaleSkinHD("whaleSkinH", "#76706e"), 1, 1));
  const m = M4(x0, y0, z0, 0, 0, -0.08);
  const put = (g: THREE.BufferGeometry, mat: Mat, lm = new THREE.Matrix4()) => b.add(g, mat, m.clone().multiply(lm));
  // body rings: x, centre y, ry, rz (sunk ~12 % into the sand)
  // the tail stock curls up off the sand (the flukes stand in the air: the whale's silhouette reads at a glance)
  const R: [number, number][] = [[-7.5, 0.3], [-7.0, 0.38], [-6.2, 0.55], [-5.2, 0.8], [-4.0, 1.12], [-2.6, 1.5], [-1.0, 1.78], [0.6, 1.92], [1.8, 1.9]];
  const lift = (x: number) => 2.2 * smooth((-x - 4.2) / 3.3);
  const rings = R.map(([x, r]) => [x, r * 0.86 + lift(x), r, r * 0.92] as [number, number, number, number]);
  put(loft(rings, 28, bitten ? { x0: -3.4, x1: 0.4, d: 1.5 } : undefined), skin);
  // the blocky head (sperm whale): a big bevelled box, slightly taller at the front, a narrow lower jaw underneath
  put(rbox(5.4, 4.2, 3.6, 1.55, [3, 3]), headSkin, M4(3.7, 1.86, 0));
  // the narrow lower jaw with a row of white teeth, the mouth line running back to the eye
  put(rbox(4.2, 0.5, 1.2, 0.24), col("#efe6e2"), M4(3.6, 0.3, 1.05));
  for (let k = 0; k < 7; k++) put(cached("tooth", () => new THREE.ConeGeometry(0.1, 0.24, 8)), col("#fffdf6"), M4(2.1 + k * 0.52, 0.62, 1.42));
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(6.3, 0.7, 1.55), V(4.2, 0.68, 1.82), V(2.2, 0.82, 1.84), V(1.4, 1.0, 1.8)]), 20, 0.06, 6), col("#2a2226"));
  // the X-eye decal on the lens (+z) side, toward the back of the head
  put(decalGeo(V(2.05, 1.72, 1.83), V(0, 0, 1), 1.35, 1.2), lam("xEye", () => ({ map: P.xEyeHD(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })));
  put(decalGeo(V(2.05, 1.72, -1.83), V(0, 0, -1), 1.35, 1.2), lam("xEye", () => ({ map: P.xEyeHD(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })));
  // knuckles along the back + the hump
  for (let k = 0; k < 4; k++) { const x = -1.6 - k * 0.8, r = 1.6 - k * 0.22; put(cached("knuckle", () => new THREE.SphereGeometry(1, 12, 8)), skin, M4(x, r * 0.86 + lift(x) + r * 0.92, 0, 0, 0, 0, [0.36, 0.2, 0.26])); }
  // a flipper sticking up in the air on the lens side (lying tipped over), the flukes on edge
  put(cached("flipper", () => new THREE.SphereGeometry(1, 16, 10)), skin, M4(0.9, 2.3, 1.2, 0.4, 0.2, -0.9, [0.95, 0.16, 0.42]));
  const fl = cached("fluke", () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.8, 0.5, 2.2, 1.7); sh.quadraticCurveTo(1.4, 0.4, 0.6, 0.1); sh.lineTo(0, 0); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 }); return uvFrom(g, (px, py) => [px / 3, py / 3]); });
  // flukes in the body's plane (it lies on its side): one lobe up and back, one back and down
  put(fl, skin, M4(-7.35, 2.55, -0.08, 0, 0.15, 0, [-1.55, 1.45, 1]));
  put(fl, skin, M4(-7.35, 2.45, -0.08, 0, -0.35, 0, [-1.5, -1.05, 1]));
  if (bitten) {
    // exposed blubber in the bite, a few torn bits on the sand, soot smudges
    put(cached("biteFat", () => new THREE.SphereGeometry(1, 20, 10)), col("#efe1c6"), M4(-1.5, 1.05, 0, 0, 0, 0, [1.9, 0.55, 1.35]));
    put(cached("biteFat2", () => new THREE.SphereGeometry(1, 14, 8)), col("#e6c9b0"), M4(-1.5, 0.95, 0, 0, 0, 0, [1.4, 0.5, 1.0]));
    for (const [x, z, s] of [[-2.5, 2.6, 0.45], [0.5, 2.9, 0.35], [-4.2, 2.2, 0.3], [1.8, -2.4, 0.4]]) put(cached("bitLump", () => new THREE.IcosahedronGeometry(1, 2)), col("#efe1c6"), M4(x, s * 0.5, z, x, 0, 0, [s, s * 0.6, s * 0.8]));
    put(decalGeo(V(4.2, 2.4, 1.77), V(0, 0, 1), 2.2, 1.4), lam("sootDecal", () => ({ map: sootTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })));
    put(decalGeo(V(-0.5, 1.8, 1.62), V(0, 0.2, 1), 2.6, 1.2), lam("sootDecal", () => ({ map: sootTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })));
  }
};
const sootTex = () => ctex("sootSmudge", 256, 160, (g, r) => {
  for (let i = 0; i < 14; i++) { const x = 40 + r() * 176, y = 30 + r() * 100, rad = 14 + r() * 30, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(40,34,34,0.55)"); gr.addColorStop(1, "rgba(40,34,34,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 160); }
});
/** a wooden dynamite crate (0.9 x 0.62 x 0.62) */
const crateGeo = () => rbox(0.9, 0.62, 0.62, 0.04);
const crateM = () => lam("dynCrate", () => ({ map: P.crateHD() }));
/** the crate pile against the whale's lens-side flank: 20 slots (bottom row 8, then 7, then 5) */
export const CRATE_SLOTS: V3[] = (() => {
  const out: V3[] = [], C = SPOT.CRATES, r = rng(33);
  for (let i = 0; i < 8; i++) out.push([C[0] - 3.5 + i * 1.0 + (r() - 0.5) * 0.1, 0.31, C[2] + (r() - 0.5) * 0.15]);
  for (let i = 0; i < 7; i++) out.push([C[0] - 3.0 + i * 1.0 + (r() - 0.5) * 0.1, 0.93, C[2] - 0.12 + (r() - 0.5) * 0.1]);
  for (let i = 0; i < 5; i++) out.push([C[0] - 2.0 + i * 1.0 + (r() - 0.5) * 0.1, 1.55, C[2] - 0.25 + (r() - 0.5) * 0.1]);
  return out;
})();
/** red dynamite stick bundle: three sticks + a fuse */
const sticks = (b: Batch) => {
  for (let k = 0; k < 3; k++) b.add(cached("dynStick", () => new THREE.CylinderGeometry(0.075, 0.075, 0.62, 12)), shiny("#d8302c", 40), M4(-0.08 + k * 0.08, 0.31, (k % 2) * 0.07, 0, 0.05 * (k - 1)));
  b.add(rbox(0.3, 0.06, 0.22, 0.02), col("#2a1a1a"), M4(0, 0.36, 0.03));
  b.add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(0, 0.62, 0), V(0.05, 0.82, 0.05), V(0.16, 0.86, 0)), 6, 0.016, 4), col("#2a2226"));
};
/** where the hook's stick bundles stand on the whale's back (whale frame) */
export const STICK_SPOTS: V3[] = [[-4.4, 1.82, 0.2], [-3.2, 2.32, 0.1], [-1.9, 2.75, 0.3], [-0.6, 3.0, 0.15], [0.7, 3.12, 0.3], [2.4, 3.92, 0.2], [4.0, 3.95, 0.4]];

// ---- beach ----
const buildBeach = (): SetRig => {
  const b = new Batch(), hf = beachY;
  terrain(b, sandM(), -170, 170, -90, 100, 4, hf, 1.7);
  terrain(b, sandM(), -FAR, -170, -FAR, FAR, 4, hf, 12); terrain(b, sandM(), 170, FAR, -FAR, FAR, 4, hf, 12);
  terrain(b, sandM(), -170, 170, -FAR, -90, 4, hf, 12); terrain(b, sandM(), -170, 170, 100, FAR, 4, hf, 12);
  terrain(b, wetSandM(), -170, 170, -16, -6.5, 3, (x, z) => hf(x, z) + 0.012 * smooth((z + 16) / 3), 1.7);
  // the car park at +x: asphalt, white bay lines, log kerbs
  terrain(b, asphaltM(), 44, 82, 4, 32, 6, (x, z) => hf(x, z) + 0.02, 2);
  for (let i = 0; i < 8; i++) rb(b, col("#f4f0e4"), 46 + i * 4.2, 46.12 + i * 4.2, 0.31, 0.33, 24, 30, 0.01);
  for (let i = 0; i < 8; i++) driftLog(b, 46 + i * 4.6, 0.3, 3.4, 3.6, 0.16, 0.0, 400 + i);
  // two parked 70s cars in the bays (avocado, harvest gold)
  sedan(b, M4(71.2, 0.32, 27.2, Math.PI / 2), "#7d8f2e"); sedan(b, M4(79.6, 0.32, 27.2, Math.PI / 2), "#d9a52c");
  // driftwood on the upper beach, the seagulls' log, the post
  const r = rng(71);
  for (let i = 0; i < 12; i++) { const x = -60 + 120 * r(), z = 6 + 14 * r(); if (Math.abs(x) < 10 && z < 14) continue; driftLog(b, x, hf(x, z), z, 3 + 4 * r(), 0.2 + 0.2 * r(), r() * 3, 500 + i); }
  { const L = SPOT.LOG7; driftLog(b, L[0], hf(L[0], L[2]), L[2], 4.2, 0.34, 0.02, 777); }
  { const Pt = SPOT.POST4, y = hf(Pt[0], Pt[2]); b.add(rbox(0.26, 1.5, 0.26, 0.05), woodM("#8a6c4c"), M4(Pt[0], y + 0.6, Pt[2], 0.2)); }
  // dunes: beach grass all over the slopes and crest; a picket sand fence along the dune foot
  tufts(b, 0, 40, 0, 70, 1800, 3, (x, z) => z < 18 || x > 40 || (x > -12 && x < 2 && z < 37.5) || (x > 9 && x < 17 && z < 37.5) || (Math.abs(x - SPOT.CROWD[0]) < 18 && z > 37 && z < 46) || (Math.abs(x - SPOT.REPORTER[0]) < 5 && z > 35 && z < 45), hf, 1.3);
  tufts(b, -60, 40, 0, 40, 900, 4, (x, z) => z < 18, hf, 1.3);
  tufts(b, 60, 50, 0, 30, 400, 5, (x, z) => z < 34, hf, 1.2);
  for (let x = -80; x < 36; x += 1.0) { const z = 21 + 0.8 * Math.sin(x * 0.2), y = hf(x, z); b.add(rbox(0.07, 1.0, 0.04, 0.01), woodM(x % 2 ? "#a8845a" : "#8a6a48"), M4(x, y + 0.4, z, 0, 0.05 * Math.sin(x * 3))); }
  // spruce forest on the hills behind the dunes, shore pines on the back dunes
  for (let i = 0; i < 520; i++) { const rr = rng(900 + i), x = -260 + 520 * rr(), z = 64 + 170 * rr() ** 0.8; spruce(b, x, hf(x, z) - 0.3, z, 9 + 9 * rr(), 900 + i, z > 120 ? 2 : 1); }
  for (let i = 0; i < 40; i++) { const rr = rng(1500 + i), x = -90 + 130 * rr(), z = 52 + 12 * rr(); addVeg(b, "round", x, hf(x, z) - 0.2, z, 3.5 + 2.5 * rr(), 1500 + i, 1); }
  // the headland up the coast at -x: basalt lumps rising out of the surf, spruce on top, the lighthouse
  const H = SPOT.LIGHTHOUSE;
  for (const [x, z, sx, sy, sz, sd] of [[-120, -40, 34, 26, 24, 1], [-150, -20, 40, 30, 30, 2], [-100, -55, 18, 12, 14, 3], [-92, -30, 14, 8, 12, 4], [-170, 10, 50, 34, 40, 5], [-86, -44, 6, 4, 6, 6], [-80, -22, 5, 3, 5, 0]] as number[][]) lump(b, x, -2, z, sx, sy, sz, sd, sd, sd % 3);
  const top = 21;
  lighthouse(b, H[0], top, H[2]);
  for (let i = 0; i < 40; i++) { const rr = rng(1700 + i), x = -175 + 50 * rr(), z = -40 + 60 * rr(); if (Math.hypot(x - H[0], z - H[2]) < 12) continue; spruce(b, x, top + 2 * rr() - 3 + (x < -150 ? 6 : 0), z, 6 + 5 * rr(), 1700 + i, 1); }
  // far backdrop: distant forested ridges all round (pre-mixed toward the haze)
  hillRing(b, 0, 60, 900, 30, 80, 8, "#3f5a52");
  // sea stacks offshore
  for (const [x, z, s] of [[-60, -120, 8], [-75, -110, 5], [40, -160, 6]] as number[][]) lump(b, x, -1, z, s, s * 1.4, s, x, 0.4, 1);
  const rig = done("beach", b);
  const G = rig.group;
  // ---- the whale (intact + bitten) ----
  const W = SPOT.WHALE, wy = hf(W[0], W[2]) - 0.05;
  const wI = new Batch(), wB = new Batch(); whale(wI, W[0], wy, W[2], false); whale(wB, W[0], wy, W[2], true);
  const gWI = sub(G, wI), gWB = sub(G, wB);
  // ---- hook dynamite bundles on the back ----
  const gSt: THREE.Group[] = STICK_SPOTS.map(([x, y, z], k) => { const sb = new Batch(); sticks(sb); const g = sub(G, sb); g.position.set(W[0] + x, wy + y - 0.25, W[2] + z); g.rotation.set(0.1 * (k % 2), k * 0.7, 0.08 * ((k % 3) - 1)); return g; });
  // ---- 20 crates ----
  const gCr: THREE.Group[] = CRATE_SLOTS.map(() => { const cb = new Batch(); cb.add(crateGeo(), crateM()); return sub(G, cb); });
  // ---- the plunger box + wires ----
  const Pl = SPOT.PLUNGER, py = hf(Pl[0], Pl[2]);
  const pb = new Batch();
  rb(pb, woodM("#8a5a34"), -0.3, 0.3, 0, 0.46, -0.22, 0.22, 0.05); rb(pb, col("#c8323a"), -0.31, 0.31, 0.3, 0.38, -0.23, 0.23, 0.02);
  for (const s of [-1, 1]) pb.add(cached("term", () => new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8)), col("#d8c070"), M4(s * 0.18, 0.5, -0.15));
  const gPl = sub(G, pb); gPl.position.set(Pl[0], py, Pl[2]); gPl.rotation.y = -0.4;
  const hb = new Batch(); hb.add(rod(V(0, 0, 0), V(0, 0.55, 0), 0.03), col("#9aa0a6")); hb.add(rod(V(-0.3, 0.55, 0), V(0.3, 0.55, 0), 0.05), col("#2a2a30"));
  for (const s of [-1, 1]) hb.add(cached("grip", () => new THREE.SphereGeometry(0.065, 10, 8)), col("#2a2a30"), M4(s * 0.31, 0.55, 0));
  const gH = sub(gPl, hb);
  const wireB = new Batch();
  for (const dz of [-0.06, 0.06]) wireB.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(Pl[0] - 0.2, py + 0.5, Pl[2] - 0.2 + dz), V(Pl[0] - 0.8, py + 0.04, Pl[2] - 0.6), V(0.5, hf(0.5, 3.3) + 0.03, 3.3 + dz), V(-0.6, 0.6, 2.6)]), 24, 0.018, 4), col("#2a2226"));
  const gW = sub(G, wireB, false);
  // ---- the rope of shot 4: taut, then snapped into two slack halves ----
  const rp = (d: number, h: number) => { const q = ropeAt(d); return V(q[0], h, q[2]); };
  const T0 = V(W[0] + SPOT.ROPE_TAIL[0], wy + SPOT.ROPE_TAIL[1], W[2] + SPOT.ROPE_TAIL[2]), T1 = rp(7.6, 1.15);
  const rT = new Batch(), rS = new Batch(), ropeM = col("#c8a46a");
  rT.add(new THREE.TubeGeometry(new THREE.LineCurve3(T0, T1), 8, 0.06, 6), ropeM);
  rS.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([T0, rp(0.8, 0.5), rp(1.6, 0.34)]), 16, 0.06, 6), ropeM);
  rS.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([rp(2.6, 0.34), rp(4.4, 0.4), rp(6.6, 0.42), rp(8.6, 0.4)]), 16, 0.06, 6), ropeM);
  const gRT = sub(G, rT), gRS = sub(G, rS);
  // ---- the easel ----
  const E = SPOT.EASEL, ey = hf(E[0], E[2]), eb = new Batch();
  for (const [ax, az] of [[-0.45, 0.2], [0.45, 0.2], [0, -0.5]]) eb.add(rod(V(ax, 0, az), V(ax * 0.3, 2.3, az * 0.2 - 0.05), 0.035), woodM("#a8784a"));
  rb(eb, woodM("#8a5a34"), -0.55, 0.55, 0.92, 0.98, 0.02, 0.2, 0.02);
  eb.add(quad(V(-0.5, 1.0, 0.16), V(0.5, 1.0, 0.16), V(0.5, 2.25, 0.08), V(-0.5, 2.25, 0.08)), lam("easelPaper", () => ({ map: P.easelHD() })));
  rb(eb, woodM("#a8784a"), -0.54, 0.54, 0.96, 2.29, -0.03, 0.02, 0.02);
  const gE = sub(G, eb); gE.position.set(E[0], ey, E[2]); gE.rotation.y = 0.25;
  // ---- the highway truck, the bulldozer ----
  const tb = new Batch(); truck(tb); const gT = sub(G, tb);
  const db = new Batch(); dozer(db); const gD = sub(G, db);
  // ---- the sand mound + its little flag ----
  const mb = new Batch();
  mb.add(cached("mound", () => { const g = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.06 * Math.sin(v.x * 7 + v.z * 5) + 0.04 * Math.sin(v.z * 11); p.setXYZ(i, v.x * n, v.y * n, v.z * n); } g.computeVertexNormals(); return uvFrom(g, (x, y, z) => [x * 3, z * 3 + y]); }), sandM());
  const gM = sub(G, mb);
  const fb = new Batch(); fb.add(rod(V(0, 0, 0), V(0, 1.6, 0), 0.03), woodM("#8a5a34")); fb.add(plate([[0, 1.6], [0.7, 1.4], [0, 1.2]], 0.02, 0.005), col("#d8302c"));
  const gF = sub(G, fb);
  // ---- surf: a wash line on the sand + breaker lines on the water (soft foam cards, NOINK) ----
  const foamMat = new THREE.MeshBasicMaterial({ map: P.foamHD(), transparent: true, depthWrite: false, color: new THREE.Color(0.95, 0.97, 0.98), fog: false });
  const foams: THREE.Mesh[] = [];
  for (const [z, w, k] of [[-13.4, 2.6, 0], [-19, 3.4, 1], [-27, 4.2, 2], [-38, 5.0, 3], [-52, 6.0, 4]] as number[][]) {
    const tex = P.foamHD().clone(); tex.repeat.set(26, 1); tex.needsUpdate = true;
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(1000, w).rotateX(-Math.PI / 2), foamMat.clone());
    (fm.material as THREE.MeshBasicMaterial).map = tex; fm.position.set(0, 0.04 + 0.01 * k, z); fm.layers.set(NOINK); fm.renderOrder = 1; fm.userData.z0 = z; fm.userData.k = k;
    G.add(fm); foams.push(fm);
  }
  rig.tick = (t, id) => {
    const f = Math.round(t * 30), st = whaleState(id, f), mk = moundK(id, f);
    gWI.visible = st === "intact"; gWB.visible = st === "bitten" && !(id === 15 && mk >= 0.98);
    gSt.forEach((g, k) => { const s = id === 1 ? sticksK(f, k) : 0; g.visible = s > 0.01; g.scale.set(1.7, 1.7 * Math.max(0.01, s), 1.7); });
    const n = cratesN(id, f), newest = id === 6 ? clamp01((f - (EV.CUT6 + (n - 3) * ((EV.CRATES6 - EV.CUT6) / 17))) / 5) : 1;
    gCr.forEach((g, k) => {
      g.visible = k < n; if (!g.visible) return;
      const [x, y, z] = CRATE_SLOTS[k], drop = k === n - 1 ? 0.8 * (1 - easeOut(newest)) : 0;
      g.position.set(x, y + drop, z); g.rotation.y = 0.06 * Math.sin(k * 2.3);
    });
    const plV = id === 1 || id === 2 || id === 9 || (id >= 7 && id <= 8);
    gPl.visible = plV; gW.visible = plV && id !== 2;
    gH.position.y = 0.46 + 0.42 * (1 - plungerK(id, f));
    gRT.visible = id === 4 && f < EV.SNAP4; gRS.visible = id === 4 && f >= EV.SNAP4;
    gE.visible = id === 7;
    const T5 = SPOT.TRUCK5;
    gT.visible = id === 5 || id === 6 || id === 15; gT.position.set(id === 5 ? truckX(f) : T5[0], hf(T5[0], T5[2]) - 0.02, T5[2]);
    if (id === 15) gT.position.set(18, hf(18, 2), 2), gT.rotation.y = 0.9; else gT.rotation.y = 0;
    gD.visible = id === 15 && f >= EV.CUT15; const dp = dozerAt(f); gD.position.set(dp[0], hf(dp[0], dp[2]), dp[2]); gD.rotation.y = -0.15;
    gM.visible = mk > 0.01; gM.scale.set(10.5 * mk, 6.0 * mk, 5.2 * mk); gM.position.set(-0.2, -0.3, 0);
    gF.visible = id === 15 && f >= EV.MOUND15 - 1; const fk = easeOut((f - EV.MOUND15 + 1) / 5); gF.scale.setScalar(Math.max(0.01, fk)); gF.position.set(0.4, 5.6, 0.2);
    for (const fm of foams) { const k = fm.userData.k as number; fm.position.z = fm.userData.z0 + 0.8 * Math.sin(t * 0.9 + k * 1.3); (fm.material as THREE.MeshBasicMaterial).map!.offset.x = t * 0.004 * (k + 1); }
  };
  return rig;
};

// ---- the distant parking lot: one shiny sedan, the coast + the smoke on the horizon ----
const buildLot = (): SetRig => {
  const b = new Batch(), C = SPOT.CAR;
  const hf = (x: number, z: number) => (z < -40 ? 0.15 * (-40 - z) * smooth((-z - 40) / 30) * 0.4 + 1.6 * smooth((-z - 70) / 40) * (2 + Math.sin(x / 13)) : 0);
  terrain(b, sandM(), -FAR, FAR, -FAR, FAR, 4, (x, z) => (Math.abs(x) < 26 && z > -16 && z < 18 ? -0.05 : hf(x, z) - 0.05), 6);
  terrain(b, asphaltM(), -24, 24, -14, 16, 6, undefined, 4, 0.0);
  for (let i = -4; i <= 4; i++) rb(b, col("#f4f0e4"), i * 3.6 - 0.06, i * 3.6 + 0.06, 0.01, 0.03, -2.6 - 2.8, -2.6, 0.01);
  for (let i = -4; i <= 4; i++) rb(b, col("#f4f0e4"), i * 3.6 - 0.06, i * 3.6 + 0.06, 0.01, 0.03, 2.6, 2.6 + 2.8, 0.01);
  // a lamp post, wooden guard rail along the far side, a trash can
  b.add(rod(V(-8, 0, -6), V(-8, 7, -6), 0.1), col("#5a5e66")); b.add(rod(V(-8, 7, -6), V(-6.8, 7.2, -6), 0.07), col("#5a5e66")); rb(b, col("#3a3e46"), -7.1, -6.4, 6.9, 7.2, -6.3, -5.7, 0.05);
  for (let x = -24; x <= 24; x += 2.4) { b.add(rbox(0.22, 0.8, 0.22, 0.04), woodM("#8a6c4c"), M4(x, 0.4, -14.5)); }
  rb(b, woodM("#9a7a58"), -24, 24, 0.55, 0.75, -14.62, -14.38, 0.04);
  b.add(cached("can", () => new THREE.CylinderGeometry(0.32, 0.3, 0.9, 14)), col("#2f6a4a"), M4(9, 0.45, -11));
  // the sedan (intact / flattened) is a rig below; spruce + shore pines around, dunes + beach grass beyond the rail
  tufts(b, 0, -40, 18, 60, 700, 8, undefined, hf, 1.2);
  for (let i = 0; i < 140; i++) { const r = rng(2000 + i), a = r() * 6.28, d = 32 + 90 * r(); const x = Math.cos(a) * d, z = Math.sin(a) * d; if (z < -30 && Math.abs(x) < 120) continue; spruce(b, x, hf(x, z) - 0.2, z, 8 + 8 * r(), 2000 + i, 1); }
  for (let i = 0; i < 30; i++) { const r = rng(2300 + i), x = -60 + 120 * r(), z = -20 - 14 * r(); addVeg(b, "round", x, hf(x, z), z, 2.5 + 2 * r(), 2300 + i, 1); }
  hillRing(b, 0, 0, 800, 20, 70, 9, "#3f5a52");
  const rig = done("lot", b), G = rig.group;
  const ci = new Batch(), cf = new Batch();
  sedan(ci, M4(C[0], 0, C[2], 0), "#8cc43a"); sedan(cf, M4(C[0], 0, C[2], 0), "#8cc43a", true);
  const gI = sub(G, ci), gFl = sub(G, cf);
  const kb = new Batch();
  kb.add(cached("chunk3d", () => { const g = new THREE.SphereGeometry(1, 40, 24), p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 0.78 + 0.4 * vn2(v.x * 1.6 + 3, v.z * 1.6, 5) + 0.16 * vn2(v.y * 3, v.x * 3, 6); p.setXYZ(i, v.x * n * (1 + 0.15 * v.z), v.y * n * (v.y > 0 ? 0.6 : 0.9), v.z * n); } g.computeVertexNormals(); return g; }), col("#f4e2d8"));
  kb.add(cached("chunkSkin", () => new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, 0.9)), texM("whaleSkinChunk", () => P.whaleSkinHD()), M4(0.1, 0.18, 0, 0, 0.2, 0, [0.95, 0.62, 0.92]));
  const gK = sub(G, kb);
  rig.tick = (t, id) => {
    const f = Math.round(t * 30), flat = carFlat(f) > 0;
    gI.visible = !flat; gFl.visible = flat;
    const y = chunk13Y(f); gK.visible = id === 13; gK.position.set(C[0] - 0.2, y, C[2]); gK.scale.set(1.75, flat ? 1.25 : 1.4, 1.45); gK.rotation.set(0.2, 0.5 + (flat ? 0 : f * 0.05), 0.1);
  };
  return rig;
};

// ---- the present-day park: lawn, a path, picnic tables, the pictogram sign, dunes + sea beyond ----
const picnicTable = (b: Batch, x: number, z: number, ry: number) => {
  const m = M4(x, 0, z, ry), w = woodM("#a8743e"), put = (g: THREE.BufferGeometry, mat: Mat, lm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(lm));
  put(rbox(2.0, 0.08, 0.8, 0.02), w, M4(0, 0.76, 0));
  for (const s of [-1, 1]) put(rbox(2.0, 0.06, 0.3, 0.02), w, M4(0, 0.45, s * 0.65));
  for (const s of [-1, 1]) for (const k of [-1, 1]) put(rbox(0.08, 0.95, 0.08, 0.02), woodM("#8a5a34"), M4(s * 0.8, 0.4, 0, 0, 0, k * 0.55).multiply(new THREE.Matrix4().makeRotationX(k * 0.62)));
};
const buildPark = (): SetRig => {
  const b = new Batch(), S = SPOT.SIGN;
  const hf = (x: number, z: number) => (z < -14 ? Math.max(-3, 3 * Math.sin(Math.min(1, (-14 - z) / 10) * Math.PI) - 3 * smooth((-z - 26) / 14) * 1.2) : 0);
  terrain(b, lawnM(), -FAR, FAR, -14, FAR, 4, undefined, 4, 0);
  terrain(b, sandM(), -FAR, FAR, -FAR, -14, 4, hf, 3);
  tufts(b, 0, -20, 0, 60, 900, 12, (x, z) => z > -15 || z < -26, hf, 1.3);
  terrain(b, groundM("parkPath", () => P.concreteHD()), -40, 40, 3.6, 5.4, 3, undefined, 4, 0.02);
  picnicTable(b, SPOT.TABLE16[0], SPOT.TABLE16[2], 0.15); picnicTable(b, -9, 0.5, -0.2); picnicTable(b, 8, -3, 0.4);
  // the sign: two posts + a board with the pictogram (unlit face so it never goes grey)
  for (const s of [-1, 1]) b.add(rbox(0.14, 2.3, 0.14, 0.03), woodM("#6a4a2c"), M4(S[0] + s * 0.95, 1.15, S[2]));
  rb(b, woodM("#5a3a24"), S[0] - 1.1, S[0] + 1.1, 1.0, 2.38, S[2] - 0.08, S[2] + 0.02, 0.04);
  b.add(quad(V(S[0] - 1.02, 1.07, S[2] + 0.035), V(S[0] + 1.02, 1.07, S[2] + 0.035), V(S[0] + 1.02, 2.31, S[2] + 0.035), V(S[0] - 1.02, 2.31, S[2] + 0.035)), (() => { let m = mats.get("parkSign"); if (!m) { m = new THREE.MeshBasicMaterial({ map: P.parkSignHD(), color: new THREE.Color(1.05, 1.05, 1.05) }); mats.set("parkSign", m); } return m; })());
  // trees, a bin, flower beds, a few shore pines, spruce hills behind
  for (const [x, z, h] of [[-14, -4, 6], [12, -8, 5], [-20, 8, 7], [16, 10, 6.5], [4, 16, 5]] as number[][]) addVeg(b, "round", x, 0, z, h, x * 7 + z, 0);
  b.add(cached("can", () => new THREE.CylinderGeometry(0.32, 0.3, 0.9, 14)), col("#2f6a4a"), M4(-5.5, 0.45, 4.2));
  for (let i = 0; i < 30; i++) { const r = rng(3000 + i); b.add(cached("flower", () => new THREE.SphereGeometry(0.09, 8, 6)), col(["#e2453c", "#f6c23a", "#ffffff", "#c86ad0"][i % 4]), M4(4 + 3 * r(), 0.12, 1 + 1.2 * r())); }
  for (let i = 0; i < 160; i++) { const r = rng(3100 + i), a = Math.PI * (0.1 + 0.8 * r()), d = 60 + 120 * r(); spruce(b, Math.cos(a) * d * 1.5, -0.3, Math.sin(a) * d, 9 + 8 * r(), 3100 + i, 1); }
  { const H = SPOT.LIGHTHOUSE; lump(b, H[0] * 1.2, -2, H[2] - 20, 34, 24, 24, 1, 1, 1); lighthouse(b, H[0] * 1.2, 19, H[2] - 20); }
  hillRing(b, 0, 0, 900, 30, 80, 10, "#3f5a52");
  return done("park", b);
};

/** every set of the film; world.ts adds the groups and toggles .visible per shot */
export const buildSets = (): Record<SetName, SetRig> => ({ beach: buildBeach(), lot: buildLot(), park: buildPark() });

// =================================================================================================================
// FOREGROUND framing props (story.ts FOREGROUND, composition.md 3.3). world.ts calls fgUpdate(group, id, f, cam) every
// frame; the kits are built once into `group` (cached by kit name) and placed in camera space ("cam") or world space.
// Kit front = local +z (faces the lens). The shot's DOF blurs them.
// =================================================================================================================
const fgKit = (kit: string): THREE.Group => {
  const g = new THREE.Group(), b = new Batch();
  switch (kit) {
    case "grass": tufts(b, 0, 0, 0, 0.9, 26, 7, undefined, undefined, 1.6); break;
    case "driftwood": driftLog(b, 0, 0, 0, 3.2, 0.3, 0, 31); break;
    default: for (const [dx, dy, ry] of [[0, 0, 0.1], [0.92, 0, -0.1], [0.45, 0.62, 0.25]]) b.add(crateGeo(), crateM(), M4(dx, dy + 0.31, 0, ry));
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
