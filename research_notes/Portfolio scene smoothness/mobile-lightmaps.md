# Mobile lightmap follow-up

Lucas authorized mobile-only GPU texture compression and deployment for his own phone check. Commit 5a6fe82 contains full-resolution linear RGBM UASTC KTX2 copies of the 24 maps. PNG originals remain unchanged and continue serving desktop. The runtime checks coarse-pointer touch input and supported compressed GPU formats, lazily loads the matching Three decoder with two workers, then disposes the workers. Decode/download failures fall back to PNGs. Compression preserves alpha as radiance data, no premultiplication or sRGB conversion. It includes box-filtered clamped mipmaps without RDO or rescaling.

Generated compressed payloads total 45,788,480 bytes (43.7 MiB), versus 183,151,236 bytes (174.7 MiB) for RGBA8 lightmap mips: about 75% less. This excludes all other scene resources. KTX downloads total 19,178,893 bytes; this change is primarily for GPU memory, not a promised FPS improvement. `npm run build` validates source hashes, dimensions, linear transfer and mip completeness.

Validation: production build passed, existing gallery checks passed, git diff check passed. Focused Chrome/ANGLE Metal checks passed for desktop (24 originals, zero decoder requests), touch (24 ASTC4x4 compressed textures, 45,788,480 mip bytes), and forced failed KTX requests (24 PNG fallbacks). All three retained the scene renderer after opening/closing Mac-Lamp with no script errors. Mobile/full-original screenshots inspected at the same viewport; lighting reads consistently, with normal lossy compression differences. Real iPhone/Safari visual and performance feedback is still Lucas's check.

Official implementation references: https://threejs.org/docs/pages/KTX2Loader.html and https://github.com/BinomialLLC/basis_universal . Regenerate assets with `BASISU=/path/to/basisu node scripts/mobile-lightmaps.mjs --encode`; the temporary encoder used @gpu-tex-enc/basis@1.16.4 (Basis tool version 1.16.3). Runtime decoder uses the installed Three dependency and Vite asset versioning, without a CDN or new dependency.

Rollback just this mobile change by reverting 5a6fe82 and pushing main; retain the earlier warmup/persistent-scene improvements.

Deployment confirmed: GitHub Pages run 40604349785 succeeded for 5a6fe82. Verified the current main bundle, 24-map manifest and a KTX2 asset header on lucasmaher.com.
