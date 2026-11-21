// Our cast as lit flat sprites in the 3D world (owner: characters, with toon.ts / cardshade.ts). Each frame every
// character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing. People are
// yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward the sun, painted crescent in
// the drawing); standing ones get a soft multiply contact blob. BATS are square cards (billboards when flying), keyed by
// (pose, quantised flap phase, expression, size tier), so a swarm of 300 shares a few dozen canvases. Effects (flames,
// fireballs, POOF, smoke, the idea bulb) are unlit cards; glow > 1 blooms. Cards, effects and blobs live on the NOINK
// layer so the world ink pass never outlines their quads.
// CONTRACT with world.ts: stage(id, t, cam, rig) -> { places, fx, lights }; Pool / Actor / Fx draw them.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxContact, fxShadow, fxSmoke, fxDustCloud, fxSparkle, fxSpeed, fxStars, fxBurst, fxDust,
  Outfit, Expr, FrontOpts, SideOpts, ArmPose, ArmSpec, batDraw, BatOpts, BatPose, BatExpr, fxFlame, fxFireball, fxPoof, fxBulb, capsule, mix as mixC,
  ADAMS, ADAMS_HAT, CHEMIST, PRESIDENT, GENERAL, GENERAL_SINGED, SOLDIER, SOLDIER2, OFFICER,
} from "./toon";
import {
  FPS, SHOTS, SPOT, V3, Light, smooth, clamp01, easeOut, lerp, lerp3, add, EV, BombPose, CratePose, bat9At, ribbonAt, hero1At, camAt, caveGround,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K, updateEnvTint } from "./cardshade";

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
export const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** last render frame each scene's environment tint was computed */
const ENV_SEEN = new WeakMap<THREE.Object3D, number>();
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
    this.mesh.onBeforeRender = (r, scene) => {
      const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920;
      if (ENV_SEEN.get(scene) !== r.info.render.frame) { ENV_SEEN.set(scene, r.info.render.frame); updateEnvTint(scene); }
    };
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
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number];
  /** face the camera fully (top-down aerials): the card copies the camera orientation, then rolls by `roll` */
  billboard?: boolean;
  /** square card centred on (x, y, z), scale = its size in metres (bats, small lit props) */
  sq?: boolean;
};
/** effect card: billboard (or flat on the ground), rot = screen roll, soft = see-through, glow = colour multiplier (> 1 blooms) */
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; glow?: number };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; sun?: THREE.Vector3 };

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
let LNAME: Light = "day";
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
// charshade.md 3.4: core ~.62-.70 on screen, near-neutral (B/R <= 1.12), ~0.6-0.8 body width, soft edge
// keyed by string so new light presets ("morning", "gallery") work; an unknown key falls back to day
const CONTACT: Record<string, [number, number, number]> = { day: [0.62, 0.6, 0.66], dusk: [0.6, 0.6, 0.72], night: [0.62, 0.64, 0.78],
  interior: [0.6, 0.57, 0.62], lab: [0.6, 0.62, 0.66], office: [0.6, 0.6, 0.66] };
const TAIL: [number, number, number] = [0.72, 0.7, 0.78];
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
  const cc = hexOf(CONTACT[LNAME] ?? CONTACT.day, k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.03, z: z + oz * 0.03 * sc,
    w: 0.4 * sc, h: 0.22 * sc, flat: true, rot });
};

// ---------------- staging helpers ----------------
/** a practical light this frame (fire glow, the bulb, the POOF flash): world.ts feeds them to its point lights */
export type Glow = { p: V3; I: number; col: string; d?: number };
export type Stage = { places: Place[]; fx: FxPlace[]; lights: Glow[] };
/** frame-steady expression switch: before ts (seconds, minus the reaction lead) a, after b */
const at = <T,>(t: number, ts: number, a: T, b: T) => (t < ts - LEAD ? a : b);
/** mouth flaps while talking: alternate speak / closed every ~4 f inside [t0, t1) */
const talk = (t: number, t0: number, t1: number, closed: Expr): Expr => (t >= t0 && t < t1 && Math.floor(t * FPS / 4) % 3 !== 2 ? "speak" : closed);
// ---------------- acting tracks (motion.md 3.2) ----------------
/** one acting beat, keyed to a word onset frame f (lands LEAD = 2 f early). Omitted fields keep their value. Arms are
 *  named by the facing side: armF = the arm on the side the character faces, armB = the other one. */
export type Beat = { f: number; expr?: Expr; look?: number; headTilt?: number; lean?: number; gaze?: number; shrug?: number;
  armF?: ArmPose; armB?: ArmPose; dur?: number };
const LEADF = 2;
const glide = (x: number) => { const u = Math.min(1, Math.max(0, x)); return u * u * u * (u * (u * 6 - 15) + 10); };
const NUM = ["look", "headTilt", "lean", "gaze", "shrug"] as const;
const DUR: Record<(typeof NUM)[number], number> = { look: 3, headTilt: 6, lean: 9, gaze: 4, shrug: 6 };
/** acting idle between beats: a small look / head-tilt change every 15 f (4 f ease), so no one freezes > 0.5 s */
const idleAt = (f: number, i: number) => {
  const n = Math.floor((f + i * 7) / 15), k = glide(((f + i * 7) % 15) / 4);
  const v = (m: number, s: number) => { const a = hh(m * 3 + i, s) - 0.5, b = hh((m + 1) * 3 + i, s) - 0.5; return a + (b - a) * k; };
  return { look: 0.9 * v(n - 1, 21), headTilt: 7 * v(n - 1, 22) };
};
/** fold the beats up to frame f into FrontOpts (eased numbers, instant expression swaps, blended arm poses) */
const act = (beats: Beat[], f: number, facing: number, i: number, idle = 1) => {
  const cur: Record<string, number> = { look: 0, headTilt: 0, lean: 0, gaze: 0, shrug: 0 };
  let expr: Expr = "neutral", aF: [ArmPose, ArmPose, number] = ["hang", "hang", 1], aB: [ArmPose, ArmPose, number] = ["hang", "hang", 1];
  const swaps: number[] = [];
  for (const b of beats) {
    if (b.expr) swaps.push(b.f / FPS);
    const s = b.f - LEADF;
    if (f < s) continue;
    for (const k of NUM) if (b[k] !== undefined) cur[k] += (b[k]! - cur[k]) * glide((f - s) / (b.dur ?? DUR[k]));
    if (b.expr) expr = b.expr;
    if (b.armF) aF = [aF[2] > 0.5 ? aF[1] : aF[0], b.armF, glide((f - s) / (b.dur ?? 7))];
    if (b.armB) aB = [aB[2] > 0.5 ? aB[1] : aB[0], b.armB, glide((f - s) / (b.dur ?? 7))];
  }
  const id = idleAt(f, i);
  const sp = (a: [ArmPose, ArmPose, number]): ArmSpec | undefined => (a[0] === "hang" && a[1] === "hang" ? undefined : a[2] >= 1 ? a[1] : [a[0], a[1], q(a[2], 30)]);
  const R = facing >= 0 ? aF : aB, L = facing >= 0 ? aB : aF;
  const waving = aF[1] === "wave" || aB[1] === "wave";
  const fo: FrontOpts = {
    expr, look: q(cur.look * (facing || 1) + idle * id.look, 10), headTilt: q(cur.headTilt + idle * id.headTilt, 2), lean: q(cur.lean, 2), gaze: q(cur.gaze, 10),
    shrug: q(cur.shrug, 10), armR: sp(R), armL: sp(L), wave: waving ? q(0.5 + 0.5 * Math.sin((f / FPS) * 9), 8) : undefined,
  };
  return { fo, swaps };
};
/** screen-space facing from the actor toward a world point (+1 = screen right) */
const faceTo = (cam: CamInfo, from: V3, to: V3 | THREE.Vector3): -1 | 1 => {
  const tx = Array.isArray(to) ? to[0] : to.x, tz = Array.isArray(to) ? to[2] : to.z;
  return (tx - from[0]) * cam.right.x + (tz - from[2]) * cam.right.z >= 0 ? 1 : -1;
};
/** a standing actor (front view), contact blob included. Never dead-frontal: without a facing it turns toward frame centre */
const stand = (out: Stage, cam: CamInfo, i: number, o: Outfit, okey: string, p: V3, fo: FrontOpts, t: number, scale = 1, swaps: number[] = []) => {
  const facing = fo.facing ?? ((p[0] - cam.pos.x) * cam.right.x + (p[2] - cam.pos.z) * cam.right.z > 0 ? -1 : 1);
  out.places.push(person(cam, { i, o, okey }, p[0], p[1], p[2], { side: false, mirror: false }, { mode: "stand", blink: lidAt(t, i, swaps), ...fo, facing }, {}, scale));
  blob(out, p[0], p[1], p[2], scale);
};
/** an actor driven by an acting track; extra = per-frame overrides (props, talking mouth) */
const actor = (out: Stage, cam: CamInfo, i: number, o: Outfit, okey: string, p: V3, beats: Beat[], t: number, facing: -1 | 1,
  extra: (fo: FrontOpts) => FrontOpts = (x) => x, scale = 1) => {
  const { fo, swaps } = act(beats, Math.round(t * FPS), facing, i);
  stand(out, cam, i, o, okey, p, extra({ ...fo, facing }), t, scale, swaps);
};
/** sweat drop progress for a 14 f slide starting at frame f0 */
const sweatAt = (f: number, f0: number) => { const u = (f - f0) / 14; return u > 0 && u < 1 ? q(u, 14) : undefined; };
/** screen roll that makes a card's canvas "down" point along world direction v */
const rollAlong = (cam: CamInfo, v: THREE.Vector3) => Math.atan2(v.dot(cam.right), -v.dot(cam.up));
const _v = new THREE.Vector3();

// ---------------- effects ----------------
/** soft smoke / dust puff at a point, s seconds since spawn, grows to size over life */
const puff = (out: Stage, c: V3, s: number, size: number, life: number, seed: number, tint = "#ece8ea") => {
  if (s < 0 || s > life) return;
  const u = q(s / life, 16);
  out.fx.push({ key: `cloud${u}|${seed % 4}|${tint}`, cw: 400, ch: 400, draw: (p) => fxDustCloud(p, u, seed % 4, tint), x: c[0], y: c[1] + size * 0.2 * u, z: c[2],
    w: size * (0.7 + 0.3 * u), h: size * (0.7 + 0.3 * u), soft: true });
};
void fxSmoke;
const DUST = "#dca27a", SMOKE = "#8a8288", SMOKE_D = "#5a5258";
/** sparkle burst (on ones) over a point, 20 f long, starting at frame f0 */
const sparkle = (out: Stage, c: V3, f: number, f0: number, size = 0.9, glow = 1.3) => {
  const u = (f - f0) / 20;
  if (u <= 0 || u >= 1) return;
  const k = q(u, 20);
  out.fx.push({ key: `spark${k}`, cw: 400, ch: 400, draw: (p) => fxSparkle(p, k), x: c[0], y: c[1], z: c[2], w: size, h: size, glow });
};
/** a dust trail behind a moving point: puffs dropped every 3 f, each living ~1 s */
const trail = (out: Stage, at: (g: number) => V3, f: number, n: number, size: number, tint: string, every = 3) => {
  for (let k = 0; k < n; k++) {
    const g = Math.floor(f / every) * every - k * every, s = (f - g) / FPS;
    puff(out, at(g), s, size * (0.8 + 0.25 * (k % 3)), 1.1, g, tint);
  }
};
/** speed lines behind a runner (screen direction of travel = dir) */
const speed = (out: Stage, cam: CamInfo, c: V3, dir: THREE.Vector3, f: number, w = 2.4) => {
  const ph = q((f % 10) / 10, 10), rot = Math.atan2(dir.dot(cam.up), dir.dot(cam.right));
  out.fx.push({ key: `speed${ph}`, cw: 600, ch: 300, draw: (p) => fxSpeed(p, ph), x: c[0] - dir.x * w * 0.6, y: c[1], z: c[2] - dir.z * w * 0.6, w, h: w * 0.42, rot });
};

// ---------------- people helpers ----------------
/** a seated character (crouched gunner, dazed soldier, Meredith at the desk) */
const sitter = (out: Stage, cam: CamInfo, i: number, o: Outfit, okey: string, p: V3, beats: Beat[], t: number, facing: -1 | 1,
  extra: (fo: FrontOpts) => FrontOpts = (x) => x, scale = 1, shadow = true) => {
  const { fo, swaps } = act(beats, Math.round(t * FPS), facing, i);
  out.places.push(person(cam, { i, o, okey }, p[0], p[1], p[2], { side: false, mirror: false }, extra({ ...fo, facing, mode: "sit", blink: lidAt(t, i, swaps) }), {}, scale));
  if (shadow) blob(out, p[0], p[1], p[2], scale * 1.2);
};

const H = (i: number, s: number) => hh(i, s);

// ---------------- bats ----------------
const _cp = new THREE.Vector3(), _up = new THREE.Vector3();
type BatSpec = { pose: BatPose; phase?: number; expr?: BatExpr; look?: number; gaze?: number; bomb?: 0 | 1 | 2; medal?: boolean; tilt?: number;
  size?: number; roll?: number; tint?: number; blink?: boolean; spin?: number };
/** one bat: a square billboard card of `size` metres centred on p; a glowing capsule adds a bloom dot on the belly */
const bat = (out: Stage, cam: CamInfo, i: number, p: V3, o: BatSpec, t: number) => {
  const size = o.size ?? 0.45, d = cam.pos.distanceTo(_cp.set(p[0], p[1], p[2]));
  if (d < 0.35) return;
  const px = (size / Math.max(0.05, d)) * 1900 * 1.33;
  const cw = px > 700 ? 1024 : px > 330 ? 512 : px > 150 ? 256 : 128, lod = cw <= 128 ? 0 : 1;
  const fly = o.pose === "fly" || o.pose === "cheer";
  const bo: BatOpts = {
    pose: o.pose, phase: fly ? q((((o.phase ?? 0) % 1) + 1) % 1, lod ? 12 : 6) : 0, expr: o.expr ?? "open", look: q(o.look ?? 0, 4), gaze: q(o.gaze ?? 0, 4),
    bomb: o.bomb ?? 0, tint: o.tint ?? i % 3, medal: o.medal, tilt: Math.round(o.tilt ?? 0), blink: o.blink === false || !lod ? 0 : lidAt(t, i),
    light: lod ? light2D(cam, false) : -2.2, lod, spin: Math.round(o.spin ?? 0),
  };
  out.places.push({ key: `B|${fkey(bo)}`, draw: (pn) => batDraw(pn, bo), x: p[0], y: p[1], z: p[2], scale: size, sq: true, billboard: true, roll: o.roll ?? 0, size: [cw, cw, cw / 600] });
  if (o.bomb === 2) { // the capsule's pilot light: a bloom dot on the belly (just in front of the card)
    const hang = o.pose === "hang", wrap = o.pose === "wrap" || hang, dy = hang ? 0.183 : wrap ? -0.183 : -0.143;
    _up.copy(cam.up).multiplyScalar(dy * size);
    const tc = _cp.set(cam.pos.x - p[0], cam.pos.y - p[1], cam.pos.z - p[2]).normalize().multiplyScalar(0.02);
    const k = 0.75 + 0.25 * Math.sin(t * 22 + i);
    out.fx.push({ key: "gdot", cw: 64, ch: 64, draw: glowDot, x: p[0] + _up.x + tc.x + 0.03 * size, y: p[1] + _up.y + tc.y, z: p[2] + _up.z + tc.z, w: 0.13 * size * k + 0.03, h: 0.13 * size * k + 0.03, soft: true, glow: 3.2 });
  }
};
const glowDot = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,240,180,1)"); gr.addColorStop(0.35, "rgba(255,150,60,0.9)"); gr.addColorStop(1, "rgba(255,90,30,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
};
/** flap phase of a bat (fast wingbeat ~5 Hz) */
const flap = (f: number, i: number, rate = 6) => (f / rate + H(i, 7)) % 1;

// ---------------- fire + bangs ----------------
const flame = (out: Stage, c: V3, size: number, f: number, seed: number, glow = 2.1) => {
  const k = q((f / 7 + seed * 0.37) % 1, 8);
  out.fx.push({ key: `flame${k}|${seed % 3}`, cw: 300, ch: 400, draw: (p) => fxFlame(p, k, seed % 3), x: c[0], y: c[1] + size * 0.47, z: c[2], w: size * 0.75, h: size, glow });
};
/** a flame that grows in over 6 f from frame f0 */
const fireAt = (out: Stage, c: V3, size: number, f: number, f0: number, seed: number) => { if (f >= f0) flame(out, c, size * easeOut((f - f0) / 6), f, seed); };
const fireball = (out: Stage, c: V3, size: number, f: number, f0: number, life = 40, seed = 0) => {
  const u = (f - f0) / life;
  if (u < 0 || u >= 1) return;
  const k = q(u, 30);
  out.fx.push({ key: `fball${k}|${seed}`, cw: 600, ch: 600, draw: (p) => fxFireball(p, k, seed), x: c[0], y: c[1], z: c[2], w: size, h: size, glow: lerp(2.6, 1.0, smooth((u - 0.3) / 0.5)) });
};
const poof = (out: Stage, c: V3, size: number, f: number, f0: number, life = 16) => {
  const u = (f - f0) / life;
  if (u < 0 || u >= 1) return;
  const k = q(u, 16);
  out.fx.push({ key: `poof${k}`, cw: 400, ch: 400, draw: (p) => fxPoof(p, k), x: c[0], y: c[1], z: c[2], w: size, h: size, glow: 1.6 });
};
/** rising smoke: a puff every `every` frames from c, drifting up and sideways */
const smokeCol = (out: Stage, c: V3, f: number, n: number, size: number, tint: string, every = 5, rise = 1.6, drift = 0.5, seed = 0) => {
  for (let k = 0; k < n; k++) {
    const g = Math.floor(f / every) * every - k * every, s = (f - g) / FPS;
    if (s < 0) continue;
    const life = (n * every) / FPS;
    puff(out, [c[0] + drift * s, c[1] + rise * s, c[2] + 0.2 * Math.sin(g + seed)], s, size * (0.7 + 0.5 * (s / life)), life, g + seed, tint);
  }
};

/** what world.ts posed this frame: the bomb casing and the bat crate */
export type RigInfo = { bomb: BombPose; crate: CratePose };

// ---------------- per-shot staging ----------------
/** everything with a face, and every effect card, in shot `id` at time t (pure function of id + t) */
export const stage = (id: number, t: number, cam: CamInfo, rig: RigInfo): Stage => {
  const out: Stage = { places: [], fx: [], lights: [] };
  const s = SHOTS[id - 1], f = t * FPS, F = Math.round(f);
  LNAME = s.light;
  findSun(cam, SUN);
  const S = SPOT;
  switch (id) {
    case 1: { // the hook: the casing pops, hundreds of bats spiral out, one flies into the lens and grins
      const B = rig.bomb.pos;
      if (f >= EV.POP1) {
        poof(out, [B[0], B[1] - 0.2, B[2] + 0.4], 3.6, f, EV.POP1, 12);
        out.lights.push({ p: [B[0], B[1], B[2] + 1], I: 9 * Math.max(0, 1 - (f - EV.POP1) / 18), col: "#ffb060" });
        for (let i = 1; i < 240; i++) {
          const dl = (i % 30) * 0.45 + Math.floor(i / 30) * 0.5, sec = (f - EV.POP1 - dl) / FPS;
          if (sec <= 0) continue;
          const th = i * 2.39996 + sec * (2.4 + 0.8 * H(i, 1)), r = (0.5 + 6.5 * (1 - Math.exp(-1.7 * sec))) * (0.55 + 0.7 * H(i, 2)) + 2.2 * sec;
          const p: V3 = [B[0] + r * Math.cos(th), B[1] + 0.85 * r * Math.sin(th) + 0.9 * sec, B[2] + (H(i, 3) - 0.35) * 5 * sec];
          bat(out, cam, i, p, { pose: "fly", phase: flap(f, i, 5), bomb: 2, size: 0.42 + 0.12 * H(i, 4), roll: 0.5 * Math.sin(th), expr: H(i, 5) < 0.3 ? "grin" : "open", blink: false }, t);
        }
        const hp = hero1At(f), u = clamp01((f - EV.POP1) / 15);
        bat(out, cam, 0, hp, { pose: u < 1 ? "fly" : "cheer", phase: flap(f, 0, 4), bomb: 2, size: lerp(0.4, 0.5, u), expr: f >= EV.GRIN1 - 2 ? "grin" : "open", gaze: 0, roll: 0.25 * (1 - u) }, t);
      }
      break;
    }
    case 2: { // the swarm dives onto the base at dusk; little roof fires; the soldier's cap flies off
      const sp = S.SOLDIER2, cap = f >= EV.KICK2 - 1;
      actor(out, cam, 2, SOLDIER, "soldier", sp, [
        { f: 114, expr: "smile", look: -1, lean: 2 },
        { f: EV.DIVE2, expr: "nervous", look: -1, gaze: -1, headTilt: 6 },
        { f: 130, expr: "shock", gaze: -0.6, lean: -4 },
        { f: EV.KICK2, expr: "jawdrop", lean: -9, shrug: 1, headTilt: 0, gaze: 0, dur: 4 },
      ], t, -1, (fo) => ({ ...fo, hatLift: cap ? 0.6 + 3.2 * easeOut((f - EV.KICK2 + 1) / 14) : 0, hatTilt: cap ? 0.9 * easeOut((f - EV.KICK2 + 1) / 14) : 0, sweat: sweatAt(f, 126) }));
      const roofs: V3[] = [[-20, 11.6, -18], [-13, 11.2, -20], [6, 5.2, -10], [13, 5.2, -9.6], [24, 5.2, -12]];
      EV.FIRES2.forEach((f0, k) => { fireAt(out, roofs[k], 2.2 + 0.4 * (k % 2), f, f0, k); if (f >= f0) { smokeCol(out, [roofs[k][0], roofs[k][1] + 1.5, roofs[k][2]], f, 4, 2.4, SMOKE, 6, 1.5, 0.6, k); out.lights.push({ p: [roofs[k][0], roofs[k][1] + 1.5, roofs[k][2] + 2], I: 14, col: "#ff9a40", d: 40 }); } });
      for (let i = 0; i < 230; i++) {
        const t0 = 113 + (i % 46) * 0.45, u = (f - t0) / (16 + 8 * H(i, 11));
        if (u <= 0) continue;
        const tgt = roofs[i % 5], st: V3 = [-34 + 20 * H(i, 12), 34 + 14 * H(i, 13), -30 + 20 * H(i, 14)];
        const end: V3 = [tgt[0] + (H(i, 15) - 0.5) * 9, tgt[1] + 1.5 + 5 * H(i, 16), tgt[2] + (H(i, 17) - 0.5) * 8];
        const k = easeOut(Math.min(1, u)), mid: V3 = lerp3(st, end, 0.5);
        let p = lerp3(lerp3(st, [mid[0], mid[1] + 6, mid[2] + 6], k), lerp3([mid[0], mid[1] + 6, mid[2] + 6], end, k), k);
        if (u > 1) { const a = (f - t0) * 0.12 + i; p = [end[0] + 1.6 * Math.cos(a), end[1] + 0.6 * Math.sin(a * 1.3), end[2] + 1.6 * Math.sin(a)]; }
        bat(out, cam, 10 + i, p, { pose: "fly", phase: flap(f, i), bomb: 2, size: 0.6 + 0.2 * H(i, 18), roll: u < 1 ? -0.5 : 0.3 * Math.sin(f * 0.2 + i), blink: false }, t);
      }
      for (let i = 0; i < 5; i++) { // a few close ones swoop past the soldier (big in the frame, never through the lens)
        const t0 = 118 + i * 5, u = (f - t0) / 22;
        if (u <= 0 || u >= 1) continue;
        const p: V3 = [lerp(4, 14, u) + 2 * i, lerp(8, 3.2 + 0.4 * i, easeOut(u)), lerp(4, 9, u) - i];
        bat(out, cam, 300 + i, p, { pose: "fly", phase: flap(f, i, 4), bomb: 2, size: 0.62, expr: "grin", roll: -0.4 }, t);
      }
      break;
    }
    case 3: { // Adams at the overlook rail; the column of bats spirals out of the cave; he turns to us, big eyes
      actor(out, cam, 3, ADAMS_HAT, "adamsHat", S.ADAMS3, [
        { f: 171, expr: "smile", look: -1, lean: 2 },
        { f: 194, expr: "proud", headTilt: -4, look: -0.6 },             // "dentist"
        { f: 224, expr: "smile_closed", headTilt: 5, lean: -2 },          // "Adams"
        { f: 266, expr: "smile", look: -1, gaze: 0.4 },                   // "cave"
        { f: 290, expr: "awe", look: -1, gaze: -0.8, lean: -5 },          // the column
        { f: EV.TURN3, expr: "shock", look: 0, gaze: 0, lean: -9, shrug: 1, headTilt: 0, dur: 4 }, // "bats": turns to us
      ], t, -1, (fo) => ({ ...fo, hatLift: f >= EV.TURN3 - 1 ? 0.25 * easeOut((f - EV.TURN3 + 1) / 5) : 0 }));
      if (f >= EV.COLUMN3 - 8) for (let i = 0; i < 360; i++) {
        const sp = (0.5 + 0.25 * H(i, 21)) * (f - (EV.COLUMN3 - 8)) / FPS - 1.25 * H(i, 22);
        if (sp <= 0 || sp >= 1) continue;
        const c = ribbonAt(3, sp), a = i * 2.39996 + f * 0.16 + sp * 9, r = 0.6 + 3.6 * sp;
        bat(out, cam, 20 + i, [c[0] + r * Math.cos(a), c[1] + 0.6 * r * Math.sin(a * 0.7), c[2] + r * Math.sin(a)], { pose: "fly", phase: flap(f, i), size: 0.85, roll: 0.4 * Math.cos(a), blink: false }, t);
      }
      break;
    }
    case 4: {
      if (f < EV.CU4) { // the idea: a light bulb pops on over his head
        actor(out, cam, 4, ADAMS, "adams", S.ADAMS4, [
          { f: 328, expr: "neutral", gaze: 1, lean: 4, look: -0.3 },
          { f: EV.BULB4, expr: "awe", gaze: -1, lean: -3, headTilt: 0, dur: 3 },
          { f: 346, expr: "grin", gaze: -0.4, headTilt: 6, armF: "point" },
        ], t, 1);
        if (f >= EV.BULB4) {
          const u = (f - EV.BULB4) / 8, k = q(Math.min(1.4, u), 10), bp: V3 = [S.ADAMS4[0] + 0.05, 2.32, S.ADAMS4[2] + 0.1];
          out.fx.push({ key: `bulb${k}`, cw: 300, ch: 400, draw: (p) => fxBulb(p, k), x: bp[0], y: bp[1], z: bp[2], w: 0.36, h: 0.48, glow: 2.0 });
          sparkle(out, [bp[0], bp[1] + 0.05, bp[2]], f, EV.BULB4, 0.7, 1.6);
          out.lights.push({ p: bp, I: 3 * Math.min(1, u), col: "#ffe08a", d: 5 });
        }
      } else if (f < EV.CUT4) { // bench close-up: the capsule goes on, the bat is not impressed
        const strapped = f >= EV.STRAP4;
        actor(out, cam, 4, ADAMS, "adams", [S.ADAMS4[0] + 0.1, 0, S.ADAMS4[2]], [
          { f: 367, expr: "grin", gaze: 1, lean: 9, look: -0.6, armF: "hang" },
          { f: EV.STRAP4, expr: "proud", gaze: 0.6, lean: 5 },
          { f: EV.MEH4, expr: "nervous", gaze: 1, lean: 4 },
        ], t, -1, (fo) => ({ ...fo, prop: strapped ? null : "tweezers" }));
        const bt = S.BAT4;
        bat(out, cam, 1, [bt[0], bt[1] + 0.15, bt[2]], {
          pose: "sit", size: 0.3, bomb: strapped ? 1 : 0, roll: 0,
          expr: f < 400 ? "open" : f < EV.MEH4 - 2 ? "wide" : "meh", look: f < 400 ? 0.6 : 0, gaze: f < 400 ? -0.8 : f < EV.MEH4 - 2 ? 1 : 0, tilt: f < 400 ? 6 : f < EV.MEH4 - 2 ? -4 : 0,
        }, t);
        if (strapped) sparkle(out, [bt[0] + 0.05, bt[1] + 0.12, bt[2] + 0.05], f, EV.STRAP4, 0.25, 1.4);
      } else { // the planning model: he flies the toy bomber over the little town, toy bats sprinkle down
        const ap: V3 = [SPOT.ADAMS4C[0] + 0.32 * Math.sin((f - 430) / 26), 0, 0.32];
        actor(out, cam, 4, ADAMS, "adams", ap, [
          { f: 430, expr: "grin", lean: 4, look: -1 },
          { f: 452, expr: "proud", headTilt: -5, lean: 6 },                 // "Japan"
          { f: 514, expr: "smile_closed", headTilt: 5 },                    // "wood"
        ], t, -1, (fo) => ({ ...fo, prop: "bomber" }));
        // bomber position on the card (design x ~117, y ~55): offset left 0.395, up 1.99 from the feet
        const rt = cam.right, bomberAt = (g: number): V3 => { const x = SPOT.ADAMS4C[0] + 0.32 * Math.sin((g - 430) / 26); return [x - rt.x * 0.4, 2.0, 0.32 - rt.z * 0.4]; };
        for (let k = 0; k < 30; k++) {
          const g0 = 462 + k * 3, u = (f - g0) / 26;
          if (u < 0 || u >= 1) continue;
          const b0 = bomberAt(g0), p: V3 = [b0[0] + 0.12 * Math.sin(u * 7 + k), lerp(b0[1] - 0.05, SPOT.TABLE_Y + 0.12, easeOut(u)), b0[2] + 0.3 + 0.9 * H(k, 31) * u];
          bat(out, cam, 40 + k, p, { pose: u < 0.85 ? "fly" : "wrap", phase: flap(f, k, 4), size: 0.11, bomb: 1, blink: false, roll: 0.3 * Math.sin(u * 9 + k) }, t);
        }
      }
      break;
    }
    case 5: { // the attic: it flutters in, hangs cosy, the timer ticks... POOF
      const R = S.RIDGE5, hangC: V3 = [R[0] + 0.05, R[1] - 0.02 - 0.24 * 0.2, R[2]];
      if (f < EV.HANG5 - 2) {
        const u = clamp01((f - 547) / (EV.HANG5 - 2 - 547)), p = lerp3([0.95, 1.62, 0.55], [hangC[0], hangC[1] - 0.05, 0.02], easeOut(u));
        bat(out, cam, 1, p, { pose: "fly", phase: flap(f, 1, 4), size: 0.2, bomb: 1, expr: "open", look: -0.6, roll: -0.3 * (1 - u) }, t);
      } else {
        const popped = f >= EV.POOF5, tick = f >= EV.TICK5 && !popped;
        bat(out, cam, 1, hangC, { pose: "hang", size: 0.2, bomb: tick ? 2 : 1, tilt: 0,
          expr: popped ? "pop" : f < 580 ? "happy" : f < EV.TICK5 ? "shut" : f < 618 ? "shut" : "wide", look: 0, blink: !popped && f < 600 }, t);
        if (tick && F % 6 < 3) sparkle(out, [hangC[0] + 0.03, hangC[1] + 0.06, hangC[2] + 0.04], f, EV.TICK5 + 1, 0.06, 1.2);
        if (popped) {
          poof(out, [hangC[0] + 0.02, hangC[1] + 0.1, hangC[2] + 0.04], 0.2, f, EV.POOF5, 14);
          smokeCol(out, [hangC[0], hangC[1] + 0.05, hangC[2] + 0.05], f, 3, 0.16, "#cfc8cc", 4, 0.25, 0.04, 3);
          out.lights.push({ p: [hangC[0], hangC[1], hangC[2] + 0.2], I: 2.5 * Math.max(0, 1 - (f - EV.POOF5) / 10), col: "#ffe8b0", d: 3 });
        }
      }
      break;
    }
    case 6: { // the President's office: he looks over his glasses, grins, slams the stamp
      const sk = f < 702 ? 0 : f < EV.STAMP6 ? smooth((f - 702) / (EV.STAMP6 - 702)) * 0 : 1;
      const raise = f >= 696 && f < EV.STAMP6 - 3, k = raise ? 0 : f < EV.STAMP6 ? 0.5 : f < 724 ? 1 : 1 - smooth((f - 724) / 8) * 0.6;
      void sk;
      actor(out, cam, 6, PRESIDENT, "president", S.PRES6, [
        { f: 653, expr: "stern", gaze: 1, lean: 5, look: -0.2, headTilt: -4 },   // over his glasses at the drawing
        { f: 680, expr: "neutral", gaze: 0.6, headTilt: 5 },
        { f: 695, expr: "smile", gaze: 0, look: 0.6 },
        { f: 703, expr: "grin", lean: -3 },
        { f: EV.STAMP6, expr: "laugh", lean: 6, headTilt: -4, dur: 3 },
      ], t, -1, (fo) => ({ ...fo, prop: f >= 690 ? ["stamp", k] : null }));
      actor(out, cam, 7, ADAMS, "adams", S.ADAMS6, [
        { f: 653, expr: "nervous", look: -1, lean: 3, shrug: 0.4 },
        { f: 688, expr: "nervous", headTilt: 6 },
        { f: EV.STAMP6, expr: "shock", lean: -6, shrug: 1, dur: 3 },
        { f: EV.YES6 + 4, expr: "relief_open", lean: 2, shrug: 0, armF: "up", armB: "up" },
      ], t, 1, (fo) => ({ ...fo, sweat: sweatAt(f, 662) ?? sweatAt(f, 690) }));
      if (f >= EV.STAMP6) { // the red ink mark on the drawing (shapes only, no words)
        const [px, py, pz] = S.PAPER6;
        out.fx.push({ key: "stampmark", cw: 256, ch: 160, draw: stampMark, x: px + 0.02, y: py + 0.004, z: pz + 0.02, w: 0.2, h: 0.12, flat: true, rot: 0.12 });
        sparkle(out, [px, py + 0.08, pz + 0.05], f, EV.STAMP6 + 1, 0.4, 1.4);
      }
      break;
    }
    case 7: { // the lab: the chemist shows the tiny capsule; the bat tries one on, flexes, thumbs up
      actor(out, cam, 8, CHEMIST, "chemist", S.CHEM7, [
        { f: 733, expr: "smile", look: -1, lean: 3 },
        { f: 764, expr: "proud", headTilt: -5 },                          // "napalm"
        { f: 781, expr: "grin", headTilt: 4 },                            // "designed"
        { f: EV.TWEEZ7 - 4, expr: "awe", gaze: -1, lean: -2, look: 0.4 },
        { f: 812, expr: "smile_closed", gaze: 0.6, look: -1, lean: 5 },   // "small"
        { f: EV.FLEX7, expr: "laugh", headTilt: 6 },
      ], t, -1, (fo) => ({ ...fo, prop: f >= 790 && f < EV.FIT7 - 6 ? "tweezers" : null }));
      const fitted = f >= EV.FIT7, b7 = S.BAT7;
      bat(out, cam, 2, [b7[0], b7[1] + 0.15, b7[2]], {
        pose: f >= EV.FLEX7 + 4 ? "thumbs" : f >= EV.FLEX7 - 2 ? "flex" : "sit", size: 0.3, bomb: fitted ? 1 : 0,
        expr: f < 800 ? "open" : f < EV.FIT7 ? "wide" : f < 838 ? "happy" : f < EV.FLEX7 + 4 ? "smug" : "wink",
        look: f < EV.FIT7 ? 0.7 : 0, gaze: f < 800 ? -0.4 : f < EV.FIT7 ? -1 : f < 838 ? 0.8 : 0, tilt: f < EV.FIT7 ? 8 : f < 838 ? -6 : 0,
      }, t);
      if (fitted) sparkle(out, [b7[0] - 0.02, b7[1] + 0.12, b7[2] + 0.05], f, EV.FIT7, 0.25, 1.4);
      if (f >= EV.FLEX7) sparkle(out, [b7[0] + 0.12, b7[1] + 0.3, b7[2] + 0.05], f, EV.FLEX7, 0.2, 1.5);
      break;
    }
    case 8: { // the test base: two soldiers carry the crate; the lid pops, the armed bats escape
      const c = rig.crate.pos, walking = f < 928, ph = (c[0] / 0.8) % 1;
      const carry = (dx: number, i: number, o: Outfit, key: string, facing: -1 | 1) => actor(out, cam, i, o, key, [c[0] + dx, 0, c[2] + 0.02], [
        { f: 853, expr: "smile", look: -0.5, lean: 3 },
        { f: EV.CRATE8, expr: "proud", headTilt: 4 },
        { f: EV.LID8, expr: "shock", lean: -6, shrug: 1, gaze: -0.6, dur: 3 },
        { f: EV.ESCAPE8 + 6, expr: i === 9 ? "yell" : "jawdrop", gaze: -1 },
      ], t, facing, (fo) => ({ ...fo, mode: walking ? "stroll" : "stand", phase: ph + (i === 9 ? 0.5 : 0), armR: f < EV.LID8 ? "out" : i === 9 && f >= 960 ? (f < 968 ? "up" : "point") : "shrug",
        armL: f < EV.LID8 ? "out" : "shrug" }));
      carry(-0.72, 9, SOLDIER, "soldier", 1); carry(0.72, 10, SOLDIER2, "soldier2", -1);
      if (f >= EV.LID8) poof(out, [c[0], c[1] + 0.5, c[2] + 0.1], 1.2, f, EV.LID8, 10);
      for (let i = 0; i < 9; i++) {
        const u = (f - EV.ESCAPE8 - i * 1.3) / FPS;
        if (u <= 0) continue;
        const a = i * 2.2 + u * 3, p: V3 = [c[0] - 0.2 + (i - 4) * 0.25 * u * 3 + Math.cos(a) * 0.5, c[1] + 0.6 + 2.6 * u + 0.4 * Math.sin(a), c[2] + Math.sin(a) * 0.8 + 0.6 * u];
        bat(out, cam, 60 + i, p, { pose: "fly", phase: flap(f, i, 4), bomb: 2, size: 0.42, expr: i % 3 === 0 ? "grin" : "open", roll: 0.4 * Math.sin(a) }, t);
      }
      break;
    }
    case 9: { // one bat looks for the nearest dark place: under the step (sniff, no), behind the crates (sniff, no), the tank
      // audio/cues.md: sniffs @998, @1044, @1106; the head shake @1053
      const p = bat9At(f), sniff1 = (f >= 996 && f < 1006) || (f >= 1104 && f < 1110), no1 = f >= 1006 && f < 1016, sniff2 = f >= 1042 && f < 1052, no2 = f >= 1052 && f < 1064;
      const shake = no2 ? 16 * Math.sin((f - 1052) * 1.4) : 0;
      const nxt = bat9At(f + 4), dir = (nxt[0] - p[0]) * cam.right.x + (nxt[2] - p[2]) * cam.right.z;
      bat(out, cam, 3, p, { pose: "fly", phase: flap(f, 3, sniff1 || sniff2 ? 7 : 5), bomb: 2, size: 0.4, expr: sniff1 || sniff2 ? "sniff" : no1 || no2 ? "meh" : "open",
        look: sniff1 || sniff2 ? 0 : clamp01(Math.abs(dir) * 4) * Math.sign(dir), tilt: shake, roll: -0.25 * clamp01(Math.abs(dir) * 3) * Math.sign(dir) }, t);
      break;
    }
    case 10: { // under the fuel tank: five bats in a neat row, timers ticking, all grin
      for (let k = 0; k < 5; k++) {
        const p: V3 = [S.TANK[0] + 2.6 - 0.55 * k, 2.12 - 0.06 - 0.23 * 0.5, S.TANK[2] + 1.05];
        const g = 1138 + k * 2; // the grin chorus (audio/cues.md bats_giggle @1144)
        bat(out, cam, 70 + k, p, { pose: "hang", size: 0.5, bomb: 2, expr: f < g ? "open" : "grin", look: 0, gaze: 0, tilt: 3 * Math.sin(f * 0.15 + k) }, t);
      }
      break;
    }
    case 11: { // WHOOMP: the tank goes up in a cartoon fireball; the bats flutter out and cheer
      const Tk = S.TANK, c: V3 = [Tk[0], S.TANK_Y, Tk[2] + 1];
      fireball(out, c, 15, f, EV.TANK11 - 2, 34, 1);
      fireball(out, [c[0] - 3, c[1] + 2, c[2] - 1], 10, f, EV.TANK11 + 3, 30, 2);
      fireball(out, [c[0] + 3.5, c[1] + 1.5, c[2] - 0.5], 9, f, EV.TANK11 + 5, 30, 3);
      if (f >= EV.TANK11) {
        const u = (f - EV.TANK11) / 30;
        out.lights.push({ p: [c[0], c[1] + 2, c[2] + 5], I: 60 * Math.max(0.2, 1 - u), col: "#ff9a40", d: 80 });
        if (f >= EV.TANK11 + 12) { smokeCol(out, [c[0], c[1] + 4, c[2]], f, 7, 6, SMOKE_D, 4, 3.0, 0.8, 1); for (const dx of [-3.5, 0, 3.5]) flame(out, [c[0] + dx, 0.2, c[2]], 3.2, f, 11 + dx, 2.0); }
        for (let k = 0; k < 5; k++) {
          const v = (f - EV.TANK11 - 4 - k * 2) / FPS;
          if (v <= 0) continue;
          const w = easeOut(v / 0.9), p: V3 = lerp3([c[0] + 2.6 - 0.55 * k, 1.9, c[2] + 1.2], [3.5 + 1.6 * k, 3.2 + 0.9 * (k % 3) + 0.2 * Math.sin(v * 9 + k), 13 + 0.8 * (k % 2)], w);
          bat(out, cam, 70 + k, p, { pose: v > 0.3 ? "cheer" : "fly", phase: flap(f, k, 4), bomb: 0, size: 0.9, expr: "grin", roll: 0.2 * Math.sin(v * 5 + k) }, t);
        }
      }
      break;
    }
    case 12: { // the fire spreads: barracks and hangar roofs burn, the bucket line (one bucket is empty), crane up
      const F0 = 1215, roofs: V3[] = [[-23, 11.4, -18], [-18, 11.8, -20], [-13, 11.3, -19], [-25, 7.6, -15], [-11, 7.6, -15],
        [5, 5.2, -9.5], [9, 5.6, -10], [14, 5.2, -9.6], [22, 5.2, -12], [27, 5.6, -13], [32, 5.2, -14], [9, 5.2, -23], [15, 5.6, -24]];
      roofs.forEach((r, k) => { fireAt(out, r, 2.6 + 1.2 * H(k, 41), f, F0 - 20 + k * 6, k); if (f > F0 + k * 6) smokeCol(out, [r[0], r[1] + 2, r[2]], f, 4, 3.2, SMOKE, 6, 2.2, 0.8, k); });
      const T0 = S.TANK; for (const dx of [-3.5, 0, 3.5]) flame(out, [T0[0] + dx, 0.2, T0[2]], 3, f, 21 + dx, 2.0);
      smokeCol(out, [T0[0], 6, T0[2]], f, 6, 5, SMOKE_D, 5, 2.6, 0.6, 9);
      for (const p of [[-18, 9, -16], [12, 6, -10], [-3, 4, 4]] as V3[]) out.lights.push({ p: [p[0], p[1], p[2] + 3], I: 26, col: "#ff9a40", d: 60 });
      const line: V3[] = [[11.2, 0, 15.0], [9.9, 0, 14.0], [8.6, 0, 13.0], [7.3, 0, 12.0]];
      line.forEach((p, k) => {
        const last = k === 3, swing = [1222, 1236, 1262].some((g) => Math.abs(f - g - k * 2) < 4); // bucket clanks (audio/cues.md)
        actor(out, cam, 11 + k, k % 2 ? SOLDIER2 : SOLDIER, k % 2 ? "soldier2" : "soldier", p, [
          { f: F0, expr: last ? "stern" : "pained", lean: 6, look: -1 },
          { f: 1257, expr: last ? "blank" : "nervous", gaze: last ? 1 : 0, headTilt: last ? -8 : 4 },
          { f: 1274, expr: last ? "pained" : "yell", lean: -3 },
        ], t, -1, (fo) => ({ ...fo, prop: last ? (f >= 1288 ? "bucketTip" : "bucket") : "bucket", armR: last ? undefined : swing ? "out" : "hang", sweat: sweatAt(f, 1230 + 9 * k) }));
      });
      break;
    }
    case 13: {
      if (f < EV.CUT13) { // smoky glide past the burnt hangar frame
        const [hx, , hz] = S.HANGAR;
        for (let k = 0; k < 7; k++) smokeCol(out, [hx - 8 + 3 * k, 0.6, hz + (k % 2 ? 4 : -2)], f, 5, 3.5, k % 2 ? SMOKE : SMOKE_D, 7, 1.6, 0.9, k * 3);
        for (let k = 0; k < 4; k++) flame(out, [hx - 6 + 4 * k, 0.1, hz + 3 - 2 * (k % 2)], 1.2, f, 31 + k, 1.8);
        smokeCol(out, [S.TANK[0], 1, S.TANK[2]], f, 6, 4, SMOKE_D, 6, 2, 0.7, 5);
        out.lights.push({ p: [hx, 2, hz + 6], I: 14, col: "#ff8a3a", d: 40 });
      } else { // the General polishes his shiny car... POOF: a charred shell, his moustache singed and smoking
        const Cr = S.CAR, gp: V3 = [Cr[0] + 0.25, 0, Cr[2] + 1.45], charred = f >= EV.CHAR13;
        actor(out, cam, 14, charred ? GENERAL_SINGED : GENERAL, charred ? "generalS" : "general", gp, [
          { f: EV.CUT13, expr: "smile_closed", lean: 8, look: -1, headTilt: 4 },
          { f: 1380, expr: "proud", headTilt: -5, lean: 6 },
          { f: EV.CHAR13, expr: "blank", lean: 0, look: 0, headTilt: 0, dur: 2 },
          { f: EV.KICK13 + 6, expr: "pained", shrug: 1, headTilt: -6 },
        ], t, -1, (fo) => ({ ...fo, prop: "cloth", wave: charred ? 0 : q((f / 10) % 1, 8), hatLift: charred ? 0.12 : 0, hatTilt: charred ? -0.1 : 0 }));
        if (charred) {
          poof(out, [Cr[0], 1.0, Cr[2] + 0.6], 5.2, f, EV.CHAR13, 16);
          smokeCol(out, [Cr[0] - 0.8, 1.2, Cr[2]], f, 5, 1.4, SMOKE_D, 5, 1.2, 0.3, 2);
          smokeCol(out, [gp[0] - 0.12, 1.48, gp[2] + 0.1], f, 4, 0.22, "#bcb4b8", 4, 0.45, 0.05, 6); // the moustache smokes
        }
      }
      break;
    }
    case 14: { // the office: weighing the folder over the money bags, a sigh, into the wastebasket; a bat asleep in the tray
      const op = S.OFFICER14, drop = f >= 1484, turned = f >= 1474;
      const wk = f >= EV.WEIGH14[0] && f < EV.WEIGH14[1] ? 0.5 + 0.5 * Math.sin((f - EV.WEIGH14[0]) * 0.6) : 0.4;
      actor(out, cam, 15, OFFICER, "officer", op, [
        { f: 1418, expr: "stern", look: -1, gaze: 1, lean: 5 },
        { f: 1438, expr: "pained", headTilt: -6 },                        // "million"
        { f: 1452, expr: "blank", shrug: 1, headTilt: 7, lean: -2 },      // the sigh
        { f: 1466, expr: "annoyed", shrug: 0, look: 1, headTilt: 0 },     // "project"
        { f: EV.DROP14, expr: "stern", lean: 6, gaze: 1 },                // "cancelled"
      ], t, turned ? 1 : -1, (fo) => ({ ...fo, prop: drop ? null : "folder", armL: !turned ? ["hold", "out", q(wk, 10)] as ArmSpec : undefined, armR: turned && !drop ? "out" : undefined, sweat: sweatAt(f, 1440) }));
      if (drop) { // the folder falls into the basket (thunk), then sticks out of it
        const u = clamp01((f - 1484) / (EV.DROP14 - 1484)), B = S.BASKET14;
        const p: V3 = f < EV.DROP14 ? [lerp(op[0] + 0.55, B[0], u), lerp(1.05, 0.45, u * u), lerp(op[2] + 0.2, B[2], u)] : [B[0] - 0.02, 0.44, B[2]];
        out.places.push({ key: "folderItem", draw: folderItem, x: p[0], y: p[1], z: p[2], scale: 0.42, sq: true, billboard: true, roll: f < EV.DROP14 ? -0.6 * u : 0.15, size: [256, 256, 256 / 600] });
        if (f >= EV.DROP14) poof(out, [B[0], 0.5, B[2] + 0.1], 0.5, f, EV.DROP14, 10);
      }
      const tr = S.TRAY14;
      bat(out, cam, 4, [tr[0], tr[1] + 0.07, tr[2] + 0.02], { pose: "sleep", size: 0.2, expr: "shut", bomb: 0, blink: false, tilt: 0 }, t);
      break;
    }
    case 15: { // moonlit cave: the ribbon streams out across the moon; the medal bat on the lip turns, smug, and winks
      for (let i = 0; i < 380; i++) {
        const sp = ((f - 1490) / FPS * (0.11 + 0.05 * H(i, 51)) + H(i, 52)) % 1;
        const c = ribbonAt(15, sp), a = i * 2.39996 + f * 0.14 + sp * 10, r = 0.5 + 5.5 * sp * sp + 0.6 * sp;
        const p: V3 = [c[0] + r * Math.cos(a), c[1] + 0.5 * r * Math.sin(a), c[2] + r * Math.sin(a) * 0.7];
        if (cam.pos.distanceTo(_cp.set(p[0], p[1], p[2])) < 4.2) continue;
        bat(out, cam, 100 + i, p, { pose: "fly", phase: flap(f, i), size: 0.55, roll: 0.4 * Math.cos(a), blink: false }, t);
      }
      const L = S.LIP15, bp: V3 = [L[0], L[1] - 0.24 * 0.36, L[2]];
      bat(out, cam, 5, bp, { pose: "hang", size: 0.36, medal: true, bomb: 0,
        expr: f < EV.TURN15 - 2 ? "happy" : f < EV.WINK15 - 1 ? "smug" : f < EV.WINK15 + 14 ? "wink" : "smug",
        look: f < EV.TURN15 - 2 ? 0.9 : 0, tilt: f < EV.TURN15 - 2 ? -10 + 3 * Math.sin(f * 0.08) : 4 * smooth((EV.TURN15 + 6 - f) / 6), blink: f < EV.TURN15 - 4 }, t);
      break;
    }
  }
  return out;
};
/** red ink mark of the approval stamp: a bordered blob with two bars (no letters), slightly smudged */
const stampMark = (p: Pen) => {
  const g = p.g;
  g.globalAlpha = 0.9; g.strokeStyle = "#d42f2f"; g.lineWidth = 12; g.lineJoin = "round";
  g.beginPath(); g.ellipse(128, 80, 104, 58, -0.08, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#d42f2f"; g.fillRect(62, 58, 132, 14); g.fillRect(74, 88, 108, 14);
  g.globalAlpha = 0.35; g.beginPath(); g.ellipse(128, 80, 84, 40, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
};
/** the cancelled project's folder as a lit card item (manila, bulging papers, a red tab) */
const folderItem = (p: Pen) => {
  const g = p.g;
  g.save(); g.translate(300, 300); g.rotate(-0.2); g.translate(-300, -300);
  g.lineJoin = "round"; g.lineWidth = 14; g.strokeStyle = "#241726";
  g.fillStyle = "#f4efe2"; g.fillRect(150, 196, 300, 190); g.strokeRect(150, 196, 300, 190);
  g.fillStyle = "#e8c47a"; g.fillRect(130, 220, 340, 200); g.strokeRect(130, 220, 340, 200);
  g.fillStyle = "#c0353a"; g.fillRect(380, 196, 60, 30); g.strokeRect(380, 196, 60, 30);
  g.restore();
};
