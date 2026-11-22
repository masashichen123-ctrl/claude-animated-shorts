// The film's hero props (owner: sets): the great round steel VAULT DOOR (a thick frame ring, rivets, hinge barrels, locking
// bolts, a spoked brass wheel, a thick handle bolt, a brass keyhole plate; the "clock" style adds the time-lock box with two
// dials; the "modern" style is chrome with a combination dial), the golden vault chamber behind it, and the shared
// materials (brushed steel, brass, gold, chrome, dials). The door faces +z in its own frame, centre at the origin; the leaf
// swings about a hinge at x = HINGE_X (rotation.y = -angle opens it toward the viewer).
import * as THREE from "three";
import * as P from "./paint";
import { Batch, M4, rbox, col, glow, cached, lathe, V, sub, mats, quad, rod } from "./build";
import { twoTone } from "./shade";

export const R_DOOR = 1.9;
export const HINGE_X = -2.25;

// ---------------- shared materials ----------------
const phong = (key: string, make: () => THREE.MeshPhongMaterialParameters) => {
  let m = mats.get(key) as THREE.MeshPhongMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshPhongMaterial(make())); mats.set(key, m); }
  return m;
};
/** light brushed steel: broad specular highlights (candle reflections) */
export const steelL = () => phong("steelL", () => ({ map: P.steelHD("#9aa6b8"), color: "#ffffff", shininess: 95, specular: new THREE.Color("#d2dcee") }));
/** dark gunmetal steel for frames, ribs and bolts */
export const steelD = () => phong("steelD", () => ({ map: P.steelHD("#6c7688"), color: "#ffffff", shininess: 70, specular: new THREE.Color("#98a6c0") }));
export const brassM = () => phong("brassM", () => ({ color: "#e0b040", shininess: 110, specular: new THREE.Color("#fff0b0") }));
export const goldM = () => phong("goldM", () => ({ color: "#f2c230", shininess: 120, specular: new THREE.Color("#fff4c0") }));
export const chromeM = () => phong("chromeM", () => ({ map: P.steelHD("#dfe6f2"), color: "#ffffff", shininess: 150, specular: new THREE.Color("#ffffff") }));
export const dialM = (mark = false) => { const key = "dialM" + mark; let m = mats.get(key); if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ map: P.dialHD("#f6efdc", mark) })); mats.set(key, m); } return m as THREE.MeshLambertMaterial; };
const stoneM = () => { const key = "stoneWall"; let m = mats.get(key); if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ map: P.stoneBlockHD("#a8a190") })); mats.set(key, m); } return m as THREE.MeshLambertMaterial; };

// ---------------- the door ----------------
export type DoorStyle = "old" | "clock" | "modern";
export type DoorRig = {
  root: THREE.Group; pivot: THREE.Group; wheel: THREE.Group; bolts: THREE.Mesh[]; handle: THREE.Mesh; hands: THREE.Object3D[]; clock?: THREE.Group;
};
const rivetG = () => cached("rivet", () => new THREE.SphereGeometry(1, 9, 6).scale(1, 1, 0.55));
const ringG = (r: number, t: number, seg = 40) => cached(`ring${r}_${t}`, () => new THREE.TorusGeometry(r, t, 8, seg));
const rotX = Math.PI / 2;

/** the door, built at the origin facing +z */
export const buildDoor = (style: DoorStyle = "old"): DoorRig => {
  const root = new THREE.Group(), fb = new Batch(), modern = style === "modern";
  const L = modern ? chromeM() : steelL(), D = modern ? chromeM() : steelD(), BR = modern ? chromeM() : brassM();
  // ---- the frame ring (static): a thick stepped ring with rivets, a dark door well behind ----
  fb.add(lathe("doorFrame", [[1.92, -0.5], [1.92, 0.1], [2.04, 0.16], [2.16, 0.3], [2.38, 0.34], [2.52, 0.22], [2.56, -0.5]], 48), D, M4(0, 0, 0, 0, 0, rotX));
  fb.add(lathe("doorFrameLip", [[1.96, 0.06], [2.0, 0.2], [2.12, 0.36], [2.3, 0.36], [2.34, 0.3]], 48), L, M4(0, 0, 0, 0, 0, rotX));
  for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; fb.add(rivetG(), L, M4(2.27 * Math.cos(a), 2.27 * Math.sin(a), 0.36, 0, 0, 0, [0.085, 0.085, 0.085])); }
  // the door well: a dark tunnel so an open door shows depth
  fb.add(cached("doorWell", () => new THREE.CylinderGeometry(1.92, 1.92, 1.2, 40, 1, true).rotateX(rotX).translate(0, 0, -0.6)), col("#20242c", THREE.BackSide), M4(0, 0, 0));
  // hinge barrels on the frame (left), three heavy knuckles with bracket plates
  for (const y of [-1.25, 0, 1.25]) {
    fb.add(cached("hingeB", () => new THREE.CylinderGeometry(0.17, 0.17, 0.62, 12)), D, M4(HINGE_X, y, 0.16));
    fb.add(cached("hingeC", () => new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12)), BR, M4(HINGE_X, y + 0.36, 0.16));
    fb.add(rbox(0.7, 0.38, 0.16, 0.03), D, M4(HINGE_X + 0.3, y, 0.22));
  }
  if (modern) {
    // a cool blue LED ring sunk in the frame lip
    fb.add(ringG(2.0, 0.035, 64), glow("#6ad8ff", 2.4), M4(0, 0, 0.2));
  }
  root.add(frameOf(fb));
  // ---- the leaf (swings about the hinge) ----
  const pivot = new THREE.Group(); pivot.position.set(HINGE_X, 0, 0);
  const leaf = new THREE.Group(); leaf.position.set(-HINGE_X, 0, 0); pivot.add(leaf);
  const lb = new Batch();
  lb.add(lathe("doorLeaf", [[0, 0.3], [1.5, 0.3], [1.66, 0.27], [1.84, 0.21], [1.9, 0.1], [1.9, -0.3], [0, -0.3]], 56), L, M4(0, 0, 0, 0, 0, rotX));
  lb.add(ringG(1.56, 0.085), D, M4(0, 0, 0.31)); lb.add(ringG(1.2, 0.06), D, M4(0, 0, 0.31));
  lb.add(lathe("doorBoss", [[0, 0.1], [1.02, 0.1], [1.06, 0.06], [1.06, 0], [0, 0]], 48), D, M4(0, 0, 0.3, 0, 0, rotX));
  if (!modern) {
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; lb.add(rbox(0.5, 0.13, 0.08, 0.02), D, M4(1.3 * Math.cos(a), 1.3 * Math.sin(a), 0.33, 0, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(a))); }
    for (let k = 0; k < 32; k++) { const a = (k / 32) * Math.PI * 2; lb.add(rivetG(), L, M4(1.74 * Math.cos(a), 1.74 * Math.sin(a), 0.3, 0, 0, 0, [0.078, 0.078, 0.078])); }
    for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2 + 0.15; lb.add(rivetG(), L, M4(1.38 * Math.cos(a), 1.38 * Math.sin(a), 0.33, 0, 0, 0, [0.056, 0.056, 0.056])); }
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; lb.add(rivetG(), L, M4(1.0 * Math.cos(a), 1.0 * Math.sin(a), 0.4, 0, 0, 0, [0.05, 0.05, 0.05])); }
  } else for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; lb.add(cached("flushBolt", () => new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10).rotateX(rotX)), L, M4(1.74 * Math.cos(a), 1.74 * Math.sin(a), 0.3)); }
  lb.add(cached("hub", () => new THREE.CylinderGeometry(0.5, 0.58, 0.24, 24).rotateX(rotX)), D, M4(0, 0, 0.44));
  lb.add(ringG(0.55, 0.05, 32), BR, M4(0, 0, 0.56));
  leaf.add(frameOf(lb));
  // the locking bolts: 8 thick radial bars on the door face that draw back toward the hub when the wheel turns
  const bolts: THREE.Mesh[] = [];
  const boltGeo = cached("lockBolt", () => new THREE.CylinderGeometry(0.115, 0.115, 0.52, 12).rotateZ(Math.PI / 2));
  const capGeo = cached("lockBoltCap", () => new THREE.SphereGeometry(0.15, 10, 8));
  for (let k = 0; k < 8; k++) {
    const m = new THREE.Mesh(boltGeo, D); m.castShadow = true; m.receiveShadow = true; m.userData.k = k; bolts.push(m); leaf.add(m);
    const cap = new THREE.Mesh(capGeo, BR); m.add(cap); cap.position.set(0.28, 0, 0);
    const clamp = new THREE.Mesh(cached("boltClamp", () => rbox(0.14, 0.34, 0.1, 0.02)), D); m.add(clamp); clamp.position.set(-0.05, 0, -0.1);
  }
  // keyhole plate (old / clock): a brass escutcheon with a dark keyhole
  if (!modern) {
    const kb = new Batch();
    kb.add(rbox(0.42, 0.56, 0.07, 0.03), BR, M4(0.98, -0.32, 0.4));
    kb.add(cached("kh1", () => new THREE.CircleGeometry(0.075, 14)), col("#171a22"), M4(0.98, -0.25, 0.44));
    kb.add(cached("kh2", () => new THREE.PlaneGeometry(0.06, 0.2)), col("#171a22"), M4(0.98, -0.37, 0.44));
    for (const [dx, dy] of [[-0.15, 0.22], [0.15, 0.22], [-0.15, -0.22], [0.15, -0.22]]) kb.add(rivetG(), L, M4(0.98 + dx, -0.32 + dy, 0.44, 0, 0, 0, [0.03, 0.03, 0.03]));
    leaf.add(frameOf(kb));
  }
  // the thick handle bolt under the wheel: a bar in two brackets
  const hb = new Batch();
  hb.add(rbox(0.3, 0.3, 0.2, 0.03), D, M4(-0.85, -1.18, 0.4)); hb.add(rbox(0.3, 0.3, 0.2, 0.03), D, M4(0.85, -1.18, 0.4));
  leaf.add(frameOf(hb));
  const handle = new THREE.Mesh(cached("handleBolt", () => new THREE.CylinderGeometry(0.095, 0.095, 1.85, 14).rotateZ(Math.PI / 2)), modern ? chromeM() : L);
  handle.position.set(0, -1.18, 0.55); handle.castShadow = true; leaf.add(handle);
  const knob = new THREE.Mesh(cached("handleKnob", () => new THREE.SphereGeometry(0.15, 12, 10)), BR); knob.position.set(0.98, 0, 0); handle.add(knob);
  // ---- the spoked wheel: a brass rim, six spokes with ball ends, a brass hub ----
  const wheel = new THREE.Group(); wheel.position.set(0, 0, 0.7); leaf.add(wheel);
  const wb = new Batch(), spokes = modern ? 3 : 6;
  wb.add(ringG(0.74, 0.05, 40), BR, M4(0, 0, 0));
  for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * Math.PI * 2 + Math.PI / 2;
    wb.add(rod(V(0, 0, 0), V(0.9 * Math.cos(a), 0.9 * Math.sin(a), 0), 0.055, 0.045, 8), BR);
    wb.add(cached("wheelBall", () => new THREE.SphereGeometry(0.1, 12, 10)), BR, M4(0.98 * Math.cos(a), 0.98 * Math.sin(a), 0));
  }
  wb.add(cached("wheelHub", () => new THREE.CylinderGeometry(0.2, 0.24, 0.3, 16).rotateX(rotX)), BR, M4(0, 0, 0));
  wb.add(cached("wheelCap", () => new THREE.SphereGeometry(0.17, 14, 10)), BR, M4(0, 0, 0.16));
  wheel.add(frameOf(wb));
  const stem = new Batch(); stem.add(cached("wheelStem", () => new THREE.CylinderGeometry(0.14, 0.14, 0.34, 12).rotateX(rotX)), D, M4(0, 0, 0.5)); leaf.add(frameOf(stem));
  // ---- the time-lock box (clock style): brass case, two dials, a tiny set dial; hands turn per frame ----
  const hands: THREE.Object3D[] = [];
  let clock: THREE.Group | undefined;
  if (style === "clock") {
    clock = new THREE.Group(); clock.position.set(0, 1.12, 0.45); leaf.add(clock);
    const cb = new Batch();
    cb.add(rbox(1.5, 0.66, 0.3, 0.05), BR, M4(0, 0, 0));
    cb.add(rbox(1.56, 0.1, 0.34, 0.03), D, M4(0, 0.36, 0)); cb.add(rbox(1.56, 0.1, 0.34, 0.03), D, M4(0, -0.36, 0));
    for (const sx of [-0.7, 0.7]) for (const sy of [-0.27, 0.27]) cb.add(rivetG(), L, M4(sx, sy, 0.16, 0, 0, 0, [0.04, 0.04, 0.04]));
    const dial = (x: number, r: number, mark: boolean) => {
      cb.add(ringG(r + 0.02, 0.03, 36), BR, M4(x, 0, 0.17));
      cb.add(cached("dialDisc" + r, () => new THREE.CircleGeometry(r, 32)), dialM(mark), M4(x, 0, 0.165));
    };
    dial(-0.44, 0.26, false); dial(0.44, 0.26, false); dial(0, 0.11, true);
    clock.add(frameOf(cb));
    const hand = (x: number, len: number, w: number, c: string) => {
      const g = new THREE.Group(); g.position.set(x, 0, 0.2); clock!.add(g);
      const m = new THREE.Mesh(cached("hand" + len + w, () => rbox(w, len, 0.012, 0.004).translate(0, len / 2 - 0.02, 0)), col(c)); g.add(m);
      hands.push(g);
    };
    hand(-0.44, 0.19, 0.022, "#241726"); hand(-0.44, 0.13, 0.03, "#241726"); hand(0.44, 0.19, 0.022, "#241726"); hand(0.44, 0.13, 0.03, "#241726"); hand(0, 0.07, 0.016, "#c8282e");
  }
  if (modern) { // a big combination dial above the wheel: chrome plate, a cream dial with ticks, a long hand
    clock = new THREE.Group(); clock.position.set(0, 1.22, 0.5); leaf.add(clock);
    const cb = new Batch();
    cb.add(cached("mdPlate", () => new THREE.CylinderGeometry(0.5, 0.5, 0.1, 36).rotateX(rotX)), chromeM(), M4(0, 0, 0));
    cb.add(ringG(0.5, 0.045, 40), chromeM(), M4(0, 0, 0.06));
    cb.add(cached("mdDialC", () => new THREE.CircleGeometry(0.42, 36)), dialM(false), M4(0, 0, 0.055));
    clock.add(frameOf(cb));
    for (const [len, w] of [[0.34, 0.022], [0.22, 0.032]] as [number, number][]) {
      const g = new THREE.Group(); g.position.set(0, 0, 0.09); clock.add(g);
      g.add(new THREE.Mesh(cached("mdh" + len, () => rbox(w, len, 0.012, 0.004).translate(0, len / 2 - 0.02, 0)), col("#241726"))); hands.push(g);
    }
  }
  root.add(pivot);
  return { root, pivot, wheel, bolts, handle, hands, clock };
};
/** a Batch -> a Group of merged meshes */
const frameOf = (b: Batch) => { const g = new THREE.Group(); b.build(g, true); return g; };

/** pose the door: swing (rad), wheel turn (rad), bolts drawn back 0..1, the clock-lock hands (seconds) */
export const poseDoor = (r: DoorRig, swing: number, wheelA: number, back: number, t = 0) => {
  r.pivot.rotation.y = -swing;
  r.wheel.rotation.z = wheelA;
  r.bolts.forEach((m, k) => {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8, rad = 1.46 - 0.46 * back;
    m.position.set(rad * Math.cos(a), rad * Math.sin(a), 0.44); m.rotation.set(0, 0, a);
  });
  r.handle.position.x = -0.9 * back;
  r.hands.forEach((h, i) => { h.rotation.z = -(t * (i % 2 ? 0.06 : 0.5) + i * 1.3) * (1 + 0.15 * (i >> 1)); });
};

// ---------------- the wall around a door, and the chamber behind it ----------------
/** a stone wall slab with a round hole (centre cx, cy), z from z0 (front) back by depth */
export const wallWithHole = (b: Batch, cx: number, cy: number, z0: number, W: number, H: number, R: number, depth = 0.8, x0 = cx - W / 2, y0 = 0, place?: THREE.Matrix4, mat: THREE.Material = stoneM()) => {
  const s = new THREE.Shape([new THREE.Vector2(x0, y0), new THREE.Vector2(x0 + W, y0), new THREE.Vector2(x0 + W, y0 + H), new THREE.Vector2(x0, y0 + H)]);
  const h = new THREE.Path(); h.absarc(cx, cy, R, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 40 });
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2, p.getY(i) / 2 + p.getZ(i) / 2);
  g.translate(0, 0, z0 - depth);
  b.add(g, mat, place);
};
/** the golden vault chamber behind the door (door centre at the origin, chamber toward -z): a tunnel, a lit room with shelves of
 *  gold bars and money bags, a hot warm back wall. Everything is warm and a little emissive so an opened door pours gold. */
export const buildChamber = (): THREE.Group => {
  const g = new THREE.Group(), b = new Batch();
  const GL = goldM(), BAG = col("#c9a96a");
  const wallM = (c: string) => col(c);
  // floor / walls / ceiling of the chamber (box inside, normals inward)
  const x0 = -3.2, x1 = 3.2, y0 = -2.05, y1 = 2.6, z1 = -1.2, z2 = -7.2;
  b.add(quad(V(x0, y0, z1), V(x1, y0, z1), V(x1, y0, z2), V(x0, y0, z2), 4, 4), wallM("#7a5a2a"));
  b.add(quad(V(x0, y1, z2), V(x1, y1, z2), V(x1, y1, z1), V(x0, y1, z1), 4, 4), wallM("#5a4020"));
  b.add(quad(V(x0, y0, z2), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z2), 4, 4), wallM("#8a6a34"));
  b.add(quad(V(x1, y0, z1), V(x1, y0, z2), V(x1, y1, z2), V(x1, y1, z1), 4, 4), wallM("#8a6a34"));
  b.add(new THREE.PlaneGeometry(x1 - x0, y1 - y0), glow("#ffc050", 1.7), M4(0, (y0 + y1) / 2, z2 + 0.02));
  // shelves with gold bars and sacks along both side walls
  for (const sx of [-1, 1]) for (let row = 0; row < 3; row++) {
    const y = y0 + 0.2 + row * 1.2, x = sx * 2.9;
    b.add(rbox(0.6, 0.08, 4.4, 0.02), col("#4a3418"), M4(x, y, -4.2));
    for (let k = 0; k < 8; k++) b.add(rbox(0.5, 0.2, 0.44, 0.03), GL, M4(x, y + 0.14, -2.2 - k * 0.5 + (row % 2) * 0.1));
    for (let k = 0; k < 3; k++) b.add(cached("bagS", () => new THREE.SphereGeometry(0.34, 12, 10).scale(1, 1.1, 1)), BAG, M4(x - sx * 0.15, y + 0.38, -6.0 + k * 0.55));
  }
  // a pyramid of gold bars at the back
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4 - r; k++) b.add(rbox(0.7, 0.28, 0.4, 0.04), GL, M4(-1.05 + (k + r * 0.5) * 0.74 - 0.3, y0 + 0.14 + r * 0.29, -6.2));
  b.build(g, false);
  return g;
};
