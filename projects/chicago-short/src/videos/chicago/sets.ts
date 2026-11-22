// The other sets of "Chicago Lifts a Hotel" (owner: sets): the swamp-edge town (mud, cattails, the lake, plank sidewalks,
// the clinic porch), the council hall, the raised street over a pit, the contractors' office, the golden-dusk station with
// the steam train and the Pullman sleeping car. buildSets() adds the hotel street + the cutaway from hotel.ts.
// CONTRACTS: buildSets(), SET_META, fgUpdate(), CLOCK (read by world.ts).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as P from "./paint";
import { rng, ctex } from "./paint";
import { Batch, M4, rbox, rb, col, texM, glow, lam, rod, cached, lathe, quad, tri, V, groundM, terrain, woodM, unlit, buildNoInk, FAR, BRASS, shiny, addVeg, hillRing, SetRig, slab, plate, mats } from "./build";
import { SPOT, SetName, FOREGROUND, smooth, glide, fillAt, EV, hotelY, screwTurn } from "./story";
import { buildStreet, buildCutaway, cart } from "./hotel";
import { twoTone } from "./shade";
const gloss = (c: string, sh = 45) => { const key = "gloss" + c + sh; let m = mats.get(key) as THREE.MeshPhongMaterial | undefined; if (!m) { m = twoTone(new THREE.MeshPhongMaterial({ color: c, shininess: sh, specular: new THREE.Color("#3a5a4a") })); mats.set(key, m); } return m; };

export { CLOCK } from "./build";
export const SET_META: Record<SetName, { hazeK: number; indoor?: boolean; ceil?: number }> = {
  town: { hazeK: 1.0 }, hall: { hazeK: 1, indoor: true, ceil: 6.5 }, pit: { hazeK: 1.6 }, street: { hazeK: 2.2 }, office: { hazeK: 1, indoor: true, ceil: 3.4 },
  cutaway: { hazeK: 2.2 }, platform: { hazeK: 1.4 }, sleeper: { hazeK: 1.4 },
};
const brickM = (c = "#b4513a") => texM("brick" + c, () => P.brickHD(c));
const plasterM = (c = "#ecdcb6") => texM("plaster" + c, () => P.plasterHD(c));
const sidingM = (c: string) => texM("siding" + c, () => P.sidingHD(c));
const CREAM = "#efe4c8";

/** a room shell: floor, four walls, ceiling (no shadows cast, so the window key gets in); walls inward */
const room = (sh: Batch, x0: number, x1: number, z0: number, z1: number, H: number, floor: THREE.Material, wall: THREE.Material, ceil: THREE.Material, wallFront?: THREE.Material) => {
  sh.add(quad(V(x0, 0, z1), V(x1, 0, z1), V(x1, 0, z0), V(x0, 0, z0), (x1 - x0) / 2, (z1 - z0) / 2), floor);
  sh.add(quad(V(x0, 0, z0), V(x1, 0, z0), V(x1, H, z0), V(x0, H, z0), (x1 - x0) / 2, H / 2), wall);
  sh.add(quad(V(x1, 0, z1), V(x0, 0, z1), V(x0, H, z1), V(x1, H, z1), (x1 - x0) / 2, H / 2), wallFront ?? wall);
  sh.add(quad(V(x0, 0, z1), V(x0, 0, z0), V(x0, H, z0), V(x0, H, z1), (z1 - z0) / 2, H / 2), wall);
  sh.add(quad(V(x1, 0, z0), V(x1, 0, z1), V(x1, H, z1), V(x1, H, z0), (z1 - z0) / 2, H / 2), wall);
  sh.add(quad(V(x0, H, z0), V(x1, H, z0), V(x1, H, z1), V(x0, H, z1), (x1 - x0) / 2, (z1 - z0) / 2), ceil);
};
const archGlow = (b: Batch, x: number, y: number, z: number, hw: number, h: number, c = "#bfe0ff", k = 1.15, ry = 0) => {
  const pts: THREE.Vector2[] = [new THREE.Vector2(-hw, 0), new THREE.Vector2(hw, 0)]; for (let i = 0; i <= 12; i++) { const a = (Math.PI * i) / 12; pts.push(new THREE.Vector2(hw * Math.cos(a), h + hw * Math.sin(a))); }
  const sh = new THREE.Shape(pts);
  b.add(new THREE.ShapeGeometry(sh, 10), glow(c, k), M4(x, y, z, ry));
};
const hood = (hw: number, h: number, t = 0.18, d = 0.1) => cached(`shood${hw}_${h}_${t}_${d}`, () => {
  const apts = (hw2: number, y0: number) => { const p: THREE.Vector2[] = [new THREE.Vector2(-hw2, y0), new THREE.Vector2(hw2, y0)]; for (let i = 0; i <= 12; i++) { const a = (Math.PI * i) / 12; p.push(new THREE.Vector2(hw2 * Math.cos(a), h + hw2 * Math.sin(a))); } return p; };
  const s = new THREE.Shape(apts(hw + t, -0.06)); s.holes.push(new THREE.Path(apts(hw, 0)));
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 10 });
});
const lamp = (b: Batch, x: number, y: number, z: number, c = "#ffe0a0", k = 1.5) => { b.add(cached("lampB", () => new THREE.SphereGeometry(0.12, 10, 8)), glow(c, k), M4(x, y, z)); };
const picture = (b: Batch, x: number, y: number, z: number, w: number, h: number, ry: number, seed: number) => {
  const r = rng(seed), t = texM("pic" + seed, () => ctex("picTex" + seed, 128, 128, (g) => { g.fillStyle = ["#9ac4e0", "#e8c890", "#a8c8a0"][seed % 3]; g.fillRect(0, 0, 128, 128); g.fillStyle = ["#4f8a5a", "#c8785a", "#5a7ab0"][seed % 3]; g.beginPath(); g.moveTo(0, 90); for (let i = 0; i < 6; i++) g.lineTo(i * 26, 60 + 30 * r()); g.lineTo(128, 128); g.lineTo(0, 128); g.fill(); g.fillStyle = "#fff2c0"; g.beginPath(); g.arc(30 + 60 * r(), 34, 12, 0, 7); g.fill(); }));
  const m = M4(x, y, z, ry), put = (g: THREE.BufferGeometry, mat: THREE.Material, lm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(lm));
  put(rbox(w + 0.16, h + 0.16, 0.06, 0.02), shiny(BRASS, 50), M4(0, 0, 0)); put(rbox(w, h, 0.04, 0.005), t, M4(0, 0, 0.03));
};

// ---------------------------------------------------------------------------------------------------------------
// the swamp-edge town
// ---------------------------------------------------------------------------------------------------------------
const cattail = (b: Batch, x: number, z: number, h: number, seed: number) => {
  const r = rng(seed);
  for (let k = 0; k < 3; k++) {
    const a = r() * 6.28, lean = 0.12 + 0.1 * r(), hh = h * (0.8 + 0.4 * r()), dx = Math.cos(a) * lean * hh, dz = Math.sin(a) * lean * hh;
    b.add(rod(V(x, 0, z), V(x + dx, hh, z + dz), 0.022, 0.012, 5), col("#7a9a3a"));
    if (k < 2) { b.add(cached("cattailHead", () => new THREE.CapsuleGeometry(0.045, 0.26, 3, 7).translate(0, 0.13, 0)), col("#5a3a20"), M4(x + dx, hh - 0.3, z + dz, 0, dx * 0.5, -dz * 0.5)); b.add(rod(V(x + dx, hh - 0.04, z + dz), V(x + dx * 1.04, hh + 0.14, z + dz * 1.04), 0.01, 0.004, 4), col("#c8b070")); }
  }
  for (let k = 0; k < 3; k++) { const a = r() * 6.28; b.add(tri(V(x, 0, z), V(x + Math.cos(a) * 0.5, h * 1.0, z + Math.sin(a) * 0.5), V(x + Math.cos(a + 0.3) * 0.08, 0, z + Math.sin(a + 0.3) * 0.08)), col("#6a9a38", THREE.DoubleSide)); }
};
const iconTex = (kind: number) => texM("icon" + kind, () => ctex("iconTex" + kind, 128, 128, (g) => {
  g.fillStyle = ["#e8c890", "#9ac4e0", "#e8a8a0", "#a8d0a0"][kind % 4]; g.fillRect(0, 0, 128, 128); g.lineWidth = 6; g.strokeStyle = "#5a3a1e"; g.strokeRect(4, 4, 120, 120);
  g.fillStyle = "#5a3a1e";
  if (kind % 4 === 0) { g.fillRect(40, 30, 28, 52); g.fillRect(40, 70, 56, 22); } // boot
  else if (kind % 4 === 1) { g.beginPath(); g.ellipse(64, 70, 38, 24, 0, 0, 7); g.fill(); g.fillStyle = "#e8d8a0"; g.beginPath(); g.ellipse(64, 66, 28, 16, 0, 0, 7); g.fill(); } // loaf
  else if (kind % 4 === 2) { g.fillRect(52, 24, 24, 20); g.fillRect(36, 44, 56, 12); g.fillRect(44, 56, 40, 46); } // bottle / jar
  else { g.beginPath(); g.arc(64, 64, 34, 0, 7); g.fill(); g.fillStyle = "#e8c890"; g.fillRect(58, 22, 12, 84); g.fillRect(22, 58, 84, 12); } // wheel
}));
/** a false-front frontier shop: siding, a taller front, windows, door, awning, a pictogram sign */
const shopFront = (b: Batch, xf: number, dir: 1 | -1, z0: number, z1: number, h: number, wall: THREE.Material, seed: number, depth = 10) => {
  const r = rng(seed), xb = xf - dir * depth, w = z1 - z0;
  rb(b, wall, Math.min(xf, xb), Math.max(xf, xb), 0, h - 1.4, z0, z1, 0.04, 2);
  rb(b, wall, Math.min(xf, xf - dir * 0.5), Math.max(xf, xf - dir * 0.5), h - 1.4, h + 0.9, z0, z1, 0.04, 2);        // the false front
  rb(b, col(CREAM), xf - 0.12 * dir - 0.06, xf + 0.12 * dir + 0.06, h + 0.9, h + 1.1, z0 - 0.15, z1 + 0.15, 0.03);
  for (const s of [-1, 1]) rb(b, col(CREAM), xf - 0.1 * dir - 0.06, xf + 0.1 * dir + 0.06, 0, h + 0.9, s > 0 ? z1 - 0.2 : z0, s > 0 ? z1 : z0 + 0.2, 0.02); // corner boards
  rb(b, col("#3a2a1a"), xf + dir * 0.05 - 0.05, xf + dir * 0.1 + 0.05, 0.0, 2.3, z0 + w * 0.5 - 0.5, z0 + w * 0.5 + 0.5, 0.02);                    // door
  for (const s of [-1, 1]) { const zc = z0 + w * (s < 0 ? 0.22 : 0.78); rb(b, col(CREAM), xf + dir * 0.02 - 0.05, xf + dir * 0.12 + 0.05, 0.75, 2.45, zc - 0.62, zc + 0.62, 0.02); rb(b, col(r() > 0.5 ? "#3a4a6e" : "#e8d8a8"), xf + dir * 0.1 - 0.05, xf + dir * 0.16 + 0.05, 0.85, 2.35, zc - 0.5, zc + 0.5, 0.01); }
  b.add(new THREE.PlaneGeometry(Math.min(2.6, w - 0.6), 1.1), iconTex(seed), M4(xf + dir * 0.14, h - 0.4, z0 + w / 2, dir > 0 ? Math.PI / 2 : -Math.PI / 2));
  const aw = ["#2f7a4a", "#c8282e", "#3a6ab0", "#e0a820"][seed % 4];
  const g = cached("tAwn" + w, () => { const q = new THREE.PlaneGeometry(w - 0.4, 1.3, 8, 1); const p = q.attributes.position as THREE.BufferAttribute, uv = q.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / 1.0, 0); return q; });
  b.add(g, texM("tawn" + aw, () => ctex("tawnTex" + aw, 128, 16, (c) => { for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? "#fbf6ea" : aw; c.fillRect(i * 32, 0, 32, 16); } })), M4(xf + dir * 0.75, 2.9, z0 + w / 2, dir > 0 ? Math.PI / 2 : -Math.PI / 2).multiply(new THREE.Matrix4().makeRotationX(-1.05)));
};
const buildTown = (): SetRig => {
  const b = new Batch(), r = rng(5);
  const plainG = (key: string, mk: () => THREE.Texture) => { const m = texM(key, mk); m.userData.inkId = 1100; return m; };
  const mud = plainG("townMud", () => P.mudHD("mudStreet", "#76624a", 1.0)), marsh = plainG("marsh", () => P.mudHD("marshMud", "#665e44", 0.3));
  terrain(b, marsh, -FAR, FAR, -FAR, FAR, 4, undefined, 4, -0.06);
  terrain(b, mud, -4.8, 4.8, -90, 90, 4, undefined, 4, 0.0);
  for (const s of [-1, 1]) terrain(b, groundM("pastureM", () => P.pastureHD("pastureMarsh", "#6a9a46")), s * 20, s * FAR, -FAR, FAR, 4, undefined, 4, 0.03);
  // the lake past the end of the street + shore
  const water = lam("lakeW", () => ({ map: P.waterHD("lakeW", "#4f8aa0"), transparent: false })); water.userData.inkId = 1200;
  b.add(new THREE.PlaneGeometry(1600, 600).rotateX(-Math.PI / 2).translate(0, -0.05, -420), water);
  // plank sidewalks, raised, both sides, with hitching rails and steps
  for (const s of [-1, 1]) {
    rb(b, woodM("#a8845c"), s * 4.8 - (s > 0 ? 0 : 2.4), s * 4.8 + (s > 0 ? 2.4 : 0), 0, 0.38, -90, 90, 0.03, 2);
    for (let z = -80; z < 80; z += 2.4) b.add(rod(V(s * 4.8, 0, z), V(s * 4.8, 0.5, z), 0.05, 0.05, 5), woodM("#6a4626"));
  }
  // frontier shops on both sides: false fronts, clapboard
  const SIDE = [sidingM("#b8a078"), sidingM("#d8c898"), sidingM("#9a7a58"), brickM("#b4513a"), sidingM("#c8b088"), plasterM("#d8c090")];
  for (const side of [-1, 1] as const) { let z = -90, i = 0; while (z < 80) { if (side < 0 && z > -30 && z < -10) { z += 20; continue; } const w = 7 + 3 * ((i * 5 + (side > 0 ? 2 : 0)) % 3), h = 5.4 + 1.6 * ((i * 3 + 1) % 3); shopFront(b, side * 7.3, side > 0 ? -1 : 1, z, z + w - 0.6, h, SIDE[(i + (side > 0 ? 3 : 0)) % 6], i + (side > 0 ? 5 : 0), 9); z += w; i++; } }
  // the clinic: a little white clapboard house with a deep porch and a green cross-less door (pictogram: bottle)
  const C0 = SPOT.CLINIC;
  rb(b, sidingM("#efe8d4"), C0[0] - 9, C0[0] - 1.6, 0, 5.2, C0[2] - 5, C0[2] + 5, 0.04, 2);
  rb(b, woodM("#8a6a48"), C0[0] - 1.9, C0[0] + 0.2, 0, 0.38, C0[2] - 5.4, C0[2] + 5.4, 0.03, 2);
  for (const z of [-5, -2.5, 0, 2.5, 5]) rb(b, col(CREAM), C0[0] - 0.2 - 0.1, C0[0] - 0.2 + 0.1, 0.38, 3.6, C0[2] + z - 0.1, C0[2] + z + 0.1, 0.02);
  rb(b, col("#2f7a4a"), C0[0] - 2.3, C0[0] + 0.3, 3.6, 3.9, C0[2] - 5.6, C0[2] + 5.6, 0.04); b.add(plate([[-0.0, 0], [2.5, 0.0], [2.5, 0.4]], 11.2, 0.02).rotateY(Math.PI / 2 * 0), col("#2f7a4a"), M4(C0[0] - 2.4, 3.9, C0[2], 0));
  for (const z of [-3.4, 3.4]) { rb(b, col(CREAM), C0[0] - 1.65, C0[0] - 1.5, 1.2, 3.2, C0[2] + z - 0.7, C0[2] + z + 0.7, 0.02); rb(b, col("#bfe0f2"), C0[0] - 1.55, C0[0] - 1.45, 1.35, 3.1, C0[2] + z - 0.58, C0[2] + z + 0.58, 0.01); }
  rb(b, col("#3a2a1a"), C0[0] - 1.65, C0[0] - 1.5, 0.38, 2.6, C0[2] - 0.55, C0[2] + 0.55, 0.02); b.add(new THREE.PlaneGeometry(1.1, 1.1), iconTex(2), M4(C0[0] - 1.45, 3.1, C0[2], Math.PI / 2));
  rb(b, woodM("#7a5230"), C0[0] - 1.1, C0[0] - 0.5, 0.38, 0.55, C0[2] - 4.8, C0[2] - 0.8, 0.03); rb(b, woodM("#7a5230"), C0[0] - 0.7, C0[0] - 0.5, 0.55, 1.2, C0[2] - 4.8, C0[2] - 0.8, 0.03); // the bench
  for (const z of [-4.8, -0.8]) rb(b, woodM("#6a4626"), C0[0] - 1.1, C0[0] - 0.5, 0.0, 0.4, C0[2] + z - 0.06, C0[2] + z + 0.06, 0.02);
  // cattails, reeds and tufts everywhere the ground is wet; a thick fringe along the lake
  for (let i = 0; i < 220; i++) { const sideX = r() < 0.5 ? -1 : 1, z = -150 + 220 * r(); const x = r() < 0.6 ? sideX * (18 + 40 * r()) : (r() - 0.5) * 8; if (Math.abs(x) < 6 && z > -60) continue; cattail(b, x, z, 1.2 + 0.9 * r(), 100 + i); }
  for (let i = 0; i < 260; i++) cattail(b, -90 + 180 * r(), -62 - 22 * r() + (r() - 0.5) * 6, 1.4 + r(), 400 + i);
  for (let i = 0; i < 18; i++) cattail(b, 5.0 + 1.6 * r() * (i % 2 ? 1 : -1.2) * (i % 2 ? 1 : 0.4), 10 + i * 3.5, 1.0 + r() * 0.6, 700 + i);
  for (let i = 0; i < 30; i++) { const x = (r() < 0.5 ? -1 : 1) * (22 + 40 * r()); addVeg(b, "round", x, 0, -40 + 120 * r(), 4.5 + 2.5 * r(), 900 + i, 1); }
  // props in the muck: a cart sunk to its axles, a barrel, a plank, crates; wood planks laid as stepping stones
  cart(b, 0.4, 0, 8, 0.15, 0.55, "#8a5a34");
  b.add(lathe("tbarrel", [[0, 0], [0.34, 0], [0.4, 0.2], [0.42, 0.5], [0.4, 0.8], [0.34, 1.0], [0, 1.0]], 14), woodM("#8a5a34"), M4(-3.4, 0, 3.0, 0, 0.5, 0.2));
  for (let k = 0; k < 6; k++) rb(b, woodM("#b88a58"), 3.0 + k * 0.05, 3.9 + k * 0.05, 0.02, 0.1, 14 + k * 1.1, 14.4 + k * 1.1, 0.02);
  for (const x of [-4.1, 4.2]) for (let z = -70; z < 70; z += 14) { b.add(rod(V(x, 0.38, z), V(x, 4.6, z), 0.08, 0.06, 6), woodM("#5a3a26")); rb(b, woodM("#5a3a26"), x - 0.7, x + 0.7, 4.3, 4.45, z - 0.05, z + 0.05, 0.02); }
  hillRing(b, 0, 0, 800, 6, 14, 9, "#7a9a7a");
  const rig: SetRig = { name: "town", group: new THREE.Group() }; rig.group.name = "town";
  b.build(rig.group, true);
  // the puddle that is the street (shot 3): murky green-brown water over the mud, z -34..-4
  const pud = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 34).rotateX(-Math.PI / 2), lam("puddleW", () => ({ map: P.waterHD("puddleW", "#6e5738", "210,175,120") })));
  pud.position.set(0, 0.04, -20); pud.receiveShadow = true; pud.userData.inkId = 1201; rig.group.add(pud);
  const pud2 = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5).rotateX(-Math.PI / 2), pud.material); pud2.position.set(1.6, 0.05, 22); pud2.userData.inkId = 1201; rig.group.add(pud2);
  return rig;
};

// ---------------------------------------------------------------------------------------------------------------
// the council hall (interior, shot 5)
// ---------------------------------------------------------------------------------------------------------------
const buildHall = (): SetRig => {
  const b = new Batch(), sh = new Batch(), H = 6.5;
  const wall = texM("hallWall", () => P.wallpaperHD("hall", "#a83a36", "#e8c880"));
  room(sh, -7, 7, -11, 5.5, H, texM("hallFloor", () => P.planksHD()), wall, col("#f0e4c8"));
  // wainscot, dado rail, cornice
  rb(b, texM("hallPanel", () => P.panelHD("#6a4228")), -7, 7, 0, 2.3, -11, -10.94, 0.01, 2);
  for (const s of [-1, 1]) rb(b, texM("hallPanel", () => P.panelHD("#6a4228")), s * 7 - (s > 0 ? 0.06 : 0), s * 7 + (s > 0 ? 0 : 0.06), 0, 2.3, -11, 5.5, 0.01, 2);
  rb(b, col("#c89a52"), -7, 7, 2.3, 2.45, -11, -10.9, 0.01); rb(b, col(CREAM), -7, 7, H - 0.45, H, -11, -10.7, 0.02);
  for (const s of [-1, 1]) { rb(b, col("#c89a52"), s * 7 - (s > 0 ? 0.1 : 0), s * 7 + (s > 0 ? 0 : 0.1), 2.3, 2.45, -11, 5.5, 0.01); rb(b, col(CREAM), s * 7 - (s > 0 ? 0.3 : 0), s * 7 + (s > 0 ? 0 : 0.3), H - 0.45, H, -11, 5.5, 0.02); }
  // three tall arched windows with sky behind the dais
  for (const x of [-4.2, 0, 4.2]) {
    archGlow(b, x, 2.1, -10.92, 1.1, 2.2, "#a8d4ff", 1.2);
    b.add(hood(1.1, 2.2, 0.22, 0.14), col(CREAM), M4(x, 2.1, -10.94));
    rb(b, col(CREAM), x - 0.04, x + 0.04, 2.1, 5.5, -10.9, -10.86, 0.005); rb(b, col(CREAM), x - 1.1, x + 1.1, 3.6, 3.68, -10.9, -10.86, 0.005);
    for (const s of [-1, 1]) rb(b, col("#3a7a4a"), x + s * 1.55 - 0.3, x + s * 1.55 + 0.3, 1.0, 5.6, -10.9, -10.62, 0.05);
  }
  // side windows too + portraits
  for (const s of [-1, 1]) for (const z of [-5, 0]) { archGlow(b, s * 6.94, 2.2, z, 0.9, 1.8, "#a8d4ff", 1.1, s > 0 ? -Math.PI / 2 : Math.PI / 2); picture(b, s * 6.92, 3.9, z + 2.5, 1.0, 1.3, s > 0 ? -Math.PI / 2 : Math.PI / 2, z + 3); }
  // the dais, the mayor's desk and chair; flags
  rb(b, woodM("#5a3a22"), -4.5, 4.5, 0, 0.4, -11, -8.0, 0.04, 1);
  rb(b, woodM("#4a2e1a"), -1.5, 1.5, 0.4, 1.3, -9.8, -8.8, 0.04); rb(b, shiny("#7a5230", 40), -1.7, 1.7, 1.3, 1.4, -9.9, -8.7, 0.03);
  rb(b, woodM("#3a2012"), -0.6, 0.6, 0.4, 1.0, -10.6, -10.2, 0.04); rb(b, woodM("#3a2012"), -0.7, 0.7, 1.0, 3.0, -10.85, -10.7, 0.05); rb(b, col("#c8282e"), -0.55, 0.55, 1.1, 2.9, -10.68, -10.62, 0.03);
  for (const s of [-1, 1]) { b.add(rod(V(s * 3.4, 0.4, -10.4), V(s * 3.4, 5.4, -10.4), 0.05, 0.04, 6), shiny(BRASS)); b.add(new THREE.PlaneGeometry(2.0, 1.3, 10, 1).translate(1.0 * s, 0, 0), unlit("hallflag", () => P.flagHD()), M4(s * 3.4, 4.6, -10.4, 0.1 * s)); }
  // the long council table (green baize top) down the middle, the benches, the inkwells; the chandelier
  rb(b, shiny("#4a2e1a", 40), -1.15, 1.15, 0.0, 0.78, -7.6, 0.4, 0.03); rb(b, col("#2f6a4a"), -1.08, 1.08, 0.78, 0.82, -7.5, 0.3, 0.02);
  for (let z = -7; z <= 0; z += 1.4) { rb(b, woodM("#4a2e1a"), -1.85, -1.4, 0, 0.5, z - 0.45, z + 0.45, 0.03); rb(b, woodM("#4a2e1a"), 1.4, 1.85, 0, 0.5, z - 0.45, z + 0.45, 0.03); rb(b, woodM("#4a2e1a"), -1.9, -1.8, 0.5, 1.3, z - 0.45, z + 0.45, 0.03); rb(b, woodM("#4a2e1a"), 1.8, 1.9, 0.5, 1.3, z - 0.45, z + 0.45, 0.03); }
  for (const z of [-6.2, -4.4, -2.6, -0.8]) for (const s of [-1, 1]) b.add(cached("ink", () => new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8)), col("#1a1a2a"), M4(s * 0.6, 0.87, z));
  rb(b, texM("hallRug", () => P.carpetHD("#7a2a2e")), -3.4, 3.4, 0.0, 0.02, -8, 3, 0.005, 2);
  for (const z of [-5, 0.5]) { b.add(rod(V(0, H, z), V(0, H - 1.3, z), 0.03, 0.03, 5), col("#3a3a40")); b.add(cached("chand", () => new THREE.TorusGeometry(0.7, 0.04, 5, 24).rotateX(Math.PI / 2)), shiny(BRASS), M4(0, H - 1.4, z)); for (let q = 0; q < 8; q++) { const a = (q / 8) * 6.28; b.add(cached("chb", () => new THREE.SphereGeometry(0.1, 8, 6)), glow("#ffe9b0", 1.7), M4(Math.cos(a) * 0.7, H - 1.28, z + Math.sin(a) * 0.7)); } }
  // the easel with the picture (street section: sky, houses, ground; the arrow + the rising ground + the pipe tunnel are the tick's)
  const E = SPOT.EASEL;
  for (const [dx, dz] of [[-0.9, 0.5], [0.9, 0.5], [0, -0.6]]) b.add(rod(V(E[0] + dx * 0.9, 0, E[2] + dz), V(E[0] + dx * 0.2, 2.9, E[2]), 0.05, 0.04, 6), woodM("#8a5a34"));
  rb(b, woodM("#8a5a34"), E[0] - 1.0, E[0] + 1.0, 0.95, 1.05, E[2] + 0.05, E[2] + 0.35, 0.02);
  rb(b, col("#fbf6ea"), E[0] - 0.92, E[0] + 0.92, 1.05, 3.05, E[2] - 0.02, E[2] + 0.04, 0.01);
  const pic = new THREE.Group(); pic.position.set(E[0], 2.05, E[2] + 0.06);
  const pb = new Batch();
  pb.add(new THREE.PlaneGeometry(1.74, 1.9), unlit("easelPic", () => ctex("easelPic", 256, 280, (g) => {
    g.fillStyle = "#9ac8ec"; g.fillRect(0, 0, 256, 280);
    for (let i = 0; i < 3; i++) { g.fillStyle = ["#c8582e", "#e0b050", "#b4513a"][i]; g.fillRect(22 + i * 78, 78, 62, 70 + 16 * (i % 2)); g.fillStyle = "#6a4a2a"; g.beginPath(); g.moveTo(16 + i * 78, 78); g.lineTo(53 + i * 78, 48); g.lineTo(90 + i * 78, 78); g.fill(); g.fillStyle = "#fbf6e8"; g.fillRect(40 + i * 78, 100, 16, 22); }
    g.fillStyle = "#9a7a50"; g.fillRect(0, 150, 256, 18); g.fillStyle = "#6a4a2a"; g.fillRect(0, 168, 256, 112);
  })), M4(0, 0, 0));
  pb.build(pic, false);
  const up = new THREE.Group(); const ub = new Batch();
  ub.add(plate([[-0.1, -0.5], [0.1, -0.5], [0.1, 0.0], [0.3, 0.0], [0, 0.5], [-0.3, 0.0], [-0.1, 0.0]], 0.05, 0.01), col("#e02a2a"), M4(0, 0, 0.03)); ub.build(up, false); up.position.set(0.55, 0.15, 0.02);
  const ground = new THREE.Group(); const gb = new Batch(); gb.add(new THREE.PlaneGeometry(1.74, 0.5), unlit("easelGround", () => ctex("easelGround", 128, 64, (g) => { g.fillStyle = "#9a7a50"; g.fillRect(0, 0, 128, 14); g.fillStyle = "#6a4a2a"; g.fillRect(0, 14, 128, 50); })), M4(0, 0, 0)); gb.build(ground, false); ground.position.set(0, -0.66, 0.012);
  const pipe = new THREE.Group(); const pp = new Batch(); pp.add(new THREE.PlaneGeometry(1.74, 0.3), unlit("easelPipe", () => ctex("easelPipe", 256, 48, (g) => { g.fillStyle = "#4a3828"; g.fillRect(0, 0, 256, 48); g.fillStyle = "#8a8f98"; g.fillRect(0, 8, 256, 32); g.fillStyle = "#c8ccd2"; g.fillRect(0, 12, 256, 8); for (let i = 0; i < 6; i++) { g.fillStyle = "#5a5f68"; g.fillRect(i * 44 + 20, 6, 8, 36); } })), M4(0.87, 0, 0)); pp.build(pipe, false); pipe.position.set(-0.87, -0.8, 0.02);
  pic.add(up, ground, pipe);
  const rig: SetRig = { name: "hall", group: new THREE.Group() }; rig.group.name = "hall"; b.build(rig.group, true); const shell = new THREE.Group(); sh.build(shell, false); rig.group.add(shell); rig.group.add(pic);
  rig.tick = (t) => {
    const f = Math.round(t * 30);
    const up0 = glide((f - EV.ARROW5) / 22);
    up.position.y = 0.0 + 0.5 * up0 - 0.15; up.visible = f >= EV.ARROW5 - 1;
    ground.position.y = -0.66 + 0.18 * up0;
    pipe.scale.x = Math.max(0.0001, glide((f - EV.PIPE5) / 12)); pipe.visible = f >= EV.PIPE5 - 1;
  };
  return rig;
};

// ---------------------------------------------------------------------------------------------------------------
// the raised street over a pit (shot 6)
// ---------------------------------------------------------------------------------------------------------------
const buildPit = (): SetRig => {
  const b = new Batch(), r = rng(21);
  terrain(b, groundM("pitDirt", () => P.mudHD("pitMud", "#8a6a44", 0.3)), -FAR, FAR, -FAR, FAR, 4, undefined, 4, -0.01);
  // old buildings, ground floors in the pit: fronts at z = +-9.6, doors at y = 0
  const WALL = [brickM("#b4513a"), plasterM("#e8d4a0"), brickM("#c8805a"), sidingM("#d8c898"), brickM("#9a4a36"), plasterM("#d8c090")];
  for (const s of [-1] as const) { let x = -60, i = 0; while (x < 60) { const w = 7 + 3 * ((i * 5 + (s > 0 ? 2 : 0)) % 3), h = 8.4 + 2.2 * ((i * 7 + 1) % 3);
    const zf = s * 12.6, zb = s * 26, mat = WALL[(i + (s > 0 ? 2 : 0)) % 6];
    rb(b, mat, x, x + w - 0.3, 0, h, Math.min(zf, zb), Math.max(zf, zb), 0.05, 2);
    rb(b, col(CREAM), x - 0.2, x + w - 0.1, h, h + 0.45, Math.min(zf, zb) - 0.2 * s, Math.max(zf, zb) + 0.2 * s, 0.05);
    const nw = Math.max(2, Math.round((w - 0.3) / 2.5));
    for (let k = 0; k < nw; k++) {
      const xc = x + ((w - 0.3) * (k + 0.5)) / nw;
      for (let fl = 0; fl < 3; fl++) { const y = 0.9 + fl * 2.8, th = fl === 0 && k === 1 ? 0 : 1; if (!th) continue; rb(b, col("#f2ece0"), xc - 0.62, xc + 0.62, y - 0.1, y + 1.8, zf - s * 0.02 - 0.06, zf - s * 0.12 + 0.06, 0.03); rb(b, col(r() > 0.3 ? "#3a4a6e" : "#e8d8a8"), xc - 0.5, xc + 0.5, y + 0.05, y + 1.7, zf - s * 0.1 - 0.05, zf - s * 0.16 + 0.05, 0.01); }
      if (k === 1) { rb(b, col(["#2f7a4a", "#c8282e", "#3a6ab0"][i % 3]), xc - 1.2, xc + 1.2, 2.55, 2.7, zf + 0.0, zf + 1.4, 0.02); rb(b, woodM("#a8845c"), xc - 1.3, xc + 1.3, 0, 0.12, zf + 0.0, zf + 1.5, 0.02); rb(b, col("#3a2a1a"), xc - 0.55, xc + 0.55, 0, 2.2, zf - s * 0.1 - 0.05, zf - s * 0.18 + 0.05, 0.02); rb(b, col(CREAM), xc - 0.7, xc + 0.7, 2.2, 2.4, zf - s * 0.2 - 0.1, zf - s * 0.2 + 0.1, 0.02); rb(b, col("#8a8478"), xc - 0.8, xc + 0.8, 0, 0.18, zf - s * 0.3 - 0.4, zf - s * 0.3 + 0.4, 0.02); }
    }
    rb(b, brickM("#9a3f2a"), x + 1.5, x + 2.3, h, h + 2.2, s * 16, s * 16.8, 0.03);
    x += w; i++; } }
  rb(b, woodM("#a8845c"), 2.5, 9.5, 0, 0.1, -12.6, -9.0, 0.02, 2);
  // low window with a wooden shop sign beam over the stair (bonk): hangs at head height above the stairs
  rb(b, woodM("#8a5a34"), SPOT.PIT_STAIR_X - 1.4, SPOT.PIT_STAIR_X + 1.4, 2.05, 2.6, -8.05, -7.7, 0.03);
  b.add(new THREE.PlaneGeometry(1.4, 0.5), texM("bonkSign", () => ctex("bonkSign", 128, 64, (g) => { g.fillStyle = "#e8c890"; g.fillRect(0, 0, 128, 64); g.fillStyle = "#5a3a1e"; g.fillRect(34, 14, 18, 30); g.fillRect(34, 34, 40, 14); })), M4(SPOT.PIT_STAIR_X, 2.33, -7.67, 0));
  rb(b, woodM("#6a4626"), SPOT.PIT_STAIR_X - 1.5, SPOT.PIT_STAIR_X - 1.4, 1.2, 2.8, -9.6, -8.0, 0.02); rb(b, woodM("#6a4626"), SPOT.PIT_STAIR_X + 1.4, SPOT.PIT_STAIR_X + 1.5, 1.2, 2.8, -9.6, -8.0, 0.02);
  gasLampPit(b, -12, -6.4); gasLampPit(b, 14, -6.4); gasLampPit(b, 1, -11.8); gasLampPit(b, 11, -11.8);
  for (let i = 0; i < 10; i++) addVeg(b, "round", -50 + 11 * i, 0, 28 + 4 * r(), 6 + 2 * r(), i * 9, 1);
  for (let i = 0; i < 8; i++) { rb(b, WALL[(i + 1) % 6], -48 + 13 * i, -40 + 13 * i, 0, 7 + (i % 3) * 1.5, 38, 46, 0.05, 2); }
  hillRing(b, 0, 0, 800, 8, 20, 12, "#8a9a78");
  const rig: SetRig = { name: "pit", group: new THREE.Group() }; const G = rig.group; G.name = "pit"; b.build(G, true);
  // the raised street: a slab whose height follows fillAt; retaining wall faces, plank sidewalk, a stair into the trench
  const fill = new THREE.Group(); const fb = new Batch(), unit = 1;
  rb(fb, groundM("fillGravel", () => P.cobbleHD()), -64, 64, 0, unit, -6, 6, 0.02, 4);
  for (const s of [-1, 1]) { rb(fb, woodM("#7a5230"), -64, 64, 0, unit, s * 6 - (s > 0 ? 0 : 0.35), s * 6 + (s > 0 ? 0.35 : 0), 0.03, 2); for (let x = -62; x < 62; x += 3) rb(fb, woodM("#5a3a22"), x - 0.15, x + 0.15, 0, unit, s * 6 - (s > 0 ? 0.4 : 0.1), s * 6 + (s > 0 ? 0.1 : 0.4), 0.02); }
  fb.build(fill, true); G.add(fill);
  const top = new THREE.Group(); const tb = new Batch();
  for (const s of [-1, 1]) { rb(tb, woodM("#a8845c"), -64, 64, 0, 0.16, s * 5.7 - 0.6, s * 5.7 + 0.6, 0.02, 2); for (let x = -60; x < 62; x += 3) { tb.add(rod(V(x, 0.1, s * 6.2), V(x, 1.0, s * 6.2), 0.045, 0.04, 5), woodM("#6a4626")); } rb(tb, woodM("#6a4626"), -60, 62, 0.96, 1.04, s * 6.2 - 0.04, s * 6.2 + 0.04, 0.01); }
  // wooden stair rail gap at the stair
  tb.build(top, true); G.add(top);
  const stairs = new THREE.Group(); const sb = new Batch();
  const NS = 12; for (let k = 0; k < NS; k++) rb(sb, woodM("#b08a5a"), SPOT.PIT_STAIR_X - 1.25, SPOT.PIT_STAIR_X + 1.25, 0, unit * (1 - (k + 1) / (NS + 1)) + 0.0, -6.0 - (k + 1) * (3.0 / NS), -6.0 - k * (3.0 / NS), 0.01);
  sb.build(stairs, true); G.add(stairs);
  // the dump wagon (its bed tilts) + gravel heaps + shovel-heaps
  const wag = new THREE.Group(), bed = new THREE.Group(); { const wb = new Batch(); rb(wb, woodM("#8a5a34"), -0.8, 0.8, 0.0, 0.12, -1.4, 1.4, 0.02); for (const s of [-1, 1]) rb(wb, woodM("#7a4a2a"), s * 0.78 - 0.05, s * 0.78 + 0.05, 0.12, 0.8, -1.4, 1.4, 0.02); rb(wb, woodM("#7a4a2a"), -0.8, 0.8, 0.12, 0.8, -1.4, -1.34, 0.02); rb(wb, woodM("#7a4a2a"), -0.8, 0.8, 0.12, 0.8, 1.34, 1.4, 0.02); wb.build(bed, true); bed.position.set(0, 1.0, 0); }
  const wb2 = new Batch(); for (const s of [-1, 1]) { wb2.add(cached("pwheel", () => new THREE.TorusGeometry(0.62, 0.05, 6, 24).rotateY(Math.PI / 2)), col("#2a2a2e"), M4(s * 0.92, 0.62, 0)); for (let k = 0; k < 6; k++) wb2.add(cached("pspoke", () => new THREE.CylinderGeometry(0.022, 0.022, 1.1, 5).rotateZ(Math.PI / 2)), col("#d9b878"), M4(s * 0.92, 0.62, 0).multiply(new THREE.Matrix4().makeRotationX((k * Math.PI) / 6))); }
  rb(wb2, woodM("#6a4626"), -1.0, 1.0, 0.78, 0.98, -1.2, 1.2, 0.03); wb2.build(wag, true); wag.add(bed);
  const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, 6.3, 0, 1.4), lam("gravelHeap", () => ({ map: P.dirtRoadHD() }))); heap.scale.set(1.5, 0.7, 1.3); heap.castShadow = true; heap.visible = false;
  G.add(wag, heap);
  rig.tick = (t) => {
    const f = Math.round(t * 30), F = fillAt(f), k = Math.max(0.0001, F);
    fill.scale.y = k; top.position.y = F; stairs.scale.y = k; stairs.visible = F > 0.05;
    wag.position.set(-3.0, F, 2.2); wag.rotation.y = Math.PI / 2;
    const tilt = 0.55 * glide((f - (EV.DUMP6 - 6)) / 10) * (1 - glide((f - (EV.DUMP6 + 20)) / 12));
    bed.rotation.x = tilt; bed.position.z = 0; bed.position.y = 1.0 + 0.0;
    heap.visible = f >= EV.DUMP6; heap.position.set(-5.6, F, 2.2); heap.scale.set(0.5 + 1.2 * smooth((f - EV.DUMP6) / 14), 0.15 + 0.7 * smooth((f - EV.DUMP6) / 14), 0.5 + 0.9 * smooth((f - EV.DUMP6) / 14));
  };
  return rig;
};
const gasLampPit = (b: Batch, x: number, z: number) => { b.add(rod(V(x, 0, z), V(x, 3.6, z), 0.07, 0.05, 8), col("#2a3a32")); b.add(cached("lampGlobe", () => new THREE.SphereGeometry(0.26, 12, 10)), glow("#fff2c0", 1.0), M4(x, 3.9, z)); };

// ---------------------------------------------------------------------------------------------------------------
// the contractors' office (interior, shot 8)
// ---------------------------------------------------------------------------------------------------------------
const buildOffice = (): SetRig => {
  const b = new Batch(), sh = new Batch(), H = 3.6;
  room(sh, -5.2, 5.2, -4.4, 5.5, H, texM("offFloor", () => P.planksHD()), texM("offWall", () => P.wallpaperHD("off", "#6a9a6a", "#e8dca8")), col("#f0e4c8"));
  rb(b, texM("offPanel", () => P.panelHD("#7a4a2a")), -5.2, 5.2, 0, 1.1, -4.4, -4.34, 0.01, 2);
  for (const s of [-1, 1]) rb(b, texM("offPanel", () => P.panelHD("#7a4a2a")), s * 5.2 - (s > 0 ? 0.06 : 0), s * 5.2 + (s > 0 ? 0 : 0.06), 0, 1.1, -4.4, 5.5, 0.01, 2);
  rb(b, col(CREAM), -5.2, 5.2, H - 0.3, H, -4.4, -4.1, 0.02);
  // two big arched windows on the back wall: the street is sunlit sky and a brick gable
  for (const x of [-2.5, 2.7]) {
    archGlow(b, x, 1.0, -4.36, 0.95, 1.5, "#a8d4ff", 1.25); b.add(hood(0.95, 1.5, 0.2, 0.12), col(CREAM), M4(x, 1.0, -4.38));
    rb(b, col(CREAM), x - 0.03, x + 0.03, 1.0, 3.0, -4.34, -4.3, 0.005); rb(b, col(CREAM), x - 0.95, x + 0.95, 2.0, 2.06, -4.34, -4.3, 0.005);
    for (const s of [-1, 1]) rb(b, col("#c8282e"), x + s * 1.28 - 0.26, x + s * 1.28 + 0.26, 0.9, 3.4, -4.34, -4.1, 0.04);
  }
  // a big map with pins (pictogram), shelves of rolled blueprints, a hat rack, a safe, a stove
  rb(b, col("#fbf3d8"), -5.15, -5.1, 1.6, 3.0, -2.6, -0.6, 0.005); b.add(new THREE.PlaneGeometry(2.0, 1.4), texM("officeMap", () => ctex("officeMap", 256, 180, (g) => { g.fillStyle = "#e8dca8"; g.fillRect(0, 0, 256, 180); g.fillStyle = "#6aa8d0"; g.fillRect(150, 0, 106, 180); g.strokeStyle = "#7a5a30"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 120); g.lineTo(90, 90); g.lineTo(160, 130); g.stroke(); for (const [x, y] of [[40, 60], [100, 100], [60, 140]]) { g.fillStyle = "#c8282e"; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); } })), M4(-5.08, 2.3, -1.6, Math.PI / 2));
  rb(b, woodM("#5a3a22"), 3.2, 5.0, 0, 2.6, -4.3, -3.5, 0.04); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { b.add(cached("roll", () => new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8).rotateZ(Math.PI / 2)), col(["#3a6ab8", "#f2ecd8", "#3a6ab8"][i]), M4(4.1, 0.4 + j * 0.65, -3.9 + (i - 1) * 0.0)); }
  rb(b, col("#3a3e48"), -4.9, -3.9, 0, 1.3, -4.2, -3.2, 0.05); rb(b, shiny(BRASS), -4.6, -4.2, 0.5, 0.9, -3.2, -3.16, 0.02);
  for (const x of [-4.8, -4.2, -3.6]) { b.add(rod(V(x, 0, 4.9), V(x, 1.9, 4.9), 0.03, 0.03, 5), woodM("#3a2012")); }
  // the drafting table: a thick top, trestle legs, lamp, tools, the unrolled blueprint (animated)
  const T = SPOT.TABLE;
  rb(b, shiny("#7a5230", 40), T[0] - 1.5, T[0] + 1.5, T[1] - 0.1, T[1], T[2] - 0.7, T[2] + 0.7, 0.03);
  for (const sx of [-1.3, 1.3]) for (const sz of [-0.55, 0.55]) rb(b, woodM("#5a3a22"), T[0] + sx - 0.07, T[0] + sx + 0.07, 0, T[1] - 0.1, T[2] + sz - 0.07, T[2] + sz + 0.07, 0.02);
  rb(b, woodM("#5a3a22"), T[0] - 1.3, T[0] + 1.3, 0.3, 0.36, T[2] - 0.05, T[2] + 0.05, 0.01);
  b.add(lathe("lampFoot", [[0, 0], [0.12, 0], [0.12, 0.03], [0.03, 0.05], [0, 0.05]], 14), col("#3a3a40"), M4(T[0] + 1.2, T[1], T[2] - 0.45));
  b.add(rod(V(T[0] + 1.2, T[1] + 0.04, T[2] - 0.45), V(T[0] + 1.26, T[1] + 0.44, T[2] - 0.45), 0.014), col("#3a3a40")); b.add(lathe("lampShade", [[0.03, 0.12], [0.08, 0.1], [0.15, 0.0], [0.155, -0.01], [0, -0.01]], 16), col("#1f8f5a"), M4(T[0] + 1.3, T[1] + 0.46, T[2] - 0.45, 0, 0.3)); b.add(cached("bulb", () => new THREE.SphereGeometry(0.05, 10, 8)), glow("#ffe0a0", 2.6), M4(T[0] + 1.3, T[1] + 0.4, T[2] - 0.45));
  rb(b, col("#c9a24a"), T[0] - 1.2, T[0] - 0.8, T[1], T[1] + 0.03, T[2] + 0.35, T[2] + 0.45, 0.005);
  for (const s of [-1, 1]) rb(b, woodM("#4a2e1a"), s * 1.0 - 0.3, s * 1.0 + 0.3, 0.0, 0.5, 1.0, 1.5, 0.03);
  rb(b, texM("offRug", () => P.carpetHD("#7a2a2e")), -3.4, 3.4, 0.0, 0.02, -2.5, 3.5, 0.005, 2);
  for (let q = 0; q < 6; q++) { const a = (q / 6) * 6.28; b.add(cached("chb", () => new THREE.SphereGeometry(0.08, 8, 6)), glow("#ffe9b0", 1.7), M4(Math.cos(a) * 0.5, H - 0.9, 0 + Math.sin(a) * 0.5)); }
  b.add(rod(V(0, H, 0), V(0, H - 0.8, 0), 0.03, 0.03, 5), col("#3a3a40")); b.add(cached("chand", () => new THREE.TorusGeometry(0.5, 0.04, 5, 24).rotateX(Math.PI / 2)), shiny(BRASS), M4(0, H - 0.9, 0));
  picture(b, -5.1, 2.6, 2.4, 0.9, 1.2, Math.PI / 2, 1); picture(b, 5.1, 2.4, -0.8, 1.2, 0.9, -Math.PI / 2, 2);
  // the blueprint (a drawing of a six-story building with up arrows, no words) unrolls along the table
  const bp = new THREE.Group(); bp.position.set(T[0] - 1.1, T[1] + 0.004, T[2]);
  const bpMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0).rotateX(-Math.PI / 2).translate(1.1, 0, 0), new THREE.MeshBasicMaterial({ map: ctex("bpTex", 512, 230, (g) => {
    g.fillStyle = "#2a5aa8"; g.fillRect(0, 0, 512, 230); g.strokeStyle = "#e8f0fb"; g.lineWidth = 3;
    g.strokeRect(120, 30, 130, 170); for (let r = 0; r < 6; r++) { g.beginPath(); g.moveTo(120, 30 + r * 28); g.lineTo(250, 30 + r * 28); g.stroke(); for (let c = 0; c < 4; c++) { g.beginPath(); g.arc(139 + c * 31, 50 + r * 28, 7, Math.PI, 0); g.stroke(); } }
    for (const x of [300, 340, 380, 420]) { g.beginPath(); g.moveTo(x, 200); g.lineTo(x, 70); g.lineTo(x - 12, 92); g.moveTo(x, 70); g.lineTo(x + 12, 92); g.stroke(); }
    g.beginPath(); g.moveTo(40, 200); g.lineTo(480, 200); g.stroke(); for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(300 + i * 18, 214, 4, 0, 7); g.stroke(); }
  }), side: THREE.DoubleSide, color: new THREE.Color(0.95, 0.95, 0.95) })); bp.add(bpMesh);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 12).rotateX(Math.PI / 2), lam("bpRoll", () => ({ color: "#3a6ab8" }))); bp.add(roll);
  const rig: SetRig = { name: "office", group: new THREE.Group() }; rig.group.name = "office"; b.build(rig.group, true); const shell = new THREE.Group(); sh.build(shell, false); rig.group.add(shell, bp);
  rig.tick = (t) => { const f = Math.round(t * 30), u = glide((f - EV.PLAN8 + 2) / 22); bpMesh.scale.x = Math.max(0.001, u); bpMesh.visible = f >= EV.PLAN8 - 3; roll.position.x = 0.12 + 2.1 * u * 0 - 0.08 * 0 + 0.0; roll.scale.set(1, 1, 1); roll.position.x = 0.0 + 2.1 * u; };
  return rig;
};

// ---------------------------------------------------------------------------------------------------------------
// the golden-dusk station + the steam train
// ---------------------------------------------------------------------------------------------------------------
const bandOf = (b: Batch, x0: number, x1: number, y: number, r: number, z = 0, c = BRASS) => b.add(cached("band" + r, () => new THREE.CylinderGeometry(r, r, 0.12, 20).rotateZ(Math.PI / 2)), shiny(c, 60), M4((x0 + x1) / 2, y, z, 0, 0, 0, [(x1 - x0) / 0.12, 1, 1]));
/** a Pullman sleeping car (side seen from +z), body emerald, gold lining, windows glowing warm */
const pullmanCar = (b: Batch, x0: number, x1: number, zc: number) => {
  const L = x1 - x0, cx = (x0 + x1) / 2, W = 3.0, y0 = 1.0;
  rb(b, gloss("#12583a"), x0, x1, y0, y0 + 3.2, zc - W / 2, zc + W / 2, 0.12);
  rb(b, gloss("#0e4a30"), x0 + 0.3, x1 - 0.3, y0 + 3.2, y0 + 3.8, zc - 0.9, zc + 0.9, 0.12);                        // clerestory
  rb(b, col("#3a3a42"), x0 - 0.1, x1 + 0.1, y0 + 3.8, y0 + 4.05, zc - 1.0, zc + 1.0, 0.06);
  for (const dz of [-1, 1]) { rb(b, col("#e8c040"), x0 + 0.02, x1 - 0.02, y0 + 2.9, y0 + 3.0, zc + dz * (W / 2 + 0.005) - 0.01, zc + dz * (W / 2 + 0.01) + 0.01, 0.005); rb(b, col("#e8c040"), x0 + 0.02, x1 - 0.02, y0 + 0.25, y0 + 0.33, zc + dz * (W / 2 + 0.005) - 0.01, zc + dz * (W / 2 + 0.01) + 0.01, 0.005); }
  const n = Math.floor((L - 2) / 1.6);
  for (let k = 0; k < n; k++) {
    const x = x0 + 1.0 + (k + 0.5) * ((L - 2) / n);
    archGlow(b, x, y0 + 1.1, zc + W / 2 + 0.02, 0.5, 0.9, "#ffd890", 1.4);
    b.add(hood(0.5, 0.9, 0.07, 0.05), shiny("#e8c040", 50), M4(x, y0 + 1.1, zc + W / 2 + 0.01));
    archGlow(b, x, y0 + 1.1, zc - W / 2 - 0.02, 0.5, 0.9, "#ffd890", 1.4, Math.PI);
  }
  for (const dx of [-1, 1]) { rb(b, col("#3a3a42"), cx + dx * (L / 2 - 1.1) - 0.8, cx + dx * (L / 2 - 1.1) + 0.8, 0.3, 0.9, zc - 1.1, zc + 1.1, 0.04); for (const s of [-1, 1]) for (const wx of [-0.4, 0.4]) b.add(cached("carWheel", () => new THREE.CylinderGeometry(0.42, 0.42, 0.1, 18).rotateX(Math.PI / 2)), col("#2a2a30"), M4(cx + dx * (L / 2 - 1.1) + wx, 0.42, zc + s * 1.0)); }
  rb(b, col("#3a3a42"), x0 - 0.5, x0, y0, y0 + 0.1, zc - 1.2, zc + 1.2, 0.02);                                      // the open end platform + rails
  for (const dz of [-1.1, 1.1]) rb(b, shiny(BRASS, 60), x0 - 0.5, x0, y0 + 0.9, y0 + 0.95, zc + dz - 0.02, zc + dz + 0.02, 0.01);
  for (let k = 0; k < 4; k++) rb(b, col("#c8a050"), x0 - 0.7 + 0.0, x0 - 0.2, 0.0 + k * 0.25, 0.25 + k * 0.25, zc - 0.6, zc + 0.6, 0.01);
};
const locomotive = (b: Batch, x0: number, zc: number) => {
  const R = 1.1, body = col("#2c2c34"), red = col("#c8282e");
  b.add(cached("boiler", () => new THREE.CylinderGeometry(1.0, 1.0, 6.2, 22).rotateZ(Math.PI / 2)), body, M4(x0 + 6.6, 2.4, zc));
  for (const x of [x0 + 4.4, x0 + 5.8, x0 + 7.2, x0 + 8.6]) bandOf(b, x - 0.5, x + 0.5, 2.4, 1.03, zc);
  b.add(cached("smokebox", () => new THREE.CylinderGeometry(1.06, 1.06, 1.1, 22).rotateZ(Math.PI / 2)), col("#3a3a44"), M4(x0 + 9.9, 2.4, zc));
  b.add(cached("stack", () => new THREE.CylinderGeometry(0.34, 0.2, 1.6, 12)), body, M4(x0 + 9.6, 3.9, zc)); b.add(lathe("stackTop", [[0, 0], [0.34, 0], [0.8, 0.5], [0.9, 0.9], [0.8, 1.0], [0, 1.0]], 18), body, M4(x0 + 9.6, 4.6, zc));
  b.add(cached("domeL", () => new THREE.SphereGeometry(0.55, 14, 10, 0, 6.3, 0, 1.6)), shiny(BRASS, 80), M4(x0 + 7.4, 3.3, zc)); b.add(cached("domeL2", () => new THREE.SphereGeometry(0.42, 14, 10, 0, 6.3, 0, 1.6)), shiny(BRASS, 80), M4(x0 + 5.6, 3.3, zc));
  b.add(rod(V(x0 + 5.6, 3.8, zc), V(x0 + 5.6, 4.6, zc), 0.07, 0.07, 6), shiny(BRASS, 60));
  rb(b, red, x0 + 1.0, x0 + 3.4, 1.5, 4.7, zc - 1.3, zc + 1.3, 0.1);                                                  // the cab
  rb(b, col("#3a2a1a"), x0 + 0.8, x0 + 3.7, 4.7, 4.9, zc - 1.5, zc + 1.5, 0.06);
  for (const s of [-1, 1]) { archGlow(b, x0 + 2.2, 3.0, zc + s * 1.31, 0.45, 0.7, "#ffd890", 1.4, s > 0 ? 0 : Math.PI); }
  rb(b, col("#2a2a32"), x0 + 3.6, x0 + 11.0, 0.9, 1.5, zc - 0.9, zc + 0.9, 0.06);                               // the running board / frame
  rb(b, col("#3a3a42"), x0 + 10.9, x0 + 12.4, 0.5, 1.4, zc - 0.9, zc + 0.9, 0.04); b.add(cached("catcher", () => new THREE.ConeGeometry(1.2, 1.4, 4).rotateZ(-Math.PI / 2)), shiny("#3a3a42", 40), M4(x0 + 11.8, 0.7, zc, Math.PI / 4));
  b.add(cached("headlamp", () => new THREE.CylinderGeometry(0.4, 0.4, 0.5, 16).rotateZ(Math.PI / 2)), shiny(BRASS, 80), M4(x0 + 10.55, 3.4, zc)); b.add(cached("lampLens", () => new THREE.SphereGeometry(0.34, 12, 8)), glow("#fff2c0", 1.8), M4(x0 + 10.85, 3.4, zc));
  for (const s of [-1, 1]) for (const wx of [4.6, 6.4, 8.2]) {
    const wm = M4(x0 + wx, R, zc + s * 1.15);
    b.add(cached("drvTyre", () => new THREE.TorusGeometry(R, 0.08, 6, 28).rotateX(Math.PI / 2 * 0)), col("#2a2a2e"), wm);
    b.add(cached("drvDisc", () => new THREE.CylinderGeometry(R - 0.06, R - 0.06, 0.1, 24).rotateX(Math.PI / 2)), red, wm);
    for (let k = 0; k < 8; k++) b.add(cached("drvSpoke", () => new THREE.BoxGeometry(0.06, 2 * R - 0.2, 0.14)), col("#f2e2b0"), wm.clone().multiply(new THREE.Matrix4().makeRotationZ((k * Math.PI) / 8)));
    b.add(cached("drvHub", () => new THREE.CylinderGeometry(0.18, 0.18, 0.2, 10).rotateX(Math.PI / 2)), shiny(BRASS, 80), wm);
  }
  for (const s of [-1, 1]) b.add(rod(V(x0 + 4.6, R, zc + s * 1.27), V(x0 + 8.2, R, zc + s * 1.27), 0.07, 0.07, 6), shiny("#d6dae0", 80));
  // the tender with a woodpile
  rb(b, col("#26262e"), x0 - 3.8, x0 + 0.8, 1.1, 3.0, zc - 1.2, zc + 1.2, 0.08); for (let k = 0; k < 14; k++) b.add(cached("log", () => new THREE.CylinderGeometry(0.14, 0.14, 2.2, 7).rotateX(Math.PI / 2)), woodM("#a8764a"), M4(x0 - 3.4 + (k % 7) * 0.62, 3.1 + Math.floor(k / 7) * 0.22, zc + (k % 2 ? 0.3 : -0.3) * 0, 0));
  for (const s of [-1, 1]) for (const wx of [-3.2, -2.0, -0.8]) b.add(cached("tWheel", () => new THREE.CylinderGeometry(0.5, 0.5, 0.1, 18).rotateX(Math.PI / 2)), col("#2a2a30"), M4(x0 + wx, 0.5, zc + s * 1.0));
};
const buildPlatform = (): SetRig => {
  const b = new Batch(), r = rng(41);
  terrain(b, groundM("platGround", () => P.stubbleHD("platStub", "#c9a050")), -FAR, FAR, -FAR, FAR, 4, undefined, 4, -1.0);
  // railbed + tracks along x at z = -5
  rb(b, groundM("ballast", () => P.cobbleHD()), -FAR / 2, FAR / 2, -1.0, -0.7, -7.4, -2.6, 0.02, 4);
  for (const z of [-5.7, -4.3]) rb(b, shiny("#6a7080", 60), -FAR / 2, FAR / 2, -0.7, -0.55, z - 0.04, z + 0.04, 0.01);
  for (let x = -90; x < 90; x += 0.9) rb(b, woodM("#5a3a22"), x - 0.1, x + 0.1, -0.72, -0.62, -6.4, -3.6, 0.01);
  // the platform: raised plank deck, edge, canopy posts, lamps, trunks, a bench, a little depot
  rb(b, woodM("#b08a5a"), -40, 40, -1.0, 0.0, -2.6, 6.5, 0.03, 2);
  rb(b, col("#efe4c8"), -40, 40, -0.1, 0.0, -2.62, -2.5, 0.01);
  for (let x = -36; x < 36; x += 6) { if (x > -16 && x < 4) continue; b.add(rod(V(x, 0, 4.6), V(x, 4.4, 4.6), 0.1, 0.08, 6), col("#2f7a4a")); }
  rb(b, col("#c8282e"), -36, 36, 4.4, 4.8, 3.6, 6.6, 0.05); b.add(plate([[0, 0], [72, 0], [72, 0.5]], 3.0, 0.02), col("#a82228"), M4(-36, 4.8, 5.1, 0, 0, 0));
  for (const x of [-9, -2, 6, 15]) { b.add(rod(V(x, 0, 2.8), V(x, 3.0, 2.8), 0.06, 0.05, 6), col("#2a3a32")); b.add(cached("lampGlobe", () => new THREE.SphereGeometry(0.24, 12, 10)), glow("#ffd890", 2.4), M4(x, 3.2, 2.8)); }
  for (let k = 0; k < 4; k++) rb(b, woodM(["#8a4a2a", "#5a3a22", "#9a6a3a", "#6a4a2a"][k]), 5 + k * 0.9, 5.8 + k * 0.9, 0, 0.5 + 0.2 * (k % 2), 1.6, 2.4, 0.04);
  rb(b, woodM("#6a4626"), 9, 12, 0, 0.5, 5.6, 6.2, 0.03); rb(b, woodM("#6a4626"), 9, 12, 0.5, 1.2, 6.1, 6.2, 0.03);
  rb(b, sidingM("#d8c898"), 18, 30, 0, 4.4, 3.5, 6.4, 0.05, 2); rb(b, col("#6a4a46"), 17.6, 30.4, 4.4, 4.8, 3.3, 6.6, 0.04); archGlow(b, 22, 1.2, 3.52, 0.6, 1.2, "#ffd890", 1.4); archGlow(b, 26, 1.2, 3.52, 0.6, 1.2, "#ffd890", 1.4);
  // the train: sleeping car behind the platform, the locomotive ahead (facing +x)
  pullmanCar(b, -16, -1.4, -5.0);
  locomotive(b, -1.0, -5.0);
  // telegraph poles, hills, trees, haystacks in the golden countryside
  for (let x = -80; x < 90; x += 18) { b.add(rod(V(x, -1, -14), V(x, 6.2, -14), 0.1, 0.08, 6), woodM("#5a3a26")); rb(b, woodM("#5a3a26"), x - 1.2, x + 1.2, 5.8, 5.95, -14.05, -13.95, 0.02); }
  for (let i = 0; i < 16; i++) addVeg(b, "round", -90 + 12 * i + 4 * r(), -1.0, -22 - 14 * r(), 5 + 3 * r(), 600 + i, 1);
  for (let i = 0; i < 10; i++) b.add(cached("hay", () => new THREE.SphereGeometry(1, 12, 8, 0, 6.3, 0, 1.6)), shiny("#d8b050", 10), M4(-70 + 16 * i, -1.0, -30 - 16 * r(), 0, 0, 0, [2.2, 2.6, 2.2]));
  hillRing(b, 0, 0, 700, 25, 70, 8, "#7a6a8a"); hillRing(b, 0, 0, 800, 12, 30, 14, "#a07a6a");
  const rig: SetRig = { name: "platform", group: new THREE.Group() }; rig.group.name = "platform"; b.build(rig.group, true);
  return rig;
};

// ---------------------------------------------------------------------------------------------------------------
// the Pullman sleeping car interior (shot 14b)
// ---------------------------------------------------------------------------------------------------------------
const buildSleeper = (): SetRig => {
  const b = new Batch(), sh = new Batch(), out = new Batch(), r = rng(59);
  const X0 = -9, X1 = 9, Z0 = -1.7, Z1 = 1.7, H = 3.1;
  const wood = texM("pullPanel", () => P.panelHD("#7a4a2a")), ceil = texM("pullCeil", () => P.wallpaperHD("pc", "#f0e4c4", "#e0b050"));
  // shell: floor (carpet aisle), back wall (with the windows cut as glass quads), ceiling, end walls
  sh.add(quad(V(X0, 0, Z1), V(X1, 0, Z1), V(X1, 0, Z0), V(X0, 0, Z0), 9, 1.7), texM("pullCarpet", () => P.carpetHD("#7a2a2e", "#d9a83a")));
  sh.add(quad(V(X1, 0, Z1), V(X0, 0, Z1), V(X0, H, Z1), V(X1, H, Z1), 9, 1.5), wood);
  sh.add(quad(V(X0, H, Z0), V(X1, H, Z0), V(X1, H, Z1), V(X0, H, Z1), 9, 1.7), ceil);
  for (const s of [-1, 1]) sh.add(quad(V(s > 0 ? X1 : X0, 0, s > 0 ? Z1 : Z0), V(s > 0 ? X1 : X0, 0, s > 0 ? Z0 : Z1), V(s > 0 ? X1 : X0, H, s > 0 ? Z0 : Z1), V(s > 0 ? X1 : X0, H, s > 0 ? Z1 : Z0), 2, 1.5), wood);
  // the bays: window above a lower berth, green curtains drawn back to both sides, a brass lamp
  const bays = [-6.0, -3.0, 0.0, 3.0, 6.0];
  { const sh2 = new THREE.Shape([new THREE.Vector2(X0, 0), new THREE.Vector2(X1, 0), new THREE.Vector2(X1, H), new THREE.Vector2(X0, H)]);
    for (const x of bays) { const pts: THREE.Vector2[] = [new THREE.Vector2(x - 0.62, 1.1), new THREE.Vector2(x + 0.62, 1.1)]; for (let i = 0; i <= 12; i++) { const a = (Math.PI * i) / 12; pts.push(new THREE.Vector2(x + 0.62 * Math.cos(a), 2.0 + 0.62 * Math.sin(a))); } sh2.holes.push(new THREE.Path(pts)); }
    const wg = new THREE.ExtrudeGeometry(sh2, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 10 }); wg.translate(0, 0, Z0);
    { const uv = wg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.5); }
    b.add(wg, texM("pullPanelF", () => P.panelHD("#7a4a2a"), { side: THREE.DoubleSide })); }
  for (const x of bays) {
    // berth: mattress, white sheet, pillow, a wooden valance
    rb(b, woodM("#5a3320"), x - 1.35, x + 1.35, 0.3, 0.55, Z0 + 0.02, Z0 + 1.1, 0.04); rb(b, col("#fbf8ee"), x - 1.3, x + 1.3, 0.55, 0.72, Z0 + 0.05, Z0 + 1.05, 0.08); rb(b, col("#f2f0e8"), x - 1.3, x - 0.55, 0.72, 0.86, Z0 + 0.15, Z0 + 0.9, 0.06);
    rb(b, texM("quiltS", () => P.ctex("quiltS", 64, 64, (g) => { g.fillStyle = "#c0352e"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#e8c040"; g.fillRect(0, 28, 64, 8); })), x - 0.4, x + 1.3, 0.72, 0.84, Z0 + 0.08, Z0 + 1.0, 0.07);
    // the window (arched, open to the countryside), brass hood
    b.add(hood(0.62, 0.9, 0.1, 0.06), shiny(BRASS, 60), M4(x, 1.1, Z0 + 0.11));
    rb(b, shiny(BRASS, 60), x - 0.7, x + 0.7, 1.03, 1.1, Z0 + 0.04, Z0 + 0.16, 0.01);
    // upper berth folded up: a panel, a brass lamp
    rb(b, woodM("#5a3320"), x - 1.4, x + 1.4, 2.62, 2.95, Z0 + 0.02, Z0 + 0.5, 0.05); b.add(lathe("pulLamp", [[0, 0], [0.12, 0], [0.12, 0.04], [0.04, 0.1], [0, 0.1]], 10), shiny(BRASS, 60), M4(x + 1.05, 1.95, Z0 + 0.12)); b.add(cached("pulBulb", () => new THREE.SphereGeometry(0.08, 8, 6)), glow("#ffe0a0", 1.7), M4(x + 1.05, 2.12, Z0 + 0.14));
    // the green curtains: gathered folds either side of the bay, a pelmet
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) rb(b, col(["#1f8f5a", "#2aa066", "#188250"][k % 3]), x + s * (1.38 - k * 0.1) - 0.05, x + s * (1.38 - k * 0.1) + 0.05, 0.1, 2.35, Z0 + 0.3 + k * 0.01, Z0 + 1.2 + (k % 2) * 0.05, 0.02);
    rb(b, col("#1f8f5a"), x - 1.5, x + 1.5, 2.25, 2.45, Z0 + 0.1, Z0 + 1.3, 0.04); rb(b, shiny(BRASS, 60), x - 1.5, x + 1.5, 2.43, 2.47, Z0 + 0.1, Z0 + 1.3, 0.01);
  }
  // aisle-side seats / far wall brass rail, ceiling lamps
  for (const x of [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]) { b.add(cached("celLamp", () => new THREE.SphereGeometry(0.16, 10, 8)), glow("#ffe0a0", 1.9), M4(x, H - 0.25, 0)); b.add(rod(V(x, H, 0), V(x, H - 0.22, 0), 0.015, 0.015, 5), shiny(BRASS, 60)); }
  rb(b, col("#e8c040"), X0, X1, H - 0.4, H - 0.34, Z0 + 0.0, Z0 + 0.02, 0.005);
  // outside scenery (seen through the windows): ground strips, fields, hills, moving poles / fence posts / trees (the tick slides them)
  const groundOut = new THREE.Mesh(new THREE.PlaneGeometry(400, 120).rotateX(-Math.PI / 2), lam("fieldOut", () => ({ map: P.fieldHD() })));
  groundOut.material.map!.repeat.set(30, 8); groundOut.position.set(0, -1.6, -65); groundOut.userData.inkId = 1300;
  const sceneryG = new THREE.Group();
  const ob = new Batch();
  hillRing(ob, 0, 0, 600, 20, 55, 3, "#8a6a8a"); hillRing(ob, 0, 0, 500, 10, 26, 5, "#6a8a6a");
  ob.build(sceneryG, false);
  const movers = new THREE.Group(); sceneryG.add(movers);
  const mb = new Batch();
  for (let i = 0; i < 10; i++) { const x = -45 + i * 9; mb.add(rod(V(x, -1.6, -5.5), V(x, 3.4, -5.5), 0.1, 0.08, 6), woodM("#5a3a26")); rb(mb, woodM("#5a3a26"), x - 0.9, x + 0.9, 3.1, 3.24, -5.55, -5.45, 0.02); }
  for (let i = 0; i < 90; i++) { const x = -45 + i; rb(mb, woodM("#8a6a48"), x - 0.05, x + 0.05, -1.6, -0.5, -9.0, -8.9, 0.01); if (i % 2 === 0) rb(mb, woodM("#8a6a48"), x, x + 1, -1.0, -0.94, -9.0, -8.9, 0.005); }
  for (let i = 0; i < 12; i++) addVeg(mb, "round", -45 + 8 * i + 2 * r(), -1.6, -14 - 5 * r(), 4 + 2 * r(), 800 + i, 1);
  for (let i = 0; i < 6; i++) mb.add(cached("hayO", () => new THREE.SphereGeometry(1, 12, 8, 0, 6.3, 0, 1.6)), shiny("#d8b050", 10), M4(-40 + 14 * i, -1.6, -20 - 5 * r(), 0, 0, 0, [2, 2.4, 2]));
  mb.build(movers, true);
  b.build(sceneryG, false);
  const rig: SetRig = { name: "sleeper", group: new THREE.Group() }; const G = rig.group; G.name = "sleeper";
  const body = new THREE.Group(); b.build(body, false); body.traverse((o) => { o.castShadow = false; });
  const shell = new THREE.Group(); sh.build(shell, false); G.add(body, shell, groundOut, sceneryG);
  // the car roof / outer skin keeps the sun out of the shade colours only
  rig.tick = (t) => { const v = 9; movers.position.x = -((t * v) % 9); };
  void out;
  return rig;
};

// ---------------------------------------------------------------------------------------------------------------
export const buildSets = (): Record<SetName, SetRig> => ({
  town: buildTown(), hall: buildHall(), pit: buildPit(), street: buildStreet(), office: buildOffice(), cutaway: buildCutaway(), platform: buildPlatform(), sleeper: buildSleeper(),
});

// =================================================================================================================
// FOREGROUND framing props (story.ts FOREGROUND): the kits are built once into `group` (cached by kit name) and placed in
// camera space ("cam") or world space. Kit front = local +z (faces the lens). The shot's DOF blurs them.
// =================================================================================================================
const fgKit = (kit: string): THREE.Group => {
  const g = new THREE.Group(), b = new Batch();
  switch (kit) {
    case "cattail": for (let i = 0; i < 7; i++) cattail(b, (i - 3) * 0.14 + 0.05 * Math.sin(i * 3), 0.1 * Math.cos(i), 1.6 + 0.5 * ((i * 7) % 3) / 2, 40 + i); break;
    case "crib": { for (let k = 0; k < 4; k++) for (const o of [-0.3, 0.3]) { if (k % 2) rb(b, woodM("#a8764a"), -0.55, 0.55, k * 0.2, k * 0.2 + 0.2, o - 0.11, o + 0.11, 0.02); else rb(b, woodM("#a8764a"), o - 0.11, o + 0.11, k * 0.2, k * 0.2 + 0.2, -0.55, 0.55, 0.02); } break; }
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
void mergeGeometries; void unlit; void buildNoInk; void slab; void mats; void hotelY; void screwTurn; void tri;
