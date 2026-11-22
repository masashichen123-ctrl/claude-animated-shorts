// The Tremont House and its set (owner: sets). One modelled six-story red-brick hotel (arched windows with hood mouldings,
// green shutters, striped awnings, quoins, a bracketed cornice, a pediment with a lettering-free crest, a cupola, flags),
// built as a group that is lifted every frame by story.ts hotelY(id, f); the jackscrew field under it (instanced screws whose
// shafts follow the beam, crossbars that turn in a ripple), the timber grillage, the plaza with its brick blocks, the
// measuring board, the scaffold of the window close-up. Also the hotel as a cutaway dollhouse (shot 12, buildCutaway).
// No letters or digits anywhere: the crest, the board marks and the clock are pictures only.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as P from "./paint";
import { rng, ctex } from "./paint";
import { Batch, M4, rbox, rb, col, texM, glow, lam, rod, cached, lathe, quad, tri, V, groundM, terrain, woodM, unlit, sub, FAR, BRASS, shiny, addVeg, hillRing, SetRig, ground, slab, plate } from "./build";
import { HOTEL, SCREWS, screwX, screwZ, SPOT, hotelY, screwTurn, boardK, cutY, EV, smooth, glide, riseAt } from "./story";

const FH = HOTEL.FH, W2 = HOTEL.W / 2;
const BRICK = "#b4513a";
const texPlaza = () => { const m = texM("plazaCobble", () => P.cobbleHD()); m.userData.inkId = 1100; return m; };
const brickM = (c = BRICK) => texM("brick" + c, () => P.brickHD(c));
const brickF = (c = BRICK) => texM("brickF" + c, () => P.brickHD(c), { side: THREE.DoubleSide });
const plasterF = (c = "#ecdcb6") => texM("plasterF" + c, () => P.plasterHD(c), { side: THREE.DoubleSide });
const plasterM = (c = "#ecdcb6") => texM("plaster" + c, () => P.plasterHD(c));
const CREAM = "#efe4c8";

// ---------------------------------------------------------------------------------------------------------------
// shared bits
// ---------------------------------------------------------------------------------------------------------------
/** striped awning slab (slopes down away from the wall: front edge lower), width w, projection d, tilt in rad */
const awningTex = (c: string, c2 = "#fbf6ea") => texM("awning" + c + c2, () => P.ctex("awnTex" + c + c2, 128, 16, (g) => { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? c2 : c; g.fillRect(i * 32, 0, 32, 16); } }));
const awning = (b: Batch, x: number, y: number, z: number, w: number, d: number, c: string, c2 = "#fbf6ea", ry = 0) => {
  const g = cached("awn" + w + "_" + d, () => { const q = new THREE.PlaneGeometry(w, d, 8, 1); const p = q.attributes.position as THREE.BufferAttribute, uv = q.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / (w / 6), 0); return q; });
  b.add(g, awningTex(c, c2), M4(x, y, z, ry).multiply(new THREE.Matrix4().makeRotationX(-1.2)));
  rb(b, awningTex(c, c2), x - w / 2, x + w / 2, y - 0.28, y - 0.02, z + d * 0.4, z + d * 0.4 + 0.02, 0.005);
};
/** arched hole (centre x, base y0, rect top y1, half width hw) as a THREE.Path */
const archPts = (x: number, y0: number, y1: number, hw: number, n = 12) => {
  const pts: THREE.Vector2[] = [new THREE.Vector2(x - hw, y0), new THREE.Vector2(x + hw, y0)];
  for (let i = 0; i <= n; i++) { const a = (Math.PI * i) / n; pts.push(new THREE.Vector2(x + hw * Math.cos(a), y1 + hw * Math.sin(a))); }
  return pts;
};
const archPath = (x: number, y0: number, y1: number, hw: number) => new THREE.Path(archPts(x, y0, y1, hw));
const scaleUV = (g: THREE.BufferGeometry, k: number) => { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k); return g; };
/** a hood moulding: an arch ring around an opening (outer = hw + t) */
const hoodGeo = (hw: number, y1: number, y0: number, t: number, depth: number) => cached(`hood${hw}_${y1}_${y0}_${t}_${depth}`, () => {
  const s = new THREE.Shape(archPts(0, y0 - 0.06, y1, hw + t));
  s.holes.push(archPath(0, y0 - 0.01, y1, hw));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 10 });
  return scaleUV(g, 0.5);
});
const gasLamp = (b: Batch, x: number, y: number, z: number, h = 3.6) => {
  b.add(rod(V(x, y, z), V(x, y + h, z), 0.07, 0.05, 8), col("#2a3a32"));
  rb(b, col("#2a3a32"), x - 0.16, x + 0.16, y, y + 0.5, z - 0.16, z + 0.16, 0.03);
  b.add(cached("lampGlobe", () => new THREE.SphereGeometry(0.26, 12, 10)), glow("#fff2c0", 1.0), M4(x, y + h + 0.3, z));
  b.add(cached("lampCap", () => new THREE.ConeGeometry(0.34, 0.3, 6)), col("#2a3a32"), M4(x, y + h + 0.68, z));
};
const barrel = (b: Batch, x: number, y: number, z: number, s = 1) => {
  b.add(lathe("barrel", [[0, 0], [0.34, 0], [0.4, 0.2], [0.42, 0.5], [0.4, 0.8], [0.34, 1.0], [0, 1.0]], 14), woodM("#8a5a34"), M4(x, y, z, 0, 0, 0, [s, s, s]));
  for (const hy of [0.18, 0.5, 0.82]) b.add(cached("barrelHoop" + hy, () => new THREE.TorusGeometry(hy === 0.5 ? 0.42 : 0.38, 0.018, 5, 18).rotateX(Math.PI / 2)), col("#3a3a40"), M4(x, y + hy * s, z, 0, 0, 0, [s, s, s]));
};
const crate = (b: Batch, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0, c = "#b88a58") => b.add(rbox(w, h, d, 0.03), woodM(c), M4(x, y + h / 2, z, ry));
/** a stack of timber cribbing (log-cabin layers) */
const cribStack = (b: Batch, x: number, z: number, layers = 3, len = 0.9, th = 0.16, c = "#a8764a") => {
  for (let k = 0; k < layers; k++) for (const o of [-0.26, 0.26]) {
    if (k % 2) b.add(rbox(len, th, th * 1.2, 0.02), woodM(c), M4(x, th / 2 + k * th, z + o, 0));
    else b.add(rbox(th * 1.2, th, len, 0.02), woodM(c), M4(x + o, th / 2 + k * th, z, 0));
  }
};
/** a farm / dray cart: bed, shafts, two spoked wheels (axis along x) */
export const cart = (b: Batch, x: number, y: number, z: number, ry: number, sink = 0, c = "#8a5a34") => {
  const m = M4(x, y - sink, z, ry), put = (g: THREE.BufferGeometry, mat: THREE.Material, lm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(lm));
  put(rbox(1.5, 0.12, 2.6, 0.03), woodM(c), M4(0, 0.95, 0));
  for (const s of [-1, 1]) { put(rbox(0.08, 0.5, 2.6, 0.02), woodM(c), M4(s * 0.71, 1.28, 0)); }
  put(rbox(1.5, 0.5, 0.08, 0.02), woodM(c), M4(0, 1.28, -1.26)); put(rbox(1.5, 0.5, 0.08, 0.02), woodM(c), M4(0, 1.28, 1.26));
  put(rod(V(-0.35, 0.95, 1.2), V(-0.4, 0.8, 3.6), 0.05), woodM(c), new THREE.Matrix4()); put(rod(V(0.35, 0.95, 1.2), V(0.4, 0.8, 3.6), 0.05), woodM(c), new THREE.Matrix4());
  put(rod(V(-0.9, 0.62, 0), V(0.9, 0.62, 0), 0.05), col("#3a3a40"), new THREE.Matrix4());
  for (const s of [-1, 1]) {
    const wm = M4(s * 0.92, 0.62, 0);
    put(cached("cartTyre", () => new THREE.TorusGeometry(0.6, 0.05, 6, 24).rotateY(Math.PI / 2)), col("#2a2a2e"), wm);
    put(cached("cartRim", () => new THREE.TorusGeometry(0.52, 0.03, 5, 20).rotateY(Math.PI / 2)), col("#d9b878"), wm);
    for (let k = 0; k < 6; k++) put(cached("cartSpoke", () => new THREE.CylinderGeometry(0.022, 0.022, 1.05, 5).rotateZ(Math.PI / 2)), col("#d9b878"), wm.clone().multiply(new THREE.Matrix4().makeRotationX((k * Math.PI) / 6)));
    put(cached("cartHub", () => new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8).rotateZ(Math.PI / 2)), col("#6a4a2a"), wm);
  }
};

// ---------------------------------------------------------------------------------------------------------------
// the hotel
// ---------------------------------------------------------------------------------------------------------------
const shieldTex = () => ctex("crestTex", 256, 320, (g) => {
  g.clearRect(0, 0, 256, 320);
  const sp = (inset: number) => { g.beginPath(); g.moveTo(14 + inset, 20 + inset); g.lineTo(242 - inset, 20 + inset); g.lineTo(242 - inset, 170); g.quadraticCurveTo(236 - inset, 262, 128, 306 - inset); g.quadraticCurveTo(20 + inset, 262, 14 + inset, 170); g.closePath(); };
  sp(0); g.fillStyle = "#e0a820"; g.fill(); g.lineWidth = 6; g.strokeStyle = "#5a3410"; g.stroke();
  sp(16); g.save(); g.clip(); g.fillStyle = "#2a4a9a"; g.fillRect(0, 0, 256, 150); g.fillStyle = "#c8282e"; g.fillRect(0, 150, 256, 200); g.fillStyle = "#fbf6e8"; g.fillRect(122, 150, 12, 200); g.restore();
  sp(16); g.lineWidth = 4; g.strokeStyle = "#5a3410"; g.stroke();
  g.fillStyle = "#fbf6e8"; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 22 : 54; g.lineTo(128 + Math.cos(a) * r, 100 + Math.sin(a) * r); } g.closePath(); g.fill(); g.lineWidth = 3; g.strokeStyle = "#5a3410"; g.stroke();
  g.fillStyle = "#e0a820"; g.beginPath(); g.arc(128, 222, 30, 0, Math.PI * 2); g.fill(); g.lineWidth = 4; g.stroke();
  g.fillStyle = "#c8282e"; g.beginPath(); g.arc(128, 222, 14, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#3a8a3a"; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.arc(128, 150, 96, 0.55, 2.6); g.stroke(); g.beginPath(); g.arc(128, 150, 96, 0.55 + Math.PI - 3.14 + 0.0, 2.6); g.stroke();
});
export type HotelRig = { group: THREE.Group; crest: THREE.Group; flags: THREE.Object3D[] };
/** the hotel group (local y = 0 the underside of the ground floor, front face on z = 0, the body back to z = -22) */
export const buildHotel = (): HotelRig => {
  const G = new THREE.Group(), b = new Batch(), faces = new Batch();
  const hoods: [number, number, number, number][] = []; // floor, bay, hw, y1 for decoration
  const winHoles = (k: number, hw: number, y0: number, y1: number): [number, number, number, number][] => HOTEL.BAYS.filter((_, i) => !(k === 1 && i === 2)).map((bx) => [bx, y0, y1, hw]);
  // ---- facade: one extrusion per floor with arched holes ----
  for (let k = 0; k < 6; k++) {
    const h = FH[k + 1] - FH[k], sh = new THREE.Shape();
    sh.moveTo(-W2, 0); sh.lineTo(W2, 0); sh.lineTo(W2, h); sh.lineTo(-W2, h); sh.closePath();
    if (k === 0) {
      for (const bx of [-7.2, -3.6, 3.6, 7.2]) sh.holes.push(archPath(bx, 0.7, 2.55, 0.85));
      sh.holes.push(archPath(0, 0, 2.75, 1.4));
    } else for (const [bx, y0, y1, hw] of winHoles(k, 0.8, HOTEL.SILL, 2.2)) sh.holes.push(archPath(bx, y0, y1, hw));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 10 });
    g.translate(0, FH[k], -0.7); scaleUV(g, 0.5);
    b.add(g, k === 0 ? plasterF("#e6d2a4") : brickF(k % 2 ? BRICK : "#a9482f"));
    // window dressing
    const ys0 = k === 0 ? 0.7 : HOTEL.SILL, ys1 = k === 0 ? 2.55 : 2.2, hw = k === 0 ? 0.85 : 0.8;
    const bays = k === 0 ? [-7.2, -3.6, 3.6, 7.2] : HOTEL.BAYS.filter((_, i) => !(k === 1 && i === 2));
    for (const bx of bays) {
      const y0 = FH[k] + ys0, y1 = FH[k] + ys1;
      b.add(hoodGeo(hw, ys1 - ys0, 0, 0.2, 0.16), col(CREAM), M4(bx, y0, 0));
      rb(b, col(CREAM), bx - hw - 0.18, bx + hw + 0.18, y0 - 0.14, y0 + 0.02, -0.2, 0.32, 0.03);                    // sill
      if (k > 0) for (const s of [-1, 1]) {
        rb(b, col("#2f7a4a"), bx + s * (hw + 0.48) - 0.24, bx + s * (hw + 0.48) + 0.24, y0 + 0.02, y1 + 0.5, 0.0, 0.1, 0.02);  // shutters
        for (let q = 0; q < 5; q++) rb(b, col("#5aa86a"), bx + s * (hw + 0.48) - 0.19, bx + s * (hw + 0.48) + 0.19, y0 + 0.2 + q * 0.42, y0 + 0.3 + q * 0.42, 0.1, 0.13, 0.005);
      }
      // curtains inside the opening (left / right) and the window frame sides
      const cc = ["#c8282e", "#f2e6c8", "#3a6ab0", "#e0a820", "#2f7a4a"][(k + Math.round((bx + 8) / 3.6)) % 5];
      for (const s of [-1, 1]) rb(faces, col(cc), bx + s * (hw - 0.14) - 0.14, bx + s * (hw - 0.14) + 0.14, y0 + 0.0, y1 + 0.45, -0.62, -0.5, 0.03);
      rb(faces, col("#fbf6ea"), bx - hw, bx + hw, y0 + 0.82, y0 + 0.9, -0.55, -0.5, 0.01); // inner sash rail below the guests' chests
    }
    if (k === 0) { for (const bx of [-7.2, -3.6, 3.6, 7.2]) awning(b, bx, FH[0] + 3.2, 0.1, 2.5, 1.3, bx < 0 ? "#2f7a4a" : "#3a6ab0"); }
    // string course
    if (k > 0) rb(b, col(CREAM), -W2 - 0.12, W2 + 0.12, FH[k] - 0.14, FH[k] + 0.12, -0.1, 0.24, 0.03);
    // interiors: back wall + floor + ceiling (lit rooms behind the openings)
    const wp = ["#d8a860", "#7ea890", "#d88a78", "#e0c470", "#8aa4cc", "#d8a860"][k], st = ["#f6e8c0", "#f4f0e0", "#f8e8d0", "#fff4d8", "#f6f0e8", "#f6e8c0"][k];
    const wall = texM("hwall" + k, () => P.wallpaperHD("h" + k, wp, st));
    faces.add(quad(V(-W2 + 0.05, FH[k], -2.4), V(W2 - 0.05, FH[k], -2.4), V(W2 - 0.05, FH[k + 1], -2.4), V(-W2 + 0.05, FH[k + 1], -2.4), HOTEL.W / 2, h / 2), wall);
    faces.add(quad(V(-W2 + 0.05, FH[k] + 0.04, -2.4), V(W2 - 0.05, FH[k] + 0.04, -2.4), V(W2 - 0.05, FH[k] + 0.04, -0.5), V(-W2 + 0.05, FH[k] + 0.04, -0.5), HOTEL.W / 2, 1), k === 0 ? texM("hcarpet", () => P.carpetHD()) : woodM("#8a5a34"));
    faces.add(quad(V(-W2 + 0.05, FH[k + 1] - 0.02, -0.5), V(W2 - 0.05, FH[k + 1] - 0.02, -0.5), V(W2 - 0.05, FH[k + 1] - 0.02, -2.4), V(-W2 + 0.05, FH[k + 1] - 0.02, -2.4), 4, 1), col("#f4ecd8"));
    // wainscot
    rb(faces, woodM("#6a4228"), -W2 + 0.05, W2 - 0.05, FH[k], FH[k] + 0.8, -2.4, -2.34, 0.01);
  }
  void hoods;
  // quoins up both corners
  for (const s of [-1, 1]) for (let y = 0; y < FH[6]; y += 0.9) rb(b, col(CREAM), s * W2 - (s > 0 ? (y / 0.9) % 2 ? 0.5 : 0.8 : (y / 0.9) % 2 ? 0.0 : 0.3) - (s > 0 ? 0 : 0) + (s < 0 ? -0.3 : 0), s * W2 + (s > 0 ? 0.3 : 0.3), y, y + 0.8, -0.1, 0.12, 0.02);
  // body (sides + back + roof), brick, with cream-framed windows along the sides
  const body = brickM();
  rb(b, body, -W2, W2, 0, FH[6], -HOTEL.D, -2.46, 0.05, 2);
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) for (const z of [-5.2, -9.6, -14.0, -18.4]) {
    const y0 = FH[k] + 0.9, hgt = k === 0 ? 2.3 : 1.9;
    rb(b, col(CREAM), s * W2 + (s > 0 ? -0.02 : -0.12), s * W2 + (s > 0 ? 0.12 : 0.02), y0 - 0.1, y0 + hgt + 0.1, z - 0.62, z + 0.62, 0.02);
    rb(b, col("#35507a"), s * W2 + (s > 0 ? 0.0 : -0.14), s * W2 + (s > 0 ? 0.14 : 0.0), y0, y0 + hgt, z - 0.5, z + 0.5, 0.01);
    rb(b, col("#2f7a4a"), s * W2 + (s > 0 ? 0.0 : -0.2), s * W2 + (s > 0 ? 0.2 : 0.0), y0, y0 + hgt, z - 0.98, z - 0.66, 0.01);
    rb(b, col("#2f7a4a"), s * W2 + (s > 0 ? 0.0 : -0.2), s * W2 + (s > 0 ? 0.2 : 0.0), y0, y0 + hgt, z + 0.66, z + 0.98, 0.01);
  }
  // roof, parapet, cornice with brackets and dentils
  rb(b, col("#52525c"), -W2 - 0.2, W2 + 0.2, FH[6], FH[6] + 0.25, -HOTEL.D - 0.2, 0.9, 0.04);
  rb(b, col(CREAM), -W2 - 0.4, W2 + 0.4, FH[6] - 0.3, FH[6] + 0.45, -0.1, 0.95, 0.05);
  rb(b, col("#d9c8a0"), -W2 - 0.55, W2 + 0.55, FH[6] + 0.45, FH[6] + 0.72, -0.2, 1.05, 0.05);
  for (const s of [-1, 1]) { rb(b, col(CREAM), s * (W2 + 0.4) - 0.2, s * (W2 + 0.4) + 0.2, FH[6] - 0.3, FH[6] + 0.72, -HOTEL.D, 0.95, 0.04); }
  for (let x = -8.6; x <= 8.7; x += 1.075) { rb(b, col(CREAM), x - 0.16, x + 0.16, FH[6] - 1.0, FH[6] - 0.3, -0.1, 0.62, 0.03); rb(b, col("#c8b080"), x - 0.1, x + 0.1, FH[6] - 0.5, FH[6] - 0.3, 0.62, 0.7, 0.02); }
  // pediment + crest ring, cupola with a copper dome, chimneys
  b.add(plate([[-3.6, 0], [3.6, 0], [0, 1.9]], 0.5, 0.04), col(CREAM), M4(0, FH[6] + 0.72, 0.4));
  b.add(plate([[-2.9, 0.2], [2.9, 0.2], [0, 1.55]], 0.52, 0.02), col("#c8282e"), M4(0, FH[6] + 0.72, 0.42));
  rb(b, col(CREAM), -3.9, 3.9, FH[6] + 0.72, FH[6] + 0.98, 0.0, 0.72, 0.04);
  for (const x of [-6.5, -2.2, 2.2, 6.5]) { rb(b, brickM("#9a3f2a"), x - 0.55, x + 0.55, FH[6], FH[6] + 2.4, -14 - (x > 0 ? 0 : 1) * 0.2, -13, 0.04); rb(b, col("#d6c8a0"), x - 0.7, x + 0.7, FH[6] + 2.4, FH[6] + 2.6, -14.15, -12.85, 0.03); }
  rb(b, brickM("#a9482f"), -1.7, 1.7, FH[6], FH[6] + 2.5, -9.5, -6.5, 0.05); rb(b, col(CREAM), -1.9, 1.9, FH[6] + 2.5, FH[6] + 2.8, -9.7, -6.3, 0.04);
  for (const s of [-1, 1]) { b.add(hoodGeo(0.4, 0.9, 0, 0.12, 0.1), col(CREAM), M4(s * 0.8, FH[6] + 0.8, -6.4)); b.add(new THREE.PlaneGeometry(0.8, 1.4), glow("#fff0c0", 1.1), M4(s * 0.8, FH[6] + 1.5, -6.38)); }
  b.add(lathe("dome", [[0, 0], [1.9, 0], [1.95, 0.2], [1.6, 0.9], [1.0, 1.6], [0.4, 2.1], [0.1, 2.4], [0, 2.5]], 18), shiny("#3f9a86", 60), M4(0, FH[6] + 2.8, -8));
  b.add(rod(V(0, FH[6] + 5.2, -8), V(0, FH[6] + 6.4, -8), 0.05), col(BRASS)); b.add(cached("domeBall", () => new THREE.SphereGeometry(0.16, 10, 8)), shiny(BRASS), M4(0, FH[6] + 5.3, -8));
  b.build(G, false);
  faces.build(G, false);
  // grillage under the building: long beams under every screw row, cross beams; the iron straps
  const gb = new Batch(), beam = woodM("#7a5230");
  for (let j = 0; j < SCREWS.ROWS; j++) rb(gb, beam, -W2 - 0.3, W2 + 0.3, -0.5, -0.12, screwZ(j) - 0.28, screwZ(j) + 0.28, 0.03, 1);
  for (let i = 0; i < 7; i++) rb(gb, woodM("#6a4626"), -W2 - 0.3 + i * 3.1, -W2 - 0.3 + i * 3.1 + 0.5, -0.12, 0.0, -HOTEL.D, 0.2, 0.02, 1);
  for (let j = 0; j < SCREWS.ROWS; j += 2) for (const x of [-7.2, 0, 7.2]) rb(gb, col("#3a3e48"), x - 0.4, x + 0.4, -0.52, -0.48, screwZ(j) - 0.3, screwZ(j) + 0.3, 0.005);
  gb.build(G, false);
  // the front stoop (steps are part of the street set) + entrance doors recess
  const eb = new Batch();
  rb(eb, col("#8a6a4a"), -1.3, 1.3, 0.0, 2.6, -1.9, -1.5, 0.03); // double doors recessed
  rb(eb, col("#5a3a22"), -1.3, 0.0, 0.0, 2.6, -1.0, -0.94, 0.02); rb(eb, col("#5a3a22"), 0.0, 1.3, 0.0, 2.6, -1.0, -0.94, 0.02);
  rb(eb, shiny(BRASS), -0.1, -0.04, 1.0, 1.5, -0.9, -0.84, 0.01); rb(eb, shiny(BRASS), 0.04, 0.1, 1.0, 1.5, -0.9, -0.84, 0.01);
  rb(eb, col("#fbf6ea"), -1.55, -1.4, 0, 3.3, -0.1, 0.35, 0.03); rb(eb, col("#fbf6ea"), 1.4, 1.55, 0, 3.3, -0.1, 0.35, 0.03);
  rb(eb, col("#8a6a4a"), -1.3, 1.3, 2.6, 3.0, -0.4, -0.35, 0.01);
  eb.build(G, false);
  // the entrance canopy, striped
  const cb = new Batch();
  awning(cb, 0, FH[0] + 3.1, 0.12, 4.4, 1.9, "#2f7a4a");
  for (const s of [-1, 1]) cb.add(rod(V(s * 2.0, 0, 1.7), V(s * 2.0, 2.55, 1.7), 0.05, 0.05, 6), shiny(BRASS));
  cb.build(G, false);
  // the crest (a pop-in group), flags
  const crest = new THREE.Group();
  const cm = new THREE.MeshBasicMaterial({ map: shieldTex(), alphaTest: 0.5, side: THREE.DoubleSide, color: new THREE.Color(0.95, 0.95, 0.95) });
  const cmesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.25), cm); cmesh.position.set(0, 0, 0.04);
  crest.add(cmesh);
  const cb2 = new Batch(); rb(cb2, col("#e0a820"), -1.45, 1.45, -1.78, -1.6, -0.05, 0.2, 0.03); rb(cb2, col(CREAM), -1.7, 1.7, 1.78, 1.98, -0.1, 0.3, 0.03); cb2.build(crest, false);
  crest.position.set(0, FH[1] + 1.8, 0.04); G.add(crest);
  const flags: THREE.Object3D[] = [];
  const mkFlag = (x: number, y: number, z: number, tex: () => THREE.Texture, w = 2.6, hgt = 1.6) => {
    const pole = new Batch(); pole.add(rod(V(x, y, z), V(x, y + 6.2, z), 0.06, 0.04, 8), col("#f2efe6")); pole.add(cached("finial", () => new THREE.SphereGeometry(0.1, 10, 8)), shiny(BRASS), M4(x, y + 6.28, z)); pole.build(G, false);
    const fg = cached("flagGeoH" + w, () => { const g = new THREE.PlaneGeometry(w, hgt, 14, 1); g.translate(w / 2, 0, 0); return g; });
    const m = new THREE.Mesh(fg, unlit("flag" + w + y + x, tex)); m.position.set(x, y + 5.2, z); m.userData.base = 0; G.add(m); flags.push(m);
  };
  const stripe = (c1: string, c2: string, c3: string) => () => P.ctex("pen" + c1 + c2, 600, 300, (g) => { g.fillStyle = c1; g.fillRect(0, 0, 600, 300); g.fillStyle = c2; g.fillRect(0, 100, 600, 100); g.fillStyle = c3; g.beginPath(); g.arc(70, 150, 40, 0, 7); g.fill(); });
  mkFlag(-8.2, FH[6] + 0.7, 0.2, () => P.flagHD()); mkFlag(8.2, FH[6] + 0.7, 0.2, () => P.flagHD());
  mkFlag(0, FH[6] + 2.6, 0.4, stripe("#c8282e", "#fbf6e8", "#2a4a9a"), 3.6, 1.8); mkFlag(-4.6, FH[6] + 0.7, 0.2, stripe("#2a4a9a", "#e8c040", "#c8282e"), 2.2, 1.3); mkFlag(4.6, FH[6] + 0.7, 0.2, stripe("#2f7a4a", "#fbf6e8", "#e8c040"), 2.2, 1.3);
  G.traverse((o) => { o.castShadow = false; });
  return { group: G, crest, flags };
};

// ---------------------------------------------------------------------------------------------------------------
// the jackscrew (instanced field + a detailed hero)
// ---------------------------------------------------------------------------------------------------------------
const SHAFT_L = 9.5;
const ironM = () => texM("ironM", () => P.ironHD("#4a505c"));
const threadM = () => {
  const m = texM("threadM", () => { const t = P.threadHD(); return t; });
  return m;
};
const housingGeo = () => cached("jsHousing", () => {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.BoxGeometry(0.72, 0.12, 0.72).translate(0, 0.06, 0));
  parts.push(new THREE.LatheGeometry([[0.001, 0.12], [0.34, 0.12], [0.3, 0.3], [0.24, 0.62], [0.28, 0.7], [0.28, 0.8], [0.001, 0.8]].map(([r, y]) => new THREE.Vector2(r, y)), 12));
  parts.push(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12).translate(0, 0.88, 0));
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => { g.deleteAttribute("uv"); g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; }), false);
});
const shaftGeo = () => cached("jsShaft", () => {
  const g = new THREE.CylinderGeometry(0.13, 0.13, SHAFT_L, 8, 1, true).translate(0, SHAFT_L / 2, 0);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * SHAFT_L * 1.7);
  return g;
});
const capGeo = () => cached("jsCap", () => new THREE.BoxGeometry(0.46, 0.12, 0.46));
const handleGeo = () => cached("jsHandle", () => {
  const parts = [new THREE.CylinderGeometry(0.034, 0.034, 1.2, 6).rotateZ(Math.PI / 2), new THREE.SphereGeometry(0.07, 8, 6).translate(0.6, 0, 0), new THREE.SphereGeometry(0.07, 8, 6).translate(-0.6, 0, 0),
    new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10)];
  return mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute("uv"); n.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }), false);
});
/** helical thread (r core, a thread depth, pitch, length), smooth normals, for the hero CU */
const helix = (r: number, a: number, pitch: number, L: number) => {
  const nθ = 18, nY = Math.round((L / pitch) * 8), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nY; j++) for (let i = 0; i <= nθ; i++) {
    const th = (i / nθ) * Math.PI * 2, y = (j / nY) * L, ph = (y / pitch - th / (Math.PI * 2)) % 1, tri2 = Math.abs(((ph + 1) % 1) * 2 - 1), rr = r + a * (1 - tri2) ** 1.2;
    pos.push(Math.cos(th) * rr, y, Math.sin(th) * rr); uv.push(i / nθ, y / 0.5);
  }
  for (let j = 0; j < nY; j++) for (let i = 0; i < nθ; i++) { const a0 = j * (nθ + 1) + i, a1 = a0 + 1, b0 = a0 + nθ + 1, b1 = b0 + 1; idx.push(a0, b0, a1, a1, b0, b1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};
export type HeroRig = { group: THREE.Group; bar: THREE.Group; shaft: THREE.Mesh };
const buildHero = (): HeroRig => {
  const G = new THREE.Group(), b = new Batch(), iron = ironM();
  // sleeper plank, base plate with bolts, bell casting, hex nut
  rb(b, woodM("#8a5a34"), -0.9, 0.9, 0, 0.14, -0.9, 0.9, 0.03, 1);
  rb(b, iron, -0.5, 0.5, 0.14, 0.3, -0.5, 0.5, 0.04);
  for (const sx of [-0.4, 0.4]) for (const sz of [-0.4, 0.4]) b.add(cached("bolt", () => new THREE.CylinderGeometry(0.06, 0.06, 0.07, 6)), col("#2a2d36"), M4(sx, 0.34, sz));
  b.add(lathe("heroBell", [[0.001, 0.3], [0.38, 0.3], [0.34, 0.5], [0.26, 0.85], [0.3, 0.95], [0.3, 1.05], [0.001, 1.05]], 16), iron, M4(0, 0, 0));
  b.add(cached("heroNut", () => new THREE.CylinderGeometry(0.27, 0.27, 0.28, 6)), shiny("#5c6270", 40), M4(0, 1.2, 0));
  b.add(cached("heroHub", () => new THREE.CylinderGeometry(0.17, 0.17, 0.3, 12)), shiny("#6a7080", 50), M4(0, 1.5, 0));
  b.build(G, true);
  const shaft = new THREE.Mesh(helix(0.12, 0.05, 0.2, 2.2), lam("heroThread", () => ({ map: P.ironHD("#7a808c") })));
  shaft.position.y = 1.0; shaft.castShadow = true; G.add(shaft);
  // the saddle under the beam
  const sb = new Batch(); rb(sb, iron, -0.3, 0.3, 3.15, 3.3, -0.3, 0.3, 0.03); sb.build(G, true);
  const bar = new THREE.Group(); const bb = new Batch();
  bb.add(rod(V(-0.6, 0, 0), V(0.6, 0, 0), 0.05, 0.05, 8), col("#3c404a"));
  for (const s of [-1, 1]) bb.add(cached("barBall", () => new THREE.SphereGeometry(0.1, 10, 8)), shiny(BRASS, 60), M4(s * 0.63, 0, 0));
  bb.build(bar, true); bar.position.y = 1.5; G.add(bar);
  G.traverse((o) => { o.receiveShadow = true; });
  return { group: G, bar, shaft };
};

// ---------------------------------------------------------------------------------------------------------------
// the plaza blocks, props, measuring board
// ---------------------------------------------------------------------------------------------------------------
/** a brick / stucco block facing the plaza (front face on x = xf, looking dir = +-x), spanning z0..z1, height h */
const block = (b: Batch, xf: number, dir: 1 | -1, z0: number, z1: number, h: number, wall: THREE.Material, awn: string, seed: number, depth = 12) => {
  const r = rng(seed), xb = xf - dir * depth;
  rb(b, wall, Math.min(xf, xb), Math.max(xf, xb), 0, h, z0, z1, 0.05, 2);
  rb(b, col(CREAM), Math.min(xf, xb) - 0.2, Math.max(xf, xb) + 0.2, h, h + 0.45, z0 - 0.25, z1 + 0.25, 0.05);
  rb(b, col(CREAM), xf - 0.12 * dir - 0.1, xf + 0.12 * dir + 0.1, 3.4, 3.65, z0, z1, 0.02);
  const nw = Math.max(2, Math.round((z1 - z0) / 2.6)), floors = Math.floor((h - 3.9) / 3.2);
  for (let k = 0; k < nw; k++) {
    const z = z0 + ((z1 - z0) * (k + 0.5)) / nw;
    for (let fl = 0; fl < floors; fl++) {
      const y = 4.3 + fl * 3.2;
      rb(b, col("#f2ece0"), xf + dir * 0.02 - 0.06, xf + dir * 0.14 + 0.06, y - 0.1, y + 2.0, z - 0.72, z + 0.72, 0.03);
      rb(b, col(r() > 0.3 ? "#3a4a6e" : "#e8d8a8"), xf + dir * 0.12 - 0.05, xf + dir * 0.18 + 0.05, y + 0.05, y + 1.9, z - 0.56, z + 0.56, 0.01);
      if (r() > 0.5) for (const s of [-1, 1]) rb(b, col("#2f7a4a"), xf + dir * 0.14 - 0.05, xf + dir * 0.2 + 0.05, y + 0.05, y + 1.9, z + s * 0.9 - 0.22, z + s * 0.9 + 0.22, 0.01);
    }
    // shop front: dark window + awning
    rb(b, col("#2f3a4a"), xf + dir * 0.1 - 0.05, xf + dir * 0.16 + 0.05, 0.5, 2.9, z - 0.95, z + 0.95, 0.02);
    awning(b, xf + dir * 0.2, 3.3, z, 2.0, 1.4, ["#2f7a4a", "#c8282e", "#3a6ab0", "#e0a820"][(k + seed) % 4], "#fbf6ea", dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  for (let k = 0; k < 2; k++) rb(b, brickM("#9a3f2a"), xb + dir * 2 - 0.4 + k * 3, xb + dir * 2 + 0.4 + k * 3, h, h + 2.2, z0 + 2 + k * 3, z0 + 2.8 + k * 3, 0.03);
};
const measureBoard = (G: THREE.Group) => {
  const bd = new Batch(), tex = texM("boardTex", () => P.ctex("boardTex", 128, 1024, (g) => {
    g.fillStyle = "#f2e8cc"; g.fillRect(0, 0, 128, 1024);
    const y0 = 3.14, py = (y: number) => 1024 - (y / 8) * 1024;
    for (let k = 0; k < 20; k++) { g.fillStyle = "#3a2a1a"; g.fillRect(8, py(0.4 + k * 0.4) - 2, k % 2 ? 40 : 64, 4); }
    for (let k = 0; k <= 6; k++) { g.fillStyle = k % 2 ? "#fbf6e8" : "#c8282e"; if (k < 6) g.fillRect(64, py(y0 + 0.4 * (k + 1)), 60, py(y0 + 0.4 * k) - py(y0 + 0.4 * (k + 1))); g.fillStyle = "#1a1a1a"; g.fillRect(4, py(y0 + 0.4 * k) - 4, 120, 8); }
  }));
  const [x, , z] = SPOT.BOARD;
  rb(bd, tex, x - 0.6, x + 0.6, 0, 8, z - 0.08, z + 0.08, 0.02);
  for (const s of [-1, 1]) rb(bd, woodM("#6a4626"), x + s * 0.7 - 0.08, x + s * 0.7 + 0.08, 0, 8.2, z - 0.12, z + 0.12, 0.02);
  rb(bd, woodM("#6a4626"), x - 0.8, x + 0.8, 8.0, 8.25, z - 0.12, z + 0.12, 0.02);
  rb(bd, woodM("#5a3a22"), x - 1.2, x + 1.2, 0, 0.3, z - 0.7, z + 0.7, 0.03);
  bd.build(G, true);
  const fl = new THREE.Group(); const fb = new Batch();
  fb.add(tri(V(0, 0.28, 0), V(0.95, 0, 0), V(0, -0.28, 0)), col("#e02a2a", THREE.DoubleSide)); rb(fb, col("#fbf6e8"), -0.05, 0.05, -0.3, 0.3, -0.04, 0.04, 0.01);
  fb.build(fl, false); fl.position.set(x + 0.45, 3.14, z + 0.12); G.add(fl);
  return fl;
};
const scaffold = (): THREE.Group => {
  const G = new THREE.Group(), b = new Batch(), x0 = -5.6, x1 = -1.6, z0 = 0.5, z1 = 2.9, top = 13.2, lv = [3.4, 6.8, 10.2, 11.8];
  for (const x of [x0, x1]) for (const z of [z0, z1]) rb(b, woodM("#9a7a58"), x - 0.07, x + 0.07, 0, top, z - 0.07, z + 0.07, 0.02);
  for (const y of lv) { rb(b, woodM("#c9a070"), x0 - 0.2, x1 + 0.2, y - 0.08, y + 0.02, z0 - 0.1, z1 + 0.2, 0.01, 0.5); for (const z of [z0, z1]) rb(b, woodM("#8a6a48"), x0, x1, y - 0.2, y - 0.08, z - 0.06, z + 0.06, 0.01); }
  for (const y of [11.8]) { for (const z of [z0 - 0.0, z1]) rb(b, woodM("#9a7a58"), x0, x1, y + 0.95, y + 1.05, z - 0.04, z + 0.04, 0.01); rb(b, woodM("#9a7a58"), x1 - 0.05, x1 + 0.05, y + 0.95, y + 1.05, z0, z1, 0.01); }
  for (let k = 0; k < 3; k++) { b.add(rod(V(x0, lv[k], z1), V(x1, lv[k + 1], z1), 0.035, 0.035, 5), woodM("#8a6a48")); b.add(rod(V(x1, lv[k], z1), V(x0, lv[k + 1], z1), 0.035, 0.035, 5), woodM("#8a6a48")); }
  b.add(rod(V(x1 + 0.3, 0, z1 + 0.3), V(x1 + 0.3, 11.8, z1 + 0.1), 0.05, 0.05, 5), woodM("#9a7a58")); b.add(rod(V(x1 + 0.7, 0, z1 + 0.3), V(x1 + 0.7, 11.8, z1 + 0.1), 0.05, 0.05, 5), woodM("#9a7a58"));
  for (let y = 0.5; y < 11.8; y += 0.5) b.add(rod(V(x1 + 0.3, y, z1 + 0.3 - 0.2 * (y / 11.8)), V(x1 + 0.7, y, z1 + 0.3 - 0.2 * (y / 11.8)), 0.025, 0.025, 5), woodM("#9a7a58"));
  b.build(G, true);
  return G;
};
/** the Tremont's window of shot 13: glass, muntins, a flower pot and a glass of water on the sill (local to the hotel) */
const window13 = (): THREE.Group => {
  const G = new THREE.Group(), x = SPOT.WINDOW13[0], y0 = FH[1] + HOTEL.SILL, hw = 0.8;
  const sh = new THREE.Shape(); sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(hw, 1.35); sh.absarc(0, 1.35, hw, 0, Math.PI, false); sh.lineTo(-hw, 0);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(sh, 12), new THREE.MeshLambertMaterial({ color: "#bfe0f2", transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.set(x, y0, -0.28); G.add(glass);
  const b = new Batch();
  for (const dx of [-0.02, 0.02]) rb(b, col("#fbf6ea"), x + dx - 0.03, x + dx + 0.03, y0, y0 + 2.15, -0.3, -0.26, 0.005);
  rb(b, col("#fbf6ea"), x - hw, x + hw, y0 + 0.95, y0 + 1.01, -0.3, -0.26, 0.005);
  rb(b, col("#fbf6ea"), x - hw, x + hw, y0 + 0.0, y0 + 0.06, -0.3, -0.26, 0.005);
  rb(b, col(CREAM), x - hw - 0.1, x + hw + 0.1, y0 - 0.06, y0 + 0.0, -0.9, -0.2, 0.02); // inner sill
  // flower pot + flower
  b.add(lathe("pot", [[0, 0], [0.12, 0], [0.16, 0.22], [0.18, 0.25], [0.18, 0.3], [0, 0.3]], 12), col("#c8643a"), M4(x - 0.35, y0, -0.55));
  b.add(rod(V(x - 0.35, y0 + 0.28, -0.55), V(x - 0.33, y0 + 0.78, -0.55), 0.015, 0.015, 5), col("#3a8a3a"));
  for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; b.add(cached("petal", () => new THREE.SphereGeometry(0.07, 8, 6)), col("#e8404a"), M4(x - 0.33 + Math.cos(a) * 0.1, y0 + 0.8 + Math.sin(a) * 0.1, -0.52)); }
  b.add(cached("fcenter", () => new THREE.SphereGeometry(0.06, 8, 6)), col("#f2c23a"), M4(x - 0.33, y0 + 0.8, -0.5));
  for (const s of [-1, 1]) b.add(tri(V(x - 0.35, y0 + 0.4, -0.55), V(x - 0.35 + s * 0.22, y0 + 0.55, -0.55), V(x - 0.35 + s * 0.05, y0 + 0.5, -0.55)), col("#3a9a3a", THREE.DoubleSide));
  // glass of water
  b.add(lathe("tumbler", [[0, 0], [0.07, 0], [0.09, 0.16], [0.085, 0.17], [0, 0.17]], 12), new THREE.MeshLambertMaterial({ color: "#d8f0fa", transparent: true, opacity: 0.4, depthWrite: false }), M4(x + 0.4, y0, -0.55));
  b.add(cached("water", () => new THREE.CylinderGeometry(0.075, 0.07, 0.12, 12)), col("#5aa8d8"), M4(x + 0.4, y0 + 0.07, -0.55));
  b.build(G, false);
  return G;
};

// ---------------------------------------------------------------------------------------------------------------
// the street set
// ---------------------------------------------------------------------------------------------------------------
export const buildStreet = (): SetRig & { hero: HeroRig; hotel: HotelRig } => {
  const b = new Batch(), r = rng(31);
  const dirt = groundM("streetDirt", () => P.dirtRoadHD());
  terrain(b, dirt, -FAR, FAR, -FAR, FAR, 4, undefined, 4, -0.06);
  terrain(b, texPlaza(), -34, 34, -40, 110, 4, undefined, 4, 0.0);
  terrain(b, groundM("verdant", () => P.pastureHD("pastureS", "#7ab24e")), -FAR, -45, -FAR, FAR, 4, undefined, 4, 0.0);
  terrain(b, groundM("verdant", () => P.pastureHD("pastureS", "#7ab24e")), 45, FAR, -FAR, FAR, 4, undefined, 4, 0.0);
  // plank sidewalk across the hotel front
  rb(b, woodM("#9a7a58"), -12.5, 12.5, 0, 0.2, 0.2, 3.4, 0.03, 2);
  // cross-plaza ruts and a worn dirt road centre
  // flanking blocks: brick / stucco rows facing the plaza
  const WALL = [brickM("#b4513a"), brickM("#c8805a"), plasterM("#e8d4a0"), brickM("#9a4a36"), plasterM("#d8c090"), brickM("#c06a48")];
  for (const side of [-1, 1] as const) { let z = -26, i = 0; while (z < 100) { const w = 10 + 4 * ((i * 5 + (side > 0 ? 2 : 0)) % 3), h = 9.5 + 3.2 * ((i * 7 + (side > 0 ? 1 : 3)) % 4); block(b, side * 24, side > 0 ? -1 : 1, z, z + w - 0.3, h, WALL[(i + (side > 0 ? 2 : 0)) % 6], "", i * 13 + side, 12); z += w; i++; } }
  // a distant skyline behind the hotel: a church spire, a grain elevator, stacks (haze takes them)
  for (let k = 0; k < 9; k++) { const x = -70 + k * 17.5 + 5 * r(), h = 10 + 9 * r(); rb(b, WALL[k % 6], x, x + 10, 0, h, -62 - 8 * r(), -50, 0.06, 2); rb(b, col("#6a4a46"), x - 0.3, x + 10.3, h, h + 0.5, -62.3, -49.7, 0.04); }
  rb(b, plasterM("#d8c8a0"), 30, 36, 0, 38, -78, -72, 0.05); b.add(cached("spire", () => new THREE.ConeGeometry(4.8, 20, 4)), shiny("#6a8a7a", 40), M4(33, 48, -75, Math.PI / 4));
  rb(b, plasterM("#c8a880"), -52, -40, 0, 30, -90, -78, 0.05); rb(b, col("#8a6a4a"), -52.5, -39.5, 30, 31.5, -90.5, -77.5, 0.05);
  for (const x of [-60, -48]) b.add(rod(V(x, 0, -100), V(x, 46, -100), 1.1, 0.7, 10), brickM("#8a4a36"));
  // street furniture: lamps, barrels, crates, lumber piles, carts, trees
  for (const x of [-11.5, 11.5]) gasLamp(b, x, 0.2, 3.1);
  for (const [x, z, k] of [[-14, 8, 0], [14.5, 12, 1], [-18, 22, 2], [17, 26, 3]] as [number, number, number][]) { gasLamp(b, x, 0, z); void k; }
  for (const [x, z] of [[-10.2, 3.0], [10.6, 3.2], [11.2, 3.0], [-10.8, 3.3]] as [number, number][]) barrel(b, x, 0.2, z, 1.0);
  for (let k = 0; k < 6; k++) crate(b, -15 + k * 0.9 + (k % 2) * 0.3, 0, 9.5 + (k % 3) * 0.8, 0.9, 0.8 + 0.2 * (k % 2), 0.9, k * 0.3);
  for (let k = 0; k < 4; k++) for (let l = 0; l < 3; l++) rb(b, woodM("#c9a070"), 15 + l * 0.0, 20.2, 0.18 + l * 0.2, 0.36 + l * 0.2, 6 + k * 1.0, 6.9 + k * 1.0, 0.02, 1);
  for (let l = 0; l < 6; l++) rb(b, woodM("#c9a070"), 14.8, 19.8, 0.1 + l * 0.2, 0.28 + l * 0.2, 14, 14.8, 0.02, 1);
  cart(b, -13.5, 0, 15, 0.5); cart(b, 14, 0, 30, -0.3); cart(b, -17, 0, 40, 0.1);
  for (let i = 0; i < 14; i++) addVeg(b, "round", (i % 2 ? 1 : -1) * (30 + 9 * r()), 0, 12 + i * 13 + r() * 5, 5 + 2 * r(), i * 17, 1);
  // the foreman's crate, the board
  rb(b, woodM("#b88a58"), SPOT.FOREMAN[0] - 0.7, SPOT.FOREMAN[0] + 0.7, 0, 0.55, SPOT.FOREMAN[2] - 0.7, SPOT.FOREMAN[2] + 0.7, 0.04);
  hillRing(b, 0, 0, 800, 8, 20, 12, "#8a9a78");
  const rig: SetRig = { name: "street", group: new THREE.Group() };
  const G = rig.group; G.name = "street"; b.build(G, true);
  // the plinth + steps for shot 7 (visible only then)
  const pb = new Batch();
  rb(pb, plasterM("#cfc2a0"), -9.4, 9.4, 0, 0.56, -22.4, 0.45, 0.04, 2);
  for (let k = 0; k < 4; k++) rb(pb, col("#c8b898"), -2.8, 2.8, 0, 0.56 - k * 0.14, 0.4 + k * 0.4, 0.8 + k * 0.4, 0.02);
  const plinth = new THREE.Group(); pb.build(plinth, true); G.add(plinth);
  // hotel
  const hotel = buildHotel(); G.add(hotel.group);
  // timber cribbing among the screws (static)
  const cb = new Batch();
  for (let j = 0; j < SCREWS.ROWS; j++) for (let i = 0; i < SCREWS.COLS; i += 3) if ((i + j) % 2 === 0) cribStack(cb, screwX(i), screwZ(j) - 0.6, 3 + ((i + j) % 3 === 0 ? 1 : 0), 0.7);
  const crib = new THREE.Group(); cb.build(crib, true); G.add(crib);
  // instanced jackscrews
  const N = SCREWS.COLS * SCREWS.ROWS;
  const mk = (g: THREE.BufferGeometry, m: THREE.Material) => { const im = new THREE.InstancedMesh(g, m, N); im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); G.add(im); return im; };
  const housings = mk(housingGeo(), ironM()), shafts = mk(shaftGeo(), threadM()), caps = mk(capGeo(), lam("capIron", () => ({ color: "#5a6070" }))), handles = mk(handleGeo(), lam("handleIron", () => ({ color: "#3a3e48" })));
  (shafts.material as THREE.Material).side = THREE.DoubleSide;
  const hero = buildHero(); const hp = SPOT.HERO_SCREW; hero.group.position.set(hp[0], 0, hp[2]); G.add(hero.group);
  // measuring board + scaffold + window 13 + hero
  const flag = measureBoard(G);
  const scaf = scaffold(); G.add(scaf);
  const w13 = window13(); hotel.group.add(w13);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), ps = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), yq = new THREE.Vector3(0, 1, 0);
  const IH = 6;
  rig.tick = (t, id) => {
    const f = Math.round(t * 30), H = hotelY(id, f);
    hotel.group.position.y = H;
    plinth.visible = id === 7;
    const field = id !== 7;
    for (const im of [housings, shafts, caps, handles]) im.visible = field;
    crib.visible = field; hero.group.visible = field && id !== 12; scaf.visible = id === 13; w13.visible = id === 13;
    { const u = (f - EV.CREST7 + 2) / 14; hotel.crest.scale.setScalar(id === 7 ? (u <= 0 ? 0.0001 : Math.max(0.0001, glide(u * 1.4) * (1 + 0.2 * Math.sin(Math.min(1, u) * Math.PI)))) : 1); }
    hotel.flags.forEach((fl, k) => { fl.rotation.y = 0.15 * Math.sin(t * 3 + k) + 0.1; });
    if (id === 11 || id === 12) { /* board flag */ }
    flag.position.y = 3.14 + 0.4 * (id === 11 ? Math.max(0, boardK(f)) : id >= 12 ? 6 : 0);
    flag.parent!.visible = true;
    if (!field) return;
    const top = H - 0.35;
    let n = 0;
    for (let j = 0; j < SCREWS.ROWS; j++) {
      const turn = screwTurn(f, j);
      for (let i = 0; i < SCREWS.COLS; i++, n++) {
        const x = screwX(i), z = screwZ(j), hide = i === Math.round(IH) && j === 0 && (id === 9 || id === 10 || id === 11);
        const s = hide ? 0.0001 : 1;
        sc.set(s, s, s);
        ps.set(x, 0, z); q.identity(); m4.compose(ps, q, sc); housings.setMatrixAt(n, m4);
        ps.set(x, top - SHAFT_L, z); q.setFromAxisAngle(yq, turn + i * 0.7); m4.compose(ps, q, sc); shafts.setMatrixAt(n, m4);
        ps.set(x, top - 0.5, z); q.identity(); m4.compose(ps, q, sc); caps.setMatrixAt(n, m4);
        ps.set(x, 1.15, z); q.setFromAxisAngle(yq, turn + i * 0.7); m4.compose(ps, q, sc); handles.setMatrixAt(n, m4);
      }
    }
    for (const im of [housings, shafts, caps, handles]) im.instanceMatrix.needsUpdate = true;
    // hero: the shaft follows the beam; the crossbar slides in with a clunk @ SCREW9
    const turnH = screwTurn(f, 0);
    hero.shaft.rotation.y = turnH; hero.shaft.scale.y = (top - 0.05 - 1.0) / 2.2;
    const slide = id === 9 && f < EV.SCREW9 ? 1.4 * (1 - glide((f - (EV.SCREW9 - 24)) / 24)) * 1 : 0;
    hero.bar.position.x = slide; hero.bar.rotation.y = turnH + (id === 9 ? 0 : 0);
    void riseAt;
  };
  return Object.assign(rig, { hero, hotel });
};

// ---------------------------------------------------------------------------------------------------------------
// the cutaway dollhouse (shot 12)
// ---------------------------------------------------------------------------------------------------------------
const signTex = (open: boolean) => ctex("openSign" + open, 256, 256, (g) => {
  g.fillStyle = open ? "#2f9a4a" : "#c8282e"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = "#fbf6e8"; g.stroke();
  g.fillStyle = "#fbf6e8"; g.strokeStyle = "#fbf6e8";
  if (open) { g.beginPath(); g.arc(92, 128, 30, 0, 7); g.lineWidth = 14; g.stroke(); g.fillRect(118, 120, 110, 16); g.fillRect(190, 120, 14, 44); g.fillRect(160, 120, 14, 34); }
  else { g.fillRect(40, 112, 176, 32); }
});
export type CutRig = { group: THREE.Group; house: THREE.Group; sign: THREE.Group; clockM: THREE.Object3D; clockH: THREE.Object3D };
export const buildCutaway = (): SetRig & CutRig => {
  const rig: SetRig = { name: "cutaway", group: new THREE.Group() }, G = rig.group, r = rng(77);
  // ---- the ground, the street, the neighbours ----
  const gb = new Batch();
  terrain(gb, groundM("cutDirt", () => P.stubbleHD("cutStub", "#c8a064")), -FAR, FAR, -FAR, FAR, 4, undefined, 4, -0.06);
  terrain(gb, groundM("verdant", () => P.pastureHD("pastureS", "#7ab24e")), -FAR, -60, -FAR, FAR, 4, undefined, 4, 0.0);
  terrain(gb, groundM("verdant", () => P.pastureHD("pastureS", "#7ab24e")), 60, FAR, -FAR, FAR, 4, undefined, 4, 0.0);
  const WALL = [brickM("#b4513a"), brickM("#c8805a"), plasterM("#e8d4a0"), brickM("#9a4a36"), plasterM("#d8c090")];
  for (const side of [-1, 1] as const) { let z = -26, i = 0; while (z < 60) { const w = 10 + 3 * ((i * 5) % 3), h = 8 + 3 * ((i * 7 + 2) % 4); block(gb, side * 19, side > 0 ? -1 : 1, z, z + w - 0.3, h, WALL[(i + (side > 0 ? 2 : 0)) % 5], "", i * 9 + side, 12); z += w; i++; } }
  for (let k = 0; k < 7; k++) { const x = -60 + k * 20 + 5 * r(), h = 10 + 9 * r(); rb(gb, WALL[k % 5], x, x + 11, 0, h, -48 - 6 * r(), -36, 0.06, 2); }
  rb(gb, plasterM("#d8c8a0"), 22, 28, 0, 34, -58, -52, 0.05); gb.add(cached("spire", () => new THREE.ConeGeometry(4.8, 18, 4)), shiny("#6a8a7a", 40), M4(25, 43, -55, Math.PI / 4));
  for (const x of [-9, 9]) gasLamp(gb, x, 0, 8);
  for (let k = 0; k < 4; k++) barrel(gb, -13 + k * 0.9, 0, 6 + (k % 2) * 0.7, 1);
  cart(gb, 14, 0, 18, 0.4);
  for (let i = 0; i < 8; i++) addVeg(gb, "round", (i % 2 ? 1 : -1) * (28 + 6 * r()), 0, 4 + i * 11, 5 + 2 * r(), i * 19, 1);
  hillRing(gb, 0, 0, 800, 8, 20, 12, "#8a9a78");
  gb.build(G, true);
  // ---- the jackscrews under the house (a few rows) ----
  const NS = 10 * 3, mk = (g: THREE.BufferGeometry, m: THREE.Material) => { const im = new THREE.InstancedMesh(g, m, NS); im.frustumCulled = false; im.castShadow = true; G.add(im); return im; };
  const housings = mk(housingGeo(), ironM()), shafts = mk(shaftGeo(), threadM()), caps = mk(capGeo(), lam("capIron", () => ({ color: "#5a6070" }))), handles = mk(handleGeo(), lam("handleIron", () => ({ color: "#3a3e48" })));
  (shafts.material as THREE.Material).side = THREE.DoubleSide;
  const cr = new Batch(); for (let k = 0; k < 10; k += 2) for (const z of [-0.9, -2.9, -4.9]) cribStack(cr, -5.4 + k * 1.2 + 0.7, z + 0.5, 3); cr.build(G, true);
  // ---- the house ----
  const house = new THREE.Group(); G.add(house);
  const hb = new Batch(), hw = SPOT.CUT_W / 2, D = SPOT.CUT_D, RH = SPOT.ROOM_H, TOP = SPOT.CUT_TOP;
  const rooms: { y: number; wall: string; stripe: string; name: string }[] = [
    { y: RH[0], wall: "#d8a04a", stripe: "#f6e8c0", name: "lobby" }, { y: RH[1], wall: "#4f9a6a", stripe: "#f2e0a0", name: "dining" }, { y: RH[2], wall: "#8fb4dc", stripe: "#fbf6ea", name: "bed" }];
  const yF = (k: number) => RH[k] + 0.35;
  rooms.forEach((rm, k) => {
    const y0 = rm.y + 0.35, y1 = (RH[k + 1] ?? TOP) , hgt = y1 - y0;
    hb.add(quad(V(-hw, y0, -D), V(hw, y0, -D), V(hw, y1, -D), V(-hw, y1, -D), SPOT.CUT_W / 2, hgt / 2), texM("cutwall" + k, () => P.wallpaperHD("c" + k, rm.wall, rm.stripe)));
    for (const s of [-1, 1]) hb.add(quad(V(s * hw, y0, s > 0 ? -D : 0), V(s * hw, y0, s > 0 ? 0 : -D), V(s * hw, y1, s > 0 ? 0 : -D), V(s * hw, y1, s > 0 ? -D : 0), D / 2, hgt / 2), texM("cutwall" + k, () => P.wallpaperHD("c" + k, rm.wall, rm.stripe)));
    rb(hb, k === 1 ? woodM("#5a3a22") : woodM("#6a4228"), -hw, hw, y0, y0 + 0.9, -D, -D + 0.07, 0.01); // wainscot
    for (const s of [-1, 1]) rb(hb, woodM("#6a4228"), s * hw - (s > 0 ? 0.07 : 0), s * hw + (s > 0 ? 0 : 0.07), y0, y0 + 0.9, -D, 0, 0.01);
    hb.add(quad(V(-hw, y0, 0), V(hw, y0, 0), V(hw, y0, -D), V(-hw, y0, -D), SPOT.CUT_W / 2, D / 2), k === 0 ? texM("cutchecker", () => P.checkerHD()) : k === 1 ? woodM("#8a5a34") : woodM("#a0764a"));
  });
  // floors, ceilings (slabs), brick end piers, cornice, roof
  for (let k = 0; k <= 3; k++) { const y = k < 3 ? RH[k] : TOP; rb(hb, plasterM("#e6d2a4"), -hw - 0.7, hw + 0.7, y, y + 0.35, -D - 0.1, 0.25, 0.03); rb(hb, col("#c8b080"), -hw - 0.75, hw + 0.75, y - 0.05, y + 0.08, 0.1, 0.3, 0.02); }
  for (const s of [-1, 1]) { rb(hb, brickM(), s * hw + (s > 0 ? 0 : -0.7), s * hw + (s > 0 ? 0.7 : 0), 0, TOP, -D - 0.1, 0.3, 0.04, 2); for (let y = 0; y < TOP; y += 0.9) rb(hb, col(CREAM), s * hw + (s > 0 ? -0.05 : -0.8), s * hw + (s > 0 ? 0.8 : 0.05), y, y + 0.8, 0.0, 0.34, 0.02); }
  rb(hb, brickM("#a9482f"), -hw - 0.7, hw + 0.7, 0, TOP, -D - 0.5, -D - 0.1, 0.03, 2);
  rb(hb, col("#52525c"), -hw - 0.9, hw + 0.9, TOP + 0.35, TOP + 0.6, -D - 0.7, 0.45, 0.03);
  rb(hb, col(CREAM), -hw - 1.0, hw + 1.0, TOP + 0.6, TOP + 1.2, -D - 0.7, 0.5, 0.04); rb(hb, col("#d9c8a0"), -hw - 1.1, hw + 1.1, TOP + 1.2, TOP + 1.45, -D - 0.7, 0.6, 0.04);
  for (let x = -hw; x <= hw; x += 0.75) rb(hb, col(CREAM), x - 0.12, x + 0.12, TOP + 0.1, TOP + 0.45, 0.25, 0.5, 0.02);
  hb.add(plate([[-3.0, 0], [3.0, 0], [0, 1.7]], 0.5, 0.04), col(CREAM), M4(0, TOP + 1.45, -0.5)); hb.add(plate([[-2.4, 0.2], [2.4, 0.2], [0, 1.4]], 0.52, 0.02), col("#c8282e"), M4(0, TOP + 1.45, -0.48));
  rb(hb, col("#3a3e48"), -hw - 0.9, hw + 0.9, -0.55, -0.1, -D - 0.7, 0.45, 0.03);
  rb(hb, woodM("#7a5230"), -hw - 0.9, hw + 0.9, -0.5, -0.12, -D - 0.7, 0.45, 0.03, 1);
  // the lobby ----------------------------------------------------
  const L = yF(0);
  hb.add(quad(V(-0.9, L + 0.01, -0.2), V(0.9, L + 0.01, -0.2), V(0.9, L + 0.01, -D + 2.4), V(-0.9, L + 0.01, -D + 2.4), 1, 3), texM("cutcarpet", () => P.carpetHD()));
  rb(hb, woodM("#5a3a22"), -1.6, 2.6, L, L + 0.9, -3.9, -2.9, 0.04); rb(hb, woodM("#7a5030"), -1.7, 2.7, L + 0.9, L + 1.0, -4.0, -2.8, 0.03); rb(hb, shiny(BRASS), -1.6, 2.6, L + 0.25, L + 0.3, -2.9, -2.86, 0.01);
  rb(hb, woodM("#4a2e1a"), -0.2, 3.9, L + 1.6, L + 3.4, -D + 0.02, -D + 0.3, 0.03);                         // key rack
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { rb(hb, col("#1e120a"), -0.1 + i * 0.47, 0.28 + i * 0.47, L + 1.7 + j * 0.42, L + 2.0 + j * 0.42, -D + 0.3, -D + 0.34, 0.005); if ((i * 3 + j * 5) % 4) hb.add(cached("keyDot", () => new THREE.SphereGeometry(0.05, 6, 5)), shiny(BRASS), M4(0.09 + i * 0.47, L + 1.85 + j * 0.42, -D + 0.37)); }
  for (const s of [-1, 1]) { rb(hb, col("#c8282e"), s * 3.4 - 0.3, s * 3.4 + 0.3, L, L + 0.5, -D + 0.6, -D + 1.2, 0.05); hb.add(lathe("pot", [[0, 0], [0.2, 0], [0.26, 0.4], [0.28, 0.46], [0, 0.46]], 12), col("#c8643a"), M4(s * 4.6, L, -D + 1.2, 0, 0, 0, [1.2, 1.2, 1.2])); for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI * 2; hb.add(cached("palm", () => new THREE.ConeGeometry(0.16, 1.4, 4).translate(0, 0.7, 0)), col("#2f8a3a", THREE.DoubleSide), M4(s * 4.6 + Math.cos(a) * 0.2, L + 0.5, -D + 1.2 + Math.sin(a) * 0.2, 0, Math.cos(a) * 0.7, Math.sin(a) * 0.7)); } }
  // stair along the right wall
  for (let k = 0; k < 14; k++) rb(hb, woodM("#8a5a34"), 3.8 + k * 0.145, hw, L, L + 0.26 + k * 0.26, -D + 0.1, -D + 1.8, 0.01);
  // the clock (face + two hands; the hands are in their own group the tick turns)
  const clockG = new THREE.Group(), clockHands = new THREE.Group(), clockMin = new THREE.Group();
  const cb = new Batch(); cb.add(lathe("clockRim", [[0, 0], [0.7, 0], [0.7, 0.14], [0.62, 0.14], [0, 0.1]], 24), shiny(BRASS, 70), M4(0, 0, 0, 0, 0, Math.PI / 2 * 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
  cb.add(new THREE.CircleGeometry(0.62, 28), unlit("clockFace", () => ctex("clockFace", 256, 256, (g) => { g.fillStyle = "#fbf6e8"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#1a1a1a"; for (let q = 0; q < 12; q++) { const a = (q / 12) * Math.PI * 2; g.beginPath(); g.arc(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100, q % 3 ? 5 : 9, 0, 7); g.fill(); } })), M4(0, 0, 0.001));
  cb.build(clockG, false);
  const hb2 = new Batch(); rb(hb2, col("#1a1a1a"), -0.025, 0.025, 0, 0.42, 0, 0.02, 0.005); hb2.build(clockHands, false); const hb3 = new Batch(); rb(hb3, col("#1a1a1a"), -0.02, 0.02, 0, 0.56, 0, 0.02, 0.005); hb3.build(clockMin, false);
  clockHands.position.z = 0.16; clockMin.position.z = 0.18; clockG.add(clockHands, clockMin); clockG.position.set(-2.6, L + 3.0, -D + 0.14);
  const clockFaceUp = new THREE.Group(); clockFaceUp.add(clockG); house.add(clockFaceUp);
  // chandelier glows
  for (let k = 0; k < 3; k++) { const y = RH[k] + 3.6; hb.add(rod(V(0, y + 0.2, -3), V(0, y + 0.55, -3), 0.02), col("#3a3a40")); for (let q = 0; q < 4; q++) { const a = (q / 4) * Math.PI * 2; hb.add(cached("bulbC", () => new THREE.SphereGeometry(0.1, 8, 6)), glow("#ffe9b0", 1.6), M4(Math.cos(a) * 0.5, y, -3 + Math.sin(a) * 0.5)); } hb.add(cached("chandRing", () => new THREE.TorusGeometry(0.5, 0.025, 5, 20).rotateX(Math.PI / 2)), shiny(BRASS), M4(0, y - 0.1, -3)); }
  // dining room ----------------------------------------------
  const Dn = yF(1);
  for (const x of [-3.4, 2.4]) { // two arched windows on the back wall glowing with sky
    const sh = new THREE.Shape(); sh.moveTo(-0.8, 0); sh.lineTo(0.8, 0); sh.lineTo(0.8, 1.6); sh.absarc(0, 1.6, 0.8, 0, Math.PI, false); sh.lineTo(-0.8, 0);
    hb.add(new THREE.ShapeGeometry(sh, 10), glow("#bfe0ff", 1.15), M4(x, Dn + 1.0, -D + 0.04));
    hb.add(hoodGeo(0.8, 1.6, 0, 0.18, 0.08), col(CREAM), M4(x, Dn + 1.0, -D + 0.04));
    for (const s of [-1, 1]) rb(hb, col("#c8282e"), x + s * 1.1 - 0.25, x + s * 1.1 + 0.25, Dn + 0.9, Dn + 3.6, -D + 0.08, -D + 0.3, 0.04);
    rb(hb, col("#fbf6ea"), x - 0.03, x + 0.03, Dn + 1.0, Dn + 3.4, -D + 0.05, -D + 0.07, 0.005); rb(hb, col("#fbf6ea"), x - 0.8, x + 0.8, Dn + 2.0, Dn + 2.06, -D + 0.05, -D + 0.07, 0.005);
  }
  rb(hb, texM("tablecloth", () => P.ctex("tablecloth", 128, 128, (g) => { g.fillStyle = "#fbf8ee"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#c8282e"; g.fillRect(0, 0, 128, 14); g.fillRect(0, 114, 128, 14); })), -3.6, 0.8, Dn + 0.95, Dn + 1.05, -4.5, -2.5, 0.03);
  rb(hb, texM("tablecloth", () => P.ctex("tablecloth", 128, 128, (g) => { g.fillStyle = "#fbf8ee"; g.fillRect(0, 0, 128, 128); })), -3.5, 0.7, Dn + 0.12, Dn + 0.97, -4.4, -2.6, 0.04);
  for (const x of [-3.0, -1.6, -0.2]) { hb.add(lathe("bowl", [[0, 0], [0.16, 0], [0.3, 0.1], [0.32, 0.16], [0.28, 0.16], [0.26, 0.1], [0, 0.06]], 16), col("#fbf8ee"), M4(x, Dn + 1.05, -3.3)); hb.add(cached("soup", () => new THREE.CylinderGeometry(0.26, 0.26, 0.02, 14)), col("#e0782a"), M4(x, Dn + 1.14, -3.3)); }
  for (const x of [-4.2, -2.3, -0.8, 1.2]) { rb(hb, woodM("#4a2e1a"), x - 0.3, x + 0.3, Dn, Dn + 0.5, -3.9, -3.3, 0.03); rb(hb, woodM("#4a2e1a"), x - 0.3, x + 0.3, Dn + 0.5, Dn + 1.5, -3.95, -3.88, 0.03); }
  rb(hb, woodM("#6a4228"), 2.8, 5.0, Dn, Dn + 1.0, -D + 0.1, -D + 0.9, 0.04); rb(hb, shiny("#d6dae0"), 3.0, 4.8, Dn + 1.0, Dn + 1.06, -D + 0.2, -D + 0.8, 0.02); // sideboard
  hb.add(cached("urn", () => new THREE.CylinderGeometry(0.2, 0.26, 0.6, 10)), shiny(BRASS), M4(3.5, Dn + 1.36, -D + 0.5));
  // the bedroom ----------------------------------------------
  const Bd = yF(2);
  rb(hb, woodM("#5a3a22"), -4.0, -1.2, Bd, Bd + 0.55, -4.9, -2.7, 0.04); rb(hb, texM("quilt", () => P.ctex("quilt", 128, 128, (g) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#2f8a5a" : "#f2e8cc"; g.fillRect(i * 32, j * 32, 32, 32); } })), -3.9, -1.3, Bd + 0.55, Bd + 0.8, -4.8, -2.8, 0.1);
  rb(hb, woodM("#4a2e1a"), -4.2, -4.0, Bd, Bd + 1.7, -4.95, -2.65, 0.04); rb(hb, col("#fbf8ee"), -3.9, -3.2, Bd + 0.8, Bd + 1.0, -4.5, -3.1, 0.07);
  rb(hb, woodM("#5a3a22"), -0.9, -0.2, Bd, Bd + 0.75, -D + 0.1, -D + 0.8, 0.03); // nightstand
  hb.add(lathe("candleHolder", [[0, 0], [0.12, 0], [0.12, 0.04], [0.04, 0.08], [0.04, 0.12], [0.07, 0.16], [0, 0.16]], 10), shiny(BRASS), M4(-0.55, Bd + 0.75, -D + 0.45)); hb.add(cached("candle", () => new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8)), col("#f6efd8"), M4(-0.55, Bd + 1.06, -D + 0.45));
  rb(hb, woodM("#5a3a22"), 3.4, 5.0, Bd, Bd + 3.0, -D + 0.1, -D + 1.0, 0.04); rb(hb, col("#bfe0f2"), 3.7, 4.7, Bd + 0.8, Bd + 2.6, -D + 1.0, -D + 1.04, 0.01); // wardrobe with a mirror
  hb.add(quad(V(-2.0, Bd + 0.01, -0.3), V(2.4, Bd + 0.01, -0.3), V(2.4, Bd + 0.01, -3.0), V(-2.0, Bd + 0.01, -3.0), 2, 1.4), texM("cutcarpet", () => P.carpetHD()));
  { const x = 1.2, sh = new THREE.Shape(); sh.moveTo(-0.8, 0); sh.lineTo(0.8, 0); sh.lineTo(0.8, 1.6); sh.absarc(0, 1.6, 0.8, 0, Math.PI, false); sh.lineTo(-0.8, 0);
    hb.add(new THREE.ShapeGeometry(sh, 10), glow("#c8e4ff", 1.1), M4(x, Bd + 0.9, -D + 0.04)); hb.add(hoodGeo(0.8, 1.6, 0, 0.18, 0.08), col(CREAM), M4(x, Bd + 0.9, -D + 0.04));
    for (const s of [-1, 1]) rb(hb, col("#1f8f5a"), x + s * 1.0 - 0.32, x + s * 1.0 + 0.32, Bd + 0.8, Bd + 3.4, -D + 0.08, -D + 0.34, 0.05); }
  // the OPEN sign on a hook (a two-sided disc that flips)
  const sign = new THREE.Group();
  const sg = new THREE.CircleGeometry(0.42, 24);
  const fA = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: signTex(false), side: THREE.FrontSide })), fB = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: signTex(true), side: THREE.FrontSide }));
  fB.rotation.y = Math.PI; fA.position.z = 0.01; fB.position.z = -0.01; sign.add(fA, fB); const cord = new Batch(); cord.add(rod(V(0, 0.4, 0), V(0, 1.0, 0), 0.015, 0.015, 5), col("#3a2a1a")); cord.build(sign, false);
  sign.position.set(-4.7, L + 2.2, -0.7); house.add(sign);
  hb.build(house, false);
  house.traverse((o) => { o.castShadow = false; o.receiveShadow = true; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), yq = new THREE.Vector3(0, 1, 0);
  rig.tick = (t) => {
    const f = Math.round(t * 30), y = cutY(f);
    house.position.y = y;
    clockHands.rotation.z = -t * 0.05; clockMin.rotation.z = -t * 0.6;
    sign.rotation.y = Math.PI * glide((f - EV.OPEN12 - 2) / 10);
    let n = 0;
    for (let k = 0; k < 10; k++) for (const z of [-0.9, -2.9, -4.9]) {
      const x = -5.4 + k * 1.2, turn = screwTurn(f, 0) * 0.4 + k * 0.5;
      sc.set(1, 1, 1); ps.set(x, 0, z); q.identity(); m4.compose(ps, q, sc); housings.setMatrixAt(n, m4);
      ps.set(x, y - 0.35 - SHAFT_L, z); q.setFromAxisAngle(yq, turn); m4.compose(ps, q, sc); shafts.setMatrixAt(n, m4);
      ps.set(x, y - 0.85, z); q.identity(); m4.compose(ps, q, sc); caps.setMatrixAt(n, m4);
      ps.set(x, 1.15, z); q.setFromAxisAngle(yq, turn); m4.compose(ps, q, sc); handles.setMatrixAt(n, m4); n++;
    }
    for (const im of [housings, shafts, caps, handles]) im.instanceMatrix.needsUpdate = true;
  };
  return Object.assign(rig, { house, sign, clockM: clockMin, clockH: clockHands });
};
void ground; void slab; void quad;
