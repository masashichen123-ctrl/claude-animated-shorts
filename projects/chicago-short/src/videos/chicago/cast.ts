// Our cast as lit flat sprites in the 3D world (owner: characters, with toon.ts / cardshade.ts). Each frame every
// character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing. People are
// yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward the sun, painted crescent in
// the drawing); standing ones get a soft multiply contact blob. DOGS and items (flying boaters, the medal, Z bubbles)
// are lit square billboard cards. Effects (dust clouds, the pistol puff, heat shimmer, the blazing sun, confetti,
// steam, stink lines, sparkles, the water drop) are unlit cards; glow > 1 blooms. Cards, effects and blobs live on the
// NOINK layer so the world ink pass never outlines their quads. Runners ride in the 1904 cars from story.ts carsAt.
// CONTRACT with world.ts: stage(id, t, cam) -> { places, fx, lights }; Pool / Actor / Fx draw them.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxContact, fxShadow, fxSmoke, fxDustCloud, fxSparkle, fxSpeed, fxBurst, fxDust,
  Outfit, Expr, FrontOpts, SideOpts, ArmPose, ArmSpec, fxPoof, fxStink, fxStars,
  fxZ, fxHeat, fxSun, fxConfetti, fxBoater, fxDrop, fxSteam, fxMedal, dogDraw, DogOpts,
  HICKS, HICKS_WRECK, LORZ, CUBAN, CUBAN_SICK, trainer, driver, runner, dusty, fan1904, fan1905,
} from "./toon";
import { FPS, SHOTS, SPOT, V3, Light, smooth, clamp01, easeOut, lerp, EV, setOf, carsAt, carPt, CarPose, CAR_SEAT, hicks1Z, hicks11Z,
  chaser10, lorz6X, cuban9X, hicks12X, hicks13X, hicks13Lift, lorz15X, bucketK, wagonZ } from "./story";
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
const CONTACT: Record<string, [number, number, number]> = { day: [0.62, 0.6, 0.66], spring: [0.6, 0.6, 0.66] };
const TAIL: [number, number, number] = [0.72, 0.7, 0.78];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day" || LNAME === "spring") {
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
const DUST = "#d8a86a", SMOKE = "#ece8ea";
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

// ---------------- items, dogs, effects ----------------
const _cp = new THREE.Vector3();
/** a lit square item card (a flying boater, the medal, a Z bubble): `size` metres, centred on p */
const item = (out: Stage, key: string, draw: (p: Pen) => void, p: V3, size: number, roll = 0, cw = 512) =>
  out.places.push({ key: "I|" + key, draw, x: p[0], y: p[1], z: p[2], scale: size, sq: true, billboard: true, roll, size: [cw, cw, cw / 600] });
/** an unlit effect card */
const fxc = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, c: V3, w: number, h: number, o: { soft?: boolean; glow?: number; rot?: number } = {}) =>
  out.fx.push({ key, cw, ch, draw, x: c[0], y: c[1], z: c[2], w, h, ...o });
/** a scrappy dog: a square card of `size` m whose paws stand on ground point g; dx = travel direction (screen side) */
const DOG_COL: [string, string][] = [["#c8945a", "#f2e2c4"], ["#3a3436", "#f4f0ea"], ["#8a5a34", "#4a2e20"]];
const dog = (out: Stage, cam: CamInfo, k: number, g: V3, dir: V3, f: number, bark: boolean, size = 1.05) => {
  const d = cam.pos.distanceTo(_cp.set(g[0], g[1] + 0.4, g[2])), px = (size / Math.max(0.05, d)) * 1900 * 1.33;
  const cw = px > 700 ? 1024 : px > 330 ? 512 : 256;
  const mirror = dir[0] * cam.right.x + dir[2] * cam.right.z < 0, ph = q(((f / 9 + k * 0.37) % 1 + 1) % 1, 8);
  const o: DogOpts = { phase: ph, bark, col: DOG_COL[k % 3][0], patch: DOG_COL[k % 3][1] };
  const hop = 0.06 * Math.abs(Math.sin(ph * Math.PI * 2));
  out.places.push({ key: `D|${fkey(o)}`, draw: (pn) => dogDraw(pn, o), x: g[0], y: g[1] + 0.29 * size + hop, z: g[2], scale: size, sq: true, billboard: true, mirror, size: [cw, cw, cw / 600] });
  blob(out, g[0], g[1], g[2], 0.9);
};
/** a big dust / smoke cloud lobe: grows over 0.3 s from f0, lives `life` s, rises */
const bigCloud = (out: Stage, c: V3, size: number, f: number, f0: number, life: number, seed: number, tint: string, rise = 0, drift: V3 = [0, 0, 0]) => {
  const s = (f - f0) / FPS;
  if (s < 0 || s > life) return;
  const u = q(Math.min(0.64, 0.1 + (s / life) * 0.55) + Math.max(0, s / life - 0.64), 24), g = easeOut(s / 0.3);
  out.fx.push({ key: `cloud${u}|${seed % 4}|${tint}`, cw: 512, ch: 512, draw: (p) => { const gg = p.g; gg.save(); gg.scale(1.28, 1.28); fxDustCloud(p, u, seed % 4, tint); gg.restore(); },
    x: c[0] + drift[0] * s, y: c[1] + rise * s + drift[1] * s, z: c[2] + drift[2] * s, w: size * (0.55 + 0.45 * g), h: size * (0.55 + 0.45 * g), soft: true });
};
const poof = (out: Stage, c: V3, size: number, f: number, f0: number, life = 16) => {
  const u = (f - f0) / life;
  if (u < 0 || u >= 1) return;
  const k = q(u, 16);
  fxc(out, `poof${k}`, 400, 400, (p) => fxPoof(p, k), c, size, size, { glow: 1.3 });
};
const stink = (out: Stage, c: V3, size: number, f: number, seed = 0) => {
  const k = q(((f / 20 + seed * 0.37) % 1 + 1) % 1, 10);
  fxc(out, `stink${k}`, 300, 400, (p) => fxStink(p, k), [c[0], c[1] + size * 0.6, c[2]], size * 0.75, size);
};
const steam = (out: Stage, c: V3, size: number, f: number) => {
  const k = q((f / 24) % 1, 12);
  fxc(out, `steam${k}`, 300, 400, (p) => fxSteam(p, k), [c[0], c[1] + size * 0.5, c[2]], size * 0.75, size, { soft: true });
};
const stars = (out: Stage, c: V3, size: number, f: number) => {
  const k = q((f / 26) % 1, 16);
  fxc(out, `stars${k}`, 420, 210, (p) => fxStars(p, k), c, size, size * 0.5);
};
/** Z sleep bubbles rising one after another from c, from frame f0 */
const zzz = (out: Stage, c: V3, f: number, f0: number, size = 0.5) => {
  for (let k = 0; k < 3; k++) {
    const s = ((f - f0 - k * 9) % 27 + 27) % 27, u = s / 27;
    if (f - f0 - k * 9 < 0) continue;
    item(out, "zzz", fxZ, [c[0] + 0.35 * u + 0.08 * Math.sin(u * 7), c[1] + 1.1 * u, c[2]], size * (0.45 + 0.75 * Math.min(1, u * 2.5)) * (u > 0.85 ? (1 - u) / 0.15 : 1), 0.15 * Math.sin(u * 5), 512);
  }
};
/** heat shimmer: soft wavy bands over the road at distance d ahead of the lens */
const heat = (out: Stage, cam: CamInfo, f: number, cs: V3[], w = 9) => {
  const ph = q((f / 20) % 1, 10);
  cs.forEach((c, k) => fxc(out, `heat${q((ph + k * 0.3) % 1, 10)}`, 600, 300, (p) => fxHeat(p, (ph + k * 0.3) % 1), c, w, w * 0.22, { soft: true }));
  void cam;
};

// ---------------- people helpers ----------------
const W_ = (i: number, o: Outfit, okey: string): Who => ({ i, o, okey });
const WHO = {
  hicks: W_(10, HICKS, "hicks"), wreck: W_(10, HICKS_WRECK, "hicksW"), lorz: W_(11, LORZ, "lorz"), cuban: W_(12, CUBAN, "cuban"), sick: W_(12, CUBAN_SICK, "cubanS"),
  chaser: W_(13, runner(3), "run3"),
};
const fieldWho = (k: number): Who => (k === 0 ? WHO.hicks : k === 1 ? WHO.lorz : k === 2 ? WHO.cuban : W_(10 + k, runner(k), "run" + k));
/** screen facing of a travel direction */
const faceDir = (cam: CamInfo, d: V3, fall: -1 | 1 = 1): -1 | 1 => { const s = d[0] * cam.right.x + d[2] * cam.right.z; return Math.abs(s) < 0.15 ? fall : s > 0 ? 1 : -1; };
/** a running / shuffling person at p, travelled `dist` metres along d */
const mover = (out: Stage, cam: CamInfo, w: Who, p: V3, d: V3, dist: number, t: number, fo: FrontOpts = {}, gait: "run" | "shuffle" | "jog" = "run", scale = 1, swaps: number[] = []) => {
  const stride = gait === "run" ? 2.3 : gait === "jog" ? 1.7 : 1.1;
  const phase = q((((dist / stride) % 1) + 1) % 1, gait === "shuffle" ? 8 : 12);
  const facing = fo.facing ?? faceDir(cam, d, (p[0] - cam.pos.x) * cam.right.x + (p[2] - cam.pos.z) * cam.right.z > 0 ? -1 : 1);
  const base: FrontOpts = gait === "shuffle" ? { mode: "march", lift: 22, lean: 4 } : gait === "jog" ? { mode: "run", lift: 38, lean: 5 } : { mode: "run", lift: 55, lean: 8 };
  stand(out, cam, w.i, w.o, w.okey, p, { ...base, phase, ...fo, facing }, t, scale, swaps);
};
/** someone sitting in a car seat (seat in the car frame); the card sits a little toward the lens so the backrest never slices it */
const rider = (out: Stage, cam: CamInfo, w: Who, c: CarPose, seat: V3, fo: FrontOpts, t: number, beats: Beat[] = []) => {
  const p = carPt(c, seat), dx = cam.pos.x - p[0], dz = cam.pos.z - p[2], l = Math.hypot(dx, dz) || 1;
  const { fo: fa, swaps } = act(beats, Math.round(t * FPS), fo.facing ?? 1, w.i);
  out.places.push(person(cam, w, p[0] + (dx / l) * 0.22, p[1] - 0.15, p[2] + (dz / l) * 0.22, { side: false, mirror: false }, { ...fa, mode: "sit", blink: lidAt(t, w.i, swaps), ...fo }, {}));
};
/** a person lying on the ground (card rolled flat in the picture plane): body centre c, head toward screen-left (dir -1) or right */
const lying = (out: Stage, cam: CamInfo, w: Who, c: V3, fo: FrontOpts, t: number, head: -1 | 1 = -1, scale = 1) => {
  const off = 0.95 * scale, px = c[0] - head * cam.right.x * off, pz = c[2] - head * cam.right.z * off;
  const pl = person(cam, w, px, c[1] + 0.28 * scale, pz, { side: false, mirror: false }, { mode: "stand", blink: lidAt(t, w.i), ...fo }, {}, scale);
  pl.roll = -head * Math.PI / 2;
  out.places.push(pl);
  blob(out, c[0], c[1], c[2], 1.6 * scale);
};
const SWEAT = (f: number, i: number) => { const u = ((f + i * 7) % 26) / 26; return u < 0.9 ? q(u / 0.9, 14) : undefined; };
/** the 1904 crowd in the stadium stands */
type Fan = { i: number; p: V3; v: number; boater: boolean };
const FANS: Fan[] = (() => {
  const out: Fan[] = [];
  let i = 0;
  for (let k = 0; k < 8; k++) for (let x = -40; x <= 40; x += 1.25) {
    const h = hh(i, 71);
    if (h > 0.84) { i++; continue; }
    out.push({ i: 300 + i, p: [x + (hh(i, 72) - 0.5) * 0.5, 0.6 + 0.52 * k, -6.6 - 1.05 * k - 0.5], v: i % 21, boater: (i % 21) % 3 !== 1 && (i % 21) % 5 !== 4 }); i++;
  }
  for (let k = 0; k < 7; k++) for (let z = -30; z <= 26; z += 1.3) {
    if (hh(i, 71) > 0.82) { i++; continue; }
    out.push({ i: 300 + i, p: [-48 - 1.05 * k - 0.5, 0.6 + 0.55 * k, z + (hh(i, 72) - 0.5) * 0.5], v: i % 21, boater: (i % 21) % 3 !== 1 && (i % 21) % 5 !== 4 }); i++;
  }
  return out;
})();
type Mood = "watch" | "cheer" | "leap" | "jaw" | "hold" | "wave";
const hatless = (o: Outfit): Outfit => ({ ...o, hat: "hair", hairStyle: "crop" });
/** draw the stadium crowd in a mood; leap = jump with arms up (boaters fly off from f0); jaw = jaws dropped, hats in the air */
const fans = (out: Stage, cam: CamInfo, f: number, t: number, mood: Mood, f0 = 0, maxD = 140) => {
  let flyN = 0;
  for (const c of FANS) {
    const d = cam.pos.distanceTo(_cp.set(c.p[0], c.p[1] + 1, c.p[2]));
    if (d < 2.6 || d > maxD) continue;
    const near = d < 16, v = c.v, o0 = fan1904(v), sinceLeap = f - f0 - Math.floor(4 * hh(c.i, 73));
    const flown = (mood === "leap" && sinceLeap >= 0) || mood === "jaw";
    const o = flown && c.boater ? hatless(o0) : o0, okey = "fan" + v + (flown && c.boater ? "h" : "");
    let fo: FrontOpts = {}, y = c.p[1];
    const ph = (c.i % 3) / 3, wv = q(0.5 + 0.5 * Math.sin(t * 9 + ph * 6.28), 4);
    switch (mood) {
      case "watch": fo = { expr: (["smile", "neutral", "smile_closed"] as Expr[])[c.i % 3], look: q(0.6 * Math.sin(c.i), 2) }; break;
      case "wave": fo = { expr: (["smile", "grin", "smile_closed"] as Expr[])[c.i % 3], armR: c.i % 2 ? "wave" : undefined, wave: c.i % 2 ? wv : undefined, prop: o.dress && c.i % 4 === 1 ? "parasol" : null }; break;
      case "cheer": fo = { expr: (["grin", "laugh", "smile_closed"] as Expr[])[c.i % 3], armR: "wave", wave: wv, armL: c.i % 3 ? "raise" : undefined }; break;
      case "leap": {
        const s = Math.max(0, sinceLeap) / FPS;
        y += sinceLeap >= 0 ? 0.32 * Math.abs(Math.sin(s * 7 + ph)) : 0;
        fo = sinceLeap >= 0 ? { expr: (["laugh", "grin", "yell"] as Expr[])[c.i % 3], armR: "raise", armL: "raise" } : { expr: "smile", look: 0.4 };
        if (sinceLeap >= 0 && c.boater && flyN < 46 && d < 40 && s < 2.2) { // the boater flies up, spinning
          flyN++;
          const hp: V3 = [c.p[0] + 0.6 * s * Math.sin(c.i), y + 1.95 + 5.5 * s - 3.2 * s * s, c.p[2] + 0.5 * s];
          item(out, "boater" + (c.i % 3), (pn) => fxBoater(pn, ["#c0352e", "#2a2a40", "#2f5ab8"][c.i % 3]), hp, 0.62, s * 5 * (c.i % 2 ? 1 : -1) + 0.3, d < 10 ? 512 : 256);
        }
        break;
      }
      case "jaw": {
        fo = { expr: "jawdrop", armR: c.i % 2 ? "raise" : undefined, gaze: -0.5 };
        if (c.boater && d < 30) item(out, "boater" + (c.i % 3), (pn) => fxBoater(pn, ["#c0352e", "#2a2a40", "#2f5ab8"][c.i % 3]), [c.p[0] + 0.1 * Math.sin(c.i), y + 2.5 + 0.25 * hh(c.i, 74) - 0.002 * (f - EV.CUT7), c.p[2]], 0.62, 0.4 * Math.sin(c.i), 512);
        break;
      }
      case "hold": fo = { expr: c.i % 3 ? "sick" : "gulp", shrug: 0.7, gaze: 0.2 }; break;
    }
    const who: Who = { i: near ? c.i : 500 + (c.i % 24), o, okey };
    out.places.push(person(cam, who, c.p[0], y, c.p[2], { side: false, mirror: false }, { mode: "stand", blink: near ? lidAt(t, c.i) : 0, facing: c.i % 2 ? 1 : -1, ...fo }, {}));
  }
};
/** confetti fluttering down over the stadium from f0 */
const confetti = (out: Stage, cam: CamInfo, f: number, f0: number, n = 14) => {
  for (let k = 0; k < n; k++) {
    const s = (f - f0 - 3 * k) / FPS;
    if (s < 0 || s > 3.2) continue;
    const c: V3 = [-6 + 12 * hh(k, 81) + 0.5 * Math.sin(s * 3 + k), 9 - 3.0 * s, -3 + 6 * hh(k, 82)];
    fxc(out, `conf${k % 5}`, 400, 400, (p) => fxConfetti(p, k % 5), c, 2.6, 2.6, { rot: s * 2 + k });
  }
  void cam;
};
/** dust trail behind a moving car: puffs dropped every 3 f, each growing over ~1.4 s */
const carDust = (out: Stage, c: (g: number) => CarPose, f: number, n: number, size: number) => {
  for (let k = 0; k < n; k++) {
    const g = Math.floor(f / 3) * 3 - k * 3, s = (f - g) / FPS, p = carPt(c(g), [0, 0.5, -2.0]);
    if (s < 0 || s > 1.6) continue;
    bigCloud(out, [p[0] + 0.6 * Math.sin(g), p[1] + 0.4 * s, p[2]], size * (0.5 + 0.6 * s), f, g, 1.6, g, DUST, 0.6);
  }
};

// ---------------- per-shot staging ----------------
/** everything with a face, and every effect card, in shot `id` at time t (pure function of id + t) */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], lights: [] };
  const s = SHOTS[id - 1], f = t * FPS, F = Math.round(f), set = setOf(id, F);
  LNAME = s.light;
  findSun(cam, SUN);
  const G = (x: number, z: number): V3 => [x, 0, z];
  const fwd = new THREE.Vector3().crossVectors(cam.up, cam.right);
  switch (id) {
    case 1: { // HOOK: Hicks shuffles at us, a trainer jogs beside him; the skull bottle @99; the gulp @110: swirly eyes
      const z = hicks1Z(f), gulped = f >= EV.GULP1 - 2;
      mover(out, cam, gulped ? WHO.wreck : WHO.hicks, [0.42, 0, z], [0, 0, 1], z + 4.2, t, {
        expr: f < EV.BOTTLE1 - 2 ? (f < 60 ? "pant" : "pained") : f < EV.GULP1 - 2 ? "pant" : f < EV.GULP1 + 3 ? "gulp" : "dazed",
        armR: f >= EV.GULP1 - 4 && f < EV.GULP1 + 10 ? "drink" : undefined, prop: f >= EV.GULP1 - 4 && f < EV.GULP1 + 10 ? "poison" : null,
        sweat: SWEAT(F, 1), facing: -1, tilt: 3 * Math.sin(f * 0.21) + (gulped ? 4 * Math.sin(f * 0.33) : 0), headTilt: gulped ? 8 * Math.sin(f * 0.27) : -4,
      }, "shuffle");
      const tp: V3 = [-0.78, 0, z - 0.7];
      mover(out, cam, W_(20, trainer(0), "tr0"), tp, [0, 0, 1], z + 4.2, t, {
        expr: f < EV.BOTTLE1 - 3 ? "stern" : f < EV.GULP1 ? "proud" : "nervous", facing: 1,
        armR: f >= EV.BOTTLE1 - 3 && f < EV.GULP1 - 4 ? "raise" : undefined, prop: f >= EV.BOTTLE1 - 3 && f < EV.GULP1 - 4 ? "poison" : null,
      }, "jog");
      if (f >= EV.BOTTLE1 - 1 && f < EV.BOTTLE1 + 14) sparkle(out, [tp[0] + 0.45, 2.15, tp[2] + 0.1], f, EV.BOTTLE1 - 1, 0.5, 1.5);
      if (gulped) { stars(out, [0.42, 2.12, z + 0.05], f >= EV.SWIRL1 - 1 ? 1.1 : 0.8, f); if (f >= EV.SWIRL1 - 1 && f < EV.SWIRL1 + 12) sparkle(out, [0.42, 1.85, z + 0.1], f, EV.SWIRL1 - 1, 0.8, 1.4); }
      // the field strung out behind them, the trainers' car, heat over the road
      for (let k = 3; k < 9; k++) { const zz = z - 9 - 4.5 * (k - 3) + 0.4 * Math.sin(k); mover(out, cam, fieldWho(k), [(k % 2 ? 1.2 : -0.6) + 0.3 * Math.sin(k * 3), 0, zz], [0, 0, 1], zz + f * 0.03, t, { expr: k % 2 ? "pant" : "pained" }, "shuffle"); }
      for (const c of carsAt(1, F)) { rider(out, cam, W_(21, driver(0), "drv0"), c, CAR_SEAT.frontL, { expr: "neutral", facing: 1 }, t); rider(out, cam, W_(22, trainer(1), "tr1"), c, CAR_SEAT.frontR, { expr: "stern", facing: 1 }, t); }
      heat(out, cam, f, [[0, 0.5, z - 26], [1, 0.7, z - 45]], 10);
      break;
    }
    case 2: { // the car putters past the exhausted runners; Lorz waves from the back seat @162; a double take @176
      const c = carsAt(2, F)[0];
      rider(out, cam, W_(23, driver(1), "drv1"), c, CAR_SEAT.frontL, { expr: "neutral", facing: 1 }, t);
      rider(out, cam, WHO.lorz, c, CAR_SEAT.rearR, { facing: -1 }, t, [
        { f: 133, expr: "smile_closed", lean: -6, headTilt: 6 },
        { f: EV.WAVE2, expr: "proud", armF: "wave", headTilt: -4, lean: -2 },
      ]);
      carDust(out, (g) => carsAt(2, g)[0], F, 6, 2.4);
      [[1.25, -33.4, 4], [1.6, -37.0, 5], [0.9, -40.5, 6]].forEach(([x, z0, k], j) => {
        const zz = z0 + 0.035 * (f - 133), dt = j === 0;
        mover(out, cam, fieldWho(k), [x, 0, zz], [0, 0, 1], zz, t, {
          expr: dt ? (f < EV.DOUBLE2 - 8 ? "pant" : f < EV.DOUBLE2 - 2 ? "blank" : "jawdrop") : "pant",
          facing: dt && f >= EV.DOUBLE2 - 8 && f < EV.DOUBLE2 - 2 ? 1 : -1, headTilt: dt && f >= EV.DOUBLE2 - 2 ? -6 : 3, sweat: SWEAT(F, k),
        }, "shuffle");
      });
      if (F >= EV.DOUBLE2 - 2 && F < EV.DOUBLE2 + 14) sparkle(out, [1.25, 2.2, -33.4 + 0.035 * (f - 133)], f, EV.DOUBLE2 - 2, 0.6, 1.4);
      break;
    }
    case 3: {
      if (set === "stadium") { // the start: 32 runners, the starter's pistol @210, the full stand
        fans(out, cam, F, t, "wave");
        const go = Math.max(0, f - EV.PISTOL3 - 2);
        for (let k = 0; k < 32; k++) {
          const row = Math.floor(k / 8), col2 = k % 8, x0 = SPOT.START_X - 0.6 - row * 1.15, z = -3.4 + col2 * 0.97 + 0.2 * (row % 2);
          const delay = row * 2 + (k % 3), g2 = Math.max(0, go - delay), x = x0 + 0.004 * g2 * g2 * (g2 < 40 ? 1 : 0) + (g2 >= 40 ? 6.4 + 0.32 * (g2 - 40) : 0);
          if (go <= 0) stand(out, cam, fieldWho(k).i, fieldWho(k).o, fieldWho(k).okey, [x, 0, z], { expr: k % 3 ? "stern" : "neutral", lean: 10, facing: 1, look: 0.6 }, t);
          else mover(out, cam, fieldWho(k), [x, 0, z], [1, 0, 0], x, t, { expr: k % 2 ? "grin" : "stern", facing: 1 }, "run");
        }
        const S = SPOT.STARTER;
        stand(out, cam, 24, trainer(2), "tr2", S, { expr: f < EV.PISTOL3 - 2 ? "stern" : "shock", armR: "raise", prop: "pistol", facing: -1, armL: f >= EV.PISTOL3 ? "ears" : undefined }, t);
        if (f >= EV.PISTOL3 - 1) { poof(out, [S[0] - 0.4, 2.55, S[2]], 1.6, f, EV.PISTOL3 - 1, 12); for (let k = 0; k < 4; k++) bigCloud(out, [S[0] - 0.4 + 0.3 * k, 2.6 + 0.2 * k, S[2]], 1.3, f, EV.PISTOL3 + k, 1.5, k, SMOKE, 0.5); }
      } else { // the blazing sun over the dirt road; sweating runners; the road to the horizon
        const c0 = SHOTS[2], sf = 262; void c0; void sf;
        const sunP: V3 = [-30, 120, -140];
        fxc(out, `sun${q((f / 40) % 1, 10)}`, 600, 600, (p) => fxSun(p, (f / 40) % 1), sunP, 60, 60, { glow: 1.7 });
        for (let k = 0; k < 7; k++) {
          const zz = 41.5 - 2.4 * k + 0.035 * (f - 262) - (k > 3 ? 5 : 0), x = [-0.2, 0.9, 0.1, -1.4, 1.5, 0.5, -0.4][k];
          mover(out, cam, fieldWho(k + 3), [x, 0, zz], [0, 0, 1], zz, t, { expr: f < EV.HEAT3 - 2 ? "pained" : (["pant", "pained", "pant", "sick"] as Expr[])[k % 4], sweat: f >= EV.HEAT3 - 2 ? SWEAT(F, k) : undefined, armL: k === 1 && f > EV.HEAT3 ? "palm" : undefined }, "shuffle");
          if (f >= EV.HEAT3 - 2 && k < 4) steam(out, [x, 2.05, zz], 0.7, F + k * 7);
        }
        for (let k = 0; k < 10; k++) { const zz = 10 - 22 * k; mover(out, cam, fieldWho(10 + k), [k % 2 ? 1.2 : -1.0, 0, zz], [0, 0, 1], zz + f * 0.04, t, { expr: "pant" }, "shuffle"); }
        heat(out, cam, f, [[0, 0.6, 18], [0, 0.9, -5], [0, 1.4, -40], [0, 2.2, -90]], 12);
      }
      break;
    }
    case 4: { // the officials' cars roar ahead; the dust clouds roll back over the runners; they emerge coughing, brown
      const cs = carsAt(4, F);
      cs.forEach((c, j) => {
        rider(out, cam, W_(25 + j, driver(j + 1), "drv" + (j + 1)), c, CAR_SEAT.frontL, { expr: j ? "grin" : "stern", facing: 1 }, t);
        rider(out, cam, W_(27 + j, driver(j + 2), "drv" + (j + 2)), c, CAR_SEAT.rearR, { expr: "proud", facing: -1, armR: "point" }, t);
        carDust(out, (g) => carsAt(4, g)[j], F, 9, 3.4);
      });
      const dusted = f >= EV.DUSTPEAK4 - 6;
      for (let k = 0; k < 8; k++) {
        const zz = 33 + 0.07 * (f - 340) - 2.2 * k + (k > 4 ? -3 : 0), x = [-0.8, 0.8, 0.1, -1.6, 1.6, -0.4, 1.1, -1.2][k], w = fieldWho(k + 3);
        mover(out, cam, dusted ? { ...w, o: dusty(w.o), okey: w.okey + "D" } : w, [x, 0, zz], [0, 0, 1], zz, t,
          { expr: dusted ? (k % 2 ? "cough" : "sick") : k === 0 && f >= EV.COUGH4 - 2 && f < EV.COUGH4 + 10 ? "cough" : f > 380 ? "shock" : "pant", armL: dusted && k % 2 ? "pinch" : undefined, sweat: SWEAT(F, k) }, "shuffle");
        if (dusted && k < 4 && (F + k * 5) % 14 < 7) puff(out, [x + 0.25, 1.6, zz + 0.3], ((F + k * 5) % 14) / FPS, 0.7, 0.3, k, DUST);
      }
      // the wall of dust: big lobes rolling toward the lens, densest at DUSTPEAK4, thinning out after
      for (let k = 0; k < 18; k++) {
        const f0 = EV.DUST4 - 20 + Math.round(k * 1.2), x = -6 + 12 * hh(k, 91), y = 0.6 + 3.0 * hh(k, 92), z = 28 + 14 * hh(k, 93);
        bigCloud(out, [x, y, z], 5 + 4 * hh(k, 94), F, f0, 1.45, k, k % 3 ? DUST : "#c89860", 0.3, [0, 0, 2.4]);
      }
      break;
    }
    case 5: { // the lone well; the queue of panting runners; the bucket comes up with a single drop
      const W = SPOT.WELL;
      for (let k = 0; k < 14; k++) {
        const z = W[2] - 1.6 - 1.55 * k, x = W[0] - 1.2 - 0.25 * Math.sin(k * 1.7), p: V3 = [x, 0, z];
        stand(out, cam, 40 + k, fieldWho(k + 3).o, fieldWho(k + 3).okey, p, {
          expr: f < EV.PANT5 - 2 ? (k % 3 ? "pant" : "pained") : "pant", facing: 1, look: 1, gaze: 0.2, shrug: 0.3, lean: 6,
          sweat: SWEAT(F, k), tilt: 2 * Math.sin(f * 0.3 + k), armR: k === 3 ? "palm" : undefined,
        }, t);
      }
      // the first runner at the windlass: cranks, then stares into the bucket
      const cranking = f >= 498 && f < 526, cp: V3 = [W[0] + 1.25, 0, W[2] + 0.5];
      stand(out, cam, 39, runner(9).jacket ? runner(9) : runner(9), "run9", cp, {
        expr: f < EV.TWO5 ? "pant" : cranking ? "pained" : f < EV.DROP5 - 2 ? "awe" : "jawdrop", facing: -1,
        armR: cranking ? "crank" : f >= 526 ? "point" : undefined, wave: cranking ? q((f / 10) % 1, 8) : undefined, lean: 6, sweat: SWEAT(F, 9),
      }, t);
      if (f >= EV.DROP5 - 1) {
        const u = clamp01((f - EV.DROP5 + 1) / 16), by = 0.4 + 0.95 * bucketK(F);
        fxc(out, "drop", 200, 300, fxDrop, [W[0] + 0.05, by - 0.08 - 0.9 * u * u, W[2] + 0.12], 0.22, 0.33, { glow: 1.15 });
        sparkle(out, [W[0] + 0.1, by + 0.3, W[2] + 0.2], f, EV.DROP5 - 1, 0.5, 1.4);
      }
      break;
    }
    case 6: { // the stadium finish: Lorz, fresh and smiling, breaks the tape @607; the crowd leaps, boaters fly, confetti
      fans(out, cam, F, t, f < EV.CHEER6 - 2 ? (f < EV.TAPE6 ? "watch" : "cheer") : "leap", EV.CHEER6 - 2);
      const x = lorz6X(f), lp: V3 = [x, 0, 0.35];
      if (f < EV.TAPE6 + 8) mover(out, cam, WHO.lorz, lp, [1, 0, 0], x, t, { expr: f < EV.FINISH6 ? "smile_closed" : "proud", facing: 1, armR: f >= EV.TAPE6 - 2 ? "raise" : undefined, armL: f >= EV.TAPE6 - 2 ? "raise" : undefined }, "run");
      else stand(out, cam, WHO.lorz.i, WHO.lorz.o, WHO.lorz.okey, lp, { expr: f < EV.LORZ6 - 2 ? "proud" : "laugh", armR: f < EV.LORZ6 ? "raise" : "wave", wave: q(0.5 + 0.5 * Math.sin(t * 9), 6), armL: "raise", facing: 1, look: 1 }, t);
      if (f >= EV.TAPE6 && f < EV.TAPE6 + 20) sparkle(out, [0.2, 1.5, 0.3], f, EV.TAPE6, 1.2, 1.5);
      [[-1.6, -5.0], [-2.8, -5.3]].forEach(([ox, oz], k) => stand(out, cam, 30 + k, trainer(k + 1), "tr" + (k + 1), [ox, 0, oz], { expr: f < EV.TAPE6 ? "stern" : "smile", armR: f >= EV.TAPE6 ? "wave" : undefined, wave: q(0.5 + 0.5 * Math.sin(t * 8 + k), 6), facing: -1 }, t));
      if (f >= EV.CHEER6 - 2) confetti(out, cam, F, EV.CHEER6 - 2);
      break;
    }
    case 7: {
      if (set === "country") { // flashback: Lorz lounging in the back seat, feet up, waving at the runners he overtakes
        const c = carsAt(7, F)[0];
        rider(out, cam, W_(23, driver(1), "drv1"), c, CAR_SEAT.frontL, { expr: "neutral", facing: 1 }, t);
        rider(out, cam, WHO.lorz, c, CAR_SEAT.rearR, { facing: -1 }, t, [
          { f: 686, expr: "smile_closed", lean: -14, headTilt: 10, armB: "hip" },
          { f: EV.PASS7, expr: "proud", armF: "wave", lean: -10, headTilt: -4 },
          { f: EV.CAR7, expr: "laugh", armF: "wave" },
        ]);
        carDust(out, (g) => carsAt(7, g)[0], F, 6, 2.4);
        [[-2.7, -71.0], [-3.1, -73.6], [-2.5, -68.4]].forEach(([x, z0], k) => {
          const zz = z0 + 0.03 * (f - 686);
          mover(out, cam, fieldWho(k + 5), [x, 0, zz], [0, 0, 1], zz, t, { expr: f > EV.PASS7 - 6 ? (k ? "annoyed" : "jawdrop") : "pant", facing: f > EV.PASS7 - 6 ? -1 : 1, sweat: SWEAT(F, k) }, "shuffle");
        });
      } else fans(out, cam, F, t, "jaw", 0, 30); // the insert: jaws drop, boaters frozen mid-air
      break;
    }
    case 8: { // the orchard: the Cuban jogs up, grins, picks an apple @822, bites @830; @867 it's rotten: green, worms, stink
      const Cb = SPOT.CUBAN8, arrive = 806, u = smooth((f - 768) / (arrive - 768));
      const p: V3 = f < arrive ? [lerp(0.4, Cb[0], u), 0, lerp(Cb[2] - 7.5, Cb[2], u)] : Cb;
      const rot = f >= EV.ROT8 - 2, w = rot ? WHO.sick : WHO.cuban;
      if (f < arrive) mover(out, cam, w, p, [0.45, 0, 0.9], 7.5 * u, t, { expr: "grin", facing: 1 }, "jog", 0.92);
      else {
        const picking = f >= EV.PICK8 - 6 && f < EV.BITE8 - 2, biting = f >= EV.BITE8 - 2 && f < EV.BITE8 + 26, chew = f >= EV.BITE8 + 4 && Math.floor(f / 4) % 2;
        stand(out, cam, w.i, w.o, w.okey, p, {
          expr: rot ? "sick" : f < EV.PICK8 - 6 ? "grin" : picking ? "awe" : biting ? (chew ? "smile_closed" : "grin") : "smile_closed",
          facing: f < EV.PICK8 + 4 ? 1 : -1, look: f < EV.PICK8 ? 1 : -0.4, gaze: f < EV.PICK8 ? -0.8 : 0,
          armR: picking ? "raise" : biting ? "drink" : rot ? "show" : f >= EV.PICK8 ? "raise" : undefined,
          prop: f < EV.PICK8 - 1 ? null : rot ? "appleRot" : "apple", shrug: rot ? 0.6 : 0, tilt: rot ? 3 * Math.sin(f * 0.4) : 0,
        }, t, 0.92);
        if (f < EV.PICK8 - 1) item(out, "appleHang", (pn) => { pn.ell(300, 320, 120, 112, "#e0261e", 12); pn.ell(250, 280, 26, 40, "rgba(255,255,255,0.7)", 0); pn.stroke([[300, 210], [306, 150]], 14, "#5a3a1e"); pn.poly([[306, 170], [380, 130], [350, 190]], "#4aa83a", 8); }, [Cb[0] + 0.55, 2.05, Cb[2] - 0.35], 0.24, 0, 256);
        if (rot) { stink(out, [p[0] - 0.42 * cam.right.x, 1.38, p[2] - 0.42 * cam.right.z + 0.1], 0.3, F, 1); stink(out, [p[0] + 0.1, 2.02, p[2]], 0.34, F, 2); }
      }
      break;
    }
    case 9: {
      if (set === "country") { // napping under the apple tree, hands behind his head; Z bubbles @926
        const N = SPOT.NAP9;
        lying(out, cam, WHO.cuban, N, { expr: f < EV.NAP9 - 10 ? "smile_closed" : "sleep", armR: "behindHead", armL: "behindHead" }, t, -1, 0.92);
        if (f >= EV.NAP9 - 2) zzz(out, [N[0] - 1.0, 0.75, N[2] + 0.3], F, EV.NAP9 - 2, 0.62);
      } else { // over the finish line, cheerful, four fingers up @965
        fans(out, cam, F, t, "cheer");
        const x = cuban9X(Math.min(f, 975)) + (f > 975 ? 0.02 * (f - 975) : 0);
        if (f < 975) mover(out, cam, WHO.cuban, [x, 0, 0.3], [1, 0, 0], x, t, { expr: "laugh", facing: 1, armR: f >= EV.FOUR9 - 3 ? "four" : undefined }, "jog", 0.92);
        else stand(out, cam, WHO.cuban.i, WHO.cuban.o, WHO.cuban.okey, [x, 0, 0.3], { expr: "proud", facing: 1, armR: "four", look: 1 }, t, 0.92);
        if (f >= EV.FOUR9 - 2) sparkle(out, [x + 0.5, 2.2, 0.4], f, EV.FOUR9 - 2, 0.7, 1.5);
      }
      break;
    }
    case 10: { // the cornfield lane: arms flailing, three scrappy dogs barking at his heels; the sign spins
      const r = chaser10(f), chase = f >= EV.CHASE10 - 2;
      mover(out, cam, WHO.chaser, r, f < 1003 ? [0, 0, -1] : [-1, 0, 0], f < 1003 ? -r[2] : -r[0], t, chase
        ? { expr: f < EV.DOGS10 - 2 ? "shock" : "yell", armR: "flail", armL: "flail", wave: q((f / 8) % 1, 8), lean: 10, sweat: SWEAT(F, 3) }
        : { expr: "smile_closed", look: 1 }, chase ? "run" : "jog");
      for (let k = 0; k < 3; k++) {
        const gap = lerp(7 + 2.5 * k, 1.1 + 0.85 * k, smooth((f - 1010 - 4 * k) / 42)), dz = [0.6, -0.5, 0.2][k];
        if (f < 1006) continue;
        dog(out, cam, k, [r[0] + gap, 0, r[2] + dz], [-1, 0, 0], F, (Math.floor(f / 6) + k) % 2 === 0 || F >= EV.DOGS10 - 2, 1.45 + 0.2 * (k % 2));
        if (F % 6 === k) puff(out, [r[0] + gap + 0.3, 0.3, r[2] + dz], 0, 0.6, 0.4, F + k, DUST);
        trail(out, (g) => { const rr = chaser10(g); return [rr[0] + gap + 0.4, 0.25, rr[2] + dz]; }, F, 3, 0.7, DUST, 4);
      }
      if (chase) trail(out, (g) => { const rr = chaser10(g); return [rr[0] + 0.4, 0.2, rr[2]]; }, F, 4, 0.8, DUST, 3);
      break;
    }
    case 11: { // Hicks barely alive; the trainers' car crawls beside him; egg @1204, brandy @1235, strychnine @1246
      const z = hicks11Z(f), c = carsAt(11, F)[0];
      const dose = f >= EV.POISON11 ? 3 : f >= EV.BRANDY11 ? 2 : f >= EV.EGG11 ? 1 : 0;
      const sip = (e: number, prop: "eggcup" | "flask" | "poison") => f >= e - 2 && f < e + 10 ? prop : null;
      const hp = sip(EV.EGG11, "eggcup") ?? sip(EV.BRANDY11, "flask") ?? sip(EV.POISON11, "poison");
      mover(out, cam, WHO.wreck, [0.75, 0, z], [0, 0, 1], z, t, {
        expr: hp ? "gulp" : f < EV.ALIVE11 - 2 ? "pant" : "dazed", facing: -1, armR: hp ? "drink" : undefined, prop: hp,
        tilt: (4 + 2 * dose) * Math.sin(f * 0.19), headTilt: (6 + 3 * dose) * Math.sin(f * 0.23 + 1), sweat: SWEAT(F, 2), shrug: 0.4,
      }, "shuffle");
      steam(out, [0.75, 2.05, z], 0.75 + 0.15 * dose, F);
      if (dose > 0) stars(out, [0.75, 2.15 + 0.05 * dose, z + 0.05], 0.6 + 0.25 * dose, F);
      const offer = (e: number) => f >= e - 9 && f < e - 1;
      const op = offer(EV.EGG11) ? "egg" : offer(EV.BRANDY11) ? "flask" : offer(EV.POISON11) ? "poison" : null;
      rider(out, cam, W_(26, driver(0), "drv0"), c, CAR_SEAT.frontL, { expr: "stern", facing: 1 }, t);
      rider(out, cam, W_(20, trainer(0), "tr0"), c, CAR_SEAT.frontR, { facing: 1, expr: op ? "proud" : "nervous", armR: op ? "offer" : undefined, prop: op, lean: op ? 8 : 0 }, t);
      rider(out, cam, W_(22, trainer(1), "tr1"), c, CAR_SEAT.rearR, { facing: 1, expr: dose >= 2 ? "nervous" : "stern", armR: "point" }, t);
      for (const e of [EV.EGG11, EV.BRANDY11, EV.POISON11]) if (f >= e - 2 && f < e + 14) sparkle(out, [0.5, 1.85, z + 0.2], f, e - 2, 0.55, 1.4);
      for (let k = 0; k < 4; k++) { const zz = z - 10 - 7 * k; mover(out, cam, fieldWho(12 + k), [k % 2 ? 1.1 : -0.3, 0, zz], [0, 0, 1], zz, t, { expr: "pant" }, "shuffle"); }
      break;
    }
    case 12: { // the long lens: Hicks weaves toward the tape on jelly legs; the crowd holds its breath
      fans(out, cam, F, t, "hold", 0, 160);
      const x = hicks12X(f);
      mover(out, cam, WHO.wreck, [x, 0, 0.35 + 0.45 * Math.sin(f * 0.11)], [1, 0, 0.2 * Math.cos(f * 0.11)], x, t,
        { expr: "dazed", facing: 1, tilt: 9 * Math.sin(f * 0.17), headTilt: 10 * Math.sin(f * 0.21), armR: "out", armL: "out", sweat: SWEAT(F, 2) }, "shuffle");
      stars(out, [x, 2.2, 0.4], 0.9, F);
      [[-2.2, 1.8], [-2.6, -1.4]].forEach(([dx, dz], k) => stand(out, cam, 30 + k, trainer(k), "tr" + k, [x + dx, 0, dz], { expr: "nervous", armR: "out", facing: 1, lean: 8 }, t));
      break;
    }
    case 13: { // the carry: lifted under the arms @1378, legs still running, through the tape @1399; the medal plonks
      fans(out, cam, F, t, f < EV.TAPE13 ? "hold" : "cheer");
      const x = hicks13X(f), lift = hicks13Lift(f), up = f >= EV.LIFT13 - 2, medal = f >= EV.MEDAL13;
      stand(out, cam, WHO.wreck.i, WHO.wreck.o, WHO.wreck.okey, [x, lift, 0.25], up
        ? { mode: "run", phase: q((f / 9) % 1, 12), lift: 70, expr: medal ? "dazed" : "dazed", armR: "raise", armL: "raise", facing: 1, medal, tilt: 3 * Math.sin(f * 0.3), headTilt: 12 * Math.sin(f * 0.2) }
        : { mode: "march", lift: 24, phase: q((x / 1.1) % 1, 8), expr: "dazed", facing: 1, tilt: 8 * Math.sin(f * 0.17), armR: "out", armL: "out" }, t);
      const tr: [number, number, number][] = [[-0.62, 0.62, 0], [0.62, -0.5, 1]];
      tr.forEach(([dx, dz, k]) => stand(out, cam, 30 + k, trainer(k), "tr" + k, [x + dx, 0, 0.25 + dz], {
        mode: up ? "stroll" : "stand", phase: q((f / 16) % 1, 12), expr: up ? "pained" : "nervous", facing: dx < 0 ? 1 : -1,
        armR: up ? (dx < 0 ? "lift" : undefined) : "out", armL: up ? (dx > 0 ? "lift" : undefined) : undefined, lean: up ? -6 : 4, sweat: up ? SWEAT(F, k + 4) : undefined,
      }, t));
      if (f >= EV.MEDAL13 - 12 && !medal) { const u = (f - EV.MEDAL13 + 12) / 12; item(out, "medal", fxMedal, [x + 0.03, lift + 1.5 + 2.4 * (1 - u * u), 0.3], 0.45, 0.4 * (1 - u), 512); }
      if (f >= EV.MEDAL13 && f < EV.MEDAL13 + 16) sparkle(out, [x, lift + 1.4, 0.4], f, EV.MEDAL13, 0.6, 1.6);
      if (f >= EV.TAPE13 && f < EV.TAPE13 + 18) sparkle(out, [0.1, 1.5, 0.4], f, EV.TAPE13, 1.1, 1.5);
      break;
    }
    case 14: { // high 3/4: the column; 18 drop out comically (shade, hay wagon, creek, fence, verge); 14 keep going
      for (let k = 0; k < 32; k++) {
        const w = fieldWho(k === 0 ? 31 : k), z0 = 8 + 3.6 * k + 1.2 * Math.sin(k * 2.1), x = (k % 3 - 1) * 0.9 + 0.3 * Math.sin(k);
        const dropAt = k % 16 < 10 && k > 1 ? EV.DROPS14 + Math.floor(((k * 7) % 18) * 2) : Infinity, z = z0 + 0.06 * (Math.min(f, dropAt) - 1415);
        if (f < dropAt) { mover(out, cam, w, [x, 0, z], [0, 0, 1], z, t, { expr: "pant", sweat: SWEAT(F, k) }, "jog"); continue; }
        const kind = k % 6, dz = z;
        if (kind === 0) lying(out, cam, w, [9 - 1.5 + 0.8 * (k % 2), 0, 30 + (k % 3) - 1], { expr: "sleep" }, t, -1);             // flopped in the shade
        else if (kind === 1) out.places.push(person(cam, w, 1.0 + (k % 2 ? 0.4 : -0.4), 1.6, wagonZ(f) + (k % 4) * 0.5 - 0.5, { side: false, mirror: false }, { mode: "sit", expr: "smile_closed", armR: "wave", wave: q(0.5 + 0.5 * Math.sin(t * 7 + k), 4), blink: 0, facing: 1 }, {})); // on the hay wagon
        else if (kind === 2) { out.places.push(person(cam, w, 3.6 + (k % 2), -0.1, SPOT.CREEK_Z + (k % 3) * 0.6 - 0.6, { side: false, mirror: false }, { mode: "sit", expr: "relief", blink: 0, facing: -1 }, {})); if (F % 10 < 5) puff(out, [3.6 + (k % 2), 0.2, SPOT.CREEK_Z], (F % 10) / FPS, 0.9, 0.3, k, "#cfe8ff"); if (F >= EV.SPLASH14 - 1 && F < EV.SPLASH14 + 14) { poof(out, [3.6 + (k % 2), 0.6, SPOT.CREEK_Z], 2.2, f, EV.SPLASH14 - 1, 14); bigCloud(out, [3.6 + (k % 2), 0.5, SPOT.CREEK_Z], 2.4, F, EV.SPLASH14 - 1, 0.5, k, "#cfe8ff", 1.5); } } // in the creek (splash @1497)
        else if (kind === 3) { lying(out, cam, w, [-(SPOT.ROAD_W / 2 + 1.5), 0.95, 44 + k * 0.6], { expr: "sleep" }, t, 1); zzz(out, [-(SPOT.ROAD_W / 2 + 1.5), 1.6, 44 + k * 0.6], F, dropAt + 6, 0.6); } // asleep on the fence
        else stand(out, cam, w.i, w.o, w.okey, [x * 1.4 + (k % 2 ? 2.9 : -2.9), 0, dz], { mode: "sit", expr: kind === 4 ? "pant" : "dazed", armR: "palm", facing: k % 2 ? -1 : 1 }, t); // sat down on the verge
        if (f - dropAt < 12) poof(out, [x, 1.0, dz], 1.4, f, dropAt, 12);
      }
      break;
    }
    case 15: { // Boston 1905: Lorz breaks the tape @1604; looks at his feet @1637; the old car honks @1650, he waves it away; wink @1660
      const x = lorz15X(f);
      for (let k = 0; k < 44; k++) { // the spring crowd on both sidewalks
        const side = k % 2 ? 1 : -1, xx = -26 + 1.25 * Math.floor(k / 2) + 0.3 * Math.sin(k), z = side * (6.1 + 0.8 * (k % 3) * 0.6);
        const cheer = f >= EV.TAPE15 - 4;
        stand(out, cam, 600 + k, fan1905(k), "f05_" + k, [xx, 0.16, z], { expr: cheer ? (["laugh", "grin", "proud"] as Expr[])[k % 3] : "smile", armR: cheer || k % 3 === 0 ? "wave" : undefined, wave: q(0.5 + 0.5 * Math.sin(t * 8 + k), 4), prop: k % 5 === 2 ? "parasol" : null, facing: side > 0 ? -1 : 1 }, t);
      }
      const c = carsAt(15, F)[0];
      rider(out, cam, W_(27, driver(2), "drv2"), c, CAR_SEAT.frontL, { expr: f >= EV.HONK15 - 4 ? "grin" : "smile", facing: 1, armR: f >= EV.HONK15 - 4 && f < EV.HONK15 + 10 ? "point" : undefined }, t);
      if (f >= EV.HONK15 - 1 && f < EV.HONK15 + 14) { const hp = carPt(c, [0.72, 1.3, 1.3]), u = (f - EV.HONK15 + 1) / 15; fxc(out, `honk${q(u, 8)}`, 500, 500, (p) => fxBurst(p, q(u, 8), "#fff3b0", 8, 40, 200), hp, 1.2, 1.2, { glow: 1.3 }); poof(out, carPt(c, [0, 0.5, -2.0]), 1.0, f, EV.HONK15, 14); }
      const lp: V3 = [x, 0, 0.0];
      if (f < EV.TAPE15 + 14) mover(out, cam, WHO.lorz, lp, [1, 0, 0], x, t, { expr: f < EV.BOSTON15 - 4 ? "stern" : "proud", facing: 1, armR: f >= EV.TAPE15 - 2 ? "raise" : undefined, armL: f >= EV.TAPE15 - 2 ? "raise" : undefined }, "run");
      else {
        const feet = f >= EV.FEET15 - 2 && f < EV.FEET15 + 8, wave = f >= EV.HONK15 - 2 && f < EV.WINK15 - 2;
        stand(out, cam, WHO.lorz.i, WHO.lorz.o, WHO.lorz.okey, lp, {
          expr: f < EV.FEET15 - 2 ? "proud" : feet ? "blank" : f < EV.HONK15 - 2 ? "sheepish" : wave ? "annoyed" : f < EV.WINK15 - 2 ? "sheepish" : f < EV.WINK15 + 14 ? "wink" : "sheepish",
          gaze: feet ? 1 : 0, headTilt: feet ? 8 : f >= EV.WINK15 - 2 ? -6 : 0, facing: wave ? -1 : 1, look: wave ? -1 : 0,
          armR: f < EV.FEET15 - 6 ? "raise" : wave ? "wave" : undefined, armL: f < EV.FEET15 - 6 ? "raise" : undefined, wave: q(0.5 + 0.5 * Math.sin(t * 12), 6),
        }, t);
        if (f >= EV.WINK15 - 1 && f < EV.WINK15 + 20) sparkle(out, [x + 0.25, 1.75, 0.3], f, EV.WINK15 - 1, 0.5, 1.5);
      }
      if (f >= EV.TAPE15 && f < EV.TAPE15 + 20) sparkle(out, [0.1, 1.5, 0.2], f, EV.TAPE15, 1.1, 1.5);
      break;
    }
  }
  void fwd; void G; void speed; void rollAlong; void _v; void at; void talk; void sitter; void H; void bodySide; void fxSpeed; void fxBurst; void fxDust; void blob;
  return out;
};
