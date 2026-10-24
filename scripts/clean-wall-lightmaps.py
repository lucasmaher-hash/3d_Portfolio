# Removes the baked groove shading from the gallery wall lightmaps (outer.png, ring.png).
# The bake caught the ~8 mm panel grooves only here and there and unevenly: some seams
# kept a dark line, some dark dashes or blots beside them, most nothing. main.js
# (drawWallSeams) draws every seam itself, so here every groove is turned back into
# plain plaster: each texel within R of a seam (and every texel of the groove geometry)
# gets the average of the nearest clean plaster texels IN WORLD SPACE (so UV islands do
# not matter), and the padding around the islands is refilled from the nearest covered
# texel so bilinear filtering cannot pull old dark values back in. No rebake.
#
#   node scripts/raster-wall-seams.mjs <tmp> && python3 scripts/clean-wall-lightmaps.py <tmp>
# Reads the original bake from git (ORIGINAL_REV); writes maps/outer.png and maps/ring.png.
import io, json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL_REV = 'c42ce82'        # last commit that wrote the bake's outer.png / ring.png
RASTER = Path(sys.argv[1])
R = {'outer': 0.06, 'ring': 0.06}    # seam band radius (m): covers the baked lines AND the dashes/blots beside some
SOURCE = 0.08                   # clean texels taken from R .. R + SOURCE
K = 16                          # nearest clean texels; their per-channel MEDIAN is used (drops blots)
PAD = 6                         # padding texels refilled around the islands
NOISE_K = 20                    # world-space neighbours for the noise pass (~5 cm radius)
SAME_FACE = 0.5                 # min dot of normals for a texel to count as a neighbour
NOISE_T = 0.02                  # relative luminance deviation that counts as noise
LUM = np.array([.2126, .7152, .0722])
settings = json.loads((ROOT / 'public/gallery-baked-assets/scene.json').read_text())['lightmaps']

for lab, r in R.items():
    info = settings[lab]; W, H, RANGE = info['width'], info['height'], info['range']
    path = f'public/gallery-baked-assets/maps/{info["file"]}'
    raw = subprocess.run(['git', 'show', f'{ORIGINAL_REV}:{path}'], cwd=ROOT, capture_output=True, check=True).stdout
    a = np.asarray(Image.open(io.BytesIO(raw)).convert('RGBA')).astype(np.float64) / 255
    hdr = a[..., :3] * a[..., 3:4] * RANGE
    D, X, Y, Z, NX, NY, NZ = np.fromfile(RASTER / f'{lab}.bin', np.float32).reshape(7, H, W)
    Nrm = np.stack([NX, NY, NZ], -1); Nrm /= np.maximum(np.linalg.norm(Nrm, axis=-1, keepdims=True), 1e-9)
    cov = D >= 0
    band = cov & (D < r)
    src = cov & (D >= r) & (D < r + SOURCE)
    P = np.stack([X, Y, Z], -1)
    tree = cKDTree(P[src])
    srcv = hdr[src]
    # Neighbours must face the same way: the wall's dark back face is only 9 cm away.
    dist, idx = tree.query(P[band], k=K * 4, distance_upper_bound=0.25, workers=-1)
    ok = np.isfinite(dist)
    srcn = Nrm[src]
    ok &= np.einsum('nkc,nc->nk', srcn[np.where(ok, idx, 0)], Nrm[band]) > SAME_FACE
    keep = np.cumsum(ok, axis=1) <= K
    ok &= keep
    vals = np.where(ok[..., None], srcv[np.where(ok, idx, 0)], np.nan)
    vals = np.nanmedian(vals, axis=1)
    filled = ok.any(1)
    out = hdr.copy()
    bi = np.argwhere(band)
    out[bi[filled, 0], bi[filled, 1]] = vals[filled]
    # Pass 2, bake noise: dark specks (Lucas: black dots on the wall behind the Double
    # Packaging podium) and grainy light patches (the inner ring's entrance returns).
    # Every covered texel is compared with the median of its NOISE_K nearest texels in
    # world space (~5 cm); if it is off by more than NOISE_T it takes that median.
    # Smooth light gradients pass untouched, isolated outliers go.
    Pc = P[cov]
    tree2 = cKDTree(Pc)
    _, nidx = tree2.query(Pc, k=NOISE_K * 2, workers=-1)
    cur = out[cov]
    Nc = Nrm[cov]
    same = np.einsum('nkc,nc->nk', Nc[nidx], Nc) > SAME_FACE
    same &= np.cumsum(same, axis=1) <= NOISE_K
    med = np.nanmedian(np.where(same[..., None], cur[nidx], np.nan), axis=1)
    Lc, Lm = cur @ LUM, med @ LUM
    noisy = np.abs(Lc / np.maximum(Lm, 1e-9) - 1) > NOISE_T
    cur[noisy] = med[noisy]
    out[cov] = cur
    noise = np.zeros_like(cov); noise[cov] = noisy
    band = band | noise
    # Padding: uncovered texels next to an island take the nearest covered texel.
    edt, (iy, ix) = nd.distance_transform_edt(~cov, return_indices=True)
    pad = ~cov & (edt <= PAD)
    out[pad] = out[iy[pad], ix[pad]]
    changed = band | pad
    px = np.maximum(out, 0)
    mul = np.maximum(np.ceil(px.max(-1) / RANGE * 255) / 255, 1 / 255)
    enc = np.round(np.concatenate([px / (mul[..., None] * RANGE), mul[..., None]], -1) * 255).clip(0, 255).astype(np.uint8)
    orig = (a * 255).round().astype(np.uint8)
    enc[~changed] = orig[~changed]
    Image.fromarray(enc).save(ROOT / path, optimize=True)
    L = lambda x: np.einsum('...c,c->...', x, np.array([.2126, .7152, .0722]))
    ref = nd.gaussian_filter(np.where(src, L(hdr), 0), 6) / np.maximum(nd.gaussian_filter(src.astype(float), 6), 1e-9)
    m = band & (Y > 0.9) & (Y < 3.7)
    print(f'{lab}: noise texels replaced {int(noise.sum())}; band {band.sum()} texels ({(~filled).sum()} unfilled), padding {pad.sum()}; '
          f'groove/plaster brightness {np.median(L(hdr)[m] / ref[m]):.3f} -> {np.median(L(out)[m] / ref[m]):.3f}, '
          f'p5 {np.percentile(L(hdr)[m] / ref[m], 5):.3f} -> {np.percentile(L(out)[m] / ref[m], 5):.3f}')
