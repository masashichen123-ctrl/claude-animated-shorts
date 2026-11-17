// The whale short's places as one three.js scene: an Oregon beach (sand, sea, dunes, pines, the whale, crates, the
// highway truck, the road sign, a log), the lookout where everyone backs up to (TV camera, parked cars), a picnic
// table with a jelly, and the car dealer's lot. update(id, f, camera) poses everything for shot `id` at frame f.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { ctex, rep, grassHD, waterNear, waterFar, cloudHD, beamHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { paintCrate, paintRoadSign, paintBadge, paintBanner, paintSand, paintSticker } from "./fxw";
import {
  FPS, SHOTS, ShotDef, V3, camAt, smooth, clamp01, easeOut, WHALE, PLUNGER, CRATES, TRUCK_STOP, SIGN, LOG, CROWD, TVCAM, CAR, TABLE, LOT,
  PUSH, BLAST, CRUSH, SLAP, truckX, F,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const col = (key: string, c: string, extra: THREE.MeshLambertMaterialParameters = {}) => lam(key, () => ({ color: c, ...extra }));
const unlit = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void) => {
  const m = new THREE.MeshBasicMaterial({ map: ctex(key, w, h, draw), color: 0xe9e9e9 });
  m.map!.wrapS = m.map!.wrapT = THREE.ClampToEdgeWrapping;
  return m;
};
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
};
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
const ell = (rx: number, ry: number, rz: number, seg = 24) => { const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.6)); g.scale(rx, ry, rz); return g; };

/** a boxy 1970 sedan: returns the group and the parts that deform when it is crushed */
const makeCar = (parent: THREE.Object3D, body: string, key: string) => {
  const g = new THREE.Group();
  const paint = twoTone(new THREE.MeshPhongMaterial({ color: body, specular: "#9a9a9a", shininess: 50 }), 0.2);
  const glass = col("carGlass", "#bfe0ee"), tyre = col("tyre", "#2a2a30"), chrome = twoTone(new THREE.MeshPhongMaterial({ color: "#c9ccd2", specular: "#ffffff", shininess: 80 }), 0.2);
  mesh(boxGeo(V(-2.2, 0.32, -0.9), V(2.2, 0.98, 0.9)), paint, g);
  const cabin = new THREE.Group(); cabin.position.y = 0.98; g.add(cabin);
  mesh(boxGeo(V(-1.15, 0, -0.8), V(1.05, 0.56, 0.8)), glass, cabin);
  mesh(boxGeo(V(-1.22, 0.56, -0.86), V(1.12, 0.68, 0.86)), paint, cabin);
  for (const x of [-1.15, -0.1, 1.05]) for (const z of [-0.8, 0.8]) mesh(boxGeo(V(x - 0.06, 0, z - 0.05), V(x + 0.06, 0.56, z + 0.05)), paint, cabin);
  for (const x of [-1.35, 1.4]) for (const z of [-0.92, 0.92]) {
    const w = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 16); w.rotateX(Math.PI / 2);
    mesh(w, tyre, g, x, 0.36, z);
    const hub = new THREE.CylinderGeometry(0.17, 0.17, 0.28, 12); hub.rotateX(Math.PI / 2);
    mesh(hub, chrome, g, x, 0.36, z);
  }
  mesh(boxGeo(V(-2.3, 0.3, -0.94), V(-2.18, 0.48, 0.94)), chrome, g); mesh(boxGeo(V(2.18, 0.3, -0.94), V(2.3, 0.48, 0.94)), chrome, g);
  for (const z of [-0.6, 0.6]) mesh(new THREE.SphereGeometry(0.13, 10, 8), col("lamp" + key, "#fff3c2"), g, 2.21, 0.72, z);
  parent.add(g);
  return { g, cabin };
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // dynamic props
  private whale = new THREE.Group(); private wound: THREE.Mesh; private crater: THREE.Mesh; private mound = new THREE.Group();
  private crates = new THREE.Group(); private bundle = new THREE.Group(); private handle: THREE.Group;
  private truck = new THREE.Group(); private tv = new THREE.Group();
  private car: { g: THREE.Group; cabin: THREE.Group }; private bigChunk: THREE.Mesh; private carShadow: THREE.Mesh;
  private chunks: THREE.InstancedMesh; private jelly: THREE.Mesh; private bits: THREE.InstancedMesh;
  private roadSign = new THREE.Group();

  constructor(_kit: Kit) {
    const R = this.root;
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    const disc = ctex("sunDisc", 128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
    const halo = ctex("sunHalo", 256, 256, (g) => {
      const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.3, "rgba(255,255,255,0.4)"); gr.addColorStop(0.7, "rgba(255,255,255,0.1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    });
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- static scenery ----
    const b = new Batch();
    const grass = lam("grassW", () => ({ map: grassHD(), color: "#a4aa8c" }));
    const sand = lam("sandW", () => ({ map: ctex("sandW", 512, 512, paintSand) }));
    const wet = col("wetSand", "#c9b587"), wood = lam("wood", () => ({ map: beamHD() })), drift = col("drift", "#b7a58c");
    const asphalt = col("asphalt", "#6c6f78"), paintW = col("paintW", "#f1efe6"), pine = col("pine", "#3f8a4f"), pine2 = col("pine2", "#35784a");
    const trunk = col("trunk", "#7a5238"), duneG = col("duneG", "#8fb45a"), hill = col("hill", "#5f9a58"), cream = col("cream", "#efe6d2"), glassB = col("glassB", "#8fc6e0");
    b.add(quadUp(-900, 900, -900, -28, 450, 218, -0.02), grass);
    b.add(quadUp(-900, 900, -28, 13, 120, 3), sand);
    b.add(quadUp(-900, 900, 13, 17, 1, 1, 0.004), wet);
    // dunes between the beach and the grass (a gap where everyone backs up to), pines and hills behind
    for (let i = 0; i < 46; i++) {
      const x = -410 + i * 18 + (hh(i) - 0.5) * 8;
      if (x > -116 && x < -56) continue;
      const g = ell(9 + 5 * hh(i, 2), 1.6 + 1.6 * hh(i, 3), 4 + 2 * hh(i, 4), 18);
      b.add(g, i % 3 === 0 ? duneG : sand, new THREE.Matrix4().makeTranslation(x, -0.25, -33 - 3 * hh(i, 5)));
    }
    const clear = (x: number, z: number) => Math.hypot(x - CROWD[0], z - CROWD[2]) > 30 && Math.hypot(x - CAR[0], z - CAR[2]) > 22 && Math.hypot(x - TABLE[0], z - TABLE[2]) > 16
      && Math.hypot(x - LOT[0], z - LOT[2]) > 34 && !(x > -100 && x < -20 && z > -50);
    for (let i = 0; i < 230; i++) {
      const x = -440 + 880 * hh(i, 7), z = -52 - 150 * hh(i, 8) ** 1.4;
      if (!clear(x, z)) continue;
      const h = 7 + 6 * hh(i, 9), m = new THREE.Matrix4().makeTranslation(x, 0, z);
      b.add(new THREE.CylinderGeometry(0.25, 0.35, h * 0.35, 6).translate(0, h * 0.175, 0), trunk, m);
      b.add(new THREE.ConeGeometry(h * 0.26, h * 0.6, 8).translate(0, h * 0.55, 0), i % 2 ? pine : pine2, m);
      b.add(new THREE.ConeGeometry(h * 0.19, h * 0.45, 8).translate(0, h * 0.82, 0), i % 2 ? pine : pine2, m);
    }
    for (let i = 0; i < 12; i++) b.add(ell(90 + 60 * hh(i, 11), 22 + 22 * hh(i, 12), 50, 20), hill, new THREE.Matrix4().makeTranslation(-600 + i * 110, -4, -330 - 60 * hh(i, 13)));
    // headland far down the beach, sea stacks
    b.add(ell(120, 34, 60, 20), hill, new THREE.Matrix4().makeTranslation(430, -6, -10));
    for (const [x, z, r, h] of [[-260, 150, 9, 20], [-282, 170, 5, 11]]) b.add(new THREE.CylinderGeometry(r * 0.5, r, h, 7).translate(0, h / 2 - 1, 0), col("stack", "#77736d"), new THREE.Matrix4().makeTranslation(x, 0, z));
    // driftwood log
    b.add(new THREE.CylinderGeometry(0.26, 0.32, 5.2, 9).rotateZ(Math.PI / 2), drift, new THREE.Matrix4().makeTranslation(LOG[0], 0.26, LOG[2]));
    b.add(new THREE.CylinderGeometry(0.09, 0.12, 1.1, 6).rotateZ(0.7), drift, new THREE.Matrix4().makeTranslation(LOG[0] - 1.6, 0.7, LOG[2]));
    // lookout: car park, the other parked cars are built below
    b.add(quadUp(CAR[0] - 14, CAR[0] + 14, CAR[2] - 5, CAR[2] + 5, 1, 1, 0.012), asphalt);
    for (const dx of [-8.4, -2.8, 2.8, 8.4]) b.add(quadUp(CAR[0] + dx - 0.07, CAR[0] + dx + 0.07, CAR[2] - 3.2, CAR[2] + 3.2, 1, 1, 0.02), paintW);
    // picnic table
    const [tx, , tz] = TABLE;
    b.add(boxGeo(V(tx - 1.0, 0.72, tz - 0.42), V(tx + 1.0, 0.8, tz + 0.42), 1), wood);
    for (const s of [-1, 1]) {
      b.add(boxGeo(V(tx - 1.0, 0.4, tz + s * 0.72 - 0.14), V(tx + 1.0, 0.46, tz + s * 0.72 + 0.14), 1), wood);
      for (const sx of [-0.75, 0.75]) { b.add(boxGeo(V(tx + sx - 0.05, 0, tz + s * 0.3 - 0.05), V(tx + sx + 0.05, 0.72, tz + s * 0.3 + 0.05)), wood); b.add(boxGeo(V(tx + sx - 0.05, 0, tz + s * 0.72 - 0.05), V(tx + sx + 0.05, 0.4, tz + s * 0.72 + 0.05)), wood); }
    }
    b.add(new THREE.CylinderGeometry(0.3, 0.2, 0.12, 20), col("bowl", "#f6f3ea"), new THREE.Matrix4().makeTranslation(tx, 0.86, tz));
    // dealer's lot: asphalt, showroom, poles
    const [lx, , lz] = LOT;
    b.add(quadUp(lx - 26, lx + 26, lz - 16, lz + 20, 1, 1, 0.012), asphalt);
    b.add(boxGeo(V(lx - 9, 0, lz + 9), V(lx + 9, 4.6, lz + 16)), cream);
    b.add(boxGeo(V(lx - 9.4, 4.6, lz + 8.6), V(lx + 9.4, 5.1, lz + 16.4)), col("fascia", "#d9483b"));
    for (let i = 0; i < 5; i++) b.add(boxGeo(V(lx - 8.2 + i * 3.4, 0.5, lz + 8.92), V(lx - 5.4 + i * 3.4, 3.7, lz + 9)), glassB);
    for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.09, 0.11, 6.2, 8).translate(0, 3.1, 0), col("pole", "#d7dae0"), new THREE.Matrix4().makeTranslation(lx + 0.2 + s * 2.1, 0, lz + 2.45));
    b.build(R);

    // sea (same shader as the river)
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "sea1";
    const wm = new THREE.Mesh(quadUp(-1200, 1200, 15.5, 1200, 1, 1, 0.01), waterM);
    wm.receiveShadow = true; R.add(wm);
    const foam = new THREE.Mesh(quadUp(-900, 900, 15.2, 15.9, 1, 1, 0.02), new THREE.MeshBasicMaterial({ color: 0xf2f2ee }));
    foam.layers.set(NOINK); R.add(foam);

    // ---- the whale ----
    const skin = twoTone(new THREE.MeshPhongMaterial({ color: "#66727f", specular: "#555c66", shininess: 18 }), 0.3);
    const prof: [number, number][] = [[0.02, -7], [0.3, -6.9], [0.42, -6], [0.75, -4.4], [1.3, -2.6], [1.72, -0.6], [1.85, 1.6], [1.85, 4.2], [1.8, 5.6], [1.62, 6.5], [1.15, 6.92], [0.5, 7.02], [0.02, 7.03]];
    const lathe = new THREE.LatheGeometry(prof.map(([r, x]) => new THREE.Vector2(r, x)), 28);
    lathe.rotateZ(-Math.PI / 2); lathe.scale(1, 0.92, 1); lathe.computeVertexNormals();
    mesh(lathe, skin, this.whale, 0, 1.5, 0);
    const fl = new THREE.Shape();
    fl.moveTo(0, 0); fl.quadraticCurveTo(-0.5, 1.2, -1.5, 2.0); fl.lineTo(-2.0, 1.75); fl.quadraticCurveTo(-1.5, 0.9, -1.05, 0); fl.quadraticCurveTo(-1.5, -0.9, -2.0, -1.75); fl.lineTo(-1.5, -2.0); fl.quadraticCurveTo(-0.5, -1.2, 0, 0);
    const flG = new THREE.ExtrudeGeometry(fl, { depth: 0.16, bevelEnabled: false }); flG.rotateX(Math.PI / 2);
    const fluke = mesh(flG, skin, this.whale, -6.7, 0.75, 0); fluke.rotation.z = 0.32;
    mesh(ell(0.75, 0.1, 0.42, 12), skin, this.whale, 3.4, 0.5, -1.9).rotation.set(0.5, 0.5, 0);
    mesh(new THREE.SphereGeometry(0.09, 10, 8), col("eye", "#17141c"), this.whale, 4.5, 1.25, -1.63);
    mesh(boxGeo(V(3.6, 0.42, -0.9), V(6.6, 0.56, -0.5)), col("jaw", "#aeb5bd"), this.whale);
    this.wound = mesh(ell(3.1, 1.25, 0.9, 18), col("wound", "#a8303f"), this.whale, 0.6, 1.35, -1.25);
    for (let i = 0; i < 5; i++) mesh(ell(0.5 + 0.3 * hh(i, 21), 0.4, 0.35, 10), col("woundLt", "#e0637a"), this.wound, -2.2 + i * 1.1, 0.2 * Math.sin(i * 2), -0.75);
    this.whale.position.set(...WHALE); R.add(this.whale);
    this.crater = mesh(new THREE.CircleGeometry(6.5, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#5d5148", transparent: true, opacity: 0.55, depthWrite: false }), R, WHALE[0] + 0.8, 0.03, WHALE[2] - 4.2);
    this.crater.castShadow = false; this.crater.layers.set(NOINK); this.crater.scale.set(1.4, 1, 0.7);
    // burial mound (shot 14): sand heap over the body, the tail still sticks out; a shovel on top
    mesh(ell(7.2, 3.7, 4.4, 22), sand, this.mound, 1.8, -0.1, 0);
    const sh = new THREE.Group(); sh.position.set(2.6, 3.4, -0.8); sh.rotation.z = 0.25; this.mound.add(sh);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6).translate(0, 0.75, 0), wood, sh);
    mesh(boxGeo(V(-0.16, -0.05, -0.02), V(0.16, 0.3, 0.02)), col("blade", "#9aa0aa"), sh);
    mesh(boxGeo(V(-0.14, 1.36, -0.03), V(0.14, 1.44, 0.03)), wood, sh);
    this.mound.position.set(...WHALE); R.add(this.mound);

    // ---- dynamite: 20 crates against the whale, the single bundle of sticks, the plunger ----
    const crateM = lam("crate", () => ({ map: (() => { const t = ctex("crateTex", 512, 340, paintCrate); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })() }));
    for (let i = 0; i < 20; i++) {
      const c = i % 5, r = Math.floor(i / 5);
      const m = mesh(boxGeo(V(-0.46, 0, -0.3), V(0.46, 0.6, 0.3)), crateM, this.crates, (c - 2) * 0.98 + (r % 2 ? 0.2 : 0) + (hh(i, 31) - 0.5) * 0.08, r * 0.61, (hh(i, 32) - 0.5) * 0.1);
      m.rotation.y = (hh(i, 33) - 0.5) * 0.12;
    }
    this.crates.position.set(...CRATES); R.add(this.crates);
    mesh(boxGeo(V(-0.46, 0, -0.3), V(0.46, 0.5, 0.3)), crateM, this.bundle);
    const stick = col("stick", "#c9342f");
    for (let i = 0; i < 20; i++) {
      const s = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8).rotateZ(Math.PI / 2), stick, this.bundle, 0, 0.535 + Math.floor(i / 5) * 0.058, -0.12 + (i % 5) * 0.06);
      s.castShadow = false;
    }
    mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 20).rotateY(Math.PI / 2), col("twine", "#e8dcc0"), this.bundle, 0, 0.62, 0).scale.set(1, 0.8, 1);
    this.bundle.position.set(-3.6, 0, -7.6); R.add(this.bundle);
    const box = new THREE.Group(); box.position.set(PLUNGER[0] + 0.62, 0, PLUNGER[2] + 0.05); R.add(box);
    mesh(boxGeo(V(-0.2, 0, -0.16), V(0.2, 0.42, 0.16)), col("plBox", "#8c5a3c"), box);
    this.handle = new THREE.Group(); box.add(this.handle);
    mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6).translate(0, 0.25, 0), col("plRod", "#5a5d66"), this.handle);
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8).rotateZ(Math.PI / 2).translate(0, 0.5, 0), col("plGrip", "#2a2a30"), this.handle);
    this.plBox = box;

    // ---- highway truck ----
    const org = twoTone(new THREE.MeshPhongMaterial({ color: "#f08a24", specular: "#777", shininess: 30 }), 0.2), tyre = col("tyre", "#2a2a30");
    mesh(boxGeo(V(-2.6, 0.55, -1.0), V(0.9, 0.85, 1.0)), org, this.truck);
    mesh(boxGeo(V(-2.6, 0.85, -1.0), V(0.9, 1.45, -0.9)), org, this.truck); mesh(boxGeo(V(-2.6, 0.85, 0.9), V(0.9, 1.45, 1.0)), org, this.truck);
    mesh(boxGeo(V(-2.6, 0.85, -1.0), V(-2.5, 1.45, 1.0)), org, this.truck);
    mesh(boxGeo(V(0.9, 0.55, -1.0), V(2.6, 2.15, 1.0)), org, this.truck);
    mesh(boxGeo(V(1.5, 1.35, -1.02), V(2.62, 2.0, 1.02)), col("carGlass", "#bfe0ee"), this.truck);
    mesh(boxGeo(V(1.3, 2.15, -0.25), V(1.7, 2.33, 0.25)), col("beacon", "#ffd23a"), this.truck);
    for (const x of [-1.7, 1.7]) for (const z of [-1.02, 1.02]) mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16).rotateX(Math.PI / 2), tyre, this.truck, x, 0.5, z);
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: ctex("badge", 256, 256, paintBadge), alphaTest: 0.5, color: 0xe9e9e9 }));
    badge.position.set(1.15, 1.0, -1.012); badge.rotation.y = Math.PI; badge.layers.set(NOINK); this.truck.add(badge);
    this.truck.rotation.y = Math.PI; // nose toward -x (it drives in from +x)
    R.add(this.truck);

    // ---- road sign ----
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6).translate(0, 1.15, 0), col("pole", "#d7dae0"), this.roadSign);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.9), unlit("roadSign", 400, 500, paintRoadSign));
    board.position.set(0, 1.9, -0.05); board.rotation.y = Math.PI; board.layers.set(NOINK); this.roadSign.add(board);
    mesh(boxGeo(V(-0.37, 1.44, -0.03), V(0.37, 2.36, 0.0)), col("pole", "#d7dae0"), this.roadSign);
    this.roadSign.position.set(...SIGN); this.roadSign.rotation.set(0, -0.15, 0.09); R.add(this.roadSign);

    // ---- TV camera on a tripod ----
    const blk = col("tvBlack", "#2c2f38");
    for (let i = 0; i < 3; i++) { const a = (i * 2 * Math.PI) / 3 + 0.4; const leg = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6).translate(0, 0.72, 0), blk, this.tv, 0.32 * Math.cos(a), 0, 0.32 * Math.sin(a)); leg.rotation.set(-0.24 * Math.sin(a), 0, 0.24 * Math.cos(a)); }
    mesh(boxGeo(V(-0.34, 1.4, -0.17), V(0.34, 1.78, 0.17)), col("tvBody", "#8b94a3"), this.tv);
    mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.36, 12).rotateZ(Math.PI / 2), blk, this.tv, 0.5, 1.6, 0);
    for (const x of [-0.14, 0.16]) mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 14).rotateX(Math.PI / 2), blk, this.tv, x, 1.95, 0);
    this.tv.position.set(TVCAM[0] + 0.9, 0, TVCAM[2] + 0.2); this.tv.rotation.y = -0.35; R.add(this.tv);

    // ---- cars ----
    this.car = makeCar(R, "#d8453c", "a"); this.car.g.position.set(...CAR); this.car.g.rotation.y = Math.PI / 2 + 0.06;
    for (const [dx, c, k] of [[-5.6, "#3f76b8", "b"], [5.6, "#5c9a56", "c"], [11.2, "#e2b93c", "d"]] as const) { const o = makeCar(R, c, k); o.g.position.set(CAR[0] + dx, 0, CAR[2] + 0.2); o.g.rotation.y = Math.PI / 2; }
    const shiny = makeCar(R, "#d8453c", "e"); shiny.g.position.set(lx + 1.9, 0, lz + 0.3); shiny.g.rotation.y = Math.PI * 0.78;
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.31), unlit("sticker", 256, 160, paintSticker)); st.position.set(-1.16, 0.3, 0); st.rotation.y = -Math.PI / 2; st.layers.set(NOINK); shiny.cabin.add(st);
    for (let i = 0; i < 4; i++) { const o = makeCar(R, ["#3f76b8", "#f1efe6", "#5c9a56", "#e2b93c"][i], "l" + i); o.g.position.set(lx - 7.5 + i * 5, 0, lz + 5.6); o.g.rotation.y = Math.PI / 2; }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.88), unlit("banner", 1000, 720, paintBanner));
    banner.position.set(lx + 0.2, 4.45, lz + 2.38); banner.rotation.y = Math.PI; banner.layers.set(NOINK); R.add(banner);
    mesh(boxGeo(V(-2.0, -1.44, 0), V(2.0, 1.44, 0.03)), col("bannerBack", "#e2b93c"), R, lx + 0.2, 4.45, lz + 2.4);
    const blub = twoTone(new THREE.MeshPhongMaterial({ color: "#e0637a", specular: "#ffffff", shininess: 60 }), 0.3);
    this.bigChunk = mesh(new THREE.IcosahedronGeometry(1, 1), blub, R); this.bigChunk.scale.set(1.25, 0.8, 1.05);
    this.carShadow = mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#2b2a3a", transparent: true, opacity: 0.4, depthWrite: false }), R);
    this.carShadow.castShadow = false; this.carShadow.layers.set(NOINK);
    this.chunks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), blub, 70);
    this.chunks.castShadow = true; this.chunks.frustumCulled = false; R.add(this.chunks);
    // ---- jelly ----
    const jel = twoTone(new THREE.MeshPhongMaterial({ color: "#e02c48", specular: "#ffffff", shininess: 90 }), 0.35);
    this.jelly = mesh(new THREE.SphereGeometry(0.26, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), jel, R, tx, 0.9, tz);
    this.bits = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), jel, 16);
    this.bits.frustumCulled = false; R.add(this.bits);
  }
  private plBox: THREE.Group;

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 2500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear + 20; this.fog.far = L.fogFar + 260;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;

    // ---- props ----
    const blasted = id > 8 || (id === 8 && f >= BLAST + 6);
    this.whale.visible = id <= 12 || id === 14;
    this.wound.visible = blasted && id !== 14; this.crater.visible = blasted && id !== 14;
    this.mound.visible = id === 14;
    this.crates.visible = (id === 1 || (id >= 6 && id <= 8)) && !(id === 8 && f >= BLAST);
    this.bundle.visible = id === 5;
    this.plBox.visible = id === 1 || id === 7 || id === 8;
    this.handle.position.y = id === 1 && f >= PUSH ? 0.42 - 0.4 * easeOut((f - PUSH) / 4) : 0.42;
    this.truck.visible = id === 1 || (id >= 3 && id <= 12) || id === 14;
    const tX = id === 3 ? truckX(f) : TRUCK_STOP[0];
    this.truck.position.set(tX, id === 3 && f < F(3, 0.42) ? 0.03 * Math.sin(f * 1.9) : 0, TRUCK_STOP[2]);
    this.roadSign.visible = id >= 3;
    // the big chunk and the car
    const crushed = id > 10 || (id === 10 && f >= CRUSH);
    const sq = id === 10 ? easeOut((f - CRUSH) / 4) : crushed ? 1 : 0;
    this.car.cabin.scale.set(1 + 0.06 * sq, 1 - 0.74 * sq, 1 + 0.1 * sq);
    this.car.g.position.y = -0.1 * sq;
    const fall = id === 10 ? clamp01((f - (CRUSH - 26)) / 26) : crushed ? 1 : -1;
    this.bigChunk.visible = fall >= 0 && (id === 10 || id === 15);
    this.bigChunk.position.set(CAR[0] + 0.1, 1.35 + (1 - fall * fall) * 34 + 0.12 * sq, CAR[2] + 0.1);
    this.bigChunk.scale.set(1.25 + 0.3 * sq, 0.8 - 0.22 * sq, 1.05 + 0.25 * sq); this.bigChunk.rotation.set(0.4 * (1 - fall), 2.2 * (1 - fall), 0);
    this.carShadow.visible = id === 10 && f < CRUSH;
    const shK = id === 10 ? smooth((f - F(10, 0.05)) / Math.max(1, CRUSH - F(10, 0.05))) : 0;
    this.carShadow.position.set(CAR[0] + 0.1, 1.7, CAR[2] + 0.1); this.carShadow.scale.set(0.5 + 1.2 * shK, 1, 0.5 + 1.2 * shK);
    (this.carShadow.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.4 * shK;
    // blubber chunks: half fly to where the crowd is, half fall around the whale
    const q = new THREE.Quaternion(), pos = V(0, 0, 0), scl = V(1, 1, 1), eu = new THREE.Euler();
    const flying = id === 8 && f >= BLAST;
    for (let i = 0; i < 70; i++) {
      const near = i % 2 === 0, r = 0.14 + 0.3 * hh(i, 41) ** 2;
      const lx2 = near ? CROWD[0] + (hh(i, 42) - 0.5) * 22 : WHALE[0] + (hh(i, 42) - 0.5) * 60;
      const lz2 = near ? CROWD[2] + (hh(i, 43) - 0.5) * 16 : WHALE[2] - 4 - hh(i, 43) * 30;
      const tf = (near ? 2.4 + 2.0 * hh(i, 44) : 1.2 + 1.6 * hh(i, 44)) * FPS, H = near ? 34 + 14 * hh(i, 45) : 10 + 16 * hh(i, 45);
      const u = flying ? clamp01((f - BLAST) / tf) : id > 8 ? 1 : -1;
      if (u < 0 || id === 13 || id === 14 || id === 16) { this.chunks.setMatrixAt(i, this.m4.makeScale(0, 0, 0)); continue; }
      const landed = u >= 1;
      pos.set(WHALE[0] + (lx2 - WHALE[0]) * u, landed ? r * 0.45 : 1.5 + 4 * H * u * (1 - u), WHALE[2] + (lz2 - WHALE[2]) * u);
      eu.set(landed ? 0 : f * 0.31 + i, landed ? i : f * 0.23, 0); q.setFromEuler(eu);
      scl.set(r * (landed ? 1.35 : 1), r * (landed ? 0.5 : 0.85), r * (landed ? 1.3 : 1));
      this.chunks.setMatrixAt(i, this.m4.compose(pos, q, scl));
    }
    this.chunks.instanceMatrix.needsUpdate = true;
    // jelly: wobbles after the slap, a few bits fly, most of it stays in the bowl
    const sj = id === 13 ? (f - SLAP) / FPS : -1;
    const wob = sj >= 0 ? Math.exp(-2.2 * sj) * Math.sin(sj * 26) : 0, hit = sj >= 0 ? Math.exp(-9 * sj) : 0;
    this.jelly.visible = id === 13;
    this.jelly.scale.set(1 + 0.16 * wob + 0.25 * hit, 1 - 0.2 * wob - 0.45 * hit, 1 - 0.1 * wob + 0.25 * hit);
    this.jelly.rotation.z = 0.12 * wob;
    for (let i = 0; i < 16; i++) {
      if (sj < 0) { this.bits.setMatrixAt(i, this.m4.makeScale(0, 0, 0)); continue; }
      const a = (i / 16) * Math.PI * 2 + hh(i, 51), sp = 1.1 + 1.6 * hh(i, 52), vy = 2.2 + 2.2 * hh(i, 53);
      const tl = Math.min(sj, (vy + Math.sqrt(vy * vy + 2 * 9.8 * (hh(i, 54) < 0.6 ? 0.2 : 1.0))) / 9.8);
      pos.set(TABLE[0] + Math.cos(a) * sp * tl, 1.0 + vy * tl - 4.9 * tl * tl, TABLE[2] + Math.sin(a) * sp * tl * 0.7);
      const k = 0.7 + 1.3 * hh(i, 55);
      this.bits.setMatrixAt(i, this.m4.compose(pos, q.identity(), scl.set(k, tl < sj ? k * 0.4 : k, k)));
    }
    this.bits.instanceMatrix.needsUpdate = true;

    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.mirror ? -p.w : p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.0, -0.5 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;
// keep rep() referenced for callers that want tiled copies
export const _rep = rep;
