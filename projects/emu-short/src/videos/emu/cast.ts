// Our cast as lit flat sprites in the 3D world (owner: characters, with toon.ts / cardshade.ts). Each frame every
// character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing. Characters and
// emus are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward the sun, painted
// crescent in the drawing); standing ones get a soft multiply contact blob. Effects (muzzle flashes, dust, smoke,
// sparkles, the jammed spring) are unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass
// never outlines their quads. Herds of 100+ emus stay cheap: drawings are keyed by (pose, quantised phase, tint, size
// tier), so a whole herd shares a few dozen canvases.
// CONTRACT with world.ts: stage(id, t, cam, rig) -> { places, fx }; Pool / Actor / Fx draw them.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxContact, fxShadow, fxSmoke, fxSparkle, fxSpeed, fxStars, fxBurst, fxMuzzle, fxDust, fxSpring, fxClack,
  Outfit, Expr, FrontOpts, SideOpts, ArmPose, ArmSpec, emuSide, EmuOpts, EmuPose, EmuEye,
  GUNNER, SERGEANT, MAJOR, FARMER, ENEMY,
} from "./toon";
import {
  FPS, SHOTS, SPOT, V3, Light, smooth, clamp01, EV, TruckPose, GunPose, truckPt, truck9X, emu12At, farmHill, paddockRise, damY, CRATE, STACK_N,
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
  dusk: [0.58, 0.55, 0.66] };
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
