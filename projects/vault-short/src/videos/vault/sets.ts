// The seven sets of "The Time Lock" (owner: sets): the moonlit street with the bank front, the bedroom, the bank hall at night
// (the great vault door), Sargent's workshop (the clocks and the mechanism), Morrison, Illinois, the street of banks, and the
// modern vault. buildSets() builds all of them once; world.ts shows one at a time and calls their ticks.
// CONTRACTS: buildSets(), SET_META, LAMPS, fgUpdate(), CLOCK (read by world.ts).
import * as THREE from "three";
import { SetRig, cached, M4, rbox, Batch, col, V, rod } from "./build";
import { SetName, FOREGROUND, SPOT } from "./story";
import { buildStreet } from "./s_street";
import { buildBank } from "./s_bank";
import { buildBedroom, buildWorkshop } from "./s_rooms";
import { buildPrairie, buildBankRow } from "./s_day";
import { buildModern } from "./s_modern";
import { brassM, goldM, steelD } from "./door";
import { cog } from "./mech";
import { woodM } from "./build";

export { CLOCK } from "./build";
export const SET_META: Record<SetName, { hazeK: number; indoor?: boolean; ceil?: number }> = {
  street: { hazeK: 1.2 }, bedroom: { hazeK: 1, indoor: true, ceil: 3.2 }, bank: { hazeK: 1, indoor: true, ceil: 6.2 },
  workshop: { hazeK: 1, indoor: true, ceil: 3.8 }, prairie: { hazeK: 2.0 }, bankrow: { hazeK: 1.6 }, modern: { hazeK: 1, indoor: true, ceil: 5.4 },
};
/** practical lamps per set (world.ts feeds them to its point lights): candles, lamps; `halo` = glow sprite size (m) */
export type Lamp = { p: [number, number, number]; I: number; halo: number; col?: string; d?: number };
export const LAMPS: Partial<Record<SetName, Lamp[]>> = {
  street: [{ p: [11.0, 4.6, SPOT.WIN], I: 9, halo: 0, col: "#ffb060", d: 0 }, { p: [4.3, 4.5, 3.8], I: 4.5, halo: 1.3, col: "#ffd9a0" }, { p: [4.3, 4.5, -13.2], I: 4, halo: 1.1, col: "#ffd9a0" }],
  bedroom: [{ p: [-2.85, 1.3, -1.4], I: 2.6, halo: 0.45, col: "#ffb55a" }],
  bank: [{ p: [-5.5, 1.5, 2.2], I: 2.4, halo: 0.4, col: "#ffb55a" }],
  workshop: [{ p: [-1.9, 1.75, -2.85], I: 2.6, halo: 0.45, col: "#ffc068" }, { p: [0.2, 2.85, 0.4], I: 3.2, halo: 0.4, col: "#ffc878" }],
  modern: [{ p: [0, 4.4, -1.5], I: 3.4, halo: 0, col: "#e0f0ff" }],
};

export const buildSets = (): Record<SetName, SetRig> => ({
  street: buildStreet(), bedroom: buildBedroom(), bank: buildBank(), workshop: buildWorkshop(), prairie: buildPrairie(), bankrow: buildBankRow(), modern: buildModern(),
});

// ---------------- foreground props (story.ts FOREGROUND: camera-space framing pieces, inked, blurred by the DOF) ----------------
const kits = new Map<string, THREE.Group>();
const kit = (name: string): THREE.Group => {
  let g = kits.get(name);
  if (g) return g;
  g = new THREE.Group();
  const b = new Batch();
  if (name === "bedpost") {
    b.add(rod(V(0, 0, 0), V(0, 2.2, 0), 0.08, 0.07, 10), woodM("#4a2a18"));
    b.add(cached("fgBall", () => new THREE.SphereGeometry(0.13, 12, 10)), goldM(), M4(0, 2.3, 0));
    b.add(rbox(0.22, 0.16, 0.22, 0.03), woodM("#4a2a18"), M4(0, 1.2, 0));
  } else if (name === "cogs") {
    for (const [x, y, r, t] of [[0, 0.0, 0.34, 14], [0.46, 0.2, 0.22, 10], [-0.32, 0.4, 0.18, 9]] as [number, number, number, number][]) { const c = cog(r, t, 0.1, x === 0 ? brassM() : x > 0 ? goldM() : steelD()); b.add(c.geometry, c.material as THREE.Material, M4(x, y, 0)); }
  }
  b.build(g, false); kits.set(name, g);
  return g;
};
const _p = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3();
/** called every frame by world.ts: shows the FOREGROUND entries active at frame f, placed in camera space */
export const fgUpdate = (root: THREE.Group, id: number, f: number, cam: THREE.PerspectiveCamera) => {
  void id;
  const active = FOREGROUND.filter((e) => f >= e.a && f < e.b);
  const have = new Map<number, THREE.Group>();
  root.children.forEach((c) => { c.visible = false; });
  active.forEach((e, i) => {
    let inst = root.children.find((c) => c.userData.slot === i && c.userData.kit === e.kit) as THREE.Group | undefined;
    if (!inst) { inst = kit(e.kit).clone(); inst.userData.slot = i; inst.userData.kit = e.kit; root.add(inst); }
    inst.visible = true;
    _r.setFromMatrixColumn(cam.matrixWorld, 0); _u.setFromMatrixColumn(cam.matrixWorld, 1); _f.setFromMatrixColumn(cam.matrixWorld, 2).multiplyScalar(-1);
    const [x, y, z] = e.pos;
    if (e.space === "world") _p.set(x, y, z); else _p.copy(cam.position).addScaledVector(_r, x).addScaledVector(_u, y).addScaledVector(_f, z);
    inst.position.copy(_p); inst.rotation.set(e.tilt ?? 0, e.yaw ?? 0, 0); inst.scale.setScalar(e.s ?? 1);
    have.set(i, inst);
  });
};
void col;
