// Stylised two-tone lighting for every world material (lighting.md 9.2, world part): albedo x mix(shadeCol, litCol,
// sunTerm), sunTerm = real shadow-map visibility x a soft N.L terminator. The sun visibility is captured inside three's
// own light loop (LFB), so nothing is computed twice. Character cards (cardShade) live in the CHAR agent's file and
// can import LFB / CHAR from here; world.ts sets every uniform below once per frame from LIGHTS.
import * as THREE from "three";

export const TONE = {
  uLitCol: { value: new THREE.Vector3(1.5, 1.44, 1.32) }, uShadeCol: { value: new THREE.Vector3(0.6, 0.58, 0.86) },
  uShadeLift: { value: new THREE.Vector3() }, uLambert: { value: 0.35 }, uSideK: { value: 0.84 }, uTerm: { value: 0.2 },
  uBounce: { value: new THREE.Vector3() }, // warm bounce on shaded faces turned to the camera (golden only; day = 0)
  uSat: { value: 1 }, // world albedo saturation around its luminance (characters are not twoTone, so unaffected)
  // ---- look pass r1 (lighting.md 3.2) ----
  uPrac: { value: 1 },                                  // practical (point / spot) lights kept on top of the two-tone
  uAlbFloor: { value: new THREE.Vector3(0.03, 0.03, 0.042) }, // linear albedo floor (no crushed blacks)
  uGobo: { value: 0 }, uGoboScale: { value: 9 }, uGoboOff: { value: new THREE.Vector2() }, // sun cookie (cloud dapple)
  uSunW: { value: new THREE.Vector3(0, 1, 0) },        // world-space direction to the sun (cookie projection)
  uRim: { value: new THREE.Vector3() },                 // backlight rim colour x strength
  uAO: { value: 0 }, uAOR: { value: 0.7 }, uFloorY: { value: 0 }, uCeilY: { value: 1e4 }, // corner AO (height term)
};
/** haze uniforms (depth.md 3.2): exponential distance term with an offset, pooled low, capped, saturation-keeping.
 *  Colour = scene.fog.color (world.ts keeps scene.fog for the ink pass). */
export const HAZE = {
  uHaze: { value: new THREE.Vector4(30, 175, 60, 0.85) },  // start (m), e-fold length (m), pooling height (m), cap
  uHazeSat: { value: 0.6 }, uHazeY0: { value: 0 },          // saturation keep (x4 f(1-f)), ground height of the pool
};
/** character-card uniforms (lighting.md 9.2 cardShade); world.ts keeps them in sync with LIGHTS for cardshade.ts */
export const CHAR = {
  uCharTint: { value: new THREE.Vector3(1, 0.94, 0.92) }, uCharShade: { value: 0.86 }, uGrad: { value: 0.07 },
  uBodyGrad: { value: 0.2 }, uSideTint: { value: new THREE.Vector3(0.92, 0.9, 0.96) },
};

// directional light 0 = the sun = the only shadow caster (three sorts shadow-casting lights first). Only the
// UNROLLED index 0 compiles the shadow block, so sunVis is written once. pracD = what the point / spot "practical"
// lights put into directDiffuse BEFORE the sun loop (three runs point and spot loops first); TWO_TONE adds it back.
export const LFB = "vec3 pracD = vec3( 0.0 );\n" + THREE.ShaderChunk.lights_fragment_begin
  .replace("directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]",
    "sunVis = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]")
  .replace("vDirectionalShadowCoord[ i ] ) : 1.0;", "vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tdirectLight.color *= sunVis;")
  .replace("#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )", "pracD = reflectedLight.directDiffuse;\n#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )");
if (!LFB.includes("directLight.color *= sunVis") || !LFB.includes("pracD = reflectedLight")) throw new Error("shade.ts: three lights_fragment_begin changed");

const TWO_TONE = /* glsl */ `
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;                               // view space, towards the sun
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  // sun cookie: drifting 2-octave value noise projected along the sun onto the world (cloud / tree dapple)
  if ( uGobo > 0.0 ) {
    vec2 gp = vTWP.xz - vTWP.y * uSunW.xz / max( uSunW.y, 0.2 );
    float ck = smoothstep( 0.38, 0.62, tvn( gp / uGoboScale + uGoboOff ) * 0.7 + tvn( gp / ( uGoboScale * 0.37 ) + 3.1 * uGoboOff ) * 0.3 );
    sunVis *= mix( 1.0, ck, uGobo );
  }
  float ndl = max( dot( geometryNormal, sunV ), 0.0 );
  float sunTerm = sunVis * smoothstep( 0.0, uTerm, ndl );                     // 0 = cast/form shadow, 1 = lit
  float up = dot( geometryNormal, upV );
  float skyK = mix( uSideK, 1.0, 0.5 + 0.5 * up );                            // up-facing a bit brighter
  vec3 lit = uLitCol * mix( 1.0, ndl, uLambert );                             // keep some cosine modelling
  float facing = max( dot( geometryNormal, geometryViewDir ), 0.0 );        // 1 = faces the lens
  vec3 alb = max( mix( vec3( dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ), diffuseColor.rgb, uSat ), 0.0 );
  alb = clamp( alb, uAlbFloor, vec3( 0.8 ) );                                 // floor: darks stay coloured; cap: whites don't clip
  vec3 dd = alb * ( mix( uShadeCol, lit, sunTerm ) * skyK + uBounce * facing * clamp( 1.0 - up, 0.0, 1.0 ) * ( 1.0 - sunTerm ) )
    + uShadeLift * LIFT_K * ( 1.0 - sunTerm );
  // backlight rim on props when the sun is ahead of the lens
  float back = smoothstep( 0.0, 0.6, -sunV.z );
  float rimT = pow( 1.0 - facing, 4.0 ) * back * mix( 0.5, 1.0, sunVis );
  dd += uRim * rimT * ( 0.5 + 0.6 * dot( alb, vec3( 0.2126, 0.7152, 0.0722 ) ) );
  // practical lights (lamps, spots, the booster flame): their own Lambert accumulation, kept
  dd += pracD * uPrac;
  // corner AO: broad darkening of vertical faces near the floor / ceiling line (no crease)
  float hgt = min( vTWP.y - uFloorY, uCeilY - vTWP.y );
  dd *= 1.0 - uAO * ( 1.0 - smoothstep( 0.0, uAOR, max( hgt, 0.0 ) ) ) * ( 1.0 - abs( up ) );
  reflectedLight.directDiffuse = dd;
  reflectedLight.indirectDiffuse = vec3( 0.0 );                               // hemisphere/fill no longer used here
}
#endif
`;
const DECL = "#include <common>\nuniform vec3 uLitCol; uniform vec3 uShadeCol; uniform vec3 uShadeLift; uniform float uLambert; uniform float uSideK; uniform float uTerm; uniform vec3 uBounce; uniform float uSat;"
  + "\nuniform float uPrac; uniform vec3 uAlbFloor; uniform float uGobo; uniform float uGoboScale; uniform vec2 uGoboOff; uniform vec3 uSunW; uniform vec3 uRim;"
  + "\nuniform float uAO; uniform float uAOR; uniform float uFloorY; uniform float uCeilY;"
  + "\nfloat thash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }"
  + "\nfloat tvn( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );"
  + " return mix( mix( thash( i ), thash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( thash( i + vec2( 0.0, 1.0 ) ), thash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }";

// ---- haze: world-position varying (from mvPosition, so instancing / batching are covered) + the fog replacement ----
const HZ_VDECL = "#include <common>\nvarying vec3 vTWP;";
const HZ_VERT = `#include <fog_vertex>
vTWP = vec3( dot( viewMatrix[ 0 ].xyz, mvPosition.xyz - viewMatrix[ 3 ].xyz ), dot( viewMatrix[ 1 ].xyz, mvPosition.xyz - viewMatrix[ 3 ].xyz ),
  dot( viewMatrix[ 2 ].xyz, mvPosition.xyz - viewMatrix[ 3 ].xyz ) );`;
const HZ_FDECL = "\nvarying vec3 vTWP; uniform vec4 uHaze; uniform float uHazeSat; uniform float uHazeY0;";
const HZ_FRAG = /* glsl */ `
#ifdef USE_FOG
{
  float hzD = length( vTWP - cameraPosition );
  float fd = 1.0 - exp( - max( hzD - uHaze.x, 0.0 ) / max( uHaze.y, 1.0 ) );
  fd *= mix( 1.0, exp( - max( vTWP.y - uHazeY0, 0.0 ) / max( uHaze.z, 1.0 ) ), 0.6 );
  float hf = min( fd, uHaze.w );
  vec3 hc = mix( gl_FragColor.rgb, fogColor, hf );
  float hl = dot( hc, vec3( 0.2126, 0.7152, 0.0722 ) );
  gl_FragColor.rgb = max( vec3( hl ) + ( hc - hl ) * ( 1.0 + uHazeSat * 4.0 * hf * ( 1.0 - hf ) ), 0.0 );
}
#endif`;
/** patch a compiled shader (inside onBeforeCompile) so its fog becomes the haze; adds the vTWP world-position varying */
export function hazeShader(sh: THREE.WebGLProgramParametersWithUniforms, withDecl = true) {
  Object.assign(sh.uniforms, HAZE);
  sh.vertexShader = sh.vertexShader.replace("#include <common>", HZ_VDECL).replace("#include <fog_vertex>", HZ_VERT);
  sh.fragmentShader = sh.fragmentShader.replace("#include <fog_fragment>", HZ_FRAG);
  if (withDecl) sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>" + HZ_FDECL);
}

/** Lambert (or Phong: its specular term is kept, masked by the shadow) -> two-tone. Call once per material. */
export function twoTone<T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: T, liftK = 1): T {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TONE);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", DECL + HZ_FDECL + `\n#define LIFT_K ${liftK.toFixed(3)}`)
      .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + TWO_TONE);
    hazeShader(sh, false);
  };
  m.customProgramCacheKey = () => "twoTone6_" + liftK.toFixed(3);
  return m;
}

/** emissive "glow" material (lighting.md 3.4): colour x k > 1 crosses the bloom threshold; core clips, halo keeps hue */
export const glow = (hex: THREE.ColorRepresentation, k: number) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), fog: false, toneMapped: true });

// ---------------- tone-map inversion ----------------
// The composer ends in PBR-Neutral tone mapping, so a colour written to the scene buffer is NOT what lands on screen
// (toe: -0.04 linear offset, shoulder above 0.76). Self-lit things whose on-screen colour is a measured target (sky,
// fog, river) are written as untone(target): the linear value that the Neutral curve maps onto the target.
const neutral = (c: number[]) => {
  const x = Math.min(c[0], c[1], c[2]), off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  const v = c.map((k) => k - off), peak = Math.max(v[0], v[1], v[2]), S = 0.76;
  if (peak < S) return v;
  const d = 1 - S, np = 1 - (d * d) / (peak + d - S), g = 1 - 1 / (0.15 * (peak - np) + 1);
  return v.map((k) => (k * np) / peak * (1 - g) + np * g);
};
/** linear input that the Neutral tone map turns into the given on-screen colour (hex or THREE.Color, sRGB target) */
export const untone = (target: THREE.ColorRepresentation, out = new THREE.Color()) => {
  const t = new THREE.Color(target); // linear working space
  const tt = [t.r, t.g, t.b].map((k) => Math.min(k, 0.985));
  let c = tt.slice();
  for (let i = 0; i < 60; i++) { const y = neutral(c); c = c.map((k, j) => Math.max(0, k + (tt[j] - y[j]))); }
  return out.setRGB(c[0], c[1], c[2]);
};
