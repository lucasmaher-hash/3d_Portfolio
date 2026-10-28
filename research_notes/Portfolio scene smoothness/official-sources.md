# Official guidance for portfolio scene stutter

Research date: 28 October 2026. Exact installed package inspected: Three.js 0.184.0. This is a source and asset audit; runtime causal claims still require the parent profiling run.

## Which startup work can escape shader precompilation?

### Takeaway
Shader precompilation, texture upload and first draw are separate operations. Hidden gallery geometry is already included by this version's compiler; the more credible gap is lazy texture/buffer initialization and the extra shader configuration used by transmission.

### Cited Findings
- `compileAsync` waits on shader programs and uses the parallel-compilation extension when available. `initTexture` explicitly exists to avoid first-render image decode/upload stalls. `transmissionResolutionScale` reduces the transmission target's dimensions. These APIs address different work. — [Three WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html)
- Exact local r184 source: `compile()` uses `scene.traverse()` for renderable materials, including invisible objects. Its light gathering uses `traverseVisible()`. `compileAsync()` delegates to this function and polls readiness. Thus `model.visible = false` does **not** prevent the existing material precompilation. — [Versioned renderer source](https://github.com/mrdoob/three.js/blob/r184/src/renderers/WebGLRenderer.js); local `node_modules/three/src/renderers/WebGLRenderer.js:1372`
- Exact r184 transmission pass creates a multisampled target with mipmaps, redraws opaque objects into it, sets `NoToneMapping` for that pass, updates the target's mipmaps and then renders the main scene. The prepass can therefore request another program configuration and allocate targets on first use. — [Versioned renderer source](https://github.com/mrdoob/three.js/blob/r184/src/renderers/WebGLRenderer.js); local lines 1965–2085
- Texture uploads from DOM sources can internally switch programs and flush the GPU pipeline. Uploading before drawing avoids interrupting the active rendering pipeline. — [MDN WebGL best practices, uploads](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#teximagetexsubimage_uploads_esp._videos_can_cause_pipeline_flushes)
- Local gallery initialization downloads 24 lightmaps but only stores the objects for custom shader uniforms; it does not call `renderer.initTexture()` on them. The 3D display LUT is also bound through custom uniforms. TextureLoader resolution means the image load completed, not that it was uploaded to the GPU. — [Local baked setup](../../src/gallery/baked-scene.js), [Local LUT setup](../../src/gallery/blender-view.js)

### Inferences
- High priority: initialize all static bake textures and the LUT during loading, spreading large uploads between browser tasks. Preserve pixel formats, color space and approved materials.
- High priority: precompile the normal and linear offscreen configurations, then perform a controlled warm draw before enabling input/revealing the finished gallery. Include transmissive content and hidden proximity arrows. Count new programs and uploads during a first camera sweep to verify completeness.
- A prewarm render to a custom target alone does not compile the screen's display-transform configuration: output color space and tone mapping are part of program selection. Precompile both configurations rather than assuming they are interchangeable.
- The current four-second `Promise.race` deliberately permits showing before compilation settles. Profile timeout hits before changing that availability fallback.

### Gaps
- Source inspection cannot establish which upload, program or driver operation dominates on Lucas's browser. Capture first walk and subsequent walk traces separately. A low main-thread render duration is not proof of low GPU cost.

## Why can opening and closing a project recreate the scene?

### Takeaway
The current Exit pill navigates to a new scene document. A persistent scene with a project iframe avoids repeated WebGL setup; `history.back()` is a smaller improvement but still relies on a browser cache that is not guaranteed.

### Cited Findings
- Browser bfcache can retain an entire page, including JavaScript memory and pending tasks, for history restoration. It differs from HTTP asset caching; cached files can still require parsing and execution. `pageshow.persisted` identifies a real restoration, whereas `pagehide.persisted` only indicates intent to cache. — [web.dev bfcache guide](https://web.dev/articles/bfcache)
- bfcache is for browser navigations. A nested iframe's own history is not separately bfcached; keeping the outer scene document alive avoids requiring its restoration. A parent bfcache restoration also restores its embedded iframe state. — [web.dev bfcache and iframes](https://web.dev/articles/bfcache#the_bfcache_and_iframes)
- CSS hiding an iframe does not change the child document's Page Visibility state or emit visibility events. A kept-alive child cannot rely solely on `document.hidden` to stop its media and scripts. — [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- `requestAnimationFrame` generally follows display refresh and is usually paused for background tabs or hidden frames. Its time argument should drive motion so 60/120/144 Hz displays keep the same speed. — [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- Local project click code saves a pose and calls `window._nav()` with a project URL. Local Exit waits for its pulse then assigns `window.location.href` to `/` or a gallery entry. That is a fresh navigation, not a history traversal. The saved position disguises reconstruction as a resumed scene. — [Local navigation](../../src/main.js), [Local Exit](../../public/js/exit-3d.js)

### Inferences
- Highest priority: open projects in one same-origin fullscreen iframe while retaining the outer WebGL document; pause scene drawing and input while covered, close/remove the child to release video, animation and nested mini-app work. Preserve the existing project URL/Exit presentation and direct-link fallback.
- Test browser Back/Forward, explicit Exit, repeated opens, reload/direct URLs, modified clicks and Escape. Coordinate history deliberately so Back closes the project rather than exits the portfolio.
- If using only `history.back()`, gate it on a verified same-tab entry marker. Direct bookmarked project URLs need an explicit gallery fallback. Even correct history traversal can miss bfcache, so it cannot guarantee no scene reload.
- On scene resume, reset time sampling and pressed keys. Otherwise a large hidden-time delta may create movement jumps or corrupt adaptive-resolution measurements.

### Gaps
- A retained WebGL scene and a media-heavy child coexist in memory. No universal GPU-memory limit is exposed. Verify repeated-cycle memory stability and context-loss behavior on actual iOS/Safari hardware; desktop emulation cannot prove it.

## Which ongoing costs plausibly cause intermittent walking stalls?

### Takeaway
Measure first-time resource use, transmission cost, memory pressure and resolution transitions separately. Existing BVHs and static lighting already address common CPU-raycast and shadow redraw costs; there is no evidence yet that more geometry simplification is the first fix.

### Cited Findings
- Physical materials cost more per pixel as features are enabled; transmission and clearcoat are among those features. — [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)
- Texture memory tracks dimensions and format, not PNG/JPEG download size. A common RGBA8 mipmapped texture estimate is width × height × 4 × 1.33 bytes. — [Three texture memory manual](https://threejs.org/manual/pages/textures.html#memory-usage)
- Local `scene.json` contains 24 lightmaps totaling **34,340,864 pixels**; their PNG files total **21.69 MiB**. Applying the RGBA8 mip estimate yields approximately **174.67 MiB** of GPU lightmap storage, excluding geometry, seven probes, the LUT and framebuffer allocations. This is a calculated allocation estimate, not measured driver memory. — [Local scene settings](../../public/gallery-baked-assets/scene.json)
- Exact r184 `setPixelRatio()` already calls `setSize()`. `RenderTarget.setSize()` disposes storage when dimensions change. A resolution governor that resizes a scene with transmission therefore changes canvas storage and later reallocates the transmission target. — [Renderer source](https://github.com/mrdoob/three.js/blob/r184/src/renderers/WebGLRenderer.js), [RenderTarget source](https://github.com/mrdoob/three.js/blob/r184/src/core/RenderTarget.js)
- Rendering a smaller buffer reduces work but trades image quality for speed. Compressed GPU textures reduce storage and bandwidth, unlike simply recompressing PNGs as JPEGs. — [MDN smaller buffers and compressed textures](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- Resource disposal is explicit in Three.js; destroying an object and later reusing it can cause resource recreation and a frame drop. `renderer.info` exposes retained resource/program counts suitable for detecting growth. — [Three resource disposal guide](https://threejs.org/manual/pages/how-to-dispose-of-objects.html)
- Chrome's performance recorder distinguishes load and runtime work, dropped frames, main-thread activity, GPU activity and raster work. Record the actual interaction that stutters. — [Chrome performance reference](https://developer.chrome.com/docs/devtools/performance/reference)

### Inferences
- Rank after persistent navigation and startup warmup: (3) avoid redundant `setSize` calls and defer optional resolution increases until the player is idle; (4) correlate slow windows with transmission entering the frustum; (5) investigate GPU texture compression only if memory/bandwidth remains limiting.
- Do not turn transmission off or lower bake resolution silently: those change Lucas's approved exhibit appearance. First preserve it and move one-time work out of walking.
- Useful red-capable signals: same scene/document identity after project close; zero scene requests or warmup reruns on close; no newly created programs/static texture uploads after initial complete camera sweep; no sustained resource-count growth across repeated open/close cycles; frame-time percentiles and stall counts for an identical movement route.
- CPU allocation cleanup can reduce GC jitter but should follow a trace. A handful of Vector3 allocations per frame is not sufficient evidence that GC causes the visible problem.

### Gaps
- Current notes provide mechanisms, exact source paths and asset estimates, not measured performance improvements. Parent must report baseline versus modified measurements, hardware/browser/configuration and limits; never present headless CPU timing as actual mobile GPU FPS.
