# Shorten loading without losing the scene

**Configuration update, 2026-10-28:** the floor, all seven ceiling-light recesses, and Unify's body, eyes and pupils now use full-resolution original PNGs on desktop and mobile. Compression artifacts in these areas were rejected during device review. The load-time and payload measurements below describe the earlier benchmark configuration, before these selective restorations; they have not been remeasured for the current configuration. Other scene lightmaps remain optimized.

The largest useful gains came from **removing a serial download chain, caching exact lighting calculations, and selectively shrinking lighting textures**. The final controlled mobile load fell from **22.9 to 13.0 seconds**, with the measured parent-document payload dropping from **38.7 to 21.4 MiB**. These are cold-cache Chrome results under 20 Mbps / 80 ms latency / 4× CPU emulation on an Apple M4, not a promise for every phone. The earlier walking warmup remains. **The changes are live** at [lucasmaher.com](https://lucasmaher.com); [deployment passed](https://github.com/lucasmaher-hash/3d_Portfolio/actions/runs/40660575150). A real-device regression was also addressed: **the floor now always uses its original PNG**, because mobile compression produced visible blocks. ([Measurements and method](../research_notes/Portfolio%20loading%20without%20quality%20loss/sources-and-method.md))

## The wait was real work in a serial chain

Live profiling found the model loading first, followed by metadata, colour lookup table, seven reflection probes, lightmaps, the rounded lamp, seven original podium PNGs read one at a time, wall-seam data, and final GPU preparation. The original podium maps were being downloaded even on mobile after compressed versions had already loaded. That work generated small smoothed lighting fields; it was not additional visible detail. ([Live baseline](../research_notes/Portfolio%20loading%20without%20quality%20loss/live-before.json))

The model and lookup table already receive HTTP gzip from GitHub Pages: about **5.75 MB from an 18.62 MB GLB**, and **2.17 MB from a 7.30 MB LUT**. Adding a client-side gzip wrapper would not newly save that difference. Measurements used encoded response sizes rather than confusing them with decoded asset sizes. ([Content encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Encoding), [Resource Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/encodedBodySize))

## Compression was tested until artifacts became visible

| Texture experiment | Download size | Finding |
|---|---:|---|
| Original full-size PNGs | 21.7 MiB | Visual reference |
| Previous full-size UASTC | 18.3 MiB | Real iPhone feedback exposed floor blocks |
| Full-size UASTC, mild RDO 0.5 | 15.2 MiB | Small image change, modest saving |
| Full-size UASTC, RDO 2 | 13.8 MiB | Still close, moderate saving |
| Full-size UASTC, RDO 6 | 13.0 MiB | Diminishing savings |
| Full-size ETC1S, highest tested quality | 4.1 MiB | Visible floor blotches; rejected |
| All maps at half dimensions, UASTC RDO2 | 4.1 MiB | Floor artifacts; rejected |
| **Selected: smaller maps elsewhere + original PNG floor** | **about 5.4 MiB** | Best tested compromise; floor exempt |

UASTC RDO trades distortion for smaller compressed files. ETC1S is a separate codec with a stronger size/quality tradeoff. These choices were checked against the actual older encoder version used, not assumed from the latest tool options. ([Basis Universal](https://github.com/BinomialLLC/basis_universal), [UASTC RDO mechanism](https://github.com/BinomialLLC/basis_universal/wiki/UASTC-implementation-details/3e2e46fef801577f8f741a1c2947a372f5a29d47))

Five fixed gallery views were compared on desktop and mobile-sized renderings. Global image-error scores alone were insufficient: the user's iPhone screenshots showed unacceptable floor blocks even in the previous full-resolution compressed version. The final loader therefore **bypasses compressed textures for the floor in every tier**. Other lightmaps use half dimensions with linear-radiance resampling and UASTC RDO2. Geometry, materials, reflections, the colour transform and surface details generated in shaders remain unchanged. ([Prototype comparisons](../research_notes/Portfolio%20loading%20without%20quality%20loss/compression-trials-desktop.jpg), [mobile comparisons](../research_notes/Portfolio%20loading%20without%20quality%20loss/compression-trials-mobile.jpg))

## Exact cached lighting data removes redundant downloads

Seven podium-cap fields and two wall-seam attributes are now stored as their original Float32 buffers. The **binary SHA-256 stayed identical** before and after the refactor. This removes seven sequential PNG fetches/readbacks and repeated percentile and seam-distance calculations without changing their result. Source hashes are checked during builds; changing the model, maps or calculation code requires regeneration. Failed cache loading falls back to the original calculation path. ([Generator and checks](../scripts/gallery-startup-data.mjs))

The model, lighting resources, cached data and rounded lamp start together. Collision trees build while independent resources download. The reflection conversion shader is prepared during fetch, as Three recommends. This shortens the dependency chain rather than simply ending the loading screen early. Excessive blanket preloads were avoided because they can compete for bandwidth. ([PMREM startup guidance](https://threejs.org/docs/pages/PMREMGenerator.html), [resource discovery guidance](https://web.dev/articles/preload-critical-assets))

## Verification measures readiness and preserves walking

| Controlled cold-cache case | Before | Final |
|---|---:|---:|
| 20 Mbps, 80 ms, 4× CPU, mobile viewport | 22.94 s | 12.96 s |
| Parent-document encoded payload | 38.7 MiB | 21.4 MiB |
| Unlimited-network desktop on same host | 2.30 s | 1.56 s |

The mobile readiness improvement is about **44% in this pair**. CPU throttling approximates slower hardware; it does not reproduce iPhone CPU/GPU architecture. Live origin latency, Safari, thermal state and caching still affect the user's result. The 15.9-second exploratory live desktop result must not be compared directly with the 1.56-second local result as a claimed live speedup. ([Before data](../research_notes/Portfolio%20loading%20without%20quality%20loss/controlled-before.json), [final data](../research_notes/Portfolio%20loading%20without%20quality%20loss/controlled-final.json), [Chrome emulation limits](https://developer.chrome.com/docs/devtools/device-mode))

The production build validates compressed-map dimensions, mip chains, colour transfer and source hashes. Existing gallery and interaction checks pass. The runtime regression checks actual floor texture binding, first exhibit visits, project Exit cycles, retained renderer, stable resources, history and movement. The complete original warmup remains before interaction; no improvement was obtained by restoring the first-walk stutters. A final live 20 Mbps / 80 ms / 4× CPU recheck reached readiness in **13.23 seconds**, requested the original PNG floor and no original podium PNGs, with no script errors. This supports the controlled result; actual iPhone visual acceptance remains the final check. ([Live recheck](../research_notes/Portfolio%20loading%20without%20quality%20loss/live-final.json))

## Further work needs a measured tradeoff

Prebuilt collision trees could reduce more CPU setup, but add binary data to download. The library supports serialization and worker generation; their value depends on the transfer cost and device. Reflection-map prefiltering could likewise move work offline but increase the asset budget. Geometry compression is already present, and additional quantization or simplification would be a new quality tradeoff. Those are lower-priority follow-ups after the user's test of this version. ([BVH serialization and workers](https://github.com/gkjohnson/three-mesh-bvh/blob/master/API.md), [meshopt behavior](https://gltf-transform.dev/modules/extensions/classes/EXTMeshoptCompression))

For comparison, `?textures=original` requests all original PNGs; `?textures=full` selects the earlier full-resolution compressed reference maps, still with original PNG floor. `?startup=off` runs the original lighting-data calculations. These flags support diagnosis; normal visitors receive the selected faster tier with original-floor and decode-failure fallbacks.
