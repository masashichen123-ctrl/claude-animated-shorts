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
  Pen, bodyFront, bodySide, fxContact, fxShadow, fxSmoke, fxDustCloud, fxSparkle, fxSpeed, fxStars, fxBurst, fxMuzzle, fxDust, fxSpring, fxClack,
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
const DUST = "#dca27a", DUST_GOLD = "#e8b88a";
/** bullet strike: a dirt kick-up card (14 f) planted on the ground at c */
const strike = (out: Stage, c: V3, f: number, f0: number, size = 1.0, seed = 0) => {
  const u = (f - f0) / 14;
  if (u < 0 || u >= 1) return;
  const k = q(u, 14);
  out.fx.push({ key: `dust${k}|${seed % 4}`, cw: 400, ch: 400, draw: (p) => fxDust(p, k, seed % 4), x: c[0], y: c[1] + size * 0.32, z: c[2], w: size, h: size });
};
/** muzzle flash at a gun's muzzle, pointing along its barrel on screen */
const muzzle = (out: Stage, cam: CamInfo, m: THREE.Vector3, dir: THREE.Vector3, f: number, size = 0.75) => {
  const rot = Math.atan2(dir.dot(cam.up), dir.dot(cam.right)), k = f % 3;
  out.fx.push({ key: `muzzle${k}`, cw: 400, ch: 400, draw: (p) => fxMuzzle(p, k), x: m.x + dir.x * size * 0.12, y: m.y + dir.y * size * 0.12, z: m.z + dir.z * size * 0.12,
    w: size, h: size, rot, glow: 1.9 });
};
/** sparkle burst (on ones) over a point, 20 f long, starting at frame f0 */
const sparkle = (out: Stage, c: V3, f: number, f0: number, size = 0.9) => {
  const u = (f - f0) / 20;
  if (u <= 0 || u >= 1) return;
  const k = q(u, 20);
  out.fx.push({ key: `spark${k}`, cw: 400, ch: 400, draw: (p) => fxSparkle(p, k), x: c[0], y: c[1], z: c[2], w: size, h: size, glow: 1.3 });
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

// ---------------- emus ----------------
const _d = new THREE.Vector3();
type EmuSpec = { pose: EmuPose; dir?: [number, number]; face?: -1 | 1; phase?: number; turn?: number; eye?: EmuEye; peck?: number; helmet?: boolean;
  scale?: number; tint?: number; blink?: number; billboard?: boolean };
/** one emu card. dir = world walking direction (picks mirroring); face = screen facing for standing birds */
const emu = (out: Stage, cam: CamInfo, i: number, p: V3, o: EmuSpec, t: number, shadow = true) => {
  const sc = o.scale ?? 1, d = cam.pos.distanceTo(_d.set(p[0], p[1] + 1.1, p[2])) / sc;
  const [w, h, k] = tier(d), far = w <= 240;
  let mirror = false;
  if (o.dir) mirror = o.dir[0] * cam.right.x + o.dir[1] * cam.right.z < 0; else if (o.face) mirror = o.face < 0;
  const light = far ? -2.2 : light2D(cam, mirror);
  const ph = o.phase === undefined ? 0 : q(((o.phase % 1) + 1) % 1, far ? 8 : 16);
  const blink = o.blink ?? lidAt(t, i);
  const eo: EmuOpts = { pose: o.pose, phase: ph, turn: q(o.turn ?? 0, 10), eye: o.eye ?? "open", peck: q(o.peck ?? 0, far ? 4 : 12), tint: o.tint ?? i % 3,
    helmet: o.helmet, light, blink: far ? 0 : blink, seed: 3 + (i % 2) };
  out.places.push({ key: `E|${fkey(eo)}`, draw: (pn) => emuSide(pn, eo), x: p[0], y: p[1], z: p[2], scale: sc, mirror, size: [w, h, k], billboard: o.billboard,
    roll: o.billboard && o.dir ? -Math.atan2(o.dir[0] * cam.up.x + o.dir[1] * cam.up.z, Math.abs(o.dir[0] * cam.right.x + o.dir[1] * cam.right.z)) * (mirror ? -1 : 1) : undefined });
  if (shadow && !o.billboard) blob(out, p[0], p[1], p[2], sc * 1.15, 0.9);
};
const H = (i: number, s: number) => hh(i, s);

// ---------------- people helpers ----------------
/** a seated character (crouched gunner, dazed soldier, Meredith at the desk) */
const sitter = (out: Stage, cam: CamInfo, i: number, o: Outfit, okey: string, p: V3, beats: Beat[], t: number, facing: -1 | 1,
  extra: (fo: FrontOpts) => FrontOpts = (x) => x, scale = 1, shadow = true) => {
  const { fo, swaps } = act(beats, Math.round(t * FPS), facing, i);
  out.places.push(person(cam, { i, o, okey }, p[0], p[1], p[2], { side: false, mirror: false }, extra({ ...fo, facing, mode: "sit", blink: lidAt(t, i, swaps) }), {}, scale));
  if (shadow) blob(out, p[0], p[1], p[2], scale * 1.2);
};

/** what world.ts posed this frame: the truck, the guns (world muzzle / direction / breech) */
export type RigInfo = { truck: TruckPose; guns: { muzzle: THREE.Vector3; dir: THREE.Vector3; breech: THREE.Vector3 }[]; gunPoses: GunPose[] };

// ---------------- per-shot staging ----------------
/** everything with a face, and every effect card, in shot `id` at time t (pure function of id + t) */
export const stage = (id: number, t: number, cam: CamInfo, rig: RigInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = t * FPS, F = Math.round(f);
  LNAME = s.light;
  findSun(cam, SUN);
  // muzzle flashes wherever a gun fires this frame
  rig.gunPoses.forEach((g, k) => { if (g.fire && rig.guns[k]) muzzle(out, cam, rig.guns[k].muzzle, rig.guns[k].dir, F, id === 8 ? 0.6 : 0.8); });
  const S = SPOT;
  switch (id) {
    case 1: { // the hook: the crouched gunner sweats; ONE emu steps out of the wheat and stares him down
      const u = smooth((f - EV.EMU1_OUT) / 36), e0: V3 = [S.EMU1[0] - 0.7, 0, S.EMU1[2] - 3.6];
      const ep: V3 = [e0[0] + (S.EMU1[0] - e0[0]) * u, 0, e0[2] + (S.EMU1[2] - e0[2]) * u];
      const walking = f > EV.EMU1_OUT && u < 1;
      const lean = f >= EV.EMU1_LEAN - 2;
      emu(out, cam, 1, ep, { pose: walking ? "walk" : lean ? "lean" : "stand", dir: walking ? [0.15, 1] : undefined, face: faceTo(cam, ep, S.GUNNER1),
        phase: (f / 26) % 1, eye: lean ? "wide" : u >= 1 ? "stare" : "open", turn: lean ? 0.3 : 0.1 }, t);
      const gf = faceTo(cam, S.GUNNER1, S.EMU1);
      sitter(out, cam, 2, GUNNER, "gunner", S.GUNNER1, [
        { f: 0, expr: "nervous", armF: "point", lean: 6, look: 1 },
        { f: 36, expr: "nervous", headTilt: -6, gaze: 0.4 },
        { f: 79, expr: "pained", lean: 2, headTilt: 4 },                // "war"
        { f: 96, expr: "shock", lean: -6, shrug: 1, headTilt: 0, dur: 4 }, // "emus"
      ], t, gf, (fo) => ({ ...fo, sweat: sweatAt(f, 26) ?? sweatAt(f, 56) ?? sweatAt(f, 84) ?? sweatAt(f, 104) }), 1, false);
      break;
    }
    case 2: { // "And lost.": the emu proud on the crate, the gunner dazed with his hat askew, the gun in the stubble
      const ep: V3 = [S.CRATE2[0] + 0.05, CRATE.H, S.CRATE2[2]];
      emu(out, cam, 1, ep, { pose: "proud", face: faceTo(cam, ep, S.GUNNER2), eye: f < 127 ? "open" : "happy", turn: 0.45 }, t, false);
      sitter(out, cam, 2, GUNNER, "gunner", S.GUNNER2, [
        { f: 121, expr: "dazed", headTilt: -12, lean: -8, shrug: 0.4 },
        { f: 136, headTilt: 9, dur: 10 }, { f: 148, headTilt: -9, dur: 10 },
      ], t, faceTo(cam, S.GUNNER2, ep), (fo) => ({ ...fo, hatTilt: -0.55, hatLift: 0.12, armR: "shrug", armL: "hang" }));
      const sh: V3 = [S.GUNNER2[0], 2.0, S.GUNNER2[2]], k = q((t * 1.4) % 1, 16);
      out.fx.push({ key: `stars${k}`, cw: 420, ch: 210, draw: (p) => fxStars(p, k), x: sh[0] - 0.05, y: sh[1] - 0.25, z: sh[2], w: 0.8, h: 0.4 });
      for (let j = 0; j < 3; j++) puff(out, [S.GUN2[0] + (j - 1) * 0.45, 0.15, S.GUN2[2] + 0.2], t - (EV.KICK2 - 2 + j * 2) / FPS, 0.9 + 0.3 * j, 0.9, j, DUST);
      break;
    }
    case 3: { // the veteran farmer, proud by his fence
      const fp = S.FARMER3;
      actor(out, cam, 3, FARMER, "farmer", fp, [
        { f: 157, expr: "smile", look: -0.4, lean: 2 },
        { f: 213, expr: "proud", lean: -4, headTilt: -4 },          // "veterans"
        { f: 227, expr: "grin", headTilt: 6, lean: 2 },             // "farms"
        { f: 250, expr: "smile_closed", headTilt: -3 },             // "Western Australia"
        { f: 284, expr: "proud", look: -1, armB: "point", lean: 4 }, // "wheat": points at it
      ], t, -1, (fo) => ({ ...fo, prop: "pitchfork" }));
      break;
    }
    case 4: { // the herd pours over the hill and into the wheat; the near ones eat the patch; the farmer's jaw drops
      const N = 140, v = 8.5;
      for (let i = 0; i < N; i++) {
        const front = i < 22, z0f = -24 - 16 * H(i, 1), z0 = front ? z0f : -178 + 150 * H(i, 2);
        const xt = front ? 2.6 + 5.4 * H(i, 4) : -40 + 90 * H(i, 5), zt = front ? -8.5 + 6.5 * H(i, 6) : -16 - 26 * H(i, 7);
        const x0 = xt * 0.7 + 20 * (H(i, 8) - 0.5);
        const run = clamp01(((f - 305) / FPS * v) / Math.max(1, zt - z0)), z = z0 + (zt - z0) * run, x = x0 + (xt - x0) * run;
        const arrived = run >= 1, y = farmHill(x, z);
        const ph = (f / 15 + H(i, 9)) % 1;
        emu(out, cam, 20 + i, [x, y, z], arrived
          ? { pose: (front && f < 352) || H(i, 12) < 0.4 ? "stand" : "peck", face: H(i, 10) < 0.5 ? -1 : 1, peck: 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(f * 0.35 + i)), tint: i % 3, scale: 0.92 + 0.16 * H(i, 11) }
          : { pose: "run", dir: [xt - x0, zt - z0], phase: ph, tint: i % 3, scale: 0.92 + 0.16 * H(i, 11) }, t, f < 358);
        if (!arrived && f < 358 && i % 4 === 0) puff(out, [x, y + 0.2, z - 0.6], ((f + i * 5) % 20) / FPS, 1.6, 0.66, i, DUST);
      }
      const fp = S.FARMER3;
      actor(out, cam, 3, FARMER, "farmer", fp, [
        { f: 305, expr: "smile", look: -1 },
        { f: 330, expr: "nervous", look: -1, headTilt: 4 },        // "emus"
        { f: 358, expr: "jawdrop", lean: -7, shrug: 1, headTilt: 0, dur: 4 }, // cut: jaw drop
        { f: 368, expr: "jawdrop", lean: -10, armB: "up", dur: 6 }, // "ate"
      ], t, -1, (fo) => ({ ...fo, prop: "pitchfork", hatLift: f < 357 ? 0 : 0.55 * smooth((f - 357) / 6) + 0.06 * Math.sin(f * 0.8), hatTilt: f < 357 ? 0 : 0.18 }));
      break;
    }
    case 5: { // the wall telephone: crank, then yell into it; emus pecking in the yard beyond the posts
      const fp = S.FARMER5, cranking = f < 414;
      actor(out, cam, 3, FARMER, "farmer", fp, [
        { f: 389, expr: "annoyed", lean: 5, look: 1 },
        { f: 399, expr: "stern", headTilt: 4 },                   // "farmers"
        { f: 414, expr: "yell", lean: 10, headTilt: -5, shrug: 0.6 }, // "called in the army"
        { f: 426, expr: "yell", lean: 13, headTilt: 6, shrug: 1 },  // "army"
      ], t, faceTo(cam, fp, S.PHONE), (fo) => ({ ...fo, prop: "handset", armL: cranking ? "crank" : "out", wave: cranking ? q((f / 8) % 1, 8) : undefined, sweat: sweatAt(f, 430) }));
      for (let i = 0; i < 6; i++) {
        const p: V3 = [0.6 + 3.6 * H(i, 21), 0, -11.6 + 0.9 * H(i, 22)];
        emu(out, cam, 40 + i, p, { pose: i % 3 === 2 ? "stand" : "peck", face: H(i, 23) < 0.5 ? -1 : 1, peck: 0.5 + 0.5 * Math.sin(f * 0.3 + i * 1.7), tint: i % 3 }, t);
      }
      break;
    }
    case 6: { // the army arrives
      const tk = rig.truck;
      if (f < EV.STOP6 + 4) trail(out, (g) => { const x = -(9 * Math.max(0, (EV.STOP6 - g) / FPS) + 6 * Math.max(0, (EV.STOP6 - g) / FPS) ** 2); return [x - 2.8, 0.4, (g % 2) * 0.8 - 0.4]; }, f, 6, 1.8, DUST);
      for (let j = 0; j < 4; j++) puff(out, [1.6 + (j - 2) * 0.9, 0.3, (j % 2 ? 1.2 : -1.2)], t - (EV.STOP6 + j) / FPS, 1.4 + 0.25 * j, 1.2, j + 3, DUST);
      // Meredith climbs out of the cab and strides to the front
      const u = smooth((f - 460) / 20), mp: V3 = [1.4 + (S.MAJOR6[0] - 1.4) * u, 0, 1.0 + (S.MAJOR6[2] - 1.0) * u];
      if (f >= 458) actor(out, cam, 4, MAJOR, "major", mp, [
        { f: 458, expr: "proud", lean: -4 },
        { f: 463, expr: "proud", headTilt: -5, lean: -6 },          // "Meredith"
        { f: 475, armF: "point", expr: "stern", lean: 3 },          // "arrived"
        { f: 494, armF: "hang", expr: "smile", headTilt: 4 },       // "with two"
        { f: 559, armF: "point", expr: "proud", lean: 4 },          // "and 10,000"
      ], t, -1, (fo) => ({ ...fo, prop: "stick" }));
      if (f < 527) S.SOLDIERS6.forEach((p, k) => actor(out, cam, 5 + k, k ? SERGEANT : GUNNER, k ? "sarge" : "gunner", p, [
        { f: 450, expr: "smile", look: 1 },
        { f: 490, expr: "stern", headTilt: -3 },
        { f: EV.SALUTE6, expr: "proud", lean: -3, headTilt: 3 },   // "soldiers": snap salute
      ], t, 1, (fo) => ({ ...fo, salute: f >= EV.SALUTE6 - 2 })));
      // the tripods thump down: dust at the feet
      EV.GUNS6.forEach((g0, k) => { for (let j = 0; j < 2; j++) puff(out, [S.TRIPODS6[k][0] + (j ? 0.4 : -0.4), 0.1, S.TRIPODS6[k][2]], t - (g0 + 4) / FPS, 1.0, 0.8, k * 2 + j, DUST); });
      // the stack: a soldier lifts the last box overhead and sets it on top at CRATE6
      if (f >= 552) {
        const up = f < EV.CRATE6 + 2;
        actor(out, cam, 5, GUNNER, "gunner", S.STACKER6, [
          { f: 552, expr: "pained", armF: "up", armB: "up", lean: -3, shrug: 0.6 },
          { f: EV.CRATE6, expr: "proud", armF: "hang", armB: "hip", lean: 0, shrug: 0, dur: 6 }, // "bullets"
        ], t, -1, (fo) => ({ ...fo, sweat: sweatAt(f, 560), ...(up ? { armR: "up" as ArmPose, armL: "up" as ArmPose } : {}) }));
        if (f >= EV.CRATE6 - 1) for (let j = 0; j < 2; j++) puff(out, [S.STACK6[0] + (j - 0.5) * 0.7, STACK_N * CRATE.H + 0.05, S.STACK6[2] + 0.3], t - (EV.CRATE6 + j) / FPS, 0.8, 0.8, j, DUST);
        sparkle(out, [S.STACK6[0] + 0.3, STACK_N * CRATE.H + 0.8, S.STACK6[2] + 0.4], f, EV.CRATE6 + 1, 1.0);
      }
      void tk;
      break;
    }
    case 7: { // first day: firing, the dust lands short, the emus trot over the rise and away
      sitter(out, cam, 2, GUNNER, "gunner", S.GUNNER7, [
        { f: 602, expr: "stern", lean: 6, look: -0.6 },
        { f: 640, expr: "annoyed", headTilt: -4 },
        { f: 672, expr: "pained", headTilt: 6, lean: 0 },         // "range"
      ], t, -1, (fo) => ({ ...fo, armR: "point", armL: "point" }), 1, false);
      for (let i = 0; i < 26; i++) {
        const z0 = -52 - 26 * H(i, 31), x = -9 + 15 * H(i, 32) - (z0 + 52) * 0.1, vz = 12 + 6 * H(i, 33);
        const z = z0 - vz * (f - 602) / FPS, y = paddockRise(x, z);
        emu(out, cam, 60 + i, [x, y, z], { pose: "run", dir: [0.05, -1], phase: (f / 13 + H(i, 34)) % 1, tint: i % 3 }, t, false);
      }
      for (let k = 0; k < 24; k++) { // strikes landing short of the birds
        const f0 = EV.FIRE7 + 4 + k * 3 + (k > 9 ? 16 : 0);
        strike(out, [-5 + 8 * H(k, 41), 0, -24 - 10 * H(k, 42)], f, f0, 1.4, k);
      }
      break;
    }
    case 8: { // the dam: a thousand emus drinking; the soldiers hidden behind the bank; the jam
      for (let i = 0; i < 170; i++) {
        const far = i < 120, a = Math.PI + (far ? (H(i, 51) - 0.5) * 4.2 : (H(i, 51) < 0.5 ? -1 : 1) * (1.4 + 0.5 * H(i, 52)));
        const r = far ? S.DAM_R - 0.1 + 2.6 * H(i, 53) : S.DAM_R + 1 + 8 * H(i, 54);
        const p: V3 = [Math.sin(a) * r, 0, Math.cos(a) * r]; p[1] = damY(r);
        const drink = r < S.DAM_R + 1.4 && H(i, 55) < 0.75;
        const walkK = !drink && H(i, 56) < 0.3;
        const tang: [number, number] = [Math.cos(a), -Math.sin(a)];
        const pp: V3 = walkK ? [p[0] + tang[0] * 0.8 * t, p[1], p[2] + tang[1] * 0.8 * t] : p;
        emu(out, cam, 100 + i, pp, drink ? { pose: "drink", face: Math.sin(a) > 0 ? -1 : 1, tint: i % 3 }
          : walkK ? { pose: "walk", dir: tang, phase: (f / 26 + H(i, 57)) % 1, tint: i % 3 } : { pose: H(i, 58) < 0.5 ? "stand" : "peck", face: H(i, 59) < 0.5 ? -1 : 1, peck: 0.6, tint: i % 3 }, t);
      }
      const jam = f >= EV.CLACK8;
      sitter(out, cam, 2, GUNNER, "gunner", S.GUNNER8, [
        { f: 695, expr: "stern", lean: 8, look: -1 },
        { f: 776, expr: "grin", lean: 10 },                       // "dam"
        { f: 790, expr: "stern", lean: 12, headTilt: -3 },
        { f: EV.JAM8, expr: "blank", lean: 0, headTilt: 0, shrug: 0.3, dur: 2 }, // "jammed": blank
      ], t, -1, (fo) => ({ ...fo, armR: jam ? "hang" : "point", armL: jam ? "hang" : "point" }), 1, false);
      sitter(out, cam, 6, SERGEANT, "sarge", S.SARGE8, [
        { f: 695, expr: "smile", lean: 8, look: -1, headTilt: 3 },
        { f: 727, expr: "grin", headTilt: -4 },                   // "thousand"
      ], t, -1, (x) => x, 1, false);
      const g = rig.guns[0];
      if (g && jam) {
        const b = g.breech, s0 = (f - EV.CLACK8) / FPS;
        if (s0 < 0.2) out.fx.push({ key: "clack", cw: 300, ch: 300, draw: (p) => fxClack(p), x: b.x - 0.25, y: b.y + 0.05, z: b.z - 0.2, w: 0.36, h: 0.36, glow: 1.2 });
        for (let j = 0; j < 3; j++) puff(out, [b.x - 0.35 - 0.12 * j, b.y + 0.1 + 0.1 * j, b.z - 0.3], s0 - j * 0.07, 0.3 + 0.08 * j, 0.9, j, "#d8d4d8");
        if (f >= EV.JAM8) { // the drum spring pops out and up
          const u = (f - EV.JAM8) / 18, k = q(Math.min(1, u), 18);
          out.fx.push({ key: `spring${k}`, cw: 300, ch: 400, draw: (p) => fxSpring(p, k), x: b.x - 0.3 - 0.25 * u, y: b.y + 0.2 + 0.55 * Math.sin(Math.min(1, u) * 2.2), z: b.z - 0.35, w: 0.24, h: 0.32, rot: 0.6 * u });
        }
      }
      break;
    }
    case 9: { // a: Meredith bolts the gun onto the tray; b: tracking the bouncing truck, the emus pull away
      const tk = rig.truck;
      if (f < EV.CUT9) {
        const mp = truckPt(tk, [-1.6, 1.02, 0.5]);
        const strikeK = EV.HAMMER9.reduce((a, g0) => Math.max(a, f >= g0 - 3 && f < g0 + 2 ? clamp01((f - (g0 - 3)) / 3) : 0), 0);
        actor(out, cam, 4, MAJOR, "major", mp, [
          { f: 825, expr: "stern", lean: 6, look: 1 },
          { f: 835, expr: "annoyed", lean: 9, headTilt: -4 },       // "bolted"
          { f: 852, expr: "grin", lean: 2, headTilt: 5 },           // "gun"
          { f: 866, expr: "proud", lean: -3 },                      // "truck"
        ], t, 1, (fo) => ({ ...fo, prop: f < 852 ? ["hammer", strikeK] : "stick" }), 1);
        const gb = truckPt(tk, [-1.0, 1.75, 0]);
        EV.HAMMER9.forEach((g0, k) => { const u = (f - g0) / 6; if (u >= 0 && u < 1) out.fx.push({ key: `burst${q(u, 6)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 6), "#fff3b0", 8, 30, 200), x: gb[0], y: gb[1], z: gb[2] + 0.2, w: 0.7, h: 0.7, glow: 1.4 }); void k; });
        actor(out, cam, 5, GUNNER, "gunner", [2.2, 0, S.TRUCK9[2] + 1.6], [
          { f: 825, expr: "smile", look: -1 }, { f: 850, expr: "grin", headTilt: 5 },
        ], t, -1);
      } else {
        const gp = truckPt(tk, [-1.45, 1.02, 0.15]);
        sitter(out, cam, 2, GUNNER, "gunner", gp, [
          { f: EV.CUT9, expr: "nervous", lean: 6 },
          { f: 890, expr: "shock", lean: -4, headTilt: 8, dur: 4 },
          { f: 900, expr: "pained", headTilt: -8, lean: 8 },        // "outran"
          { f: 916, expr: "nervous", headTilt: 6 },
        ], t, 1, (fo) => ({ ...fo, headTilt: (fo.headTilt ?? 0) + 7 * Math.sin(f * 1.7), armR: "point", armL: "point", sweat: sweatAt(f, 893) }), 1, false);
        trail(out, (g) => [truck9X(g) - 3.0, 0.5, S.TRUCK9[2] + ((g / 3) % 2 ? 0.6 : -0.6)], f, 8, 2.8, DUST);
        for (let i = 0; i < 9; i++) {
          const x = truck9X(EV.CUT9) + 9 + 12 * H(i, 61) + (9.2 + 4.5 + 1.5 * H(i, 62)) * (f - EV.CUT9) / FPS, z = S.TRUCK9[2] - 6 + 9 * H(i, 63);
          emu(out, cam, 140 + i, [x, 0, z], { pose: "run", dir: [1, 0], phase: (f / 11 + H(i, 64)) % 1, tint: i % 3, scale: 1 + 0.1 * H(i, 65) }, t);
          speed(out, cam, [x - 0.4, 1.1, z], new THREE.Vector3(1, 0, 0), f + i * 3, 2.0);
          if (i % 2 === 0) puff(out, [x - 0.6, 0.2, z], ((f + i * 7) % 15) / FPS, 1.1, 0.5, i, DUST);
        }
        for (let k = 0; k < 14; k++) strike(out, [truck9X(884 + k * 3) + 6 + 18 * H(k, 66), 0, S.TRUCK9[2] - 9 + 14 * H(k, 67)], f, 886 + k * 3, 1.2, k);
      }
      break;
    }
    case 10: { // dusk: the report with a pen flourish, the tally board, then the mountain of brass behind the tent
      sitter(out, cam, 4, MAJOR, "major", S.MAJOR10, [
        { f: 937, expr: "smile_closed", lean: 6, look: 0.4, gaze: 0.6 },
        { f: EV.FLOURISH10, expr: "proud", armF: "up", lean: -4, gaze: 0, dur: 4 }, // "claimed": flourish
        { f: 972, armF: "hold", expr: "grin", headTilt: 5, lean: 4 },
        { f: 1011, look: -1, expr: "proud", headTilt: -4, lean: -2 }, // "emus": eyes on the tally board
        { f: 1060, look: 0.6, expr: "smile_closed", headTilt: 3 },
        { f: 1085, expr: "proud", lean: -6, headTilt: -6 },          // "bullets"
      ], t, 1, (fo) => ({ ...fo, prop: "pen", armR: fo.armR ?? "hold" }), 1, false);
      sparkle(out, [SPOT.MAJOR10[0] + 0.55, 1.75, SPOT.MAJOR10[2]], f, EV.FLOURISH10 + 1, 0.7);
      for (let k = 0; k < 22; k++) { // glints on the camera side of the brass mountain
        const a = (H(k, 71) - 0.5) * 2.2, r = 1.5 + 7 * H(k, 72), y = 7.6 * (1 - r / 10.8);
        sparkle(out, [SPOT.BRASS[0] + Math.sin(a) * r, y + 0.5, SPOT.BRASS[2] + Math.cos(a) * r + 0.8], f, 1040 + k * 4, 1.6 + 1.2 * H(k, 73));
      }
      break;
    }
    case 11: { // the house-tall wall of ammunition: the soldier pats it proudly
      actor(out, cam, 5, GUNNER, "gunner", S.SOLDIER11, [
        { f: 1135, expr: "smile", look: -1, lean: -2 },
        { f: 1150, expr: "proud", headTilt: -4, lean: -5 },          // "army"
        { f: 1170, expr: "grin", headTilt: 6, lean: 3 },             // "plenty"
      ], t, -1, (fo) => ({ ...fo, armF: undefined, armL: ["up", "wave", q(0.5 + 0.5 * Math.sin(f * 0.6), 6)] as ArmSpec, armR: "hip" }));
      sparkle(out, [S.SOLDIER11[0] - 1.6, 4.2, S.WALL_Z + 0.4], f, 1170, 1.2);
      break;
    }
    case 12: { // one emu strolls past the gun, unbothered, ten puffs at its feet, a peck on "ten"
      const ep = emu12At(f), peckK = f >= 1238 && f < 1258 ? Math.sin(Math.PI * (f - 1238) / 20) : 0;
      emu(out, cam, 1, ep, peckK > 0.02 ? { pose: "peck", face: 1, peck: peckK, eye: "happy" } : { pose: "walk", dir: [1, 0], phase: (f / 24) % 1, eye: "open", turn: 0.15 }, t);
      for (let k = 0; k < 10; k++) {
        const f0 = EV.PUFF12 + 4 * k, e = emu12At(f0), side = k % 2 ? 1 : -1;
        strike(out, [e[0] + 0.4 + side * (0.35 + 0.25 * H(k, 81)), 0, e[2] + side * 0.4 + 0.3 * (H(k, 82) - 0.5)], f, f0, 1.1, k);
      }
      break;
    }
    case 13: { // explainer: the enemy marches in a neat line toward the sandbagged gun
      for (let i = 0; i < 9; i++) {
        const x = -4.4 + i * 1.1, z = -14.5 + 4.6 * (f - 1270) / 112;
        out.places.push(person(cam, { i: 200 + i, o: ENEMY, okey: "enemy" }, x, 0, z, { side: false, mirror: false },
          { mode: "march", phase: q((f / 30) % 1, 16), expr: "stern", facing: 0, blink: 0 }, {}, 0.92));
        blob(out, x, 0, z, 0.92);
      }
      sitter(out, cam, 2, GUNNER, "gunner", [0.55, 0, 0.75], [
        { f: 1270, expr: "smile", lean: 8, look: -1 },
        { f: 1330, expr: "grin", headTilt: 5 },                     // "enemy"
        { f: 1367, expr: "proud", headTilt: -4 },                   // "line"
      ], t, -1, (fo) => ({ ...fo, armR: "point", armL: "point" }), 1, false);
      break;
    }
    case 14: {
      if (f < EV.CUT14) { // top-down: the starburst
        const s0 = Math.max(0, (f - 1386) / FPS);
        for (let i = 0; i < 64; i++) {
          const a = (i / 64) * Math.PI * 2 + 0.3 * (H(i, 91) - 0.5), r = 1.0 + 2.6 * H(i, 92) + (5.2 + 2.2 * H(i, 93)) * s0;
          const p: V3 = [Math.cos(a) * r, 0, Math.sin(a) * r], dir: [number, number] = [Math.cos(a), Math.sin(a)];
          emu(out, cam, 160 + i, p, s0 > 0 ? { pose: "run", dir, phase: (f / 10 + H(i, 94)) % 1, tint: i % 3, billboard: true } : { pose: "stand", dir, tint: i % 3, billboard: true }, t, false);
          if (s0 > 0) speed(out, cam, [p[0], 0.4, p[2]], new THREE.Vector3(dir[0], 0, dir[1]), f + i, 2.6);
          if (s0 > 0 && i % 3 === 0) puff(out, [p[0] - dir[0] * 1.2, 0.2, p[2] - dir[1] * 1.2], ((f + i * 3) % 12) / FPS, 1.5, 0.4, i, DUST);
        }
        for (let j = 0; j < 6; j++) puff(out, [(j - 2.5) * 0.7, 0.2, (j % 2 - 0.5) * 0.8], t - (1386 + j) / FPS, 3.2, 1.3, j, DUST);
      } else { // low angle: the gunner spins after them, dizzy by "once"
        const spin = Math.floor((f - EV.CUT14) / 5) % 2 ? 1 : -1, dizzy = f >= EV.DIZZY14;
        actor(out, cam, 2, GUNNER, "gunner", S.GUNNER14, [
          { f: EV.CUT14, expr: "nervous", lean: 6 },
          { f: 1462, expr: "shock", headTilt: 8 },                  // "direction"
          { f: EV.DIZZY14 + 2, expr: "dazed", lean: -6, headTilt: -10 },
        ], t, spin as 1 | -1, (fo) => ({ ...fo, prop: "lewis", headTilt: (fo.headTilt ?? 0) + (dizzy ? 8 * Math.sin(f * 0.5) : 0), lean: (fo.lean ?? 0) + (dizzy ? 5 * Math.sin(f * 0.37) : 0), hatTilt: dizzy ? 0.3 : 0, sweat: sweatAt(f, 1456) }));
        for (let i = 0; i < 14; i++) {
          const a = (f / FPS) * (1.2 + 0.6 * H(i, 95)) * (i % 2 ? 1 : -1) + H(i, 96) * 6.28, r = 6 + 6 * H(i, 97);
          const p: V3 = [Math.cos(a) * r, 0, Math.sin(a) * r - 6], dir: [number, number] = [-Math.sin(a) * (i % 2 ? 1 : -1), Math.cos(a) * (i % 2 ? 1 : -1)];
          emu(out, cam, 230 + i, p, { pose: "run", dir, phase: (f / 10 + H(i, 98)) % 1, tint: i % 3 }, t);
        }
        if (dizzy) { const k = q((t * 1.6) % 1, 16); out.fx.push({ key: `stars${k}`, cw: 420, ch: 210, draw: (p) => fxStars(p, k), x: 0, y: 2.05, z: 0.1, w: 0.8, h: 0.4 }); }
      }
      break;
    }
    case 15: { // Meredith at the salute; the emu army in helmets behind him
      actor(out, cam, 4, MAJOR, "major", S.MAJOR15, [
        { f: 1504, expr: "stern", lean: -3 },
        { f: 1527, expr: "proud", headTilt: -3, lean: -5 },          // "army"
        { f: 1578, expr: "smile_closed", headTilt: 4 },             // "birds"
        { f: 1631, expr: "proud", headTilt: -6, lean: -6 },          // "world"
      ], t, 1, (fo) => ({ ...fo, salute: true, prop: "stick" }));
      for (let row = 0; row < 12; row++) for (let c = 0; c < 9; c++) {
        const i = row * 9 + c, x = S.MAJOR15[0] + (c - 4) * 1.9 + (row % 2) * 0.3, z = S.MAJOR15[2] - 3.2 - row * 2.6;
        const proud = f >= 1578 - (row % 3);
        emu(out, cam, 300 + i, [x, 0, z], { pose: proud ? "proud" : "attention", face: c < 4 ? 1 : -1, helmet: true, eye: proud ? "happy" : "open", turn: 0.55, tint: i % 3, scale: 0.95 + 0.1 * H(i, 99) }, t);
      }
      break;
    }
    case 16: { // the army goes home: the truck into the sunset, a glum gunner on the tray, two emus watch it go
      const tk = rig.truck;
      trail(out, (g) => { const x = 4 + 4 * Math.max(0, (g - 1656) / FPS) + 2.2 * Math.max(0, (g - 1656) / FPS) ** 2; return [x - 1.2, 0.3, (g / 3) % 2 ? 1.6 : -1.6]; }, f, 5, 1.4, DUST_GOLD, 4);
      sitter(out, cam, 2, GUNNER, "gunner", truckPt(tk, [-2.3, 1.02, 0.2]), [{ f: 1656, expr: "pained", headTilt: -8, lean: 6 }], t, -1, (x) => x, 1, false);
      break;
    }
    case 17: { // the emus are still there: the near one turns to the lens and blinks
      const tn = smooth((f - 1698) / 12), bl = f >= 1722 && f < 1726 ? [0.5, 1, 1, 0.5][f - 1722] : 0;
      emu(out, cam, 1, S.EMU17, { pose: "stand", face: -1, turn: tn, eye: "open", blink: bl, scale: 1.12 }, t, false);
      for (let i = 0; i < 22; i++) {
        const z = -24 - 40 * H(i, 102), p: V3 = [S.CAM17[0] + (z - S.CAM17[2]) * (0.22 * (H(i, 101) * 2 - 1)) - 0.5, 0, z];
        const pose: EmuPose = i % 3 === 0 ? "walk" : i % 3 === 1 ? "peck" : "stand";
        emu(out, cam, 400 + i, pose === "walk" ? [p[0] + 0.7 * t, 0, p[2]] : p, { pose, dir: [1, 0.1], face: H(i, 103) < 0.5 ? -1 : 1, phase: (f / 26 + H(i, 104)) % 1, peck: 0.5 + 0.5 * Math.sin(f * 0.25 + i), tint: i % 3 }, t, false);
      }
      break;
    }
  }
  return out;
};
export { FPS };
