import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
// Needed by any THREE.RectAreaLight (BlueRoom's ceiling panel). It uploads the LTC lookup
// textures the area-light shader integrates against; without init() having run, the light
// is constructed fine and simply emits NOTHING, with no error or warning.
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d0d14)
scene.fog = new THREE.Fog(0x0d0d14, 10, 60)

// Camera – YXZ order so yaw/pitch don't interfere
// near=0.1 (was 0.01): depth precision is concentrated near the near plane, so a
// 0.01/1000 range (100,000:1) left almost no precision at the ~8-16 unit distances
// objects actually sit at. The centre tower's panels and their grid lattice are only
// 0.022 apart — inside one depth quantum at that range — so which drew in front
// flipped with sub-pixel camera motion, causing a 1-frame brightness flash while
// moving. 0.1 is a 10x precision gain and ~10cm, closer than the player can get.
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.rotation.order = 'YXZ'

// Renderer
const isMobile = navigator.maxTouchPoints > 0
// The try/catch exists ONLY to report the failure — it rethrows, so behaviour is
// unchanged. A device with no working WebGL gets a blank page and leaves, which
// is indistinguishable from a bounce in the pageview numbers; this is the one
// event that separates "didn't care" from "couldn't run it".
let renderer
try {
  renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' })
} catch (err) {
  if (window.track) window.track('webgl_failed', { mobile: isMobile, error: String(err && err.message || err).slice(0, 120) })
  throw err
}
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = !isMobile
renderer.outputColorSpace = THREE.SRGBColorSpace
// Tone mapping — without this, bright values (e.g. the emissive ceiling tiles,
// meant to read as glowing light sources) hard-clip to flat white instead of
// rolling off, and that clipping was also blowing out walls/floor nearby.
renderer.toneMapping = THREE.ACESFilmicToneMapping
// 0.3 was chosen back when 2.0 of the 2.5 total light intensity was flat ambient +
// hemisphere fill; that much uniform fill needed crushing down to not look washed out.
// Now that the rooms are lit by real PointLights at the ceiling fixtures (with proper
// 1/d² falloff) there is far less light to tame, so the exposure comes back up.
// This is the single best knob for overall "too bright / too dark" — adjust it first.
renderer.toneMappingExposure = 0.55
document.body.appendChild(renderer.domElement)

// One-time setup for RectAreaLight. Must run before the first frame that contains one.
RectAreaLightUniformsLib.init()

// Environment map — gives metalness/roughness materials something to reflect.
// Without this, any metallic material renders black/dead (no IBL to sample).
//
// This used to be `PMREMGenerator.fromScene(new RoomEnvironment())`, described here as
// "a perfectly uniform, direction-less flood". It is NOT uniform: RoomEnvironment is a
// studio-lit BOX with bright emissive panels on particular faces, so as an IBL its
// contribution depends strongly on surface normal. On the curved walls of these rooms the
// normal sweeps across those panels and produces broad bright/dim patches that track the
// camera and correspond to no light in the scene — measured on NewRoom's wall it supplied
// ~55% of the total illumination and 100% of the left-to-right unevenness (a 29.6%-of-mean
// spread; removing it dropped the spread to 3.0%).
//
// So: keep an environment (metals still need something to reflect) but make it genuinely
// uniform — a single flat colour in every direction. Because the source is constant, the
// usual roughness-blur concern is moot; every mip is the same colour.
// Built with fromScene (a box seen from the inside), NOT fromEquirectangular on a small
// DataTexture: PMREM sizes its output from the source, so a tiny 8x4 equirect produced a
// degenerate 336x8 cubeUV with no usable mip chain, which contributed no light at all and
// made environmentIntensity a no-op. fromScene is the same path RoomEnvironment used and
// yields a full-resolution PMREM.
function uniformEnvironment(hex) {
  const envScene = new THREE.Scene()
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 20),
    new THREE.MeshBasicMaterial({ color: hex, side: THREE.BackSide })
  )
  envScene.add(shell)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const rt = pmrem.fromScene(envScene, 0.04)
  pmrem.dispose()
  shell.geometry.dispose()
  shell.material.dispose()
  return rt.texture
}
scene.environment = uniformEnvironment(0xffffff)
// Calibrated, not guessed: with RoomEnvironment at 0.22 the reference wall measured a mean
// luminance of 62.8/255. A flat white shell is dimmer than RoomEnvironment's emissive
// panels per unit intensity, so this is NOT 0.22 — sweeping 0.14/0.18/0.30/0.60/0.90 gave
// 57.3/63.5/80.4/113.7/137.8, and 0.175 interpolates to 62.8. Raise if metals look dead.
scene.environmentIntensity = 0.175

// Lights
// The rooms are meant to read as lit by their emissive ceiling fixtures. That CANNOT
// come from the emissive materials themselves — Three.js has no global illumination,
// so an emissive surface glows visually but casts exactly zero light. The actual
// illumination therefore comes from a real PointLight parked at each fixture's own
// position; see addFixtureLights() in the model-load callback below.
//
// These three are FILL ONLY — they exist to keep unlit corners (and PinkRoom, which
// has no emissive ceiling fixture at all) from going pure black. They are deliberately
// tiny. Previously they were ambient 0.6 + hemisphere 1.4 + directional 0.5, i.e. 2.0
// of the 2.5 total intensity was non-directional fill that lit every surface uniformly
// with no falloff — which is why the rooms read as flat and the light appeared to come
// from nowhere in particular. A DirectionalLight also emits parallel rays from
// infinitely far away, so it can never read as a localised fixture no matter where
// it is positioned; it is kept here only as a weak top-down shaper.
scene.add(new THREE.AmbientLight(0xffffff, 0.08))
scene.add(new THREE.HemisphereLight(0xffffff, 0xb0b0b0, 0.18))
const dirLight = new THREE.DirectionalLight(0xffffff, 0.12)
dirLight.position.set(0, 10, 0)
// castShadow deliberately OFF. It used to be true, but harmlessly so: nothing in the
// scene had receiveShadow set, so no shadow was ever drawn. Now that the fixture spots
// do enable receiveShadow on the model, leaving this on would start casting — and a
// DirectionalLight's default shadow camera is a small orthographic box (~±5 units)
// around the origin, far too small for a scene this size, which would clip into a hard
// visible edge partway across MainRoom. This is only a weak 0.12 fill light; it does
// not need to cast at all.
dirLight.castShadow = false
scene.add(dirLight)

// ── Ceiling-fixture lighting ─────────────────────────────────────
// One light per emissive ceiling fixture, positioned at that fixture's own location.
// Positions are found by matching, never hardcoded — deliberate and load-bearing: the
// model is recentred at load time via model.position.sub(center), so its world
// coordinates shift whenever the Blender scene's bounding box changes, and Blender is
// Z-up while glTF is Y-up, so any coordinate copied out of Blender would also need a
// (x, z, -y) swap. Matching sidesteps both failure modes.
//
// A fixture is a PointLight by default (lights the whole room evenly, no shadow). Add a
// `spot: {...}` block to make it a downward SpotLight instead — a directed cone with a
// real cast shadow, for fixtures meant to read as a hard downlight rather than an
// ambient panel. A SpotLight needs only ONE 2D shadow map, whereas a shadow-casting
// PointLight needs 6 cube faces, which is why spots are the affordable way to get
// shadows here.
//
// TUNING: `intensity` is in candela and falls off as 1/d² (decay = 2), so illuminance
// on a floor ~5 units below a fixture is intensity/25. `distance` is a hard cutoff —
// kept just large enough to reach that room's own far corners, which also stops one
// room's light bleeding through the walls into its neighbours (nothing else contains
// them, since walls only block light where a shadow map is involved).
//
// Matched on the EMISSIVE MATERIAL name, not the mesh name. Two reasons, both learned
// the hard way:
//   1. A Blender object with two materials (base + emissive fixture) exports as one
//      glTF mesh with two primitives, which Three.js splits into a Group whose children
//      are named "<node>_0" / "<node>_1". So `name === 'Ceiling_Cassettes'` never
//      matches any Mesh — the Group holds that name and Groups are not meshes.
//      Ceiling_Cassettes and NewRoom_Ceiling are both 2-primitive nodes.
//   2. The material IS the fixture's real identity; the mesh name is incidental.
// Where a material is reused on non-ceiling geometry (BlueRoom_EmissivePanel is also on
// the front wall, floor and podium tops) a mesh-name guard narrows it to the ceiling.
const FIXTURE_LIGHTS = [
  // MainRoom — cool white cassette ceiling, room radius ~10.6, fixture at z 5.2
  // `distance` is the containment knob (see above): MainRoom's own radius is ~10.6, but
  // at distance 15 this light reached ~3.3 units PAST NewRoom's near wall and, since
  // walls don't block light without a shadow map, flooded NewRoom from one side — the
  // single biggest cause of NewRoom's uneven wall. 11.5 still covers MainRoom fully
  // while stopping at the wall between them.
  { test: (n, mats) => mats.includes('Ceiling_Light'),
    color: 0xf2f7ff, intensity: 70, distance: 11.5 },
  // NewRoom / brown podium room — warm amber, room ~15.9 wide, fixture at z 5.25.
  // The only SPOTLIGHT so far: this fixture is a single circular aperture in a dark
  // recessed ceiling, so it should read as a hard downlight onto the podium.
  //   angle    — cone half-angle in radians. Pool radius on the floor is
  //              tan(angle) * throw, and the throw here is ~5.3 units: 0.5 rad gives a
  //              ~2.9-unit-radius pool, comfortably wider than the ~1.7-unit podium.
  //              Narrow this for a tighter, more theatrical beam.
  //   penumbra — 0 = razor edge, 1 = fully soft. 0.55 keeps the pool readable without
  //              looking like a hard-edged stencil.
  //   fill     — optional extra PointLight at the same spot, so the walls keep some of
  //              their warm gradient instead of dropping to near-black. This is what
  //              keeps the effect from being too drastic; set to 0 for a pure spotlight.
  // Deliberately a PLAIN POINT LIGHT, not the spot described above. The spot never
  // actually lit this room — the matrixWorld bug put it 16.6 units outside — so the look
  // it would produce (a hard pool on the podium, walls falling off to near-black) has
  // never been on the site. A centred PointLight lights the cylindrical wall evenly all
  // the way round, which is what was asked for. Re-add a `spot: {...}` block here to get
  // the theatrical downlight (and the only cast shadow in the scene) instead.
  { test: (n, mats) => mats.includes('NewRoom_CeilingLight_Warm'),
    color: 0xffc773, intensity: 42, distance: 13 },
  // YellowRoom — TWO separate ceiling panels (YellowRoom_Ceiling + .001), so this matches
  // twice and yields two lights. The grid bars use material 'Grid', not 'Ceiling', so they
  // are excluded by the material match alone.
  //
  // SPOTS aimed straight down (default aimAt [0,-1,0]), replacing the old omnidirectional
  // PointLights at 45 — that pair lit floor, walls and ceiling all equally, which is why
  // the room read as a flat gold wash. Now the glowing panels visibly throw their light
  // DOWNWARD, like MainRoom's cassette ceiling reads: a bright pool on the (darkened)
  // floor, walls falling off into shadow above it.
  //   angle 0.62  — ~4.1-unit pool radius at the floor (~5.7-unit drop), roughly one
  //                 panel's footprint each; the two pools overlap along the room's axis.
  // Spot + centre fill, per panel. This exact configuration is the look Lucas picked
  // after seeing the alternatives — the fill at each panel's centre gives the mid-wall
  // its warm glow and leaves the room ends moodier, which is the drama he wants.
  // A 2x3 grid per panel (even wash, no hotspot, ends lit) was tried and REVERTED:
  // technically more uniform, but it flattened the room's character. Don't bring it
  // back without asking. The lighter wall TOPS come from the baked vertex gradient
  // (VERTEX_GRADIENTS above), not from these lights — the bake multiplies even the
  // uniform ambient, so it lifts the tops at the room ends where these fills can't reach.
  //   fill 14     — the mid-wall glow. The gradient's readability no longer depends on
  //                 it, since the bake was strengthened instead.
  //   intensity 42— the downward cones onto the (darkened) floor.
  { test: (n, mats) => mats.includes('Ceiling') && n.startsWith('YellowRoom_Ceiling'),
    color: 0xffebc7, intensity: 42, distance: 12,
    spot: { angle: 0.62, penumbra: 0.5, fill: 14 } },
  // BlueRoom — cool blue panels, room 10.5 wide x 11.6 deep x 5.0 tall.
  // The name guard is load-bearing: BlueRoom_EmissivePanel is also on the FLOOR panels, the
  // front wall and both podium tops, so a material-only match would light this room from
  // five places at once.
  // GRIDDED because the ceiling really is a full-room emissive panel (measured x -10.32..0.12,
  // z 27.6..39.24), not a lamp. As a single point it produced one hotspot per side wall,
  // which on these dark blue walls read as two separate light sources. See `grid` below;
  // distance drops 12 -> 8 to keep containment no worse while the lights spread outward.
  // REMOVED at Lucas's request while the room is being rebuilt (the back wall is becoming a
  // curved cove in Blender). Commented rather than deleted so it can go straight back.
  // { test: (n, mats) => mats.includes('BlueRoom_EmissivePanel') && n.includes('Ceiling'),
  //   color: 0xb8dbff, intensity: 45, distance: 8, grid: { x: 3, z: 3 } },
  //
  // SUPERSEDED by the entry below: rather than lamps, BlueRoom is now lit by a single
  // invisible AREA light filling its whole ceiling — see the `area` branch in
  // addFixtureLights() for what that is and its three constraints.
  //
  // Matched on the MESH name, not the material: BlueRoom_EmissivePanel is shared by FIVE
  // meshes (floor panels, front wall, both podium tops), so a material match would light
  // this room from five places at once. BlueRoom_Ceiling_Panels is a single-primitive node,
  // so its runtime name is the node name — the multi-material renaming trap documented at
  // the top of this table does not apply here.
  //
  // Sized from the ceiling's own footprint (10.41 x 10.91) and then pushed OUTWARD 1.5 on
  // every side (negative inset) and raised 1.4 above the slab, so that neither of the
  // emitter's two hard boundaries — its plane and its four edges — lands on a surface the
  // player can see. See the `area` branch in addFixtureLights() for why that matters.
  //
  // `bounce: 0` — DELIBERATELY OFF, and this is the settled state. The up-facing twin lit
  // the ceiling nicely, but its own plane sat just under the ceiling at the top of the
  // walls, and a point below an up-facing emitter receives exactly zero from it. That
  // cutoff drew a hard line right around the room at the top of every wall — the artifact
  // that took three passes to track down, because raising the MAIN panel (`lift`) could
  // never move it. Diagnosis: the line did not shift when `lift` changed by 1.4, and
  // vanished entirely at bounce 0.
  //
  // Consequence, accepted by Lucas: the ceiling is no longer separately lit, so it reads
  // darker than the floor. He judged the clean walls worth more than the bright ceiling
  // ("not exactly what I wanted but I prefer this way"). Do NOT re-enable `bounce` to
  // "fix" the ceiling without solving the plane cutoff — the line comes straight back.
  { test: n => n === 'BlueRoom_Ceiling_Panels',
    color: 0xb8dbff, intensity: 2.6, area: { inset: -1.5, lift: 1.4, bounce: 0 } },

  // PinkRoom — the only light in the scene that is NOT a ceiling fixture. It sits at the
  // floating creature itself, so the room reads as lit by the figure.
  //
  // Matched on the MESH name, not the material — the exact opposite of every entry above,
  // and deliberately so. The creature's material `Figur_Pink` is SHARED with `Figur_Body`
  // and `Monster2_Body`, both of which live in the unreachable staging row, so a material
  // match would silently create three of these lights, two of them far outside the
  // building. `PinkRoom_Creature_Body` is a single-primitive node, so its runtime mesh name
  // is exactly this string (no Group/`_0` split — see the note above about multi-primitive
  // nodes) and it matches exactly once.
  //
  // `atCentre` keeps the light at the mesh's bounding-box centre. Every other entry gets
  // dropped just below its fixture's underside, which is right for a ceiling slab but would
  // put this one under the creature's feet instead of inside it.
  //
  // intensity 14 — deliberately low. This light sits mid-height ~2-3 units from the floor
  // rather than ~5 units up like the ceiling fixtures, so it needs far less output to read.
  //
  // distance 13 IS THE CONTRAST KNOB, not just the containment knob. Three.js windows a
  // PointLight as  (1/d²) · clamp(1 - (d/distance)⁴, 0, 1)²  — that window term collapses
  // hard as d approaches `distance`. PinkRoom_OuterWall's radius reaches 10.68, so at the
  // original distance 11 the window at the wall was 0.0124: the wall received barely 1% of
  // its inverse-square value, i.e. essentially NO direct light. Everything visible on it was
  // the flat AmbientLight + HemisphereLight + environment fill, which is why the wall read
  // as one continuous pink. At 13 the window is 0.296 — about 24x more light on the wall —
  // and the falloff is now in the useful part of the curve, so the wall finally shows the
  // variation the geometry implies (its radius runs 9.10 to 10.68, a 38% brightness spread
  // by inverse square, plus Lambert shading toward floor and ceiling).
  //
  // Do NOT raise `distance` much past 13 chasing more wall light. These lights cast no
  // shadows, so walls do not block them and `distance` is the only containment. MainRoom's
  // near wall is ~12.3 units from here, and the window rises steeply: 0.039 at distance 13
  // (a ~7% contribution next to MainRoom's own ceiling light — imperceptible) but 0.89 at
  // distance 22, which would light MainRoom's wall MORE brightly than its own fixture does.
  { test: n => n === 'PinkRoom_Creature_Body',
    color: 0xffb4d8, intensity: 14, distance: 13, atCentre: true },

  // PinkRoom, second light — a SHAPING spot at the room's ENTRANCE, throwing light
  // HORIZONTALLY into the room. No source geometry: nothing in the scene marks where it is.
  //
  // Why a second light at all: PinkRoom is a near-cylinder (PinkRoom_OuterWall radius
  // 9.10-10.68, height 5) with the creature at its centre, so every wall point is roughly
  // equidistant from that first light. A centred point light in a cylinder lights the wall
  // almost perfectly evenly BY GEOMETRY — no intensity or distance value can make it
  // uneven (Lambert adds only ~2.6% toward the ceiling). Light has to come from off-centre.
  //
  // Anchored to PinkRoom_Tunnel — the entrance passage — not to a room-centre mesh.
  // Anchoring to geometry rather than hardcoding world coordinates is deliberate: the model
  // is recentred on its own bounding box at load, so absolute coordinates shift whenever the
  // Blender scene's extents change. A mesh anchor plus a relative offset survives that.
  //
  // Measured layout, in model space: tunnel centre (11.61, 1.5, 0), spanning x 9.77-13.45,
  // y 0-3. Room centre (22.5, 2.5, 0). Floor y 0, ceiling y 5. Wall inner edge x 11.82, far
  // wall x 33.18. So the entrance faces +X and the throw across the room is ~19.6 units.
  //   offset [2, 0.3, 0] -> (13.61, 1.8, 0): just inside the wall line, at roughly standing
  //                         eye height, centred in the doorway.
  //   aimAt  [1, 0, 0]   -> dead horizontal, straight up the room's axis. y is exactly 0,
  //                         which is what makes this a wall-wash rather than a downlight.
  //
  // THE CONE IS THE CONTAINMENT HERE, and it is why this can be brighter and reach further
  // than the creature light. A SpotLight emits only inside its cone, so aimed +X it puts
  // nothing at all back toward MainRoom (which sits at x 0, i.e. directly behind it). The
  // creature light needed distance capped at 13 to avoid leaking next door; this one can
  // use 24 and still reach the far wall, because direction does the work instead.
  //
  //   angle 0.5 rad  -> ~9.5-unit radius by the time it crosses the room, against the
  //                     10.68 half-width: a broad wash that still falls off before the
  //                     corners. Widen toward 0.7 to flood the whole far wall.
  //   penumbra 0.6   -> soft edge, so the cone reads as light spilling through a doorway
  //                     rather than a hard-edged stencil.
  //   fill 0         -> deliberately NO co-located PointLight. A fill is omnidirectional
  //                     and would sit 13.6 units from MainRoom with a 24-unit distance,
  //                     throwing away the containment the cone just bought.
  //
  // Side benefit: this is a shadow-casting spot, and at SHADOW_CASTER_MAX_SIZE = 6 the
  // 3.45-wide creature qualifies as a caster while the 21.36-wide wall does not. So the
  // figure throws a real shadow across the room and up the far wall — the strongest
  // contrast available here, and the thing a centred point light could never produce.
  //
  // NOTE (2026-07-31): PinkRoom_CentralColumn used to qualify too at 5.39 wide, and this
  // comment used to claim it as a second caster. It no longer does: the column absorbed
  // PinkRoom_Floor and PinkRoom_Ceiling to kill a shading seam at their junction (see
  // CLAUDE.md), which took it to 18.3 wide — past the threshold. Accepted deliberately;
  // the room was judged to look better with the seam gone than with the column's contact
  // shadow. To get the shadow back, the column has to stop being the floor/ceiling again.
  // intensity 110, and it needs to be that high — much higher than the creature light's 14.
  // The throw is what costs it: the far wall is ~19.6 units away, so illuminance there is
  // I · window / 19.6² = I · 0.308 / 384 = I · 0.0008. At 40 that gave 0.032, which is only
  // what the creature light already puts on the wall by itself — invisible as a second
  // source. 110 gives ~0.088, roughly 2.5x the creature light's wall level, which is what
  // makes the direction readable. This is affordable precisely BECAUSE the cone contains it;
  // an omnidirectional light at 110 would flood the neighbouring rooms.
  { test: n => n === 'PinkRoom_Tunnel',
    color: 0xd98cb4, intensity: 110, distance: 24, atCentre: true,
    offset: [2, 0.3, 0], aimAt: [1, 0, 0],
    spot: { angle: 0.5, penumbra: 0.6, fill: 0 } },
]

// Emissive fixtures are authored in Blender at wildly inconsistent strengths
// (NewRoom_CeilingLight_Warm = 60, Ceiling_Light = 25, YellowRoom Ceiling = 5.5,
// BlueRoom_EmissivePanel = 1.5). Blender exports those via KHR_materials_emissive_strength
// and Three.js applies them as material.emissiveIntensity — so at 60 the fixture is
// ~18x over pure white after tone mapping and hard-clips to a flat WHITE disc, losing
// its warm colour entirely. Clamping the hot ones brings them back to a bright-but-
// tinted glow. Small accent emissives (Lamp_* at 1.0, M_Purple at 0.18) are left alone.
const EMISSIVE_CLAMP = 2.0

// ── Per-material fix-ups ─────────────────────────────────────────
// The vaccine bottle read as dark and unlit. Its three materials as authored in the .blend:
//   transparent_V2 (glass body) — KHR_materials_transmission 1.0, ior 1.45, rough 0.03
//   blue metal     (cap)        — metalness 1.0, rough 0.34
//   label                       — metalness 1.0, rough 1.0
//
// `label` at metalness 1.0 is an authoring slip: a paper label is a dielectric. A fully
// metallic surface has NO diffuse term at all — only specular reflection of the environment
// — so at metal 1 / rough 1 it is physically a dark rough metal, which is exactly how it
// rendered. Setting it to 0 makes it a plain white diffuse surface that takes light from the
// ceiling fixture normally. Measured on a fixed close-up of the podium bottle, region mean
// luminance 63.8 -> 73.2 and p95 84 -> 105, with no pixel clipping. Worth fixing in Blender
// too, but that needs an export cycle; this override does not.
//
// Deliberately NOT setting envMapIntensity here. It looks like the obvious lever for the
// glass and the metal cap (both env-dependent), but it was measured to do *nothing* in this
// scene: envMapIntensity 1.0 vs 6.0 produced byte-identical frames. The likely reason is
// that these materials have no envMap of their own and inherit scene.environment, whose
// contribution is scaled by scene.environmentIntensity instead. So the global
// scene.environmentIntensity — not a per-material value — is the knob for env-lit surfaces.
//
// If the bottle ever needs to be brighter still: now that the label is metalness 0 it does
// respond to lights, so a small dedicated PointLight near the podium would work (it would
// NOT have, while the label was metallic). The remaining dimness is the glass transmitting
// the dark brown room behind it, which is a room-colour question, not a material bug.
//
// Keyed on MATERIAL name, not mesh name (same reasoning as FIXTURE_LIGHTS). Each of these is
// used by exactly two nodes — the podium bottle and the second bottle instance — so both stay
// consistent and nothing else in the scene is touched.
//
// ── BRIGHTNESS KNOBS (these two numbers are the whole dial) ──────
// `emissiveIntensity` lifts each part on its own, without touching the room, the podium or
// any other object — which is why this is done per-material instead of by adding a light.
// Emissive is added on top of normal shading, so it cannot be "unlit" by a dark room.
//   label      0.35  — raise for a brighter white label, lower if it starts looking
//                      self-lit/flat. The printed text is SEPARATE geometry with its own
//                      material (this material has no texture and no vertex colours), so
//                      brightening the backing does not wash the text out.
//   blue metal 0.50  — the cap. Blue contributes only ~7% of perceived luminance, so it
//                      needs a higher number than the label to read as equally lifted.
// Emissive colours deliberately match each part's own base colour, so this reads as "more
// light on it" rather than a colour shift.
const MATERIAL_FIXUPS = {
  // BlueRoom's two podium objects — the Cybercoffee egg and the VR panel. Authored at
  // metalness 0.65 / roughness 0.28 over a mid grey (0.403, 0.410, 0.429), which reads as
  // painted plastic rather than metal. Pushed to full metal and polished.
  //
  // Brightness has to come from `color`, not from a light. At metalness 1 a surface has NO
  // diffuse term — everything you see is reflected environment — so the base colour acts as
  // the reflection tint, and raising it is what makes the object brighter. envMapIntensity
  // is NOT the lever here: it was measured to render byte-identical frames in this scene
  // (these materials have no envMap of their own; they inherit scene.environment, which is
  // scaled by scene.environmentIntensity instead).
  //
  // The small emissive is a floor, not the main lift. BlueRoom's fixture light is currently
  // commented out and its panels are no longer emissive, so the room is lit only by the
  // global fill — without a little self-lift, going to full metal would land these DARKER
  // than they started, since metal 0.65 at least kept some diffuse response.
  //
  // Worth knowing before tuning further: the environment is a uniform white shell, so a
  // polished metal reflects it evenly and gains sheen rather than highlights. Sparkle needs
  // an actual light in the room — restoring BlueRoom's fixture entry is what would give
  // roughness something to bite on.
  'M_Silver_Egg':   { metalness: 1.0, roughness: 0.14, color: 0xc9ced8, emissive: 0x353b47, emissiveIntensity: 1.0 },
  'M_Silver_Panel': { metalness: 1.0, roughness: 0.14, color: 0xc9ced8, emissive: 0x353b47, emissiveIntensity: 1.0 },

  'label': {
    metalness: 0.0,                 // the real fix — see above; a label is a dielectric
    emissive: 0xffffff,
    emissiveIntensity: 0.35,
    // …but a FLAT white emissive washes the print out. The label carries the scene's only
    // texture (`vaccine_label_fixed`, a 736x736 JPEG of blue type on white), and emissive is
    // ADDED after shading, so a constant 0.35 lifted the dark type by exactly as much as the
    // white paper — compressing the contrast between them. Pointing emissiveMap at the same
    // texture modulates the glow by the image: white paper still gets the full lift (so the
    // brightness gained earlier is kept) while the type emits ~nothing and stays dark.
    // '@map' is a sentinel resolved in the applier below to this material's own .map.
    emissiveMap: '@map',
  },
  'blue metal': {
    // Same root cause as the label: at metalness 1.0 the cap has NO diffuse term, so the
    // ceiling fixture cannot light it at all and it stays dark wherever it is not mirroring
    // something bright. 0.30 is plastic-like (this is a medicine bottle cap, not chrome) and
    // lets it take diffuse light normally. Put it back to 1.0 for the old mirror-metal look.
    metalness: 0.30,
    emissive: 0x2a12e0,             // same blue family as its base colour (0.021, 0, 0.8)
    emissiveIntensity: 0.50,
  },

  // YellowRoom floor. First darkened to 0x453020 for the downlight look, then brought
  // back up a step at Lucas's request once the grid lighting landed — 0x453020 read as
  // near-black under the dimmer room. Still well below the authored mid-brown.
  'YellowRoom_Floor_DarkBrown': {
    color: 0x6a523e,
  },

  // The table lamp's orange body. Its base colour is BLACK at metalness 1 — every bit of
  // orange you see is the emissive (1, 0.25, 0.02) glowing, so "darker orange" means a
  // darker EMISSIVE, not a darker base colour, which would change nothing.
  // emissiveIntensity is deliberately NOT set: it stays at the authored 1.0, which also
  // keeps this entry outside the EMISSIVE_CLAMP exemption path — the colour alone does
  // the darkening. Affects the staging-row copy too (shared material), which is fine:
  // that copy is unreachable. The grey panels (Lamp_Grey) are untouched.
  'Lamp_Orange': {
    emissive: 0xc65808,
  },

  // The lamp's white parts (keyboard surround, deck, trackpad frames) -> darker, shinier
  // METALLIC grey. Same authored construction as Lamp_Orange: black base at metalness 1,
  // all the visible "white" is emissive (0.58, 0.58, 0.58). Three values work together:
  //   emissive 0x6f7275 — the main visible shift, and the ONLY real lever on how dark the
  //                       part reads. At metalness 1 there is no diffuse term at all, so
  //                       the emissive IS the surface tone; darkening the base colour alone
  //                       would barely register. Deliberately not set via emissiveIntensity,
  //                       so the EMISSIVE_CLAMP exemption path stays untouched.
  //   color 0x777b7e —    a metal tints its REFLECTIONS by its base colour, and the authored
  //                       base is pure black, so this metal reflected nothing at all until
  //                       this entry existed. Darkened in step with the emissive so the
  //                       sheen stays consistent with the body tone.
  //   roughness 0.24 —    what actually reads as "shinier". Note it is NOT the environment
  //                       doing this: scene.environment is deliberately UNIFORM (see "3D
  //                       Mode: Lighting"), and a uniform env reflects identically at any
  //                       roughness. The gain comes from the YellowRoom spots' specular
  //                       highlights, which tighten and brighten as roughness drops.
  // Shared with the staging-row copy and with both lamp instances (room + coffee table),
  // which is intended — they should match.
  'Lamp_Grey': {
    color: 0x777b7e,
    roughness: 0.24,
    emissive: 0x6f7275,
  },
}

// Worth knowing if the centre tower ever flickers dark while moving again: its panels sit
// only ~0.022 units inside their grid lattice (measured), which is the depth knife-edge the
// camera's `near` comment at the top of this file describes. The measure that has held up
// against it is the tower emitting its own light — but `Tower_Upper_Panel` is authored in
// Blender at emissiveStrength 2.0, which is EXACTLY EMISSIVE_CLAMP, so it has zero headroom
// and any Blender-side increase is silently clamped straight back to 2.0 on load. To give it
// more light, add a `'Tower_Upper_Panel': { emissiveIntensity: N }` entry above — fixups that
// set emissiveIntensity are exempt from the clamp. Raising it in Blender alone does nothing.

// A mesh only casts a shadow if it is smaller than this in every dimension. Architecture
// (walls, floors, ceilings, the 20-unit cassette array) is excluded on purpose: it would
// cast the room's own shell into the shadow map for no visual gain, and a ceiling casting
// onto the light directly beneath it is an active hazard. Props — the bottle, the podium,
// the lamp — are what actually need contact shadows.
const SHADOW_CASTER_MAX_SIZE = 6

// BlueRoom's back wall is a curved cove; see the clamp in the animation loop for why this
// exists. The room's back plane sits at world z ~39.05 and the cove's radius is 2.505, so
// the curve starts at 39.05 - 2.505 = 36.55. Stopping a touch short of that keeps you off
// the curve entirely. Lower it to stand further back, raise it to get closer to the wall.
const BLUEROOM_Z_LIMIT = 36.4

// Podiums keep the player out with an explicit no-go rectangle instead of raycast
// collision. Two reasons the raycast can't do it: the size filter below drops anything
// thin (podium top panels and bars are), and a podium's sides are open/loose geometry in
// several rooms, so a ray fired at eye height can pass straight between the pieces — you
// walk clean through the pedestal, and since camera.y is pinned to floorY + playerHeight
// you're never *over* it either, you're inside it.
//
// The zones are derived at load from the podium meshes' own bounding boxes, so a Blender
// re-export that moves or resizes a podium updates them with no code change.
const PODIUM_MARGIN = 0.45
// 'CoffeeTable' is in here for the same reason, not as an afterthought: YellowRoom's table
// (holding the Mac-Lamp) IS in collidables and still didn't stop anyone, because it stands
// 0.79 units tall with its top at y -1.93 while the eye ray fires from roughly a metre
// higher. Every one of these supports is short enough for the ray to pass clean over it —
// that's the shared root cause of "you walk through and over the podiums", and why height
// is irrelevant to the zones below: they block on the XZ footprint alone.
const PODIUM_NAME_PATTERNS = ['Podest', 'Podium', 'CoffeeTable']

// PinkRoom's centre needs a CIRCLE, and must not go through the rectangle list above.
// PinkRoom_CentralColumn was merged with the room's floor and ceiling in Blender, so its
// bounding box is the entire 19 × 19 annulus — a rectangle built from it would seal off
// the whole room.
//
// It also escapes collision for a subtler reason than the podiums do. Measured against the
// GLB, the column has ZERO triangles crossing eye height (y -0.765): what stands on the
// floor is a ~0.7-unit stump topping out around y -2.0, and the dome hangs down from the
// ceiling. Between them is open air exactly where the collision ray fires, so there is
// nothing for it to hit and you walk straight through the middle of the room.
//
// Centre and radius are measured off the stump itself: bbox centre (18.121, 16.755), max
// vertex radius 2.07. PinkRoom_OuterWall needs nothing — all 752 of its triangles at eye
// height face inward toward the player, so it already blocks correctly.
const PINK_COLUMN = { x: 18.121, z: 16.755, r: 2.07 }
let podiumZones = []

// ── Fake-lighting vertex gradients, baked at load ────────────────
// Rewrites a mesh's COLOR_0 with a vertical brightness ramp: `bottom` at the lowest
// vertex (1.0 = the authored colour, unchanged) rising to `top` at the highest. Cheaper
// than real lighting and completely stable — same idea as the brown room's Blender-baked
// wall gradient, but computed here at load so it needs no GLB re-export.
//
// Matched on MATERIAL name plus a minimum bbox height. The height guard is what keeps
// this off small props sharing the material: 'Velvet' is also the YellowRoom coffee
// table (0.8 units tall), and a per-mesh normalised ramp would visibly brighten its top
// surface; the walls are 5.9 units. The ramp uses each vertex's WORLD-space height, not
// local Y — YellowRoom_Sofa is rotated and its mirror copy has NEGATIVE scale (-2.37),
// so local Y runs upside down on one of them and a local ramp would invert.
//
// Safe against the centre-tower flicker trap (see CLAUDE.md "Colour gradients"): these
// meshes already arrive with a COLOR_0 from the exporter, so their materials are already
// compiled with vertex colours — replacing the attribute's values changes no shader
// program and therefore cannot reshuffle draw order. The replacement is float32 (the
// authored attribute is normalised uint8, which cannot exceed 1.0, i.e. cannot brighten).
const VERTEX_GRADIENTS = [
  // YellowRoom gold walls: dark at the bench line, bright gold at the ceiling — reads as
  // the ceiling panels washing the wall tops with light.
  //
  // NOTE: the YellowRoom WALL gradient is no longer here — it is BAKED IN BLENDER now
  // (2026-07-30, at Lucas's request, as an end-to-end pipeline test). The walls' material
  // was split to 'Velvet_WallGrad' (the coffee table keeps plain 'Velvet' — the recipe
  // sets Base Color to white, which would have turned the shared table white), and a
  // 'WallGrad' FLOAT_COLOR attribute at index 0 carries velvet x0.10 (floor) -> x3.5
  // (ceiling), a deliberately extreme 35x spread. See CLAUDE.md "Colour gradients on
  // geometry" for the recipe. A runtime 'Velvet' entry here would match nothing now and
  // must not be re-added — it would overwrite the baked COLOR_0 at load.

  // YellowRoom floor: DRASTIC radial pool — mode 'radial' ramps by horizontal distance
  // from the mesh's centre instead of by height. x2.4 at the room centre (under the
  // coffee table) falling to x0.45 at the rim: a 5.3x spread, per Lucas's "very drastic".
  // Multiplies the MATERIAL_FIXUPS base colour (0x6a523e), so re-tinting the floor there
  // re-tints the whole pool.
  //
  // Unlike the walls, this mesh ships with NO COLOR_0, so applying it flips the floor
  // material to vertexColors and recompiles its program. That is safe against the
  // centre-tower draw-order flicker (see CLAUDE.md) even though a Blender-baked COLOR_0
  // once triggered it: the renderer's opaque sort keys on material.id, and a load-time
  // recompile keeps the same material instance and id — the Blender route reshuffled ids
  // because the GLB's material creation ORDER changed, which is what moved the draw order.
  { material: 'YellowRoom_Floor_DarkBrown', mode: 'radial', centre: 2.4, rim: 0.45 },

  // BlueRoom floor tiles: the INVERSE of the pool above — bright at the walls falling to a
  // deep blue core in the middle, matching the reference (glowing tiles that darken toward
  // the centre). Needs three things the YellowRoom entry does not:
  //
  //   mesh    — BlueRoom_EmissivePanel is shared by FIVE meshes (floor panels, ceiling
  //             panels, front wall, both podium tops), so a material-name match alone would
  //             gradient all of them. Safe as a name match because BlueRoom_Floor_Panels is
  //             a single-primitive node, so its runtime mesh name is exactly this string
  //             (multi-primitive nodes become Groups with unpredictable child names).
  //   clone   — same reason, for the material side: the map/colour/emissive changes must not
  //             leak onto the other four users.
  //   emissive 0x000000 — these tiles are authored emissive (colour 0.72/0.86/1.0 at
  //             strength 1.5) and that glow is most of what you see. Emission is added after
  //             shading and cannot vary per-fragment from a colour map, so leaving it on
  //             would flatten the ramp exactly the way a flat emissive washed out the bottle
  //             label. Killing it is what makes the gradient readable at all. The room is
  //             still lit by the 3x3 ceiling grid overhead, which is untouched — but the
  //             floor now takes its brightness from that lighting instead of from itself,
  //             which is why `rim` has to overshoot 1.0 to hold the edges bright.
  //
  // Deliberately DRASTIC per Lucas ("if it's too much I'll let you know"): centre 0.10 vs
  // rim 2.2 is a 22x spread, and centreTint pushes the core hard toward the wall blue.
  // Final centre = authored x 0.10 x (0.20, 0.35, 1.00) = ~(0.014, 0.030, 0.100);
  // final rim    = authored x 2.2                       = ~(1.58, 1.89, 2.20).
  // The three dials: `centre` (how dark the core), `rim` (how bright the edges),
  // `centreTint` (how blue the core).
  // mode 'tiles': EVERY TILE gets its own gradient, dark in its middle and bright toward
  // its edges — the reference look. Not to be confused with 'radial', which stretches ONE
  // gradient across the whole mesh; that was tried here first and read as a single dark
  // patch in the middle of the room. `centre`/`rim` mean per-tile centre and per-tile edge.
  // ALL FIVE meshes carrying this material — floor, ceiling, front wall and both podium
  // tops — so every tile in the room reads the same way. Listed explicitly rather than
  // matching on material alone because `mesh` is also what keeps this off anything else
  // that might later share the material.
  //
  // Killing the emissive on the CEILING is the notable one: those panels are the room's
  // visible glow. The room stays lit — its light comes from the 3x3 PointLight grid that
  // addFixtureLights parks at the ceiling, which is independent of the material — but the
  // ceiling now reads as a lit tiled surface rather than a light box. Drop
  // BlueRoom_Ceiling_Panels from this list to put the glow back (its gradient goes with it;
  // a constant emissive flattens the ramp, which is the whole reason it has to go).
  //
  // Safe against the fixture-light matcher even though `clone` renames the material: the
  // `mats` array it matches on is snapshotted BEFORE the clone, and only the clone is
  // renamed — so `BlueRoom_EmissivePanel` is still found and the ceiling grid still spawns.
  { material: 'BlueRoom_EmissivePanel', mode: 'tiles',
    mesh: ['BlueRoom_Floor_Panels', 'BlueRoom_Ceiling_Panels', 'BlueRoom_FrontWall_Panels',
           'BlueRoom_PodestL_TopPanels', 'BlueRoom_PodestR_TopPanels'],
    clone: true, emissive: 0x000000,
    // The core's LIGHTNESS is `centre` — the tint only sets its hue, and no tint can
    // rescue a 0.20 multiplier: at 0.20 the core was authored x 0.20 x tint = ~(0.09,
    // 0.13, 0.20), i.e. near-black whatever colour it nominally was. Lightening the middle
    // therefore *has* to raise this number, which unavoidably narrows the centre-to-edge
    // range (11x at 0.20, ~3x here). Raise `rim` too if the falloff needs to come back.
    centre: 1.05, rim: 2.2, centreTint: 0xdaeaff },
]

function addFixtureLights(model) {
  const seen = []
  const fixedUp = []
  const gradApplied = []
  const _box = new THREE.Box3()
  const _size = new THREE.Vector3()

  model.traverse(child => {
    if (!child.isMesh) return

    // Rein in over-bright emissives so the fixture reads as coloured light, not white.
    const mats = Array.isArray(child.material) ? child.material : [child.material]
    for (const m of mats) {
      // A fixup that sets its own emissiveIntensity is exempt from the clamp — and the
      // exemption must live HERE, not rely on fixup-after-clamp ordering: the material is
      // shared across several meshes (the tower alone is 3), and this loop runs per mesh,
      // so the clamp would silently re-cap the fixup's value on the NEXT mesh visited.
      const fix = m && MATERIAL_FIXUPS[m.name]
      if (m && m.emissiveIntensity > EMISSIVE_CLAMP && !(fix && 'emissiveIntensity' in fix)) {
        m.emissiveIntensity = EMISSIVE_CLAMP
      }

      // Per-material fix-ups (see MATERIAL_FIXUPS above). Materials are shared between
      // instances (both bottles; the tower's three meshes), so guard against applying
      // the same patch twice.
      if (fix && !m.userData._fixedUp) {
        const before = `metalness ${m.metalness} emissive #${m.emissive?.getHexString?.() ?? '—'}` +
                       ` @${m.emissiveIntensity}`
        // NOT Object.assign: `color` and `emissive` are THREE.Color instances, and
        // overwriting one with a hex number silently breaks the material (the renderer
        // reads .r/.g/.b off it). Colour-valued keys have to go through .set().
        for (const [k, v] of Object.entries(fix)) {
          // '@map' = "reuse this material's own base-colour texture" (see emissiveMap above).
          if (v === '@map') m[k] = m.map || null
          else if (m[k] && m[k].isColor) m[k].set(v)
          else m[k] = v
        }
        m.userData._fixedUp = true
        m.needsUpdate = true
        fixedUp.push(`${m.name}[${m.type}] ${before} -> metalness ${m.metalness}` +
                     ` emissive #${m.emissive?.getHexString?.() ?? '—'} @${m.emissiveIntensity}`)
      }
    }

    // Shadow participation. Everything receives; only small props cast (see above).
    // Without receiveShadow set somewhere, a shadow-casting light draws nothing at all.
    const box = _box.setFromObject(child)
    box.getSize(_size)
    child.receiveShadow = true
    child.castShadow = Math.max(_size.x, _size.y, _size.z) < SHADOW_CASTER_MAX_SIZE

    // Fake-lighting gradient (see VERTEX_GRADIENTS above). Runs here because this
    // traversal has already computed the mesh's bbox, and setFromObject has refreshed
    // child.matrixWorld (model-local frame — fine: the ramp is normalised per mesh, so
    // the recentre offset cancels out).
    // Default -1, not 0: BlueRoom's floor panels are a PERFECTLY flat plane, so _size.y is
    // exactly 0 and the old `> 0` default silently rejected them. Entries that set an
    // explicit minHeight (to keep a wall ramp off a short prop sharing the material) are
    // unaffected — this only changes what happens when minHeight is omitted.
    const grad = VERTEX_GRADIENTS.find(gr =>
      mats.some(m => m && m.name === gr.material) && _size.y > (gr.minHeight ?? -1) &&
      (!gr.mesh || (Array.isArray(gr.mesh) ? gr.mesh.includes(child.name) : gr.mesh === child.name)))
    if (grad && !child.geometry.userData._gradApplied) {
      const posAttr = child.geometry.attributes.position
      const v = new THREE.Vector3()
      // Optional per-end tints let a ramp shift HUE, not just brightness. Shared by the
      // 'radial' and 'tiles' modes below.
      const tint = hex => hex === undefined ? [1, 1, 1]
        : [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255]

      if (grad.mode === 'radial') {
        // Per-FRAGMENT radial pool via a generated texture + planar UVs — NOT vertex
        // colours. This floor is triangulated as a fan from its rim: all its vertices
        // sit at radius ~10 with ZERO interior vertices, so a per-vertex ramp has
        // nowhere to store the bright centre (the first attempt logged radius keys of
        // 10.0..10.0 — erratic rim factors, no pool). Planar UVs are exact here despite
        // rim-only vertices: planar mapping is linear and per-triangle UV interpolation
        // is linear, so the interior UVs land precisely where a dense mesh's would.
        const iw = 1 / Math.max(box.max.x - box.min.x, 1e-6)
        const id = 1 / Math.max(box.max.z - box.min.z, 1e-6)
        const uv = new Float32Array(posAttr.count * 2)
        for (let i = 0; i < posAttr.count; i++) {
          v.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld)
          uv[i * 2] = (v.x - box.min.x) * iw
          uv[i * 2 + 1] = (v.z - box.min.z) * id
        }
        child.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))

        // A texture tops out at white (1.0), so the centre's >1 boost moves into
        // material.color (multiplied by `centre`) and the texture itself carries only
        // the centre->rim RATIO, sRGB-encoded to match its colorSpace. Net result:
        // centre = authored colour x centre-factor, rim = authored x rim-factor.
        // Normalised by the PEAK end, not by `centre`. That is what allows rim > centre —
        // a DARK middle with bright edges, the inverse of the YellowRoom pool. With
        // centre >= rim this is arithmetically identical to the old centre-normalised
        // form (YellowRoom still resolves to a white centre stop and a 117 rim byte).
        const peak = Math.max(grad.centre, grad.rim)
        const stop = (f, t) => 'rgb(' + t.map(c =>
          Math.round(255 * Math.pow(Math.min(1, f / peak * c), 1 / 2.2))).join(',') + ')'
        const cvs = document.createElement('canvas')
        cvs.width = cvs.height = 256
        const g2d = cvs.getContext('2d')
        const rg = g2d.createRadialGradient(128, 128, 0, 128, 128, 128)
        rg.addColorStop(0, stop(grad.centre, tint(grad.centreTint)))
        rg.addColorStop(1, stop(grad.rim,    tint(grad.rimTint)))
        g2d.fillStyle = rg
        g2d.fillRect(0, 0, 256, 256)
        const tex = new THREE.CanvasTexture(cvs)
        tex.colorSpace = THREE.SRGBColorSpace
        // `clone` is mandatory when the material is SHARED across meshes — otherwise the
        // map, the colour boost and the killed emissive all leak onto its other users.
        const targets = grad.clone ? mats.map(m => m && m.clone()) : mats
        if (grad.clone) {
          targets.forEach((m, i) => { if (m) m.name = mats[i].name + '_' + child.name })
          child.material = Array.isArray(child.material) ? targets : targets[0]
        }
        for (const m of targets) {
          if (!m) continue
          m.map = tex
          m.color.multiplyScalar(peak)
          if (grad.emissive !== undefined) {
            // Emission is ADDED after shading and cannot vary per-fragment from a colour
            // map, so a constant glow flattens the ramp — the same thing that washed out
            // the bottle label. 0x000000 kills it.
            m.emissive.set(grad.emissive)
            m.emissiveIntensity = 1
          }
          // Recompiles this material's program (USE_MAP/USE_UV), but material.id is
          // unchanged so the opaque sort order is stable — see the entry's comment on
          // why that keeps the centre-tower flicker trap out of reach.
          m.needsUpdate = true
        }
        child.geometry.userData._gradApplied = true
        gradApplied.push(`${child.name} radial-tex ${grad.centre}->${grad.rim}` +
                         `${grad.clone ? ' (cloned mat)' : ''}` +
                         `${grad.emissive !== undefined ? ' emissive killed' : ''}`)
      } else if (grad.mode === 'tiles') {
        // Per-TILE FLAT colour — the discrete stepped look of the reference, which the
        // 'radial' mode above cannot produce: that one is a texture, so it interpolates
        // per-fragment and sweeps straight across tile boundaries as one smooth ramp.
        //
        // These panels are already modelled as individual tiles — BlueRoom_Floor_Panels is
        // 1292 verts / 323 quads, i.e. exactly 4 verts each with NO shared vertices — so
        // every tile is its own connected component in the index buffer. Union-find over
        // the triangles recovers those components without assuming anything about vertex
        // ordering, then each component gets one flat colour from its own centroid.
        const idxAttr = child.geometry.index
        const n = posAttr.count
        const parent = new Int32Array(n)
        for (let i = 0; i < n; i++) parent[i] = i
        const find = a => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a] } return a }
        if (idxAttr) {
          for (let i = 0; i < idxAttr.count; i += 3) {
            const a = find(idxAttr.getX(i)), b = find(idxAttr.getX(i + 1)), c = find(idxAttr.getX(i + 2))
            if (a !== b) parent[b] = a
            if (a !== c) parent[c] = a
          }
        }
        // Per-tile 0..1 UVs: each tile is mapped to the WHOLE texture, so every tile shows
        // the same gradient with its own dark centre — as opposed to `radial`, which
        // stretches one gradient across the entire mesh.
        //
        // This CANNOT be done with vertex colours. A quad's interior is interpolated from
        // its 4 corners, so a dark middle with bright corners is unrepresentable — there is
        // no vertex in the middle to hold the dark value. A texture is the only option.
        // Tangent basis PER TILE, taken from the tile's own normal — not two axes chosen
        // once for the whole mesh. The back of BlueRoom is now a curved cove, so its floor
        // and ceiling tiles each sit at a different angle; a single per-mesh axis pair
        // would project the tilted ones edge-on and squash their gradient to a smear.
        // Every tile is flat, so any vertex's normal describes the whole tile.
        const nrmAttr = child.geometry.attributes.normal
        const nMat = new THREE.Matrix3().getNormalMatrix(child.matrixWorld)
        const basisT1 = new Map(), basisT2 = new Map()
        const _n = new THREE.Vector3(), _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3()
        const pa = new Float64Array(n), pb = new Float64Array(n)
        const nA = new Float64Array(n).fill(Infinity),  nB = new Float64Array(n).fill(Infinity)
        const xA = new Float64Array(n).fill(-Infinity), xB = new Float64Array(n).fill(-Infinity)
        let tiles = 0
        for (let i = 0; i < n; i++) {
          v.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld)
          const r = find(i)
          if (i === r) tiles++
          if (!basisT1.has(r)) {
            // build an arbitrary but stable pair of tangents in this tile's plane
            _n.fromBufferAttribute(nrmAttr, i).applyMatrix3(nMat).normalize()
            // cross with whichever world axis is least parallel to the normal, so the
            // cross product never degenerates on axis-aligned tiles (floor, ceiling, wall)
            const ax = Math.abs(_n.x) < 0.9 ? _t1.set(1, 0, 0) : _t1.set(0, 1, 0)
            _t1.copy(ax).cross(_n).normalize()
            _t2.copy(_n).cross(_t1).normalize()
            basisT1.set(r, _t1.clone()); basisT2.set(r, _t2.clone())
          }
          const a = v.dot(basisT1.get(r)), b = v.dot(basisT2.get(r))
          pa[i] = a; pb[i] = b
          if (a < nA[r]) nA[r] = a
          if (a > xA[r]) xA[r] = a
          if (b < nB[r]) nB[r] = b
          if (b > xB[r]) xB[r] = b
        }
        const uv = new Float32Array(n * 2)
        for (let i = 0; i < n; i++) {
          const r = find(i)
          uv[i * 2]     = (pa[i] - nA[r]) / Math.max(xA[r] - nA[r], 1e-6)
          uv[i * 2 + 1] = (pb[i] - nB[r]) / Math.max(xB[r] - nB[r], 1e-6)
        }
        child.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))

        // Same peak-normalised construction as `radial`, but the gradient now lives inside
        // one tile: dark at the tile's centre, bright at its edge.
        const peakT = Math.max(grad.centre, grad.rim)
        const stopT = (f, t) => 'rgb(' + t.map(c =>
          Math.round(255 * Math.pow(Math.min(1, f / peakT * c), 1 / 2.2))).join(',') + ')'
        const cvsT = document.createElement('canvas')
        cvsT.width = cvsT.height = 256
        const g2dT = cvsT.getContext('2d')
        // radius 128 reaches the edge MIDPOINTS; the corners sit at 181 and so clamp to the
        // outermost stop, which is what keeps the tile corners the brightest part.
        const rgT = g2dT.createRadialGradient(128, 128, 0, 128, 128, 128)
        rgT.addColorStop(0, stopT(grad.centre, tint(grad.centreTint)))
        rgT.addColorStop(1, stopT(grad.rim,    tint(grad.rimTint)))
        g2dT.fillStyle = rgT
        g2dT.fillRect(0, 0, 256, 256)
        const texT = new THREE.CanvasTexture(cvsT)
        texT.colorSpace = THREE.SRGBColorSpace

        const targets = grad.clone ? mats.map(m => m && m.clone()) : mats
        if (grad.clone) {
          targets.forEach((m, i) => { if (m) m.name = mats[i].name + '_' + child.name })
          child.material = Array.isArray(child.material) ? targets : targets[0]
        }
        for (const m of targets) {
          if (!m) continue
          m.map = texT
          m.color.multiplyScalar(peakT)
          if (grad.emissive !== undefined) { m.emissive.set(grad.emissive); m.emissiveIntensity = 1 }
          m.needsUpdate = true
        }
        child.geometry.userData._gradApplied = true
        gradApplied.push(`${child.name} per-tile x${tiles} ${grad.centre}->${grad.rim}` +
                         `${grad.clone ? ' (cloned mat)' : ''}` +
                         `${grad.emissive !== undefined ? ' emissive killed' : ''}`)
      } else {
        const ys = new Float32Array(posAttr.count)
        let yMin = Infinity, yMax = -Infinity
        for (let i = 0; i < posAttr.count; i++) {
          v.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld)
          ys[i] = v.y
          if (v.y < yMin) yMin = v.y
          if (v.y > yMax) yMax = v.y
        }
        const span = Math.max(yMax - yMin, 1e-6)
        // Keep the existing attribute's itemSize (4 = RGBA on these GLB meshes): the
        // USE_COLOR_ALPHA shader define depends on it, and changing it would compile a
        // new program — the exact thing this approach is built to avoid.
        const old = child.geometry.attributes.color
        const itemSize = old ? old.itemSize : 3
        const out = new Float32Array(posAttr.count * itemSize)
        for (let i = 0; i < posAttr.count; i++) {
          const f = grad.bottom + (grad.top - grad.bottom) * ((ys[i] - yMin) / span)
          out[i * itemSize] = f
          out[i * itemSize + 1] = f
          out[i * itemSize + 2] = f
          if (itemSize === 4) out[i * itemSize + 3] = 1
        }
        child.geometry.setAttribute('color', new THREE.BufferAttribute(out, itemSize))
        for (const m of mats) {
          if (m && !m.vertexColors) { m.vertexColors = true; m.needsUpdate = true }
        }
        child.geometry.userData._gradApplied = true
        gradApplied.push(`${child.name} vertical ${yMin.toFixed(1)}..${yMax.toFixed(1)} ` +
                         `${grad.bottom}->${grad.top}`)
      }
    }

    const matNames = mats.filter(Boolean).map(m => m.name)

    // ── Vaccine label: the UV map has u and v swapped ────────────────
    // The label band is a ring ~6.31 around x ~2.0 tall, i.e. aspect ~3.15:1, and its texture
    // is square (736x736). A correct wrap therefore needs u spanning the full 1.0 (around the
    // bottle) and v spanning 1/3.15 = ~0.32 (up it). The authored UVs are the exact opposite —
    // u 0..0.32, v 0..1 — so the right aspect was computed but assigned to the wrong axes, and
    // the print renders rotated 90° (reading bottom-to-top). The texture image itself is
    // stored upright; only the mapping is wrong.
    //
    // It must be a proper 90° ROTATION, `(u, v) -> (1 - v, u)`, NOT the bare swap
    // `(u, v) -> (v, u)`. A swap is a transpose — a reflection about the u=v diagonal, with
    // determinant -1 — so it lands the text horizontally but MIRRORED ("Menu" renders as
    // "unǝM"). Tried it; that is exactly what happened. Negating the new u turns the
    // reflection back into a rotation. The `1 - v` also keeps u' in 0..1 and v' in 0..0.32,
    // so the band still shows the top of the poster.
    //
    // TEMPORARY: the real fix is to rotate the UV map in Blender and re-export — this is
    // authoring data, not a rendering concern. Doing it here because Blender was not open.
    // REMOVE this block once the .blend is fixed, or the label will end up sideways again.
    if (matNames.includes('label') && child.geometry) {
      const uv = child.geometry.attributes.uv
      // Guard on the GEOMETRY, not the mesh: both bottle instances (`label` and
      // `label_Podest`) can reference the same buffer, and rotating twice would undo it.
      if (uv && !child.geometry.userData._labelUvRotated) {
        for (let i = 0; i < uv.count; i++) {
          const u = uv.getX(i), v = uv.getY(i)
          uv.setXY(i, 1 - v, u)
        }
        uv.needsUpdate = true
        child.geometry.userData._labelUvRotated = true
        fixedUp.push(`label UV rotated 90° on ${child.name} (${uv.count} verts)`)
      }
    }

    const spec = FIXTURE_LIGHTS.find(f => f.test(child.name, matNames))
    if (!spec) return

    // Position from the GEOMETRY BOUNDING BOX, not getWorldPosition(). getWorldPosition
    // returns the object's transform ORIGIN, and several of these fixtures have their
    // Blender origin left at the world origin while the geometry itself sits tens of
    // units away — NewRoom_Ceiling's origin is (0,0,0) but its geometry is at
    // (-19.5, -1.2, 5.25), so using the origin would drop NewRoom's light into MainRoom.
    //
    // `.add(model.position)` is load-bearing. Assigning model.position does NOT recompute
    // model.matrixWorld, and Box3.setFromObject(child) calls updateWorldMatrix(false,
    // true) — updateParents=false, so it reuses the parent's stale matrix. model.matrixWorld
    // is therefore still identity here and `box` comes back in MODEL-LOCAL (pre-recentre)
    // space. Adding model.position converts it to world space; the model carries no
    // rotation or scale, so a translation is the whole transform.
    //
    // Do NOT "fix" this with model.updateMatrixWorld(true) before this call. The spawn
    // floor-probe further down raycasts the same geometry and has always run against these
    // same un-refreshed matrices — that is where floorY (0.018) and hence the tuned eye
    // height come from. Refreshing the matrices corrects the lights but simultaneously
    // moves the probe's answer and drops the camera outside the rooms. Tried it; it does.
    //
    // Without the offset every fixture light sat 16.6 units away at (4.36, 2.72, -15.81)
    // from where it belonged, outside its own room, leaving each room lit by whichever
    // neighbour's displaced light happened to be in range.
    const pos = box.getCenter(new THREE.Vector3()).add(model.position)
    // Drop the light just BELOW the fixture's underside, not below its centre. The
    // fixture slab is ~0.5 units thick, so centre-minus-a-nudge is still *inside* the
    // mesh — which is invisible for a shadowless PointLight but would make a spot's own
    // fixture geometry occlude its entire beam.
    // `+ model.position.y` for the same model-local -> world reason as above. Without it
    // this assignment silently threw away the Y half of the offset and left every fixture
    // 2.72 units too high — above its own ceiling, so the room below stayed dark.
    //
    // `atCentre` opts out: the drop-to-underside is right for a ceiling slab, but the
    // PinkRoom creature is a free-floating body, and pushing the light to its underside
    // would park it under the figure's feet instead of inside it. Leaving pos at the
    // bounding-box centre is what makes the light read as emanating from the figure.
    if (!spec.atCentre) pos.y = box.min.y + model.position.y - 0.05

    // `offset` moves a light off its anchor mesh, room-relative. Used by the PinkRoom
    // shaping light, which has no source geometry of its own to anchor to and must sit
    // OFF-centre — a light at the centre of that near-cylindrical room lights the wall
    // evenly by geometry, no matter what intensity or distance it is given.
    if (spec.offset) pos.set(pos.x + spec.offset[0], pos.y + spec.offset[1], pos.z + spec.offset[2])

    // `grid` spreads the fixture's light across the anchor mesh's own footprint instead of
    // concentrating it in one point, for fixtures that are a large emissive PANEL rather
    // than a lamp. A single point 5 units under a 10x12 ceiling makes a tight hotspot and,
    // in a room with dark walls, two symmetric blobs on the side walls that read as two
    // separate light sources — which is exactly what BlueRoom looked like.
    //
    // Total intensity is CONSERVED (spec.intensity split evenly), so overall room
    // brightness is unchanged; only the distribution evens out. Lights sit at the centre of
    // each cell — (i + 0.5) / n — which also insets them from the panel edge, so none ends
    // up jammed against a wall making a fresh hotspot there.
    //
    // Pair a grid with a SMALLER `distance` than the single-point version: spreading the
    // lights outward moves the outermost ones closer to the room's boundary, and `distance`
    // is what stops a room's light bleeding through walls into its neighbour (walls block
    // nothing without a shadow map). For BlueRoom, 3x3 at distance 8 reaches z 21.5 / x 6.4
    // versus the old single light's 21.4 / 6.9 — i.e. slightly less far in every direction,
    // so containment is strictly no worse than before.
    if (spec.grid) {
      const nx = spec.grid.x || 1
      const nz = spec.grid.z || 1
      const per = spec.intensity / (nx * nz)
      const x0 = box.min.x + model.position.x, x1 = box.max.x + model.position.x
      const z0 = box.min.z + model.position.z, z1 = box.max.z + model.position.z
      for (let ix = 0; ix < nx; ix++) {
        for (let iz = 0; iz < nz; iz++) {
          const cell = new THREE.PointLight(spec.color, per, spec.distance, 2)
          cell.position.set(
            x0 + (x1 - x0) * (ix + 0.5) / nx,
            pos.y,
            z0 + (z1 - z0) * (iz + 0.5) / nz,
          )
          scene.add(cell)
        }
      }
      seen.push(`${child.name} grid ${nx}x${nz} @ ${per.toFixed(1)} each, ` +
                `y=${pos.y.toFixed(2)}, x ${x0.toFixed(1)}..${x1.toFixed(1)}, ` +
                `z ${z0.toFixed(1)}..${z1.toFixed(1)}`)
      return
    }

    // `area` = an invisible emitting PLANE spanning the fixture's own footprint, instead of
    // one or more discrete lamps. This is what "a light panel in the ceiling" physically is,
    // and a THREE.RectAreaLight is pure light with NO renderable geometry — nothing new
    // appears in the room, it only changes how surfaces are lit.
    //
    // Why not just make the ceiling emissive: Three.js has no global illumination, so an
    // emissive material GLOWS but casts zero light. That is the reason every room in this
    // scene needs a real light next to its fixture at all.
    //
    // Why not a grid of PointLights (what this room used to have): a point source puts a
    // hotspot directly beneath itself and falls off radially, so on BlueRoom's dark blue
    // walls a 3x3 grid still read as several separate lamps. An area source the size of the
    // ceiling gives soft wall-to-wall falloff with no locatable origin.
    //
    // Three constraints before reusing this elsewhere:
    //  - RectAreaLightUniformsLib.init() must have run (done once at renderer setup).
    //    Without it the light emits nothing, silently.
    //  - It lights MeshStandardMaterial / MeshPhysicalMaterial ONLY. Every material in this
    //    GLB is glTF PBR so that holds, but a Basic/Lambert/Phong added later is ignored.
    //  - It cannot cast shadows and has no `distance` cutoff — falloff is physical
    //    inverse-square from the panel's area, so containment comes from `intensity` and the
    //    gap to the next room, not from a hard radius the way PointLight `distance` works.
    if (spec.area) {
      // NEGATIVE inset = the panel OVERHANGS the fixture footprint. That is deliberate here:
      // the rectangle's four edges are a falloff boundary too, so an emitter that stops at
      // the walls puts its edge gradient on surfaces the player is looking at. Pushing the
      // edges out past the walls keeps only the flat middle of the light's field inside the
      // room. Light spilling outside costs nothing — there is nothing out there to see.
      const inset = spec.area.inset ?? 0
      const w = (box.max.x - box.min.x) - inset * 2
      const h = (box.max.z - box.min.z) - inset * 2
      const al = new THREE.RectAreaLight(spec.color, spec.intensity, w, h)
      // The emitter goes ABOVE the fixture slab (its top face), not below it.
      //
      // This is the fix for a bright STRIPE along the top of the side walls. An area light
      // obeys Lambert's cosine law about its OWN normal, so a wall point level with the
      // panel sees it edge-on (cos ~ 0) and gets nothing, while one just below catches the
      // panel's edge at near-zero range — a near-field spike. Sitting the panel at the
      // ceiling's underside put both of those exactly at the top of the visible wall, so
      // instead of a top-to-bottom ramp you got a hard bright line with dark above it.
      //
      // Raised to the slab's top face, the visible wall now starts a full slab-thickness
      // BELOW the emitter, so the cos-weighted peak (which lands at ~45°, i.e. about one
      // slab-thickness inward) falls on the wall proper and the falloff reads as a smooth
      // gradient. The degenerate edge-on band still exists — it just sits at the emitter's
      // own height, hidden above the ceiling where nothing can see it.
      //
      // Passing light DOWN through the slab is free: an area light casts no shadow, so
      // being above the ceiling costs it nothing on the floor below.
      //
      // `lift` raises it FURTHER, and is what removes the remaining hard line that ran right
      // around the room at the top of the walls. The emitter's own plane is a hard cutoff:
      // a point just below it sees the full rectangle, a point just above it is behind the
      // emitter and receives exactly zero, and there is nothing in between. Any surface that
      // CROSSES that height therefore gets a visible seam — and BlueRoom's cove sweeps
      // continuously from wall to ceiling, so it crossed the plane and drew the line.
      // Sitting the emitter flush on the slab top was not enough because the cove's own
      // curve reaches that same height.
      //
      // `lift` puts the plane above every surface the player can see, so the cutoff has
      // nothing to land on. It also SOFTENS the gradient generally: the near-field falloff
      // is spread over a longer run, at the cost of overall brightness (roughly 1/d²), which
      // is why `intensity` goes up alongside it.
      al.position.set(pos.x, box.max.y + model.position.y + (spec.area.lift ?? 0), pos.z)
      // A RectAreaLight emits along its local -Z and spans local X (width) by Y (height).
      // -90° about X maps local -Z to world -Y (straight down) and local Y to world Z, i.e.
      // a horizontal ceiling panel. Set explicitly rather than with lookAt(): aiming
      // straight down is degenerate for lookAt's default up vector (0,1,0) and would give
      // an arbitrary roll — which for a non-square panel also swaps its width and depth.
      al.rotation.x = -Math.PI / 2
      scene.add(al)

      // `bounce` = a second, UP-facing panel co-located with the first, i.e. the pair acts
      // as one double-sided emitter (a RectAreaLight is single-sided; Three.js has no
      // two-sided option).
      //
      // Why it is needed: the ceiling's visible face is its UNDERSIDE, whose normal points
      // down — directly away from a downward-emitting panel — so the fixture lights the
      // floor, walls and props but leaves its own ceiling black. In a real room the ceiling
      // is lit by light bouncing back up off the floor, and Three.js has no global
      // illumination to produce that. This is that bounce, done explicitly.
      //
      // Note moving the panel ABOVE the ceiling does NOT fix it: an area light casts no
      // shadow so the light still reaches the floor through the slab, but the underside's
      // normal still faces away from it and stays unlit. The light has to come from below.
      //
      // Its intensity is tuned SEPARATELY and is lower than the main panel's: it sits ~0.06
      // from the ceiling versus ~4.2 from the floor, so the same value would read far
      // brighter up there. Because it emits strictly upward it cannot touch anything else
      // in the room — no uplighting on the podiums or props.
      //
      // NOTE the bounce panel stays BELOW the slab (at `pos`, the underside) even though the
      // main panel moved above it. It has to: it exists to light the ceiling's underside,
      // and a light on the far side of that surface cannot.
      if (spec.area.bounce > 0) {
        const up = new THREE.RectAreaLight(spec.color, spec.area.bounce, w, h)
        up.position.copy(pos)
        up.rotation.x = Math.PI / 2
        scene.add(up)
      }

      seen.push(`${child.name} area ${w.toFixed(1)}x${h.toFixed(1)} @ ` +
                `${pos.x.toFixed(1)},${pos.y.toFixed(1)},${pos.z.toFixed(1)}` +
                `${spec.area.bounce > 0 ? ` +bounce ${spec.area.bounce}` : ''}`)
      return
    }

    let light
    if (spec.spot) {
      light = new THREE.SpotLight(
        spec.color, spec.intensity, spec.distance, spec.spot.angle, spec.spot.penumbra, 2
      )
      light.position.copy(pos)
      // A SpotLight aims at light.target, which defaults to the world origin and must be
      // added to the scene separately — miss either and this cone points sideways across
      // the whole building instead of where it should, with no error.
      //
      // `aimAt` is a DIRECTION, not a target point, so it stays valid wherever the anchor
      // mesh ends up after the model is recentred. Default [0,-1,0] = straight down, which
      // is what a ceiling fixture wants; the PinkRoom entrance spot passes [1,0,0] for a
      // dead-horizontal wall wash. Normalised so the 10-unit throw below is consistent
      // regardless of how the vector was written.
      const aim = spec.aimAt || [0, -1, 0]
      const aLen = Math.hypot(aim[0], aim[1], aim[2]) || 1
      light.target.position.set(
        pos.x + (aim[0] / aLen) * 10,
        pos.y + (aim[1] / aLen) * 10,
        pos.z + (aim[2] / aLen) * 10,
      )
      scene.add(light.target)

      if (renderer.shadowMap.enabled) {
        light.castShadow = true
        light.shadow.mapSize.set(1024, 1024)
        light.shadow.camera.near = 0.5
        light.shadow.camera.far  = spec.distance
        // normalBias offsets along the surface normal and handles large flat receivers
        // (this room's floor) far better than a flat depth bias, which needs to be big
        // enough to cause peter-panning before it clears the acne.
        light.shadow.normalBias = 0.02
      }

      // Optional co-located PointLight so walls outside the cone keep some light.
      if (spec.spot.fill > 0) {
        const fill = new THREE.PointLight(spec.color, spec.spot.fill, spec.distance, 2)
        fill.position.copy(pos)
        scene.add(fill)
      }
    } else {
      light = new THREE.PointLight(spec.color, spec.intensity, spec.distance, 2)
      light.position.copy(pos)
    }

    scene.add(light)
    const kind = spec.spot ? `spot(${spec.spot.angle}rad${spec.spot.fill ? '+fill' : ''})` : 'point'
    seen.push(`${child.name} ${kind} @ ${pos.x.toFixed(1)},${pos.y.toFixed(1)},${pos.z.toFixed(1)}`)
  })
  console.log(`Material-Fixups: ${fixedUp.length} — ${fixedUp.join(' | ')}`)
  console.log(`Vertex-Gradients: ${gradApplied.length} — ${gradApplied.join(' | ')}`)
  console.log(`Fixture-Lichter: ${seen.length} — ${seen.join(' | ')}`)
  if (seen.length === 0) {
    console.warn('Keine Fixture-Lichter gefunden — Mesh-Namen im GLB haben sich geändert? ' +
                 'FIXTURE_LIGHTS in src/main.js prüfen.')
  }
}

// ── Camera rotation ──────────────────────────────────────────────
let yaw   = 0
let pitch = 0
let spawnPos = null
let spawnYaw = 0
let spawnPitch = 0
const MOUSE_SENS  = 0.003
const SCROLL_SENS = 0.003
/* Vertical look range. Desktop keeps the full ±~89° (you can look straight up
   or down). Touch devices get ±0.20 rad ≈ ±11.5°: on a phone the scene reads
   best held roughly level, and a full-range pitch made it easy to end up
   staring at the ceiling or the floor with no quick way back to level.
   Gated on isMobile (navigator.maxTouchPoints > 0, defined at the top of this
   file) rather than a width query, matching how this file already switches
   antialiasing and shadows — so a mouse-driven desktop is untouched. */
const PITCH_LIMIT = isMobile ? 0.20 : Math.PI / 2 - 0.01

function clampPitch() {
  pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch))
}
function applyRotation() {
  camera.rotation.y = yaw
  camera.rotation.x = pitch
}

/* ── Mobile steering model ─────────────────────────────────────────
   On touch devices the camera is composed per-frame from:

     yaw   = headingYaw
     pitch = headingPitch + peekPitch

   headingYaw is the persistent "frontal view" — the direction you walk. The
   joystick steers it: grabbing the stick captures the current heading as a
   reference, and the thumb's direction then points at a TARGET heading
   relative to that reference (up = straight on, left = 90° left, straight
   back = 180° about-turn). Each frame the heading EASES toward the target
   (exponential, STEER_EASE) with the per-frame step capped at STEER_MAX_RATE,
   so a hard stick flip swings the camera around at a legible, deliberate
   speed — bigger turns take proportionally longer — rather than teleporting
   the view. Releasing the stick freezes the heading where it is
   (target := heading) — the view and position stay put, only the thumb
   snaps home.

   The horizontal swipe ROTATES THE WHOLE STEERING FRAME, live: every yaw
   delta is applied to headingYaw, targetHeadingYaw AND stickRefYaw together,
   so swiping re-aims "forward" in real time. Standing still that just turns
   you; while walking, the path curves with the finger and a held joystick
   keeps its thumb angle but measures it against the swiped frame — thumb
   still pushed "up", but "up" now means the new direction. Shifting all
   three by the same amount is what preserves an in-flight steering ease
   instead of cancelling it, and it means nothing snaps back on release
   (there is nothing left to snap to). peekPitch is the one remaining
   temporary offset: vertical look follows the finger, then eases back to
   the ~level frontal pitch on release — so you can never end up stuck
   staring at the floor or ceiling.

   Desktop (isMobile false) never runs the composition — mouse/wheel keep
   writing yaw/pitch directly exactly as before. The isMobile branches inside
   those handlers exist only for touchscreen laptops, where isMobile is true
   (maxTouchPoints > 0) and the per-frame composition would otherwise
   overwrite mouse look every frame: routing their deltas through the heading
   keeps both input styles live on such devices. */
const STEER_EASE     = 8      // per-second ease rate for steering AND peek return — higher = snappier (≈96% of the way after 0.4s)
/* Max angular speed of a joystick turn. The exponential ease alone made a
   180° flip nearly as quick as a small nudge (its speed scales with the
   remaining angle), which read as a disorienting jump-cut. Capping the rate
   makes turn DURATION grow with turn SIZE — at 4.2 rad/s a full about-turn
   sweeps for ~0.7s, a 90° turn ~0.4s, while anything under ~30° never hits
   the cap and keeps the snappy ease. Applies only to the joystick's eased
   steering: a swipe rotates the frame 1:1 with the finger and is never
   rate-limited. (Dialed in on-device: 2.4 too slow, 3.2 and 3.7 still a
   touch slow on the 180.) */
const STEER_MAX_RATE = 4.2    // rad/s (~241°/s) — lower = slower, more cinematic big turns
const STICK_DEADZONE = 0.25   // fraction of JOYSTICK_MAX; inside it the stick neither walks nor steers (the angle is pure noise near the centre)
let headingYaw       = 0      // persistent facing = walking direction
let targetHeadingYaw = 0      // where the joystick is currently steering the heading
let headingPitch     = 0      // frontal pitch (the spawn's framing, ~level)
let peekPitch        = 0      // temporary vertical look, eases back to 0
let stickRefYaw      = 0      // heading captured the moment the stick is grabbed

function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)) }  // → [-π, π]

/* Re-seat the steering model on the current yaw/pitch. Must run after ANY
   code that writes yaw/pitch directly (spawn, sessionStorage restore,
   resetScene) — otherwise the next animate() frame composes the camera from
   a stale heading and visibly snaps the view back. */
function syncSteeringToView() {
  headingYaw = yaw; targetHeadingYaw = yaw
  headingPitch = pitch
  peekPitch = 0
}

let isLookDown = false
let lastX = 0, lastY = 0

renderer.domElement.addEventListener('mousedown', e => {
  if (isOverlayOpen) return
  if (e.button === 2 || e.button === 1) {
    if (e.button === 1) e.preventDefault()   // stop middle-click autoscroll
    isLookDown = true
    lastX = e.clientX
    lastY = e.clientY
    document.body.classList.add('looking')
  }
})
window.addEventListener('mouseup', e => {
  if (e.button === 2 || e.button === 1) { isLookDown = false; document.body.classList.remove('looking') }
})
window.addEventListener('contextmenu', e => e.preventDefault())
window.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault() })
window.addEventListener('mousemove', e => {
  if (!isLookDown || isOverlayOpen) return
  const dYaw   = -(e.clientX - lastX) * MOUSE_SENS
  const dPitch = -(e.clientY - lastY) * MOUSE_SENS
  lastX  = e.clientX
  lastY  = e.clientY
  if (isMobile) {  // touchscreen laptop: rotate the steering frame so the composition doesn't eat mouse look
    headingYaw += dYaw; targetHeadingYaw += dYaw; stickRefYaw += dYaw
    headingPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, headingPitch + dPitch))
  }
  yaw   += dYaw
  pitch += dPitch
  clampPitch(); applyRotation()
})
renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault()
  if (isOverlayOpen) return
  const dYaw   = e.deltaX * SCROLL_SENS
  const dPitch = e.deltaY * SCROLL_SENS
  if (isMobile) {  // same touchscreen-laptop guard as mousemove above
    headingYaw += dYaw; targetHeadingYaw += dYaw; stickRefYaw += dYaw
    headingPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, headingPitch + dPitch))
  }
  yaw   += dYaw
  pitch += dPitch
  clampPitch(); applyRotation()
}, { passive: false })

// ── Touch swipe camera look — a temporary "peek" ─────────────────
const TOUCH_SENS    = 0.004   // horizontal (yaw) — unchanged
/* Vertical (pitch) is deliberately ~30% of horizontal, so up/down look is a
   subtle adjustment rather than an equal partner to turning.
   This is paired with the tighter PITCH_LIMIT above and both are needed: with
   the clamp alone at full sensitivity you'd hit the ±0.20 rad stop after ~50px
   of swipe, which feels twitchy-then-jammed. At this rate it takes ~165px to
   reach the limit, so the whole range is usable and reads as gentle.
   No isMobile guard needed — these handlers only ever fire for touch input,
   so mouse and trackpad look are untouched by definition. */
const TOUCH_SENS_PITCH = 0.0012
let cameraTouchId = null
let lastTouchX = 0, lastTouchY = 0

/* Horizontal swipe = rotate the steering frame live (heading, target and
   stick reference together — see the steering-model comment above), so a
   sideways look is immediately and permanently the new forward, even while
   the joystick is held. Vertical swipe = a temporary pitch peek that eases
   back to level after release. The old release-inertia (yawVel/pitchVel
   coasting) is gone. */
renderer.domElement.addEventListener('touchstart', e => {
  if (isOverlayOpen || cameraTouchId !== null) return
  cameraTouchId = e.changedTouches[0].identifier
  lastTouchX    = e.changedTouches[0].clientX
  lastTouchY    = e.changedTouches[0].clientY
}, { passive: true })

renderer.domElement.addEventListener('touchmove', e => {
  if (cameraTouchId === null || isOverlayOpen) return
  e.preventDefault()
  for (const t of e.changedTouches) {
    if (t.identifier !== cameraTouchId) continue
    // Rotate the whole frame by the same delta — heading (the view), target
    // (so the ease doesn't fight back) and stick reference (so a held
    // joystick's angles are measured against the new forward).
    const dyaw = (t.clientX - lastTouchX) * TOUCH_SENS
    headingYaw += dyaw; targetHeadingYaw += dyaw; stickRefYaw += dyaw
    // Clamp at accumulate time so the COMPOSED pitch (heading + peek) stays
    // inside ±PITCH_LIMIT. Clamping only the composed value would let
    // peekPitch wind up past the visible stop, and the release-ease would
    // then spend its first stretch unwinding invisible surplus — a dead
    // pause before the view actually moves.
    peekPitch = Math.max(-PITCH_LIMIT - headingPitch,
                Math.min( PITCH_LIMIT - headingPitch,
                          peekPitch + (t.clientY - lastTouchY) * TOUCH_SENS_PITCH))
    lastTouchX = t.clientX
    lastTouchY = t.clientY
    break
  }
}, { passive: false })

const endLookTouch = e => {
  for (const t of e.changedTouches)
    if (t.identifier === cameraTouchId) {
      // Yaw needs no release handling — the frame already rotated live
      // during the swipe. Clearing the id is what lets the pitch peek in
      // animate() ease back home.
      cameraTouchId = null
      break
    }
}
// touchcancel too: if the OS steals the touch (notification shade, app
// switch) and only touchend were handled, cameraTouchId would stay stuck —
// blocking every future look and freezing the pitch return mid-glance.
renderer.domElement.addEventListener('touchend',    endLookTouch, { passive: true })
renderer.domElement.addEventListener('touchcancel', endLookTouch, { passive: true })

// ── Virtual joystick ──────────────────────────────────────────────
const JOYSTICK_MAX = 33
let joystickTouchId = null
let joystickX = 0, joystickY = 0
const joystickBase  = document.getElementById('joystick-base')
const joystickThumb = document.getElementById('joystick-thumb')

if (joystickBase) {
  joystickBase.addEventListener('touchstart', e => {
    e.stopPropagation()
    if (joystickTouchId !== null) return
    joystickTouchId = e.changedTouches[0].identifier
    // "Stick sets an angle": the heading at grab time is the reference all
    // stick directions are measured against for this hold. Re-captured on
    // every grab, so successive nudges compound naturally.
    stickRefYaw = headingYaw
  }, { passive: true })

  window.addEventListener('touchmove', e => {
    if (joystickTouchId === null) return
    for (const t of e.changedTouches) {
      if (t.identifier !== joystickTouchId) continue
      const r  = joystickBase.getBoundingClientRect()
      const cx = r.left + r.width  / 2
      const cy = r.top  + r.height / 2
      let dx = t.clientX - cx
      let dy = t.clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > JOYSTICK_MAX) { dx *= JOYSTICK_MAX / dist; dy *= JOYSTICK_MAX / dist }
      joystickThumb.style.transform = `translate(${dx}px,${dy}px)`
      joystickX = dx / JOYSTICK_MAX
      joystickY = dy / JOYSTICK_MAX
      break
    }
  }, { passive: true })

  const endStickTouch = e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joystickTouchId) continue
      joystickTouchId = null
      joystickX = 0; joystickY = 0
      // Release keeps the CURRENT view: freeze the heading where the ease has
      // got it rather than letting it finish the remaining arc to the target.
      // Predictable — the view never moves after the thumb lifts.
      targetHeadingYaw = headingYaw
      joystickThumb.style.transform = 'translate(0,0)'
      break
    }
  }
  // touchcancel too — a stolen touch would otherwise leave joystickX/Y stuck
  // and the camera walking forever with no finger down.
  window.addEventListener('touchend',    endStickTouch, { passive: true })
  window.addEventListener('touchcancel', endStickTouch, { passive: true })
}

// ── WASD ─────────────────────────────────────────────────────────
const keys = {}
// The four arrows are the browser's own scroll keys, so they need preventDefault or
// holding one both walks the camera AND scrolls the document. WASD never needed this.
// Safe for the overlays: About/Contact/Craft are iframes, and a keydown inside an
// iframe does not bubble to the parent window, so this listener never sees — and so
// never blocks — arrow-key scrolling of their content.
const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
window.addEventListener('keydown', e => {
  keys[e.code] = true
  if (ARROWS.includes(e.code)) e.preventDefault()
}, { passive: false })   // explicit: a passive listener silently ignores preventDefault
window.addEventListener('keyup',   e => { keys[e.code] = false })

const SPEED          = 3.45   // 3.0 + 15%
const COLLISION_DIST = 0.4

// NOTE: -1.3601 is the ORIGINAL pre-session constant, hand-tuned for the OLD
// severance_V23.glb scene's coordinate system. It was never re-tuned when
// the model was swapped to portfolio_scene.glb (see CLAUDE.md item 34/35),
// and in the new model's coordinates it puts the camera BELOW the actual
// floor (spawn probe's floorY lands on `MainRoom_Floor` at world Y≈0.018 —
// see item 35 for the full root-cause writeup and glTF-verified room scale,
// ~1 unit ≈ 1 meter). User explicitly chose to keep iterating on this
// known-underground original rather than switch to the root-cause-fixed 1.6
// baseline. Per the confirmed R/F convention (less-negative = higher), each
// requested raise shrinks this negative offset's magnitude by that percent
// (×0.8, ×0.8, now ×0.9) — still underground at every step so far, just
// less deep (currently ~0.77 units below the floor).
let playerHeight = -1.3601 * 0.8 * 0.8 * 0.9
let floorY       = 0

// R = höher, F = tiefer (live, kein Reload nötig)
window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') {
    playerHeight += 0.05
    console.log('R gedrückt — playerHeight:', playerHeight.toFixed(4))
    e.preventDefault()
  }
  if (e.code === 'KeyF') {
    playerHeight -= 0.05
    console.log('F gedrückt — playerHeight:', playerHeight.toFixed(4))
    e.preventDefault()
  }
  // P = dump the current camera position/angle as a ready-to-paste spawn
  // override (also copies to clipboard) — press it while standing where
  // you want the page to spawn, then send the printed snippet back.
  if (e.code === 'KeyP') {
    const snippet = `spawnPos = new THREE.Vector3(${camera.position.x.toFixed(4)}, ${camera.position.y.toFixed(4)}, ${camera.position.z.toFixed(4)}); spawnYaw = ${yaw.toFixed(4)}; spawnPitch = ${pitch.toFixed(4)};`
    console.log('P gedrückt — Spawn-Snippet:', snippet)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(snippet).then(
        () => console.log('(in die Zwischenablage kopiert)'),
        () => {}
      )
    }
    e.preventDefault()
  }
})

let collidables = []
let clickables  = []

// ── Inhaltsverzeichnis: Objektname → Overlay-Inhalt ──────────────
const CONTENT = {
  'YellowRoom_CoffeeTable': {
    title: 'Coffee Table',
    image: '',
    text:  'Placeholder-Text für den Coffee Table. Hier kannst du eine Beschreibung, Geschichte oder Information zu diesem Objekt eintragen.'
  },
  // Project pivots → their 2D project pages. Keyed on the DIRECT parent name
  // of each object's clickable meshes (checked one level up in the click
  // handler below), not the outer Pivot_* group — verified per-mesh via the
  // "Mesh: X | Parent: Y" console logging in the model-load traversal.
  // Only the product objects themselves are clickable (NewRoom_Podium, the
  // display pedestal, is deliberately NOT a key — clicking the podium itself
  // should do nothing, only the bottle sitting on it).
  'bottle_body_Podest': { title: 'Double Packaging', url: '/vaccine2d.html' },        // bottle on NewRoom_Podium
  'bottle_body':        { title: 'Double Packaging', url: '/vaccine2d.html' },        // second bottle instance (Pivot_Bottle)
  'Pivot_MacLamp':       { title: 'Mac-Lamp',         url: '/mac-lamp2d.html' },
  // The lamp on the YellowRoom coffee table. There is NO 'Pivot_MacLamp_Table' key any
  // more because that node does not exist in the GLB: the exporter collapses the empty
  // and parents these six meshes directly to SpinPivot (verified in the glTF node tree).
  // The old key matched nothing, which is exactly why the table lamp silently stopped
  // being clickable. Keyed per MESH instead — the only naming that survives the export.
  'Base_Orange_Table':          { title: 'Mac-Lamp', url: '/mac-lamp2d.html' },
  'VerticalPlate_Orange_Table': { title: 'Mac-Lamp', url: '/mac-lamp2d.html' },
  'KB_Grey_Panel_Table':        { title: 'Mac-Lamp', url: '/mac-lamp2d.html' },
  'Back_Grey_Panel_Table':      { title: 'Mac-Lamp', url: '/mac-lamp2d.html' },
  'Trackpad_Back_Grey_Table':   { title: 'Mac-Lamp', url: '/mac-lamp2d.html' },
  'Trackpad_Front_Grey_Table':  { title: 'Mac-Lamp', url: '/mac-lamp2d.html' },
  'egg-rig':             { title: 'Cybercoffee',      url: '/kaffeemaschine2d.html' }, // Pivot_Kaffeemaschine's mesh parent
  'Pivot_UNify':         { title: 'Unify',            url: '/unify2d.html' },
  'Pivot_VRPanel':       { title: 'Virtual Cooking',  url: '/virtual_cooking2d.html' },
}

const ray = new THREE.Raycaster()
ray.far = COLLISION_DIST

function canMove(origin, direction) {
  if (collidables.length === 0) return true
  ray.set(origin, direction)
  return ray.intersectObjects(collidables, false).length === 0
}

// YellowRoom's benches get a SECOND collision ray, fired LOW_RAY_DROP below the camera
// (~0.35 above that room's floor) instead of at eye height. They're the same walk-over
// problem as the podiums — the seat tops out well under the eye, which sits ~1.95 above
// the floor, so the normal ray sails straight over — but they can't be solved the same
// way: the bench is part of the same mesh as the curved wall, so its bounding box is
// 7.5 × 5.9 × 17.3, near enough the whole room, and a rectangle built from it would seal
// the room off. Its geometry, though, is exactly the right shape to hit.
//
// The low ray tests its OWN list, not `collidables`, and that restriction is load-bearing:
// BlueRoom's floor is a 0.72-thick slab spanning y -2.72..-2.00, so a ray at -2.365 sits
// INSIDE it and would block movement across that entire room. Every room's floor sits at a
// different height, and the camera's y is a single global constant, so there is no one drop
// value that clears all of them — hence an explicit opt-in list rather than a global pass.
const LOW_RAY_DROP = 1.6
const LOW_RAY_MESH_PATTERNS = ['Sofa']
let lowCollidables = []
const lowRay = new THREE.Raycaster()

// Probing is done with THREE parallel rays across the player's width, not one down the
// centre line, and the surface normal handed back is the AVERAGE of whatever they hit.
//
// That averaging is the fix for snagging on the ribbed walls and the podium panels. A
// single centre ray reports the normal of the one facet it happens to land on, so dropping
// into a groove it returns the groove's side wall — pointing across your path rather than
// out of it — and the slide computed from that drives you straight into the opposite side.
// You stick. Sampling across the player's width instead spans several ribs at once, and
// their side normals largely cancel, leaving the wall's overall facing. You slide along the
// run of the wall and ride over the detail.
//
// PROBE_HALF_WIDTH also gives the player some actual girth: with one ray you could clip a
// corner or a rib edge with your shoulder, because nothing was testing anywhere but dead
// ahead.
const PROBE_HALF_WIDTH = 0.22
const _probeOrigin = new THREE.Vector3()
const _probeLat    = new THREE.Vector3()
const _probeNormal = new THREE.Vector3()
const _faceNormal  = new THREE.Vector3()
const _slideA      = new THREE.Vector3()
const _slideB      = new THREE.Vector3()
const _probeResult = { blocked: false, normal: null, name: '' }

function probeMove(origin, direction) {
  _probeResult.blocked = false
  _probeResult.normal  = null
  _probeResult.name    = ''
  if (collidables.length === 0) return _probeResult

  // Lateral axis, perpendicular to travel and horizontal — the player's shoulder line.
  _probeLat.set(direction.z, 0, -direction.x)
  if (_probeLat.lengthSq() < 1e-8) return _probeResult
  _probeLat.normalize()

  _probeNormal.set(0, 0, 0)
  let normalCount = 0

  for (const lateral of [-PROBE_HALF_WIDTH, 0, PROBE_HALF_WIDTH]) {
    for (const drop of [0, LOW_RAY_DROP]) {
      // The low pass exists only for the opted-in meshes (see LOW_RAY_MESH_PATTERNS), so
      // skip it entirely when there are none rather than paying for a wasted cast.
      const targets = drop === 0 ? collidables : lowCollidables
      if (targets.length === 0) continue
      const caster = drop === 0 ? ray : lowRay
      caster.far = COLLISION_DIST
      _probeOrigin.copy(origin).addScaledVector(_probeLat, lateral)
      _probeOrigin.y -= drop
      caster.set(_probeOrigin, direction)
      const hits = caster.intersectObjects(targets, false)
      if (hits.length === 0) continue

      _probeResult.blocked = true
      if (!_probeResult.name) _probeResult.name = hits[0].object.name
      if (!hits[0].face) continue
      _faceNormal.copy(hits[0].face.normal)
      hits[0].object.updateWorldMatrix(true, false)
      _faceNormal.transformDirection(hits[0].object.matrixWorld)
      _faceNormal.y = 0
      if (_faceNormal.lengthSq() < 1e-8) continue
      _faceNormal.normalize()
      _probeNormal.add(_faceNormal)
      normalCount++
    }
  }

  // Opposed normals can cancel to nothing — a dead-end or a slot narrower than the probe
  // width. Treat that as "no usable normal" so the caller simply stops, rather than
  // sliding along a direction derived from near-zero noise.
  if (normalCount > 0 && _probeNormal.lengthSq() > 1e-4) {
    _probeResult.normal = _probeNormal.normalize()
  }
  return _probeResult
}

// ── Load model ───────────────────────────────────────────────────
const loader = new GLTFLoader()
const glbT0 = performance.now()
loader.load(
  '/current🟢.glb',
  (gltf) => {
    const model  = gltf.scene
    const box    = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    model.position.sub(center)
    scene.add(model)

    // Relative Schwellenwerte basierend auf der tatsächlichen Modellgröße
    const thinThresh = size.y * 0.04                        // 4 % der Gebäudehöhe
    const volThresh  = size.x * size.y * size.z * 0.00005  // 0.005 % des Modell-Volumens
    console.log(`Kollisions-Filter: thinThresh=${thinThresh.toFixed(3)}  volThresh=${volThresh.toFixed(3)}`)

    const EXCLUDE_NAMES = ['Grid', 'Rail', 'Gitter']

    model.traverse(child => {
      if (!child.isMesh) return

      const mb     = new THREE.Box3().setFromObject(child)
      const ms     = mb.getSize(new THREE.Vector3())
      const minDim = Math.min(ms.x, ms.y, ms.z)
      const volume = ms.x * ms.y * ms.z

      const nameExcluded = EXCLUDE_NAMES.some(p => child.name.includes(p))
      const isThinCylinder = child.name.includes('Wall_Cylinder') && minDim < thinThresh

      // NOTE mb is in MODEL-LOCAL space: assigning model.position above does not refresh
      // matrixWorld, and Box3.setFromObject calls updateWorldMatrix(false, true) — it
      // reuses the parent's stale matrix. Sizes are unaffected by a translation (which is
      // why the filter below is fine as-is) but positions need model.position added, the
      // same correction the fixture lights carry. Do NOT "fix" this with
      // model.updateMatrixWorld(true) — the spawn floor-probe depends on the stale
      // matrices and refreshing them ejects the camera from the scene.
      if (LOW_RAY_MESH_PATTERNS.some(p => child.name.includes(p))) lowCollidables.push(child)

      if (PODIUM_NAME_PATTERNS.some(p => child.name.includes(p))) {
        podiumZones.push({
          minX: mb.min.x + model.position.x, maxX: mb.max.x + model.position.x,
          minZ: mb.min.z + model.position.z, maxZ: mb.max.z + model.position.z,
        })
      }

      if (nameExcluded || isThinCylinder || (minDim < thinThresh && volume < volThresh)) {
        console.log('Kollision ignoriert:', JSON.stringify(child.name), `minDim=${minDim.toFixed(3)} vol=${volume.toFixed(3)}`)
      } else {
        collidables.push(child)
      }

      console.log('Mesh:', JSON.stringify(child.name), '| Parent:', JSON.stringify(child.parent?.name))
      if (child.name in CONTENT || (child.parent && child.parent.name in CONTENT))
        clickables.push(child)
    })
    console.log('Clickables gefunden:', clickables.length)

    // One podium is many meshes (sides, top panels, top bars — plus the object standing
    // on it, which also matches the name patterns). Left as separate rectangles they'd
    // overlap, and pushing out of each in turn can shove the player back into a
    // neighbour. So merge every overlapping pair into its union until nothing overlaps,
    // leaving one rectangle per physical podium. Margin is added last, after merging, so
    // it never causes a merge that the real geometry doesn't justify.
    for (let merged = true; merged; ) {
      merged = false
      outer:
      for (let i = 0; i < podiumZones.length; i++) {
        for (let j = i + 1; j < podiumZones.length; j++) {
          const a = podiumZones[i], b = podiumZones[j]
          if (a.minX > b.maxX || b.minX > a.maxX || a.minZ > b.maxZ || b.minZ > a.maxZ) continue
          a.minX = Math.min(a.minX, b.minX); a.maxX = Math.max(a.maxX, b.maxX)
          a.minZ = Math.min(a.minZ, b.minZ); a.maxZ = Math.max(a.maxZ, b.maxZ)
          podiumZones.splice(j, 1)
          merged = true
          break outer
        }
      }
    }
    for (const z of podiumZones) {
      z.minX -= PODIUM_MARGIN; z.maxX += PODIUM_MARGIN
      z.minZ -= PODIUM_MARGIN; z.maxZ += PODIUM_MARGIN
    }
    console.log('Low-Ray Meshes:', lowCollidables.length, lowCollidables.map(m => {
      const b = new THREE.Box3().setFromObject(m)
      return `${m.name} [x ${(b.min.x + model.position.x).toFixed(1)}..${(b.max.x + model.position.x).toFixed(1)}` +
             ` z ${(b.min.z + model.position.z).toFixed(1)}..${(b.max.z + model.position.z).toFixed(1)}]`
    }).join('  '))
    console.log('Podium-Sperrzonen:', podiumZones.length,
      podiumZones.map(z => `x ${z.minX.toFixed(1)}..${z.maxX.toFixed(1)} z ${z.minZ.toFixed(1)}..${z.maxZ.toFixed(1)}`).join(' | '))

    // Place a PointLight at each emissive ceiling fixture (and clamp over-bright
    // emissives). Must run AFTER model.position.sub(center) above, since it reads each
    // fixture's final world position.
    //
    // ...but running after the assignment is NOT sufficient on its own — see the
    // `.add(model.position)` note inside addFixtureLights for why, and why the fix must
    // NOT be a model.updateMatrixWorld() call here.
    addFixtureLights(model)

    const fixedClearance = size.y * 0.20
    const roofCutoff     = size.y * 0.35  // obere 35% = Dach, wird ausgeschlossen

    const probeRay = new THREE.Raycaster()
    probeRay.far   = size.y * 2
    const down     = new THREE.Vector3(0, -1, 0)
    const probes   = [
      [0, 0], [0, -size.z * 0.15], [0, size.z * 0.15],
      [-size.x * 0.15, 0], [size.x * 0.15, 0],
    ]

    let spawnFound = false
    for (const [ox, oz] of probes) {
      probeRay.set(new THREE.Vector3(ox, size.y / 2, oz), down)
      const hits = probeRay.intersectObjects(collidables, false)

      // Dach explizit ausschließen (obere 35% der Bounding Box)
      const floors = hits
        .filter(h => h.face && h.face.normal.y > 0.5 && h.point.y < roofCutoff)
        .sort((a, b) => a.point.y - b.point.y)  // tiefster Boden zuerst

      for (const hit of floors) {
        const clearRay = new THREE.Raycaster(
          new THREE.Vector3(ox, hit.point.y + 0.02, oz),
          new THREE.Vector3(0, 1, 0), 0, fixedClearance
        )
        if (clearRay.intersectObjects(collidables, false).length > 0) continue

        floorY = hit.point.y
        camera.position.set(ox, floorY + playerHeight, oz)
        spawnPos = camera.position.clone()
        spawnYaw = yaw; spawnPitch = pitch
        spawnFound = true
        break
      }
      if (spawnFound) break
    }

    if (!spawnFound) {
      floorY = -size.y * 0.4  // 40% von unten = knapp über Bodenplatte
      camera.position.set(0, floorY + playerHeight, 0)
      spawnPos = camera.position.clone()
      spawnYaw = yaw; spawnPitch = pitch
    }

    // Fixed initial spawn (user-captured via the P debug key) — overrides
    // the auto-detected floor-probe spawn point above so the page normally
    // opens at this exact position/angle. floorY/collidables from the
    // probing above are kept as-is (still needed for live movement
    // collision + the per-frame floorY+playerHeight+bob height system).
    //
    // EXCEPTION: if the user is returning from a project page's "Exit"
    // button, restore the exact spot they clicked the object from instead
    // (saved to sessionStorage right before navigating away — see the click
    // handler below) so the scene continues where they left it rather than
    // resetting to the fixed spawn every time.
    let restoredReturnState = false
    const returnStateRaw = sessionStorage.getItem('_3dReturnState')
    sessionStorage.removeItem('_3dReturnState')
    if (returnStateRaw) {
      try {
        const rs = JSON.parse(returnStateRaw)
        camera.position.set(rs.x, rs.y, rs.z)
        yaw = rs.yaw
        pitch = rs.pitch
        restoredReturnState = true
      } catch (e) { /* malformed/stale — fall through to the fixed spawn */ }
    }
    if (!restoredReturnState) {
      // Captured with the P debug key; frames the green centre-column pillar in MainRoom
      // with a doorway either side.
      camera.position.set(2.2970, -0.7653, 9.6615)
      yaw = 2.3400
      pitch = 0.0540
    }
    applyRotation()
    syncSteeringToView()
    spawnPos = camera.position.clone()
    spawnYaw = yaw
    spawnPitch = pitch

    console.log(`Modellgröße: x=${size.x.toFixed(2)} y=${size.y.toFixed(2)} z=${size.z.toFixed(2)}`)
    console.log(`floorY=${floorY.toFixed(3)} | playerHeight=${playerHeight.toFixed(4)} | spawnFound=${spawnFound}`)
    console.log(`Kamerastart: x=${camera.position.x.toFixed(2)} y=${camera.position.y.toFixed(2)} z=${camera.position.z.toFixed(2)}`)

    // The single most useful number on this site: the GLB is the whole
    // experience, and anyone who leaves before it lands never saw anything.
    // Bucketed rather than raw so the dashboard groups it (Umami treats event
    // props as strings/categories, not a numeric series to average).
    const ms = Math.round(performance.now() - glbT0)
    if (window.track) window.track('scene_loaded', {
      mobile: isMobile,
      seconds: ms < 2000 ? '0-2' : ms < 5000 ? '2-5' : ms < 10000 ? '5-10' : '10+',
      ms
    })

    if (window._loader) window._loader.done()
  },
  e => {
    // Real download progress for the loading screen (e.total is 0 if the
    // server sends no content-length — then the loader just eases on done())
    if (window._loader && e.total) window._loader.progress(e.loaded / e.total)
  },
  err => {
    console.error('GLB load error:', err)
    if (window.track) window.track('scene_load_failed', { mobile: isMobile })
    if (window._loader) window._loader.done()
  }
)

// ── Render loop ──────────────────────────────────────────────────
let isOverlayOpen = false
let lastCollisionLog = 0
const forward = new THREE.Vector3()
const right   = new THREE.Vector3()
const UP      = new THREE.Vector3(0, 1, 0)
const clock   = new THREE.Clock()

// ── Head bob ─────────────────────────────────────────────────────
let bobTime      = 0
let bobIntensity = 0
const BOB_AMPLITUDE = 0.07   // vertikale Schwingweite in Einheiten
const BOB_FREQ      = 2.0    // Zyklen pro Sekunde (Schrittrhythmus)

function animate() {
  requestAnimationFrame(animate)

  // Clamped: after any rAF stall (backgrounded tab, notification shade, iOS
  // throttling) the first frame back reports the WHOLE gap as one delta —
  // unclamped, that frame teleports the player SPEED×gap units (far past the
  // 0.4-unit collision probe, i.e. straight through walls) and snaps every
  // exponential ease to its target. 0.1s caps the damage: stalls simply
  // don't advance the simulation, normal frames (16–33ms) are untouched.
  const delta = Math.min(clock.getDelta(), 0.1)
  camera.getWorldDirection(forward)
  forward.y = 0
  forward.normalize()
  right.crossVectors(forward, UP).normalize()

  if (isOverlayOpen) { renderer.render(scene, camera); return }

  // ── Mobile steering composition (see the steering-model comment block) ──
  // Joystick beyond the deadzone → retarget the heading; heading eases toward
  // the target; a released peek eases home; camera = heading + peek.
  let stickWalking = false
  if (isMobile) {
    if (Math.hypot(joystickX, joystickY) >= STICK_DEADZONE) {
      stickWalking = true
      // atan2(-x, -y): stick up = 0 (straight on), left = +π/2 (left turn),
      // straight down = π (about-turn) — matching yaw's left-positive sense.
      targetHeadingYaw = stickRefYaw + Math.atan2(-joystickX, -joystickY)
    }
    const k = 1 - Math.exp(-STEER_EASE * delta)   // framerate-independent ease
    // wrapAngle → always the short arc, so a hard 180° stick flip swings
    // round the near way instead of unwinding the long way. The step is then
    // capped at STEER_MAX_RATE so big turns take proportionally longer (see
    // the constant's comment); small corrections never reach the cap.
    let steerStep = wrapAngle(targetHeadingYaw - headingYaw) * k
    const maxStep = STEER_MAX_RATE * delta
    if (steerStep >  maxStep) steerStep =  maxStep
    if (steerStep < -maxStep) steerStep = -maxStep
    headingYaw += steerStep
    // Only PITCH returns after a look — swiped yaw is already part of the
    // heading (the frame rotates live in the touchmove handler).
    if (cameraTouchId === null && peekPitch !== 0) {
      peekPitch -= peekPitch * k
      if (Math.abs(peekPitch) < 0.0005) peekPitch = 0
    }
    yaw   = headingYaw
    pitch = headingPitch + peekPitch
    clampPitch(); applyRotation()
  }

  // Arrow keys are full aliases for WASD, not a separate mode — they feed the same
  // two axes below, so diagonals (e.g. ArrowUp + KeyD) and mixed WASD/arrow presses
  // work exactly like pure WASD. Note `right`/`forward` above are direction Vector3s,
  // hence the goL/goR/goF/goB names here rather than the obvious ones.
  const goL = keys['KeyA'] || keys['ArrowLeft']
  const goR = keys['KeyD'] || keys['ArrowRight']
  const goF = keys['KeyW'] || keys['ArrowUp']
  const goB = keys['KeyS'] || keys['ArrowDown']

  const move = new THREE.Vector3()
  // `||` (truthiness), NOT `!==`. `keys` has THREE states — undefined (never pressed),
  // true (down), false (released) — so a strict comparison between the two sides is
  // wrong: after releasing ArrowLeft, goL is `false` while goR is still `undefined`,
  // and `false !== undefined` is TRUE, which left the branch permanently satisfied and
  // walked the camera forever. WASD hid it, because pressing those keys at least once
  // makes both sides real booleans. Truthiness treats undefined and false alike.
  if (goL || goR) move.addScaledVector(right,   goR ? 1 : -1)
  if (goF || goB) move.addScaledVector(forward, goF ? 1 : -1)
  // The stick no longer strafes: you always walk along the heading (the
  // direction the camera is turning to face), so during a steer the path
  // curves with the view. Deliberately headingYaw and not the camera's
  // forward — the composed camera includes the peek, and glancing around
  // mid-walk must not bend the path. Constant speed above the deadzone,
  // exactly like the key path (move is normalized below).
  if (stickWalking) {
    move.x -= Math.sin(headingYaw)
    move.z -= Math.cos(headingYaw)
  }

  if (move.lengthSq() > 0) {
    move.normalize()
    const probe = probeMove(camera.position, move)
    if (probe.blocked) {
      const now = performance.now()
      if (now - lastCollisionLog > 500) {
        lastCollisionLog = now
        console.log('BLOCKIERT von:', JSON.stringify(probe.name), '| normal:', probe.normal ? 'ja' : 'nein')
      }
    }
    if (!probe.blocked) {
      camera.position.addScaledVector(move, SPEED * delta)
    } else if (probe.normal) {
      // Project the movement onto the wall (strip the normal component), then, if that
      // slide is itself blocked, project ONCE more against whatever stopped it. The second
      // pass is what gets you out of a groove: entering one, the first slide runs you into
      // the groove's opposite face, and with a single pass you'd simply stop dead — which
      // is exactly the "caught on the ribs" feel. Projecting again resolves the two faces
      // into the one direction that satisfies both, so you slide along the wall's overall
      // run instead of pinballing between its details.
      const slide = _slideA.copy(move).addScaledVector(probe.normal, -move.dot(probe.normal))
      slide.y = 0
      if (slide.lengthSq() > 0.001) {
        slide.normalize()
        const p2 = probeMove(camera.position, slide)
        if (!p2.blocked) {
          camera.position.addScaledVector(slide, SPEED * delta)
        } else if (p2.normal) {
          const slide2 = _slideB.copy(slide).addScaledVector(p2.normal, -slide.dot(p2.normal))
          slide2.y = 0
          if (slide2.lengthSq() > 0.001) {
            slide2.normalize()
            if (!probeMove(camera.position, slide2).blocked)
              camera.position.addScaledVector(slide2, SPEED * delta)
          }
        }
      }
    }
  }

  // ── Podiums: push back out along the shallowest axis ─────────────
  // Runs after the move + slide so it corrects the final position instead of fighting the
  // collision solver. Choosing the smallest of the four penetration depths means you're
  // ejected through the nearest face, so walking into a podium's side slides you along it
  // rather than teleporting you around a corner.
  for (const z of podiumZones) {
    const { x, z: pz } = camera.position
    if (x <= z.minX || x >= z.maxX || pz <= z.minZ || pz >= z.maxZ) continue
    const dxMin = x - z.minX, dxMax = z.maxX - x
    const dzMin = pz - z.minZ, dzMax = z.maxZ - pz
    const m = Math.min(dxMin, dxMax, dzMin, dzMax)
    if      (m === dxMin) camera.position.x = z.minX
    else if (m === dxMax) camera.position.x = z.maxX
    else if (m === dzMin) camera.position.z = z.minZ
    else                  camera.position.z = z.maxZ
  }

  // PinkRoom's central column — circular, so push radially out to the boundary rather than
  // through a face. The dead-centre case can't be normalised, so it ejects along +x.
  {
    const dx = camera.position.x - PINK_COLUMN.x
    const dz = camera.position.z - PINK_COLUMN.z
    const d  = Math.hypot(dx, dz)
    const rr = PINK_COLUMN.r + PODIUM_MARGIN
    if (d < rr) {
      const ux = d > 1e-4 ? dx / d : 1
      const uz = d > 1e-4 ? dz / d : 0
      camera.position.x = PINK_COLUMN.x + ux * rr
      camera.position.z = PINK_COLUMN.z + uz * rr
    }
  }

  // ── BlueRoom cove: hard stop before the curve ────────────────────
  // Its back wall is a curved cove built from loose, unwelded tile quads, and the tiles do
  // not close up perfectly around the curve — you could walk straight through the gaps.
  // Raycast collision can't help: it tests the tile geometry, and the holes ARE the gaps.
  // So the room gets an explicit boundary instead, placed at the cove's tangent line so you
  // stop exactly where the curve begins and never reach the leaky part.
  //
  // Scoped to BlueRoom's own footprint (measured world extents x -10.34..0.14,
  // z 27.58..39.26) so no other room is affected. Applied AFTER the move + slide above, so
  // it clamps the final position rather than fighting the collision solver.
  if (camera.position.x > -10.9 && camera.position.x < 0.7 &&
      camera.position.z > BLUEROOM_Z_LIMIT) {
    camera.position.z = BLUEROOM_Z_LIMIT
  }

  const isMoving = move.lengthSq() > 0
  bobIntensity += ((isMoving ? 1 : 0) - bobIntensity) * Math.min(1, 7 * delta)
  bobTime      += delta * bobIntensity
  const bob     = Math.sin(bobTime * Math.PI * 2 * BOB_FREQ) * BOB_AMPLITUDE * bobIntensity

  camera.position.y = floorY + playerHeight + bob

  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ── Controls Overlay ────────────────────────────────────────────
const controlsOverlay = document.getElementById('controls-overlay')

function openControls() {
  if (window.track) window.track('nav_open', { panel: 'controls' })
  ensureOverlayFrameLoaded('controls-frame')
  controlsOverlay.classList.add('open')
  isOverlayOpen = true
}

function closeControls() {
  controlsOverlay.classList.remove('open')
  isOverlayOpen = false
}

controlsOverlay.addEventListener('click', e => { if (e.target === controlsOverlay) closeControls() })

// The first-visit greeting is now the fullscreen controls intro in index.html
// (shown after the loading screen), so the windowed overlay no longer auto-opens.

// Listen for message from floating button iframe
window.addEventListener('message', e => {
  if (e.data.type === 'openControls') {
    openControls()
  }
})

// ── Craft Overlay ────────────────────────────────────────────────
const craftOverlay = document.getElementById('craft-overlay')

function openCraft() {
  if (window.track) window.track('nav_open', { panel: 'craft' })
  ensureOverlayFrameLoaded('craft-frame')
  craftOverlay.classList.add('open')
  isOverlayOpen = true
}

function closeCraft() {
  craftOverlay.classList.remove('open')
  isOverlayOpen = false
  const topBar = document.getElementById('top-bar')
  if (topBar && topBar.contentDocument) {
    topBar.contentDocument.querySelectorAll('.nav-pill .pill__seg').forEach(s => {
      s.classList.remove('is-active')
      s.setAttribute('aria-selected', 'false')
    })
  }
}

window.openCraftOverlay = openCraft

craftOverlay.addEventListener('click', e => { if (e.target === craftOverlay) closeCraft() })

// ── Contact Overlay ───────────────────────────────────────────────
const contactOverlay = document.getElementById('contact-overlay')

function openContact() {
  if (window.track) window.track('nav_open', { panel: 'contact' })
  ensureOverlayFrameLoaded('contact-frame')
  contactOverlay.classList.add('open')
  isOverlayOpen = true
}

function closeContact() {
  contactOverlay.classList.remove('open')
  isOverlayOpen = false
  const topBar = document.getElementById('top-bar')
  if (topBar && topBar.contentDocument) {
    topBar.contentDocument.querySelectorAll('.nav-pill .pill__seg').forEach(s => {
      s.classList.remove('is-active')
      s.setAttribute('aria-selected', 'false')
    })
  }
}

window.openContactOverlay = openContact

contactOverlay.addEventListener('click', e => { if (e.target === contactOverlay) closeContact() })

// ── About Overlay ────────────────────────────────────────────────
const aboutOverlay = document.getElementById('about-overlay')

function openAbout() {
  if (window.track) window.track('nav_open', { panel: 'about' })
  ensureOverlayFrameLoaded('about-frame')
  aboutOverlay.classList.add('open')
  isOverlayOpen = true
}

function closeAbout() {
  aboutOverlay.classList.remove('open')
  isOverlayOpen = false
  const topBar = document.getElementById('top-bar')
  if (topBar && topBar.contentDocument) {
    topBar.contentDocument.querySelectorAll('.nav-pill .pill__seg').forEach(s => {
      s.classList.remove('is-active')
      s.setAttribute('aria-selected', 'false')
    })
  }
}

window.openAboutOverlay = openAbout

window.resetScene = function () {
  if (!spawnPos) return
  camera.position.copy(spawnPos)
  yaw   = spawnYaw
  pitch = spawnPitch
  applyRotation()
  syncSteeringToView()
}

aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) closeAbout() })

function ensureOverlayFrameLoaded(id) {
  const frame = document.getElementById(id)
  if (!frame) return
  const src = frame.dataset.src
  if (src && frame.src !== src) frame.src = src
}

// ── Info-Overlay ─────────────────────────────────────────────────
const infoOverlay = document.getElementById('info-overlay')
const infoTitle   = document.getElementById('info-title')
const infoImage   = document.getElementById('info-image')
const infoText    = document.getElementById('info-text')
const infoClose   = document.getElementById('info-close')

function openOverlay(name) {
  const data = CONTENT[name]
  if (!data) return
  // `data.title`, not the raw mesh name — several meshes map to one project
  // (Mac-Lamp alone has six), and the dashboard should show one row per project.
  if (window.track) window.track('project_open', { project: data.title, via: 'info-overlay' })
  infoTitle.textContent = data.title
  infoText.textContent  = data.text
  if (data.image) {
    infoImage.src = data.image
    infoImage.classList.remove('hidden')
  } else {
    infoImage.src = ''
    infoImage.classList.add('hidden')
  }
  infoOverlay.classList.add('open')
  isOverlayOpen = true
}

function closeOverlay() {
  infoOverlay.classList.remove('open')
  isOverlayOpen = false
}

infoClose.addEventListener('click', closeOverlay)
infoOverlay.addEventListener('click', e => { if (e.target === infoOverlay) closeOverlay() })

// Escape key closes any open overlay
window.addEventListener('keydown', e => {
  if (e.code !== 'Escape') return
  if (aboutOverlay.classList.contains('open')) {
    closeAbout()
  }
  if (contactOverlay.classList.contains('open')) {
    closeContact()
  }
  if (craftOverlay.classList.contains('open')) {
    closeCraft()
  }
  if (controlsOverlay.classList.contains('open')) {
    closeControls()
  }
})

// Raycasting für Klick-Erkennung
const clickRay = new THREE.Raycaster()
const mouse    = new THREE.Vector2()

renderer.domElement.addEventListener('click', e => {
  if (isOverlayOpen) return
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  clickRay.setFromCamera(mouse, camera)

  // Zuerst gegen ALLE collidables testen, um zu sehen was getroffen wird
  const allHits = clickRay.intersectObjects(collidables, false)
  if (allHits.length > 0) {
    const o = allHits[0].object
    console.log('Geklickt → Mesh:', JSON.stringify(o.name), '| Parent:', JSON.stringify(o.parent?.name))
  }

  const hits = clickRay.intersectObjects(clickables, false)
  if (hits.length === 0) return
  const obj  = hits[0].object
  const name = obj.name in CONTENT ? obj.name : obj.parent?.name
  if (name) {
    const data = CONTENT[name]
    if (data.url) {
      if (window.track) window.track('project_open', { project: data.title, via: '3d-click' })
      // Save the exact spot we're leaving from so the Exit button on the
      // destination page can bring us right back to it (read back by the
      // restore logic right after the GLTFLoader spawn block above).
      sessionStorage.setItem('_3dReturnState', JSON.stringify({
        x: camera.position.x, y: camera.position.y, z: camera.position.z,
        yaw, pitch
      }))
      // ?from=3d tells the destination page it was opened from the 3D scene,
      // so it swaps its usual nav bar for a fixed "Exit" button that returns
      // here — see the per-page <script> block that checks this param.
      window._nav(data.url + '?from=3d', 'left')
    } else {
      openOverlay(name)
    }
  }
})

// ── Kaffeemaschine Overlay ───────────────────────────────────────
const kaffeemaschineOverlay = document.getElementById('kaffeemaschine-overlay')

function openKaffeemaschine() {
  if (window.track) window.track('project_open', { project: 'Cybercoffee', via: 'overlay' })
  ensureOverlayFrameLoaded('kaffeemaschine-frame')
  kaffeemaschineOverlay.classList.add('open')
  isOverlayOpen = true
}

function closeKaffeemaschine() {
  kaffeemaschineOverlay.classList.remove('open')
  isOverlayOpen = false
}

window.openKaffeemaschineOverlay = openKaffeemaschine
kaffeemaschineOverlay.addEventListener('click', e => { if (e.target === kaffeemaschineOverlay) closeKaffeemaschine() })

// ── Mobile overlay close buttons ─────────────────────────────────
;[
  ['about-close-btn',          closeAbout],
  ['contact-close-btn',        closeContact],
  ['craft-close-btn',          closeCraft],
  ['controls-close-btn',       closeControls],
  ['kaffeemaschine-close-btn', closeKaffeemaschine],
].forEach(([id, fn]) => {
  document.getElementById(id)?.addEventListener('click', fn)
})

// ── Mobile overlay back buttons (close overlay → reopen menu) ────
const mobileMenu = document.getElementById('mobile-menu')
const openMobileMenu = () => mobileMenu?.classList.add('open')
;[
  ['about-back-btn',          closeAbout],
  ['contact-back-btn',        closeContact],
  ['craft-back-btn',          closeCraft],
  ['controls-back-btn',       closeControls],
  ['kaffeemaschine-back-btn', closeKaffeemaschine],
].forEach(([id, closeFn]) => {
  document.getElementById(id)?.addEventListener('click', () => {
    closeFn()
    openMobileMenu()
  })
})

