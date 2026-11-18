// The whole film as one three.js scene graph (owner: world, with lights.ts): sky dome, sun disc + halo, clouds, the
// sea (shader water, shared by the sea / subdeck / runway sets), the light rig, all seven sets (build.ts, one visible
// at a time), the Regulus rig and the cast cards. update(id, f, camera, scene) poses everything for shot `id` at frame
// f (a pure function of id + f) and returns the camera's look point.
import * as THREE from "three";
import * as PAINT from "./paint";
import { ctex, cloudHD } from "./paint";
import { buildSets, buildMissile, poseMissile, SET_META, SetRig, MissileRig } from "./build";
import * as B from "./build";
import { LIGHTS, LOOK, LightPreset, LightName, lightOf, SHOT_SUN, SHOT_SKY, CUR } from "./lights";
import { TONE, CHAR, LFB, HAZE, hazeShader, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotDef, SetName, SPOT, BOOM_AT, camAt, missileAt, noseDir } from "./story";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** haze length multiplier per set (the open-sea sets look ~1 km to the horizon; the far sea must stay cyan, not white) */
// NOTE: hk stretches start / e-fold length, so a LARGER value means LESS haze (round 2 shrank it by mistake)
const HAZE_K: Partial<Record<SetName, number>> = { sea: 3.4, subdeck: 2.8, runway: 2.4 };
/** haze cap multiplier per set (Mayport: the hangar darks must reach p2 <= .12, verify_r2 #4) */
const HAZE_MAXK: Partial<Record<SetName, number>> = { runway: 0.35, sea: 0.85, subdeck: 0.85 };
/** shots whose sky gets the 4 view-placed hero clouds, and their [azimuth offset, elevation (rad), width m, aspect] */
const HERO_CLOUD_SHOTS = new Set([1, 3, 7]);
const HERO_CLOUDS: [number, number, number, number][] = [[-0.14, 0.075, 220, 3.2], [0.13, 0.11, 250, 2.8], [0.0, 0.045, 320, 6], [-0.3, 0.05, 200, 5]];
/** camera-relative sun azimuth actually used for a shot (sun disc only when it is roughly ahead of the lens) */
const o2 = (id: number) => Math.abs(SHOT_SUN[id]?.az ?? SHOTS[id - 1].sunAz ?? 90);
type Lamp = { p: [number, number, number]; I: number; halo: number; col?: string };
/** practical lamps per set (bulb positions match build.ts pendant(): bulb at top - drop - 0.28) */
const LAMPS: Partial<Record<SetName, Lamp[]>> = {
  postoffice: [{ p: [-2.5, 3.22, 0.5], I: 9, halo: 1.3 }, { p: [2.5, 3.22, 0.5], I: 9, halo: 1.3 }, { p: [0, 3.22, 4.5], I: 9, halo: 1.3 }],
  museum: [{ p: [-6, 9.22, -2], I: 25, halo: 1.2 }, { p: [6, 9.22, -2], I: 25, halo: 1.2 }, { p: [-6, 9.22, 8], I: 25, halo: 1.2 },
    { p: [6, 9.22, 8], I: 25, halo: 1.2 }, { p: [0, 9.22, 14], I: 25, halo: 1.2 }],
};
/** sun disc (solid, soft rim) and the flat golden halo (lighting.md 6 / depth.md 6.4: r50 13-26 % of the frame width) */
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

/** async preparation hook kept for the composition's delayRender (nothing to load: every asset is procedural) */
export const loadKit = () => Promise.resolve(true);

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private water: THREE.Mesh;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<LightName, THREE.Texture[]>;
  private points: THREE.PointLight[] = []; private halos: THREE.Sprite[] = []; private spots: THREE.SpotLight[] = [];
  private shadowSize = 4096;
  private clouds: THREE.Mesh[] = [];
  private fg = new THREE.Group();
  private sets: Record<SetName, SetRig>;
  private missile: MissileRig;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root;
    // ---- sky: 5 colour stops by elevation, written as tone-map-inverted linear values ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() },
        sunDirW: { value: new THREE.Vector3(0, 1, 0) }, glowCol: { value: new THREE.Color() }, glowK: { value: 0 }, tex: { value: 0 } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      // depth.md 3.3: 5 stops + painted world-space noise (does not swim with the camera) + a glow toward the sun
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        uniform vec3 sunDirW; uniform vec3 glowCol; uniform float glowK; uniform float tex;
        float sh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
          return mix(mix(sh(i), sh(i + vec2(1, 0)), f.x), mix(sh(i + vec2(0, 1)), sh(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec3 dir = normalize(vP); float el = asin(clamp(dir.y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          vec2 q = vec2(atan(dir.z, dir.x) * 6.0, el * 14.0);
          c *= 1.0 + tex * (vn(q) + 0.5 * vn(q * 2.7 + 5.3) + 0.25 * vn(vec2(q.x * 3.1, q.y * 9.0)) - 0.875);
          vec2 hd = normalize(vec2(dir.x, dir.z) + 1e-5), hs = normalize(vec2(sunDirW.x, sunDirW.z) + 1e-5);
          float sg = pow(max(dot(hd, hs), 0.0), 4.0) * (1.0 - smoothstep(0.0, 0.52, el));
          float sg2 = pow(max(dot(dir, normalize(sunDirW)), 0.0), 24.0);
          c = mix(c, glowCol, clamp(glowK * (sg + 0.8 * sg2), 0.0, 1.0));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    const lights = Object.keys(LOOK) as LightName[];
    this.cloudMaps = Object.fromEntries(lights.map((l) => [l, [0, 1, 2, 3].map((k) => cloudHD(k, LOOK[l].cloud))])) as unknown as Record<LightName, THREE.Texture[]>;
    // depth.md 3.4: 30 stretched cards in 3 shells (low strata near the horizon, mid, high), each pre-mixed toward the
    // sky colour at its elevation (low 45 %, mid 20 %, high 0) so they fade into the horizon like the reference
    const rnd = (k: number) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    const SHELLS = [
      { n: 12, d: [800, 1000], h: [25, 70], w: [80, 160], asp: [5, 7], op: 0.75, mix: 0.45 },
      { n: 12, d: [650, 800], h: [80, 170], w: [120, 220], asp: [3, 4], op: 0.9, mix: 0.2 },
      { n: 6, d: [600, 700], h: [180, 300], w: [160, 260], asp: [2, 2.5], op: 1.0, mix: 0.0 },
    ];
    let ci = 0;
    for (const S of SHELLS) for (let i = 0; i < S.n; i++, ci++) {
      const L2 = (r: number[], k: number) => r[0] + (r[1] - r[0]) * rnd(ci * 5 + k);
      const a = (i / S.n) * Math.PI * 2 + rnd(ci * 5) * (Math.PI * 2 / S.n), d = L2(S.d, 1), w = L2(S.w, 2) * (S.n === 12 && S.mix > 0.3 ? 1.6 : 1), asp = L2(S.asp, 3);
      const mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: this.cloudMaps.day[ci % 4] }, mixCol: { value: new THREE.Color() }, mixK: { value: S.mix }, op: { value: S.op }, gain: { value: 1.08 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `uniform sampler2D map; uniform vec3 mixCol; uniform float mixK, op, gain; varying vec2 vUv;
          void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(mix(t.rgb * gain, mixCol, mixK), t.a * op); }`,
        transparent: true, depthWrite: false, fog: false,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.position.set(Math.cos(a) * d, L2(S.h, 4), Math.sin(a) * d); m.scale.set(w, w / asp, 1);
      m.userData.el = Math.atan2(m.position.y, d);
      m.layers.set(NOINK); m.renderOrder = -0.8 + ci * 0.001;
      this.clouds.push(m); R.add(m);
    }
    // 4 "hero" clouds placed per shot in the camera's view (sea / deck wides, verify_r1 #5: the hook sky was one smear)
    for (let k = 0; k < 4; k++, ci++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: this.cloudMaps.day[k] }, mixCol: { value: new THREE.Color() }, mixK: { value: 0.12 }, op: { value: 0.95 }, gain: { value: 1.1 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `uniform sampler2D map; uniform vec3 mixCol; uniform float mixK, op, gain; varying vec2 vUv;
          void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(mix(t.rgb * gain, mixCol, mixK), t.a * op); }`,
        transparent: true, depthWrite: false, fog: false,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.userData.hero = k; m.userData.el = 0.2; m.layers.set(NOINK); m.renderOrder = -0.7 + k * 0.001;
      this.clouds.push(m); R.add(m);
    }
    // ---- practicals (lighting.md 3.3): lamps per set, the flame light; additive halos so lamps glow ----
    for (let i = 0; i < 6; i++) {
      const p = new THREE.PointLight("#ffd9a0", 0, 0, 2); p.castShadow = false; p.visible = false; this.points.push(p); R.add(p);
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
      h.layers.set(NOINK); h.visible = false; h.renderOrder = 6; this.halos.push(h); R.add(h);
    }
    for (let i = 0; i < 2; i++) {
      const sp = new THREE.SpotLight("#ffe2bc", 0, 0, THREE.MathUtils.degToRad(28), 0.6, 2); sp.castShadow = false; sp.visible = false;
      this.spots.push(sp); R.add(sp, sp.target);
    }
    // ---- the sea: depression-angle gradient + drifting painted marks (one big plane, raised / lowered per set) ----
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: null }, wFarTex: { value: null }, wTime: { value: 0 },
    };
    this.water = this.makeWater();
    R.add(this.water);
    // ---- sets + the missile ----
    this.sets = buildSets();
    for (const k of Object.keys(this.sets) as SetName[]) { this.sets[k].group.visible = false; R.add(this.sets[k].group); }
    this.missile = buildMissile();
    R.add(this.missile.root);
    this.fg.name = "foreground"; R.add(this.fg);
  }

  private makeWater() {
    const { waterNear, waterFar } = PAINT;
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU.wNearTex.value = wNear; this.WU.wFarTex.value = wFar;
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
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), mix(1.0, sunVis, 0.25)) + pracD * 0.6;\n  reflectedLight.indirectDiffuse = vec3(0.0);");
      hazeShader(sh);
    };
    waterM.customProgramCacheKey = () => "sea3";
    const g = new THREE.PlaneGeometry(5000, 5000).rotateX(-Math.PI / 2);
    const wm = new THREE.Mesh(g, waterM);
    wm.receiveShadow = true;
    return wm;
  }

  /** camera-relative sun, frozen per shot: the shot's mean view direction turned by az toward screen right, lifted by el */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const o = SHOT_SUN[id];
    const az = THREE.MathUtils.degToRad(o?.az ?? s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(o?.el ?? s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az); // screen right = (-fz, fx)
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** lamps of the active set + a flame light at the missile's tail + the puff's flash; halos on every bulb */
  private practicals(set: SetName, ln: LightName, L: LightPreset, flame: number, tail: THREE.Vector3, boom: number, cam: THREE.PerspectiveCamera) {
    const lamps: Lamp[] = (LAMPS[set] ?? []).slice();
    const hot: { p: THREE.Vector3; I: number; col: string; halo: number; hk: number }[] = lamps.map((l) => ({ p: V(...l.p), I: l.I, col: l.col ?? L.pracCol, halo: l.halo, hk: 1 }));
    if (flame > 0) hot.push({ p: tail.clone(), I: 60 * flame, col: "#ff9a4a", halo: (set === "road" ? 1.6 : 4) * flame, hk: set === "road" ? 0.7 : 1.2 });
    if (boom >= 0 && boom < 1.2) { const k = Math.max(0, 1 - boom / 1.2); hot.push({ p: V(...BOOM_AT), I: 900 * k, col: "#ffb060", halo: 0, hk: 0 }); }
    for (let i = 0; i < this.points.length; i++) {
      const pl = this.points[i], h = this.halos[i], q = hot[i];
      pl.visible = !!q; h.visible = !!q && q.halo > 0;
      if (!q) continue;
      pl.position.copy(q.p); pl.color.set(q.col); pl.intensity = q.I;
      if (h.visible) {
        h.position.copy(q.p); h.scale.setScalar(q.halo);
        (h.material as THREE.SpriteMaterial).color.set(q.col).multiplyScalar(0.55 * q.hk);
      }
    }
    // museum: two spots from above-front, a warm pool on the exhibit and one on the plaque
    const sp = set === "museum" ? [{ p: V(2, 11.5, 10), t: V(...SPOT.EXHIBIT), I: 900 }, { p: V(6, 9, 9), t: V(SPOT.PLAQUE[0], 0.6, SPOT.PLAQUE[2]), I: 250 }] : [];
    for (let i = 0; i < this.spots.length; i++) {
      const s2 = this.spots[i], q = sp[i];
      s2.visible = !!q;
      if (!q) continue;
      s2.position.copy(q.p); s2.target.position.copy(q.t); s2.target.updateMatrixWorld(); s2.intensity = q.I; s2.color.set(L.pracCol);
    }
    void ln; void cam;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], ln = lightOf(id), L = LIGHTS[ln], K = LOOK[ln], meta = SET_META[s.set];
    CUR.id = id;
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK); // sky, clouds, cards and sun sprites live on the no-ink layer but are still rendered
    // ---- light rig: camera-relative sun frozen per shot, two-tone uniforms, shadow fit around the look point ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (ln === "golden" || ln === "dusk" || ln === "morning") Rr = Math.max(Rr, 30);
    if (s.set === "subdeck") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    // soft shadows (lighting.md 3.3): PCF-soft filters ~3 texels, so the map size sets the penumbra: texel = softM / 3
    const ms = Math.pow(2, Math.round(Math.log2(THREE.MathUtils.clamp((6 * Rr) / L.softM, 512, 4096))));
    if (ms !== this.shadowSize) {
      this.shadowSize = ms; this.sun.shadow.mapSize.set(ms, ms);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); (this.sun.shadow as { map: THREE.WebGLRenderTarget | null }).map = null; }
    }
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    TONE.uPrac.value = L.prac; TONE.uAlbFloor.value.set(...L.albFloor); TONE.uRim.value.set(...L.rim);
    TONE.uGobo.value = L.gobo; TONE.uGoboScale.value = L.goboScale; TONE.uGoboOff.value.set(0.04 * t, 0.015 * t); TONE.uSunW.value.copy(sunDir);
    const indoor = s.set === "postoffice" || s.set === "museum";
    TONE.uAO.value = L.ao; TONE.uAOR.value = L.aoR; TONE.uFloorY.value = 0; TONE.uCeilY.value = s.set === "postoffice" ? 4.4 : s.set === "museum" ? 12 : 1e4;
    if (!indoor) TONE.uAO.value = L.ao * 0.6; // outdoors: building / wall bases only
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog (colour = horizon colour), sun disc + halo, clouds ----
    const su = this.skyMat.uniforms;
    const SK = SHOT_SKY[id] ?? K.sky;
    SK.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = SK.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    su.sunDirW.value.copy(sunDir); untone(L.glowCol, su.glowCol.value); su.glowK.value = L.glowK; su.tex.value = K.skyTex;
    this.sky.position.copy(cam.position);
    // haze (depth.md 3.2): the open-sea sets see 1 km to the horizon, so their e-fold length is stretched
    const HZ = L.haze, hk = HAZE_K[s.set] ?? 1;
    untone(HZ.col, this.fog.color);
    HAZE.uHaze.value.set(HZ.start * hk, HZ.len * hk, HZ.h * hk, HZ.max * (HAZE_MAXK[s.set] ?? 1)); HAZE.uHazeSat.value = HZ.sat; HAZE.uHazeY0.value = meta.water ?? 0;
    // ink reads scene.fog linearly: near = haze start, far ~ where the haze reaches ~90 %
    this.fog.near = HZ.start * hk; this.fog.far = HZ.max > 0 ? HZ.start * hk + 2.3 * HZ.len * hk : 1e5;
    scene.fog = this.fog; scene.background = null;
    const outdoors = !indoor;
    const showSun = (ln === "golden" || ln === "dusk" || ln === "morning") && (o2(id) < 70);
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    const skyAt = (elR: number, out: THREE.Color) => { // the sky stop colour at an elevation (radians), for the cloud pre-mix
      const st = SK.e.map((d) => THREE.MathUtils.degToRad(d));
      let k = 0; while (k + 1 < st.length && elR > st[k + 1]) k++;
      const u = k + 1 < st.length ? THREE.MathUtils.smoothstep(elR, st[k], st[k + 1]) : 0;
      return untone(new THREE.Color(SK.c[k]).lerp(new THREE.Color(SK.c[Math.min(k + 1, 4)]), u), out);
    };
    const heroSky = HERO_CLOUD_SHOTS.has(id);
    cam.getWorldDirection(this.v); const hx = this.v.x, hz = this.v.z, hn = Math.hypot(hx, hz) || 1;
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.ShaderMaterial;
      m.visible = outdoors;
      const hk2 = m.userData.hero as number | undefined;
      if (hk2 !== undefined) {
        m.visible = outdoors && heroSky;
        const [da, de, w, asp] = HERO_CLOUDS[hk2], c2 = Math.cos(da), s2 = Math.sin(da), d = 700;
        const fx2 = (hx * c2 - hz * s2) / hn, fz2 = (hz * c2 + hx * s2) / hn;
        m.position.set(cam.position.x + fx2 * d, d * Math.tan(de), cam.position.z + fz2 * d); m.scale.set(w, w / asp, 1);
        m.userData.el = de;
      }
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.uniforms.map.value = this.cloudMaps[ln][i % 4];
      skyAt(m.userData.el as number, mat.uniforms.mixCol.value);
    }
    this.sky.visible = outdoors;
    // ---- sea: colours (on-screen targets, tone-map-inverted), height per set ----
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;
    this.water.visible = meta.water !== null;
    this.water.position.set(cam.position.x, meta.water ?? 0, cam.position.z);
    // ---- sets: only the active one ----
    for (const k of Object.keys(this.sets) as SetName[]) this.sets[k].group.visible = k === s.set;
    this.sets[s.set].tick?.(t, id);
    // ---- the missile ----
    const mp = missileAt(id, f);
    poseMissile(this.missile, mp);
    const nd = noseDir(mp.yaw, mp.pitch), dir = V(...nd);
    const tail = this.missile.tail.clone().applyMatrix4(this.missile.root.matrixWorld);
    const boosterTails = this.missile.boosterTails.map((b) => b.clone().applyMatrix4(this.missile.root.matrixWorld));
    // ---- practical lights: set lamps, the booster / sustainer flame ----
    // the flame light sits 2.5 m behind the nozzle so it lights the deck / smoke, not the airframe itself (verify_r1 #4)
    this.practicals(s.set, ln, L, mp.flame > 0 && mp.visible ? mp.flame : 0, tail.clone().addScaledVector(dir, -2.5), mp.boom, cam);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0), up = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 1);
    const st = stage(id, t, { pos: cam.position, right, up }, { pose: mp, dir, tail, boosterTails });
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
      e2.mesh.scale.set(p.w, p.h, 1);
      e2.mat.color.setScalar(p.glow ?? 1); e2.soft.color.setScalar(p.glow ?? 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    // foreground props (story.ts FOREGROUND, camera-space or world): built and posed by the sets owner's helper
    // build.ts fgUpdate(group: THREE.Group, id: number, f: number, cam: THREE.PerspectiveCamera): void — called every
    // frame with this.fg (a group under root, NOINK not set so props get inked); it reads FOREGROUND for frame f itself
    // and hides everything when no entry is active. Optional until build.ts provides it.
    (B as unknown as { fgUpdate?: (g: THREE.Group, id: number, f: number, cam: THREE.PerspectiveCamera) => void }).fgUpdate?.(this.fg, id, f, cam);
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
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
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));       // depression angle of the view ray
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);         // 1 at the horizon .. 0 at 24 deg down
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.35 * wTime, 0.12 * wTime);   // slow swell drift
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;

