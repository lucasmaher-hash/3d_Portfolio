# to.morrow version-2 hero · 2026-10-26

Lucas requested roughly 14% faster pacing, shorter pauses, snappier steps and smoother movement, published on `/to.morrow2d2.html`.

- `TomorrowHeroV2`: desktop tall cut, 1920×1320, 1804 frames at 60 fps (30.0667 s; previous hero 34.2667 s).
- `TomorrowHeroMobileV2`: mobile tall cut, 1080×1530, 1553 frames at 60 fps (25.8833 s; previous hero 29.5 s).
- `heroTiming.ts` evaluates the existing 30-fps animation at fractional source frames. Active moves run 6% faster; the additional time saving comes from the explicit hold intervals beside each composition's timing constants. Smoothstep shoulders avoid abrupt speed changes at either end of a hold. The first and last source frames are preserved for the loop.
- `heroPace` is opt-in. Existing compositions, landing tiles and other page versions retain their original timing and assets. Mobile retains its existing vertical story and Lock Screen ending.

Run from `motion/`:

```sh
npx remotion render src/tomorrow-entry.tsx TomorrowHeroV2 out/tomorrow-hero-v2-master.mp4 --crf=16 --concurrency=2 --gl=angle --timeout=120000
npx remotion render src/tomorrow-entry.tsx TomorrowHeroMobileV2 out/tomorrow-hero-mobile-v2-master.mp4 --crf=16 --concurrency=2 --gl=angle --timeout=120000
```

Encode each master with `ffmpeg -i <master> -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p -movflags +faststart -an <web-file>`. Keep 60 fps; do not add a 30-fps conversion. Files: `public/videos/to.morrow/tomorrow-promo-hero-v2.mp4` and `tomorrow-promo-mobile-hero-v2.mp4`. Generate `public/images/to.morrow/promo-poster-hero-v2.webp` from the desktop video's first frame.

The first attempt with the default software renderer crashed/timed out around the enlarged phone reveal; use the explicit ANGLE renderer above.

Verification: TypeScript check and production build pass; both web files decode without errors and retain all 60-fps frames. Reviewed contact sheets of both cuts. The decoded first/last-frame mean difference is below 0.1/255 for both cuts, consistent with encoding noise at the loop boundary. No browser was connected for an interactive playback check.
