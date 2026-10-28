# Keep the gallery warm between projects

**Two confirmed mechanisms caused avoidable stalls:** closing a project reconstructed the whole 3D document, and first visits to exhibits still created GPU resources after the existing shader preparation. Both are now implemented and deployed. Projects open over the retained scene; textures and shader configurations initialize before walking starts. Automated production checks passed on desktop and touch emulation. Actual Safari/iPhone smoothness remains for Lucas to assess at [lucasmaher.com](https://lucasmaher.com). Deployment [04352d4](https://github.com/lucasmaher-hash/3d_Portfolio/commit/04352d4) passed [GitHub Pages](https://github.com/lucasmaher-hash/3d_Portfolio/actions/runs/40603025659), and the live viewer bundle and versioned Exit script were checked. ([Runtime findings](../research_notes/Portfolio%20scene%20smoothness/runtime-findings.md))

## Project Exit no longer rebuilds the gallery

The original Exit assigned a scene URL, triggering a fresh document load even though the saved camera position made it look like a resume. The reproduction caught **43 gallery resource requests** in that new document and main-thread tasks of **616ms and 292ms**. Browser history caching can retain an entire document, but it is not guaranteed and differs from caching downloaded files. Keeping the scene mounted avoids depending on that cache. ([Reproduction](../research_notes/Portfolio%20scene%20smoothness/runtime-findings.md), [browser cache behavior](https://web.dev/articles/bfcache))

The implementation uses one fullscreen iframe for the existing case study, retaining the renderer, camera and GPU context. Drawing pauses while covered. Exit removes the iframe, releasing its media and nested apps; held input and timing samples reset before walking resumes. The address remains bookmarkable, Back closes the project, Forward reopens it, and standalone project URLs retain their Exit fallback. ([Implementation](../src/gallery/project-viewer.js))

## First visits now use resources prepared during loading

The controlled baseline grew from **35 programs/35 textures** to **39 programs/45 textures** while first viewing the bottle and lamp. Subsequent visits created nothing new. `compileAsync()` prepares shaders, while `initTexture()` handles texture initialization separately. Transmission also draws an additional opaque pass with a different tone-mapping configuration. Hidden geometry was not the issue: Three.js r184 includes it when compiling materials. ([Baseline data](../research_notes/Portfolio%20scene%20smoothness/baseline-views.json), [renderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html), [r184 source](https://github.com/mrdoob/three.js/blob/r184/src/renderers/WebGLRenderer.js))

Warmup now uploads static textures in batches, compiles normal and transmission configurations, and draws all meshes before interaction. Resources stayed at **58 prepared programs and 45 textures** throughout first visits and repeated project cycles. This moves preparation earlier; it does not eliminate its cost or alter approved assets, lighting or materials. ([Warmup](../src/gallery/warmup.js), [production results](../research_notes/Portfolio%20scene%20smoothness/production-validation.json))

## Further optimization follows evidence from real devices

| Priority | Cause or candidate | Evidence and action |
|---|---|---|
| 1 | Scene reconstruction on Exit | Confirmed; retained scene implemented and verified. |
| 2 | First-use programs and textures | Confirmed; startup warmup implemented and verified. |
| 3 | Resolution-buffer allocation | Duplicate resize removed. Governor-triggered hitches remain unproven. |
| 4 | GPU bandwidth and memory pressure | About **175MiB** calculated lightmap allocation, plus other resources; expensive views submit roughly 4–5 million triangles across passes. Investigate compression, LOD or resolution only if device testing warrants it. |
| 5 | Collision CPU cost or garbage collection | Not established by measurements; no speculative refactor applied. |

Texture memory depends on pixel dimensions and format, rather than PNG download size. GPU compression and smaller render buffers can reduce cost, but require visual validation. ([Texture memory](https://threejs.org/manual/pages/textures.html#memory-usage), [WebGL guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices), [local findings](../research_notes/Portfolio%20scene%20smoothness/runtime-findings.md))

## Verification supports the fixes, with device limits

On headless Chrome 156 with ANGLE Metal/Apple M4, controlled first-view maxima changed from **33.4ms/50.1ms** for bottle/lamp to **16.8ms**. Earlier exploratory stalls reached 267–300ms under different intro/cache conditions; these runs do not justify a universal speedup ratio. The regression harness also failed against unchanged source, confirming it detects the first-use problem. ([Measurements](../research_notes/Portfolio%20scene%20smoothness/runtime-findings.md))

Production build, gallery checks and runtime checks passed: six project cycles, preserved renderer/position, no additional gallery requests after Exit, Back/Forward, desktop orbit, touch movement and Unify playback. Touch widths 390–861px were checked. Real Safari memory pressure, context loss and sustained device performance remain unverified. Lucas's next check is walking, turning and repeatedly opening/closing projects on his own device. ([Validation record](../research_notes/Portfolio%20scene%20smoothness/production-validation.json))
