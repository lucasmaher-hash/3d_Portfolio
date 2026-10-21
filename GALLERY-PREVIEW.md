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
Only gallery architecture, rim strips and five ceiling fixtures are exported;
the sample wall, separate light sample, guides and studio are excluded.

1. Run Blender in background with `scripts/export-gallery.py -- OUTPUT_DIR`.
   This exports the new geometry and Cycles diffuse bakes (direct + indirect +
   surface colour). Raw files belong outside `public/`, e.g. `~/TEMP/glb-backups/`.
   `--reuse` is only for the known rim-atlas repair, not a general fresh bake.
2. Run `scripts/denoise-gallery.py OUTPUT_DIR` with Python + NumPy + Pillow.
   It uses Blender's bundled OpenImageDenoise on macOS.
3. Run `node scripts/optimize-gallery.mjs OUTPUT_DIR`. This packages denoised
   textures as JPEG, quantizes geometry and uses meshopt compression.
   The result is `public/gallery-assets/{gallery.glb,scene.json}`.
4. `npm run build` creates both HTML entry points. Preview `/gallery.html`
   directly, including in a fresh browser tab.

Baked illumination is exported as emissive maps so it is not lit a second
time by runtime lights. Three.js uses AgX and a local room reflection probe.
The probe is an approximation: reflections will not exactly match Cycles at
every camera position. Moving fixtures or changing architecture requires a
fresh bake. Bake images are denoised LDR, so this preview is not an HDR master.
Retain the source .blend for later higher-resolution/HDR baking.

The original portfolio's GLB optimizer remains unchanged.
