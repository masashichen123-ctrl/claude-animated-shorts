// The time-lock's own props (owner: sets): a kitchen clock (brass bezel, cream dial, a wooden case with a swinging pendulum, a
// dial that pops open on a hinge), brass cogs and a coil spring (spilled and flying in shot 6), and THE MECHANISM (shot 7):
// two clock faces side by side, a train of turning gears, a mainspring, a tiny hand-set dial with a red mark, a thick steel bolt
// in brass brackets held by a clock arm in a notch, and a little vault wheel at the bolt's end that the banker cannot budge.
import * as THREE from "three";
import { Batch, M4, rbox, col, glow, cached, V, mats, rod } from "./build";
import { twoTone } from "./shade";
import * as P from "./paint";
import { brassM, steelL, steelD, dialM, goldM } from "./door";

const ringG = (r: number, t: number, seg = 36) => cached(`mring${r}_${t}`, () => new THREE.TorusGeometry(r, t, 8, seg));
const frameOf = (b: Batch, cast = true) => { const g = new THREE.Group(); b.build(g, cast); return g; };
const rotX = Math.PI / 2;
const wood = (c = "#6a4228") => { const k = "mechWood" + c; let m = mats.get(k); if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ map: P.walnutHD(c) })); mats.set(k, m); } return m as THREE.MeshLambertMaterial; };

/** a cog: teeth around, a shaft hole and lightening holes; depth th, centred, axis z */
export const cogGeo = (r: number, teeth: number, th: number) => cached(`cog${r}_${teeth}_${th}`, () => {
  const s = new THREE.Shape(), ri = r * 0.82;
  for (let k = 0; k < teeth; k++) {
    const a0 = (k / teeth) * Math.PI * 2, da = (Math.PI * 2) / teeth, pts = [[ri, 0], [r, 0.12], [r, 0.4], [ri, 0.52]] as number[][];
    pts.forEach(([rr, f], i) => { const a = a0 + (i === 0 ? 0 : i === 1 ? 0.14 : i === 2 ? 0.4 : 0.54) * da, x = rr * Math.cos(a), y = rr * Math.sin(a); if (k === 0 && i === 0) s.moveTo(x, y); else s.lineTo(x, y); void f; });
  }
  s.closePath();
  const h = new THREE.Path(); h.absarc(0, 0, r * 0.2, 0, Math.PI * 2, true); s.holes.push(h);
  if (r > 0.14) for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4, hp = new THREE.Path(); hp.absarc(Math.cos(a) * r * 0.54, Math.sin(a) * r * 0.54, r * 0.15, 0, Math.PI * 2, true); s.holes.push(hp); }
  return new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: th * 0.12, bevelSize: th * 0.12, bevelSegments: 1, curveSegments: 6 }).translate(0, 0, -th / 2);
});
export const cog = (r: number, teeth: number, th = 0.05, mat: THREE.Material = brassM()) => {
  const m = new THREE.Mesh(cogGeo(r, teeth, th), mat); m.castShadow = true; m.receiveShadow = true; return m;
};
/** a flat spiral spring (mainspring) in the xy plane */
const spiralG = (r0: number, r1: number, turns: number, tube: number) => cached(`spiral${r0}_${r1}_${turns}`, () => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 90; i++) { const u = i / 90, a = u * turns * Math.PI * 2, r = r0 + (r1 - r0) * u; pts.push(new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, tube, 6, false);
});
/** a coil spring along y */
const coilG = (len: number, r: number, turns: number, tube: number) => cached(`coil${len}_${r}_${turns}`, () => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 80; i++) { const u = i / 80, a = u * turns * Math.PI * 2; pts.push(new THREE.Vector3(r * Math.cos(a), u * len - len / 2, r * Math.sin(a))); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, tube, 6, false);
});

// ---------------- the kitchen clock ----------------
export type KClock = { group: THREE.Group; door: THREE.Group; pend: THREE.Group; hands: THREE.Object3D[] };
/** a brass-framed kitchen clock (about 0.62 m wide, 1.0 m tall), facing +z; its dial plate is a hinged door */
export const buildKClock = (): KClock => {
  const group = new THREE.Group(), b = new Batch(), BR = brassM();
  // wooden case: dial head (round) + long body with a glass window and a pendulum
  b.add(rbox(0.56, 0.62, 0.2, 0.04), wood("#7a4a2a"), M4(0, -0.28, -0.02));
  b.add(rbox(0.46, 0.46, 0.04, 0.02), col("#2a1a24"), M4(0, -0.28, 0.085));          // the window: dark
  b.add(rbox(0.52, 0.52, 0.03, 0.02), BR, M4(0, -0.28, 0.1));                         // brass window frame (thin)
  b.add(rbox(0.4, 0.4, 0.04, 0.02), col("#1c1220"), M4(0, -0.28, 0.115));
  b.add(rbox(0.62, 0.06, 0.26, 0.02), BR, M4(0, -0.62, 0));                           // brass foot
  for (const sx of [-0.24, 0.24]) b.add(cached("kcFoot", () => new THREE.SphereGeometry(0.04, 8, 6)), BR, M4(sx, -0.67, 0.08));
  b.add(cached("kcHead", () => new THREE.CylinderGeometry(0.34, 0.34, 0.22, 30).rotateX(rotX)), wood("#7a4a2a"), M4(0, 0.2, -0.02));
  b.add(ringG(0.35, 0.04, 36), BR, M4(0, 0.2, 0.1));                                  // brass bezel
  b.add(cached("kcCrown", () => new THREE.CylinderGeometry(0.09, 0.14, 0.16, 12)), BR, M4(0, 0.58, -0.02));
  b.add(cached("kcKnob", () => new THREE.SphereGeometry(0.07, 10, 8)), BR, M4(0, 0.7, -0.02));
  group.add(frameOf(b));
  // the dial plate on a hinge (left edge): swings open about y
  const door = new THREE.Group(); door.position.set(-0.32, 0.2, 0.09); group.add(door);
  const db = new Batch();
  db.add(cached("kcDial", () => new THREE.CircleGeometry(0.31, 32)), dialM(false), M4(0.32, 0, 0.012));
  db.add(cached("kcDisc", () => new THREE.CylinderGeometry(0.315, 0.315, 0.025, 30).rotateX(rotX)), BR, M4(0.32, 0, 0));
  door.add(frameOf(db));
  // the inside of the head (visible when the dial is open): dark with a few brass gears
  const ib = new Batch();
  ib.add(cached("kcInner", () => new THREE.CircleGeometry(0.3, 28)), col("#2a1a22"), M4(0, 0.2, 0.09));
  group.add(frameOf(ib));
  const ig = [[-0.09, 0.27, 0.11, 12], [0.1, 0.17, 0.09, 10], [0.0, 0.08, 0.07, 8]] as [number, number, number, number][];
  const inner: THREE.Mesh[] = ig.map(([x, y, r, t]) => { const m = cog(r, t, 0.03); m.position.set(x, y, 0.105); group.add(m); return m; });
  group.userData.inner = inner;
  // hands on the dial plate
  const hands: THREE.Object3D[] = [];
  for (const [len, w] of [[0.22, 0.02], [0.15, 0.028]] as [number, number][]) {
    const g = new THREE.Group(); g.position.set(0.32, 0, 0.03); door.add(g);
    g.add(new THREE.Mesh(cached("kchand" + len, () => rbox(w, len, 0.01, 0.004).translate(0, len / 2 - 0.015, 0)), col("#241726"))); hands.push(g);
  }
  // pendulum behind the window
  const pend = new THREE.Group(); pend.position.set(0, -0.12, 0.11); group.add(pend);
  const pb = new Batch();
  pb.add(rod(V(0, 0, 0), V(0, -0.34, 0), 0.008, 0.008, 5), BR);
  pb.add(cached("pendBob", () => new THREE.CylinderGeometry(0.07, 0.07, 0.015, 18).rotateX(rotX)), goldM(), M4(0, -0.36, 0));
  pend.add(frameOf(pb, false));
  return { group, door, pend, hands };
};

// ---------------- the mechanism ----------------
export type MechRig = {
  group: THREE.Group; gears: { m: THREE.Mesh; k: number }[]; hands: THREE.Object3D[]; arm: THREE.Group; wheel: THREE.Group; spring: THREE.Mesh;
  setHand: THREE.Object3D; bolt: THREE.Mesh; pos: { wheel: THREE.Vector3; dial: THREE.Vector3; notch: THREE.Vector3; faces: [THREE.Vector3, THREE.Vector3] };
};
/** the mechanism on a walnut board (about 2.6 x 1.5 m at scale 1; the caller scales it), facing +z, centred on the board */
export const buildMech = (): MechRig => {
  const group = new THREE.Group(), BR = brassM(), SL = steelL(), SD = steelD();
  const b = new Batch();
  b.add(rbox(2.7, 1.6, 0.1, 0.05), wood("#5a3622"), M4(0.2, 0.05, -0.05));
  b.add(rbox(2.78, 0.07, 0.14, 0.02), BR, M4(0.2, 0.86, -0.03)); b.add(rbox(2.78, 0.07, 0.14, 0.02), BR, M4(0.2, -0.76, -0.03));
  for (const sx of [-1.05, 1.45]) for (const sy of [0.72, -0.62]) b.add(cached("mscrew", () => new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10).rotateX(rotX)), SL, M4(sx, sy, 0.02));
  // two clock faces side by side: brass bezel + cream dial with ticks (no digits)
  const faces: [THREE.Vector3, THREE.Vector3] = [V(-0.5, 0.32, 0.03), V(0.5, 0.32, 0.03)];
  for (const f of faces) {
    b.add(cached("mfBack", () => new THREE.CylinderGeometry(0.41, 0.41, 0.07, 32).rotateX(rotX)), BR, M4(f.x, f.y, f.z));
    b.add(ringG(0.405, 0.045, 40), BR, M4(f.x, f.y, f.z + 0.04));
    b.add(cached("mfDial", () => new THREE.CircleGeometry(0.37, 36)), dialM(false), M4(f.x, f.y, f.z + 0.04));
  }
  // the tiny set dial between the faces with its red set mark and a small turning knob
  const dialPos = V(0, 0.34, 0.03);
  b.add(cached("msBack", () => new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20).rotateX(rotX)), BR, M4(dialPos.x, dialPos.y, dialPos.z));
  b.add(cached("msDial", () => new THREE.CircleGeometry(0.1, 24)), dialM(true), M4(dialPos.x, dialPos.y, dialPos.z + 0.035));
  b.add(cached("msKnob", () => new THREE.CylinderGeometry(0.035, 0.045, 0.07, 10).rotateX(rotX)), BR, M4(dialPos.x, dialPos.y - 0.17, 0.05));
  // the bolt in three brass brackets, with a notch where the arm's hook rests
  const boltY = -0.52, boltLen = 2.1, notchX = 0.12;
  for (const x of [-0.8, 0.12, 0.85]) { b.add(rbox(0.26, 0.34, 0.14, 0.03), BR, M4(x, boltY, 0.06)); b.add(rbox(0.26, 0.06, 0.2, 0.02), BR, M4(x, boltY - 0.2, 0.05)); }
  // the arm's pivot post + a linkage up to the left clock
  b.add(cached("mpost", () => new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10).rotateX(rotX)), SD, M4(notchX + 0.02, -0.12, 0.08));
  group.add(frameOf(b));
  // the bolt itself: thick brushed steel with a dark notch on top and a cross pin
  const bolt = new THREE.Mesh(cached("mbolt", () => rbox(boltLen, 0.2, 0.2, 0.04)), SL); bolt.position.set(0.12, boltY, 0.12); bolt.castShadow = true; group.add(bolt);
  const nb = new Batch(); nb.add(rbox(0.12, 0.05, 0.21, 0.01), col("#14161c"), M4(notchX, boltY + 0.1, 0.12)); nb.add(cached("mbpin", () => new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10).rotateX(rotX)), BR, M4(-0.55, boltY, 0.12)); nb.add(cached("mbpin", () => new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10).rotateX(rotX)), BR, M4(0.8, boltY, 0.12)); group.add(frameOf(nb));
  // the clock arm: a brass lever pivoting at (notchX, -0.12); its hooked foot sits in the notch
  const arm = new THREE.Group(); arm.position.set(notchX + 0.02, -0.12, 0.16); group.add(arm);
  const ab = new Batch();
  ab.add(rbox(0.07, 0.46, 0.05, 0.015), BR, M4(0, -0.17, 0)); ab.add(rbox(0.07, 0.34, 0.05, 0.015), BR, M4(-0.12, 0.14, 0, 0, 0.5));
  ab.add(cached("armHook", () => new THREE.ConeGeometry(0.07, 0.15, 4).rotateX(Math.PI)), SD, M4(-0.02, -0.4, 0));
  ab.add(cached("armCap", () => new THREE.CylinderGeometry(0.07, 0.07, 0.07, 12).rotateX(rotX)), BR, M4(0, 0, 0.02));
  arm.add(frameOf(ab));
  // a push rod from the left clock to the arm
  const lb = new Batch(); lb.add(rod(V(-0.33, 0.04, 0.12), V(notchX - 0.08, 0.1, 0.12), 0.02, 0.02, 6), SD); group.add(frameOf(lb));
  // the gear train
  const gears: { m: THREE.Mesh; k: number }[] = [];
  const train: [number, number, number, number][] = [[-0.92, -0.16, 0.25, 14], [-0.52, -0.12, 0.2, 11], [-0.14, -0.2, 0.27, 15], [0.32, -0.14, 0.2, 11], [0.72, -0.2, 0.25, 14], [0.98, 0.04, 0.17, 9]];
  train.forEach(([x, y, r, t], i) => {
    const m = cog(r, t, 0.06, i % 2 ? goldM() : BR); m.position.set(x, y, 0.09); group.add(m); gears.push({ m, k: (i % 2 ? -1 : 1) * (14 / t) });
    const cap = new THREE.Mesh(cached("gcap", () => new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8).rotateX(rotX)), SD); cap.position.set(x, y, 0.14); group.add(cap);
  });
  // two more cogs tucked behind the faces' lower edges
  for (const [x, y, r, t] of [[-0.98, 0.7, 0.16, 10], [0.94, 0.72, 0.15, 10]] as [number, number, number, number][]) { const m = cog(r, t, 0.05, BR); m.position.set(x, y, 0.06); group.add(m); gears.push({ m, k: x < 0 ? 1.3 : -1.3 }); }
  // the mainspring: a flat spiral between the faces' tops
  const spring = new THREE.Mesh(spiralG(0.03, 0.15, 3.2, 0.012), SL); spring.position.set(0.12, 0.7, 0.07); spring.castShadow = true; group.add(spring);
  // hands for both faces and the tiny dial
  const hands: THREE.Object3D[] = [];
  const mkHand = (x: number, y: number, len: number, w: number, c: string, z = 0.075) => {
    const g = new THREE.Group(); g.position.set(x, y, z); group.add(g);
    g.add(new THREE.Mesh(cached("mh" + len + w, () => rbox(w, len, 0.012, 0.004).translate(0, len / 2 - 0.02, 0)), col(c)));
    g.add(new THREE.Mesh(cached("mhd" + w, () => new THREE.CylinderGeometry(w * 1.4, w * 1.4, 0.02, 10).rotateX(rotX)), col(c)));
    return g;
  };
  for (const f of faces) { hands.push(mkHand(f.x, f.y, 0.3, 0.026, "#241726")); hands.push(mkHand(f.x, f.y, 0.2, 0.036, "#241726")); }
  const setHand = mkHand(dialPos.x, dialPos.y, 0.085, 0.016, "#241726", 0.076);
  // the little vault wheel at the bolt's end (brass, four spokes with balls): the banker's hand turns this
  const wheel = new THREE.Group(); wheel.position.set(1.42, boltY, 0.2); group.add(wheel);
  const wb = new Batch(); wb.add(ringG(0.26, 0.032, 28), BR, M4(0, 0, 0));
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; wb.add(rod(V(0, 0, 0), V(0.3 * Math.cos(a), 0.3 * Math.sin(a), 0), 0.03, 0.026, 6), BR); wb.add(cached("mwBall", () => new THREE.SphereGeometry(0.055, 8, 6)), BR, M4(0.33 * Math.cos(a), 0.33 * Math.sin(a), 0)); }
  wb.add(cached("mwHub", () => new THREE.CylinderGeometry(0.08, 0.09, 0.12, 12).rotateX(rotX)), BR, M4(0, 0, 0)); wheel.add(frameOf(wb));
  const sb = new Batch(); sb.add(rbox(0.22, 0.28, 0.16, 0.03), SD, M4(1.2, boltY, 0.12)); group.add(frameOf(sb));
  return { group, gears, hands, arm, wheel, spring, setHand, bolt, pos: { wheel: V(1.42, boltY, 0.2), dial: dialPos, notch: V(notchX, boltY + 0.1, 0.2), faces } };
};
/** pose the mechanism at time t (seconds): turning gears, ticking hands, the arm's tick, the wheel's blocked push (push 0..1), a small shake */
export const poseMech = (r: MechRig, t: number, push: number) => {
  r.gears.forEach((g) => { g.m.rotation.z = t * 0.9 * g.k; });
  r.hands.forEach((h, i) => { h.rotation.z = -(t * (i % 2 ? 0.12 : 0.9) + i * 0.9); });
  r.setHand.rotation.z = -(Math.PI * 0.62) - 0.05 * Math.sin(t * 2);
  const tick = Math.max(0, Math.sin(t * 6.28 * 2)) ** 8;
  r.arm.rotation.z = -0.03 * tick + 0.012 * Math.sin(t * 2);
  r.spring.rotation.z = t * 0.15;
  r.wheel.rotation.z = push * 0.6;
  r.group.position.x = 0.012 * Math.sin(t * 90) * push;
  r.group.rotation.z = 0.006 * Math.sin(t * 70) * push;
  void P;
};
