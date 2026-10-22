# Fourth gallery project interactions — integration handoff

Historical, unused adapter proposal retained for reference. The shipped default
and version 4 use the project group bindings in `src/main.js`; this adapter is
not imported. Versions 2 and 3 have since been removed. Its isolated test reads
the original geometry from the pinned Git tag, and the old baked URL now redirects
to `/gallery-4.html`. The integration steps below describe the earlier proposal,
not changes required for the current gallery.

Prepared independently of the active bake/export. **Not activated in `main.js`
yet.** No Blender files, bake assets, third-gallery material code or scene-loader
logic were changed. `public/js/exit-3d.js` has one fourth-only return-path branch;
all existing `?from=3d` links without the new scene parameter still return to `/`.

## Ready module

`src/gallery/project-interactions.js` exports:

- `prepareGalleryProjectInteractions`: creates picking/pop bindings and chrome arrows.
- `readGalleryReturnPose`: validates the fourth gallery's stored camera pose.
- `GALLERY_RETURN_STATE_KEY`: `_bakedGalleryReturnState`, independent of other scenes.

The adapter reuses the **existing** `startPop`, `updatePops`, click/drag guards,
navigation transition and `projectArrows` animation loop in `src/main.js`. It
starts no render loop or event listeners. The arrows reproduce the old geometry,
bevel, size, gap, chrome material and phase; the existing loop supplies the same
0.06 m bob at 0.5 Hz and 0.8 rad/s spin. Unify retains the old deliberate no-arrow
behaviour. The four remaining projects each get one arrow.

All meshes of each exhibit are grouped logically, without reparenting or changing
their materials/geometries. Bottle body, label and lid pop together. All six
Mac-Lamp meshes pop together. Their shared bounding-box bottom anchors the old
1.15x / 0.28 s sine pulse, so their bases do not enter the podium. Floating
exhibits pulse about their shared center. Podiums and light strips are excluded.

## Integrate only when the fourth loader is ready

1. Import the module in the fourth runtime or shared main module. Keep installation
   behind the exact `/gallery-baked.html` route; do not install in option three.
2. After both the new baked model and retained bottle are added and transforms
   finalized, call:

   ```js
   bakedInteractions = prepareGalleryProjectInteractions({
     roots: [bakedModel, retainedBottleRoot],
     scene, renderer, clickables, projectArrows,
   })
   ```

   Pass only the retained bottle subtree, not the entire old gallery a second
   time. If all five products live in one final model, use `roots: [bakedModel]`.
   Preserve `galleryRole: 'project'` and `galleryProject` metadata during export.
   The module also handles the original mesh/group names if metadata is absent.
   Register the new arrow material with the fourth renderer's OCIO/tone-mapping
   hooks, just like other newly created materials, before compile/first render.

3. In the existing click handler, **after** overlay/drag guards and the existing
   clickables raycast, and **before** old `CONTENT` lookup, add:

   ```js
   if (bakedInteractions?.activate(obj, {
     startPop,
     navigate: (url, direction) => window._nav(url, direction),
     readPose: () => ({
       x: camera.position.x, y: camera.position.y, z: camera.position.z,
       yaw, pitch,
     }),
     storage: sessionStorage,
     track: window.track,
   })) return
   ```

   This preserves picking and camera-drag behaviour. No second pointer handler
   or animation loop is needed. It navigates once, after the pulse, to the exact
   old project URL plus `?from=3d&scene=gallery-baked`.

4. The fourth branch of the loader must use `GALLERY_RETURN_STATE_KEY`, then
   restore `readGalleryReturnPose(sessionStorage)` **after** its initial spawn
   assignment and before compile. Restore camera position, yaw/pitch, steering
   and rotation using the same helpers as the old portfolio. Preserve its normal
   reset/spawn semantics and BFCache return-state refresh, using the fourth key.
5. Alongside the existing persisted `pageshow` handler's pop reset, call
   `bakedInteractions?.resetNavigation()` to unlock clicks after a back-swipe.
   Do not clear the return pose on BFCache restore. Invoke `dispose()` only when
   this scene is unloaded/replaced; it removes only its own arrows/picking entries.

## Links

| Project | Existing page | Pop anchor |
|---|---|---|
| Unify | `/unify2d.html` | Center |
| Double Packaging | `/vaccine2d.html` | Bottom |
| Mac-Lamp | `/mac-lamp2d.html` | Bottom |
| Virtual Cooking | `/virtual_cooking2d.html` | Center |
| Cybercoffee | `/kaffeemaschine2d.html` | Center |

## Validation completed

Run `node scripts/check-gallery-project-interactions.mjs`. It decodes the actual
retained third-gallery GLB and executes the actual old `startPop`/`updatePops`
functions from `main.js`, verifying all project groups, multipart bottle and lamp,
fixed seated-object bases at peak scale, floating-object centers, exact transform
restoration, four arrow bindings, deferred/single navigation, valid/invalid camera
state and the real Exit script's fourth-only/default routes. Syntax checks pass.

Remaining integration checks, once the new scene exists: clicking every visible
project part/arrow, drag suppression and overlays, actual return camera pose,
Safari BFCache, and live arrow appearance with the fourth colour pipeline.
