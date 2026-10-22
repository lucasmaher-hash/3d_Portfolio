# Colour fidelity and preserving the approved web bottle

## How should Blender colour appearance be reproduced in the fourth gallery?

### Takeaway
Use scene-linear HDR diffuse bakes and a single final display transform that reproduces the installed Blender OCIO configuration, AgX Medium High Contrast look, and exposure. Merely choosing Three.js AgXToneMapping does not reproduce this approved look. Validate the display pipeline with a small colour/lighting patch before a full bake.

### Cited Findings
- Three.js works in Linear-sRGB; display output is sRGB. Colour PNG/JPEG maps require sRGB tagging; HDR EXR illumination maps are linear and retain values above 1. — [Three colour-management manual](https://threejs.org/manual/pages/color-management.html)
- Three r184 AgX converts Linear-sRGB to Rec.2020, applies its inset, log encoding, sigmoid approximation, outset, and returns linear-sRGB for output conversion. Its AgX look call is commented out. — [Version-pinned shader](https://github.com/mrdoob/three.js/blob/r184/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js)
- Blender separately defines Medium High Contrast in AgX Log, with grading contrast 1.2 and pivot -0.2. It is not merely the base AgX transform. — [Blender OCIO configuration](https://github.com/blender/blender/blob/blender-v5.0-release/release/datafiles/colormanagement/config.ocio)
- OCIO Baker supports a display/view, looks, LUT size, and a shaper that maps unbounded input to a LUT domain. — [OCIO Baker](https://opencolorio.readthedocs.io/en/latest/api/baker.html)
- Local direct evidence: approved `blender-lighting-review/quality-review/settings.json` records AgX, Medium High Contrast, exposure -0.8624964952468872; `render-review.py:35` sets this deliberately. Current `src/gallery/original-scene.js:15-16` uses base Three AgX with exposure 1. Current inner-wall shader also applies nonlinear 30x shoulder lift to selected center-facing surfaces. These are inspected local artifacts, not proof of what any prior screenshot used. [Local runtime](../../src/gallery/original-scene.js)
- Local installed Blender 5.1 OCIO file `/Applications/Blender.app/Contents/Resources/5.1/datafiles/colormanagement/config.ocio:805` also contains the Medium High Contrast look. Freeze this actual file and its LUT dependencies rather than assuming current upstream is identical. [Blender versioned config source](https://github.com/blender/blender/blob/blender-v5.0-release/release/datafiles/colormanagement/config.ocio)

### Inferences
- Exposure -0.8624965 EV corresponds to a linear multiplier approximately 0.55. Using exposure 1 in Three for otherwise equal linear radiance is approximately 1.82x the approved input energy. Matching this multiplier alone still misses the look and renderer differences.
- Best quality compromise: keep diffuse and reflection radiance linear until composited, then apply the frozen Blender OCIO display processor via generated GPU shader or calibrated log-shaper plus 3D LUT. Disable Three built-in AgX when this processor owns tone mapping, and ensure sRGB output encoding happens once. Test a synthetic linear colour/EV chart against the CPU OCIO processor, then matched camera renders.
- Simpler fallback for matte architecture: apply frozen Blender OCIO transform offline to diffuse outgoing-radiance textures; use unlit/basic materials with toneMapped=false and correct sRGB map tagging. This can match matte pixels reliably, but sacrifices a coherent linear compositing pipeline for view-dependent reflections and PBR objects. Never apply AgX again to these display-referred textures. Keep raw HDR masters so this compromise is reversible.
- A custom display processor may change the bottle's final appearance despite unchanged asset material/geometry. Preserve asset exactly and validate its appearance separately under the new room/probes; do not promise byte-identical bottle pixels across different surrounding illumination.

### Gaps
- No camera-aligned numeric image comparison or exact OCIO CPU/GPU error measurement has yet been run; base AgX equivalence must not be claimed.
- Shader extraction from the installed OCIO processor and Three integration cost must be prototyped; a 33³/65³ LUT without a shaper is not reliable across HDR radiance.

## Which lighting representation avoids double lighting and preserves reflections?

### Takeaway
For fixed matte architecture, bake direct plus indirect diffuse illumination. Preserve specular/refraction as view-dependent PBR plus local reflection probes. Choose whether the map stores illumination without albedo or outgoing diffuse radiance including albedo, and implement that choice explicitly.

### Cited Findings
- Three r184 lightMap feeds `irradiance`; the physical indirect-diffuse response subsequently multiplies by the material diffuse BRDF. A map already containing surface albedo is therefore not automatically interchangeable with an irradiance lightMap. — [Light-map sampling](https://github.com/mrdoob/three.js/blob/r184/src/renderers/shaders/ShaderChunk/lights_fragment_maps.glsl.js), [Physical BRDF](https://github.com/mrdoob/three.js/blob/r184/src/renderers/shaders/ShaderChunk/lights_physical_pars_fragment.glsl.js)
- MeshStandardMaterial documents lightMap as baked illuminance, with a second UV set; typical HDR light maps use LinearSRGBColorSpace and floating formats. Emissive textures are colour textures. — [Material documentation](https://threejs.org/docs/pages/MeshStandardMaterial.html)
- Local `scripts/export-gallery.py` currently bakes DIFFUSE with colour/direct/indirect enabled, stores eight-bit sRGB PNG, then sets black base and uses that bake as emission. This avoids diffuse albedo multiplication twice but discards HDR beyond the byte image range. Existing `original-scene.js` adds a reflection environment and separate exhibit lights; it is not an entirely light-free baked scene. [Local export script](../../scripts/export-gallery.py)
- glTF defines baseColor and emissive textures, PBR materials and extension containers; a Three-specific lightMap binding is not automatically conveyed by standard core glTF material fields. Own the extra UV/light-map sidecar schema and runtime binding. — [glTF specification](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc)

### Inferences
- Lowest-risk higher-fidelity successor to existing architecture technique is outgoing diffuse HDR radiance (albedo already included) via a dedicated baked-diffuse shader channel plus separately evaluated specular. Do not simply set black base if the desired dielectric specular contribution depends on implementation details; inspect the final shader's energy terms and compare.
- Alternative standard PBR lightMap workflow: bake colour-free diffuse lighting, determine the Cycles-radiance versus Three-irradiance/pi convention with a unit-albedo Lambert patch, then combine lightMap with original albedo. Disable ambient/hemi/environment diffuse lighting that duplicates baked diffuse; retain environment specular only.
- Do not bake glossy highlights or bottle refraction into UV colour textures if the visitor moves. Such highlights become painted-on and cannot show newly revealed views. Bake their static shadows onto the podium/architecture while keeping their reflective/transmissive surface dynamic.
- Practical verification: same source geometry and approved camera intrinsics/extrinsics; compare center wall, upper fifth darkening/fade, floor, podium diffuse, and bottle from at least three viewpoints. Start uncompressed; add compression only after fidelity passes, with before/after comparisons.

### Gaps
- Exact Cycles DIFFUSE pass/pi conventions for this exporter need a calibration patch rather than an assumed global factor.
- A single central probe is a compromise; local probe positions and correct specular-only handling need implementation tests.

## How can the currently approved web bottle be preserved exactly?

### Takeaway
Retain the current GLB bottle primitives, transforms, label texture bytes, and material definitions without a Blender re-export. Load the preserved source asset directly in the fourth route and clone just those bottle nodes, or merge with an exact semantic manifest and prove equivalence after serialization. The screenshots do not establish broken geometry; differing glass/refraction rendering is a plausible alternative.

### Cited Findings
- Transmission and alpha coverage describe different effects. KHR_materials_transmission alone models a thin surface; volume adds thickness-based refraction/absorption and requires closed/manifold boundaries. — [Transmission spec](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_transmission), [Volume spec](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_volume)
- IOR changes dielectric Fresnel response; the extension carries a specified numeric IOR. — [IOR spec](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_ior)
- Three r184 transmission samples a rendered scene texture via projected UVs; it is not Cycles path tracing. MeshPhysicalMaterial recommends an environment map. — [Transmission implementation](https://github.com/mrdoob/three.js/blob/r184/src/renderers/shaders/ShaderChunk/transmission_pars_fragment.glsl.js), [Physical material docs](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)
- Direct local asset inspection on clean HEAD `3d505f1`: source `public/gallery-original-assets/gallery.glb` SHA256 `084ed362ae0ff47f774db25e9b47baa5fa756bd71548d8204a4e1260fdd37c41`. Nodes are `bottle body_Podest`, `label_Podest`, `lid_Podest`. Body material transparent_V2: base [0.95,0.97,1,1], roughness .03, metalness0, doubleSided true, transmission1, IOR1.45; **no KHR_materials_volume**. Label texture vaccine_label_fixed JPEG SHA256 `be282ca5ba9078231bd5049a279a4149bc1d7d35feadbd5949c7969267953b31`. Material label omits metalness/roughness factors (glTF defaults1); blue metal cap base [0.021441169,0,.80000746,1], roughness .34, omitted metalness(default1), both doubleSided. — [Asset](../../public/gallery-original-assets/gallery.glb); defaults [glTF spec](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc)
- Runtime evidence: gallery branch `src/main.js:2197-2225` returns before legacy material fixups. Therefore the old label/cap brightness overrides elsewhere in main.js should **not** be copied to the fourth route just because comments call them bottle fixes. Third uses the asset's original PBR materials and separate exhibit spotlights.

### Inferences
- Preserve the exact three original node TRS values and decoded geometry accessors; body has non-uniform node scale, unlike label. Do not apply transforms, recalculate normals, weld, quantize, decimate or recompress the retained bottle. Those operations can change silhouette, refraction, texture orientation or label fit.
- Safest fourth route references the immutable original GLB and extracts bottle nodes at runtime; third stays unchanged. This avoids a serialization round trip entirely at cost of downloading an extra existing GLB unless cached. Later produce a bottle-only GLB if network size matters, with exact preservation assertions.
- Semantic verification manifest: primitive topology and index typed-array bytes; every POSITION/NORMAL/TANGENT/TEXCOORD_n/COLOR_n accessor byte hash plus component type/count/normalized/min/max; morph targets; node TRS/world transforms/parent; material full JSON after resolving texture indices to image hashes; texture bytes/MIME/sampler/wrap/filter/texCoord/KHR_texture_transform; alphaMode/default OPAQUE, alphaCutoff/default .5, doubleSided, transmission/IOR/volume extension presence and numeric properties. Compare these after any merge/export; compare runtime material properties after route preparation too.
- Decoded typed-array SHA256 anchors (captured with glTF-Transform + meshopt decoder):
  - Body indices `91fa6238b19acc06dafca6a8a09b9bb0ee276b14081909445f35e316b285d35b`; POSITION `7b4db9f881c4cdcb9a93577e935d889252055161900afa778dedecfc7cf6c822`; NORMAL `fc1935383b61824a85ad91661cb08f68f321b4e35af83f5b027d710869c74d8a`.
  - Label indices `f108c8a6248e7f4ce40e6a7313f0fd14a8cc1179a28c9eafaca8eb3a1ba39037`; POSITION `4e8dae2a68dc3452f66dbab8f78e124878b725a2ab8d95d6ccbf39f0e14c693b`; NORMAL `913df492e65533c67d9c7abe156c911d5e141e8eaf31e04168fb5ba81651b1a8`; TEXCOORD_0 `e6b2892c25b247e9b731688f97ccc48b8c1af362ee418bc73322298ff5a506fb`.
  - Lid indices `21ed05c3dbbfddec6142c0b003b8dfcad2ef25e933223eb9ae3d3c3d58128256`; POSITION `8bc407dccc192db04b9e8f5d06a6830009e76598c1edc27e4718ceab9cebe8ab`; NORMAL `7285e878f70abd146b9b3f899f28c4e613cb5f5aff6d7b8dce6615021bc25385`.

### Gaps
- No Blender/source-versus-web bottle mesh correspondence, ray-depth, normals or manifold analysis was performed; do not label the dark shoulder as corrupt geometry.
- Identical asset data cannot guarantee identical colour/clear-glass appearance under changed environment and display transform. That requires dedicated visual checks, not destructive bottle edits.
