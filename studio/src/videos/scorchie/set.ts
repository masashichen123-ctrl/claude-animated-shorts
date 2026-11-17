// Sets for "The Building That Melted a Car": a City of London street, the curved glass tower, two cars, a café, the
// hot spot and its beam, and a light-ray diagram stage (flat and curved mirrors).
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../kit/build";
import { ctex } from "../kit/paint";
import { twoTone } from "../kit/shade";
import { NOINK } from "../kit/ink";
import { Env, quadUp } from "../kit/world";
import { col, shiny, mesh, ell, board, text, makeCar, block, lampPost, cone, tree } from "../kit/props";
import { hh, clamp01, easeOut, V3 } from "../kit/timeline";
import { F, TOWER_H, CAR_AT, SPOT, SHOP, DIAG, PODIUM, ARRIVE0, ARRIVE1, CAR2_0, CAR2_1, FOCUS_HIT, FINS, driveX } from "./timeline";

const H = TOWER_H;
/** the tower's south face: leans out as it rises, and is concave left to right (edges stick out ~3.5 m) */
export const hw = (y: number) => 15 + 8 * (y / H) ** 1.3;
export const zS = (x: number, y: number) => -12 - 14 * (y / H) ** 1.6 - 3.5 * (x / hw(y)) ** 2;
const zN = (y: number) => 12 + 6 * (y / H) ** 1.6;

const towerGeo = () => {
  const NY = 30, NX = 17, pos: number[] = [], uv: number[] = [];
  const ring = (y: number) => {
    const p: [number, number][] = [];
    for (let i = 0; i < NX; i++) { const x = -hw(y) + (2 * hw(y) * i) / (NX - 1); p.push([x, zS(x, y)]); }
    p.push([hw(y), zN(y)], [-hw(y), zN(y)]);
    return p;
  };
  for (let j = 0; j < NY; j++) {
    const y0 = (H * j) / NY, y1 = (H * (j + 1)) / NY, a = ring(y0), b = ring(y1);
    let u0 = 0;
    for (let i = 0; i < a.length; i++) {
      const k = (i + 1) % a.length, len = Math.hypot(a[k][0] - a[i][0], a[k][1] - a[i][1]), u1 = u0 + len / 3.2;
      const A = [a[i][0], y0, a[i][1]], B = [a[k][0], y0, a[k][1]], C = [b[k][0], y1, b[k][1]], D = [b[i][0], y1, b[i][1]];
      pos.push(...A, ...C, ...B, ...A, ...D, ...C);
      uv.push(u0, y0 / 4, u1, y1 / 4, u1, y0 / 4, u0, y0 / 4, u0, y1 / 4, u1, y1 / 4);
      u0 = u1;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
};
const glassTex = () => {
  const t = ctex("towerGlass", 256, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, "#9cc6e4"); gr.addColorStop(1, "#6f9fc8");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#e9eef3"; g.fillRect(0, 0, 256, 22); g.fillRect(0, 0, 12, 256);
    g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(30, 40, 50, 200);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
/** a glowing ellipse on the ground (the hot spot): additive, unlit */
const spotTex = () => ctex("hotspot", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,246,200,1)"); gr.addColorStop(0.45, "rgba(255,214,120,0.75)"); gr.addColorStop(1, "rgba(255,170,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const ray = (mat: THREE.Material) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6).translate(0, 0.5, 0), mat); m.layers.set(NOINK); return m; };
/** stretch a unit ray from a toward b, showing fraction u of it */
const aim = (m: THREE.Mesh, a: V3, b: V3, u: number) => {
  const d = V(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
  m.visible = u > 0.001;
  m.position.set(...a); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.scale.set(1, Math.max(0.001, L * u), 1);
};

export type Handles = ReturnType<typeof build>;
export const build = (root: THREE.Group, env: Env) => {
  const b = new Batch();
  const asphalt = col("asphaltS", "#686b74"), pave = col("paveS", "#c9c3b8"), kerb = col("kerbS", "#a8a39a"), white = col("lineW", "#f1efe6"), plaza = col("plazaS", "#d9d1c3");
  // street: road along x, pavements, plaza in front of the tower, parking bay lines
  b.add(quadUp(-400, 400, -44, -34, 1, 1, 0), asphalt);
  b.add(quadUp(-400, 400, -56, -44, 1, 1, 0.12), pave); b.add(quadUp(-400, 400, -34, -28, 1, 1, 0.12), pave);
  b.add(quadUp(-60, 60, -28, -10, 1, 1, 0.12), plaza);
  for (const z of [-44, -34]) b.add(boxGeo(V(-400, 0, z - 0.12), V(400, 0.13, z + 0.12)), kerb);
  for (let x = -60; x < 60; x += 6) b.add(quadUp(x, x + 3, -39.1, -38.9, 1, 1, 0.01), white);
  for (const x of [-6.5, -2.2, 2.2, 6.5]) b.add(quadUp(x - 0.07, x + 0.07, -44, -41, 1, 1, 0.012), white);
  b.add(quadUp(-400, 400, -400, -68, 1, 1, 0), col("groundS", "#8f8b82")); b.add(quadUp(-400, 400, 12, 400, 1, 1, 0), col("groundS", "#8f8b82"));
  // neighbours: blocks along both sides, a skyline behind
  let i = 0;
  for (const x of [-62, -40, 40, 62]) block(root, x, 0, 18, 22, 28 + 14 * hh(i, 1), ["#cfc6b6", "#b9a48a", "#d6d0c4"][i % 3], i++);
  for (const [x, w] of [[-38, 22], [-22, 8], [13, 16], [33, 18], [55, 20]] as const) block(root, x, -62, w, 12, 12 + 10 * hh(i, 2), ["#c9b79c", "#d8cdbb", "#b08f74"][i % 3], i++);
  for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2, d = 160 + 90 * hh(k, 5); block(root, Math.cos(a) * d, Math.sin(a) * d, 20 + 10 * hh(k, 6), 20, 20 + 70 * hh(k, 7) ** 2, ["#cfc6b6", "#9fb3c4", "#d6d0c4"][k % 3], 10 + k); }
  for (const x of [-30, -18, 18, 30]) lampPost(root, x, -46.0);
  for (const x of [-48, -24, 24, 48]) tree(root, x, -31, 6, x > 0 ? 1 : 0);
  // the café (front faces +z at z = -48)
  const [sx, , sz] = SHOP;
  b.add(boxGeo(V(sx - 6, 0, sz - 12), V(sx + 6, 9, sz)), lam("cafeWall", () => ({ color: "#e9d9b8" })));
  b.add(boxGeo(V(sx - 6.2, 9, sz - 12.2), V(sx + 6.2, 9.5, sz + 0.2)), col("roofC", "#55535d"));
  b.add(boxGeo(V(sx - 5, 0.12, sz - 0.05), V(sx - 1.4, 2.9, sz + 0.02)), col("cafeGlass", "#8fb9d6"));
  b.add(boxGeo(V(sx + 1.2, 0.12, sz - 0.05), V(sx + 5, 2.9, sz + 0.02)), col("cafeGlass", "#8fb9d6"));
  b.add(boxGeo(V(sx - 0.8, 0.12, sz - 0.05), V(sx + 0.6, 2.6, sz + 0.03)), col("cafeDoor", "#3f6f5a"));
  b.build(root);
  board(root, "cafeSign", 600, 160, (g) => { g.fillStyle = "#3f6f5a"; g.fillRect(0, 0, 600, 160); text(g, "CAFE", 300, 84, 110, "#f6e7c4"); }, 4.2, 1.1, sx, 4.1, sz + 0.06, Math.PI);
  const stripes = ctex("awning", 256, 64, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#f4efe2" : "#c8443a"; g.fillRect(k * 32, 0, 32, 64); } });
  const awn = mesh(new THREE.PlaneGeometry(11, 2.2), lam("awningM", () => ({ map: stripes, side: THREE.DoubleSide })), root, sx, 3.15, sz + 1.05);
  awn.rotation.x = -Math.PI / 2 + 0.55;

  // the tower
  const glass = twoTone(new THREE.MeshPhongMaterial({ map: glassTex(), color: "#ffffff", specular: "#ffffff", shininess: 90 }), 0.25);
  const tower = mesh(towerGeo(), glass, root);
  mesh(boxGeo(V(-hw(H) - 0.3, H, zS(0, H) - 3.5), V(hw(H) + 0.3, H + 3, zN(H))), col("towerTop", "#e6ebef"), root);
  // sunshade: horizontal fins along the lower south face (shot 12 on)
  const fins = new THREE.Group(); root.add(fins);
  const finM = col("fin", "#eef1f4"), fb = new Batch();
  for (let y = 10; y <= 46; y += 3) for (let k = 0; k < 16; k++) {
    const x0 = -hw(y) + (2 * hw(y) * k) / 16, x1 = x0 + (2 * hw(y)) / 16, z0 = zS(x0, y), z1 = zS(x1, y);
    const g = boxGeo(V(-0.01, -0.06, -1.2), V(Math.hypot(x1 - x0, z1 - z0) + 0.02, 0.06, 0));
    const m4 = new THREE.Matrix4().makeRotationY(-Math.atan2(z1 - z0, x1 - x0)).setPosition(x0, y, z0);
    fb.add(g, finM, m4);
  }
  fb.build(fins);
  // hot spot + beam
  const spotM = new THREE.MeshBasicMaterial({ map: spotTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.6, 1.4, 1.0), toneMapped: false });
  const spot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), spotM); spot.rotation.x = -Math.PI / 2; spot.position.set(...SPOT); spot.scale.set(7, 5, 1); spot.layers.set(NOINK); root.add(spot);
  const beamM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.85, 0.5), transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(6, 1.4, 1, 24, 1, true).translate(0, -0.5, 0), beamM); beam.layers.set(NOINK); root.add(beam);
  { const a = V(0, 34, zS(0, 34)), c = V(...SPOT); const d = c.clone().sub(a); beam.position.copy(a); beam.quaternion.setFromUnitVectors(V(0, -1, 0), d.clone().normalize()); beam.scale.set(1, d.length(), 1); }

  // cars
  const car1 = makeCar(root, "#2a3f5f", "j", true); car1.g.position.set(...CAR_AT);
  const drips = new THREE.Group(); car1.g.add(drips);
  for (let k = 0; k < 4; k++) mesh(ell(0.05, 0.1 + 0.05 * hh(k, 3), 0.03, 8), car1.paint, drips, -1.3 + k * 0.85, 0.5, -0.92);
  const car2 = makeCar(root, "#d8b23c", "k"); car2.g.position.set(...CAR_AT);

  // TV camera on a tripod (shot 6)
  const tv = new THREE.Group(); root.add(tv);
  const blk = col("tvBlack", "#2c2f38");
  for (let k = 0; k < 3; k++) { const a = (k * 2 * Math.PI) / 3 + 0.4; const leg = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6).translate(0, 0.72, 0), blk, tv, 0.32 * Math.cos(a), 0, 0.32 * Math.sin(a)); leg.rotation.set(-0.24 * Math.sin(a), 0, 0.24 * Math.cos(a)); }
  mesh(boxGeo(V(-0.34, 1.4, -0.17), V(0.34, 1.78, 0.17)), col("tvBody", "#8b94a3"), tv);
  mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.36, 12).rotateZ(Math.PI / 2), blk, tv, -0.5, 1.6, 0);
  tv.position.set(3.4, 0.12, -47.4); tv.rotation.y = 0.9;
  // cones (shot 12)
  const cones = new THREE.Group(); root.add(cones);
  for (const x of [-5.5, -3, -0.5, 2, 4.5]) cone(cones, x, -42.6);
  // award podium + cup (shot 13)
  const pod = new THREE.Group(); root.add(pod);
  mesh(boxGeo(V(-0.6, 0, -0.45), V(0.6, 1.1, 0.45)), col("podium", "#4a3f6b"), pod);
  const cupM = shiny("#e8b43a", "#fff3c0", 70);
  const prof = [[0.0, 0], [0.22, 0], [0.22, 0.05], [0.08, 0.1], [0.06, 0.35], [0.2, 0.45], [0.3, 0.7], [0.32, 0.8], [0.0, 0.8]].map(([r, y]) => new THREE.Vector2(r, y));
  mesh(new THREE.LatheGeometry(prof, 20), cupM, pod, 0, 1.1, 0);
  for (const s of [-1, 1]) { const hnd = mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 14, Math.PI), cupM, pod, s * 0.32, 1.72, 0); hnd.rotation.z = s * -Math.PI / 2; }
  board(pod, "cupSign", 600, 300, (g) => { g.fillStyle = "#f6c62e"; g.fillRect(0, 0, 600, 300); g.strokeStyle = "#1c1a22"; g.lineWidth = 14; g.strokeRect(7, 7, 586, 286); text(g, "CARBUNCLE", 300, 105, 84, "#1c1a22"); text(g, "CUP", 300, 205, 96, "#b3202a"); }, 1.1, 0.55, 0, 0.6, -0.47);
  pod.position.set(...PODIUM);

  // ---- the ray diagram stage ----
  const dg = new THREE.Group(); dg.position.set(...DIAG); root.add(dg);
  const grassM = env.grass();
  mesh(quadUp(-60, 60, -60, 80, 30, 35, 0), grassM, dg);
  const mirrorM = twoTone(new THREE.MeshPhongMaterial({ color: "#bcd8ec", specular: "#ffffff", shininess: 120 }), 0.25);
  mesh(boxGeo(V(-4, 0.4, -4.1), V(4, 8.6, -3.9)), mirrorM, dg); // flat panel at z = -4
  for (const x of [-4.1, 4.1]) mesh(boxGeo(V(x - 0.1, 0, -4.15), V(x + 0.1, 8.7, -3.85)), col("frame", "#55535d"), dg);
  const curveZ = (y: number) => 36 - 1.4 * ((y - 4.5) / 4) ** 2; // concave toward -z
  { const pos: number[] = []; const NY = 16;
    for (let j = 0; j < NY; j++) { const y0 = 0.5 + (8 * j) / NY, y1 = 0.5 + (8 * (j + 1)) / NY, z0 = curveZ(y0), z1 = curveZ(y1);
      pos.push(-4, y0, z0, 4, y0, z0, 4, y1, z1, -4, y0, z0, 4, y1, z1, -4, y1, z1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const cm = mesh(g, mirrorM, dg); (cm.material as THREE.Material).side = THREE.DoubleSide; }
  const toy = makeCar(dg, "#d8453c", "toy"); toy.g.scale.setScalar(0.4); toy.g.position.set(0, 0, 26.5); toy.g.rotation.y = Math.PI / 2;
  const rayM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.8, 0.6), toneMapped: false });
  const din: V3 = [0, -0.55, 0.835];
  const flatRays = [2, 3.6, 5.2, 6.8, 8.2].map((y) => {
    const hit: V3 = [0, y, -4.05], src: V3 = [hit[0], hit[1] - din[1] * 14, hit[2] - din[2] * 14];
    const tr = (y - 0.05) / 0.55, out: V3 = [0, y - 0.55 * tr, -4.05 - 0.835 * tr];
    const a = ray(rayM), c = ray(rayM); dg.add(a, c); return { a, c, src, hit, out };
  });
  const curvRays = [1.2, 2.8, 4.5, 6.2, 7.8].map((y, k) => {
    const hit: V3 = [(k - 2) * 0.8, y, curveZ(y) - 0.05], src: V3 = [hit[0], hit[1] - din[1] * 14, hit[2] - din[2] * 14], out: V3 = [0, 0.55, 26.5];
    const a = ray(rayM), c = ray(rayM); dg.add(a, c); return { a, c, src, hit, out };
  });
  const glowM = new THREE.MeshBasicMaterial({ map: spotTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(2.0, 1.6, 0.9), toneMapped: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowM); glow.layers.set(NOINK); glow.position.set(0, 0.6, 26.5); dg.add(glow);

  return { tower, fins, spot, beam, car1, drips, car2, tv, cones, pod, flatRays, curvRays, glow, toy, awn };
};

export const pose = (h: Handles, id: number, f: number, cam: THREE.PerspectiveCamera) => {
  const city = id <= 8 || id >= 11;
  // car 1: melted in the hook flash-forward (1) and from the return (4); drives in during 3
  const melt = id === 1 || id === 4 ? 1 : 0;
  h.car1.g.visible = id === 1 || id === 3 || id === 4;
  h.car1.g.position.x = id === 3 ? driveX(f, ARRIVE0, ARRIVE1) : 0;
  for (const m of h.car1.mirrors) { m.scale.set(1, 1 + 1.6 * melt, 1); m.position.y = h.car1.cabin.position.y + 0.12 - 0.16 * melt; m.rotation.z = -0.5 * melt; }
  h.car1.badge.scale.set(1 + 0.4 * melt, 1, 1 + 0.6 * melt); h.car1.badge.rotation.x = 0.6 * melt;
  h.drips.visible = melt > 0;
  h.drips.children.forEach((d, k) => { d.scale.y = 1 + 0.25 * Math.sin(f * 0.15 + k); });
  h.car2.g.visible = id === 8;
  h.car2.g.position.x = id === 8 ? driveX(f, CAR2_0, CAR2_1) : 0;
  // the hot spot and beam: on the street until the sunshade goes up
  const spotOn = city && id < 12;
  h.spot.visible = spotOn && id !== 11; h.beam.visible = spotOn && (id === 1 || id === 7 || id === 8);
  (h.spot.material as THREE.MeshBasicMaterial).opacity = 0.85 + 0.15 * Math.sin(f * 0.21);
  h.fins.visible = id === 13 || (id === 12 && f >= FINS);
  h.fins.scale.y = id === 12 ? easeOut((f - FINS) / 20) : 1;
  h.tv.visible = id === 6;
  h.cones.visible = id >= 12;
  h.pod.visible = id === 13;
  h.awn.material = h.awn.material; // static
  // ray diagram: rays draw in, then reflect
  const u9 = id === 9 ? clamp01((f - F(9, 0.05)) / 40) : 0, v9 = id === 9 ? clamp01((f - F(9, 0.4)) / 34) : 0;
  h.flatRays.forEach((r, k) => { aim(r.a, r.src, r.hit, clamp01(u9 * 1.3 - k * 0.06)); aim(r.c, r.hit, r.out, clamp01(v9 * 1.3 - k * 0.06)); });
  const u10 = id === 10 ? clamp01((f - F(10, 0.0)) / 30) : 0, v10 = id === 10 ? clamp01((f - (FOCUS_HIT - 26)) / 26) : 0;
  h.curvRays.forEach((r, k) => { aim(r.a, r.src, r.hit, clamp01(u10 * 1.3 - k * 0.06)); aim(r.c, r.hit, r.out, clamp01(v10)); });
  h.glow.visible = id === 10 && f >= FOCUS_HIT;
  h.glow.scale.setScalar(id === 10 ? 1.2 + 2.4 * easeOut((f - FOCUS_HIT) / 10) : 1);
  h.glow.quaternion.copy(cam.quaternion);
};
