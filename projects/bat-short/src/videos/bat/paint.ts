// Hand-painted look textures drawn on canvases (cached), owner: sets (with build.ts). Shared painters from the bridge /
// missile template (value octaves, tinted seams, blotches, sign lettering, clouds, corrugated iron, weatherboards,
// planks) plus the bat short's own set (bottom of the file): desert sand, sandstone strata, cave rock, concrete apron,
// the US flag, the white star insignia, the bat crate, wallpaper, wall tiles, the oval rug, shoji paper screens, model
// roof tiles, the bat-bomb drawing, the dusk window, hessian, canvas.
import * as THREE from "three";

export const rng = (seed: number) => {
  let s = Math.abs(Math.round(seed * 9301 + 49297)) % 233280 || 1;
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
// =================================================================================================================
// BAT SHORT painters
// =================================================================================================================
/** pale desert sand (1024 px = 4 m): warm ochre, wind ripples, pebbles, dry tufts of shadow */
export const sandHD = (key = "sandHD", base = "#d9a96a") => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "255,230,180", "150,90,45", 1.1);
  for (let i = 0; i < 26; i++) wrap2(S, S, U(r, 0, S), U(r, 0, S), 110, (x, y) => blotch(g, x, y, U(r, 50, 110), 1.8, "190,110,60", 0.22));
  for (let i = 0; i < 70; i++) { const y = U(r, 0, S), x = U(r, 0, S), l = U(r, 80, 260); detailLine(g, [[x, y], [x + l * 0.5, y + U(r, -8, 8)], [x + l, y + U(r, -5, 5)]], base, U(r, 1.5, 3), r, 0.28, 0.7); }
  speckle(g, r, S, S, 1400, ["rgba(255,240,205,0.7)", "rgba(120,70,40,0.5)", "rgba(200,170,140,0.6)"], 1.4, 4.5);
});
/** sandstone strata (1024 px = 8 m): horizontal bands of buff / rust / cream with cracks and ledges */
export const rockHD = (key = "rockHD", base = "#c98a58", pal = ["#d49a64", "#b9764a", "#e0b07c", "#c4824e", "#a96a44"], hb: [number, number] = [30, 110]) => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  let y = 0;
  while (y < S) {
    const h = U(r, hb[0], hb[1]), c = pick(r, pal);
    g.fillStyle = jit(r, c, 0.05, 3, 0.1); g.fillRect(0, y, S, h);
    detailLine(g, [[0, y + h], [S * 0.5, y + h + U(r, -3, 3)], [S, y + h]], c, U(r, 2, 4), r, 0.55, 0.45);
    y += h;
  }
  octaves(g, r, S, S, 128, "255,225,185", "90,45,25", 1.2);
  for (let i = 0; i < 50; i++) { let x = U(r, 0, S), yy = U(r, 0, S); const pts: [number, number][] = [[x, yy]]; for (let k = 0; k < 4; k++) { x += U(r, -14, 14); yy += U(r, 10, 40); pts.push([x, yy]); } detailLine(g, pts, base, 2.2, r, 0.5, 0.4); }
  speckle(g, r, S, S, 600, ["rgba(255,235,200,0.5)", "rgba(80,40,25,0.4)"], 1.5, 4);
});
/** pale concrete apron (1024 px = 6 m): expansion joints every 3 m, stains, tyre streaks */
export const concreteHD = () => ctex("concreteHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#cfc6b4"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 170, "250,245,232", "110,100,85", 0.9);
  for (let i = 0; i < 14; i++) wrap2(S, S, U(r, 0, S), U(r, 0, S), 90, (x, y) => blotch(g, x, y, U(r, 40, 90), 1.4, "120,105,85", 0.18));
  for (const k of [0, 512]) { detailLine(g, [[k + 2, 0], [k + 2, S]], "#cfc6b4", 3, r, 0.7, 0.45); detailLine(g, [[0, k + 2], [S, k + 2]], "#cfc6b4", 3, r, 0.7, 0.45); }
  speckle(g, r, S, S, 700, ["rgba(255,255,250,0.5)", "rgba(90,80,70,0.35)"], 1, 3);
});
/** the US flag (1024 x 540): 13 stripes, a blue canton with rows of white dots (no lettering) */
export const flagHD = () => ctex("flagHD", 1024, 540, (g) => {
  const W = 1024, H = 540, sh = H / 13;
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f6f2ea" : "#c8323a"; g.fillRect(0, i * sh, W, sh + 1); }
  g.fillStyle = "#2a3f7a"; g.fillRect(0, 0, W * 0.42, sh * 7);
  g.fillStyle = "#f6f2ea";
  for (let row = 0; row < 6; row++) for (let k = 0; k < 8; k++) { const x = 30 + k * 50 + (row % 2) * 25, y = 24 + row * 44; if (x < W * 0.42 - 16) { g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); } }
});
/** white star in a blue roundel (512 px), the aircraft insignia on the hangar */
export const starHD = () => ctex("starHD", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512);
  g.fillStyle = "#2a3f7a"; g.beginPath(); g.arc(256, 256, 240, 0, TAU); g.fill();
  g.fillStyle = "#f8f5ee"; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr2 = i % 2 ? 92 : 232; g.lineTo(256 + Math.cos(a) * rr2, 256 + Math.sin(a) * rr2); }
  g.closePath(); g.fill();
});
/** the bat crate's face (512 x 384 = 0.8 x 0.6 m): pine boards, rows of air holes, a stencilled arrow (no words) */
export const batCrateHD = () => ctex("batCrateHD", 512, 384, (g, r) => {
  const W = 512, H = 384;
  for (let i = 0; i < 4; i++) {
    const y = i * 96; g.fillStyle = jit(r, pick(r, ["#c79a5c", "#bd9054", "#cfa366"]), 0.05, 3, 0.08); g.fillRect(0, y, W, 96);
    for (let k = 0; k < 6; k++) grain(g, r, W, U(r, 0, W), y + U(r, 10, 86), U(r, 150, 400), U(r, 1, 4), 2, "rgba(110,60,25,0.3)");
    g.fillStyle = "rgba(70,35,12,0.55)"; g.fillRect(0, y + 93, W, 4);
  }
  for (const x of [0, W - 56]) { g.fillStyle = "#a87842"; g.fillRect(x, 0, 56, H); for (const y of [30, H - 30]) nail(g, x + 28, y, 6); }
  for (let row = 0; row < 2; row++) for (let k = 0; k < 7; k++) { g.fillStyle = "#2a1a12"; g.beginPath(); g.arc(110 + k * 49, 120 + row * 70, 11, 0, TAU); g.fill(); }
  g.fillStyle = "rgba(28,24,22,0.85)"; // stencilled "this side up" arrow
  g.beginPath(); g.moveTo(W / 2, 250); g.lineTo(W / 2 - 34, 300); g.lineTo(W / 2 - 12, 300); g.lineTo(W / 2 - 12, 350); g.lineTo(W / 2 + 12, 350); g.lineTo(W / 2 + 12, 300); g.lineTo(W / 2 + 34, 300); g.fill();
  octaves(g, r, W, H, 640, "255,240,210", "90,50,20", 0.7);
});
/** striped wallpaper (512 px = 1 m): soft vertical stripes with a small motif, a darker dado band at the bottom */
export const wallpaperHD = (key: string, base: string, stripe: string) => ctex("wallpaper" + key, 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += 64) { g.fillStyle = stripe; g.fillRect(x + 20, 0, 22, S); }
  for (let x = 0; x < S; x += 64) for (let y = 16; y < S; y += 64) { g.fillStyle = "rgba(255,250,235,0.35)"; g.beginPath(); g.arc(x + 52, y, 5, 0, TAU); g.fill(); }
  octaves(g, r, S, S, 512, "255,250,235", "90,60,40", 0.6);
});
/** white glazed wall tiles (512 px = 1.2 m) with grey grout and soft glints */
export const tileHD = (base = "#e6efe9") => ctex("tile" + base, 512, 512, (g, r) => {
  const S = 512, n = 8, t = S / n;
  g.fillStyle = "#9aa6a2"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { g.fillStyle = jit(r, base, 0.03, 4, 0.1); g.fillRect(i * t + 3, k * t + 3, t - 6, t - 6); g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(i * t + 8, k * t + 8, t * 0.3, 4); }
  octaves(g, r, S, S, 400, "255,255,255", "80,90,90", 0.5);
});
/** oval rug (1024 x 640): deep blue field, gold border, a central medallion (no seal, no words) */
export const rugHD = () => ctex("rugHD", 1024, 640, (g, r) => {
  g.clearRect(0, 0, 1024, 640);
  const ell = (rx: number, ry: number, c: string) => { g.fillStyle = c; g.beginPath(); g.ellipse(512, 320, rx, ry, 0, 0, TAU); g.fill(); };
  ell(508, 316, "#c9a24a"); ell(478, 288, "#24376a"); ell(440, 254, "#2c4280"); ell(130, 90, "#c9a24a"); ell(110, 72, "#24376a");
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; g.fillStyle = "#e6c870"; g.beginPath(); g.arc(512 + Math.cos(a) * 460, 320 + Math.sin(a) * 270, 7, 0, TAU); g.fill(); }
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * TAU) / 5; g.fillStyle = "#f2ead0"; g.beginPath(); g.arc(512 + Math.cos(a) * 52, 320 + Math.sin(a) * 34, 9, 0, TAU); g.fill(); }
  octaves(g, r, 1024, 640, 400, "255,240,210", "10,10,30", 0.5);
});
/** shoji paper screen (256 px): cream paper, dark wood lattice */
export const shojiHD = () => ctex("shojiHD", 256, 256, (g, r) => {
  g.fillStyle = "#f4ecd6"; g.fillRect(0, 0, 256, 256);
  octaves(g, r, 256, 256, 256, "255,252,240", "190,170,130", 0.5);
  g.fillStyle = "#5a3a24";
  for (let k = 0; k <= 4; k++) { g.fillRect(k * 62, 0, 8, 256); g.fillRect(0, k * 62, 256, 8); }
});
/** dark wavy roof tiles for the model houses (256 px) */
export const roofTileHD = () => ctex("roofTileHD", 256, 256, (g, r) => {
  g.fillStyle = "#4a4e5a"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { g.fillStyle = jit(r, "#5a606e", 0.08, 3, 0.1); g.beginPath(); g.ellipse(x + 16, y + 18, 15, 16, 0, Math.PI, TAU); g.fill(); g.fillStyle = "rgba(20,20,30,0.45)"; g.fillRect(x, y + 28, 32, 4); }
});
/** the inventor's drawing (512 x 384): a cream sheet with a pencil bat carrying a bomb, arrows and blobs (no words) */
export const drawingHD = () => ctex("drawingHD", 512, 384, (g, r) => {
  g.fillStyle = "#f6efdc"; g.fillRect(0, 0, 512, 384);
  octaves(g, r, 512, 384, 512, "255,252,240", "160,140,110", 0.5);
  g.strokeStyle = "#3a3448"; g.lineWidth = 5; g.lineCap = "round"; g.lineJoin = "round";
  const W = (pts: [number, number][]) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  g.beginPath(); g.ellipse(256, 170, 34, 40, 0, 0, TAU); g.stroke();                                // body
  W([[236, 136], [226, 92], [248, 126]]); W([[276, 136], [286, 92], [264, 126]]);                     // ears
  W([[224, 160], [150, 110], [120, 150], [140, 160], [130, 190], [170, 180], [226, 186]]);          // wings
  W([[288, 160], [362, 110], [392, 150], [372, 160], [382, 190], [342, 180], [286, 186]]);
  g.fillStyle = "#5a6a34"; g.fillRect(236, 206, 40, 20); g.strokeRect(236, 206, 40, 20);           // capsule
  W([[256, 226], [256, 300]]); W([[240, 284], [256, 304], [272, 284]]);                               // arrow down
  for (let k = 0; k < 4; k++) { g.strokeRect(150 + k * 56, 318, 40, 34); W([[146 + k * 56, 318], [170 + k * 56, 300], [194 + k * 56, 318]]); } // little houses
  g.lineWidth = 2; g.strokeStyle = "rgba(58,52,72,0.6)"; for (let k = 0; k < 6; k++) W([[30, 40 + k * 14], [100 - 8 * (k % 3), 40 + k * 14]]); // scribble lines (not letters)
});
/** office window at dusk (512 x 640): orange sky to lilac-blue, a grey city silhouette, venetian blind slats */
export const duskWindowHD = () => ctex("duskWindowHD", 512, 640, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, "#5a6ea8"); gr.addColorStop(0.45, "#e9a06a"); gr.addColorStop(0.8, "#ffc47a"); gr.addColorStop(1, "#ffd9a0");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
  g.fillStyle = "#4a4e66";
  for (let x = 0; x < 512;) { const w = U(r, 40, 90), h = U(r, 80, 220); g.fillRect(x, 640 - h, w - 6, h); x += w; }
  g.beginPath(); g.ellipse(300, 470, 60, 40, 0, Math.PI, TAU); g.fill(); g.fillRect(292, 380, 16, 60); // a dome
  for (let y = 0; y < 640; y += 40) { g.fillStyle = "rgba(240,232,214,0.85)"; g.fillRect(0, y, 512, 16); g.fillStyle = "rgba(90,70,60,0.35)"; g.fillRect(0, y + 16, 512, 3); }
});
/** hessian sandbag cloth (512 px = 1 m) */
export const hessianHD = () => ctex("hessianHD", 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = "#c9a874"; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 5) { g.fillStyle = `rgba(110,85,50,${0.08 + 0.07 * r()})`; g.fillRect(0, y, S, 2); }
  for (let x = 0; x < S; x += 5) { g.fillStyle = `rgba(245,230,195,${0.05 + 0.06 * r()})`; g.fillRect(x, 0, 2, S); }
  octaves(g, r, S, S, 400, "240,225,185", "100,75,45", 1);
});
/** olive drab paint (512 px = 2 m): the bomb casing / army kit: olive, chips, a little dust */
export const oliveHD = (key = "oliveHD", base = "#66713a") => ctex(key, 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "220,225,170", "40,45,20", 0.9);
  speckle(g, r, S, S, 140, ["rgba(40,40,25,0.5)", "rgba(230,225,190,0.4)"], 1, 3);
});
/** weathered grey-beige limestone (1024 px = 8 m): soft irregular ledges, blotches, cracks, lichen dabs */
export const limeHD = () => {
  const t = rockHD("limeHD", "#b7ab95", ["#bcb09a", "#aa9e88", "#c8bda8", "#a09582", "#b3a68e"], [90, 260]);
  return t;
};
/** riveted steel tank plating (1024 px = 4 m): pale silver plates, seams, rivet rows, soft rust streaks */
export const tankPlateHD = () => ctex("tankPlateHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#d6dadd"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "255,255,255", "90,95,100", 0.7);
  for (let k = 0; k < 4; k++) { g.fillStyle = "rgba(60,64,70,0.55)"; g.fillRect(0, k * 256, S, 5); g.fillRect(k * 256 + (k % 2) * 128, 0, 5, S); }
  for (let k = 0; k < 4; k++) for (let i = 0; i < 32; i++) { g.fillStyle = "rgba(70,74,80,0.7)"; g.beginPath(); g.arc(i * 32 + 16, k * 256 + 14, 4, 0, TAU); g.fill(); }
  for (let i = 0; i < 14; i++) { const x = U(r, 0, S), y = U(r, 0, S); const gr = g.createLinearGradient(x, y, x, y + 160); gr.addColorStop(0, "rgba(150,90,50,0.35)"); gr.addColorStop(1, "rgba(150,90,50,0)"); g.fillStyle = gr; g.fillRect(x - 6, y, 12, 160); }
});
/** money sack patch: a cream roundel with a big dark-green "$" symbol (512 px, transparent outside) */
export const dollarHD = () => ctex("dollarHD", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = "#efe6cc"; g.beginPath(); g.arc(128, 128, 116, 0, TAU); g.fill();
  g.fillStyle = "#2e5a3a"; g.font = "bold 190px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 128, 136);
});
