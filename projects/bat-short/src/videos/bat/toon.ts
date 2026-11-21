// Our own flat 2D cartoon cast + 2D effects, drawn on a canvas (owner: characters, with cast.ts / cardshade.ts).
// "The Bat Bomb" cast: ADAMS (cheerful dentist, round glasses, neat moustache, tweed jacket + bow tie, fedora + camera
// for the cave), CHEMIST (lab coat, wild hair, goggles on the forehead), PRESIDENT (our own cartoon: dark suit, round
// glasses, cigarette holder), GENERAL (peaked cap, big moustache, medals), SOLDIER (khaki, garrison cap), OFFICER (War
// Department) and the BATS (bottom of the file: fly / hang / sit / peek / sniff / smug / wink / cheer / flex, a tiny
// timer capsule on the belly); props stamp / tweezers / cloth / bucket / folder / toy bomber on a stick; effects
// fxFlame, fxFireball, fxPoof, fxBulb, fxDust, fxDustCloud, fxSmoke.
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
  /** round glasses, neck tie colour, collar style */
  glasses?: boolean; tie?: string; collar?: "shirt" | "tunic" | "open";
  /** emu short: Sam Browne belt colour, braces colour, sergeant's chevrons colour, cap band / peak colours */
  samBrowne?: string; braces?: string; stripes?: string; band?: string; peak?: string;
  /** v3 heads: skull archetype, hairdo (hat "hair"), beard colour */
  headType?: HeadKind; hairStyle?: HairStyle; beard?: string;
  /** bat short: bow tie colour, goggles on the forehead, medal row, cigarette holder, camera on a strap, lab coat,
   *  tweed fleck, soot on the face */
  bowtie?: string; goggles?: boolean; medals?: boolean; holder?: boolean; camera?: boolean; coat?: boolean; tweed?: boolean; soot?: boolean;
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
export const OFFICER_1831: Outfit = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];
// ---- bat short cast (near-white heads, three skull archetypes, own hat silhouettes, colour on the clothes) ----
const KHAKI = "#b59a5e", KHAKI_D = "#8a7446";
/** Lytle Adams, dentist: tweed jacket, bow tie, round glasses, neat moustache, side-parted hair (fedora in the cave) */
export const ADAMS: Outfit = { jacket: "#9a6e46", pants: "#5d5448", boots: "#3a2a22", hat: "hair", hairStyle: "side", hair: "#4a3428",
  collar: "shirt", bowtie: "#c0353a", glasses: true, moustache: "#4a3428", buttons: "#3a2a22", headType: "standard", tweed: true };
export const ADAMS_HAT: Outfit = { ...ADAMS, hat: "fedora", cap: "#7a6450", band: "#3a2c26", camera: true };
/** the chemist: long white lab coat, wild grey hair, goggles pushed up on the forehead */
export const CHEMIST: Outfit = { jacket: "#f3f2ec", pants: "#4a4f5a", boots: "#2a2a30", dress: "#f3f2ec", coat: true, hat: "hair", hairStyle: "wild", hair: "#d9d6d0",
  collar: "shirt", tie: "#3a6ea8", goggles: true, headType: "bean", buttons: "none" };
/** the President (our own cartoon): dark navy suit, round glasses, a cigarette holder (no smoke), grey swept hair */
export const PRESIDENT: Outfit = { jacket: "#2f3752", pants: "#262c40", boots: "#1e1e24", hat: "hair", hairStyle: "side", hair: "#8c8a88",
  collar: "shirt", tie: "#8a2f3a", glasses: true, holder: true, buttons: "none", headType: "bun", build: "stout" };
/** the General: peaked cap, big walrus moustache, a row of medals, olive service coat */
export const GENERAL: Outfit = { jacket: "#6f6a44", pants: "#8a7e5a", boots: "#3a2618", hat: "peaked", cap: "#6a6440", band: "#3a3626", peak: "#2a1e14",
  hair: "#5a4a40", collar: "tunic", tie: "#5a5638", buttons: "#e2c45a", moustache: "#e8e4dc", build: "stout", medals: true, headType: "bean" };
/** the General after the fire: moustache singed to a smoking black frizz */
export const GENERAL_SINGED: Outfit = { ...GENERAL, moustache: "#2e2a2a", soot: true };
/** a soldier: 1940s khaki shirt + trousers, garrison cap */
export const SOLDIER: Outfit = { jacket: KHAKI, pants: KHAKI_D, boots: "#4a3020", hat: "garrison", cap: "#8c7a4a", hair: "#3b2a22",
  collar: "tunic", buttons: "#c9b47e", headType: "standard", belt: null };
export const SOLDIER2: Outfit = { ...SOLDIER, hair: "#7a4a2a", headType: "bun" };
/** the War Department officer: grey-green coat, glasses, thinning hair */
export const OFFICER: Outfit = { jacket: "#7a7a62", pants: "#5a5a4c", boots: "#2a2420", hat: "hair", hairStyle: "crop", hair: "#6a6058",
  collar: "tunic", tie: "#4a4a3a", buttons: "#c9b47e", glasses: true, headType: "bean", build: "stout" };

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
  | "pained" | "smile" | "smile_closed" | "lick" | "annoyed" | "proud" | "speak" | "awe" | "yell" | "blank" | "jawdrop";
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick" | "drop";
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
  yell: { eye: ["small", "small"], brow: [7, -3], mouth: "laugh" },
  blank: { eye: ["small", "small"], brow: [0, 0], mouth: "dash" },
  jawdrop: { eye: ["shock", "shock"], brow: [-8, -7], mouth: "drop" },
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
    case "drop": p.ell(mx, my + 9 * u, 8.5 * u * k, 17 * u, MOUTH, 3.2 * u); p.ell(mx + u, my + 18 * u, 4.5 * u * k, 5 * u, TONGUE, 0); break;
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false, gaze = 0, glasses = false, holder = false, soot = false) => {
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
  if (holder) { // long cigarette holder jutting up from the mouth corner (no smoke)
    const fs = facing || 1, a0: P2 = [mx + 9 * u * fs, my + 1 * u], a1: P2 = [mx + 36 * u * fs, my - 13 * u], a2: P2 = [mx + 48 * u * fs, my - 19 * u];
    p.band([a0, a1], "#1e1a1e", 2.6 * u, 1 * u, "round"); p.band([a1, a2], "#f6f2ea", 3.2 * u, 1 * u, "butt");
    p.dot(a2[0], a2[1], 1.8 * u, "#9a9a9a");
  }
  if (soot) { const g = p.g; g.save(); g.globalAlpha = 0.45; for (const [dx, dy, r] of [[-26, 8, 9], [24, 14, 7], [-6, -30, 8], [30, -14, 6]]) p.ell(cx + dx * u, cy + dy * u, r * u, r * 0.7 * u, "#3a3436", 0); g.restore(); }
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
export type HairStyle = "bowl" | "side" | "spiky" | "bunTop" | "crop" | "wild";
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
  // wild professor hair: big jagged tufts all round the back and sides, a bald-ish crown
  wild: (ct) => [[-0.2, ct - 0.02], [0.25, ct - 0.34, 1], [0.45, ct - 0.02], [0.85, ct - 0.3, 1], [0.9, ct * 0.62], [1.38, -0.62, 1], [1.08, -0.4],
    [1.36, -0.08, 1], [1.02, -0.16], [0.92, -0.48, 1], [0.6, -0.6], [0.0, -0.66], [-0.6, -0.42], [-0.74, 0.12, 1], [-1.02, -0.02], [-1.42, 0.24, 1],
    [-1.18, -0.3], [-1.5, -0.56, 1], [-1.1, -0.66], [-1.34, ct * 0.92, 1], [-0.86, ct * 0.86], [-0.74, ct - 0.34, 1]],
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
  const style: HairStyle | null = o.hat === "hair" ? o.hairStyle ?? "bowl"
    : o.hat === "fedora" || o.hat === "garrison" || o.hat === "peaked" || o.hat === "cap" ? (o.hair ? "crop" : null) : null;
  if (!style) return;
  const col = o.hair ?? "#3a2a20", pts = huShape(hd, HAIR[style](ct0(hd)), 3);
  filled(p, pts, col, light, hd.a, ow * 0.9, thick);
  // two ink strands that follow the comb direction
  const u = hd.W / 100, ct = ct0(hd);
  if (style === "wild") for (const [x0, y0, x1, y1] of [[0.9, -0.5, 1.2, -0.56], [-1.0, -0.3, -1.34, -0.5], [-0.9, 0.0, -1.3, 0.16]]) p.stroke(curve(hu(hd, x0, y0), hu(hd, (x0 + x1) / 2, (y0 + y1) / 2 - 0.04), hu(hd, x1, y1)), 1.6 * u, mul(col, [0.66, 0.66, 0.72]));
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
  } else if (o.hat === "fedora") {
    // fedora: pinched crown with a centre dent, dark band, a brim snapped down at the front
    const c = o.cap ?? "#7a6450", tilt = rad(5);
    const crown = hatShape(hd, [[-0.86, ct + 0.44, 1], [-0.92, ct + 0.0], [-0.7, ct - 0.48], [-0.2, ct - 0.58], [0.0, ct - 0.44, 1], [0.22, ct - 0.6], [0.7, ct - 0.5], [0.94, ct + 0.0], [0.88, ct + 0.44, 1]], tilt, 2);
    p.shadedFill(crown, c, mul(c, SH_FELT), light, hd.a, 0.35);
    p.clip(crown, () => p.band([hu(hd, -1.3, ct + 0.31), hu(hd, 1.3, ct + 0.29)], o.band ?? "#3a2c26", 0.2 * hd.a, 0));
    p.inkRing(crown, ow, thick, 0.35);
    p.stroke([hu(hd, -0.12, ct - 0.5), hu(hd, 0.02, ct - 0.3)], 1.6 * u, mul(c, [0.6, 0.6, 0.66]));
    const brim = hatShape(hd, [[-1.5, ct + 0.48], [-1.2, ct + 0.36], [0, ct + 0.36], [1.3, ct + 0.4], [1.62, ct + 0.6], [1.3, ct + 0.66], [0, ct + 0.56], [-1.2, ct + 0.6]], tilt, 2);
    filled(p, brim, mul(c, [0.92, 0.92, 0.95]), light, 1.2 * hd.a, ow, thick);
  } else if (o.hat === "garrison") {
    // garrison (side) cap: a soft folded boat shape perched on the crown, tilted toward the facing side
    const c = o.cap ?? "#8c7a4a", tilt = rad(-9);
    const body = hatShape(hd, [[-0.9, ct + 0.3, 1], [-0.84, ct - 0.08], [-0.5, ct - 0.34], [0.2, ct - 0.42], [0.86, ct - 0.2, 1], [0.96, ct + 0.3, 1], [0, ct + 0.36]], tilt, 2);
    filled(p, body, c, light, hd.a, ow, thick);
    p.stroke([hu(hd, -0.8, ct + 0.06), hu(hd, 0.0, ct - 0.02), hu(hd, 0.88, ct + 0.08)], 1.6 * u, mul(c, [0.62, 0.62, 0.68]));
    const [bx, by] = hu(hd, 0.5, ct + 0.12); p.ell(bx, by, 5 * u, 5 * u, "#e2c45a", 1.6 * u);
  } else if (o.hat === "peaked") {
    // officer's peaked service cap: flared crown, coloured band, leather peak on the facing side, gold badge
    const c = o.cap ?? "#8a7f52", yb = ct + 0.5, tilt = rad(6);
    const body = hatShape(hd, [[-1.02, yb, 1], [-1.16, yb - 0.56], [-1.04, yb - 0.7], [0, yb - 0.74], [1.1, yb - 0.8], [1.24, yb - 0.68], [1.08, yb, 1], [0, yb + 0.06]], tilt, 2);
    p.shadedFill(body, c, mul(c, SH_FELT), light, hd.a, 0.35);
    p.clip(body, () => p.band([hu(hd, -1.4, yb - 0.12), hu(hd, 1.4, yb - 0.12)], o.band ?? "#1d2230", 0.24 * hd.a, 0));
    p.inkRing(body, ow, thick, 0.35);
    const [bx, by] = hu(hd, 0.42, yb - 0.44);
    p.ell(bx, by, 7 * u, 7 * u, "#e8c45a", 2 * u, 0, 360, deg);
    const pk = hatShape(hd, [[0.0, yb - 0.02, 1], [1.32, yb - 0.04, 1], [1.26, yb + 0.14], [0.6, yb + 0.22], [0.05, yb + 0.1]], tilt, 2);
    p.poly(pk, o.peak ?? "#16171b", 2.5 * u);
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
export type Prop = null | "icecream" | "shako" | ["hammer", number] | ["stamp", number] | "stick" | "pen" | "tweezers" | "cloth" | "bucket" | "bucketTip" | "folder" | "bomber";

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.7 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.86 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.66 },
  slim: { a: 112, torso: 1.15, legs: 1.45, tw: 0.62 },
};

/** arm poses (motion.md 3.3); "wave" uses the wave amount, "point" adds an index finger */
export type ArmPose = "hang" | "wave" | "point" | "hip" | "up" | "out" | "shrug" | "hold" | "ears" | "crank" | "salute";
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
  /** hat lifted off the head (head units) / knocked askew (rad) */
  hatLift?: number; hatTilt?: number;
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
  if (o.collar === "tunic") {
    // stand-and-fall collar, two pleated chest pockets with button flaps
    for (const sd of [-1, 1]) p.poly([[tcx, chin + 0.02 * HH], [tcx + sd * 0.4 * Ta, chin - 0.12 * HH], [tcx + sd * 0.46 * Ta, chin + 0.12 * HH]], mul(o.jacket, [1.06, 1.05, 1.02]), 1.3 * u);
    if (o.tie) p.poly([[tcx - 3.5 * u, chin + 0.02 * HH], [tcx + 3.5 * u, chin + 0.02 * HH], [tcx + 5 * u, chin + 0.3 * HH], [tcx - 5 * u, chin + 0.3 * HH]], o.tie, 1.3 * u);
    for (const sd of [-1, 1]) {
      const px = tcx + sd * 0.44 * Ta, py = chin + 0.3 * HH;
      p.poly(rrect(px - 0.22 * Ta, py, px + 0.22 * Ta, py + 0.24 * HH, 2 * u), null, 1.2 * u);
      p.poly([[px - 0.24 * Ta, py - 0.01 * HH], [px + 0.24 * Ta, py - 0.01 * HH], [px + 0.2 * Ta, py + 0.08 * HH], [px - 0.2 * Ta, py + 0.08 * HH]], mul(o.jacket, [0.9, 0.9, 0.94]), 1.2 * u);
      p.dot(px, py + 0.05 * HH, 2.4 * u, o.buttons && o.buttons !== "none" ? o.buttons : INK);
    }
  } else if (o.collar === "open") {
    // tunic worn open: a cream shirt panel down the middle with the braces over it, lapels folded back
    const sh = "#efe4c8";
    p.poly([[tcx - 0.42 * Ta, chin - 0.14 * HH], [tcx + 0.42 * Ta, chin - 0.14 * HH], [tcx + 0.3 * Ta, torsoBot], [tcx - 0.3 * Ta, torsoBot]], sh, 1.3 * u);
    for (const sd of [-1, 1]) p.poly([[tcx, chin + 0.02 * HH], [tcx + sd * 0.3 * Ta, chin - 0.12 * HH], [tcx + sd * 0.34 * Ta, chin + 0.1 * HH]], "#fbf6e8", 1.2 * u);
    if (o.braces) for (const sd of [-1, 1]) p.band([[tcx + sd * 0.2 * Ta, chin - 0.1 * HH], [tcx + sd * 0.17 * Ta, torsoBot]], o.braces, 4.5 * u, 1.1 * u);
    for (const sd of [-1, 1]) p.poly([[tcx + sd * 0.42 * Ta, chin - 0.14 * HH], [tcx + sd * 0.28 * Ta, chin + 0.42 * HH], [tcx + sd * 0.52 * Ta, chin + 0.22 * HH]], mul(o.jacket, [0.86, 0.86, 0.9]), 1.3 * u);
  } else if (o.collar === "shirt") {
    for (const s of [-1, 1]) p.poly([[tcx, chin + 0.04 * HH], [tcx + s * 0.34 * Ta, chin - 0.1 * HH], [tcx + s * 0.3 * Ta, chin + 0.1 * HH]], "#fbf8f0", 1.3 * u);
    if (o.tie) p.poly([[tcx - 3.5 * u, chin + 0.04 * HH], [tcx + 3.5 * u, chin + 0.04 * HH], [tcx + 5.5 * u, chin + 0.42 * HH], [tcx, chin + 0.5 * HH], [tcx - 5.5 * u, chin + 0.42 * HH]], o.tie, 1.3 * u);
  }
  if (o.samBrowne) { // Sam Browne: waist belt with a brass buckle + the cross strap over the right shoulder
    p.band([[tcx - 1.3 * Ta, torsoBot - 0.36 * HH], [tcx + 1.3 * Ta, torsoBot - 0.36 * HH]], o.samBrowne, 0.1 * HH, 1.5 * u);
    p.band([[tcx + 0.75 * Ta, chin - 0.12 * HH], [tcx - 0.62 * Ta, torsoBot - 0.36 * HH]], o.samBrowne, 5.5 * u, 1.4 * u);
    p.poly(rrect(tcx - 7 * u, torsoBot - 0.36 * HH - 6 * u, tcx + 7 * u, torsoBot - 0.36 * HH + 6 * u, 2 * u), "#e2c45a", 1.4 * u);
  }
  if (o.tweed) for (let k = 0; k < 70; k++) { const x = tcx + (rnd(k, 41) * 2.6 - 1.3) * Ta, y = chin + rnd(k, 42) * (torsoBot - chin); p.dot(x, y, 1.1 * u, k % 2 ? "rgba(70,45,25,0.45)" : "rgba(235,215,175,0.4)"); }
  if (o.coat) { // lab coat: long lapels + a breast pocket with pens
    for (const sd of [-1, 1]) p.stroke([[tcx + sd * 0.3 * Ta, chin - 0.1 * HH], [tcx + sd * 0.08 * Ta, torsoBot - 0.1 * HH]], 1.6 * u, "#b9b8b2");
    const px = tcx - 0.62 * Ta, py = chin + 0.32 * HH;
    p.poly(rrect(px - 0.24 * Ta, py, px + 0.24 * Ta, py + 0.2 * HH, 2 * u), null, 1.2 * u);
    p.band([[px - 0.08 * Ta, py + 0.04 * HH], [px - 0.08 * Ta, py - 0.1 * HH]], "#3a6ea8", 2.2 * u, 0.8 * u, "round");
    p.band([[px + 0.08 * Ta, py + 0.04 * HH], [px + 0.08 * Ta, py - 0.08 * HH]], "#c0353a", 2.2 * u, 0.8 * u, "round");
  }
  if (o.bowtie) { // bow tie at the collar
    const by = chin + 0.03 * HH, bx = tcx;
    for (const sd of [-1, 1]) p.poly([[bx, by], [bx + sd * 15 * u, by - 7 * u], [bx + sd * 15 * u, by + 7 * u]], o.bowtie, 1.4 * u);
    p.ell(bx, by, 3.6 * u, 3.6 * u, mul(o.bowtie, [0.8, 0.8, 0.8]), 1.3 * u);
  }
  if (o.medals) for (let k = 0; k < 3; k++) { // ribbon bar + three hanging medals on the left chest
    const x = tcx - 0.7 * Ta + k * 10 * u, y = chin + 0.22 * HH;
    p.poly(rrect(x - 4.5 * u, y - 3 * u, x + 4.5 * u, y + 3 * u, 1 * u), ["#c0353a", "#3a6ea8", "#e2c45a"][k], 1 * u);
    p.stroke([[x, y + 3 * u], [x, y + 9 * u]], 2.4 * u, ["#c0353a", "#3a6ea8", "#2f7a4a"][k]);
    p.ell(x, y + 12.5 * u, 4 * u, 4 * u, "#e8c45a", 1.3 * u);
  }
  if (o.camera) { // box camera on a neck strap
    p.stroke([[tcx - 0.42 * Ta, chin - 0.06 * HH], [tcx - 0.1 * Ta, chin + 0.42 * HH]], 2 * u, "#3a2a22");
    p.stroke([[tcx + 0.42 * Ta, chin - 0.06 * HH], [tcx + 0.1 * Ta, chin + 0.42 * HH]], 2 * u, "#3a2a22");
    const cy = chin + 0.5 * HH;
    p.poly(rrect(tcx - 18 * u, cy - 11 * u, tcx + 18 * u, cy + 11 * u, 3 * u), "#2e2c30", 1.6 * u);
    p.ell(tcx + 2 * u, cy + 1 * u, 7.5 * u, 7.5 * u, "#8a929a", 1.4 * u); p.ell(tcx + 2 * u, cy + 1 * u, 3.6 * u, 3.6 * u, "#1a1a1e", 0);
    p.poly(rrect(tcx - 15 * u, cy - 15 * u, tcx - 7 * u, cy - 11 * u, 1 * u), "#c9ccd2", 1 * u);
  }
  if (o.stripes) for (let k = 0; k < 3; k++) { // sergeant's chevrons high on the facing-side sleeve
    const y = chin + (0.2 + 0.09 * k) * HH, x = tcx + 0.82 * Ta;
    p.stroke([[x - 9 * u, y - 5 * u], [x, y + 2 * u], [x + 9 * u, y - 5 * u]], 3.6 * u, INK); p.stroke([[x - 9 * u, y - 5 * u], [x, y + 2 * u], [x + 9 * u, y - 5 * u]], 2 * u, o.stripes);
  }
};

/** hat offset for the drawing in progress (bodyFront sets it from FrontOpts hatLift / hatTilt) */
const HAT = { lift: 0, tilt: 0 };
/** skull + hair + hat + face: shared by the front and side views (p.rot already set for the head) */
const drawHead = (p: Pen, o: Outfit, hd: Head, light: number, thick: number, seed: number, side: boolean, face: () => void) => {
  const ow = 5 * (hd.W / 100);
  hatBehind(p, o, hd, light, thick, ow, side);
  const skin = o.skin ?? SKIN;
  // flat bright plateau over ~75 % of the width, narrow crescent on the far edge (charshade.md 3.1)
  p.shadedFill(hd.pts, skin, mul(skin, SH_WHITE), light, hd.a, 0.3, 1.1, 1.3);
  p.inkRing(hd.pts, ow, thick);
  hairOn(p, o, hd, light, thick, ow);
  if (o.goggles) { // goggles pushed up on the forehead: elastic band + two round tinted lenses
    const ct = ct0(hd);
    p.band([hu(hd, -1.02, ct + 0.5), hu(hd, 1.02, ct + 0.48)], "#3a3a42", 0.09 * hd.a, 1.2 * (hd.W / 100), "round");
    for (const sx of [-0.34, 0.34]) { const [gx, gy] = hu(hd, sx + 0.06, ct + 0.46); p.ell(gx, gy, 0.25 * hd.a, 0.22 * hd.a, "#7a8088", ow * 0.8); p.ell(gx, gy, 0.17 * hd.a, 0.15 * hd.a, "#9fd6e4", ow * 0.4); p.ell(gx - 0.06 * hd.a, gy - 0.05 * hd.a, 0.05 * hd.a, 0.04 * hd.a, "rgba(255,255,255,0.8)", 0); }
  }
  if (HAT.lift || HAT.tilt) { // hat knocked askew / lifting off in surprise: rotate + raise about the crown
    const [px, py] = p.P(hd.cx, hd.crown), g = p.g;
    g.save(); g.translate(px, py - HAT.lift * hd.a); g.rotate(HAT.tilt); g.translate(-px, -py);
    hatOn(p, o, hd, light, thick, seed, side);
    g.restore();
  } else hatOn(p, o, hd, light, thick, seed, side);
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
      case "crank": { const a = two * wv; return [S, X(0.5, 0.18), X(0.62 + 0.09 * Math.cos(a), 0.0 + 0.09 * Math.sin(a))]; }
      case "salute": return [S, X(0.62, -0.04), X(0.3, -0.55)];
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
    if (sp) { const a = spec(sp, side); if (side > 0 && (prop === "pen" || prop === "stick")) a.front = true; arms.push(a); }
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
      if (prop) a.front = true;
      arms.push(a);
    } else if (prop === "tweezers") { // held up in front of the face
      arms.push({ pts: [S1, [tcx + 1.15 * T.a + 12 * u, S1[1] + 0.16 * HH], [tcx + 1.05 * T.a + 26 * u, S1[1] - 0.3 * HH]], front: true });
    } else if (prop === "bomber") { // a stick held up high: the toy bomber flies at its top
      arms.push({ pts: [S1, [tcx + 1.2 * T.a + 18 * u, S1[1] - 0.06 * HH], [tcx + 1.2 * T.a + 30 * u, S1[1] - 0.46 * HH]], front: true });
    } else if (prop === "cloth") { // polishing circles at hip height
      const a = two * (wave ?? 0);
      arms.push({ pts: [S1, [tcx + 1.2 * T.a + 12 * u, S1[1] + 0.32 * HH], [tcx + 1.3 * T.a + 30 * u + 12 * u * Math.cos(a), S1[1] + 0.46 * HH + 9 * u * Math.sin(a)]], front: true });
    } else if (prop === "bucket") { // hanging from the hand
      arms.push({ pts: [S1, [tcx + 1.12 * T.a + 6 * u, S1[1] + 0.46 * HH], [tcx + 1.18 * T.a + 10 * u, chin + 1.0 * HH]], front: true });
    } else if (prop === "bucketTip") { // swung forward and tipped (nothing comes out)
      arms.push({ pts: [S1, [tcx + 1.25 * T.a + 20 * u, S1[1] + 0.12 * HH], [tcx + 1.3 * T.a + 46 * u, S1[1] - 0.08 * HH]], front: true });
    } else if (prop === "folder") { // a thick folder held out flat, as if weighing it
      arms.push({ pts: [S1, [tcx + 1.12 * T.a + 10 * u, S1[1] + 0.34 * HH], [tcx + 1.2 * T.a + 34 * u, S1[1] + 0.14 * HH]], front: true });
    } else if (prop === "pen") {
      arms.push({ pts: [S1, [tcx + 1.12 * T.a + 8 * u, S1[1] + 0.42 * HH], [tcx + 0.55 * T.a, S1[1] + 0.48 * HH]], front: true });
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
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        const bx = tcx + 0.14 * T.a * f;
        p.dot(bx, y, 2.2 * u + 0.8 * u, INK); p.dot(bx, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) { const s = f; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
  }
  // in front of the body: hands holding props
  for (const a of arms) if (a.front) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "tweezers") { // steel tweezers pinching a tiny capsule bomb with a clock face
      const tip: P2 = [hx + 30 * u * f, hy - 30 * u];
      p.band([[hx, hy], tip], "#c9ccd2", 2.4 * u, 1 * u, "round");
      p.band([[hx + 3 * u * f, hy + 2 * u], [tip[0] + 2 * u * f, tip[1] + 3 * u]], "#aeb2b8", 2 * u, 1 * u, "round");
      capsule(p, tip[0] + 6 * u * f, tip[1] - 2 * u, 0.42 * u, -20 * f);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "bomber") { // stick straight up, a toy olive bomber with twin props at the top
      const top: P2 = [hx + 4 * u * f, hy - 120 * u];
      p.band([[hx, hy + 14 * u], top], "#a8784a", 3.2 * u, 1.2 * u, "round");
      toyBomber(p, top[0], top[1] - 6 * u, 1.05 * u, f);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "cloth") { // a crumpled yellow polishing cloth
      p.poly(scallop(hx + 6 * u * f, hy + 4 * u, 14 * u, 9 * u, 7, 0.18, 0.3), "#f0d46a", 1.8 * u);
      p.stroke([[hx - 4 * u, hy + 2 * u], [hx + 10 * u, hy + 6 * u]], 1.2 * u, "#b89a3a");
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "bucket" || prop === "bucketTip") { // galvanised bucket on a wire bail
      const tipped = prop === "bucketTip", g2 = p.g, [cx2, cy2] = p.P(hx, hy);
      g2.save(); g2.translate(cx2, cy2); g2.rotate(tipped ? 1.5 * f : 0); g2.translate(-cx2, -cy2);
      p.arc(hx, hy + 16 * u, 17 * u, 14 * u, 180, 360, 1.8 * u);
      p.poly([[hx - 17 * u, hy + 16 * u], [hx + 17 * u, hy + 16 * u], [hx + 13 * u, hy + 50 * u], [hx - 13 * u, hy + 50 * u]], "#b8bec4", 2 * u);
      p.ell(hx, hy + 16 * u, 17 * u, 5 * u, tipped ? "#5a6066" : "#7ab8e0", 1.8 * u);
      for (const y of [26, 40]) p.stroke([[hx - 15.5 * u + (y - 16) * 0.12 * u, hy + y * u], [hx + 15.5 * u - (y - 16) * 0.12 * u, hy + y * u]], 1.2 * u, "#8a9096");
      g2.restore();
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "folder") { // a fat manila folder bulging with paper
      p.poly(rrect(hx - 4 * u, hy - 26 * u, hx + 52 * u * f, hy + 2 * u, 3 * u).map(([x, y]) => [f < 0 ? 2 * hx - (x - hx) - 48 * u : x, y] as P2), "#e8c47a", 2 * u);
      for (let k = 0; k < 4; k++) p.stroke([[hx, hy - 20 * u + k * 5 * u], [hx + 46 * u * f, hy - 20 * u + k * 5 * u]], 1.2 * u, "#f8f2e2");
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "stick") { // swagger stick along the forearm, a brass tip
      const [E] = [a.pts[1]], dx = hx - E[0], dy = hy - E[1], l = Math.hypot(dx, dy) || 1;
      const t0: P2 = [hx - (dx / l) * 18 * u, hy - (dy / l) * 18 * u], t1: P2 = [hx + (dx / l) * 52 * u, hy + (dy / l) * 52 * u];
      p.band([t0, t1], "#5a3420", 3.2 * u, 1.2 * u, "round"); p.dot(t1[0], t1[1], 3.2 * u, "#e2c45a");
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "pen") { // dip pen with a quill flourish
      p.band([[hx - 4 * u, hy + 6 * u], [hx + 14 * u, hy - 26 * u]], "#3a2a22", 2.4 * u, 1 * u, "round");
      p.poly([[hx + 10 * u, hy - 18 * u], [hx + 30 * u, hy - 52 * u], [hx + 22 * u, hy - 20 * u]], "#f4efe2", 1.4 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "handset") { // black earpiece on a cord
      p.stroke(curve([hx, hy + 10 * u], [hx + 30 * u, hy + 60 * u], [hx + 60 * u, hy + 40 * u]), 2.4 * u, "#2a2224");
      p.poly(rrect(hx - 7 * u, hy - 4 * u, hx + 7 * u, hy + 18 * u, 4 * u), "#2a2224", 1.6 * u);
      p.ell(hx, hy - 6 * u, 11 * u, 6 * u, "#2a2224", 1.6 * u);
      p.dot(hx + 3 * u, hy + 8 * u, 5.5 * u);
    } else if (prop === "lewis") { // the Lewis gun at the hip: fat shroud, drum on top, wooden stock
      const dir = f, by = hy - 2 * u;
      p.poly(rrect(Math.min(hx - 50 * u * dir, hx + 70 * u * dir), by - 9 * u, Math.max(hx - 50 * u * dir, hx + 70 * u * dir), by + 9 * u, 6 * u), "#3d4246", 2.4 * u);
      p.poly(rrect(Math.min(hx + 62 * u * dir, hx + 96 * u * dir), by - 3 * u, Math.max(hx + 62 * u * dir, hx + 96 * u * dir), by + 3 * u, 2 * u), "#2a2e31", 1.6 * u);
      p.poly([[hx - 48 * u * dir, by - 6 * u], [hx - 92 * u * dir, by + 4 * u], [hx - 92 * u * dir, by + 18 * u], [hx - 46 * u * dir, by + 8 * u]], "#8a5a34", 2 * u);
      p.ell(hx + 4 * u * dir, by - 14 * u, 26 * u, 7 * u, "#4a5056", 2.2 * u);
      for (const t of [-0.6, -0.2, 0.2, 0.6]) p.stroke([[hx + 4 * u * dir + t * 26 * u, by - 20 * u], [hx + 4 * u * dir + t * 26 * u, by - 8 * u]], 1.4 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop) && prop[0] === "stamp") { // rubber stamp: round wooden knob in the fist, red pad below
      p.ell(hx, hy - 6 * u, 9 * u, 8 * u, "#8a5a34", 1.8 * u);
      p.band([[hx, hy], [hx, hy + 22 * u]], "#a8784a", 6 * u, 1.4 * u, "round");
      p.poly(rrect(hx - 20 * u, hy + 20 * u, hx + 20 * u, hy + 34 * u, 3 * u), "#7a4a2a", 1.8 * u);
      p.poly(rrect(hx - 19 * u, hy + 33 * u, hx + 19 * u, hy + 39 * u, 2 * u), "#d42f2f", 1.4 * u);
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
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  const brim = o.hat === "peaked" || o.hat === "shako" || o.hat === "shako_tall" || o.hat === "fedora";
  HAT.lift = opts.hatLift ?? 0; HAT.tilt = opts.hatTilt ?? 0;
  drawHead(p, o, hd, light, thick, seed, false, () => {
    faceFront(p, hd.cx, hd.wy, W, expr, f, look, lid, brim, skin, o.moustache, o.build === "stout", opts.gaze ?? 0, !!o.glasses, !!o.holder, !!o.soot);
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
  const brim = o.hat === "peaked" || o.hat === "shako" || o.hat === "shako_tall" || o.hat === "fedora";
  HAT.lift = 0; HAT.tilt = 0;
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


// ---------------- smoke ----------------
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


/** small local generator (toon.ts has no rng): deterministic stream per seed */
const rng2 = (seed: number) => { let s = Math.abs(Math.round(seed * 9301 + 49297)) % 233280 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

// ---------------- dust effects ----------------
/** dust kick-up on a 400 x 400 canvas, t 0..1 (bullet strike / feet / tyres): a burst of clods + a soft brown puff */
export const fxDust = (p: Pen, t: number, seed = 0, col = "#d9a273") => {
  const g = p.g, r = rng2(seed + 11);
  g.save(); g.globalAlpha = Math.max(0, 1 - t * t);
  const R = 70 + 110 * Math.sqrt(t);
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.2, d = R * (0.3 + 0.5 * r()); p.ell(200 + Math.cos(a) * d, 320 + Math.sin(a) * d * 0.9 - 40 * t, R * (0.32 + 0.2 * r()), R * (0.28 + 0.15 * r()), col, 5); }
  p.ell(200, 330 - 30 * t, R * 0.55, R * 0.4, mix(col, "#ffffff", 0.25), 5);
  for (let i = 0; i < 5 && t < 0.6; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2, d = 150 * t + 40; p.dot(200 + Math.cos(a) * d, 320 + Math.sin(a) * d, 9, "#7a4a2a"); }
  g.restore();
};
/** cartoon dust cloud on a 400 x 400 canvas, t 0..1: overlapping lobes, light crowns, darker belly, plum ink; fades out */
export const fxDustCloud = (p: Pen, t: number, seed = 0, col = "#dca27a") => {
  const g = p.g, r = rng2(seed * 13 + 5);
  g.save(); g.globalAlpha = t < 0.65 ? 1 : Math.max(0, 1 - (t - 0.65) / 0.35);
  const R = 60 + 70 * Math.sqrt(t), n = 6, lobes: [number, number, number][] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r(), d = R * (0.45 + 0.25 * r()); lobes.push([200 + Math.cos(a) * d * 1.25, 230 + Math.sin(a) * d * 0.7 - 30 * t, R * (0.45 + 0.25 * r())]); }
  lobes.push([200, 220 - 30 * t, R * 0.75]);
  for (const [x, y, rr] of lobes) p.ell(x, y, rr, rr * 0.9, null, 9);
  for (const [x, y, rr] of lobes) p.ell(x, y, rr, rr * 0.9, mul(col, [0.86, 0.84, 0.86]), 0);
  for (const [x, y, rr] of lobes) p.ell(x - rr * 0.12, y - rr * 0.16, rr * 0.8, rr * 0.7, col, 0);
  for (const [x, y, rr] of lobes) p.ell(x - rr * 0.25, y - rr * 0.32, rr * 0.4, rr * 0.3, mix(col, "#ffffff", 0.3), 0);
  g.restore();
};

// =================================================================================================================
// BATS (the stars). Our own design: a Mexican free-tailed bat as a round fuzzy kid: big head, tall ears with a warm
// inner ear, a pale muzzle with a pug nose and two tiny fangs, big white eyes (read at phone size), a small fuzzy body,
// leathery plum-brown wings on ink finger bones, and the TINY olive capsule bomb with a clock face strapped to the belly.
// Square 600 x 600 design card, centre (300, 300). Poses: fly (flap phase), cheer, sit, flex, thumbs, wrap (wings round
// the body), hang (= wrap upside down), sleep (wrap lying on its side).
// =================================================================================================================
export type BatPose = "fly" | "cheer" | "sit" | "flex" | "thumbs" | "wrap" | "hang" | "sleep";
export type BatExpr = "open" | "grin" | "smug" | "wink" | "meh" | "wide" | "pop" | "happy" | "shut" | "sniff";
export type BatOpts = {
  pose: BatPose; phase?: number; expr?: BatExpr; look?: number; gaze?: number; bomb?: 0 | 1 | 2; tint?: number; medal?: boolean;
  tilt?: number; blink?: number; light?: number; lod?: number; spin?: number;
};
const BAT_FUR = ["#7d6a60", "#74625c", "#86705f"], BAT_BELLY = "#ad978a", BAT_WING = "#563f4a", BAT_WING_L = "#715663", BAT_EAR = "#c98f84";
const BAT_MUZ = "#c9b09e";

/** tiny capsule bomb: olive cylinder with dark end caps, a white clock face, a red pilot light (k = scale) */
export const capsule = (p: Pen, cx: number, cy: number, k: number, rot = 0, glow = false) => {
  const g = p.g, [px, py] = p.P(cx, cy);
  g.save(); g.translate(px, py); g.rotate(rad(rot)); g.translate(-px, -py);
  const L = 26 * k, R = 11 * k;
  p.poly(rrect(cx - L, cy - R, cx + L, cy + R, R * 0.9), "#6e7d3c", 4 * k);
  p.poly(rrect(cx - L, cy - R, cx - L + 9 * k, cy + R, R * 0.8), "#4a5428", 0);
  p.poly(rrect(cx + L - 9 * k, cy - R, cx + L, cy + R, R * 0.8), "#4a5428", 0);
  p.poly(rrect(cx - L, cy - R, cx + L, cy + R, R * 0.9), null, 4 * k);
  p.stroke([[cx - L + 5 * k, cy - R * 0.45], [cx + L - 5 * k, cy - R * 0.45]], 2.2 * k, "rgba(255,255,230,0.35)");
  p.ell(cx - 4 * k, cy, 8.5 * k, 8.5 * k, "#f8f4e6", 2.6 * k);
  p.stroke([[cx - 4 * k, cy], [cx - 4 * k, cy - 6 * k]], 1.8 * k); p.stroke([[cx - 4 * k, cy], [cx + 0.5 * k, cy + 2 * k]], 1.8 * k);
  p.ell(cx + 14 * k, cy - 1 * k, 4 * k, 4 * k, glow ? "#ffe08a" : "#e8452e", 2 * k);
  g.restore();
};
/** toy bomber in side view (wooden model, olive paint, twin props as blurred discs) facing f */
export const toyBomber = (p: Pen, cx: number, cy: number, k: number, f = 1) => {
  const X = (x: number) => cx + x * k * f, Y = (y: number) => cy + y * k;
  p.poly([[X(-62), Y(-4)], [X(-78), Y(-30)], [X(-66), Y(-30)], [X(-44), Y(-6)]], "#5f6e36", 3 * k);           // tail fin
  p.poly(rrect(Math.min(X(-70), X(56)), Y(-11), Math.max(X(-70), X(56)), Y(11), 10 * k), "#6e7d3c", 3.4 * k);  // fuselage
  p.ell(X(46), Y(-4), 12 * k, 7 * k, "#a8d4e8", 2.4 * k);                                                     // nose glazing
  p.poly([[X(-14), Y(2)], [X(22), Y(2)], [X(10), Y(14)], [X(-20), Y(14)]], "#5a6832", 3 * k);                 // wing (edge on)
  for (const x of [-4, 18]) { p.ell(X(x), Y(8), 9 * k, 6 * k, "#4a5428", 2.4 * k); p.ell(X(x + 12), Y(8), 2.5 * k, 16 * k, "rgba(220,220,210,0.7)", 1.6 * k); }
  p.ell(X(-30), Y(0), 7 * k, 7 * k, "#f4f1ea", 2 * k); p.dot(X(-30), Y(0), 3 * k, "#3a6ea8");                // roundel
};

/** one bat on the 600 x 600 card */
export const batDraw = (p: Pen, o: BatOpts) => {
  const { pose, phase = 0, look = 0, gaze = 0, bomb = 0, tint = 0, medal = false, tilt = 0, blink = 0, light = DEF_LIGHT, lod = 1, spin = 0 } = o;
  let expr: BatExpr = o.expr ?? "open";
  const g = p.g, two = Math.PI * 2, thick = thickAngle(light), OW = 8.5, n = lod > 0.5 ? 96 : 40;
  const fur = BAT_FUR[tint % 3], furD = mul(fur, [0.72, 0.7, 0.78]);
  const rotA = (pose === "hang" ? 180 : pose === "sleep" ? 90 : 0) + spin;
  g.save();
  if (rotA) { g.translate(300, 300); g.rotate(rad(rotA)); g.translate(-300, -300); }
  const flying = pose === "fly" || pose === "cheer", wrapped = pose === "wrap" || pose === "hang" || pose === "sleep";
  const hx = 300, hy = flying ? 250 : 236, bx = 300, by = flying ? 352 : 356;
  // ---- wings behind the body ----
  const wingSpread = (s: number) => {
    const flap = pose === "cheer" ? 1.25 + 0.12 * Math.sin(two * phase) : Math.cos(two * phase);
    const S: P2 = [300 + s * 46, 322], th = rad(18 + 48 * flap), W: P2 = [S[0] + s * 118 * Math.cos(th * 0.8), S[1] - 118 * Math.sin(th * 0.8) - 6];
    const tip = (a: number, l: number): P2 => [W[0] + s * l * Math.cos(a), W[1] - l * Math.sin(a)];
    const F1 = tip(th + rad(12), 170), F2 = tip(th - rad(26), 150), F3 = tip(th - rad(70), 120), B: P2 = [300 + s * 38, 408];
    const sc = (a: P2, b: P2): P2[] => curve(a, lerp2(lerp2(a, b, 0.5), W, 0.2), b, 8);
    const mem: P2[] = [S, ...curve(S, lerp2(S, W, 0.5), W, 6).slice(1), ...curve(W, lerp2(W, F1, 0.5), F1, 6).slice(1), ...sc(F1, F2).slice(1), ...sc(F2, F3).slice(1),
      ...curve(F3, lerp2(lerp2(F3, B, 0.5), [300 + s * 120, 330] as P2, 0.35), B, 10).slice(1)];
    const pts = s > 0 ? mem : mem.slice().reverse();
    p.gradFill(pts, BAT_WING_L, BAT_WING, rad(-90), 0.15);
    p.inkRing(pts, OW, thick, 0.4);
    p.stroke([S, W], 9, INK);
    for (const F of [F1, F2, F3]) p.stroke([W, F], 4.5, INK);
    p.poly([[W[0], W[1] - 2], [W[0] + s * 4, W[1] - 22], [W[0] + s * 16, W[1] - 16]], "#e8dccc", 3.5); // thumb claw
  };
  const wingFold = (s: number, up = false) => {
    // folded wing like a little cape-arm down the side; `up` = raised in a flex (bicep bulge)
    if (up) {
      const S: P2 = [300 + s * 52, 330], E: P2 = [300 + s * 132, 318], Wr: P2 = [300 + s * 120, 228];
      const mem: P2[] = [S, E, Wr, [300 + s * 96, 252], [300 + s * 70, 300]];
      p.poly(s > 0 ? mem : mem.slice().reverse(), BAT_WING, OW * 0.8);
      p.stroke([S, E, Wr], 15, INK); p.stroke([S, E, Wr], 7, BAT_WING_L);
      p.ell(300 + s * 104, 300, 26, 20, fur, OW * 0.7, 0, 360, s * -20);                       // the bicep
      p.poly([[Wr[0], Wr[1]], [Wr[0] + s * 4, Wr[1] - 22], [Wr[0] + s * 18, Wr[1] - 14]], "#e8dccc", 3.5);
      return;
    }
    const S: P2 = [300 + s * 52, 318], E: P2 = [300 + s * 92, 368], Wr: P2 = [300 + s * 66, 420];
    const mem: P2[] = [S, [300 + s * 98, 340], E, [300 + s * 86, 404], Wr, [300 + s * 44, 400]];
    p.poly(s > 0 ? mem : mem.slice().reverse(), BAT_WING, OW * 0.8);
    p.stroke(curve(S, E, Wr, 8), 6, INK);
    if (pose === "thumbs" && s < 0) { // thumbs-up: the wrist pushed forward with the thumb claw up
      p.ell(300 + s * 82, 388, 16, 14, BAT_WING_L, 5); p.poly([[300 + s * 86, 378], [300 + s * 84, 340], [300 + s * 70, 346], [300 + s * 74, 380]], "#e8dccc", 4);
    } else p.poly([[Wr[0], Wr[1]], [Wr[0] - s * 4, Wr[1] - 18], [Wr[0] + s * 12, Wr[1] - 10]], "#e8dccc", 3);
  };
  // ---- feet (fly: dangling; sit: on the ground; hang: up at the bar) ----
  const feet = () => {
    const fy = flying ? 418 : wrapped ? 436 : 428;
    for (const s of [-1, 1]) { p.stroke([[300 + s * 16, fy - 18], [300 + s * 20, fy]], 6, INK); p.stroke([[300 + s * 20, fy], [300 + s * 28, fy + 6]], 4, INK); p.stroke([[300 + s * 20, fy], [300 + s * 14, fy + 7]], 4, INK); }
  };
  if (flying) { wingSpread(-1); wingSpread(1); feet(); }
  if (pose === "sit" || pose === "flex" || pose === "thumbs") feet();
  if (wrapped) feet();
  // ---- body ----
  const body = scallop(bx, by, 60, 70, 14, lod > 0.5 ? 0.05 : 0);
  p.shadedFill(body, fur, furD, light, 70, 0.4);
  p.ell(bx, by + 10, 36, 44, BAT_BELLY, 0);
  p.inkRing(body.slice().reverse(), OW, thick);
  if (bomb) { // strap + capsule on the belly
    p.stroke(curve([bx - 58, by + 18], [bx, by + 40], [bx + 58, by + 18], 10), 9, INK); p.stroke(curve([bx - 58, by + 18], [bx, by + 40], [bx + 58, by + 18], 10), 5, "#c9a874");
    capsule(p, bx, by + 34, 1.15, 0, bomb === 2);
  }
  if (!flying && !wrapped) { wingFold(-1, false); wingFold(1, pose === "flex"); }
  if (wrapped) { // both wings wrapped round the body like a cloak, the head sticking out on top
    const cloak: P2[] = [[300, 296], [366, 312], [384, 370], [362, 430], [300, 448], [238, 430], [216, 370], [234, 312]];
    const sm = chaikin(cloak, cloak.map(() => false), 3);
    p.gradFill(sm, BAT_WING_L, BAT_WING, rad(-90), 0.2); p.inkRing(sm, OW, thick, 0.4);
    p.stroke(curve([300, 310], [292, 380], [300, 446], 8), 4, INK);
    for (const s of [-1, 1]) p.stroke(curve([300 + s * 44, 320], [300 + s * 62, 380], [300 + s * 48, 440], 8), 3.5, mul(BAT_WING, [0.7, 0.7, 0.75]));
    if (bomb) capsule(p, 300, 410, 1.0, 0, bomb === 2);
  }
  if (medal) { // tiny ribbon + gold medal on the chest
    p.poly([[288, 296], [312, 296], [308, 326], [292, 326]], "#3a6ea8", 3); p.poly([[296, 296], [304, 296], [303, 326], [297, 326]], "#f4f1ea", 0);
    p.ell(300, 336, 14, 14, "#f0c850", 4); p.ell(300, 336, 7, 7, "#d9a830", 0);
  }
  // ---- head (tilts about the neck) ----
  const hr = rad(tilt);
  const [nx, ny] = [300, 300];
  g.save(); g.translate(nx, ny); g.rotate(hr); g.translate(-nx, -ny);
  for (const s of [-1, 1]) { // ears
    const ear: P2[] = curve([hx + s * 30, hy - 58], [hx + s * 70, hy - 150], [hx + s * 104, hy - 154], 8).concat(curve([hx + s * 104, hy - 154], [hx + s * 112, hy - 80], [hx + s * 82, hy - 30], 8).slice(1));
    const pts = s > 0 ? ear : ear.slice().reverse();
    p.shadedFill(pts, fur, furD, light, 60, 0.4); p.inkRing(pts, OW, thick);
    const inner = curve([hx + s * 44, hy - 62], [hx + s * 76, hy - 128], [hx + s * 96, hy - 134], 6).concat(curve([hx + s * 96, hy - 134], [hx + s * 98, hy - 86], [hx + s * 78, hy - 50], 6).slice(1));
    p.poly(s > 0 ? inner : inner.slice().reverse(), BAT_EAR, 0);
  }
  const head = scallop(hx, hy, 94, 80, 16, lod > 0.5 ? 0.035 : 0);
  p.shadedFill(head, fur, furD, light, 90, 0.4);
  p.inkRing(head.slice().reverse(), OW, thick);
  // forehead tuft
  p.poly([[hx - 26, hy - 74], [hx - 14, hy - 100], [hx - 4, hy - 78], [hx + 8, hy - 104], [hx + 16, hy - 78], [hx + 30, hy - 94], [hx + 26, hy - 70]], fur, 6);
  // muzzle + nose
  const my = hy + 34;
  p.ell(hx, my, 44, 30, BAT_MUZ, 5);
  if (expr === "sniff") { p.ell(hx, my - 16, 15, 10, "#3a2a30", 4); p.dot(hx - 6, my - 15, 3, "#120c10"); p.dot(hx + 6, my - 15, 3, "#120c10");
    for (const s of [-1, 1]) for (const k of [0, 1]) p.stroke([[hx + s * (28 + 10 * k), my - 30 - 8 * k], [hx + s * (40 + 10 * k), my - 40 - 8 * k]], 4, INK); }
  else { p.poly([[hx - 13, my - 18], [hx + 13, my - 18], [hx, my - 6]], "#3a2a30", 4); p.dot(hx - 5, my - 15, 2.4, "#120c10"); p.dot(hx + 5, my - 15, 2.4, "#120c10"); }
  // eyes
  if (blink >= 1 && (expr === "open" || expr === "grin" || expr === "wide" || expr === "smug" || expr === "meh")) expr = expr === "grin" ? "happy" : "shut";
  const ex = 38, ey = hy - 12;
  const eyeOpen = (x: number, r: number, pr: number) => {
    p.ell(x, ey, r * 0.88, r, WHITE, 6);
    p.ell(x + look * r * 0.38, ey + 2 + gaze * r * 0.3, pr, pr * 1.08, INK, 0);
    p.ell(x + look * r * 0.38 - pr * 0.35, ey - pr * 0.3 + gaze * r * 0.3, pr * 0.3, pr * 0.3, WHITE, 0);
  };
  const lidded = (x: number, r: number, k: number) => { // half-lid: the fur lid covers the top k of the eye
    eyeOpen(x, r, 11);
    p.clip(ellPts(x, ey, r * 0.88, r), () => p.poly([[x - r, ey - r - 4], [x + r, ey - r - 4], [x + r, ey - r + 2 * r * k], [x - r, ey - r + 2 * r * k]], fur, 0));
    p.stroke([[x - r * 0.9, ey - r + 2 * r * k], [x + r * 0.9, ey - r + 2 * r * k]], 6, INK);
  };
  const arcUp = (x: number) => p.arc(x, ey + 8, 17, 13, 200, 340, 7);   // happy  (n)
  const arcDn = (x: number) => p.arc(x, ey - 6, 17, 11, 20, 160, 7);    // closed (u)
  for (const s of [-1, 1]) {
    const x = hx + s * ex;
    switch (expr) {
      case "open": case "grin": eyeOpen(x, 24, 12); break;
      case "wide": eyeOpen(x, 28, 8); break;
      case "pop": eyeOpen(x + s * 6, 36, 7); break;
      case "smug": lidded(x, 24, 0.5); break;
      case "meh": lidded(x, 24, 0.58); break;
      case "wink": if (s > 0) arcUp(x); else eyeOpen(x, 24, 12); break;
      case "happy": arcUp(x); break;
      case "shut": case "sniff": arcDn(x); break;
    }
  }
  if (expr === "smug" || expr === "meh") for (const s of [-1, 1]) p.stroke([[hx + s * 22, ey - 34 + (expr === "smug" && s > 0 ? -6 : 0)], [hx + s * 52, ey - 30]], 6, INK);
  if (expr === "wink") p.stroke([[hx + 22, ey - 30], [hx + 54, ey - 22]], 6, INK);
  // mouth + fangs
  const fang = (x: number, y: number) => p.poly([[x - 4.5, y], [x + 4.5, y], [x, y + 10]], WHITE, 3);
  switch (expr) {
    case "grin": case "happy": case "wink":
      p.poly(curve([hx - 26, my + 6], [hx, my + 42], [hx + 26, my + 6], 10), MOUTH, 5);
      p.ell(hx, my + 22, 11, 7, TONGUE, 0); fang(hx - 15, my + 7); fang(hx + 15, my + 7); break;
    case "smug": p.stroke(curve([hx - 18, my + 12], [hx + 6, my + 20], [hx + 24, my + 6], 8), 6, INK); fang(hx + 13, my + 15); break;
    case "meh": p.stroke([[hx - 16, my + 15], [hx + 16, my + 14]], 6, INK); break;
    case "wide": case "pop": p.ell(hx, my + 16, 10, 13, MOUTH, 5); break;
    case "sniff": p.ell(hx, my + 12, 6, 5, MOUTH, 4); break;
    default: p.stroke(curve([hx - 16, my + 10], [hx, my + 20], [hx + 16, my + 10], 8), 6, INK); fang(hx - 9, my + 13); fang(hx + 9, my + 13);
  }
  g.restore();
  g.restore();
};

// ---------------- fire / bang effects (bloom: the caller passes glow > 1) ----------------
/** cartoon flame on a 300 x 400 canvas (base at the bottom centre); t = flicker phase 0..1, seed = variant */
export const fxFlame = (p: Pen, t: number, seed = 0) => {
  const r = rng2(seed * 7 + 3), two = Math.PI * 2;
  const tongue = (cx: number, w: number, h: number, sway: number, col: string, ol: number) => {
    const tip: P2 = [cx + sway, 390 - h], pts: P2[] = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); pts.push([cx - w * Math.cos(a), 388 - 0.42 * w * Math.sin(a) + 0]); }
    const left = curve([cx - w, 388], [cx - w * 0.9 + sway * 0.3, 388 - h * 0.5], tip, 10), right = curve(tip, [cx + w * 0.7 + sway * 0.5, 388 - h * 0.45], [cx + w, 388], 10);
    const shape = [...left, ...right.slice(1), ...pts.reverse().slice(1)];
    p.poly(shape, col, ol);
  };
  const ph = (k: number) => Math.sin(two * (t + k));
  tongue(150, 118, 330 + 30 * ph(0.1), 30 * ph(0.3), "#ff6a24", 9);
  tongue(108, 58, 220 + 30 * ph(0.6) + 30 * r(), -24 + 20 * ph(0.2), "#ff6a24", 7);
  tongue(196, 60, 240 + 26 * ph(0.45) + 30 * r(), 24 + 18 * ph(0.8), "#ff6a24", 7);
  tongue(150, 86, 250 + 26 * ph(0.25), 22 * ph(0.55), "#ffae2e", 0);
  tongue(150, 50, 160 + 22 * ph(0.7), 16 * ph(0.15), "#fff1a0", 0);
};
/** cartoon fireball on a 600 x 600 canvas, t 0..1: a hot lobed ball that swells, then rolls up into dark smoke */
export const fxFireball = (p: Pen, t: number, seed = 0) => {
  const r = rng2(seed + 17), g = p.g, e = 1 - (1 - Math.min(1, t * 2.2)) ** 3, R = 90 + 170 * e;
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + r() * 0.5, d = R * (0.5 + 0.2 * r()); lobes.push([300 + Math.cos(a) * d, 320 + Math.sin(a) * d * 0.8 - 60 * t, R * (0.42 + 0.18 * r())]); }
  const smokeK = Math.max(0, (t - 0.25) / 0.75);
  g.save(); g.globalAlpha = t < 0.8 ? 1 : Math.max(0, 1 - (t - 0.8) / 0.2);
  for (const [x, y, rr] of lobes) p.ell(x, y, rr, rr * 0.92, null, 12);
  const outer = smokeK > 0 ? mix("#ff7a2a", "#5a4c50", Math.min(1, smokeK * 1.3)) : "#ff7a2a";
  for (const [x, y, rr] of lobes) p.ell(x, y, rr, rr * 0.92, outer, 0);
  p.ell(300, 330 - 60 * t, R * 0.72, R * 0.62, smokeK > 0.6 ? mix("#ffb030", "#6a5a5c", (smokeK - 0.6) * 2) : "#ffb030", 0);
  if (smokeK < 0.8) p.ell(300, 345 - 60 * t, R * 0.42 * (1 - smokeK), R * 0.36 * (1 - smokeK), "#fff3b0", 0);
  g.restore();
};
/** "POOF": a white-yellow spark star inside a grey puff ring on a 400 x 400 canvas, t 0..1 */
export const fxPoof = (p: Pen, t: number) => {
  const g = p.g, e = 1 - (1 - t) ** 2;
  g.save(); g.globalAlpha = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, d = 70 + 90 * e; p.ell(200 + Math.cos(a) * d, 200 + Math.sin(a) * d, 46 * (1 - 0.4 * t), 40 * (1 - 0.4 * t), "#e8e4e8", 8); }
  const pts: P2[] = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, l = i % 2 ? 40 + 30 * e : 90 + 90 * e; pts.push([200 + Math.cos(a) * l, 200 + Math.sin(a) * l]); }
  if (t < 0.55) { p.poly(pts, "#fff3a0", 9); p.poly(pts.map(([x, y]) => [200 + (x - 200) * 0.5, 200 + (y - 200) * 0.5] as P2), "#ffffff", 0); }
  g.restore();
};
/** idea light bulb on a 300 x 400 canvas: glowing glass, screw base, rays (t 0..1 = pop-in) */
export const fxBulb = (p: Pen, t: number) => {
  const k = Math.min(1, t * 1.6), s = 0.6 + 0.4 * k + 0.12 * Math.sin(Math.min(1, t) * Math.PI);
  const X = (x: number) => 150 + (x - 150) * s, Y = (y: number) => 200 + (y - 200) * s;
  for (let i = 0; i < 8; i++) { const a = rad(-180 + i * 25.7), r0 = 118 * s, r1 = (150 + 20 * k) * s; if (k > 0.3) p.stroke([[150 + Math.cos(a) * r0, 170 + Math.sin(a) * r0], [150 + Math.cos(a) * r1, 170 + Math.sin(a) * r1]], 10, "#ffd84a"); }
  const glass: P2[] = [];
  for (let i = 0; i <= 40; i++) { const a = rad(140 + (260 * i) / 40); glass.push([X(150 + 86 * Math.cos(a)), Y(170 + 86 * Math.sin(a))]); }
  glass.push([X(118), Y(276)], [X(182), Y(276)]);
  p.poly(glass, "#fff4a8", 9);
  p.ell(X(122), Y(140), 18 * s, 26 * s, "#ffffff", 0);
  p.stroke([[X(132), Y(268)], [X(140), Y(210)], [X(150), Y(236)], [X(160), Y(210)], [X(168), Y(268)]], 5, "#d9a830");
  p.poly(rrect(X(114), Y(276), X(186), Y(330), 8), "#a8aeb4", 8);
  for (const y of [292, 310]) p.stroke([[X(114), Y(y)], [X(186), Y(y)]], 4, "#6a7076");
  p.poly(rrect(X(134), Y(330), X(166), Y(348), 6), "#3a3a42", 6);
};
