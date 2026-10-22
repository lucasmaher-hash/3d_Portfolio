# Cycles baking for the approved fourth gallery

## Which bake representation best preserves this approved gallery?

### Takeaway
Recommend a hybrid: bake the complete approved diffuse appearance of static plaster/podiums in scene-linear HDR, and preserve real-time specular/reflections for satin slabs and product exhibits. Pilot both diffuse+colour and albedo-separated lighting before choosing; a blanket Combined bake is not a replacement for moving-view reflections. This is a recommendation, not a completed quality comparison.

### Cited Findings
- Cycles bake can generate global-illumination lightmaps; it uses render sample/bounce settings. Diffuse has Direct, Indirect, and Color contributions; Color alone is material response without lighting. Combined includes selectable diffuse/glossy/transmission/emission contributions, and the manual describes it as excluding specularity; Glossy/Transmission have view-direction controls. Therefore Combined must not be treated as a camera-independent final photo. UVs and an active target image texture are required. — [Blender bake manual](https://docs.blender.org/manual/en/latest/render/cycles/baking.html)
- Render-pass definitions explicitly separate the intensity **and colour** of incoming direct/indirect illumination from the diffuse surface colour. The generic bake manual's wording “gray-scale” for Color-off should not be read as a reason to discard coloured illumination: verify the selected bake output on a turquoise-lit patch. Diffuse Color represents shader mixing/weights, not necessarily just one Principled Base Color socket. — [Blender 4.5 pass definitions](https://docs.blender.org/manual/id/4.5/render/layers/passes.html)
- Reflection and transmission are different ray paths; diffuse/glossy/transmission bounce limits are individually controllable. — [Blender light paths](https://docs.blender.org/manual/en/4.4/render/cycles/render_settings/light_paths.html)
- Local existing exporter creates 8-bit, non-float sRGB image targets, bakes DIFFUSE with direct/indirect/colour, then connects maps to Principled emission with black base. It exports projects unbaked. It also rescales geometry/light energy, and adds per-source basis bakes only under `--separate-lights`. — [Inspected existing exporter](/Users/lucasmaher/TEMP/3D_Portfolio/scripts/export-gallery.py)
- Approved v05 top-fifth darkening is an intentional material-colour change carried by `CenterTopFalloff` CORNER attribute, max 22% linear reduction, fade angles .32–.55 rad; not a light intensity change. — [Approved settings](/Users/lucasmaher/Documents/ChatGPT/new%203d%20scene%202/blender-lighting-review/iteration-05-projects-and-wall/review-settings.json), [authoring script](/Users/lucasmaher/Documents/ChatGPT/new%203d%20scene%202/blender-lighting-review/render-iteration-05.py)

### Inferences
- **Preferred appearance-first architecture pilot:** `DIFFUSE`, Direct=True, Indirect=True, Color=True, full approved shader, float image. Store diffuse radiance separately from specular; sample as an emission/unlit diffuse component at runtime, without another diffuse light term. Preserve original roughness/normals and add only appropriate view-dependent specular. This captures seams and the intentional center gradient without requiring their procedural shader in Three.js.
- **Alternative editable-material pilot:** `DIFFUSE`, Direct=True, Indirect=True, Color=False plus separate `DIFFUSE` Color-only response. Multiply each exactly once in linear space. More flexible material edits and lower-frequency lighting maps, but reproducing the full approved shader response matters; multiplying by a flat base colour loses the center gradient. Never apply albedo twice or add baked direct lighting on top of the same real-time direct diffuse.
- **Combined alternative:** disable Glossy/Transmission for general architecture; optionally include emission where needed. It has no demonstrated advantage over an explicit diffuse+colour pass here. Baking reflection/transmission from one camera fixes the wrong view as the player moves; unsuitable for the bottle and reflective surfaces.
- Keep exact current third-version bottle mesh, UVs, textures and PBR material/extension properties from web GLB. Do not overwrite with its Cycles-rendered import. The screenshot alone does not establish a geometry defect: differing glass/refraction/shading can create that appearance. Its runtime reflections/transparency need the preserved web setup.
- All new files/routes belong to a fourth version. Third preservation tag supplied by coordinator: `gallery-third-preserved-2026-10-22`, commit `3d505f1`; current third GLB SHA256 `084ed362ae0ff47f774db25e9b47baa5fa756bd71548d8204a4e1260fdd37c41`.

### Gaps
- No pilot comparison has yet measured diffuse+colour versus lightmap×colour equivalence on the actual approved shader. Geometry/lighting settings should not be changed speculatively before that comparison.
- No generic UV image bake can guarantee physically correct moving-view specular/transmission. A reflection-probe strategy and bottle runtime validation are separate requirements.

## Which quality controls address splotches, rim seams and colour mismatch?

### Takeaway
Higher samples alone do not fix distorted UVs, clipped targets, changed scene scale, or applying the display transform twice. Preserve the approved scene and calibration; create HDR masters, adequate physical UV density/padding, and one consistent colour pipeline. Compare denoised and raw results before deciding final sample count.

### Cited Findings
- Bake margins mitigate UV seam discontinuities from filtering and mipmaps. Extend grows edge pixels; Adjacent Faces takes values from adjoining surface faces. — [Blender bake margins](https://docs.blender.org/manual/en/latest/render/cycles/baking.html)
- Adjacent Faces baking margin was introduced in Blender 3.1 specifically to reduce UV-seam discontinuities. — [Blender 3.1 Cycles release notes](https://developer.blender.org/docs/release_notes/3.1/cycles/)
- **Native baking denoising and adaptive sampling support was added in Blender 3.0.** Advice that Blender cannot denoise bakes comes from older versions and is obsolete. — [Blender 3.0 Cycles release notes](https://developer.blender.org/docs/release_notes/3.0/cycles/)
- Adaptive sampling spends fewer samples on converged regions; lowering noise threshold costs more time. OpenImageDenoise has quality/prefilter controls. — [Blender sampling settings](https://docs.blender.org/manual/id/5.0/render/cycles/render_settings/sampling.html)
- Albedo/normal guides help denoising retain fine detail. HDR mode preserves values beyond 0–1; stronger smoothing can soften details. A compositor Denoise node is an available explicit postprocess, but its camera-render guide passes are not automatically UV-aligned bake guides. — [Blender denoise node](https://docs.blender.org/manual/en/4.4/compositing/types/filter/denoise.html)
- Clamping reduces fireflies at the cost of accuracy and can dim wanted highlights. Filter Glossy also trades accuracy/detail for noise reduction. Fast GI replaces/adds ambient occlusion instead of full diffuse GI. — [Blender light paths](https://docs.blender.org/manual/en/4.4/render/cycles/render_settings/light_paths.html)
- OpenEXR is recommended for intermediate scene-linear image storage. PNG/JPEG are ordinarily display-encoded formats. Float image buffers use scene-linear storage; normal/data textures should not undergo colour conversion. Exposure is a pre-display factor of 2^exposure; Save As Render applies the view transform. Matching the OCIO configuration allows consistent application transforms. — [Blender colour management](https://docs.blender.org/manual/en/4.5/render/color_management.html)
- OpenEXR supports half/full float; PNG 16-bit remains fixed-point rather than HDR floating-point. — [Blender supported formats](https://docs.blender.org/manual/en/5.0/files/media/image_formats.html)

### Inferences
- **Proposed masters:** use `float_buffer=True`, scene-linear texture colour space, save OpenEXR half-float ZIP/PIZ lossless. Preserve raw HDR before any tone mapping/texture compression. A 16-bit PNG is not equivalent and cannot store HDR >1 directly.
- **Proposed UVs:** keep the full approved geometry for final/pilot quality; no draft decimation. Use arc-length and profile-distance parameterization on curved plaster; do not allocate UV space by clustered groove vertex index. Give rim/underside islands actual area and independent gutters. Keep bake UVs separate from product/material UVs. Validate no unintended overlap and no zero-area crown strips.
- **Initial density budget, not proven optimum:** ~64–96 texels/metre for broad architectural light fields; higher/separate albedo detail if actual groove shadows need it. Use several 2K/4K atlases rather than one stretched atlas; 1K per small podium usually a sensible pilot target. At 4K start 16–32 px margin; make island gutters exceed twice the selected dilation plus filtering footprint. Inspect at target distance and lower mips, because tiny rim islands can contaminate even high-resolution bakes.
- **Initial sample proposal:** pilot 256 samples, threshold .01 with minimum64; if smooth plaster still blotches, compare 512/1024 samples and threshold .005. Use OIDN High/Accurate, Albedo+Normal where supported; retain non-denoised reference. Do not add a second blind denoise to already denoised maps. These numbers are proposed convergence tests, not render-time promises.
- Keep approved v05 bounce/clamp/world/material/light settings initially; don't silently change transport to chase noise. If fireflies persist, test only cautious indirect clamping against un-clamped pilot; leave direct clamp0. No Fast GI replacement or extra AO unless approved, since both change the rendered look.
- Freeze approved Blender AgX, Medium High Contrast, exposure -0.8624965 (linear exposure multiplier ≈.55). Keep HDR maps scene-linear and apply the matching display transform once after diffuse+specular composition. Alternatively pre-transform a fully baked unlit diffuse image and bypass tone mapping for it, but that compromise makes reflection/exposure composition less consistent. Plain Three.js AgX without Blender's contrast look is not automatically an exact match.
- v05 review source was already calibrated to web vertical dimensions by render-review.py (coordinator-confirmed). Do not repeat export-gallery.py's floor/height/energy/product-translation transform; that changes approved light distances and appearance.

### Gaps
- Exact native denoiser guide handling, adaptive-sampling behaviour and file-output gamut in installed Blender must be confirmed by pilot; source docs establish support, not scene-specific correctness.
- Optimal texel density/sample count and bake duration cannot be predicted reliably without measuring this hardware/scene. No evidence supports switching engines/services for improved fidelity over already-approved Cycles.

## What should be validated before a full fourth-version bake?

### Takeaway
A small representative patch is the best compromise: prove that approved Cycles lighting survives UV baking, colour conversion, runtime materials and reflections before spending time baking everything. Preserve third-version assets and bottle before any mutation.

### Cited Findings
- UV baking depends on actual render settings and target-image setup, while render/display colour handling is a distinct pipeline stage. — [Bake setup](https://docs.blender.org/manual/en/latest/render/cycles/baking.html), [colour pipeline](https://docs.blender.org/manual/en/4.5/render/color_management.html)

### Inferences
1. Copy approved v05 into a fourth-version export workspace and record settings, file hashes and object/material inventory. Preserve bottle from third GLB with buffers, UV/accessors, texture bytes, sampler and extension properties; verify equality after merge. Never run old exporter unchanged.
2. Bake only one inner-wall segment covering top fifth + curved foot/rim, one outer wall around a ceiling source, and one podium. Keep the entire scene present for bounce/shadow evaluation; restricting bake receivers should not remove the rest of the lighting environment.
3. Produce HDR A=diffuse+colour and B=diffuse-light×separate diffuse-colour at modest resolution, same samples. Keep raw/denoised pairs. No separated light-by-light basis needed now that lighting is approved; it multiplies bake work and runtime maps with no present requirement.
4. Assemble a small fourth-route pilot with the same camera/projection as approved renders. Compare Blender native versus Blender baked-only shader first; then browser. This localizes errors to bake versus runtime/display conversion.
5. Inspect center gradient/door fade, bottom light spill, narrow crown seams at multiple distances, colour/saturation/exposure and smooth wall noise. Inspect bottle unchanged, black pupils and metallic/transparent product highlights from two viewpoints. Specular cannot be judged from a single still.
6. Choose representation from evidence. Increase only problem atlas density/sample counts. Keep EXR masters and deterministic preprocessing. Deliver compressed web textures only after linear-range/colour comparison; compression must not be used to hide noise.
7. Only then run full bake and integrate independent fourth route. Validate unchanged third GLB hash and bottle content, plus matching camera/scale. Keep original unmodified source and approved render references for rollback.

### Gaps
- This is a research deliverable only. No scene, code, assets, bake, or render was modified by this researcher. No visual/pixel-match claims or timing measurements were made.
