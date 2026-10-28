# Runtime findings and implementation · 28 October 2026

Chrome 156.0.8078.48, headless, ANGLE Metal on Apple M4. Desktop viewport 1440×1000 at DPR 2. Touch emulation 390×1000 at DPR 2; this is not real iPhone/Safari evidence. Tests ran locally. Timing varies with GPU/driver caches and machine load; these are sampled rAF intervals, not universal performance guarantees.

## Baseline and red signal

`node /tmp/portfolio-perf-tools/baseline.mjs` reproduced an actual scene document replacement on project Exit: `FAIL: Exit recreated scene document and loaded gallery assets again`; 43 gallery resource requests in the new document, with 616ms and 292ms main-thread long tasks. This was an exploratory navigation reproduction, not an end-to-end latency measurement.

An initial exploratory first-exhibit sweep recorded 299.9ms for Double Packaging and 266.7ms for Mac-Lamp. A later, more controlled run with the intro skipped recorded 33.4ms and 50.1ms respectively; see baseline-views.json. Do not imply the original stalls are always 300ms or treat runs with different cache/intro conditions as a controlled speed ratio. The stable causal signal is new programs and static texture allocations on first view: 35 programs/35 textures → 37/39 at the bottle → 39/45 at the lamp. The second sweep added no resources and stayed around 16.7–16.8ms.

An isolated snapshot of committed source at /tmp/portfolio-scene-baseline on port 5175 was tested with the NEW permanent harness. Exact command:
`BASE_URL=http://localhost:5175 PLAYWRIGHT_MODULE=/tmp/portfolio-perf-tools/node_modules/playwright-core/index.mjs node scripts/check-scene-smoothness.mjs`
Result: red, `AssertionError: First visit must not compile new shader variants; 37 !== 35`. This independently confirms the regression harness catches the pre-fix code.

## Implemented plan

1. Confirmed cause: project navigation destroyed the scene. Added src/gallery/project-viewer.js, a fullscreen same-origin iframe using the existing case-study documents and Exit button. Scene/camera/GPU context remain mounted. Parent URL remains the real bookmarkable project URL using history.pushState. Back closes, Forward reopens, explicit Exit closes. Direct/refreshed case-study URLs keep their standalone fallback. Closing removes the iframe to release its videos and nested mini-apps. Only six known project paths are accepted; close messages check origin and exact frame source.
2. Confirmed cause: first-use GPU programs/textures escaped existing compileAsync. Added src/gallery/warmup.js, compiling normal and NoToneMapping variants, preuploading bake/LUT/material textures in small batches, and drawing all meshes before interaction so offscreen resources and transmission buffers initialize. Restore visibility/culling and render the correct view synchronously before yielding. Loading work moves earlier; it is not eliminated. Existing 4-second compile fallback is retained per configuration. No asset geometry, pixel data, lighting, or material values were changed.
3. Small source-supported cleanup: removed a duplicate renderer.setSize in resApply, since setPixelRatio already calls it. Actual window resizes still update the dimensions. Scene drawing/updates pause behind the project. Resume resets time sampling and held keys, joystick/touch IDs, swipe motion and click latch. Blur clears held input as well.
4. Not established as causes by the measurements: CPU collision spikes / GC, ongoing steady GPU overload, resolution governor transitions. Avoid broader refactors on speculation. Baked assets remain 55.2MB with ~175MiB calculated lightmap mip allocation. Transmission still draws another opaque pass; expensive views report roughly 4–5 million triangles across passes. GPU compression, geometry LOD, and a lower resolution ceiling are possible follow-ups if real-device feedback still shows problems; they need appearance and hardware validation. No changes to approved materials/lightmap detail were made.

## Verification

`npm run build`, `node scripts/check-gallery-baked.mjs`, `node scripts/check-gallery-project-interactions.mjs`, and `git diff --check` passed. Build retains an existing large-chunk advisory.

Permanent runtime harness:
`BASE_URL=http://127.0.0.1:4174 PLAYWRIGHT_MODULE=/tmp/portfolio-perf-tools/node_modules/playwright-core/index.mjs PERF_REPORT=/tmp/portfolio-perf-after-production.json node scripts/check-scene-smoothness.mjs`

Production run passed for 1440px desktop and 390px touch. Both checked six first exhibit visits, six project open/Exit cycles (Mac-Lamp via actual raycast click and pop), renderer/document identity, exact X/Z preservation, paused rendering behind projects, stable program/texture counts, zero new gallery resource requests after Exit, history Back/Forward, no JS errors, and direct standalone Exit. Checked actual walking after close, right/middle mouse orbit, touch swipe and joystick movement after close. Unify video play() succeeded. Touch widths 390/430/744/768/844/859/861 checked for full-viewport project frame and functioning Exit. See production-validation.json for per-view rAF samples and walking maxima. Scene remained at 58 prewarmed programs and 45 textures across cycles.

The complete startup checklist for unrelated 2D visual features was not repeated; unchanged nav/dropdown/blob behavior is not claimed verified. No deployment or push. The user's existing tomorrow-casestudy-plan.md changes were left alone.

## User handoff

User explicitly prefers implementing then testing on their own device, 28 October 2026. Stop expanding automated tests. Dev server ready at http://localhost:5174. User should enter 3D, walk/turn into each exhibit, repeatedly open/close projects and report remaining hitches. Actual Safari/iPhone memory pressure/context loss remains unverified. Do not claim universally stutter-free operation.

## Deployment authorized and completed

Lucas explicitly authorized live deployment after local checks. Committed implementation as 32be289 and the versioned embedded-document/Exit cache keys as 04352d4. Both pushed to existing origin/main. GitHub Pages run 40603025659 succeeded, and live lucasmaher.com served the new main bundle and versioned Exit script. Internal research notes and the pre-existing tomorrow-casestudy-plan.md edits were not published. Cache-key follow-up production build passed; no further expanded runtime suite after the user's request to test personally.

Rollback baseline: c88e01f137bbc379b7f3769247393c5ec9625bdc. If Lucas reports a regression and wants rollback, revert 04352d4 and 32be289 (in that order) and push; preserve unrelated working changes. Do not reset or force-push main.
