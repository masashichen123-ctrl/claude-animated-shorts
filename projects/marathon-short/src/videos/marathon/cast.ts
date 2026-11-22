// Our cast as lit flat sprites in the 3D world (owner: characters, with toon.ts / cardshade.ts). Each frame every
// character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing. People are
// yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward the sun, painted crescent in
// the drawing); standing ones get a soft multiply contact blob. SEAGULLS and items (blubber chunks, crates, the
// basket, umbrellas, the thought bubble) are lit square billboard cards keyed by (pose, quantised phase, expression,
// size tier). Effects (the blast's fireball + sand / smoke clouds, dust, splats, stink lines, fuse sparks, POOF) are
// unlit cards; glow > 1 blooms. Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines
// their quads. The crowd on the dunes is ~45 seeded 1970s locals.
// CONTRACT with world.ts: stage(id, t, cam, rig) -> { places, fx, lights }; Pool / Actor / Fx draw them.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxContact, fxShadow, fxSmoke, fxDustCloud, fxSparkle, fxSpeed, fxBurst, fxDust,
  Outfit, Expr, FrontOpts, SideOpts, ArmPose, ArmSpec, fxFireball, fxPoof,
  gullDraw, GullOpts, GullPose, GullExpr, fxChunk, fxSplat, fxStink, fxThought, fxUmbrella,
  ENGINEER, ENGINEER_SOOT, crew, local70, KID70, REPORTER, CAMERAMAN, PARENT16, KID16,
} from "./toon";
import { FPS, SHOTS, SPOT, V3, Light, smooth, clamp01, easeOut, lerp, EV, beachY, ropeAt, sticksK, cratesN, plungerK, dozerAt } from "./story";
import { STICK_SPOTS, CRATE_SLOTS } from "./build";
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
const CONTACT: Record<string, [number, number, number]> = { day: [0.62, 0.6, 0.66], sunny: [0.6, 0.6, 0.66] };
const TAIL: [number, number, number] = [0.72, 0.7, 0.78];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day" || LNAME === "sunny") {
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

// ---------------- seagulls + lit items ----------------
const _cp = new THREE.Vector3();
type GullSpec = { pose: GullPose; phase?: number; expr?: GullExpr; look?: number; size?: number; roll?: number; mirror?: boolean; blink?: boolean };
/** one seagull: a square billboard card of `size` metres centred on p (its feet sit 0.43 x size below the centre) */
const gull = (out: Stage, cam: CamInfo, i: number, p: V3, o: GullSpec, t: number) => {
  const size = o.size ?? 0.6, d = cam.pos.distanceTo(_cp.set(p[0], p[1], p[2]));
  if (d < 0.5) return;
  const px = (size / Math.max(0.05, d)) * 1900 * 1.33;
  const cw = px > 700 ? 1024 : px > 330 ? 512 : px > 150 ? 256 : 128, lod = cw <= 128 ? 0 : 1;
  const fly = o.pose === "fly" || o.pose === "flee";
  const go: GullOpts = { pose: o.pose, phase: fly ? q((((o.phase ?? 0) % 1) + 1) % 1, lod ? 12 : 6) : 0, expr: o.expr ?? "open", look: q(o.look ?? 0, 4),
    blink: o.blink === false || !lod ? 0 : lidAt(t, i + 300), light: lod ? light2D(cam, !!o.mirror) : -2.2, lod };
  out.places.push({ key: `G|${fkey(go)}`, draw: (pn) => gullDraw(pn, go), x: p[0], y: p[1], z: p[2], scale: size, sq: true, billboard: true, mirror: o.mirror, roll: o.roll ?? 0, size: [cw, cw, cw / 600] });
};
/** wing-beat phase of a gull (~3 Hz) */
const flap = (f: number, i: number, rate = 9) => (f / rate + H(i, 7)) % 1;
/** a lit square item card (a blubber chunk, a crate, a basket): `size` metres, centred on p */
const item = (out: Stage, key: string, draw: (p: Pen) => void, p: V3, size: number, roll = 0, cw = 512) =>
  out.places.push({ key: "I|" + key, draw, x: p[0], y: p[1], z: p[2], scale: size, sq: true, billboard: true, roll, size: [cw, cw, cw / 600] });
const chunk = (out: Stage, p: V3, size: number, seed: number, roll = 0) => item(out, `chunk${seed % 6}`, (pn) => { const g = pn.g; g.save(); g.scale(1.5, 1.5); fxChunk(pn, seed % 6); g.restore(); }, p, size, roll, size > 1.2 ? 512 : 256);
/** a flat blubber splat on the ground */
const splat = (out: Stage, c: V3, size: number, seed: number) =>
  out.fx.push({ key: `splat${seed % 4}`, cw: 400, ch: 400, draw: (p) => fxSplat(p, seed % 4), x: c[0], y: c[1] + 0.03, z: c[2], w: size, h: size, flat: true, rot: seed });
/** a chunk falling from the sky onto ground point g at frame f0 (lands then squashes + splats) */
const fallChunk = (out: Stage, g: V3, f: number, f0: number, size: number, seed: number, from = 26) => {
  const u = (f0 - f) / from;
  if (u > 1) return;
  if (u > 0) { chunk(out, [g[0] + 2.0 * u, g[1] + size * 0.4 + 40 * u * u, g[2] - 1.0 * u], size, seed, 0.3 * u); return; }
  const s = (f - f0) / FPS;
  splat(out, g, size * 1.9, seed);
  if (s < 0.6) puff(out, [g[0], g[1] + 0.3, g[2]], s, size * 1.6, 0.6, seed, SAND);
  chunk(out, [g[0], g[1] + size * 0.3, g[2]], size * (1 + 0.15 * Math.exp(-s * 8)), seed);
};
const SAND = "#e6cf9c";
/** green stink lines rising off a point */
const stink = (out: Stage, c: V3, size: number, f: number, seed = 0) => {
  const k = q(((f / 20 + seed * 0.37) % 1 + 1) % 1, 10);
  out.fx.push({ key: `stink${k}`, cw: 300, ch: 400, draw: (p) => fxStink(p, k), x: c[0], y: c[1] + size * 0.6, z: c[2], w: size * 0.75, h: size, soft: false });
};
/** fuse sparkle: a hot little star that flickers on every frame */
const fuse = (out: Stage, c: V3, f: number, k: number) => {
  const ph = q(((f * 0.37 + k * 0.21) % 1), 6);
  out.fx.push({ key: `fuse${ph}`, cw: 200, ch: 200, draw: (p) => { const g = p.g; g.save(); g.scale(0.4, 0.4); fxBurst(p, 0.3 + 0.4 * ph, "#ffd23a", 8, 30, 200); g.restore(); }, x: c[0], y: c[1], z: c[2], w: 0.8, h: 0.8, glow: 2.4 });
};

// ---------------- fire + bangs ----------------
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
  out.fx.push({ key: `poof${k}`, cw: 400, ch: 400, draw: (p) => fxPoof(p, k), x: c[0], y: c[1], z: c[2], w: size, h: size, glow: 1.4 });
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
/** a big cloud lobe that grows over `grow` frames from f0 and then fades over `life` seconds (an explosion's body) */
const bigCloud = (out: Stage, c: V3, size: number, f: number, f0: number, life: number, seed: number, tint: string, rise = 0) => {
  const s = (f - f0) / FPS;
  if (s < 0 || s > life) return;
  const u = q(Math.min(0.64, 0.1 + s / life * 0.55) + Math.max(0, s / life - 0.64), 24), g = easeOut(s / 0.3);
  out.fx.push({ key: `cloud${u}|${seed % 4}|${tint}`, cw: 512, ch: 512, draw: (p) => { const gg = p.g; gg.save(); gg.scale(1.28, 1.28); fxDustCloud(p, u, seed % 4, tint); gg.restore(); },
    x: c[0], y: c[1] + rise * s, z: c[2], w: size * (0.55 + 0.45 * g), h: size * (0.55 + 0.45 * g), soft: true });
};

// ---------------- the crowd on the dunes ----------------
type Folk = { i: number; p: V3; o: Outfit; key: string; prop?: "basket" | "umbrella"; kid?: boolean };
const CROWD: Folk[] = (() => {
  const out: Folk[] = [], C = SPOT.CROWD;
  let i = 0;
  for (const [row, z0, n] of [[0, 39.3, 16], [1, 41.0, 15], [2, 42.7, 14]] as number[][]) for (let k = 0; k < n; k++) {
    const x = C[0] - 16 + (32 * (k + 0.5 * (row % 2) + 0.3 * (H(i, 81) - 0.5))) / n, z = z0 + (H(i, 82) - 0.5) * 0.8;
    out.push({ i: 100 + i, p: [x, beachY(x, z) - 0.04, z], o: local70(i * 3 + row), key: "l70_" + ((i * 3 + row) % 48), prop: i === 9 ? "basket" : i % 11 === 4 ? "umbrella" : undefined });
    i++;
  }
  return out;
})();
const UMB_COL = ["#e2453c", "#2f8ad0", "#f2b234", "#3a9a5a"];
/** the dune crowd: `mood` picks the expression track; panic = scatter (run outward from where they stood) */
const crowd = (out: Stage, cam: CamInfo, f: number, t: number, mood: "cheer" | "tense" | "up" | "panic", f0 = 0) => {
  const C = SPOT.CROWD;
  for (const c of CROWD) {
    const d = cam.pos.distanceTo(_cp.set(c.p[0], c.p[1] + 1, c.p[2]));
    if (d < (mood === "panic" || mood === "up" ? 7.5 : 3.6)) continue; // nobody blurred big right at the lens
    let p = c.p, fo: FrontOpts = {}, facing: -1 | 1 = H(c.i, 83) < 0.5 ? -1 : 1;
    if (mood === "cheer") {
      const w = H(c.i, 84) < 0.35;
      fo = { expr: (["smile", "grin", "smile_closed", "speak", "laugh"] as Expr[])[Math.floor(H(c.i, 85) * 5)], armR: w ? "wave" : undefined, wave: w ? q(0.5 + 0.5 * Math.sin(t * 8 + c.i), 8) : undefined, look: q(Math.sin(t * 0.8 + c.i) * 0.8, 4) };
      if (c.kid) fo.expr = "laugh";
    } else if (mood === "tense") fo = { expr: H(c.i, 86) < 0.5 ? "nervous" : "blank", gaze: 0.6, shrug: 0.6, sweat: H(c.i, 87) < 0.3 ? sweatAt(f, 898) : undefined };
    else if (mood === "up") {
      const down = f >= EV.DOWN11 - 2 - Math.floor(4 * H(c.i, 88));
      fo = { expr: down ? (H(c.i, 89) < 0.5 ? "shock" : "jawdrop") : (H(c.i, 85) < 0.5 ? "grin" : "awe"), gaze: -1, look: q(0.4 * Math.sin(c.i), 4), shrug: down ? 1 : 0 };
    } else { // panic: run outward from the crowd centre, arms up, shrieking
      // everyone runs AWAY from the lens (along the crest and over the back of the dune), never into it
      const s = Math.max(0, (f - f0 - 3 * H(c.i, 90)) / FPS), awayX = -Math.sign(cam.pos.x - c.p[0] + 0.01), dir = awayX, run = 3.6 * s;
      const x = c.p[0] + dir * run * (0.5 + 0.4 * H(c.i, 94)), z = c.p[2] + (H(c.i, 91) - 0.2) * run * 0.9;
      p = [x, beachY(x, z) - 0.04, z]; facing = (dir * cam.right.x >= 0 ? 1 : -1) as -1 | 1;
      fo = { expr: H(c.i, 92) < 0.5 ? "yell" : "shock", mode: "march", phase: q((t * 2.6 + H(c.i, 93)) % 1, 12), lift: 90, armR: c.prop === "umbrella" ? undefined : "up", armL: "up", lean: 8 };
    }
    if (c.prop === "basket" && mood !== "panic") fo.prop = "basket";
    stand(out, cam, c.i, c.o, c.key, p, { ...fo, facing }, t);
    if (c.prop === "umbrella" && (mood === "panic" || mood === "up") && d > 7) { // pops open over the head (audio: @1035 / 1050 / 1053)
      const fo2 = [1035, 1050, 1053, 1053][Math.floor((c.i - 100) / 11) % 4];
      const k = mood === "panic" ? easeOut((f - fo2 + 2) / 5) : 0, ck = c.i % 4;
      item(out, `umb${q(k, 6)}|${ck}`, (pn) => fxUmbrella(pn, q(k, 6), UMB_COL[ck]), [p[0] + 0.25, p[1] + 2.0 + 0.25 * k, p[2] + 0.05], 1.3 + 0.5 * k, -0.15 * facing, 512);
    }
  }
};

/** what world.ts posed this frame (nothing yet: the sets' ticks pose the moving props) */
export type RigInfo = Record<string, never>;

// ---------------- per-shot staging ----------------
/** everything with a face, and every effect card, in shot `id` at time t (pure function of id + t) */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], lights: [] };
  const s = SHOTS[id - 1], f = t * FPS, F = Math.round(f);
  LNAME = s.light;
  findSun(cam, SUN);
  const S = SPOT, W = S.WHALE, wy = beachY(W[0], W[2]) - 0.05;
  const B = (x: number, z: number): V3 => [x, beachY(x, z), z];
  switch (id) {
    case 1: { // HOOK: the Engineer proud beside the plunger box; "dynamite": sticks pop up along the back, fuses fizz
      actor(out, cam, 1, ENGINEER, "eng", B(S.ENG1[0], S.ENG1[2]), [
        { f: 0, expr: "proud", lean: -3, headTilt: -4, look: -0.4, armB: "hip" },
        { f: 57, expr: "smile_closed", headTilt: 5 },                         // "Oregon"
        { f: 96, expr: "grin", armF: "point", look: -1, lean: 3 },             // "whale"
        { f: EV.DYN1, expr: "proud", armF: "up", headTilt: -6, lean: -2 },      // "dynamite"
      ], t, -1, (fo) => ({ ...fo, prop: f < 90 ? "clipboard" : null }));
      gull(out, cam, 2, [W[0] + 4.6, wy + 4.25, W[2] + 0.4], { pose: "stand", size: 0.75, look: f > 100 ? 1 : 0, expr: f > EV.DYN1 ? "shock" : "open", mirror: true }, t);
      if (f >= EV.DYN1) STICK_SPOTS.forEach(([x, y, z], k) => {
        if (sticksK(f, k) < 0.8) return;
        const a = k * 0.7;
        fuse(out, [W[0] + x + 0.35 * Math.cos(a), wy + y - 0.25 + 1.89, W[2] + z - 0.35 * Math.sin(a)], F, k);
      });
      if (f >= EV.DYN1) sparkle(out, [W[0], wy + 4.6, W[2] + 0.5], f, EV.DYN1, 3.2, 1.6);
      break;
    }
    case 2: { // after: still there, smoking; the sooty Engineer, deadpan; a chunk plops onto his hat; KICK
      const ep = B(S.ENG1[0], S.ENG1[2]), hit = f >= EV.PLOP2;
      actor(out, cam, 1, ENGINEER_SOOT, "engS", ep, [
        { f: 136, expr: "dazed", headTilt: 8, shrug: 0.6 },
        { f: 152, expr: "blank", headTilt: -3, shrug: 0 },
        { f: EV.PLOP2, expr: "pained", shrug: 1, headTilt: 0, dur: 3 },
      ], t, -1, (fo) => ({ ...fo, hatTilt: -0.25, hatLift: hit ? -0.08 : 0 }));
      smokeCol(out, [W[0] - 1.2, wy + 2.6, W[2] + 0.2], f, 7, 3.2, SMOKE, 5, 1.6, 0.5, 1); smokeCol(out, [W[0] + 3.5, wy + 4, W[2]], f, 6, 2.4, SMOKE_D, 6, 1.4, 0.3, 4);
      smokeCol(out, [ep[0] - 0.1, ep[1] + 1.9, ep[2] + 0.1], f, 4, 0.5, "#9a9296", 5, 0.6, 0.05, 3);
      // the chunk: falls into frame and lands on the hat crown, squashes, stays
      const hy = ep[1] + 2.02, u = (EV.PLOP2 - f) / 10;
      if (u > 0 && u <= 1) chunk(out, [ep[0] + 0.05, hy + 0.18 + 5 * u * u, ep[2] + 0.12], 0.62, 3, 0.4 * u);
      else if (u <= 0) { const sq = Math.exp(-(f - EV.PLOP2) / 3); item(out, "plopchunk", (pn) => { const g = pn.g; g.save(); g.translate(300, 330); g.scale(1.5, 1.5 * (1 - 0.25 * sq)); g.translate(-200, -210); fxChunk(pn, 3); g.restore(); }, [ep[0] + 0.05, hy + 0.12, ep[2] + 0.12], 0.62, 0.15, 512); }
      break;
    }
    case 3: { // establishing; tiny locals beside the whale for scale; gulls overhead
      [[5.5, 3.6], [6.6, 4.4], [-2.5, 3.8], [-4.4, 4.3], [1.2, 4.9]].forEach(([x, z], k) => stand(out, cam, 30 + k, local70(k * 5 + 1), "l70_" + ((k * 5 + 1) % 48), B(x, z), { expr: k % 2 ? "awe" : "nervous", facing: x > 0 ? -1 : 1, look: -0.6, armR: k === 0 ? "point" : undefined }, t));
      for (let k = 0; k < 6; k++) { const a = f * 0.02 + k * 1.05; gull(out, cam, 40 + k, [W[0] + 6 * Math.cos(a), 9 + 1.5 * Math.sin(a * 2), W[2] - 2 + 5 * Math.sin(a)], { pose: "fly", phase: flap(f, k), size: 0.9, roll: 0.2 * Math.sin(a) }, t); }
      break;
    }
    case 4: { // the tug of war: five locals haul on the rope; it snaps, they tumble; the smell: noses pinched, a gull faints
      const snap = f >= EV.SNAP4, smell = f >= EV.SMELL4 - 2;
      for (let k = 0; k < 5; k++) {
        // audio/cues.md: the tumbles land @376 / @380 / @384 (a 9-frame fall each)
        const fs = [367, 367, 371, 375, 375][k], down = f >= fs;
        const fall = down ? easeOut((f - fs) / 9) : 0, q0 = ropeAt(3.0 + 1.05 * k + (1.3 + 0.15 * k) * fall);
        const p = B(q0[0] + 0.25 * (k % 2 ? 1 : -1), q0[2]);
        if (!down) {
          actor(out, cam, 50 + k, local70(k * 7 + 2), "l70_" + ((k * 7 + 2) % 48), p, [
            { f: 334, expr: "pained", lean: -12 - 2 * (k % 2), armF: "pull", armB: "pull" },
            { f: 350, expr: k % 2 ? "yell" : "pained", lean: -16 },
            { f: EV.SNAP4, expr: "shock", lean: -22, armF: "up", armB: "up", dur: 3 },
          ], t, faceTo(cam, p, [W[0] - 7.6, 0, W[2]]), (fo) => ({ ...fo, tilt: -4 + 2 * Math.sin(f * 0.6 + k), lift: 0 }));
        } else if (f < fs + 18) {
          out.places.push(person(cam, { i: 50 + k, o: local70(k * 7 + 2), okey: "l70_" + ((k * 7 + 2) % 48) }, p[0], p[1], p[2], { side: false, mirror: false }, { mode: "fall", expr: k % 2 ? "shock" : "dazed", facing: 1, blink: 0 }, {}));
          if (f - fs >= 8 && f - fs < 26) puff(out, [p[0], p[1] + 0.3, p[2]], (f - fs - 8) / FPS, 1.4, 0.6, k, SAND);
        } else sitter(out, cam, 50 + k, local70(k * 7 + 2), "l70_" + ((k * 7 + 2) % 48), p, [
          { f: 384, expr: "dazed", headTilt: 8 },
          { f: EV.SMELL4, expr: "pained", armF: "pinch", headTilt: -6, shrug: 1, dur: 3 },
        ], t, 1, (fo) => ({ ...fo, armR: smell ? "pinch" : undefined }));
      }
      if (snap && f < EV.SNAP4 + 12) { const q1 = ropeAt(2.1); poof(out, [q1[0], 1.3, q1[2]], 1.4, f, EV.SNAP4, 10); }
      if (smell) for (let k = 0; k < 5; k++) stink(out, [W[0] - 5 + 2.4 * k, wy + 2.2 + 0.6 * (k % 2), W[2] + 0.8], 2.6, f, k);
      // the gull on the post: sniffs, then faints off it backwards
      const Pt = S.POST4, top = beachY(Pt[0], Pt[2]) + 1.35, gs = 0.7;
      if (f < EV.SMELL4 + 2) gull(out, cam, 60, [Pt[0], top + 0.43 * gs, Pt[2]], { pose: "stand", size: gs, expr: f > 396 ? "lick" : "open", mirror: true }, t);
      else { const u = clamp01((f - EV.SMELL4 - 2) / 14); gull(out, cam, 60, [Pt[0] + 0.7 * u, lerp(top + 0.43 * gs, beachY(Pt[0], Pt[2]) + 0.22, u * u), Pt[2] + 0.2 * u], { pose: "faint", size: gs, roll: -1.9 * easeOut(u), mirror: true }, t); }
      break;
    }
    case 5: { // the orange truck pulls up; the crew hop out; the Engineer steps forward, confident
      const T5 = S.TRUCK5;
      if (f >= 436 && f < 452) puff(out, [T5[0] - 3, 0.6, T5[2] + 1.3], (f - 436) / FPS, 2.4, 0.55, 2, SAND);
      for (let k = 0; k < 3; k++) {
        const h0 = [482, 488, 468][k], u = clamp01((f - h0) / 8);
        if (f < h0) continue;
        const x = T5[0] - 2.2 + 1.5 * k + 0.6 * u, z = T5[2] + 1.6 + 1.4 * u, jump = 0.5 * Math.sin(Math.PI * u);
        actor(out, cam, 70 + k, crew(k), "crew" + k, [x, jump + 0.3, z], [
          { f: h0, expr: "grin", lean: 3, armF: "up" },
          { f: h0 + 10, expr: k === 1 ? "proud" : "smile", armF: "hang", lean: 0 },
        ], t, k === 2 ? 1 : -1, (fo) => ({ ...fo, prop: k !== 1 && f > h0 + 9 ? "shovel" : null }));
      }
      if (f >= 452) {
        const u = smooth((f - 452) / 14), ep: V3 = [lerp(T5[0] - 3.4, T5[0] - 5.6, u), 0.3, lerp(T5[2] + 1.8, T5[2] + 3.4, u)];
        actor(out, cam, 1, ENGINEER, "eng", ep, [
          { f: 452, expr: "smile", lean: 4 },
          { f: EV.CONF5, expr: "proud", armB: "hip", headTilt: -7, lean: -3, dur: 4 },
        ], t, -1, (fo) => ({ ...fo, prop: "clipboard", mode: f < 466 ? "stroll" : "stand", phase: q((f / 16) % 1, 16) }));
        if (f >= EV.CONF5) sparkle(out, [ep[0] - 0.3, 2.3, ep[2]], f, EV.CONF5, 0.9, 1.5);
      }
      break;
    }
    case 6: {
      if (f < EV.CUT6) { // the Engineer studies the whale; the thought bubble: whale -> boulder
        const ep = B(S.ENG6[0], S.ENG6[2]);
        actor(out, cam, 1, ENGINEER, "eng", ep, [
          { f: 496, expr: "stern", look: -1, gaze: -0.4, headTilt: 6, lean: 3 },
          { f: 530, expr: "neutral", headTilt: -5 },
          { f: EV.BUBBLE6, expr: "awe", gaze: -1, headTilt: 0, dur: 3 },
          { f: 566, expr: "grin", armF: "point" },
        ], t, 1, (fo) => ({ ...fo, prop: f < 566 ? "clipboard" : null }));
        if (f >= EV.BUBBLE6 - 2) {
          const pop = easeOut((f - EV.BUBBLE6 + 2) / 5), k = q(smooth((f - 560) / 12), 12);
          item(out, `thought${k}`, (pn) => { const g = pn.g; g.save(); g.translate(0, 40); g.scale(0.94, 0.94); fxThought(pn, k); g.restore(); }, [ep[0] + 0.55, ep[1] + 2.55, ep[2] - 0.5], 1.45 * pop, 0, 1024);
        }
      } else { // the crew stack crate after crate of dynamite against the whale
        const n = cratesN(6, f);
        for (let k = 0; k < 3; k++) {
          const carrying = Math.floor((f - EV.CUT6) / 4 + k) % 3 !== 0, x = S.CRATES[0] - 2.6 + 2.6 * k + 0.4 * Math.sin(f * 0.15 + k);
          const p = B(x, S.CRATES[2] + 2.0 + 0.3 * k);
          actor(out, cam, 80 + k, crew(k), "crew" + k, p, [
            { f: EV.CUT6, expr: k === 1 ? "pained" : "grin", lean: 6 },
            { f: 610, expr: k === 1 ? "nervous" : "proud" },
          ], t, k === 0 ? 1 : -1, (fo) => ({ ...fo, armR: carrying ? "out" : "hang", armL: carrying ? "out" : "hang", mode: "stroll", phase: q((f / 14 + k * 0.3) % 1, 14), sweat: k === 1 ? sweatAt(f, 600) : undefined }));
          if (carrying) item(out, "crateItem", crateItem, [p[0] + 0.15, p[1] + 1.25, p[2] + 0.25], 0.85, 0.05 * Math.sin(f * 0.3 + k), 512);
        }
        if (n > 3 && F % 4 === 0) sparkle(out, [CRATE_SLOTS[n - 1][0], CRATE_SLOTS[n - 1][1] + 0.6, CRATE_SLOTS[n - 1][2] + 0.4], f, F, 0.5, 1.3);
      }
      break;
    }
    case 7: {
      if (f < EV.CUT7) { // the plan on the easel: whale -> arrow -> tiny bits
        actor(out, cam, 1, ENGINEER, "eng", B(S.ENG7[0], S.ENG7[2]), [
          { f: 648, expr: "proud", armF: "point", look: 1, lean: -3 },
          { f: 655, expr: "speak", headTilt: -5 },                            // "plan?"
          { f: 688, expr: "grin", armF: "up", look: 0, headTilt: 5 },          // "whale"
          { f: 708, expr: "laugh", armF: "point", look: 1 },                  // "pieces"
          { f: 730, expr: "proud", armB: "hip" },
        ], t, 1, (fo) => ({ ...fo, expr: talk(t, 652 / FPS, 728 / FPS, fo.expr ?? "proud") }));
        if (f >= 653) sparkle(out, [S.EASEL[0] - 0.2, beachY(S.EASEL[0], S.EASEL[2]) + 1.7, S.EASEL[2] + 0.3], f, 653, 0.6, 1.4); // easel tap @655
        [[1.9, 9.4], [1.0, 8.6]].forEach(([x, z], k) => actor(out, cam, 72 + k, crew(k), "crew" + k, B(x, z), [
          { f: 648, expr: "nervous", look: 1, gaze: 0.3 },
          { f: 710, expr: k ? "awe" : "smile_closed" },
        ], t, 1));
      } else { // four seagulls on the log in bibs with forks, licking their beaks
        const L = S.LOG7, top = beachY(L[0], L[2]) + 0.58, gs = 0.82;
        for (let k = 0; k < 4; k++) gull(out, cam, 90 + k, [L[0] - 1.35 + 0.9 * k, top + 0.43 * gs - 0.04, L[2] + 0.05], { pose: "bib", size: gs, expr: Math.floor(f / 6 + k) % 2 ? "lick" : "happy", look: 0.5 * Math.sin(k), mirror: k >= 2 }, t);
      }
      break;
    }
    case 8: { // the crowd on the dunes (a kid on shoulders, a picnic basket); the TV reporter + cameraman, a lens glint
      crowd(out, cam, f, t, "cheer");
      { const C = S.CROWD, x = C[0] + 1.6, z = 39.0, p = B(x, z); // dad with the kid on his shoulders
        stand(out, cam, 150, local70(5), "l70_5", p, { expr: "grin", facing: 1, armR: "up", armL: "up" }, t);
        out.places.push(person(cam, { i: 151, o: KID70, okey: "kid70" }, p[0], p[1] + 1.26, p[2] - 0.05, { side: false, mirror: false }, { mode: "sit", expr: "laugh", facing: 1, armR: "wave", armL: "up", wave: q(0.5 + 0.5 * Math.sin(t * 9), 8), blink: lidAt(t, 151) }, {})); }
      const R = S.REPORTER, Cm = S.CAMERAMAN;
      actor(out, cam, 160, REPORTER, "reporter", B(R[0], R[2]), [
        { f: 768, expr: "smile", look: -1 },
        { f: EV.TV8, expr: "speak", look: -1, headTilt: -4 },
      ], t, -1, (fo) => ({ ...fo, prop: "mic", expr: f >= EV.TV8 ? talk(t, EV.TV8 / FPS, 900 / FPS, "smile") : fo.expr }));
      actor(out, cam, 161, CAMERAMAN, "cameraman", B(Cm[0], Cm[2]), [{ f: 768, expr: "neutral", look: 1, lean: 3 }], t, 1, (fo) => ({ ...fo, prop: "filmcam" }));
      if (f >= 856) sparkle(out, [Cm[0] + 0.55, beachY(Cm[0], Cm[2]) + 1.72, Cm[2] + 0.2], f, 856, 0.8, 2.2);
      for (let k = 0; k < 3; k++) { const a = f * 0.015 + k * 2; gull(out, cam, 170 + k, [S.CROWD[0] + 8 * Math.cos(a), 14 + 2 * k, 36 + 6 * Math.sin(a)], { pose: "fly", phase: flap(f, k), size: 0.9 }, t); }
      break;
    }
    case 9: {
      if (f >= EV.INSERT9[0] && f < EV.INSERT9[1]) { crowd(out, cam, f, t, "tense"); break; }
      // the plunger close-up: the Engineer's hands on the T-handle; the push
      const Pl = S.PLUNGER, pk = plungerK(9, f);
      actor(out, cam, 1, ENGINEER, "eng", B(Pl[0] - 0.36, Pl[2] - 0.22), [
        { f: 890, expr: "stern", gaze: 1, lean: 8, armF: "out", armB: "out" },
        { f: EV.HOLD9, expr: "nervous", shrug: 0.6 },
        { f: EV.PUSH9 - 1, expr: "pained", armF: "hold", armB: "hold", lean: 12, shrug: 1, dur: 3 },
      ], t, 1, (fo) => ({ ...fo, sweat: sweatAt(f, 900), tilt: 2 * pk }));
      if (f >= EV.PUSH9) sparkle(out, [Pl[0], beachY(Pl[0], Pl[2]) + 0.6, Pl[2] + 0.3], f, EV.PUSH9, 0.7, 1.6);
      break;
    }
    case 10: { // BOOM: a gigantic cartoon explosion of sand, smoke and cream blubber chunks flying high
      const c: V3 = [W[0], wy + 2, W[2]];
      if (f >= EV.BOOM10 - 1) {
        const u = (f - EV.BOOM10) / FPS;
        out.lights.push({ p: [c[0] + 6, c[1] + 4, c[2] + 14], I: 120 * Math.max(0.1, 1 - u * 1.5), col: "#ffc070", d: 120 });
        // the hot core: a bright white-yellow starburst inside a swelling fireball (both bloom)
        const cu = (f - EV.BOOM10 + 1) / 10;
        if (cu < 1) out.fx.push({ key: `core${q(cu, 10)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(cu, 10), "#fff3b0", 14, 60, 240), x: c[0], y: c[1] + 3, z: c[2] + 3, w: 22 * (0.7 + 0.5 * cu), h: 22 * (0.7 + 0.5 * cu), glow: 2.6 * (1 - 0.6 * cu) });
        fireball(out, [c[0], c[1] + 3, c[2] + 2.5], 20, f, EV.BOOM10 - 1, 13, 1);
        // the towering column of sand + smoke: lobes stacked up the frame, already big on the first frames
        const lobes: [number, number, number, number][] = [[0, 0, 24, 0], [-8, 0, 18, 1], [8, 1, 18, 2], [-3, 8, 20, 3], [4, 13, 18, 4], [-1, 19, 18, 5], [-6, 16, 14, 6], [6, 6, 16, 7], [1, 25, 15, 8], [-3, 30, 12, 9]];
        lobes.forEach(([dx, dy, sz, k]) => bigCloud(out, [c[0] + dx, c[1] + dy * (0.45 + 0.55 * easeOut(u / 0.5)), c[2] + 1 - k * 0.3], sz * 1.15, f, EV.BOOM10 - 1 + Math.floor(k / 3), 3.0, k, k % 3 === 2 ? "#a8a0a2" : k % 4 === 3 ? "#cfc2b0" : SAND, 1.5));
        const toCam = [0.39, 0.92];
        for (let k = 0; k < 64; k++) { // blubber chunks: ballistic, cartoon gravity; a third of them fly out toward the lens
          const s = (f - EV.BOOM10 + 1 - (k % 3)) / FPS;
          if (s <= 0) continue;
          const a = H(k, 61) * 6.28, sp = 6 + 10 * H(k, 62), vy = 18 + 24 * H(k, 63), out2 = k % 3 === 0 ? 9 + 8 * H(k, 68) : 0;
          const p: V3 = [c[0] + Math.cos(a) * sp * s + toCam[0] * out2 * s, c[1] + 1 + vy * s - 14 * s * s, c[2] + 2 + Math.sin(a) * sp * s * 0.6 + toCam[1] * out2 * s];
          if (p[1] < 0.3) continue;
          chunk(out, p, 1.0 + 1.8 * H(k, 64), k, s * (H(k, 65) - 0.5) * 6);
        }
        for (let k = 0; k < 10; k++) { const s = (f - EV.BOOM10) / FPS; if (s > 0 && s < 0.7) out.fx.push({ key: `dust${q(s / 0.7, 10)}|${k % 3}`, cw: 400, ch: 400, draw: (p) => fxDust(p, q(s / 0.7, 10), k % 3, "#d9bc84"), x: c[0] + (H(k, 66) - 0.5) * 22, y: 1 + 4 * s, z: c[2] + 4 + (H(k, 67) - 0.5) * 6, w: 6, h: 6 }); }
      } else for (let k = 0; k < 3; k++) { const a = f * 0.03 + k * 2; gull(out, cam, 180 + k, [W[0] + 7 * Math.cos(a), 10 + k, W[2] + 4 * Math.sin(a)], { pose: "fly", phase: flap(f, k), size: 1.2 }, t); }
      break;
    }
    case 11: { // the crowd looks up, smiling; the chunks come DOWN; they scatter, umbrellas pop, the basket gets splatted
      const panic = f >= EV.SCATTER11 - 2;
      crowd(out, cam, f, t, panic ? "panic" : "up", EV.SCATTER11 - 2);
      const C = S.CROWD;
      // falling chunks against the sky, then thuds among the crowd
      for (let k = 0; k < 12; k++) {
        const f0 = 1030 + k * 3 + Math.floor(4 * H(k, 71)), x = C[0] - 10 + 13 * H(k, 72), z = 38.6 + 4.6 * H(k, 73);
        fallChunk(out, B(x, z), f, f0, 0.7 + 0.6 * H(k, 74), k, 34);
      }
      const bk = CROWD[9].p, bp: V3 = [bk[0] + 0.5, bk[1], bk[2] + 0.3];
      if (panic) { // the dropped basket, then a chunk lands right on it
        if (f < 1057) item(out, "basketItem", basketItem, [bp[0], bp[1] + 0.22, bp[2]], 0.55, 0, 512);
        fallChunk(out, bp, f, 1057, 0.9, 5, 16);
      }
      break;
    }
    case 12: { // the reporter keeps talking to camera as chunks thud all round him; one lands on his head; deadpan
      const R = S.REPORTER, rp = B(R[0], R[2]);
      actor(out, cam, 160, REPORTER, "reporter", rp, [
        { f: 1062, expr: "speak", look: 0, gaze: 0 },
        { f: EV.HEAD12, expr: "blank", shrug: 0.8, headTilt: -4, dur: 3 },
        { f: EV.HEAD12 + 8, expr: "speak", shrug: 0 },
      ], t, -1, (fo) => ({ ...fo, prop: "mic", expr: f >= EV.HEAD12 && f < EV.HEAD12 + 8 ? "blank" : talk(t, 1062 / FPS, 1140 / FPS, "smile") }));
      for (let k = 0; k < 12; k++) { // the crowd running in panic across the dune behind him
        const s = (f - 1062) / FPS, dir = k % 2 ? 1 : -1, x = R[0] - 7 + 14 * H(k, 95) + dir * 3.2 * s, z = R[2] + 4 + 6 * H(k, 96);
        stand(out, cam, 240 + k, local70(k * 5 + 3), "l70_" + ((k * 5 + 3) % 48), B(x, z), { expr: k % 3 ? "yell" : "shock", mode: "march", phase: q((t * 2.6 + H(k, 97)) % 1, 12), lift: 90, armR: "up", armL: "up", lean: 8, facing: (dir * cam.right.x >= 0 ? 1 : -1) as -1 | 1 }, t);
      }
      for (let k = 0; k < 6; k++) fallChunk(out, B(R[0] - 6 + 2.6 * k, R[2] + 5 + 3 * H(k, 98)), f, 1068 + 11 * k, 1.1, k + 3, 22);
      fallChunk(out, B(R[0] - 1.8, R[2] + 1.4), f, EV.SPLAT12[0], 1.0, 1, 22);
      fallChunk(out, B(R[0] + 1.6, R[2] + 0.9), f, EV.SPLAT12[1], 0.9, 2, 22);
      fallChunk(out, B(R[0] + 3.4, R[2] + 3.4), f, 1076, 1.2, 4, 22);
      const hy = rp[1] + 1.88, u = (EV.HEAD12 - f) / 14;
      if (u > 0 && u <= 1) chunk(out, [rp[0], hy + 0.22 + 18 * u * u, rp[2] + 0.1], 0.62, 0, 0.5 * u);
      else if (u <= 0) { const sq = Math.exp(-(f - EV.HEAD12) / 3); item(out, "headchunk", (pn) => { const g = pn.g; g.save(); g.translate(300, 330); g.scale(1.5, 1.5 * (1 - 0.3 * sq)); g.translate(-200, -210); fxChunk(pn, 0); g.restore(); }, [rp[0], hy + 0.14, rp[2] + 0.1], 0.62, 0.1, 512); if (f - EV.HEAD12 < 12) sparkle(out, [rp[0], hy + 0.4, rp[2] + 0.2], f, EV.HEAD12, 0.8, 1.4); }
      break;
    }
    case 13: { // the lonely sedan; the smoke cloud small on the horizon; the chunk FLATTENS it
      for (let k = 0; k < 5; k++) bigCloud(out, [-275 + 12 * (k % 3), 14 + 16 * k, -390 - 8 * k], 34 + 8 * k, f, 1000 + k * 4, 12, k, k % 2 ? "#b8b0b2" : "#d8c8a8", 0.5);
      if (f >= 1214) { // audio/cues.md hubcap_roll @1216
        const u = clamp01((f - 1214) / 14), w = 0.4 * Math.sin(u * 14) * (1 - u);
        item(out, "hubcap", hubcapItem, [1.8 + 2.6 * easeOut(u), 0.24 - 0.1 * u * u, 1.3 + 1.6 * easeOut(u)], 0.5, u * 9 + w, 256);
      }
      if (f >= EV.CRUSH13) {
        const s = (f - EV.CRUSH13) / FPS;
        puff(out, [-1.6, 0.4, 1.6], s, 3.2, 0.8, 1, SAND); puff(out, [1.8, 0.4, 1.5], s, 3.0, 0.8, 2, SAND);
        poof(out, [0, 1.6, 1.4], 2.4, f, EV.CRUSH13, 7);
        splat(out, [0.2, 0, 2.4], 3.4, 2); splat(out, [-2.6, 0, -1.2], 2.4, 3);
        for (let k = 0; k < 5; k++) { const v = s; if (v < 0.8) chunk(out, [Math.cos(k * 1.3) * (1 + 6 * v), 1.2 + 5 * v - 14 * v * v, 1 + Math.sin(k * 1.3) * 3 * v], 0.35, k, v * 6); }
      }
      break;
    }
    case 14: { // the smoke clears: the whale is mostly still there; the gulls flee; the sooty Engineer blinks at it
      for (let k = 0; k < 5; k++) bigCloud(out, [W[0] - 7 + 3.4 * k, wy + 4.5 + 1.5 * (k % 2), W[2] - 1.0], 6.5, f, 1210 + 3 * k, 1.7, k, k % 2 ? "#b4acae" : "#cfc5b6", 1.2);
      smokeCol(out, [W[0] - 1.5, wy + 2.3, W[2]], f, 6, 2.6, SMOKE, 6, 1.3, 0.4, 2);
      for (let k = 0; k < 6; k++) {
        const s = (f - EV.FLEE14 - 2 * k) / FPS, base: V3 = [W[0] - 4 + 1.8 * k, wy + 2.6 + 0.6 * (k % 2), W[2] + 0.4];
        if (s < 0) gull(out, cam, 190 + k, [base[0], base[1] + 0.35, base[2]], { pose: "bib", size: 0.8, expr: "happy", mirror: k % 2 === 0 }, t);
        else gull(out, cam, 190 + k, [base[0] - 3 * s * (k % 2 ? -1 : 1), base[1] + 0.4 + 5 * s, base[2] - 4 * s], { pose: "flee", phase: flap(f, k, 5), size: 0.9, mirror: k % 2 === 0, roll: 0.3 * (k % 2 ? 1 : -1) }, t);
      }
      const ep = B(6.4, 9.2);
      actor(out, cam, 1, ENGINEER_SOOT, "engS", ep, [
        { f: 1228, expr: "blank", look: -1, headTilt: 5, shrug: 0.4 },
        { f: 1264, expr: "dazed", headTilt: -6 },                        // "still"
        { f: EV.BLINK14, expr: "blank", headTilt: 0, look: -0.5 },
      ], t, -1, (fo) => ({ ...fo, hatTilt: -0.25, ...((f >= EV.BLINK14 && f < EV.BLINK14 + 4) || (f >= EV.BLINK14 + 8 && f < EV.BLINK14 + 12) ? { blink: 1 } : {}) }));
      break;
    }
    case 15: {
      if (f < EV.CUT15) { // the crew sigh; the Engineer face-palms
        for (let k = 0; k < 3; k++) actor(out, cam, 200 + k, crew(k), "crew" + k, B(0.0 + 1.1 * k, 6.6 + 0.35 * (k % 2)), [
          { f: 1322, expr: "blank", look: -1, lean: 2 },
          { f: 1360, expr: "pained", shrug: 1, headTilt: 6 * (k - 1), lean: -2 },   // the sigh
          { f: EV.PALM15, expr: k === 1 ? "annoyed" : "blank", shrug: 0.4 },
        ], t, -1, (fo) => ({ ...fo, prop: "shovel" }));
        actor(out, cam, 1, ENGINEER_SOOT, "engS", B(3.0, 8.4), [
          { f: 1322, expr: "nervous", look: -1, shrug: 0.5 },
          { f: 1380, expr: "blank", headTilt: -6 },
          { f: EV.PALM15, expr: "pained", armF: "palm", headTilt: 8, lean: 4, dur: 3 },
        ], t, -1, (fo) => ({ ...fo, hatTilt: -0.25 }));
      } else { // the bulldozer + shovels bury it; the mound; the little flag
        const dp = dozerAt(f);
        smokeCol(out, [dp[0] + 0.4, 2.8, dp[2] - 1.0], f, 4, 0.8, SMOKE_D, 5, 1.2, 0.3, 4);
        trail(out, (g) => { const d2 = dozerAt(g); return [d2[0], 0.6, d2[2] - 2.6]; }, f, 4, 2.2, SAND, 4);
        [[-7.5, 4.8], [-4.0, 6.4], [7.0, 5.6]].forEach(([x, z], k) => {
          actor(out, cam, 200 + k, crew(k), "crew" + k, B(x, z), [{ f: EV.CUT15, expr: "pained", lean: 6 }], t, x < 0 ? 1 : -1, (fo) => ({ ...fo, prop: "shovel", tilt: 6 * Math.sin(f * 0.5 + k) }));
          const g0 = Math.floor(f / 7) * 7, s = (f - g0) / FPS; // a shovelful of sand arcing onto the mound every 7 f
          puff(out, [x + (x < 0 ? 1 : -1) * 2.2 * s * 3, 1.4 + 2.5 * s - 6 * s * s, z - 1.2 * s * 3], s, 1.0, 0.24, g0 + k, SAND);
        });
        if (f >= 1450) sparkle(out, [0.7, 6.9, 0.4], f, 1450, 1.4, 1.5);
      }
      break;
    }
    case 16: { // the sunny park: a family, the kid's whale balloon; a gull lands on the sign, looks at us, winks
      actor(out, cam, 220, PARENT16, "parent16", [S.PARENT16[0], 0, S.PARENT16[2]], [{ f: 1458, expr: "smile", look: 1, lean: 2 }, { f: 1505, expr: "smile_closed", headTilt: 5 }], t, 1);
      actor(out, cam, 221, KID16, "kid16", [S.KID16[0], 0, S.KID16[2]], [{ f: 1458, expr: "grin", look: 1 }, { f: 1530, expr: "laugh", headTilt: -6 }], t, 1, (fo) => ({ ...fo, prop: "balloon" }));
      const Sg = S.SIGN, top = 2.38, gs = 0.62, land = EV.LAND16, u = clamp01((f - (land - 18)) / 18);
      if (f < land) gull(out, cam, 230, [lerp(Sg[0] + 4.5, Sg[0] + 0.5, easeOut(u)), lerp(top + 3.2, top + 0.43 * gs, easeOut(u)), Sg[2] + 0.1], { pose: "fly", phase: flap(f, 0, 5), size: gs, mirror: true, roll: -0.15 * (1 - u) }, t);
      else gull(out, cam, 230, [Sg[0] + 0.5, top + 0.43 * gs - 0.02 * Math.exp(-(f - land) / 3), Sg[2] + 0.1],
        { pose: f >= EV.WINK16 - 8 ? "wink" : "stand", size: gs, expr: f >= EV.WINK16 - 1 && f < EV.WINK16 + 14 ? "wink" : f >= 1570 ? "happy" : f >= EV.WINK16 - 8 ? "smug" : "open", mirror: true, look: f > land + 3 ? 1 : 0 }, t);
      if (f >= EV.WINK16) sparkle(out, [Sg[0] + 0.85, top + 0.75, Sg[2] + 0.2], f, EV.WINK16, 0.5, 1.5);
      gull(out, cam, 231, [-4.6, 0.26, 4.4], { pose: "stand", size: 0.5, look: 0.5 }, t);
      break;
    }
  }
  return out;
};
/** a dynamite crate as a carried card: pine boards, a red stick bundle mark */
const crateItem = (p: Pen) => {
  const g = p.g;
  g.lineJoin = "round"; g.lineWidth = 14; g.strokeStyle = "#241726";
  g.fillStyle = "#c9955a"; g.fillRect(110, 190, 380, 260); g.strokeRect(110, 190, 380, 260);
  g.strokeStyle = "rgba(110,60,30,0.6)"; g.lineWidth = 6; for (const y of [255, 320, 385]) { g.beginPath(); g.moveTo(118, y); g.lineTo(482, y); g.stroke(); }
  for (let k = 0; k < 3; k++) { g.fillStyle = "#d6312e"; g.fillRect(250 + k * 36, 240, 30, 150); g.strokeStyle = "#241726"; g.lineWidth = 6; g.strokeRect(250 + k * 36, 240, 30, 150); }
  g.fillStyle = "#241726"; g.fillRect(244, 300, 112, 12);
};
/** the picnic basket dropped on the sand */
const basketItem = (p: Pen) => {
  p.arc(300, 300, 120, 100, 180, 360, 16, "#8a5a2a");
  p.poly([[150, 300], [450, 300], [430, 470], [170, 470]], "#c98e48", 12);
  for (const y of [350, 410]) p.stroke([[160, y], [440, y]], 6, "#8a5a2a");
  p.poly([[160, 300], [300, 260], [440, 300]], "#e2453c", 8);
};
/** a chrome hubcap seen face-on (it rolls away after the crush) */
const hubcapItem = (p: Pen) => {
  p.ell(300, 300, 200, 200, "#c9ced6", 16);
  p.ell(300, 300, 130, 130, "#e6eaf0", 8);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; p.stroke([[300 + 40 * Math.cos(a), 300 + 40 * Math.sin(a)], [300 + 120 * Math.cos(a), 300 + 120 * Math.sin(a)]], 10, "#8a9098"); }
  p.ell(300, 300, 40, 40, "#8a9098", 8);
};
