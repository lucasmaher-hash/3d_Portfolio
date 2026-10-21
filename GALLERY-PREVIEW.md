# Unlisted gallery preview · 21 October 2026

`/gallery.html` is a separate entry point. It is not linked from the normal
site and carries `noindex, nofollow`; it is unlisted, not password protected.
The original scene and default 2D entry remain in place.

The page reuses the existing desktop and mobile controls in `src/main.js`.
Only the gallery branch loads `src/gallery/scene.js` and the new asset.
`public/gallery-nav.html` is a private copy of the nav; shared about/help
overlays receive the fixed `#809BBC` accent. No room colour switching.

## Player calibration

- Vertical field of view: 90°, unchanged.
- Walking speed: 3.45 units/s, unchanged.
- Eye above floor: 1.9386224, measured from the old actual spawn and floor,
  not the old negative offset before bbox recentering.
- Clear floor-to-ceiling height: 4.904408, matching old MainRoom.
- New floor plan stays at its approved horizontal dimensions. A vertical
  scale of 1.6410608 applies only to the exported copy, before baking.
- Spawn: centre `[0, 1.9386224, 0]`, yaw π toward the ring exit, pitch .054.
- The GLB keeps its origin; no automatic bbox recentering.
- Wall collision uses the existing shoulder-width rays and BVH. Legacy
  PinkRoom/BlueRoom hard-coded limits are disabled on this route.

## Lighting and export

Use the approved `gallery_layout.blend`, not the old portfolio .blend.
The export process runs on a background copy and never saves over that file.
Gallery architecture, five fitted podiums and exhibits, rim strips and the six
ceiling fixtures are exported;
the sample wall, separate light sample, guides and studio are excluded.

1. Run Blender in background with `scripts/export-gallery.py -- OUTPUT_DIR`.
   **Draft is the default:** 16 samples, 512px architecture / 128px details,
   with 25% geometry in a disposable export copy. Use `--final` only when
   explicitly requested: 128 samples and full-resolution textures/geometry.
   This exports the new geometry and Cycles diffuse bakes (direct + indirect +
   surface colour). Raw files belong outside `public/`, e.g. `~/TEMP/glb-backups/`.
   Use a new output directory after material or lighting changes.
2. Run `scripts/denoise-gallery.py OUTPUT_DIR` with Python + NumPy + Pillow.
   It uses Blender's bundled OpenImageDenoise on macOS.
3. Run `node scripts/optimize-gallery.mjs OUTPUT_DIR`. This packages denoised
   textures as JPEG, quantizes geometry and uses meshopt compression.
   The result is `public/gallery-assets/{gallery.glb,scene.json}`.
4. `npm run build` creates both HTML entry points. Preview `/gallery.html`
   directly, including in a fresh browser tab.

Floor and ceiling use smooth `#376478`, roughness 0.30, without wood grain or
bump. Wall atlases reserve separate padded crown/foot strips, use integer
geometry boundaries between panels and bake at 4096px / 128 samples. The rim
regression check is `node scripts/check-gallery-lighting.mjs`; structural
checks are `node scripts/check-gallery.mjs`.

Baked architecture illumination is exported as emissive maps so it is not lit
a second time by runtime lights. Imported exhibits keep their original PBR
materials, textures and dimensions; six spotlights light
the exhibits while baked surfaces have zero diffuse albedo. Their vertical placement follows the exported podium top,
but the product geometry is never stretched. Three.js uses AgX and a local room reflection probe.
The probe is an approximation: reflections will not exactly match Cycles at
every camera position. Moving fixtures or changing architecture requires a
fresh bake. Bake images are denoised LDR, so this preview is not an HDR master.
Retain the source .blend for later higher-resolution/HDR baking.

The original portfolio's GLB optimizer remains unchanged.

## Iteration 2

The bottle podium is twice its previous width (1.205976 m top diameter), with
unchanged height and product dimensions. Its floor cutout and LED follow the
new foot. A sixth ceiling opening at the room centre is 4.68 m wide, 130% of
the Mac-Lamp fixture. Mac-Lamp orange is #F56B1D. This initial 0.8 exposure reduction proved insufficient and has been superseded
by the independent lighting controls below. The source model stays full-resolution for later final bakes.

Measured iteration 2: draft bake + raw export 26.4 seconds; final bake + raw
export 15.5 minutes. Denoising, packaging, verification and deployment are additional.

## Independent lighting controls

The latest preview uses `--separate-lights` (draft by default): one ambient/rim
bake plus six isolated ceiling-source bakes, including direct and indirect light.
The shader adds these linear contributions with six live weights. Basis JPEGs
are in `public/gallery-assets/lightmaps/`; embedded emissive maps hold ambient.
The first 105-map draft bake/export took 110.4 seconds. Changing intensity now
requires no rebake. Moving lights, changing colour/materials or geometry does.

Default ceiling levels are 25%, overall exposure 55%, ambient/rims 50%. The
floor/ceiling environment intensity was reduced from 0.45 to 0.08 to prevent
the center fixture's reflection probe from washing out the floor. Reflections
remain an approximation. Per-fixture PBR spotlights and visible discs follow
the same weights as the baked contributions. Sliders save on this device under
`gallery-lighting-v2`; Reset restores the darker defaults. Arrow keys on sliders
do not trigger walking. All controls are exclusive to `/gallery.html`.

Source Blender ceiling energies and emitter strength are also reduced to 25%,
with exposure -0.8625 stops; source geometry remains full resolution. The bake
restores 100% per-source reference energy for isolated maps, so the browser's
25% setting matches the dimmed source. The previous full combined bake remains
in the external backup directory `gallery-final-02`.

## Third version: repaired early gallery (2026-10-21)

`/gallery-original.html` is an independent unlinked comparison. Lucas clarified that the baseline must be the early **repaired** gallery at `37923c5` (center-room border and texture repair), rather than the first export at `b9641d9`. The repaired wall geometry and baked image bytes are retained exactly, with their original AgX exposure 1 and no later wall-fill shader. Five podiums/projects come from the full-geometry final-02 backup. Both current approved blue floor and ceiling, six light wells and diffusers are imported from the approved snapshot. Their ambient/lightmap fields are composed at ambient 59%, lights 41/30/25/25/25/25%, exposure 56%. Original camera, walking settings and rim-light strips remain. Project-only realtime spotlights cannot illuminate the walls.

Build: `node scripts/create-original-gallery.mjs /path/to/gallery-37923c5.glb`; check: `node scripts/check-original-gallery.mjs /path/to/gallery-37923c5.glb`. Source backups stay outside public. The working Blender scene and other routes remain unchanged.

### Approved checkpoint and center-wall adjustment

Before the center-wall brightness change, the entire working state was committed as `cef2e07` and tagged `gallery-approved-2026-10-21-2013`. This is Lucas's explicitly approved return point, including rounded blue recesses. Restore into a separate worktree or inspect the tag; do not reset newer work destructively. Subsequent center-wall matching changes only the inward-facing ring's baked radiance with a highlight-preserving curve. Its normal-direction mask excludes the exterior side. The adjustment is disabled during the reflection-probe capture to retain the approved slab reflections; no asset or bake is overwritten.
