// Our cast as lit flat sprites in the 3D world (owner: characters, with toon.ts / cardshade.ts). Each frame every
// character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing. Characters are
// yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward the sun, painted crescent in
// the drawing); standing ones get a soft multiply contact blob. Effects (letters, flames, smoke, dust, the explosion)
// are unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
// CONTRACT with world.ts: stage(id, t, cam, mis) -> { places, fx }; Pool / Actor / Fx draw them.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxBurst, fxContact, fxShadow, fxLetter, fxFlame, fxSmoke, fxBoom, Outfit, Expr, FrontOpts, SideOpts,
  SAILOR, POSTMASTER, CLERK, POSTMAN, KID59, VISITORS, Prop, ArmPose, ArmSpec, fxSparkle, fxSpeed,
} from "./toon";
import {
  FPS, SHOTS, SPOT, V3, Light, MissilePose, missileAt, noseDir, smooth, clamp01, LAUNCH_F, TOUCH_F, HIT_F, GO_F, BOOM_F, BOOM_AT,
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
const CONTACT: Record<string, [number, number, number]> = { day: [0.62, 0.6, 0.66], golden: [0.58, 0.54, 0.66], morning: [0.6, 0.57, 0.67],
  dusk: [0.58, 0.55, 0.66], interior: [0.64, 0.6, 0.64], gallery: [0.64, 0.6, 0.64] };
const TAIL: [number, number, number] = [0.72, 0.7, 0.78];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day" || LNAME === "interior" || (LNAME as string) === "gallery") {
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
export type Stage = { places: Place[]; fx: FxPlace[] };
/** the missile as world.ts posed it this frame: pose, world nose direction, nozzle world points */
export type MissileInfo = { pose: MissilePose; dir: THREE.Vector3; tail: THREE.Vector3; boosterTails: THREE.Vector3[] };
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
/** sparkle burst (on ones) over a point, 20 f long, starting at frame f0 */
const sparkle = (out: Stage, c: V3, f: number, f0: number, size = 0.9) => {
  const u = (f - f0) / 20;
  if (u <= 0 || u >= 1) return;
  const k = q(u, 20);
  out.fx.push({ key: `spark${k}`, cw: 400, ch: 400, draw: (p) => fxSparkle(p, k), x: c[0], y: c[1], z: c[2], w: size, h: size, glow: 1.3 });
};
/** sweat drop progress for a 14 f slide starting at frame f0 */
const sweatAt = (f: number, f0: number) => { const u = (f - f0) / 14; return u > 0 && u < 1 ? q(u, 14) : undefined; };
/** screen roll that makes a card's canvas "down" point along world direction v */
const rollAlong = (cam: CamInfo, v: THREE.Vector3) => Math.atan2(v.dot(cam.right), -v.dot(cam.up));
const _v = new THREE.Vector3();

/** exhaust flame at a nozzle, plume along -dir */
const flame = (out: Stage, cam: CamInfo, at3: THREE.Vector3, dir: THREE.Vector3, t: number, len: number) => {
  const back = _v.copy(dir).multiplyScalar(-1);
  const ph = q((t * 3.7) % 1, 6);
  out.fx.push({ key: `flame${ph}`, cw: 300, ch: 600, draw: (p) => fxFlame(p, ph), x: at3.x - dir.x * len * 0.45, y: at3.y - dir.y * len * 0.45, z: at3.z - dir.z * len * 0.45,
    w: len * 0.5, h: len, rot: rollAlong(cam, back), glow: 2.2 });
};
/** letters streaming back from a point (missile-relative: the camera rides along, so they peel away behind it) */
const letterStream = (out: Stage, from: THREE.Vector3, dir: THREE.Vector3, t: number, n: number, spread: number) => {
  for (let i = 0; i < n; i++) {
    const age = (t * 0.9 + i / n) % 1, side = Math.sin(i * 12.9898) * spread;
    const x = from.x - dir.x * age * 9 + Math.sin(age * 9 + i) * 0.4, y = from.y - dir.y * age * 9 - age * age * 2.5 + Math.cos(age * 7 + i) * 0.3;
    const z = from.z - dir.z * age * 9 + side * age;
    const s = 0.42 * Math.min(1, age * 6);
    out.fx.push({ key: `letter${i % 4}`, cw: 300, ch: 200, draw: (p) => fxLetter(p, i % 4), x, y, z, w: s, h: s * 0.67, rot: age * 7 + i });
  }
};
/** letters raining / fluttering down around a point (after the puff, at the house hole, over the sacks) */
const letterRain = (out: Stage, c: V3, t0: number, t: number, n: number, r: number, size = 0.42, fall = 1.6) => {
  const s = t - t0;
  if (s < 0) return;
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996, rr = r * Math.sqrt((i + 0.5) / n) * Math.min(1, 0.4 + s * 1.5);
    const x = c[0] + Math.cos(a) * rr + 0.3 * Math.sin(s * 3 + i), z = c[2] + Math.sin(a) * rr * 0.6;
    const y = c[1] + 0.6 * r * Math.max(0, 0.5 - s) - fall * s + 0.25 * Math.sin(s * 4 + i * 1.7);
    if (y < 0.05) continue;
    out.fx.push({ key: `letter${i % 4}`, cw: 300, ch: 200, draw: (p) => fxLetter(p, i % 4), x, y, z, w: size, h: size * 0.67, rot: Math.sin(s * 5 + i) * 1.2 + i });
  }
};
/** soft smoke puff at a point, t since spawn (seconds), grows to size */
const puff = (out: Stage, c: V3, s: number, size: number, life: number, seed: number, tint = "#ece8ea") => {
  if (s < 0 || s > life) return;
  const u = q(s / life, 20);
  out.fx.push({ key: `smoke${u}|${seed % 3}|${tint}`, cw: 400, ch: 400, draw: (p) => fxSmoke(p, u, seed % 3, tint), x: c[0], y: c[1] + size * 0.25 * u, z: c[2],
    w: size * (0.6 + 0.4 * u), h: size * (0.6 + 0.4 * u), soft: true });
};

// ---------------- per-shot staging ----------------
/** everything with a face, and every effect card, in shot `id` at time t (pure function of id + t) */
export const stage = (id: number, t: number, cam: CamInfo, mis: MissileInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = t * FPS, mp = mis.pose;
  LNAME = s.light;
  findSun(cam, SUN);
  // engine flames wherever the missile is burning
  if (mp.visible && mp.flame > 0) {
    flame(out, cam, mis.tail, mis.dir, t, 2.6 * mp.flame + 0.6);
    if (mp.booster) for (const bt of mis.boosterTails) flame(out, cam, bt, mis.dir, t + 0.3, 4.2 * mp.flame);
  }
  // thin translucent speed lines behind the tail, only where the flight is side-on (verify_r1 #4/#5: none on 1 / 13)
  const sideOn = Math.hypot(mis.dir.dot(cam.up), mis.dir.dot(cam.right)) > 0.5;
  if (mp.visible && id === 7 && sideOn) {
    const ph = q((t * 30) % 30 / 30, 30), c = mis.tail.clone().addScaledVector(mis.dir, -4.5);
    out.fx.push({ key: `speed${ph}`, cw: 600, ch: 300, draw: (p) => fxSpeed(p, ph), x: c.x, y: c.y, z: c.z, w: 7, h: 2.6,
      rot: Math.atan2(mis.dir.dot(cam.up), mis.dir.dot(cam.right)) });
  }
  switch (id) {
    case 1: { // the hook: a sailor RIDES the mail missile, astride the fuselage, waving fistfuls of letters into the wind
      letterStream(out, mis.tail.clone().addScaledVector(mis.dir, 2.5), mis.dir, t, 16, 1.6);
      const seat = new THREE.Vector3(...mp.pos).addScaledVector(mis.dir, -0.4), p1: V3 = [seat.x, seat.y + 0.5, seat.z];
      const nose = seat.clone().addScaledVector(mis.dir, 5), rf = faceTo(cam, p1, nose);
      const A = act([
        { f: 0, expr: "grin", armF: "wave", lean: 6 },
        { f: 7, expr: "laugh", headTilt: 6 },                                  // "1959"
        { f: 40, armB: "up", headTilt: -4, expr: "grin" },                     // "United States"
        { f: 58, expr: "proud", armB: "hang", lean: 9 },                       // "delivered"
        { f: 74, expr: "grin", armF: "up", headTilt: 5 },                      // "mail"
        { f: 86, expr: "shock", shrug: 1, lean: -4, armF: "hang", dur: 4 },    // "cruise": a gust
        { f: 95, expr: "laugh", shrug: 0, armF: "up", armB: "up", lean: 4 },   // "missile"
      ], Math.round(f), rf, 9);
      const fo: FrontOpts = { ...A.fo, mode: "sit", facing: rf, prop: "letters", blink: lidAt(t, 9, A.swaps) };
      out.places.push(person(cam, { i: 9, o: SAILOR, okey: "rider" }, p1[0], p1[1], p1[2], { side: false, mirror: false }, fo, {}, 1.5));
      break;
    }
    case 2: { // post office: the postmaster general taps his watch at the clerk, then jabs a finger; the clerk sweats + shrugs
      const pf = faceTo(cam, SPOT.PMG2, SPOT.CLERK), cf = faceTo(cam, SPOT.CLERK, SPOT.PMG2);
      actor(out, cam, 1, POSTMASTER, "pmg", SPOT.PMG2, [
        { f: 118, expr: "annoyed", gaze: 0.8, headTilt: -4 },
        { f: 130, look: 1, gaze: 0, headTilt: 3 },                         // "office": looks up at the clerk
        { f: 138, expr: "stern", lean: 6 },                                // "wanted"
        { f: 148, expr: "speak", armF: "point", headTilt: 7, lean: 8 },    // "faster"
        { f: 162, expr: "annoyed", armF: "hip", lean: 3, headTilt: -5 },   // "mail"
      ], t, pf, (fo) => ({ ...fo, prop: f < 146 ? "watch" : null, ...(f < 146 ? { armR: undefined, armL: undefined } : {}),
        expr: f >= 146 && f < 162 ? talk(t, 146 / FPS, 162 / FPS, "stern") : fo.expr }));
      actor(out, cam, 2, CLERK, "clerk", SPOT.CLERK, [
        { f: 120, expr: "neutral", look: 0.6 },
        { f: 132, expr: "nervous", look: 1, lean: -3 },                    // the boss turns on him
        { f: 150, armF: "shrug", armB: "shrug", shrug: 1, headTilt: -7 },  // "faster"
        { f: 164, expr: "pained", look: -0.6, shrug: 0.3, armF: "hang", armB: "hang", headTilt: 4 }, // "mail"
      ], t, cf, (fo) => ({ ...fo, prop: f < 148 ? "letter" : null, sweat: sweatAt(f, 138) }));
      break;
    }
    case 3: { // tiny sailor on the deck for scale, waving
      const p3: V3 = [-8.2, SPOT.DECK, 1.0];
      actor(out, cam, 3, SAILOR, "sailor", p3, [
        { f: 176, expr: "smile", armF: "wave" },
        { f: 183, expr: "grin", headTilt: 5 },                             // "Navy"
        { f: 199, headTilt: -4, look: 1 },                                 // "submarine"
        { f: 217, expr: "proud", armF: "point", lean: 5 },                 // "missile"
        { f: 232, expr: "grin", armF: "wave", lean: 0 },
      ], t, faceTo(cam, p3, mp.pos));
      break;
    }
    case 4: { // proud sailor beside the missile; points at it on "Barbero"
      const p4 = SPOT.SAILOR4;
      actor(out, cam, 3, SAILOR, "sailor", p4, [
        { f: 249, expr: "smile", look: 0.5 },
        { f: 257, armB: "hip" },                                           // "June"
        { f: 270, look: 1, headTilt: 5 },                                  // "8th": glances at the missile
        { f: 292, expr: "smile_closed", headTilt: -4, look: 0 },           // "coast"
        { f: 304, expr: "grin", armF: "wave" },                            // "Florida"
        { f: 331, expr: "proud", armF: "point", lean: 6, look: 1 },        // "Barbero"
        { f: 347, expr: "grin", lean: 2, headTilt: 6 },                    // "loaded"
        { f: 359, armF: "up", expr: "laugh", look: -0.3, headTilt: -3 },   // "missile"
      ], t, faceTo(cam, p4, mp.pos));
      break;
    }
    case 5: { // stuffing letters into the nose intake; a burst of letters on "3,000 letters"
      const k = q(0.5 + 0.5 * Math.sin(t * 7), 10);
      actor(out, cam, 3, SAILOR, "sailor", SPOT.SAILOR5, [
        { f: 374, expr: "smile_closed" },
        { f: 387, expr: "stern", headTilt: -7 },                           // "of a warhead": head shake
        { f: 394, headTilt: 7, dur: 4 },
        { f: 401, headTilt: -5, dur: 4 },
        { f: 410, expr: "grin", lean: 5, headTilt: 0 },                    // "carried"
        { f: 418, expr: "proud", armB: "up", headTilt: 5 },                // "3,000"
        { f: 443, expr: "laugh", armB: "hang", lean: 2 },                  // "letters"
      ], t, 1, (fo) => ({ ...fo, prop: "letters", wave: k, armR: undefined }));
      sparkle(out, [SPOT.SAILOR5[0] + 0.3, SPOT.DECK + 2.4, SPOT.SAILOR5[2]], f, 418);
      const nose = new THREE.Vector3(...mp.pos).addScaledVector(mis.dir, 4.4);
      for (let i = 0; i < 6; i++) { // letters hop from his hand into the intake
        const u = (t * 1.6 + i / 6) % 1, hand: V3 = [SPOT.SAILOR5[0] + 0.25, SPOT.DECK + 1.95, SPOT.SAILOR5[2] - 0.05];
        const x = hand[0] + (nose.x - hand[0]) * u, y = hand[1] + (nose.y - hand[1]) * u + 0.5 * Math.sin(Math.PI * u), z = hand[2] + (nose.z - hand[2]) * u;
        out.fx.push({ key: `letter${i % 4}`, cw: 300, ch: 200, draw: (p) => fxLetter(p, i % 4), x, y, z, w: 0.26 * (1 - 0.5 * u), h: 0.17 * (1 - 0.5 * u), rot: u * 4 + i });
      }
      if (t > 418 / FPS) letterRain(out, [nose.x + 0.6, nose.y + 0.6, nose.z + 0.4], 418 / FPS, t, 10, 1.2, 0.26, 0.9);
      break;
    }
    case 6: { // launch: kick-off burst, smoke clouds left along the rail and the climb
      const s0 = t - LAUNCH_F / FPS;
      if (s0 >= 0 && s0 < 0.3) { const u = q(s0 / 0.3, 30); out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#ffe9a0"), x: mis.tail.x, y: mis.tail.y, z: mis.tail.z, w: 5, h: 5, glow: 1.6 }); }
      for (let k = 0; k < 8; k++) {
        const fs = LAUNCH_F + k * 3, m = missileAt(6, fs), d = noseDir(m.yaw, m.pitch);
        puff(out, [m.pos[0] - d[0] * 5, m.pos[1] - d[1] * 5 - 0.3, m.pos[2] - d[2] * 5 + (k % 2 ? 0.6 : -0.6)], t - fs / FPS, 4 + k * 0.8, 3.0, k);
      }
      break;
    }
    case 7: break;
    case 8: { // touchdown dust + tyre smoke
      const s0 = t - TOUCH_F / FPS;
      for (let k = 0; k < 3; k++) puff(out, [mp.pos[0] - 1.5 - k * 2.5 * Math.min(1, s0), 0.5, (k - 1) * 0.9], s0 - k * 0.08, 2.6, 1.4, k, "#e6dcc8");
      break;
    }
    case 9: { // the speech: arm up on "historic", both arms out on "entire world"; the sailor salutes, then cheers
      actor(out, cam, 1, POSTMASTER, "pmg", SPOT.PMG9, [
        { f: 659, expr: "proud" },
        { f: 668, look: 0.6, headTilt: 4 },                                // "postmaster"
        { f: 683, armB: "hip", lean: -3 },                                 // "general"
        { f: 696, lean: 4, headTilt: -3, look: 0 },                        // "called"
        { f: 709, expr: "grin", armF: "up", headTilt: 8, lean: 2 },        // "historic"
        { f: 733, armF: "hang", expr: "proud", headTilt: 0 },              // "for the"
        { f: 754, expr: "grin", armF: "out", armB: "out", lean: 0, headTilt: -5 }, // "entire world"
        { f: 772, armF: "hang", armB: "hip", expr: "proud", headTilt: 3 },
      ], t, 1, (fo) => ({ ...fo, expr: (f >= 707 && f < 722) || f >= 770 ? fo.expr : talk(t, 662 / FPS, 770 / FPS, fo.expr ?? "proud") }));
      sparkle(out, [SPOT.PMG9[0] + 0.5, 2.55, SPOT.PMG9[2]], f, 709, 1.1);
      const sf = faceTo(cam, SPOT.SAILOR9, SPOT.PMG9);
      actor(out, cam, 3, SAILOR, "sailor", SPOT.SAILOR9, [
        { f: 659, expr: "smile", look: 1 },
        { f: 690, expr: "proud", look: 0, headTilt: -3 },
        { f: 712, expr: "grin", headTilt: 5, look: 1 },                    // "historic": turns to the boss
        { f: 750, armF: "up", armB: "up", expr: "laugh", headTilt: 0 },    // "entire world": cheers
        { f: 772, armF: "hang", armB: "hang", expr: "grin" },
      ], t, sf, (fo) => ({ ...fo, salute: f > 690 && f < 748 }));
      break;
    }
    case 10: { // unloading: a sailor carries a sack from the missile to the pile; the postman waves a letter
      const u = smooth((f - 790) / 50), p0: V3 = [1.0, 0, 2.0], p1: V3 = [SPOT.SACKS[0] - 0.6, 0, SPOT.SACKS[2] + 1.3];
      const px: V3 = [p0[0] + (p1[0] - p0[0]) * u, 0, p0[2] + (p1[2] - p0[2]) * u];
      const fs = faceTo(cam, p0, p1), A = act([
        { f: 785, expr: "grin" }, { f: 808, expr: "proud", headTilt: 5 }, { f: 821, expr: "laugh", headTilt: -3 }, { f: 838, expr: "smile_closed" },
      ], Math.round(f), fs, 3);
      out.places.push(person(cam, { i: 3, o: SAILOR, okey: "sailor" }, px[0], 0, px[2], { side: false, mirror: false },
        { ...A.fo, armR: undefined, armL: undefined, mode: u > 0 && u < 1 ? "stroll" : "stand", phase: q((t * 1.6) % 1, 40), prop: "sack", blink: lidAt(t, 3, A.swaps), facing: fs }, {}));
      blob(out, px[0], 0, px[2]);
      const pp: V3 = [SPOT.SACKS[0] + 1.6, 0, SPOT.SACKS[2] + 1.0];
      actor(out, cam, 4, POSTMAN, "postman", pp, [
        { f: 785, expr: "smile", look: 1 },
        { f: 793, expr: "grin", headTilt: 6 },                             // "Luckily"
        { f: 808, expr: "proud", look: 0, headTilt: -2 },                  // "every letter"
        { f: 821, expr: "laugh", armF: "up", lean: 3 },                    // "arrived"
      ], t, faceTo(cam, pp, px), (fo) => ({ ...fo, prop: "letter", wave: q(0.5 + 0.5 * Math.sin(t * 6), 10) }));
      break;
    }
    case 11: { // the missile goes into the house: debris burst, smoke, letters flutter down; the kid at the mailbox
      const s0 = t - HIT_F / FPS, hole: V3 = [-1.7, 2.28, SPOT.HOUSE_Z + 0.2];
      if (s0 >= 0 && s0 < 0.35) { const u = q(s0 / 0.35, 30); out.fx.push({ key: `burstD${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#d8b48a", 12, 40, 240), x: hole[0], y: hole[1], z: hole[2] + 0.3, w: 4.5, h: 4.5 }); }
      for (let k = 0; k < 3; k++) puff(out, [hole[0] + (k - 1) * 0.9, hole[1] + 0.2, hole[2] + 0.5], s0 - k * 0.1, 3.0 + k, 2.4, k, "#ddd6cc");
      letterRain(out, [hole[0] + 0.6, hole[1] + 1.4, hole[2] + 1.6], HIT_F / FPS + 0.1, t, 14, 2.4, 0.4, 0.7);
      const kf = faceTo(cam, SPOT.KID, hole);
      actor(out, cam, 5, KID59, "kid", SPOT.KID, [
        { f: 848, expr: "smile", look: 0.4 },
        { f: HIT_F, expr: "shock", lean: -9, shrug: 1, armF: "up", armB: "up", look: 1, dur: 4 }, // the hit
        { f: 871, expr: "nervous", shrug: 0.4, armF: "hang", armB: "hang", lean: -3 },          // "every delivery"
        { f: 887, expr: "annoyed", armF: "shrug", armB: "shrug", shrug: 1, headTilt: -8 },      // "needed"
        { f: 902, expr: "stern", armF: "point", armB: "hip", shrug: 0, headTilt: 3, look: 1 },  // "a missile"
      ], t, kf, (fo) => ({ ...fo, prop: f < HIT_F ? "letter" : null, sweat: sweatAt(f, 872) }), 0.78);
      break;
    }
    case 12: { // the postman by his overloaded truck: "one truck carries thousands of letters"
      const pf = faceTo(cam, SPOT.POSTMAN12, SPOT.TRUCK);
      actor(out, cam, 4, POSTMAN, "postman", SPOT.POSTMAN12, [
        { f: 931, expr: "smile", look: 0.5, armB: "hip" },                 // "You see"
        { f: 945, expr: "grin", headTilt: 5 },                             // "mail"
        { f: 950, expr: "proud", headTilt: -3 },                           // "cheap"
        { f: 967, armF: "point", lean: 5, look: 1 },                       // "one truck"
        { f: 983, expr: "grin", headTilt: 4 },                             // "carries"
        { f: 992, armF: "up", armB: "up", expr: "laugh", lean: 0, look: 0 }, // "thousands"
        { f: 1010, armF: "hang", armB: "hip", expr: "smile_closed", headTilt: -5 }, // "letters"
        { f: 1028, armF: "point", expr: "smile", look: 1, headTilt: 2 },   // "tank of fuel"
        { f: 1039, armF: "hang", expr: "proud", headTilt: 4, look: 0 },    // "fuel"
      ], t, pf, (fo) => ({ ...fo, prop: "letter" }));
      sparkle(out, [SPOT.POSTMAN12[0], 2.5, SPOT.POSTMAN12[2]], f, 992);
      if (t > 992 / FPS) letterRain(out, [-0.5, 6.2, 0.3], 992 / FPS, t, 10, 2.2, 0.38, 0.5);
      break;
    }
    case 13: { // one trip: launch from the cart, the postman flinches, sweats on "expensive", the puff, letters rain down
      const go = GO_F, boom = BOOM_F, pf = faceTo(cam, SPOT.POSTMAN13, mp.pos);
      actor(out, cam, 4, POSTMAN, "postman", SPOT.POSTMAN13, [
        { f: 1055, expr: "smile", look: 0.5 },
        { f: 1063, armF: "point", lean: 4, look: 1 },                      // "missile"
        { f: 1080, expr: "grin", armF: "hang", headTilt: 5, lean: 0 },     // "very fast"
        { f: go, expr: "shock", lean: -9, shrug: 1, armF: "up", armB: "up", gaze: -1, dur: 4 }, // launch
        { f: 1103, expr: "awe", shrug: 0, armF: "hang", armB: "hang", lean: -2 }, // "very"
        { f: 1107, expr: "nervous", headTilt: -7, gaze: -0.5 },            // "expensive"
        { f: 1121, armF: "shrug", armB: "shrug", shrug: 1, headTilt: 5 },  // "delivery van"
        { f: 1146, expr: "awe", shrug: 0, armF: "hang", armB: "hang", gaze: -1, headTilt: 0 }, // "only"
        { f: boom, expr: "shock", lean: -10, armF: "up", armB: "up", shrug: 1, dur: 4 }, // the puff
        { f: 1172, expr: "pained", armF: "hang", armB: "hip", shrug: 0, lean: 0, gaze: 0, headTilt: -6 }, // "trip"
      ], t, pf, (fo) => ({ ...fo, prop: f < go ? "letter" : null, sweat: sweatAt(f, 1107) }));
      for (let k = 0; k < 6; k++) { const m = missileAt(13, GO_F + k * 2), d = noseDir(m.yaw, m.pitch); puff(out, [m.pos[0] - d[0] * 5, Math.max(0.8, m.pos[1] - d[1] * 5), m.pos[2] - d[2] * 5], t - (GO_F + k * 2) / FPS, 3 + k * 0.6, 2.6, k, "#d8d0dc"); }
      if (mp.boom >= 0) {
        const u = q(Math.min(1, mp.boom / 1.1), 30);
        if (mp.boom < 1.1) out.fx.push({ key: `boom${u}`, cw: 800, ch: 800, draw: (p) => fxBoom(p, u), x: BOOM_AT[0], y: BOOM_AT[1], z: BOOM_AT[2], w: 30, h: 30, glow: u < 0.45 ? 2.0 : 1 });
        letterRain(out, BOOM_AT, boom / FPS + 0.15, t, 24, 14, 1.4, 9);
      }
      break;
    }
    case 14: { // museum visitors: dad points, mum laughs, kid bounces
      const ex = mp.pos;
      actor(out, cam, 6, VISITORS[0], "vis0", SPOT.VISITOR15, [
        { f: 1189, expr: "awe", gaze: -1, look: 1 },
        { f: 1195, armF: "point", lean: 4 },                               // "future"
        { f: 1214, expr: "smile", headTilt: 6, gaze: 0 },                  // "lasted"
        { f: 1225, armF: "hang", expr: "grin", lean: 0 },                  // "exactly"
        { f: 1239, expr: "laugh", armB: "hip", headTilt: -4 },             // "one flight"
        { f: 1255, expr: "smile_closed" },
      ], t, faceTo(cam, SPOT.VISITOR15, ex));
      const p1: V3 = [-0.35, 0, 10.4], p2: V3 = [3.5, 0, 6.3]; // mum = big FG figure, left third of the wide
      actor(out, cam, 7, VISITORS[1], "vis1", p1, [
        { f: 1189, expr: "smile", look: 1 },
        { f: 1203, headTilt: -6 },                                         // "of mail"
        { f: 1225, expr: "grin", armB: "hip", look: 0 },                   // "exactly"
        { f: 1248, expr: "laugh", headTilt: 5 },                           // "flight"
      ], t, faceTo(cam, p1, ex));
      actor(out, cam, 8, VISITORS[2], "vis2", p2, [
        { f: 1189, expr: "grin", armF: "wave", gaze: -1 },
        { f: 1214, expr: "awe", armF: "hang" },                            // "lasted"
        { f: 1239, expr: "grin", armF: "point", lean: 6 },                 // "one"
        { f: 1250, expr: "laugh", armF: "wave", lean: 0 },
      ], t, faceTo(cam, p2, ex), (x) => x, 0.75);
      sparkle(out, [ex[0], ex[1] + 1.5, ex[2]], f, 1239, 1.6);
      break;
    }
    case 15: { // close on the visitor under the missile
      actor(out, cam, 6, VISITORS[0], "vis0", SPOT.VISITOR15, [
        { f: 1267, expr: "awe", gaze: -1, look: 1 },
        { f: 1277, headTilt: 6 },                                          // "still"
        { f: 1285, expr: "smile", gaze: -0.5, armF: "point" },             // "only time"
        { f: 1300, expr: "smile_closed", armF: "hang", headTilt: -4 },     // "America's"
        { f: 1315, expr: "grin", look: 0.5, gaze: 0 },                     // "mail"
        { f: 1327, headTilt: 6, lean: 3 },                                 // "gone"
        { f: 1338, expr: "laugh", lean: 0, headTilt: -3 },                 // "missile"
      ], t, faceTo(cam, SPOT.VISITOR15, mp.pos));
      sparkle(out, [SPOT.VISITOR15[0] + 0.4, 2.3, SPOT.VISITOR15[2]], f, 1292, 0.8);
      break;
    }
  }
  return out;
};
export { FPS };
