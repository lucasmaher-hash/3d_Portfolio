# Sketch Hand font (2026-11-01)

`public/fonts/sketchbook/sketch-hand.woff` is traced from the handwriting in the intro image of
https://siqi-bside.vercel.app (`/intro/intro1.png`, 600x266). The text there is a picture, not a
web font; 16 Google handwriting fonts and Microsoft Ink Free were compared and none matched.
The source image is NOT in the repo.

Rebuild (fonttools, potracer, opencv-python-headless, numpy, pillow in a venv):

1. Put the source image at `siqi/intro1.png` relative to the working directory.
2. `python seg2.py` writes `glyphs.json` (automatic letter cuts, only used for baselines).
3. `python build.py` writes `siqi/LucasSketchHand.otf` and `.woff`.

`cuts.json` holds the hand-picked letter instances (line, x0, x1 in source pixels); `build.py`
overrides a few of them. Letters that do not exist in the source are built from others:
u = first half of the w in "with", b = mirrored d, x = mirrored c + c, ( ) = stretched c,
K = scaled k, V = scaled v, E = l stem + hyphen arms, . = i dot, ä ö ü = base + i dots.
Everything else falls back to Caveat in the CSS.
