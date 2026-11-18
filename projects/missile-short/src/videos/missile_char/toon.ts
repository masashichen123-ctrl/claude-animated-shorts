// Our own flat 2D cartoon cast + 2D effects, drawn on a canvas (owner: characters, with cast.ts / cardshade.ts).
// Missile short cast: SAILOR (white Dixie cup + jumper with the navy square collar), POSTMASTER (older, grey suit,
// glasses, balding grey hair), CLERK (shirt + tie, green eyeshade), POSTMAN (blue-grey uniform, peaked cap, leather mail
// bag), KID, VISITOR(S); props letter / letters / sack / watch, salute; effects fxLetter, fxFlame, fxSmoke, fxBoom.
// (The bridge template's soldier / officer / townsfolk outfits are kept as unused library entries.)
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it.
export const INK = "#241726";
/** near-white head (charshade.md 3.1): the scene light tints it, so it reads as lit by this world */
export const SKIN = "#fbf7f2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
type C3 = [number, number, number];
const SH_SKIN: C3 = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads (legacy peach)
const SH_WHITE: C3 = [0.92, 0.9, 0.96]; // white heads: far-edge crescent ~#e7deea
const SH_CLOTH: C3 = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT: C3 = [0.62, 0.62, 0.7];

export type Build = "adult" | "stout" | "kid" | "slim";
export type Outfit = {
  jacket: string; pants: string; boots: string; hat?: string | null; belt?: string | null; buttons?: string; rifle?: boolean;
  sash?: string; sword?: boolean; moustache?: string; skin?: string; head?: number; cap?: string; hair?: string; dress?: string;
  build?: Build;
  /** missile short: round glasses, neck tie colour, collar style, leather mail bag colour */
  glasses?: boolean; tie?: string; collar?: "sailor" | "suit" | "shirt" | "chambray"; bag?: string;
  /** v3 heads: skull archetype, hairdo (hat "hair" / "visor"), beard colour */
  headType?: HeadKind; hairStyle?: HairStyle; beard?: string;
  /** ear protectors (deck crew): cup colour */
  earmuffs?: string;
};
type P2 = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const mul = (c: string, m: C3) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c: string, k: number) => mul(c, [k, k, k]);
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q: P2, a: number, c: P2): P2 => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const RIFLEMAN: Outfit = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
export const OFFICER: Outfit = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];
// ---- missile short cast (v3: near-white heads, three skull archetypes, own hair / hat silhouettes, colour on the clothes) ----
/** sailor in 1959 working dungarees: white Dixie cup, chambray shirt, navy dungaree trousers, dark crop under the cap */
export const SAILOR: Outfit = { jacket: "#86a9d6", pants: "#2c3d66", boots: INK, hat: "dixie", hair: "#3b2a22", collar: "chambray", buttons: "none",
  headType: "standard" };
/** postmaster general: wide "bun" head, bald crown with grey side tufts, walrus moustache, round glasses, grey suit */
export const POSTMASTER: Outfit = { jacket: "#6e7482", pants: "#5a5f6b", boots: "#2a2020", hat: "balding", hair: "#dcd9d2", glasses: true, collar: "suit", tie: "#b8323e",
  buttons: "#3a3d45", build: "stout", moustache: "#bfb8ae", headType: "bun" };
/** clerk: tall "bean" head, side-parted hair under a green eyeshade, cream shirt + blue tie, sleeve garters */
export const CLERK: Outfit = { jacket: "#efe2c4", pants: "#4a4f5c", boots: "#3a2a20", hat: "visor", hair: "#5a3b2a", hairStyle: "side", collar: "shirt", tie: "#2f5fae",
  buttons: "none", build: "slim", headType: "bean" };
/** postman: service cap with the peak out on the facing side, blue-grey uniform, leather mail bag */
export const POSTMAN: Outfit = { jacket: "#5f7ea6", pants: "#3e4f6c", boots: "#2a2020", hat: "postcap", cap: "#3e4f6c", hair: "#2a201a", collar: "shirt", tie: "#1f2a44",
  bag: "#9a6234", buttons: "#d8c070", headType: "standard" };
export const KID59: Outfit = { jacket: "#e8533f", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hairStyle: "spiky", hair: "#c9862f", build: "kid", collar: "shirt",
  buttons: "none", headType: "bun" };
/** deck crew at the launch: red ordnance jersey, ear protectors over a crop */
export const DECK_CREW: Outfit = { jacket: "#c8443a", pants: "#2c3d66", boots: INK, hat: "hair", hairStyle: "crop", hair: "#2a201a", earmuffs: "#f2c230",
  collar: "chambray", buttons: "none", headType: "bean" };
/** air station ground crewman: yellow vest over a white shirt, navy ball cap, marshalling paddles */
export const GROUND_CREW: Outfit = { jacket: "#f0b62e", pants: "#3e4a5c", boots: "#2a2020", hat: "cap", cap: "#24345a", hair: "#5a3b2a", collar: "shirt",
  buttons: "none", headType: "standard", build: "slim" };
export const VISITORS: Outfit[] = [
  { jacket: "#2f8a7a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hairStyle: "bowl", hair: "#6a4428", glasses: true, collar: "shirt", tie: "#c9473c",
    buttons: "none", headType: "standard" },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hairStyle: "bunTop", hair: "#2a201a", dress: "#d9a441", headType: "bean", build: "slim" },
  { jacket: "#d9a441", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#2f5f8f", hair: "#3b2a22", build: "kid", headType: "bun" },
];

export const soldier = (v = 0, extra: Partial<Outfit> = {}): Outfit => {
  const o: Outfit = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};

export const townsfolk = (v = 0): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o: Outfit = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};

export class Pen {
  g: CanvasRenderingContext2D;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot: number[] | null = null;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  P(x: number, y: number): P2 {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts: P2[], close: boolean) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts: P2[], fill: string | null, ol?: number) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol?: number, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts: P2[], fill: string, w: number, ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts: P2[], w: number, fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, w: number, fill = INK) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx: number, cy: number, r: number, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts: P2[], base: string, shadow: string, light: number, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** torso (charshade.md 3.2): horizontal light only; lit-edge rim (+22 % white over 7 % of the width) -> flat plateau ->
   *  far ~38 % falls to SH_CLOTH. No vertical gradient. */
  torsoFill(pts: P2[], base: string, light: number) {
    const g = this.g, dx = Math.sign(Math.cos(light)) || 1;
    let lo = Infinity, hi = -Infinity, cy = 0;
    for (const [x, y] of pts) { const d = x * dx; lo = Math.min(lo, d); hi = Math.max(hi, d); cy += y / pts.length; }
    const [ax, ay] = this.P(hi * dx, cy), [bx, by] = this.P(lo * dx, cy);
    const gr = g.createLinearGradient(ax, ay, bx, by), rim = mix(base, "#ffffff", 0.22);
    gr.addColorStop(0, rim); gr.addColorStop(0.07, rim); gr.addColorStop(0.12, base); gr.addColorStop(0.62, base); gr.addColorStop(1, mul(base, SH_CLOTH));
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts: P2[], fill: string, w: number, rim: number, cap: CanvasLineCap = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 48): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 8): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

// ---------------- heads v3 (charshape.md 3.1): 4-segment cubic Bezier, broad shallow jaw, chin + crown pushed to the
// facing side, three archetypes. Origin = the widest row (the eye line); +x = toward the facing side.
export type HeadKind = "bun" | "standard" | "bean";
type HeadSpec = { R: P2; C: P2; L: P2; T: P2; nJf: number; nJb: number };
const HEADS: Record<HeadKind, HeadSpec> = {
  // verify_r1: egg, not circle -> taller tapered crown (kT 1.55), fuller jaw on the front side; H/W ~1.0 / 0.9 / 1.12
  standard: { R: [1.04, 0.04], C: [0.08, 0.92], L: [-0.98, 0.0], T: [0.04, -1.12], nJf: 2.45, nJb: 2.0 },
  bun: { R: [1.06, 0.06], C: [0.08, 0.86], L: [-0.98, 0.02], T: [0.03, -1.06], nJf: 2.55, nJb: 2.15 },
  bean: { R: [1.0, 0.03], C: [0.07, 1.02], L: [-0.97, 0.0], T: [0.04, -1.24], nJf: 2.3, nJb: 1.95 },
};
/** Bezier handle factor that makes a quarter segment pass through the superellipse(n) 45-degree point (n = 2: 0.552) */
const kap = (n: number) => (2 ** (-1 / n) - 0.5) / 0.375;
/** sample closed cubic Bezier segments [p0, h0, h1, p1] into a polyline */
const bezPts = (segs: [P2, P2, P2, P2][], n = 24): P2[] => {
  const out: P2[] = [];
  for (const [p0, h0, h1, p1] of segs) for (let i = 0; i < n; i++) {
    const t = i / n, s = 1 - t, A = s * s * s, B = 3 * s * s * t, C = 3 * s * t * t, D = t * t * t;
    out.push([A * p0[0] + B * h0[0] + C * h1[0] + D * p1[0], A * p0[1] + B * h0[1] + C * h1[1] + D * p1[1]]);
  }
  return out;
};
/** corner-cutting smoother that keeps the points flagged sharp (hair facets, tufts, cap corners) */
const chaikin = (pts: P2[], sharp: boolean[], it = 3): P2[] => {
  let P = pts, S = sharp;
  for (let k = 0; k < it; k++) {
    const nP: P2[] = [], nS: boolean[] = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if (S[i]) { nP.push(a); nS.push(true); }
      nP.push(lerp2(a, b, 0.25)); nS.push(false); nP.push(lerp2(a, b, 0.75)); nS.push(false);
    }
    P = nP; S = nS;
  }
  return P;
};
export type Head = { pts: P2[]; cx: number; wy: number; a: number; W: number; HH: number; crown: number; chin: number; f: number; rot: number; kind: HeadKind };
export const headKindOf = (seed: number): HeadKind => (rnd(seed, 30) < 0.25 ? "bun" : rnd(seed, 30) > 0.8 ? "bean" : "standard");
/** head contour (clockwise on screen) whose chin bottom sits at chinY; side = profile jaw jutting forward */
export const headPath = (seed: number, a: number, facing: number, cx: number, chinY: number, kind: HeadKind, side = false): Head => {
  const S = HEADS[kind], f = facing || (rnd(seed, 6) < 0.5 ? -1 : 1);
  const R: P2 = side ? [1.08, 0] : S.R, C: P2 = side ? [0.3, 0.86] : [S.C[0] + 0.08 * (rnd(seed, 31) - 0.5), S.C[1]];
  const L = S.L, T: P2 = [S.T[0] + 0.1 * (rnd(seed, 32) - 0.5), S.T[1]];
  const kF = kap(S.nJf), kB = kap(S.nJb + 0.2 * (rnd(seed, 33) - 0.5)), kT = kap(1.55);
  const segs: [P2, P2, P2, P2][] = [
    [R, [R[0], R[1] + (C[1] - R[1]) * kF], [C[0] + (R[0] - C[0]) * kF, C[1]], C],
    [C, [C[0] + (L[0] - C[0]) * kB, C[1]], [L[0], L[1] + (C[1] - L[1]) * kB], L],
    [L, [L[0], L[1] + (T[1] - L[1]) * kT], [T[0] + (L[0] - T[0]) * kT, T[1]], T],
    [T, [T[0] + (R[0] - T[0]) * kT, T[1]], [R[0], R[1] + (T[1] - R[1]) * kT], R],
  ];
  const wy = chinY - C[1] * a, rot = rad(6 * (rnd(seed, 34) - 0.5)) * f;
  let pts: P2[] = bezPts(segs).map(([x, y]) => [cx + f * x * a, wy + y * a]);
  if (f < 0) pts.reverse();
  pts = rotPts(pts, rot, cx, wy);
  return { pts, cx, wy, a, W: 2 * a, HH: (C[1] - T[1]) * a, crown: wy + T[1] * a, chin: chinY, f, rot, kind };
};
/** head units (x toward the facing side, y down from the eye line, both x a) -> canvas */
const hu = (hd: Head, x: number, y: number): P2 => rotAbout([hd.cx + hd.f * x * hd.a, hd.wy + y * hd.a], hd.rot, [hd.cx, hd.wy]);
/** closed shape in head units ([x, y, sharp?] list, drawn clockwise for f = +1) -> smoothed canvas contour, clockwise */
const huShape = (hd: Head, spec: [number, number, number?][], it = 3): P2[] => {
  const pts = chaikin(spec.map(([x, y]) => [x, y] as P2), spec.map((s) => !!s[2]), it).map(([x, y]) => hu(hd, x, y));
  return hd.f < 0 ? pts.reverse() : pts;
};

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick" | "annoyed" | "proud" | "speak" | "awe";
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; mouth: MouthK }> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
  annoyed: { eye: ["lid", "lid"], brow: [5, -1], mouth: "frown" },
  proud: { eye: ["happy", "happy"], brow: [-4, -5], mouth: "smileWide" },
  speak: { eye: ["dot", "dot"], brow: [-4, -4], mouth: "grin" },
  awe: { eye: ["dot", "dot"], brow: [-6, -6], mouth: "O" },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b: boolean | number | undefined) => (b === true ? 1 : Number(b) || 0);

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, skin: string) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    default: {
      const s: P2[] = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false, gaze = 0, glasses = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 10 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey + gaze * 3.5 * u, u, side, look, skin);
    if (glasses) p.ell(x, ey, 11.5 * u, 9.5 * u, "rgba(225,240,255,0.22)", 2.6 * u);
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u - (glasses ? 3 * u : 0);
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  if (glasses) p.arc(fx, ey - 2 * u, ex - 11.5 * u, 3 * u, 200, 340, 2.4 * u);
  const mx = cx + 11 * u * facing, my = cy + 19 * u;
  mouth(p, F.mouth, mx, my, u);
  if (moustache && stout) { // bushy walrus moustache: a scalloped puff with its own ink line, a notch in the middle
    const pts = scallop(mx, cy + 11 * u, 20 * u, 5.5 * u, 10, 0.1);
    p.poly(pts, moustache, 2.2 * u);
    p.stroke([[mx, cy + 7 * u], [mx, cy + 11 * u]], 1.6 * u);
  } else if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * 15 * u, cy + 15 * u], 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p: Pen, hx: number, hy: number, W: number, expr: Expr, lid: number, brim: boolean, skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

// ---------------- hair + hats v3 (charshape.md 3.2): every one has its OWN silhouette, never a scaled skull copy ----
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
export type HairStyle = "bowl" | "side" | "spiky" | "bunTop" | "crop";
type Spec = [number, number, number?][];
/** hair shapes in head units for f = +1 (face to screen right); ct = skull crown (head units, about -1) */
const HAIR: Record<HairStyle, (ct: number) => Spec> = {
  // bowl cut: overhangs the back by ~0.07 W, faceted crown, fringe cut diagonally across the forehead
  bowl: (ct) => [[0.05, ct - 0.24], [0.62, ct - 0.14], [1.0, ct * 0.7], [1.11, -0.46], [1.1, -0.3, 1], [0.78, -0.5, 1], [0.25, -0.62],
    [-0.35, -0.68, 1], [-0.7, -0.3], [-0.9, 0.12, 1], [-1.14, 0.04, 1], [-1.17, -0.42], [-1.02, ct * 0.84], [-0.55, ct - 0.2]],
  // side part swept up at the front (the clerk under his eyeshade)
  side: (ct) => [[-0.2, ct - 0.18], [0.45, ct - 0.26], [0.98, ct - 0.12, 1], [1.13, -0.58], [1.09, -0.32, 1], [0.72, -0.56], [0.2, -0.66, 1],
    [-0.4, -0.52], [-0.72, -0.2], [-0.86, 0.1, 1], [-1.12, 0.02, 1], [-1.15, -0.45], [-0.88, ct * 0.9]],
  // kid: spiky tufts on the back of the crown, zig-zag bangs
  spiky: (ct) => [[-0.4, ct - 0.12], [-0.18, ct - 0.44, 1], [0.06, ct - 0.14], [0.3, ct - 0.34, 1], [0.5, ct - 0.08], [0.95, ct * 0.7],
    [1.11, -0.46], [1.09, -0.3, 1], [0.8, -0.54, 1], [0.6, -0.42, 1], [0.36, -0.6, 1], [0.1, -0.5, 1], [-0.25, -0.66], [-0.68, -0.3],
    [-0.86, 0.06, 1], [-1.12, -0.04, 1], [-1.16, -0.48], [-1.04, ct * 0.8], [-0.78, ct - 0.06], [-0.66, ct - 0.4, 1]],
  // bob with a bun on top (drawn behind) and a lock in front of the ear
  bunTop: (ct) => [[0.1, ct - 0.14], [0.7, ct - 0.04], [1.06, -0.45], [1.11, -0.02, 1], [0.9, -0.3, 1], [0.4, -0.52], [-0.3, -0.56, 1],
    [-0.6, -0.12], [-0.66, 0.6, 1], [-1.1, 0.62, 1], [-1.17, 0.0], [-1.07, ct * 0.75], [-0.6, ct - 0.1]],
  // short crop that hugs the skull: only the back and the sideburn show under a hat
  crop: (ct) => [[0.0, ct - 0.09], [0.62, ct * 0.97], [0.98, ct * 0.62], [0.96, -0.52, 1], [0.78, -0.62, 1], [0.3, -0.72], [-0.3, -0.66],
    [-0.6, -0.3], [-0.68, 0.1, 1], [-1.06, 0.06, 1], [-1.08, -0.42], [-0.82, ct * 0.86]],
};
/** scalloped puff (grey tufts, moustache): ellipse with n bumps */
const scallop = (cx: number, cy: number, rx: number, ry: number, n: number, amp: number, rot = 0): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * Math.PI * 2, r = 1 + amp * Math.abs(Math.cos((n * t) / 2));
    const x = rx * r * Math.cos(t), y = ry * r * Math.sin(t);
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
};
const ct0 = (hd: Head) => (hd.crown - hd.wy) / hd.a;
/** a part in head units, rotated by `tilt` (rad, + = front up) about the crown, as a clockwise canvas contour */
const hatShape = (hd: Head, spec: Spec, tilt: number, it = 3) => {
  const ct = ct0(hd), c = Math.cos(-tilt), s = Math.sin(-tilt);
  return huShape(hd, spec.map(([x, y, k]) => [x * c - (y - ct) * s, ct + x * s + (y - ct) * c, k] as [number, number, number?]), it);
};
const filled = (p: Pen, pts: P2[], col: string, light: number, R: number, ow: number, thick: number, felt = SH_FELT) => {
  p.shadedFill(pts, col, mul(col, felt), light, R, 0.35);
  p.inkRing(pts, ow, thick, 0.35);
};
/** parts of a hat / hairdo that sit behind the head (bonnet, hair bun) */
const hatBehind = (p: Pen, o: Outfit, hd: Head, light: number, thick: number, ow: number, side: boolean) => {
  if (o.hat === "hair" && o.hairStyle === "bunTop") {
    const ct = ct0(hd), [bx, by] = hu(hd, -0.32, ct - 0.26);
    filled(p, ellPts(bx, by, 0.4 * hd.a, 0.34 * hd.a, 0, 360, 0, 40), o.hair ?? "#3a2a20", light, 0.4 * hd.a, ow * 0.85, thick);
  }
  if (o.hat !== "bonnet") return;
  const bb = ellPts(hd.cx - (side ? 0.1 : 0) * hd.a, hd.wy - 0.1 * hd.a, 1.2 * hd.a, 1.08 * hd.a);
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, hd.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};
/** hair on the skull (drawn over the skin, under any hat) */
const hairOn = (p: Pen, o: Outfit, hd: Head, light: number, thick: number, ow: number) => {
  const style: HairStyle | null = o.hat === "hair" ? o.hairStyle ?? "bowl" : o.hat === "visor" ? o.hairStyle ?? "side"
    : o.hat === "dixie" || o.hat === "postcap" || o.hat === "cap" ? (o.hair ? "crop" : null) : null;
  if (!style) return;
  const col = o.hair ?? "#3a2a20", pts = huShape(hd, HAIR[style](ct0(hd)), 3);
  filled(p, pts, col, light, hd.a, ow * 0.9, thick);
  // two ink strands that follow the comb direction
  const u = hd.W / 100, ct = ct0(hd);
  if (style === "bowl" || style === "side" || style === "bunTop")
    for (const [x0, y0, x1, y1] of [[-0.1, ct + 0.02, 0.3, -0.62], [-0.55, ct + 0.18, -0.4, -0.68]]) p.stroke(curve(hu(hd, x0, y0), hu(hd, (x0 + x1) / 2 + 0.08, (y0 + y1) / 2), hu(hd, x1, y1)), 1.6 * u, mul(col, [0.6, 0.6, 0.66]));
};

const hatOn = (p: Pen, o: Outfit, hd: Head, light: number, thick: number, seed: number, side: boolean) => {
  const W = hd.W, HH = hd.HH, u = W / 100, crown = hd.crown, cx = hd.cx, ow = 0.85 * 5 * u, ct = ct0(hd), f = hd.f;
  const deg = (hd.rot * 180) / Math.PI;
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = ct + 0.5, ht = tall ? 1.25 : 1.05;
    const body = hatShape(hd, [[-0.92, yb, 1], [-1.02, yb - ht, 1], [1.06, yb - ht, 1], [0.96, yb, 1], [0, yb + 0.06]], 0, 1);
    p.shadedFill(body, "#3a3d47", "#24262d", light, hd.a, 0.4);
    if (tall) p.clip(body, () => p.band([hu(hd, -1.2, yb - ht + 0.14), hu(hd, 1.2, yb - ht + 0.14)], "#e8c45a", 0.11 * hd.a, 1.5 * u));
    p.inkRing(body, ow, thick, 0.35);
    const [px, py] = hu(hd, 0.45, yb + 0.04);
    p.ell(px, py, 0.62 * hd.a, 0.1 * hd.a, "#16171b", 2.5 * u, 0, 180, deg);
    const [bx, by] = hu(hd, 0.3, yb - 0.45 * ht);
    p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg);
    const [tx, ty] = hu(hd, 0.1, yb - ht - 0.12);
    p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
  } else if (o.hat === "cap") {
    // baseball cap: flattened dome 1.04 W wide, brim sticking out 0.3 W on the facing side
    const c = o.cap ?? "#e2453c", yb = ct + 0.5, dome: Spec = [];
    for (let i = 0; i <= 12; i++) {
      const t = Math.PI * (1 - i / 12), cc = Math.cos(t), ss = Math.sin(t);
      dome.push([1.06 * Math.sign(cc) * Math.abs(cc) ** (2 / 2.6), yb - 0.6 * Math.abs(ss) ** (2 / 2.6)]);
    }
    dome.push([1.0, yb + 0.04, 1], [0, yb + 0.1], [-1.0, yb + 0.04, 1]);
    dome[0][2] = 1; dome[12][2] = 1;
    const brim = hatShape(hd, [[0.5, yb - 0.06, 1], [1.2, yb - 0.1], [1.66, yb - 0.02], [1.7, yb + 0.1], [1.3, yb + 0.16], [0.6, yb + 0.12, 1]], rad(5), 2);
    const dp = hatShape(hd, dome, rad(5), 2);
    filled(p, dp, c, light, hd.a, ow, thick);
    p.stroke([hu(hd, 0.12, yb - 0.58), hu(hd, 0.3, yb - 0.2), hu(hd, 0.36, yb + 0.06)], 1.4 * u, mul(c, [0.6, 0.6, 0.66]));
    const [bx, by] = hu(hd, 0.08, yb - 0.6); p.ell(bx, by, 3.5 * u, 2.5 * u, mul(c, [0.8, 0.8, 0.8]), 1.5 * u);
    filled(p, brim, mul(c, [0.86, 0.86, 0.88]), light, 0.6 * hd.a, ow * 0.85, thick);
  } else if (o.hat === "dixie") {
    // white Dixie cup worn on the back of the head: flat-topped dome over a rolled brim that overhangs both sides
    const c = "#fbfaf4", tilt = rad(9);
    const dome = hatShape(hd, [[-0.66, ct + 0.1, 1], [-0.74, ct - 0.12], [-0.62, ct - 0.34], [0, ct - 0.4], [0.6, ct - 0.34], [0.7, ct - 0.12], [0.62, ct + 0.1, 1]], tilt, 2);
    filled(p, dome, c, light, 0.7 * hd.a, ow, thick, SH_CLOTH);
    const brimPts = hatShape(hd, [[-1.02, ct + 0.0, 1], [-0.5, ct + 0.07], [0.5, ct + 0.07], [1.0, ct - 0.02, 1], [1.04, ct + 0.18], [0.92, ct + 0.32, 1],
      [0, ct + 0.36], [-0.94, ct + 0.32, 1], [-1.06, ct + 0.16]], tilt, 2);
    filled(p, brimPts, c, light, hd.a, ow, thick, SH_CLOTH);
    p.stroke(hatShape(hd, [[-0.9, ct + 0.2], [0, ct + 0.23], [0.88, ct + 0.18]], tilt, 0).slice(0, 3), 1.6 * u, "#c3c6d4");
  } else if (o.hat === "postcap") {
    // letter carrier's service cap: flared crown with rounded corners, dark band, badge, peak on the facing side
    const c = o.cap ?? "#4f6380", yb = ct + 0.5, tilt = rad(6);
    const body = hatShape(hd, [[-1.02, yb, 1], [-1.14, yb - 0.58], [-1.02, yb - 0.68], [0, yb - 0.7], [1.08, yb - 0.76], [1.2, yb - 0.66], [1.08, yb, 1], [0, yb + 0.06]], tilt, 2);
    p.shadedFill(body, c, mul(c, SH_FELT), light, hd.a, 0.35);
    p.clip(body, () => {
      p.band([hu(hd, -1.4, yb - 0.1), hu(hd, 1.4, yb - 0.1)], "#1d2230", 0.2 * hd.a, 0);
      p.stroke([hu(hd, -1.2, yb - 0.56), hu(hd, 0, yb - 0.6), hu(hd, 1.25, yb - 0.64)], 1.4 * u, mul(c, [1.25, 1.25, 1.2]));
    });
    p.inkRing(body, ow, thick, 0.35);
    const [bx, by] = hu(hd, 0.42, yb - 0.38);
    p.ell(bx, by, 6.5 * u, 6 * u, "#e8c45a", 2 * u, 0, 360, deg);
    const pk = hatShape(hd, [[0.0, yb - 0.02, 1], [1.3, yb - 0.04, 1], [1.24, yb + 0.12], [0.6, yb + 0.2], [0.05, yb + 0.1]], tilt, 2);
    p.poly(pk, "#16171b", 2.5 * u);
  } else if (o.hat === "visor") {
    // clerk's green celluloid eyeshade over his hair
    const yb = ct + 0.4;
    p.band([hu(hd, -1.1, yb), hu(hd, 1.12, yb - 0.02)], "#2f6a43", 0.09 * hd.a, 1.2 * u);
    const sh = huShape(hd, [[-0.55, yb, 1], [1.12, yb - 0.02, 1], [1.55, yb + 0.06], [1.2, yb + 0.22], [0.3, yb + 0.24], [-0.4, yb + 0.1]], 2);
    p.poly(sh, "rgba(60,170,95,0.72)", 2.6 * u);
  } else if (o.hat === "balding") {
    // older man: fluffy grey tufts over the ears (bigger on the back side), bare crown, a comb-over strand and a shine
    const colH = o.hair ?? "#d9d6cf";
    const tufts: [number, number, number, number][] = side ? [[-0.92, -0.2, 0.36, 0.42]] : [[-0.98, -0.18, 0.34, 0.42], [1.02, -0.22, 0.2, 0.32]];
    for (const [x, y, rx, ry] of tufts) {
      const [tx, ty] = hu(hd, x, y);
      filled(p, scallop(tx, ty, rx * hd.a, ry * hd.a, 6, 0.14, rad(12) * Math.sign(x) * f), colH, light, rx * hd.a, ow * 0.75, thick);
    }
    p.stroke(curve(hu(hd, -0.62, ct + 0.28), hu(hd, 0.0, ct - 0.02), hu(hd, 0.55, ct + 0.18)), 1.6 * u, mul(colH, [0.75, 0.75, 0.78]));
    const [sx, sy] = hu(hd, -0.28, ct + 0.24);
    p.ell(sx, sy, 0.18 * hd.a, 0.07 * hd.a, "rgba(255,255,255,0.7)", 0, 0, 360, -20 * f);
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const R = (pts: P2[]) => rotPts(pts, hd.rot, cx, hd.wy);
    const body = R([[cx - wb, yb], [cx - wt, yb - ht], [cx + wt, yb - ht], [cx + wb, yb]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, deg);
  } else if (o.hat === "bonnet") {
    const [bx, by] = hu(hd, side ? 0.1 : 0, ct + 0.3);
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
  }
  void seed;
};
// ---------------- bodies ----------------
export type Arms = [P2[], P2[]];
/** held prop; for the hammer the number is the strike 0 (raised) .. 1 (struck) */
export type Prop = null | "icecream" | "shako" | ["hammer", number] | "letter" | "letters" | "sack" | "watch" | "paddles";

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.7 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.86 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.66 },
  slim: { a: 112, torso: 1.15, legs: 1.45, tw: 0.62 },
};

/** arm poses (motion.md 3.3); "wave" uses the wave amount, "point" adds an index finger */
export type ArmPose = "hang" | "wave" | "point" | "hip" | "up" | "out" | "shrug" | "hold" | "ears";
/** a pose, or [from, to, k]: blend from one pose to another (k 0..1, eased by the caller) */
export type ArmSpec = ArmPose | [ArmPose, ArmPose, number];
export type FrontOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stroll" | "stand" | "sit" | "fall"; look?: number; blink?: boolean | number; lift?: number;
  prop?: Prop; tilt?: number; headTilt?: number; wave?: number;
  /** eyes up (-1) .. down (+1); salute = right hand at the brow */
  gaze?: number; salute?: boolean;
  /** canvas angle the key light comes FROM (painted crescent + thick outline side) */
  light?: number; facing?: -1 | 0 | 1; seed?: number;
  /** acting v3: screen-right / screen-left arm poses (override the prop default), body lean toward the facing side (deg),
   *  sweat drop progress 0..1, shoulders up 0..1 (shrug) */
  armR?: ArmSpec; armL?: ArmSpec; lean?: number; sweat?: number; shrug?: number;
};

const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};
const luma = (c: string) => { const n = parseInt(c.slice(1), 16); return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
/** near-ink limbs whatever the clothing (charshape.md 3.4): light clothes -> pure ink */
const limbCol = (c: string, k: number) => (luma(c) > 0.6 ? INK : mix(c, INK, k));

/** collar / shirt / tie on the torso (drawn inside the torso clip) */
const collarFront = (p: Pen, o: Outfit, tcx: number, chin: number, torsoBot: number, Ta: number, HH: number, u: number) => {
  if (o.collar === "sailor") {
    const navy = "#22305a";
    p.poly([[tcx - 1.0 * Ta, chin - 0.12 * HH], [tcx, chin + 0.44 * HH], [tcx + 1.0 * Ta, chin - 0.12 * HH], [tcx + 0.5 * Ta, chin - 0.12 * HH], [tcx, chin + 0.2 * HH], [tcx - 0.5 * Ta, chin - 0.12 * HH]], navy, 1.5 * u);
    p.stroke([[tcx - 0.86 * Ta, chin - 0.08 * HH], [tcx, chin + 0.37 * HH], [tcx + 0.86 * Ta, chin - 0.08 * HH]], 1.6 * u, "#f4f4f0");
    p.poly([[tcx - 10 * u, chin + 0.32 * HH], [tcx + 10 * u, chin + 0.32 * HH], [tcx + 3 * u, chin + 0.56 * HH], [tcx - 3 * u, chin + 0.56 * HH]], "#15161c", 1.2 * u);
    p.dot(tcx, chin + 0.33 * HH, 5 * u, "#15161c");
  } else if (o.collar === "suit") {
    p.poly([[tcx - 0.42 * Ta, chin - 0.12 * HH], [tcx + 0.42 * Ta, chin - 0.12 * HH], [tcx, chin + 0.52 * HH]], "#f7f4ea", 1.5 * u);
    if (o.tie) p.poly([[tcx - 4 * u, chin - 0.02 * HH], [tcx + 4 * u, chin - 0.02 * HH], [tcx + 6.5 * u, chin + 0.4 * HH], [tcx, chin + 0.5 * HH], [tcx - 6.5 * u, chin + 0.4 * HH]], o.tie, 1.4 * u);
    for (const s of [-1, 1]) p.stroke([[tcx + s * 0.45 * Ta, chin - 0.1 * HH], [tcx + s * 0.16 * Ta, chin + 0.56 * HH]], 2.4 * u, shade(o.jacket, 0.6));
    p.ell(tcx + 0.62 * Ta, chin + 0.22 * HH, 6 * u, 2.5 * u, "#f7f4ea", 1 * u); // pocket square
  } else if (o.collar === "chambray") {
    // open-neck work shirt: white undershirt V, pointed collar, two flap pockets
    p.poly([[tcx - 0.3 * Ta, chin - 0.12 * HH], [tcx + 0.3 * Ta, chin - 0.12 * HH], [tcx, chin + 0.2 * HH]], "#f7f6f0", 1.3 * u);
    for (const s of [-1, 1]) p.poly([[tcx, chin + 0.2 * HH], [tcx + s * 0.42 * Ta, chin - 0.12 * HH], [tcx + s * 0.5 * Ta, chin + 0.16 * HH]], mul(o.jacket, [1.08, 1.06, 1.03]), 1.3 * u);
    for (const s of [-1, 1]) {
      const px = tcx + s * 0.42 * Ta, py = chin + 0.36 * HH;
      p.poly(rrect(px - 0.24 * Ta, py, px + 0.24 * Ta, py + 0.26 * HH, 2 * u), null, 1.2 * u);
      p.poly([[px - 0.26 * Ta, py - 0.01 * HH], [px + 0.26 * Ta, py - 0.01 * HH], [px + 0.22 * Ta, py + 0.08 * HH], [px - 0.22 * Ta, py + 0.08 * HH]], mul(o.jacket, [0.9, 0.9, 0.94]), 1.2 * u);
    }
    p.stroke([[tcx, chin + 0.2 * HH], [tcx, torsoBot]], 1.2 * u);
  } else if (o.collar === "shirt") {
    for (const s of [-1, 1]) p.poly([[tcx, chin + 0.04 * HH], [tcx + s * 0.34 * Ta, chin - 0.1 * HH], [tcx + s * 0.3 * Ta, chin + 0.1 * HH]], "#fbf8f0", 1.3 * u);
    if (o.tie) p.poly([[tcx - 3.5 * u, chin + 0.04 * HH], [tcx + 3.5 * u, chin + 0.04 * HH], [tcx + 5.5 * u, chin + 0.42 * HH], [tcx, chin + 0.5 * HH], [tcx - 5.5 * u, chin + 0.42 * HH]], o.tie, 1.3 * u);
  }
  if (o.bag) p.band([[tcx + 0.85 * Ta, chin - 0.1 * HH], [tcx - 0.95 * Ta, torsoBot - 0.18 * HH]], shade(o.bag, 0.8), 6 * u, 1.3 * u);
};
/** leather satchel hanging at the hip, a few letters poking out */
const mailBag = (p: Pen, c: string, bx: number, by: number, u: number, light: number) => {
  for (let k = 0; k < 3; k++) p.poly(rrect(bx - 20 * u + k * 11 * u, by - 30 * u - k * 3 * u, bx - 6 * u + k * 11 * u, by - 12 * u, 2 * u), "#f7f4ea", 1.5 * u);
  const pts = rrect(bx - 28 * u, by - 20 * u, bx + 24 * u, by + 26 * u, 8 * u);
  p.gradFill(pts, c, mul(c, SH_CLOTH), light); p.poly(pts, null, 3.4 * u);
  p.poly(rrect(bx - 28 * u, by - 20 * u, bx + 24 * u, by + 2 * u, 6 * u), shade(c, 0.85), 2.6 * u);
  p.ell(bx - 2 * u, by + 1 * u, 4 * u, 4 * u, "#e8c45a", 1.5 * u);
};

/** skull + hair + hat + face: shared by the front and side views (p.rot already set for the head) */
const drawHead = (p: Pen, o: Outfit, hd: Head, light: number, thick: number, seed: number, side: boolean, face: () => void) => {
  const ow = 5 * (hd.W / 100);
  hatBehind(p, o, hd, light, thick, ow, side);
  const skin = o.skin ?? SKIN;
  // flat bright plateau over ~75 % of the width, narrow crescent on the far edge (charshade.md 3.1)
  p.shadedFill(hd.pts, skin, mul(skin, SH_WHITE), light, hd.a, 0.3, 1.1, 1.3);
  p.inkRing(hd.pts, ow, thick);
  hairOn(p, o, hd, light, thick, ow);
  hatOn(p, o, hd, light, thick, seed, side);
  if (o.earmuffs) { // headband over the crown + a cup on each side (only the back cup shows in profile)
    const u = hd.W / 100, ct = (hd.crown - hd.wy) / hd.a;
    const arcP: P2[] = [];
    for (let i = 0; i <= 16; i++) { const th = (Math.PI * i) / 16; arcP.push(hu(hd, -1.0 * Math.cos(th), (ct - 0.06) * Math.sin(th) + 0.0)); }
    p.band(arcP, "#3a3d47", 5 * u, 1.4 * u, "round");
    for (const x of side ? [-0.98] : [-1.02, 1.04]) { const [ex, ey] = hu(hd, x, 0.02); p.ell(ex, ey, 0.2 * hd.a, 0.27 * hd.a, o.earmuffs, 2.6 * u); }
  }
  face();
};

export const bodyFront = (p: Pen, o: Outfit, opts: FrontOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, prop = null, tilt = 0, headTilt = 0, wave,
    light = DEF_LIGHT, seed = 1, salute = false, lean = 0, sweat, shrug = 0 } = opts;
  const facing = opts.facing ?? 0;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const W = 2 * Bd.a, HH = 1.87 * Bd.a, u = W / 100; // body units: the standard skull
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  // body bob 5 % (march) / 3 % (stroll) of the height, lowest at contact (phase 0 and 0.5)
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hipY = torsoBot - 0.12 * HH;
  const hd = headPath(seed, Bd.a, facing, 300 + 2 * u * facing, chin + 0.04 * HH * shrug, o.headType ?? headKindOf(seed));
  const f = facing || hd.f, crown = hd.crown;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = limbCol(o.pants, 0.85), armCol = limbCol(o.jacket, 0.88), footCol = o.boots;
  const legW = 7.4 * u, footW = 8.5 * u; // verify_r1: ~1.3x the old stick legs
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = [300 + side * 36 * u, hipY + 0.2 * HH], ft: P2 = [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, ft), legW, legCol);
      footStroke(p, [ft[0] - side * 2 * u, ft[1]], [ft[0] + side * 12 * u, ft[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs: [P2, P2, P2][] = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]],
    ];
    legs.forEach(([h, k, ft], i) => {
      p.stroke(curve(h, k, ft), legW, legCol);
      footStroke(p, ft, [ft[0] + (i ? 14 : -14) * u, ft[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u + f * 3 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      // 3/4 stance: feet both turned toward the facing side, the far one tucked in
      const hx = 300 + side * 13 * u, fx = 300 + side * (side === f ? 22 : 16) * u, fy = sole - 4 * u - up;
      const k: P2 = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      const toe = f * 14 * u, heel = -f * 4 * u;
      footStroke(p, [fx + heel, fy], [fx + toe, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + lean toward the facing side + a weight-shift sway on every step) ----
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0;
  const A = tilt + sway + lean * f;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  // narrow-topped bean, widest low (charshape.md 3.3)
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 1.9, nBot: 2.4, egg: o.build === "stout" ? 0.24 : 0.22,
    asym: 0.06 * f, rot: 0, noise: 0.004, seed: seed + 7 };
  const tcx = 300 + 4 * u * f, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const shUp = 0.07 * HH * shrug;
  const sh = (side: number): P2 => [tcx + side * 0.8 * T.a, chin + 0.14 * HH - shUp];
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  const pose = (ps: ArmPose, side: number): [P2, P2, P2] => {
    const S = sh(side), X = (dx: number, dy: number): P2 => [S[0] + side * dx * HH, S[1] + dy * HH], wv = wave ?? 0;
    switch (ps) {
      case "wave": return [S, X(0.3 + 0.03 * wv, -0.2), X(0.36 + 0.14 * wv, -0.62)];
      case "up": return [S, X(0.36, -0.3), X(0.54, -0.76)];
      case "ears": return [S, X(0.52, -0.12), X(0.3, -0.6)];
      case "out": return [S, X(0.4, -0.1), X(0.8, -0.36)];
      case "point": return [S, X(0.44, 0.06), X(0.9, -0.1)];
      case "shrug": return [S, X(0.36, 0.34), X(0.64, 0.12)];
      case "hip": return [S, X(0.42, 0.26), [tcx + side * 0.98 * T.a, S[1] + 0.56 * HH]];
      case "hold": return [S, X(0.2, 0.46), [tcx + side * 0.3 * T.a, S[1] + 0.36 * HH]];
      default: {
        const fwd = side > 0 ? sw : -sw, ex = tcx + side * (1.08 * T.a + 4 * u);
        const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
        return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
      }
    }
  };
  type Arm = { pts: [P2, P2, P2]; front: boolean; finger?: number };
  const spec = (sp: ArmSpec, side: number): Arm => {
    const [a0, a1, k] = typeof sp === "string" ? [sp, sp, 1] : sp, P0 = pose(a0, side), P1 = pose(a1, side), kk = clamp(k, 0, 1);
    const pts = P0.map((q, i) => lerp2(q, P1[i], kk)) as [P2, P2, P2];
    const fin = (a0 === "point" ? 1 - kk : 0) + (a1 === "point" ? kk : 0);
    return { pts, front: a1 === "hold" && kk > 0.5, finger: fin > 0.3 ? fin : undefined };
  };
  // rifle at the order: butt by the right hip, held by the hanging right hand, muzzle past the crown
  const R0: P2 = [300 + 47 * u, torsoBot + 0.12 * HH], R1: P2 = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
  const arms: Arm[] = [];
  const S1 = sh(1);
  if (mode === "sit") for (const side of [-1, 1]) {
    const sp = side > 0 ? opts.armR : opts.armL;
    if (sp) { const a = spec(sp, side); if (side > 0 && (prop === "letter" || prop === "letters")) a.front = true; arms.push(a); }
    else arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  }
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else {
    arms.push(opts.armL ? spec(opts.armL, -1) : { pts: pose("hang", -1), front: false });
    if (rifle) {
      const G = lerp2(R0, R1, 0.1);
      arms.push({ pts: [S1, [tcx + 1.12 * T.a + 5 * u, S1[1] + 0.45 * HH], G], front: false });
    } else if (salute) {
      // drawn after the head (below)
    } else if (opts.armR) {
      const a = spec(opts.armR, 1);
      if (prop === "letter" || prop === "letters" || prop === "watch") a.front = true;
      arms.push(a);
    } else if (prop === "letter" || prop === "letters") {
      const k = wave ?? 0;
      arms.push({ pts: [S1, [tcx + 1.15 * T.a + 10 * u, S1[1] - 0.12 * HH], [tcx + 1.1 * T.a + 16 * u + 6 * u * k, S1[1] - 0.58 * HH - 4 * u * k]], front: true });
    } else if (prop === "sack") {
      arms.push({ pts: [S1, [tcx + 1.25 * T.a + 8 * u, S1[1] + 0.22 * HH], [tcx + 0.9 * T.a, S1[1] - 0.16 * HH]], front: true });
    } else if (prop === "watch") {
      arms.push({ pts: [S1, [tcx + 1.12 * T.a + 4 * u, S1[1] + 0.46 * HH], [tcx + 0.15 * T.a, S1[1] + 0.3 * HH]], front: true });
    } else if (wave !== undefined) {
      arms.push({ pts: pose("wave", 1), front: false });
    } else if (prop === "icecream") {
      arms.push({ pts: [S1, [tcx + 1.05 * T.a + 4 * u, S1[1] + 0.45 * HH], [tcx + 0.5 * T.a, S1[1] + 0.4 * HH]], front: true });
    } else if (Array.isArray(prop)) {
      const k = clamp(prop[1], 0, 1);
      const E = lerp2([tcx + 1.1 * T.a + 10 * u, S1[1] - 0.15 * HH], [tcx + 1.2 * T.a + 10 * u, S1[1] + 0.3 * HH], k);
      const Hd = lerp2([tcx + 1.15 * T.a + 14 * u, S1[1] - 0.55 * HH], [tcx + 1.45 * T.a + 22 * u, S1[1] + 0.35 * HH], k);
      arms.push({ pts: [S1, E, Hd], front: true });
    } else arms.push({ pts: pose("hang", 1), front: false });
  }
  const drawArm = (a: Arm) => {
    p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 6.2 * u, armCol);
    if (a.finger) {
      const [E, Hh] = [a.pts[1], a.pts[2]], dx = Hh[0] - E[0], dy = Hh[1] - E[1], l = Math.hypot(dx, dy) || 1;
      p.stroke([Hh, [Hh[0] + (dx / l) * 12 * u * a.finger, Hh[1] + (dy / l) * 12 * u * a.finger]], 3.4 * u);
    }
    p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u);
  };
  // behind the body: rifle, sword, arms
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0: P2 = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // torso / dress: rim + plateau + far falloff -> clothing clipped to it -> thick-thin ink ring
  if (dress) {
    const wy0 = torsoBot - 0.42 * HH, hem = sole - 0.42 * HH, wT = 0.86 * T.a, wB = 1.5 * T.a;
    p.torsoFill(tp, o.jacket, light);
    p.clip(tp, () => collarFront(p, { ...o, collar: "shirt", tie: undefined }, tcx + 0.12 * T.a * f, chin, torsoBot, T.a, HH, u));
    p.inkRing(tp, ow, thick);
    const sk = chaikin([[tcx - wT, wy0], [tcx + wT, wy0], [tcx + wB, hem], [tcx, hem + 0.05 * HH], [tcx - wB, hem]], [true, true, true, false, true], 2);
    p.torsoFill(sk, o.dress!, light);
    for (const k of [-0.45, 0.4]) p.stroke([[tcx + k * wT, wy0 + 0.1 * HH], [tcx + k * wB * 0.9, hem - 0.02 * HH]], 1.4 * u, mul(o.dress!, [0.72, 0.72, 0.78]));
    p.inkRing(sk, ow, thick);
    p.band([[tcx - wT * 1.02, wy0 + 0.02 * HH], [tcx + wT * 1.02, wy0 + 0.02 * HH]], mul(o.dress!, [0.8, 0.8, 0.85]), 0.06 * HH, 1.4 * u);
  } else {
    p.torsoFill(tp, o.jacket, light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      collarFront(p, o, tcx + 0.12 * T.a * f, chin, torsoBot, T.a, HH, u);
      // cloth fold on the shadow side + a hem crease (verify_r1: volume, not a sticker)
      const fs = -(Math.sign(Math.cos(light)) || 1), fc = mul(o.jacket, [0.72, 0.72, 0.8]);
      p.stroke(curve([tcx + fs * 0.62 * T.a, chin + 0.5 * HH], [tcx + fs * 0.42 * T.a, torsoBot - 0.45 * HH], [tcx + fs * 0.55 * T.a, torsoBot - 0.12 * HH]), 1.6 * u, fc);
      p.stroke(curve([tcx - fs * 0.1 * T.a, torsoBot - 0.1 * HH], [tcx + fs * 0.2 * T.a, torsoBot - 0.16 * HH], [tcx + fs * 0.4 * T.a, torsoBot - 0.08 * HH]), 1.3 * u, fc);
      for (let i = 0; i < 4 && o.buttons !== "none"; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.collar === "suit" && i < 2) continue;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        const bx = tcx + 0.14 * T.a * f;
        p.dot(bx, y, 2.2 * u + 0.8 * u, INK); p.dot(bx, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) { const s = f; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
    if (o.bag) mailBag(p, o.bag, tcx - 0.95 * T.a * f, torsoBot - 0.12 * HH, u, light);
  }
  if (prop === "sack") { // over the right shoulder, beside the head
    const pts = blobPts(tcx + 1.05 * T.a, chin - 0.2 * HH, { a: 0.3 * W, b: 0.34 * HH, nTop: 2.2, nBot: 2.4, egg: 0.12, asym: 0, rot: rad(-15), noise: 0.02, seed: 4 });
    p.torsoFill(pts, "#cdb48a", light); p.inkRing(pts, ow * 0.85, thick);
    p.band([[tcx + 1.05 * T.a - 0.22 * W, chin - 0.06 * HH], [tcx + 1.05 * T.a + 0.22 * W, chin - 0.12 * HH]], "#3a4a70", 0.06 * HH, 1.2 * u);
  }
  // in front of the body: hands holding props
  for (const a of arms) if (a.front) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "letter" || prop === "letters") {
      const n = prop === "letters" ? 3 : 1;
      for (let k = n - 1; k >= 0; k--) {
        const e = rotPts(rrect(hx - 22 * u, hy - 30 * u, hx + 22 * u, hy - 2 * u, 3 * u), rad(-12 + 14 * k), hx, hy);
        p.poly(e, k ? "#efe3c8" : "#f7f4ea", 2 * u);
        if (!k) { p.stroke(rotPts([[hx - 22 * u, hy - 30 * u], [hx, hy - 16 * u], [hx + 22 * u, hy - 30 * u]], rad(-12), hx, hy), 1.6 * u); p.poly(rotPts(rrect(hx + 9 * u, hy - 28 * u, hx + 19 * u, hy - 20 * u, 1), rad(-12), hx, hy), "#d0322f", 0); }
      }
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "watch") {
      p.ell(hx + 8 * u, hy + 2 * u, 5 * u, 5 * u, "#e8c45a", 1.8 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop)) {
      const ang = rad(-70 + 105 * clamp(prop[1], 0, 1));
      const Rh = (pts: P2[]) => rotPts(pts, ang, hx, hy);
      p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
      p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    }
  }
  if (prop === "shako") { // carried by the left hand
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  if (prop === "paddles") for (const a of arms) { // marshalling bats: orange disc on a short handle, held up from each hand
    const [E, Hh] = [a.pts[1], a.pts[2]], dx = Hh[0] - E[0], dy = Hh[1] - E[1], l = Math.hypot(dx, dy) || 1;
    const c: P2 = [Hh[0] + (dx / l) * 22 * u, Hh[1] + (dy / l) * 22 * u];
    p.stroke([Hh, c], 4 * u, "#3a3030");
    p.ell(c[0], c[1], 17 * u, 17 * u, "#ff7a1e", 2.6 * u); p.ell(c[0], c[1], 9 * u, 9 * u, "#ffd23a", 0);
    p.dot(Hh[0], Hh[1], 6 * u);
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  const brim = o.hat === "postcap" || o.hat === "shako" || o.hat === "shako_tall" || o.hat === "visor";
  drawHead(p, o, hd, light, thick, seed, false, () => {
    faceFront(p, hd.cx, hd.wy, W, expr, f, look, lid, brim, skin, o.moustache, o.build === "stout", opts.gaze ?? 0, !!o.glasses);
    if (sweat !== undefined && sweat > 0 && sweat < 1) {
      // teardrop at the back temple, sliding 30 u down, fading out at the end
      const [dx, dy] = hu(hd, -0.78, -0.62 + 0.3 * sweat), al = Math.min(1, (1 - sweat) * 4);
      const g = p.g; g.save(); g.globalAlpha = al;
      const drop: P2[] = [];
      for (let i = 0; i <= 24; i++) { const t = (i / 24) * two, r = 1 - 0.55 * Math.max(0, -Math.sin(t)) ** 1.5; drop.push([dx + 5 * u * r * Math.cos(t), dy + 6 * u * Math.sin(t) - (Math.sin(t) < 0 ? 4 * u * (-Math.sin(t)) ** 3 : 0)]); }
      p.poly(drop, "#a8dcff", 2 * u);
      p.ell(dx - 1.5 * u, dy + 1 * u, 1.3 * u, 2 * u, "rgba(255,255,255,0.9)", 0);
      g.restore();
    }
  });
  if (salute) { // hand to the brow, drawn over the head
    p.rot = A ? [rad(A), 300, hipY] : null;
    // right hand flat at the right brow, elbow out to the side
    const Hd: P2 = [hd.cx + 0.5 * W, hd.wy - 0.5 * hd.a], E: P2 = [tcx + 1.2 * T.a + 34 * u, S1[1] - 0.02 * HH];
    p.stroke([S1, E, Hd], 6.2 * u, armCol); p.dot(Hd[0], Hd[1], 6 * u);
    p.stroke([Hd, [Hd[0] - 16 * u, Hd[1] - 7 * u]], 4.2 * u);
  }
  p.rot = null;
};

export type SideOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stand" | "swing" | "push"; blink?: boolean | number; stomp?: number; pose?: number;
  /** step length as a multiple of 0.8 m (370 units): matches 1.6 m/s at 2 steps/s; scale by the view's foreshortening */
  stride?: number; light?: number; seed?: number;
  /** push mode: where the hands land at pose 1, in final canvas units (e.g. the swing kid's back) */
  hand?: [number, number];
};

/** two-bone leg, knee bending forward (+x) */
const ik = (hip: P2, ank: P2, l1: number, l2: number): P2 => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** hip height of the seated kid in `swing` mode (design units); swingKid seats the torso bottom on the plank */
const SWING_HIP = 733;

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p: Pen, o: Outfit, opts: SideOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H: Blob = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = limbCol(o.pants, 0.85), farCol = limbCol(o.pants, 0.92), footCol = o.boots;
  type LegS = { ank: P2; pitch: number; near: boolean };
  const legs: LegS[] = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph: number) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5; // swing: cycloid in world space, so the foot leaves and lands at zero ground speed
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]] as const)
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = 4 + 3 * Math.cos(2 * two * phase); // 7 deg at contact, 1 deg at passing
    nearFwd = nL.x / (S / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near] of [[-6, false], [0, true]] as const) {
      const knee: P2 = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip: P2 = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? ([300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u] as P2) : ik(hip, L.ank, l1, l2);
    const hp0: P2 = [300 + (L.near ? 0 : -5 * u), hipY];
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
  }
  // ---- upper body leans about the hip ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T: Blob = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = limbCol(o.jacket, 0.8), farArm = limbCol(o.jacket, 0.9);
  const S: P2 = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang: number): [P2, P2, P2] => {
    const e: P2 = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0: P2 = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1: P2 = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
  let near: [P2, P2, P2], far: [P2, P2, P2] | null;
  if (mode === "swing") { near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]]; far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]]; }
  else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN: P2 = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      // target is in final canvas units; the arm is drawn inside the lean rotation, so undo it
      const th = -rad(lean), dx = opts.hand[0] - 300, dy = opts.hand[1] - hipY;
      const tg: P2 = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) { near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0]; far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0); }
  else { near = swingArm(rad(-30) * nearFwd); far = mode === "march" ? swingArm(rad(30) * nearFwd) : null; }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); p.dot(far[2][0], far[2][1], 5.5 * u); }
  p.torsoFill(tp, o.jacket, light);
  p.clip(tp, () => {
    if (o.belt) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); p.dot(near[2][0], near[2][1], 5.5 * u);
  // ---- head ----
  const hx = 300 + 4 * u;
  const hd = headPath(seed, Bd.a, 1, hx, chin, o.headType ?? headKindOf(seed), true);
  const brim = o.hat === "postcap" || o.hat === "shako" || o.hat === "shako_tall" || o.hat === "visor";
  drawHead(p, o, hd, light, thick, seed, true, () => faceSide(p, hx, hd.wy, W, expr, lid, brim, skin, o.moustache, o.build === "stout"));
  void hc; void SH_SKIN;
  p.rot = null;
};

/** rope + seat + seated kid on a 700 x 2300 canvas; the pivot is design (350, 20); kid drawn at 0.92 scale */
export const swingKid = (p: Pen, o: Outfit, kick: number, expr: Expr, light = DEF_LIGHT, blink: number = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  // two ropes from the pivot to the ends of a wide plank, the kid framed between them: a single rope behind the kid
  // ended at the cap and read as a hanging. Far rope behind the kid, near rope drawn over (clear of the face).
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};

// ---------------- effects ----------------
export const fxNote = (p: Pen, kind: number, col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};

/** spark / impact star on a 500 x 500 canvas; t in 0..1 */
export const fxBurst = (p: Pen, t: number, col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad((i * 360) / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)], [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};

/** water splash crown on an 800 x 800 canvas; t in 0..1 */
export const fxSplash = (p: Pen, t: number) => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const blue = "#bfe8ff", deep = "#6cc0f0";
  if (rise > 0.02) {
    const pts: P2[] = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + (660 * i) / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};

/** dust puff on a 300 x 300 canvas; t in 0..1 */
export const fxPuff = (p: Pen, t: number) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(160 + i * 55), d = 40 + 70 * t, r = (34 + 20 * (i % 2)) * (1 - 0.6 * t);
    p.ell(150 + d * Math.cos(a), 180 + d * 0.45 * Math.sin(a), r, r * 0.8, `rgba(238,225,205,${(1 - t).toFixed(3)})`, 0);
  }
};

/** circling stars on a 420 x 210 canvas */
export const fxStars = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** three jittering strain ticks on a 300 x 300 canvas */
export const fxCreak = (p: Pen, t: number) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([[150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)], [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]], 10);
  }
};

/** flat water ring (drawn top-down) on a 600 x 600 canvas; t in 0..1 */
export const fxRing = (p: Pen, t: number) => {
  // thin light water rings (white crest, pale blue trailing rings), thinning as they spread
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath(); g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa"; g.lineWidth = 9 * (1 - u) + 3; g.stroke();
  }
};

/** text-free sign on a 700 x 520 canvas: "no marching in step on the bridge". A bridge (deck + arch + piers), four
 *  identical pairs of marching legs in the same stride (in step), a bold red X over all of it. */
export const fxSign = (p: Pen) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  // bridge: deck, stone arch underneath, two piers
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath(); g.moveTo(112, 470); g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  // four identical soldiers' legs mid-stride: same leg forward on every one = in step
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);                  // coat hem
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);           // front leg
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);           // back leg
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);                          // boots point forward
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  // big red X
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]] as [[number, number], [number, number]][]) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};

/** soft cartoon cloud on a 600 x 300 canvas */
export const fxCloud = (p: Pen, seed: number) => {
  const blobs: [number, number, number][] = [[150, 190, 80], [250, 150, 105], [360, 160, 95], [450, 195, 70], [300, 210, 90]];
  for (const [x, y, r] of blobs) p.ell(x + ((seed * 37) % 20) - 10, y, r, r * 0.8, "#ffffff", 0);
  p.ell(300, 235, 230, 40, "#ffffff", 0);
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft core + long smooth edge (charshade.md 3.4), blurred so the rim never reads as a hard sticker
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 56);
  for (const [r, k] of [[0, 0], [0.25, 0.05], [0.5, 0.35], [0.75, 0.75], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.save(); g.filter = "blur(4px)"; g.fillStyle = gr; g.fillRect(-8, -8, 144, 144); g.restore();
};

/** floating wooden plank, side-on, on a 320 x 110 canvas */
export const fxPlank = (p: Pen) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK); p.dot(284, 54, 5, INK);
};

/** floating marching drum (no text) on a 260 x 240 canvas: white shell, red hoops, ink zig-zag cord */
export const fxDrum = (p: Pen) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

/** soft ground contact blob on a 128 x 128 canvas, multiply colour (sRGB-encoded linear ratio) in the centre */
export const fxBlob = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft contact shadow: flat core, then a long smooth (roughly gaussian) fall-off to white = no change
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.5, 0.04], [0.64, 0.18], [0.76, 0.42], [0.87, 0.72], [0.95, 0.92], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};


// ---------------- missile short effects ----------------
/** envelope (300 x 200 canvas); k picks a paper colour, stamp on most */
export const fxLetter = (p: Pen, k: number) => {
  const paper = ["#f7f4ea", "#efe3c8", "#e8eef6", "#f4e6d0"][k % 4];
  p.poly(rrect(20, 24, 280, 176, 12), paper, 9);
  p.stroke([[24, 30], [150, 110], [276, 30]], 7);
  if (k % 3 !== 2) p.poly(rrect(212, 40, 262, 92, 4), k % 2 ? "#2f5d9a" : "#d0322f", 4);
  for (const [x0, y0, w] of [[60, 130, 110], [60, 150, 80]] as const) p.stroke([[x0, y0], [x0 + w, y0]], 5, "rgba(60,50,60,0.45)");
};
/** exhaust flame on a 300 x 600 canvas: nozzle at the top centre, plume down the canvas; t = flicker phase */
export const fxFlame = (p: Pen, t: number) => {
  const j = (k: number) => 1 + 0.12 * Math.sin(t * 37 + k * 2.1) + 0.06 * Math.sin(t * 61 + k);
  const lobe = (len: number, w: number): P2[] => {
    const pts: P2[] = [];
    for (let i = 0; i <= 32; i++) { const v = i / 32, wv = w * Math.sin(Math.PI * Math.min(1, v * 1.15 + 0.08)) * (1 + 0.15 * Math.sin(v * 9 + t * 40)); pts.push([150 + wv, 20 + v * len]); }
    for (let i = 32; i >= 0; i--) { const v = i / 32, wv = w * Math.sin(Math.PI * Math.min(1, v * 1.15 + 0.08)) * (1 + 0.15 * Math.sin(v * 7 - t * 33)); pts.push([150 - wv, 20 + v * len]); }
    return pts;
  };
  p.poly(lobe(560 * j(0), 120), "#ff7a2a", 8);
  p.poly(lobe(400 * j(1), 82), "#ffc23a", 0);
  p.poly(lobe(230 * j(2), 48), "#fff6d8", 0);
};
/** puffy smoke cloud on a 400 x 400 canvas; t 0..1 grows and fades; tint = base grey */
export const fxSmoke = (p: Pen, t: number, seed = 0, tint = "#ece8ea") => {
  const g = p.g, a = Math.max(0, 1 - t) ** 0.8;
  g.save(); g.globalAlpha = a;
  const k = 0.55 + 0.45 * Math.min(1, t * 3);
  const puffs: [number, number, number][] = [[200, 230, 110], [120, 250, 80], [285, 245, 85], [160, 160, 85], [250, 165, 80], [200, 120, 70]];
  for (const [x, y, r] of puffs) p.ell(200 + (x - 200) * k + 8 * Math.sin(seed + x), 200 + (y - 200) * k, r * k, r * k * 0.92, null, 16);
  for (const [x, y, r] of puffs) p.ell(200 + (x - 200) * k + 8 * Math.sin(seed + x), 200 + (y - 200) * k, r * k, r * k * 0.92, tint, 0);
  for (const [x, y, r] of puffs.slice(0, 3)) p.ell(200 + (x - 200) * k + 8 * Math.sin(seed + x), 200 + (y - 200) * k + r * k * 0.35, r * k * 0.8, r * k * 0.45, mul(tint, [0.82, 0.8, 0.9]), 0);
  g.restore();
};
/** cartoon explosion on an 800 x 800 canvas, t 0..1: white flash core -> orange fireball with spikes -> grey puff */
export const fxBoom = (p: Pen, t: number) => {
  const c = 400, g = p.g;
  if (t < 0.45) {
    const u = t / 0.45, R0 = 120 + 260 * (1 - (1 - u) ** 3);
    const spikes: P2[] = [];
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, r = R0 * (i % 2 ? 0.72 : 1.0) * (1 + 0.08 * Math.sin(i * 5.3)); spikes.push([c + r * Math.cos(a), c + r * Math.sin(a)]); }
    p.poly(spikes, "#ff7a2a", 12);
    p.ell(c, c, R0 * 0.62, R0 * 0.6, "#ffc23a", 0);
    p.ell(c, c, R0 * 0.34 * (1 - u * 0.5), R0 * 0.32 * (1 - u * 0.5), "#fff6d8", 0);
  }
  if (t > 0.25) {
    const u = (t - 0.25) / 0.75;
    g.save(); g.globalAlpha = Math.min(1, (1 - u) * 1.6);
    const puffs: [number, number, number][] = [[400, 430, 190], [250, 450, 140], [550, 450, 145], [320, 300, 150], [480, 300, 150], [400, 220, 120]];
    const k = 0.8 + 0.35 * u;
    for (const [x, y, r] of puffs) p.ell(c + (x - c) * k, c + (y - c) * k - 40 * u, r * k, r * k * 0.9, null, 14);
    for (const [x, y, r] of puffs) p.ell(c + (x - c) * k, c + (y - c) * k - 40 * u, r * k, r * k * 0.9, "#d9d4dc", 0);
    for (const [x, y, r] of puffs.slice(0, 3)) p.ell(c + (x - c) * k, c + (y - c) * k - 40 * u + r * 0.3, r * k * 0.8, r * k * 0.42, "#aaa3b4", 0);
    g.restore();
  }
};

// ---------------- acting FX (motion.md 3.3): drawn on ones by the caller ----------------
/** 4-point sparkle stars on a 400 x 400 canvas; t 0..1 over the whole burst: 4 stars staggered, each 0 -> 1 -> 0 */
export const fxSparkle = (p: Pen, t: number, col = "#fff2a8") => {
  const S: [number, number, number][] = [[200, 190, 70], [90, 110, 42], [320, 95, 50], [300, 300, 36]];
  S.forEach(([x, y, r], i) => {
    const u = t * 1.6 - i * 0.18;
    if (u <= 0 || u >= 1) return;
    const k = Math.sin(Math.PI * u), R = r * k, w = R * 0.26, pts: P2[] = [];
    for (let j = 0; j < 8; j++) { const a = (j * Math.PI) / 4 + 0.2 * u, rr = j % 2 ? w : R; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); }
    p.poly(chaikin(pts, pts.map((_, j) => j % 2 === 0), 1), col, Math.max(3, 7 * k));
  });
};
/** speed lines on a 600 x 300 canvas (the object travels toward +x): 6 ink lines, offsets jittered per frame */
export const fxSpeed = (p: Pen, ph: number, col = "rgba(255,255,255,0.7)") => {
  for (let i = 0; i < 4; i++) {
    const j = rnd(Math.floor(ph * 30) + 1, i), y = 50 + i * 66 + 12 * (j - 0.5), x1 = 560 - 90 * j, len = 140 + 200 * rnd(i + 3, Math.floor(ph * 30));
    p.stroke([[x1 - len, y], [x1, y]], 2 + 1.5 * j, col);
  }
};

