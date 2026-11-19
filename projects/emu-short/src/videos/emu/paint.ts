// Hand-painted look textures drawn on canvases (cached), owner: sets (with build.ts). Shared painters from the bridge /
// missile template (value octaves, tinted seams, blotches, sign lettering, clouds, corrugated iron, weatherboards,
// planks) plus the emu short's own set (bottom of the file): wheat canopy + stalk cards, stubble, red dirt, dry
// paddock grass, mud, dam water, gum bark + leaves, canvas, .303 ammo crates, brass casings, the tally board.
import * as THREE from "three";

export const rng = (seed: number) => {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
};
const cache = new Map<string, THREE.CanvasTexture>();
export const ctex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void) => {
  let t = cache.get(key);
  if (!t) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    draw(cv.getContext("2d")!, rng(key.length * 131 + key.charCodeAt(0)));
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    cache.set(key, t);
  }
  return t;
};
/** clone with its own repeat */
export const rep = (t: THREE.Texture, x: number, y: number) => {
  const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c;
};
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length];
const INKL = "rgba(40,30,40,0.85)";
const _jc = new THREE.Color(), _hsl = { h: 0, s: 0, l: 0 };
/** per-tile colour jitter in sRGB HSL: lightness x(1 +- dv), hue +- dh degrees, saturation x(1 +- ds) -> css hex.
 *  (MAT pass: reviewer saw tiled brick / cobbles / blocks; about +-10 % per tile breaks the repetition) */
export const jit = (r: () => number, hex: string, dv = 0.1, dh = 5, ds = 0.15) => {
  _jc.set(hex).getHSL(_hsl);
  const k = (a: number) => 1 + (r() * 2 - 1) * a;
  _jc.setHSL((_hsl.h + ((r() * 2 - 1) * dh) / 360 + 1) % 1, Math.min(1, _hsl.s * k(ds)), Math.min(0.97, _hsl.l * k(dv)));
  return "#" + _jc.getHexString();
};

// ---------------- HD painters (textures.md 5.1, from compare/textures/proto/paint_recipe.ts) ----------------
type R = () => number;
type G = CanvasRenderingContext2D;
const U = (r: R, a: number, b: number) => a + (b - a) * r();
const TAU = Math.PI * 2;

/** run fn at x and again one tile over when [x, x + w] crosses the left / right edge (seamless repeat in x) */
const wrapX = (W: number, x: number, w: number, fn: (x: number) => void) => {
  fn(x);
  if (x + w > W) fn(x - W);
  if (x < 0) fn(x + W);
};
/** same for a scattered mark of radius rad, in x and y */
const wrap2 = (W: number, H: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  for (const ox of [0, -W, W]) for (const oy of [0, -H, H]) {
    const X = x + ox, Y = y + oy;
    if (X + rad > 0 && X - rad < W && Y + rad > 0 && Y - rad < H) fn(X, Y);
  }
};
/** rounded-rectangle path */
const rr = (g: G, x: number, y: number, w: number, h: number, k: number) => {
  k = Math.max(0, Math.min(k, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k); g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k); g.arcTo(x, y, x + w, y, k);
  g.closePath();
};
/** soft elliptical blotch (radial gradient) stretched sx along x */
const blotch = (g: G, x: number, y: number, rad: number, sx: number, rgb: string, a: number) => {
  g.save(); g.translate(x, y); g.scale(sx, 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(-rad, -rad, rad * 2, rad * 2);
  g.restore();
};
/** long, soft wood-grain stroke along +x; random offsets drawn once so the wrapped copy matches */
const grain = (g: G, r: R, W: number, x: number, y: number, len: number, amp: number, lw: number, col: string) => {
  const n = Math.max(2, Math.round(len / 180));
  const dy = Array.from({ length: n + 1 }, () => (r() - 0.5) * 2 * amp);
  wrapX(W, x, len, (xx) => {
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round";
    g.beginPath(); g.moveTo(xx, y + dy[0]);
    for (let i = 1; i <= n; i++) {
      const x1 = xx + (len * i) / n;
      g.quadraticCurveTo(x1 - len / n / 2, y + (dy[i - 1] + dy[i]) / 2 + (i % 2 ? 0.3 : -0.3) * amp, x1, y + dy[i]);
    }
    g.stroke();
  });
};
/** nail / bolt head with a small painted glint (ref: dark dots with a white catch-light) */
const nail = (g: G, x: number, y: number, rad: number, col = "#3a2212") => {
  g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,240,215,0.55)"; g.beginPath(); g.arc(x - rad * 0.32, y - rad * 0.32, rad * 0.36, 0, TAU); g.fill();
};

// ---------------------------------------------------------------------------------------------------------------
/** wooden boards (2048 px = 2 m, 8 boards of 0.25 m): ochre / tan planks, grain, knots, nails, dark seams */
export const planksHD = () => ctex("planksHD", 2048, 2048, (g, r) => {
  const S = 2048, B = 256, GAP = 12;
  // albedo: under the current day light sunlit boards must then measure L* 72-80 on screen (ref #f8bb60, #dea04b,
  // #e28c29, #ffab49). MAT round 3: the merged grade lifts deck chroma ~x1.4 and hue ~+10 deg (the #eaa45a set landed
  // as lemon #f1b333, C* 70, h 80), so these are ochre / tan albedos (Lab L 61-69, C* 31-35, h 64-70): on screen
  // ochre wood about C* 45, h 72-78
  const fills = ["#c99669", "#c18e64", "#d19f6e", "#bb8961", "#c69466", "#c79b6f"];
  for (let i = 0; i < 8; i++) {
    const y = i * B;
    g.save(); g.beginPath(); g.rect(0, y, S, B); g.clip();
    g.fillStyle = jit(r, pick(r, fills), 0.05, 3, 0.08); g.fillRect(0, y, S, B);
    for (let k = 0; k < 5; k++) { // broad tone drift along the board, +-2 L*
      const x = U(r, 0, S), rad = U(r, 120, 260), light = r() > 0.5;
      wrapX(S, x - rad * 3, rad * 6, (xx) => blotch(g, xx + rad * 3, y + B / 2, rad, 3, light ? "255,236,200" : "110,60,25", light ? 0.12 : 0.1));
    }
    for (let k = 0; k < 18; k++) { // grain: long, thin, clearly visible; never as dark or as wide as a seam
      const light = r() < 0.25;
      grain(g, r, S, U(r, 0, S), y + U(r, 16, B - 16), U(r, 500, 1600), U(r, 2, 8), U(r, 2, 4),
        light ? "rgba(255,232,195,0.2)" : "rgba(95,48,18,0.3)");
    }
    for (let k = 0; k < 4; k++) // a few longer figure lines (darker, still thinner than a seam)
      grain(g, r, S, U(r, 0, S), y + U(r, 30, B - 30), U(r, 900, 1900), U(r, 4, 10), 3.5, "rgba(70,32,10,0.4)");
    if (r() < 0.35) { // knot, about one board in three
      const kx = U(r, 120, S - 120), ky = y + U(r, 70, B - 70), rx = U(r, 14, 24), ry = rx * U(r, 0.45, 0.6);
      g.strokeStyle = "rgba(140,82,36,0.20)"; g.lineWidth = 2;
      g.beginPath(); g.ellipse(kx, ky, rx * 2.3, ry * 1.9, 0, 0, TAU); g.stroke();
      g.fillStyle = "rgba(150,88,38,0.30)"; g.beginPath(); g.ellipse(kx, ky, rx, ry, 0, 0, TAU); g.fill();
      g.strokeStyle = "rgba(105,55,22,0.55)"; g.lineWidth = 2.5; g.stroke();
    }
    for (let k = 0; k < 3; k++) blotch(g, U(r, 100, S - 100), y + U(r, 40, B - 40), U(r, 40, 110), 1.6, "120,70,30", 0.06); // wear
    // board edges: sunlit lip on one side, soft darkening on the other
    g.fillStyle = "rgba(255,238,200,0.35)"; g.fillRect(0, y + GAP / 2 + 1, S, 3);
    const sh = g.createLinearGradient(0, y + B - GAP / 2 - 18, 0, y + B - GAP / 2);
    sh.addColorStop(0, "rgba(80,35,10,0)"); sh.addColorStop(1, "rgba(80,35,10,0.24)");
    g.fillStyle = sh; g.fillRect(0, y + B - GAP / 2 - 18, S, 18);
    // one butt joint per board per tile (staggered), nailed both sides; joist nails every 1 m
    const jx = U(r, 90, S - 90);
    g.fillStyle = "#24110a"; g.fillRect(jx - 3, y, 7, B);
    g.fillStyle = "rgba(255,238,200,0.30)"; g.fillRect(jx + 4, y, 2, B);
    for (const nx of [jx - 24, jx + 24]) for (const f of [0.28, 0.72]) nail(g, nx, y + B * f, 5, "#22140c");
    for (const nx of [512, 1536]) for (const f of [0.3, 0.7]) nail(g, nx + U(r, -3, 3), y + B * f, 5, "#22140c");
    g.restore();
  }
  for (let i = 0; i <= 8; i++) { // seams last: 12 px near-black core + 3 px soft rim (~5 % of the pitch: survives mips)
    g.fillStyle = "rgba(40,18,8,0.6)"; g.fillRect(0, i * B - GAP / 2 - 3, S, GAP + 6);
    g.fillStyle = "#1c0c05"; g.fillRect(0, i * B - GAP / 2, S, GAP);
  }
});

/** Cloud sprite, 1024 x 512, three painted tones and a flat soft bottom, no outline.
 *  Ref cumulus: lit crown #f1f6fc-#fbfafd (L* 96-98, warm in haze #faedd7), mid #dadae9-#e5edf9, lavender-blue
 *  underside #b6c1f2 / #c7cedf / #d1d4e1 (L* 79-86) mostly in the bottom third, edge ramp 8-20 px at 1080p
 *  (median ~10), no dark rim in 9 of 11 clouds. Ours: one flat tone (#f0f0f0 = 83 % of the cloud), 4-5 px edge.
 *  Golden: use CLOUD_GOLD instead of multiplying the white sprite by #ffd6b8 (a tint cannot make the cool belly). */
export const CLOUD_DAY = { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" };
export const CLOUD_GOLD = { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" };
export const cloudHD = (seed: number, pal = CLOUD_DAY) => ctex(`cloudHD_${pal.lit}_${seed}`, 1024, 512, (g) => {
  const r = rng(seed * 7919 + 17); // own seed: ctex keys of equal length would otherwise share shapes
  const W = 1024, H = 512, base = 400;
  const n = 6 + Math.floor(r() * 4), lobes: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < n; i++) { // main row, biggest in the middle
    const t = (i + 0.5) / n, rad = (60 + 110 * Math.sin(Math.PI * t) ** 0.8) * U(r, 0.75, 1.15);
    lobes.push({ x: 150 + t * 724 + U(r, -30, 30), y: base - rad * U(r, 0.35, 0.65), r: rad });
  }
  for (let i = 0; i < Math.floor(n / 2); i++) { // crown
    const t = U(r, 0.25, 0.75), rad = U(r, 60, 110);
    lobes.push({ x: 150 + t * 724, y: base - 150 - rad * U(r, 0.3, 0.7), r: rad });
  }
  const layer = (dx: number, dy: number, k: number, col: string, blur: number) => {
    g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = col; g.beginPath();
    for (const l of lobes) { const x = l.x + dx * l.r, y = l.y + dy * l.r; g.moveTo(x + l.r * k, y); g.arc(x, y, l.r * k, 0, TAU); }
    g.fill(); g.restore();
  };
  layer(0, 0, 1.0, pal.shade, 6);         // silhouette in the underside tone
  layer(-0.04, -0.12, 0.9, pal.mid, 8);   // mid band
  layer(-0.1, -0.26, 0.72, pal.lit, 10);  // sunlit crown, offset up-left
  g.globalCompositeOperation = "destination-in"; // flat, soft bottom
  const m = g.createLinearGradient(0, base - 18, 0, base + 6);
  m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = m; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
});

const seamLine = (g: G, x0: number, y0: number, x1: number, y1: number, w = 2, a = 0.35, rgb = "40,30,40") => {
  g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
};
const rivetRow = (g: G, x0: number, y0: number, x1: number, y1: number, step: number, rad = 2.2) => {
  const n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / step));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    g.fillStyle = "rgba(60,55,65,0.45)"; g.beginPath(); g.arc(x, y + 0.6, rad, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(x - 0.5, y - 0.5, rad * 0.55, 0, TAU); g.fill();
  }
};
const speckle = (g: G, r: R, W: number, H: number, n: number, cols: string[], r0: number, r1: number) => {
  for (let i = 0; i < n; i++) {
    const x = U(r, 0, W), y = U(r, 0, H), rad = U(r, r0, r1);
    g.fillStyle = pick(r, cols); wrap2(W, H, x, y, rad, (xx, yy) => { g.beginPath(); g.arc(xx, yy, rad, 0, TAU); g.fill(); });
  }
};

/** corrugated quonset metal (512 px = 2 m): silver-grey ribs along canvas x, weathering */
export const corrugatedHD = (base = "#a9adb0") => ctex("corrHD" + base, 512, 512, (g, r) => {
  const S = 512, P = 32;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += P) {
    const lg = g.createLinearGradient(x, 0, x + P, 0);
    lg.addColorStop(0, "rgba(255,255,255,0.22)"); lg.addColorStop(0.45, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(40,45,55,0.28)");
    g.fillStyle = lg; g.fillRect(x, 0, P, S);
  }
  for (let y = 0; y < S; y += 256) seamLine(g, 0, y + 1, S, y + 1, 3, 0.3);
  for (let i = 0; i < 12; i++) blotch(g, U(r, 0, S), U(r, 0, S), U(r, 40, 120), 1, r() > 0.6 ? "150,100,70" : "80,85,90", 0.12);
});
// ---------------- sets look pass: shared painters (textures.md 3.0, ink.md 3.2, world.md 3.3) ----------------
const FONT = {
  slab: "'DejaVu Serif', 'Bitstream Charter', Georgia, serif",
  stencil: "'Inter Display', 'DejaVu Sans', Arial, sans-serif",
  script: "Caladea, 'DejaVu Serif', serif",
  plate: "'DejaVu Sans', Arial, sans-serif",
};
export type SignStyle = keyof typeof FONT;
const hexRgb = (hex: string, k = 1) => { const c = new THREE.Color(hex); return `${Math.round(Math.min(1, c.r * k) * 255)},${Math.round(Math.min(1, c.g * k) * 255)},${Math.round(Math.min(1, c.b * k) * 255)}`; };
/** Tinted-dark detail line, the reference's thin line weight: local colour x 0.40, +-10 % width, round caps (ink.md 3.2) */
export function detailLine(g: G, pts: [number, number][], base: string, lw: number, r: R, a = 0.85, k = 0.4) {
  g.strokeStyle = `rgba(${hexRgb(base, k)},${a})`;
  g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = lw * (0.9 + 0.2 * r());
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
}
/** lit lip next to a seam (+5 L*) */
const lip = (g: G, x0: number, y0: number, x1: number, y1: number, lw: number, a = 0.22) => {
  g.strokeStyle = `rgba(255,250,236,${a})`; g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
};
/** three octaves of value variation (textures.md 3.0): O1 broad drift, O2 patches, O3 dabs/speckle. ppm = px per metre */
const octaves = (g: G, r: R, W: number, H: number, ppm: number, light: string, dark: string, k = 1) => {
  const area = (W / ppm) * (H / ppm);
  const n1 = Math.max(3, Math.min(24, Math.round(area / 3))), n2 = Math.max(10, Math.min(260, Math.round(area * 4))), n3 = Math.min(26000, Math.round(area * 2600));
  for (let i = 0; i < n1; i++) { const x = U(r, 0, W), y = U(r, 0, H), rad = Math.min(W, H) * 0.45 > U(r, 0.8, 2.5) * ppm ? U(r, 0.8, 2.5) * ppm : Math.min(W, H) * U(r, 0.2, 0.45), l = r() > 0.5; wrap2(W, H, x, y, rad * 1.5, (xx, yy) => blotch(g, xx, yy, rad, 1.5, l ? light : dark, U(r, 0.1, 0.16) * k)); }
  for (let i = 0; i < n2; i++) { const x = U(r, 0, W), y = U(r, 0, H), rad = U(r, 0.15, 0.5) * ppm, l = r() > 0.5; wrap2(W, H, x, y, rad * 1.3, (xx, yy) => blotch(g, xx, yy, rad, 1.3, l ? light : dark, U(r, 0.08, 0.12) * k)); }
  for (let i = 0; i < n3; i++) { const x = U(r, 0, W), y = U(r, 0, H), rad = Math.max(0.6, U(r, 0.005, 0.02) * ppm), l = r() > 0.5; g.fillStyle = `rgba(${l ? light : dark},${(U(r, 0.12, 0.22) * k).toFixed(3)})`; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); }
};
/** draw text fitted into a box (cx, cy centre, max width mw, cap height capPx), with a dark outline + offset shadow */
export const drawText = (g: G, text: string, cx: number, cy: number, mw: number, capPx: number, o: { fg: string; style?: SignStyle; stroke?: string; shadow?: string; italic?: boolean; track?: number }) => {
  const st = o.style ?? "slab", px = capPx / 0.72;
  g.save();
  g.font = `${o.italic ? "italic " : ""}bold ${px}px ${FONT[st]}`;
  g.textAlign = "center"; g.textBaseline = "middle";
  const track = o.track ?? (st === "stencil" ? 0.08 : 0.03);
  const chars = [...text], ws = chars.map((c) => g.measureText(c).width), tw = ws.reduce((a, b) => a + b, 0) + track * px * (chars.length - 1);
  const sx = Math.min(1, mw / tw);
  g.translate(cx, cy + capPx * 0.03); g.scale(sx, 1);
  const pass = (dx: number, dy: number, fill: string | null, stroke: string | null, lw: number) => {
    let x = -tw / 2;
    chars.forEach((c, i) => {
      const xc = x + ws[i] / 2;
      if (stroke) { g.lineJoin = "round"; g.strokeStyle = stroke; g.lineWidth = lw; g.strokeText(c, xc + dx, dy); }
      if (fill) { g.fillStyle = fill; g.fillText(c, xc + dx, dy); }
      x += ws[i] + track * px;
    });
  };
  if (o.shadow) pass(capPx * 0.035, capPx * 0.035, o.shadow, o.shadow, capPx * 0.05);
  if (o.stroke) pass(0, 0, null, o.stroke, capPx * 0.06);
  pass(0, 0, o.fg, null, 0);
  g.restore();
};
/** sign board texture (world.md 3.3): board fill, inner border at 6 % h, ink outline 3 % h, text cap 62 % h with an
 *  outline and an offset shadow, light wear. bg null = transparent decal. sub = smaller second line. */
export const signTex = (key: string, text: string, W: number, H: number, o: { bg: string | null; fg: string; style?: SignStyle; border?: string | null; sub?: string; subFg?: string; cap?: number; stroke?: string; italic?: boolean }) =>
  ctex("sign_" + key, W, H, (g, r) => {
    if (o.bg) {
      g.fillStyle = o.bg; g.fillRect(0, 0, W, H);
      octaves(g, r, W, H, H / 1.0, "255,250,235", "60,45,35", 0.5);
      if (o.border !== null) {
        g.strokeStyle = o.border ?? `rgba(${hexRgb(o.bg, 0.55)},0.9)`; g.lineWidth = H * 0.035; rr(g, H * 0.06, H * 0.06, W - H * 0.12, H - H * 0.12, H * 0.05); g.stroke();
        g.strokeStyle = "rgba(34,31,46,0.9)"; g.lineWidth = H * 0.03; g.strokeRect(H * 0.015, H * 0.015, W - H * 0.03, H - H * 0.03);
      }
    }
    const cap = (o.cap ?? (o.sub ? 0.42 : 0.62)) * H, cy = o.sub ? H * 0.4 : H * 0.5;
    drawText(g, text, W / 2, cy, W * 0.88, cap, { fg: o.fg, style: o.style, stroke: o.stroke ?? (o.bg ? `rgba(${hexRgb(o.bg, 0.45)},0.9)` : undefined), shadow: o.bg ? `rgba(${hexRgb(o.bg, 0.7)},0.8)` : undefined, italic: o.italic });
    if (o.sub) drawText(g, o.sub, W / 2, H * 0.76, W * 0.86, H * 0.17, { fg: o.subFg ?? o.fg, style: "stencil" });
    if (o.bg) for (let i = 0; i < 5; i++) blotch(g, U(r, 0, W), U(r, 0, H), U(r, 0.1, 0.3) * H, 2, "90,70,50", 0.06);
  });
/** clapboard siding (512 px = 2 m, 0.2 m boards): pastel, lit board lip, dark shadow line under each lip, 3 octaves,
 *  vertical butt joints, nail dots */
export const sidingHD = (col: string) => ctex("sidingHD2" + col, 512, 512, (g, r) => {
  const S = 512, B = 51.2;
  g.fillStyle = col; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 10; i++) {
    const y = i * B, lg = g.createLinearGradient(0, y, 0, y + B);
    lg.addColorStop(0, "rgba(255,255,255,0.16)"); lg.addColorStop(0.7, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(60,40,40,0.14)");
    g.fillStyle = lg; g.fillRect(0, y, S, B);
    detailLine(g, [[0, y + B - 2], [S, y + B - 2]], col, 2.6, r, 0.85, 0.45);
    const jx = U(r, 0, S); detailLine(g, [[jx, y + 2], [jx, y + B - 3]], col, 1.4, r, 0.6, 0.55);
  }
  octaves(g, r, S, S, 256, "255,252,244", "120,100,90", 0.6);
});

// =================================================================================================================
// EMU SHORT painters (Western Australian wheat belt, 1932). Same conventions: painted seams are dark TINTS, never pure
// black (the world ink pass draws silhouettes), three value octaves on every big surface, sizes in px per metre.
// =================================================================================================================
/** wheat canopy seen from above / at a grazing angle (1024 px = 3 m): golden field of ear dabs, lighter crests, darker
 *  troughs between rows, a few green-gold stalks. The surface sits ~0.9 m up on a slab (build.ts wheatField). */
export const wheatTopHD = () => ctex("wheatTopHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#d6a240"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 340, "255,226,140", "150,95,30", 1.3);
  for (let i = 0; i < 4200; i++) { // ears: short tilted ellipses, light top, dark under
    const x = U(r, 0, S), y = U(r, 0, S), a = U(r, -0.5, 0.5) - Math.PI / 2, l = U(r, 9, 16);
    const c = pick(r, ["#f2c766", "#e8b24e", "#c98b2c", "#f6d888", "#b97d26"]);
    wrap2(S, S, x, y, l, (xx, yy) => {
      g.save(); g.translate(xx, yy); g.rotate(a);
      g.fillStyle = "rgba(110,60,15,0.35)"; g.beginPath(); g.ellipse(1.5, 2, l * 0.55, l * 0.22, 0, 0, TAU); g.fill();
      g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, l * 0.5, l * 0.2, 0, 0, TAU); g.fill();
      g.restore();
    });
  }
  for (let i = 0; i < 700; i++) { // awns: fine light hairs
    const x = U(r, 0, S), y = U(r, 0, S);
    g.strokeStyle = "rgba(255,236,170,0.5)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + U(r, -6, 6), y - U(r, 8, 16)); g.stroke();
  }
});
/** vertical wheat wall (1024 x 512 = 3 m along x 1.5 m up, ground at the bottom): dense stalks, ears on top, dark base */
export const wheatSideHD = () => ctex("wheatSideHD", 1024, 512, (g, r) => {
  const W = 1024, H = 512;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#e2ad4a"); bg.addColorStop(0.35, "#c98f34"); bg.addColorStop(1, "#7a5224");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 520; i++) {
    const x = U(r, 0, W), lean = U(r, -14, 14), top = U(r, 10, 120), c = pick(r, ["#e9b85a", "#d29a3e", "#f1ca72", "#b98030"]);
    wrapX(W, x - 20, 40, (xx) => {
      g.strokeStyle = `rgba(90,55,20,0.45)`; g.lineWidth = 3.4; g.beginPath(); g.moveTo(xx, H); g.quadraticCurveTo(xx + lean * 0.3, (H + top) / 2, xx + lean, top + 30); g.stroke();
      g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(xx, H); g.quadraticCurveTo(xx + lean * 0.3, (H + top) / 2, xx + lean, top + 30); g.stroke();
      g.fillStyle = c; g.strokeStyle = "rgba(110,60,15,0.6)"; g.lineWidth = 1.4;
      g.beginPath(); g.ellipse(xx + lean, top + 14, 5, 17, lean * 0.02, 0, TAU); g.fill(); g.stroke();
    });
  }
  const sh = g.createLinearGradient(0, H * 0.55, 0, H); sh.addColorStop(0, "rgba(70,40,20,0)"); sh.addColorStop(1, "rgba(70,40,20,0.5)");
  g.fillStyle = sh; g.fillRect(0, H * 0.55, W, H * 0.45);
});
/** wheat clump card with alpha (256 x 512 = 0.55 m wide x 1.2 m up): 9-12 stalks with bearded ears, soft brown edge
 *  tint on every ear (cards carry their own dark line: they live on the NOINK layer) */
export const wheatCardTex = (k: number) => ctex("wheatCard" + k, 256, 512, (g, r0) => {
  const r = rng(k * 97 + 13), W = 256, H = 512; void r0;
  const n = 9 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const x0 = U(r, 60, 196), lean = U(r, -46, 46), top = U(r, 40, 170), c = pick(r, ["#f0c262", "#e3ad48", "#f6d27e", "#d39a3a"]);
    const tx = x0 + lean, ty = top;
    g.lineCap = "round";
    g.strokeStyle = "rgba(96,58,22,0.85)"; g.lineWidth = 6; g.beginPath(); g.moveTo(x0, H); g.quadraticCurveTo(x0 + lean * 0.2, (H + ty) / 2, tx, ty + 40); g.stroke();
    g.strokeStyle = pick(r, ["#d8a648", "#c99a44", "#b7a050"]); g.lineWidth = 3; g.beginPath(); g.moveTo(x0, H); g.quadraticCurveTo(x0 + lean * 0.2, (H + ty) / 2, tx, ty + 40); g.stroke();
    const ang = Math.atan2(lean, H - ty) * 0.8;
    g.save(); g.translate(tx, ty + 30); g.rotate(ang);
    for (let a = 0; a < 7; a++) { g.strokeStyle = "rgba(250,225,160,0.85)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo((a % 2 ? 6 : -6), -a * 7); g.lineTo((a % 2 ? 16 : -16), -a * 7 - 26); g.stroke(); }
    for (let s = 0; s < 6; s++) { // grains stacked up the ear, alternating sides
      const y = -s * 8, x = s % 2 ? 4 : -4;
      g.fillStyle = "rgba(100,55,18,0.9)"; g.beginPath(); g.ellipse(x, y, 8, 11, s % 2 ? 0.35 : -0.35, 0, TAU); g.fill();
      g.fillStyle = c; g.beginPath(); g.ellipse(x, y - 0.5, 6.4, 9.4, s % 2 ? 0.35 : -0.35, 0, TAU); g.fill();
    }
    g.restore();
  }
});
/** harvested stubble paddock (1024 px = 4 m): straw ground, rows of short cut stems with shadows, red soil between */
export const stubbleHD = () => ctex("stubbleHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#cfae6c"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "250,228,170", "150,85,40", 1.3);
  for (let row = 0; row < 16; row++) { // drill rows every 0.25 m
    const y0 = row * 64 + 32;
    g.fillStyle = "rgba(160,80,40,0.18)"; g.fillRect(0, y0 + 8, S, 12);
    for (let i = 0; i < 150; i++) {
      const x = U(r, 0, S), y = y0 + U(r, -10, 10), h = U(r, 6, 14);
      g.fillStyle = "rgba(110,60,25,0.35)"; g.fillRect(x + 1, y + 1, 4, 5);
      g.fillStyle = pick(r, ["#ecd08c", "#f4dc9c", "#d9b46a", "#c99a52"]); g.fillRect(x, y - h, 3, h);
    }
  }
  speckle(g, r, S, S, 500, ["rgba(170,90,45,0.4)", "rgba(250,240,200,0.5)"], 1.5, 3.5);
});
/** red-orange outback dirt (1024 px = 4 m): pebbles, cracks, wheel-rut streaks along canvas x */
export const dirtHD = (key = "dirtHD", base = "#bf6332") => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "250,180,120", "110,40,20", 1.4);
  for (let i = 0; i < 40; i++) { const y = U(r, 0, S), x = U(r, 0, S), l = U(r, 120, 420); detailLine(g, [[x, y], [x + l * 0.5, y + U(r, -5, 5)], [x + l, y + U(r, -4, 4)]], base, U(r, 2, 5), r, 0.35, 0.65); }
  for (let i = 0; i < 26; i++) { // dry cracks
    let x = U(r, 0, S), y = U(r, 0, S); const pts: [number, number][] = [[x, y]];
    for (let k = 0; k < 5; k++) { x += U(r, -30, 30); y += U(r, -30, 30); pts.push([x, y]); }
    detailLine(g, pts, base, 1.6, r, 0.5, 0.45);
  }
  speckle(g, r, S, S, 900, ["rgba(240,190,140,0.7)", "rgba(90,35,20,0.5)", "rgba(220,210,190,0.6)"], 1.5, 5);
});
/** dry paddock grass (1024 px = 4 m): tan / olive tufts over red soil patches */
export const paddockHD = () => ctex("paddockHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#c2a464"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "245,225,160", "120,80,35", 1.3);
  for (let i = 0; i < 26; i++) wrap2(S, S, U(r, 0, S), U(r, 0, S), 90, (x, y) => blotch(g, x, y, U(r, 40, 90), 1.6, "185,95,50", 0.35));
  g.lineCap = "round";
  for (let i = 0; i < 3200; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), l = U(r, 6, 14);
    g.strokeStyle = pick(r, ["#a89656", "#d8c07c", "#8f8a4e", "#e2cc8a", "#9c7a44"]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + U(r, -4, 4), y - l); g.stroke();
  }
});
/** wet mud bank with emu footprints (1024 px = 4 m) */
export const mudHD = () => ctex("mudHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#8a5c3a"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "200,150,105", "60,35,20", 1.5);
  for (let i = 0; i < 70; i++) { // three-toed prints
    const x = U(r, 30, S - 30), y = U(r, 30, S - 30), a = U(r, 0, TAU);
    g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = "rgba(55,30,18,0.55)"; g.lineWidth = 4; g.lineCap = "round";
    for (const d of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(d) * 22, -Math.cos(d) * 22); g.stroke(); }
    g.restore();
  }
  speckle(g, r, S, S, 300, ["rgba(220,180,140,0.5)", "rgba(50,30,20,0.4)"], 1.5, 4);
});
/** brown farm-dam water (1024 px = 8 m): olive-brown, lighter sky streaks, ripple rings, a few floating feathers */
export const damWaterHD = () => ctex("damWaterHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#86704a"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 128, "200,190,150", "70,55,35", 1.2);
  for (let i = 0; i < 90; i++) { const x = U(r, 0, S), y = U(r, 0, S), l = U(r, 40, 160); g.strokeStyle = `rgba(225,215,180,${U(r, 0.2, 0.45)})`; g.lineWidth = U(r, 2, 4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + U(r, -3, 3)); g.stroke(); }
  for (let i = 0; i < 22; i++) { const x = U(r, 0, S), y = U(r, 0, S); g.strokeStyle = "rgba(230,220,190,0.35)"; g.lineWidth = 2.5; for (const k of [1, 1.8]) { g.beginPath(); g.ellipse(x, y, 16 * k, 7 * k, 0, 0, TAU); g.stroke(); } }
});
/** ghost-gum bark (256 x 512 = around x 3 m up): cream-white with salmon / grey peeling patches and long streaks */
export const gumBarkHD = () => ctex("gumBarkHD", 256, 512, (g, r) => {
  const W = 256, H = 512;
  g.fillStyle = "#e6dfcf"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) wrap2(W, H, U(r, 0, W), U(r, 0, H), 40, (x, y) => blotch(g, x, y, U(r, 14, 40), 0.5, pick(r, ["200,150,120", "150,150,140", "230,200,170"]), 0.45));
  for (let i = 0; i < 40; i++) { const x = U(r, 0, W), y = U(r, 0, H); detailLine(g, [[x, y], [x + U(r, -4, 4), y + U(r, 40, 120)]], "#e6dfcf", 1.6, r, 0.45, 0.6); }
});
/** eucalyptus foliage (256 x 128 on a unit sphere): grey-green, sage dabs on the crown, olive clumps below */
export const gumLeafHD = (k: number) => ctex("gumLeafHD" + k, 256, 128, (g, r0) => {
  const r = rng(k * 31 + 7); void r0;
  const base = ["#7e9a78", "#869e7c", "#73906f"][k % 3];
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#a9bd98"); gr.addColorStop(0.4, base); gr.addColorStop(1, "#56704f");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 70; i++) {
    const x = U(r, 0, 256), y = U(r, 6, 120), rad = U(r, 4, 10), light = y < 60 ? r() < 0.7 : r() < 0.2;
    for (const ox of [-256, 0, 256]) { g.strokeStyle = light ? "rgba(220,235,200,0.35)" : "rgba(40,60,40,0.3)"; g.lineWidth = 2.4; g.lineCap = "round"; g.beginPath(); g.arc(x + ox, y + rad * 0.6, rad, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  }
});
/** tent canvas (512 px = 2 m): cream duck, vertical seams, weave, a dusty hem */
export const canvasHD = (base = "#e6d8b8") => ctex("canvasHD" + base, 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 3) { g.fillStyle = `rgba(120,100,70,${0.04 + 0.05 * r()})`; g.fillRect(0, y, S, 1); }
  octaves(g, r, S, S, 256, "255,250,230", "120,95,60", 0.9);
  for (const x of [0, 256]) { detailLine(g, [[x + 2, 0], [x + 2, S]], base, 3, r, 0.7, 0.55); for (let y = 6; y < S; y += 12) detailLine(g, [[x - 4, y], [x + 6, y + 4]], base, 1.2, r, 0.5, 0.55); }
  const bg = g.createLinearGradient(0, S, 0, S * 0.75); bg.addColorStop(0, "rgba(150,80,40,0.4)"); bg.addColorStop(1, "rgba(150,80,40,0)"); g.fillStyle = bg; g.fillRect(0, S * 0.75, S, S * 0.25);
});
/** hessian sandbag cloth (512 px = 1 m) */
export const hessianHD = () => ctex("hessianHD", 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = "#c9a874"; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 5) { g.fillStyle = `rgba(110,85,50,${0.08 + 0.07 * r()})`; g.fillRect(0, y, S, 2); }
  for (let x = 0; x < S; x += 5) { g.fillStyle = `rgba(245,230,195,${0.05 + 0.06 * r()})`; g.fillRect(x, 0, 2, S); }
  octaves(g, r, S, S, 400, "240,225,185", "100,75,45", 1);
});
/** wooden .303 ammunition box face (512 x 320 = 0.8 m x 0.5 m): pine boards, darker end battens, rope handle shadow,
 *  a black ".303" stencil (allowed: no words) and a broad-arrow mark */
export const crateHD = () => ctex("crateHD", 512, 320, (g, r) => {
  const W = 512, H = 320;
  const fills = ["#c79a5c", "#bd9054", "#cfa366"];
  for (let i = 0; i < 4; i++) {
    const y = i * 80; g.fillStyle = jit(r, pick(r, fills), 0.05, 3, 0.08); g.fillRect(0, y, W, 80);
    for (let k = 0; k < 6; k++) grain(g, r, W, U(r, 0, W), y + U(r, 10, 70), U(r, 150, 400), U(r, 1, 4), 2, "rgba(110,60,25,0.3)");
    g.fillStyle = "rgba(70,35,12,0.55)"; g.fillRect(0, y + 77, W, 4);
  }
  for (const x of [0, W - 56]) { g.fillStyle = "#a87842"; g.fillRect(x, 0, 56, H); g.fillStyle = "rgba(60,30,10,0.5)"; g.fillRect(x === 0 ? 54 : x, 0, 3, H); for (const y of [30, H - 30]) nail(g, x + 28, y, 6); }
  drawText(g, ".303", W / 2, H * 0.47, W * 0.5, H * 0.34, { fg: "rgba(28,24,22,0.92)", style: "stencil" });
  g.fillStyle = "rgba(28,24,22,0.85)"; // broad arrow
  g.beginPath(); g.moveTo(W / 2, H * 0.72); g.lineTo(W / 2 - 22, H * 0.86); g.lineTo(W / 2 - 14, H * 0.86); g.lineTo(W / 2, H * 0.78); g.lineTo(W / 2 + 14, H * 0.86); g.lineTo(W / 2 + 22, H * 0.86); g.fill();
  g.fillRect(W / 2 - 3, H * 0.75, 6, H * 0.15);
  octaves(g, r, W, H, 640, "255,240,210", "90,50,20", 0.7);
});
/** heap of spent .303 brass (1024 px = 2 m): casing ends + sides, bright glints, dark primers */
export const brassHD = () => ctex("brassHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#8a5f1e"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), a = U(r, 0, TAU), l = U(r, 22, 32);
    wrap2(S, S, x, y, l, (xx, yy) => {
      g.save(); g.translate(xx, yy); g.rotate(a);
      if (r() < 0.3) { // end-on: rim + primer
        g.fillStyle = "#d9a840"; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill();
        g.fillStyle = "#6a4a1a"; g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fill();
      } else {
        g.fillStyle = "rgba(70,40,10,0.6)"; g.fillRect(-l / 2 + 2, -3, l, 9);
        g.fillStyle = pick(r, ["#e0b048", "#c9962e", "#f0c860", "#b9862a"]); g.fillRect(-l / 2, -5, l, 9);
        g.fillStyle = "rgba(255,245,200,0.75)"; g.fillRect(-l / 2 + 2, -4, l - 6, 2.2);
      }
      g.restore();
    });
  }
});
/** tally board (1024 x 640 = 1.6 m x 1 m): dark painted board, chalk 5-bar gates in rows; no numbers, no words */
export const tallyHD = () => ctex("tallyHD", 1024, 640, (g, r) => {
  const W = 1024, H = 640;
  g.fillStyle = "#2f3a34"; g.fillRect(0, 0, W, H);
  octaves(g, r, W, H, 640, "120,140,130", "10,20,15", 0.9);
  g.lineCap = "round";
  for (let row = 0; row < 7; row++) for (let k = 0; k < 9; k++) {
    if (row === 6 && k > 5) continue;
    const x0 = 60 + k * 104, y0 = 52 + row * 82;
    g.strokeStyle = "rgba(244,240,226,0.92)"; g.lineWidth = 6;
    for (let s = 0; s < 4; s++) { const x = x0 + s * 16 + U(r, -2, 2); g.beginPath(); g.moveTo(x, y0 + U(r, -3, 3)); g.lineTo(x + U(r, -3, 3), y0 + 56); g.stroke(); }
    g.beginPath(); g.moveTo(x0 - 10, y0 + 48); g.lineTo(x0 + 62, y0 + 6); g.stroke();
  }
  g.strokeStyle = "rgba(160,110,60,1)"; g.lineWidth = 22; g.strokeRect(11, 11, W - 22, H - 22);
});
/** parade ground: packed pale red earth with faint rake / drill lines (1024 px = 4 m) */
export const paradeHD = () => ctex("paradeHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#d29a6c"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "250,215,180", "130,70,40", 1.0);
  for (let y = 0; y < S; y += 32) detailLine(g, [[0, y + U(r, -2, 2)], [S, y + U(r, -2, 2)]], "#d29a6c", 1.4, r, 0.25, 0.7);
  speckle(g, r, S, S, 500, ["rgba(250,230,200,0.6)", "rgba(120,60,30,0.4)"], 1.5, 3.5);
});
/** army truck khaki paint (512 px = 2 m): olive-khaki, soft dust bottom, chips */
export const khakiHD = () => ctex("khakiHD", 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = "#7f7a48"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "220,215,160", "50,48,25", 1.0);
  const dg = g.createLinearGradient(0, S, 0, S * 0.6); dg.addColorStop(0, "rgba(190,110,60,0.45)"); dg.addColorStop(1, "rgba(190,110,60,0)"); g.fillStyle = dg; g.fillRect(0, S * 0.6, S, S * 0.4);
  speckle(g, r, S, S, 120, ["rgba(60,55,35,0.5)", "rgba(230,220,180,0.4)"], 1, 3);
});
