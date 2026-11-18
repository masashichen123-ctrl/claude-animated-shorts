// Our cast as lit flat sprites in the 3D world (owner: characters, with toon.ts / cardshade.ts). Each frame every
// character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing. Characters are
// yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward the sun, painted crescent in
// the drawing); standing ones get a soft multiply contact blob. Effects (letters, flames, smoke, dust, the explosion)
// are unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
// CONTRACT with world.ts: stage(id, t, cam, mis) -> { places, fx }; Pool / Actor / Fx draw them.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxBurst, fxContact, fxShadow, fxLetter, fxFlame, fxSmoke, fxBoom, Outfit, Expr, FrontOpts, SideOpts,
  SAILOR, POSTMASTER, CLERK, POSTMAN, KID59, VISITORS, Prop,
} from "./toon";
import {
  FPS, SHOTS, SPOT, V3, Light, MissilePose, missileAt, noseDir, smooth, clamp01, LAUNCH_F, TOUCH_F, HIT_F, GO_F, BOOM_F, BOOM_AT,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

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
const CONTACT: Record<Light, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], dusk: [0.26, 0.22, 0.36], interior: [0.3, 0.26, 0.28] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day" || LNAME === "interior") {
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

// ---------------- staging helpers ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
/** the missile as world.ts posed it this frame: pose, world nose direction, nozzle world points */
export type MissileInfo = { pose: MissilePose; dir: THREE.Vector3; tail: THREE.Vector3; boosterTails: THREE.Vector3[] };
/** frame-steady expression switch: before ts (seconds, minus the reaction lead) a, after b */
const at = <T,>(t: number, ts: number, a: T, b: T) => (t < ts - LEAD ? a : b);
/** mouth flaps while talking: alternate speak / closed every ~4 f inside [t0, t1) */
const talk = (t: number, t0: number, t1: number, closed: Expr): Expr => (t >= t0 && t < t1 && Math.floor(t * FPS / 4) % 3 !== 2 ? "speak" : closed);
/** a standing actor (front view), contact blob included */
const stand = (out: Stage, cam: CamInfo, i: number, o: Outfit, okey: string, p: V3, fo: FrontOpts, t: number, scale = 1) => {
  out.places.push(person(cam, { i, o, okey }, p[0], p[1], p[2], { side: false, mirror: false }, { mode: "stand", blink: lidAt(t, i), ...fo }, {}, scale));
  blob(out, p[0], p[1], p[2], scale);
};
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
  switch (id) {
    case 1: // the hook: letters streaming out of the mail hatch area
      letterStream(out, mis.tail.clone().addScaledVector(mis.dir, 2.5), mis.dir, t, 16, 1.6);
      break;
    case 2: { // post office: postmaster general impatient (watch), clerk shrugging behind the counter
      const faster = 148 / FPS;
      stand(out, cam, 1, POSTMASTER, "pmg", SPOT.PMG2, { expr: at(t, faster, "annoyed", "speak"), prop: at<Prop>(t, faster, "watch", null), wave: t > faster ? q(0.5 + 0.5 * Math.sin(t * 9), 10) : undefined, gaze: at(t, faster, 0.8, 0), facing: -1 }, t);
      stand(out, cam, 2, CLERK, "clerk", SPOT.CLERK, { expr: at(t, faster, "neutral", "nervous"), prop: "letter", facing: 1, look: 1 }, t);
      break;
    }
    case 3: // tiny sailor on the deck for scale
      stand(out, cam, 3, SAILOR, "sailor", [-8.2, SPOT.DECK, 1.0], { expr: "smile", wave: q(Math.sin(t * 6), 10) }, t);
      break;
    case 4: // proud sailor beside the missile; points at it on "Barbero"
      stand(out, cam, 3, SAILOR, "sailor", SPOT.SAILOR4, { expr: at(t, 331 / FPS, "smile", "proud"), wave: t > 331 / FPS - LEAD ? 0.6 : undefined, facing: -1 }, t);
      break;
    case 5: { // stuffing letters into the nose intake; a burst of letters on "3,000 letters"
      const k = q(0.5 + 0.5 * Math.sin(t * 7), 10);
      stand(out, cam, 3, SAILOR, "sailor", SPOT.SAILOR5, { expr: at(t, 418 / FPS, "smile_closed", "grin"), prop: "letters", wave: k, facing: 1 }, t);
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
    case 9: { // the speech: "historic for the peoples of the entire world"; the sailor salutes
      const gest = t > 709 / FPS - LEAD && t < 735 / FPS ? 1 : t > 754 / FPS - LEAD ? 0.4 : undefined;
      stand(out, cam, 1, POSTMASTER, "pmg", SPOT.PMG9, { expr: talk(t, 662 / FPS, 770 / FPS, "proud"), wave: gest === undefined ? undefined : q(gest * (0.7 + 0.3 * Math.sin(t * 5)), 10), facing: 1 }, t);
      stand(out, cam, 3, SAILOR, "sailor", SPOT.SAILOR9, { expr: "proud", salute: t > 690 / FPS }, t);
      break;
    }
    case 10: { // unloading: a sailor carries a sack from the missile to the pile; the postman waves a letter
      const u = smooth((f - 790) / 50), p0: V3 = [1.0, 0, 2.0], p1: V3 = [SPOT.SACKS[0] - 0.6, 0, SPOT.SACKS[2] + 1.3];
      const px: V3 = [p0[0] + (p1[0] - p0[0]) * u, 0, p0[2] + (p1[2] - p0[2]) * u];
      out.places.push(person(cam, { i: 3, o: SAILOR, okey: "sailor" }, px[0], 0, px[2], { side: false, mirror: false },
        { mode: u > 0 && u < 1 ? "stroll" : "stand", phase: q((t * 1.6) % 1, 40), prop: "sack", expr: "grin", blink: lidAt(t, 3) }, {}));
      blob(out, px[0], 0, px[2]);
      stand(out, cam, 4, POSTMAN, "postman", [SPOT.SACKS[0] + 1.6, 0, SPOT.SACKS[2] + 1.0], { expr: at(t, 808 / FPS, "smile", "proud"), prop: "letter", wave: q(0.5 + 0.5 * Math.sin(t * 6), 10), facing: -1 }, t);
      break;
    }
    case 11: { // the missile goes into the house: debris burst, smoke, letters flutter down; the kid at the mailbox
      const s0 = t - HIT_F / FPS, hole: V3 = [-1.7, 2.28, SPOT.HOUSE_Z + 0.2];
      if (s0 >= 0 && s0 < 0.35) { const u = q(s0 / 0.35, 30); out.fx.push({ key: `burstD${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#d8b48a", 12, 40, 240), x: hole[0], y: hole[1], z: hole[2] + 0.3, w: 4.5, h: 4.5 }); }
      for (let k = 0; k < 3; k++) puff(out, [hole[0] + (k - 1) * 0.9, hole[1] + 0.2, hole[2] + 0.5], s0 - k * 0.1, 3.0 + k, 2.4, k, "#ddd6cc");
      letterRain(out, [hole[0] + 0.6, hole[1] + 1.4, hole[2] + 1.6], HIT_F / FPS + 0.1, t, 14, 2.4, 0.4, 0.7);
      const expr: Expr = t < HIT_F / FPS - LEAD ? "smile" : t < 885 / FPS - LEAD ? "shock" : "neutral";
      stand(out, cam, 5, KID59, "kid", SPOT.KID, { expr, prop: "letter", wave: 0, look: t > HIT_F / FPS ? -1 : 0, facing: -1 }, t, 0.78);
      break;
    }
    case 12: // the postman by his overloaded truck
      stand(out, cam, 4, POSTMAN, "postman", SPOT.POSTMAN12, { expr: at(t, 992 / FPS, "smile", "proud"), prop: "letter", wave: t > 974 / FPS ? q(0.5 + 0.5 * Math.sin(t * 5), 10) : 0, facing: -1 }, t);
      if (t > 992 / FPS) letterRain(out, [-0.5, 6.2, 0.3], 992 / FPS, t, 10, 2.2, 0.38, 0.5);
      break;
    case 13: { // one trip: launch from the cart, the postman looks up, the puff, letters rain down
      const go = GO_F / FPS, boom = BOOM_F / FPS;
      const expr: Expr = t < go - LEAD ? "smile" : t < boom - LEAD ? "awe" : t < boom + 0.6 ? "shock" : "neutral";
      stand(out, cam, 4, POSTMAN, "postman", SPOT.POSTMAN13, { expr, prop: t < go ? "letter" : null, wave: t < go ? 0.3 : undefined, gaze: t > go ? -1 : 0, facing: 1 }, t);
      for (let k = 0; k < 6; k++) { const m = missileAt(13, GO_F + k * 2), d = noseDir(m.yaw, m.pitch); puff(out, [m.pos[0] - d[0] * 5, Math.max(0.8, m.pos[1] - d[1] * 5), m.pos[2] - d[2] * 5], t - (GO_F + k * 2) / FPS, 3 + k * 0.6, 2.6, k, "#d8d0dc"); }
      if (mp.boom >= 0) {
        const u = q(Math.min(1, mp.boom / 1.1), 30);
        if (mp.boom < 1.1) out.fx.push({ key: `boom${u}`, cw: 800, ch: 800, draw: (p) => fxBoom(p, u), x: BOOM_AT[0], y: BOOM_AT[1], z: BOOM_AT[2], w: 30, h: 30, glow: u < 0.45 ? 2.0 : 1 });
        letterRain(out, BOOM_AT, boom + 0.15, t, 24, 14, 1.4, 9);
      }
      break;
    }
    case 14: { // museum visitors
      stand(out, cam, 6, VISITORS[0], "vis0", SPOT.VISITOR15, { expr: "awe", gaze: -1, facing: -1 }, t);
      stand(out, cam, 7, VISITORS[1], "vis1", [-0.3, 0, 7.4], { expr: "smile", facing: -1, look: -1 }, t);
      stand(out, cam, 8, VISITORS[2], "vis2", [3.5, 0, 6.3], { expr: "grin", wave: q(0.6 + 0.4 * Math.sin(t * 4), 10), gaze: -1, facing: 1 }, t, 0.75);
      break;
    }
    case 15: // close on the visitor under the missile
      stand(out, cam, 6, VISITORS[0], "vis0", SPOT.VISITOR15, { expr: at(t, 1300 / FPS, "awe", "smile_closed"), gaze: at(t, 1300 / FPS, -1, 0), facing: -1 }, t);
      break;
  }
  return out;
};
export { FPS };
