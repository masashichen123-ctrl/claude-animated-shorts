// The whale short's cast as lit flat sprites in the 3D world (card + pool code shared with the bridge short),
// and who stands where in each shot.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxStars, fxPuff, fxShadow, fxContact, KID, SKINS, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, easeOut, keyAt, F, WHALE, PLUNGER, LOG, CROWD, TVCAM, CAR, TABLE, LOT, PUSH, BLAST, RAIN, CRUSH, SLAP, TRUCK_HALT } from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { fxGull, fxGullSit, fxStink, fxBlast, fxSplat, fxSmoke } from "./fxw";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; mirror?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- crowd by shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };

// ---------------- the cast ----------------
const ENGINEER: Outfit = { jacket: "#d6b46c", pants: "#4a4f5c", boots: "#3a2a22", hat: "cap", cap: "#f6c62e", skin: SKINS[0], belt: "#3a2a22" };
const VET: Outfit = { jacket: "#5f7044", pants: "#4b4338", boots: "#2f2620", hat: "hair", hair: "#8a8d94", moustache: "#8a8d94", skin: SKINS[1], build: "stout" };
const REPORTER: Outfit = { jacket: "#2f5f9a", pants: "#2c3140", boots: "#2a2228", hat: "hair", hair: "#2a1d16", skin: SKINS[2], buttons: "#e8c45a" };
const CAMERAMAN: Outfit = { jacket: "#7a4a8c", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#d8453c", skin: SKINS[3] };
const SALESMAN: Outfit = { jacket: "#c8443a", pants: "#e9dcc0", boots: "#f1efe6", hat: "hair", hair: "#3a2a1c", moustache: "#3a2a1c", skin: SKINS[0], build: "stout" };
const COATS = ["#d9962e", "#c75b3a", "#2f8f8a", "#8a5a3c", "#7b4a8c", "#3f6fb5", "#c9b23a", "#b5476a", "#5d7a3a", "#d0683a"];
const HAIRS = ["#3a2a1c", "#7a4a26", "#1f1a1c", "#c9a24a", "#8a8d94", "#a04a2a"];
const FOLK: Outfit[] = COATS.map((c, v) => ({
  jacket: c, pants: ["#3b3f52", "#5a4632", "#2f4a6a"][v % 3], boots: "#4a3426", skin: SKINS[v % 4],
  hat: v % 4 === 3 ? "cap" : "hair", cap: COATS[(v + 4) % 10], hair: HAIRS[v % 6], ...(v % 5 === 2 ? { moustache: HAIRS[v % 6] } : {}), ...(v % 3 === 1 ? { dress: COATS[(v + 2) % 10] } : {}),
  ...(v % 6 === 4 ? { build: "stout" as const } : {}),
}));
const FRONT = { side: false, mirror: false };
const put = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, at: V3, fo: FrontOpts, sc = 1, swaps: number[] = []) => {
  out.places.push(person(cam, { i, o, okey }, at[0], at[1], at[2], FRONT, { mode: "stand", blink: lidAt(t, i, swaps), ...fo }, {}, sc));
  blob(out, at[0], at[1], at[2], sc);
};
const folk = (out: Stage, cam: CamInfo, t: number, i: number, at: V3, expr: Expr, look = 0) => put(out, cam, t, 20 + i, FOLK[i % 10], `f${i % 10}`, at, { expr, look });
const sec = (f: number) => f / FPS;

/** the eight neighbours standing around the whale before they are sent away (shots 2-6) */
const RING: V3[] = [[-6.8, 0, -7.7], [-5.5, 0, -7.2], [-4.4, 0, -8.1], [-9.2, 0, -5.6], [-1.6, 0, -6.4], [6.4, 0, -6.6], [8.2, 0, -8.2], [-11.5, 0, -8.6]];
const ring = (out: Stage, cam: CamInfo, t: number, ex: (i: number) => Expr, skip: number[] = []) =>
  RING.forEach((at, i) => { if (!skip.includes(i)) folk(out, cam, t, i, at, ex(i), at[0] < 0 ? 1 : -1); });

/** where everyone stands after backing up */
const CROWD_AT: V3[] = Array.from({ length: 22 }, (_, i) => {
  const row = i % 3, col = Math.floor(i / 3);
  return [CROWD[0] - 5.2 + col * 1.5 + (hh(i, 61) - 0.5) * 0.5 + row * 0.4, 0, CROWD[2] + 1.6 - row * 1.5 + (hh(i, 62) - 0.5) * 0.4] as V3;
});
const VET_I = 10, ENG_I = 13;
const crowd = (out: Stage, cam: CamInfo, t: number, ex: (i: number) => Expr, look = 0, splat = false) =>
  CROWD_AT.forEach((at, i) => {
    if (i === VET_I) put(out, cam, t, 2, VET, "vet", at, { expr: ex(i) === "relief" ? "stern" : ex(i), look });
    else if (i === ENG_I) put(out, cam, t, 1, ENGINEER, "eng", at, { expr: ex(i), look });
    else folk(out, cam, t, i, at, ex(i), look);
    if (splat && i % 3 === 0) {
      const dx = cam.pos.x - at[0], dz = cam.pos.z - at[2], dl = Math.hypot(dx, dz) || 1;
      out.fx.push({ key: `splat${i % 3}`, cw: 300, ch: 300, draw: (p) => fxSplat(p, i), x: at[0] + (dx / dl) * 0.06 + 0.1, y: 1.92 + (i === VET_I ? 0.05 : 0), z: at[2] + (dz / dl) * 0.06, w: 0.5, h: 0.5 });
    }
  });

/** everything with a face (and every 2D effect) in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = sec(f), k = keyAt(id, f);
  LNAME = s.light;
  findSun(cam, SUN);
  const gullsUp = (n: number) => {
    for (let i = 0; i < n; i++) {
      const a = t * 0.9 + i * 1.26, wing = q(Math.sin(t * 9 + i * 1.7), 4);
      out.fx.push({ key: `gull${wing}`, cw: 400, ch: 260, draw: (p) => fxGull(p, wing), x: WHALE[0] + 9 * Math.cos(a), y: 8 + i * 0.7, z: WHALE[2] + 6 * Math.sin(a), w: 2.6, h: 1.7 });
    }
  };
  const stink = () => [[-3, 4.7], [0.6, 5.1], [4, 4.6]].forEach(([x, y], i) => {
    const ph = q((t * 0.7 + i * 0.33) % 1, 12);
    out.fx.push({ key: `stink${ph}`, cw: 300, ch: 500, draw: (p) => fxStink(p, ph), x: WHALE[0] + x, y, z: WHALE[2] - 0.4, w: 1.5, h: 2.5 });
  });
  switch (id) {
    case 1: {
      const pushed = f >= PUSH;
      put(out, cam, t, 1, ENGINEER, "eng", PLUNGER, { expr: pushed ? "laugh" : f > F(1, 0.3) ? "grin" : "smile", look: 1, tilt: pushed ? 0.12 : 0 }, 1, [sec(F(1, 0.3)), sec(PUSH)]);
      if (pushed && f < PUSH + 5) { const u = q((f - PUSH) / 5, 30); out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x: PLUNGER[0] + 0.62, y: 0.6, z: PLUNGER[2] - 0.2, w: 0.9, h: 0.9 }); }
      break;
    }
    case 2:
      ring(out, cam, t, (i) => (["pained", "dazed", "nervous", "pained"] as Expr[])[i % 4]);
      stink(); gullsUp(5);
      break;
    case 3: {
      ring(out, cam, t, (i) => (["pained", "nervous", "dazed"] as Expr[])[i % 3]);
      stink();
      if (k < 2 && f > TRUCK_HALT + 6) put(out, cam, t, 1, ENGINEER, "eng", [13.2, 0, -9.6], { expr: f > F(3, 0.5) ? "nervous" : "neutral", look: -1 }, 1, [sec(F(3, 0.5))]);
      if (k === 2) put(out, cam, t, 1, ENGINEER, "eng", [10.5, 0, -5.3], { expr: "nervous", look: -1, headTilt: 0.08 });
      break;
    }
    case 4:
      if (k < 2) {
        ring(out, cam, t, () => "pained", [4]);
        const smug = f > F(4, 0.4);
        put(out, cam, t, 1, ENGINEER, "eng", [3, 0, -7], { expr: smug ? "grin" : "smile", look: 1, ...(smug ? { wave: 0.5 + 0.5 * Math.sin(t * 7) } : {}) }, 1, [sec(F(4, 0.4))]);
      } else {
        for (let i = 0; i < 5; i++) {
          const ex = i === 2 ? 1 : (i + Math.floor(t * 1.5)) % 4 === 0 ? 0 : 1;
          out.fx.push({ key: `gsit${ex}`, cw: 240, ch: 260, draw: (p) => fxGullSit(p, ex), x: LOG[0] - 1.9 + i * 0.95, y: 0.52 + 0.47, z: LOG[2] - 0.02 * i, w: 0.86, h: 0.94 });
        }
      }
      break;
    case 5:
      if (k < 2) {
        const says = f > F(5, 0.45);
        put(out, cam, t, 2, VET, "vet", [-5, 0, -9], { expr: says ? "smile" : "stern", look: 1, ...(says ? { wave: 0.4 } : {}) }, 1, [sec(F(5, 0.45))]);
        folk(out, cam, t, 0, [-6.5, 0, -7.9], "nervous", 1); folk(out, cam, t, 1, [-3.7, 0, -8.0], "pained", 1); folk(out, cam, t, 3, [-8.0, 0, -8.6], "dazed", 1);
        put(out, cam, t, 1, ENGINEER, "eng", [-2.2, 0, -6.2], { expr: "smile", look: -1 });
      }
      break;
    case 6:
      put(out, cam, t, 1, ENGINEER, "eng", [5.3, 0, 1.4], { expr: "grin", look: -1 });
      break;
    case 7:
      if (k === 0) crowd(out, cam, t, (i) => (i % 2 ? "nervous" : "neutral"));
      else {
        put(out, cam, t, 3, REPORTER, "rep", TVCAM, { expr: "smile", look: 0 });
        put(out, cam, t, 4, CAMERAMAN, "cam", [TVCAM[0] + 1.75, 0, TVCAM[2] + 0.75], { expr: "neutral", look: -1, tilt: -0.06 });
        crowd(out, cam, t, (i) => (i % 2 ? "nervous" : "neutral"));
      }
      break;
    case 8:
      if (k < 2) {
        const tb = (f - BLAST) / FPS;
        if (tb >= 0) {
          const size = 5 + 40 * easeOut(tb / 1.6), g = q(clamp01(tb / 1.6), 30);
          out.fx.push({ key: `blast${g}`, cw: 900, ch: 900, draw: (p) => fxBlast(p, g), x: WHALE[0] + 0.5, y: size * 0.4, z: WHALE[2] - 1.5, w: size, h: size });
          if (tb < 0.3) { const u = q(tb / 0.3, 30); out.fx.push({ key: `bb${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#fff3b0", 14, 60, 240), x: WHALE[0], y: 3, z: WHALE[2] - 3, w: 26, h: 26 }); }
        }
      } else crowd(out, cam, t, (i) => (i % 3 === 0 ? "shock" : i % 3 === 1 ? "nervous" : "pained"), 0, f > RAIN + 26);
      break;
    case 9:
      crowd(out, cam, t, (i) => (["relief", "relief_open", "smile", "dazed"] as Expr[])[i % 4], 0, true);
      break;
    case 10:
      if (f >= CRUSH && f < CRUSH + 14) {
        const u = q((f - CRUSH) / 14, 30);
        out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#ffd6de"), x: CAR[0] - 0.6, y: 1.6, z: CAR[2] - 1.2, w: 4.2, h: 4.2 });
        for (const dx of [-1.9, 1.9]) out.fx.push({ key: `puff${u}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, u), x: CAR[0] + dx, y: 0.5, z: CAR[2] - 1.4, w: 2.4, h: 2.4, soft: true });
      }
      break;
    case 11: {
      const u = (f - s.a) / Math.max(1, s.b - s.a);
      for (let i = 0; i < 7; i++) {
        const wing = q(Math.sin(t * 11 + i * 1.9), 4);
        out.fx.push({ key: `gull${wing}`, cw: 400, ch: 260, draw: (p) => fxGull(p, wing), x: -4 + i * 3.1 + 14 * u + 3 * Math.sin(i * 2.3), y: 5.5 + (i % 3) * 1.6 + 9 * u, z: 10 + (i % 4) * 5 + 70 * u, w: 2.6, h: 1.7 });
      }
      break;
    }
    case 12: {
      const at: V3 = [-4.6, 0, -3.4];
      put(out, cam, t, 1, ENGINEER, "eng", at, { expr: "dazed", look: 0, tilt: 0.05 * Math.sin(t * 2.2) });
      const dx = cam.pos.x - at[0], dz = cam.pos.z - at[2], dl = Math.hypot(dx, dz) || 1;
      out.fx.push({ key: "splat1", cw: 300, ch: 300, draw: (p) => fxSplat(p, 1), x: at[0] + (dx / dl) * 0.06 + 0.08, y: 1.95, z: at[2] + (dz / dl) * 0.06, w: 0.52, h: 0.52 });
      const sp = q((t * 0.9) % 1, 20);
      out.fx.push({ key: `stars${sp}`, cw: 420, ch: 210, draw: (p) => fxStars(p, sp), x: at[0] + (dx / dl) * 0.08, y: 2.32, z: at[2] + (dz / dl) * 0.08, w: 0.8, h: 0.4 });
      for (let i = 0; i < 3; i++) { const u = q((t * 0.35 + i * 0.33) % 1, 24); out.fx.push({ key: `smoke${u}`, cw: 300, ch: 300, draw: (p) => fxSmoke(p, u), x: WHALE[0] - 1.5 + i * 2, y: 3.4 + 3.5 * u, z: WHALE[2] - 1.4, w: 1.6 + 1.6 * u, h: 1.6 + 1.6 * u }); }
      break;
    }
    case 13: {
      const up = smooth((f - (SLAP - 16)) / 10) * (1 - smooth((f - SLAP + 2) / 3));
      const ex: Expr = f < SLAP - 16 ? "smile" : f < SLAP ? "grin" : f < SLAP + 24 ? "shock" : "laugh";
      put(out, cam, t, 5, KID, "kid", [TABLE[0] + 0.12, 0, TABLE[2] + 0.74], { expr: ex, look: 0, ...(f >= SLAP - 16 && f < SLAP + 40 ? { wave: 1.4 * up - 0.6 } : {}) }, 1, [sec(SLAP - 16), sec(SLAP), sec(SLAP + 24)]);
      if (f >= SLAP && f < SLAP + 6) { const u = q((f - SLAP) / 6, 30); out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#ffd6de"), x: TABLE[0], y: 1.12, z: TABLE[2] - 0.3, w: 1.3, h: 1.3 }); }
      break;
    }
    case 14:
      put(out, cam, t, 1, ENGINEER, "eng", [-5.6, 0, -1.2], { expr: "relief", look: 1 });
      break;
    case 15:
      put(out, cam, t, 2, VET, "vet", [-97.4, 0, -53.2], { expr: f > F(15, 0.6) ? "dazed" : "stern", look: 1 }, 1, [sec(F(15, 0.6))]);
      break;
    case 16:
      put(out, cam, t, 2, VET, "vet", [LOT[0] - 0.5, 0, LOT[2] - 0.5], { expr: "grin", look: 0 });
      put(out, cam, t, 6, SALESMAN, "sale", [LOT[0] - 2.1, 0, LOT[2] + 0.3], { expr: "relief_open", look: 1, wave: 0.5 + 0.5 * Math.sin(t * 5) });
      break;
  }
  return out;
};
export { FPS };
