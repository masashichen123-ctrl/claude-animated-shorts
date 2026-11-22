// The modern vault (set "modern", owner: sets): bright, clean, calm. A polished-steel back wall carrying a big chrome round
// door (a three-spoke wheel, a combination dial, a glowing blue ring), glossy white tiles, walls of safe-deposit boxes with
// brass keyholes, ceiling light panels and blue LED strips. Light "modern": cool white, soft blue shadows, crisp.
import * as THREE from "three";
import * as P from "./paint";
import { Batch, M4, rbox, rb, col, texM, glow, rod, cached, V, SetRig, quad, ground } from "./build";
import { SPOT } from "./story";
import { buildDoor, poseDoor, chromeM, brassM, steelL } from "./door";
import { wallPlate, gloss, blockM } from "./setkit";

export const buildModern = (): SetRig => {
  const group = new THREE.Group(), b = new Batch(), MD = SPOT.MD;
  const X0 = -6, X1 = 6, Z0 = MD[2], Z1 = 9, H = 5.4;
  const floor = gloss("modFloor", () => ({ map: P.tileHD(), color: "#ffffff", shininess: 90, specular: new THREE.Color("#a8b8d8") }));
  b.add(ground(X0, X1, Z0, Z1, 0, 2), floor);
  b.add(quad(V(X0, H, Z0), V(X1, H, Z0), V(X1, H, Z1), V(X0, H, Z1), 4, 4), col("#eef2f6"));
  // the steel wall with the door on it + the other three walls
  wallPlate(b, texM("modSteel", () => P.steelHD("#b4bece")), X0, X1, 0, H, [], 0.5, M4(0, 0, Z0, 0), 2);
  b.add(quad(V(X1, 0, Z1), V(X0, 0, Z1), V(X0, H, Z1), V(X1, H, Z1), 3, 2), col("#dfe6ee"));
  for (const sx of [-1, 1]) {
    const x = sx > 0 ? X1 : X0, nx = -sx;
    b.add(sx > 0 ? quad(V(x, 0, Z0), V(x, 0, Z1), V(x, H, Z1), V(x, H, Z0), 4, 2) : quad(V(x, 0, Z1), V(x, 0, Z0), V(x, H, Z0), V(x, H, Z1), 4, 2), col("#9aa6b8"));
    // safe-deposit boxes: a grid of small steel doors with brass keyholes
    const box = cached("sdBox", () => new THREE.BoxGeometry(0.04, 0.26, 0.34)), key = cached("sdKey", () => new THREE.CylinderGeometry(0.028, 0.028, 0.02, 8).rotateZ(Math.PI / 2));
    for (let j = 0; j < 12; j++) for (let k = 0; k < 28; k++) {
      const z = Z0 + 0.45 + k * 0.405, y = 0.3 + j * 0.34;
      if (z > Z1 - 0.3) continue;
      b.add(box, (j + k) % 5 === 0 ? chromeM() : steelL(), M4(x + nx * 0.05, y, z));
      b.add(key, brassM(), M4(x + nx * 0.08, y, z + 0.09));
    }
    // a blue LED strip along the foot of the boxes + a light panel row on the ceiling
    b.add(new THREE.PlaneGeometry(Z1 - Z0, 0.07).rotateY(sx > 0 ? -Math.PI / 2 : Math.PI / 2).translate(x + nx * 0.02, 0.12, (Z0 + Z1) / 2), glow("#6ad8ff", 2.2));
  }
  for (let z = Z0 + 2; z < Z1; z += 3.6) for (const x of [-3.6, 0, 3.6]) b.add(new THREE.PlaneGeometry(1.8, 0.9).rotateX(Math.PI / 2).translate(x, H - 0.02, z), glow("#f4f8ff", 1.6));
  // steel frame blocks around the door and a low step in front
  rb(b, chromeM(), -3.2, 3.2, 0.0, 0.14, Z0 + 0.1, Z0 + 1.2, 0.03);
  b.build(group, true);
  const door = buildDoor("modern");
  door.root.position.set(MD[0], MD[1], Z0 + 0.5); group.add(door.root);
  poseDoor(door, 0, 0.4, 0, 0);
  return { name: "modern", group, tick: (t) => poseDoor(door, 0, 0.4 + 0.0 * t, 0, t) };
};
void rod; void rbox; void cached; void blockM;
