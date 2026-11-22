// Our own flat 2D cartoon cast + 2D effects, drawn on a canvas (owner: characters, with cast.ts / cardshade.ts).
// "The Exploding Whale" cast: the ENGINEER (white hard hat, short-sleeve shirt + tie, thick glasses, clipboard; a sooty
// variant with a cracked hat and glasses askew), the highway CREW (orange vests + hard hats, shovels), 1970s LOCALS
// (flares, big collars, headscarves, mustard / avocado / orange / brown), a KID, the TV REPORTER (70s suit, huge tie,
// handheld mic) and the CAMERAMAN (big shoulder film camera); the SEAGULL chorus (bottom of the file: stand / fly /
// faint / bib + fork / flee / wink); props clipboard / shovel / mic / film camera / balloon / picnic basket; effects
// blubber chunks + splats, stink lines, the thought bubble, umbrellas, smoke, dust, fire.
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
  /** bow tie colour, tweed fleck, soot on the face (+ glasses knocked askew) */
  bowtie?: string; tweed?: boolean; soot?: boolean;
  /** whale short: hi-vis vest colour, short sleeves, 70s wide collar colour, flared trousers, headscarf colour,
   *  cracked hard hat, plaid check colour on the jacket */
  vest?: string; shortSleeve?: boolean; wideCollar?: string; flares?: boolean; scarf?: string; crack?: boolean; check?: string;
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
// ---- whale short cast (near-white heads, three skull archetypes, own hat silhouettes, colour on the clothes) ----
/** the Engineer: white hard hat, short-sleeve white shirt + narrow tie, thick glasses, a clipboard */
export const ENGINEER: Outfit = { jacket: "#f4f2ea", pants: "#5a5f6e", boots: "#3a2a22", hat: "hardhat", cap: "#f7f5ee", hair: "#4a3428",
  collar: "shirt", tie: "#2f5aa8", glasses: true, buttons: "none", headType: "standard", shortSleeve: true };
/** the Engineer after the blast: soot-black shirt + face, the hat cracked, glasses askew */
export const ENGINEER_SOOT: Outfit = { ...ENGINEER, jacket: "#5e5856", pants: "#3e3a3a", cap: "#d8d4cc", tie: "#2a2a30", soot: true, crack: true };
/** the highway crew: hi-vis orange vest over a work shirt, orange hard hat */
export const crew = (v = 0): Outfit => ({ jacket: ["#7d8fa8", "#9a7a5a", "#6e8a6a"][v % 3], pants: ["#3e4a62", "#5a4a3a", "#4a4a52"][v % 3], boots: "#3a2a22",
  hat: "hardhat", cap: "#f0862a", hair: ["#3a2a20", "#7a4a2a", "#2a2020"][v % 3], collar: "shirt", buttons: "none", vest: "#f47a22",
  headType: (["standard", "bean", "bun"] as HeadKind[])[v % 3], moustache: v % 3 === 1 ? "#5a3a24" : undefined, build: v % 3 === 2 ? "stout" : "adult" });
/** 1970s locals: flares, big collars, headscarves, mustard / avocado / burnt orange / brown / teal */
const C70 = ["#d9a52c", "#7d8f2e", "#d9622a", "#8a5a34", "#2f8a8a", "#b8452e", "#c98a3a", "#5a7a3a"];
export const local70 = (v = 0): Outfit => {
  const k = v % 8, girl = v % 3 === 1;
  const o: Outfit = { jacket: C70[k], pants: ["#3b4a7a", "#6a4a2e", "#2f3a5a", "#7a6a4a"][v % 4], boots: ["#4a3426", "#2a2420", "#7a4a2a"][v % 3],
    collar: "shirt", wideCollar: ["#f4ecd8", "#f2d27a", "#ffffff", "#e8c49a"][v % 4], flares: true, buttons: "none",
    headType: (["standard", "bun", "bean"] as HeadKind[])[v % 3], check: v % 5 === 2 ? "#5a3a24" : undefined };
  if (girl) return { ...o, hat: v % 2 ? "scarf" : "hair", scarf: ["#e8452e", "#f2b234", "#2f9a8a"][v % 3], hairStyle: "bunTop", hair: ["#7a4a2a", "#e0b860", "#3a2a20"][v % 3], dress: v % 4 === 1 ? ["#e87a2a", "#9a6ac8", "#d9a52c"][v % 3] : undefined };
  return { ...o, hat: "hair", hairStyle: (["side", "bowl", "wild", "crop"] as HairStyle[])[v % 4], hair: ["#5a3a24", "#2a2020", "#a8682e", "#d9b070"][(v >> 1) % 4], moustache: v % 4 === 0 ? "#5a3a24" : undefined };
};
/** a 70s kid: striped tee, red cap */
export const KID70: Outfit = { jacket: "#f2b234", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid", hair: "#7a4a2a", check: "#e2453c" };
/** the TV reporter: brown 70s suit, giant orange tie, big collar, moustache, a handheld mic */
export const REPORTER: Outfit = { jacket: "#8a5a34", pants: "#6a4428", boots: "#2a1e18", hat: "hair", hairStyle: "side", hair: "#3a2a20",
  collar: "shirt", tie: "#e8762a", wideCollar: "#f2e2b8", buttons: "#3a2a20", headType: "bean", moustache: "#3a2a20" };
/** the cameraman: denim jacket, green cap, the big shoulder film camera */
export const CAMERAMAN: Outfit = { jacket: "#4a6a9a", pants: "#3a3a48", boots: "#3a2a22", hat: "cap", cap: "#2f8a5a", hair: "#a86a3a",
  collar: "shirt", buttons: "none", headType: "bun", build: "stout" };
/** present-day park: a parent in a red jacket, a kid in a yellow tee */
export const PARENT16: Outfit = { jacket: "#d9412e", pants: "#3b4a6a", boots: "#f4f1ea", hat: "hair", hairStyle: "bunTop", hair: "#5a3b2a", collar: "shirt", buttons: "none", headType: "bun" };
export const KID16: Outfit = { jacket: "#f6c23a", pants: "#3a6ea8", boots: "#e2453c", hat: "hair", hairStyle: "spiky", hair: "#3a2a20", build: "kid", buttons: "none" };

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
  skin: string, moustache?: string, stout = false, gaze = 0, glasses = false, soot = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 10 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey + gaze * 3.5 * u, u, side, look, skin);
    if (glasses) p.ell(x + (soot ? 2 * u : 0), ey + (soot ? side * 3.5 * u : 0), 11.5 * u, 9.5 * u, "rgba(225,240,255,0.22)", 2.6 * u, 0, 360, soot ? 12 : 0);
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u - (glasses ? 3 * u : 0);
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  if (glasses) p.arc(fx + (soot ? 2 * u : 0), ey - 2 * u, ex - 11.5 * u, 3 * u, 200, 340, 2.4 * u);
  const mx = cx + 11 * u * facing, my = cy + 19 * u;
  mouth(p, F.mouth, mx, my, u);
  if (moustache && stout) { // bushy walrus moustache: a scalloped puff with its own ink line, a notch in the middle
    const pts = scallop(mx, cy + 11 * u, 20 * u, 5.5 * u, 10, 0.1);
    p.poly(pts, moustache, 2.2 * u);
    p.stroke([[mx, cy + 7 * u], [mx, cy + 11 * u]], 1.6 * u);
  } else if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * 15 * u, cy + 15 * u], 4.5 * u, 1.6 * u, moustache);
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
    : o.hat === "fedora" || o.hat === "garrison" || o.hat === "peaked" || o.hat === "cap" || o.hat === "hardhat" ? (o.hair ? "crop" : null) : null;
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
  } else if (o.hat === "hardhat") {
    // 1970 hard hat: a tall smooth dome with a centre ridge and a brim all round, a little forward peak
    const c = o.cap ?? "#f7f5ee", yb = ct + 0.52, tilt = rad(4), dome: Spec = [];
    for (let i = 0; i <= 14; i++) {
      const t = Math.PI * (1 - i / 14), cc = Math.cos(t), ss = Math.sin(t);
      dome.push([1.0 * Math.sign(cc) * Math.abs(cc) ** (2 / 2.3), yb - 0.84 * Math.abs(ss) ** (2 / 2.3)]);
    }
    dome[0][2] = 1; dome[14][2] = 1;
    const dp = hatShape(hd, dome, tilt, 2);
    const brim = hatShape(hd, [[-1.26, yb - 0.08, 1], [1.2, yb - 0.08, 1], [1.62, yb - 0.02], [1.6, yb + 0.12, 1], [-1.26, yb + 0.1, 1]], tilt, 2);
    filled(p, brim, mul(c, [0.9, 0.9, 0.92]), light, 0.7 * hd.a, ow * 0.9, thick);
    filled(p, dp, c, light, hd.a, ow, thick);
    p.stroke([hu(hd, -0.05, yb - 0.82), hu(hd, 0.12, yb - 0.5), hu(hd, 0.16, yb - 0.06)], 3.2 * u, mul(c, [0.72, 0.72, 0.76]));
    if (o.crack) p.stroke([hu(hd, -0.5, yb - 0.72), hu(hd, -0.3, yb - 0.5), hu(hd, -0.46, yb - 0.36), hu(hd, -0.22, yb - 0.16), hu(hd, -0.34, yb - 0.02)], 2.6 * u, INK);
  } else if (o.hat === "scarf") {
    // 70s headscarf: a coloured kerchief over the crown, tied under the chin with two little tails
    const c = o.scarf ?? "#e8452e";
    const sc = huShape(hd, [[-1.14, 0.2, 1], [-1.12, ct * 0.5], [-0.8, ct - 0.14], [0, ct - 0.24], [0.8, ct - 0.12], [1.1, ct * 0.5], [1.12, -0.3, 1], [0.84, -0.42], [0, -0.56], [-0.84, -0.38], [-0.98, 0.2, 1]], 2);
    filled(p, sc, c, light, hd.a, ow * 0.9, thick);
    for (let k = 0; k < 5; k++) { const [dx, dy] = hu(hd, -0.6 + 0.3 * k, ct * 0.62 + 0.05 * (k % 2)); p.dot(dx, dy, 3.2 * u, "rgba(255,250,230,0.85)"); }
    const [kx, ky] = hu(hd, -0.95, 0.42);
    p.poly([[kx, ky], [kx - 9 * u, ky + 14 * u], [kx + 3 * u, ky + 12 * u]], c, 1.4 * u);
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
export type Prop = null | "icecream" | "shako" | ["hammer", number] | "stick" | "pen" | "bucket" | "folder" | "clipboard" | "shovel" | "mic" | "filmcam" | "balloon" | "basket";

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.7 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.86 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.66 },
  slim: { a: 112, torso: 1.15, legs: 1.45, tw: 0.62 },
};

/** arm poses (motion.md 3.3); "wave" uses the wave amount, "point" adds an index finger */
export type ArmPose = "hang" | "wave" | "point" | "hip" | "up" | "out" | "shrug" | "hold" | "ears" | "crank" | "salute" | "pull" | "palm" | "pinch";
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
  if (o.bowtie) { // bow tie at the collar
    const by = chin + 0.03 * HH, bx = tcx;
    for (const sd of [-1, 1]) p.poly([[bx, by], [bx + sd * 15 * u, by - 7 * u], [bx + sd * 15 * u, by + 7 * u]], o.bowtie, 1.4 * u);
    p.ell(bx, by, 3.6 * u, 3.6 * u, mul(o.bowtie, [0.8, 0.8, 0.8]), 1.3 * u);
  }
  if (o.check) for (let k = 0; k < 7; k++) { // 70s plaid / stripe: two crossing sets of soft bands
    const y = chin + (0.12 + 0.17 * k) * HH;
    p.band([[tcx - 1.4 * Ta, y], [tcx + 1.4 * Ta, y]], `${o.check}66`, 0.05 * HH, 0);
    p.band([[tcx - 1.1 * Ta + k * 0.36 * Ta, chin - 0.2 * HH], [tcx - 1.1 * Ta + k * 0.36 * Ta, torsoBot]], `${o.check}44`, 0.04 * HH, 0);
  }
  if (o.vest) for (const sd of [-1, 1]) { // hi-vis vest: two front panels with a pale reflective band, open down the middle
    p.poly([[tcx + sd * 0.14 * Ta, chin - 0.12 * HH], [tcx + sd * 1.3 * Ta, chin - 0.1 * HH], [tcx + sd * 1.3 * Ta, torsoBot + 0.02 * HH], [tcx + sd * 0.2 * Ta, torsoBot + 0.02 * HH]], o.vest, 1.6 * u);
    p.band([[tcx + sd * 0.2 * Ta, torsoBot - 0.34 * HH], [tcx + sd * 1.3 * Ta, torsoBot - 0.34 * HH]], "#f6f0c8", 0.07 * HH, 1.1 * u);
  }
  if (o.wideCollar) for (const sd of [-1, 1]) // 70s dagger collar spread over the shoulders
    p.poly([[tcx + sd * 0.06 * Ta, chin + 0.05 * HH], [tcx + sd * 0.5 * Ta, chin - 0.12 * HH], [tcx + sd * 0.86 * Ta, chin + 0.3 * HH], [tcx + sd * 0.3 * Ta, chin + 0.2 * HH]], o.wideCollar, 1.5 * u);
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
      if (o.flares) p.poly([[fx - 5 * u, fy - 0.3 * HH], [fx + 5 * u, fy - 0.3 * HH], [fx + 11 * u, fy - 3 * u], [fx - 11 * u, fy - 3 * u]], legCol === INK ? INK : o.pants, 1.6 * u);
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
      case "pull": return [S, [S[0] + f * 0.42 * HH, S[1] + 0.26 * HH], [S[0] + f * 0.86 * HH, S[1] + 0.2 * HH]];
      case "palm": return [S, X(0.55, 0.12), [hd.cx + f * 6 * u, hd.wy + 2 * u]];
      case "pinch": return [S, X(0.5, 0.2), [hd.cx + f * 15 * u, hd.wy + 10 * u]];
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
  type Arm = { pts: [P2, P2, P2]; front: boolean; finger?: number; over?: number };
  const spec = (sp: ArmSpec, side: number): Arm => {
    const [a0, a1, k] = typeof sp === "string" ? [sp, sp, 1] : sp, P0 = pose(a0, side), P1 = pose(a1, side), kk = clamp(k, 0, 1);
    const pts = P0.map((q, i) => lerp2(q, P1[i], kk)) as [P2, P2, P2];
    const fin = (a0 === "point" ? 1 - kk : 0) + (a1 === "point" ? kk : 0);
    const ov = kk > 0.5 && (a1 === "palm" || a1 === "pinch") ? (a1 === "palm" ? 12 : 7) : undefined;
    return { pts, front: a1 === "hold" && kk > 0.5, finger: fin > 0.3 ? fin : undefined, over: ov };
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
    } else if (prop === "clipboard") { // held up against the chest, tilted toward us
      arms.push({ pts: [S1, [tcx + 1.1 * T.a + 8 * u, S1[1] + 0.4 * HH], [tcx + 0.62 * T.a, S1[1] + 0.34 * HH]], front: true });
    } else if (prop === "shovel") { // planted at the side, hand on the shaft at chest height
      arms.push({ pts: [S1, [tcx + 1.15 * T.a + 8 * u, S1[1] + 0.3 * HH], [tcx + 1.2 * T.a + 18 * u, S1[1] + 0.2 * HH]], front: true });
    } else if (prop === "mic") { // handheld mic held out in front of the chest, pointed at the lens
      arms.push({ pts: [S1, [tcx + 1.1 * T.a + 6 * u, S1[1] + 0.42 * HH], [tcx + 0.25 * T.a * f, chin + 0.3 * HH]], front: true });
    } else if (prop === "filmcam") { // big film camera on the shoulder, hand up on its grip
      arms.push({ pts: [S1, [tcx + 1.2 * T.a + 16 * u, S1[1] + 0.1 * HH], [tcx + 0.9 * T.a + 8 * u * f, chin - 0.12 * HH]], front: true });
    } else if (prop === "balloon") { // a balloon on a string, hand raised a little
      arms.push({ pts: [S1, [tcx + 1.2 * T.a + 12 * u, S1[1] + 0.1 * HH], [tcx + 1.3 * T.a + 22 * u, S1[1] - 0.28 * HH]], front: true });
    } else if (prop === "basket") { // picnic basket hanging from the hand
      arms.push({ pts: [S1, [tcx + 1.12 * T.a + 6 * u, S1[1] + 0.46 * HH], [tcx + 1.18 * T.a + 10 * u, chin + 1.0 * HH]], front: true });
    } else if (prop === "bucket") { // hanging from the hand
      arms.push({ pts: [S1, [tcx + 1.12 * T.a + 6 * u, S1[1] + 0.46 * HH], [tcx + 1.18 * T.a + 10 * u, chin + 1.0 * HH]], front: true });
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
    p.dot(a.pts[2][0], a.pts[2][1], (a.over ?? 5.5) * u);
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
  for (const a of arms) if (!a.front && !a.over) drawArm(a);
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
  for (const a of arms) if (a.front && !a.over) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "clipboard") { // brown board, white sheet with ink squiggles (no words), a steel clip
      const bx = hx - 4 * u * f;
      p.poly(rrect(bx - 26 * u, hy - 44 * u, bx + 26 * u, hy + 20 * u, 4 * u), "#a8743e", 2.4 * u);
      p.poly(rrect(bx - 21 * u, hy - 36 * u, bx + 21 * u, hy + 15 * u, 2 * u), "#fbf8ee", 1.4 * u);
      for (let k = 0; k < 5; k++) p.stroke([[bx - 15 * u, hy - 26 * u + k * 8 * u], [bx + (6 - 4 * (k % 2)) * u, hy - 26 * u + k * 8 * u]], 1.6 * u, "#5a6a8a");
      p.poly(rrect(bx - 10 * u, hy - 48 * u, bx + 10 * u, hy - 38 * u, 2 * u), "#b8bec4", 1.6 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "shovel") { // long wooden shaft from the sand to above the shoulder, a grey spade blade at the foot
      const top: P2 = [hx + 2 * u * f, hy - 0.5 * HH], foot: P2 = [hx + 14 * u * f, sole - 30 * u];
      p.band([top, foot], "#a8784a", 4.2 * u, 1.4 * u, "round");
      p.poly([[foot[0] - 15 * u, foot[1] - 4 * u], [foot[0] + 15 * u, foot[1] - 4 * u], [foot[0] + 13 * u, foot[1] + 24 * u], [foot[0], foot[1] + 32 * u], [foot[0] - 13 * u, foot[1] + 24 * u]], "#8a929a", 2.2 * u);
      p.stroke([[top[0] - 10 * u, top[1]], [top[0] + 10 * u, top[1]]], 4.5 * u, "#3a2a22");
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "mic") { // black handheld mic with a silver ball head and a cord
      const head: P2 = [hx + 6 * u * f, hy - 20 * u];
      p.stroke([[hx - 2 * u, hy + 12 * u], [hx - 14 * u * f, hy + 50 * u], [hx - 2 * u * f, hy + 100 * u], [hx - 16 * u * f, hy + 150 * u]], 2.4 * u, "#1e1e24"); // the cord
      p.band([[hx, hy + 12 * u], head], "#2a2a30", 7 * u, 1.6 * u, "round");
      p.ell(head[0], head[1], 15 * u, 15 * u, "#c9ccd2", 2.6 * u);                  // big ball grille, foreshortened toward us
      for (let k = -1; k <= 1; k++) { p.stroke([[head[0] - 13 * u, head[1] + k * 6 * u], [head[0] + 13 * u, head[1] + k * 6 * u]], 1.2 * u, "#7a8088"); p.stroke([[head[0] + k * 6 * u, head[1] - 13 * u], [head[0] + k * 6 * u, head[1] + 13 * u]], 1.2 * u, "#7a8088"); }
      p.ell(head[0] - 5 * u, head[1] - 6 * u, 4 * u, 3 * u, "rgba(255,255,255,0.8)", 0);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "filmcam") { // big 70s shoulder film camera: grey body, twin film magazine on top, a long lens to the facing side
      const cx = hx + 6 * u * f, cy = hy - 6 * u;
      p.poly(rrect(cx - 40 * u, cy - 20 * u, cx + 40 * u, cy + 22 * u, 6 * u), "#5a5e66", 2.6 * u);
      for (const k of [-1, 1]) p.ell(cx + k * 18 * u - 8 * u * f, cy - 34 * u, 17 * u, 17 * u, "#3a3e46", 2.4 * u);
      p.poly(rrect(Math.min(cx + 38 * u * f, cx + 66 * u * f), cy - 13 * u, Math.max(cx + 38 * u * f, cx + 66 * u * f), cy + 13 * u, 3 * u), "#2a2c32", 2.2 * u);
      p.ell(cx + 66 * u * f, cy, 5 * u, 13 * u, "#6a8ab0", 2 * u);
      p.dot(cx - 26 * u, cy - 10 * u, 3.5 * u, "#e8452e");
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "balloon") { // a blue whale-shaped balloon on a string
      const bx = hx + 30 * u * f, byy = hy - 120 * u;
      p.stroke([[hx, hy], [hx + 12 * u * f, hy - 50 * u], [bx, byy + 26 * u]], 1.4 * u, INK);
      for (const k of [-1, 0, 1]) p.stroke([[bx + 16 * u * f, byy - 30 * u], [bx + (16 + 9 * k) * u * f, byy - 46 * u], [bx + (16 + 16 * k) * u * f, byy - 50 * u]], 2.6 * u, "#8ad0ff"); // spout
      p.poly([[bx - 40 * u * f, byy - 4 * u], [bx - 70 * u * f, byy - 30 * u], [bx - 58 * u * f, byy - 2 * u], [bx - 70 * u * f, byy + 24 * u]], "#5aa0e8", 2.4 * u);
      p.poly(ellPts(bx, byy, 46 * u, 30 * u, 0, 360, 0, 40), "#5aa0e8", 2.6 * u);
      p.poly(ellPts(bx + 6 * u * f, byy + 14 * u, 30 * u, 11 * u, 0, 360, 0, 30), "#cfe8ff", 0);
      p.dot(bx + 22 * u * f, byy - 6 * u, 3.4 * u, INK);
      p.arc(bx + 18 * u * f, byy + 6 * u, 8 * u, 4 * u, 20, 160, 1.8 * u);
      p.ell(bx - 8 * u, byy - 12 * u, 10 * u, 5 * u, "rgba(255,255,255,0.6)", 0);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "basket") { // wicker picnic basket, red check cloth peeking out
      p.arc(hx, hy + 16 * u, 18 * u, 16 * u, 180, 360, 2.4 * u, "#8a5a2a");
      p.poly(rrect(hx - 26 * u, hy + 14 * u, hx + 26 * u, hy + 46 * u, 5 * u), "#c98e48", 2.2 * u);
      for (const y of [24, 34]) p.stroke([[hx - 24 * u, hy + y * u], [hx + 24 * u, hy + y * u]], 1.2 * u, "#8a5a2a");
      p.poly([[hx - 22 * u, hy + 14 * u], [hx + 6 * u, hy + 8 * u], [hx + 22 * u, hy + 14 * u]], "#e2453c", 1.4 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "bucket") { // galvanised bucket on a wire bail
      const tipped = false, g2 = p.g, [cx2, cy2] = p.P(hx, hy);
      g2.save(); g2.translate(cx2, cy2); g2.rotate(tipped ? 1.5 * f : 0); g2.translate(-cx2, -cy2);
      p.arc(hx, hy + 16 * u, 17 * u, 14 * u, 180, 360, 1.8 * u);
      p.poly([[hx - 17 * u, hy + 16 * u], [hx + 17 * u, hy + 16 * u], [hx + 13 * u, hy + 50 * u], [hx - 13 * u, hy + 50 * u]], "#b8bec4", 2 * u);
      p.ell(hx, hy + 16 * u, 17 * u, 5 * u, tipped ? "#5a6066" : "#7ab8e0", 1.8 * u);
      for (const y of [26, 40]) p.stroke([[hx - 15.5 * u + (y - 16) * 0.12 * u, hy + y * u], [hx + 15.5 * u - (y - 16) * 0.12 * u, hy + y * u]], 1.2 * u, "#8a9096");
      g2.restore();
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "folder") { // a fat manila folder bulging with paper
      const x0 = Math.min(hx - 6 * u * f, hx + 66 * u * f), x1 = Math.max(hx - 6 * u * f, hx + 66 * u * f);
      p.poly(rrect(x0, hy - 40 * u, x1, hy + 4 * u, 4 * u), "#e8c47a", 2.4 * u);
      for (let k = 0; k < 6; k++) p.stroke([[x0 + 4 * u, hy - 32 * u + k * 5.5 * u], [x1 - 4 * u, hy - 32 * u + k * 5.5 * u]], 1.6 * u, "#f8f2e2");
      p.poly(rrect(x1 - 18 * u, hy - 46 * u, x1 - 4 * u, hy - 38 * u, 1.5 * u), "#c0353a", 1.4 * u);
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
  const brim = o.hat === "peaked" || o.hat === "shako" || o.hat === "shako_tall" || o.hat === "fedora" || o.hat === "hardhat";
  HAT.lift = opts.hatLift ?? 0; HAT.tilt = opts.hatTilt ?? 0;
  drawHead(p, o, hd, light, thick, seed, false, () => {
    faceFront(p, hd.cx, hd.wy, W, expr, f, look, lid, brim, skin, o.moustache, o.build === "stout", opts.gaze ?? 0, !!o.glasses, !!o.soot);
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
  if (arms.some((a) => a.over)) { // face-palm / nose pinch: those hands go over the face
    p.rot = A ? [rad(A), 300, hipY] : null;
    for (const a of arms) if (a.over) drawArm(a);
  }
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
// SEAGULLS (the comic chorus). Our own design: a round white western gull with a pale-grey back, black wingtips with
// white dots, a big yellow beak with the red spot, orange webbed feet, two ink-dot eyes in a 3/4 head (read at phone
// size). Square 600 x 600 design card, centre (300, 300), feet at y ~ 560. Poses: stand, fly (flap phase), faint (stiff,
// X eyes, tongue out: the card rolls over in cast.ts), bib (a red-check bib, a fork in the wing, licking the beak), flee
// (fly with panic eyes), wink (head turned to the lens). Facing screen right; cast.ts mirrors the card.
// =================================================================================================================
export type GullPose = "stand" | "fly" | "faint" | "bib" | "flee" | "wink";
export type GullExpr = "open" | "happy" | "wink" | "shock" | "x" | "lick" | "smug";
export type GullOpts = { pose: GullPose; phase?: number; expr?: GullExpr; look?: number; blink?: number; light?: number; lod?: number };
const G_WHITE = "#fbfbf7", G_BACK = "#a9b3bf", G_TIP = "#26242a", G_BEAK = "#f4b62e", G_SPOT = "#e2453c", G_LEG = "#f08a3a";
const gEye = (p: Pen, x: number, y: number, r: number, kind: GullExpr, near: boolean, lid: number) => {
  if (kind === "x") { p.stroke([[x - r, y - r], [x + r, y + r]], 6); p.stroke([[x + r, y - r], [x - r, y + r]], 6); return; }
  if (kind === "happy" || (kind === "wink" && near) || lid > 0.7) { p.arc(x, y + (kind === "happy" || kind === "wink" ? 4 : 0), r * 1.1, r * 0.8, kind === "happy" || kind === "wink" ? 200 : 20, kind === "happy" || kind === "wink" ? 340 : 160, 6); return; }
  if (kind === "shock") { p.ell(x, y, r * 1.6, r * 1.8, "#ffffff", 5); p.dot(x + 2, y, r * 0.55); return; }
  p.dot(x, y, r * (lid > 0.3 ? 0.8 : 1));
  if (kind === "smug") p.stroke([[x - r * 1.3, y - r * 0.9], [x + r * 1.3, y - r * 0.5]], 6);
};
/** head (3/4, facing right; front = turned to the lens), eyes, beak; returns the beak tip */
const gHead = (p: Pen, cx: number, cy: number, R: number, expr: GullExpr, front: number, lid: number, light: number) => {
  p.shadedFill(ellPts(cx, cy, R, R * 0.94), G_WHITE, "#d7dce6", light, R, 0.32);
  p.poly(ellPts(cx, cy, R, R * 0.94), null, 9);
  const fx = cx + R * (0.38 - 0.34 * front), ey = cy - R * 0.14, sp = R * (0.34 + 0.12 * front);
  const er = R * 0.12;
  gEye(p, fx - sp * 0.5, ey, er * (1 - 0.15 * (1 - front)), expr, false, lid);
  gEye(p, fx + sp * 0.5, ey, er, expr, true, lid);
  if (expr === "smug" || expr === "wink") p.stroke([[fx - sp * 0.5 - er, ey - er * 2.2], [fx - sp * 0.5 + er, ey - er * 2.6]], 5);
  // beak: a long yellow wedge, the lower mandible with the red spot
  const bx = cx + R * (0.78 - 0.5 * front), by = cy + R * 0.22, L = R * (1.0 - 0.35 * front);
  p.poly([[bx - 8, by - R * 0.2], [bx + L, by + R * 0.02], [bx + L * 0.96, by + R * 0.1], [bx - 4, by + R * 0.06]], G_BEAK, 7);
  p.poly([[bx - 2, by + R * 0.06], [bx + L * 0.9, by + R * 0.1], [bx + L * 0.7, by + R * 0.26], [bx, by + R * 0.2]], mul(G_BEAK, [0.94, 0.86, 0.8]), 7);
  p.dot(bx + L * 0.66, by + R * 0.17, R * 0.07, G_SPOT);
  if (expr === "lick" || expr === "x") { // a pink tongue out of the beak corner
    p.ell(bx + L * (expr === "x" ? 0.5 : 0.94), by + R * 0.28, R * 0.12, R * 0.17, TONGUE, 5, 0, 360, -20);
  }
  return [bx + L, by] as P2;
};
const gLegs = (p: Pen, x0: number, y0: number, stiff: boolean) => {
  for (const [dx, k] of [[-22, 0], [24, 1]] as const) {
    const a: P2 = [x0 + dx, y0], b: P2 = [x0 + dx + (stiff ? (k ? 30 : -30) : -6), 548];
    p.stroke([a, b], 18, INK); p.stroke([a, b], 10, G_LEG);
    p.poly([[b[0] - 6, b[1] - 4], [b[0] + 34, b[1] + 6], [b[0] + 26, b[1] + 16], [b[0] - 8, b[1] + 12]], G_LEG, 6);
  }
};
/** a wing: shoulder s, tip t, chord w (grey with a black dotted tip) */
const gWing = (p: Pen, s: P2, t: P2, w: number, dark = false) => {
  const dx = t[0] - s[0], dy = t[1] - s[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const m: P2 = [s[0] + dx * 0.62, s[1] + dy * 0.62];
  const raw: P2[] = [[s[0] + nx * w * 0.45, s[1] + ny * w * 0.45], [s[0] + dx * 0.35 + nx * w * 0.5, s[1] + dy * 0.35 + ny * w * 0.5], [m[0] + nx * w * 0.3, m[1] + ny * w * 0.3], t, [m[0] - nx * w * 0.22, m[1] - ny * w * 0.22], [s[0] + dx * 0.3 - nx * w * 0.42, s[1] + dy * 0.3 - ny * w * 0.42], [s[0] - nx * w * 0.4, s[1] - ny * w * 0.4]];
  const outline = chaikin(raw, raw.map((_, i) => i === 3), 3);
  p.poly(outline, dark ? mul(G_BACK, [0.82, 0.82, 0.86]) : G_BACK, 0);
  p.clip(outline, () => {
    p.poly([[m[0] + nx * w, m[1] + ny * w], [t[0] + dx * 0.3 + nx * w, t[1] + dy * 0.3 + ny * w], [t[0] + dx * 0.3 - nx * w, t[1] + dy * 0.3 - ny * w], [m[0] - nx * w, m[1] - ny * w]], G_TIP, 0);
    for (const k of [0.78, 0.9]) p.dot(s[0] + dx * k, s[1] + dy * k, w * 0.08, "#ffffff");
  });
  p.poly(outline, null, 8);
};
export const gullDraw = (p: Pen, o: GullOpts) => {
  const { pose, phase = 0, look = 0, blink = 0, light = -2.2 } = o;
  let expr: GullExpr = o.expr ?? "open";
  const two = Math.PI * 2;
  if (pose === "fly" || pose === "flee") {
    if (pose === "flee" && expr === "open") expr = "shock";
    const fl = Math.cos(two * phase), cx = 290, cy = 320;
    gWing(p, [300, cy - 20], [230 - 40 * fl, cy - 200 * fl - 20], 110, true);
    p.poly([[cx - 150, cy - 10], [cx - 230, cy - 40], [cx - 220, cy + 30]], G_BACK, 8);
    p.stroke([[cx - 10, cy + 70], [cx - 60, cy + 110]], 14, INK); p.stroke([[cx - 10, cy + 70], [cx - 60, cy + 110]], 8, G_LEG);
    p.shadedFill(ellPts(cx, cy, 160, 78), G_WHITE, "#d7dce6", light, 160, 0.32); p.poly(ellPts(cx, cy, 160, 78), null, 9);
    gHead(p, cx + 150, cy - 70, 76, expr, 0.2 + 0.2 * look, blink, light);
    gWing(p, [320, cy - 10], [250 - 40 * fl, cy - 230 * fl + 10], 120);
    return;
  }
  const stiff = pose === "faint";
  if (stiff) expr = "x";
  const bx = 290, by = 380;
  // tail + far leg + body
  p.poly([[bx - 120, by - 10], [bx - 210, by - 50], [bx - 200, by + 6], [bx - 120, by + 40]], G_BACK, 8);
  p.poly([[bx - 170, by - 36], [bx - 210, by - 50], [bx - 200, by + 6], [bx - 175, by]], G_TIP, 0);
  gLegs(p, bx, by + 70, stiff);
  p.shadedFill(ellPts(bx, by, 148, 108), G_WHITE, "#d7dce6", light, 148, 0.32);
  p.poly(ellPts(bx, by, 148, 108), null, 10);
  if (pose === "bib") { // red-check bib tied at the neck
    const bib: P2[] = [[bx + 10, by - 92], [bx + 120, by - 96], [bx + 128, by + 10], [bx + 70, by + 52], [bx + 14, by + 20]];
    p.poly(bib, "#ffffff", 0);
    p.clip(bib, () => { for (let i = 0; i < 6; i++) for (let k = 0; k < 7; k++) if ((i + k) % 2 === 0) p.poly(rrect(bx + 10 + i * 22, by - 96 + k * 22, bx + 32 + i * 22, by - 74 + k * 22, 0), "#e2453c", 0); });
    p.poly(bib, null, 7);
  }
  // folded wing (or a stiff wing stuck out when fainting)
  if (stiff) gWing(p, [bx - 10, by - 30], [bx - 190, by - 150], 90);
  else gWing(p, [bx + 40, by - 40], [bx - 170, by + 10], 105);
  const front = pose === "wink" ? 0.85 : clamp(0.15 + 0.4 * look, 0, 1);
  const hx = pose === "wink" ? bx + 60 : bx + 110, hy = by - 150;
  gHead(p, hx, hy, 82, pose === "wink" && expr === "open" ? "wink" : expr, front, blink, light);
  if (pose === "bib") { // the fork, held up in the wing tip
    const fx = bx + 175, fy = by - 30;
    p.band([[fx - 10, fy + 70], [fx + 10, fy - 90]], "#d8dce2", 10, 4, "round");
    p.band([[fx - 4, fy - 90], [fx + 26, fy - 90]], "#d8dce2", 10, 4, "round");
    for (const k of [-6, 6, 18, 30]) p.band([[fx + k - 6, fy - 92], [fx + k - 6, fy - 150]], "#d8dce2", 6, 3, "round");
    p.ell(fx - 8, fy + 62, 30, 22, G_BACK, 7);
  }
};

// ---------------- whale-short effects ----------------
/** a blubber chunk on a 400 x 400 canvas: a lumpy cream-grey slab of fat with a strip of grey-brown whale skin along
 *  one edge, a pale belly shade, two dabs of shine (seed = shape) */
export const fxChunk = (p: Pen, seed = 0) => {
  // an irregular wobbly lump (no two alike), lobed rim, cream-pink fat lit from inside (reads soft / translucent),
  // a thick torn strip of dark grey whale skin on one side, wet shine, gooey drips
  const r = rng2(seed * 7 + 2), pts: P2[] = [], g = p.g;
  const n = 26, R0 = 128 + 16 * r(), squash = 0.68 + 0.18 * r(), tilt = (r() - 0.5) * 0.6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, lobe = 1 + 0.16 * Math.sin(a * (3 + (seed % 3)) + seed) + 0.12 * (r() - 0.5);
    const x = R0 * lobe * Math.cos(a), y = R0 * lobe * squash * Math.sin(a);
    pts.push([200 + x * Math.cos(tilt) - y * Math.sin(tilt), 210 + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  const sh = chaikin(pts, pts.map(() => false), 3);
  const [gx, gy] = p.P(190, 200), gr = g.createRadialGradient(gx, gy, 10, gx, gy, R0 * 1.25);
  gr.addColorStop(0, "#fff6f0"); gr.addColorStop(0.55, "#f6dfd6"); gr.addColorStop(1, "#e2b8ac");
  g.save(); g.beginPath(); sh.forEach(([x, y], i) => { const [X, Y] = p.P(x, y); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.closePath(); g.fillStyle = gr; g.fill(); g.restore();
  p.clip(sh, () => {
    const sk: P2[] = [], side = seed % 2 ? 1 : -1;                // the torn skin strip on one side
    for (let i = 0; i <= 14; i++) { const a = Math.PI * (side > 0 ? -0.35 + 0.7 * (i / 14) : 0.65 + 0.7 * (i / 14)); sk.push([200 + (R0 + 60) * Math.cos(a), 210 + (R0 + 60) * Math.sin(a)]); }
    for (let i = 14; i >= 0; i--) { const a = Math.PI * (side > 0 ? -0.35 + 0.7 * (i / 14) : 0.65 + 0.7 * (i / 14)); const d = R0 * (0.52 + 0.1 * Math.sin(i * 2.1 + seed)); sk.push([200 + d * Math.cos(a), 210 + d * squash * Math.sin(a)]); }
    p.poly(sk, "#57504e", 0);
    p.stroke(sk.slice(15), 5, "#8a7f7a");                        // the torn edge catches light
    p.ell(170 - 30 * side, 185, 46, 20, "rgba(255,255,255,0.9)", 0, 0, 360, -20);   // wet shine
    p.ell(225 - 30 * side, 230, 16, 9, "rgba(255,255,255,0.85)", 0);
  });
  p.poly(sh, null, 11);
  for (const [x, l] of [[150 + 20 * r(), 36 + 20 * r()], [240 + 20 * r(), 24 + 16 * r()]]) { const yb = 210 + R0 * squash * 0.9; p.poly([[x - 13, yb - 6], [x + 13, yb - 6], [x + 6, yb + l], [x, yb + l + 10], [x - 6, yb + l]], "#f3dcd2", 6); }
};
/** a flat blubber splat (top-down) on a 400 x 400 canvas: a cream-pink puddle with radial lobes and a ring of droplets */
export const fxSplat = (p: Pen, seed = 0) => {
  const r = rng2(seed + 41), pts: P2[] = [];
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, rr2 = i % 2 ? 80 + 25 * r() : 110 + 45 * r(); pts.push([200 + rr2 * Math.cos(a), 200 + rr2 * Math.sin(a)]); }
  const sh = chaikin(pts, pts.map(() => false), 2);
  p.poly(sh, "#f0dcd0", 8);
  p.ell(185, 190, 56, 40, "#fbefe8", 0);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28 + r() * 0.3, d = 158 + 30 * r(), rr2 = 6 + 9 * r(); p.ell(200 + d * Math.cos(a), 200 + d * Math.sin(a), rr2, rr2, "#f0dcd0", 4); }
};
/** green stink lines on a 300 x 400 canvas, t = rise phase 0..1 (loops) */
export const fxStink = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const x0 = 70 + 80 * k, pts: P2[] = [];
    for (let i = 0; i <= 20; i++) { const y = 380 - i * 17, ph = (t + k * 0.3) * Math.PI * 2; pts.push([x0 + 22 * Math.sin(y / 38 + ph), y]); }
    p.stroke(pts, 20, "#3e6a2a"); p.stroke(pts, 11, "#9ad04a");
  }
};
/** thought bubble on a 640 x 520 canvas: scalloped cloud + trailing puffs; inside, the whale turns into a grey boulder (k 0..1) */
export const fxThought = (p: Pen, k: number) => {
  const g = p.g, cloud = scallop(340, 220, 250, 165, 11, 0.12);
  p.poly(cloud, "#ffffff", 11);
  p.ell(120, 440, 34, 28, "#ffffff", 9); p.ell(70, 495, 18, 15, "#ffffff", 7);
  const whale = () => { // grey blocky-head whale, side view, X eye
    p.poly([[175, 215], [360, 182], [440, 186], [470, 230], [455, 290], [330, 300], [235, 285], [190, 260], [140, 250], [110, 205], [138, 228]], "#8a8590", 9);
    p.stroke([[420, 205], [440, 225]], 8); p.stroke([[440, 205], [420, 225]], 8);
    p.stroke([[300, 300], [330, 270], [355, 300]], 6, "#5f5a64");
  };
  const rock = () => { // lumpy grey boulder with cracks and a highlight
    const pts = scallop(320, 240, 150, 105, 7, 0.08);
    p.poly(pts, "#9a9690", 10);
    p.ell(280, 205, 60, 30, "#b9b5ae", 0);
    p.stroke([[300, 160], [320, 210], [300, 250]], 6, "#5a5650"); p.stroke([[380, 270], [420, 250]], 6, "#5a5650");
  };
  g.save(); g.globalAlpha = 1 - k; whale(); g.restore();
  if (k > 0) { g.save(); g.globalAlpha = k; rock(); g.restore(); }
  if (k > 0.3 && k < 1) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; p.stroke([[320 + 170 * Math.cos(a), 240 + 120 * Math.sin(a)], [320 + 200 * Math.cos(a), 240 + 140 * Math.sin(a)]], 6, "#f2b234"); }
};
/** a beach umbrella on a 400 x 400 canvas, open 0..1 (furled -> a striped dome), handle down to the bottom */
export const fxUmbrella = (p: Pen, open: number, c1 = "#e2453c", c2 = "#fff4dc") => {
  const w = 30 + 160 * open, h = 40 + 70 * open, cx = 200, top = 70;
  p.stroke([[cx, top], [cx, 380], [cx - 18, 392]], 10, "#5a3a24");
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (1 - i / n), a1 = Math.PI * (1 - (i + 1) / n);
    const seg: P2[] = [[cx, top]];
    for (let k = 0; k <= 6; k++) { const a = a0 + (a1 - a0) * (k / 6); seg.push([cx + w * Math.cos(a), top + h - h * Math.sin(a) * 0.15 + (k % 6 === 0 ? 0 : 8 * Math.sin((k / 6) * Math.PI))]); }
    p.poly(seg, i % 2 ? c2 : c1, 7);
  }
  p.dot(cx, top - 6, 9, INK);
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
